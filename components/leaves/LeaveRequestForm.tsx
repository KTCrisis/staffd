'use client'

import { useState, useEffect }  from 'react'
import { useTranslations }      from 'next-intl'
import { createLeaveRequest }    from '@/lib/data'
import { ABSENCE_MOTIFS }        from '@/types'
import { supabase }              from '@/lib/supabase'
import type { ContractType }     from '@/lib/data'

type LeaveType = 'CP' | 'RTT' | 'Sans solde' | 'Absence autorisée'

interface Props {
  userId:  string
  onClose: () => void
  onSaved: () => void
}

function countWorkingDays(start: string, end: string, holidays: Set<string> = new Set()): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 0
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day     = cur.getDay()
    const dateStr = cur.toISOString().slice(0, 10)
    if (day !== 0 && day !== 6 && !holidays.has(dateStr)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function LeaveRequestForm({ userId, onClose, onSaved }: Props) {
  const t       = useTranslations('conges')
  const tCommon = useTranslations('common')

  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [contractType,   setContractType]   = useState<ContractType | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [countryCode,    setCountryCode]    = useState<string>('FR')
  const [holidays,       setHolidays]       = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    type:       'CP' as LeaveType,
    motif:      '',
    start_date: '',
    end_date:   '',
  })

  // ── Fetch contract_type + country_code du consultant connecté ─────────
  useEffect(() => {
    if (!userId) return
    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('consultants')
          .select('contract_type, country_code, company_id')
          .eq('user_id', userId)
          .single()
        const ct = (data?.contract_type ?? 'employee') as ContractType
        setContractType(ct)
        if (ct === 'freelance') {
          setForm(f => ({ ...f, type: 'Sans solde' }))
        }

        let cc = data?.country_code as string | null
        if (!cc && data?.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('hr_settings')
            .eq('id', data.company_id)
            .single()
          cc = (company?.hr_settings as any)?.country_code ?? 'FR'
        }
        const resolvedCC = cc ?? 'FR'
        setCountryCode(resolvedCC)

        const year = new Date().getFullYear()
        const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${resolvedCC}`)
        const hData = await r.json()
        if (Array.isArray(hData)) {
          setHolidays(new Set(hData.map((h: { date: string }) => h.date)))
        }
      } catch (_) {
        // profil non trouvé — on garde les défauts employee
      } finally {
        setLoadingProfile(false)
      }
    }
    fetchProfile()
  }, [userId])

  // ── Types disponibles selon contract_type ────────────────────────────
  const allTypes: { value: LeaveType; label: string }[] = [
    { value: 'CP',                label: t('types.CP')                },
    { value: 'RTT',               label: t('types.RTT')               },
    { value: 'Sans solde',        label: t('types.Sans solde')        },
    { value: 'Absence autorisée', label: t('types.Absence autorisée') },
  ]
  const availableTypes = contractType === 'freelance'
    ? allTypes.filter(ty => ty.value === 'Sans solde' || ty.value === 'Absence autorisée')
    : allTypes

  const isAbsence   = form.type === 'Absence autorisée'
  const isFreelance = contractType === 'freelance'
  const selectedMotif = ABSENCE_MOTIFS.find(m => m.value === form.motif)

  const days = isAbsence
    ? (selectedMotif?.days ?? 0)
    : countWorkingDays(form.start_date, form.end_date, holidays)

  const computedEndDate = isAbsence && form.start_date && selectedMotif
    ? (() => {
        const d = new Date(form.start_date)
        let added = 0
        while (added < selectedMotif.days - 1) {
          d.setDate(d.getDate() + 1)
          const dow     = d.getDay()
          const dateStr = d.toISOString().slice(0, 10)
          if (dow !== 0 && dow !== 6 && !holidays.has(dateStr)) added++
        }
        return d.toISOString().split('T')[0]
      })()
    : form.end_date

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleTypeChange = (type: LeaveType) => {
    setForm(f => ({ ...f, type, motif: '', end_date: '' }))
    setError(null)
  }

  const handleSubmit = async () => {
    if (!form.start_date)                              { setError(t('errors.startDate'));  return }
    if (!isAbsence && !form.end_date)                  { setError(t('errors.endDate'));    return }
    if (isAbsence && !form.motif)                      { setError(t('errors.motif'));      return }
    if (!isAbsence && form.end_date < form.start_date) { setError(t('errors.dateOrder')); return }
    if (days === 0)                                    { setError(t('errors.noDays'));     return }

    setLoading(true)
    setError(null)

    try {
      const { data: consultant, error: cErr } = await supabase
        .from('consultants')
        .select('id, company_id, leave_days_total, leave_days_taken, rtt_total, rtt_taken, contract_type')
        .eq('user_id', userId)
        .single()

      if (cErr || !consultant) {
        setError(t('errors.noProfile'))
        return
      }

      if (consultant.contract_type === 'freelance' && (form.type === 'CP' || form.type === 'RTT')) {
        setError(t('errors.freelanceRestriction'))
        return
      }

      if (form.type === 'CP') {
        const remaining = consultant.leave_days_total - consultant.leave_days_taken
        if (days > remaining) { setError(t('errors.notEnoughCP', { remaining })); return }
      }

      if (form.type === 'RTT') {
        const rttLeft = (consultant.rtt_total ?? 0) - (consultant.rtt_taken ?? 0)
        if (days > rttLeft) { setError(t('errors.notEnoughRTT', { remaining: rttLeft })); return }
      }

      await createLeaveRequest({
        consultant_id: consultant.id,
        company_id:    consultant.company_id,
        type:          form.type,
        motif:         form.motif || undefined,
        start_date:    form.start_date,
        end_date:      isAbsence ? computedEndDate : form.end_date,
        days,
      })

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199 }}
      />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
        background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: 28, overflowY: 'auto',
        boxShadow: '-4px 0 20px var(--shadow)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
            {t('form.title')}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            {t('form.close')}
          </button>
        </div>

        {loadingProfile ? (
          <div style={{ color: 'var(--text2)', fontSize: 11, padding: '20px 0' }}>
            {t('form.loadingProfile')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Badge freelance */}
            {isFreelance && (
              <div style={{
                padding: '8px 12px', borderRadius: 4,
                background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)',
                fontSize: 10, color: 'var(--cyan)', letterSpacing: 1,
              }}>
                {t('form.freelanceBadge')}
              </div>
            )}

            {/* Type */}
            <Field label={t('form.typeLabel')}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {availableTypes.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`btn btn-sm ${form.type === value ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleTypeChange(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            {/* Motif — Absence autorisée uniquement */}
            {isAbsence && (
              <Field label={t('form.motifLabel')}>
                <select
                  className="search-input"
                  style={{ width: '100%' }}
                  value={form.motif}
                  onChange={e => set('motif', e.target.value)}
                >
                  <option value="">{t('form.motifPlaceholder')}</option>
                  {ABSENCE_MOTIFS.map(m => (
                    <option key={m.value} value={m.value}>
                      {t(`motifs.${m.value}`)} ({m.days} {tCommon('days')})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* Dates */}
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label={t('form.startDate')} style={{ flex: 1 }}>
                <input
                  type="date" className="search-input" style={{ width: '100%' }}
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                />
              </Field>

              {!isAbsence ? (
                <Field label={t('form.endDate')} style={{ flex: 1 }}>
                  <input
                    type="date" className="search-input" style={{ width: '100%' }}
                    value={form.end_date} min={form.start_date}
                    onChange={e => set('end_date', e.target.value)}
                  />
                </Field>
              ) : computedEndDate ? (
                <Field label={t('form.endDateAuto')} style={{ flex: 1 }}>
                  <div className="search-input" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    {computedEndDate}
                  </div>
                </Field>
              ) : null}
            </div>

            {/* Résumé jours */}
            {days > 0 && (
              <div style={{
                padding: '12px 16px', background: 'var(--bg3)', borderRadius: 4,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {isAbsence ? t('form.legalDuration') : t('form.workingDays')}
                  </span>
                  {!isAbsence && holidays.size > 0 && (
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2, letterSpacing: 0.5 }}>
                      {t('form.holidaysExcluded', { country: countryCode })}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--cyan)' }}>
                  {days} {tCommon('days')}
                </span>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div style={{
                fontSize: 11, color: 'var(--pink)',
                padding: '8px 12px', background: 'rgba(255,45,107,0.08)', borderRadius: 4,
              }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="btn btn-primary" style={{ flex: 1 }}
                onClick={handleSubmit}
                disabled={loading || days === 0}
              >
                {loading ? '...' : t('form.submit')}
              </button>
              <button className="btn btn-ghost" onClick={onClose}>
                {t('form.cancel')}
              </button>
            </div>

          </div>
        )}
      </div>
    </>
  )
}

function Field({ label, children, style }: {
  label: string; children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <div style={{
        fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
        color: 'var(--text2)', marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}
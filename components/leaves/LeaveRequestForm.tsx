'use client'

import { useState }           from 'react'
import { useAuthContext }     from '@/components/layout/AuthProvider'
import { createLeaveRequest } from '@/lib/data'
import { ABSENCE_MOTIFS }     from '@/types'
import { supabase }           from '@/lib/supabase'

type LeaveType = 'CP' | 'RTT' | 'Sans solde' | 'Absence autorisée'

interface Props {
  onClose: () => void
  onSaved: () => void
}

function countWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 0
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'CP',                label: 'Paid leave'    },
  { value: 'RTT',               label: 'RTT'           },
  { value: 'Sans solde',        label: 'Unpaid leave'  },
  { value: 'Absence autorisée', label: 'Auth. absence' },
]

export function LeaveRequestForm({ onClose, onSaved }: Props) {
  const { user } = useAuthContext()

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [form,    setForm]    = useState({
    type:       'CP' as LeaveType,
    motif:      '',
    start_date: '',
    end_date:   '',
  })

  const isAbsence     = form.type === 'Absence autorisée'
  const selectedMotif = ABSENCE_MOTIFS.find(m => m.value === form.motif)

  const days = isAbsence
    ? (selectedMotif?.days ?? 0)
    : countWorkingDays(form.start_date, form.end_date)

  // End date calculée automatiquement pour les absences autorisées
  const computedEndDate = isAbsence && form.start_date && selectedMotif
    ? (() => {
        const d = new Date(form.start_date)
        let added = 0
        while (added < selectedMotif.days - 1) {
          d.setDate(d.getDate() + 1)
          if (d.getDay() !== 0 && d.getDay() !== 6) added++
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
    if (!form.start_date)                    { setError('Please select a start date'); return }
    if (!isAbsence && !form.end_date)        { setError('Please select an end date'); return }
    if (isAbsence && !form.motif)            { setError('Please select a reason'); return }
    if (!isAbsence && form.end_date < form.start_date) { setError('End date must be after start date'); return }
    if (days === 0)                          { setError('No working days in selected range'); return }

    setLoading(true)
    setError(null)

    try {
      const { data: consultant, error: cErr } = await supabase
        .from('consultants')
        .select('id, company_id, leave_days_total, leave_days_taken, rtt_total, rtt_taken')
        .eq('user_id', user!.id)
        .single()

      if (cErr || !consultant) {
        setError('No consultant profile linked to your account')
        return
      }

      if (form.type === 'CP') {
        const remaining = consultant.leave_days_total - consultant.leave_days_taken
        if (days > remaining) { setError(`Not enough CP days left (${remaining} remaining)`); return }
      }

      if (form.type === 'RTT') {
        const rttLeft = (consultant.rtt_total ?? 0) - (consultant.rtt_taken ?? 0)
        if (days > rttLeft) { setError(`Not enough RTT days left (${rttLeft} remaining)`); return }
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199 }} />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
        background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: 28, overflowY: 'auto',
        boxShadow: '-4px 0 20px var(--shadow)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
            // new time-off request
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Type */}
          <Field label="Type">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LEAVE_TYPES.map(({ value, label }) => (
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
            <Field label="Reason *">
              <select
                className="search-input"
                style={{ width: '100%' }}
                value={form.motif}
                onChange={e => set('motif', e.target.value)}
              >
                <option value="">— Select a reason —</option>
                {ABSENCE_MOTIFS.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.days}j)
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* Dates */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Start date" style={{ flex: 1 }}>
              <input
                type="date"
                className="search-input"
                style={{ width: '100%' }}
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </Field>

            {!isAbsence ? (
              <Field label="End date" style={{ flex: 1 }}>
                <input
                  type="date"
                  className="search-input"
                  style={{ width: '100%' }}
                  value={form.end_date}
                  min={form.start_date}
                  onChange={e => set('end_date', e.target.value)}
                />
              </Field>
            ) : computedEndDate ? (
              <Field label="End date (auto)" style={{ flex: 1 }}>
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
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                {isAbsence ? 'Legal duration' : 'Working days'}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--cyan)' }}>{days}j</span>
            </div>
          )}

          {error && (
            <div style={{
              fontSize: 11, color: 'var(--pink)',
              padding: '8px 12px', background: 'rgba(255,45,107,0.08)', borderRadius: 4,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={loading || days === 0}
            >
              {loading ? '...' : '✓ Submit request'}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>

        </div>
      </div>
    </>
  )
}

function Field({ label, children, style }: {
  label: string; children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  )
}
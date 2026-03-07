'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/HRTab.tsx
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useTranslations }    from 'next-intl'
import { useActiveTenant }    from '@/lib/tenant-context'
import { useCompanySettings, updateHRSettings } from '@/lib/data'
import { supabase }           from '@/lib/supabase'
import type { HRSettings, PublicHoliday } from '@/lib/data'
import {
  SectionLabel, SettingsField, SaveBar, Skeleton, ToggleRow, ErrorBanner,
} from './shared'

const COUNTRIES = [
  { code: 'FR', flag: '🇫🇷', label: 'France' },
  { code: 'BE', flag: '🇧🇪', label: 'Belgique' },
  { code: 'CH', flag: '🇨🇭', label: 'Suisse' },
  { code: 'LU', flag: '🇱🇺', label: 'Luxembourg' },
  { code: 'DE', flag: '🇩🇪', label: 'Allemagne' },
  { code: 'GB', flag: '🇬🇧', label: 'United Kingdom' },
  { code: 'US', flag: '🇺🇸', label: 'United States' },
]

const numberInput = {
  width: '100%', background: 'var(--bg3)',
  border: '1px solid var(--border2)', color: 'var(--text)',
  padding: '8px 12px', borderRadius: 2,
  fontSize: 12, fontFamily: 'inherit', textAlign: 'right' as const,
}

export function HRTab() {
  const t = useTranslations('settings.hr')
  const { activeTenantId } = useActiveTenant()
  const [refresh, setRefresh] = useState(0)
  const { data: companyData, loading } = useCompanySettings(refresh)

  const [hrCountry,     setHrCountry]     = useState('FR')
  const [hrCp,          setHrCp]          = useState('25')
  const [hrRtt,         setHrRtt]         = useState('10')
  const [hrWorkDays,    setHrWorkDays]    = useState('218')
  const [hrCraDeadline, setHrCraDeadline] = useState('5')
  const [hrAutoApprove, setHrAutoApprove] = useState(false)

  const [holidays,        setHolidays]        = useState<PublicHoliday[]>([])
  const [holidaysLoading, setHolidaysLoading] = useState(false)

  // ── Types d'activité CRA ──────────────────────────────────
  interface ActivityType { id: string; name: string }
  const [activityTypes,   setActivityTypes]   = useState<ActivityType[]>([])
  const [newActivityName, setNewActivityName] = useState('')
  const [activityLoading, setActivityLoading] = useState(false)
  const [activitySaving,  setActivitySaving]  = useState(false)
  const [activityError,   setActivityError]   = useState<string | null>(null)

  const companyId = activeTenantId ?? companyData?.id

  const fetchActivityTypes = async () => {
    if (!companyId) return
    setActivityLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('is_activity_type', true)
      .neq('status', 'archived')
      .order('name')
    setActivityLoading(false)
    if (!error) setActivityTypes(data ?? [])
  }

  useEffect(() => { fetchActivityTypes() }, [companyId])

  const handleAddActivity = async () => {
    const name = newActivityName.trim()
    if (!name || !companyId) return
    setActivitySaving(true); setActivityError(null)
    const { error } = await supabase.from('projects').insert({
      company_id:       companyId,
      name,
      is_internal:      true,
      is_activity_type: true,
      status:           'active',
      start_date:       '2020-01-01',
      end_date:         '2099-12-31',
    })
    if (error) { setActivityError(error.message) }
    else { setNewActivityName(''); fetchActivityTypes() }
    setActivitySaving(false)
  }

  const handleDeleteActivity = async (id: string) => {
    setActivityError(null)
    const { error } = await supabase
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', id)
    if (error) setActivityError(error.message)
    else fetchActivityTypes()
  }

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    if (!companyData) return
    const hr = companyData.hr_settings ?? {}
    setHrCountry(hr.country_code ?? 'FR')
    setHrCp(String(hr.default_cp ?? 25))
    setHrRtt(String(hr.default_rtt ?? 10))
    setHrWorkDays(String(hr.working_days_per_year ?? 218))
    setHrCraDeadline(String(hr.cra_submission_deadline ?? 5))
    setHrAutoApprove(hr.leave_auto_approve ?? false)
  }, [companyData])

  useEffect(() => {
    const year = new Date().getFullYear()
    setHolidaysLoading(true)
    fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${hrCountry}`)
      .then(r => r.json())
      .then(data => setHolidays(Array.isArray(data) ? data : []))
      .catch(() => setHolidays([]))
      .finally(() => setHolidaysLoading(false))
  }, [hrCountry])

  const hr = (companyData?.hr_settings ?? {}) as Partial<HRSettings>
  const dirty = (
    hrCountry     !== (hr.country_code                ?? 'FR')  ||
    hrCp          !== String(hr.default_cp             ?? 25)   ||
    hrRtt         !== String(hr.default_rtt            ?? 10)   ||
    hrWorkDays    !== String(hr.working_days_per_year  ?? 218)  ||
    hrCraDeadline !== String(hr.cra_submission_deadline ?? 5)   ||
    hrAutoApprove !== (hr.leave_auto_approve           ?? false)
  )

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      await updateHRSettings({
        hr_settings: {
          country_code:            hrCountry,
          default_cp:              Number(hrCp),
          default_rtt:             Number(hrRtt),
          working_days_per_year:   Number(hrWorkDays),
          cra_submission_deadline: Number(hrCraDeadline),
          leave_auto_approve:      hrAutoApprove,
        },
        companyId: activeTenantId ?? undefined,
      })
      setRefresh(r => r + 1)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!companyData) return
    const h = companyData.hr_settings ?? {}
    setHrCountry(h.country_code ?? 'FR')
    setHrCp(String(h.default_cp ?? 25))
    setHrRtt(String(h.default_rtt ?? 10))
    setHrWorkDays(String(h.working_days_per_year ?? 218))
    setHrCraDeadline(String(h.cra_submission_deadline ?? 5))
    setHrAutoApprove(h.leave_auto_approve ?? false)
  }

  const weekdays = t.raw('weekdays') as string[]
  const months   = t.raw('months')   as string[]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <ErrorBanner message={error} />

      {/* ── Congés par défaut ── */}
      <section>
        <SectionLabel label={t('leaveSection')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={100} /> : (
            <>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                {t('leavePolicyNote')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <SettingsField label={t('cpLabel')} hint={t('cpHint')}>
                  <input type="number" min={0} max={60} value={hrCp}
                    onChange={e => setHrCp(e.target.value)} style={numberInput} />
                </SettingsField>
                <SettingsField label={t('rttLabel')} hint={t('rttHint')}>
                  <input type="number" min={0} max={30} value={hrRtt}
                    onChange={e => setHrRtt(e.target.value)} style={numberInput} />
                </SettingsField>
                <SettingsField label={t('workDaysLabel')} hint={t('workDaysHint')}>
                  <input type="number" min={200} max={260} value={hrWorkDays}
                    onChange={e => setHrWorkDays(e.target.value)} style={numberInput} />
                </SettingsField>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Règles CRA ── */}
      <section>
        <SectionLabel label={t('craSection')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '0 24px',
        }}>
          {loading ? <div style={{ height: 80, margin: '20px 0', background: 'var(--bg3)', borderRadius: 4 }} /> : (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
                    {t('craDeadlineLabel')}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                    {t('craDeadlineHint')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" min={1} max={28}
                    value={hrCraDeadline}
                    onChange={e => setHrCraDeadline(e.target.value)}
                    style={{
                      width: 56, background: 'var(--bg3)',
                      border: '1px solid var(--border2)', color: 'var(--cyan)',
                      padding: '6px 10px', borderRadius: 2,
                      fontSize: 14, fontFamily: 'var(--font-mono)',
                      textAlign: 'center', fontWeight: 700,
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {t('craDeadlineUnit')}
                  </span>
                </div>
              </div>
              <ToggleRow
                label={t('autoApproveLabel')}
                hint={t('autoApproveHint')}
                checked={hrAutoApprove}
                onChange={setHrAutoApprove}
              />
            </>
          )}
        </div>
      </section>

      {/* ── Jours fériés ── */}
      <section>
        <SectionLabel label={t('holidaysSection')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                {t('holidaysCountryLabel')}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                {t('holidaysCountryHint')}
              </div>
            </div>
            <select
              value={hrCountry}
              onChange={e => setHrCountry(e.target.value)}
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                color: 'var(--text)', padding: '8px 12px', borderRadius: 2,
                fontSize: 12, fontFamily: 'inherit', minWidth: 180,
              }}
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
              ))}
            </select>
          </div>

          {holidaysLoading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{
                display: 'inline-block', width: 20, height: 20, borderRadius: '50%',
                border: '2px solid var(--border)', borderTopColor: 'var(--cyan)',
                animation: 'spin 0.8s linear infinite',
              }} />
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 8, letterSpacing: 1 }}>
                {t('holidaysFetching')}
              </div>
            </div>
          ) : holidays.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>
              {t('holidaysNone', { country: hrCountry })}
            </div>
          ) : (() => {
            const byMonth = holidays.reduce<Record<number, PublicHoliday[]>>((acc, h) => {
              const m = new Date(h.date).getMonth()
              if (!acc[m]) acc[m] = []
              acc[m].push(h)
              return acc
            }, {})
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
                {Object.entries(byMonth)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([mIdx, mHolidays]) => (
                    <div key={mIdx} style={{
                      padding: '14px 16px',
                      borderRight: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{
                        fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                        color: 'var(--cyan)', marginBottom: 8, fontWeight: 700,
                      }}>
                        {months[Number(mIdx)]}
                      </div>
                      {mHolidays.map(h => {
                        const d = new Date(h.date)
                        return (
                          <div key={h.date} style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 5 }}>
                            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text)', fontWeight: 700, minWidth: 22 }}>
                              {d.getDate()}
                            </span>
                            <span style={{ fontSize: 9, color: 'var(--text2)', minWidth: 22 }}>
                              {weekdays[d.getDay()]}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text)', lineHeight: 1.3 }}>
                              {h.localName}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ))
                }
              </div>
            )
          })()}

          {!holidaysLoading && holidays.length > 0 && (
            <div style={{
              padding: '10px 20px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 10, color: 'var(--text2)' }}>
                {t('holidaysCount', { count: holidays.length, year: new Date().getFullYear() })}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text2)', opacity: 0.5, letterSpacing: 1 }}>
                {t('holidaysSource')}
              </span>
            </div>
          )}
        </div>
      </section>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onReset={handleReset} />

      {/* ── Types d'activité CRA ── */}
      <section>
        <SectionLabel label={t('activitySection')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                {t('activityTitle')}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                {t('activitySubtitle')}
              </div>
            </div>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 2, letterSpacing: 1,
              background: 'rgba(0,229,255,0.08)', color: 'var(--cyan)',
              border: '1px solid rgba(0,229,255,0.2)',
            }}>
              {t('activityCount', { count: activityTypes.length })}
            </span>
          </div>

          {/* Liste */}
          {activityLoading ? (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton h={36} /><Skeleton h={36} /><Skeleton h={36} />
            </div>
          ) : activityTypes.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>
              {t('activityEmpty')}
            </div>
          ) : (
            <div>
              {activityTypes.map((a, i) => (
                <div key={a.id} style={{
                  padding: '10px 20px',
                  borderBottom: i < activityTypes.length - 1 ? '1px solid var(--border)' : undefined,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 9, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>
                      ◈
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
                      {a.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteActivity(a.id)}
                    style={{
                      fontSize: 9, padding: '3px 10px', borderRadius: 2,
                      background: 'none', border: '1px solid rgba(255,45,107,0.2)',
                      color: 'var(--pink)', cursor: 'pointer', fontFamily: 'inherit',
                      letterSpacing: 0.5,
                    }}
                  >
                    {t('activityArchive')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Ajouter */}
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              value={newActivityName}
              onChange={e => setNewActivityName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddActivity()}
              placeholder={t('activityPlaceholder')}
              style={{
                flex: 1, background: 'var(--bg3)',
                border: '1px solid var(--border2)',
                color: 'var(--text)', padding: '7px 12px', borderRadius: 2,
                fontSize: 12, fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleAddActivity}
              disabled={!newActivityName.trim() || activitySaving}
              style={{
                fontSize: 11, padding: '7px 16px', borderRadius: 2,
                background: newActivityName.trim() ? 'var(--cyan)' : 'var(--bg3)',
                color: newActivityName.trim() ? '#000' : 'var(--text2)',
                border: 'none', cursor: newActivityName.trim() ? 'pointer' : 'default',
                fontFamily: 'inherit', fontWeight: 700,
                transition: 'background 0.15s',
              }}
            >
              {activitySaving ? t('activityAdding') : t('activityAdd')}
            </button>
          </div>

          {activityError && (
            <div style={{
              padding: '8px 20px', borderTop: '1px solid var(--border)',
              fontSize: 11, color: 'var(--pink)',
            }}>
              ⚠ {activityError}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
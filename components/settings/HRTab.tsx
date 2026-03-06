'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/HRTab.tsx
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useActiveTenant }    from '@/lib/tenant-context'
import { useCompanySettings, updateHRSettings } from '@/lib/data'
import type { HRSettings, PublicHoliday }        from '@/lib/data'
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

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

const numberInput = {
  width: '100%', background: 'var(--bg3)',
  border: '1px solid var(--border2)', color: 'var(--text)',
  padding: '8px 12px', borderRadius: 2,
  fontSize: 12, fontFamily: 'inherit', textAlign: 'right' as const,
}

export function HRTab() {
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

  // Fetch jours fériés au changement de pays
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
    hrCountry     !== (hr.country_code               ?? 'FR')  ||
    hrCp          !== String(hr.default_cp            ?? 25)   ||
    hrRtt         !== String(hr.default_rtt           ?? 10)   ||
    hrWorkDays    !== String(hr.working_days_per_year  ?? 218)  ||
    hrCraDeadline !== String(hr.cra_submission_deadline ?? 5)  ||
    hrAutoApprove !== (hr.leave_auto_approve          ?? false)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <ErrorBanner message={error} />

      {/* Congés par défaut */}
      <section>
        <SectionLabel label="DEFAULT_LEAVE_POLICY" />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={100} /> : (
            <>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                Valeurs appliquées automatiquement à la création de chaque nouveau consultant.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <SettingsField label="CP / an (jours)" hint="Légal FR : 25j minimum">
                  <input type="number" min={0} max={60} value={hrCp}
                    onChange={e => setHrCp(e.target.value)} style={numberInput} />
                </SettingsField>
                <SettingsField label="RTT / an (jours)" hint="Selon accord d'entreprise">
                  <input type="number" min={0} max={30} value={hrRtt}
                    onChange={e => setHrRtt(e.target.value)} style={numberInput} />
                </SettingsField>
                <SettingsField label="Jours travaillés / an" hint="Standard FR : 218j">
                  <input type="number" min={200} max={260} value={hrWorkDays}
                    onChange={e => setHrWorkDays(e.target.value)} style={numberInput} />
                </SettingsField>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Règles CRA */}
      <section>
        <SectionLabel label="CRA_RULES" />
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
                    Deadline soumission CRA
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                    Jour limite du mois suivant pour soumettre son CRA
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
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>du mois</span>
                </div>
              </div>
              <ToggleRow
                label="Approbation automatique des congés"
                hint="Si activé, les demandes sont approuvées sans validation manager"
                checked={hrAutoApprove}
                onChange={setHrAutoApprove}
              />
            </>
          )}
        </div>
      </section>

      {/* Jours fériés */}
      <section>
        <SectionLabel label="PUBLIC_HOLIDAYS" />
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
                Pays de référence
              </div>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                Jours fériés exclus des CRAs — source : date.nager.at
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
                // fetching holidays…
              </div>
            </div>
          ) : holidays.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>
              Aucun jour férié trouvé pour {hrCountry}
            </div>
          ) : (() => {
            const byMonth = holidays.reduce<Record<number, PublicHoliday[]>>((acc, h) => {
              const m = new Date(h.date).getMonth()
              if (!acc[m]) acc[m] = []
              acc[m].push(h)
              return acc
            }, {})
            const weekdays = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
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
                        {MONTHS_FR[Number(mIdx)]}
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
                {holidays.length} jours fériés en {new Date().getFullYear()}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text2)', opacity: 0.5, letterSpacing: 1 }}>
                source: date.nager.at
              </span>
            </div>
          )}
        </div>
      </section>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onReset={handleReset} />
    </div>
  )
}
// components/simulator/SimulatorClient.tsx
'use client'

import { useMemo, useState }  from 'react'
import { useTranslations }    from 'next-intl'
import { Panel }              from '@/components/ui/Panel'
import { KpiCard }            from '@/components/ui/KpiCard'
import { AdminBadge }         from '@/components/ui/AdminBadge'
import { fmt, fmtTjm, getMargeColor } from '@/lib/utils'
import { computeProposableSalary } from '@/lib/simulator'

// Le salaire proposable est l'inversion de la vue `consultant_profitability`.
// La logique de calcul vit dans lib/simulator.ts (pure, testée). Ici : juste l'UI.

const DEFAULT_MARGIN  = 30   // % — marge cible
const DEFAULT_CHARGES = 42   // % — charges patronales (standard FR)

interface Props {
  defaultWorkingDays?: number
}

export function SimulatorClient({ defaultWorkingDays = 218 }: Props) {
  const t = useTranslations('simulator')

  const [tjmVendu, setTjmVendu] = useState<number>(700)
  const [marge,    setMarge]    = useState<number>(DEFAULT_MARGIN)
  const [charges,  setCharges]  = useState<number>(DEFAULT_CHARGES)
  const [jours,    setJours]    = useState<number>(defaultWorkingDays)

  const r = useMemo(
    () => computeProposableSalary({ tjmVendu, marge, charges, jours }),
    [tjmVendu, marge, charges, jours],
  )

  const margeColor = getMargeColor(marge)

  return (
    <div className="app-content">
      <AdminBadge label={t('adminBadge')} />
      <p className="label-meta" style={{ marginBottom: 16 }}>{t('intro')}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Entrées ─────────────────────────────────────────── */}
        <Panel title={t('inputs.title')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label={t('inputs.tjmVendu')} hint={t('inputs.tjmVenduHint')}>
              <input className="search-input" style={{ width: '100%' }} type="number" min={0} step={10}
                value={tjmVendu} onChange={e => setTjmVendu(Number(e.target.value))} />
            </Field>
            <Field label={t('inputs.margeCible')} hint={t('inputs.margeCibleHint')}>
              <input className="search-input" style={{ width: '100%', borderColor: margeColor }} type="number" min={0} max={99} step={1}
                value={marge} onChange={e => setMarge(Number(e.target.value))} />
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label={t('inputs.chargesPct')} hint={t('inputs.chargesPctHint')} style={{ flex: 1 }}>
                <input className="search-input" style={{ width: '100%' }} type="number" min={0} step={1}
                  value={charges} onChange={e => setCharges(Number(e.target.value))} />
              </Field>
              <Field label={t('inputs.joursTravailles')} hint={t('inputs.joursTravaillesHint')} style={{ flex: 1 }}>
                <input className="search-input" style={{ width: '100%' }} type="number" min={1} step={1}
                  value={jours} onChange={e => setJours(Number(e.target.value))} />
              </Field>
            </div>
          </div>
        </Panel>

        {/* ── Résultats ───────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {r ? (
            <>
              <div className="kpi-grid">
                <KpiCard label={t('kpi.coutJour')}    value={fmtTjm(r.coutJourMax)}  accent="cyan"  />
                <KpiCard label={t('kpi.brutAnnuel')}   value={fmt(r.brutAnnuel)}      accent="green" sub={t('employee.title')} />
                <KpiCard label={t('kpi.brutMensuel')}  value={fmt(r.brutMensuel)}     accent="gold"  />
                <KpiCard label={t('kpi.tjmFreelance')} value={fmtTjm(r.tjmFreelance)} accent="pink"  sub={t('freelance.title')} />
              </div>

              <Panel title={t('details.title')}>
                <p className="label-meta" style={{ marginBottom: 6 }}>{t('employee.note')}</p>
                <p className="label-meta" style={{ marginBottom: 14 }}>{t('freelance.note')}</p>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div className="label-meta" style={{ marginBottom: 6 }}>{t('formula.title')}</div>
                  <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--text2)', fontSize: 11, lineHeight: 1.9 }}>
                    <li>{t('formula.line1')}</li>
                    <li>{t('formula.line2')}</li>
                  </ul>
                </div>
              </Panel>
            </>
          ) : (
            <Panel>
              <p className="label-meta">{t('invalid')}</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Champ local (même forme que ConsultantForm, + un hint) ─────
function Field({ label, hint, children, style }: {
  label:    string
  hint?:    string
  children: React.ReactNode
  style?:   React.CSSProperties
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <span className="label-meta">{label}</span>
      {children}
      {hint && <span style={{ fontSize: 9, color: 'var(--text2)' }}>{hint}</span>}
    </label>
  )
}

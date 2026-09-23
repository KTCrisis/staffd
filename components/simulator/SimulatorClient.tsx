// components/simulator/SimulatorClient.tsx
'use client'

import { useMemo, useState }  from 'react'
import { useTranslations }    from 'next-intl'
import { Panel }              from '@/components/ui/Panel'
import { KpiCard }            from '@/components/ui/KpiCard'
import { AdminBadge }         from '@/components/ui/AdminBadge'
import { fmt, fmtTjm, getMargeColor } from '@/lib/utils'
import { computeProposableSalary } from '@/lib/simulator'
import { gradeEconomics }          from '@/lib/grades'

// Le salaire proposable est l'inversion de la vue `consultant_profitability`.
// La logique de calcul vit dans lib/simulator.ts (pure, testée). Ici : juste l'UI.

const DEFAULT_MARGIN  = 30   // % — marge cible
const DEFAULT_CHARGES = 42   // % — charges patronales (standard FR)

export interface SimulatorGrade {
  id:                 string
  label:              string
  tjm_cible:          number | null
  occupation_cible:   number | null
  cout_annuel_charge: number | null
}

interface Props {
  defaultWorkingDays?: number
  grades?:             SimulatorGrade[]
}

export function SimulatorClient({ defaultWorkingDays = 218, grades = [] }: Props) {
  const t = useTranslations('simulator')

  const [tjmVendu, setTjmVendu] = useState<number>(700)
  const [marge,    setMarge]    = useState<number>(DEFAULT_MARGIN)
  const [charges,  setCharges]  = useState<number>(DEFAULT_CHARGES)
  const [jours,    setJours]    = useState<number>(defaultWorkingDays)
  const [occ,      setOcc]      = useState<number>(100)
  const [gradeId,  setGradeId]  = useState<string>('')

  // Banc profil / grille : un coût annuel chargé testé contre chaque grade
  const [profilCost, setProfilCost] = useState<number>(
    grades.find(g => g.cout_annuel_charge)?.cout_annuel_charge ?? 100000,
  )

  const pickGrade = (id: string) => {
    setGradeId(id)
    const g = grades.find(x => x.id === id)
    if (g?.tjm_cible)        setTjmVendu(Number(g.tjm_cible))
    if (g?.occupation_cible) setOcc(Number(g.occupation_cible))
  }

  const r = useMemo(
    () => computeProposableSalary({ tjmVendu, marge, charges, jours, occupation: occ }),
    [tjmVendu, marge, charges, jours, occ],
  )

  const bench = useMemo(() => grades.map(g => ({
    g,
    grid:   gradeEconomics({ tjm: Number(g.tjm_cible ?? 0), occupation: Number(g.occupation_cible ?? 0), cost: Number(g.cout_annuel_charge ?? 0), jours }),
    profil: gradeEconomics({ tjm: Number(g.tjm_cible ?? 0), occupation: Number(g.occupation_cible ?? 0), cost: profilCost, jours }),
  })), [grades, profilCost, jours])

  const margeColor = getMargeColor(marge)

  return (
    <div className="app-content">
      <AdminBadge label={t('adminBadge')} />
      <p className="label-meta" style={{ marginBottom: 16 }}>{t('intro')}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Entrées ─────────────────────────────────────────── */}
        <Panel title={t('inputs.title')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {grades.length > 0 && (
              <Field label={t('inputs.grade')} hint={t('inputs.gradeHint')}>
                <select className="search-input" style={{ width: '100%' }}
                  value={gradeId} onChange={e => pickGrade(e.target.value)}>
                  <option value="">{t('inputs.gradeNone')}</option>
                  {grades.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </Field>
            )}
            <Field label={t('inputs.tjmVendu')} hint={t('inputs.tjmVenduHint')}>
              <input className="search-input" style={{ width: '100%' }} type="number" min={0} step={10}
                value={tjmVendu} onChange={e => setTjmVendu(Number(e.target.value))} />
            </Field>
            <Field label={t('inputs.margeCible')} hint={t('inputs.margeCibleHint')}>
              <input className="search-input" style={{ width: '100%', borderColor: margeColor }} type="number" min={0} max={99} step={1}
                value={marge} onChange={e => setMarge(Number(e.target.value))} />
            </Field>
            <Field label={t('inputs.occupation')} hint={t('inputs.occupationHint')}>
              <input className="search-input" style={{ width: '100%' }} type="number" min={1} max={100} step={1}
                value={occ} onChange={e => setOcc(Number(e.target.value))} />
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
                    <li>{t('formula.line3')}</li>
                  </ul>
                </div>
              </Panel>
            </>
          ) : (
            <Panel>
              <p className="label-meta">{t('invalid')}</p>
            </Panel>
          )}

          {grades.length > 0 && (
            <Panel title={t('bench.title')}>
              <p className="label-meta" style={{ marginBottom: 12 }}>{t('bench.intro', { jours })}</p>
              <Field label={t('bench.cost')} style={{ maxWidth: 220, marginBottom: 12 }}>
                <input className="search-input" style={{ width: '100%' }} type="number" min={0} step={1000}
                  value={profilCost} onChange={e => setProfilCost(Number(e.target.value))} />
              </Field>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('bench.grade')}</th>
                      <th style={{ textAlign: 'right' }}>{t('bench.tjmOcc')}</th>
                      <th style={{ textAlign: 'right' }}>{t('bench.ca')}</th>
                      <th style={{ textAlign: 'right' }}>{t('bench.gridCost')}</th>
                      <th style={{ textAlign: 'right' }}>{t('bench.gridContribution')}</th>
                      <th style={{ textAlign: 'right' }}>{t('bench.profilContribution')}</th>
                      <th style={{ textAlign: 'right' }}>{t('bench.profilBreakEven')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bench.map(({ g, grid, profil }) => (
                      <tr key={g.id}>
                        <td><span className="td-primary">{g.label}</span></td>
                        <td style={{ textAlign: 'right', color: 'var(--text2)' }}>
                          {g.tjm_cible ? fmtTjm(Number(g.tjm_cible)) : '—'} · {g.occupation_cible ?? '—'} %
                        </td>
                        <td style={{ textAlign: 'right' }}>{grid ? fmt(grid.caAnnuel) : '—'}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text2)' }}>{g.cout_annuel_charge ? fmt(Number(g.cout_annuel_charge)) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{grid ? fmt(grid.contribution) : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: profil && profil.contribution < 0 ? 'var(--pink)' : 'var(--green)' }}>
                          {profil ? fmt(profil.contribution) : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>{profil?.pointMortTjm != null ? fmtTjm(profil.pointMortTjm) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

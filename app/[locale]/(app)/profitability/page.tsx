'use client'

import { useState, useMemo }             from 'react'

import { Topbar }                        from '@/components/layout/Topbar'
import { Panel }                         from '@/components/ui/Panel'
import { Avatar }                        from '@/components/ui/Avatar'
import { KpiCard }                       from '@/components/ui/KpiCard'
import { AdminBadge }                    from '@/components/ui/AdminBadge'
import { EmptyState }                    from '@/components/ui/EmptyState'
import { MargeLegend }                   from '@/components/ui/MargeLegend'
import { ProgressBar }                   from '@/components/ui/ProgressBar'

import { useAuthContext }                from '@/components/layout/AuthProvider'
import { canViewFinancials }             from '@/lib/auth'
import { useConsultantProfitability }    from '@/lib/data'
import { fmt, fmtTjm, getMargeColor, progressColor, isCibleAlert, pluralFr } from '@/lib/utils'
import type { AvatarColor }             from '@/types'

// ── Composants locaux ─────────────────────────────────────────

function Skeleton({ h = 80 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h }} />
}

/** Badge de pourcentage de marge colorisé */
function MargeBadge({ pct }: { pct: number }) {
  const color = getMargeColor(pct)
  return (
    <span className="marge-badge" style={{
      background: `${color}22`,
      border: `1px solid ${color}55`,
      color,
    }}>
      {pct}%
    </span>
  )
}

/** Badge type de contrat */
function ContractBadge({ type }: { type: 'employee' | 'freelance' }) {
  return (
    <span className={`contract-badge contract-badge-${type}`}>
      {type === 'freelance' ? 'Freelance' : 'Salarié'}
    </span>
  )
}

/** Écart TJM cible vs coût réel */
function CibleGap({ tjmCible, tjmCout }: { tjmCible: number | null; tjmCout: number | null }) {
  if (!tjmCible || !tjmCout) return <span style={{ color: 'var(--text2)', fontSize: 10 }}>—</span>
  const gap    = tjmCible - tjmCout
  const gapPct = Math.round(gap / tjmCible * 100)
  const color  = getMargeColor(gapPct)
  const sign   = gap >= 0 ? '+' : ''
  return (
    <div className="cible-gap">
      <span className="cible-gap-pct" style={{ color }}>{sign}{gapPct}%</span>
      <span className="cible-gap-detail">cible {tjmCible}€ · coût {tjmCout}€</span>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────
type SortKey = 'ca_genere' | 'marge_brute' | 'occupancy_rate' | 'marge_pct'

const SORTS: { label: string; key: SortKey }[] = [
  { label: 'CA',         key: 'ca_genere'      },
  { label: 'Marge',      key: 'marge_brute'    },
  { label: 'Marge %',    key: 'marge_pct'      },
  { label: 'Occupation', key: 'occupancy_rate' },
]

// ── Page ──────────────────────────────────────────────────────
export default function ProfitabilityPage() {
  const { user }        = useAuthContext()
  const financialAccess = canViewFinancials(user?.role)
  const [sort, setSort] = useState<SortKey>('ca_genere')

  const { data: consultants, loading, error } = useConsultantProfitability()

  if (!financialAccess) {
    return <EmptyState message="// accès restreint — admin uniquement" />
  }

  const sorted = useMemo(() =>
    [...(consultants ?? [])].sort((a, b) => ((b as any)[sort] ?? 0) - ((a as any)[sort] ?? 0)),
    [consultants, sort]
  )

  // ── KPIs ──────────────────────────────────────────────────
  const totalCA    = sorted.reduce((s, c: any) => s + (c.ca_genere    ?? 0), 0)
  const totalMarge = sorted.reduce((s, c: any) => s + (c.marge_brute  ?? 0), 0)
  const avgOcc     = sorted.length
    ? Math.round(sorted.reduce((s, c: any) => s + (c.occupancy_rate ?? 0), 0) / sorted.length)
    : 0
  const avgMarge   = sorted.length
    ? Math.round(sorted.reduce((s, c: any) => s + (c.marge_pct ?? 0), 0) / sorted.length)
    : 0

  const alertCible = sorted.filter((c: any) => isCibleAlert(c.tjm_cible, c.tjm_cout)).length

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <Topbar title="Rentabilité" breadcrumb="// vue par consultant — admin only" />

      <div className="app-content">

        <AdminBadge label="🔒 Données confidentielles — Admin uniquement" />

        {/* Alerte TJM cibles insuffisants */}
        {!loading && alertCible > 0 && (
          <div className="alert-warning">
            ⚠ {alertCible} {pluralFr(alertCible, 'consultant')} avec un TJM cible insuffisant (&lt;10% de marge sur coût)
          </div>
        )}

        {/* KPIs */}
        <div className="kpi-grid">
          {loading
            ? [0,1,2,3].map(i => <Skeleton key={i} h={100} />)
            : (
              <>
                <KpiCard label="CA total équipe"   value={fmt(totalCA)}    accent="cyan"  />
                <KpiCard label="Marge brute"        value={fmt(totalMarge)} accent="green" />
                <KpiCard label="Taux occup. moyen"  value={`${avgOcc}%`}   accent="gold"  />
                <KpiCard
                  label="Marge moyenne"
                  value={`${avgMarge}%`}
                  accent={avgMarge >= 20 ? 'green' : avgMarge >= 10 ? 'gold' : 'pink'}
                />
              </>
            )
          }
        </div>

        {/* Tri */}
        <div className="sort-bar">
          <span className="label-meta">Trier par</span>
          {SORTS.map(s => (
            <button
              key={s.key}
              className={`btn btn-sm ${sort === s.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Tableau */}
        <Panel
          title={loading ? '…' : `${sorted.length} ${pluralFr(sorted.length, 'consultant')}`}
          noPadding
        >
          {loading ? (
            <div style={{ padding: 18 }}><Skeleton h={200} /></div>
          ) : error ? (
            <EmptyState message={`// erreur chargement — ${error}`} />
          ) : sorted.length === 0 ? (
            <EmptyState
              message="// aucune donnée"
              sub="Renseignez les TJM consultants et projets actifs"
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Consultant</th>
                      <th style={{ textAlign: 'right' }}>Coût réel</th>
                      <th style={{ textAlign: 'right' }}>Cible vs coût</th>
                      <th style={{ textAlign: 'right' }}>Jours générés</th>
                      <th>Occupation</th>
                      <th style={{ textAlign: 'right' }}>CA généré</th>
                      <th style={{ textAlign: 'right' }}>Marge brute</th>
                      <th>Marge %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((c: any, i: number) => {
                      const occ    = c.occupancy_rate ?? 0
                      const mPct   = c.marge_pct ?? 0
                      const mColor = getMargeColor(mPct)
                      const oColor = progressColor(occ)

                      return (
                        <tr key={c.consultant_id}>

                          {/* Consultant */}
                          <td>
                            <div className="consultant-cell">
                              <span className="consultant-cell-rank">#{i + 1}</span>
                              <Avatar
                                initials={c.initials}
                                color={(c.avatar_color ?? 'green') as AvatarColor}
                                size="sm"
                              />
                              <div className="consultant-cell-info">
                                <div className="td-primary">{c.name}</div>
                                <div className="consultant-cell-meta">
                                  <span style={{ fontSize: 9, color: 'var(--text2)' }}>{c.role}</span>
                                  <ContractBadge type={c.contract_type ?? 'employee'} />
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* TJM coût réel */}
                          <td style={{ textAlign: 'right' }}>
                            {c.tjm_cout != null ? (
                              <div className="tjm-cell">
                                <span className="tjm-cell-value">{fmtTjm(c.tjm_cout)}</span>
                                <span className="tjm-cell-label">
                                  {c.contract_type === 'employee' ? 'chargé' : 'facturé'}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text2)', fontSize: 10 }}>—</span>
                            )}
                          </td>

                          {/* Cible vs coût */}
                          <td style={{ textAlign: 'right' }}>
                            <CibleGap tjmCible={c.tjm_cible} tjmCout={c.tjm_cout} />
                          </td>

                          {/* Jours */}
                          <td style={{ textAlign: 'right', color: 'var(--text2)' }}>
                            {c.jours_generes != null ? `${c.jours_generes}j` : '—'}
                          </td>

                          {/* Occupation */}
                          <td style={{ minWidth: 140 }}>
                            <div className="occ-cell">
                              <span className="occ-cell-pct" style={{ color: oColor }}>{occ}%</span>
                              <ProgressBar value={occ} color={oColor} />
                            </div>
                          </td>

                          {/* CA */}
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {c.ca_genere ? fmt(c.ca_genere) : '—'}
                          </td>

                          {/* Marge brute */}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: mColor }}>
                            {c.marge_brute ? fmt(c.marge_brute) : '—'}
                          </td>

                          {/* Marge % */}
                          <td style={{ minWidth: 140 }}>
                            {c.marge_pct != null ? (
                              <div className="occ-cell">
                                <MargeBadge pct={mPct} />
                                <ProgressBar value={mPct} max={50} color={mColor} />
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text2)', fontSize: 10 }}>—</span>
                            )}
                          </td>

                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <MargeLegend note="Coût réel = salaire chargé / 218j (salarié) · tarif facturé (freelance)" />
            </>
          )}
        </Panel>

      </div>
    </>
  )
}
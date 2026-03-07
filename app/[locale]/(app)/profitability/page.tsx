'use client'

import { useState, useMemo }             from 'react'
import { useTranslations }               from 'next-intl'

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
import { fmt, fmtTjm, getMargeColor, progressColor, isCibleAlert } from '@/lib/utils'
import type { AvatarColor }             from '@/types'

// ── Composants locaux ─────────────────────────────────────────

function Skeleton({ h = 80 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h }} />
}

function MargeBadge({ pct }: { pct: number }) {
  const color = getMargeColor(pct)
  return (
    <span className="marge-badge" style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}>
      {pct}%
    </span>
  )
}

function ContractBadge({ type, tCons }: { type: 'employee' | 'freelance'; tCons: any }) {
  return (
    <span className={`contract-badge contract-badge-${type}`}>
      {tCons(type === 'freelance' ? 'contractType.freelance' : 'contractType.employee')}
    </span>
  )
}

function CibleGap({ tjmCible, tjmCout, t }: {
  tjmCible: number | null
  tjmCout:  number | null
  t:        any
}) {
  if (!tjmCible || !tjmCout) return <span style={{ color: 'var(--text2)', fontSize: 10 }}>—</span>
  const gap    = tjmCible - tjmCout
  const gapPct = Math.round(gap / tjmCible * 100)
  const color  = getMargeColor(gapPct)
  const sign   = gap >= 0 ? '+' : ''
  return (
    <div className="cible-gap">
      <span className="cible-gap-pct" style={{ color }}>{sign}{gapPct}%</span>
      <span className="cible-gap-detail">{t('cibleGap', { cible: tjmCible, cout: tjmCout })}</span>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────
type SortKey = 'ca_genere' | 'marge_brute' | 'occupancy_rate' | 'marge_pct'

// ── Page ──────────────────────────────────────────────────────
export default function ProfitabilityPage() {
  const t       = useTranslations('profitability')
  const tCons   = useTranslations('consultants')
  const { user }        = useAuthContext()
  const financialAccess = canViewFinancials(user?.role)
  const [sort, setSort] = useState<SortKey>('ca_genere')

  const { data: consultants, loading, error } = useConsultantProfitability()

  if (!financialAccess) {
    return <EmptyState message={t('restricted')} />
  }

  const SORTS: { label: string; key: SortKey }[] = [
    { label: t('sort.ca'),        key: 'ca_genere'      },
    { label: t('sort.marge'),     key: 'marge_brute'    },
    { label: t('sort.margePct'),  key: 'marge_pct'      },
    { label: t('sort.occupation'),key: 'occupancy_rate' },
  ]

  const sorted = useMemo(() =>
    [...(consultants ?? [])].sort((a, b) => ((b as any)[sort] ?? 0) - ((a as any)[sort] ?? 0)),
    [consultants, sort]
  )

  const totalCA    = sorted.reduce((s, c: any) => s + (c.ca_genere    ?? 0), 0)
  const totalMarge = sorted.reduce((s, c: any) => s + (c.marge_brute  ?? 0), 0)
  const avgOcc     = sorted.length
    ? Math.round(sorted.reduce((s, c: any) => s + (c.occupancy_rate ?? 0), 0) / sorted.length)
    : 0
  const avgMarge   = sorted.length
    ? Math.round(sorted.reduce((s, c: any) => s + (c.marge_pct ?? 0), 0) / sorted.length)
    : 0

  const alertCible = sorted.filter((c: any) => isCibleAlert(c.tjm_cible, c.tjm_cout)).length

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">

        <AdminBadge label={t('adminBadge')} />

        {!loading && alertCible > 0 && (
          <div className="alert-warning">
            {t('alertCible', { count: alertCible })}
          </div>
        )}

        <div className="kpi-grid">
          {loading
            ? [0,1,2,3].map(i => <Skeleton key={i} h={100} />)
            : (
              <>
                <KpiCard label={t('kpi.totalCA')}    value={fmt(totalCA)}    accent="cyan"  />
                <KpiCard label={t('kpi.totalMarge')} value={fmt(totalMarge)} accent="green" />
                <KpiCard label={t('kpi.avgOcc')}     value={`${avgOcc}%`}   accent="gold"  />
                <KpiCard
                  label={t('kpi.avgMarge')}
                  value={`${avgMarge}%`}
                  accent={avgMarge >= 20 ? 'green' : avgMarge >= 10 ? 'gold' : 'pink'}
                />
              </>
            )
          }
        </div>

        <div className="sort-bar">
          <span className="label-meta">{t('sort.label')}</span>
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

        <Panel
          title={loading ? '…' : t('table.countLabel', { count: sorted.length })}
          noPadding
        >
          {loading ? (
            <div style={{ padding: 18 }}><Skeleton h={200} /></div>
          ) : error ? (
            <EmptyState message={t('table.errorLoading', { error })} />
          ) : sorted.length === 0 ? (
            <EmptyState message={t('table.noData')} sub={t('table.noDataSub')} />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('table.consultant')}</th>
                      <th style={{ textAlign: 'right' }}>{t('table.coutReel')}</th>
                      <th style={{ textAlign: 'right' }}>{t('table.cibleVsCout')}</th>
                      <th style={{ textAlign: 'right' }}>{t('table.jours')}</th>
                      <th>{t('table.occupation')}</th>
                      <th style={{ textAlign: 'right' }}>{t('table.ca')}</th>
                      <th style={{ textAlign: 'right' }}>{t('table.margeGross')}</th>
                      <th>{t('table.margePct')}</th>
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
                                  <ContractBadge type={c.contract_type ?? 'employee'} tCons={tCons} />
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            {c.tjm_cout != null ? (
                              <div className="tjm-cell">
                                <span className="tjm-cell-value">{fmtTjm(c.tjm_cout)}</span>
                                <span className="tjm-cell-label">
                                  {c.contract_type === 'employee'
                                    ? t('table.charged')
                                    : t('table.billed')
                                  }
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text2)', fontSize: 10 }}>—</span>
                            )}
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <CibleGap tjmCible={c.tjm_cible} tjmCout={c.tjm_cout} t={t} />
                          </td>

                          <td style={{ textAlign: 'right', color: 'var(--text2)' }}>
                            {c.jours_generes != null ? `${c.jours_generes}j` : '—'}
                          </td>

                          <td style={{ minWidth: 140 }}>
                            <div className="occ-cell">
                              <span className="occ-cell-pct" style={{ color: oColor }}>{occ}%</span>
                              <ProgressBar value={occ} color={oColor} />
                            </div>
                          </td>

                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {c.ca_genere ? fmt(c.ca_genere) : '—'}
                          </td>

                          <td style={{ textAlign: 'right', fontWeight: 700, color: mColor }}>
                            {c.marge_brute ? fmt(c.marge_brute) : '—'}
                          </td>

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

              <MargeLegend note={t('legend.costNote')} />
            </>
          )}
        </Panel>

      </div>
    </>
  )
}
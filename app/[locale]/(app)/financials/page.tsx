'use client'

import { useTranslations }        from 'next-intl'
import { useEffect }              from 'react'

import { Topbar }                 from '@/components/layout/Topbar'
import { Panel }                  from '@/components/ui/Panel'
import { KpiCard }                from '@/components/ui/KpiCard'
import { AdminBadge }             from '@/components/ui/AdminBadge'
import { EmptyState }             from '@/components/ui/EmptyState'
import { MargeBar }               from '@/components/ui/MargeBar'
import { MargeLegend }            from '@/components/ui/MargeLegend'

import { useAuthContext }         from '@/components/layout/AuthProvider'
import { useRouter }              from '@/lib/navigation'
import { useProjectFinancials }   from '@/lib/data'
import { fmt, getMargeColor, pluralFr } from '@/lib/utils'

// ── Skeleton local ────────────────────────────────────────────
function Skeleton({ h = 80 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h }} />
}

// ── Page ──────────────────────────────────────────────────────
export default function FinancialsPage() {
  const t                           = useTranslations('financials')
  const { user }                    = useAuthContext()
  const router                      = useRouter()
  const { data: projects, loading } = useProjectFinancials()

  // Guard — admin / super_admin uniquement
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'super_admin') {
      router.push('/dashboard' as never)
    }
  }, [user, router])

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return null

  // ── Agrégats KPI ──────────────────────────────────────────
  const totalCA     = projects?.reduce((s, p: any) => s + ((p.tjm_vendu ?? 0) * (p.jours_vendus ?? 0)), 0) ?? 0
  const totalMarge  = projects?.reduce((s, p: any) => s + (p.marge_brute_totale ?? 0), 0) ?? 0
  const avgMargePct = projects?.length
    ? Math.round(projects.reduce((s, p: any) => s + (p.marge_pct ?? 0), 0) / projects.length)
    : 0
  const bestProjet  = [...(projects ?? [])].sort((a: any, b: any) =>
    (b.marge_brute_totale ?? 0) - (a.marge_brute_totale ?? 0)
  )[0] as any

  const margeAccent = avgMargePct >= 20 ? 'green' : avgMargePct >= 10 ? 'gold' : 'pink'
  const margeSub    = avgMargePct >= 20 ? t('health.good') : avgMargePct >= 10 ? t('health.watch') : t('health.low')

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">

        <AdminBadge label={t('adminBadge')} />

        {/* KPIs */}
        <div className="kpi-grid">
          {loading ? (
            [0,1,2,3].map(i => <Skeleton key={i} h={100} />)
          ) : (
            <>
              <KpiCard
                label={t('kpi.totalCA')}
                value={fmt(totalCA)}
                sub={t('kpi.totalCASub')}
                accent="cyan"
              />
              <KpiCard
                label={t('kpi.totalMarge')}
                value={fmt(totalMarge)}
                sub={`${avgMargePct}%`}
                accent="green"
              />
              <KpiCard
                label={t('kpi.avgMarge')}
                value={`${avgMargePct}%`}
                sub={margeSub}
                accent={margeAccent}
              />
              <KpiCard
                label={t('kpi.bestMarge')}
                value={bestProjet?.name ?? '—'}
                sub={bestProjet ? `${fmt(bestProjet.marge_brute_totale ?? 0)} · ${bestProjet.marge_pct}%` : ''}
                accent="gold"
              />
            </>
          )}
        </div>

        {/* Tableau */}
        <Panel title={t('table.title')} noPadding>
          {loading ? (
            <div style={{ padding: 18 }}><Skeleton h={200} /></div>
          ) : !projects?.length ? (
            <EmptyState message={t('table.noData')} />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('table.project')}</th>
                      <th>{t('table.client')}</th>
                      <th style={{ textAlign: 'right' }}>{t('table.tjmSold')}</th>
                      <th style={{ textAlign: 'right' }}>{t('table.tjmReal')}</th>
                      <th style={{ textAlign: 'right' }}>{t('table.margeDay')}</th>
                      <th style={{ textAlign: 'right' }}>{t('table.margeGross')}</th>
                      <th style={{ minWidth: 160 }}>{t('table.margePct')}</th>
                      <th style={{ textAlign: 'center' }}>{t('table.team')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p: any) => {
                      const color = getMargeColor(p.marge_pct)
                      return (
                        <tr key={p.id}>
                          <td><span className="td-primary">{p.name}</span></td>
                          <td style={{ color: 'var(--text2)' }}>{p.client}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {p.tjm_vendu ? fmt(p.tjm_vendu) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text2)' }}>
                            {p.tjm_reel ? fmt(p.tjm_reel) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', color, fontWeight: 700 }}>
                            {p.marge_par_jour ? fmt(p.marge_par_jour) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', color, fontWeight: 700 }}>
                            {p.marge_brute_totale ? fmt(p.marge_brute_totale) : '—'}
                          </td>
                          <td style={{ minWidth: 160 }}>
                            <MargeBar pct={p.marge_pct ?? 0} />
                          </td>
                          <td style={{ textAlign: 'center', color: 'var(--text2)' }}>
                            {p.team_size} {pluralFr(p.team_size, t('table.consultant'), t('table.consultants'))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <MargeLegend />
            </>
          )}
        </Panel>

      </div>
    </>
  )
}
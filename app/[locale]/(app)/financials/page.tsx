'use client'

import { useTranslations }         from 'next-intl'
import { Topbar }                  from '@/components/layout/Topbar'
import { Panel, StatRow }          from '@/components/ui'
import { ProgressBar }             from '@/components/ui/ProgressBar'

import { useAuthContext }          from '@/components/layout/AuthProvider'
import { useRouter }               from '@/lib/navigation'
import { useEffect }               from 'react'
import { useProjectFinancials, type ProjectFinancials }  from '@/lib/data'

function Skeleton({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4, opacity: 0.6 }} />
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function MargeBar({ pct }: { pct: number }) {
  const color = pct >= 20 ? 'var(--green)' : pct >= 10 ? 'var(--gold)' : 'var(--pink)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${Math.min(pct, 100)}%`,
          background: color, borderRadius: 3, transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  )
}

function KpiFinancier({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent: string
}) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 4, padding: '20px 24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: accent }} />
      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function FinancierPage() {
  const t                                = useTranslations('financials')
  const { user }                         = useAuthContext()
  const router                           = useRouter()
  const { data: projects, loading }      = useProjectFinancials()

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard' as never)
    }
  }, [user, router])

  if (!user || user.role !== 'admin') return null

  const totalCA     = projects?.reduce((s: any, p: any) => s + ((p.tjm_vendu ?? 0) * (p.jours_vendus ?? 0)), 0) ?? 0
  const totalMarge  = projects?.reduce((s: any, p: any) => s + (p.marge_brute_totale ?? 0), 0) ?? 0
  const avgMargePct = projects?.length
    ? Math.round(projects.reduce((s: any, p: any) => s + (p.marge_pct ?? 0), 0) / projects.length)
    : 0
  const bestProjet  = projects?.sort((a, b) => (b.marge_brute_totale ?? 0) - (a.marge_brute_totale ?? 0))[0]

  return (
    <>
      <Topbar
        title={t('title')}
        breadcrumb={t('breadcrumb')}
      />

      <div className="app-content">

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', marginBottom: 20,
          background: 'rgba(255,45,107,0.08)', border: '1px solid rgba(255,45,107,0.25)',
          borderRadius: 3, fontSize: 10, letterSpacing: 2, color: 'var(--pink)',
          textTransform: 'uppercase',
        }}>
          {t('adminBadge')}
        </div>

        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          {loading ? (
            <>{[0,1,2,3].map((i: any) => <Skeleton key={i} h={100} />)}</>
          ) : (
            <>
              <KpiFinancier
                label={t('kpi.totalCA')}
                value={fmt(totalCA)}
                sub={t('kpi.totalCASub')}
                accent="var(--cyan)"
              />
              <KpiFinancier
                label={t('kpi.totalMarge')}
                value={fmt(totalMarge)}
                sub={`${avgMargePct}%`}
                accent="var(--green)"
              />
              <KpiFinancier
                label={t('kpi.avgMarge')}
                value={`${avgMargePct}%`}
                sub={avgMargePct >= 20 ? t('health.good') : avgMargePct >= 10 ? t('health.watch') : t('health.low')}
                accent={avgMargePct >= 20 ? 'var(--green)' : avgMargePct >= 10 ? 'var(--gold)' : 'var(--pink)'}
              />
              <KpiFinancier
                label={t('kpi.bestMarge')}
                value={bestProjet?.name ?? '—'}
                sub={bestProjet ? `${fmt(bestProjet.marge_brute_totale ?? 0)} · ${bestProjet.marge_pct}%` : ''}
                accent="var(--gold)"
              />
            </>
          )}
        </div>

        <Panel title={t('table.title')} noPadding>
          {loading ? (
            <div style={{ padding: 18 }}><Skeleton h={200} /></div>
          ) : !projects?.length ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
              {t('table.noData')}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                    const margeCouleur = (p.marge_pct ?? 0) >= 20
                      ? 'var(--green)'
                      : (p.marge_pct ?? 0) >= 10
                      ? 'var(--gold)'
                      : 'var(--pink)'

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
                        <td style={{ textAlign: 'right', color: margeCouleur, fontWeight: 700 }}>
                          {p.marge_par_jour ? fmt(p.marge_par_jour) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: margeCouleur }}>
                          {p.marge_brute_totale ? fmt(p.marge_brute_totale) : '—'}
                        </td>
                        <td style={{ minWidth: 160 }}>
                          <MargeBar pct={p.marge_pct ?? 0} />
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text2)' }}>
                          {p.team_size} {p.team_size > 1 ? t('table.consultants') : t('table.consultant')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 10, color: 'var(--text2)' }}>
          <span><span style={{ color: 'var(--green)', fontWeight: 700 }}>■</span> {t('legend.good')}</span>
          <span><span style={{ color: 'var(--gold)',  fontWeight: 700 }}>■</span> {t('legend.watch')}</span>
          <span><span style={{ color: 'var(--pink)',  fontWeight: 700 }}>■</span> {t('legend.low')}</span>
        </div>

      </div>
    </>
  )
}
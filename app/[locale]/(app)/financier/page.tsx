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
      <div style={{
        flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden',
      }}>
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
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: accent,
      }} />
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
  const { user }                         = useAuthContext()
  const router                           = useRouter()
  const { data: projects, loading }      = useProjectFinancials()

  // Garde admin uniquement
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard' as never)
    }
  }, [user, router])

  if (!user || user.role !== 'admin') return null

  // KPIs globaux
  const totalCA       = projects?.reduce((s: any, p: any) => s + ((p.tjm_vendu ?? 0) * (p.jours_vendus ?? 0)), 0) ?? 0
  const totalMarge    = projects?.reduce((s: any, p: any) => s + (p.marge_brute_totale ?? 0), 0) ?? 0
  const avgMargePct   = projects?.length
    ? Math.round(projects.reduce((s: any, p: any) => s + (p.marge_pct ?? 0), 0) / projects.length)
    : 0
  const bestProjet    = projects?.sort((a, b) => (b.marge_brute_totale ?? 0) - (a.marge_brute_totale ?? 0))[0]

  return (
    <>
      <Topbar
        title="Financier"
        breadcrumb="// vue marges & TJM — admin only"
      />

      <div className="app-content">

        {/* Badge admin */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', marginBottom: 20,
          background: 'rgba(255,45,107,0.08)', border: '1px solid rgba(255,45,107,0.25)',
          borderRadius: 3, fontSize: 10, letterSpacing: 2, color: 'var(--pink)',
          textTransform: 'uppercase',
        }}>
          🔒 Données confidentielles — Admin uniquement
        </div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          {loading ? (
            <>{[0,1,2,3].map((i: any) => <Skeleton key={i} h={100} />)}</>
          ) : (
            <>
              <KpiFinancier
                label="CA total potentiel"
                value={fmt(totalCA)}
                sub="Tous projets actifs"
                accent="var(--cyan)"
              />
              <KpiFinancier
                label="Marge brute totale"
                value={fmt(totalMarge)}
                sub={`${avgMargePct}% de marge moyenne`}
                accent="var(--green)"
              />
              <KpiFinancier
                label="Marge moyenne"
                value={`${avgMargePct}%`}
                sub={avgMargePct >= 20 ? '✓ Bonne santé' : avgMargePct >= 10 ? '⚠ À surveiller' : '⚠ Marge faible'}
                accent={avgMargePct >= 20 ? 'var(--green)' : avgMargePct >= 10 ? 'var(--gold)' : 'var(--pink)'}
              />
              <KpiFinancier
                label="Meilleure marge"
                value={bestProjet?.name ?? '—'}
                sub={bestProjet ? `${fmt(bestProjet.marge_brute_totale ?? 0)} · ${bestProjet.marge_pct}%` : ''}
                accent="var(--gold)"
              />
            </>
          )}
        </div>

        {/* Tableau détaillé */}
        <Panel title="Détail par projet" noPadding>
          {loading ? (
            <div style={{ padding: 18 }}><Skeleton h={200} /></div>
          ) : !projects?.length ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
              // aucun projet avec données financières
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Projet</th>
                    <th>Client</th>
                    <th style={{ textAlign: 'right' }}>TJM vendu</th>
                    <th style={{ textAlign: 'right' }}>TJM réel</th>
                    <th style={{ textAlign: 'right' }}>Marge/jour</th>
                    <th style={{ textAlign: 'right' }}>Marge brute</th>
                    <th style={{ minWidth: 160 }}>Marge %</th>
                    <th style={{ textAlign: 'center' }}>Équipe</th>
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
                          {p.team_size} consultant{p.team_size > 1 ? 's' : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Légende */}
        <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 10, color: 'var(--text2)' }}>
          <span><span style={{ color: 'var(--green)', fontWeight: 700 }}>■</span> Marge ≥ 20% — Bonne</span>
          <span><span style={{ color: 'var(--gold)',  fontWeight: 700 }}>■</span> Marge 10–20% — À surveiller</span>
          <span><span style={{ color: 'var(--pink)',  fontWeight: 700 }}>■</span> Marge &lt; 10% — Faible</span>
        </div>

      </div>
    </>
  )
}

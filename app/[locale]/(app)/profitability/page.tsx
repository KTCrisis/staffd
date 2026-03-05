'use client'

import { useState, useMemo }  from 'react'
import { useTranslations }    from 'next-intl'
import { useAuthContext }     from '@/components/layout/AuthProvider'
import { canViewFinancials }  from '@/lib/auth'
import { Topbar }             from '@/components/layout/Topbar'
import { Panel, StatRow }     from '@/components/ui'
import { Avatar }             from '@/components/ui/Avatar'
import type { AvatarColor } from '@/types'
import { ProgressBar }        from '@/components/ui/ProgressBar'

// ── Mock data ─────────────────────────────────────────────────
const MOCK_CONSULTANTS: {
  id: string; name: string; initials: string; avatarColor: AvatarColor
  role: string; tjm: number; occupancy: number; months: number
  ca: number; marge: number; margePct: number
}[] = [
  { id: '1', name: 'Alice Martin',   initials: 'AM', avatarColor: 'green',  role: 'Lead Developer',    tjm: 750, occupancy: 92, months: 11, ca: 68250, marge: 18750, margePct: 27 },
  { id: '2', name: 'Baptiste Leroi', initials: 'BL', avatarColor: 'cyan',   role: 'Data Engineer',     tjm: 680, occupancy: 78, months: 10, ca: 53040, marge: 12040, margePct: 23 },
  { id: '3', name: 'Clara Kim',      initials: 'CK', avatarColor: 'pink',   role: 'UX Designer',       tjm: 600, occupancy: 55, months: 8,  ca: 26400, marge: 4400,  margePct: 17 },
  { id: '4', name: 'David Mora',     initials: 'DM', avatarColor: 'gold',   role: 'DevOps Engineer',   tjm: 720, occupancy: 100,months: 12, ca: 86400, marge: 26400, margePct: 31 },
  { id: '5', name: 'Emma Petit',     initials: 'EP', avatarColor: 'purple', role: 'Backend Developer', tjm: 650, occupancy: 83, months: 9,  ca: 48750, marge: 9750,  margePct: 20 },
]

const PERIODS = ['3M', '6M', '12M']

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function MargeBadge({ pct }: { pct: number }) {
  const color = pct >= 25 ? 'var(--green)' : pct >= 15 ? 'var(--gold)' : 'var(--pink)'
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 1,
      padding: '2px 8px', borderRadius: 2,
      background: `${color}22`, border: `1px solid ${color}55`,
      color,
    }}>
      {pct}%
    </span>
  )
}

function Skeleton({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} />
}

export default function ProfitabilityPage() {
  const { user } = useAuthContext()
  const financialAccess = canViewFinancials(user?.role)

  const [period, setPeriod] = useState('12M')
  const [sort,   setSort]   = useState<'ca' | 'marge' | 'occupancy'>('ca')

  // Guard — page admin only
  if (!financialAccess) {
    return (
      <div style={{ padding: 40, color: 'var(--text2)', fontSize: 12 }}>
        // accès restreint — admin uniquement
      </div>
    )
  }

  const sorted = [...MOCK_CONSULTANTS].sort((a, b) => b[sort] - a[sort])

  const totalCA    = sorted.reduce((s, c) => s + c.ca, 0)
  const totalMarge = sorted.reduce((s, c) => s + c.marge, 0)
  const avgOcc     = Math.round(sorted.reduce((s, c) => s + c.occupancy, 0) / sorted.length)
  const avgMarge   = Math.round(sorted.reduce((s, c) => s + c.margePct, 0) / sorted.length)

  const stats = [
    { value: fmt(totalCA),    label: 'CA total équipe',  color: 'var(--cyan)' },
    { value: fmt(totalMarge), label: 'Marge brute',      color: 'var(--green)' },
    { value: `${avgOcc}%`,    label: 'Taux occup. moyen',color: 'var(--gold)' },
    { value: `${avgMarge}%`,  label: 'Marge moyenne',    color: avgMarge >= 20 ? 'var(--green)' : avgMarge >= 10 ? 'var(--gold)' : 'var(--pink)' },
  ]

  return (
    <>
      <Topbar
        title="Rentabilité"
        breadcrumb="// vue par consultant — admin only"
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
          {stats.map(s => (
            <div key={s.label} className="kpi-card" style={{ borderTop: `2px solid ${s.color}` }}>
              <div className="kpi-label">{s.label}</div>
              <div className="kpi-value" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Contrôles */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>Période</span>
          {PERIODS.map(p => (
            <button
              key={p}
              className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', alignSelf: 'center' }}>Trier par</span>
            {(['ca', 'marge', 'occupancy'] as const).map(s => (
              <button
                key={s}
                className={`btn btn-sm ${sort === s ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSort(s)}
              >
                {s === 'ca' ? 'CA' : s === 'marge' ? 'Marge' : 'Occupation'}
              </button>
            ))}
          </div>
        </div>

        {/* Table consultants */}
        <Panel title={`${sorted.length} consultants`} noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Consultant</th>
                  <th style={{ textAlign: 'right' }}>TJM</th>
                  <th>Occupation</th>
                  <th style={{ textAlign: 'right' }}>CA généré</th>
                  <th style={{ textAlign: 'right' }}>Marge brute</th>
                  <th>Marge %</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c, i) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Rank */}
                        <span style={{ fontSize: 9, color: 'var(--text2)', minWidth: 16 }}>#{i + 1}</span>
                        <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
                        <div>
                          <div className="td-primary">{c.name}</div>
                          <div style={{ fontSize: 9, color: 'var(--text2)' }}>{c.role}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {c.tjm} €/j
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, minWidth: 36,
                          color: c.occupancy >= 80 ? 'var(--green)' : c.occupancy >= 50 ? 'var(--gold)' : 'var(--pink)',
                        }}>
                          {c.occupancy}%
                        </span>
                        <ProgressBar
                          value={c.occupancy}
                          style={{ flex: 1, minWidth: 80 }}
                        />
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(c.ca)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 700 }}>{fmt(c.marge)}</td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MargeBadge pct={c.margePct} />
                        <ProgressBar
                          value={c.margePct}
                          style={{ flex: 1, minWidth: 60 }}
                          color={c.margePct >= 25 ? 'var(--green)' : c.margePct >= 15 ? 'var(--gold)' : 'var(--pink)'}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Légende */}
          <div style={{ display: 'flex', gap: 20, padding: '12px 18px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {[
              { color: 'var(--green)', label: 'Marge ≥ 25% — Excellente' },
              { color: 'var(--gold)',  label: 'Marge 15–25% — Correcte' },
              { color: 'var(--pink)',  label: 'Marge < 15% — À surveiller' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                <span style={{ fontSize: 10, color: 'var(--text2)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Note mock */}
        <div style={{ marginTop: 16, fontSize: 10, color: 'var(--text2)', opacity: 0.5 }}>
          // données simulées — sera branché sur Supabase (vue project_financials × consultants)
        </div>

      </div>
    </>
  )
}
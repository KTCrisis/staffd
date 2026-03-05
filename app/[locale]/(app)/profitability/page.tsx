'use client'

import { useState, useMemo }               from 'react'
import { useAuthContext }                   from '@/components/layout/AuthProvider'
import { canViewFinancials }                from '@/lib/auth'
import { useConsultantProfitability }       from '@/lib/data'
import type { AvatarColor }                from '@/types'
import { Topbar }                           from '@/components/layout/Topbar'
import { Panel }                            from '@/components/ui'
import { Avatar }                           from '@/components/ui/Avatar'

// ── Helpers ───────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function Skeleton({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} />
}

function MargeBadge({ pct }: { pct: number }) {
  const color = pct >= 25 ? 'var(--green)' : pct >= 15 ? 'var(--gold)' : 'var(--pink)'
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 1,
      padding: '2px 8px', borderRadius: 2,
      background: `${color}22`, border: `1px solid ${color}55`, color,
    }}>
      {pct}%
    </span>
  )
}

function MiniBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
    </div>
  )
}

/** Badge contract_type */
function ContractBadge({ type }: { type: 'employee' | 'freelance' }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 1,
      padding: '1px 6px', borderRadius: 2, textTransform: 'uppercase',
      background: type === 'freelance' ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.06)',
      border:     type === 'freelance' ? '1px solid rgba(0,229,255,0.3)' : '1px solid var(--border)',
      color:      type === 'freelance' ? 'var(--cyan)' : 'var(--text2)',
    }}>
      {type === 'freelance' ? 'Freelance' : 'Salarié'}
    </span>
  )
}

/**
 * Écart TJM cible vs TJM coût réel
 * Positif = marge disponible sur la cible, négatif = cible en dessous du coût
 */
function CibleGap({ tjmCible, tjmCout }: { tjmCible: number | null; tjmCout: number | null }) {
  if (!tjmCible || !tjmCout) return <span style={{ color: 'var(--text2)', fontSize: 10 }}>—</span>
  const gap    = tjmCible - tjmCout
  const gapPct = Math.round(gap / tjmCible * 100)
  const color  = gapPct >= 20 ? 'var(--green)' : gapPct >= 10 ? 'var(--gold)' : 'var(--pink)'
  const sign   = gap >= 0 ? '+' : ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color }}>
        {sign}{gapPct}%
      </span>
      <span style={{ fontSize: 9, color: 'var(--text2)' }}>
        cible {tjmCible}€ · coût {tjmCout}€
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

type SortKey = 'ca_genere' | 'marge_brute' | 'occupancy_rate' | 'marge_pct'

export default function ProfitabilityPage() {
  const { user }        = useAuthContext()
  const financialAccess = canViewFinancials(user?.role)
  const [sort, setSort] = useState<SortKey>('ca_genere')

  const { data: consultants, loading, error } = useConsultantProfitability()

  if (!financialAccess) {
    return (
      <div style={{ padding: 40, color: 'var(--text2)', fontSize: 12 }}>
        // accès restreint — admin uniquement
      </div>
    )
  }

  const sorted = useMemo(() =>
    [...(consultants ?? [])].sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0)),
    [consultants, sort]
  )

  // ── KPIs globaux ──────────────────────────────────────────
  const totalCA    = sorted.reduce((s, c) => s + (c.ca_genere    ?? 0), 0)
  const totalMarge = sorted.reduce((s, c) => s + (c.marge_brute  ?? 0), 0)
  const avgOcc     = sorted.length
    ? Math.round(sorted.reduce((s, c) => s + (c.occupancy_rate ?? 0), 0) / sorted.length)
    : 0
  const avgMarge   = sorted.length
    ? Math.round(sorted.reduce((s, c) => s + (c.marge_pct ?? 0), 0) / sorted.length)
    : 0

  // Nb consultants avec un écart cible défavorable (cible < coût + 10%)
  const alertCible = sorted.filter(c => {
    if (!c.tjm_cible || !c.tjm_cout) return false
    return (c.tjm_cible - c.tjm_cout) / c.tjm_cible * 100 < 10
  }).length

  const stats = [
    { value: fmt(totalCA),           label: 'CA total équipe',   color: 'var(--cyan)' },
    { value: fmt(totalMarge),        label: 'Marge brute',       color: 'var(--green)' },
    { value: `${avgOcc}%`,           label: 'Taux occup. moyen', color: 'var(--gold)' },
    {
      value: `${avgMarge}%`,
      label: 'Marge moyenne',
      color: avgMarge >= 20 ? 'var(--green)' : avgMarge >= 10 ? 'var(--gold)' : 'var(--pink)',
    },
  ]

  const SORTS: { label: string; key: SortKey }[] = [
    { label: 'CA',         key: 'ca_genere' },
    { label: 'Marge',      key: 'marge_brute' },
    { label: 'Marge %',    key: 'marge_pct' },
    { label: 'Occupation', key: 'occupancy_rate' },
  ]

  return (
    <>
      <Topbar title="Rentabilité" breadcrumb="// vue par consultant — admin only" />

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

        {/* Alerte cibles non atteintes */}
        {!loading && alertCible > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', marginBottom: 20,
            background: 'rgba(255,209,102,0.06)', border: '1px solid rgba(255,209,102,0.25)',
            borderRadius: 4, fontSize: 11, color: 'var(--gold)',
          }}>
            ⚠ {alertCible} consultant{alertCible > 1 ? 's' : ''} avec un TJM cible insuffisant (&lt;10% de marge sur coût)
          </div>
        )}

        {/* KPIs */}
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          {loading
            ? <>{[0,1,2,3].map(i => <Skeleton key={i} h={100} />)}</>
            : stats.map(s => (
                <div key={s.label} className="kpi-card" style={{ borderTop: `2px solid ${s.color}` }}>
                  <div className="kpi-label">{s.label}</div>
                  <div className="kpi-value" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
                </div>
              ))
          }
        </div>

        {/* Tri */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
            Trier par
          </span>
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

        {/* Table */}
        <Panel title={loading ? '…' : `${sorted.length} consultant${sorted.length > 1 ? 's' : ''}`} noPadding>
          {loading ? (
            <div style={{ padding: 18 }}><Skeleton h={200} /></div>
          ) : error ? (
            <div style={{ padding: '24px 18px', color: 'var(--pink)', fontSize: 12 }}>
              // erreur chargement — {error}
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
              // aucune donnée — renseignez les TJM consultants et projets actifs
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                  {sorted.map((c, i) => {
                    const occ      = c.occupancy_rate ?? 0
                    const occColor = occ >= 80 ? 'var(--green)' : occ >= 50 ? 'var(--gold)' : 'var(--pink)'
                    const mPct     = c.marge_pct ?? 0
                    const mColor   = mPct >= 25 ? 'var(--green)' : mPct >= 15 ? 'var(--gold)' : 'var(--pink)'

                    return (
                      <tr key={c.consultant_id}>

                        {/* Consultant + contrat */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 9, color: 'var(--text2)', minWidth: 16 }}>#{i + 1}</span>
                            <Avatar
                              initials={c.initials}
                              color={(c.avatar_color ?? 'green') as AvatarColor}
                              size="sm"
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <div className="td-primary">{c.name}</div>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: 9, color: 'var(--text2)' }}>{c.role}</span>
                                <ContractBadge type={c.contract_type ?? 'employee'} />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* TJM coût réel — calculé selon contrat */}
                        <td style={{ textAlign: 'right' }}>
                          {c.tjm_cout != null ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                                {c.tjm_cout} €/j
                              </span>
                              <span style={{ fontSize: 9, color: 'var(--text2)' }}>
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

                        {/* Jours générés */}
                        <td style={{ textAlign: 'right', color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
                          {c.jours_generes != null ? `${c.jours_generes}j` : '—'}
                        </td>

                        {/* Occupation */}
                        <td style={{ minWidth: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, minWidth: 36, color: occColor }}>
                              {occ}%
                            </span>
                            <MiniBar value={occ} color={occColor} />
                          </div>
                        </td>

                        {/* CA généré */}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <MargeBadge pct={mPct} />
                              <MiniBar value={mPct} max={50} color={mColor} />
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
          )}

          {/* Légende */}
          {!loading && sorted.length > 0 && (
            <div style={{
              display: 'flex', gap: 20, padding: '12px 18px',
              borderTop: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center',
            }}>
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
              <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>
                Coût réel = salaire chargé / 218j (salarié) · tarif facturé (freelance)
              </span>
              <span style={{ fontSize: 9, color: 'var(--text2)', opacity: 0.5 }}>
                // vue consultant_profitability · projets actifs uniquement
              </span>
            </div>
          )}
        </Panel>

      </div>
    </>
  )
}
'use client'

import { useState }          from 'react'
import { useTranslations }   from 'next-intl'
import { useAuthContext }    from '@/components/layout/AuthProvider'
import { canEdit }           from '@/lib/auth'
import { Topbar }            from '@/components/layout/Topbar'
import { Panel, StatRow }    from '@/components/ui'
import { Avatar }            from '@/components/ui/Avatar'
import { Badge }             from '@/components/ui/Badge'

// ── Types ─────────────────────────────────────────────────────

type BidStatus = 'draft' | 'analysis' | 'staffed' | 'submitted' | 'won' | 'lost'

interface Bid {
  id:          string
  title:       string
  client:      string
  deadline:    string
  status:      BidStatus
  probability: number
  budget?:     number
  profiles:    { role: string; count: number; matched: boolean }[]
  team?:       { initials: string; color: string; name: string }[]
}

// ── Mock data ─────────────────────────────────────────────────

const MOCK_BIDS: Bid[] = [
  {
    id: '1',
    title: 'Transformation Data - Groupe Renault',
    client: 'Renault',
    deadline: '2026-03-20',
    status: 'analysis',
    probability: 65,
    budget: 280000,
    profiles: [
      { role: 'Data Engineer',    count: 2, matched: true },
      { role: 'Data Architect',   count: 1, matched: true },
      { role: 'ML Engineer',      count: 1, matched: false },
    ],
    team: [
      { initials: 'AM', color: 'green', name: 'Alice Martin' },
      { initials: 'BL', color: 'cyan',  name: 'Baptiste Leroi' },
    ],
  },
  {
    id: '2',
    title: 'Refonte SI RH - Ministère de l\'Éducation',
    client: 'Min. Éducation',
    deadline: '2026-04-05',
    status: 'staffed',
    probability: 45,
    budget: 450000,
    profiles: [
      { role: 'Tech Lead Java',     count: 1, matched: true },
      { role: 'Développeur React',  count: 2, matched: true },
      { role: 'Scrum Master',       count: 1, matched: true },
    ],
    team: [
      { initials: 'DM', color: 'gold',   name: 'David Mora' },
      { initials: 'EP', color: 'purple', name: 'Emma Petit' },
      { initials: 'CK', color: 'pink',   name: 'Clara Kim' },
    ],
  },
  {
    id: '3',
    title: 'Audit Cybersécurité - BNP Paribas',
    client: 'BNP Paribas',
    deadline: '2026-03-15',
    status: 'draft',
    probability: 30,
    budget: 120000,
    profiles: [
      { role: 'Expert Sécurité',  count: 1, matched: false },
      { role: 'Pentester',        count: 1, matched: false },
    ],
    team: [],
  },
  {
    id: '4',
    title: 'Migration Cloud - Totalenergies',
    client: 'TotalEnergies',
    deadline: '2026-02-28',
    status: 'won',
    probability: 100,
    budget: 380000,
    profiles: [
      { role: 'Cloud Architect', count: 1, matched: true },
      { role: 'DevOps',          count: 2, matched: true },
    ],
    team: [
      { initials: 'AM', color: 'green', name: 'Alice Martin' },
      { initials: 'DM', color: 'gold',  name: 'David Mora' },
    ],
  },
]

const STATUS_LABELS: Record<BidStatus, string> = {
  draft:     'Brouillon',
  analysis:  'Analyse IA',
  staffed:   'Équipe prête',
  submitted: 'Soumis',
  won:       'Gagné ✓',
  lost:      'Perdu',
}

const STATUS_COLORS: Record<BidStatus, string> = {
  draft:     'var(--text2)',
  analysis:  'var(--cyan)',
  staffed:   'var(--green)',
  submitted: 'var(--gold)',
  won:       'var(--green)',
  lost:      'var(--pink)',
}

function StatusTag({ status }: { status: BidStatus }) {
  return (
    <span style={{
      fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 2,
      color: STATUS_COLORS[status],
      background: `${STATUS_COLORS[status]}22`,
      border: `1px solid ${STATUS_COLORS[status]}44`,
    }}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function ProbabilityBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--gold)' : 'var(--pink)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 36 }}>{pct}%</span>
      <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function daysLeft(deadline: string) {
  const d = new Date(deadline)
  const n = new Date()
  const diff = Math.ceil((d.getTime() - n.getTime()) / 86400000)
  if (diff < 0)  return { label: 'Expiré',     color: 'var(--text2)' }
  if (diff === 0) return { label: "Aujourd'hui", color: 'var(--pink)' }
  if (diff <= 7) return { label: `${diff}j`,   color: 'var(--pink)' }
  if (diff <= 14) return { label: `${diff}j`,  color: 'var(--gold)' }
  return { label: `${diff}j`, color: 'var(--text2)' }
}

export default function BidsPage() {
  const { user }   = useAuthContext()
  const editAccess = canEdit(user?.role)

  const [selected, setSelected] = useState<Bid | null>(null)
  const [filter,   setFilter]   = useState<BidStatus | 'all'>('all')

  const visible = MOCK_BIDS.filter(b => filter === 'all' || b.status === filter)

  const stats = [
    { value: MOCK_BIDS.filter(b => ['draft','analysis','staffed','submitted'].includes(b.status)).length, label: 'En cours',  color: 'var(--cyan)' },
    { value: MOCK_BIDS.filter(b => b.status === 'won').length,  label: 'Gagnés',    color: 'var(--green)' },
    { value: MOCK_BIDS.filter(b => b.status === 'lost').length, label: 'Perdus',    color: 'var(--pink)' },
    {
      value: fmt(MOCK_BIDS.filter(b => b.status === 'won').reduce((s, b) => s + (b.budget ?? 0), 0)),
      label: 'CA gagné',
      color: 'var(--gold)',
    },
  ]

  const FILTERS: { label: string; value: BidStatus | 'all' }[] = [
    { label: 'Tous',        value: 'all' },
    { label: 'Brouillon',   value: 'draft' },
    { label: 'Analyse IA',  value: 'analysis' },
    { label: 'Équipe prête',value: 'staffed' },
    { label: 'Soumis',      value: 'submitted' },
    { label: 'Gagnés',      value: 'won' },
  ]

  return (
    <>
      <Topbar
        title="Appels d'offres"
        breadcrumb="// pipeline & staffing IA"
        ctaLabel={editAccess ? '+ Nouvel AO' : undefined}
        onCta={editAccess ? () => {} : undefined}
      />

      <div className="app-content">

        <StatRow stats={stats} />

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="two-col">

          {/* ── Liste AO ── */}
          <Panel title={`${visible.length} appel${visible.length > 1 ? 's' : ''} d'offres`} noPadding>
            {visible.map(bid => {
              const dl     = daysLeft(bid.deadline)
              const gaps   = bid.profiles.filter(p => !p.matched).length
              const isSelected = selected?.id === bid.id

              return (
                <div
                  key={bid.id}
                  onClick={() => setSelected(isSelected ? null : bid)}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--bg3)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Header ligne */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                        {bid.title}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text2)' }}>{bid.client}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <StatusTag status={bid.status} />
                      <span style={{ fontSize: 9, color: dl.color }}>↯ {dl.label}</span>
                    </div>
                  </div>

                  {/* Probabilité */}
                  <ProbabilityBar pct={bid.probability} />

                  {/* Team + gaps */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: -4 }}>
                      {bid.team && bid.team.length > 0 ? (
                        bid.team.map((m, i) => (
                          <div
                            key={i}
                            title={m.name}
                            style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: `var(--${m.color})`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 8, fontWeight: 700, color: 'var(--bg)',
                              marginLeft: i > 0 ? -6 : 0,
                              border: '1px solid var(--bg2)',
                            }}
                          >
                            {m.initials}
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: 9, color: 'var(--text2)' }}>// aucune équipe</span>
                      )}
                    </div>
                    {gaps > 0 && (
                      <span style={{
                        fontSize: 9, color: 'var(--pink)',
                        background: 'rgba(255,45,107,0.1)',
                        padding: '2px 6px', borderRadius: 2,
                      }}>
                        ⚠ {gaps} profil{gaps > 1 ? 's' : ''} manquant{gaps > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {visible.length === 0 && (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                // aucun appel d'offres
              </div>
            )}
          </Panel>

          {/* ── Drawer AO ── */}
          {selected ? (
            <Panel title="// détail AO">
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                {selected.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 16 }}>
                {selected.client}
              </div>

              {[
                { label: 'Statut',      value: <StatusTag status={selected.status} /> },
                { label: 'Échéance',    value: new Date(selected.deadline).toLocaleDateString('fr-FR') },
                { label: 'Budget',      value: selected.budget ? fmt(selected.budget) : '—' },
                { label: 'Probabilité', value: `${selected.probability}%` },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 12,
                }}>
                  <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}

              {/* Profils requis */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 10 }}>
                  Profils requis
                </div>
                {selected.profiles.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', marginBottom: 4, borderRadius: 3,
                    background: p.matched ? 'rgba(0,255,136,0.06)' : 'rgba(255,45,107,0.06)',
                    border: `1px solid ${p.matched ? 'rgba(0,255,136,0.2)' : 'rgba(255,45,107,0.2)'}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{p.role}</div>
                      <div style={{ fontSize: 9, color: 'var(--text2)' }}>×{p.count}</div>
                    </div>
                    <span style={{ fontSize: 10, color: p.matched ? 'var(--green)' : 'var(--pink)' }}>
                      {p.matched ? '✓ Matchée' : '⚠ Manquant'}
                    </span>
                  </div>
                ))}
              </div>

              {/* IA analyse — mock */}
              <div style={{
                marginTop: 20, padding: '12px 14px',
                background: 'rgba(0,229,255,0.05)',
                border: '1px solid rgba(0,229,255,0.2)',
                borderRadius: 4,
              }}>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 8 }}>
                  ⚡ Analyse IA
                </div>
                <div style={{ fontSize: 10, color: 'var(--text2)', lineHeight: 1.6 }}>
                  {selected.status === 'analysis'
                    ? '// Extraction des profils en cours... Upload un PDF pour lancer l\'analyse'
                    : selected.profiles.filter(p => !p.matched).length > 0
                    ? `// ${selected.profiles.filter(p => !p.matched).length} profil(s) non couvert(s) par l'équipe actuelle. Envisager un recrutement ou sous-traitance.`
                    : '// Équipe complète — tous les profils sont couverts. Prêt à soumettre.'
                  }
                </div>
              </div>

              {/* Actions */}
              {editAccess && (
                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }}>
                    ✏ Modifier
                  </button>
                  <button className="btn btn-ghost" style={{ flex: 1, color: 'var(--cyan)' }}>
                    ⚡ Analyser AO
                  </button>
                </div>
              )}

              {/* Note mock */}
              <div style={{ marginTop: 12, fontSize: 9, color: 'var(--text2)', opacity: 0.5 }}>
                // module avant-vente — intégration IA à venir
              </div>
            </Panel>
          ) : (
            <Panel title="// sélectionnez un AO">
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 11 }}>
                Cliquez sur un appel d'offres pour voir le détail
              </div>
            </Panel>
          )}

        </div>

        {/* Note mock global */}
        <div style={{ marginTop: 16, fontSize: 10, color: 'var(--text2)', opacity: 0.5 }}>
          // données simulées — sera branché sur Supabase + module IA (upload PDF AO, extraction profils, matching consultants)
        </div>

      </div>
    </>
  )
}
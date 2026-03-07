// components/bids/BidsClient.tsx
// ── Client Component ─────────────────────────────────────────

'use client'

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import { canEdit }         from '@/lib/auth'
import { Panel, StatRow }  from '@/components/ui'
import { EmptyState }      from '@/components/ui/EmptyState'
import { fmt }             from '@/lib/utils'

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
    id: '1', title: 'Transformation Data - Groupe Renault', client: 'Renault',
    deadline: '2026-03-20', status: 'analysis', probability: 65, budget: 280000,
    profiles: [
      { role: 'Data Engineer',  count: 2, matched: true  },
      { role: 'Data Architect', count: 1, matched: true  },
      { role: 'ML Engineer',    count: 1, matched: false },
    ],
    team: [
      { initials: 'AM', color: 'green', name: 'Alice Martin'   },
      { initials: 'BL', color: 'cyan',  name: 'Baptiste Leroi' },
    ],
  },
  {
    id: '2', title: "Refonte SI RH - Ministère de l'Éducation", client: 'Min. Éducation',
    deadline: '2026-04-05', status: 'staffed', probability: 45, budget: 450000,
    profiles: [
      { role: 'Tech Lead Java',    count: 1, matched: true },
      { role: 'Développeur React', count: 2, matched: true },
      { role: 'Scrum Master',      count: 1, matched: true },
    ],
    team: [
      { initials: 'DM', color: 'gold',   name: 'David Mora' },
      { initials: 'EP', color: 'purple', name: 'Emma Petit' },
      { initials: 'CK', color: 'pink',   name: 'Clara Kim'  },
    ],
  },
  {
    id: '3', title: 'Audit Cybersécurité - BNP Paribas', client: 'BNP Paribas',
    deadline: '2026-03-15', status: 'draft', probability: 30, budget: 120000,
    profiles: [
      { role: 'Expert Sécurité', count: 1, matched: false },
      { role: 'Pentester',       count: 1, matched: false },
    ],
    team: [],
  },
  {
    id: '4', title: 'Migration Cloud - Totalenergies', client: 'TotalEnergies',
    deadline: '2026-02-28', status: 'won', probability: 100, budget: 380000,
    profiles: [
      { role: 'Cloud Architect', count: 1, matched: true },
      { role: 'DevOps',          count: 2, matched: true },
    ],
    team: [
      { initials: 'AM', color: 'green', name: 'Alice Martin' },
      { initials: 'DM', color: 'gold',  name: 'David Mora'   },
    ],
  },
]

const STATUS_COLORS: Record<BidStatus, string> = {
  draft:     'var(--text2)',
  analysis:  'var(--cyan)',
  staffed:   'var(--green)',
  submitted: 'var(--gold)',
  won:       'var(--green)',
  lost:      'var(--pink)',
}

// ── Props ─────────────────────────────────────────────────────

interface Props {
  userRole?: string
}

// ── Composant principal ───────────────────────────────────────

export function BidsClient({ userRole }: Props) {
  const t          = useTranslations('bids')
  const editAccess = canEdit(userRole)

  const [selected, setSelected] = useState<Bid | null>(null)
  const [filter,   setFilter]   = useState<BidStatus | 'all'>('all')

  const visible = MOCK_BIDS.filter(b => filter === 'all' || b.status === filter)
  const wonBids = MOCK_BIDS.filter(b => b.status === 'won')

  function daysLeft(deadline: string): { label: string; color: string } {
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    if (diff < 0)   return { label: t('deadline.expired'), color: 'var(--text2)' }
    if (diff === 0) return { label: t('deadline.today'),   color: 'var(--pink)'  }
    if (diff <= 7)  return { label: `${diff}j`,            color: 'var(--pink)'  }
    if (diff <= 14) return { label: `${diff}j`,            color: 'var(--gold)'  }
    return                  { label: `${diff}j`,            color: 'var(--text2)' }
  }

  function StatusTag({ status }: { status: BidStatus }) {
    const color = STATUS_COLORS[status]
    return (
      <span className="bid-status-tag" style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}>
        {t(`statuses.${status}`)}
      </span>
    )
  }

  function ProbabilityBar({ pct }: { pct: number }) {
    const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--gold)' : 'var(--pink)'
    return (
      <div className="bid-prob">
        <span className="bid-prob-pct" style={{ color }}>{pct}%</span>
        <div className="bid-prob-track">
          <div className="bid-prob-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    )
  }

  function BidTeamAvatars({ team }: { team: Bid['team'] }) {
    if (!team?.length) return <span className="bid-no-team">{t('noTeam')}</span>
    return (
      <div className="bid-team">
        {team.map((m, i) => (
          <div key={i} title={m.name} className="bid-team-avatar"
            style={{ background: `var(--${m.color})`, marginLeft: i > 0 ? -6 : 0 }}>
            {m.initials}
          </div>
        ))}
      </div>
    )
  }

  function GapBadge({ count }: { count: number }) {
    if (count === 0) return null
    return <span className="bid-gap-badge">⚠ {t('gap', { count })}</span>
  }

  function ProfileRow({ p }: { p: { role: string; count: number; matched: boolean } }) {
    const color = p.matched ? 'rgba(0,255,136,' : 'rgba(255,45,107,'
    return (
      <div className="bid-profile-row" style={{ background: `${color}0.06)`, border: `1px solid ${color}0.2)` }}>
        <div>
          <div className="bid-profile-role">{p.role}</div>
          <div className="bid-profile-count">×{p.count}</div>
        </div>
        <span style={{ fontSize: 10, color: p.matched ? 'var(--green)' : 'var(--pink)' }}>
          {p.matched ? t('profile.matched') : t('profile.missing')}
        </span>
      </div>
    )
  }

  const stats = [
    { value: MOCK_BIDS.filter(b => ['draft','analysis','staffed','submitted'].includes(b.status)).length, label: t('stats.inProgress'), color: 'var(--cyan)'  },
    { value: wonBids.length,                                                                               label: t('stats.won'),        color: 'var(--green)' },
    { value: MOCK_BIDS.filter(b => b.status === 'lost').length,                                           label: t('stats.lost'),       color: 'var(--pink)'  },
    { value: fmt(wonBids.reduce((s, b) => s + (b.budget ?? 0), 0)),                                       label: t('stats.revenue'),    color: 'var(--gold)'  },
  ]

  const FILTERS: { label: string; value: BidStatus | 'all' }[] = [
    { label: t('filters.all'),       value: 'all'       },
    { label: t('filters.draft'),     value: 'draft'     },
    { label: t('filters.analysis'),  value: 'analysis'  },
    { label: t('filters.staffed'),   value: 'staffed'   },
    { label: t('filters.submitted'), value: 'submitted' },
    { label: t('filters.won'),       value: 'won'       },
  ]

  function aiText(bid: Bid): string {
    if (bid.status === 'analysis') return t('drawer.aiAnalyzing')
    const gaps = bid.profiles.filter(p => !p.matched).length
    if (gaps > 0) return t('drawer.aiGaps', { count: gaps })
    return t('drawer.aiReady')
  }

  return (
    <div className="app-content">

      <StatRow stats={stats} />

      <div className="sort-bar" style={{ flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.value} className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
        {editAccess && (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => {}}>
            {t('cta')}
          </button>
        )}
      </div>

      <div className="two-col">

        <Panel title={t('listTitle', { count: visible.length })} noPadding>
          {visible.length === 0 ? (
            <EmptyState message={t('empty')} />
          ) : visible.map(bid => {
            const dl         = daysLeft(bid.deadline)
            const gaps       = bid.profiles.filter(p => !p.matched).length
            const isSelected = selected?.id === bid.id
            return (
              <div key={bid.id} onClick={() => setSelected(isSelected ? null : bid)}
                className="bid-row" style={{ background: isSelected ? 'var(--bg3)' : 'transparent' }}>
                <div className="bid-row-header">
                  <div>
                    <div className="bid-title">{bid.title}</div>
                    <div className="bid-client">{bid.client}</div>
                  </div>
                  <div className="bid-row-meta">
                    <StatusTag status={bid.status} />
                    <span className="bid-deadline" style={{ color: dl.color }}>↯ {dl.label}</span>
                  </div>
                </div>
                <ProbabilityBar pct={bid.probability} />
                <div className="bid-row-footer">
                  <BidTeamAvatars team={bid.team} />
                  <GapBadge count={gaps} />
                </div>
              </div>
            )
          })}
        </Panel>

        {selected ? (
          <Panel title={t('drawer.title')}>
            <div className="bid-drawer-title">{selected.title}</div>
            <div className="bid-drawer-client">{selected.client}</div>

            {([
              { label: t('drawer.status'),     value: <StatusTag status={selected.status} /> },
              { label: t('drawer.deadline'),    value: new Date(selected.deadline).toLocaleDateString('fr-FR') },
              { label: t('drawer.budget'),      value: selected.budget ? fmt(selected.budget) : '—' },
              { label: t('drawer.probability'), value: `${selected.probability}%` },
            ] as { label: string; value: React.ReactNode }[]).map(row => (
              <div key={row.label} className="bid-drawer-row">
                <span className="bid-drawer-row-label">{row.label}</span>
                <span className="bid-drawer-row-value">{row.value}</span>
              </div>
            ))}

            <div className="bid-profiles">
              <div className="label-meta" style={{ marginBottom: 10 }}>{t('drawer.profiles')}</div>
              {selected.profiles.map((p, i) => <ProfileRow key={i} p={p} />)}
            </div>

            <div className="bid-ai-block">
              <div className="bid-ai-label">{t('drawer.ai')}</div>
              <div className="bid-ai-text">{aiText(selected)}</div>
            </div>

            {editAccess && (
              <div className="bid-drawer-actions">
                <button className="btn btn-primary" style={{ flex: 1 }}>{t('drawer.edit')}</button>
                <button className="btn btn-ghost" style={{ flex: 1, color: 'var(--cyan)' }}>{t('drawer.analyze')}</button>
              </div>
            )}

            <div className="bid-mock-note">{t('mockNote')}</div>
          </Panel>
        ) : (
          <Panel title={t('drawer.empty')}>
            <EmptyState message={t('drawer.emptyHint')} />
          </Panel>
        )}

      </div>

      <div className="bid-mock-note" style={{ marginTop: 16 }}>{t('mockNote')}</div>

    </div>
  )
}
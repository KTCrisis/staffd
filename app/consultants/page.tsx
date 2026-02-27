'use client'

import { useState }          from 'react'
import { Topbar }            from '@/components/layout/Topbar'
import { Panel, StatRow }    from '@/components/ui'
import { ConsultantTable }   from '@/components/consultants/ConsultantTable'
import { CONSULTANTS }       from '@/lib/mock'
import type { ConsultantStatus, Consultant } from '@/types'

const FILTERS: { label: string; value: ConsultantStatus | 'all' }[] = [
  { label: 'Tous',        value: 'all' },
  { label: 'En mission',  value: 'assigned' },
  { label: 'Disponibles', value: 'available' },
  { label: 'En congé',    value: 'leave' },
  { label: 'Partiel',     value: 'partial' },
]

export default function ConsultantsPage() {
  const [filter, setFilter]     = useState<ConsultantStatus | 'all'>('all')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Consultant | null>(null)

  const visible = CONSULTANTS.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
                     || c.role.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const stats = [
    { value: CONSULTANTS.filter(c => c.status === 'assigned').length,  label: 'En mission',  color: 'var(--cyan)' },
    { value: CONSULTANTS.filter(c => c.status === 'available').length, label: 'Disponibles', color: 'var(--green)' },
    { value: CONSULTANTS.filter(c => c.status === 'leave').length,     label: 'En congé',    color: 'var(--gold)' },
    { value: CONSULTANTS.filter(c => c.status === 'partial').length,   label: 'Partiel',     color: 'var(--purple)' },
  ]

  return (
    <>
      <Topbar title="Consultants" breadcrumb="// équipe" ctaLabel="+ Consultant" onCta={() => {}} />

      <div className="app-content">

        <StatRow stats={stats} />

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
          <input
            className="search-input"
            style={{ marginLeft: 'auto' }}
            placeholder="Nom, rôle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Panel
          title={`${visible.length} consultant${visible.length > 1 ? 's' : ''}`}
          action={{ label: '↓ Exporter', onClick: () => {} }}
          noPadding
        >
          {visible.length > 0
            ? <ConsultantTable consultants={visible} onSelect={setSelected} />
            : <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>// aucun résultat</div>
          }
        </Panel>

        {/* Drawer fiche consultant */}
        {selected && (
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
            background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
            zIndex: 200, padding: 28, overflowY: 'auto',
            boxShadow: '-4px 0 20px var(--shadow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>// fiche consultant</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕ Fermer</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div className={`avatar av-${selected.avatarColor}`} style={{ width: 48, height: 48, fontSize: 16 }}>
                {selected.initials}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{selected.role}</div>
              </div>
            </div>

            {[
              { label: 'Statut',      value: <span className={`badge badge-${selected.status}`}>{selected.status}</span> },
              { label: 'Projet',      value: selected.currentProject ?? '—' },
              { label: 'Disponible',  value: selected.availableFrom ? new Date(selected.availableFrom).toLocaleDateString('fr-FR') : 'Maintenant' },
              { label: 'CP restants', value: `${selected.leaveDaysLeft} jours` },
              { label: 'Occupation',  value: `${selected.occupancyRate}%` },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>Taux d&apos;occupation</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{selected.occupancyRate}%</div>
              <div className="progress-bar" style={{ height: 6 }}>
                <div className="progress-fill" style={{ width: `${selected.occupancyRate}%`, background: selected.occupancyRate >= 80 ? 'var(--green)' : selected.occupancyRate >= 50 ? 'var(--gold)' : 'var(--cyan)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
              <button className="btn btn-primary" style={{ flex: 1 }}>✏ Modifier</button>
              <button className="btn btn-ghost" style={{ flex: 1 }}>📋 Historique</button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}

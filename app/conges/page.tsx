'use client'

import { useState }              from 'react'
import { Topbar }                from '@/components/layout/Topbar'
import { Panel, StatRow }        from '@/components/ui'
import { LeaveRequestCard }      from '@/components/conges/LeaveRequestCard'
import { LeaveSolde }            from '@/components/conges/LeaveSolde'
import { LEAVE_REQUESTS, CONSULTANTS } from '@/lib/mock'
import type { LeaveRequest, LeaveStatus } from '@/types'

const FILTERS: { label: string; value: LeaveStatus | 'all' }[] = [
  { label: 'Toutes',      value: 'all' },
  { label: 'En attente',  value: 'pending' },
  { label: 'Approuvées',  value: 'approved' },
  { label: 'Refusées',    value: 'refused' },
]

export default function CongesPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>(LEAVE_REQUESTS)
  const [filter, setFilter]     = useState<LeaveStatus | 'all'>('all')

  // Approve / refuse actions — met à jour le state local (Supabase plus tard)
  const handleApprove = (id: string) =>
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r))

  const handleRefuse = (id: string) =>
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'refused' } : r))

  const visible = requests.filter(r => filter === 'all' || r.status === filter)

  const pending  = requests.filter(r => r.status === 'pending').length
  const approved = requests.filter(r => r.status === 'approved').length
  const refused  = requests.filter(r => r.status === 'refused').length
  const totalDays = requests.reduce((acc, r) => acc + r.days, 0)

  const stats = [
    { value: pending,   label: 'En attente',  color: 'var(--gold)' },
    { value: approved,  label: 'Approuvées',  color: 'var(--green)' },
    { value: refused,   label: 'Refusées',    color: 'var(--pink)' },
    { value: totalDays, label: 'Jours posés', color: 'var(--text2)' },
  ]

  return (
    <>
      <Topbar
        title="Congés"
        breadcrumb="// demandes & soldes"
        ctaLabel="+ Demande"
        onCta={() => {}}
      />

      <div className="app-content">

        <StatRow stats={stats} />

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              {f.value === 'pending' && pending > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--pink)', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 9 }}>
                  {pending}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="two-col">

          {/* Demandes */}
          <Panel
            title={`Demandes ${filter === 'all' ? '' : `— ${visible.length}`}`}
            action={pending > 0 ? { label: `⚠ ${pending} à valider`, onClick: () => setFilter('pending') } : undefined}
          >
            {visible.length > 0
              ? visible.map(r => (
                  <LeaveRequestCard
                    key={r.id}
                    request={r}
                    onApprove={handleApprove}
                    onRefuse={handleRefuse}
                  />
                ))
              : <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                  // aucune demande
                </div>
            }
          </Panel>

          {/* Soldes */}
          <Panel title="Soldes congés">
            <LeaveSolde consultants={CONSULTANTS} />
          </Panel>

        </div>

      </div>
    </>
  )
}

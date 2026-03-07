'use client'

import { useState }         from 'react'
import { useTranslations }  from 'next-intl'
import { useAuthContext }   from '@/components/layout/AuthProvider'
import { isAdmin, canEdit } from '@/lib/auth'
import { Topbar }           from '@/components/layout/Topbar'
import { Panel, StatRow }   from '@/components/ui'
import { EmptyState }       from '@/components/ui/EmptyState'
import { LeaveRequestCard } from '@/components/leaves/LeaveRequestCard'
import { LeaveSolde }       from '@/components/leaves/LeaveSolde'
import { LeaveRequestForm } from '@/components/leaves/LeaveRequestForm'
import { useLeaveRequests, useConsultants, approveLeave, refuseLeave } from '@/lib/data'
import type { LeaveRequest, LeaveStatus } from '@/types'

function Skeleton({ h = 80 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h }} />
}

export default function LeavesPage() {
  const t        = useTranslations('conges')
  const { user } = useAuthContext()

  const adminAccess = isAdmin(user?.role)
  const editAccess  = canEdit(user?.role)
  const canRequest  = !!user

  const [filter,   setFilter]   = useState<LeaveStatus | 'all'>(editAccess ? 'pending' : 'all')
  const [showForm, setShowForm] = useState(false)
  const [refresh,  setRefresh]  = useState(0)

  const { data: requests,    loading: lreq  } = useLeaveRequests(refresh)
  const { data: consultants, loading: lcons } = useConsultants(refresh)

  const FILTERS: { label: string; value: LeaveStatus | 'all' }[] = [
    { label: t('filters.all'),      value: 'all'      },
    { label: t('filters.pending'),  value: 'pending'  },
    { label: t('filters.approved'), value: 'approved' },
    { label: t('filters.refused'),  value: 'refused'  },
  ]

  const all = (requests ?? []) as LeaveRequest[]

  const scoped   = editAccess ? all : all.filter(r => r.consultantId === user?.id)
  const visible  = scoped.filter(r => filter === 'all' || r.status === filter)
  const pending  = scoped.filter(r => r.status === 'pending').length
  const approved = scoped.filter(r => r.status === 'approved').length
  const refused  = scoped.filter(r => r.status === 'refused').length
  const totalDays = scoped.reduce((s, r) => s + (r.days ?? 0), 0)

  const stats = [
    { value: pending,   label: t('stats.pending'),   color: 'var(--gold)'  },
    { value: approved,  label: t('stats.approved'),  color: 'var(--green)' },
    { value: refused,   label: t('stats.refused'),   color: 'var(--pink)'  },
    { value: totalDays, label: t('stats.totalDays'), color: 'var(--text2)' },
  ]

  const handleApprove = async (id: string) => { await approveLeave(id); setRefresh(r => r + 1) }
  const handleRefuse  = async (id: string) => { await refuseLeave(id);  setRefresh(r => r + 1) }
  const handleSaved   = () => setRefresh(r => r + 1)

  return (
    <>
      <Topbar
        title={t('title')}
        breadcrumb={t('breadcrumb')}
        ctaLabel={canRequest ? t('cta') : undefined}
        onCta={canRequest ? () => setShowForm(true) : undefined}
      />

      <div className="app-content">

        <StatRow stats={stats} />

        {/* Filtres */}
        <div className="sort-bar">
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              {f.value === 'pending' && pending > 0 && (
                <span className="btn-badge">{pending}</span>
              )}
            </button>
          ))}
        </div>

        <div className="two-col">

          {/* Liste des demandes */}
          <Panel
            title={t('requests')}
            action={editAccess && pending > 0
              ? { label: `⚠ ${pending} ${t('toValidate')}`, onClick: () => setFilter('pending') }
              : undefined
            }
          >
            {lreq ? (
              <Skeleton h={200} />
            ) : visible.length === 0 ? (
              <EmptyState message={t('noRequests')} />
            ) : (
              <>
                {visible.map(r => (
                  <LeaveRequestCard
                    key={r.id}
                    request={r}
                    onApprove={editAccess ? handleApprove : undefined}
                    onRefuse={editAccess  ? handleRefuse  : undefined}
                  />
                ))}
                {visible.length >= 20 && (
                  <div className="pagination-hint">
                    // {visible.length} résultats — filtrez par statut ou période pour affiner
                  </div>
                )}
              </>
            )}
          </Panel>

          {/* Soldes */}
          <Panel title={t('soldes')}>
            {lcons ? (
              <Skeleton h={200} />
            ) : (
              <LeaveSolde
                consultants={consultants ?? []}
                currentUserId={user?.id}
                isConsultant={!editAccess}
              />
            )}
          </Panel>

        </div>

      </div>

      {showForm && (
        <LeaveRequestForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
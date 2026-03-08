// components/leaves/LeavesClient.tsx
'use client'

import { useState }         from 'react'
import { useRouter }        from 'next/navigation'
import { useTranslations }  from 'next-intl'
import { isAdmin, canEdit } from '@/lib/auth'
import { Panel, StatRow }   from '@/components/ui'
import { EmptyState }       from '@/components/ui/EmptyState'
import { LeaveRequestCard } from '@/components/leaves/LeaveRequestCard'
import { LeaveSolde }       from '@/components/leaves/LeaveSolde'
import { LeaveRequestForm } from '@/components/leaves/LeaveRequestForm'
import { approveLeave, refuseLeave } from '@/lib/data'
import { toast }            from '@/lib/toast'
import type { LeaveStatus } from '@/types'

interface LeaveRow {
  id:             string
  consultantId:   string
  consultantName: string | null
  avatarColor:    string
  initials:       string
  type:           string
  status:         LeaveStatus
  startDate:      string
  endDate:        string
  days:           number | null
  note:           string | null
}

interface Props {
  requests?:    LeaveRow[]
  consultants?: any[]
  userRole?:    string
  userId?:      string
  companyId?:   string
}

export function LeavesClient({
  requests    = [],
  consultants = [],
  userRole,
  userId,
  companyId,
}: Props) {
  const t           = useTranslations('conges')
  const router      = useRouter()
  const adminAccess = isAdmin(userRole)
  const editAccess  = canEdit(userRole)

  const [filter,   setFilter]   = useState<LeaveStatus | 'all'>(editAccess ? 'pending' : 'all')
  const [showForm, setShowForm] = useState(false)

  const FILTERS: { label: string; value: LeaveStatus | 'all' }[] = [
    { label: t('filters.all'),      value: 'all'      },
    { label: t('filters.pending'),  value: 'pending'  },
    { label: t('filters.approved'), value: 'approved' },
    { label: t('filters.refused'),  value: 'refused'  },
  ]

  const scoped  = editAccess ? requests : requests.filter(r => r.consultantId === userId)
  const visible = scoped.filter(r => filter === 'all' || r.status === filter)
  const pending   = scoped.filter(r => r.status === 'pending').length
  const approved  = scoped.filter(r => r.status === 'approved').length
  const refused   = scoped.filter(r => r.status === 'refused').length
  const totalDays = scoped.reduce((s, r) => s + (r.days ?? 0), 0)

  const stats = [
    { value: pending,   label: t('stats.pending'),   color: 'var(--gold)'  },
    { value: approved,  label: t('stats.approved'),  color: 'var(--green)' },
    { value: refused,   label: t('stats.refused'),   color: 'var(--pink)'  },
    { value: totalDays, label: t('stats.totalDays'), color: 'var(--text2)' },
  ]

  const handleApprove = async (id: string) => {
    try   { await approveLeave(id); router.refresh() }
    catch (e) { toast.error(e) }
  }
  const handleRefuse = async (id: string) => {
    try   { await refuseLeave(id); router.refresh() }
    catch (e) { toast.error(e) }
  }

  return (
    <div className="app-content">

      <StatRow stats={stats} />

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
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowForm(true)}>
          {t('cta')}
        </button>
      </div>

      <div className="two-col">

        <Panel
          title={t('requests')}
          action={editAccess && pending > 0
            ? { label: `⚠ ${pending} ${t('toValidate')}`, onClick: () => setFilter('pending') }
            : undefined
          }
        >
          {visible.length === 0 ? (
            <EmptyState message={t('noRequests')} />
          ) : (
            <>
              {visible.map(r => (
                <LeaveRequestCard
                  key={r.id}
                  request={r as any}
                  onApprove={editAccess ? handleApprove : undefined}
                  onRefuse={editAccess  ? handleRefuse  : undefined}
                />
              ))}
              {visible.length >= 20 && (
                <div className="pagination-hint">
                  {t('paginationHint', { count: visible.length })}
                </div>
              )}
            </>
          )}
        </Panel>

        <Panel title={t('soldes.title')}>
          <LeaveSolde
            consultants={consultants}
            currentUserId={userId}
            isConsultant={!editAccess}
          />
        </Panel>

      </div>

      {showForm && (
        <LeaveRequestForm
          userId={userId ?? ''}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); router.refresh() }}
        />
      )}

    </div>
  )
}
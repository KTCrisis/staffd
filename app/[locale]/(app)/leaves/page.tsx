'use client'

import { useState }                 from 'react'
import { useTranslations }          from 'next-intl'
import { useAuthContext }           from '@/components/layout/AuthProvider'
import { Topbar }                   from '@/components/layout/Topbar'
import { Panel, StatRow }           from '@/components/ui'
import { LeaveRequestCard }         from '@/components/leaves/LeaveRequestCard'
import { LeaveSolde }               from '@/components/leaves/LeaveSolde'
import { LeaveRequestForm }         from '@/components/leaves/LeaveRequestForm'
import { useLeaveRequests, useConsultants, approveLeave, refuseLeave } from '@/lib/data'
import type { LeaveStatus }         from '@/types'

function Skeleton({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4 }} />
}

export default function LeavesPage() {
  const t        = useTranslations('conges')
  const { user } = useAuthContext()

  const [filter,   setFilter]   = useState<LeaveStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [refresh,  setRefresh]  = useState(0)

  const { data: requests,    loading: lreq,  mutate } = useLeaveRequests(refresh) as { data: ReturnType<typeof useLeaveRequests>['data']; loading: boolean; mutate?: () => void; error: string | null }
  const { data: consultants, loading: lcons }         = useConsultants(refresh)

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager'
  const isConsultant     = user?.role === 'consultant'

  const FILTERS: { label: string; value: LeaveStatus | 'all' }[] = [
    { label: t('filters.all'),      value: 'all' },
    { label: t('filters.pending'),  value: 'pending' },
    { label: t('filters.approved'), value: 'approved' },
    { label: t('filters.refused'),  value: 'refused' },
  ]

  const all      = requests ?? []
  const visible  = all.filter((r: any) => filter === 'all' || r.status === filter)
  const pending   = all.filter((r: any) => r.status === 'pending').length
  const approved  = all.filter((r: any) => r.status === 'approved').length
  const refused   = all.filter((r: any) => r.status === 'refused').length
  const totalDays = all.reduce((s: any, r: any) => s + r.days, 0)

  const stats = [
    { value: pending,   label: t('stats.pending'),   color: 'var(--gold)' },
    { value: approved,  label: t('stats.approved'),  color: 'var(--green)' },
    { value: refused,   label: t('stats.refused'),   color: 'var(--pink)' },
    { value: totalDays, label: t('stats.totalDays'), color: 'var(--text2)' },
  ]

  const handleApprove = async (id: string) => {
    await approveLeave(id)
    setRefresh(r => r + 1)
  }

  const handleRefuse = async (id: string) => {
    await refuseLeave(id)
    setRefresh(r => r + 1)
  }

  const handleSaved = () => {
    mutate?.()
    setRefresh(r => r + 1)
  }

  return (
    <>
      <Topbar
        title={t('title')}
        breadcrumb={t('breadcrumb')}
        // Bouton "+ Request" visible uniquement pour les consultants
        ctaLabel={isConsultant ? t('cta') : undefined}
        onCta={isConsultant ? () => setShowForm(true) : undefined}
      />

      <div className="app-content">

        <StatRow stats={stats} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {FILTERS.map((f: any) => (
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
          <Panel
            title={t('requests')}
            action={isAdminOrManager && pending > 0
              ? { label: `⚠ ${pending} ${t('toValidate')}`, onClick: () => setFilter('pending') }
              : undefined
            }
          >
            {lreq
              ? <Skeleton h={200} />
              : visible.length > 0
                ? visible.map((r: any) => (
                    <LeaveRequestCard
                      key={r.id}
                      request={r}
                      // Boutons approve/refuse visibles uniquement pour admin/manager
                      onApprove={isAdminOrManager ? handleApprove : undefined}
                      onRefuse={isAdminOrManager ? handleRefuse : undefined}
                    />
                  ))
                : <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                    {t('noRequests')}
                  </div>
            }
          </Panel>

          {/* Soldes : admin/manager voient tous les consultants, consultant voit le sien */}
          <Panel title={t('soldes')}>
            {lcons
              ? <Skeleton h={200} />
              : <LeaveSolde consultants={consultants ?? []} currentUserId={user?.id} isConsultant={isConsultant} />
            }
          </Panel>
        </div>

      </div>

      {/* Formulaire soumission congé — consultant uniquement */}
      {showForm && (
        <LeaveRequestForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
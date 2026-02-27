'use client'

import { useState }              from 'react'
import { useTranslations }       from 'next-intl'
import { Topbar }                from '@/components/layout/Topbar'
import { Panel, StatRow }        from '@/components/ui'
import { LeaveRequestCard }      from '@/components/conges/LeaveRequestCard'
import { LeaveSolde }            from '@/components/conges/LeaveSolde'
import { LEAVE_REQUESTS, CONSULTANTS } from '@/lib/mock'
import type { LeaveRequest, LeaveStatus } from '@/types'

export default function CongesPage() {
  const t = useTranslations('conges')
  const [requests, setRequests] = useState<LeaveRequest[]>(LEAVE_REQUESTS)
  const [filter, setFilter]     = useState<LeaveStatus | 'all'>('all')

  const FILTERS: { label: string; value: LeaveStatus | 'all' }[] = [
    { label: t('filters.all'),      value: 'all' },
    { label: t('filters.pending'),  value: 'pending' },
    { label: t('filters.approved'), value: 'approved' },
    { label: t('filters.refused'),  value: 'refused' },
  ]

  const handleApprove = (id: string) =>
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r))
  const handleRefuse = (id: string) =>
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'refused' } : r))

  const visible  = requests.filter(r => filter === 'all' || r.status === filter)
  const pending  = requests.filter(r => r.status === 'pending').length
  const approved = requests.filter(r => r.status === 'approved').length
  const refused  = requests.filter(r => r.status === 'refused').length
  const totalDays = requests.reduce((acc, r) => acc + r.days, 0)

  const stats = [
    { value: pending,   label: t('stats.pending'),   color: 'var(--gold)' },
    { value: approved,  label: t('stats.approved'),  color: 'var(--green)' },
    { value: refused,   label: t('stats.refused'),   color: 'var(--pink)' },
    { value: totalDays, label: t('stats.totalDays'), color: 'var(--text2)' },
  ]

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} ctaLabel={t('cta')} onCta={() => {}} />

      <div className="app-content">

        <StatRow stats={stats} />

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
          <Panel
            title={t('requests')}
            action={pending > 0 ? { label: `⚠ ${pending} ${t('toValidate')}`, onClick: () => setFilter('pending') } : undefined}
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
                  {t('noRequests')}
                </div>
            }
          </Panel>

          <Panel title={t('soldes')}>
            <LeaveSolde consultants={CONSULTANTS} />
          </Panel>
        </div>

      </div>
    </>
  )
}

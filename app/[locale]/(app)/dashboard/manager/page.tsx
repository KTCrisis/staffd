'use client'

import { useTranslations }  from 'next-intl'
import { Topbar }           from '@/components/layout/Topbar'
import { KpiCard, Panel }   from '@/components/ui'
import { EmptyState }       from '@/components/ui/EmptyState'
import { ConsultantItem }   from '@/components/consultants/ConsultantItem'
import { ActivityFeed }     from '@/components/dashboard/ActivityFeed'
import { MiniCalendar }     from '@/components/dashboard/MiniCalendar'
import { useConsultants, useLeaveRequests, useTimesheets, useActivity } from '@/lib/data'
import { getMondayOf }      from '@/lib/utils'

function Skeleton({ h = 80 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h }} />
}

export default function ManagerDashboardPage() {
  const t      = useTranslations('dashboardManager')
  const monday = getMondayOf(new Date())

  const { data: consultants, loading: lC } = useConsultants()
  const { data: leaveReqs,   loading: lL } = useLeaveRequests()
  const { data: timesheets }               = useTimesheets(monday)
  const { data: activity,    loading: lA } = useActivity(5)

  const list = consultants ?? []

  const available    = list.filter(c => c.status === 'available').length
  const assigned     = list.filter(c => c.status === 'assigned').length
  const pendingLeave = (leaveReqs ?? []).filter(l => l.status === 'pending')
  const pendingCra   = (timesheets ?? []).filter(ts => ts.status === 'submitted').length
  const avgOcc       = list.length
    ? Math.round(list.reduce((s, c) => s + (c.occupancyRate ?? 0), 0) / list.length)
    : 0

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">

        <div className="kpi-grid">
          <KpiCard
            label={t('kpi.available')}
            value={available}
            valueSuffix={`/${list.length}`}
            accent="green"
            progress={list.length ? Math.round((available / list.length) * 100) : 0}
          />
          <KpiCard
            label={t('kpi.assigned')}
            value={assigned}
            accent="cyan"
            progress={list.length ? Math.round((assigned / list.length) * 100) : 0}
          />
          <KpiCard label={t('kpi.pendingLeave')} value={pendingLeave.length} accent="pink" />
          <KpiCard label={t('kpi.occupancy')} value={avgOcc} valueSuffix="%" accent="gold" progress={avgOcc} />
        </div>

        <div className="two-col">

          <Panel title={t('team')}>
            {lC
              ? <Skeleton h={200} />
              : list.map(c => <ConsultantItem key={c.id} consultant={c} />)
            }
          </Panel>

          <div className="dashboard-side">

            <Panel title={t('cra.title')}>
              {pendingCra === 0 ? (
                <EmptyState message={t('cra.empty')} />
              ) : (
                <p className="manager-pending-cra">
                  {t('cra.pending', { count: pendingCra })}
                </p>
              )}
            </Panel>

            <Panel title={t('leaves.title')}>
              {lL ? <Skeleton h={80} /> : pendingLeave.length === 0 ? (
                <EmptyState message={t('leaves.empty')} />
              ) : (
                <div className="manager-leave-list">
                  {pendingLeave.slice(0, 4).map(l => (
                    <div key={l.id} className="manager-leave-row">
                      <div>
                        <span className="manager-leave-name">{l.consultantName}</span>
                        <span className="manager-leave-type">{l.type}</span>
                      </div>
                      <span className="manager-leave-dates">{l.startDate} → {l.endDate}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title={t('activity')}>
              {lA ? <Skeleton h={80} /> : <ActivityFeed items={activity ?? []} />}
            </Panel>

            <Panel title={t('calendar')}>
              <MiniCalendar />
            </Panel>

          </div>
        </div>

      </div>
    </>
  )
}
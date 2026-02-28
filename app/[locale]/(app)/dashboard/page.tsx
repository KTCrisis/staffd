'use client'

import { useTranslations }  from 'next-intl'
import { Topbar }           from '@/components/layout/Topbar'
import { KpiCard, Panel }   from '@/components/ui'
import { ConsultantItem }   from '@/components/consultants/ConsultantItem'
import { ProjectRow }       from '@/components/projets/ProjectRow'
import { ActivityFeed }     from '@/components/dashboard/ActivityFeed'
import { MiniCalendar }     from '@/components/dashboard/MiniCalendar'
import { useConsultants, useProjects, useKpi, useActivity } from '@/lib/data'

function Skeleton({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} />
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')

  const { data: consultants, loading: lconsultants } = useConsultants()
  const { data: projects,    loading: lprojects }    = useProjects()
  const { data: kpi,         loading: lkpi }         = useKpi()
  const { data: activity,    loading: lactivity }    = useActivity(5)

  const activeProjects = projects?.filter((p: any) => p.status === 'active').slice(0, 3) ?? []

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">

        {/* KPIs */}
        <div className="kpi-grid">
          {lkpi || !kpi ? (
            <>{[0,1,2,3].map((i: any) => <Skeleton key={i} h={110} />)}</>
          ) : (
            <>
              <KpiCard
                label={t('kpi.activeConsultants')}
                value={kpi.activeConsultants}
                valueSuffix={`/${kpi.totalConsultants}`}
                accent="green"
                trend={{ label: t('trends.up'), direction: 'up' }}
                progress={Math.round((kpi.activeConsultants / kpi.totalConsultants) * 100)}
              />
              <KpiCard
                label={t('kpi.activeProjects')}
                value={kpi.activeProjects}
                accent="cyan"
                trend={{ label: t('trends.stable'), direction: 'flat' }}
                progress={60}
              />
              <KpiCard
                label={t('kpi.pendingLeaves')}
                value={kpi.pendingLeaves}
                accent="pink"
                trend={{ label: t('trends.warning'), direction: 'down' }}
              />
              <KpiCard
                label={t('kpi.occupancyRate')}
                value={kpi.occupancyRate}
                valueSuffix="%"
                accent="gold"
                trend={{ label: t('trends.occupancy'), direction: 'up' }}
                progress={kpi.occupancyRate}
              />
            </>
          )}
        </div>

        <div className="two-col">
          <Panel title={t('consultants')} action={{ label: t('seeAll'), onClick: () => {} }}>
            {lconsultants
              ? <Skeleton h={200} />
              : consultants?.map((c: any) => <ConsultantItem key={c.id} consultant={c} />)
            }
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Panel title={t('activity')} action={{ label: t('seeAll'), onClick: () => {} }}>
              {lactivity
                ? <Skeleton h={120} />
                : <ActivityFeed items={activity ?? []} />
              }
            </Panel>
            <Panel title={t('calendar')}>
              <MiniCalendar />
            </Panel>
          </div>
        </div>

        <Panel title={t('activeProjects')} action={{ label: t('seeAll'), onClick: () => {} }} noPadding>
          <div style={{ padding: '0 18px' }}>
            {lprojects
              ? <Skeleton h={120} />
              : activeProjects.map((p: any) => (
                  <ProjectRow key={p.id} project={p} consultants={consultants ?? []} />
                ))
            }
          </div>
        </Panel>

      </div>
    </>
  )
}

'use client'

import { useTranslations }  from 'next-intl'
import { Topbar }           from '@/components/layout/Topbar'
import { KpiCard, Panel }   from '@/components/ui'
import { ConsultantItem }   from '@/components/consultants/ConsultantItem'
import { ProjectRow }       from '@/components/projets/ProjectRow'
import { ActivityFeed }     from '@/components/dashboard/ActivityFeed'
import { MiniCalendar }     from '@/components/dashboard/MiniCalendar'
import { CONSULTANTS, PROJECTS, KPI, ACTIVITY } from '@/lib/mock'

export default function DashboardPage() {
  const t  = useTranslations('dashboard')
  const activeProjects = PROJECTS.filter(p => p.status === 'active').slice(0, 3)

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">

        <div className="kpi-grid">
          <KpiCard
            label={t('kpi.activeConsultants')}
            value={KPI.activeConsultants}
            valueSuffix={`/${KPI.totalConsultants}`}
            accent="green"
            trend={{ label: t('trends.up'), direction: 'up' }}
            progress={Math.round((KPI.activeConsultants / KPI.totalConsultants) * 100)}
          />
          <KpiCard
            label={t('kpi.activeProjects')}
            value={KPI.activeProjects}
            accent="cyan"
            trend={{ label: t('trends.stable'), direction: 'flat' }}
            progress={60}
          />
          <KpiCard
            label={t('kpi.pendingLeaves')}
            value={KPI.pendingLeaves}
            accent="pink"
            trend={{ label: t('trends.warning'), direction: 'down' }}
          />
          <KpiCard
            label={t('kpi.occupancyRate')}
            value={KPI.occupancyRate}
            valueSuffix="%"
            accent="gold"
            trend={{ label: t('trends.occupancy'), direction: 'up' }}
            progress={KPI.occupancyRate}
          />
        </div>

        <div className="two-col">
          <Panel title={t('consultants')} action={{ label: t('seeAll'), onClick: () => {} }}>
            {CONSULTANTS.map(c => <ConsultantItem key={c.id} consultant={c} />)}
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Panel title={t('activity')} action={{ label: t('seeAll'), onClick: () => {} }}>
              <ActivityFeed items={ACTIVITY} />
            </Panel>
            <Panel title={t('calendar')}>
              <MiniCalendar />
            </Panel>
          </div>
        </div>

        <Panel title={t('activeProjects')} action={{ label: t('seeAll'), onClick: () => {} }} noPadding>
          <div style={{ padding: '0 18px' }}>
            {activeProjects.map(p => (
              <ProjectRow key={p.id} project={p} consultants={CONSULTANTS} />
            ))}
          </div>
        </Panel>

      </div>
    </>
  )
}

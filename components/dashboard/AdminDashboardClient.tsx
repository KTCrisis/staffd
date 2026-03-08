// components/dashboard/AdminDashboardClient.tsx
'use client'

import { useTranslations } from 'next-intl'
import { useRouter }       from '@/lib/navigation'
import { useLocale }       from 'next-intl'
import { KpiCard, Panel }  from '@/components/ui'
import { EmptyState }      from '@/components/ui/EmptyState'
import { ConsultantItem }  from '@/components/consultants/ConsultantItem'
import { ProjectRow }      from '@/components/projects/ProjectRow'
import { ActivityFeed }    from '@/components/dashboard/ActivityFeed'
import { MiniCalendar }    from '@/components/dashboard/MiniCalendar'

interface KpiData {
  activeConsultants: number
  totalConsultants:  number
  activeProjects:    number
  pendingLeaves:     number
  occupancyRate:     number
}

interface Props {
  consultants?:     any[]
  activeProjects?:  any[]
  activity?:        any[]
  kpi?:             KpiData
  projectProgress?: number
}

const DEFAULT_KPI: KpiData = {
  activeConsultants: 0, totalConsultants: 0,
  activeProjects: 0,    pendingLeaves: 0,    occupancyRate: 0,
}

export function AdminDashboardClient({
  consultants     = [],
  activeProjects  = [],
  activity        = [],
  kpi             = DEFAULT_KPI,
  projectProgress = 0,
}: Props) {
  const t      = useTranslations('dashboard')
  const router = useRouter()
  const locale = useLocale()

  const p = (path: string) => locale === 'en' ? path : `/${locale}${path}`

  return (
    <div className="app-content">

      {/* KPIs — sans trends fake */}
      <div className="kpi-grid">
        <KpiCard
          label={t('kpi.activeConsultants')}
          value={kpi.activeConsultants}
          valueSuffix={`/${kpi.totalConsultants}`}
          accent="green"
          progress={kpi.totalConsultants > 0
            ? Math.round((kpi.activeConsultants / kpi.totalConsultants) * 100)
            : 0}
        />
        <KpiCard
          label={t('kpi.activeProjects')}
          value={kpi.activeProjects}
          accent="cyan"
          progress={projectProgress}
        />
        <KpiCard
          label={t('kpi.pendingLeaves')}
          value={kpi.pendingLeaves}
          accent="pink"
        />
        <KpiCard
          label={t('kpi.occupancyRate')}
          value={kpi.occupancyRate}
          valueSuffix="%"
          accent="gold"
          progress={kpi.occupancyRate}
        />
      </div>

      {/* Projets actifs */}
      <Panel
        title={t('activeProjects')}
        action={{ label: t('seeAll'), onClick: () => router.push(p('/projects') as never) }}
        noPadding
      >
        <div style={{ padding: '0 18px' }}>
          {activeProjects.length === 0 ? (
            <EmptyState message={t('noActiveProjects')} />
          ) : (
            activeProjects.map(proj => (
              <ProjectRow key={proj.id} project={proj} consultants={consultants} />
            ))
          )}
        </div>
      </Panel>

      {/* Consultants + Activité + Calendrier */}
      <div className="two-col">
        <Panel
          title={t('consultants')}
          action={{ label: t('seeAll'), onClick: () => router.push(p('/consultants') as never) }}
        >
          {consultants.length === 0
            ? <EmptyState message="// no consultants" />
            : consultants.map(c => <ConsultantItem key={c.id} consultant={c} />)
          }
        </Panel>

        <div className="dashboard-side">
          <Panel title={t('activity')} action={{ label: t('seeAll'), onClick: () => {} }}>
            <ActivityFeed items={activity} />
          </Panel>
          <Panel title={t('calendar')}>
            <MiniCalendar />
          </Panel>
        </div>
      </div>

    </div>
  )
}
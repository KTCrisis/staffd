'use client'

// components/dashboard/AdminDashboardClient.tsx
// Client Component — reçoit les données pré-fetchées du Server Component.
// Responsable uniquement de l'interactivité (router, clics, i18n client).

import { useMemo }           from 'react'
import { useTranslations }   from 'next-intl'
import { useRouter }         from '@/lib/navigation'
import { useLocale }         from 'next-intl'
import { Topbar }            from '@/components/layout/Topbar'
import { KpiCard, Panel }    from '@/components/ui'
import { EmptyState }        from '@/components/ui/EmptyState'
import { ConsultantItem }    from '@/components/consultants/ConsultantItem'
import { ProjectRow }        from '@/components/projects/ProjectRow'
import { ActivityFeed }      from '@/components/dashboard/ActivityFeed'
import { MiniCalendar }      from '@/components/dashboard/MiniCalendar'
import type { Consultant, Project } from '@/types'

// ── Types ─────────────────────────────────────────────────────

interface KpiData {
  activeConsultants: number
  totalConsultants:  number
  activeProjects:    number
  pendingLeaves:     number
  occupancyRate:     number
}

interface Props {
  consultants: Consultant[]
  projects:    Project[]
  kpi:         KpiData
  activity:    any[]
}

// ── Composant ─────────────────────────────────────────────────

export function AdminDashboardClient({ consultants, projects, kpi, activity }: Props) {
  const t      = useTranslations('dashboard')
  const tNav   = useTranslations('timeline')
  const router = useRouter()
  const locale = useLocale()

  const p = (path: string) => locale === 'en' ? path : `/${locale}${path}`

  const activeProjects = useMemo(
    () => projects.filter(proj => proj.status === 'active').slice(0, 3),
    [projects]
  )

  const projectProgress = useMemo(() => {
    const total  = projects.length
    const active = projects.filter(proj => proj.status === 'active').length
    return total > 0 ? Math.round((active / total) * 100) : 0
  }, [projects])

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">

        {/* KPIs — données déjà là, pas de skeleton */}
        <div className="kpi-grid">
          <KpiCard
            label={t('kpi.activeConsultants')}
            value={kpi.activeConsultants}
            valueSuffix={`/${kpi.totalConsultants}`}
            accent="green"
            trend={{ label: t('trends.up'), direction: 'up' }}
            progress={kpi.totalConsultants > 0
              ? Math.round((kpi.activeConsultants / kpi.totalConsultants) * 100)
              : 0
            }
          />
          <KpiCard
            label={t('kpi.activeProjects')}
            value={kpi.activeProjects}
            accent="cyan"
            trend={{ label: t('trends.stable'), direction: 'flat' }}
            progress={projectProgress}
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
        </div>

        {/* Projets actifs */}
        <Panel
          title={t('activeProjects')}
          action={{ label: t('seeAll'), onClick: () => router.push(p('/projects') as never) }}
          noPadding
        >
          <div style={{ padding: '0 18px' }}>
            {activeProjects.length === 0 ? (
              <EmptyState message="// aucun projet actif" />
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
            {consultants.map(c => (
              <ConsultantItem key={c.id} consultant={c} />
            ))}
          </Panel>

          <div className="dashboard-side">
            <Panel title={t('activity')} action={{ label: t('seeAll'), onClick: () => {} }}>
              <ActivityFeed items={activity} />
            </Panel>

            <Panel title={t('calendar')}>
              <MiniCalendar
                daysShort    ={t.raw('daysShort')   as string[]}
                months       ={tNav.raw('months')    as string[]}
                labelToday   ={t('calToday')}
                labelUpcoming={t('calUpcoming')}
                labelNoEvent ={t('calNoEvent')}
              />
            </Panel>
          </div>
        </div>

      </div>
    </>
  )
}
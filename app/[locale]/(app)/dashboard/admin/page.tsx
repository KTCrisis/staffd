'use client'

import { useTranslations }  from 'next-intl'
import { useRouter }        from '@/lib/navigation'
import { useLocale }        from 'next-intl'
import { Topbar }           from '@/components/layout/Topbar'
import { KpiCard, Panel }   from '@/components/ui'
import { ConsultantItem }   from '@/components/consultants/ConsultantItem'
import { ProjectRow }       from '@/components/projects/ProjectRow'
import { ActivityFeed }     from '@/components/dashboard/ActivityFeed'
import { MiniCalendar }     from '@/components/dashboard/MiniCalendar'
import { useConsultants, useProjects, useKpi, useActivity } from '@/lib/data'

// ══════════════════════════════════════════════════════════════
// SKELETON
// ══════════════════════════════════════════════════════════════

function Skeleton({ h = 80 }: { h?: number }) {
  return (
    <div style={{
      height: h, background: 'var(--bg3)',
      borderRadius: 4, animation: 'pulse 1.5s ease infinite',
    }} />
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function AdminDashboardPage() {
  const t      = useTranslations('dashboard')
  const router = useRouter()
  const locale = useLocale()

  const p = (path: string) => locale === 'en' ? path : `/${locale}${path}`

  const { data: consultants, loading: lC } = useConsultants()
  const { data: projects,    loading: lP } = useProjects()
  const { data: kpi,         loading: lK } = useKpi()
  const { data: activity,    loading: lA } = useActivity(5)

  const activeProjects = projects?.filter(p => p.status === 'active').slice(0, 3) ?? []

  // Calcul dynamique du progress "active projects"
  const totalProjects  = projects?.length ?? 0
  const activeCount    = projects?.filter(p => p.status === 'active').length ?? 0
  const projectProgress = totalProjects > 0
    ? Math.round((activeCount / totalProjects) * 100)
    : 0

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">

        {/* ── KPIs globaux ── */}
        <div className="kpi-grid">
          {lK || !kpi ? (
            <>{[0,1,2,3].map(i => <Skeleton key={i} h={110} />)}</>
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
            </>
          )}
        </div>

        {/* ── Projets actifs ── */}
        <Panel
          title={t('activeProjects')}
          action={{ label: t('seeAll'), onClick: () => router.push(p('/projects') as never) }}
          noPadding
        >
          <div style={{ padding: '0 18px' }}>
            {lP ? (
              <Skeleton h={80} />
            ) : activeProjects.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', padding: '12px 0' }}>
                // aucun projet actif
              </div>
            ) : (
              activeProjects.map(p => (
                <ProjectRow key={p.id} project={p} consultants={consultants ?? []} />
              ))
            )}
          </div>
        </Panel>

        {/* ── Consultants + Activité + Calendrier ── */}
        <div className="two-col">
          <Panel
            title={t('consultants')}
            action={{ label: t('seeAll'), onClick: () => router.push(p('/consultants') as never) }}
          >
            {lC
              ? <Skeleton h={200} />
              : consultants?.map(c => <ConsultantItem key={c.id} consultant={c} />)
            }
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Panel title={t('activity')} action={{ label: t('seeAll'), onClick: () => {} }}>
              {lA ? <Skeleton h={120} /> : <ActivityFeed items={activity ?? []} />}
            </Panel>

            {/* MiniCalendar compact — pas besoin de scale, le composant est déjà petit */}
            <Panel title={t('calendar')}>
              <MiniCalendar />
            </Panel>
          </div>
        </div>

      </div>
    </>
  )
}
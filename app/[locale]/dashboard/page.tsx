'use client'

import { Topbar }          from '@/components/layout/Topbar'
import { KpiCard, Panel }  from '@/components/ui'
import { ConsultantItem }  from '@/components/consultants/ConsultantItem'
import { ProjectRow }      from '@/components/projets/ProjectRow'
import { ActivityFeed }    from '@/components/dashboard/ActivityFeed'
import { MiniCalendar }    from '@/components/dashboard/MiniCalendar'
import { CONSULTANTS, PROJECTS, KPI, ACTIVITY } from '@/lib/mock'

export default function DashboardPage() {
  const activeProjects = PROJECTS.filter(p => p.status === 'active').slice(0, 3)

  return (
    <>
      <Topbar
        title="Dashboard"
        breadcrumb="// overview"
        ctaLabel="+ Nouveau"
      />

      <div className="app-content">

        <div className="kpi-grid">
          <KpiCard
            label="Consultants actifs"
            value={KPI.activeConsultants}
            valueSuffix={`/${KPI.totalConsultants}`}
            accent="green"
            trend={{ label: '↑ +1 ce mois', direction: 'up' }}
            progress={Math.round((KPI.activeConsultants / KPI.totalConsultants) * 100)}
          />
          <KpiCard
            label="Projets en cours"
            value={KPI.activeProjects}
            valueSuffix=" projets"
            accent="cyan"
            trend={{ label: '→ stable', direction: 'flat' }}
            progress={60}
          />
          <KpiCard
            label="Congés en attente"
            value={KPI.pendingLeaves}
            valueSuffix=" demandes"
            accent="pink"
            trend={{ label: '⚠ à valider', direction: 'down' }}
          />
          <KpiCard
            label="Taux d'occupation"
            value={KPI.occupancyRate}
            valueSuffix="%"
            accent="gold"
            trend={{ label: '↑ +5% vs mois', direction: 'up' }}
            progress={KPI.occupancyRate}
          />
        </div>

        <div className="two-col">
          <Panel
            title="Consultants"
            action={{ label: 'voir tout →', onClick: () => {} }}
          >
            {CONSULTANTS.map(c => (
              <ConsultantItem key={c.id} consultant={c} />
            ))}
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Panel
              title="Activité récente"
              action={{ label: 'tout voir →', onClick: () => {} }}
            >
              <ActivityFeed items={ACTIVITY} />
            </Panel>

            <Panel title="Calendrier">
              <MiniCalendar />
            </Panel>
          </div>
        </div>

        <Panel
          title="Projets actifs"
          action={{ label: 'voir tout →', onClick: () => {} }}
          noPadding
        >
          <div style={{ padding: '0 18px' }}>
            {activeProjects.map(p => (
              <ProjectRow
                key={p.id}
                project={p}
                consultants={CONSULTANTS}
              />
            ))}
          </div>
        </Panel>

      </div>
    </>
  )
}

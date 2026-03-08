// components/dashboard/ManagerDashboardClient.tsx
'use client'

import { useTranslations } from 'next-intl'
import { useRouter }       from '@/lib/navigation'
import { useLocale }       from 'next-intl'
import { KpiCard, Panel }  from '@/components/ui'
import { EmptyState }      from '@/components/ui/EmptyState'
import { ConsultantItem }  from '@/components/consultants/ConsultantItem'
import { ActivityFeed }    from '@/components/dashboard/ActivityFeed'
import { MiniCalendar }    from '@/components/dashboard/MiniCalendar'

interface LeaveReq {
  id: string; status: string; type: string
  startDate: string; endDate: string; consultantName: string
}

interface KpiData {
  available: number; assigned: number; pendingLeave: number
  pendingCra: number; avgOcc: number; total: number
}

interface Props {
  consultants?: any[]
  leaveReqs?:   LeaveReq[]
  activity?:    any[]
  kpi?:         KpiData
}

const DEFAULT_KPI: KpiData = {
  available: 0, assigned: 0, pendingLeave: 0,
  pendingCra: 0, avgOcc: 0, total: 0,
}

export function ManagerDashboardClient({
  consultants = [],
  leaveReqs   = [],
  activity    = [],
  kpi         = DEFAULT_KPI,
}: Props) {
  const t      = useTranslations('dashboardManager')
  const router = useRouter()
  const locale = useLocale()

  const p = (path: string) => locale === 'en' ? path : `/${locale}${path}`

  return (
    <div className="app-content">

      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard
          label={t('kpi.available')}
          value={kpi.available}
          valueSuffix={`/${kpi.total}`}
          accent="green"
          progress={kpi.total ? Math.round((kpi.available / kpi.total) * 100) : 0}
        />
        <KpiCard
          label={t('kpi.assigned')}
          value={kpi.assigned}
          accent="cyan"
          progress={kpi.total ? Math.round((kpi.assigned / kpi.total) * 100) : 0}
        />
        <KpiCard label={t('kpi.pendingLeave')} value={kpi.pendingLeave} accent="pink" />
        <KpiCard label={t('kpi.occupancy')} value={kpi.avgOcc} valueSuffix="%" accent="gold" progress={kpi.avgOcc} />
      </div>

      <div className="two-col">

        {/* Équipe */}
        <Panel
          title={t('team')}
          action={{ label: t('teamSeeAll'), onClick: () => router.push(p('/consultants') as never) }}
        >
          {consultants.length === 0
            ? <EmptyState message="// no consultants" />
            : consultants.map(c => <ConsultantItem key={c.id} consultant={c} />)
          }
        </Panel>

        <div className="dashboard-side">

          {/* CRA en attente */}
          <Panel
            title={t('cra.title')}
            action={kpi.pendingCra > 0
              ? { label: t('cra.approve'), onClick: () => router.push(p('/timesheets') as never) }
              : undefined
            }
          >
            {kpi.pendingCra === 0 ? (
              <EmptyState message={t('cra.empty')} />
            ) : (
              <p className="manager-pending-cra">
                {t('cra.pending', { count: kpi.pendingCra })}
              </p>
            )}
          </Panel>

          {/* Congés en attente */}
          <Panel
            title={t('leaves.title')}
            action={leaveReqs.length > 0
              ? { label: t('leaves.approve'), onClick: () => router.push(p('/leaves') as never) }
              : undefined
            }
          >
            {leaveReqs.length === 0 ? (
              <EmptyState message={t('leaves.empty')} />
            ) : (
              <div className="manager-leave-list">
                {leaveReqs.slice(0, 4).map(l => (
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

          {/* Activité */}
          <Panel title={t('activity')}>
            <ActivityFeed items={activity} />
          </Panel>

          {/* Calendrier */}
          <Panel title={t('calendar')}>
            <MiniCalendar />
          </Panel>

        </div>
      </div>

    </div>
  )
}
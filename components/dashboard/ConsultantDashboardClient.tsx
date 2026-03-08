// components/dashboard/ConsultantDashboardClient.tsx
'use client'

import { useMemo }         from 'react'
import { useTranslations } from 'next-intl'
import { useRouter }       from '@/lib/navigation'
import { useLocale }       from 'next-intl'
import { Panel }           from '@/components/ui/Panel'
import { KpiCard }         from '@/components/ui/KpiCard'
import { Avatar }          from '@/components/ui/Avatar'
import { EmptyState }      from '@/components/ui/EmptyState'
import { toISO }           from '@/lib/utils'

function StatusPill({ status, t }: { status: string; t: any }) {
  const key   = ['assigned','available','partial','leave'].includes(status) ? status : null
  const label = key ? t(`statuses.${key}`) : status
  return <span className={`cons-status cons-status--${key ?? 'default'}`}>{label}</span>
}

function LeavePill({ status }: { status: string }) {
  const t   = useTranslations('statuses')
  const cls = status === 'approved' ? 'badge badge-approved'
            : status === 'pending'  ? 'badge badge-pending'
            : 'badge badge-leave'
  return <span className={cls}>{t(status)}</span>
}

function CraCell({ d, ts, isToday }: {
  d: Date; ts?: { value?: number }; isToday: boolean
}) {
  const val = ts?.value
  const cls = [
    'cra-cell',
    isToday     ? 'cra-cell--today' : '',
    val === 1   ? 'cra-cell--full'  : '',
    val === 0.5 ? 'cra-cell--half'  : '',
    !val        ? 'cra-cell--empty' : '',
  ].join(' ')
  return (
    <div className="cra-day">
      <div className={`cra-dow ${isToday ? 'cra-dow--today' : ''}`}>
        {d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}
      </div>
      <div className={cls}>{val === 1 ? '1' : val === 0.5 ? '½' : '—'}</div>
    </div>
  )
}

interface LeaveItem {
  id: string; type: string; status: string; startDate: string; endDate: string
}
interface TimesheetItem {
  id: string; date: string; value: number; status: string; projectId: string
}
interface Props {
  me:            any
  isFreelance?:  boolean
  myProjects?:   any[]
  myLeaves?:     LeaveItem[]
  myTimesheets?: TimesheetItem[]
  weekTotal?:    number
  hasDraft?:     boolean
  monday?:       string
}

export function ConsultantDashboardClient({
  me,
  isFreelance  = false,
  myProjects   = [],
  myLeaves     = [],
  myTimesheets = [],
  weekTotal    = 0,
  hasDraft     = false,
  monday       = toISO(new Date()),
}: Props) {
  const t      = useTranslations('dashboardConsultant')
  const tLeave = useTranslations('conges.types')
  const router = useRouter()
  const locale = useLocale()

  const p = (path: string) => locale === 'en' ? path : `/${locale}${path}`

  const pendingLeaves = myLeaves.filter(l => l.status === 'pending')

  const weekDays = useMemo(() => {
    const base = new Date(monday + 'T00:00:00')
    return Array.from({ length: 5 }, (_, i) => new Date(base.getTime() + i * 86400000))
  }, [monday])

  const occRate   = me?.occupancy_rate ?? 0
  const occAccent = occRate >= 80 ? 'green' : occRate > 0 ? 'gold' : undefined

  if (!me) return null

  return (
    <div className="app-content">

      {/* Profil */}
      <div className="cons-profile">
        <Avatar initials={me.initials} color={me.avatar_color} size="lg" />
        <div className="cons-profile-info">
          <div className="cons-profile-name">{me.name}</div>
          <div className="cons-profile-role">
            {me.role}
            {isFreelance && <span className="cons-freelance-badge">FREELANCE</span>}
          </div>
        </div>
        <StatusPill status={me.status ?? 'available'} t={t} />
      </div>

      {/* KPIs */}
        <div
          className="kpi-grid"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}
        >
        <KpiCard
          label={t('kpi.missions')}
          value={myProjects.length}
          accent="cyan"
          sub={myProjects.length === 0
            ? t('kpi.noMission')
            : myProjects.map((p: any) => p.name).join(', ')
          }
        />
        <KpiCard
          label={t('kpi.occupancy')}
          value={`${occRate}%`}
          accent={occAccent ?? 'cyan'}
        />
        <KpiCard
          label={t('kpi.cra')}
          value={weekTotal > 0 ? `${weekTotal}j` : '—'}
          accent={weekTotal >= 5 ? 'green' : weekTotal > 0 ? 'gold' : 'cyan'}
          sub={hasDraft ? t('kpi.draftWarn') : weekTotal >= 5 ? t('kpi.weekDone') : undefined}
        />
        {!isFreelance ? (
          <KpiCard
            label={t('kpi.leaves')}
            value={me.leave_days_left ?? 0}
            accent="cyan"
            sub={t('kpi.rttLeft', { count: me.rtt_left ?? 0 })}
          />
        ) : (
          <KpiCard
            label={t('kpi.invoices')}
            value="—"
            accent="cyan"
            sub={t('kpi.invoicesSub')}
          />
        )}
      </div>

      {/* Missions + CRA */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <Panel>
          <div className="panel-section-label">{t('missions.label')}</div>
          {myProjects.length === 0 ? (
            <EmptyState message={t('missions.empty')} />
          ) : (
            <div className="mission-list">
              {myProjects.map((project: any) => (
                <div key={project.id} className="mission-item">
                  <div>
                    <div className="mission-name">{project.name}</div>
                    <div className="mission-meta">{t('missions.active')}</div>
                  </div>
                  <span className="mission-dot" />
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <div className="panel-section-label">{t('cra.label')}</div>
          <div className="cra-week">
            {weekDays.map(d => {
              const iso = toISO(d)
              return (
                <CraCell
                  key={iso}
                  d={d}
                  ts={myTimesheets.find(ts => ts.date === iso)}
                  isToday={iso === toISO(new Date())}
                />
              )
            })}
          </div>
          <div className="cra-footer">
            {t('cra.total')} <span className="cra-total">{weekTotal}j</span>
            {hasDraft && <span className="cra-draft-warn">{t('cra.draft')}</span>}
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto', color: 'var(--cyan)', fontSize: 10 }}
              onClick={() => router.push(p('/timesheets') as never)}
            >
              {t('cra.goTo')}
            </button>
          </div>
        </Panel>
      </div>

      {/* Congés — salariés uniquement */}
      {!isFreelance && (
        <Panel>
          <div className="panel-section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {t('leaves.label')}
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--green)', fontSize: 10 }}
              onClick={() => router.push(p('/leaves') as never)}
            >
              {t('leaves.request')}
            </button>
          </div>
          <div className="leave-counters">
            {[
              { label: t('leaves.cp'),      value: me.leave_days_left ?? 0, total: me.leave_days_total ?? 25, color: 'var(--green)' },
              { label: t('leaves.rtt'),     value: me.rtt_left ?? 0,        total: me.rtt_total ?? 10,        color: 'var(--cyan)'  },
              { label: t('leaves.pending'), value: pendingLeaves.length,    total: null,                      color: 'var(--gold)'  },
            ].map(({ label, value, total, color }) => (
              <div key={label} className="leave-counter">
                <div className="leave-counter-label">{label}</div>
                <div className="leave-counter-value" style={{ color }}>
                  {value}
                  {total !== null && <span className="leave-counter-total">/{total}</span>}
                </div>
              </div>
            ))}
          </div>
          {myLeaves.length === 0 ? (
            <EmptyState message={t('leaves.empty')} />
          ) : (
            <div className="leave-list">
              {myLeaves.slice(0, 4).map(l => (
                <div key={l.id} className="leave-row">
                  <span className="leave-row-info">
                    {tLeave(l.type)} · {l.startDate} → {l.endDate}
                  </span>
                  <LeavePill status={l.status} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

    </div>
  )
}
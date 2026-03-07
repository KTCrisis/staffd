'use client'

import { useMemo }            from 'react'
import { useTranslations }    from 'next-intl'
import { useAuthContext }     from '@/components/layout/AuthProvider'
import { Topbar }             from '@/components/layout/Topbar'
import { Panel }              from '@/components/ui/Panel'
import { KpiCard }            from '@/components/ui/KpiCard'
import { Avatar }             from '@/components/ui/Avatar'
import { EmptyState }         from '@/components/ui/EmptyState'
import {
  useConsultants,
  useConsultantProjectsMap,
  useLeaveRequests,
  useTimesheets,
} from '@/lib/data'
import { getMondayOf, toISO } from '@/lib/utils'

// ── Pill statut consultant ────────────────────────────────────

function StatusPill({ status, t }: { status: string; t: any }) {
  const key = ['assigned','available','partial','leave'].includes(status) ? status : null
  const label = key ? t(`statuses.${key}`) : status
  return <span className={`cons-status cons-status--${key ?? 'default'}`}>{label}</span>
}

// ── Badge statut congé ────────────────────────────────────────

function LeavePill({ status }: { status: string }) {
  const cls = status === 'approved' ? 'badge badge-approved'
            : status === 'pending'  ? 'badge badge-pending'
            : 'badge badge-leave'
  return <span className={cls}>{status}</span>
}

// ── CRA cell ──────────────────────────────────────────────────

function CraCell({ d, ts, isToday }: {
  d:       Date
  ts?:     { value?: number }
  isToday: boolean
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
      <div className={cls}>
        {val === 1 ? '1' : val === 0.5 ? '½' : '—'}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function DashboardConsultantPage() {
  const t           = useTranslations('dashboardConsultant')
  const { user }    = useAuthContext()
  const isFreelance = user?.role === 'freelance'
  const monday      = getMondayOf(new Date())

  const { data: allConsultants } = useConsultants()
  const { data: projectsMap }    = useConsultantProjectsMap()
  const { data: leaves }         = useLeaveRequests()
  const { data: timesheets }     = useTimesheets(monday)

  const me = useMemo(
    () => (allConsultants ?? []).find(c => c.user_id === user?.id),
    [allConsultants, user?.id]
  )

  const myProjects = useMemo(
    () => (me ? (projectsMap?.[me.id] ?? []) : []),
    [me, projectsMap]
  )

  const myLeaves = useMemo(
    () => (leaves ?? []).filter(l => l.consultantId === me?.id),
    [leaves, me?.id]
  )

  const pendingLeaves = myLeaves.filter(l => l.status === 'pending')

  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => new Date(monday.getTime() + i * 86400000)),
    [monday]
  )

  const myTimesheets = useMemo(
    () => (timesheets ?? []).filter(ts => ts.consultantId === me?.id),
    [timesheets, me?.id]
  )

  const weekTotal = myTimesheets.reduce((s, ts) => s + (ts.value ?? 0), 0)
  const hasDraft  = myTimesheets.some(ts => ts.status === 'draft' && (ts.value ?? 0) > 0)
  const loading   = !allConsultants || !projectsMap

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
        <div className="app-content">
          <EmptyState message={t('loading')} />
        </div>
      </>
    )
  }

  // ── Compte non lié ────────────────────────────────────────
  if (!me) {
    return (
      <>
        <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
        <div className="app-content">
          <Panel>
            <div className="cons-unlinked">
              <div className="cons-unlinked-icon">◈</div>
              <div className="cons-unlinked-title">{t('unlinked.title')}</div>
              <div className="cons-unlinked-msg">{t('unlinked.msg')}</div>
            </div>
          </Panel>
        </div>
      </>
    )
  }

  const occRate   = me.occupancyRate ?? 0
  const occAccent = occRate >= 80 ? 'green' : occRate > 0 ? 'gold' : undefined

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">

        {/* Profil */}
        <div className="cons-profile">
          <Avatar initials={me.initials} color={me.avatarColor} size="lg" />
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
          style={{ gridTemplateColumns: `repeat(${isFreelance ? 3 : 4}, 1fr)`, marginBottom: 24 }}
        >
          <KpiCard
            label={t('kpi.missions')}
            value={myProjects.length}
            accent="cyan"
            sub={myProjects.length === 0
              ? t('kpi.noMission')
              : myProjects.map(p => p.name).join(', ')
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
          {!isFreelance && (
            <KpiCard
              label={t('kpi.leaves')}
              value={me.leaveDaysLeft ?? 0}
              accent="cyan"
              sub={t('kpi.rttLeft', { count: me.rttLeft ?? 0 })}
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
                {myProjects.map(project => (
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
            </div>
          </Panel>
        </div>

        {/* Congés — salariés uniquement */}
        {!isFreelance && (
          <Panel>
            <div className="panel-section-label">{t('leaves.label')}</div>

            <div className="leave-counters">
              {[
                { label: t('leaves.cp'),      value: me.leaveDaysLeft ?? 0, total: me.leaveDaysTotal ?? 25, color: 'var(--green)' },
                { label: t('leaves.rtt'),     value: me.rttLeft ?? 0,       total: me.rttTotal ?? 10,       color: 'var(--cyan)'  },
                { label: t('leaves.pending'), value: pendingLeaves.length,  total: null,                    color: 'var(--gold)'  },
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
                      {l.type} · {l.startDate} → {l.endDate}
                    </span>
                    <LeavePill status={l.status} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

      </div>
    </>
  )
}
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
import { getMondayOf, toISO} from '@/lib/utils'
// ── Helpers date ──────────────────────────────────────────────


// ── Pill statut consultant ────────────────────────────────────

const STATUS_CFG: Record<string, { cls: string; label: string }> = {
  assigned:  { cls: 'cons-status cons-status--assigned',  label: 'En mission'  },
  available: { cls: 'cons-status cons-status--available', label: 'Disponible'  },
  partial:   { cls: 'cons-status cons-status--partial',   label: 'Partiel'     },
  leave:     { cls: 'cons-status cons-status--leave',     label: 'En congé'    },
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { cls: 'cons-status cons-status--default', label: status }
  return <span className={cfg.cls}>{cfg.label}</span>
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
    isToday             ? 'cra-cell--today'   : '',
    val === 1           ? 'cra-cell--full'     : '',
    val === 0.5         ? 'cra-cell--half'     : '',
    !val                ? 'cra-cell--empty'    : '',
  ].join(' ')

  return (
    <div className="cra-day">
      <div className={`cra-dow ${isToday ? 'cra-dow--today' : ''}`}>
        {d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2)}
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
  const { user }    = useAuthContext()
  const isFreelance = user?.role === 'freelance'
  const monday      = getMondayOf(new Date())

  const { data: allConsultants } = useConsultants()
  const { data: projectsMap }    = useConsultantProjectsMap()
  const { data: leaves }         = useLeaveRequests()
  const { data: timesheets }     = useTimesheets(monday)

  // Consultant lié à ce user
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

  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) =>
      new Date(monday.getTime() + i * 86400000)
    )
  }, [monday])

  const myTimesheets = useMemo(
    () => (timesheets ?? []).filter(ts => ts.consultantId === me?.id),
    [timesheets, me?.id]
  )

  const weekTotal = myTimesheets.reduce((s, ts) => s + (ts.value ?? 0), 0)
  const hasDraft  = myTimesheets.some(ts => ts.status === 'draft' && (ts.value ?? 0) > 0)

  const loading = !allConsultants || !projectsMap

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Topbar title="Dashboard" breadcrumb="// my space" />
        <div className="app-content">
          <EmptyState message="// loading…" />
        </div>
      </>
    )
  }

  // ── Compte non lié ────────────────────────────────────────
  if (!me) {
    return (
      <>
        <Topbar title="Dashboard" breadcrumb="// my space" />
        <div className="app-content">
          <Panel>
            <div className="cons-unlinked">
              <div className="cons-unlinked-icon">◈</div>
              <div className="cons-unlinked-title">// compte non lié</div>
              <div className="cons-unlinked-msg">
                Ton compte n'est pas encore associé à un profil consultant.
                Contacte ton administrateur.
              </div>
            </div>
          </Panel>
        </div>
      </>
    )
  }

  // ── KPI couleurs ─────────────────────────────────────────
  const occRate = me.occupancyRate ?? 0
  const occAccent = occRate >= 80 ? 'green' : occRate > 0 ? 'gold' : undefined

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <Topbar title="Dashboard" breadcrumb="// my space" />

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
          <StatusPill status={me.status ?? 'available'} />
        </div>

        {/* KPIs — gridTemplateColumns dynamique (isFreelance) → inline */}
        <div
          className="kpi-grid"
          style={{ gridTemplateColumns: `repeat(${isFreelance ? 3 : 4}, 1fr)`, marginBottom: 24 }}
        >
          <KpiCard
            label="Missions actives"
            value={myProjects.length}
            accent="cyan"
            sub={myProjects.length === 0
              ? 'Aucune mission en cours'
              : myProjects.map(p => p.name).join(', ')
            }
          />
          <KpiCard
            label="Taux d'occupation"
            value={`${occRate}%`}
            accent={occAccent ?? 'cyan'}
          />
          <KpiCard
            label="CRA semaine"
            value={weekTotal > 0 ? `${weekTotal}j` : '—'}
            accent={weekTotal >= 5 ? 'green' : weekTotal > 0 ? 'gold' : 'cyan'}
            sub={hasDraft ? '⚠ brouillon non soumis' : weekTotal >= 5 ? '✓ semaine complète' : undefined}
          />
          {!isFreelance && (
            <KpiCard
              label="Congés restants"
              value={me.leaveDaysLeft ?? 0}
              accent="cyan"
              sub={`RTT : ${me.rttLeft ?? 0}j`}
            />
          )}
        </div>

        {/* Missions + CRA */}
        <div className="two-col" style={{ marginBottom: 16 }}>

          {/* Missions */}
          <Panel>
            <div className="panel-section-label">◧ Mes missions</div>
            {myProjects.length === 0 ? (
              <EmptyState message="// aucune mission active" />
            ) : (
              <div className="mission-list">
                {myProjects.map(project => (
                  <div key={project.id} className="mission-item">
                    <div>
                      <div className="mission-name">{project.name}</div>
                      <div className="mission-meta">projet actif</div>
                    </div>
                    <span className="mission-dot" />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* CRA semaine */}
          <Panel>
            <div className="panel-section-label">⏱ CRA — semaine courante</div>
            <div className="cra-week">
              {weekDays.map(d => {
                const iso = toISO(d)
                return (
                  <CraCell
                    key={iso}
                    d={d}
                    ts={myTimesheets.find(t => t.date === iso)}
                    isToday={iso === toISO(new Date())}
                  />
                )
              })}
            </div>
            <div className="cra-footer">
              Total : <span className="cra-total">{weekTotal}j</span>
              {hasDraft && <span className="cra-draft-warn">⚠ à soumettre</span>}
            </div>
          </Panel>
        </div>

        {/* Congés — salariés uniquement */}
        {!isFreelance && (
          <Panel>
            <div className="panel-section-label">◷ Mes congés</div>

            <div className="leave-counters">
              {[
                { label: 'CP restants',  value: me.leaveDaysLeft ?? 0, total: me.leaveDaysTotal ?? 25, color: 'var(--green)' },
                { label: 'RTT restants', value: me.rttLeft ?? 0,        total: me.rttTotal ?? 10,       color: 'var(--cyan)'  },
                { label: 'En attente',   value: pendingLeaves.length,    total: null,                    color: 'var(--gold)'  },
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
              <EmptyState message="// aucune demande de congé" />
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
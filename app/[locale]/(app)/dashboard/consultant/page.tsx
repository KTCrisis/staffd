'use client'

import { useMemo }            from 'react'
import { useTranslations }    from 'next-intl'
import { useAuthContext }     from '@/components/layout/AuthProvider'
import { Topbar }             from '@/components/layout/Topbar'
import { Panel }              from '@/components/ui/Panel'
import { Avatar }             from '@/components/ui/Avatar'
import {
  useConsultants,
  useConsultantProjectsMap,
  useLeaveRequests,
  useTimesheets,
} from '@/lib/data'

// ── helpers ──────────────────────────────────────────────────
function getMondayOf(d: Date) {
  const n = new Date(d)
  const dow = n.getDay()
  n.setDate(n.getDate() - (dow === 0 ? 6 : dow - 1))
  n.setHours(0, 0, 0, 0)
  return n
}
function toISO(d: Date) { return d.toISOString().slice(0, 10) }

// ── Pill statut ───────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    assigned:  { bg: 'rgba(0,255,136,.12)',    color: 'var(--green)', label: 'En mission'   },
    available: { bg: 'rgba(0,229,255,.12)',    color: 'var(--cyan)',  label: 'Disponible'   },
    partial:   { bg: 'rgba(255,209,102,.12)',  color: 'var(--gold)',  label: 'Partiel'      },
    leave:     { bg: 'rgba(232,0,74,.12)',     color: 'var(--pink)',  label: 'En congé'     },
  }
  const c = cfg[status] ?? { bg: 'rgba(100,100,100,.15)', color: 'var(--text3)', label: status }
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 4, ...c,
    }}>
      {c.label}
    </span>
  )
}

// ── KPI card ──────────────────────────────────────────────────
function KpiCard({ label, value, color, sub }: {
  label: string; value: string | number; color: string; sub?: string
}) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════
export default function DashboardConsultantPage() {
  const { user }    = useAuthContext()
  const isFreelance = user?.role === 'freelance'

  const monday = getMondayOf(new Date())

  const { data: allConsultants } = useConsultants()
  const { data: projectsMap }    = useConsultantProjectsMap()
  const { data: leaves }         = useLeaveRequests()
  const { data: timesheets }     = useTimesheets(monday)

  // ── Trouver le consultant lié à cet user ──────────────────
  // IMPORTANT : user.id = auth.uid ≠ consultant.id
  // Il faut retrouver le consultant dont user_id = auth.uid
  const me = useMemo(
    () => (allConsultants ?? []).find(c => c.user_id=== user?.id),
    [allConsultants, user?.id]
  )

  // ── Projets du consultant (via consultant.id, pas user.id) ─
  const myProjects = useMemo(
    () => (me ? (projectsMap?.[me.id] ?? []) : []),
    [me, projectsMap]
  )

  // ── Congés du consultant ──────────────────────────────────
  const myLeaves = useMemo(
    () => (leaves ?? []).filter(l => l.consultantId === me?.id),
    [leaves, me?.id]
  )
  const pendingLeaves  = myLeaves.filter(l => l.status === 'pending')
  const approvedLeaves = myLeaves.filter(l => l.status === 'approved')

  // ── CRA semaine courante ──────────────────────────────────
  const weekDays    = useMemo(() => {
    const days = []
    const mon = new Date(monday)
    for (let i = 0; i < 5; i++) {
      days.push(new Date(mon.getTime() + i * 86400000))
    }
    return days
  }, [monday])

  const myTimesheets = useMemo(
    () => (timesheets ?? []).filter(ts => ts.consultantId === me?.id),
    [timesheets, me?.id]
  )
  const weekTotal = myTimesheets.reduce((s, ts) => s + (ts.value ?? 0), 0)
  const hasDraft  = myTimesheets.some(ts => ts.status === 'draft' && (ts.value ?? 0) > 0)

  const loading = !allConsultants || !projectsMap

  if (loading) {
    return (
      <>
        <Topbar title="Dashboard" breadcrumb="// my space" />
        <div className="app-content">
          <div style={{ color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: 32 }}>
            // loading…
          </div>
        </div>
      </>
    )
  }

  // Pas encore lié à un consultant record
  if (!me) {
    return (
      <>
        <Topbar title="Dashboard" breadcrumb="// my space" />
        <div className="app-content">
          <Panel>
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>◈</div>
              <div style={{ fontSize: 13, marginBottom: 8 }}>// compte non lié</div>
              <div style={{ fontSize: 11 }}>
                Ton compte n'est pas encore associé à un profil consultant.
                Contacte ton administrateur.
              </div>
            </div>
          </Panel>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Dashboard" breadcrumb="// my space" />

      <div className="app-content">

        {/* ── En-tête profil ──────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '20px 24px',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 8, marginBottom: 20,
        }}>
          <Avatar initials={me.initials} color={me.avatarColor} size="lg" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>{me.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {me.role}
              {isFreelance && (
                <span style={{
                  marginLeft: 8, fontSize: 9, fontWeight: 700,
                  background: 'rgba(255,209,102,.15)', color: 'var(--gold)',
                  padding: '1px 6px', borderRadius: 3, letterSpacing: 1,
                }}>
                  FREELANCE
                </span>
              )}
            </div>
          </div>
          <StatusPill status={me.status ?? 'available'} />
        </div>

        {/* ── KPIs ────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${isFreelance ? 3 : 4}, 1fr)`,
          gap: 12, marginBottom: 24,
        }}>
          <KpiCard
            label="Missions actives"
            value={myProjects.length}
            color="var(--cyan)"
            sub={myProjects.length === 0 ? 'Aucune mission en cours' : myProjects.map(p => p.name).join(', ')}
          />
          <KpiCard
            label="Taux d'occupation"
            value={`${me.occupancyRate ?? 0}%`}
            color={
              (me.occupancyRate ?? 0) >= 80 ? 'var(--green)' :
              (me.occupancyRate ?? 0) > 0   ? 'var(--gold)'  : 'var(--text3)'
            }
          />
          <KpiCard
            label="CRA semaine"
            value={weekTotal > 0 ? `${weekTotal}j` : '—'}
            color={weekTotal >= 5 ? 'var(--green)' : weekTotal > 0 ? 'var(--gold)' : 'var(--text3)'}
            sub={hasDraft ? '⚠ brouillon non soumis' : weekTotal >= 5 ? '✓ semaine complète' : undefined}
          />
          {!isFreelance && (
            <KpiCard
              label="Congés restants"
              value={me.leaveDaysLeft ?? 0}
              color="var(--text1)"
              sub={`RTT : ${me.rttLeft ?? 0}j`}
            />
          )}
        </div>

        {/* ── Missions ────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          <Panel>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
              ◧ Mes missions
            </div>

            {myProjects.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', padding: '24px 0', textAlign: 'center' }}>
                // aucune mission active
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myProjects.map(project => (
                  <div key={project.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg3)', borderRadius: 6,
                    border: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                        {project.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                        projet actif
                      </div>
                    </div>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--green)',
                    }} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* ── CRA semaine ───────────────────────────────── */}
          <Panel>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
              ⏱ CRA — semaine courante
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {weekDays.map(d => {
                const iso = toISO(d)
                const ts  = myTimesheets.find(t => t.date === iso)
                const isToday = iso === toISO(new Date())
                return (
                  <div key={iso} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: isToday ? 'var(--cyan)' : 'var(--text3)', marginBottom: 4 }}>
                      {d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2)}
                    </div>
                    <div style={{
                      height: 40, borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                      border: `1px solid ${isToday ? 'var(--cyan)' : 'var(--border)'}`,
                      background: ts?.value === 1 ? 'rgba(0,255,136,.12)'
                               : ts?.value === 0.5 ? 'rgba(255,209,102,.12)'
                               : 'var(--bg3)',
                      color: ts?.value === 1 ? 'var(--green)'
                           : ts?.value === 0.5 ? 'var(--gold)'
                           : 'var(--text3)',
                    }}>
                      {ts?.value === 1 ? '1' : ts?.value === 0.5 ? '½' : '—'}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'right' }}>
              Total : <span style={{ color: 'var(--text1)', fontWeight: 700 }}>{weekTotal}j</span>
              {hasDraft && (
                <span style={{ marginLeft: 8, color: 'var(--gold)' }}>⚠ à soumettre</span>
              )}
            </div>
          </Panel>
        </div>

        {/* ── Congés (salarié uniquement) ─────────────────── */}
        {!isFreelance && (
          <Panel>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
              ◷ Mes congés
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'CP restants',  value: me.leaveDaysLeft ?? 0, color: 'var(--green)', total: me.leaveDaysTotal ?? 25 },
                { label: 'RTT restants', value: me.rttLeft ?? 0,        color: 'var(--cyan)',  total: me.rttTotal ?? 10 },
                { label: 'En attente',   value: pendingLeaves.length,    color: 'var(--gold)',  total: null },
              ].map(({ label, value, color, total }) => (
                <div key={label} style={{
                  padding: '12px 16px', borderRadius: 6,
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color }}>
                    {value}{total !== null ? <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>/{total}</span> : ''}
                  </div>
                </div>
              ))}
            </div>

            {/* Dernières demandes */}
            {myLeaves.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {myLeaves.slice(0, 4).map(l => (
                  <div key={l.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 5,
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    fontSize: 11,
                  }}>
                    <div style={{ color: 'var(--text1)' }}>
                      {l.type} · {l.startDate} → {l.endDate}
                    </div>
                    <div style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: 3,
                      background: l.status === 'approved' ? 'rgba(0,255,136,.12)'
                                : l.status === 'pending'  ? 'rgba(255,209,102,.12)'
                                : 'rgba(232,0,74,.12)',
                      color: l.status === 'approved' ? 'var(--green)'
                           : l.status === 'pending'  ? 'var(--gold)'
                           : 'var(--pink)',
                    }}>
                      {l.status}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {myLeaves.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '16px 0' }}>
                // aucune demande de congé
              </div>
            )}
          </Panel>
        )}

      </div>
    </>
  )
}
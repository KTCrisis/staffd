'use client'

import { useTranslations }  from 'next-intl'
import { Topbar }           from '@/components/layout/Topbar'
import { KpiCard, Panel }   from '@/components/ui'
import { ConsultantItem }   from '@/components/consultants/ConsultantItem'
import { ActivityFeed }     from '@/components/dashboard/ActivityFeed'
import { MiniCalendar }     from '@/components/dashboard/MiniCalendar'
import { useConsultants, useLeaveRequests, useTimesheets, useActivity } from '@/lib/data'

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function getMondayOf(d: Date): Date {
  const date = new Date(d)
  const day  = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

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

export default function ManagerDashboardPage() {
  const monday = getMondayOf(new Date())

  const { data: consultants, loading: lC } = useConsultants()
  const { data: leaveReqs,   loading: lL } = useLeaveRequests()
  const { data: timesheets }               = useTimesheets(monday)
  const { data: activity,    loading: lA } = useActivity(5)

  const list = consultants ?? []

  // ── KPIs équipe ─────────────────────────────────────────
  const available    = list.filter(c => c.status === 'available').length
  const assigned     = list.filter(c => c.status === 'assigned').length
  const pendingLeave = (leaveReqs ?? []).filter(l => l.status === 'pending').length
  const pendingCra   = (timesheets ?? []).filter(ts => ts.status === 'submitted').length
  const avgOcc       = list.length
    ? Math.round(list.reduce((s, c) => s + (c.occupancyRate ?? 0), 0) / list.length)
    : 0

  return (
    <>
      <Topbar title="Vue équipe" breadcrumb="Dashboard" />

      <div className="app-content">

        {/* ── KPIs ── */}
        <div className="kpi-grid">
          <KpiCard label="Disponibles" value={available}
            valueSuffix={`/${list.length}`} accent="green"
            progress={list.length ? Math.round((available / list.length) * 100) : 0} />
          <KpiCard label="En mission" value={assigned} accent="cyan"
            progress={list.length ? Math.round((assigned / list.length) * 100) : 0} />
          <KpiCard label="Congés en attente" value={pendingLeave} accent="pink" />
          <KpiCard label="Taux d'occupation" value={avgOcc} valueSuffix="%" accent="gold" progress={avgOcc} />
        </div>

        <div className="two-col">
          {/* ── Équipe ── */}
          <Panel title="Mon équipe">
            {lC
              ? <Skeleton h={200} />
              : list.map(c => <ConsultantItem key={c.id} consultant={c} />)
            }
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── CRA à valider ── */}
            <Panel title="CRA à valider">
              {pendingCra === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text2)', padding: '8px 0' }}>
                  ✓ Aucun CRA en attente
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--gold)', padding: '8px 0' }}>
                  {pendingCra} entrée{pendingCra > 1 ? 's' : ''} à approuver cette semaine
                </div>
              )}
            </Panel>

            {/* ── Congés pending ── */}
            <Panel title="Demandes de congés">
              {lL ? <Skeleton h={80} /> : (
                (leaveReqs ?? []).filter(l => l.status === 'pending').length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text2)', padding: '8px 0' }}>
                    ✓ Aucune demande en attente
                  </div>
                ) : (
                  (leaveReqs ?? []).filter(l => l.status === 'pending').slice(0, 4).map(l => (
                    <div key={l.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 11,
                    }}>
                      <div>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{l.consultantName}</span>
                        <span style={{ color: 'var(--text2)', marginLeft: 8 }}>{l.type}</span>
                      </div>
                      <span style={{ color: 'var(--text2)', fontSize: 10 }}>
                        {l.startDate} → {l.endDate}
                      </span>
                    </div>
                  ))
                )
              )}
            </Panel>

            {/* ── Activité récente ── */}
            <Panel title="Activité récente">
              {lA ? <Skeleton h={80} /> : <ActivityFeed items={activity ?? []} />}
            </Panel>

            <Panel title="Calendrier">
              <MiniCalendar />
            </Panel>

          </div>
        </div>

      </div>
    </>
  )
}
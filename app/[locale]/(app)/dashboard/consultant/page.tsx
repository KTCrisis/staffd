'use client'

import { useState, useMemo, useCallback } from 'react'
import { useLocale }                      from 'next-intl'
import { Topbar }                         from '@/components/layout/Topbar'
import { Panel }                          from '@/components/ui'
import { Avatar }                         from '@/components/ui/Avatar'
import { MiniCalendar }                   from '@/components/dashboard/MiniCalendar'
import {
  useConsultants,
  useAssignments,
  useLeaveRequests,
  useTimesheets,
  useInternalProjectTypes,
  upsertTimesheet,
  submitTimesheets,
} from '@/lib/data'
import type { Timesheet } from '@/lib/data'
import { useAuth } from '@/lib/auth'

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

function toISO(d: Date): string { return d.toISOString().slice(0, 10) }

function Skeleton({ h = 80 }: { h?: number }) {
  return (
    <div style={{
      height: h, background: 'var(--bg3)',
      borderRadius: 4, animation: 'pulse 1.5s ease infinite',
    }} />
  )
}

// ══════════════════════════════════════════════════════════════
// MINI CRA INLINE
// ══════════════════════════════════════════════════════════════

const CRA_VALUES = [
  { label: '—', v: 0 },
  { label: '½', v: 0.5 },
  { label: '1', v: 1 },
]

function MiniCra({ consultantId, projectOptions }: {
  consultantId:   string
  projectOptions: { id: string; name: string }[]
}) {
  const monday = getMondayOf(new Date())
  const days   = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const { data: timesheets, loading } = useTimesheets(monday)
  const [localEntries, setLocalEntries] = useState<Record<string, Timesheet>>({})
  const [activeDay, setActiveDay]       = useState<string | null>(null)
  const [val,  setVal]  = useState(0)
  const [proj, setProj] = useState(projectOptions[0]?.id ?? '')

  // Lookup fusionné Supabase + local
  const lookup = useMemo(() => {
    const map: Record<string, Timesheet> = {}
    ;(timesheets ?? [])
      .filter(ts => ts.consultantId === consultantId)
      .forEach(ts => { map[ts.date] = ts })
    Object.assign(map, localEntries)
    return map
  }, [timesheets, localEntries, consultantId])

  const weekTotal = Object.values(lookup).reduce((s, ts) => s + (ts.value ?? 0), 0)
  const draftEntries = Object.values(lookup).filter(ts => ts.status === 'draft')
  const hasDraft     = draftEntries.length > 0

  const handleSave = useCallback(async () => {
    if (!activeDay || !proj) return
    const key = activeDay
    setLocalEntries(prev => ({
      ...prev,
      [key]: { id: `local-${key}`, consultantId, projectId: proj, date: key, value: val, status: 'draft' },
    }))
    setActiveDay(null)
    try {
      const saved = await upsertTimesheet({ consultantId, date: key, value: val, projectId: proj })
      setLocalEntries(prev => ({ ...prev, [key]: saved }))
    } catch (e) {
      console.error('upsertTimesheet error:', e)
    }
  }, [activeDay, proj, val, consultantId])

  const handleSubmit = useCallback(async () => {
    const ids = draftEntries
      .map(ts => ts.id)
      .filter(id => !id.startsWith('local-'))
    if (!ids.length) return
    await submitTimesheets(ids)
    setLocalEntries(prev => {
      const updated = { ...prev }
      Object.entries(lookup).forEach(([k, ts]) => {
        if (ts.status === 'draft') updated[k] = { ...ts, status: 'submitted' }
      })
      return updated
    })
  }, [draftEntries, lookup])

  if (loading) return <Skeleton h={80} />

  return (
    <div>
      {/* ── Grille 5 jours ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 }}>
        {days.map(d => {
          const dateStr  = toISO(d)
          const entry    = lookup[dateStr]
          const isToday  = dateStr === toISO(new Date())
          const isActive = activeDay === dateStr

          return (
            <div key={dateStr}>
              {/* Label jour */}
              <div style={{
                textAlign: 'center', fontSize: 9, marginBottom: 4,
                color: isToday ? 'var(--green)' : 'var(--text2)',
                fontWeight: isToday ? 700 : 400, letterSpacing: 1,
              }}>
                {d.toLocaleDateString('en', { weekday: 'short' })}
                <div style={{ fontSize: 9 }}>{d.getDate()}</div>
              </div>

              {/* Bouton cellule */}
              <button
                onClick={() => {
                  if (isActive) { setActiveDay(null); return }
                  setActiveDay(dateStr)
                  setVal(entry?.value ?? 0)
                  setProj(entry?.projectId ?? projectOptions[0]?.id ?? '')
                }}
                style={{
                  width: '100%', height: 38, borderRadius: 6, cursor: 'pointer',
                  border: `1px ${isActive ? 'solid' : entry ? 'solid' : 'dashed'} ${
                    isActive ? 'var(--cyan)' : 'var(--border)'
                  }`,
                  background: isActive
                    ? 'rgba(0,229,255,0.08)'
                    : entry?.value ? 'var(--bg3)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, position: 'relative',
                  color: entry?.value === 1
                    ? 'var(--green)'
                    : entry?.value === 0.5
                    ? 'var(--gold)'
                    : 'var(--text3)',
                }}
              >
                {entry?.value === 1 ? '1' : entry?.value === 0.5 ? '½' : '+'}
                {entry && (
                  <span style={{
                    position: 'absolute', top: 3, right: 3,
                    width: 4, height: 4, borderRadius: '50%',
                    background:
                      entry.status === 'approved'  ? 'var(--green)' :
                      entry.status === 'submitted' ? 'var(--gold)'  : 'var(--text3)',
                  }} />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Éditeur inline ── */}
      {activeDay && (
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 12, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {CRA_VALUES.map(o => (
              <button key={o.v}
                className={`btn ${val === o.v ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, fontSize: 16, fontWeight: 700, padding: '4px 0' }}
                onClick={() => setVal(o.v)}
              >
                {o.label}
              </button>
            ))}
          </div>

          {projectOptions.length > 0 && (
            <select className="input" value={proj}
              onChange={e => setProj(e.target.value)}
              style={{ fontSize: 11, marginBottom: 8 }}>
              {projectOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary" style={{ flex: 1, fontSize: 11 }} onClick={handleSave}>
              ✓ Enregistrer
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setActiveDay(null)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Footer total + soumettre ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>
          Total :
          <strong style={{
            marginLeft: 6, fontSize: 14,
            color: weekTotal >= 5 ? 'var(--green)' : weekTotal > 0 ? 'var(--gold)' : 'var(--text3)',
          }}>
            {weekTotal > 0 ? weekTotal.toFixed(1) : '—'} j
          </strong>
        </span>
        {hasDraft && (
          <button className="btn btn-ghost"
            style={{ fontSize: 10, color: 'var(--cyan)', padding: '4px 10px' }}
            onClick={handleSubmit}>
            📤 Soumettre
          </button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function ConsultantDashboardPage() {
  const { user }  = useAuth()
  const locale    = useLocale()

  const { data: consultants }             = useConsultants()
  const { data: assignments }             = useAssignments()
  const { data: leaveReqs, loading: lL } = useLeaveRequests()
  const { data: internalTypes }           = useInternalProjectTypes()

  // Consultant courant
  const me = useMemo(() =>
    (consultants ?? []).find(c => c.user_id === user?.id),
    [consultants, user?.id]
  )

  // Ses assignments
  const myAssignments = useMemo(() =>
    (assignments ?? []).filter(a => a.consultant_id === me?.id),
    [assignments, me?.id]
  )

  // Projets système dédoublonnés
  const systemProjects = useMemo(() => {
    const seen = new Set<string>()
    return (internalTypes ?? [])
      .filter(t => { if (seen.has(t.key)) return false; seen.add(t.key); return true })
      .map(t => ({ id: `__${t.key}__`, name: locale === 'fr' ? t.label_fr : t.label_en }))
  }, [internalTypes, locale])

  // Options projets pour mini CRA
  const projectOptions = useMemo(() => [
    ...myAssignments.map(a => ({ id: a.project_id, name: a.projects?.name ?? a.project_id })),
    ...systemProjects,
  ], [myAssignments, systemProjects])

  // Congés
  const myLeaves = useMemo(() =>
    (leaveReqs ?? []).filter(l => l.consultantId === me?.id),
    [leaveReqs, me?.id]
  )

  const today = toISO(new Date())

  return (
    <>
      <Topbar title="Mon espace" breadcrumb="Dashboard" />

      <div className="app-content">

        {/* ── Bandeau profil ── */}
        {me && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '16px 20px', marginBottom: 20,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 6, borderLeft: '3px solid var(--green)',
          }}>
            <Avatar initials={me.initials} color={me.avatarColor} size="sm" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{me.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{me.role}</div>
            </div>

            {/* Soldes */}
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>
                  {me.leaveDaysLeft ?? '—'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  CP restants
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cyan)' }}>
                  {me.rttLeft ?? '—'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  RTT restants
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="two-col">

          {/* ── Colonne gauche ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Mini CRA */}
            <Panel title="Mon CRA — semaine en cours">
              {me
                ? <MiniCra consultantId={me.id} projectOptions={projectOptions} />
                : <Skeleton h={100} />
              }
            </Panel>

            {/* Missions */}
            <Panel title="Mes missions">
              {myAssignments.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text2)', padding: '8px 0' }}>
                  Aucune mission en cours
                </div>
              ) : myAssignments.map(a => {
                const isActive =
                  (!a.end_date   || a.end_date   >= today) &&
                  (!a.start_date || a.start_date <= today)
                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                        {a.projects?.name ?? '—'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                        {a.start_date ?? '?'} → {a.end_date ?? '∞'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: a.allocation >= 100 ? 'var(--cyan)' : 'var(--gold)',
                      }}>
                        {a.allocation}%
                      </span>
                      <span style={{
                        fontSize: 8, padding: '2px 6px', borderRadius: 3,
                        textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700,
                        background: isActive ? 'rgba(0,255,136,0.10)' : 'rgba(100,100,100,0.10)',
                        color:      isActive ? 'var(--green)' : 'var(--text2)',
                        border:     `1px solid ${isActive ? 'rgba(0,255,136,0.3)' : 'var(--border)'}`,
                      }}>
                        {isActive ? 'Active' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </Panel>

          </div>

          {/* ── Colonne droite ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Congés */}
            <Panel title="Mes congés">
              {lL ? <Skeleton h={100} /> : myLeaves.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text2)', padding: '8px 0' }}>
                  Aucune demande
                </div>
              ) : myLeaves.slice(0, 5).map(l => (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                      {l.type}
                      <span style={{ fontWeight: 400, color: 'var(--text2)', marginLeft: 6 }}>
                        {l.days}j
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>
                      {l.startDate} → {l.endDate}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 8, padding: '2px 7px', borderRadius: 3,
                    textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700,
                    background:
                      l.status === 'approved' ? 'rgba(0,255,136,0.10)' :
                      l.status === 'pending'  ? 'rgba(255,209,102,0.10)' :
                      'rgba(255,45,107,0.10)',
                    color:
                      l.status === 'approved' ? 'var(--green)' :
                      l.status === 'pending'  ? 'var(--gold)'  : 'var(--pink)',
                    border: `1px solid ${
                      l.status === 'approved' ? 'rgba(0,255,136,0.3)'   :
                      l.status === 'pending'  ? 'rgba(255,209,102,0.3)' :
                      'rgba(255,45,107,0.3)'
                    }`,
                  }}>
                    {l.status}
                  </span>
                </div>
              ))}
            </Panel>

            {/* Calendrier */}
            <Panel title="Calendrier">
              <MiniCalendar />
            </Panel>

          </div>
        </div>

      </div>
    </>
  )
}
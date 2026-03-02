'use client'

import { useState, useMemo } from 'react'
import { useTranslations }   from 'next-intl'
import { Topbar }            from '@/components/layout/Topbar'
import { Panel, StatRow }    from '@/components/ui'
import { Avatar }            from '@/components/ui/Avatar'
import {
  useTimesheets,
  useConsultants,
  useProjects,
  upsertTimesheet,
  submitTimesheets,
  approveTimesheets,
} from '@/lib/data'
import type { Timesheet } from '@/lib/data'
import { useAuth, isAdmin, canEdit } from '@/lib/auth'
import type { ProjectStatus } from '@/types'

// ── Helpers ──────────────────────────────────────────────────

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMondayOf(date: Date): Date {
  const d    = new Date(date)
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDay(d: Date): { dow: string; num: string } {
  return {
    dow: d.toLocaleDateString('en', { weekday: 'short' }),
    num: d.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
  }
}

type TimesheetStatus = 'draft' | 'submitted' | 'approved'

const VALUE_OPTIONS: { label: string; value: number }[] = [
  { label: '—', value: 0   },
  { label: '½', value: 0.5 },
  { label: '1', value: 1.0 },
]

function valueColor(v: number | undefined): string {
  if (!v)    return 'var(--text3)'
  if (v < 1) return 'var(--gold)'
  return 'var(--green)'
}

function statusDotColor(s: TimesheetStatus): string {
  if (s === 'approved')  return 'var(--green)'
  if (s === 'submitted') return 'var(--gold)'
  return 'var(--text3)'
}

// Custom pill — Badge doesn't support timesheet statuses or color prop
function StatusPill({ status }: { status: TimesheetStatus }) {
  const map: Record<TimesheetStatus, { bg: string; text: string }> = {
    draft:     { bg: 'rgba(90,90,90,0.2)',      text: 'var(--text3)' },
    submitted: { bg: 'rgba(255,209,102,0.15)',  text: 'var(--gold)'  },
    approved:  { bg: 'rgba(0,255,136,0.12)',    text: 'var(--green)' },
  }
  const { bg, text } = map[status]
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', padding: '2px 6px',
      borderRadius: 4, background: bg, color: text,
    }}>
      {status}
    </span>
  )
}

// ── Cell popup (inline editor) ────────────────────────────────

interface CellEditorProps {
  value:        number
  status:       TimesheetStatus
  projectId:    string | null
  projects:     { id: string; name: string }[]
  canEditEntry: boolean
  onSave:       (value: number, projectId: string) => void
  onClose:      () => void
}

function CellEditor({ value, status, projectId, projects, canEditEntry, onSave, onClose }: CellEditorProps) {
  const [val,  setVal]  = useState(value)
  const [proj, setProj] = useState(projectId ?? projects[0]?.id ?? '')

  if (!canEditEntry) {
    return (
      <div className="ts-popup">
        <StatusPill status={status} />
        <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 8px', marginTop: 8 }} onClick={onClose}>✕ Close</button>
      </div>
    )
  }

  return (
    <div className="ts-popup">
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {VALUE_OPTIONS.map(o => (
          <button
            key={o.value}
            className={`btn ${val === o.value ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '5px 0', fontSize: 14, fontWeight: 700 }}
            onClick={() => setVal(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <select
        className="input"
        value={proj}
        onChange={e => setProj(e.target.value)}
        style={{ fontSize: 11, padding: '5px 8px', marginBottom: 10, width: '100%' }}
      >
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, fontSize: 11, padding: '4px 0' }}
          onClick={() => { onSave(val, proj); onClose() }}
        >
          ✓ Save
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={onClose}>✕</button>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function TimesheetsPage() {
  const t    = useTranslations('timesheets')
  const { user } = useAuth()
  const role = user?.role

  // Week navigation
  const [monday, setMonday] = useState(() => getMondayOf(new Date()))
  const days = useMemo(() => getWeekDays(monday), [monday])

  const prevWeek = () => { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d) }
  const nextWeek = () => { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d) }
  const goToday  = () => setMonday(getMondayOf(new Date()))
  const isThisWeek = toISODate(getMondayOf(new Date())) === toISODate(monday)

  // Data
  const { data: timesheets, loading, error } = useTimesheets(monday)
  const { data: consultants }                = useConsultants()
  const { data: projects }                   = useProjects()

  // Popup state
  const [popup, setPopup] = useState<{ consultantId: string; date: string } | null>(null)

  // Fast lookup map
  const lookup = useMemo(() => {
    const map: Record<string, Timesheet> = {}
    ;(timesheets ?? []).forEach(ts => { map[`${ts.consultantId}__${ts.date}`] = ts })
    return map
  }, [timesheets])

  // Stats
  const stats = useMemo(() => {
    const all       = timesheets ?? []
    const totalDays = all.reduce((s, ts) => s + (ts.value ?? 0), 0)
    return [
      { value: totalDays.toFixed(1),                               label: t('stats.totalDays'), color: 'var(--cyan)'  },
      { value: all.filter(ts => ts.status === 'draft').length,     label: t('stats.draft'),     color: 'var(--text2)' },
      { value: all.filter(ts => ts.status === 'submitted').length, label: t('stats.submitted'), color: 'var(--gold)'  },
      { value: all.filter(ts => ts.status === 'approved').length,  label: t('stats.approved'),  color: 'var(--green)' },
    ]
  }, [timesheets, t])

  // Visible consultants by role
  const visibleConsultants = useMemo(() => {
    if (!consultants) return []
    if (isAdmin(role) || role === 'manager') return consultants
    return consultants.filter(c => c.id === user?.id)
  }, [consultants, role, user])

  // Active projects only — cast avoids the ProjectStatus / 'done' overlap TS error

    const activeProjects = useMemo(() =>
    (projects ?? []).filter(p => p.status !== 'completed' && p.status !== 'archived'),
    [projects]
    )

  // Mutations
  async function handleSave(consultantId: string, date: string, value: number, projectId: string) {
    try { await upsertTimesheet({ consultantId, date, value, projectId }) }
    catch (e) { console.error(e) }
  }

  async function handleSubmitAll(consultantId: string) {
    const ids = (timesheets ?? [])
      .filter(ts => ts.consultantId === consultantId && ts.status === 'draft')
      .map(ts => ts.id)
    if (ids.length) await submitTimesheets(ids)
  }

  async function handleApproveAll(consultantId: string) {
    const ids = (timesheets ?? [])
      .filter(ts => ts.consultantId === consultantId && ts.status === 'submitted')
      .map(ts => ts.id)
    if (ids.length) await approveTimesheets(ids)
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">

        <StatRow stats={stats} />

        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={prevWeek}>← {t('prevWeek')}</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>
            {t('weekOf')} {monday.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button className="btn btn-ghost" onClick={nextWeek}>{t('nextWeek')} →</button>
          {!isThisWeek && (
            <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={goToday}>
              {t('today')}
            </button>
          )}
        </div>

        {loading && (
          <p style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>// loading…</p>
        )}
        {error && <p style={{ color: 'var(--pink)' }}>{error}</p>}

        {/* Grid */}
        {!loading && (
          <Panel>
            <div style={{ overflowX: 'auto' }}>
              <table className="ts-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 190, textAlign: 'left' }}>{t('table.consultant')}</th>
                    {days.map(d => {
                      const { dow, num } = formatDay(d)
                      const isToday = toISODate(d) === toISODate(new Date())
                      return (
                        <th key={toISODate(d)} style={{ textAlign: 'center', minWidth: 88 }}>
                          <div style={{ color: isToday ? 'var(--cyan)' : 'var(--text2)', fontSize: 10, fontWeight: 600 }}>{dow}</div>
                          <div style={{ color: isToday ? 'var(--cyan)' : 'var(--text1)', fontSize: 12, fontWeight: 700 }}>{num}</div>
                        </th>
                      )
                    })}
                    <th style={{ textAlign: 'center', minWidth: 80 }}>{t('table.total')}</th>
                    <th style={{ textAlign: 'center', minWidth: 110 }}>{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleConsultants.map(c => {
                    const rowEntries   = (timesheets ?? []).filter(ts => ts.consultantId === c.id)
                    const weekTotal    = rowEntries.reduce((s, ts) => s + (ts.value ?? 0), 0)
                    const hasDraft     = rowEntries.some(ts => ts.status === 'draft')
                    const hasSubmitted = rowEntries.some(ts => ts.status === 'submitted')

                    const rowStatus: TimesheetStatus = hasDraft
                      ? 'draft'
                      : hasSubmitted ? 'submitted' : 'approved'

                    return (
                      <tr key={c.id}>

                        {/* Consultant */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* size="sm" = 24px — correct Avatar prop type */}
                            <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{c.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.role}</div>
                            </div>
                          </div>
                        </td>

                        {/* Day cells */}
                        {days.map(d => {
                          const dateStr     = toISODate(d)
                          const entry       = lookup[`${c.id}__${dateStr}`]
                          const isOpen      = popup?.consultantId === c.id && popup?.date === dateStr
                          const entryIsDraft = !entry || entry.status === 'draft'
                          const canEditCell  = canEdit(role) || (role === 'consultant' && entryIsDraft)

                          return (
                            <td key={dateStr} style={{ textAlign: 'center', position: 'relative' }}>
                              <button
                                className={`ts-cell ${entry ? 'ts-cell--filled' : 'ts-cell--empty'}`}
                                style={{ color: valueColor(entry?.value) }}
                                onClick={() => setPopup(isOpen ? null : { consultantId: c.id, date: dateStr })}
                                title={entry?.status ?? 'No entry'}
                              >
                                {entry ? (entry.value === 1 ? '1' : entry.value === 0.5 ? '½' : '—') : '+'}
                                {entry && (
                                  <span className="ts-status-dot" style={{ background: statusDotColor(entry.status) }} />
                                )}
                              </button>

                              {isOpen && activeProjects.length > 0 && (
                                <CellEditor
                                  value={entry?.value ?? 0}
                                  status={entry?.status ?? 'draft'}
                                  projectId={entry?.projectId ?? null}
                                  projects={activeProjects}
                                  canEditEntry={canEditCell}
                                  onSave={(val, proj) => handleSave(c.id, dateStr, val, proj)}
                                  onClose={() => setPopup(null)}
                                />
                              )}
                            </td>
                          )
                        })}

                        {/* Weekly total */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   14,
                            fontWeight: 700,
                            color: weekTotal >= 5 ? 'var(--green)' : weekTotal > 0 ? 'var(--gold)' : 'var(--text3)',
                          }}>
                            {weekTotal > 0 ? weekTotal.toFixed(1) : '—'}
                          </span>
                          {rowEntries.length > 0 && (
                            <div style={{ marginTop: 3 }}>
                              <StatusPill status={rowStatus} />
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                            {hasDraft && (canEdit(role) || role === 'consultant') && (
                              <button
                                className="btn btn-ghost"
                                style={{ fontSize: 10, padding: '2px 8px', color: 'var(--cyan)', whiteSpace: 'nowrap' }}
                                onClick={() => handleSubmitAll(c.id)}
                                title={t('actions.submitTitle')}
                              >
                                📤 {t('actions.submit')}
                              </button>
                            )}
                            {hasSubmitted && isAdmin(role) && (
                              <button
                                className="btn btn-ghost"
                                style={{ fontSize: 10, padding: '2px 8px', color: 'var(--green)', whiteSpace: 'nowrap' }}
                                onClick={() => handleApproveAll(c.id)}
                                title={t('actions.approveTitle')}
                              >
                                ✅ {t('actions.approve')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {visibleConsultants.length === 0 && (
                    <tr>
                      <td
                        colSpan={days.length + 3}
                        style={{ textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '32px 0' }}
                      >
                        // no consultants
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          {([
            { color: 'var(--text3)', square: true,  label: t('legend.empty')     },
            { color: 'var(--gold)',  square: true,  label: t('legend.half')      },
            { color: 'var(--green)', square: true,  label: t('legend.full')      },
            { color: 'var(--text3)', square: false, label: t('legend.draft')     },
            { color: 'var(--gold)',  square: false, label: t('legend.submitted') },
            { color: 'var(--green)', square: false, label: t('legend.approved')  },
          ] as { color: string; square: boolean; label: string }[]).map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {item.square
                ? <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: 'inline-block' }} />
                : <span style={{ width: 8,  height: 8,  borderRadius: '50%', background: item.color, display: 'inline-block' }} />
              }
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{item.label}</span>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        .ts-table {
          width: 100%;
          border-collapse: collapse;
        }
        .ts-table th {
          padding: 8px 12px;
          color: var(--text3);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-bottom: 1px solid var(--border);
        }
        .ts-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .ts-table tr:last-child td { border-bottom: none; }
        .ts-table tbody tr:hover td { background: var(--bg3); }

        .ts-cell {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg3);
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 700;
          position: relative;
          transition: border-color 0.15s, background 0.15s;
        }
        .ts-cell:hover { border-color: var(--cyan); background: var(--bg2); }
        .ts-cell--empty { color: var(--text3); border-style: dashed; }
        .ts-status-dot {
          position: absolute;
          top: 3px; right: 3px;
          width: 5px; height: 5px;
          border-radius: 50%;
        }
        .ts-popup {
          position: absolute;
          top: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 200;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          min-width: 168px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
      `}</style>
    </>
  )
}
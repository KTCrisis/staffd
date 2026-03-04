'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/Topbar'
import { Panel, StatRow } from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar'
import {
  useTimesheets,
  useConsultants,
  useConsultantProjectsMap,
  upsertTimesheet,
  submitTimesheets,
  approveTimesheets,
} from '@/lib/data'
import type { Timesheet } from '@/lib/data'
import { useAuth, isAdmin, canEdit } from '@/lib/auth'

// ── Helpers ──────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function fmtDay(d: Date) {
  return {
    dow: d.toLocaleDateString('en', { weekday: 'short' }),
    num: d.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
  }
}

type TSStatus = 'draft' | 'submitted' | 'approved'

const VALUES = [
  { label: '—', v: 0 },
  { label: '½', v: 0.5 },
  { label: '1', v: 1 },
]

function valueColor(v?: number) {
  if (!v) return 'var(--text3)'
  if (v < 1) return 'var(--gold)'
  return 'var(--green)'
}

function dotColor(s: TSStatus) {
  if (s === 'approved') return 'var(--green)'
  if (s === 'submitted') return 'var(--gold)'
  return 'var(--text3)'
}

// Remplace Badge — Badge ne supporte pas les statuts timesheets
function Pill({ status }: { status: TSStatus }) {
  const cfg: Record<TSStatus, { bg: string; color: string }> = {
    draft: { bg: 'rgba(100,100,100,.2)', color: 'var(--text3)' },
    submitted: { bg: 'rgba(255,209,102,.15)', color: 'var(--gold)' },
    approved: { bg: 'rgba(0,255,136,.12)', color: 'var(--green)' },
  }
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 4,
        ...cfg[status],
      }}
    >
      {status}
    </span>
  )
}

// ── CellEditor ────────────────────────────────────────────────

interface CellEditorProps {
  entry: Timesheet | undefined
  projects: { id: string; name: string }[]
  canEditEntry: boolean
  onSave: (value: number, projectId: string) => void
  onClose: () => void
}

function CellEditor({ entry, projects, canEditEntry, onSave, onClose }: CellEditorProps) {
  const [val, setVal] = useState(entry?.value ?? 0)
  const [proj, setProj] = useState(entry?.projectId ?? projects[0]?.id ?? '')

  // Si entry/projets changent en live (ré-fetch), on resynchronise l'UI du popup
  useEffect(() => {
    setVal(entry?.value ?? 0)
  }, [entry?.value])

  useEffect(() => {
    setProj(entry?.projectId ?? projects[0]?.id ?? '')
  }, [entry?.projectId, projects])

  if (!canEditEntry) {
    return (
      <div className="ts-popup">
        <Pill status={entry?.status ?? 'draft'} />
        <button
          className="btn btn-ghost"
          style={{ marginTop: 8, fontSize: 10, padding: '2px 8px' }}
          onClick={onClose}
        >
          ✕ Close
        </button>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="ts-popup" style={{ color: 'var(--text3)', fontSize: 11 }}>
        No active project assigned.
        <button className="btn btn-ghost" style={{ marginTop: 8, fontSize: 10 }} onClick={onClose}>
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="ts-popup">
      {/* Value */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {VALUES.map(o => (
          <button
            key={o.v}
            className={`btn ${val === o.v ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '5px 0', fontSize: 14, fontWeight: 700 }}
            onClick={() => setVal(o.v)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Project */}
      <select
        className="input"
        value={proj}
        onChange={e => setProj(e.target.value)}
        style={{ fontSize: 11, padding: '5px 8px', marginBottom: 10, width: '100%' }}
      >
        {projects.map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, fontSize: 11, padding: '4px 0' }}
          onClick={() => {
            if (proj) {
              onSave(val, proj)
              onClose()
            }
          }}
        >
          ✓ Save
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function TimesheetsPage() {
  const t = useTranslations('timesheets')
  const { user } = useAuth()
  const role = user?.role
  const currentUserId = user?.id ?? null

  // ── Week nav ──────────────────────────────────────────────
  const [monday, setMonday] = useState(() => getMondayOf(new Date()))
  const days = useMemo(() => getWeekDays(monday), [monday])
  const isThisWeek = toISO(getMondayOf(new Date())) === toISO(monday)

  const prevWeek = () => setMonday(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek = () => setMonday(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  const goToday = () => setMonday(getMondayOf(new Date()))

  // ── Remote data ───────────────────────────────────────────
  const { data: timesheets, loading, error } = useTimesheets(monday)
  const { data: consultants } = useConsultants()
  const { data: projectsMap } = useConsultantProjectsMap()

  const consultantsSafe = consultants ?? []
  const consultantsLoaded = Array.isArray(consultants)
  const projectsLoaded = typeof projectsMap !== 'undefined' // map ou undefined

  // ── Optimistic local state ────────────────────────────────
  const [localEntries, setLocalEntries] = useState<Record<string, Timesheet>>({})

  // Reset du local state quand on change de semaine (IMPORTANT: pas de setState dans le render)
  useEffect(() => {
    setLocalEntries({})
    // fermer le popup quand on navigue
    setPopup(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toISO(monday)])

  // ── Popup ─────────────────────────────────────────────────
  const [popup, setPopup] = useState<{ consultantId: string; date: string } | null>(null)

  // ── Merged lookup: Supabase + local overrides ─────────────
  const lookup = useMemo(() => {
    const map: Record<string, Timesheet> = {}
    ;(timesheets ?? []).forEach(ts => { map[`${ts.consultantId}__${ts.date}`] = ts })
    Object.assign(map, localEntries) // optimistic override
    return map
  }, [timesheets, localEntries])

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = Object.values(lookup)
    const daysCount = all.reduce((s, ts) => s + (ts.value ?? 0), 0)
    return [
      { value: daysCount.toFixed(1), label: t('stats.totalDays'), color: 'var(--cyan)' },
      { value: all.filter(ts => ts.status === 'draft').length, label: t('stats.draft'), color: 'var(--text2)' },
      { value: all.filter(ts => ts.status === 'submitted').length, label: t('stats.submitted'), color: 'var(--gold)' },
      { value: all.filter(ts => ts.status === 'approved').length, label: t('stats.approved'), color: 'var(--green)' },
    ]
  }, [lookup, t])

  // ── Visible consultants by role ───────────────────────────
  // consultant → seulement lui-même (match sur user_id)
  const visibleConsultants = useMemo(() => {
    if (!consultantsLoaded) return []
    if (role === 'consultant') {
      if (!currentUserId) return []
      return consultantsSafe.filter(c => c.user_id === currentUserId)
    }
    return consultantsSafe
  }, [consultantsLoaded, consultantsSafe, role, currentUserId])

  const isConsultant = role === 'consultant'

  // ── Save handler (optimistic) ─────────────────────────────
  const handleSave = useCallback(async (
    consultantId: string,
    date: string,
    value: number,
    projectId: string,
  ) => {
    const key = `${consultantId}__${date}`

    // 1. Optimistic immédiat
    setLocalEntries(prev => ({
      ...prev,
      [key]: {
        id: prev[key]?.id ?? `local-${key}`,
        consultantId,
        projectId,
        date,
        value,
        status: 'draft',
      },
    }))

    // 2. Persistance
    try {
      const saved = await upsertTimesheet({ consultantId, date, value, projectId })
      setLocalEntries(prev => ({ ...prev, [key]: saved }))
    } catch (e) {
      console.error('upsertTimesheet error:', e)
      setLocalEntries(prev => {
        const n = { ...prev }
        delete n[key]
        return n
      })
    }
  }, [])

  // ── Submit / Approve ──────────────────────────────────────
  const handleSubmitAll = useCallback(async (consultantId: string) => {
    const draftIds = Object.values(lookup)
      .filter(ts => ts.consultantId === consultantId && ts.status === 'draft')
      .map(ts => ts.id)
      .filter(id => !id.startsWith('local-'))

    if (!draftIds.length) return
    await submitTimesheets(draftIds)

    setLocalEntries(prev => {
      const updated = { ...prev }
      for (const ts of Object.values(lookup)) {
        if (ts.consultantId === consultantId && ts.status === 'draft') {
          updated[`${ts.consultantId}__${ts.date}`] = { ...ts, status: 'submitted' }
        }
      }
      return updated
    })
  }, [lookup])

  const handleApproveAll = useCallback(async (consultantId: string) => {
    const submittedIds = Object.values(lookup)
      .filter(ts => ts.consultantId === consultantId && ts.status === 'submitted')
      .map(ts => ts.id)
      .filter(id => !id.startsWith('local-'))

    if (!submittedIds.length) return
    await approveTimesheets(submittedIds)

    setLocalEntries(prev => {
      const updated = { ...prev }
      for (const ts of Object.values(lookup)) {
        if (ts.consultantId === consultantId && ts.status === 'submitted') {
          updated[`${ts.consultantId}__${ts.date}`] = { ...ts, status: 'approved' }
        }
      }
      return updated
    })
  }, [lookup])

  // ── Garde UX : consultant sans data prête ──────────────────
  // Empêche l'état "page visible mais tout est disabled / vide" pendant le chargement consultants/map.
  const consultantDataReady = !isConsultant || (!!currentUserId && consultantsLoaded && projectsLoaded)

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">
        <StatRow stats={stats} />

        {/* Navigation semaine */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={prevWeek}>← {t('prevWeek')}</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
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

        {!consultantDataReady && (
          <Panel>
            <div style={{ padding: 18, color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              // loading your profile & assignments…
            </div>
          </Panel>
        )}

        {/* Grille */}
        {!loading && consultantDataReady && (
          <Panel>
            <div style={{ overflowX: 'auto' }}>
              <table className="ts-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 190, textAlign: 'left' }}>{t('table.consultant')}</th>
                    {days.map(d => {
                      const { dow, num } = fmtDay(d)
                      const today = toISO(d) === toISO(new Date())
                      return (
                        <th key={toISO(d)} style={{ textAlign: 'center', minWidth: 86 }}>
                          <div style={{ color: today ? 'var(--cyan)' : 'var(--text2)', fontSize: 10, fontWeight: 600 }}>
                            {dow}
                          </div>
                          <div style={{ color: today ? 'var(--cyan)' : 'var(--text1)', fontSize: 12, fontWeight: 700 }}>
                            {num}
                          </div>
                        </th>
                      )
                    })}
                    <th style={{ textAlign: 'center', minWidth: 80 }}>{t('table.total')}</th>
                    <th style={{ textAlign: 'center', minWidth: 110 }}>{t('table.actions')}</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleConsultants.map(c => {
                    // Projets de ce consultant uniquement
                    const consultantProjects = projectsMap?.[c.id] ?? []

                    // Entrées de la semaine pour ce consultant
                    const rowEntries = Object.values(lookup).filter(ts => ts.consultantId === c.id)
                    const weekTotal = rowEntries.reduce((s, ts) => s + (ts.value ?? 0), 0)
                    const hasDraft = rowEntries.some(ts => ts.status === 'draft')
                    const hasSubmitted = rowEntries.some(ts => ts.status === 'submitted')

                    const rowStatus: TSStatus = hasDraft ? 'draft' : hasSubmitted ? 'submitted' : 'approved'

                    const isSelf = isConsultant && c.user_id === currentUserId

                    return (
                      <tr key={c.id}>
                        {/* Consultant */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{c.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.role}</div>
                            </div>
                          </div>
                        </td>

                        {/* Cellules jours */}
                        {days.map(d => {
                          const dateStr = toISO(d)
                          const key = `${c.id}__${dateStr}`
                          const entry = lookup[key]
                          const isOpen = popup?.consultantId === c.id && popup?.date === dateStr
                          const entryIsDraft = !entry || entry.status === 'draft'

                          // Règle d'édition:
                          // - admin/manager: canEdit(role)
                          // - consultant: uniquement sa ligne, et uniquement en draft
                          const canEditCell = canEdit(role) || (isSelf && entryIsDraft)

                          // Désactivation "visuelle" des cellules si consultant sur une autre ligne
                          const disabled = isConsultant && !isSelf

                          return (
                            <td key={dateStr} style={{ textAlign: 'center', position: 'relative' }}>
                              <button
                                className={`ts-cell ${entry ? 'ts-cell--filled' : 'ts-cell--empty'}`}
                                style={{ color: valueColor(entry?.value) }}
                                onClick={() => setPopup(isOpen ? null : { consultantId: c.id, date: dateStr })}
                                title={entry?.status ?? 'No entry'}
                                disabled={disabled}
                              >
                                {entry ? (entry.value === 1 ? '1' : entry.value === 0.5 ? '½' : '—') : '+'}
                                {entry && (
                                  <span className="ts-status-dot" style={{ background: dotColor(entry.status) }} />
                                )}
                              </button>

                              {isOpen && (
                                <CellEditor
                                  entry={entry}
                                  projects={consultantProjects}
                                  canEditEntry={canEditCell}
                                  onSave={(val, proj) => handleSave(c.id, dateStr, val, proj)}
                                  onClose={() => setPopup(null)}
                                />
                              )}
                            </td>
                          )
                        })}

                        {/* Total semaine */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 14,
                              fontWeight: 700,
                              color:
                                weekTotal >= 5 ? 'var(--green)' : weekTotal > 0 ? 'var(--gold)' : 'var(--text3)',
                            }}
                          >
                            {weekTotal > 0 ? weekTotal.toFixed(1) : '—'}
                          </span>
                          {rowEntries.length > 0 && (
                            <div style={{ marginTop: 3 }}>
                              <Pill status={rowStatus} />
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                            {hasDraft && (canEdit(role) || (isConsultant && isSelf)) && (
                              <button
                                className="btn btn-ghost"
                                style={{
                                  fontSize: 10,
                                  padding: '2px 8px',
                                  color: 'var(--cyan)',
                                  whiteSpace: 'nowrap',
                                }}
                                onClick={() => handleSubmitAll(c.id)}
                                title={t('actions.submitTitle')}
                              >
                                📤 {t('actions.submit')}
                              </button>
                            )}
                            {hasSubmitted && isAdmin(role) && (
                              <button
                                className="btn btn-ghost"
                                style={{
                                  fontSize: 10,
                                  padding: '2px 8px',
                                  color: 'var(--green)',
                                  whiteSpace: 'nowrap',
                                }}
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
                        style={{
                          textAlign: 'center',
                          color: 'var(--text3)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          padding: '32px 0',
                        }}
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

        {/* Légende */}
        <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          {([
            { color: 'var(--text3)', square: true, label: t('legend.empty') },
            { color: 'var(--gold)', square: true, label: t('legend.half') },
            { color: 'var(--green)', square: true, label: t('legend.full') },
            { color: 'var(--text3)', square: false, label: t('legend.draft') },
            { color: 'var(--gold)', square: false, label: t('legend.submitted') },
            { color: 'var(--green)', square: false, label: t('legend.approved') },
          ] as { color: string; square: boolean; label: string }[]).map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {item.square ? (
                <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: 'inline-block' }} />
              ) : (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
              )}
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Styles scopés */}
      <style>{`
        .ts-table { width:100%; border-collapse:collapse; }
        .ts-table th {
          padding: 8px 12px;
          color: var(--text3);
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .08em;
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
          display: inline-flex; align-items: center; justify-content: center;
          width: 44px; height: 36px;
          border-radius: 8px; border: 1px solid var(--border);
          background: var(--bg3); cursor: pointer;
          font-family: var(--font-mono); font-size: 14px; font-weight: 700;
          position: relative;
          transition: border-color .15s, background .15s;
        }
        .ts-cell:hover:not(:disabled) { border-color: var(--cyan); background: var(--bg2); }
        .ts-cell:disabled { opacity: .4; cursor: default; }
        .ts-cell--empty { color: var(--text3); border-style: dashed; }
        .ts-status-dot {
          position: absolute; top: 3px; right: 3px;
          width: 5px; height: 5px; border-radius: 50%;
        }
        .ts-popup {
          position: absolute; top: calc(100% + 6px); left: 50%;
          transform: translateX(-50%); z-index: 200;
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 12px; padding: 12px; min-width: 170px;
          box-shadow: 0 8px 32px rgba(0,0,0,.45);
        }
      `}</style>
    </>
  )
}
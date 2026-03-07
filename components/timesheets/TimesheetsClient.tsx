// components/timesheets/TimesheetsClient.tsx
'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations, useLocale }                from 'next-intl'
import { Panel, StatRow }                            from '@/components/ui'
import { Avatar }                                    from '@/components/ui/Avatar'
import { EmptyState }                                from '@/components/ui/EmptyState'
import {
  useTimesheets,
  useConsultants,
  useConsultantProjectsMap,
  useInternalProjectTypes,
  useApprovedLeavesForWeek,
  useCompanySettings,
  upsertTimesheet,
  submitTimesheets,
  approveTimesheets,
} from '@/lib/data'
import type { Timesheet, LeaveOverlay } from '@/lib/data'
import { isAdmin, canEdit } from '@/lib/auth'
import { getMondayOf, toISO, getWeekDays, fmtDay } from '@/lib/utils'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type TSStatus = 'draft' | 'submitted' | 'approved'

interface HolidayEntry { date: string; localName: string }
type HolidayMap = Record<string, HolidayEntry[]>

interface Props {
  userRole?:  string
  userId?:    string
  companyId?: string
  tenant?:    string
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function valueColor(v?: number) {
  if (!v)    return 'var(--text2)'
  if (v < 1) return 'var(--gold)'
  return 'var(--green)'
}

function dotColor(s: TSStatus) {
  if (s === 'approved')  return 'var(--green)'
  if (s === 'submitted') return 'var(--gold)'
  return 'var(--text2)'
}

function Pill({ status }: { status: TSStatus }) {
  return <span className={`ts-pill ts-pill--${status}`}>{status}</span>
}

function LeaveBadge({ type, t }: { type: string; t: any }) {
  const short: Record<string, string> = {
    'CP': 'CP', 'RTT': 'RTT', 'Sans solde': 'SLD', 'Absence autorisée': 'ABS',
  }
  return (
    <div className="ts-badge-wrap">
      <div className="ts-badge ts-badge--leave">{short[type] ?? type}</div>
      <div className="ts-badge-sub">{t('leave.badge')}</div>
    </div>
  )
}

function HolidayBadge({ name, t }: { name: string; t: any }) {
  return (
    <div className="ts-badge-wrap">
      <div className="ts-badge ts-badge--holiday">{t('holiday.badge')}</div>
      <div className="ts-badge-sub ts-badge-sub--holiday">{name}</div>
    </div>
  )
}

function TimesheetLegend({ t }: { t: any }) {
  return (
    <div className="ts-legend">
      <div className="ts-legend-item">
        <span className="ts-legend-swatch ts-legend-swatch--leave" />
        {t('legend.leave')}
      </div>
      <div className="ts-legend-item">
        <span className="ts-legend-swatch ts-legend-swatch--holiday" />
        {t('legend.holiday')}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// CELL EDITOR
// ══════════════════════════════════════════════════════════════

const VALUES = [{ label: '—', v: 0 }, { label: '½', v: 0.5 }, { label: '1', v: 1 }]

function CellEditor({ entry, projects, canEditEntry, x, y, t, onSave, onClose }: {
  entry:        Timesheet | undefined
  projects:     { id: string; name: string }[]
  canEditEntry: boolean
  x:            number
  y:            number
  t:            any
  onSave:       (value: number, projectId: string) => void
  onClose:      () => void
}) {
  const [val,  setVal]  = useState(entry?.value ?? 0)
  const [proj, setProj] = useState(entry?.projectId ?? projects[0]?.id ?? '')

  useEffect(() => { setVal(entry?.value ?? 0) },            [entry?.value])
  useEffect(() => { setProj(entry?.projectId ?? projects[0]?.id ?? '') }, [entry?.projectId, projects])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const safeX = Math.min(x, window.innerWidth  - 200)
  const safeY = Math.min(y, window.innerHeight - 210)

  if (!canEditEntry) {
    return (
      <div className="ts-popup" style={{ top: safeY, left: safeX }}>
        <Pill status={entry?.status ?? 'draft'} />
        <div className="ts-popup-readonly-id">{entry?.projectId ?? '—'}</div>
        <button className="ts-popup-close" onClick={onClose}>{t('popup.close')}</button>
      </div>
    )
  }

  return (
    <div className="ts-popup" style={{ top: safeY, left: safeX }}>
      <div className="ts-popup-values">
        {VALUES.map(({ label, v }) => (
          <button key={v} onClick={() => setVal(v)}
            className={`ts-popup-val ${val === v ? 'ts-popup-val--active' : ''}`}>
            {label}
          </button>
        ))}
      </div>
      {projects.length > 0 && (
        <select value={proj} onChange={e => setProj(e.target.value)}
          className="input" style={{ marginBottom: 10 }}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <div className="ts-popup-actions">
        <button className="ts-popup-save" onClick={() => { onSave(val, proj); onClose() }}>
          {t('popup.save')}
        </button>
        <button className="ts-popup-cancel" onClick={onClose}>{t('popup.cancel')}</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════

export function TimesheetsClient({ userRole, userId, companyId, tenant }: Props) {
  const t      = useTranslations('timesheets')
  const locale = useLocale()

  const role          = userRole ?? 'consultant'
  const currentUserId = userId ?? null
  const isConsultant  = role === 'consultant' || role === 'freelance'

  // ── Navigation semaine ──────────────────────────────────
  const [monday, setMonday] = useState(() => getMondayOf(new Date()))
  const days       = useMemo(() => getWeekDays(monday), [monday])
  const weekStart  = useMemo(() => toISO(monday), [monday])
  const weekEnd    = useMemo(() => toISO(days[4]), [days])
  const isThisWeek = toISO(getMondayOf(new Date())) === toISO(monday)

  const prevWeek = () => setMonday(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek = () => setMonday(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  const goToday  = () => setMonday(getMondayOf(new Date()))

  // ── Données Supabase (dépendent de monday → restent client) ──
  const { data: timesheets,   loading, error } = useTimesheets(monday)
  const { data: consultants }                  = useConsultants()
  const { data: projectsMap }                  = useConsultantProjectsMap()
  const { data: internalTypes }                = useInternalProjectTypes()
  const { data: companyData }                  = useCompanySettings()
  const { data: approvedLeaves }               = useApprovedLeavesForWeek(weekStart, weekEnd)

  const consultantsSafe   = consultants ?? []
  const consultantsLoaded = Array.isArray(consultants)
  const projectsLoaded    = projectsMap != null

  const companyCountry = useMemo(
    () => (companyData?.hr_settings as any)?.country_code ?? 'FR',
    [companyData]
  )

  // ── Fetch jours fériés ────────────────────────────────────
  const [holidayMap, setHolidayMap] = useState<HolidayMap>({})

  useEffect(() => {
    if (!consultantsSafe.length) return
    const countries = new Set<string>([companyCountry])
    for (const c of consultantsSafe) { if (c.country_code) countries.add(c.country_code) }
    const year = monday.getFullYear()
    Promise.all(
      Array.from(countries).map(async cc => {
        try {
          const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${cc}`)
          const data: HolidayEntry[] = await r.json()
          return [cc, Array.isArray(data) ? data : []] as [string, HolidayEntry[]]
        } catch { return [cc, []] as [string, HolidayEntry[]] }
      })
    ).then(results => {
      const map: HolidayMap = {}
      for (const [cc, entries] of results) map[cc] = entries
      setHolidayMap(map)
    })
  }, [companyCountry, consultantsSafe, monday.getFullYear()])

  const getHoliday = useCallback((consultantCountry: string | null | undefined, dateStr: string): HolidayEntry | undefined => {
    const cc = consultantCountry ?? companyCountry
    return holidayMap[cc]?.find(h => h.date === dateStr)
  }, [holidayMap, companyCountry])

  // ── Leave overlay map ─────────────────────────────────────
  const leaveOverlayMap = useMemo(() => {
    const map: Record<string, LeaveOverlay> = {}
    for (const l of (approvedLeaves ?? [])) map[`${l.consultantId}__${l.date}`] = l
    return map
  }, [approvedLeaves])

  // ── Projets internes dédoublonnés ─────────────────────────
  const systemProjects = useMemo(() => {
    const seen = new Set<string>()
    return (internalTypes ?? []).filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
  }, [internalTypes])

  // ── Optimistic local state ────────────────────────────────
  const [localEntries, setLocalEntries] = useState<Record<string, Timesheet>>({})
  const [popup, setPopup] = useState<{ consultantId: string; date: string; x: number; y: number } | null>(null)

  useEffect(() => { setLocalEntries({}); setPopup(null) }, [weekStart])

  useEffect(() => {
    if (!popup) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.ts-popup-fixed') && !target.closest('.ts-cell')) setPopup(null)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [popup])

  const lookup = useMemo(() => {
    const map: Record<string, Timesheet> = {}
    ;(timesheets ?? []).forEach(ts => { map[`${ts.consultantId}__${ts.date}`] = ts })
    Object.assign(map, localEntries)
    return map
  }, [timesheets, localEntries])

  const stats = useMemo(() => {
    const all = Object.values(lookup)
    const daysCount = all.reduce((s, ts) => s + (ts.value ?? 0), 0)
    return [
      { value: daysCount.toFixed(1),                               label: t('stats.totalDays'), color: 'var(--cyan)'  },
      { value: all.filter(ts => ts.status === 'draft').length,     label: t('stats.draft'),     color: 'var(--text2)' },
      { value: all.filter(ts => ts.status === 'submitted').length, label: t('stats.submitted'), color: 'var(--gold)'  },
      { value: all.filter(ts => ts.status === 'approved').length,  label: t('stats.approved'),  color: 'var(--green)' },
    ]
  }, [lookup, t])

  const visibleConsultants = useMemo(() => {
    if (!consultantsLoaded) return []
    if (role === 'consultant') {
      if (!currentUserId) return []
      return consultantsSafe.filter(c => c.user_id === currentUserId)
    }
    return consultantsSafe
  }, [consultantsLoaded, consultantsSafe, role, currentUserId])

  const handleSave = useCallback(async (consultantId: string, date: string, value: number, projectId: string) => {
    const key = `${consultantId}__${date}`
    setLocalEntries(prev => ({
      ...prev,
      [key]: { id: prev[key]?.id ?? `local-${key}`, consultantId, projectId, date, value, status: 'draft' },
    }))
    try {
      const saved = await upsertTimesheet({ consultantId, date, value, projectId })
      setLocalEntries(prev => ({ ...prev, [key]: saved }))
    } catch (e) {
      console.error('upsertTimesheet error:', e)
      setLocalEntries(prev => { const n = { ...prev }; delete n[key]; return n })
    }
  }, [])

  const handleSubmitAll = useCallback(async (consultantId: string) => {
    const draftIds = Object.values(lookup)
      .filter(ts => ts.consultantId === consultantId && ts.status === 'draft')
      .map(ts => ts.id).filter(id => !id.startsWith('local-'))
    if (!draftIds.length) return
    await submitTimesheets(draftIds)
    setLocalEntries(prev => {
      const updated = { ...prev }
      for (const ts of Object.values(lookup))
        if (ts.consultantId === consultantId && ts.status === 'draft')
          updated[`${ts.consultantId}__${ts.date}`] = { ...ts, status: 'submitted' }
      return updated
    })
  }, [lookup])

  const handleApproveAll = useCallback(async (consultantId: string) => {
    const submittedIds = Object.values(lookup)
      .filter(ts => ts.consultantId === consultantId && ts.status === 'submitted')
      .map(ts => ts.id).filter(id => !id.startsWith('local-'))
    if (!submittedIds.length) return
    await approveTimesheets(submittedIds)
    setLocalEntries(prev => {
      const updated = { ...prev }
      for (const ts of Object.values(lookup))
        if (ts.consultantId === consultantId && ts.status === 'submitted')
          updated[`${ts.consultantId}__${ts.date}`] = { ...ts, status: 'approved' }
      return updated
    })
  }, [lookup])

  const internalTypesLoaded  = internalTypes != null
  const consultantDataReady  = !loading && consultantsLoaded && projectsLoaded && internalTypesLoaded
                               && (!isConsultant || !!currentUserId)

  return (
    <div className="app-content">
      <StatRow stats={stats} />

      <div className="week-nav" style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={prevWeek}>← {t('prevWeek')}</button>
        <span className="week-label">
          {t('weekOf')} {monday.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <button className="btn btn-ghost" onClick={nextWeek}>{t('nextWeek')} →</button>
        {!isThisWeek && (
          <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={goToday}>
            {t('today')}
          </button>
        )}
      </div>

      {loading && <p className="ts-status-msg">{t('loading')}</p>}
      {error   && <p className="ts-status-msg ts-status-msg--error">{error}</p>}

      <TimesheetLegend t={t} />

      {!consultantDataReady && <Panel><EmptyState message={t('loadingProfile')} /></Panel>}

      {consultantDataReady && (
        <Panel>
          <div className="table-wrap">
            <table className="ts-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 190, textAlign: 'left' }}>{t('table.consultant')}</th>
                  {days.map(d => {
                    const { dow, num } = fmtDay(d)
                    const dateStr = toISO(d)
                    const today   = dateStr === toISO(new Date())
                    return (
                      <th key={dateStr} style={{ textAlign: 'center', minWidth: 86 }}>
                        <div className={today ? 'ts-th-dow ts-th-dow--today' : 'ts-th-dow'}>{dow}</div>
                        <div className={today ? 'ts-th-num ts-th-num--today' : 'ts-th-num'}>{num}</div>
                      </th>
                    )
                  })}
                  <th style={{ textAlign: 'center', minWidth: 80 }}>{t('table.total')}</th>
                  <th style={{ textAlign: 'center', minWidth: 110 }}>{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleConsultants.map(c => {
                  const consultantProjects = [...(projectsMap?.[c.id] ?? []), ...systemProjects]
                  const rowEntries   = Object.values(lookup).filter(ts => ts.consultantId === c.id)
                  const weekTotal    = rowEntries.reduce((s, ts) => s + (ts.value ?? 0), 0)
                  const hasDraft     = rowEntries.some(ts => ts.status === 'draft' && (ts.value ?? 0) > 0)
                  const hasSubmitted = rowEntries.some(ts => ts.status === 'submitted')
                  const rowStatus: TSStatus = hasDraft ? 'draft' : hasSubmitted ? 'submitted' : 'approved'
                  const isSelf = isConsultant && c.user_id === currentUserId

                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="consultant-cell">
                          <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
                          <div>
                            <div className="ts-c-name">{c.name}</div>
                            <div className="ts-c-meta">
                              {c.role}
                              {c.country_code && c.country_code !== companyCountry && (
                                <span className="ts-c-country">· {c.country_code}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {days.map(d => {
                        const dateStr      = toISO(d)
                        const key          = `${c.id}__${dateStr}`
                        const entry        = lookup[key]
                        const isOpen       = popup?.consultantId === c.id && popup?.date === dateStr
                        const leaveOverlay = leaveOverlayMap[key]
                        const holiday      = getHoliday(c.country_code, dateStr)

                        const entryIsDraft = !entry || entry.status === 'draft'
                        const adminCanEdit = isAdmin(role)
                        const cellLocked   = (leaveOverlay || holiday) && !adminCanEdit
                        const canEditCell  = !cellLocked && (canEdit(role) || (isSelf && entryIsDraft))
                        const disabled     = (isConsultant && !isSelf) || !!cellLocked

                        const cellBg = holiday ? 'rgba(255,209,102,.08)' : leaveOverlay ? 'rgba(0,229,255,.06)' : undefined

                        const openPopup = (e: React.MouseEvent) => {
                          if (isOpen) { setPopup(null); return }
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setPopup({ consultantId: c.id, date: dateStr, x: rect.left, y: rect.bottom + 6 })
                        }

                        return (
                          <td key={dateStr} style={{ textAlign: 'center', position: 'relative', background: cellBg }}>
                            {holiday && !entry ? (
                              adminCanEdit ? (
                                <button className="ts-cell ts-cell--holiday" style={{ opacity: 0.85 }}
                                  title={holiday.localName} onClick={openPopup}>
                                  <HolidayBadge name={holiday.localName} t={t} />
                                </button>
                              ) : (
                                <div className="ts-cell ts-cell--holiday" title={holiday.localName} style={{ cursor: 'default' }}>
                                  <HolidayBadge name={holiday.localName} t={t} />
                                </div>
                              )
                            ) : leaveOverlay && !entry ? (
                              adminCanEdit ? (
                                <button className="ts-cell ts-cell--leave" style={{ opacity: 0.9 }}
                                  title={t('leave.title', { type: leaveOverlay.type })} onClick={openPopup}>
                                  <LeaveBadge type={leaveOverlay.type} t={t} />
                                </button>
                              ) : (
                                <div className="ts-cell ts-cell--leave" title={t('leave.title', { type: leaveOverlay.type })} style={{ cursor: 'default' }}>
                                  <LeaveBadge type={leaveOverlay.type} t={t} />
                                </div>
                              )
                            ) : (
                              <button
                                className={`ts-cell ${entry ? 'ts-cell--filled' : 'ts-cell--empty'}`}
                                style={{ color: valueColor(entry?.value), opacity: disabled ? 0.4 : 1 }}
                                onClick={e => { if (disabled) return; openPopup(e) }}
                                title={entry?.status ?? t('cell.noEntry')}
                                disabled={disabled}
                              >
                                {entry ? (entry.value === 1 ? '1' : entry.value === 0.5 ? '½' : '—') : '+'}
                                {entry && <span className="ts-status-dot" style={{ background: dotColor(entry.status) }} />}
                              </button>
                            )}
                            {isOpen && (
                              <div className="ts-popup-fixed">
                                <CellEditor
                                  entry={entry}
                                  projects={consultantProjects}
                                  canEditEntry={canEditCell}
                                  x={popup!.x}
                                  y={popup!.y}
                                  t={t}
                                  onSave={(val, proj) => { if (proj) handleSave(c.id, dateStr, val, proj) }}
                                  onClose={() => setPopup(null)}
                                />
                              </div>
                            )}
                          </td>
                        )
                      })}

                      <td style={{ textAlign: 'center' }}>
                        <span className="ts-week-total"
                          style={{ color: weekTotal >= 5 ? 'var(--green)' : weekTotal > 0 ? 'var(--gold)' : 'var(--text2)' }}>
                          {weekTotal > 0 ? weekTotal.toFixed(1) : '—'}
                        </span>
                        {rowEntries.length > 0 && <div style={{ marginTop: 3 }}><Pill status={rowStatus} /></div>}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div className="ts-row-actions">
                          {hasDraft && (canEdit(role) || (isConsultant && isSelf)) && (
                            <button className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--cyan)', whiteSpace: 'nowrap' }}
                              onClick={() => handleSubmitAll(c.id)}>
                              {t('actions.submit')}
                            </button>
                          )}
                          {hasSubmitted && isAdmin(role) && (
                            <button className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--green)', whiteSpace: 'nowrap' }}
                              onClick={() => handleApproveAll(c.id)}>
                              {t('actions.approve')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {visibleConsultants.length === 0 && (
                  <tr>
                    <td colSpan={days.length + 3}><EmptyState message={t('noConsultants')} /></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  )
}
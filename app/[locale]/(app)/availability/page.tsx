'use client'

import { useState, useMemo }   from 'react'
import { useTranslations }     from 'next-intl'
import { useAuthContext }      from '@/components/layout/AuthProvider'
import { isManager }           from '@/lib/auth'
import { Topbar }              from '@/components/layout/Topbar'
import { StatRow }             from '@/components/ui'
import { Avatar }              from '@/components/ui/Avatar'
import { EmptyState }          from '@/components/ui/EmptyState'
import { useConsultants, useLeaveRequests, useAssignments } from '@/lib/data'
import { AssignmentDrawer }    from '@/components/assignments/AssignmentDrawer'
import type { Consultant }     from '@/types'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type CellType = 'free' | 'project' | 'leave' | 'partial' | 'overloaded' | 'weekend'

interface DayCell {
  type:         CellType
  projectId?:   string
  projectName?: string
  leaveType?:   string
  isToday:      boolean
  isWeekend:    boolean
}

// ══════════════════════════════════════════════════════════════
// PALETTE PROJETS
// ══════════════════════════════════════════════════════════════

const PROJECT_COLORS = [
  { bg: 'rgba(0,229,255,0.16)',   border: 'rgba(0,229,255,0.50)',   text: '#006064' },
  { bg: 'rgba(0,255,136,0.15)',   border: 'rgba(0,255,136,0.48)',   text: '#1b5e20' },
  { bg: 'rgba(179,136,255,0.16)', border: 'rgba(179,136,255,0.50)', text: '#4a148c' },
  { bg: 'rgba(255,209,102,0.16)', border: 'rgba(255,209,102,0.50)', text: '#e65100' },
  { bg: 'rgba(255,45,107,0.15)',  border: 'rgba(255,45,107,0.45)',  text: '#c62828' },
  { bg: 'rgba(100,200,150,0.16)', border: 'rgba(100,200,150,0.50)', text: '#2e7d32' },
]

function getProjectColor(projectId: string, projectIndex: Map<string, number>) {
  let idx = projectIndex.get(projectId)
  if (idx === undefined) {
    idx = projectIndex.size % PROJECT_COLORS.length
    projectIndex.set(projectId, idx)
  }
  return PROJECT_COLORS[idx]
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ══════════════════════════════════════════════════════════════
// CALCUL GRILLE
// ══════════════════════════════════════════════════════════════

function buildGrid(
  consultants:   any[],
  year:          number,
  month:         number,
  leaveRequests: any[],
  assignments:   any[],
) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today       = new Date(); today.setHours(0, 0, 0, 0)

  return consultants.map(c => {
    const cells: DayCell[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date      = new Date(year, month, day)
      const dateStr   = toISO(date)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const isToday   = date.getTime() === today.getTime()

      if (isWeekend) {
        cells.push({ type: 'weekend', isToday, isWeekend: true })
        continue
      }

      const leave = leaveRequests.find(lr =>
        lr.consultantId === c.id &&
        lr.status !== 'refused' &&
        dateStr >= lr.startDate &&
        dateStr <= lr.endDate
      )
      if (leave) {
        cells.push({ type: 'leave', leaveType: leave.type, isToday, isWeekend: false })
        continue
      }

      const active = assignments.filter(a =>
        a.consultant_id === c.id &&
        (!a.start_date || dateStr >= a.start_date) &&
        (!a.end_date   || dateStr <= a.end_date)
      )

      const totalAlloc  = active.reduce((s: number, a: any) => s + (a.allocation ?? 0), 0)
      const mainProject = [...active].sort((a: any, b: any) => (b.allocation ?? 0) - (a.allocation ?? 0))[0]

      if (totalAlloc > 100) {
        cells.push({ type: 'overloaded', projectId: mainProject?.project_id, projectName: mainProject?.projects?.name, isToday, isWeekend: false })
      } else if (totalAlloc >= 100) {
        cells.push({ type: 'project',    projectId: mainProject?.project_id, projectName: mainProject?.projects?.name, isToday, isWeekend: false })
      } else if (totalAlloc > 0) {
        cells.push({ type: 'partial',    projectId: mainProject?.project_id, projectName: mainProject?.projects?.name, isToday, isWeekend: false })
      } else {
        cells.push({ type: 'free', isToday, isWeekend: false })
      }
    }

    return { consultant: c, cells }
  })
}

// ══════════════════════════════════════════════════════════════
// LÉGENDE
// ══════════════════════════════════════════════════════════════

function AvailabilityLegend({ tDisp }: { tDisp: any }) {
  const items = [
    { cls: 'avail-swatch--busy',     label: tDisp('legend.busy') + ' (100%)'  },
    { cls: 'avail-swatch--partial',  label: tDisp('legend.partial') + ' (<100%)' },
    { cls: 'avail-swatch--leave',    label: tDisp('legend.leave') + ' ✦'      },
    { cls: 'avail-swatch--overload', label: '⚠ Overloaded (>100%)'            },
    { cls: 'avail-swatch--free',     label: tDisp('legend.free')              },
    { cls: 'avail-swatch--weekend',  label: tDisp('legend.weekend')           },
  ]
  return (
    <div className="avail-legend">
      {items.map(item => (
        <div key={item.label} className="avail-legend-item">
          <div className={`avail-swatch ${item.cls}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function AvailabilityPage() {
  const t     = useTranslations('staffing')
  const tDisp = useTranslations('disponibilites')
  const tNav  = useTranslations('timeline')
  const { user } = useAuthContext()
  const now   = new Date()

  const teamAccess = isManager(user?.role)

  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const [assignTarget, setAssignTarget] = useState<{
    consultant: Consultant
    date:       string
  } | null>(null)

  const { data: consultants,   loading: lC } = useConsultants()
  const { data: leaveRequests, loading: lL } = useLeaveRequests()
  const { data: assignments,   loading: lA } = useAssignments()

  const loading = lC || lL || lA

  const prevMonth = () => month === 0  ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)
  const nextMonth = () => month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1)
  const goToday   = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  const visibleConsultants = useMemo(() => {
    const all = consultants ?? []
    if (teamAccess) return all
    return all.filter(c => c.user_id === user?.id)
  }, [consultants, teamAccess, user?.id])

  const grid = useMemo(() =>
    buildGrid(visibleConsultants, year, month, leaveRequests ?? [], assignments ?? []),
    [visibleConsultants, year, month, leaveRequests, assignments]
  )

  const projectColorMap = useMemo(() => new Map<string, number>(), [])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const headerDays  = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1)
    return {
      num:       i + 1,
      dow:       d.getDay(),
      isToday:   toISO(d) === toISO(now),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    }
  })

  const allList = consultants ?? []
  const stats = teamAccess ? [
    { value: allList.filter(c => c.status === 'assigned').length,  label: tDisp('legend.busy'),    color: 'var(--cyan)'   },
    { value: allList.filter(c => c.status === 'available').length, label: tDisp('legend.free'),    color: 'var(--green)'  },
    { value: allList.filter(c => c.status === 'leave').length,     label: tDisp('legend.leave'),   color: 'var(--gold)'   },
    { value: allList.filter(c => c.status === 'partial').length,   label: tDisp('legend.partial'), color: 'var(--purple)' },
  ] : []

  const months    = tNav.raw('months')    as string[]
  const daysShort = tDisp.raw('daysShort') as string[]

  // Colonnes dynamiques — must stay inline (depend on daysInMonth)
  const gridCols = `160px repeat(${daysInMonth}, 1fr)`

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">

        {teamAccess && <StatRow stats={stats} />}

        {/* Navigation mois */}
        <div className="avail-nav">
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>←</button>
          <span className="avail-month-label">{months[month]} {year}</span>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>→</button>
          {!isCurrentMonth && (
            <button className="btn btn-primary btn-sm" onClick={goToday}>
              {tDisp('today')}
            </button>
          )}
        </div>

        {/* Grille */}
        <div className="avail-grid-wrap">
          {loading ? (
            <EmptyState message={tDisp('noData')} />
          ) : (
            <div className="table-wrap">
              <div style={{ minWidth: daysInMonth * 28 + 160 }}>

                {/* En-tête jours */}
                <div className="avail-head-row" style={{ gridTemplateColumns: gridCols }}>
                  <div className="avail-head-label label-meta">{tDisp('consultant')}</div>
                  {headerDays.map(d => (
                    <div
                      key={d.num}
                      className={[
                        'avail-head-cell',
                        d.isToday   ? 'avail-head-cell--today'   : '',
                        d.isWeekend ? 'avail-head-cell--weekend' : '',
                      ].join(' ')}
                    >
                      <div className="avail-head-dow">{daysShort[(d.dow + 6) % 7]}</div>
                      <div className={`avail-head-num ${d.isToday ? 'avail-head-num--today' : ''}`}>{d.num}</div>
                    </div>
                  ))}
                </div>

                {/* Lignes consultants */}
                {grid.map(({ consultant, cells }, rowIdx) => (
                  <div
                    key={consultant.id}
                    className="avail-row"
                    style={{
                      gridTemplateColumns: gridCols,
                      borderBottom: rowIdx < grid.length - 1 ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    {/* Nom consultant */}
                    <div className="avail-name-cell">
                      <Avatar initials={consultant.initials} color={consultant.avatarColor} size="sm" />
                      <div>
                        <div className="avail-c-name">{consultant.name.split(' ')[0]}</div>
                        <div className="avail-c-role">{consultant.role}</div>
                      </div>
                    </div>

                    {/* Cellules jours */}
                    {cells.map((cell, dayIdx) => {
                      // Couleur palette projet — must stay inline (per-project dynamic)
                      const color = cell.projectId
                        ? getProjectColor(cell.projectId, projectColorMap)
                        : null

                      const prevCell       = cells[dayIdx - 1]
                      const isSegmentStart = !prevCell ||
                        prevCell.projectId !== cell.projectId ||
                        prevCell.type !== cell.type

                      let segmentLen = 0
                      if (isSegmentStart && cell.projectName) {
                        for (let k = dayIdx; k < cells.length; k++) {
                          if (cells[k].projectId === cell.projectId && cells[k].type === cell.type) segmentLen++
                          else break
                        }
                      }

                      const showLabel = isSegmentStart && segmentLen >= 4 && cell.projectName

                      // Bg + borderTop projet = palette dynamique → inline obligatoire
                      // Autres types = classes CSS
                      const projectStyle = (cell.type === 'project' || cell.type === 'partial') && color
                        ? { background: color.bg, borderTop: `2px solid ${color.border}` }
                        : {}

                      return (
                        <div
                          key={dayIdx}
                          title={
                            cell.type === 'project' || cell.type === 'partial' || cell.type === 'overloaded'
                              ? cell.projectName
                              : cell.type === 'leave'
                              ? `${tDisp('legend.leave')}${cell.leaveType ? ` (${cell.leaveType})` : ''}`
                              : cell.type === 'free' ? tDisp('legend.free') : undefined
                          }
                          onClick={
                            teamAccess && cell.type === 'free'
                              ? () => {
                                  const dateStr = toISO(new Date(year, month, dayIdx + 1))
                                  setAssignTarget({ consultant, date: dateStr })
                                }
                              : undefined
                          }
                          className={[
                            'avail-cell',
                            `avail-cell--${cell.type}`,
                            cell.isToday ? 'avail-cell--today' : '',
                            teamAccess && cell.type === 'free' ? 'avail-cell--clickable' : '',
                          ].join(' ')}
                          style={projectStyle}
                        >
                          {showLabel && (
                            <div
                              className="avail-cell-label"
                              style={{
                                // maxWidth dynamique (segmentLen × largeur cellule)
                                maxWidth:  segmentLen * 27 - 8,
                                color:     color?.text ?? '#006064',
                              }}
                            >
                              {cell.projectName}
                            </div>
                          )}

                          {cell.type === 'leave' && isSegmentStart && (
                            <span className="avail-cell-icon avail-cell-icon--leave">✦</span>
                          )}

                          {cell.type === 'overloaded' && isSegmentStart && (
                            <span className="avail-cell-icon avail-cell-icon--overload">⚠</span>
                          )}

                          {teamAccess && cell.type === 'free' && (
                            <span className="avail-cell-add">+</span>
                          )}

                          {cell.isToday && <span className="avail-today-dot" />}
                        </div>
                      )
                    })}
                  </div>
                ))}

                {grid.length === 0 && (
                  <EmptyState message={tDisp('noData')} />
                )}

              </div>
            </div>
          )}
        </div>

        <AvailabilityLegend tDisp={tDisp} />

      </div>

      {assignTarget && (
        <AssignmentDrawer
          consultant={assignTarget.consultant}
          defaultDate={assignTarget.date}
          onClose={() => setAssignTarget(null)}
          onSaved={() => setAssignTarget(null)}
        />
      )}
    </>
  )
}
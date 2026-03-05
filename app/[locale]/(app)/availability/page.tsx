'use client'

import { useState, useMemo }   from 'react'
import { useTranslations }     from 'next-intl'
import { useAuthContext }      from '@/components/layout/AuthProvider'
import { isManager }           from '@/lib/auth'
import { Topbar }              from '@/components/layout/Topbar'
import { StatRow }             from '@/components/ui'
import { Avatar }              from '@/components/ui/Avatar'
import { useConsultants, useLeaveRequests, useAssignments } from '@/lib/data'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type CellType = 'free' | 'project' | 'leave' | 'partial' | 'weekend'

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
  { bg: 'rgba(0,229,255,0.15)',   border: 'rgba(0,229,255,0.40)',   text: '#00e5ff' },
  { bg: 'rgba(0,255,136,0.13)',   border: 'rgba(0,255,136,0.38)',   text: '#00ff88' },
  { bg: 'rgba(179,136,255,0.15)', border: 'rgba(179,136,255,0.40)', text: '#b388ff' },
  { bg: 'rgba(255,209,102,0.15)', border: 'rgba(255,209,102,0.40)', text: '#ffd166' },
  { bg: 'rgba(255,45,107,0.13)',  border: 'rgba(255,45,107,0.35)',  text: '#ff2d6b' },
  { bg: 'rgba(100,200,150,0.15)', border: 'rgba(100,200,150,0.40)', text: '#64c896' },
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

      // ── Congé ──
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

      // ── Assignments ──
      const active = assignments.filter(a =>
        a.consultant_id === c.id &&
        (!a.start_date || dateStr >= a.start_date) &&
        (!a.end_date   || dateStr <= a.end_date)
      )

      const totalAlloc  = active.reduce((s: number, a: any) => s + (a.allocation ?? 0), 0)
      const mainProject = [...active].sort((a: any, b: any) => (b.allocation ?? 0) - (a.allocation ?? 0))[0]

      if (totalAlloc >= 100) {
        cells.push({ type: 'project', projectId: mainProject?.project_id, projectName: mainProject?.projects?.name, isToday, isWeekend: false })
      } else if (totalAlloc > 0) {
        cells.push({ type: 'partial', projectId: mainProject?.project_id, projectName: mainProject?.projects?.name, isToday, isWeekend: false })
      } else {
        cells.push({ type: 'free', isToday, isWeekend: false })
      }
    }

    return { consultant: c, cells }
  })
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function AvailabilityPage() {
  const t     = useTranslations('disponibilites')
  const tNav  = useTranslations('timeline')
  const { user } = useAuthContext()
  const now   = new Date()

  // ── Vues par rôle ──────────────────────────────────────────
  const teamAccess = isManager(user?.role) // admin + manager voient tout
  // consultant ne voit que lui-même (filtré après chargement)

  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const { data: consultants,   loading: lC } = useConsultants()
  const { data: leaveRequests, loading: lL } = useLeaveRequests()
  const { data: assignments,   loading: lA } = useAssignments()

  const loading = lC || lL || lA

  const prevMonth = () => month === 0  ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)
  const nextMonth = () => month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1)
  const goToday   = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  // ── Filtrage par rôle ──────────────────────────────────────
  const visibleConsultants = useMemo(() => {
    const all = consultants ?? []
    if (teamAccess) return all
    // consultant : ne voit que sa propre ligne
    return all.filter(c => c.user_id === user?.id)
  }, [consultants, teamAccess, user?.id])

  // ── Grille ────────────────────────────────────────────────
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

  // ── Stats (admin + manager uniquement) ───────────────────
  const allList = consultants ?? []
  const stats = teamAccess ? [
    { value: allList.filter(c => c.status === 'assigned').length,  label: t('legend.busy'),    color: 'var(--cyan)' },
    { value: allList.filter(c => c.status === 'available').length, label: t('legend.free'),    color: 'var(--green)' },
    { value: allList.filter(c => c.status === 'leave').length,     label: t('legend.leave'),   color: 'var(--gold)' },
    { value: allList.filter(c => c.status === 'partial').length,   label: t('legend.partial'), color: 'var(--purple)' },
  ] : []

  // Mois et jours traduits
  const months   = tNav.raw('months') as string[]
  const daysShort = t.raw('daysShort') as string[]

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">

        {teamAccess && <StatRow stats={stats} />}

        {/* ── Navigation mois ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>←</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', minWidth: 160, textAlign: 'center' }}>
            {months[month]} {year}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>→</button>
          {!isCurrentMonth && (
            <button className="btn btn-primary btn-sm" onClick={goToday} style={{ marginLeft: 8 }}>
              {t('today')}
            </button>
          )}
        </div>

        {/* ── Grille ── */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '32px 20px', color: 'var(--text2)', fontSize: 12 }}>
              {t('noData')}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: daysInMonth * 28 + 160 }}>

                {/* En-tête jours */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `160px repeat(${daysInMonth}, 1fr)`,
                  borderBottom: '1px solid var(--border)',
                  position: 'sticky', top: 0,
                  background: 'var(--bg2)', zIndex: 10,
                }}>
                  <div style={{ padding: '8px 14px', fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
                    {t('consultant')}
                  </div>
                  {headerDays.map(d => (
                    <div key={d.num} style={{
                      padding: '6px 0',
                      textAlign: 'center',
                      borderLeft: '1px solid var(--border)',
                      background: d.isToday ? 'rgba(0,255,136,0.06)' : d.isWeekend ? 'var(--bg3)' : undefined,
                    }}>
                      <div style={{
                        fontSize: 8,
                        color: d.isToday ? 'var(--green)' : d.isWeekend ? 'var(--border2)' : 'var(--text2)',
                        letterSpacing: 1,
                      }}>
                        {daysShort[(d.dow + 6) % 7]}
                      </div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: d.isToday ? 700 : 400,
                        color: d.isToday ? 'var(--green)' : d.isWeekend ? 'var(--border2)' : 'var(--text)',
                      }}>
                        {d.num}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lignes consultants */}
                {grid.map(({ consultant, cells }, rowIdx) => (
                  <div key={consultant.id} style={{
                    display: 'grid',
                    gridTemplateColumns: `160px repeat(${daysInMonth}, 1fr)`,
                    borderBottom: rowIdx < grid.length - 1 ? '1px solid var(--border)' : undefined,
                  }}>
                    {/* Nom */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px',
                      borderRight: '1px solid var(--border)',
                    }}>
                      <Avatar initials={consultant.initials} color={consultant.avatarColor} size="sm" />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                          {consultant.name.split(' ')[0]}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 1 }}>
                          {consultant.role}
                        </div>
                      </div>
                    </div>

                    {/* Cellules */}
                    {cells.map((cell, dayIdx) => {
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

                      return (
                        <div
                          key={dayIdx}
                          title={
                            cell.type === 'project' || cell.type === 'partial'
                              ? cell.projectName
                              : cell.type === 'leave'
                              ? `Congé${cell.leaveType ? ` (${cell.leaveType})` : ''}`
                              : cell.type === 'free'
                              ? 'Disponible'
                              : undefined
                          }
                          style={{
                            borderLeft: '1px solid var(--border)',
                            height: 44,
                            position: 'relative',
                            overflow: 'hidden',
                            background:
                              cell.type === 'weekend' ? 'var(--bg3)' :
                              cell.type === 'leave'   ? 'rgba(255,209,102,0.12)' :
                              cell.type === 'project' ? (color?.bg ?? 'rgba(0,229,255,0.12)') :
                              cell.type === 'partial' ? (color?.bg ?? 'rgba(255,209,102,0.10)') :
                              'transparent',
                            borderTop:
                              cell.type === 'project' || cell.type === 'partial'
                                ? `2px solid ${color?.border ?? 'rgba(0,229,255,0.4)'}`
                                : cell.type === 'leave'
                                ? '2px solid rgba(255,209,102,0.4)'
                                : '2px solid transparent',
                            outline:       cell.isToday ? '1px solid var(--green)' : undefined,
                            outlineOffset: -1,
                          }}
                        >
                          {showLabel && (
                            <div style={{
                              position: 'absolute', left: 4, top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
                              color: color?.text ?? 'var(--cyan)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              maxWidth: segmentLen * 27 - 8, pointerEvents: 'none',
                            }}>
                              {cell.projectName}
                            </div>
                          )}
                          {cell.type === 'leave' && isSegmentStart && (
                            <div style={{
                              position: 'absolute', left: 4, top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: 9, color: 'var(--gold)', pointerEvents: 'none',
                            }}>
                              ✦
                            </div>
                          )}
                          {cell.isToday && (
                            <div style={{
                              position: 'absolute', bottom: 3, left: '50%',
                              transform: 'translateX(-50%)',
                              width: 4, height: 4, borderRadius: '50%',
                              background: 'var(--green)',
                            }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}

                {/* Empty state */}
                {grid.length === 0 && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                    {t('noData')}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

        {/* ── Légende ── */}
        <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { bg: 'rgba(0,229,255,0.15)',   border: 'rgba(0,229,255,0.4)',   label: t('legend.busy') + ' (100%)' },
            { bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.4)', label: t('legend.partial') + ' (<100%)' },
            { bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.4)', label: t('legend.leave') + ' ✦' },
            { bg: 'transparent',            border: 'var(--border)',          label: t('legend.free') },
            { bg: 'var(--bg3)',             border: 'var(--border)',          label: t('legend.weekend') },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 14, height: 14, borderRadius: 2, flexShrink: 0,
                background: item.bg, border: `1px solid ${item.border}`,
              }} />
              <span style={{ fontSize: 10, color: 'var(--text2)' }}>{item.label}</span>
            </div>
          ))}
        </div>

      </div>
    </>
  )
}
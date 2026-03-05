'use client'

import { useState, useMemo } from 'react'
import { useTranslations }   from 'next-intl'
import { Topbar }            from '@/components/layout/Topbar'
import { StatRow }           from '@/components/ui'
import { Avatar }            from '@/components/ui/Avatar'
import { useProjects, useConsultants, useLeaveRequests } from '@/lib/data'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type CellType = 'active' | 'free' | 'weekend' | 'before' | 'after'

interface DayCell {
  type:    CellType
  isToday: boolean
}

// ══════════════════════════════════════════════════════════════
// PALETTE STATUTS PROJET
// ══════════════════════════════════════════════════════════════

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  active:    { bg: 'rgba(0,229,255,0.16)',   border: 'rgba(0,229,255,0.50)',   text: '#006064', dot: '#00e5ff' },
  on_hold:   { bg: 'rgba(255,209,102,0.16)', border: 'rgba(255,209,102,0.50)', text: '#e65100', dot: '#ffd166' },
  draft:     { bg: 'rgba(100,100,100,0.12)', border: 'rgba(100,100,100,0.30)', text: '#455a64', dot: '#7a8a7a' },
  completed: { bg: 'rgba(0,255,136,0.12)',   border: 'rgba(0,255,136,0.40)',   text: '#1b5e20', dot: '#00ff88' },
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ══════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════

const MONTHS_EN  = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT = ['M','T','W','T','F','S','S']

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function TimelinePage() {
  const t   = useTranslations('timeline')
  const now = new Date()

  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  // ── Données Supabase ─────────────────────────────────────
  const { data: projects,      loading: lP } = useProjects()
  const { data: consultants,   loading: lC } = useConsultants()
  const { data: leaveRequests, loading: lL } = useLeaveRequests()

  const loading = lP || lC || lL

  // ── Navigation mois ──────────────────────────────────────
  const prevMonth = () => month === 0  ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)
  const nextMonth = () => month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1)
  const goToday   = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  // ── Header jours ────────────────────────────────────────
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const headerDays  = useMemo(() =>
    Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1)
      return {
        num:       i + 1,
        dow:       d.getDay(),
        isToday:   toISO(d) === toISO(now),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      }
    }),
    [year, month, daysInMonth]
  )

  // ── Projets filtrés (hors archivés) + triés par date début ──
  const visibleProjects = useMemo(() =>
    (projects ?? [])
      .filter(p => p.status !== 'archived')
      .sort((a, b) => {
        if (!a.startDate) return 1
        if (!b.startDate) return -1
        return a.startDate.localeCompare(b.startDate)
      }),
    [projects]
  )

  // ── Map consultantId → consultant ───────────────────────
  const consultantMap = useMemo(() => {
    const m: Record<string, any> = {}
    ;(consultants ?? []).forEach(c => { m[c.id] = c })
    return m
  }, [consultants])

  // ── Stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const list = visibleProjects
    return [
      { value: list.filter(p => p.status === 'active').length,    label: 'Active',    color: 'var(--cyan)' },
      { value: list.filter(p => p.status === 'on_hold').length,   label: 'On hold',   color: 'var(--gold)' },
      { value: list.filter(p => p.status === 'draft').length,     label: 'Draft',     color: 'var(--text2)' },
      { value: list.filter(p => p.status === 'completed').length, label: 'Completed', color: 'var(--green)' },
    ]
  }, [visibleProjects])

  // ── Calcul cellules pour un projet ──────────────────────
  function buildProjectCells(project: any): DayCell[] {
    return headerDays.map(d => {
      const date    = new Date(year, month, d.num)
      const dateStr = toISO(date)
      const isToday = d.isToday

      if (d.isWeekend) return { type: 'weekend', isToday }

      const start = project.startDate ? new Date(project.startDate) : null
      const end   = project.endDate   ? new Date(project.endDate)   : null

      if (start && date < start) return { type: 'before', isToday }
      if (end   && date > end)   return { type: 'after',  isToday }

      return { type: 'active', isToday }
    })
  }

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />

      <div className="app-content">
        <StatRow stats={stats} />

        {/* ── Navigation mois ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>←</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', minWidth: 160, textAlign: 'center' }}>
            {MONTHS_EN[month]} {year}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>→</button>
          {!isCurrentMonth && (
            <button className="btn btn-primary btn-sm" onClick={goToday} style={{ marginLeft: 8 }}>
              Today
            </button>
          )}
        </div>

        {/* ── Grille Gantt ── */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '32px 20px', color: 'var(--text2)', fontSize: 12 }}>
              // chargement...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: daysInMonth * 28 + 220 }}>

                {/* ── En-tête jours ── */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `220px repeat(${daysInMonth}, 1fr)`,
                  borderBottom: '1px solid var(--border)',
                  position: 'sticky', top: 0,
                  background: 'var(--bg2)', zIndex: 10,
                }}>
                  <div style={{
                    padding: '8px 14px',
                    fontSize: 9, color: 'var(--text2)',
                    letterSpacing: 2, textTransform: 'uppercase',
                    borderRight: '1px solid var(--border)',
                  }}>
                    Project
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
                        {DAYS_SHORT[(d.dow + 6) % 7]}
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

                {/* ── Lignes projets ── */}
                {visibleProjects.map((project, rowIdx) => {
                  const cells  = buildProjectCells(project)
                  const color  = STATUS_COLOR[project.status] ?? STATUS_COLOR.draft
                  const team   = (project.team ?? [])
                    .map((m: any) => consultantMap[m.id] ?? m)
                    .filter(Boolean)

                  // Segment actif : première et dernière cellule active
                  const firstActive = cells.findIndex(c => c.type === 'active')
                  const lastActive  = cells.map(c => c.type).lastIndexOf('active')

                  return (
                    <div key={project.id} style={{
                      display: 'grid',
                      gridTemplateColumns: `220px repeat(${daysInMonth}, 1fr)`,
                      borderBottom: rowIdx < visibleProjects.length - 1 ? '1px solid var(--border)' : undefined,
                    }}>

                      {/* ── Info projet ── */}
                      <div style={{
                        padding: '10px 14px',
                        borderRight: '1px solid var(--border)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
                      }}>
                        {/* Nom + statut */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: color.dot, flexShrink: 0,
                          }} />
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: 'var(--text)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {project.name}
                          </span>
                        </div>

                        {/* Client */}
                        {(project.clientName ?? project.client) && (
                          <div style={{ fontSize: 9, color: 'var(--text2)', paddingLeft: 12 }}>
                            {project.clientName ?? project.client}
                          </div>
                        )}

                        {/* Avatars équipe */}
                        {team.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: -4, paddingLeft: 10 }}>
                            {team.slice(0, 5).map((c: any, i: number) => (
                              <div
                                key={c.id ?? i}
                                title={c.name}
                                style={{ marginLeft: i === 0 ? 0 : -6, zIndex: team.length - i, position: 'relative' }}
                              >
                                <Avatar
                                  initials={c.initials}
                                  color={c.avatarColor ?? c.avatar_color ?? 'green'}
                                  size="sm"
                                />
                              </div>
                            ))}
                            {team.length > 5 && (
                              <div style={{
                                marginLeft: -6, zIndex: 0, position: 'relative',
                                width: 18, height: 18, borderRadius: '50%',
                                background: 'var(--bg4)', border: '1px solid var(--border)',
                                fontSize: 8, color: 'var(--text2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                +{team.length - 5}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Cellules jours ── */}
                      {cells.map((cell, dayIdx) => {
                        const isFirst = dayIdx === firstActive
                        const isLast  = dayIdx === lastActive

                        return (
                          <div
                            key={dayIdx}
                            title={
                              cell.type === 'active'
                                ? `${project.name}${team.length ? ' · ' + team.map((c: any) => c.name?.split(' ')[0]).join(', ') : ''}`
                                : undefined
                            }
                            style={{
                              borderLeft: '1px solid var(--border)',
                              height: 52,
                              position: 'relative',
                              background:
                                cell.type === 'weekend' ? 'var(--bg3)' :
                                cell.type === 'active'  ? color.bg :
                                'transparent',
                              borderTop: cell.type === 'active'
                                ? `2px solid ${color.border}`
                                : '2px solid transparent',
                              outline: cell.isToday ? '1px solid var(--green)' : undefined,
                              outlineOffset: -1,
                            }}
                          >
                            {/* Label projet — affiché dans la première cellule active */}
                            {isFirst && (
                              <div style={{
                                position: 'absolute',
                                left: 6, top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: 8, fontWeight: 700,
                                color: color.text,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: (lastActive - firstActive) * 27 - 10,
                                pointerEvents: 'none',
                                letterSpacing: 0.3,
                              }}>
                                {lastActive - firstActive >= 3 ? project.name : ''}
                              </div>
                            )}

                            {/* Point today */}
                            {cell.isToday && cell.type === 'active' && (
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
                  )
                })}

                {visibleProjects.length === 0 && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                    // no projects
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

        {/* ── Légende ── */}
        <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_COLOR).map(([status, c]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 14, height: 14, borderRadius: 2, flexShrink: 0,
                background: c.bg, border: `1px solid ${c.border}`,
              }} />
              <span style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'capitalize' }}>
                {status.replace('_', ' ')}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 14, height: 14, borderRadius: 2, background: 'var(--bg3)', border: '1px solid var(--border)' }} />
            <span style={{ fontSize: 10, color: 'var(--text2)' }}>Weekend</span>
          </div>
        </div>

      </div>
    </>
  )
}
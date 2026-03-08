// components/timeline/TimelineClient.tsx
// ── Client Component ─────────────────────────────────────────
// Reçoit données en props. Gère navigation mois + t.raw() avec fallbacks.

'use client'

import { useState, useMemo }  from 'react'
import { useTranslations }    from 'next-intl'
import { StatRow }            from '@/components/ui'
import { Avatar }             from '@/components/ui/Avatar'
import { EmptyState }         from '@/components/ui/EmptyState'
import { toISO }              from '@/lib/utils'

// ── Fallbacks t.raw() ────────────────────────────────────────
const MONTHS_FB = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_FB   = ['Mo','Tu','We','Th','Fr','Sa','Su']

// ── Types ─────────────────────────────────────────────────────
type CellType = 'active' | 'free' | 'weekend' | 'before' | 'after'
interface DayCell { type: CellType; isToday: boolean }

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  active:    { bg: 'rgba(0,229,255,0.16)',   border: 'rgba(0,229,255,0.50)',   text: '#006064', dot: '#00e5ff' },
  on_hold:   { bg: 'rgba(255,209,102,0.16)', border: 'rgba(255,209,102,0.50)', text: '#e65100', dot: '#ffd166' },
  draft:     { bg: 'rgba(100,100,100,0.12)', border: 'rgba(100,100,100,0.30)', text: '#455a64', dot: '#7a8a7a' },
  completed: { bg: 'rgba(0,255,136,0.12)',   border: 'rgba(0,255,136,0.40)',   text: '#1b5e20', dot: '#00ff88' },
}

function TimelineLegend({ t }: { t: any }) {
  return (
    <div className="avail-legend">
      {Object.entries(STATUS_COLOR).map(([status, c]) => (
        <div key={status} className="avail-legend-item">
          <div className="avail-swatch" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
          <span>{t(`legend.${status}`)}</span>
        </div>
      ))}
      <div className="avail-legend-item">
        <div className="avail-swatch avail-swatch--weekend" />
        <span>{t('legend.weekend')}</span>
      </div>
    </div>
  )
}

interface Props {
  projects?:      any[]
  consultants?:   any[]
  leaveRequests?: any[]
}

export function TimelineClient({
  projects      = [],
  consultants   = [],
  leaveRequests = [],
}: Props) {
  const t   = useTranslations('timeline')
  const now = new Date()

  // t.raw() — fallback obligatoire
  const months    = (t.raw('months') as string[] | undefined) ?? MONTHS_FB
  const daysShort = (t.raw('days')   as string[] | undefined) ?? DAYS_FB

  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [showInternal, setShowInternal] = useState(false)

  const prevMonth      = () => month === 0  ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)
  const nextMonth      = () => month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1)
  const goToday        = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const gridCols    = `220px repeat(${daysInMonth}, 1fr)`

  const headerDays = useMemo(() =>
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

  const consultantMap = useMemo(() => {
    const m: Record<string, any> = {}
    consultants.forEach(c => { m[c.id] = c })
    return m
  }, [consultants])

  const visibleProjects = useMemo(() =>
    projects
      .filter(p => p.status !== 'archived')
      .filter(p => showInternal || !p.isInternal)
      .sort((a, b) => {
        if (!a.startDate) return 1
        if (!b.startDate) return -1
        return a.startDate.localeCompare(b.startDate)
      }),
    [projects]
  )

  const stats = useMemo(() => [
    { value: visibleProjects.filter(p => p.status === 'active').length,    label: t('stats.active'),    color: 'var(--cyan)'  },
    { value: visibleProjects.filter(p => p.status === 'on_hold').length,   label: t('stats.onHold'),    color: 'var(--gold)'  },
    { value: visibleProjects.filter(p => p.status === 'draft').length,     label: t('stats.draft'),     color: 'var(--text2)' },
    { value: visibleProjects.filter(p => p.status === 'completed').length, label: t('stats.completed'), color: 'var(--green)' },
  ], [visibleProjects])

  function buildProjectCells(project: any): DayCell[] {
    return headerDays.map(d => {
      const date    = new Date(year, month, d.num)
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
    <div className="app-content">
      <StatRow stats={stats} />

      <div className="avail-nav">
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>←</button>
        <span className="avail-month-label">{months[month]} {year}</span>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>→</button>
        {!isCurrentMonth && (
          <button className="btn btn-primary btn-sm" onClick={goToday}>{t('today')}</button>
        )}
        <button
          className={`btn btn-sm ${showInternal ? 'btn-primary' : 'btn-ghost'}`}
          style={{ marginLeft: 'auto', color: showInternal ? undefined : 'var(--text2)', fontSize: 10 }}
          onClick={() => setShowInternal(v => !v)}
        >
          ◧ {t('filters.internal') ?? 'Internes'}
        </button>
      </div>

      <div className="avail-grid-wrap">
        <div className="table-wrap">
          <div style={{ minWidth: daysInMonth * 28 + 220 }}>

            {/* Header jours */}
            <div className="avail-head-row" style={{ gridTemplateColumns: gridCols }}>
              <div className="avail-head-label label-meta tl-head-project">{t('headerProject')}</div>
              {headerDays.map(d => (
                <div
                  key={d.num}
                  className={['avail-head-cell', d.isToday ? 'avail-head-cell--today' : '', d.isWeekend ? 'avail-head-cell--weekend' : ''].join(' ')}
                >
                  <div className="avail-head-dow">{daysShort[(d.dow + 6) % 7] ?? ''}</div>
                  <div className={`avail-head-num ${d.isToday ? 'avail-head-num--today' : ''}`}>{d.num}</div>
                </div>
              ))}
            </div>

            {/* Lignes projets */}
            {visibleProjects.map((project, rowIdx) => {
              const cells = buildProjectCells(project)
              const color = STATUS_COLOR[project.status] ?? STATUS_COLOR.draft
              const team  = (project.team ?? [])
                .map((m: any) => consultantMap[m.id] ?? m)
                .filter(Boolean)

              const firstActive = cells.findIndex(c => c.type === 'active')
              const lastActive  = cells.map(c => c.type).lastIndexOf('active')

              return (
                <div
                  key={project.id}
                  className="avail-row"
                  style={{
                    gridTemplateColumns: gridCols,
                    borderBottom: rowIdx < visibleProjects.length - 1 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <div className="tl-project-cell">
                    <div className="tl-project-name-row">
                      <span className="tl-project-dot" style={{ background: color.dot }} />
                      <span className="tl-project-name">{project.name}</span>
                    </div>
                    {project.clientName && (
                      <div className="tl-project-client">{project.clientName}</div>
                    )}
                    {team.length > 0 && (
                      <div className="tl-team-avatars">
                        {team.slice(0, 5).map((c: any, i: number) => (
                          <div key={c.id ?? i} title={c.name} className="tl-team-avatar-wrap" style={{ zIndex: team.length - i }}>
                            <Avatar
                              initials={c.initials}
                              color={c.avatarColor ?? c.avatar_color ?? 'green'}
                              size="sm"
                            />
                          </div>
                        ))}
                        {team.length > 5 && <div className="tl-team-overflow">+{team.length - 5}</div>}
                      </div>
                    )}
                  </div>

                  {cells.map((cell, dayIdx) => {
                    const isFirst      = dayIdx === firstActive
                    const isLast       = dayIdx === lastActive
                    const projectStyle = cell.type === 'active'
                      ? { background: color.bg, borderTop: `2px solid ${color.border}` }
                      : {}

                    return (
                      <div
                        key={dayIdx}
                        title={cell.type === 'active' ? `${project.name}${team.length ? ' · ' + team.map((c: any) => (c.name ?? '').split(' ')[0]).join(', ') : ''}` : undefined}
                        className={['tl-cell', `tl-cell--${cell.type}`, cell.isToday ? 'tl-cell--today' : ''].join(' ')}
                        style={projectStyle}
                      >
                        {isFirst && lastActive - firstActive >= 3 && (
                          <div className="tl-cell-label" style={{ maxWidth: (lastActive - firstActive) * 27 - 10, color: color.text }}>
                            {project.name}
                          </div>
                        )}
                        {cell.isToday && cell.type === 'active' && <span className="avail-today-dot" />}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {visibleProjects.length === 0 && <EmptyState message={t('noData')} />}
          </div>
        </div>
      </div>

      <TimelineLegend t={t} />
    </div>
  )
}
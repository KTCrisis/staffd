'use client'
export const runtime = 'edge'

import { useState }           from 'react'
import { useTranslations }    from 'next-intl'
import { Topbar }             from '@/components/layout/Topbar'
import { Panel }              from '@/components/ui'
import { Avatar }             from '@/components/ui/Avatar'
import { CONSULTANTS, PROJECTS, LEAVE_REQUESTS } from '@/lib/mock'

// ── Types ──
type CellType = 'free' | 'project' | 'leave' | 'partial' | 'weekend'

interface DayCell {
  type:       CellType
  label?:     string   // nom du projet ou congé (pour tooltip)
  isToday:    boolean
}

// ── Générer les données du mois ──
function buildMonthData(year: number, month: number) {
  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return CONSULTANTS.map(consultant => {
    const cells: DayCell[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date      = new Date(year, month, day)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const isToday   = date.getTime() === today.getTime()

      if (isWeekend) {
        cells.push({ type: 'weekend', isToday })
        continue
      }

      // Congé ?
      const leave = LEAVE_REQUESTS.find(lr => {
        if (lr.consultantId !== consultant.id) return false
        const s = new Date(lr.startDate)
        const e = new Date(lr.endDate)
        s.setHours(0,0,0,0); e.setHours(0,0,0,0)
        return date >= s && date <= e
      })

      if (leave) {
        cells.push({ type: 'leave', label: leave.type, isToday })
        continue
      }

      // Projet ?
      const project = PROJECTS.find(p => p.consultantIds.includes(consultant.id) && p.status !== 'done')

      if (consultant.status === 'partial') {
        cells.push({ type: 'partial', label: project?.name, isToday })
      } else if (consultant.status === 'assigned' && project) {
        cells.push({ type: 'project', label: project.name, isToday })
      } else {
        cells.push({ type: 'free', isToday })
      }
    }

    return { consultant, cells, daysInMonth }
  })
}

// ── Couleur de cellule ──
const CELL_STYLE: Record<CellType, React.CSSProperties> = {
  free:    { background: 'transparent', borderColor: 'var(--border)' },
  project: { background: 'var(--tl-project)', borderColor: 'var(--tl-project-b)' },
  leave:   { background: 'var(--tl-leave)',   borderColor: 'var(--tl-leave-b)' },
  partial: { background: 'rgba(255,209,102,0.12)', borderColor: 'rgba(255,209,102,0.3)' },
  weekend: { background: 'var(--tl-weekend)', borderColor: 'var(--border)', cursor: 'default' },
}

// ── Page ──
export default function TimelinePage() {
  const t = useTranslations('timeline')

  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const data            = buildMonthData(year, month)
  const daysInMonth     = new Date(year, month + 1, 0).getDate()
  const months          = t.raw('months') as string[]
  const dayLabels       = t.raw('days') as string[]

  // Jours du mois pour l'en-tête
  const headerDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1)
    return {
      num:       i + 1,
      dayOfWeek: d.getDay(),
      isToday:   d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate(),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    }
  })

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} ctaLabel={t('cta')} onCta={() => {}} />

      <div className="app-content">

        {/* Navigation mois */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>{t('prevMonth')}</button>

          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', minWidth: 160, textAlign: 'center' }}>
            {months[month]} {year}
          </span>

          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>{t('nextMonth')}</button>

          {!isCurrentMonth && (
            <button className="btn btn-primary btn-sm" onClick={goToday}>{t('today')}</button>
          )}
        </div>

        {/* Grille Gantt */}
        <Panel noPadding>
          <div className="timeline-wrap" style={{ padding: '14px 18px' }}>

            {/* En-tête : jours du mois */}
            <div style={{ display: 'flex', marginBottom: 6 }}>
              {/* Colonne nom */}
              <div className="tl-name-col" style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                {t('consultant')}
              </div>

              {/* Labels jours */}
              <div className="tl-days">
                {headerDays.map(d => (
                  <div
                    key={d.num}
                    className={`tl-day-label${d.isToday ? ' today-col' : ''}`}
                    style={{
                      opacity: d.isWeekend ? 0.3 : 1,
                      fontWeight: d.isToday ? 700 : 400,
                    }}
                  >
                    <div>{dayLabels[(d.dayOfWeek + 6) % 7]}</div>
                    <div style={{ fontSize: 9, marginTop: 1 }}>{d.num}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lignes consultants */}
            {data.map(({ consultant, cells }) => (
              <div key={consultant.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                {/* Avatar + nom */}
                <div className="tl-name-col" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12 }}>
                  <Avatar initials={consultant.initials} color={consultant.avatarColor} size="sm" />
                  <span style={{ fontSize: 10, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>
                    {consultant.name.split(' ')[0]}
                  </span>
                </div>

                {/* Cellules */}
                <div className="tl-bar-row">
                  {cells.map((cell, i) => (
                    <div
                      key={i}
                      className="tl-cell"
                      style={{
                        ...CELL_STYLE[cell.type],
                        outline: cell.isToday ? '1px solid var(--green)' : undefined,
                        outlineOffset: -1,
                      }}
                      title={cell.label}
                    />
                  ))}
                </div>
              </div>
            ))}

          </div>
        </Panel>

        {/* Légende */}
        <div className="dispo-legend" style={{ marginTop: 14 }}>
          {[
            { style: CELL_STYLE.project, label: t('legend.project') },
            { style: CELL_STYLE.leave,   label: t('legend.leave') },
            { style: CELL_STYLE.partial, label: t('legend.partial') },
            { style: CELL_STYLE.weekend, label: t('legend.weekend') },
            { style: CELL_STYLE.free,    label: t('legend.free') },
          ].map(item => (
            <div key={item.label} className="legend-item">
              <div style={{
                width: 14, height: 14, borderRadius: 2,
                border: `1px solid ${item.style.borderColor as string}`,
                background: item.style.background as string,
                flexShrink: 0,
              }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

      </div>
    </>
  )
}

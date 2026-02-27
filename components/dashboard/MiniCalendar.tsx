'use client'

import { useState } from 'react'

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]

// Hardcoded event days for mock — will come from data later
const EVENT_DAYS = [5, 12, 14, 15, 16, 17, 18, 24, 31]

interface MiniCalendarProps {
  initialYear?: number
  initialMonth?: number  // 0-based
  today?: { day: number; month: number; year: number }
}

export function MiniCalendar({
  initialYear = 2026,
  initialMonth = 2,       // March
  today = { day: 12, month: 2, year: 2026 },
}: MiniCalendarProps) {
  const [year, setYear]   = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const firstDay   = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()
  const startOffset = (firstDay + 6) % 7  // Mon-based

  const cells: { day: number; type: 'prev' | 'current' | 'next' }[] = []

  for (let i = 0; i < startOffset; i++) {
    cells.push({ day: daysInPrev - startOffset + i + 1, type: 'prev' })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: 'current' })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, type: 'next' })
  }

  return (
    <div>
      <div className="cal-nav">
        <button className="cal-btn" onClick={prev}>‹</button>
        <span className="cal-month">{MONTHS[month]} {year}</span>
        <button className="cal-btn" onClick={next}>›</button>
      </div>
      <div className="cal-grid">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="cal-day-label">{d}</div>
        ))}
        {cells.map((cell, i) => {
          const isToday =
            cell.type === 'current' &&
            cell.day === today.day &&
            month === today.month &&
            year === today.year
          const hasEvent = cell.type === 'current' && EVENT_DAYS.includes(cell.day)
          return (
            <div
              key={i}
              className={[
                'cal-day',
                cell.type !== 'current' ? 'other-month' : '',
                isToday ? 'today' : '',
                hasEvent ? 'has-event' : '',
              ].filter(Boolean).join(' ')}
            >
              {cell.day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

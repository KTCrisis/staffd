'use client'

import { useState }         from 'react'
import { useTranslations }  from 'next-intl'

// ── Types ─────────────────────────────────────────────────────

export interface CalendarEvent {
  date:  string    // ISO yyyy-mm-dd
  type:  'holiday' | 'leave' | 'deadline'
  label: string
}

const EVENT_COLORS: Record<CalendarEvent['type'], string> = {
  holiday:  'var(--gold)',
  leave:    'var(--purple)',
  deadline: 'var(--pink)',
}

const EVENT_ICONS: Record<CalendarEvent['type'], string> = {
  holiday:  '◈',
  leave:    '✦',
  deadline: '▸',
}

// ── Helpers ───────────────────────────────────────────────────

const DAYS_SHORT_FB = ['Mo','Tu','We','Th','Fr','Sa','Su']
const MONTHS_FB     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getMonday(date: Date): Date {
  const d    = new Date(date)
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function toISO(d: Date): string {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Props ─────────────────────────────────────────────────────

interface MiniCalendarProps {
  events?: CalendarEvent[]
  today?:  { day: number; month: number; year: number }
}

// ── Component ─────────────────────────────────────────────────

export function MiniCalendar({
  events = [],
  today = {
    day:   new Date().getDate(),
    month: new Date().getMonth(),
    year:  new Date().getFullYear(),
  },
}: MiniCalendarProps) {
  const t = useTranslations('dashboard')

  const daysShort     = (t.raw('daysShort') as string[] | undefined) ?? DAYS_SHORT_FB
  const months        = (t.raw('months')    as string[] | undefined) ?? MONTHS_FB
  const labelToday    = t('calToday')
  const labelUpcoming = t('calUpcoming')
  const labelNoEvent  = t('calNoEvent')

  const todayDate = new Date(today.year, today.month, today.day)
  const [weekStart, setWeekStart] = useState(() => getMonday(todayDate))

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d,  7))
  const goToday  = () => setWeekStart(getMonday(todayDate))

  const days         = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const displayMonth = weekStart.getMonth()
  const displayYear  = weekStart.getFullYear()
  const isThisWeek   = isSameDay(weekStart, getMonday(todayDate))

  // Events pour cette semaine
  const weekEvents = (iso: string) => events.filter(e => e.date === iso)

  // Upcoming — événements >= aujourd'hui, triés par date
  const todayISO  = toISO(todayDate)
  const upcoming  = events
    .filter(e => e.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>

      {/* Header navigation */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <button className="cal-btn" onClick={prevWeek}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
            {months[displayMonth]} {displayYear}
          </div>
          {!isThisWeek && (
            <button
              onClick={goToday}
              style={{
                fontSize: 8, color: 'var(--green)', background: 'none',
                border: 'none', cursor: 'pointer', letterSpacing: 1,
                textTransform: 'uppercase', padding: 0, marginTop: 1,
              }}
            >
              {labelToday}
            </button>
          )}
        </div>
        <button className="cal-btn" onClick={nextWeek}>›</button>
      </div>

      {/* Week strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 3, marginBottom: 14,
      }}>
        {days.map((d, i) => {
          const iso       = toISO(d)
          const isToday   = isSameDay(d, todayDate)
          const isWeekend = i >= 5
          const dayEvents = weekEvents(iso)
          const isPast    = d < todayDate && !isToday

          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 8, letterSpacing: 0.5, textTransform: 'uppercase',
                color: isWeekend ? 'var(--border2)' : 'var(--text2)',
                marginBottom: 4,
              }}>
                {daysShort[i] ?? ''}
              </div>
              <div
                title={dayEvents.map(e => `${EVENT_ICONS[e.type]} ${e.label}`).join('\n') || undefined}
                style={{
                  width: '100%', aspectRatio: '1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, fontSize: 11,
                  fontWeight: isToday ? 700 : 400,
                  position: 'relative',
                  background: isToday
                    ? 'rgba(0,255,136,0.15)'
                    : isWeekend ? 'var(--bg3)' : 'transparent',
                  border: isToday
                    ? '1px solid rgba(0,255,136,0.35)'
                    : '1px solid transparent',
                  color: isToday
                    ? 'var(--green)'
                    : isPast || isWeekend ? 'var(--text2)' : 'var(--text)',
                  opacity: isPast ? 0.45 : 1,
                }}>
                {d.getDate()}
                {/* Dots — un par type d'événement */}
                {dayEvents.length > 0 && (
                  <span style={{
                    position: 'absolute', bottom: 2, left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex', gap: 2,
                  }}>
                    {[...new Set(dayEvents.map(e => e.type))].map(type => (
                      <span key={type} style={{
                        width: 3, height: 3, borderRadius: '50%',
                        background: EVENT_COLORS[type],
                      }} />
                    ))}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Séparateur */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }} />

      {/* Prochains événements */}
      {upcoming.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            fontSize: 8, letterSpacing: 2, textTransform: 'uppercase',
            color: 'var(--text2)', marginBottom: 2,
          }}>
            {labelUpcoming}
          </div>
          {upcoming.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: EVENT_COLORS[e.type], minWidth: 20 }}>
                {new Date(e.date + 'T00:00:00').getDate()}
              </span>
              <span style={{ fontSize: 8, color: EVENT_COLORS[e.type] }}>{EVENT_ICONS[e.type]}</span>
              <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: 'var(--text2)', opacity: 0.6 }}>
          {labelNoEvent}
        </div>
      )}
    </div>
  )
}
'use client'

import { useState } from 'react'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

// Hardcoded pour mock — viendra de Supabase plus tard
const EVENT_DAYS = [5, 12, 14, 15, 16, 17, 18, 24, 31]

// ── Helpers ──────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
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

// ── Composant ────────────────────────────────────────────────

interface MiniCalendarProps {
  initialYear?:  number
  initialMonth?: number
  today?:        { day: number; month: number; year: number }
}

export function MiniCalendar({
  today = { day: new Date().getDate(), month: new Date().getMonth(), year: new Date().getFullYear() },
}: MiniCalendarProps) {
  const todayDate = new Date(today.year, today.month, today.day)
  const [weekStart, setWeekStart] = useState(() => getMonday(todayDate))

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d,  7))
  const goToday  = () => setWeekStart(getMonday(todayDate))

  // Les 7 jours de la semaine affichée
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Mois affiché (celui du lundi ou du vendredi si à cheval)
  const displayMonth = weekStart.getMonth()
  const displayYear  = weekStart.getFullYear()

  // Prochains événements du mois
  const upcomingEvents = EVENT_DAYS
    .map(d => new Date(today.year, today.month, d))
    .filter(d => d >= todayDate)
    .slice(0, 3)

  const isThisWeek = isSameDay(weekStart, getMonday(todayDate))

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>

      {/* ── Header navigation ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <button className="cal-btn" onClick={prevWeek}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
            {MONTHS[displayMonth]} {displayYear}
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
              ↩ aujourd'hui
            </button>
          )}
        </div>
        <button className="cal-btn" onClick={nextWeek}>›</button>
      </div>

      {/* ── Week strip ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 3,
        marginBottom: 14,
      }}>
        {days.map((d, i) => {
          const isToday   = isSameDay(d, todayDate)
          const isWeekend = i >= 5
          const hasEvent  = EVENT_DAYS.includes(d.getDate()) && d.getMonth() === today.month
          const isPast    = d < todayDate && !isToday

          return (
            <div key={i} style={{ textAlign: 'center' }}>
              {/* Jour label */}
              <div style={{
                fontSize: 8,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: isWeekend ? 'var(--border2)' : 'var(--text2)',
                marginBottom: 4,
              }}>
                {DAY_LABELS[i]}
              </div>

              {/* Numéro */}
              <div style={{
                width: '100%',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: isToday ? 700 : 400,
                position: 'relative',
                background: isToday
                  ? 'rgba(0,255,136,0.15)'
                  : isWeekend
                  ? 'var(--bg3)'
                  : 'transparent',
                border: isToday
                  ? '1px solid rgba(0,255,136,0.35)'
                  : '1px solid transparent',
                color: isToday
                  ? 'var(--green)'
                  : isPast || isWeekend
                  ? 'var(--text2)'
                  : 'var(--text)',
                opacity: isPast ? 0.45 : 1,
              }}>
                {d.getDate()}
                {/* Dot événement */}
                {hasEvent && (
                  <span style={{
                    position: 'absolute', bottom: 2, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 3, height: 3,
                    borderRadius: '50%',
                    background: 'var(--pink)',
                  }} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Séparateur ── */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }} />

      {/* ── Prochains événements ── */}
      {upcomingEvents.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            fontSize: 8, letterSpacing: 2, textTransform: 'uppercase',
            color: 'var(--text2)', marginBottom: 2,
          }}>
            À venir
          </div>
          {upcomingEvents.map((d, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 10, color: 'var(--text2)',
            }}>
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: 'var(--pink)',
                minWidth: 20,
              }}>
                {d.getDate()}
              </span>
              <span style={{ color: 'var(--border2)' }}>—</span>
              <span style={{ color: 'var(--text)' }}>Événement</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: 'var(--text2)', opacity: 0.6 }}>
          // aucun événement à venir
        </div>
      )}
    </div>
  )
}
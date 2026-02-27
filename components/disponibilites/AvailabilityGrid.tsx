'use client'

import { useTranslations }  from 'next-intl'
import type { Consultant }   from '@/types'
import { Avatar }            from '@/components/ui/Avatar'

// ── Types ──
type CellStatus = 'free' | 'busy' | 'partial' | 'leave' | 'weekend'

interface DayData {
  date:       Date
  status:     CellStatus
  project?:   string
  isToday:    boolean
  isWeekend:  boolean
}

interface ConsultantWeek {
  consultant: Consultant
  days:       DayData[]
}

// ── Mock availability data generator ──
// Génère des données de disponibilité pour la semaine donnée
// (sera remplacé par Supabase)
function generateWeekData(consultants: Consultant[], weekStart: Date): ConsultantWeek[] {
  const PATTERNS: Record<string, CellStatus[]> = {
    am: ['busy', 'busy', 'busy', 'busy', 'busy'],
    bl: ['busy', 'free', 'busy', 'partial', 'free'],
    ck: ['leave', 'leave', 'leave', 'leave', 'leave'],
    dm: ['partial', 'partial', 'busy', 'partial', 'free'],
    ep: ['busy', 'busy', 'busy', 'busy', 'busy'],
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return consultants.map(c => {
    const pattern = PATTERNS[c.id] ?? ['free', 'free', 'free', 'free', 'free']
    const days: DayData[] = []

    for (let i = 0; i < 5; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)

      days.push({
        date,
        isWeekend: false,
        isToday:   date.getTime() === today.getTime(),
        status:    pattern[i] ?? 'free',
        project:   (pattern[i] === 'busy' || pattern[i] === 'partial')
          ? c.currentProject
          : undefined,
      })
    }

    return { consultant: c, days }
  })
}

// ── Cell CSS class ──
const CELL_CLASS: Record<CellStatus, string> = {
  free:    'avail-cell ac-free',
  busy:    'avail-cell ac-busy',
  partial: 'avail-cell ac-partial',
  leave:   'avail-cell ac-leave',
  weekend: 'avail-cell ac-weekend',
}

// ── Cell label (short) ──
const CELL_LABEL: Record<CellStatus, string> = {
  free:    '—',
  busy:    '●',
  partial: '◐',
  leave:   '✦',
  weekend: '',
}

interface AvailabilityGridProps {
  consultants: Consultant[]
  weekStart:   Date
}

export function AvailabilityGrid({ consultants, weekStart }: AvailabilityGridProps) {
  const t    = useTranslations('disponibilites')
  const data = generateWeekData(consultants, weekStart)

  const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

  return (
    <div>
      {/* En-tête jours */}
      <div className="avail-header">
        <div className="avail-col-label">{t('consultant')}</div>
        {data[0]?.days.map((day, i) => (
          <div
            key={i}
            className="avail-col-label"
            style={{ color: day.isToday ? 'var(--green)' : day.isWeekend ? 'var(--border2)' : undefined }}
          >
            <div style={{ fontWeight: day.isToday ? 700 : 400 }}>
              {t(`days.${DAY_KEYS[i]}`)}
            </div>
            <div style={{ fontSize: 8, marginTop: 2 }}>
              {day.date.getDate()}/{day.date.getMonth() + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Lignes consultants */}
      {data.map(({ consultant, days }) => (
        <div key={consultant.id} className="avail-row">

          {/* Nom + avatar */}
          <div className="avail-name" style={{ gap: 8 }}>
            <Avatar initials={consultant.initials} color={consultant.avatarColor} size="sm" />
            <span style={{ fontSize: 10 }}>{consultant.name.split(' ')[0]}</span>
          </div>

          {/* Cellules */}
          {days.map((day, i) => (
            <div
              key={i}
              className={CELL_CLASS[day.status]}
              title={day.project ?? t(`legend.${day.status}`)}
              style={{ position: 'relative' }}
            >
              {day.isToday && (
                <div style={{
                  position: 'absolute', top: 2, right: 3,
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--green)',
                }} />
              )}
              {!day.isWeekend && CELL_LABEL[day.status]}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

'use client'

import { useTranslations } from 'next-intl'
import type { Consultant }  from '@/types'
import { Avatar }           from '@/components/ui/Avatar'

type CellStatus = 'free' | 'busy' | 'partial' | 'leave' | 'weekend'

interface DayData {
  date:      Date
  status:    CellStatus
  project?:  string
  isToday:   boolean
}

interface ConsultantWeek {
  consultant: Consultant
  days:       DayData[]
}

const CELL_CLASS: Record<CellStatus, string> = {
  free:    'avail-cell ac-free',
  busy:    'avail-cell ac-busy',
  partial: 'avail-cell ac-partial',
  leave:   'avail-cell ac-leave',
  weekend: 'avail-cell ac-weekend',
}

const CELL_LABEL: Record<CellStatus, string> = {
  free:    '—',
  busy:    '●',
  partial: '◐',
  leave:   '✦',
  weekend: '',
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

// ── Calcul statut réel par jour ──────────────────────────────
function computeWeekData(
  consultants: Consultant[],
  weekStart: Date,
  leaveRequests: any[],
  assignments: any[],
): ConsultantWeek[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return consultants.map(c => {
    const days: DayData[] = []

    for (let i = 0; i < 5; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      const dateStr = toISO(date)
      const isToday = toISO(date) === toISO(today)

      // Congé approuvé ce jour ?
      const onLeave = leaveRequests.some(lr =>
        lr.consultant_id === c.id &&
        lr.status === 'approved' &&
        dateStr >= lr.start_date &&
        dateStr <= lr.end_date
      )

      if (onLeave) {
        days.push({ date, isToday, status: 'leave' })
        continue
      }

      // Assignments actifs ce jour
      const activeAssignments = assignments.filter(a =>
        a.consultant_id === c.id &&
        (!a.start_date || dateStr >= a.start_date) &&
        (!a.end_date   || dateStr <= a.end_date)
      )

      const totalAllocation = activeAssignments.reduce((s: number, a: any) => s + (a.allocation ?? 0), 0)
      const projectName = activeAssignments[0]?.projects?.name

      let status: CellStatus = 'free'
      if (totalAllocation >= 100) status = 'busy'
      else if (totalAllocation > 0) status = 'partial'

      days.push({
        date, isToday, status,
        project: projectName,
      })
    }

    return { consultant: c, days }
  })
}

interface AvailabilityGridProps {
  consultants:   Consultant[]
  weekStart:     Date
  leaveRequests: any[]
  assignments:   any[]
}

export function AvailabilityGrid({
  consultants, weekStart, leaveRequests, assignments,
}: AvailabilityGridProps) {
  const t    = useTranslations('disponibilites')
  const data = computeWeekData(consultants, weekStart, leaveRequests, assignments)
  const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

  return (
    <div>
      <div className="avail-header">
        <div className="avail-col-label">{t('consultant')}</div>
        {data[0]?.days.map((day, i) => (
          <div key={i} className="avail-col-label"
            style={{ color: day.isToday ? 'var(--green)' : undefined }}>
            <div style={{ fontWeight: day.isToday ? 700 : 400 }}>{t(`days.${DAY_KEYS[i]}`)}</div>
            <div style={{ fontSize: 8, marginTop: 2 }}>
              {day.date.getDate()}/{day.date.getMonth() + 1}
            </div>
          </div>
        ))}
      </div>

      {data.map(({ consultant, days }) => (
        <div key={consultant.id} className="avail-row">
          <div className="avail-name" style={{ gap: 8 }}>
            <Avatar initials={consultant.initials} color={consultant.avatarColor} size="sm" />
            <span style={{ fontSize: 10 }}>{consultant.name.split(' ')[0]}</span>
          </div>

          {days.map((day, i) => (
            <div key={i}
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
              {CELL_LABEL[day.status]}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
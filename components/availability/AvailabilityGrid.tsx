'use client'

import { useTranslations } from 'next-intl'
import type { Consultant }  from '@/types'
import { Avatar }           from '@/components/ui/Avatar'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type CellStatus = 'free' | 'busy' | 'partial' | 'leave' | 'weekend'

interface DayData {
  date:     Date
  status:   CellStatus
  project?: string   // nom du projet si busy/partial
  isToday:  boolean
}

interface ConsultantWeek {
  consultant: Consultant
  days:       DayData[]
}

export interface AvailabilityGridProps {
  consultants:   Consultant[]
  weekStart:     Date
  leaveRequests: any[]   // résultat useLeaveRequests() — camelCase
  assignments:   any[]   // résultat useAssignments()   — snake_case
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ══════════════════════════════════════════════════════════════
// CALCUL STATUT RÉEL PAR JOUR
// Utilise les congés approuvés + assignments actifs Supabase
// Priorité : leave > busy (100%) > partial (>0%) > free
// ══════════════════════════════════════════════════════════════

function computeWeekData(
  consultants:   Consultant[],
  weekStart:     Date,
  leaveRequests: any[],
  assignments:   any[],
): ConsultantWeek[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return consultants.map(c => {
    const days: DayData[] = []

    for (let i = 0; i < 5; i++) {
      const date    = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      const dateStr = toISO(date)
      const isToday = dateStr === toISO(today)

      // ── 1. Congé approuvé ce jour ? ──────────────────────
      // useLeaveRequests() mappe en camelCase via toLeaveRequest()
      const onLeave = leaveRequests.some(lr =>
        lr.consultantId === c.id &&
        dateStr >= lr.startDate &&
        dateStr <= lr.endDate
      )

      if (onLeave) {
        days.push({ date, isToday, status: 'leave' })
        continue
      }

      // ── 2. Assignments actifs ce jour ────────────────────
      // useAssignments() retourne les données brutes Supabase (snake_case)
      const activeAssignments = assignments.filter(a =>
        a.consultant_id === c.id &&
        (!a.start_date || dateStr >= a.start_date) &&
        (!a.end_date   || dateStr <= a.end_date)
      )

      const totalAllocation = activeAssignments.reduce(
        (s: number, a: any) => s + (a.allocation ?? 0), 0
      )
      const projectName = activeAssignments[0]?.projects?.name

      // ── 3. Calcul statut ─────────────────────────────────
      let status: CellStatus = 'free'
      if (totalAllocation >= 100) status = 'busy'
      else if (totalAllocation > 0) status = 'partial'

      days.push({ date, isToday, status, project: projectName })
    }

    return { consultant: c, days }
  })
}

// ══════════════════════════════════════════════════════════════
// CONSTANTES UI
// ══════════════════════════════════════════════════════════════

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

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

export function AvailabilityGrid({
  consultants,
  weekStart,
  leaveRequests,
  assignments,
}: AvailabilityGridProps) {
  const t    = useTranslations('disponibilites')
  const data = computeWeekData(consultants, weekStart, leaveRequests, assignments)

  if (data.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
        // no consultants
      </div>
    )
  }

  return (
    <div>

      {/* ── En-tête jours ── */}
      <div className="avail-header">
        <div className="avail-col-label">{t('consultant')}</div>
        {data[0].days.map((day, i) => (
          <div
            key={i}
            className="avail-col-label"
            style={{ color: day.isToday ? 'var(--green)' : undefined }}
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

      {/* ── Lignes consultants ── */}
      {data.map(({ consultant, days }) => (
        <div key={consultant.id} className="avail-row">

          {/* Nom + avatar */}
          <div className="avail-name" style={{ gap: 8 }}>
            <Avatar initials={consultant.initials} color={consultant.avatarColor} size="sm" />
            <span style={{ fontSize: 10 }}>{consultant.name.split(' ')[0]}</span>
          </div>

          {/* Cellules jours */}
          {days.map((day, i) => (
            <div
              key={i}
              className={CELL_CLASS[day.status]}
              title={day.project ?? t(`legend.${day.status}`)}
              style={{ position: 'relative' }}
            >
              {/* Point vert = aujourd'hui */}
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
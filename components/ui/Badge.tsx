import type { ConsultantStatus, LeaveStatus, ProjectStatus } from '@/types'
import { STATUS_LABELS, PROJECT_STATUS_LABELS, LEAVE_STATUS_LABELS } from '@/lib/utils'

type BadgeVariant = ConsultantStatus | LeaveStatus | ProjectStatus

const BADGE_CLASS: Record<BadgeVariant, string> = {
  // Consultant
  available: 'badge badge-available',
  assigned:  'badge badge-assigned',
  leave:     'badge badge-leave',
  partial:   'badge badge-partial',
  // Leave
  pending:   'badge badge-pending',
  approved:  'badge badge-approved',
  refused:   'badge badge-leave',
  // Project
  draft:     'badge badge-starting',
  active:    'badge badge-assigned',
  on_hold:   'badge badge-pending',
  completed: 'badge badge-available',
  archived:  'badge badge-leave',
}

const ALL_LABELS: Record<BadgeVariant, string> = {
  ...STATUS_LABELS,
  ...LEAVE_STATUS_LABELS,
  ...PROJECT_STATUS_LABELS,
}

interface BadgeProps {
  variant: BadgeVariant
  label?: string
}

export function Badge({ variant, label }: BadgeProps) {
  return (
    <span className={BADGE_CLASS[variant] ?? 'badge'}>
      {label ?? ALL_LABELS[variant] ?? variant}
    </span>
  )
}
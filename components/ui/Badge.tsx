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
  active:    'badge badge-assigned',
  starting:  'badge badge-starting',
  done:      'badge badge-available',
}

const ALL_LABELS: Record<BadgeVariant, string> = {
  ...STATUS_LABELS,
  ...LEAVE_STATUS_LABELS,
  ...PROJECT_STATUS_LABELS,
}

interface BadgeProps {
  variant: BadgeVariant
  label?: string   // override default label
}

export function Badge({ variant, label }: BadgeProps) {
  return (
    <span className={BADGE_CLASS[variant]}>
      {label ?? ALL_LABELS[variant]}
    </span>
  )
}

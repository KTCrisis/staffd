'use client'

import { useTranslations } from 'next-intl'
import type { ConsultantStatus, LeaveStatus, ProjectStatus } from '@/types'

type BadgeVariant = ConsultantStatus | LeaveStatus | ProjectStatus

const BADGE_CLASS: Record<BadgeVariant, string> = {
  available: 'badge badge-available',
  assigned:  'badge badge-assigned',
  leave:     'badge badge-leave',
  partial:   'badge badge-partial',
  pending:   'badge badge-pending',
  approved:  'badge badge-approved',
  refused:   'badge badge-leave',
  draft:     'badge badge-starting',
  active:    'badge badge-assigned',
  on_hold:   'badge badge-pending',
  completed: 'badge badge-available',
  archived:  'badge badge-leave',
}

interface BadgeProps {
  variant: BadgeVariant
  label?: string
}

export function Badge({ variant, label }: BadgeProps) {
  const t = useTranslations('statuses')
  return (
    <span className={BADGE_CLASS[variant] ?? 'badge'}>
      {label ?? t(variant)}
    </span>
  )
}
import type { ConsultantStatus, ProjectStatus, LeaveStatus, AvatarColor } from '@/types'

// ── Date formatting ──
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ── Status labels ──
export const STATUS_LABELS: Record<ConsultantStatus, string> = {
  available: 'Disponible',
  assigned:  'En mission',
  leave:     'Congé',
  partial:   'Partiel',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft:     'Brouillon',
  active:    'En cours',
  on_hold:   'En pause',
  completed: 'Terminé',
  archived:  'Archivé',
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending:  'En attente',
  approved: 'Approuvé',
  refused:  'Refusé',
}

// ── Avatar color → CSS class ──
export const AVATAR_CLASS: Record<AvatarColor, string> = {
  green:  'av-green',
  pink:   'av-pink',
  cyan:   'av-cyan',
  gold:   'av-gold',
  purple: 'av-purple',
}

// ── Progress bar color ──
export function progressColor(pct: number): string {
  if (pct >= 80) return 'var(--green)'
  if (pct >= 50) return 'var(--gold)'
  return 'var(--cyan)'
}
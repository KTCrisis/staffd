import type { ConsultantStatus, ProjectStatus, LeaveStatus, AvatarColor } from '@/types'

// ─────────────────────────────────────────────────────────────
// DATE
// ─────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/** Retourne le lundi de la semaine contenant `d` */
export function getMondayOf(d: Date): Date {
  const date = new Date(d)
  const day  = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

/** YYYY-MM-DD */
export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Jours ouvrés d'une semaine à partir du lundi */
export function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/** Nombre de jours ouvrés entre deux dates ISO inclusives */
export function countWorkingDays(start: string, end: string): number {
  const s = new Date(start), e = new Date(end)
  if (e < s) return 0
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function fmtDay(d: Date) {
  return {
    dow: d.toLocaleDateString('en', { weekday: 'short' }),
    num: d.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
  }
}

// ─────────────────────────────────────────────────────────────
// CURRENCY
// ─────────────────────────────────────────────────────────────

/** Formate un montant en euros : 12 500 € */
export function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

/** Formate un TJM court : 850 €/j */
export function fmtTjm(n: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} €/j`
}

// ─────────────────────────────────────────────────────────────
// MARGE / FINANCE
// ─────────────────────────────────────────────────────────────

/**
 * Couleur CSS selon le taux de marge.
 * Seuils : ≥ 25% excellent (green) · 15–25% correct (gold) · < 15% alerte (pink)
 * Utilisé dans financials, profitability, KpiCard, MargeBar, légendes.
 */
export function getMargeColor(pct: number | null | undefined): string {
  if (pct == null) return 'var(--text2)'
  if (pct >= 25) return 'var(--green)'
  if (pct >= 15) return 'var(--gold)'
  return 'var(--pink)'
}

/**
 * Label lisible selon le taux de marge.
 */
export function getMargLabel(pct: number | null | undefined): string {
  if (pct == null) return '—'
  if (pct >= 25) return '✓ Excellente'
  if (pct >= 15) return '◎ Correcte'
  return '⚠ À surveiller'
}

/**
 * Vérifie si l'écart TJM cible est insuffisant (< 10% de marge sur coût).
 * Utilisé pour déclencher les alertes dans profitability.
 */
export function isCibleAlert(tjmCible: number | null, tjmCout: number | null): boolean {
  if (!tjmCible || !tjmCout) return false
  return (tjmCible - tjmCout) / tjmCible * 100 < 10
}

// ─────────────────────────────────────────────────────────────
// STATUS LABELS
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// STATUS COLORS
// ─────────────────────────────────────────────────────────────

export const CONSULTANT_STATUS_COLOR: Record<ConsultantStatus, string> = {
  available: 'var(--green)',
  assigned:  'var(--cyan)',
  leave:     'var(--gold)',
  partial:   'var(--purple)',
}

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  draft:     'var(--text2)',
  active:    'var(--cyan)',
  on_hold:   'var(--gold)',
  completed: 'var(--green)',
  archived:  'var(--text2)',
}

export const LEAVE_STATUS_COLOR: Record<LeaveStatus, string> = {
  pending:  'var(--gold)',
  approved: 'var(--green)',
  refused:  'var(--pink)',
}

// ─────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────

export const AVATAR_CLASS: Record<AvatarColor, string> = {
  green:  'av-green',
  pink:   'av-pink',
  cyan:   'av-cyan',
  gold:   'av-gold',
  purple: 'av-purple',
}

// ─────────────────────────────────────────────────────────────
// OCCUPANCY / PROGRESS
// ─────────────────────────────────────────────────────────────

/** Couleur de la barre de progression d'occupation (≠ marge). */
export function progressColor(pct: number): string {
  if (pct >= 80) return 'var(--green)'
  if (pct >= 50) return 'var(--gold)'
  return 'var(--cyan)'
}

// ─────────────────────────────────────────────────────────────
// MISC
// ─────────────────────────────────────────────────────────────

/** Pluralisation simple FR : consultant / consultants */
export function pluralFr(n: number, singular: string, plural?: string): string {
  return n <= 1 ? singular : (plural ?? `${singular}s`)
}

/** Tronque un texte long avec ellipsis */
export function truncate(str: string, max = 30): string {
  return str.length > max ? `${str.slice(0, max)}…` : str
}
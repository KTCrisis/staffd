/**
 * lib/mission.ts
 * How a mission is sold, and what it is worth. Pure, no I/O.
 *   régie   : days are sold — revenue = daily rate × days
 *   forfait : a fixed price — revenue = budget_total
 */

export type BillingMode = 'regie' | 'forfait'
export const BILLING_MODES: BillingMode[] = ['regie', 'forfait']

export interface MissionMoney {
  billing_mode?: string | null
  tjm_vendu?:    number | null
  jours_vendus?: number | null
  budget_total?: number | null
}

/** Contracted revenue of a project, or null when it cannot be known yet. */
export function projectRevenue(p: MissionMoney): number | null {
  if (p.billing_mode === 'forfait') return p.budget_total != null ? Number(p.budget_total) : null
  if (p.tjm_vendu == null || p.jours_vendus == null) return null
  return Math.round(Number(p.tjm_vendu) * Number(p.jours_vendus) * 100) / 100
}

/** "Ab Conseil → Mobilize" when the mission is billed through an intermediary. */
export function billedChain(clientName?: string | null, endClientName?: string | null): string {
  if (!clientName) return endClientName ?? '—'
  return endClientName && endClientName !== clientName ? `${clientName} → ${endClientName}` : clientName
}

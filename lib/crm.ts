/**
 * lib/crm.ts
 * Pure helpers for the pre-sales pipeline (opportunities). No I/O.
 *
 * Stages are tenant vocabulary (companies.crm_settings.stages), not a SQL
 * enum: they are parsed defensively and fall back to DEFAULT_STAGES.
 * Status (open/won/lost/abandoned) is fixed, because reporting depends on it.
 */

export interface Stage {
  key:         string
  label:       string
  probability: number
  order:       number
}

export type OpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned'
export type DealType          = 'regie' | 'forfait' | 'sourcing'

export const DEAL_TYPES: DealType[] = ['regie', 'forfait', 'sourcing']

export const DEFAULT_STAGES: Stage[] = [
  { key: 'qualification', label: 'Qualification', probability: 10, order: 1 },
  { key: 'proposition',   label: 'Proposition',   probability: 40, order: 2 },
  { key: 'negociation',   label: 'Négociation',   probability: 70, order: 3 },
]

/** Minimal shape the helpers need; the table row satisfies it. */
export interface PipelineItem {
  stage:           string
  status:          string
  amount:          number | null
  probability:     number | null
  weighted_amount: number | null
}

export function parseStages(crmSettings: unknown): Stage[] {
  const raw = (crmSettings as { stages?: unknown } | null)?.stages
  if (!Array.isArray(raw)) return DEFAULT_STAGES
  const stages = raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s, i) => ({
      key:         typeof s.key === 'string' ? s.key.trim() : '',
      label:       typeof s.label === 'string' && s.label.trim() ? s.label.trim() : String(s.key ?? ''),
      probability: clampPct(Number(s.probability)),
      order:       Number.isFinite(Number(s.order)) ? Number(s.order) : i + 1,
    }))
    .filter(s => s.key)
  const unique = stages.filter((s, i) => stages.findIndex(x => x.key === s.key) === i)
  return unique.length ? unique.sort((a, b) => a.order - b.order) : DEFAULT_STAGES
}

export function clampPct(n: number): number {
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0
}

/** Default probability when an opportunity enters a stage. */
export function stageProbability(stages: Stage[], key: string): number {
  return stages.find(s => s.key === key)?.probability ?? 0
}

/** Régie and sourcing are sold by the day: amount = daily rate × days. */
export function estimateAmount(dealType: DealType, tjmVendu?: number | null, jours?: number | null): number | null {
  if (dealType === 'forfait') return null
  if (!tjmVendu || !jours) return null
  return Math.round(tjmVendu * jours * 100) / 100
}

export interface PipelineKpis {
  openCount:     number
  openAmount:    number
  weighted:      number
  wonAmount:     number
  lostCount:     number
  /** won / (won + lost), null while nothing is closed */
  winRate:       number | null
}

export function pipelineKpis(items: PipelineItem[]): PipelineKpis {
  const open = items.filter(i => i.status === 'open')
  const won  = items.filter(i => i.status === 'won')
  const lost = items.filter(i => i.status === 'lost')
  const sum  = (xs: PipelineItem[], f: (i: PipelineItem) => number | null) =>
    xs.reduce((s, i) => s + (Number(f(i)) || 0), 0)
  return {
    openCount:  open.length,
    openAmount: sum(open, i => i.amount),
    weighted:   sum(open, i => i.weighted_amount),
    wonAmount:  sum(won,  i => i.amount),
    lostCount:  lost.length,
    winRate:    won.length + lost.length ? won.length / (won.length + lost.length) : null,
  }
}

/**
 * Open opportunities grouped by stage, in stage order. Opportunities whose
 * stage is no longer configured land in a trailing "unknown" column instead
 * of disappearing.
 */
export function groupByStage<T extends PipelineItem>(items: T[], stages: Stage[]): { stage: Stage; items: T[] }[] {
  const open    = items.filter(i => i.status === 'open')
  const known   = new Set(stages.map(s => s.key))
  const columns = stages.map(stage => ({ stage, items: open.filter(i => i.stage === stage.key) }))
  const orphans = open.filter(i => !known.has(i.stage))
  if (orphans.length) {
    columns.push({ stage: { key: '__unknown', label: '?', probability: 0, order: Infinity }, items: orphans })
  }
  return columns
}

// ── Contacts & interactions ───────────────────────────────────

export const BUYING_ROLES     = ['sponsor', 'decideur', 'acheteur', 'prescripteur', 'utilisateur'] as const
export const INTERACTION_TYPES = ['appel', 'reunion', 'email', 'note', 'relance'] as const
export type BuyingRole      = (typeof BUYING_ROLES)[number]
export type InteractionType = (typeof INTERACTION_TYPES)[number]

export type FollowUpState = 'none' | 'done' | 'overdue' | 'today' | 'upcoming'

/** State of an interaction's next step, relative to `today` (YYYY-MM-DD). */
export function followUpState(
  i: { next_step: string | null; next_step_due: string | null; next_step_done: boolean },
  today: string,
): FollowUpState {
  if (!i.next_step && !i.next_step_due) return 'none'
  if (i.next_step_done)                 return 'done'
  if (!i.next_step_due)                 return 'upcoming'
  if (i.next_step_due < today)          return 'overdue'
  if (i.next_step_due === today)        return 'today'
  return 'upcoming'
}

/** Open follow-ups first (earliest due first), then the journal, newest first. */
export function sortJournal<T extends { occurred_at: string; next_step: string | null; next_step_due: string | null; next_step_done: boolean }>(
  items: T[], today: string,
): T[] {
  const pending = (i: T) => { const s = followUpState(i, today); return s === 'overdue' || s === 'today' || s === 'upcoming' }
  return [...items].sort((a, b) => {
    const pa = pending(a), pb = pending(b)
    if (pa !== pb) return pa ? -1 : 1
    if (pa && pb) return (a.next_step_due ?? '9999').localeCompare(b.next_step_due ?? '9999')
    return b.occurred_at.localeCompare(a.occurred_at)
  })
}

/**
 * lib/data/ebitda.ts
 * EBITDA courant — compte de résultat mensuel et charges d'exploitation
 * (cf. migration 0008 : ebitda_monthly(), operating_expenses).
 */

'use client'
import { supabase }    from '../supabase'
import { useSupabase } from './core'

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

export interface EbitdaMonth {
  month:                string   // 'YYYY-MM-01'
  prorata:              number   // 1 pour un mois clos ; jours ouvrés écoulés / total pour le mois en cours
  ca_regie:             number
  ca_forfait:           number
  ca_total:             number
  ca_en_attente:        number
  cout_salaries:        number
  cout_freelances:      number
  cout_honoraires:      number
  charges_exploitation: number
  ebitda:               number
}

export const EXPENSE_CATEGORIES = [
  'locaux', 'outils', 'rc_compta', 'marketing', 'deplacements', 'formation', 'autre',
] as const
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export interface OperatingExpense {
  id:          string
  company_id:  string
  category:    ExpenseCategory
  label:       string
  amount:      number
  recurrence:  'once' | 'monthly'
  start_month: string
  end_month:   string | null
}

export type OperatingExpenseInput = Omit<OperatingExpense, 'id'>

// ──────────────────────────────────────────────────────────────
// HOOKS — QUERIES
// ──────────────────────────────────────────────────────────────

/** Mois de janvier de `year` au mois en cours (ou décembre si l'année est close). */
export function useEbitda(companyId: string | undefined, year: number, dep?: number) {
  return useSupabase<EbitdaMonth[]>(async () => {
    if (!companyId) return []
    const { data, error } = await supabase.rpc('ebitda_monthly', {
      p_company_id: companyId,
      p_from:       `${year}-01-01`,
      p_to:         `${year}-12-31`,
    })
    if (error) throw new Error(error.message)
    return (data ?? []).map(r => Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, k === 'month' ? v : Number(v)]),
    )) as unknown as EbitdaMonth[]
  }, [companyId, year, dep])
}

export function useOperatingExpenses(companyId: string | undefined, dep?: number) {
  return useSupabase<OperatingExpense[]>(async () => {
    if (!companyId) return []
    const { data, error } = await supabase
      .from('operating_expenses')
      .select('id, company_id, category, label, amount, recurrence, start_month, end_month')
      .eq('company_id', companyId)
      .order('start_month', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(r => ({ ...r, amount: Number(r.amount) })) as OperatingExpense[]
  }, [companyId, dep])
}

/** Consultants présents sans date d'entrée : l'EBITDA les compte depuis la création de la fiche. */
export function useConsultantsWithoutEntryDate(companyId: string | undefined, dep?: number) {
  return useSupabase<number>(async () => {
    if (!companyId) return 0
    const { count, error } = await supabase
      .from('consultants')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('date_entree', null)
    if (error) throw new Error(error.message)
    return count ?? 0
  }, [companyId, dep])
}

// ──────────────────────────────────────────────────────────────
// MUTATIONS
// ──────────────────────────────────────────────────────────────

export async function createOperatingExpense(input: OperatingExpenseInput) {
  const { error } = await supabase.from('operating_expenses').insert(input)
  if (error) throw new Error(error.message)
}

export async function deleteOperatingExpense(id: string) {
  const { error } = await supabase.from('operating_expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

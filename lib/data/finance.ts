/**
 * lib/data/finance.ts
 * Finance — types · hooks (project financials & consultant profitability)
 */

'use client'
import { useActiveTenant } from '../tenant-context'
import { supabase }        from '../supabase'
import { useSupabase }     from './core'
import type { ContractType } from './consultants'

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

export interface ProjectFinancials {
  id:                 string
  name:               string
  client:             string
  tjm_vendu:          number | null
  jours_vendus:       number | null
  tjm_reel:           number | null
  marge_par_jour:     number | null
  marge_brute_totale: number | null
  marge_pct:          number | null
  team_size:          number
}

export interface ConsultantProfitability {
  consultant_id:   string
  name:            string
  role:            string
  initials:        string
  avatar_color:    string | null
  contract_type:   ContractType
  tjm_cout:        number | null
  tjm_cible:       number | null
  occupancy_rate:  number | null
  status:          string
  nb_assignments:  number
  jours_generes:   number | null
  ca_genere:       number | null
  cout_consultant: number | null
  marge_brute:     number | null
  marge_pct:       number | null
}

// ──────────────────────────────────────────────────────────────
// HOOKS — QUERIES
// ──────────────────────────────────────────────────────────────

export function useProjectFinancials() {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase
      .from('project_financials')
      .select('*')
      .order('marge_brute_totale', { ascending: false })
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []) as ProjectFinancials[]
  }, [activeTenantId])
}

export function useConsultantProfitability() {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase
      .from('consultant_profitability')
      .select('*')
      .order('ca_genere', { ascending: false })
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []) as ConsultantProfitability[]
  }, [activeTenantId])
}
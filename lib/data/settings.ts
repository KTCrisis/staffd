/**
 * lib/data/settings.ts
 * Company settings — types · hooks · mutations (billing · AI · HR)
 */

'use client'
import { useActiveTenant } from '../tenant-context'
import { supabase }        from '../supabase'
import { useSupabase }     from './core'

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

export interface BillingSettings {
  address?:         string
  siret?:           string
  tva_number?:      string
  tva_rate?:        number
  bank_iban?:       string
  bank_bic?:        string
  bank_name?:       string
  invoice_prefix?:  string
  invoice_counter?: number
  payment_terms?:   number
  legal_mention?:   string
}

export interface MCPTool {
  id:       string
  name:     string
  endpoint: string
  enabled:  boolean
}

export interface AISettings {
  ollama_endpoint?: string   // ex: https://ollama.yourdomain.com
  ollama_model?:    string   // ex: kimi-k2.5:cloud
  agents_enabled?:  boolean
  mcp_tools?:       MCPTool[]
}

export interface PublicHoliday {
  date:        string   // 'YYYY-MM-DD'
  localName:   string
  name:        string
  countryCode: string
}

export interface HRSettings {
  country_code:             string   // 'FR' | 'BE' | 'CH' | 'LU' | 'DE'
  default_cp:               number   // jours CP nouveaux consultants (défaut 25)
  default_rtt:              number   // jours RTT nouveaux consultants (défaut 10)
  working_days_per_year:    number   // jours travaillés/an (défaut 218)
  cra_submission_deadline:  number   // jour du mois limite soumission CRA (défaut 5)
  leave_auto_approve:       boolean  // auto-approve les congés sans manager (défaut false)
}

export interface CompanySettings {
  id:               string
  name:             string
  slug:             string | null
  mode:             'solo' | 'team'
  billing_settings: BillingSettings
  ai_settings:      AISettings
  hr_settings:      HRSettings
}

// ──────────────────────────────────────────────────────────────
// HOOK — QUERY
// ──────────────────────────────────────────────────────────────

export function useCompanySettings(dep?: number) {
  const { activeTenantId } = useActiveTenant()
  return useSupabase<CompanySettings>(async () => {
    let q = supabase
      .from('companies')
      .select('id, name, slug, mode, billing_settings, ai_settings, hr_settings')
    if (activeTenantId) q = q.eq('id', activeTenantId)
    const { data, error } = await q.single()
    if (error) throw new Error(error.message)
    return {
      ...data,
      billing_settings: (data.billing_settings ?? {}) as BillingSettings,
      ai_settings:      (data.ai_settings      ?? {}) as AISettings,
      hr_settings:      (data.hr_settings       ?? {
        country_code:            'FR',
        default_cp:              25,
        default_rtt:             10,
        working_days_per_year:   218,
        cra_submission_deadline: 5,
        leave_auto_approve:      false,
      }) as HRSettings,
    } as CompanySettings
  }, [dep, activeTenantId])
}

// ──────────────────────────────────────────────────────────────
// MUTATIONS
// ──────────────────────────────────────────────────────────────

export async function updateCompanySettings(payload: {
  name?:             string
  billing_settings?: BillingSettings
  companyId?:        string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const companyId = payload.companyId ?? user?.app_metadata?.company_id
  if (!companyId) throw new Error('No company context')

  if (payload.billing_settings) {
    const { error } = await supabase.rpc('merge_billing_settings', {
      p_company_id: companyId,
      p_patch:      payload.billing_settings,
    })
    if (error) throw new Error(error.message)
  }

  if (payload.name) {
    const { error } = await supabase
      .from('companies')
      .update({ name: payload.name })
      .eq('id', companyId)
    if (error) throw new Error(error.message)
  }
}

export async function updateAISettings(payload: {
  ai_settings: AISettings
  companyId?:  string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const companyId = payload.companyId ?? user?.app_metadata?.company_id
  if (!companyId) throw new Error('No company context')

  const { error } = await supabase.rpc('merge_ai_settings', {
    p_company_id: companyId,
    p_patch:      payload.ai_settings,
  })
  if (error) throw new Error(error.message)
}

export async function updateHRSettings(payload: {
  hr_settings: Partial<HRSettings>
  companyId?:  string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const companyId = payload.companyId ?? user?.app_metadata?.company_id
  if (!companyId) throw new Error('No company context')

  const { error } = await supabase.rpc('merge_hr_settings', {
    p_company_id: companyId,
    p_patch:      payload.hr_settings,
  })
  if (error) throw new Error(error.message)
}
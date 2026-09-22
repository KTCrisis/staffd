/**
 * lib/data/crm.ts
 * Mutations for the pre-sales pipeline. Reads happen server-side in the page
 * (app/[locale]/(app)/bids/page.tsx); RLS restricts opportunities to
 * admin/manager of the tenant.
 */

import { supabase } from '../supabase'
import type { TablesInsert, TablesUpdate } from '@/types/supabase'
import type { OpportunityStatus } from '../crm'

export type OpportunityInput  = TablesInsert<'opportunities'>
export type OpportunityPatch  = TablesUpdate<'opportunities'>

export async function createOpportunity(data: OpportunityInput) {
  const { error } = await supabase.from('opportunities').insert(data)
  if (error) throw new Error(error.message)
}

export async function updateOpportunity(id: string, data: OpportunityPatch) {
  const { error } = await supabase.from('opportunities').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Close or reopen an opportunity. A lost deal must say why (DB constraint
 * opportunities_lost_reason_check); reopening clears the reason.
 */
export async function setOpportunityStatus(id: string, status: OpportunityStatus, lostReason?: string) {
  if (status === 'won') { await winOpportunity(id); return }
  const patch: OpportunityPatch = {
    status,
    lost_reason: status === 'lost' ? (lostReason?.trim() || null) : null,
    // A lost deal is certain; the weighted pipeline only counts open ones.
    // (Won deals go through winOpportunity, which sets 100.)
    ...((status === 'lost' || status === 'abandoned') && { probability: 0 }),
  }
  if (status === 'lost' && !patch.lost_reason) throw new Error('lost_reason_required')
  await updateOpportunity(id, patch)
}

/**
 * Mark the deal won and create its project (client, end client, rate, days,
 * dates) in one transaction — see migration 0003. Idempotent: a deal that
 * already has a project keeps it. Returns the project id.
 */
export async function winOpportunity(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('win_opportunity', { p_opportunity_id: id })
  if (error) throw new Error(error.message)
  return data as string
}

export async function deleteOpportunity(id: string) {
  const { error } = await supabase.from('opportunities').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Contacts ──────────────────────────────────────────────────

export type ContactInput = TablesInsert<'contacts'>
export type ContactPatch = TablesUpdate<'contacts'>

/** Only one primary contact per client: promoting one demotes the others. */
async function demoteOtherPrimaries(clientId: string, keepId?: string) {
  let q = supabase.from('contacts').update({ is_primary: false }).eq('client_id', clientId).eq('is_primary', true)
  if (keepId) q = q.neq('id', keepId)
  const { error } = await q
  if (error) throw new Error(error.message)
}

export async function createContact(data: ContactInput) {
  if (data.is_primary) await demoteOtherPrimaries(data.client_id)
  const { error } = await supabase.from('contacts').insert(data)
  if (error) throw new Error(error.message)
}

export async function updateContact(id: string, clientId: string, data: ContactPatch) {
  if (data.is_primary) await demoteOtherPrimaries(clientId, id)
  const { error } = await supabase.from('contacts').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Interactions (journal + follow-ups) ───────────────────────

export type InteractionInput = TablesInsert<'interactions'>

export async function createInteraction(data: InteractionInput) {
  const { error } = await supabase.from('interactions').insert(data)
  if (error) throw new Error(error.message)
}

export async function setNextStepDone(id: string, done: boolean) {
  const { error } = await supabase.from('interactions').update({ next_step_done: done }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteInteraction(id: string) {
  const { error } = await supabase.from('interactions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

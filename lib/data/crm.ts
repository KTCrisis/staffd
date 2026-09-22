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
  const patch: OpportunityPatch = {
    status,
    lost_reason: status === 'lost' ? (lostReason?.trim() || null) : null,
    // A closed deal is certain either way; the weighted pipeline only counts open ones.
    ...(status === 'won' && { probability: 100 }),
    ...((status === 'lost' || status === 'abandoned') && { probability: 0 }),
  }
  if (status === 'lost' && !patch.lost_reason) throw new Error('lost_reason_required')
  await updateOpportunity(id, patch)
}

export async function deleteOpportunity(id: string) {
  const { error } = await supabase.from('opportunities').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

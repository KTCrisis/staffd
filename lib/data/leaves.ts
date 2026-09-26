/**
 * lib/data/leaves.ts
 * Congés — types · mapper · hooks · mutations
 */

'use client'
import { useActiveTenant }  from '../tenant-context'
import { supabase }         from '../supabase'
import { useSupabase }      from './core'
import type { LeaveRequest } from '@/types'

// ──────────────────────────────────────────────────────────────
// MAPPER
// ──────────────────────────────────────────────────────────────

function toLeaveRequest(row: Record<string, unknown>): LeaveRequest {
  return {
    id:             row.id as string,
    consultantId:   row.consultant_id as string,
    consultantName: row.consultant_name as string,
    type:           row.type as LeaveRequest['type'],
    startDate:      row.start_date as string,
    endDate:        row.end_date as string,
    days:           row.days as number,
    status:         row.status as LeaveRequest['status'],
    impactWarning:  row.impact_warning as string | undefined,
    motif:          row.motif as string | undefined,
  }
}

// ──────────────────────────────────────────────────────────────
// HOOKS — QUERIES
// ──────────────────────────────────────────────────────────────

export function useLeaveRequests(dep?: number) {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase
      .from('leave_requests')
      .select('*, consultants (name)')
      .order('created_at', { ascending: false })
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []).map(row => toLeaveRequest({
      ...row,
      consultant_name: (row.consultants as { name: string } | null)?.name ?? '',
    }))
  }, [dep, activeTenantId])
}

// ──────────────────────────────────────────────────────────────
// MUTATIONS
// ──────────────────────────────────────────────────────────────

export async function createLeaveRequest(data: {
  motif?:        string
  consultant_id: string
  company_id:    string
  type:          'CP' | 'RTT' | 'Sans solde' | 'Absence autorisée'
  start_date:    string
  end_date:      string
  days:          number
}) {
  const { error } = await supabase
    .from('leave_requests')
    .insert({ ...data, status: 'pending' })
  if (error) throw new Error(error.message)
}

export async function approveLeave(id: string) {
  // Le solde (CP, RTT) est ajusté par le déclencheur leave_requests_balance (0012)
  const { error } = await supabase
    .from('leave_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function refuseLeave(id: string) {
  const { error } = await supabase
    .from('leave_requests')
    .update({ status: 'refused', reviewed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
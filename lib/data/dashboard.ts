/**
 * lib/data/dashboard.ts
 * Dashboard — hooks KPI + activité récente
 */

'use client'
import { useActiveTenant }           from '../tenant-context'
import { supabase }                  from '../supabase'
import { useSupabase }               from './core'
import type { KpiData, ActivityItem } from '@/types'

// ──────────────────────────────────────────────────────────────
// HOOKS — QUERIES
// ──────────────────────────────────────────────────────────────

export function useKpi(): { data: KpiData | null; loading: boolean; error: string | null } {
  const { activeTenantId } = useActiveTenant()
  return useSupabase<KpiData>(async () => {
    let qC = supabase.from('consultants').select('status, occupancy_rate')
    let qP = supabase.from('projects').select('status')
    let qL = supabase.from('leave_requests').select('status')
    if (activeTenantId) {
      qC = qC.eq('company_id', activeTenantId)
      qP = qP.eq('company_id', activeTenantId)
      qL = qL.eq('company_id', activeTenantId)
    }
    const [consultantsRes, projectsRes, leavesRes] = await Promise.all([qC, qP, qL])
    if (consultantsRes.error) throw new Error(consultantsRes.error.message)
    if (projectsRes.error)    throw new Error(projectsRes.error.message)
    if (leavesRes.error)      throw new Error(leavesRes.error.message)

    const consultants  = consultantsRes.data ?? []
    const projects     = projectsRes.data    ?? []
    const leaves       = leavesRes.data      ?? []
    const active       = consultants.filter((c: any) => c.status !== 'leave')
    const avgOccupancy = active.length
      ? Math.round(active.reduce((s: any, c: any) => s + (c.occupancy_rate ?? 0), 0) / active.length)
      : 0

    return {
      activeConsultants: active.length,
      totalConsultants:  consultants.length,
      activeProjects:    projects.filter((p: any) => p.status === 'active').length,
      pendingLeaves:     leaves.filter((l: any) => l.status === 'pending').length,
      occupancyRate:     avgOccupancy,
    } satisfies KpiData
  }, [activeTenantId])
}

export function useActivity(limit = 10) {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase
      .from('activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => ({
      id:      row.id as string,
      type:    row.type as ActivityItem['type'],
      message: row.message as string,
      time:    row.created_at as string,
      read:    row.read as boolean,
    } satisfies ActivityItem))
  }, [limit, activeTenantId])
}
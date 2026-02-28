/**
 * lib/data.ts
 * Remplace lib/mock.ts — toutes les données viennent de Supabase
 * Usage : import { useConsultants } from '@/lib/data'
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase }            from './supabase'
import type { Consultant, Project, LeaveRequest, KpiData, ActivityItem } from '@/types'

// ── Types Supabase (snake_case → camelCase) ──────────────────

function toConsultant(row: Record<string, unknown>): Consultant {
  return {
    id:             row.id as string,
    name:           row.name as string,
    initials:       row.initials as string,
    role:           row.role as string,
    avatarColor:    (row.avatar_color as Consultant['avatarColor']) ?? 'green',
    status:         row.status as Consultant['status'],
    currentProject: (row.project_names as string[] | null)?.[0] ?? undefined,
    leaveDaysLeft:  (row.leave_days_left as number) ?? 0,
    occupancyRate:  (row.occupancy_rate as number) ?? 0,
  }
}

function toProject(row: Record<string, unknown>): Project {
  return {
    id:             row.id as string,
    name:           row.name as string,
    client:         row.client as string,
    consultantIds:  (row.consultant_ids as string[]) ?? [],
    progress:       (row.progress as number) ?? 0,
    endDate:        row.end_date as string,
    status:         row.status as Project['status'],
  }
}

function toLeaveRequest(row: Record<string, unknown>): LeaveRequest {
  return {
    id:              row.id as string,
    consultantId:    row.consultant_id as string,
    consultantName:  row.consultant_name as string,
    type:            row.type as LeaveRequest['type'],
    startDate:       row.start_date as string,
    endDate:         row.end_date as string,
    days:            row.days as number,
    status:          row.status as LeaveRequest['status'],
    impactWarning:   row.impact_warning as string | undefined,
  }
}

// ── Hook générique ────────────────────────────────────────────

function useSupabase<T>(fetcher: () => Promise<T>) {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetcher()
      .then(d  => { setData(d); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

// ── Consultants ───────────────────────────────────────────────

export function useConsultants() {
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('consultant_occupancy')   // vue calculée
      .select('*')
      .order('name')

    if (error) throw new Error(error.message)
    return (data ?? []).map(toConsultant)
  })
}

// ── Projets ───────────────────────────────────────────────────

export function useProjects() {
  return useSupabase(async () => {
    // Jointure pour récupérer les IDs des consultants assignés
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        assignments (consultant_id)
      `)
      .order('end_date')

    if (error) throw new Error(error.message)

    return (data ?? []).map(row => toProject({
      ...row,
      consultant_ids: (row.assignments as { consultant_id: string }[])
        .map(a => a.consultant_id),
    }))
  })
}

// ── Project financials (vue marge/TJM) ───────────────────────

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

export function useProjectFinancials() {
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('project_financials')
      .select('*')
      .order('marge_brute_totale', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as ProjectFinancials[]
  })
}

// ── Congés ────────────────────────────────────────────────────

export function useLeaveRequests() {
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        consultants (name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return (data ?? []).map(row => toLeaveRequest({
      ...row,
      consultant_name: (row.consultants as { name: string } | null)?.name ?? '',
    }))
  })
}

// ── KPIs dashboard ────────────────────────────────────────────

export function useKpi(): { data: KpiData | null; loading: boolean; error: string | null } {
  return useSupabase(async () => {
    const [consultantsRes, projectsRes, leavesRes] = await Promise.all([
      supabase.from('consultants').select('status, occupancy_rate'),
      supabase.from('projects').select('status'),
      supabase.from('leave_requests').select('status'),
    ])

    if (consultantsRes.error) throw new Error(consultantsRes.error.message)
    if (projectsRes.error)    throw new Error(projectsRes.error.message)
    if (leavesRes.error)      throw new Error(leavesRes.error.message)

    const consultants = consultantsRes.data ?? []
    const projects    = projectsRes.data    ?? []
    const leaves      = leavesRes.data      ?? []

    const active         = consultants.filter(c => c.status !== 'leave')
    const avgOccupancy   = active.length
      ? Math.round(active.reduce((s, c) => s + (c.occupancy_rate ?? 0), 0) / active.length)
      : 0

    return {
      activeConsultants: active.length,
      totalConsultants:  consultants.length,
      activeProjects:    projects.filter(p => p.status === 'active').length,
      pendingLeaves:     leaves.filter(l => l.status === 'pending').length,
      occupancyRate:     avgOccupancy,
    } satisfies KpiData
  })
}

// ── Activity feed ─────────────────────────────────────────────

export function useActivity(limit = 10) {
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)

    return (data ?? []).map(row => ({
      id:      row.id as string,
      type:    row.type as ActivityItem['type'],
      message: row.message as string,
      time:    row.created_at as string,
      read:    row.read as boolean,
    } satisfies ActivityItem))
  })
}

// ── Mutations ─────────────────────────────────────────────────

export async function approveLeave(id: string) {
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

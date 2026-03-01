// @ts-nocheck
/**
 * lib/data.ts
 * Remplace lib/mock.ts — toutes les données viennent de Supabase
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase }            from './supabase'
import type { Consultant, Project, Client, LeaveRequest, KpiData, ActivityItem } from '@/types'

// ── Mappers ──────────────────────────────────────────────────

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
    email:          row.email as string | undefined,
    tjm:            row.tjm as number | undefined,
    stack:          row.stack as string[] | undefined,
    leaveDaysTotal: row.leave_days_total as number | undefined,
  }
}

function toProject(row: Record<string, unknown>): Project {
  return {
    id:            row.id as string,
    name:          row.name as string,
    client:        (row.client_name as string) ?? '',
    consultantIds: (row.consultant_ids as string[]) ?? [],
    progress:      (row.progress as number) ?? 0,
    startDate:     row.start_date as string | undefined,
    endDate:       row.end_date as string | undefined,
    status:        row.status as Project['status'],
    clientName:    row.client_name as string | undefined,
    clientId:      row.client_id as string | undefined,
    reference:     row.reference as string | undefined,
    description:   row.description as string | undefined,
    budgetTotal:   row.budget_total as number | undefined,
    tjmVendu:      row.tjm_vendu as number | undefined,
    joursVendus:   row.jours_vendus as number | undefined,
    isInternal:    (row.is_internal as boolean) ?? false,
    companyId:     row.company_id as string | undefined,
  }
}

function toClient(row: Record<string, unknown>): Client {
  return {
    id:             row.id as string,
    companyId:      row.company_id as string,
    name:           row.name as string,
    sector:         row.sector as string | undefined,
    website:        row.website as string | undefined,
    contactName:    row.contact_name as string | undefined,
    contactEmail:   row.contact_email as string | undefined,
    contactPhone:   row.contact_phone as string | undefined,
    notes:          row.notes as string | undefined,
    activeProjects: row.active_projects as number | undefined,
    totalProjects:  row.total_projects as number | undefined,
  }
}

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
  }
}

// ── Hook générique ────────────────────────────────────────────

function useSupabase<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetcher()
      .then(d  => { setData(d); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, deps)

  return { data, loading, error }
}

// ── Consultants ───────────────────────────────────────────────

export function useConsultants(dep?: number) {
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('consultant_occupancy')
      .select('*')
      .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []).map(toConsultant)
  }, [dep])
}

// ── Projets ───────────────────────────────────────────────────

export function useProjects(dep?: number, includeArchived = false) {
  return useSupabase(async () => {
    let query = supabase
      .from('projects')
      .select('*, assignments (consultant_id)')
      .order('end_date')
    if (!includeArchived) query = query.neq('status', 'archived')
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => toProject({
      ...row,
      consultant_ids: (row.assignments as { consultant_id: string }[]).map((a: any) => a.consultant_id),
    }))
  }, [dep, includeArchived])
}

// ── Clients ───────────────────────────────────────────────────

export function useClients(dep?: number) {
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*, projects!client_id (id, status)')
      .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => toClient({
      ...row,
      active_projects: (row.projects as any[]).filter((p: any) => p.status === 'active').length,
      total_projects:  (row.projects as any[]).length,
    }))
  }, [dep])
}

export function useClient(id: string, dep?: number) {
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return toClient(data)
  }, [id, dep])
}

export function useClientProjects(clientId: string, dep?: number) {
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*, assignments (consultant_id)')
      .eq('client_id', clientId)
      .order('end_date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => toProject({
      ...row,
      consultant_ids: (row.assignments as { consultant_id: string }[]).map((a: any) => a.consultant_id),
    }))
  }, [clientId, dep])
}

// ── Project financials ────────────────────────────────────────

export interface ProjectFinancials {
  id: string; name: string; client: string
  tjm_vendu: number | null; jours_vendus: number | null
  tjm_reel: number | null; marge_par_jour: number | null
  marge_brute_totale: number | null; marge_pct: number | null
  team_size: number
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
      .select('*, consultants (name)')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => toLeaveRequest({
      ...row,
      consultant_name: (row.consultants as { name: string } | null)?.name ?? '',
    }))
  })
}

// ── KPIs ─────────────────────────────────────────────────────

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
    return (data ?? []).map((row: any) => ({
      id:      row.id as string,
      type:    row.type as ActivityItem['type'],
      message: row.message as string,
      time:    row.created_at as string,
      read:    row.read as boolean,
    } satisfies ActivityItem))
  })
}

// ── Mutations Leaves ──────────────────────────────────────────

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

// ── Mutations Consultant ──────────────────────────────────────

export async function createConsultant(data: {
  name: string; initials: string; email?: string; role: string
  avatar_color: string; stack: string[]; status: string
  tjm?: number; leave_days_total?: number
}) {
  const { error } = await supabase.from('consultants').insert({ ...data, leave_days_taken: 0, occupancy_rate: 0 })
  if (error) throw new Error(error.message)
}

export async function updateConsultant(id: string, data: {
  name?: string; initials?: string; email?: string; role?: string
  avatar_color?: string; stack?: string[]; status?: string
  tjm?: number; leave_days_total?: number
}) {
  const { error } = await supabase.from('consultants').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteConsultant(id: string) {
  const { error } = await supabase.from('consultants').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Mutations Projet ──────────────────────────────────────────

export type ProjectInput = {
  name: string; client_name?: string; client_id?: string
  reference?: string; description?: string
  start_date?: string; end_date?: string
  tjm_vendu?: number; jours_vendus?: number; budget_total?: number
  is_internal: boolean
  status?: 'draft' | 'active' | 'on_hold' | 'completed' | 'archived'
  company_id: string
}

export async function createProject(data: ProjectInput) {
  const { error } = await supabase.from('projects').insert({ ...data, status: data.status ?? 'draft', progress: 0 })
  if (error) throw new Error(error.message)
}

export async function updateProject(id: string, data: Partial<ProjectInput>) {
  const { error } = await supabase.from('projects').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function archiveProject(id: string) {
  const { error } = await supabase.from('projects').update({ status: 'archived' }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Mutations Client ──────────────────────────────────────────

export type ClientInput = {
  name: string; sector?: string; website?: string
  contact_name?: string; contact_email?: string; contact_phone?: string
  notes?: string; company_id: string
}

export async function createClient(data: ClientInput) {
  const { error } = await supabase.from('clients').insert(data)
  if (error) throw new Error(error.message)
}

export async function updateClient(id: string, data: Partial<ClientInput>) {
  const { error } = await supabase.from('clients').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
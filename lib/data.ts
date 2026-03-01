/**
 * lib/data.ts
 * Remplace lib/mock.ts — toutes les données viennent de Supabase
 */

'use client'

import { DependencyList, useEffect, useState } from 'react'
import { supabase }            from './supabase'
import type { Consultant, Project, Client, LeaveRequest, KpiData, ActivityItem } from '@/types'

interface ConsultantOccupancyRow {
  id: string
  user_id: string | null
  name: string
  initials: string
  role: string
  avatar_color: Consultant['avatarColor'] | null
  status: Consultant['status']
  project_names: string[] | null
  leave_days_left: number | null
  occupancy_rate: number | null
  email?: string
  tjm?: number
  stack?: string[]
  leave_days_total?: number
  rtt_total?: number
  rtt_taken?: number
  rtt_left?: number
}

interface ProjectTeamMemberRow {
  id: string
  name: string
  initials: string
  avatar_color: string
}

interface ProjectAssignmentRow {
  consultant_id: string
  consultants: ProjectTeamMemberRow | null
}

interface ProjectRow {
  id: string
  name: string
  client_name: string | null
  consultant_ids?: string[]
  progress: number | null
  start_date?: string
  end_date?: string
  status: Project['status']
  client_id?: string
  reference?: string
  description?: string
  budget_total?: number
  tjm_vendu?: number
  jours_vendus?: number
  is_internal?: boolean
  company_id?: string
  team?: Project['team']
  assignments?: ProjectAssignmentRow[]
}

interface ClientProjectRow {
  id: string
  status: Project['status']
}

interface ClientRow {
  id: string
  company_id: string
  name: string
  sector?: string
  website?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  notes?: string
  active_projects?: number
  total_projects?: number
  projects?: ClientProjectRow[]
}

interface LeaveRequestRow {
  id: string
  consultant_id: string
  consultant_name: string
  type: LeaveRequest['type']
  start_date: string
  end_date: string
  days: number
  status: LeaveRequest['status']
  impact_warning?: string
  motif?: string
}

interface LeaveRequestWithConsultantRow extends Omit<LeaveRequestRow, 'consultant_name'> {
  consultant_name?: string
  consultants?: { name: string } | null
}

interface ActivityRow {
  id: string
  type: ActivityItem['type']
  message: string
  created_at: string
  read: boolean
}

interface KpiConsultantRow {
  status: Consultant['status']
  occupancy_rate: number | null
}

interface KpiStatusRow {
  status: string
}

// ── Mappers ──────────────────────────────────────────────────

function toConsultant(row: ConsultantOccupancyRow): Consultant {
  return {
    id:             row.id as string,
    user_id:        row.user_id as string | null,
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
    rttTotal:      row.rtt_total as number | undefined,
    rttTaken:      row.rtt_taken as number | undefined,
    rttLeft: row.rtt_left as number | undefined,
  }
}

function toProject(row: ProjectRow): Project {
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
    team:          row.team ?? [],
  }
}

function toClient(row: ClientRow): Client {
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

function toLeaveRequest(row: LeaveRequestRow): LeaveRequest {
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

// ── Hook générique ────────────────────────────────────────────

function useSupabase<T>(fetcher: () => Promise<T>, deps: DependencyList = []) {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetcher()
      .then(d  => { setData(d); setError(null) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, ...deps])

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
      .select(`
        *,
        assignments (
          consultant_id,
          consultants ( id, name, initials, avatar_color )
        )
      `)
      .order('end_date')
    if (!includeArchived) query = query.neq('status', 'archived')
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return ((data ?? []) as ProjectRow[]).map((row) => {
      const team = (row.assignments ?? [])
        .map((assignment) => assignment.consultants)
        .filter(Boolean)
        .map((member) => ({
          id:          member.id,
          name:        member.name,
          initials:    member.initials,
          avatarColor: member.avatar_color,
        }))
      return toProject({
        ...row,
        consultant_ids: team.map((member) => member.id),
        team,
      })
    })
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
    return ((data ?? []) as ClientRow[]).map((row) => toClient({
      ...row,
      active_projects: (row.projects ?? []).filter((project) => project.status === 'active').length,
      total_projects:  (row.projects ?? []).length,
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
    return ((data ?? []) as ProjectRow[]).map((row) => toProject({
      ...row,
      consultant_ids: (row.assignments ?? []).map((assignment) => assignment.consultant_id),
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
  export function useLeaveRequests(dep?: number) {
    return useSupabase(async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, consultants (name)')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return ((data ?? []) as LeaveRequestWithConsultantRow[]).map((row) => toLeaveRequest({
        ...row,
        consultant_name: row.consultants?.name ?? '',
      }))
    }, [dep])
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

    const consultants  = (consultantsRes.data ?? []) as KpiConsultantRow[]
    const projects     = (projectsRes.data ?? []) as KpiStatusRow[]
    const leaves       = (leavesRes.data ?? []) as KpiStatusRow[]
    const active       = consultants.filter((consultant) => consultant.status !== 'leave')
    const avgOccupancy = active.length
      ? Math.round(active.reduce((sum, consultant) => sum + (consultant.occupancy_rate ?? 0), 0) / active.length)
      : 0

    return {
      activeConsultants: active.length,
      totalConsultants:  consultants.length,
      activeProjects:    projects.filter((project) => project.status === 'active').length,
      pendingLeaves:     leaves.filter((leave) => leave.status === 'pending').length,
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
    return ((data ?? []) as ActivityRow[]).map((row) => ({
      id:      row.id,
      type:    row.type,
      message: row.message,
      time:    row.created_at,
      read:    row.read,
    } satisfies ActivityItem))
  })
}

// ── Mutations Leaves ──────────────────────────────────────────

export async function approveLeave(id: string) {
  // Récupérer le type et les jours avant d'approuver
  const { data: req, error: fetchErr } = await supabase
    .from('leave_requests')
    .select('consultant_id, days, type')
    .eq('id', id)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)

  const { error } = await supabase
    .from('leave_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  // Incrémenter le compteur selon le type
  if (req?.type === 'CP') {
    await supabase.rpc('increment_leave_taken', {
      p_consultant_id: req.consultant_id,
      p_days: req.days,
    })
  } else if (req?.type === 'RTT') {
    await supabase.rpc('increment_rtt_taken', {
      p_consultant_id: req.consultant_id,
      p_days: req.days,
    })
  }
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
  company_id?: string  // ← ajouter
}) {
  const { error } = await supabase
    .from('consultants')
    .insert({ ...data, leave_days_taken: 0, occupancy_rate: 0 })
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


// ── Type Assignment enrichi ───────────────────────────────────

export interface AssignmentWithConsultant {
  id:          string
  consultantId: string
  projectId:   string
  allocation:  number
  startDate?:  string
  endDate?:    string
  // Champs consultants joinés
  name:        string
  initials:    string
  role:        string
  avatarColor: string
}

// ── Hook : assignments d'un projet ───────────────────────────

export function useProjectAssignments(projectId: string, dep?: number) {
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('assignments')
      .select('*, consultants (name, initials, role, avatar_color)')
      .eq('project_id', projectId)
      .order('created_at')
    if (error) throw new Error(error.message)
    return ((data ?? []) as Array<{
      id: string
      consultant_id: string
      project_id: string
      allocation: number
      start_date?: string
      end_date?: string
      consultants?: { name?: string; initials?: string; role?: string; avatar_color?: string } | null
    }>).map((row) => ({
      id:           row.id,
      consultantId: row.consultant_id,
      projectId:    row.project_id,
      allocation:   row.allocation,
      startDate:    row.start_date,
      endDate:      row.end_date,
      name:         row.consultants?.name ?? '',
      initials:     row.consultants?.initials ?? '',
      role:         row.consultants?.role ?? '',
      avatarColor:  row.consultants?.avatar_color ?? 'green',
    } satisfies AssignmentWithConsultant))
  }, [projectId, dep])
}

// ── Mutation : créer un assignment ────────────────────────────

export type AssignmentInput = {
  company_id:    string
  consultant_id: string
  project_id:    string
  allocation:    number
  start_date:    string
  end_date:      string
}

export async function createAssignment(data: AssignmentInput) {
  const { error } = await supabase.from('assignments').insert(data)
  if (error) throw new Error(error.message)
}

// ── Mutation : supprimer un assignment ────────────────────────

export async function deleteAssignment(id: string) {
  const { error } = await supabase.from('assignments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Mutation : demande de congés ────────────────────────

export async function createLeaveRequest(data: {
  motif?: string
  consultant_id: string
  company_id: string
  type: 'CP' | 'RTT' | 'Sans solde' | 'Absence autorisée'
  start_date: string
  end_date: string
  days: number
}) {
  const { error } = await supabase
    .from('leave_requests')
    .insert({ ...data, status: 'pending' })
  if (error) throw new Error(error.message)
}

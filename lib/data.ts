// @ts-nocheck
/**
 * lib/data.ts
 * Couche données Supabase — hooks + mutations
 * Toutes les données viennent de Supabase (pas de mock)
 */

'use client'
import { useActiveTenant } from './tenant-context'
import { useEffect, useState } from 'react'
import { supabase }            from './supabase'
import type {
  Consultant, Project, Client,
  LeaveRequest, KpiData, ActivityItem,
} from '@/types'

// ══════════════════════════════════════════════════════════════
// TYPES LOCAUX
// ══════════════════════════════════════════════════════════════

export type ContractType = 'employee' | 'freelance'

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

export interface AssignmentWithConsultant {
  id:           string
  consultantId: string
  projectId:    string
  allocation:   number
  startDate?:   string
  endDate?:     string
  name:         string
  initials:     string
  role:         string
  avatarColor:  string
}

export interface ConsultantInput {
  company_id?:          string
  name:                 string
  initials:             string
  email?:               string
  role:                 string
  avatar_color:         string
  stack:                string[]
  status:               string
  contract_type:        ContractType
  salaire_annuel_brut?: number
  charges_pct?:         number
  jours_travailles?:    number
  tjm_facture?:         number
  tjm?:                 number
  tjm_cible?:           number
  leave_days_total?:    number
}

export interface AssignmentInput {
  company_id:              string
  consultant_id:           string
  project_id:              string
  allocation:              number
  start_date:              string
  end_date:                string
  tjm_facture_override?:   number
}

export interface ProjectInput {
  name:          string
  client_name?:  string
  client_id?:    string
  reference?:    string
  description?:  string
  start_date?:   string
  end_date?:     string
  tjm_vendu?:    number
  jours_vendus?: number
  budget_total?: number
  is_internal:   boolean
  status?:       'draft' | 'active' | 'on_hold' | 'completed' | 'archived'
  company_id:    string
}

export interface ClientInput {
  name:           string
  sector?:        string
  website?:       string
  contact_name?:  string
  contact_email?: string
  contact_phone?: string
  notes?:         string
  company_id:     string
}

export interface Timesheet {
  id:           string
  consultantId: string
  projectId:    string | null
  date:         string
  value:        number
  status:       'draft' | 'submitted' | 'approved'
}

export interface TeamMember {
  id:            string
  name:          string
  initials:      string
  avatar_color:  string
  role:          string
  status:        string
  contract_type: ContractType
}

export interface Team {
  id:                  string
  companyId:           string
  name:                string
  description:         string | null
  managerId:           string | null
  managerName:         string | null
  managerInitials:     string | null
  managerAvatarColor:  string | null
  members:             TeamMember[]
  createdAt:           string
}

export interface TeamInput {
  company_id:    string
  name:          string
  description?:  string | null
  manager_id?:   string | null
}

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

export interface AISettings {
  ollama_endpoint?:  string   // ex: https://ollama.yourdomain.com
  ollama_model?:     string   // ex: kimi-k2.5:cloud
  agents_enabled?:   boolean
  mcp_tools?:        MCPTool[]
}

export interface MCPTool {
  id:       string
  name:     string
  endpoint: string
  enabled:  boolean
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

// ══════════════════════════════════════════════════════════════
// MAPPERS
// ══════════════════════════════════════════════════════════════

function toConsultant(row: Record<string, unknown>): Consultant {
  return {
    id:                  row.id as string,
    user_id:             row.user_id as string | null,
    name:                row.name as string,
    initials:            row.initials as string,
    role:                row.role as string,
    avatarColor:         (row.avatar_color as Consultant['avatarColor']) ?? 'green',
    status:              row.status as Consultant['status'],
    currentProject:      (row.project_names as string[] | null)?.[0] ?? undefined,
    leaveDaysLeft:       (row.leave_days_left as number) ?? 0,
    occupancyRate:       (row.occupancy_rate as number) ?? 0,
    email:               row.email as string | undefined,
    stack:               row.stack as string[] | undefined,
    leaveDaysTotal:      row.leave_days_total as number | undefined,
    rttTotal:            row.rtt_total as number | undefined,
    rttTaken:            row.rtt_taken as number | undefined,
    rttLeft:             row.rtt_left as number | undefined,
    contractType:        (row.contract_type as ContractType) ?? 'employee',
    tjm:                 row.tjm as number | undefined,
    tjmFacture:          row.tjm_facture as number | undefined,
    tjmCible:            row.tjm_cible as number | undefined,
    tjmCoutReel:         row.tjm_cout_reel as number | undefined,
    salaireAnnuelBrut:   row.salaire_annuel_brut as number | undefined,
    chargesPct:          row.charges_pct as number | undefined,
    joursTravailles:     row.jours_travailles as number | undefined,
    teamId:              row.team_id as string | undefined,
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
    isActivityType: (row.is_activity_type as boolean) ?? false,
    companyId:     row.company_id as string | undefined,
    team:          (row.team as any[]) ?? [],
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
    motif:          row.motif as string | undefined,
  }
}

function toTimesheet(row: Record<string, unknown>): Timesheet {
  return {
    id:           row.id           as string,
    consultantId: row.consultant_id as string,
    projectId:    (row.project_id  as string | null) ?? null,
    date:         row.date         as string,
    value:        (row.value       as number) ?? 1,
    status:       (row.status      as Timesheet['status']) ?? 'draft',
  }
}

// ══════════════════════════════════════════════════════════════
// HOOK GÉNÉRIQUE useSupabase
// ══════════════════════════════════════════════════════════════

function useSupabase<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetcher()
      .then(d  => { if (!cancelled) { setData(d);          setError(null)    } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
      .finally(()=> { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}

// ══════════════════════════════════════════════════════════════
// QUERIES — CONSULTANTS
// ══════════════════════════════════════════════════════════════

export function useConsultants(dep?: number) {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase.from('consultant_occupancy').select('*').order('name')
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []).map(toConsultant)
  }, [dep, activeTenantId])
}

// ══════════════════════════════════════════════════════════════
// QUERIES — PROJETS
// ══════════════════════════════════════════════════════════════

export function useProjects(dep?: number, includeArchived = false) {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase
      .from('projects')
      .select(`*, assignments ( consultant_id, consultants ( id, name, initials, avatar_color ) )`)
      .order('end_date')
    if (!includeArchived) q = q.neq('status', 'archived')
    if (activeTenantId)   q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => {
      const team = (row.assignments as any[])
        .map((a: any) => a.consultants)
        .filter(Boolean)
        .map((c: any) => ({
          id: c.id as string, name: c.name as string,
          initials: c.initials as string, avatarColor: c.avatar_color as string,
        }))
      return toProject({ ...row, consultant_ids: team.map((c: any) => c.id), team })
    })
  }, [dep, includeArchived, activeTenantId])
}

export function useAssignments() {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase.from('assignments').select('*, projects(name)')
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data ?? []
  }, [activeTenantId])
}

export function useProjectAssignments(projectId: string, dep?: number) {
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('assignments')
      .select('*, consultants (name, initials, role, avatar_color)')
      .eq('project_id', projectId)
      .order('created_at')
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => ({
      id:           row.id as string,
      consultantId: row.consultant_id as string,
      projectId:    row.project_id as string,
      allocation:   row.allocation as number,
      startDate:    row.start_date as string | undefined,
      endDate:      row.end_date as string | undefined,
      name:         row.consultants?.name ?? '',
      initials:     row.consultants?.initials ?? '',
      role:         row.consultants?.role ?? '',
      avatarColor:  row.consultants?.avatar_color ?? 'green',
    } satisfies AssignmentWithConsultant))
  }, [projectId, dep])
  // Pas de filtre activeTenantId ici — scoped par projectId, pas besoin de cross-tenant
}

export function useConsultantProjectsMap() {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase
      .from('assignments')
      .select('consultant_id, projects!inner ( id, name, status )')
    if (activeTenantId) q = (q as any).eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)

    const map: Record<string, { id: string; name: string }[]> = {}
    for (const row of data ?? []) {
      const cid  = row.consultant_id as string
      const proj = row.projects as { id: string; name: string; status: string } | null
      if (!proj) continue
      if (proj.status === 'completed' || proj.status === 'archived') continue
      if (!map[cid]) map[cid] = []
      if (!map[cid].some(p => p.id === proj.id)) {
        map[cid].push({ id: proj.id, name: proj.name })
      }
    }
    return map
  }, [activeTenantId])
}

// ══════════════════════════════════════════════════════════════
// QUERIES — CLIENTS
// ══════════════════════════════════════════════════════════════

export function useClients(dep?: number) {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase.from('clients').select('*, projects!client_id (id, status)').order('name')
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => toClient({
      ...row,
      active_projects: (row.projects as any[]).filter((p: any) => p.status === 'active').length,
      total_projects:  (row.projects as any[]).length,
    }))
  }, [dep, activeTenantId])
}

export function useClient(id: string, dep?: number) {
  // Pas de filtre activeTenantId — scoped par id
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('clients').select('*').eq('id', id).single()
    if (error) throw new Error(error.message)
    return toClient(data)
  }, [id, dep])
}

export function useClientProjects(clientId: string, dep?: number) {
  // Pas de filtre activeTenantId — scoped par clientId
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

// ══════════════════════════════════════════════════════════════
// QUERIES — CONGÉS
// ══════════════════════════════════════════════════════════════

export function useLeaveRequests(dep?: any) {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase
      .from('leave_requests')
      .select('*, consultants (name)')
      .order('created_at', { ascending: false })
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => toLeaveRequest({
      ...row,
      consultant_name: (row.consultants as { name: string } | null)?.name ?? '',
    }))
  }, [dep, activeTenantId])
}

// ══════════════════════════════════════════════════════════════
// QUERIES — TIMESHEETS
// ══════════════════════════════════════════════════════════════

export function useTimesheets(monday: Date) {
  const { activeTenantId } = useActiveTenant()
  const from = monday.toISOString().slice(0, 10)
  const to   = new Date(monday.getTime() + 4 * 86_400_000).toISOString().slice(0, 10)
  return useSupabase(async () => {
    let q = supabase.from('timesheets').select('*').gte('date', from).lte('date', to).order('date')
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []).map(toTimesheet)
  }, [from, activeTenantId])
}

export function useInternalProjectTypes() {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase
      .from('projects')
      .select('id, name')
      .eq('is_internal', true)
      .eq('is_activity_type', true) 
      .neq('status', 'archived')
      .order('name')
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []) as { id: string; name: string }[]
  }, [activeTenantId])
}

// ══════════════════════════════════════════════════════════════
// QUERIES — FINANCE
// ══════════════════════════════════════════════════════════════

export function useProjectFinancials() {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase.from('project_financials').select('*').order('marge_brute_totale', { ascending: false })
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []) as ProjectFinancials[]
  }, [activeTenantId])
}

export function useConsultantProfitability() {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase.from('consultant_profitability').select('*').order('ca_genere', { ascending: false })
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []) as ConsultantProfitability[]
  }, [activeTenantId])
}

// ══════════════════════════════════════════════════════════════
// QUERIES — DASHBOARD
// ══════════════════════════════════════════════════════════════

export function useKpi(): { data: KpiData | null; loading: boolean; error: string | null } {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
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
      pendingLeaves:     leaves.filter((l: any)   => l.status === 'pending').length,
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

// ══════════════════════════════════════════════════════════════
// QUERIES — ÉQUIPES
// ══════════════════════════════════════════════════════════════

export function useTeams(dep?: number) {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase.from('team_details').select('*').order('name')
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any): Team => ({
      id:                 row.id,
      companyId:          row.company_id,
      name:               row.name,
      description:        row.description ?? null,
      managerId:          row.manager_id ?? null,
      managerName:        row.manager_name ?? null,
      managerInitials:    row.manager_initials ?? null,
      managerAvatarColor: row.manager_avatar_color ?? null,
      members:            (row.members as TeamMember[]) ?? [],
      createdAt:          row.created_at,
    }))
  }, [dep, activeTenantId])
}

// ══════════════════════════════════════════════════════════════
// MUTATIONS — CONSULTANTS
// ══════════════════════════════════════════════════════════════

export async function createConsultant(data: ConsultantInput) {
  const { error } = await supabase
    .from('consultants')
    .insert({ ...data, leave_days_taken: 0, occupancy_rate: 0 })
  if (error) throw new Error(error.message)
}

export async function updateConsultant(id: string, data: Partial<ConsultantInput>) {
  const { error } = await supabase.from('consultants').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteConsultant(id: string) {
  const { error } = await supabase.from('consultants').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ══════════════════════════════════════════════════════════════
// MUTATIONS — PROJETS
// ══════════════════════════════════════════════════════════════

export async function createProject(data: ProjectInput) {
  const { error } = await supabase
    .from('projects')
    .insert({ ...data, status: data.status ?? 'draft', progress: 0 })
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

// ══════════════════════════════════════════════════════════════
// MUTATIONS — CLIENTS
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
// MUTATIONS — CONGÉS
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
// MUTATIONS — TIMESHEETS
// ══════════════════════════════════════════════════════════════

export async function upsertTimesheet(params: {
  consultantId: string
  projectId:    string | null
  date:         string
  value:        number
}): Promise<Timesheet> {
  const { consultantId, projectId, date, value } = params

  const { data: { user } } = await supabase.auth.getUser()
  const { data: consultantRow } = await supabase
    .from('consultants')
    .select('company_id')
    .eq('id', consultantId)
    .single()

  const companyId = user?.app_metadata?.company_id ?? consultantRow?.company_id ?? null

  const { data, error } = await supabase
    .from('timesheets')
    .upsert(
      {
        company_id:    companyId,
        consultant_id: consultantId,
        project_id:    projectId,
        date,
        value,
        status:        'draft',
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'consultant_id,date,project_id' }
    )
    .select()
    .single()

  if (error) throw new Error(error.message)
  return toTimesheet(data as Record<string, unknown>)
}

export async function submitTimesheets(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('timesheets')
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'draft')
  if (error) throw new Error(error.message)
}

export async function approveTimesheets(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('timesheets')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'submitted')
  if (error) throw new Error(error.message)
}

// ══════════════════════════════════════════════════════════════
// MUTATIONS — ASSIGNMENTS
// ══════════════════════════════════════════════════════════════

export async function createAssignment(data: AssignmentInput) {
  const { error } = await supabase.from('assignments').insert(data)
  if (error) throw new Error(error.message)
}

export async function deleteAssignment(id: string) {
  const { error } = await supabase.from('assignments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ══════════════════════════════════════════════════════════════
// MUTATIONS — ÉQUIPES
// ══════════════════════════════════════════════════════════════

export async function createTeam(data: TeamInput): Promise<string> {
  const { data: row, error } = await supabase
    .from('teams')
    .insert(data)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return row.id
}

export async function updateTeam(id: string, data: Partial<TeamInput>) {
  const { error } = await supabase.from('teams').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTeam(id: string) {
  // team_members supprimés en cascade par FK
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Ajouter un consultant dans une équipe.
 * UNIQUE(consultant_id) → upsert sur conflit pour changer d'équipe sans erreur.
 */
export async function addTeamMember(teamId: string, consultantId: string) {
  const { error } = await supabase
    .from('team_members')
    .upsert(
      { team_id: teamId, consultant_id: consultantId },
      { onConflict: 'consultant_id' }  // remplace l'équipe précédente si déjà assigné
    )
  if (error) throw new Error(error.message)
}

/** Retirer un consultant de son équipe */
export async function removeTeamMember(consultantId: string) {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('consultant_id', consultantId)
  if (error) throw new Error(error.message)
}

// ══════════════════════════════════════════════════════════════
// QUERIES — COMPANY SETTINGS
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
// MUTATIONS — COMPANY SETTINGS
// ══════════════════════════════════════════════════════════════

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
// ══════════════════════════════════════════════════════════════
// TYPES — LEAVE OVERLAY (timesheets)
// ══════════════════════════════════════════════════════════════

export interface LeaveOverlay {
  consultantId: string
  date:         string
  type:         string   // 'CP' | 'RTT' | 'Sans solde' | 'Absence autorisée'
  leaveId:      string
}

// ══════════════════════════════════════════════════════════════
// HOOK — APPROVED LEAVES FOR WEEK (timesheets overlay)
// ══════════════════════════════════════════════════════════════

export function useApprovedLeavesForWeek(weekStart: string, weekEnd: string) {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase
      .from('leave_requests')
      .select('id, consultant_id, type, start_date, end_date')
      .eq('status', 'approved')
      .lte('start_date', weekEnd)
      .gte('end_date', weekStart)
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)

    // Expand each leave into individual day entries
    const overlays: LeaveOverlay[] = []
    for (const row of data ?? []) {
      const start = new Date(row.start_date as string)
      const end   = new Date(row.end_date   as string)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10)
        if (dateStr >= weekStart && dateStr <= weekEnd) {
          overlays.push({
            consultantId: row.consultant_id as string,
            date:         dateStr,
            type:         row.type          as string,
            leaveId:      row.id            as string,
          })
        }
      }
    }
    return overlays
  }, [weekStart, weekEnd, activeTenantId])
}
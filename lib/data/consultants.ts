/**
 * lib/data/consultants.ts
 * Consultants & assignments — types · mapper · hooks · mutations
 */

'use client'
import { useActiveTenant }  from '../tenant-context'
import { supabase }         from '../supabase'
import { useSupabase }      from './core'
import type { Consultant }  from '@/types'

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

export type ContractType = 'employee' | 'freelance'

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
  company_id:             string
  consultant_id:          string
  project_id:             string
  allocation:             number
  start_date:             string
  end_date:               string
  tjm_facture_override?:  number
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

// ──────────────────────────────────────────────────────────────
// MAPPER
// ──────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────
// HOOKS — QUERIES
// ──────────────────────────────────────────────────────────────

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
  // Scoped par projectId — pas de filtre activeTenantId nécessaire
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
}

export function useConsultantProjectsMap() {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase
      .from('assignments')
      .select('consultant_id, projects!inner ( id, name, status )')
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)

    const map: Record<string, { id: string; name: string }[]> = {}
    for (const row of data ?? []) {
      const cid  = row.consultant_id as string
      // projects!inner peut être inféré comme tableau par le type Supabase généré
      const proj = row.projects as unknown as { id: string; name: string; status: string } | null
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

// ──────────────────────────────────────────────────────────────
// MUTATIONS
// ──────────────────────────────────────────────────────────────

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

export async function createAssignment(data: AssignmentInput) {
  const { error } = await supabase.from('assignments').insert(data)
  if (error) throw new Error(error.message)
}

export async function deleteAssignment(id: string) {
  const { error } = await supabase.from('assignments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
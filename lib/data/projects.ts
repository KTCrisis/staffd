/**
 * lib/data/projects.ts
 * Projets — types · mapper · hooks · mutations
 */

'use client'
import { useActiveTenant } from '../tenant-context'
import { supabase }        from '../supabase'
import { useSupabase }     from './core'
import type { Project }    from '@/types'

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────
// MAPPER
// ──────────────────────────────────────────────────────────────

function toProject(row: Record<string, unknown>): Project {
  return {
    id:             row.id as string,
    name:           row.name as string,
    client:         (row.client_name as string) ?? '',
    consultantIds:  (row.consultant_ids as string[]) ?? [],
    progress:       (row.progress as number) ?? 0,
    startDate:      row.start_date as string | undefined,
    endDate:        row.end_date as string | undefined,
    status:         row.status as Project['status'],
    clientName:     row.client_name as string | undefined,
    clientId:       row.client_id as string | undefined,
    reference:      row.reference as string | undefined,
    description:    row.description as string | undefined,
    budgetTotal:    row.budget_total as number | undefined,
    tjmVendu:       row.tjm_vendu as number | undefined,
    joursVendus:    row.jours_vendus as number | undefined,
    isInternal:     (row.is_internal as boolean) ?? false,
    companyId:      row.company_id as string | undefined,
    team:           (row.team as any[]) ?? [],
  }
}

// ──────────────────────────────────────────────────────────────
// HOOKS — QUERIES
// ──────────────────────────────────────────────────────────────

export function useProjects(dep?: number, includeArchived = false) {
  const { activeTenantId } = useActiveTenant()
  return useSupabase(async () => {
    let q = supabase
      .from('projects')
      .select(`*, assignments ( consultant_id, consultants ( id, name, initials, avatar_color ) )`)
      .eq('is_activity_type', false)
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

// ──────────────────────────────────────────────────────────────
// MUTATIONS
// ──────────────────────────────────────────────────────────────

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
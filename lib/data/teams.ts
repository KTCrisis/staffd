/**
 * lib/data/teams.ts
 * Équipes — types · hooks · mutations
 */

'use client'
import { useActiveTenant } from '../tenant-context'
import { supabase }        from '../supabase'
import { useSupabase }     from './core'
import type { ContractType } from './consultants'

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

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
  company_id:   string
  name:         string
  description?: string | null
  manager_id?:  string | null
}

// ──────────────────────────────────────────────────────────────
// HOOK — QUERY
// ──────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────
// MUTATIONS
// ──────────────────────────────────────────────────────────────

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
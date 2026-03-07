/**
 * lib/data/clients.ts
 * Clients — types · mapper · hooks · mutations
 */

'use client'
import { useActiveTenant } from '../tenant-context'
import { supabase }        from '../supabase'
import { useSupabase }     from './core'
import type { Client }     from '@/types'

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────
// MAPPER
// ──────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────
// HOOKS — QUERIES
// ──────────────────────────────────────────────────────────────

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
  // Scoped par id — pas de filtre activeTenantId nécessaire
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('clients').select('*').eq('id', id).single()
    if (error) throw new Error(error.message)
    return toClient(data)
  }, [id, dep])
}

export function useClientProjects(clientId: string, dep?: number) {
  // Scoped par clientId — pas de filtre activeTenantId nécessaire
  return useSupabase(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*, assignments (consultant_id)')
      .eq('client_id', clientId)
      .order('end_date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => ({
      ...row,
      consultant_ids: (row.assignments as { consultant_id: string }[]).map((a: any) => a.consultant_id),
    }))
  }, [clientId, dep])
}

// ──────────────────────────────────────────────────────────────
// MUTATIONS
// ──────────────────────────────────────────────────────────────

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
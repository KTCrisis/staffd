/**
 * lib/data/grades.ts
 * Grille par grade — types · hook · mutations (cf. migration 0005)
 */

'use client'
import { useActiveTenant } from '../tenant-context'
import { supabase }        from '../supabase'
import { useSupabase }     from './core'
import { DEFAULT_GRADES }  from '../grades'

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

export interface GradeRow {
  id:                 string
  company_id:         string
  label:              string
  position:           number
  tjm_cible:          number | null
  occupation_cible:   number | null
  cout_annuel_charge: number | null
}

export type GradeDraft = Omit<GradeRow, 'id' | 'company_id'> & { id?: string }

// ──────────────────────────────────────────────────────────────
// HOOK — QUERY
// ──────────────────────────────────────────────────────────────

export function useGrades(dep?: number) {
  const { activeTenantId } = useActiveTenant()
  return useSupabase<GradeRow[]>(async () => {
    let q = supabase
      .from('grades')
      .select('id, company_id, label, position, tjm_cible, occupation_cible, cout_annuel_charge')
      .order('position')
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []) as GradeRow[]
  }, [dep, activeTenantId])
}

// ──────────────────────────────────────────────────────────────
// MUTATIONS
// ──────────────────────────────────────────────────────────────

async function resolveCompanyId(companyId?: string) {
  if (companyId) return companyId
  const { data: { user } } = await supabase.auth.getUser()
  const id = user?.app_metadata?.company_id as string | undefined
  if (!id) throw new Error('No company context')
  return id
}

/**
 * Enregistre la grille complète : met à jour ou crée chaque ligne, supprime
 * celles qui ont disparu. Les consultants d'un grade supprimé perdent leur
 * grade (on delete set null) ; leur coût retombe sur le salaire ou le TJM.
 */
export async function saveGrades(drafts: GradeDraft[], removedIds: string[], companyId?: string) {
  const company_id = await resolveCompanyId(companyId)

  if (removedIds.length) {
    const { error } = await supabase.from('grades').delete().in('id', removedIds)
    if (error) throw new Error(error.message)
  }

  const rows = drafts.map((d, i) => ({ ...d, position: i, company_id }))
  const existing = rows.filter(r => r.id)
  const created  = rows.filter(r => !r.id).map(({ id: _id, ...r }) => r)

  if (existing.length) {
    const { error } = await supabase.from('grades').upsert(existing as (typeof existing[number] & { id: string })[])
    if (error) throw new Error(error.message)
  }
  if (created.length) {
    const { error } = await supabase.from('grades').insert(created)
    if (error) throw new Error(error.message)
  }
}

/** Crée la grille de référence du plan d'affaires (tenant sans grille). */
export async function seedDefaultGrades(companyId?: string) {
  const company_id = await resolveCompanyId(companyId)
  const { error } = await supabase
    .from('grades')
    .insert(DEFAULT_GRADES.map(g => ({ ...g, company_id })))
  if (error) throw new Error(error.message)
}

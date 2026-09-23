/**
 * lib/data/timesheets.ts
 * Timesheets & leave overlay — types · mapper · hooks · mutations
 */

'use client'
import { useActiveTenant } from '../tenant-context'
import { supabase }        from '../supabase'
import { useSupabase }     from './core'
import { toISO, addDays }  from '../utils'

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

export interface Timesheet {
  id:           string
  consultantId: string
  projectId:    string | null
  date:         string
  value:        number
  status:       'draft' | 'submitted' | 'approved'
}

export interface LeaveOverlay {
  consultantId: string
  date:         string
  type:         string   // 'CP' | 'RTT' | 'Sans solde' | 'Absence autorisée'
  leaveId:      string
}

// ──────────────────────────────────────────────────────────────
// MAPPER
// ──────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────
// HOOKS — QUERIES
// ──────────────────────────────────────────────────────────────

export function useTimesheets(monday: Date) {
  const { activeTenantId } = useActiveTenant()
  const from = toISO(monday)
  const to   = toISO(addDays(monday, 4))
  return useSupabase(async () => {
    let q = supabase.from('timesheets').select('*').gte('date', from).lte('date', to).order('date')
    if (activeTenantId) q = q.eq('company_id', activeTenantId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []).map(toTimesheet)
  }, [from, activeTenantId])
}

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

    // Expand chaque congé en entrées journalières
    const overlays: LeaveOverlay[] = []
    for (const row of data ?? []) {
      const start = new Date(row.start_date as string)
      const end   = new Date(row.end_date   as string)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = toISO(d)
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

// ──────────────────────────────────────────────────────────────
// MUTATIONS
// ──────────────────────────────────────────────────────────────

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

  // La grille porte une saisie par consultant et par jour : changer de projet
  // remplace la saisie du jour au lieu d'en ajouter une seconde (le plafond
  // de 1 jour/jour est garanti en base, cf. migration 0006).
  let others = supabase
    .from('timesheets')
    .delete()
    .eq('consultant_id', consultantId)
    .eq('date', date)
    .neq('status', 'approved')
  others = projectId ? others.neq('project_id', projectId) : others.not('project_id', 'is', null)
  const { error: delError } = await others
  if (delError) throw new Error(delError.message)

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

/**
 * Rouvre (validé → soumis) les CRA d'un consultant sur une période.
 * Admin seulement ; refusé si une facture issue des CRA couvre la période.
 * Retourne le nombre de lignes rouvertes.
 */
export async function reopenTimesheets(consultantId: string, start: string, end: string): Promise<number> {
  const { data, error } = await supabase.rpc('reopen_timesheets', {
    p_consultant_id: consultantId, p_start: start, p_end: end,
  })
  if (error) throw new Error(error.message)
  return (data as number | null) ?? 0
}

/** Codes d'erreur stables levés par la base (migration 0006). */
export const CRA_ERROR_CODES = [
  'CRA_DAY_CAP', 'CRA_ON_LEAVE', 'CRA_STATUS_FORBIDDEN', 'CRA_LOCKED', 'CRA_INVOICED', 'CRA_FORBIDDEN',
] as const
export type CraErrorCode = typeof CRA_ERROR_CODES[number]

/** Extrait le code CRA d'un message d'erreur, ou null. */
export function craErrorCode(message: string): CraErrorCode | null {
  return CRA_ERROR_CODES.find(c => message.includes(c)) ?? null
}

export async function approveTimesheets(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('timesheets')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'submitted')
  if (error) throw new Error(error.message)
}
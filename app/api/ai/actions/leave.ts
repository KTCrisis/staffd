// app/api/ai/actions/leave.ts
// Actions sur les demandes de congés
// Utilise la service role key pour bypasser RLS — exécuté côté serveur uniquement.

import type { ActionResult } from './index'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? ''
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY     ?? ''

const headers = {
  'apikey':        serviceKey,
  'Authorization': `Bearer ${serviceKey}`,
  'Content-Type':  'application/json',
}

// ── Helper — trouve la leave request pending d'un consultant ─
async function findPendingLeave(consultantName: string, leaveId?: string) {
  // Si on a l'ID direct, on l'utilise
  if (leaveId) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/leave_requests?id=eq.${leaveId}&status=eq.pending&select=id,consultant_id,type,start_date,end_date,days`,
      { headers }
    )
    const rows = await res.json()
    return rows?.[0] ?? null
  }

  // Sinon on cherche par nom de consultant
  // 1. Trouver le consultant
  const cRes = await fetch(
    `${supabaseUrl}/rest/v1/consultants?name=ilike.*${encodeURIComponent(consultantName)}*&select=id,name`,
    { headers }
  )
  const consultants = await cRes.json()
  if (!consultants?.length) return null

  const consultantId = consultants[0].id

  // 2. Trouver sa dernière leave pending
  const lRes = await fetch(
    `${supabaseUrl}/rest/v1/leave_requests?consultant_id=eq.${consultantId}&status=eq.pending&select=id,consultant_id,type,start_date,end_date,days&order=created_at.desc&limit=1`,
    { headers }
  )
  const leaves = await lRes.json()
  return leaves?.[0] ?? null
}

// ── approve_leave ─────────────────────────────────────────────
export async function approveLeave(
  consultantName: string,
  leaveId?: string
): Promise<ActionResult> {
  try {
    const leave = await findPendingLeave(consultantName, leaveId)

    if (!leave) {
      return {
        success: false,
        message: `No pending leave request found for **${consultantName}**.`,
      }
    }

    // Update statut
    const res = await fetch(
      `${supabaseUrl}/rest/v1/leave_requests?id=eq.${leave.id}`,
      {
        method:  'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ status: 'approved' }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return { success: false, message: `Database error: ${err}` }
    }

    // Log dans activity_feed
    // On récupère le company_id depuis le consultant
    const cRes = await fetch(
      `${supabaseUrl}/rest/v1/consultants?id=eq.${leave.consultant_id}&select=company_id,name`,
      { headers }
    )
    const [consultant] = await cRes.json()

    if (consultant?.company_id) {
      await fetch(`${supabaseUrl}/rest/v1/activity_feed`, {
        method:  'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body:    JSON.stringify({
          company_id: consultant.company_id,
          type:       'leave',
          message:    `${consultant.name} — congé ${leave.type} approuvé (${leave.start_date} → ${leave.end_date}) — via AI`,
          read:       false,
        }),
      })
    }

    return {
      success: true,
      message: `✓ Leave request approved for **${consultantName}** — ${leave.type} from ${leave.start_date} to ${leave.end_date} (${leave.days} day${leave.days > 1 ? 's' : ''}).`,
      data:    leave,
    }
  } catch (e) {
    return { success: false, message: `Error: ${String(e)}` }
  }
}

// ── refuse_leave ──────────────────────────────────────────────
export async function refuseLeave(
  consultantName: string,
  leaveId?:       string,
  reason?:        string
): Promise<ActionResult> {
  try {
    const leave = await findPendingLeave(consultantName, leaveId)

    if (!leave) {
      return {
        success: false,
        message: `No pending leave request found for **${consultantName}**.`,
      }
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/leave_requests?id=eq.${leave.id}`,
      {
        method:  'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ status: 'refused' }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return { success: false, message: `Database error: ${err}` }
    }

    // Log activity_feed
    const cRes = await fetch(
      `${supabaseUrl}/rest/v1/consultants?id=eq.${leave.consultant_id}&select=company_id,name`,
      { headers }
    )
    const [consultant] = await cRes.json()

    if (consultant?.company_id) {
      await fetch(`${supabaseUrl}/rest/v1/activity_feed`, {
        method:  'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body:    JSON.stringify({
          company_id: consultant.company_id,
          type:       'leave',
          message:    `${consultant.name} — congé ${leave.type} refusé${reason ? ` (${reason})` : ''} — via AI`,
          read:       false,
        }),
      })
    }

    const reasonStr = reason ? ` Reason: ${reason}.` : ''
    return {
      success: true,
      message: `✗ Leave request refused for **${consultantName}** — ${leave.type} from ${leave.start_date} to ${leave.end_date}.${reasonStr}`,
      data:    leave,
    }
  } catch (e) {
    return { success: false, message: `Error: ${String(e)}` }
  }
}
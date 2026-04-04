// app/api/ai/actions/project.ts

import type { ActionResult } from './index'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const headers = {
  'apikey':        serviceKey,
  'Authorization': `Bearer ${serviceKey}`,
  'Content-Type':  'application/json',
}

export async function updateProjectStatus(
  projectName: string,
  status:      'active' | 'on_hold' | 'completed' | 'draft',
  companyId:   string | null,
): Promise<ActionResult> {
  try {
    // Trouver le projet par nom — scoped by company_id
    const companyFilter = companyId ? `&company_id=eq.${companyId}` : ''
    const pRes = await fetch(
      `${supabaseUrl}/rest/v1/projects?name=ilike.*${encodeURIComponent(projectName)}*${companyFilter}&select=id,name,status,company_id&limit=1`,
      { headers }
    )
    const projects = await pRes.json()
    if (!projects?.length) {
      return { success: false, message: `Project **${projectName}** not found.` }
    }

    const project    = projects[0]
    const oldStatus  = project.status

    const res = await fetch(
      `${supabaseUrl}/rest/v1/projects?id=eq.${project.id}`,
      {
        method:  'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ status }),
      }
    )

    if (!res.ok) {
      return { success: false, message: `Database error: ${await res.text()}` }
    }

    // Log activity_feed
    await fetch(`${supabaseUrl}/rest/v1/activity_feed`, {
      method:  'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body:    JSON.stringify({
        company_id: project.company_id,
        type:       'milestone',
        message:    `${project.name} — statut mis à jour : ${oldStatus} → ${status} — via AI`,
        read:       false,
      }),
    })

    return {
      success: true,
      message: `✓ Project **${project.name}** status updated: ${oldStatus} → **${status}**.`,
      data:    project,
    }
  } catch (e) {
    return { success: false, message: `Error: ${String(e)}` }
  }
}
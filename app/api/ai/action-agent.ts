// app/api/ai/action-agent.ts
// Agent spécialisé actions — utilise le tool calling natif de kimi-k2.5
// Ne stream pas de texte : retourne un SSE event { action } pour confirmation UI
// puis exécute après confirmation.

import { TOOLS, type ToolCall }    from './actions/index'
import { approveLeave, refuseLeave } from './actions/leave'
import { updateProjectStatus }       from './actions/project'

const ACTION_SYSTEM_PROMPT = `You are an action executor for Staffd, a PSA platform.
The user wants to perform a write operation.

Available operations:
- approve_leave: approve a pending leave request
- refuse_leave: refuse a pending leave request (with optional reason)
- update_project_status: change project status (active|on_hold|completed|draft)

Instructions:
- Extract the action and parameters from the user message.
- Always call the matching tool — never respond with plain text.
- Match consultant names flexibly (first name, last name, or both).
- If a leave_id is provided, include it. Otherwise the system finds the latest pending request.
- If parameters are ambiguous, still call the best matching tool with what you have.`

// ── Exécute le tool call après confirmation ──────────────────
export async function executeAction(
  actionName: string,
  params:     Record<string, string>
): Promise<{ success: boolean; message: string }> {

  switch (actionName) {
    case 'approve_leave':
      return approveLeave(params.consultant_name, params.leave_id)

    case 'refuse_leave':
      return refuseLeave(params.consultant_name, params.leave_id, params.reason)

    case 'update_project_status':
      return updateProjectStatus(
        params.project_name,
        params.status as 'active' | 'on_hold' | 'completed' | 'draft'
      )

    default:
      return { success: false, message: `Unknown action: ${actionName}` }
  }
}

// ── Handler principal — appelé par route.ts ──────────────────
// Retourne un SSE event { action, params } pour que le frontend
// affiche la confirmation avant toute exécution.
export async function actionAgent(
  body:    { messages: { role: string; content: string }[] },
  apiKey:  string,
  model:   string,
  host:    string,
): Promise<Response> {

  const enc     = new TextEncoder()
  const sseEvt  = (payload: object) =>
    enc.encode(`data: ${JSON.stringify(payload)}\n\n`)
  const done    = enc.encode('data: [DONE]\n\n')

  const headers = {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'X-Accel-Buffering': 'no',
  }

  const lastUserMsg = body.messages.findLast(m => m.role === 'user')?.content ?? ''

  // ── Appel kimi avec tool calling — non streamé ───────────────
  let ollamaRes: Response
  try {
    ollamaRes = await fetch(`${host}/api/chat`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream:  false,
        tools:   TOOLS,
        options: { temperature: 0 },   // déterministe pour les actions
        messages: [
          { role: 'system', content: ACTION_SYSTEM_PROMPT },
          { role: 'user',   content: lastUserMsg },
        ],
      }),
    })
  } catch (e) {
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(sseEvt({ text: `⚠ Cannot reach Ollama: ${String(e)}` }))
          c.enqueue(done)
          c.close()
        },
      }),
      { headers }
    )
  }

  const raw = await ollamaRes.json()
  const toolCalls: ToolCall[] = raw?.message?.tool_calls ?? []

  // ── Pas de tool call détecté → fallback query normal ─────────
  if (!toolCalls.length) {
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(sseEvt({ text: raw?.message?.content ?? "I couldn't identify a specific action. Try being more explicit (e.g. 'approve Clara\\'s leave')." }))
          c.enqueue(done)
          c.close()
        },
      }),
      { headers }
    )
  }

  const call   = toolCalls[0]
  const action = call.function.name
  const params = call.function.arguments

  // ── Retourne l'event action au frontend pour confirmation ─────
  // Le frontend affiche un composant ActionConfirm avant d'exécuter.
  // L'exécution se fait via POST /api/ai/execute (voir route.ts).
  return new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(sseEvt({ action, params }))
        c.enqueue(done)
        c.close()
      },
    }),
    { headers }
  )
}
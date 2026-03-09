// app/api/ai/route.ts
// Orchestrateur — route vers QueryAgent ou ActionAgent selon le message.
// NB: pas de "export const runtime = 'edge'" — incompatible avec @supabase/supabase-js sur Cloudflare.

import { queryAgent }              from './query-agent'
import { actionAgent, executeAction } from './action-agent'

// Mots-clés qui suggèrent une intention d'action (pré-filtre cheap)
// Le vrai tool calling kimi confirme ou infirme ensuite.
const ACTION_KEYWORDS = /\b(approv|refuse|reject|assign|update|cancel|set status|mark as|valid|refus|affect|annul|accept|confirm|approuv)/i

// ── Auth helper ──────────────────────────────────────────────
function extractRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload?.app_metadata?.user_role ?? null
  } catch {
    return null
  }
}

// ── POST /api/ai — questions et analyses ─────────────────────
export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.OLLAMA_API_KEY
  const model  = process.env.OLLAMA_MODEL ?? 'kimi-k2.5:cloud'
  const host   = (process.env.OLLAMA_HOST ?? 'https://ollama.com').replace(/\/$/, '')

  const enc     = new TextEncoder()
  const sse     = (text: string) => enc.encode(`data: ${JSON.stringify({ text })}\n\n`)
  const done    = enc.encode('data: [DONE]\n\n')
  const headers = {
    'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no',
  }

  // ── Guards ───────────────────────────────────────────────────
  if (!apiKey) {
    return new Response(new ReadableStream({ start(c) {
      c.enqueue(sse('⚠ OLLAMA_API_KEY not configured.')); c.enqueue(done); c.close()
    }}), { headers })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const userToken  = authHeader.replace('Bearer ', '').trim()

  if (!userToken) {
    return new Response(new ReadableStream({ start(c) {
      c.enqueue(sse('⚠ Session expirée — veuillez vous reconnecter.')); c.enqueue(done); c.close()
    }}), { headers })
  }

  const role = extractRole(userToken)
  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(new ReadableStream({ start(c) {
      c.enqueue(sse('⚠ Accès refusé — console réservée aux administrateurs.')); c.enqueue(done); c.close()
    }}), { headers })
  }

  let body: { messages: { role: string; content: string }[]; cmd?: string }
  try { body = await req.json() }
  catch { return new Response('Bad request', { status: 400 }) }

  // ── Routing query vs action ───────────────────────────────────
  const lastMsg = body.messages.findLast(m => m.role === 'user')?.content ?? ''

  if (ACTION_KEYWORDS.test(lastMsg)) {
    // → ActionAgent : tool calling kimi, pas de stream texte
    //   Retourne { action, params } pour confirmation UI
    return actionAgent(body, apiKey, model, host)
  }

  // → QueryAgent : comportement actuel, stream texte
  return queryAgent(body, userToken, apiKey, model, host)
}

// ── POST /api/ai/execute — exécution après confirmation UI ───
// Appelé par le frontend quand l'user clique "Confirm" sur ActionConfirm.
export async function PUT(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const userToken  = authHeader.replace('Bearer ', '').trim()
  const role       = extractRole(userToken)

  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    })
  }

  let body: { action: string; params: Record<string, string> }
  try { body = await req.json() }
  catch { return new Response('Bad request', { status: 400 }) }

  const result = await executeAction(body.action, body.params)

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
}
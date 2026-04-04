// app/api/ai/route.ts
// Orchestrateur — route vers QueryAgent ou ActionAgent selon le message.
// NB: pas de "export const runtime = 'edge'" — incompatible avec @supabase/supabase-js sur Cloudflare.

import { createClient } from '@supabase/supabase-js'
import { queryAgent }              from './query-agent'
import { actionAgent, executeAction } from './action-agent'

// Mots-clés qui suggèrent une intention d'action (pré-filtre cheap)
// Le vrai tool calling kimi confirme ou infirme ensuite.
const ACTION_KEYWORDS = /\b(approv|refuse|reject|assign|update|cancel|set status|mark as|valid|refus|affect|annul|accept|confirm|approuv)/i

// ── Auth helper — server-side JWT verification via Supabase ──
async function verifyUser(token: string): Promise<{
  role: string | null
  companyId: string | null
  userId: string | null
}> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { role: null, companyId: null, userId: null }
    return {
      role:      user.app_metadata?.user_role ?? null,
      companyId: user.app_metadata?.company_id ?? null,
      userId:    user.id,
    }
  } catch {
    return { role: null, companyId: null, userId: null }
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

  const { role, companyId } = await verifyUser(userToken)
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

// ── PUT /api/ai — exécution après confirmation UI ────────────
// Appelé par le frontend quand l'user clique "Confirm" sur ActionConfirm.
export async function PUT(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const userToken  = authHeader.replace('Bearer ', '').trim()
  const { role, companyId } = await verifyUser(userToken)

  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!companyId && role !== 'super_admin') {
    return new Response(JSON.stringify({ success: false, message: 'No company associated' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    })
  }

  let body: { action: string; params: Record<string, string> }
  try { body = await req.json() }
  catch { return new Response('Bad request', { status: 400 }) }

  const result = await executeAction(body.action, body.params, companyId)

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
}
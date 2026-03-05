// app/api/ai/route.ts
// NB: pas de "export const runtime = 'edge'" — OpenNext/Cloudflare Pages gère ça automatiquement.
// L'ajouter cause un conflit de bundling ("Cannot read properties of undefined").

const SYSTEM_PROMPT = `You are STAFF7_AGENT, an embedded AI assistant inside Staffd — a SaaS platform for consulting firms to manage consultants, projects, timesheets, leaves, and financials.
You have access to real-time context from Supabase (injected below).
Rules: be direct, analytical, no fluff. Format numbers clearly. Use **bold** for names/numbers. Respond in the user's language (FR or EN). Never invent data.`

async function fetchContext(cmd: string, url: string, key: string): Promise<string> {
  if (!url || !key) return '{}'
  const h = { 'apikey': key, 'Authorization': `Bearer ${key}` }
  const q = (table: string, select: string, filter = '') =>
    fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`, { headers: h })
      .then(r => r.json()).catch(() => [])
  try {
    if (cmd.startsWith('/fin')) {
      return JSON.stringify({ financials: await q('project_financials', '*') })
    }
    if (cmd.startsWith('/timesheet')) {
      const mon = new Date()
      mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1))
      const from = mon.toISOString().slice(0, 10)
      const to = new Date(mon.getTime() + 4 * 86400000).toISOString().slice(0, 10)
      const [c, t] = await Promise.all([
        q('consultant_occupancy', 'id,name,role'),
        q('timesheets', 'consultant_id,date,value,status', `date=gte.${from}&date=lte.${to}`),
      ])
      return JSON.stringify({ consultants: c, timesheets: t, week: { from, to } })
    }
    const [c, l] = await Promise.all([
      q('consultant_occupancy', 'id,name,role,status,occupancy_rate,leave_days_left,project_names'),
      q('leave_requests', 'id,consultant_id,type,start_date,end_date,days,status', 'status=eq.pending&limit=20'),
    ])
    return JSON.stringify({ consultants: c, pending_leaves: l })
  } catch { return '{}' }
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.OLLAMA_API_KEY
  const model  = process.env.OLLAMA_MODEL ?? 'kimi-k2.5:cloud'
  const host   = (process.env.OLLAMA_HOST ?? 'https://ollama.com').replace(/\/$/, '')

  const enc = new TextEncoder()
  const sse = (text: string) => enc.encode(`data: ${JSON.stringify({ text })}\n\n`)
  const done = enc.encode('data: [DONE]\n\n')

  if (!apiKey) {
    return new Response(
      new ReadableStream({
        start(c) { c.enqueue(sse('⚠ OLLAMA_API_KEY not configured.')); c.enqueue(done); c.close() }
      }),
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
    )
  }

  let body: { messages: { role: string; content: string }[]; cmd?: string }
  try { body = await req.json() }
  catch { return new Response('Bad request', { status: 400 }) }

  const { messages, cmd = '' } = body
  const context = await fetchContext(
    cmd,
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  )

  const ollamaMessages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\n--- DATA ---\n${context}\n--- END ---` },
    ...messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content })),
  ]

  let ollamaRes: Response
  try {
    ollamaRes = await fetch(`${host}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body:    JSON.stringify({ model, messages: ollamaMessages, stream: true }),
    })
  } catch (e) {
    return new Response(
      new ReadableStream({
        start(c) { c.enqueue(sse(`⚠ Cannot reach Ollama: ${String(e)}`)); c.enqueue(done); c.close() }
      }),
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
    )
  }

  if (!ollamaRes.ok) {
    const err = await ollamaRes.text().catch(() => '?')
    return new Response(
      new ReadableStream({
        start(c) { c.enqueue(sse(`⚠ Ollama HTTP ${ollamaRes.status}: ${err}`)); c.enqueue(done); c.close() }
      }),
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
    )
  }

  // ── Stream NDJSON Ollama → SSE ──────────────────────────────
  const reader  = ollamaRes.body!.getReader()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = ''
      try {
        while (true) {
          const { done: streamDone, value } = await reader.read()
          if (streamDone) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const t = line.trim()
            if (!t) continue
            try {
              const chunk = JSON.parse(t)
              const text  = chunk?.message?.content ?? chunk?.response ?? ''
              if (text) controller.enqueue(sse(text))
            } catch { /* skip */ }
          }
        }
        // flush remaining
        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer.trim())
            const text = chunk?.message?.content ?? chunk?.response ?? ''
            if (text) controller.enqueue(sse(text))
          } catch { /* skip */ }
        }
      } catch (e) {
        controller.enqueue(sse(`\n[stream error: ${String(e)}]`))
      } finally {
        controller.enqueue(done)
        controller.close()
      }
    },
    cancel() { reader.cancel() },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
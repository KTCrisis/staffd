// app/api/ai/route.ts
// NB: pas de "export const runtime = 'edge'" — incompatible avec @supabase/supabase-js sur Cloudflare.

const SYSTEM_PROMPT = `You are STAFF7_AGENT, an embedded AI assistant inside Staffd — a SaaS platform for consulting firms to manage consultants, projects, timesheets, leaves, and financials.
You have access to real-time context from Supabase (injected below).
Rules: be direct, analytical, no fluff. Format numbers clearly. Use **bold** for names/numbers. Respond in the user's language (FR or EN). Never invent data.
Key fields: contract_type ('employee'|'freelance'), tjm_cout_reel (actual daily cost calculated from salary or billed rate), tjm_cible (target rate set by admin), marge_pct (gross margin %). Freelance consultants have no CP/RTT entitlements.`

// ── Context fetcher ──────────────────────────────────────────

async function fetchContext(cmd: string, url: string, key: string): Promise<string> {
  if (!url || !key) return '{}'
  const h = { 'apikey': key, 'Authorization': `Bearer ${key}` }

  const q = (table: string, select: string, filter = '') =>
    fetch(
      `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`,
      { headers: h }
    ).then(r => r.json()).catch(() => [])

  try {
    // /fin ou /fin.margin → données financières projets
    if (cmd.startsWith('/fin')) {
      const [financials, profitability] = await Promise.all([
        q('project_financials', '*'),
        q('consultant_profitability', 'consultant_id,name,contract_type,tjm_cout,tjm_cible,ca_genere,marge_brute,marge_pct,occupancy_rate'),
      ])
      return JSON.stringify({ financials, profitability })
    }

    // /timesheet ou /timesheet.week → CRA de la semaine
    if (cmd.startsWith('/timesheet')) {
      const mon = new Date()
      mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1))
      mon.setHours(0, 0, 0, 0)
      const from = mon.toISOString().slice(0, 10)
      const to   = new Date(mon.getTime() + 4 * 86400000).toISOString().slice(0, 10)
      const [consultants, timesheets] = await Promise.all([
        q('consultant_occupancy', 'id,name,role,contract_type'),
        q('timesheets', 'consultant_id,date,value,status', `date=gte.${from}&date=lte.${to}`),
      ])
      return JSON.stringify({ consultants, timesheets, week: { from, to } })
    }

    // /leave ou /leave.check → congés pending
    if (cmd.startsWith('/leave')) {
      const [leaves, consultants] = await Promise.all([
        q('leave_requests', 'id,consultant_id,type,start_date,end_date,days,status', 'status=eq.pending&limit=30'),
        q('consultant_occupancy', 'id,name,role,contract_type'),
      ])
      return JSON.stringify({ pending_leaves: leaves, consultants })
    }

    // /staff.bench, /staff.all ou par défaut → consultants + occupancy + congés pending
    const [consultants, leaves] = await Promise.all([
      q('consultant_occupancy', 'id,name,role,status,contract_type,occupancy_rate,leave_days_left,tjm_cout_reel,tjm_cible,project_names'),
      q('leave_requests', 'id,consultant_id,type,start_date,end_date,days,status', 'status=eq.pending&limit=20'),
    ])
    return JSON.stringify({ consultants, pending_leaves: leaves })

  } catch {
    return '{}'
  }
}

// ── POST handler ─────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.OLLAMA_API_KEY
  const model  = process.env.OLLAMA_MODEL ?? 'kimi-k2.5:cloud'
  const host   = (process.env.OLLAMA_HOST ?? 'https://ollama.com').replace(/\/$/, '')

  const enc  = new TextEncoder()
  const sse  = (text: string) => enc.encode(`data: ${JSON.stringify({ text })}\n\n`)
  const done = enc.encode('data: [DONE]\n\n')

  const headers = {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'X-Accel-Buffering': 'no',
  }

  if (!apiKey) {
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(sse('⚠ OLLAMA_API_KEY not configured.'))
          c.enqueue(done)
          c.close()
        },
      }),
      { headers }
    )
  }

  let body: { messages: { role: string; content: string }[]; cmd?: string }
  try { body = await req.json() }
  catch { return new Response('Bad request', { status: 400 }) }

  const { messages, cmd = '' } = body

  // Normalise la commande : /staff.bench → /staff, /fin.margin → /fin, etc.
  const contextKey = cmd.split('.')[0]  // "/staff.bench" → "/staff"

  const context = await fetchContext(
    contextKey,
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  )

  const ollamaMessages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\n--- LIVE DATA ---\n${context}\n--- END ---` },
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
        start(c) {
          c.enqueue(sse(`⚠ Cannot reach Ollama: ${String(e)}`))
          c.enqueue(done)
          c.close()
        },
      }),
      { headers }
    )
  }

  if (!ollamaRes.ok) {
    const err = await ollamaRes.text().catch(() => '?')
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(sse(`⚠ Ollama HTTP ${ollamaRes.status}: ${err}`))
          c.enqueue(done)
          c.close()
        },
      }),
      { headers }
    )
  }

  // ── Stream NDJSON Ollama → SSE ───────────────────────────────
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
            const text  = chunk?.message?.content ?? chunk?.response ?? ''
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

  return new Response(stream, { headers })
}
// app/api/ai/route.ts
// Ollama Cloud — https://ollama.com/api/chat
// Cloudflare Pages edge-compatible.

export const runtime = 'edge'

// ── .env.local ────────────────────────────────────────────────
// OLLAMA_API_KEY=c9b6eb7339794436a9ec2d56acc38494.tzxvOU833o_...
// OLLAMA_MODEL=kimi-k2.5:cloud     ← nom exact du modèle Ollama
// OLLAMA_HOST=https://ollama.com   ← (optionnel, c'est la valeur par défaut)

const SYSTEM_PROMPT = `You are STAFF7_AGENT, an embedded AI assistant inside Staffd — a SaaS platform for consulting firms to manage consultants, projects, timesheets, leaves, and financials.

You have access to real-time context extracted from the company's Supabase database (injected below as JSON).
Your role is to analyze this data and answer questions concisely in the terminal style of the app.

Rules:
- Be direct and analytical. No fluff.
- Format numbers clearly (percentages, currency in €, days).
- When data is missing, say so explicitly.
- Use short markdown: **bold** for names/numbers, bullet lists for multi-item answers.
- Never invent data that wasn't provided in context.
- Respond in the same language as the user's message (FR or EN).`

// ── Context Supabase ──────────────────────────────────────────

async function fetchContext(cmd: string, supabaseUrl: string, supabaseKey: string): Promise<string> {
  if (!supabaseUrl || !supabaseKey) return '{}'

  const headers = {
    'apikey':        supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type':  'application/json',
  }
  const rest = (table: string, select = '*', filter = '') =>
    fetch(
      `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`,
      { headers }
    ).then(r => r.json()).catch(() => [])

  try {
    if (cmd.startsWith('/timesheet')) {
      const today  = new Date()
      const monday = new Date(today)
      monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1))
      const from = monday.toISOString().slice(0, 10)
      const to   = new Date(monday.getTime() + 4 * 86_400_000).toISOString().slice(0, 10)
      const [consultants, timesheets] = await Promise.all([
        rest('consultant_occupancy', 'id,name,role'),
        rest('timesheets', 'consultant_id,date,value,status', `date=gte.${from}&date=lte.${to}`),
      ])
      return JSON.stringify({ consultants, timesheets, week: { from, to } })
    }
    if (cmd.startsWith('/fin')) {
      return JSON.stringify({ financials: await rest('project_financials', '*') })
    }
    const [consultants, leaves] = await Promise.all([
      rest('consultant_occupancy', 'id,name,role,status,occupancy_rate,leave_days_left,project_names'),
      rest('leave_requests', 'id,consultant_id,type,start_date,end_date,days,status', 'status=eq.pending&limit=20'),
    ])
    return JSON.stringify({ consultants, pending_leaves: leaves })
  } catch (e) {
    return JSON.stringify({ error: String(e) })
  }
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(req: Request) {
  const apiKey = process.env.OLLAMA_API_KEY
  const model  = process.env.OLLAMA_MODEL ?? 'kimi-k2.5:cloud'
  const host   = (process.env.OLLAMA_HOST ?? 'https://ollama.com').replace(/\/$/, '')

  // Erreur config → retourner un message lisible dans le terminal
  if (!apiKey) {
    return sseError('OLLAMA_API_KEY not set in environment variables.')
  }

  let body: { messages: { role: string; content: string }[]; cmd?: string }
  try { body = await req.json() }
  catch { return new Response('Invalid JSON', { status: 400 }) }

  const { messages, cmd = '' } = body
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const context     = await fetchContext(cmd, supabaseUrl, supabaseKey)

  const systemFull = `${SYSTEM_PROMPT}\n\n--- LIVE CONTEXT ---\n${context}\n--- END ---`

  const ollamaMessages = [
    { role: 'system', content: systemFull },
    ...messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content })),
  ]

  // ── Appel Ollama ──────────────────────────────────────────
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
        messages: ollamaMessages,
        stream:   true,
        // Optionnel : masquer le thinking dans le stream
        options:  { think: false },
      }),
    })
  } catch (e) {
    return sseError(`Cannot reach ${host}: ${String(e)}`)
  }

  if (!ollamaRes.ok) {
    const err = await ollamaRes.text().catch(() => '?')
    return sseError(`HTTP ${ollamaRes.status}: ${err}`)
  }

  // ── NDJSON → SSE ──────────────────────────────────────────
  // Ollama stream = une ligne JSON par token/chunk, pas du SSE.
  // On convertit en SSE { text } pour le frontend.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer  = writable.getWriter()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  ;(async () => {
    const reader = ollamaRes.body!.getReader()
    let   buffer = ''

    const emit = (text: string) =>
      writer.write(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const t = line.trim()
          if (!t) continue
          try {
            const chunk = JSON.parse(t)
            // Format Ollama natif : { message: { content, thinking? }, done }
            // On ignore le champ `thinking` — c'est le raisonnement interne du modèle
            const content = chunk?.message?.content
            if (content) await emit(content)
          } catch { /* ignorer les lignes non-JSON */ }
        }
      }

      // Flush le reste si le stream se termine sans \n final
      if (buffer.trim()) {
        try {
          const chunk   = JSON.parse(buffer.trim())
          const content = chunk?.message?.content
          if (content) await emit(content)
        } catch { /* ignore */ }
      }

    } catch (e) {
      await emit(`\n[Erreur stream: ${String(e)}]`)
    } finally {
      await writer.write(encoder.encode('data: [DONE]\n\n'))
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ── Helper ────────────────────────────────────────────────────

function sseError(msg: string): Response {
  return new Response(
    `data: ${JSON.stringify({ text: `⚠ ${msg}` })}\n\ndata: [DONE]\n\n`,
    { headers: { 'Content-Type': 'text/event-stream' } }
  )
}
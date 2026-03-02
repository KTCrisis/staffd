// app/api/ai/route.ts
// Ollama Cloud API — https://ollama.com/api/chat
// Format natif Ollama (NDJSON), pas OpenAI.
// Cloudflare Pages edge-compatible.

export const runtime = 'edge'

// ── .env.local ────────────────────────────────────────────────
// OLLAMA_API_KEY=7966b3849d2f41c7867d2fd5f9f268d0...
// OLLAMA_MODEL=kimi          ← ou minimax, gemma3, etc.
// (OLLAMA_HOST par défaut = https://ollama.com)

// ── System prompt ─────────────────────────────────────────────

const SYSTEM_PROMPT = `You are STAFF7_AGENT, an embedded AI assistant inside Staffd — a SaaS platform for consulting firms to manage consultants, projects, timesheets, leaves, and financials.

You have access to real-time context extracted from the company's Supabase database (injected below as JSON).
Your role is to analyze this data and answer questions concisely in the terminal style of the app.

Rules:
- Be direct and analytical. No fluff.
- Format numbers clearly (percentages, currency in €, days).
- When data is missing, say so explicitly.
- Use short markdown: **bold** for names/numbers, \`code\` for IDs, bullet lists for multi-item answers.
- Never invent data that wasn't provided in context.
- Respond in the same language as the user's message (FR or EN).

Available slash commands the user may reference:
/staff.find [skill] — find consultants by skill
/staff.bench — list available consultants
/staff.assign [consultant] [project] — suggest assignment
/staff.gap [project] — identify missing skills
/timesheet.status — check submission status for current week
/timesheet.remind — list consultants with missing timesheets
/timesheet.fill — suggest pre-filling from assignments
/timesheet.reconcile — planned vs actual days
/fin.margin — project profitability overview
/fin.alerts — low margin warnings
/fin.rates — average daily rates by consultant
/fin.forecast — revenue projection
/leave.check — who is currently on leave
/leave.approve — pending approvals list
/leave.impact [consultant] — risk analysis if they leave`

// ── Context Supabase ──────────────────────────────────────────

async function fetchContext(
  cmd: string,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<string> {
  const headers = {
    'apikey':        supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type':  'application/json',
  }

  const rest = (table: string, select = '*', filter = '') =>
    fetch(
      `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`,
      { headers },
    ).then(r => r.json()).catch(() => [])

  try {
    if (cmd.startsWith('/staff') || cmd.startsWith('/leave') || !cmd.startsWith('/')) {
      const [consultants, leaves] = await Promise.all([
        rest('consultant_occupancy', 'id,name,role,status,occupancy_rate,leave_days_left,project_names'),
        rest('leave_requests', 'id,consultant_id,type,start_date,end_date,days,status', 'status=eq.pending&limit=20'),
      ])
      return JSON.stringify({ consultants, pending_leaves: leaves })
    }

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
      const financials = await rest('project_financials', '*')
      return JSON.stringify({ financials })
    }

    // Fallback général
    const [consultants, projects] = await Promise.all([
      rest('consultant_occupancy', 'id,name,role,status,occupancy_rate'),
      rest('projects', 'id,name,status,progress,end_date,client_name'),
    ])
    return JSON.stringify({ consultants, projects })

  } catch (e) {
    return JSON.stringify({ error: 'Failed to fetch context', detail: String(e) })
  }
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(req: Request) {
  const apiKey  = process.env.OLLAMA_API_KEY
  const model   = process.env.OLLAMA_MODEL ?? 'kimi-k2.5:cloud'
  const host    = process.env.OLLAMA_HOST  ?? 'https://ollama.com'

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OLLAMA_API_KEY not configured in env' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  let body: { messages: { role: string; content: string }[]; cmd?: string }
  try { body = await req.json() }
  catch { return new Response('Invalid JSON', { status: 400 }) }

  const { messages, cmd = '' } = body
  const context = await fetchContext(cmd, supabaseUrl, supabaseKey)

  const systemWithContext = `${SYSTEM_PROMPT}

--- LIVE DATA CONTEXT (Supabase, current company) ---
${context}
--- END CONTEXT ---`

  // Format Ollama natif — système = premier message role:system
  const ollamaMessages = [
    { role: 'system', content: systemWithContext },
    ...messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content })),
  ]

  const ollamaRes = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
      stream:   true,
    }),
  })

  if (!ollamaRes.ok) {
    const err = await ollamaRes.text()
    return new Response(err, { status: ollamaRes.status })
  }

  // Ollama stream = NDJSON (une ligne JSON par chunk, pas SSE)
  // On le convertit en SSE pour que le frontend puisse le lire uniformément.
  const { readable, writable } = new TransformStream()
  const writer  = writable.getWriter()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  ;(async () => {
    const reader = ollamaRes.body!.getReader()
    let buffer   = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''  // garder le fragment incomplet

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const chunk = JSON.parse(line)
            const text  = chunk?.message?.content ?? ''
            if (text) {
              // Émettre en SSE pour le client
              await writer.write(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
            if (chunk?.done) {
              await writer.write(encoder.encode('data: [DONE]\n\n'))
            }
          } catch {
            // ligne non-JSON — ignorer
          }
        }
      }
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
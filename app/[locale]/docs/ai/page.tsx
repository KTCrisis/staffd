'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function DocNav({ active }: { active: 'platform' | 'ai' }) {
  return (
    <nav className="doc-nav">
      <div style={{ display:'flex', alignItems:'center' }}>
        <Link href="/docs" className="nav-logo"><span className="s">staff</span><span className="d">7</span></Link>
        <span className="nav-tag">// docs</span>
      </div>
      <ul className="nav-links">
        <li><Link href="/docs/platform" style={{ color: active === 'platform' ? 'var(--cyan)' : undefined }}>Platform</Link></li>
        <li><Link href="/docs/ai"       style={{ color: active === 'ai'       ? 'var(--pink)' : undefined }}>AI layer</Link></li>
        <li><Link href="/login" className="nav-cta">sign in →</Link></li>
      </ul>
    </nav>
  )
}

const SECTIONS = [
  { id:'overview',   label:'Overview',            icon:'⚡' },
  { id:'console',    label:'AI Console',           icon:'◈' },
  { id:'commands',   label:'Commands',             icon:'/' },
  { id:'actions',    label:'Agentic actions',      icon:'◎' },
  { id:'context',    label:'Live context',         icon:'◉' },
  { id:'profitability', label:'Profitability AI',  icon:'◬' },
  { id:'privacy',    label:'Privacy & models',     icon:'◫' },
  { id:'rls',        label:'RLS & isolation',      icon:'⬡' },
  { id:'mcp',        label:'MCP integration',      icon:'◧' },
]

function Sidebar({ active }: { active: string }) {
  return (
    <aside style={{
      width: 220, flexShrink: 0, position: 'sticky', top: 80,
      height: 'calc(100vh - 100px)', overflowY: 'auto', paddingRight: 20,
    }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 16 }}>
        // ai layer docs
      </div>
      {SECTIONS.map(s => (
        <a key={s.id} href={`#${s.id}`} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 3, marginBottom: 2,
          textDecoration: 'none', fontSize: 11,
          background: active === s.id ? 'rgba(255,45,107,.08)' : 'transparent',
          borderLeft: `2px solid ${active === s.id ? 'var(--pink)' : 'transparent'}`,
          color: active === s.id ? 'var(--pink)' : 'var(--text2)',
          transition: 'all .15s',
        }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{s.icon}</span>
          {s.label}
        </a>
      ))}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <Link href="/docs/platform" style={{
          display: 'block', padding: '10px 12px',
          background: 'rgba(0,229,255,.06)', border: '1px solid rgba(0,229,255,.2)',
          borderRadius: 3, textDecoration: 'none',
          fontSize: 10, color: 'var(--cyan)', letterSpacing: 1,
        }}>
          ◧ Platform docs →
        </Link>
      </div>
    </aside>
  )
}

function Section({ id, label, icon, color = 'var(--pink)', children }: {
  id: string; label: string; icon: string; color?: string; children: React.ReactNode
}) {
  return (
    <section id={id} style={{ marginBottom: 80, scrollMarginTop: 90 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <span style={{ fontSize: 24, color }}>{icon}</span>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
            // {id}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -1 }}>{label}</h2>
        </div>
      </div>
      {children}
    </section>
  )
}

function FeatureGrid({ items }: { items: { icon: string; title: string; desc: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
      {items.map(item => (
        <div key={item.title} style={{
          padding: '18px 20px', background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: 4,
        }}>
          <div style={{ fontSize: 18, marginBottom: 10 }}>{item.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{item.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.7 }}>{item.desc}</div>
        </div>
      ))}
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 4, padding: '16px 20px', fontSize: 11,
      color: 'var(--cyan)', overflowX: 'auto', lineHeight: 1.8, marginBottom: 24,
    }}>
      <code>{children}</code>
    </pre>
  )
}

function CmdRow({ cmd, color, desc, context }: { cmd: string; color: string; desc: string; context: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 16px', background: 'var(--bg2)',
      border: '1px solid var(--border)', borderRadius: 4, marginBottom: 8,
    }}>
      <span style={{
        fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700,
        color, minWidth: 160,
        padding: '2px 10px', borderRadius: 2,
        background: `${color}12`, border: `1px solid ${color}30`,
      }}>{cmd}</span>
      <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1 }}>{desc}</span>
      <span style={{
        fontSize: 9, padding: '1px 8px', borderRadius: 2, letterSpacing: 1,
        background: `${color}10`, color, border: `1px solid ${color}25`,
      }}>{context}</span>
    </div>
  )
}

function ActionRow({ action, color, desc, params }: { action: string; color: string; desc: string; params: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 16px', background: 'var(--bg2)',
      border: '1px solid var(--border)', borderRadius: 4, marginBottom: 8,
    }}>
      <span style={{
        fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700,
        color, minWidth: 200,
        padding: '2px 10px', borderRadius: 2,
        background: `${color}12`, border: `1px solid ${color}30`,
      }}>{action}</span>
      <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1 }}>{desc}</span>
      <span style={{
        fontSize: 9, padding: '1px 8px', borderRadius: 2, letterSpacing: 1,
        background: `${color}10`, color, border: `1px solid ${color}25`,
        whiteSpace: 'nowrap',
      }}>{params}</span>
    </div>
  )
}

function Note({ color = 'var(--gold)', children }: { color?: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 4, marginBottom: 24,
      background: `${color}08`, border: `1px solid ${color}25`,
      fontSize: 11, color: 'var(--text2)', lineHeight: 1.7,
    }}>
      {children}
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 24 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '8px 16px',
                background: 'var(--bg2)', color: 'var(--text2)',
                fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '10px 16px', color: j === 0 ? '#fff' : 'var(--text2)',
                  borderBottom: '1px solid var(--border)', fontWeight: j === 0 ? 700 : 400,
                }} dangerouslySetInnerHTML={{ __html: cell }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AiDocsPage() {
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id) }) },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&display=swap');
        :root {
          --bg:#060a06;--bg2:#0c120c;--bg3:#111811;
          --green:#00ff88;--pink:#ff2d6b;--cyan:#00e5ff;--gold:#ffd166;--purple:#b388ff;
          --dim:#2a3a2a;--text:#b8ccb8;--text2:#5a7a5a;--border:#1a2a1a;
          --font:'JetBrains Mono',monospace;
        }
        *{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;}
        body::after{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px);pointer-events:none;z-index:9999;}
        .grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(#1a2a1a 1px,transparent 1px),linear-gradient(90deg,#1a2a1a 1px,transparent 1px);background-size:40px 40px;opacity:0.3;}
        .doc-nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:18px 40px;background:rgba(6,10,6,0.95);border-bottom:1px solid var(--border);backdrop-filter:blur(4px);}
        .nav-logo{font-size:18px;font-weight:700;letter-spacing:-0.5px;text-decoration:none;}
        .nav-logo .s{color:#fff;}.nav-logo .d{color:var(--green);}
        .nav-tag{font-size:9px;color:var(--text2);letter-spacing:3px;text-transform:uppercase;margin-left:16px;}
        .nav-links{display:flex;gap:28px;list-style:none;align-items:center;}
        .nav-links a{color:var(--text2);text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;transition:color 0.2s;}
        .nav-links a:hover{color:var(--green);}
        .nav-cta{background:var(--green)!important;color:#060a06!important;padding:6px 16px!important;border-radius:2px;font-weight:700!important;}
        p{color:var(--text2);font-size:12px;line-height:1.9;margin-bottom:16px;}
        strong{color:#fff;font-weight:700;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:var(--dim);border-radius:2px;}
        aside a:hover{color:var(--pink)!important;background:rgba(255,45,107,.05)!important;}
        @media(max-width:800px){
          .doc-nav{padding:16px 20px;}.nav-links{display:none;}
          .doc-layout{flex-direction:column!important;}
          aside{width:100%!important;position:static!important;height:auto!important;}
        }
      `}</style>

      <div className="grid-bg" />
      <DocNav active="ai" />

      <div style={{ paddingTop: 70, maxWidth: 1100, margin: '0 auto', padding: '70px 40px 80px' }}>
        <div className="doc-layout" style={{ display: 'flex', gap: 60, alignItems: 'flex-start' }}>
          <Sidebar active={activeSection} />

          <main style={{ flex: 1, minWidth: 0 }}>

            {/* ── Overview ── */}
            <Section id="overview" label="AI layer overview" icon="⚡">
              <p>
                The <strong>staff7 AI layer</strong> is an intelligence interface built directly on top
                of the platform's live data. It lets users query their staffing, financial, and operational
                data in plain language — and act on it directly from the console.
              </p>
              <FeatureGrid items={[
                { icon:'◈', title:'AI Console',          desc:'Terminal-style chat interface. Type questions or use structured /commands to load specific context.' },
                { icon:'◎', title:'Agentic actions',     desc:'Approve leaves, update project status, assign consultants — directly from the console with a confirmation step.' },
                { icon:'⬡', title:'RLS-aware queries',   desc:'The agent uses your session JWT — it can only see your company\'s data. RLS enforces tenant isolation.' },
                { icon:'◫', title:'Bring your own model',desc:'Connect any Ollama-compatible model: local (privacy-first) or cloud (kimi-k2.5, llama3, mistral…).' },
              ]} />
            </Section>

            {/* ── Console ── */}
            <Section id="console" label="AI Console" icon="◈" color="var(--green)">
              <p>
                The console is a terminal-style chat interface accessible from the sidebar under <strong>Agents</strong>.
                It maintains conversation history within the session and streams responses in real time.
              </p>
              <FeatureGrid items={[
                { icon:'/',  title:'Command menu',     desc:'Type / to open the structured command browser. Select a command to pre-load the right data context.' },
                { icon:'▋',  title:'Streaming cursor', desc:'Responses appear character-by-character. The ▋ cursor shows the agent is still generating.' },
                { icon:'⌫',  title:'Clear history',    desc:'Clear button resets the conversation history. The agent starts fresh without prior context.' },
                { icon:'◉',  title:'Agent status bar', desc:'Shows which sub-agents are ONLINE / THINKING / IDLE at a glance.' },
              ]} />
              <Note color="var(--green)">
                The console uses <strong>SSE (Server-Sent Events)</strong> to stream the Ollama response.
                The route at <code style={{ color:'var(--cyan)' }}>/api/ai</code> proxies to Ollama and
                reformats NDJSON chunks as SSE events. Actions use a separate <code style={{ color:'var(--cyan)' }}>PUT /api/ai</code> endpoint.
              </Note>
            </Section>

            {/* ── Commands ── */}
            <Section id="commands" label="Commands" icon="/" color="var(--cyan)">
              <p>
                Commands pre-load specific Supabase context before sending your message. Without a command,
                the agent loads a general staff + profitability summary. With a command, it fetches
                the most relevant data for your question.
              </p>
              <CmdRow cmd="/staff.bench"      color="var(--green)"  desc="Available consultants + occupancy + pending leaves + profitability summary" context="staff" />
              <CmdRow cmd="/staff.all"        color="var(--green)"  desc="All consultants + active projects + full profitability" context="staff" />
              <CmdRow cmd="/leave.check"      color="var(--gold)"   desc="Pending leave requests with consultant details" context="leave" />
              <CmdRow cmd="/fin.margin"       color="var(--cyan)"   desc="Project margins and daily rates + profitability view per consultant" context="fin" />
              <CmdRow cmd="/timesheet.week"   color="var(--purple)" desc="Current week timesheet status — all consultants" context="timesheet" />
              <CmdRow cmd="/profit.analysis"  color="var(--pink)"   desc="Full profitability analysis: margins, target gaps, freelance vs employee" context="profit" />
              <Note color="var(--cyan)">
                Commands use <strong>prefix matching</strong> — <code style={{ color:'var(--cyan)' }}>/staff.bench</code> and <code style={{ color:'var(--cyan)' }}>/staff.all</code> both
                load the <code style={{ color:'var(--cyan)' }}>/staff</code> context. The sub-label after the
                dot is passed to the agent as a hint to focus its response.
              </Note>
            </Section>

            {/* ── Agentic actions ── */}
            <Section id="actions" label="Agentic actions" icon="◎" color="var(--gold)">
              <p>
                The action agent uses <strong>native tool calling</strong> (kimi-k2.5 supports it natively)
                to detect write intentions and execute them with a confirmation step. No action is executed
                without explicit user confirmation.
              </p>
              <FeatureGrid items={[
                { icon:'◈', title:'Intent detection',    desc:'The router detects action keywords (approve, refuse, assign, update) and routes to the action agent instead of the query agent.' },
                { icon:'⚠', title:'Confirmation UI',     desc:'A card appears in the terminal showing the action and its parameters. The user must click CONFIRM before anything is written.' },
                { icon:'◉', title:'Activity log',        desc:'Every executed action is written to the activity feed with a "via AI" tag — full audit trail.' },
                { icon:'⬡', title:'Role-gated',          desc:'Actions are only available to admin and super_admin roles. Managers and consultants cannot trigger write operations.' },
              ]} />
              <ActionRow action="approve_leave"         color="var(--green)"  desc="Approve a pending leave request" params="consultant_name, leave_id?" />
              <ActionRow action="refuse_leave"          color="var(--pink)"   desc="Refuse a pending leave request" params="consultant_name, reason?" />
              <ActionRow action="update_project_status" color="var(--gold)"   desc="Update a project's status" params="project_name, status" />
              <ActionRow action="assign_consultant"     color="var(--cyan)"   desc="Assign a consultant to a project" params="consultant_name, project_name, allocation?" />
              <CodeBlock>{`// Example flow
User    > "approve Clara's leave"
ACTION  > ⚠ Approve leave request
           consultant_name: Clara Kim
           [ CONFIRM ]  [ CANCEL ]

User    > CONFIRM
STAFF7  > ✓ Leave request approved for Clara Kim —
           CP from 2026-03-14 to 2026-03-18 (5 days).`}</CodeBlock>
              <Note color="var(--gold)">
                The action agent calls the model with <strong>temperature: 0</strong> for deterministic
                tool selection. Ambiguous messages always fall back to the query agent — false positives
                are prevented by requiring explicit action keywords.
              </Note>
            </Section>

            {/* ── Context ── */}
            <Section id="context" label="Live context injection" icon="◉" color="var(--cyan)">
              <p>
                Every request to <code style={{ color:'var(--cyan)' }}>/api/ai</code> fetches fresh data from
                Supabase and injects it into the system prompt. The agent always sees current data —
                no stale cache, no manual sync.
              </p>
              <Table
                headers={['Command', 'Tables / views queried', 'Key fields']}
                rows={[
                  ['/staff',    'consultant_occupancy, leave_requests, consultant_profitability', 'status, contract_type, actual_cost, target_rate, occupancy_rate'],
                  ['/fin',      'project_financials, consultant_profitability',                   'sold_rate, margin_pct, revenue, gross_margin'],
                  ['/profit',   'consultant_profitability, consultant_occupancy',                 'Full profitability + pre-computed summary aggregates'],
                  ['/timesheet','consultant_occupancy, timesheets',                               'date, value, status — current week only'],
                  ['/leave',    'leave_requests, consultant_occupancy',                           'pending only, limit 30'],
                ]}
              />
              <CodeBlock>{`// System prompt structure (every request)
SYSTEM_PROMPT          // role + rules + field glossary
--- LIVE DATA ---
{ consultants: [...], profitability_summary: {...} }
--- END ---
[conversation history]
[new user message]`}</CodeBlock>
            </Section>

            {/* ── Profitability AI ── */}
            <Section id="profitability" label="Profitability AI" icon="◬" color="var(--pink)">
              <p>
                The <code style={{ color:'var(--cyan)' }}>/profit.analysis</code> command loads the richest
                context — the full <strong>consultant_profitability</strong> view plus pre-computed
                aggregates — enabling questions that span finance, staffing, and contract type.
              </p>
              <FeatureGrid items={[
                { icon:'◈', title:'Margin analysis',       desc:'"Which consultant is the least profitable?" — sorted by margin % with full cost breakdown.' },
                { icon:'◎', title:'Target gap',            desc:'"Who is not hitting their target daily rate?" — compares target vs actual cost, flags < 10% margin.' },
                { icon:'◧', title:'Freelance vs employee', desc:'"How many freelancers do I have and what is their average cost?" — contract type across all contexts.' },
                { icon:'◬', title:'Risk surface',          desc:'"Which consultants are under-occupied with a low margin?" — cross-metric analysis.' },
              ]} />
              <CodeBlock>{`// Pre-computed summary injected into /profit context
{
  total_consultants: 11,
  employees: 8,
  freelances: 3,
  total_ca: 312000,
  total_marge: 142000,
  avg_marge_pct: "34.2",
  below_target_count: 2,
  below_target: [
    { name: "David Mora",    tjm_cout: 680, tjm_cible: 700 },
    { name: "Lucas Martin",  tjm_cout: 450, tjm_cible: 460 }
  ]
}`}</CodeBlock>
            </Section>

            {/* ── Privacy ── */}
            <Section id="privacy" label="Privacy & model choice" icon="◫" color="var(--gold)">
              <p>
                staff7 is designed around <strong>privacy-by-design</strong>. You choose where your
                data goes — local model or cloud API.
              </p>
              <Table
                headers={['Mode', 'Data leaves your infra?', 'Setup']}
                rows={[
                  ['Local Ollama',       'Never — model runs on your server', 'Install Ollama, set OLLAMA_HOST=http://localhost:11434'],
                  ['Ollama Cloud',       'Yes — sent to Ollama Cloud API',    'Set OLLAMA_HOST + OLLAMA_API_KEY'],
                  ['Any OpenAI-compat.', 'Yes — sent to third-party API',     'Point OLLAMA_HOST to any compatible endpoint'],
                ]}
              />
              <CodeBlock>{`# .env.local
OLLAMA_HOST=http://localhost:11434   # local model
OLLAMA_MODEL=llama3.2:3b            # or mistral, phi3, etc.
OLLAMA_API_KEY=                     # empty for local

# or cloud
OLLAMA_HOST=https://ollama.com
OLLAMA_MODEL=kimi-k2.5:cloud
OLLAMA_API_KEY=sk-...`}</CodeBlock>
            </Section>

            {/* ── RLS ── */}
            <Section id="rls" label="RLS & tenant isolation" icon="⬡" color="var(--cyan)">
              <p>
                The AI query route does <strong>not</strong> use the Supabase service role key for reads.
                It uses the authenticated user's JWT — so RLS policies apply to every query the agent makes.
                Write operations (actions) use the service role key server-side, after role verification.
              </p>
              <CodeBlock>{`// /api/ai — JWT extraction (query agent)
const authHeader = req.headers.get('Authorization') ?? ''
const userToken  = authHeader.replace('Bearer ', '').trim()

// Supabase query headers — RLS applied
const h = {
  'apikey':        anonKey,
  'Authorization': \`Bearer \${userToken}\`,
}

// Action agent — service role after role check
if (role !== 'admin' && role !== 'super_admin') return 403
// → executes with service role key`}</CodeBlock>
              <Note color="var(--cyan)">
                The client sends the token via <code style={{ color:'var(--cyan)' }}>Authorization: Bearer &lt;session.access_token&gt;</code>.
                If the session has expired, the route returns an SSE error: <em>"Session expired — please sign in again."</em>
              </Note>
            </Section>

            {/* ── MCP ── */}
            <Section id="mcp" label="MCP integration (roadmap)" icon="◧" color="var(--purple)">
              <p>
                The <strong>Model Context Protocol (MCP)</strong> is planned as the next evolution of
                the AI layer — standardising tool calls across models and enabling external integrations.
              </p>
              <FeatureGrid items={[
                { icon:'◧', title:'MCP server',        desc:'A FastAPI-based MCP server will expose tools: get_consultants, get_profitability, approve_leave, etc. — replacing direct REST calls.' },
                { icon:'◉', title:'External sources',  desc:'Connect Google Calendar, Slack, or Pennylane as MCP tools — the agent queries them alongside your Supabase data.' },
                { icon:'◫', title:'Model-agnostic',    desc:'MCP is a standard protocol. Any compatible model (Claude, GPT-4o, Gemini) can use the same tool definitions.' },
                { icon:'⬡', title:'Auth passthrough',  desc:'MCP server validates the JWT before executing any tool — same RLS isolation as the current approach.' },
              ]} />
              <Note color="var(--purple)">
                The current action agent already implements the core pattern — native tool calling with
                confirmation. MCP will standardise and extend this with external integrations and a
                dedicated FastAPI layer.
              </Note>
            </Section>

          </main>
        </div>
      </div>
    </>
  )
}
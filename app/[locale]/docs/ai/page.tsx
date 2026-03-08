// app/[locale]/docs/ai/page.tsx
'use client'

import {
  DocNav, DocSidebar, Section, FeatureGrid, CodeBlock,
  Table, Note, CmdRow, ActionRow, useScrollSpy,
} from '@/components/docs'
import '@/styles/docs.css'

const SECTIONS = [
  { id: 'overview',       label: 'Overview',           icon: '⚡' },
  { id: 'console',        label: 'AI Console',         icon: '◈' },
  { id: 'commands',       label: 'Commands',           icon: '/' },
  { id: 'actions',        label: 'Agentic actions',    icon: '◎' },
  { id: 'context',        label: 'Live context',       icon: '◉' },
  { id: 'profitability',  label: 'Profitability AI',   icon: '◬' },
  { id: 'privacy',        label: 'Privacy & models',   icon: '◫' },
  { id: 'rls',            label: 'RLS & isolation',    icon: '⬡' },
  { id: 'mcp',            label: 'MCP integration',    icon: '◧' },
]

export default function AiDocsPage() {
  const active = useScrollSpy(SECTIONS.map(s => s.id))

  return (
    <>
      <div className="doc-grid-bg" />
      <DocNav active="ai" />

      <div className="doc-layout">
        <DocSidebar
          sections={SECTIONS}
          active={active}
          variant="ai"
          crossLink={{ href: '/docs/platform', label: '◧ Platform docs →', color: 'var(--cyan)' }}
        />

        <main style={{ flex: 1, minWidth: 0 }}>

          {/* ── Overview ── */}
          <Section id="overview" label="AI layer overview" icon="⚡">
            <p>
              The <strong>staff7 AI layer</strong> is an intelligence interface built directly on top
              of the platform{"'"}s live data. It lets users query their staffing, financial, and operational
              data in plain language — and act on it directly from the console.
            </p>
            <FeatureGrid items={[
              { icon: '◈', title: 'AI Console',           desc: 'Terminal-style chat interface. Type questions or use structured /commands to load specific context.' },
              { icon: '◎', title: 'Agentic actions',      desc: 'Approve leaves, update project status, assign consultants — directly from the console with a confirmation step.' },
              { icon: '⬡', title: 'RLS-aware queries',    desc: 'The agent uses your session JWT — it can only see your company\'s data. RLS enforces tenant isolation.' },
              { icon: '◫', title: 'Bring your own model', desc: 'Connect any Ollama-compatible model: local (privacy-first) or cloud (kimi-k2.5, llama3, mistral…).' },
            ]} />
          </Section>

          {/* ── Console ── */}
          <Section id="console" label="AI Console" icon="◈" color="var(--green)">
            <p>
              The console is a terminal-style chat interface accessible from the sidebar under <strong>Agents</strong>.
              It maintains conversation history within the session and streams responses in real time.
            </p>
            <FeatureGrid items={[
              { icon: '/',  title: 'Command menu',      desc: 'Type / to open the structured command browser. Select a command to pre-load the right data context.' },
              { icon: '▋',  title: 'Streaming cursor',  desc: 'Responses appear character-by-character. The ▋ cursor shows the agent is still generating.' },
              { icon: '⌫',  title: 'Clear history',     desc: 'Clear button resets the conversation history. The agent starts fresh without prior context.' },
              { icon: '◉',  title: 'Agent status bar',  desc: 'Shows which sub-agents are ONLINE / THINKING / IDLE at a glance.' },
            ]} />
            <Note color="var(--green)">
              The console uses <strong>SSE (Server-Sent Events)</strong> to stream the Ollama response.
              The route at <code>/api/ai</code> proxies to Ollama and reformats NDJSON chunks as SSE events.
              Actions use a separate <code>PUT /api/ai</code> endpoint.
            </Note>
          </Section>

          {/* ── Commands ── */}
          <Section id="commands" label="Commands" icon="/" color="var(--cyan)">
            <p>
              Commands pre-load specific Supabase context before sending your message. Without a command,
              the agent loads a general staff + profitability summary.
            </p>
            <CmdRow cmd="/staff.bench"     color="var(--green)"  desc="Available consultants + occupancy + pending leaves + profitability summary" context="staff" />
            <CmdRow cmd="/staff.all"       color="var(--green)"  desc="All consultants + active projects + full profitability" context="staff" />
            <CmdRow cmd="/leave.check"     color="var(--gold)"   desc="Pending leave requests with consultant details" context="leave" />
            <CmdRow cmd="/fin.margin"      color="var(--cyan)"   desc="Project margins and daily rates + profitability view per consultant" context="fin" />
            <CmdRow cmd="/timesheet.week"  color="var(--purple)" desc="Current week timesheet status — all consultants" context="timesheet" />
            <CmdRow cmd="/profit.analysis" color="var(--pink)"   desc="Full profitability analysis: margins, target gaps, freelance vs employee" context="profit" />
            <Note color="var(--cyan)">
              Commands use <strong>prefix matching</strong> — <code>/staff.bench</code> and <code>/staff.all</code> both
              load the <code>/staff</code> context. The sub-label after the dot is passed as a hint to focus the response.
            </Note>
          </Section>

          {/* ── Agentic actions ── */}
          <Section id="actions" label="Agentic actions" icon="◎" color="var(--gold)">
            <p>
              The action agent uses <strong>native tool calling</strong> (kimi-k2.5 supports it natively)
              to detect write intentions and execute them with a confirmation step.
            </p>
            <FeatureGrid items={[
              { icon: '◈', title: 'Intent detection',   desc: 'The router detects action keywords (approve, refuse, assign, update) and routes to the action agent.' },
              { icon: '⚠', title: 'Confirmation UI',    desc: 'A card appears showing the action and parameters. User must click CONFIRM before execution.' },
              { icon: '◉', title: 'Activity log',       desc: 'Every executed action is written to the activity feed with a "via AI" tag — full audit trail.' },
              { icon: '⬡', title: 'Role-gated',         desc: 'Actions available to admin and super_admin only. Managers and consultants cannot trigger writes.' },
            ]} />
            <ActionRow action="approve_leave"         color="var(--green)" desc="Approve a pending leave request" params="consultant_name, leave_id?" />
            <ActionRow action="refuse_leave"          color="var(--pink)"  desc="Refuse a pending leave request" params="consultant_name, reason?" />
            <ActionRow action="update_project_status" color="var(--gold)"  desc="Update a project's status" params="project_name, status" />
            <ActionRow action="assign_consultant"     color="var(--cyan)"  desc="Assign a consultant to a project" params="consultant_name, project_name, allocation?" />
            <CodeBlock>{`// Example flow
User    > "approve Clara's leave"
ACTION  > ⚠ Approve leave request
           consultant_name: Clara Kim
           [ CONFIRM ]  [ CANCEL ]

User    > CONFIRM
STAFF7  > ✓ Leave request approved for Clara Kim —
           CP from 2026-03-14 to 2026-03-18 (5 days).`}</CodeBlock>
          </Section>

          {/* ── Context ── */}
          <Section id="context" label="Live context injection" icon="◉" color="var(--cyan)">
            <p>
              Every request to <code>/api/ai</code> fetches fresh data from Supabase and injects it
              into the system prompt. The agent always sees current data — no stale cache.
            </p>
            <Table
              headers={['Command', 'Tables / views queried', 'Key fields']}
              rows={[
                ['/staff',     'consultant_occupancy, leave_requests, consultant_profitability', 'status, contract_type, actual_cost, target_rate, occupancy_rate'],
                ['/fin',       'project_financials, consultant_profitability',                   'sold_rate, margin_pct, revenue, gross_margin'],
                ['/profit',    'consultant_profitability, consultant_occupancy',                 'Full profitability + pre-computed summary aggregates'],
                ['/timesheet', 'consultant_occupancy, timesheets',                               'date, value, status — current week only'],
                ['/leave',     'leave_requests, consultant_occupancy',                           'pending only, limit 30'],
              ]}
            />
          </Section>

          {/* ── Profitability AI ── */}
          <Section id="profitability" label="Profitability AI" icon="◬" color="var(--pink)">
            <p>
              The <code>/profit.analysis</code> command loads the richest context — the full
              consultant_profitability view plus pre-computed aggregates.
            </p>
            <FeatureGrid items={[
              { icon: '◈', title: 'Margin analysis',        desc: '"Which consultant is least profitable?" — sorted by margin % with full cost breakdown.' },
              { icon: '◎', title: 'Target gap',             desc: '"Who is not hitting their target rate?" — compares target vs actual cost, flags < 10% margin.' },
              { icon: '◧', title: 'Freelance vs employee',  desc: '"Average freelancer cost?" — contract type segmentation across all contexts.' },
              { icon: '◬', title: 'Risk surface',           desc: '"Under-occupied with low margin?" — cross-metric analysis combining occupancy and profitability.' },
            ]} />
            <CodeBlock>{`// Pre-computed summary injected into /profit context
{
  total_consultants: 11,
  employees: 8,  freelances: 3,
  total_ca: 312000,  total_marge: 142000,
  avg_marge_pct: "34.2",
  below_target_count: 2,
  below_target: [
    { name: "David Mora",   tjm_cout: 680, tjm_cible: 700 },
    { name: "Lucas Martin", tjm_cout: 450, tjm_cible: 460 }
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
            <CodeBlock>{`# .env.local — local model (privacy-first)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_API_KEY=

# or cloud
OLLAMA_HOST=https://ollama.com
OLLAMA_MODEL=kimi-k2.5:cloud
OLLAMA_API_KEY=sk-...`}</CodeBlock>
          </Section>

          {/* ── RLS ── */}
          <Section id="rls" label="RLS & tenant isolation" icon="⬡" color="var(--cyan)">
            <p>
              The AI query route does <strong>not</strong> use the service role key for reads.
              It uses the authenticated user{"'"}s JWT — RLS applies to every agent query.
            </p>
            <CodeBlock>{`// /api/ai — JWT passthrough (query agent)
const userToken = req.headers.get('Authorization')?.replace('Bearer ', '')

// Supabase query — RLS applied via user token
const headers = {
  'apikey':        anonKey,
  'Authorization': \`Bearer \${userToken}\`,
}

// Action agent — service role AFTER role check
if (role !== 'admin' && role !== 'super_admin') return 403
// → executes with service role key`}</CodeBlock>
          </Section>

          {/* ── MCP ── */}
          <Section id="mcp" label="MCP integration (roadmap)" icon="◧" color="var(--purple)">
            <p>
              The <strong>Model Context Protocol (MCP)</strong> is planned as the next evolution —
              standardising tool calls and enabling external integrations.
            </p>
            <FeatureGrid items={[
              { icon: '◧', title: 'MCP server',         desc: 'FastAPI-based MCP server exposing tools: get_consultants, approve_leave, etc. — replacing direct REST calls.' },
              { icon: '◉', title: 'External sources',   desc: 'Connect Google Calendar, Slack, or Pennylane as MCP tools alongside Supabase data.' },
              { icon: '◫', title: 'Model-agnostic',     desc: 'MCP is a standard protocol. Any compatible model (Claude, GPT-4o, Gemini) can use the same tool definitions.' },
              { icon: '⬡', title: 'Auth passthrough',   desc: 'MCP server validates the JWT before executing any tool — same RLS isolation as current approach.' },
            ]} />
            <Note color="var(--purple)">
              The current action agent already implements the core pattern — native tool calling with
              confirmation. MCP will standardise and extend this with external integrations.
            </Note>
          </Section>

        </main>
      </div>
    </>
  )
}
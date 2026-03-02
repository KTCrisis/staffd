'use client'

import { useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { useAuthContext } from '@/components/layout/AuthProvider'

// ── Types ─────────────────────────────────────────────────────

type MsgRole = 'system' | 'user' | 'agent' | 'error'
interface Msg { role: MsgRole; content: string; ts: number }

// ── Commands ──────────────────────────────────────────────────

const COMMAND_GROUPS = [
  {
    label: 'Resource & Staffing',
    items: [
      { cmd: '/staff.find',     desc: 'Find talent by skill/rate' },
      { cmd: '/staff.bench',    desc: 'Who is currently available?' },
      { cmd: '/staff.assign',   desc: 'Allocate member to project' },
      { cmd: '/staff.optimize', desc: 'Balance team workload' },
      { cmd: '/staff.gap',      desc: 'Identify staffing shortages' },
    ]
  },
  {
    label: 'Timesheets',
    items: [
      { cmd: '/timesheet.status',    desc: 'Check submission status' },
      { cmd: '/timesheet.remind',    desc: 'List missing logs' },
      { cmd: '/timesheet.fill',      desc: 'Pre-fill from planning' },
      { cmd: '/timesheet.reconcile', desc: 'Planned vs Actual' },
    ]
  },
  {
    label: 'Financials & Margins',
    items: [
      { cmd: '/fin.margin',   desc: 'Project profitability' },
      { cmd: '/fin.alerts',   desc: 'Low margin warnings' },
      { cmd: '/fin.rates',    desc: 'Average daily rates' },
      { cmd: '/fin.forecast', desc: 'Revenue projections' },
    ]
  },
  {
    label: 'Simulations',
    items: [
      { cmd: '/sim.hire',        desc: 'New hire break-even' },
      { cmd: '/sim.churn',       desc: 'Impact of losing a client' },
      { cmd: '/sim.utilization', desc: '4-day week impact' },
    ]
  },
  {
    label: 'Absence & PTO',
    items: [
      { cmd: '/leave.check',   desc: 'Who is out of office?' },
      { cmd: '/leave.approve', desc: 'Batch approve requests' },
      { cmd: '/leave.impact',  desc: 'Risk analysis of leave' },
    ]
  },
]

const ALL_CMDS = COMMAND_GROUPS.flatMap(g => g.items)

// ── Helpers ───────────────────────────────────────────────────

function extractCmd(text: string) {
  const m = text.match(/^(\/[\w.]+)/)
  return m ? m[1] : ''
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en', { hour12: false })
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8e8e8">$1</strong>')
    .replace(/`(.+?)`/g,       '<code style="color:var(--cyan);font-family:inherit">$1</code>')
    .replace(/\n/g,            '<br/>')
}

// ── Inner component ───────────────────────────────────────────

function AIContent() {
  const searchParams = useSearchParams()
  const { user }     = useAuthContext()

  const [input,     setInput]     = useState('')
  const [showCmds,  setShowCmds]  = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [messages,  setMessages]  = useState<Msg[]>([
    { role: 'system', content: 'STAFF7_CORE_AGENT v2.0 · Ollama Cloud · RLS_ENABLED', ts: Date.now() },
    { role: 'agent',  content: 'Ready. Type a question or use `/` to browse commands.', ts: Date.now() },
  ])

  const historyRef = useRef<{ role: string; content: string }[]>([])
  const scrollRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Auto-scroll
  const appendMsg = useCallback((msg: Msg) => {
    setMessages(prev => [...prev, msg])
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, 0)
  }, [])

  // Autocomplete
  const filteredCmds = input.startsWith('/')
    ? ALL_CMDS.filter(c => c.cmd.startsWith(input.split(' ')[0]))
    : []

  // ── Send ────────────────────────────────────────────────────

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return
    const cmd = extractCmd(text)

    appendMsg({ role: 'user', content: text, ts: Date.now() })
    setInput('')
    setShowCmds(false)
    setStreaming(true)

    historyRef.current = [...historyRef.current, { role: 'user', content: text }]

    // Placeholder streaming
    const ts = Date.now()
    setMessages(prev => [...prev, { role: 'agent', content: '▋', ts }])

    try {
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: historyRef.current, cmd }),
      })

      if (!res.ok) {
        const err = await res.text()
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'error', content: `Error ${res.status}: ${err}`, ts },
        ])
        setStreaming(false)
        return
      }

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            // Notre route émet : data: {"text": "..."} 
            const parsed = JSON.parse(data)
            if (parsed.text) {
              fullText += parsed.text
              setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'agent', content: fullText + '▋', ts },
              ])
              // Auto-scroll pendant le streaming
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
              }
            }
          } catch {
            // Ignorer les lignes non-JSON
          }
        }
      }

      // Finaliser (retirer le curseur)
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'agent', content: fullText || '(no response)', ts },
      ])

      historyRef.current = [
        ...historyRef.current,
        { role: 'assistant', content: fullText },
      ]

    } catch (e) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'error', content: `Connection error: ${String(e)}`, ts },
      ])
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }, [streaming, appendMsg])

  // ── Colors / labels ───────────────────────────────────────────

  const roleColor: Record<MsgRole, string> = {
    system: 'var(--text2)',
    user:   '#e8e8e8',
    agent:  'var(--green)',
    error:  'var(--pink)',
  }

  const roleLabel: Record<MsgRole, string> = {
    system: 'SYS',
    user:   user?.email?.split('@')[0].toUpperCase() ?? 'USER',
    agent:  'STAFF7',
    error:  'ERR',
  }

  const model = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'kimi' // pour affichage uniquement

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', gap:16 }}>

      {/* Status bar */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        {[
          {
            name:   'Staffing Guardian',
            status: streaming ? 'THINKING' : 'ONLINE',
            color:  streaming ? 'var(--gold)' : 'var(--green)',
          },
          { name:'Financial Bot',  status:'IDLE', color:'var(--cyan)'  },
          { name:'Leave Monitor',  status:'IDLE', color:'var(--text2)' },
        ].map(a => (
          <div key={a.name} style={{
            display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
            background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:4, fontSize:10,
          }}>
            <span style={{
              color: a.color,
              animation: a.status === 'THINKING' ? 'blink 1s step-end infinite' : 'none',
            }}>●</span>
            <span style={{ color:'var(--text1)', fontWeight:600 }}>{a.name}</span>
            <span style={{ color:'var(--text3)' }}>[{a.status}]</span>
          </div>
        ))}

        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <span style={{
            fontSize:9, color:'var(--text3)', padding:'6px 10px',
            border:'1px solid var(--border)', borderRadius:4,
          }}>
            ollama.com · {model}
          </span>
          <button
            onClick={() => {
              setMessages(msgs => [msgs[0]])
              historyRef.current = []
            }}
            style={{
              background:'none', border:'1px solid var(--border)',
              color:'var(--text3)', fontSize:10, padding:'6px 12px',
              borderRadius:4, cursor:'pointer', fontFamily:'var(--font)',
            }}
          >
            ⌫ clear
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        style={{
          flex:1, background:'var(--bg2)', border:'1px solid var(--border)',
          borderRadius:4, padding:'16px 20px', overflowY:'auto',
          fontFamily:'var(--font-mono, monospace)',
          display:'flex', flexDirection:'column', gap:10,
          cursor:'text',
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <span style={{ color:'var(--text3)', fontSize:9, flexShrink:0, marginTop:3, minWidth:58 }}>
              {fmtTime(m.ts)}
            </span>
            <span style={{ color: roleColor[m.role], fontSize:10, fontWeight:700, flexShrink:0, minWidth:54 }}>
              {roleLabel[m.role]}&gt;
            </span>
            <span
              style={{ color: roleColor[m.role], fontSize:12, lineHeight:1.7, flex:1, wordBreak:'break-word' }}
              dangerouslySetInnerHTML={{
                __html: m.role === 'agent' ? renderMarkdown(m.content) : m.content
              }}
            />
          </div>
        ))}
      </div>

      {/* Input zone */}
      <div style={{ position:'relative' }}>

        {/* Autocomplete dropdown */}
        {(showCmds || filteredCmds.length > 0) && input.startsWith('/') && (
          <div style={{
            position:'absolute', bottom:'calc(100% + 8px)',
            left:0, right:120, maxHeight:360,
            background:'var(--bg2)', border:'1px solid var(--pink)',
            borderRadius:4, overflowY:'auto',
            boxShadow:'0 -10px 40px rgba(0,0,0,.6)', zIndex:20,
          }}>
            {(filteredCmds.length > 0
              ? [{ label: 'Matching', items: filteredCmds }]
              : COMMAND_GROUPS
            ).map(g => (
              <div key={g.label}>
                <div style={{
                  padding:'6px 12px', fontSize:9,
                  color:'var(--text2)', background:'rgba(255,255,255,.02)',
                  letterSpacing:1,
                }}>
                  // {g.label.toUpperCase()}
                </div>
                {g.items.map(c => (
                  <div
                    key={c.cmd}
                    className="cmd-row"
                    onClick={() => {
                      setInput(c.cmd + ' ')
                      setShowCmds(false)
                      inputRef.current?.focus()
                    }}
                    style={{
                      padding:'9px 12px', fontSize:11, cursor:'pointer',
                      borderBottom:'1px solid var(--border)',
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                    }}
                  >
                    <span style={{ color:'var(--pink)', fontWeight:700 }}>{c.cmd}</span>
                    <span style={{ color:'var(--text3)', fontSize:9 }}>{c.desc}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Bar */}
        <div style={{ display:'flex', gap:8 }}>
          <span style={{
            color:'var(--pink)', alignSelf:'center',
            fontSize:13, fontFamily:'var(--font-mono)', flexShrink:0,
          }}>
            &gt;_
          </span>

          <input
            ref={inputRef}
            value={input}
            disabled={streaming}
            autoFocus
            onChange={e => {
              setInput(e.target.value)
              setShowCmds(e.target.value.startsWith('/'))
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input) }
              if (e.key === 'Escape') setShowCmds(false)
            }}
            placeholder={streaming ? 'Agent thinking…' : 'Ask anything, or type / for commands…'}
            style={{
              flex:1, background:'var(--bg3)',
              border:'1px solid var(--border)', borderRadius:4,
              color:'#fff', padding:'12px 14px',
              fontFamily:'var(--font-mono, monospace)', fontSize:12,
              outline:'none', transition:'border-color .15s',
              opacity: streaming ? .6 : 1,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--pink)' }}
            onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />

          <button
            title="Browse commands"
            onClick={() => { setShowCmds(v => !v); inputRef.current?.focus() }}
            style={{
              background:'var(--bg2)', border:'1px solid var(--border)',
              color:'var(--pink)', padding:'0 14px', borderRadius:4,
              cursor:'pointer', fontWeight:700, fontSize:12,
              fontFamily:'var(--font-mono)',
            }}
          >
            [/]
          </button>

          <button
            onClick={() => handleSend(input)}
            disabled={streaming || !input.trim()}
            style={{
              background: (streaming || !input.trim()) ? 'var(--bg3)' : 'var(--pink)',
              color:'#fff', border:'none', padding:'0 22px',
              borderRadius:4, fontWeight:700,
              cursor: (streaming || !input.trim()) ? 'not-allowed' : 'pointer',
              fontSize:12, fontFamily:'var(--font-mono)',
              opacity: (streaming || !input.trim()) ? .4 : 1,
              transition:'opacity .2s, background .2s',
            }}
          >
            {streaming ? '···' : 'EXEC'}
          </button>
        </div>

        <div style={{ marginTop:6, fontSize:9, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>
          ↵ send · / commands · esc close · context injecté depuis Supabase en live
        </div>
      </div>

      <style>{`
        .cmd-row:hover { background: rgba(255,45,107,.1) !important; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
      `}</style>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function AIPage() {
  return (
    <>
      <Topbar title="Agentic Console" breadcrumb="// staff7 intelligence" />
      <div className="app-content">
        <Suspense fallback={
          <div style={{ color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:12 }}>
            // initializing agents…
          </div>
        }>
          <AIContent />
        </Suspense>
      </div>
    </>
  )
}
'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar }          from '@/components/layout/Topbar'
import { useAuthContext }  from '@/components/layout/AuthProvider'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type MsgRole = 'system' | 'user' | 'agent' | 'error'
interface Msg { role: MsgRole; content: string; ts: number }

// ══════════════════════════════════════════════════════════════
// COMMANDES DISPONIBLES
// ══════════════════════════════════════════════════════════════

interface Cmd {
  key:     string   // ce qui est inséré dans l'input
  label:   string   // nom court
  desc:    string   // description
  context: string   // contexte chargé côté route
  color:   string
}

const COMMANDS: Cmd[] = [
  {
    key:     '/staff.bench',
    label:   'staff.bench',
    desc:    'Consultants disponibles + occupancy',
    context: '/staff',
    color:   'var(--green)',
  },
  {
    key:     '/staff.all',
    label:   'staff.all',
    desc:    'Tous les consultants + projets actifs',
    context: '/staff',
    color:   'var(--green)',
  },
  {
    key:     '/leave.check',
    label:   'leave.check',
    desc:    'Congés en attente de validation',
    context: '/leave',
    color:   'var(--gold)',
  },
  {
    key:     '/fin.margin',
    label:   'fin.margin',
    desc:    'Marges et TJM par projet',
    context: '/fin',
    color:   'var(--cyan)',
  },
  {
    key:     '/timesheet.week',
    label:   'timesheet.week',
    desc:    'CRA de la semaine en cours',
    context: '/timesheet',
    color:   'var(--purple)',
  },
]

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function extractCmd(text: string): string {
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

// ══════════════════════════════════════════════════════════════
// CMD MENU
// ══════════════════════════════════════════════════════════════

function CmdMenu({ query, onSelect }: {
  query:    string
  onSelect: (cmd: Cmd) => void
}) {
  const filtered = COMMANDS.filter(c =>
    query === '/' || c.key.includes(query.slice(1))
  )

  if (!filtered.length) return null

  return (
    <div style={{
      position:   'absolute',
      bottom:     'calc(100% + 8px)',
      left:       0, right: 0,
      background: 'var(--bg2)',
      border:     '1px solid var(--border)',
      borderRadius: 6,
      overflow:   'hidden',
      zIndex:     50,
      boxShadow:  '0 -8px 32px rgba(0,0,0,.5)',
    }}>
      <div style={{
        padding: '6px 14px',
        fontSize: 9, letterSpacing: 3,
        color: 'var(--text2)', textTransform: 'uppercase',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(0,0,0,.2)',
      }}>
        // commands · ↑↓ navigate · ↵ select · esc close
      </div>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.key}
          onMouseDown={e => { e.preventDefault(); onSelect(cmd) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            width: '100%', textAlign: 'left',
            padding: '10px 14px',
            background: 'none',
            border: 'none',
            borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono, monospace)',
            transition: 'background .1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: cmd.color,
            minWidth: 130,
          }}>
            {cmd.key}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1 }}>
            {cmd.desc}
          </span>
          <span style={{
            fontSize: 8, padding: '1px 6px', borderRadius: 2,
            background: `${cmd.color}18`, color: cmd.color,
            border: `1px solid ${cmd.color}33`,
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            {cmd.context.slice(1)}
          </span>
        </button>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// AI CONTENT
// ══════════════════════════════════════════════════════════════

function AIContent() {
  const searchParams = useSearchParams()
  const { user }     = useAuthContext()

  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showMenu,  setShowMenu]  = useState(false)
  const [messages,  setMessages]  = useState<Msg[]>([
    { role: 'system', content: 'STAFF7_CORE_AGENT v2.0 · Ollama Cloud · RLS_ENABLED', ts: Date.now() },
    { role: 'agent',  content: 'Ready. Ask anything or type `/` to browse structured commands.', ts: Date.now() },
  ])

  const historyRef = useRef<{ role: string; content: string }[]>([])
  const scrollRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const menuRef    = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Pre-fill from sidebar (?q=...)
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setInput(q)
      inputRef.current?.focus()
      if (q.startsWith('/')) setShowMenu(true)
    }
  }, [searchParams])

  // Ouvrir/fermer le menu selon l'input
  const handleInputChange = (val: string) => {
    setInput(val)
    setShowMenu(val.startsWith('/') && val.length >= 1)
  }

  // Sélection d'une commande depuis le menu
  const handleSelectCmd = (cmd: Cmd) => {
    setInput(cmd.key + ' ')
    setShowMenu(false)
    inputRef.current?.focus()
  }

  // Fermer le menu sur Escape
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setShowMenu(false); return }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (showMenu) { setShowMenu(false); return }
      handleSend(input)
    }
  }

  // ── Send ────────────────────────────────────────────────────

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return
    const cmd = extractCmd(text)

    setMessages(prev => [...prev, { role: 'user', content: text, ts: Date.now() }])
    setInput('')
    setShowMenu(false)
    setStreaming(true)

    historyRef.current = [...historyRef.current, { role: 'user', content: text }]

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
        setMessages(prev => [...prev.slice(0, -1), { role: 'error', content: `HTTP ${res.status}: ${err}`, ts }])
        return
      }

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              fullText += parsed.text
              setMessages(prev => [...prev.slice(0, -1), { role: 'agent', content: fullText + '▋', ts }])
            }
          } catch { /* skip */ }
        }
      }

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'agent', content: fullText || '(no response)', ts },
      ])
      historyRef.current = [...historyRef.current, { role: 'assistant', content: fullText }]

    } catch (e) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'error', content: `Connection error: ${String(e)}`, ts },
      ])
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }, [streaming])

  // ── Couleurs / labels ────────────────────────────────────────

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

  // ── Render ──────────────────────────────────────────────────

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', gap:16 }}>

      {/* Agent status bar */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        {[
          { name:'Staffing Guardian', status: streaming ? 'THINKING' : 'ONLINE', color: streaming ? 'var(--gold)' : 'var(--green)' },
          { name:'Financial Bot',     status: 'IDLE', color: 'var(--cyan)'  },
          { name:'Leave Monitor',     status: 'IDLE', color: 'var(--text2)' },
        ].map(a => (
          <div key={a.name} style={{
            display:'flex', alignItems:'center', gap:7,
            padding:'6px 12px',
            background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:4, fontSize:10,
          }}>
            <span style={{
              color: a.color,
              animation: a.status === 'THINKING' ? 'pulse 1s infinite' : 'none',
            }}>●</span>
            <span style={{ color:'var(--text1)', fontWeight:600 }}>{a.name}</span>
            <span style={{ color:'var(--text3)' }}>[{a.status}]</span>
          </div>
        ))}

        {/* Hint commandes */}
        <div style={{
          display:'flex', gap:6, flexWrap:'wrap',
          marginLeft: 8,
        }}>
          {COMMANDS.slice(0,3).map(c => (
            <button
              key={c.key}
              onClick={() => { setInput(c.key + ' '); setShowMenu(false); inputRef.current?.focus() }}
              style={{
                background:'none', border:`1px solid ${c.color}33`,
                color: c.color, fontSize:9, padding:'2px 8px',
                borderRadius:3, cursor:'pointer',
                fontFamily:'var(--font-mono, monospace)',
                letterSpacing:1,
              }}
            >
              {c.key}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setMessages(msgs => [msgs[0]]); historyRef.current = [] }}
          style={{
            marginLeft:'auto', background:'none',
            border:'1px solid var(--border)', color:'var(--text3)',
            fontSize:10, padding:'6px 12px', borderRadius:4,
            cursor:'pointer', fontFamily:'var(--font)',
          }}
        >
          ⌫ clear
        </button>
      </div>

      {/* Terminal */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        style={{
          flex:1,
          background:'var(--bg2)', border:'1px solid var(--border)',
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
                __html: m.role === 'agent' ? renderMarkdown(m.content) : m.content,
              }}
            />
          </div>
        ))}
      </div>

      {/* Input + cmd menu */}
      <div>
        <div style={{ position:'relative' }} ref={menuRef}>
          {/* Menu /cmd */}
          {showMenu && (
            <CmdMenu
              query={input}
              onSelect={handleSelectCmd}
            />
          )}

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
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={streaming ? 'Agent thinking…' : 'Ask anything or type / for commands'}
              style={{
                flex:1, background:'var(--bg3)',
                border:`1px solid ${showMenu ? 'var(--pink)' : 'var(--border)'}`,
                borderRadius:4,
                color:'#fff', padding:'12px 14px',
                fontFamily:'var(--font-mono, monospace)', fontSize:12,
                outline:'none', transition:'border-color .15s',
                opacity: streaming ? .6 : 1,
              }}
              onFocus={e  => { if (!showMenu) e.currentTarget.style.borderColor = 'var(--pink)' }}
              onBlur={e   => { e.currentTarget.style.borderColor = showMenu ? 'var(--pink)' : 'var(--border)' }}
            />

            <button
              onClick={() => handleSend(input)}
              disabled={streaming || !input.trim()}
              style={{
                background: (streaming || !input.trim()) ? 'var(--bg3)' : 'var(--pink)',
                color:'#fff', border:'none', padding:'0 24px',
                borderRadius:4, fontWeight:700,
                cursor: (streaming || !input.trim()) ? 'not-allowed' : 'pointer',
                fontSize:12, fontFamily:'var(--font-mono)',
                opacity: (streaming || !input.trim()) ? .4 : 1,
                transition:'opacity .2s, background .2s',
                flexShrink:0,
              }}
            >
              {streaming ? '···' : 'EXEC'}
            </button>
          </div>
        </div>

        <div style={{ marginTop:6, fontSize:9, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>
          ↵ send · / commands · esc close menu · context live Supabase · {process.env.NEXT_PUBLIC_AI_MODEL ?? 'kimi-k2.5:cloud'}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        :root { --purple: #b388ff; }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

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
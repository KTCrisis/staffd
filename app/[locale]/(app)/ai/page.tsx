'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar }          from '@/components/layout/Topbar'
import { useAuthContext }  from '@/components/layout/AuthProvider'

// ── Types ─────────────────────────────────────────────────────

type MsgRole = 'system' | 'user' | 'agent' | 'error'
interface Msg { role: MsgRole; content: string; ts: number }

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

// ── AIContent ─────────────────────────────────────────────────

function AIContent() {
  const searchParams = useSearchParams()
  const { user }     = useAuthContext()

  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [messages,  setMessages]  = useState<Msg[]>([
    { role: 'system', content: 'STAFF7_CORE_AGENT v2.0 · Ollama Cloud · RLS_ENABLED', ts: Date.now() },
    { role: 'agent',  content: 'Ready. Ask anything or type `/` for structured commands.', ts: Date.now() },
  ])

  const historyRef = useRef<{ role: string; content: string }[]>([])
  const scrollRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Pre-fill from sidebar command bar (?q=...)
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) { setInput(q); inputRef.current?.focus() }
  }, [searchParams])

  const appendMsg = useCallback((msg: Msg) => {
    setMessages(prev => [...prev, msg])
  }, [])

  // ── Send ──────────────────────────────────────────────────────

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return
    const cmd = extractCmd(text)

    appendMsg({ role: 'user', content: text, ts: Date.now() })
    setInput('')
    setStreaming(true)

    historyRef.current = [...historyRef.current, { role: 'user', content: text }]

    // Placeholder avec curseur
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

      setMessages(prev => [...prev.slice(0, -1), { role: 'agent', content: fullText || '(no response)', ts }])
      historyRef.current = [...historyRef.current, { role: 'assistant', content: fullText }]

    } catch (e) {
      setMessages(prev => [...prev.slice(0, -1), { role: 'error', content: `Connection error: ${String(e)}`, ts }])
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }, [streaming, appendMsg])

  // ── Couleurs / labels ─────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', gap:16 }}>

      {/* Agent status bar */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        {[
          { name:'Staffing Guardian', status: streaming ? 'THINKING' : 'ONLINE', color: streaming ? 'var(--gold)' : 'var(--green)' },
          { name:'Financial Bot',     status:'IDLE', color:'var(--cyan)'  },
          { name:'Leave Monitor',     status:'IDLE', color:'var(--text2)' },
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
                __html: m.role === 'agent' ? renderMarkdown(m.content) : m.content
              }}
            />
          </div>
        ))}
      </div>

      {/* Input */}
      <div>
        <div style={{ display:'flex', gap:8 }}>
          <span style={{ color:'var(--pink)', alignSelf:'center', fontSize:13, fontFamily:'var(--font-mono)', flexShrink:0 }}>
            &gt;_
          </span>

          <input
            ref={inputRef}
            value={input}
            disabled={streaming}
            autoFocus
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input) }
            }}
            placeholder={streaming ? 'Agent thinking…' : 'Ask anything or /staff.bench · /fin.margin · /leave.check'}
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

        <div style={{ marginTop:6, fontSize:9, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>
          ↵ send · context live depuis Supabase · modèle: kimi-k2.5:cloud
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
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
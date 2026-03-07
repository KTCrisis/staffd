// components/ai/AIContent.tsx
// ── Client Component ─────────────────────────────────────────
// Tout le streaming/state reste ici. Plus de useAuthContext.

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase }        from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────

type MsgRole = 'system' | 'user' | 'agent' | 'error' | 'action'
interface Msg { role: MsgRole; content: string; ts: number }
interface PendingAction { action: string; params: Record<string, string> }

// ── Commandes ─────────────────────────────────────────────────

interface Cmd { id: string; label: string; desc: string; context: string; color: string }

const COMMANDS: Cmd[] = [
  { id: '/staff.bench',     label: 'staff.bench',     desc: 'Consultants disponibles + occupancy',                              context: '/staff',     color: 'var(--green)'  },
  { id: '/staff.all',       label: 'staff.all',       desc: 'Tous les consultants + projets actifs',                            context: '/staff',     color: 'var(--green)'  },
  { id: '/leave.check',     label: 'leave.check',     desc: 'Congés en attente de validation',                                  context: '/leave',     color: 'var(--gold)'   },
  { id: '/fin.margin',      label: 'fin.margin',      desc: 'Marges et TJM par projet',                                         context: '/fin',       color: 'var(--cyan)'   },
  { id: '/timesheet.week',  label: 'timesheet.week',  desc: 'CRA de la semaine en cours',                                       context: '/timesheet', color: 'var(--purple)' },
  { id: '/profit.analysis', label: 'profit.analysis', desc: 'Rentabilité par consultant — marges, cibles, freelance vs salarié',context: '/profit',   color: 'var(--pink)'   },
]

// ── Helpers ───────────────────────────────────────────────────

function extractCmd(text: string) { const m = text.match(/^(\/[\w.]+)/); return m ? m[1] : '' }
function fmtTime(ts: number) { return new Date(ts).toLocaleTimeString('en', { hour12: false }) }
function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>')
    .replace(/`(.+?)`/g,       '<code style="color:var(--cyan);font-family:inherit">$1</code>')
    .replace(/\n/g,            '<br/>')
}

// ── CmdMenu ───────────────────────────────────────────────────

function CmdMenu({ query, onSelect }: { query: string; onSelect: (cmd: Cmd) => void }) {
  const filtered = COMMANDS.filter(c => query === '/' || c.id.includes(query.slice(1)))
  if (!filtered.length) return null
  return (
    <div className="cmd-menu">
      <div className="cmd-menu-header">// commands · ↑↓ navigate · ↵ select · esc close</div>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.id}
          onMouseDown={e => { e.preventDefault(); onSelect(cmd) }}
          className="cmd-menu-btn"
          style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
        >
          <span className="cmd-menu-id"    style={{ color: cmd.color }}>{cmd.id}</span>
          <span className="cmd-menu-desc">{cmd.desc}</span>
          <span className="cmd-menu-badge" style={{ background: `${cmd.color}18`, color: cmd.color, border: `1px solid ${cmd.color}33` }}>
            {cmd.context.slice(1)}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────

interface Props {
  userEmail?: string | null
}

// ── Composant principal ───────────────────────────────────────

export function AIContent({ userEmail }: Props) {
  const searchParams = useSearchParams()

  const [input,         setInput]        = useState('')
  const [streaming,     setStreaming]     = useState(false)
  const [showMenu,      setShowMenu]      = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [messages,      setMessages]      = useState<Msg[]>([
    { role: 'system', content: 'STAFF7_CORE_AGENT v2.0 · Ollama Cloud · RLS_ENABLED', ts: Date.now() },
    { role: 'agent',  content: 'Ready. Ask anything or type `/` to browse structured commands.', ts: Date.now() },
  ])

  const historyRef = useRef<{ role: string; content: string }[]>([])
  const scrollRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const menuRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) { setInput(q); inputRef.current?.focus(); if (q.startsWith('/')) setShowMenu(true) }
  }, [searchParams])

  const handleInputChange = (val: string) => {
    setInput(val)
    setShowMenu(val.startsWith('/') && val.length >= 1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setShowMenu(false); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (showMenu) { setShowMenu(false); return }; handleSend(input) }
  }

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
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
            if (parsed.action) {
              setPendingAction({ action: parsed.action, params: parsed.params ?? {} })
              setMessages(prev => [...prev.slice(0, -1), { role: 'action', content: JSON.stringify({ action: parsed.action, params: parsed.params ?? {} }), ts }])
              return
            }
            if (parsed.text) { fullText += parsed.text; setMessages(prev => [...prev.slice(0, -1), { role: 'agent', content: fullText + '▋', ts }]) }
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
  }, [streaming])

  const handleExecute = useCallback(async (action: string, params: Record<string, string>) => {
    setPendingAction(null)
    setStreaming(true)
    const ts = Date.now()
    setMessages(prev => [...prev, { role: 'agent', content: '▋', ts }])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const res = await fetch('/api/ai', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ action, params }),
      })
      const result = await res.json()
      setMessages(prev => [...prev.slice(0, -1), { role: result.success ? 'agent' : 'error', content: result.message, ts }])
      historyRef.current = [...historyRef.current, { role: 'assistant', content: result.message }]
    } catch (e) {
      setMessages(prev => [...prev.slice(0, -1), { role: 'error', content: `Execution error: ${String(e)}`, ts }])
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }, [])

  const handleCancelAction = useCallback(() => {
    setPendingAction(null)
    setMessages(prev => [...prev.slice(0, -1), { role: 'system', content: '// action cancelled', ts: Date.now() }])
  }, [])

  const roleColor: Record<MsgRole, string> = {
    system: 'var(--text2)', user: 'var(--text)', agent: 'var(--green)', error: 'var(--pink)', action: 'var(--gold)',
  }
  const roleLabel: Record<MsgRole, string> = {
    system: 'SYS',
    user:   userEmail?.split('@')[0].toUpperCase() ?? 'USER',  // ← prop, plus useAuthContext
    agent:  'STAFF7',
    error:  'ERR',
    action: 'ACTION',
  }

  const ACTION_LABELS: Record<string, string> = {
    approve_leave: 'Approve leave request', refuse_leave: 'Refuse leave request',
    update_project_status: 'Update project status', assign_consultant: 'Assign consultant',
  }

  return (
    <div className="ai-layout">

      {/* Agent status bar */}
      <div className="ai-agents">
        {[
          { name: 'Staffing Guardian', status: streaming ? 'THINKING' : 'ONLINE', color: streaming ? 'var(--gold)' : 'var(--green)' },
          { name: 'Financial Bot',     status: 'IDLE', color: 'var(--cyan)'  },
          { name: 'Leave Monitor',     status: 'IDLE', color: 'var(--text2)' },
        ].map(a => (
          <div key={a.name} className="ai-agent">
            <span className="ai-agent-dot" style={{ color: a.color, animation: a.status === 'THINKING' ? 'pulse 1s infinite' : 'none' }}>●</span>
            <span className="ai-agent-name">{a.name}</span>
            <span className="ai-agent-status">[{a.status}]</span>
          </div>
        ))}
        <div className="ai-cmd-hints">
          {COMMANDS.slice(0, 3).map(c => (
            <button key={c.id} onClick={() => { setInput(c.id + ' '); setShowMenu(false); inputRef.current?.focus() }}
              className="ai-cmd-hint" style={{ color: c.color, border: `1px solid ${c.color}33` }}>
              {c.id}
            </button>
          ))}
        </div>
        <button onClick={() => { setMessages(msgs => [msgs[0]]); historyRef.current = [] }} className="ai-clear-btn">
          ⌫ clear
        </button>
      </div>

      {/* Terminal */}
      <div ref={scrollRef} onClick={() => inputRef.current?.focus()} className="ai-terminal">
        {messages.map((m, i) => {
          if (m.role === 'action') {
            let parsed: { action: string; params: Record<string, string> } | null = null
            try { parsed = JSON.parse(m.content) } catch { /* skip */ }
            if (!parsed) return null
            const isLast   = i === messages.length - 1
            const label    = ACTION_LABELS[parsed.action] ?? parsed.action
            const isDanger = parsed.action.includes('refuse') || parsed.action.includes('update')
            return (
              <div key={i} className="ai-msg">
                <span className="ai-msg-ts">{fmtTime(m.ts)}</span>
                <span className="ai-msg-role" style={{ color: 'var(--gold)' }}>ACTION&gt;</span>
                <div className="ai-action-card">
                  <div className="ai-action-title">⚠ {label}</div>
                  <div className="ai-action-params">
                    {Object.entries(parsed.params).map(([k, v]) => (
                      <div key={k}><span className="ai-action-key">{k}: </span><span className="ai-action-val">{v}</span></div>
                    ))}
                  </div>
                  {isLast && pendingAction && (
                    <div className="ai-action-btns">
                      <button onClick={() => handleExecute(parsed!.action, parsed!.params)}
                        className={`ai-action-btn ${isDanger ? 'ai-action-btn--danger' : 'ai-action-btn--confirm'}`}>
                        CONFIRM
                      </button>
                      <button onClick={handleCancelAction} className="ai-action-btn ai-action-btn--cancel">CANCEL</button>
                    </div>
                  )}
                </div>
              </div>
            )
          }
          return (
            <div key={i} className="ai-msg">
              <span className="ai-msg-ts">{fmtTime(m.ts)}</span>
              <span className="ai-msg-role" style={{ color: roleColor[m.role] }}>{roleLabel[m.role]}&gt;</span>
              <span className="ai-msg-content" style={{ color: roleColor[m.role] }}
                dangerouslySetInnerHTML={{ __html: m.role === 'agent' ? renderMarkdown(m.content) : m.content }} />
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div>
        <div className="ai-input-wrap" ref={menuRef}>
          {showMenu && <CmdMenu query={input} onSelect={cmd => { setInput(cmd.id + ' '); setShowMenu(false); inputRef.current?.focus() }} />}
          <div className="ai-input-row">
            <span className="ai-prompt">&gt;_</span>
            <input ref={inputRef} value={input} disabled={streaming} autoFocus
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={streaming ? 'Agent thinking…' : 'Ask anything or type / for commands'}
              className={`ai-input ${showMenu ? 'ai-input--menu-open' : ''}`}
            />
            <button onClick={() => handleSend(input)} disabled={streaming || !input.trim()} className="ai-send">
              {streaming ? '···' : 'EXEC'}
            </button>
          </div>
        </div>
        <div className="ai-hint">
          ↵ send · / commands · esc close menu · context live Supabase · {process.env.NEXT_PUBLIC_AI_MODEL ?? 'kimi-k2.5:cloud'}
        </div>
      </div>

    </div>
  )
}
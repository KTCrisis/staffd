'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'

// ── CONFIGURATION DES COMMANDES (Toute la liste) ───────────────────────

const COMMAND_GROUPS = [
  {
    label: 'Resource & Staffing',
    items: [
      { cmd: '/staff.find', desc: 'Find talent by skill/rate' },
      { cmd: '/staff.assign', desc: 'Allocate member to project' },
      { cmd: '/staff.bench', desc: 'Who is currently available?' },
      { cmd: '/staff.optimize', desc: 'Balance team workload' },
      { cmd: '/staff.gap', desc: 'Identify staffing shortages' },
    ]
  },
  {
    label: 'Timesheets (The Guardian)',
    items: [
      { cmd: '/timesheet.status', desc: 'Check submission status' },
      { cmd: '/timesheet.remind', desc: 'Nudge missing logs' },
      { cmd: '/timesheet.fill', desc: 'Pre-fill from planning' },
      { cmd: '/timesheet.reconcile', desc: 'Planned vs Actual logs' },
    ]
  },
  {
    label: 'Financials & Margins',
    items: [
      { cmd: '/fin.margin', desc: 'Check project profitability' },
      { cmd: '/fin.alerts', desc: 'Low margin warnings' },
      { cmd: '/fin.rates', desc: 'Average daily rates' },
      { cmd: '/fin.forecast', desc: 'Revenue projections' },
    ]
  },
  {
    label: 'Strategic Simulations',
    items: [
      { cmd: '/sim.hire', desc: 'New hire break-even' },
      { cmd: '/sim.churn', desc: 'Impact of losing a client' },
      { cmd: '/sim.utilization', desc: '4-day week impact' },
    ]
  },
  {
    label: 'Absence & PTO',
    items: [
      { cmd: '/leave.check', desc: 'Who is out of office?' },
      { cmd: '/leave.approve', desc: 'Batch approve requests' },
      { cmd: '/leave.impact', desc: 'Risk analysis of leave' },
    ]
  }
]

// ── COMPOSANT INTERNE ──────────────────────────────────────────────────

function AIContent() {
  const searchParams = useSearchParams()
  const [input, setInput] = useState('')
  const [showCmds, setShowCmds] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'system', content: 'STAFF7_CORE_AGENT v1.0.2 connected. Context: RLS_ENABLED.' }
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = async (text: string) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setShowCmds(false)
    // Simulation
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'agent', content: `Processing: ${text}...` }])
    }, 600)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      
      {/* Agent Status Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <AgentStatus name="Staffing Guardian" status="ONLINE" color="var(--green)" />
        <AgentStatus name="Financial Bot" status="IDLE" color="var(--cyan)" />
      </div>

      {/* Terminal View */}
      <div style={{ 
        flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', 
        borderRadius: '4px', padding: '20px', overflowY: 'auto', 
        fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', gap: '8px'
      }} ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            fontSize: '12px', color: m.role === 'agent' ? 'var(--pink)' : m.role === 'system' ? 'var(--text2)' : '#fff'
          }}>
            <span style={{ opacity: 0.4 }}>[{new Date().toLocaleTimeString()}]</span> {m.role.toUpperCase()}&gt; {m.content}
          </div>
        ))}
      </div>

      {/* Action Zone */}
      <div style={{ position: 'relative', marginTop: '20px', display: 'flex', gap: '10px' }}>
        
        {/* Command Dropdown (Catégorisé) */}
        {showCmds && (
          <div style={{ 
            position: 'absolute', bottom: '100%', right: '120px', width: '320px', maxHeight: '400px',
            background: 'var(--bg2)', border: '1px solid var(--pink)', borderRadius: '4px',
            marginBottom: '10px', zIndex: 10, overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
          }}>
            {COMMAND_GROUPS.map(group => (
              <div key={group.label}>
                <div style={{ padding: '8px 12px', fontSize: '9px', color: 'var(--text2)', background: 'rgba(255,255,255,0.03)', letterSpacing: 1 }}>
                  // {group.label.toUpperCase()}
                </div>
                {group.items.map(c => (
                  <div key={c.cmd} onClick={() => { setInput(c.cmd + ' '); setShowCmds(false); }}
                    style={{ padding: '10px 12px', fontSize: '11px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
                    className="cmd-item">
                    <span style={{ color: 'var(--pink)', fontWeight: 'bold' }}>{c.cmd}</span>
                    <span style={{ color: 'var(--text2)', fontSize: '9px' }}>{c.desc}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder="Type / to see commands..." 
          style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', color: '#fff', padding: '12px', borderRadius: '4px', fontFamily: 'var(--font)' }}
        />

        <button onClick={() => setShowCmds(!showCmds)}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--pink)', padding: '0 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          [/]
        </button>

        <button onClick={() => handleSend(input)}
          style={{ background: 'var(--pink)', color: '#fff', border: 'none', padding: '0 25px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          EXEC
        </button>
      </div>

      <style>{`.cmd-item:hover { background: rgba(255, 45, 107, 0.1); }`}</style>
    </div>
  )
}

export default function AIPage() {
  return (
    <>
      <Topbar title="Agentic Console" breadcrumb="Intelligence / Agents" />
      <div className="app-content">
        <Suspense fallback={<div>Loading agents...</div>}><AIContent /></Suspense>
      </div>
    </>
  )
}

function AgentStatus({ name, status, color }: { name: string, status: string, color: string }) {
  return (
    <div style={{ padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: '4px', fontSize: '10px' }}>
      <span style={{ color }}>●</span> {name} <span style={{ color: 'var(--text2)' }}>[{status}]</span>
    </div>
  )
}
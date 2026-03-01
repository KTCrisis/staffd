'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/Topbar'

// Composant interne pour gérer les paramètres de recherche (nécessaire pour Next.js)
function AIContent() {
  const t = useTranslations('ai')
  const searchParams = useSearchParams()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'system', content: 'STAFF7_CORE_AGENT v1.0.2 connected. Ready for instructions.' }
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const query = searchParams.get('q')
    if (query) handleSend(query)
  }, [searchParams])

  const handleSend = async (text: string) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    // Simulation API Railway / FastAPI
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'agent', content: `Executing command: ${text}...` }])
    }, 800)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Status Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <AgentStatus name="Staffing Guardian" status="ONLINE" color="var(--green)" />
        <AgentStatus name="Timesheet Bot" status="IDLE" color="var(--pink)" />
      </div>

      {/* Terminal View */}
      <div style={{ 
        flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', 
        borderRadius: '4px', padding: '16px', overflowY: 'auto', fontFamily: 'var(--font)' 
      }} ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            fontSize: '12px', marginBottom: '8px',
            color: m.role === 'agent' ? 'var(--pink)' : m.role === 'system' ? 'var(--text2)' : '#fff' 
          }}>
            <span style={{ opacity: 0.4 }}>[{new Date().toLocaleTimeString()}]</span> {m.role.toUpperCase()}&gt; {m.content}
          </div>
        ))}
      </div>

      {/* Input Zone */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder="Ask anything..." 
          style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', color: '#fff', padding: '12px', borderRadius: '4px', fontFamily: 'var(--font)' }}
        />
        <button onClick={() => handleSend(input)} style={{ background: 'var(--pink)', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          EXECUTE
        </button>
      </div>
    </div>
  )
}

// Page principale avec la Topbar
export default function AIPage() {
  return (
    <>
      <Topbar title="Agentic Console" breadcrumb="Intelligence / Agents" />
      <div className="app-content">
        <Suspense fallback={<div>Loading Agent...</div>}>
          <AIContent />
        </Suspense>
      </div>
    </>
  )
}

function AgentStatus({ name, status, color }: { name: string, status: string, color: string }) {
  return (
    <div style={{ padding: '6px 12px', border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: '4px', fontSize: '10px' }}>
      <span style={{ color }}>●</span> {name}: <span style={{ color: 'var(--text2)' }}>{status}</span>
    </div>
  )
}
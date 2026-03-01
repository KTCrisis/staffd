'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AIPage() {
  const searchParams = useSearchParams()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'system', content: 'STAF7_CORE_AGENT v1.0.2 connected. Ready for instructions.' }
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  // Récupère la commande si elle vient de la sidebar
  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      handleSend(query)
    }
  }, [searchParams])

  const handleSend = async (text: string) => {
    if (!text.trim()) return
    
    // Ajout du message utilisateur
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')

    // Simulation de réponse de l'agent (en attendant ton FastAPI)
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: `Processing command: ${text}... Accessing Supabase RLS context... Done.` 
      }])
    }, 1000)
  }

  return (
    <div className="ai-container" style={{ padding: '24px', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Statut Agents */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
        <AgentStatus badge="ONLINE" name="Staffing Guardian" color="var(--green)" />
        <AgentStatus badge="IDLE" name="Timesheet Bot" color="var(--pink)" />
        <AgentStatus badge="STANDBY" name="Margin Predictor" color="var(--cyan)" />
      </div>

      {/* Terminal de Discussion */}
      <div style={{ 
        flex: 1, 
        background: 'var(--bg2)', 
        border: '1px solid var(--border)', 
        borderRadius: '4px',
        padding: '20px',
        overflowY: 'auto',
        fontFamily: 'var(--font)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }} ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            fontSize: '12px', 
            color: m.role === 'system' ? 'var(--text2)' : m.role === 'agent' ? 'var(--pink)' : '#fff',
            lineHeight: 1.5
          }}>
            <span style={{ opacity: 0.5 }}>[{new Date().toLocaleTimeString()}]</span> 
            <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>
              {m.role.toUpperCase()}&gt;
            </span> {m.content}
          </div>
        ))}
      </div>

      {/* Zone de saisie */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder="Type a command (e.g. /staff.find or /timesheet.remind)..."
          style={{ 
            flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', 
            padding: '12px', color: '#fff', borderRadius: '4px', fontFamily: 'var(--font)', fontSize: '13px'
          }}
        />
        <button 
          onClick={() => handleSend(input)}
          style={{ background: 'var(--pink)', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          EXECUTE
        </button>
      </div>
    </div>
  )
}

function AgentStatus({ name, badge, color }: { name: string, badge: string, color: string }) {
  return (
    <div style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg2)' }}>
      <div style={{ fontSize: '9px', color, fontWeight: 'bold', letterSpacing: '1px' }}>● {badge}</div>
      <div style={{ fontSize: '11px', color: '#fff', marginTop: '4px' }}>{name}</div>
    </div>
  )
}
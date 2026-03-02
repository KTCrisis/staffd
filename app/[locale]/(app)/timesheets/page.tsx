'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/Topbar'
import { Panel } from '@/components/ui'
import { useAuthContext } from '@/components/layout/AuthProvider'
import { supabase } from '@/lib/supabase'

// ── UTILS ────────────────────────────────────────────────────────────

/** * Calcule le lundi de la semaine pour une date donnée 
 */
function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

// ── COMPOSANT DE LIGNE (PROJET) ──────────────────────────────────────

interface ProjectRowProps {
  project: { id: string; name: string }
  weekStart: Date
  logs: Record<string, number>
  onUpdate: (date: string, val: string) => void
}

function ProjectRow({ project, weekStart, logs, onUpdate }: ProjectRowProps) {
  let rowTotal = 0

  // Génère les 5 jours ouvrés de la semaine
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d.toISOString().split('T')[0] // Format YYYY-MM-DD
  })

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '16px', fontSize: '13px', fontWeight: 500 }}>
        {project.name}
      </td>
      {days.map((date: string) => {
        const val = logs[`${project.id}_${date}`] || 0
        rowTotal += val
        
        return (
          <td key={date} style={{ padding: '6px' }}>
            <input 
              type="number" 
              step="0.5" 
              min="0" 
              max="1"
              value={val}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate(date, e.target.value)}
              style={{ 
                width: '100%', textAlign: 'center', background: 'var(--bg2)', 
                border: '1px solid var(--border)', color: '#fff', 
                borderRadius: '4px', padding: '10px 0', fontFamily: 'var(--font)',
                fontSize: '13px'
              }}
            />
          </td>
        )
      })}
      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--green)', fontSize: '14px' }}>
        {rowTotal.toFixed(1)}
      </td>
    </tr>
  )
}

// ── PAGE PRINCIPALE ──────────────────────────────────────────────────

function TimesheetContent() {
  const t = useTranslations('timesheets')
  const { user } = useAuthContext()
  
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [projects, setProjects] = useState<any[]>([])
  const [logs, setLogs] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Navigation entre les semaines
  const shiftWeek = (days: number) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + days)
    setWeekStart(d)
  }

  // Chargement des données (Assignments + Logs existants)
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      setLoading(true)
      
      const mondayStr = weekStart.toISOString().split('T')[0]
      const fridayStr = new Date(new Date(weekStart).setDate(weekStart.getDate() + 4)).toISOString().split('T')[0]

      // 1. Récupérer les projets assignés
      const { data: assignments } = await supabase
        .from('assignments')
        .select('project_id, projects(id, name)')
        .eq('consultant_id', user.id)

      // 2. Récupérer les logs de la semaine
      const { data: existingLogs } = await supabase
        .from('timesheets')
        .select('project_id, date, value')
        .eq('consultant_id', user.id)
        .gte('date', mondayStr)
        .lte('date', fridayStr)

      const logMap: Record<string, number> = {}
      existingLogs?.forEach(l => {
        logMap[`${l.project_id}_${l.date}`] = Number(l.value)
      })

      setProjects(assignments || [])
      setLogs(logMap)
      setLoading(false)
    }
    fetchData()
  }, [weekStart, user?.id])

  const updateLog = (projId: string, date: string, val: string) => {
    const numVal = parseFloat(val)
    setLogs(prev => ({ 
      ...prev, 
      [`${projId}_${date}`]: isNaN(numVal) ? 0 : numVal 
    }))
  }

  const handleSave = async () => {
    // Logique d'enregistrement (Upsert) à implémenter ici
    console.log("Saving logs:", logs)
    alert("Timesheet saved locally (MOCK)")
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 4)

  return (
    <>
      <Topbar 
        title="My Timesheet" 
        breadcrumb="Activity / Timesheet" 
        ctaLabel="Save Changes" 
        onCta={handleSave} 
      />

      <div className="app-content">
        {/* Navigation Semaine */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-sm" onClick={() => shiftWeek(-7)}>←</button>
            <button className="btn btn-sm" onClick={() => setWeekStart(getMonday(new Date()))}>Today</button>
            <button className="btn btn-sm" onClick={() => shiftWeek(7)}>→</button>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
            {weekStart.toLocaleDateString()} — {weekEnd.toLocaleDateString()}
          </span>
        </div>

        <Panel noPadding>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '11px', color: 'var(--text2)', textTransform: 'uppercase' }}>Project</th>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
                    <th key={d} style={{ width: '90px', padding: '12px', fontSize: '11px', color: 'var(--text2)' }}>{d}</th>
                  ))}
                  <th style={{ width: '80px', padding: '12px', fontSize: '11px', color: 'var(--green)' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)', fontSize: '12px' }}>Loading assignments...</td></tr>
                ) : projects.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)', fontSize: '12px' }}>No active assignments for this week.</td></tr>
                ) : (
                  projects.map((item: any) => (
                    <ProjectRow 
                      key={item.project_id}
                      project={item.projects}
                      weekStart={weekStart}
                      logs={logs}
                      onUpdate={(date, val) => updateLog(item.project_id, date, val)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <div style={{ marginTop: '24px', fontSize: '11px', color: 'var(--text2)', fontStyle: 'italic' }}>
          * Enter 1.0 for a full day, 0.5 for a half day. All logs are subject to manager approval.
        </div>
      </div>
    </>
  )
}

export default function TimesheetPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TimesheetContent />
    </Suspense>
  )
}
'use client'

/**
 * components/projects/AssignmentModal.tsx
 * Modal pour affecter un consultant à un projet
 * Saisie en jours ouvrés ↔ % allocation (bidirectionnel)
 */

import { useState, useMemo }  from 'react'
import { useTranslations }    from 'next-intl'
import { useConsultants, createAssignment, useCompanySettings } from '@/lib/data'
import type { Project }       from '@/types'

// ── Helper : jours ouvrés entre deux dates ────────────────────
function countWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 0
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function daysToPercent(days: number, totalDays: number): number {
  if (totalDays <= 0 || days <= 0) return 0
  return Math.min(100, Math.round((days / totalDays) * 100))
}

function percentToDays(pct: number, totalDays: number): number {
  if (totalDays <= 0 || pct <= 0) return 0
  return Math.round((pct / 100) * totalDays)
}

interface AssignmentModalProps {
  project:  Project
  onClose:  () => void
  onSaved:  () => void
}

export function AssignmentModal({ project, onClose, onSaved }: AssignmentModalProps) {
  const t = useTranslations('assignments')

  const { data: consultants }     = useConsultants()
  const { data: companySettings } = useCompanySettings()

  const [consultantId, setConsultantId] = useState('')
  const [startDate,    setStartDate]    = useState(project.startDate ?? '')
  const [endDate,      setEndDate]      = useState(project.endDate   ?? '')
  const [jours,        setJours]        = useState('')
  const [allocation,   setAllocation]   = useState('100')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const missionDays = useMemo(
    () => countWorkingDays(startDate, endDate),
    [startDate, endDate]
  )

  const handleStartDate = (v: string) => {
    setStartDate(v)
    const total = countWorkingDays(v, endDate)
    if (total > 0 && allocation) {
      setJours(String(percentToDays(parseInt(allocation), total)))
    }
  }
  const handleEndDate = (v: string) => {
    setEndDate(v)
    const total = countWorkingDays(startDate, v)
    if (total > 0 && allocation) {
      setJours(String(percentToDays(parseInt(allocation), total)))
    }
  }

  const handleJours = (v: string) => {
    setJours(v)
    const j = parseInt(v)
    if (!isNaN(j) && missionDays > 0) {
      setAllocation(String(daysToPercent(j, missionDays)))
    }
  }

  const handleAllocation = (v: string) => {
    setAllocation(v)
    const pct = parseInt(v)
    if (!isNaN(pct) && missionDays > 0) {
      setJours(String(percentToDays(pct, missionDays)))
    }
  }

  async function handleSubmit() {
    if (!consultantId) { setError(t('errorConsultant')); return }
    if (!startDate)    { setError(t('errorStartDate'));  return }
    if (!endDate)      { setError(t('errorEndDate'));    return }

    const companyId = companySettings?.id
    if (!companyId) { setError(t('companyMissing')); return }

    setSaving(true)
    setError(null)
    try {
      await createAssignment({
        company_id:    companyId,
        consultant_id: consultantId,
        project_id:    project.id,
        allocation:    allocation ? parseInt(allocation) : 100,
        start_date:    startDate,
        end_date:      endDate,
      })
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const allocPct   = parseInt(allocation) || 0
  const allocColor = allocPct === 100 ? 'var(--green)' : allocPct >= 50 ? 'var(--gold)' : 'var(--cyan)'

  const inputStyle = {
    width: '100%', background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    color: 'var(--text)', padding: '8px 12px', borderRadius: 2,
    fontSize: 12, fontFamily: 'inherit',
  }
  const labelStyle = {
    display: 'block', fontSize: 11,
    color: 'var(--text2)', marginBottom: 5,
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 420,
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 6, padding: 28, zIndex: 401,
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
              {t('title')}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>
              {project.name}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && <div className="form-error">{error}</div>}

        {/* Consultant */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            {t('consultant')} <span style={{ color: 'var(--pink)' }}>*</span>
          </label>
          <select
            style={inputStyle}
            value={consultantId}
            onChange={e => setConsultantId(e.target.value)}
          >
            <option value="">— {t('selectConsultant')} —</option>
            {(consultants ?? []).map(c => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.role}
                {c.occupancyRate > 0
                  ? ` · ${t('occupied', { rate: c.occupancyRate })}`
                  : ` · ${t('available')}`
                }
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>
              {t('startDate')} <span style={{ color: 'var(--pink)' }}>*</span>
            </label>
            <input style={inputStyle} type="date" value={startDate} onChange={e => handleStartDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>
              {t('endDate')} <span style={{ color: 'var(--pink)' }}>*</span>
            </label>
            <input style={inputStyle} type="date" value={endDate} onChange={e => handleEndDate(e.target.value)} />
          </div>
        </div>

        {/* Durée mission — indicateur */}
        {missionDays > 0 && (
          <div style={{
            marginBottom: 14, padding: '8px 12px', borderRadius: 2,
            background: 'var(--bg3)', border: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 1 }}>
              {t('missionDuration')}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
              {t('workingDays', { count: missionDays })}
            </span>
          </div>
        )}

        {/* Allocation — jours + % bidirectionnel */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('allocation')}</span>
            {missionDays > 0 && jours && (
              <span style={{ fontSize: 10, color: 'var(--text2)', fontStyle: 'italic' }}>
                {t('daysOnMission', { days: jours, total: missionDays })}
              </span>
            )}
          </label>

          <style>{`
            .no-spin::-webkit-inner-spin-button,
            .no-spin::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            .no-spin { -moz-appearance: textfield; }
          `}</style>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
            {/* Input jours */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 2 }}>
              <button
                type="button"
                onClick={() => handleJours(String(Math.max(1, (parseInt(jours) || 0) - 1)))}
                style={{
                  width: 32, height: '100%', flexShrink: 0,
                  background: 'none', border: 'none', borderRight: '1px solid var(--border)',
                  color: 'var(--text2)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  className="no-spin"
                  type="number"
                  min={1}
                  max={missionDays || 999}
                  value={jours}
                  onChange={e => handleJours(e.target.value)}
                  placeholder={missionDays > 0 ? `/ ${missionDays}` : '—'}
                  style={{
                    width: '100%', background: 'none', border: 'none', outline: 'none',
                    color: 'var(--text)', padding: '8px 28px 8px 10px',
                    fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center' as const,
                  }}
                />
                <span style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 9, color: 'var(--text2)', letterSpacing: 1, pointerEvents: 'none',
                }}>
                  {t('dayUnit')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleJours(String(Math.min(missionDays || 999, (parseInt(jours) || 0) + 1)))}
                style={{
                  width: 32, height: '100%', flexShrink: 0,
                  background: 'none', border: 'none', borderLeft: '1px solid var(--border)',
                  color: 'var(--text2)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>

            {/* Input % */}
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--bg3)', border: `1px solid ${allocColor}40`, borderRadius: 2,
            }}>
              <input
                className="no-spin"
                type="number"
                min={1} max={100}
                value={allocation}
                onChange={e => handleAllocation(e.target.value)}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: allocColor, padding: '8px 4px 8px 12px',
                  fontSize: 14, fontWeight: 700,
                  fontFamily: 'var(--font-mono)', textAlign: 'center' as const,
                }}
              />
              <span style={{
                paddingRight: 10, fontSize: 12,
                color: allocColor, fontWeight: 700, pointerEvents: 'none',
              }}>%</span>
            </div>
          </div>

          {/* Barre visuelle */}
          {allocPct > 0 && (
            <div style={{ marginTop: 8, height: 3, background: 'var(--bg3)', borderRadius: 2 }}>
              <div style={{
                width: `${Math.min(allocPct, 100)}%`, height: '100%',
                background: allocColor, borderRadius: 2, transition: 'width 0.2s',
              }} />
            </div>
          )}

          {allocPct > 100 && (
            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--pink)' }}>
              {t('overAlloc')}
            </div>
          )}
          {jours && missionDays > 0 && parseInt(jours) > missionDays && (
            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--gold)' }}>
              {t('overDays')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? t('saving') : t('assign')}
          </button>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </>
  )
}
'use client'

/**
 * components/projects/AssignmentModal.tsx
 * Modal pour affecter un consultant à un projet
 */

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import { useConsultants, createAssignment } from '@/lib/data'
import type { Project }    from '@/types'

const COMPANY_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

interface AssignmentModalProps {
  project:  Project
  onClose:  () => void
  onSaved:  () => void
}

export function AssignmentModal({ project, onClose, onSaved }: AssignmentModalProps) {
  const t = useTranslations('assignments')

  const { data: consultants } = useConsultants()

  const [consultantId, setConsultantId] = useState('')
  const [startDate,    setStartDate]    = useState(project.startDate ?? '')
  const [endDate,      setEndDate]      = useState(project.endDate   ?? '')
  const [allocation,   setAllocation]   = useState('100')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  async function handleSubmit() {
    if (!consultantId) { setError(t('errorConsultant')); return }
    if (!startDate)    { setError(t('errorStartDate')); return }
    if (!endDate)      { setError(t('errorEndDate'));   return }

    setSaving(true)
    setError(null)

    try {
      await createAssignment({
        company_id:    COMPANY_ID,
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

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 400,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 420,
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 28,
        zIndex: 401,
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
        <div className="form-field">
          <label>{t('consultant')} <span className="required">*</span></label>
          <select
            className="input"
            value={consultantId}
            onChange={e => setConsultantId(e.target.value)}
          >
            <option value="">— {t('selectConsultant')} —</option>
            {(consultants ?? []).map(c => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.role}
                {c.occupancyRate > 0 ? ` · ${c.occupancyRate}% occupé` : ' · Disponible'}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-field">
            <label>{t('startDate')} <span className="required">*</span></label>
            <input
              className="input"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>{t('endDate')} <span className="required">*</span></label>
            <input
              className="input"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Allocation */}
        <div className="form-field">
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('allocation')}</span>
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>{allocation || 100}%</span>
          </label>
          <input
            type="range"
            min={10} max={100} step={10}
            value={allocation}
            onChange={e => setAllocation(e.target.value)}
            style={{ width: '100%', accentColor: 'var(--green)', marginBottom: 4 }}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 9, color: 'var(--text2)', letterSpacing: 1,
          }}>
            <span>10%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
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
'use client'

/**
 * components/projects/ProjectForm.tsx
 * Drawer création + édition d'un projet
 * Même pattern que ConsultantForm
 */

import { useState, useEffect }     from 'react'
import { useTranslations }         from 'next-intl'
import { createProject, updateProject } from '@/lib/data'
import type { Project }            from '@/types'

// UUID fixe NexDigital — à remplacer par useAuth().companyId quand multi-tenant actif
const COMPANY_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

const STATUS_OPTIONS = ['draft', 'active', 'on_hold', 'completed'] as const

interface ProjectFormProps {
  project?: Project | null     // null = création, Project = édition
  onClose:  () => void
  onSaved:  () => void
}

export function ProjectForm({ project, onClose, onSaved }: ProjectFormProps) {
  const t    = useTranslations('projects')
  const mode = project ? 'edit' : 'create'

  // ── State formulaire ──────────────────────────────────────
  const [name,        setName]        = useState(project?.name        ?? '')
  const [isInternal,  setIsInternal]  = useState(project?.isInternal  ?? false)
  const [clientName,  setClientName]  = useState(project?.clientName  ?? '')
  const [reference,   setReference]   = useState(project?.reference   ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [startDate,   setStartDate]   = useState(project?.startDate   ?? '')
  const [endDate,     setEndDate]     = useState(project?.endDate     ?? '')
  const [tjmVendu,    setTjmVendu]    = useState(project?.tjmVendu?.toString()    ?? '')
  const [joursVendus, setJoursVendus] = useState(project?.joursVendus?.toString() ?? '')
  const [budgetTotal, setBudgetTotal] = useState(project?.budgetTotal?.toString() ?? '')
  const [status,      setStatus]      = useState<typeof STATUS_OPTIONS[number]>(
    (project?.status as typeof STATUS_OPTIONS[number]) ?? 'draft'
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  // Reset si projet change (réouverture du drawer)
  useEffect(() => {
    setName(project?.name ?? '')
    setIsInternal(project?.isInternal ?? false)
    setClientName(project?.clientName ?? '')
    setReference(project?.reference ?? '')
    setDescription(project?.description ?? '')
    setStartDate(project?.startDate ?? '')
    setEndDate(project?.endDate ?? '')
    setTjmVendu(project?.tjmVendu?.toString() ?? '')
    setJoursVendus(project?.joursVendus?.toString() ?? '')
    setBudgetTotal(project?.budgetTotal?.toString() ?? '')
    setStatus((project?.status as typeof STATUS_OPTIONS[number]) ?? 'draft')
    setError(null)
  }, [project])

  // Quand on passe en interne, remplir clientName automatiquement
  useEffect(() => {
    if (isInternal) setClientName('NexDigital')
    else if (clientName === 'NexDigital') setClientName('')
  }, [isInternal])

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit() {
    if (!name.trim()) { setError(t('form.errorName')); return }
    if (!isInternal && !clientName.trim()) { setError(t('form.errorClient')); return }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        name:         name.trim(),
        client_name:  isInternal ? 'NexDigital' : clientName.trim(),
        is_internal:  isInternal,
        reference:    reference.trim() || undefined,
        description:  description.trim() || undefined,
        start_date:   startDate || undefined,
        end_date:     endDate || undefined,
        tjm_vendu:    tjmVendu    ? parseFloat(tjmVendu)    : undefined,
        jours_vendus: joursVendus ? parseInt(joursVendus)   : undefined,
        budget_total: budgetTotal ? parseFloat(budgetTotal) : undefined,
        status,
        company_id: COMPANY_ID,
      }

      if (mode === 'edit' && project) {
        await updateProject(project.id, payload)
      } else {
        await createProject(payload)
      }

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
      background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
      zIndex: 300, padding: 28, overflowY: 'auto',
      boxShadow: '-4px 0 24px var(--shadow)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
          {mode === 'edit' ? t('form.titleEdit') : t('form.titleCreate')}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      {/* Erreur */}
      {error && (
        <div style={{
          background: 'var(--pink-muted, rgba(255,80,80,0.08))',
          border: '1px solid var(--pink)',
          borderRadius: 6, padding: '10px 14px',
          fontSize: 12, color: 'var(--pink)',
          marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* ── Section : Identification ── */}
      <SectionLabel>{t('form.sectionInfo')}</SectionLabel>

      <Field label={t('form.name')} required>
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Migration Cloud ENGIE"
        />
      </Field>

      {/* Toggle interne */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={isInternal}
            onChange={e => setIsInternal(e.target.checked)}
            style={{ accentColor: 'var(--cyan)', width: 15, height: 15 }}
          />
          <span style={{ color: 'var(--text)' }}>{t('form.isInternal')}</span>
        </label>
        {isInternal && (
          <span style={{ fontSize: 10, color: 'var(--cyan)', background: 'var(--cyan-muted, rgba(0,200,255,0.1))', padding: '2px 8px', borderRadius: 20 }}>
            NexDigital
          </span>
        )}
      </div>

      {!isInternal && (
        <Field label={t('form.clientName')} required>
          <input
            className="input"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="Ex: ENGIE, Total, BNP..."
          />
        </Field>
      )}

      <Field label={t('form.reference')}>
        <input
          className="input"
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder="Ex: CTR-2025-042"
        />
      </Field>

      <Field label={t('form.description')}>
        <textarea
          className="input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('form.descriptionPlaceholder')}
          rows={3}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
      </Field>

      {/* ── Section : Planning ── */}
      <SectionLabel style={{ marginTop: 24 }}>{t('form.sectionPlanning')}</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={t('form.startDate')}>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </Field>
        <Field label={t('form.endDate')}>
          <input
            className="input"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label={t('form.status')}>
        <select
          className="input"
          value={status}
          onChange={e => setStatus(e.target.value as typeof STATUS_OPTIONS[number])}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
      </Field>

      {/* ── Section : Financier ── */}
      <SectionLabel style={{ marginTop: 24 }}>{t('form.sectionFinancial')}</SectionLabel>
      <p style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 14 }}>
        {t('form.financialNote')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={t('form.tjmVendu')}>
          <input
            className="input"
            type="number"
            value={tjmVendu}
            onChange={e => setTjmVendu(e.target.value)}
            placeholder="800"
            min={0}
          />
        </Field>
        <Field label={t('form.joursVendus')}>
          <input
            className="input"
            type="number"
            value={joursVendus}
            onChange={e => setJoursVendus(e.target.value)}
            placeholder="120"
            min={0}
          />
        </Field>
      </div>

      <Field label={t('form.budgetTotal')}>
        <input
          className="input"
          type="number"
          value={budgetTotal}
          onChange={e => setBudgetTotal(e.target.value)}
          placeholder="96 000"
          min={0}
        />
      </Field>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 8, marginTop: 32 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? t('form.saving') : mode === 'edit' ? t('form.save') : t('form.create')}
        </button>
        <button
          className="btn btn-ghost"
          onClick={onClose}
          disabled={saving}
        >
          {t('form.cancel')}
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 10, color: 'var(--text2)', letterSpacing: 2,
      textTransform: 'uppercase', marginBottom: 14, ...style,
    }}>
      {children}
    </div>
  )
}

function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--pink)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}
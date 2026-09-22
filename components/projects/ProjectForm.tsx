'use client'

/**
 * components/projects/ProjectForm.tsx
 * Drawer création + édition d'un projet
 * Client sélectionné depuis la liste clients (plus de texte libre)
 */

import { useState, useEffect }          from 'react'
import { useTranslations }              from 'next-intl'
import { createProject, updateProject, useClients, useCompanySettings } from '@/lib/data'
import type { Project }                 from '@/types'
import { QuickClient, type QuickClientResult } from '@/components/crm/QuickClient'
import { BILLING_MODES, projectRevenue, type BillingMode } from '@/lib/mission'
import { fmt }                          from '@/lib/utils'

const STATUS_OPTIONS = ['draft', 'active', 'on_hold', 'completed'] as const

interface ProjectFormProps {
  project?: Project | null
  onClose:  () => void
  onSaved:  () => void
}

export function ProjectForm({ project, onClose, onSaved }: ProjectFormProps) {
  const t    = useTranslations('projects')
  const mode = project ? 'edit' : 'create'

  // Charger la liste des clients
  const { data: loadedClients } = useClients()
  // Clients created inline are added here until the next refresh
  const [extraClients, setExtraClients] = useState<QuickClientResult[]>([])
  const clients = [
    ...(loadedClients ?? []).map(c => ({ id: c.id, name: c.name, sector: c.sector, client_type: c.clientType ?? 'final' })),
    ...extraClients.map(c => ({ ...c, sector: undefined })),
  ].sort((a, b) => a.name.localeCompare(b.name))

  // Nom dynamique de la company (pour badge "projet interne")
  const { data: companySettings } = useCompanySettings()
  const companyName = companySettings?.name ?? '…'

  // ── State formulaire ──────────────────────────────────────
  const [name,        setName]        = useState(project?.name        ?? '')
  const [isInternal,  setIsInternal]  = useState(project?.isInternal  ?? false)
  const [clientId,    setClientId]    = useState(project?.clientId    ?? '')
  const [endClientId, setEndClientId] = useState(project?.endClientId ?? '')
  const [billingMode, setBillingMode] = useState<BillingMode>(project?.billingMode ?? 'regie')
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

  // Reset si projet change
  useEffect(() => {
    setName(project?.name ?? '')
    setIsInternal(project?.isInternal ?? false)
    setClientId(project?.clientId ?? '')
    setEndClientId(project?.endClientId ?? '')
    setBillingMode(project?.billingMode ?? 'regie')
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

  // Quand on passe en interne, vider la sélection client
  useEffect(() => {
    if (isInternal) { setClientId(''); setEndClientId('') }
  }, [isInternal])

  const selectedClient = clients.find(c => c.id === clientId)
  const revenue = projectRevenue({
    billing_mode: billingMode,
    tjm_vendu:    tjmVendu    ? parseFloat(tjmVendu)    : null,
    jours_vendus: joursVendus ? parseInt(joursVendus)   : null,
    budget_total: budgetTotal ? parseFloat(budgetTotal) : null,
  })
  const onQuickClient = (setter: (id: string) => void) => (c: QuickClientResult) => {
    setExtraClients(cs => [...cs, c]); setter(c.id)
  }

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit() {
    if (!name.trim()) { setError(t('form.errorName')); return }
    if (!isInternal && !clientId) { setError(t('form.errorClient')); return }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        name:         name.trim(),
        client_name:  isInternal ? companyName : (selectedClient?.name ?? ''),
        client_id:    isInternal ? undefined : clientId || undefined,
        end_client_id: isInternal ? null : (endClientId || null),
        billing_mode: billingMode,
        is_internal:  isInternal,
        reference:    reference.trim() || undefined,
        description:  description.trim() || undefined,
        start_date:   startDate || undefined,
        end_date:     endDate || undefined,
        tjm_vendu:    tjmVendu    ? parseFloat(tjmVendu)    : undefined,
        jours_vendus: joursVendus ? parseInt(joursVendus)   : undefined,
        // Régie: the budget is the contracted value (rate × days); forfait: the fixed price.
        budget_total: billingMode === 'forfait'
          ? (budgetTotal ? parseFloat(budgetTotal) : undefined)
          : (revenue ?? undefined),
        status,
        company_id:   companySettings?.id ?? '',
      }

      if (mode === 'edit' && project) {
        await updateProject(project.id, payload)
      } else {
        await createProject(payload)
      }

      onSaved()
      onClose()
    } catch (e) {
      setError((e as { message: string }).message)
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
      <div className="drawer-head">
        <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
          {mode === 'edit' ? t('form.titleEdit') : t('form.titleCreate')}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* ── Identification ── */}
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
          />
          <span style={{ color: 'var(--text)' }}>{t('form.isInternal')}</span>
        </label>
        {isInternal && <span className="tag-internal">{companyName}</span>}
      </div>

      {/* Select client */}
      {!isInternal && (
        <Field label={t('form.clientName')} required>
          <select
            className="input"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
          >
            <option value="">— {t('form.selectClient')} —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.client_type === 'intermediary' ? ` · ${t('form.intermediary')}` : c.sector ? ` · ${c.sector}` : ''}
              </option>
            ))}
          </select>
          <QuickClient companyId={companySettings?.id ?? ''} defaultType="final" onCreated={onQuickClient(setClientId)} />
        </Field>
      )}

      {!isInternal && (
        <Field label={t('form.endClient')}>
          <select className="input" value={endClientId} onChange={e => setEndClientId(e.target.value)}>
            <option value="">— {t('form.sameAsClient')} —</option>
            {clients.filter(c => c.id !== clientId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ marginTop: 5, fontSize: 10, color: 'var(--text2)' }}>{t('form.endClientHint')}</div>
          <QuickClient companyId={companySettings?.id ?? ''} defaultType="final" onCreated={onQuickClient(setEndClientId)} />
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

      {/* ── Planning ── */}
      <SectionLabel style={{ marginTop: 24 }}>{t('form.sectionPlanning')}</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={t('form.startDate')}>
          <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </Field>
        <Field label={t('form.endDate')}>
          <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
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

      {/* ── Financier ── */}
      <SectionLabel style={{ marginTop: 24 }}>{t('form.sectionFinancial')}</SectionLabel>
      <p style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 14 }}>{t('form.financialNote')}</p>

      <Field label={t('form.billingMode')}>
        <div style={{ display: 'flex', gap: 6 }}>
          {BILLING_MODES.map(m => (
            <button key={m} type="button" className={`btn btn-sm ${billingMode === m ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1 }} onClick={() => setBillingMode(m)}>
              {t(`form.billing.${m}`)}
            </button>
          ))}
        </div>
      </Field>

      {billingMode === 'regie' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('form.tjmVendu')}>
            <input className="input" type="number" value={tjmVendu} onChange={e => setTjmVendu(e.target.value)} placeholder="800" min={0} />
          </Field>
          <Field label={t('form.joursVendus')}>
            <input className="input" type="number" value={joursVendus} onChange={e => setJoursVendus(e.target.value)} placeholder="120" min={0} />
          </Field>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('form.fixedPrice')}>
            <input className="input" type="number" value={budgetTotal} onChange={e => setBudgetTotal(e.target.value)} placeholder="45 000" min={0} />
          </Field>
          <Field label={t('form.joursEstimes')}>
            <input className="input" type="number" value={joursVendus} onChange={e => setJoursVendus(e.target.value)} placeholder="40" min={0} />
          </Field>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: -4, marginBottom: 8 }}>
        {t('form.revenue')} : <span style={{ color: revenue != null ? 'var(--green)' : 'var(--text2)', fontWeight: 700 }}>
          {revenue != null ? fmt(revenue) : '—'}
        </span>
      </div>

      {/* ── Actions ── */}
      <div className="drawer-foot">
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={saving}>
          {saving ? t('form.saving') : mode === 'edit' ? t('form.save') : t('form.create')}
        </button>
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
          {t('form.cancel')}
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, ...style }}>
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--pink)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}
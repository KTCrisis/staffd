'use client'

/**
 * components/clients/ClientForm.tsx
 * Drawer création + édition d'un client
 */

import { useState, useEffect } from 'react'
import { useTranslations }     from 'next-intl'
import { useAuthContext }      from '@/components/layout/AuthProvider'
import { createClient, updateClient } from '@/lib/data'
import type { Client }         from '@/types'

export const SECTORS = ['ESN', 'Énergie', 'Finance', 'Industrie', 'Retail', 'Public', 'Autre'] as const
export type Sector = typeof SECTORS[number]

interface ClientFormProps {
  client?:  Client | null
  onClose:  () => void
  onSaved:  () => void
}

export function ClientForm({ client, onClose, onSaved }: ClientFormProps) {
  const t    = useTranslations('clients')
  const { user } = useAuthContext()
  const mode = client ? 'edit' : 'create'

  const [name,         setName]         = useState(client?.name         ?? '')
  const [sector,       setSector]       = useState<Sector | ''>(client?.sector as Sector ?? '')
  const [website,      setWebsite]      = useState(client?.website      ?? '')
  const [contactName,  setContactName]  = useState(client?.contactName  ?? '')
  const [contactEmail, setContactEmail] = useState(client?.contactEmail ?? '')
  const [contactPhone, setContactPhone] = useState(client?.contactPhone ?? '')
  const [notes,        setNotes]        = useState(client?.notes        ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    setName(client?.name ?? '')
    setSector(client?.sector as Sector ?? '')
    setWebsite(client?.website ?? '')
    setContactName(client?.contactName ?? '')
    setContactEmail(client?.contactEmail ?? '')
    setContactPhone(client?.contactPhone ?? '')
    setNotes(client?.notes ?? '')
    setError(null)
  }, [client])

  async function handleSubmit() {
    if (!name.trim()) { setError(t('form.errorName')); return }

    const companyId = user?.companyId
    if (!companyId) { setError('No company context'); return }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        name:          name.trim(),
        sector:        sector || undefined,
        website:       website.trim() || undefined,
        contact_name:  contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        notes:         notes.trim() || undefined,
        company_id:    companyId,
      }

      if (mode === 'edit' && client) {
        await updateClient(client.id, payload)
      } else {
        await createClient(payload)
      }

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

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

      {error && <div className="form-error">{error}</div>}

      {/* Identification */}
      <div className="form-section-label">{t('form.sectionInfo')}</div>

      <div className="form-field">
        <label>{t('form.name')} <span className="required">*</span></label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: ENGIE" />
      </div>

      <div className="form-field">
        <label>{t('form.sector')}</label>
        <select className="input" value={sector} onChange={e => setSector(e.target.value as Sector)}>
          <option value="">—</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="form-field">
        <label>{t('form.website')}</label>
        <input className="input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://engie.com" />
      </div>

      {/* Contact */}
      <div className="form-section-label" style={{ marginTop: 24 }}>{t('form.sectionContact')}</div>

      <div className="form-field">
        <label>{t('form.contactName')}</label>
        <input className="input" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Sophie Renard" />
      </div>

      <div className="form-field">
        <label>{t('form.contactEmail')}</label>
        <input className="input" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="sophie@engie.com" />
      </div>

      <div className="form-field">
        <label>{t('form.contactPhone')}</label>
        <input className="input" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+33 6 12 34 56 78" />
      </div>

      {/* Notes */}
      <div className="form-section-label" style={{ marginTop: 24 }}>{t('form.sectionNotes')}</div>

      <div className="form-field">
        <label>{t('form.notes')}</label>
        <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('form.notesPlaceholder')} rows={4} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 32 }}>
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
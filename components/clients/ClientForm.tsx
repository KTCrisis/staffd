'use client'

/**
 * components/clients/ClientForm.tsx
 * Drawer création + édition d'un client
 */

import { useState, useEffect } from 'react'
import { useTranslations }     from 'next-intl'

import { createClient, updateClient } from '@/lib/data'
import type { Client, ClientType } from '@/types'

export const SECTORS = ['ESN', 'Énergie', 'Finance', 'Industrie', 'Retail', 'Public', 'Autre'] as const
export type Sector = typeof SECTORS[number]
export const CLIENT_TYPES: ClientType[] = ['final', 'intermediary', 'both']

interface ClientFormProps {
  client?:    Client | null
  companyId:  string
  onClose:    () => void
  onSaved:    () => void
}

export function ClientForm({ client, companyId, onClose, onSaved }: ClientFormProps) {
  const t    = useTranslations('clients')
  const mode = client ? 'edit' : 'create'

  const [name,         setName]         = useState(client?.name         ?? '')
  const [sector,       setSector]       = useState<Sector | ''>(client?.sector as Sector ?? '')
  const [clientType,   setClientType]   = useState<ClientType>(client?.clientType ?? 'final')
  const [website,      setWebsite]      = useState(client?.website      ?? '')
  const [contactName,  setContactName]  = useState(client?.contactName  ?? '')
  const [contactEmail, setContactEmail] = useState(client?.contactEmail ?? '')
  const [contactPhone, setContactPhone] = useState(client?.contactPhone ?? '')
  const [notes,        setNotes]        = useState(client?.notes        ?? '')
  const [billingAddr,  setBillingAddr]  = useState(client?.billingAddress ?? '')
  const [siren,        setSiren]        = useState(client?.siren        ?? '')
  const [tvaNumber,    setTvaNumber]    = useState(client?.tvaNumber    ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    setName(client?.name ?? '')
    setSector(client?.sector as Sector ?? '')
    setClientType(client?.clientType ?? 'final')
    setWebsite(client?.website ?? '')
    setContactName(client?.contactName ?? '')
    setContactEmail(client?.contactEmail ?? '')
    setContactPhone(client?.contactPhone ?? '')
    setNotes(client?.notes ?? '')
    setBillingAddr(client?.billingAddress ?? '')
    setSiren(client?.siren ?? '')
    setTvaNumber(client?.tvaNumber ?? '')
    setError(null)
  }, [client])

  async function handleSubmit() {
    if (!name.trim()) { setError(t('form.errorName')); return }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        name:          name.trim(),
        sector:        sector || undefined,
        client_type:   clientType,
        website:       website.trim() || undefined,
        contact_name:  contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        notes:         notes.trim() || undefined,
        // null (et non undefined) pour pouvoir effacer ces champs
        billing_address: billingAddr.trim() || null,
        siren:           siren.replace(/\s/g, '') || null,
        tva_number:      tvaNumber.replace(/\s/g, '').toUpperCase() || null,
        company_id:    companyId,
      }

      if (mode === 'edit' && client) {
        await updateClient(client.id, payload)
      } else {
        await createClient(payload)
      }

      onSaved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
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
      <div className="drawer-head">
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
        <label>{t('form.clientType')}</label>
        <select className="input" value={clientType} onChange={e => setClientType(e.target.value as ClientType)}>
          {CLIENT_TYPES.map(ct => <option key={ct} value={ct}>{t(`clientType.${ct}`)}</option>)}
        </select>
        <div style={{ marginTop: 5, fontSize: 10, color: 'var(--text2)' }}>{t('form.clientTypeHint')}</div>
      </div>

      {/* Facturation (mentions de la facture) */}
      <div className="form-field">
        <label>{t('form.billingAddress')}</label>
        <textarea className="input" value={billingAddr} onChange={e => setBillingAddr(e.target.value)}
          placeholder={'1 place Samuel de Champlain\n92400 Courbevoie'} rows={2} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-field">
          <label>{t('form.siren')}</label>
          <input className="input" value={siren} onChange={e => setSiren(e.target.value)} placeholder="542 107 651" />
        </div>
        <div className="form-field">
          <label>{t('form.tvaNumber')}</label>
          <input className="input" value={tvaNumber} onChange={e => setTvaNumber(e.target.value)} placeholder="FR03 542107651" />
        </div>
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
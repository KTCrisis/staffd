'use client'

/**
 * components/clients/ClientCrm.tsx
 * Client page, CRM part: contacts (several per client, buying role, primary)
 * and the interaction journal with follow-ups.
 */

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import type { Tables }     from '@/types/supabase'
import { Panel }           from '@/components/ui'
import { toISO }           from '@/lib/utils'
import { BUYING_ROLES, followUpState, sortJournal } from '@/lib/crm'
import { createContact, updateContact, deleteContact } from '@/lib/data'
import { JournalEntry, InteractionForm, Tag } from '@/components/crm/Journal'

type Contact     = Tables<'contacts'>
type Interaction = Tables<'interactions'>

export interface ClientCrmData {
  access:         boolean
  contacts:       Contact[]
  interactions:   Interaction[]
  opportunities:  { id: string; name: string; status: string }[]
  myConsultantId: string | null
}

interface Props {
  clientId:  string
  companyId: string
  data:      ClientCrmData
  onChanged: () => void
}

export function ClientCrm({ clientId, companyId, data, onChanged }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
      <ContactsPanel clientId={clientId} companyId={companyId} contacts={data.contacts} canWrite={data.access} onChanged={onChanged} />
      {data.access && (
        <JournalPanel clientId={clientId} companyId={companyId} data={data} onChanged={onChanged} />
      )}
    </div>
  )
}

// ── Contacts ──────────────────────────────────────────────────

function ContactsPanel({ clientId, companyId, contacts, canWrite, onChanged }: {
  clientId: string; companyId: string; contacts: Contact[]; canWrite: boolean; onChanged: () => void
}) {
  const t = useTranslations('crm.contacts')
  const [editing, setEditing] = useState<Contact | 'new' | null>(null)

  return (
    <Panel>
      <div className="panel-header">
        <span className="panel-title">{t('title')}</span>
        {canWrite && editing === null && (
          <button className="panel-action" onClick={() => setEditing('new')}>{t('add')}</button>
        )}
      </div>
      <div className="panel-body" style={{ padding: 0 }}>
        {editing !== null && (
          <ContactForm
            contact={editing === 'new' ? null : editing}
            clientId={clientId} companyId={companyId}
            onDone={() => { setEditing(null); onChanged() }}
            onCancel={() => setEditing(null)}
          />
        )}
        {contacts.length === 0 && editing === null && (
          <div style={{ padding: '20px 18px', color: 'var(--text2)', fontSize: 12 }}>{t('empty')}</div>
        )}
        {contacts.map(c => (
          <div key={c.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                {c.is_primary && <span title={t('primary')} style={{ color: 'var(--gold)', marginRight: 6 }}>★</span>}
                {c.name}
                {c.title && <span style={{ fontWeight: 400, color: 'var(--text2)' }}> · {c.title}</span>}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {c.email && <a href={`mailto:${c.email}`} style={{ color: 'var(--cyan)' }}>{c.email}</a>}
                {c.phone && <a href={`tel:${c.phone}`} style={{ color: 'var(--cyan)' }}>{c.phone}</a>}
                {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener" style={{ color: 'var(--cyan)' }}>LinkedIn</a>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
              {c.buying_role && <Tag color="var(--purple)">{t(`roles.${c.buying_role}`)}</Tag>}
              {canWrite && editing === null && (
                <button className="panel-action" onClick={() => setEditing(c)}>{t('edit')}</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function ContactForm({ contact: c, clientId, companyId, onDone, onCancel }: {
  contact: Contact | null; clientId: string; companyId: string; onDone: () => void; onCancel: () => void
}) {
  const t = useTranslations('crm.contacts')
  const [name,     setName]     = useState(c?.name ?? '')
  const [title,    setTitle]    = useState(c?.title ?? '')
  const [email,    setEmail]    = useState(c?.email ?? '')
  const [phone,    setPhone]    = useState(c?.phone ?? '')
  const [linkedin, setLinkedin] = useState(c?.linkedin_url ?? '')
  const [role,     setRole]     = useState(c?.buying_role ?? '')
  const [primary,  setPrimary]  = useState(c?.is_primary ?? false)
  const [notes,    setNotes]    = useState(c?.notes ?? '')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const run = async (f: () => Promise<void>) => {
    setBusy(true); setError(null)
    try { await f(); onDone() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const save = () => {
    if (!name.trim()) { setError(t('errorName')); return }
    const payload = {
      name: name.trim(), title: title.trim() || null, email: email.trim() || null, phone: phone.trim() || null,
      linkedin_url: linkedin.trim() || null, buying_role: role || null, is_primary: primary, notes: notes.trim() || null,
    }
    run(() => c ? updateContact(c.id, clientId, payload) : createContact({ ...payload, client_id: clientId, company_id: companyId }))
  }

  return (
    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
      {error && <div className="form-error">{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input className="input" placeholder={t('name')} value={name} onChange={e => setName(e.target.value)} autoFocus />
        <input className="input" placeholder={t('jobTitle')} value={title} onChange={e => setTitle(e.target.value)} />
        <input className="input" placeholder={t('email')} type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" placeholder={t('phone')} value={phone} onChange={e => setPhone(e.target.value)} />
        <input className="input" placeholder="LinkedIn" value={linkedin} onChange={e => setLinkedin(e.target.value)} />
        <select className="input" value={role} onChange={e => setRole(e.target.value)}>
          <option value="">{t('role')}</option>
          {BUYING_ROLES.map(r => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
        </select>
      </div>
      <textarea className="input" rows={2} placeholder={t('notes')} value={notes} onChange={e => setNotes(e.target.value)}
                style={{ marginTop: 8, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text2)', margin: '8px 0' }}>
        <input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} /> {t('primary')}
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{t('save')}</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>{t('cancel')}</button>
        {c && (
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', color: 'var(--text2)' }} disabled={busy}
                  onClick={() => { if (confirm(t('deleteConfirm'))) run(() => deleteContact(c.id)) }}>
            {t('delete')}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Journal ───────────────────────────────────────────────────

function JournalPanel({ clientId, companyId, data, onChanged }: {
  clientId: string; companyId: string; data: ClientCrmData; onChanged: () => void
}) {
  const t     = useTranslations('crm.journal')
  const today = toISO(new Date())
  const [adding, setAdding] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const contacts = new Map(data.contacts.map(c => [c.id, c.name]))
  const opps     = new Map(data.opportunities.map(o => [o.id, o.name]))
  const items    = sortJournal(data.interactions, today)
  const pending  = items.filter(i => ['overdue', 'today'].includes(followUpState(i, today))).length

  return (
    <Panel>
      <div className="panel-header">
        <span className="panel-title">
          {t('title')}
          {pending > 0 && <span style={{ marginLeft: 8, color: 'var(--pink)' }}>· {t('due', { count: pending })}</span>}
        </span>
        {!adding && <button className="panel-action" onClick={() => setAdding(true)}>{t('add')}</button>}
      </div>
      <div className="panel-body" style={{ padding: 0 }}>
        {error && <div className="form-error" style={{ margin: 12 }}>{error}</div>}
        {adding && (
          <InteractionForm
            companyId={companyId} clientId={clientId}
            contacts={data.contacts} opportunities={data.opportunities} myConsultantId={data.myConsultantId}
            onDone={() => { setAdding(false); onChanged() }} onCancel={() => setAdding(false)}
          />
        )}
        {items.length === 0 && !adding && (
          <div style={{ padding: '20px 18px', color: 'var(--text2)', fontSize: 12 }}>{t('empty')}</div>
        )}
        {items.map(i => (
          <JournalEntry key={i.id} i={i}
            contactName={i.contact_id ? contacts.get(i.contact_id) : undefined}
            oppName={i.opportunity_id ? opps.get(i.opportunity_id) : undefined}
            onChanged={() => { setError(null); onChanged() }} onError={setError} />
        ))}
      </div>
    </Panel>
  )
}

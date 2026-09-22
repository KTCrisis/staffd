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
import { alpha, toISO, formatDate } from '@/lib/utils'
import {
  BUYING_ROLES, INTERACTION_TYPES, followUpState, sortJournal,
  type FollowUpState,
} from '@/lib/crm'
import {
  createContact, updateContact, deleteContact,
  createInteraction, setNextStepDone, deleteInteraction,
} from '@/lib/data'

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

const FOLLOW_COLOR: Record<FollowUpState, string> = {
  none: 'var(--text2)', done: 'var(--text2)', overdue: 'var(--pink)', today: 'var(--gold)', upcoming: 'var(--cyan)',
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

  const act = async (f: () => Promise<void>) => {
    setError(null)
    try { await f(); onChanged() } catch (e) { setError((e as Error).message) }
  }

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
            clientId={clientId} companyId={companyId} data={data}
            onDone={() => { setAdding(false); onChanged() }} onCancel={() => setAdding(false)}
          />
        )}
        {items.length === 0 && !adding && (
          <div style={{ padding: '20px 18px', color: 'var(--text2)', fontSize: 12 }}>{t('empty')}</div>
        )}
        {items.map(i => {
          const state = followUpState(i, today)
          return (
            <div key={i.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 10, color: 'var(--text2)' }}>
                <span>
                  <Tag color="var(--cyan)">{t(`types.${i.type}`)}</Tag>{' '}
                  {formatDate(i.occurred_at)}
                  {i.contact_id && contacts.get(i.contact_id) && ` · ${contacts.get(i.contact_id)}`}
                  {i.opportunity_id && opps.get(i.opportunity_id) && ` · ◬ ${opps.get(i.opportunity_id)}`}
                </span>
                <button className="panel-action" style={{ color: 'var(--text2)' }}
                        onClick={() => { if (confirm(t('deleteConfirm'))) act(() => deleteInteraction(i.id)) }}>✕</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{i.summary}</div>
              {state !== 'none' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11, color: FOLLOW_COLOR[state] }}>
                  <input type="checkbox" checked={i.next_step_done} onChange={e => act(() => setNextStepDone(i.id, e.target.checked))} />
                  <span style={{ textDecoration: state === 'done' ? 'line-through' : undefined }}>
                    {i.next_step || t('followUp')}
                    {i.next_step_due && ` — ${i.next_step_due}`}
                    {state === 'overdue' && ` (${t('overdue')})`}
                    {state === 'today' && ` (${t('today')})`}
                  </span>
                </label>
              )}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function InteractionForm({ clientId, companyId, data, onDone, onCancel }: {
  clientId: string; companyId: string; data: ClientCrmData; onDone: () => void; onCancel: () => void
}) {
  const t = useTranslations('crm.journal')
  const [type,     setType]     = useState<string>('appel')
  const [date,     setDate]     = useState(toISO(new Date()))
  const [contact,  setContact]  = useState('')
  const [opp,      setOpp]      = useState('')
  const [summary,  setSummary]  = useState('')
  const [nextStep, setNextStep] = useState('')
  const [due,      setDue]      = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const save = async () => {
    if (!summary.trim()) { setError(t('errorSummary')); return }
    setBusy(true); setError(null)
    try {
      await createInteraction({
        company_id: companyId, client_id: clientId, type,
        occurred_at: new Date(`${date}T12:00:00`).toISOString(),
        contact_id: contact || null, opportunity_id: opp || null, consultant_id: data.myConsultantId,
        summary: summary.trim(), next_step: nextStep.trim() || null, next_step_due: due || null,
      })
      onDone()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
      {error && <div className="form-error">{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <select className="input" value={type} onChange={e => setType(e.target.value)}>
          {INTERACTION_TYPES.map(x => <option key={x} value={x}>{t(`types.${x}`)}</option>)}
        </select>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <select className="input" value={contact} onChange={e => setContact(e.target.value)}>
          <option value="">{t('contact')}</option>
          {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" value={opp} onChange={e => setOpp(e.target.value)}>
          <option value="">{t('opportunity')}</option>
          {data.opportunities.filter(o => o.status === 'open').map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <textarea className="input" rows={3} placeholder={t('summary')} value={summary} onChange={e => setSummary(e.target.value)}
                style={{ marginTop: 8, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} autoFocus />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 8 }}>
        <input className="input" placeholder={t('nextStep')} value={nextStep} onChange={e => setNextStep(e.target.value)} />
        <input className="input" type="date" value={due} onChange={e => setDue(e.target.value)} title={t('nextStepDue')} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{t('save')}</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>{t('cancel')}</button>
      </div>
    </div>
  )
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '1px 5px', borderRadius: 2,
      color, background: alpha(color, 10), border: `1px solid ${alpha(color, 30)}`,
    }}>{children}</span>
  )
}

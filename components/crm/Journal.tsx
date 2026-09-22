'use client'

/**
 * components/crm/Journal.tsx
 * Interaction journal shared by the client page, the deal drawer and the
 * pipeline "to do" view: entry list (with follow-up checkbox) and entry form.
 */

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import type { Tables }     from '@/types/supabase'
import { alpha, toISO, formatDate } from '@/lib/utils'
import { INTERACTION_TYPES, followUpState, type FollowUpState } from '@/lib/crm'
import { createInteraction, setNextStepDone, deleteInteraction } from '@/lib/data'

export type Interaction = Tables<'interactions'>
export interface NamedRef { id: string; name: string }

export const FOLLOW_COLOR: Record<FollowUpState, string> = {
  none: 'var(--text2)', done: 'var(--text2)', overdue: 'var(--pink)', today: 'var(--gold)', upcoming: 'var(--cyan)',
}

export function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '1px 5px', borderRadius: 2,
      color, background: alpha(color, 10), border: `1px solid ${alpha(color, 30)}`,
    }}>{children}</span>
  )
}

/** One journal entry: type, date, links, summary, and its follow-up checkbox. */
export function JournalEntry({ i, contactName, oppName, clientName, onOpp, onChanged, onError, compact }: {
  i:            Interaction
  contactName?: string
  oppName?:     string
  clientName?:  string
  onOpp?:       () => void
  onChanged:    () => void
  onError:      (msg: string) => void
  compact?:     boolean
}) {
  const t     = useTranslations('crm.journal')
  const state = followUpState(i, toISO(new Date()))
  const act   = async (f: () => Promise<void>) => {
    try { await f(); onChanged() } catch (e) { onError((e as Error).message) }
  }

  return (
    <div style={{ padding: compact ? '10px 0' : '12px 18px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 10, color: 'var(--text2)' }}>
        <span>
          <Tag color="var(--cyan)">{t(`types.${i.type}`)}</Tag>{' '}
          {formatDate(i.occurred_at)}
          {clientName && ` · ${clientName}`}
          {contactName && ` · ${contactName}`}
          {oppName && (onOpp
            ? <> · <button onClick={onOpp} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--cyan)', fontFamily: 'inherit', fontSize: 10 }}>◬ {oppName}</button></>
            : ` · ◬ ${oppName}`)}
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
            {i.next_step_due && ` — ${formatDate(i.next_step_due)}`}
            {state === 'overdue' && ` (${t('overdue')})`}
            {state === 'today' && ` (${t('today')})`}
          </span>
        </label>
      )}
    </div>
  )
}

/**
 * New interaction. `opportunityId` pins the entry to a deal (deal drawer);
 * otherwise the user may pick one of `opportunities`.
 */
export function InteractionForm({ companyId, clientId, contacts, opportunities = [], opportunityId, myConsultantId, onDone, onCancel, flush }: {
  companyId:      string
  clientId:       string
  contacts:       NamedRef[]
  opportunities?: { id: string; name: string; status: string }[]
  opportunityId?: string
  myConsultantId: string | null
  onDone:         () => void
  onCancel:       () => void
  flush?:         boolean
}) {
  const t = useTranslations('crm.journal')
  const [type,     setType]     = useState<string>('appel')
  const [date,     setDate]     = useState(toISO(new Date()))
  const [contact,  setContact]  = useState('')
  const [opp,      setOpp]      = useState(opportunityId ?? '')
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
        contact_id: contact || null, opportunity_id: opp || null, consultant_id: myConsultantId,
        summary: summary.trim(), next_step: nextStep.trim() || null, next_step_due: due || null,
      })
      onDone()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div style={{ padding: flush ? '12px 0' : '14px 18px', borderBottom: '1px solid var(--border)', background: flush ? undefined : 'var(--bg3)' }}>
      {error && <div className="form-error">{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <select className="input" value={type} onChange={e => setType(e.target.value)}>
          {INTERACTION_TYPES.map(x => <option key={x} value={x}>{t(`types.${x}`)}</option>)}
        </select>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <select className="input" value={contact} onChange={e => setContact(e.target.value)} style={opportunityId ? { gridColumn: '1 / -1' } : undefined}>
          <option value="">{t('contact')}</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {!opportunityId && (
          <select className="input" value={opp} onChange={e => setOpp(e.target.value)}>
            <option value="">{t('opportunity')}</option>
            {opportunities.filter(o => o.status === 'open').map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
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

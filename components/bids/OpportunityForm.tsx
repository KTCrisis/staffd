'use client'

/**
 * components/bids/OpportunityForm.tsx
 * Drawer: create / edit an opportunity, then close it (won, lost with a
 * reason, abandoned) or reopen it. Same layout as ProjectForm.
 */

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import {
  createOpportunity, updateOpportunity, setOpportunityStatus, deleteOpportunity, createClient,
} from '@/lib/data'
import type { ClientType } from '@/types'
import {
  DEAL_TYPES, estimateAmount, stageProbability, clampPct,
  type DealType, type OpportunityStatus, type Stage,
} from '@/lib/crm'
import type { Opportunity, ClientOption, OwnerOption } from './PipelineClient'

interface Props {
  opportunity: Opportunity | null
  stages:      Stage[]
  clients:     ClientOption[]
  owners:      OwnerOption[]
  companyId:   string
  onClose:     () => void
  onSaved:     () => void
}

const num = (v: string) => (v.trim() === '' ? null : Number(v))

export function OpportunityForm({ opportunity: o, stages, clients: initialClients, owners, companyId, onClose, onSaved }: Props) {
  const t    = useTranslations('crm')
  const mode = o ? 'edit' : 'create'

  // Clients created from this form are appended locally, then selected.
  const [clients,     setClients]     = useState(initialClients)
  const [name,        setName]        = useState(o?.name ?? '')
  const [clientId,    setClientId]    = useState(o?.client_id ?? '')
  const [endClientId, setEndClientId] = useState(o?.end_client_id ?? '')
  const [ownerId,     setOwnerId]     = useState(o?.owner_id ?? '')
  const [dealType,    setDealType]    = useState<DealType>((o?.deal_type as DealType) ?? 'regie')
  const [stage,       setStage]       = useState(o?.stage ?? stages[0]?.key ?? '')
  const [probability, setProbability] = useState(String(o?.probability ?? stageProbability(stages, stages[0]?.key ?? '')))
  const [tjmVendu,    setTjmVendu]    = useState(o?.tjm_vendu?.toString() ?? '')
  const [tjmAchat,    setTjmAchat]    = useState(o?.tjm_achat?.toString() ?? '')
  const [jours,       setJours]       = useState(o?.jours_estimes?.toString() ?? '')
  const [amount,      setAmount]      = useState(o?.amount?.toString() ?? '')
  const [closeDate,   setCloseDate]   = useState(o?.expected_close_date ?? '')
  const [startDate,   setStartDate]   = useState(o?.start_date ?? '')
  const [source,      setSource]      = useState(o?.source ?? '')
  const [description, setDescription] = useState(o?.description ?? '')
  const [lostReason,  setLostReason]  = useState(o?.lost_reason ?? '')
  const [askLost,     setAskLost]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const estimated = estimateAmount(dealType, num(tjmVendu), num(jours))
  const isOpen    = !o || o.status === 'open'

  const onStage = (key: string) => {
    setStage(key)
    setProbability(String(stageProbability(stages, key)))
  }

  async function run(action: () => Promise<void>) {
    setSaving(true)
    setError(null)
    try {
      await action()
      onSaved()
    } catch (e) {
      const msg = (e as Error).message
      setError(msg === 'lost_reason_required' ? t('form.errorLostReason') : msg)
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit() {
    if (!name.trim()) { setError(t('form.errorName'));   return }
    if (!clientId)    { setError(t('form.errorClient')); return }
    const payload = {
      name:                name.trim(),
      client_id:           clientId,
      end_client_id:       endClientId || null,
      owner_id:            ownerId || null,
      deal_type:           dealType,
      stage,
      probability:         clampPct(Number(probability)),
      tjm_vendu:           num(tjmVendu),
      tjm_achat:           dealType === 'sourcing' ? num(tjmAchat) : null,
      jours_estimes:       num(jours),
      amount:              num(amount) ?? estimated,
      expected_close_date: closeDate || null,
      start_date:          startDate || null,
      source:              source.trim() || null,
      description:         description.trim() || null,
    }
    return run(() => (o ? updateOpportunity(o.id, payload) : createOpportunity({ ...payload, company_id: companyId })))
  }

  const setStatus = (s: OpportunityStatus) => run(() => setOpportunityStatus(o!.id, s, lostReason))

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
      background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
      zIndex: 300, padding: 28, overflowY: 'auto', boxShadow: '-4px 0 24px var(--shadow)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
          {mode === 'edit' ? t('form.titleEdit') : t('form.titleCreate')}
          {o && o.status !== 'open' && <span style={{ marginLeft: 8, color: 'var(--gold)' }}>· {t(`status.${o.status}`)}</span>}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <Section>{t('form.sectionDeal')}</Section>
      <Field label={t('form.name')} required>
        <input className="input" value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label={t('form.client')} required hint={t('form.clientHint')}>
        <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
          <option value="">—</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.client_type === 'intermediary' ? ` · ${t('form.intermediary')}` : ''}</option>)}
        </select>
        <QuickClient companyId={companyId} defaultType="intermediary"
                     onCreated={c => { setClients(cs => [...cs, c].sort((a, b) => a.name.localeCompare(b.name))); setClientId(c.id) }} />
      </Field>
      <Field label={t('form.endClient')} hint={t('form.endClientHint')}>
        <select className="input" value={endClientId} onChange={e => setEndClientId(e.target.value)}>
          <option value="">—</option>
          {clients.filter(c => c.id !== clientId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <QuickClient companyId={companyId} defaultType="final"
                     onCreated={c => { setClients(cs => [...cs, c].sort((a, b) => a.name.localeCompare(b.name))); setEndClientId(c.id) }} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={t('form.dealType')}>
          <select className="input" value={dealType} onChange={e => setDealType(e.target.value as DealType)}>
            {DEAL_TYPES.map(d => <option key={d} value={d}>{t(`dealType.${d}`)}</option>)}
          </select>
        </Field>
        <Field label={t('form.owner')}>
          <select className="input" value={ownerId} onChange={e => setOwnerId(e.target.value)}>
            <option value="">—</option>
            {owners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      <Section>{t('form.sectionPipeline')}</Section>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Field label={t('form.stage')}>
          <select className="input" value={stage} onChange={e => onStage(e.target.value)}>
            {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            {!stages.some(s => s.key === stage) && <option value={stage}>{stage}</option>}
          </select>
        </Field>
        <Field label={t('form.probability')}>
          <input className="input" type="number" min={0} max={100} value={probability} onChange={e => setProbability(e.target.value)} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={t('form.closeDate')}>
          <input className="input" type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} />
        </Field>
        <Field label={t('form.startDate')} hint={t('form.startDateHint')}>
          <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </Field>
      </div>
      <Field label={t('form.source')}>
        <input className="input" value={source} onChange={e => setSource(e.target.value)} placeholder={t('form.sourcePlaceholder')} />
      </Field>

      <Section>{t('form.sectionMoney')}</Section>
      <div style={{ display: 'grid', gridTemplateColumns: dealType === 'sourcing' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12 }}>
        <Field label={t('form.tjmVendu')}>
          <input className="input" type="number" min={0} value={tjmVendu} onChange={e => setTjmVendu(e.target.value)} />
        </Field>
        {dealType === 'sourcing' && (
          <Field label={t('form.tjmAchat')}>
            <input className="input" type="number" min={0} value={tjmAchat} onChange={e => setTjmAchat(e.target.value)} />
          </Field>
        )}
        <Field label={t('form.jours')}>
          <input className="input" type="number" min={0} value={jours} onChange={e => setJours(e.target.value)} />
        </Field>
      </div>
      <Field label={t('form.amount')} hint={estimated != null ? t('form.amountEstimated', { amount: estimated.toLocaleString('fr-FR') }) : undefined}>
        <input className="input" type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)}
               placeholder={estimated != null ? String(estimated) : ''} />
      </Field>
      <Field label={t('form.description')}>
        <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }} />
      </Field>

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={saving}>
          {saving ? t('form.saving') : mode === 'edit' ? t('form.save') : t('form.create')}
        </button>
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('form.cancel')}</button>
      </div>

      {/* Closing / reopening */}
      {o && (
        <>
          <Section>{t('form.sectionClose')}</Section>
          {isOpen ? (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--green)', color: 'var(--green)' }}
                        disabled={saving} onClick={() => setStatus('won')}>{t('actions.won')}</button>
                <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--pink)', color: 'var(--pink)' }}
                        disabled={saving} onClick={() => setAskLost(true)}>{t('actions.lost')}</button>
                <button className="btn btn-ghost btn-sm" disabled={saving}
                        onClick={() => setStatus('abandoned')}>{t('actions.abandoned')}</button>
              </div>
              {askLost && (
                <div style={{ marginTop: 12 }}>
                  <Field label={t('form.lostReason')} required>
                    <input className="input" value={lostReason} onChange={e => setLostReason(e.target.value)} autoFocus />
                  </Field>
                  <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--pink)', color: 'var(--pink)' }}
                          disabled={saving} onClick={() => setStatus('lost')}>{t('actions.confirmLost')}</button>
                </div>
              )}
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setStatus('open')}>
              {t('actions.reopen')}
            </button>
          )}
          <div style={{ marginTop: 20 }}>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text2)' }} disabled={saving}
                    onClick={() => { if (confirm(t('actions.deleteConfirm'))) run(() => deleteOpportunity(o.id)) }}>
              {t('actions.delete')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Inline "new client" for when the billed party or end client is not in the list yet. */
function QuickClient({ companyId, defaultType, onCreated }: {
  companyId:   string
  defaultType: ClientType
  onCreated:   (c: ClientOption) => void
}) {
  const t = useTranslations('crm.form')
  const [open,  setOpen]  = useState(false)
  const [name,  setName]  = useState('')
  const [type,  setType]  = useState<ClientType>(defaultType)
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async () => {
    if (!name.trim()) return
    setBusy(true); setError(null)
    try {
      const id = await createClient({ name: name.trim(), client_type: type, company_id: companyId })
      onCreated({ id, name: name.trim(), client_type: type })
      setOpen(false); setName('')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text2)', display: 'flex', gap: 12 }}>
        <button type="button" onClick={() => setOpen(true)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--cyan)', fontFamily: 'inherit', fontSize: 10 }}>
          {t('quickClient')}
        </button>
        <a href="/clients" target="_blank" rel="noopener" style={{ color: 'var(--text2)', textDecoration: 'underline' }}>{t('manageClients')}</a>
      </div>
    )
  }
  return (
    <div style={{ marginTop: 8, padding: 10, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 3 }}>
      {error && <div className="form-error">{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 6 }}>
        <input className="input" placeholder={t('quickClientName')} value={name} autoFocus
               onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create() }} />
        <select className="input" value={type} onChange={e => setType(e.target.value as ClientType)}>
          <option value="final">{t('final')}</option>
          <option value="intermediary">{t('intermediary')}</option>
          <option value="both">{t('both')}</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={create} disabled={busy || !name.trim()}>{t('create')}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={busy}>{t('cancel')}</button>
      </div>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', margin: '22px 0 14px' }}>
      {children}
    </div>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--pink)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ marginTop: 5, fontSize: 10, color: 'var(--text2)', opacity: 0.8 }}>{hint}</div>}
    </div>
  )
}

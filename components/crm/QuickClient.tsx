'use client'

/**
 * components/crm/QuickClient.tsx
 * Inline client creation (name + type) under a client picker, shared by the
 * deal and project forms, so a missing client never forces leaving the form.
 */

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import { createClient }    from '@/lib/data'
import type { ClientType } from '@/types'

export interface QuickClientResult { id: string; name: string; client_type: string }

/** Inline "new client" for when the billed party or end client is not in the list yet. */
export function QuickClient({ companyId, defaultType, onCreated }: {
  companyId:   string
  defaultType: ClientType
  onCreated:   (c: QuickClientResult) => void
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

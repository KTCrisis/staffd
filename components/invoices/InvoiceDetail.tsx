// components/invoices/InvoiceDetail.tsx
'use client'

// Page d'une facture : aperçu imprimable + actions selon le statut.
//   brouillon → émettre (numéro attribué par issue_invoice) · supprimer
//   envoyée   → marquer payée · annuler
//   payée     → repasser en envoyée
// Les refus viennent de la base (0010, codes INVOICE_*), traduits ici.

import { useState }           from 'react'
import { useRouter }          from 'next/navigation'
import { useTranslations }    from 'next-intl'
import { supabase }           from '@/lib/supabase'
import { toISO }              from '@/lib/utils'
import { InvoicePreview }     from './InvoicePreview'
import type { BillingSettings, InvoiceClient, InvoiceLineItem } from './InvoicePreview'
import type { InvoiceStyle } from '@/lib/branding'

const CODES = ['INVOICE_LOCKED', 'INVOICE_NOT_DRAFT', 'INVOICE_EMPTY', 'INVOICE_FORBIDDEN', 'INVOICE_ISSUE_REQUIRED'] as const

interface Props {
  invoice: {
    id: string; number: string | null; status: string
    date: string; dueDate: string; tvaRate: number; notes: string; projectName: string
    periodStart: string | null; periodEnd: string | null
  }
  lines:     InvoiceLineItem[]
  client:    InvoiceClient
  billing:   BillingSettings
  canManage: boolean
  style:     InvoiceStyle
}

export function InvoiceDetail({ invoice, lines, client, billing, canManage, style }: Props) {
  const t      = useTranslations('invoices.detail')
  const router = useRouter()
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, after?: () => void) => {
    setBusy(true); setError(null)
    const { error: e } = await fn()
    setBusy(false)
    if (e) {
      const code = CODES.find(c => e.message.includes(c))
      setError(code ? t(`errors.${code}`) : e.message)
      return
    }
    if (after) after(); else router.refresh()
  }

  const issue    = () => { if (confirm(t('confirmIssue'))) run(() => supabase.rpc('issue_invoice', { p_invoice_id: invoice.id })) }
  const remove   = () => { if (confirm(t('confirmDelete'))) run(() => supabase.from('invoices').delete().eq('id', invoice.id), () => router.push('/invoices')) }
  const markPaid = () => run(() => supabase.from('invoices').update({ status: 'paid', paid_at: toISO(new Date()) }).eq('id', invoice.id))
  const unpay    = () => run(() => supabase.from('invoices').update({ status: 'sent', paid_at: null }).eq('id', invoice.id))
  const cancel   = () => { if (confirm(t('confirmCancel'))) run(() => supabase.from('invoices').update({ status: 'cancelled' }).eq('id', invoice.id)) }

  const period = invoice.periodStart ? `${invoice.periodStart} → ${invoice.periodEnd ?? ''}` : ''

  return (
    <div className="app-content">
      <div className="invoice-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/invoices')}>← {t('back')}</button>
        <span className="label-meta" style={{ marginRight: 'auto' }}>{t(`status.${invoice.status}`)}</span>
        {canManage && invoice.status === 'draft' && (
          <>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={remove}>{t('delete')}</button>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={issue}>{t('issue')}</button>
          </>
        )}
        {canManage && invoice.status === 'sent' && (
          <>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={cancel}>{t('cancel')}</button>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={markPaid}>{t('markPaid')}</button>
          </>
        )}
        {canManage && invoice.status === 'paid' && (
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={unpay}>{t('unpay')}</button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>{t('print')}</button>
      </div>
      {invoice.status === 'draft' && <p className="label-meta" style={{ marginBottom: 12 }}>{t('draftNote')}</p>}
      {error && <p className="ts-status-msg ts-status-msg--error" role="alert">{error}</p>}
      <div style={{ maxWidth: 860 }}>
        <InvoicePreview
          invoiceNumber={invoice.number}
          invoiceDate={invoice.date}
          dueDate={invoice.dueDate}
          lines={lines}
          tvaRate={invoice.tvaRate}
          client={client}
          projectName={invoice.projectName}
          billing={billing}
          notes={invoice.notes}
          periodLabel={period}
          style={style}
        />
      </div>
    </div>
  )
}

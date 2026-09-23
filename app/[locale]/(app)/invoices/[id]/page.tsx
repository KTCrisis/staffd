// app/[locale]/(app)/invoices/[id]/page.tsx

import { getPageAuth }        from '@/lib/auth/page-auth'
import { getTranslations }    from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { Topbar }             from '@/components/layout/Topbar'
import { InvoiceDetail }      from '@/components/invoices/InvoiceDetail'
import { canViewOwnInvoices, canEdit } from '@/lib/auth/roles'
import type { BillingSettings, InvoiceClient, InvoiceLineItem } from '@/components/invoices/InvoicePreview'

interface Props {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params
  const t = await getTranslations('invoices.detail')
  const { role, isSA, companyName, supabase } = await getPageAuth()

  if (!canViewOwnInvoices(role)) redirect('/dashboard')

  const { data: inv } = await supabase
    .from('invoices')
    .select('*, clients(name,billing_address,siren,tva_number), projects(name), companies(billing_settings,name)')
    .eq('id', id)
    .maybeSingle()
  if (!inv) notFound()

  const { data: lineRows } = await supabase
    .from('invoice_lines')
    .select('id,description,detail,quantity,unit,unit_price,sort_order')
    .eq('invoice_id', id)
    .order('sort_order')

  // Émise : instantanés figés à l'émission. Brouillon : état courant.
  const issued  = inv.status !== 'draft'
  const company = inv.companies as { billing_settings: BillingSettings | null; name: string } | null
  const billing = (issued && inv.emitter_snapshot
    ? inv.emitter_snapshot
    : { ...(company?.billing_settings ?? {}), company_name: company?.name }) as BillingSettings
  const liveClient = inv.clients as { name: string; billing_address: string | null; siren: string | null; tva_number: string | null } | null
  const snap = inv.client_snapshot as { name?: string; address?: string; siren?: string; tva_number?: string } | null
  const client: InvoiceClient = issued && snap
    ? { name: snap.name ?? '', address: snap.address, siren: snap.siren, tva_number: snap.tva_number }
    : { name: liveClient?.name ?? snap?.name ?? '', address: liveClient?.billing_address ?? snap?.address,
        siren: liveClient?.siren, tva_number: liveClient?.tva_number }

  type LineRow = { id: string; description: string; detail: string | null; quantity: number; unit: string | null; unit_price: number }
  const lines: InvoiceLineItem[] = ((lineRows ?? []) as LineRow[]).map(l => ({
    id: l.id, description: l.description, detail: l.detail ?? '',
    quantity: Number(l.quantity), unit: (l.unit ?? 'unit') as InvoiceLineItem['unit'], unit_price: Number(l.unit_price),
  }))

  return (
    <>
      <Topbar title={inv.invoice_number ?? t('draftTitle')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <InvoiceDetail
        invoice={{
          id: inv.id, number: inv.invoice_number, status: inv.status,
          date: inv.invoice_date, dueDate: inv.due_date ?? '', tvaRate: Number(inv.tva_rate),
          notes: inv.notes ?? '', projectName: (inv.projects as { name: string } | null)?.name ?? '',
          periodStart: inv.source_period_start, periodEnd: inv.source_period_end,
        }}
        lines={lines}
        client={client}
        billing={billing}
        canManage={canEdit(role)}
      />
    </>
  )
}

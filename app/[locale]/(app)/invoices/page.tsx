// app/[locale]/(app)/invoices/page.tsx

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { redirect }        from 'next/navigation'
import { Topbar }          from '@/components/layout/Topbar'
import { InvoiceList }     from '@/components/invoices/InvoiceList'
import { canViewOwnInvoices } from '@/lib/auth/roles'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function InvoicesPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t = await getTranslations('invoices')
  const { role, isSA, companyName, supabase } = await getPageAuth(tenant)

  if (!canViewOwnInvoices(role)) redirect('/dashboard')

  // invoice_list is security_invoker: the invoices RLS decides what each role sees.
  let query = supabase
    .from('invoice_list')
    .select('*')
    .order('invoice_date', { ascending: false })
    .order('invoice_number', { ascending: false })
  if (tenant) query = query.eq('company_id', tenant)

  const { data: invoices, error } = await query

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <div className="app-content">
        <InvoiceList invoices={invoices ?? []} error={error?.message ?? null} />
      </div>
    </>
  )
}

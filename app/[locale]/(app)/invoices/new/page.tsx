// app/[locale]/(app)/invoices/new/page.tsx

import { getPageAuth }          from '@/lib/auth/page-auth'
import { getTranslations }      from 'next-intl/server'
import { redirect }             from 'next/navigation'
import { Topbar }               from '@/components/layout/Topbar'
import { InvoiceForm }          from '@/components/invoices/InvoiceForm'
import { canViewOwnInvoices }   from '@/lib/auth/roles'

export default async function InvoiceNewPage() {
  const t = await getTranslations('invoices.form')
  const { role, isSA, companyName } = await getPageAuth()

  if (!canViewOwnInvoices(role)) redirect('/dashboard')

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <InvoiceForm />
    </>
  )
}
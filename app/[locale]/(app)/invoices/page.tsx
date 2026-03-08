// app/[locale]/(app)/invoices/page.tsx

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { redirect }        from 'next/navigation'
import { Topbar }          from '@/components/layout/Topbar'
import { InvoiceList }     from '@/components/invoices/InvoiceList'
import { canViewOwnInvoices } from '@/lib/auth/roles'

export default async function InvoicesPage() {
  const t = await getTranslations('invoices')
  const { role, isSA, companyName } = await getPageAuth()

  if (!canViewOwnInvoices(role)) redirect('/dashboard')

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <div className="app-content">
        <InvoiceList />
      </div>
    </>
  )
}
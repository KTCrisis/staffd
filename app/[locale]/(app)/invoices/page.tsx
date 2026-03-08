// app/[locale]/(app)/invoices/page.tsx

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { Topbar }          from '@/components/layout/Topbar'
import { InvoiceList }     from '@/components/invoices/InvoiceList'

export default async function InvoicesPage() {
  const t = await getTranslations('invoices')
  const { isSA, companyName } = await getPageAuth()

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <div className="app-content">
        <InvoiceList />
      </div>
    </>
  )
}
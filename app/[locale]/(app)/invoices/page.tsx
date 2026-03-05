// app/[locale]/(app)/invoices/page.tsx
import { InvoiceList } from '@/components/invoices/InvoiceList'
import { Topbar }      from '@/components/layout/Topbar'

export default function InvoicesPage() {
  return (
    <>
      <Topbar title="Invoices" breadcrumb="// billing" />
      <div className="app-content">
        <InvoiceList />
      </div>
    </>
  )
}
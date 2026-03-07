// app/[locale]/(app)/clients/page.tsx
// ── Server Component ─────────────────────────────────────────

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { ClientsClient }      from '@/components/clients/ClientsClient'

export default async function ClientsPage() {
  const t           = await getTranslations('clients')
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data } = await supabase
    .from('clients')
    .select('*, projects!client_id(id, status)')
    .order('name')

  const clients = (data ?? []).map((row: any) => ({
    id:            row.id,
    name:          row.name,
    sector:        row.sector ?? null,
    website:       row.website ?? null,
    contactName:   row.contact_name ?? null,
    contactEmail:  row.contact_email ?? null,
    contactPhone:  row.contact_phone ?? null,
    companyId:     row.company_id,
    notes:         row.notes ?? null,
    activeProjects: (row.projects as any[]).filter((p: any) => p.status === 'active').length,
    totalProjects:  (row.projects as any[]).length,
  }))

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
      <ClientsClient clients={clients} />
    </>
  )
}
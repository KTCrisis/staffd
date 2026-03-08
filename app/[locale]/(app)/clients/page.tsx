// app/[locale]/(app)/clients/page.tsx

import { getPageAuth }    from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { Topbar }          from '@/components/layout/Topbar'
import { ClientsClient }   from '@/components/clients/ClientsClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function ClientsPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('clients')
  const { isSA, companyId: authCompanyId, companyName, supabase } = await getPageAuth(tenant)

  const companyId = (tenant ?? authCompanyId ?? '') as string

  let query = supabase
    .from('clients')
    .select('*, projects!client_id(id, status)')
    .order('name')

  if (tenant) query = query.eq('company_id', tenant)

  const { data } = await query

  const clients = (data ?? []).map((row: any) => ({
    id:             row.id,
    name:           row.name,
    sector:         row.sector        ?? null,
    website:        row.website       ?? null,
    contactName:    row.contact_name  ?? null,
    contactEmail:   row.contact_email ?? null,
    contactPhone:   row.contact_phone ?? null,
    companyId:      row.company_id,
    notes:          row.notes         ?? null,
    activeProjects: (row.projects as any[]).filter((p: any) => p.status === 'active').length,
    totalProjects:  (row.projects as any[]).length,
  }))

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <ClientsClient clients={clients} companyId={companyId} />
    </>
  )
}
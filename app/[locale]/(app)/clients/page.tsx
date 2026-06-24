// app/[locale]/(app)/clients/page.tsx

import { getPageAuth }    from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { Topbar }          from '@/components/layout/Topbar'
import { ClientsClient }   from '@/components/clients/ClientsClient'
import type { Tables }     from '@/types/supabase'
import type { Client }     from '@/types'

type ClientRow = Tables<'clients'> & {
  projects: Pick<Tables<'projects'>, 'id' | 'status'>[]
}

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

  // Le mapping émet `string | null` sur les champs optionnels ; `Client` les
  // déclare `string | undefined`. On conserve la valeur runtime (null) et on
  // réconcilie le type au passage de prop — type-only, aucun changement de valeur.
  const clients = ((data ?? []) as ClientRow[]).map((row) => ({
    id:             row.id,
    name:           row.name,
    sector:         row.sector        ?? null,
    website:        row.website       ?? null,
    contactName:    row.contact_name  ?? null,
    contactEmail:   row.contact_email ?? null,
    contactPhone:   row.contact_phone ?? null,
    companyId:      row.company_id,
    notes:          row.notes         ?? null,
    activeProjects: row.projects.filter((p) => p.status === 'active').length,
    totalProjects:  row.projects.length,
  }))

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <ClientsClient clients={clients as Client[]} companyId={companyId} />
    </>
  )
}
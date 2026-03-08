// app/[locale]/(app)/clients/page.tsx

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { ClientsClient }      from '@/components/clients/ClientsClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function ClientsPage({ searchParams }: Props) {
  const { tenant }  = await searchParams
  const t           = await getTranslations('clients')
  const cookieStore = await cookies()

  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const isSA      = user?.app_metadata?.is_super_admin === true
  const companyId = (tenant ?? user?.app_metadata?.company_id ?? '') as string

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    isSA
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

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
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
      <ClientsClient clients={clients} companyId={companyId} />
    </>
  )
}
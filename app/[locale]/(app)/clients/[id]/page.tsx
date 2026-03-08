// app/[locale]/(app)/clients/[id]/page.tsx

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { notFound }           from 'next/navigation'
import { Topbar }             from '@/components/layout/Topbar'
import { ClientDetailClient } from '@/components/clients/ClientDetailClient'

interface Props {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ tenant?: string }>
}

export default async function ClientDetailPage({ params, searchParams }: Props) {
  const [{ id }, { tenant }] = await Promise.all([params, searchParams])
  const t           = await getTranslations('clients')
  const cookieStore = await cookies()

  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const role = user?.app_metadata?.user_role as string | undefined
  const isSA = role === 'super_admin'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    isSA
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const [clientRes, projectsRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('projects')
      .select('id, name, status, end_date, budget_total')
      .eq('client_id', id)
      .order('end_date', { ascending: false }),
  ])

  if (!clientRes.data) notFound()

  const raw = clientRes.data
  const client = {
    id:           raw.id,
    companyId:    raw.company_id,
    name:         raw.name,
    sector:       raw.sector        ?? null,
    website:      raw.website       ?? null,
    contactName:  raw.contact_name  ?? null,
    contactEmail: raw.contact_email ?? null,
    contactPhone: raw.contact_phone ?? null,
    notes:        raw.notes         ?? null,
  }

  const projects = (projectsRes.data ?? []).map((p: any) => ({
    id:          p.id,
    name:        p.name,
    status:      p.status,
    endDate:     p.end_date     ?? null,
    budgetTotal: p.budget_total ?? null,
  }))

  return (
    <>
      <Topbar title={client.name} breadcrumb={`${t('breadcrumb')} / ${client.name}`} />
      <ClientDetailClient client={client} projects={projects} />
    </>
  )
}
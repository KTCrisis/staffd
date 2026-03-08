// app/[locale]/(app)/projects/page.tsx

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { ProjectsClient }     from '@/components/projects/ProjectsClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function ProjectsPage({ searchParams }: Props) {
  const { tenant }  = await searchParams
  const t           = await getTranslations('projects')
  const cookieStore = await cookies()

  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const isSA = user?.app_metadata?.is_super_admin === true

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    isSA
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  let query = supabase
    .from('projects')
    .select(`
      *,
      assignments(
        consultant_id,
        consultants(id, name, initials, avatar_color)
      )
    `)
    .neq('status', 'archived')
    .order('status')

  if (tenant) query = query.eq('company_id', tenant)

  const { data, error } = await query

  const projects = (data ?? []).map((p: any) => ({
    id:          p.id,
    name:        p.name,
    status:      p.status,
    reference:   p.reference    ?? null,
    description: p.description  ?? null,
    clientName:  p.client_name  ?? null,
    client:      p.client       ?? null,
    startDate:   p.start_date   ?? null,
    endDate:     p.end_date     ?? null,
    tjmVendu:    p.tjm_vendu    ?? null,
    joursVendus: p.jours_vendus ?? null,
    budgetTotal: p.budget_total ?? null,
    isInternal:  p.is_internal  ?? false,
    progress:    p.progress     ?? 0,
    team: (p.assignments ?? [])
      .map((a: any) => a.consultants)
      .filter(Boolean)
      .map((c: any) => ({
        id:          c.id,
        name:        c.name,
        initials:    c.initials,
        avatarColor: c.avatar_color ?? 'green',
      })),
  }))

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} />
      <ProjectsClient projects={projects} error={error?.message ?? null} />
    </>
  )
}
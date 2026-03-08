// app/[locale]/(app)/projects/page.tsx

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { Topbar }          from '@/components/layout/Topbar'
import { ProjectsClient }  from '@/components/projects/ProjectsClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function ProjectsPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('projects')
  const { isSA, companyName, supabase } = await getPageAuth(tenant)

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
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <ProjectsClient projects={projects} error={error?.message ?? null} />
    </>
  )
}
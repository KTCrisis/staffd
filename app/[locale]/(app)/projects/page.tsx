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
  const { role, isSA, userId, companyName, supabase } = await getPageAuth(tenant)

  const isConsultantOnly = role === 'consultant' || role === 'freelance'

  // ── Consultant/freelance : récupérer ses project_ids via assignments ──
  let myProjectIds: string[] | null = null
  if (isConsultantOnly && userId) {
    const { data: meData } = await supabase
      .from('consultants')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (meData?.id) {
      const { data: assignments } = await supabase
        .from('assignments')
        .select('project_id')
        .eq('consultant_id', meData.id)

      myProjectIds = (assignments ?? []).map((a: any) => a.project_id)
    } else {
      myProjectIds = [] // pas de profil lié → aucun projet
    }
  }

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

  // Consultant : limiter aux projets assignés
  if (myProjectIds !== null) {
    if (myProjectIds.length === 0) {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    } else {
      query = query.in('id', myProjectIds)
    }
  }

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
    tjmVendu:    isConsultantOnly ? null : (p.tjm_vendu ?? null),  // masquer TJM
    joursVendus: isConsultantOnly ? null : (p.jours_vendus ?? null),
    budgetTotal: isConsultantOnly ? null : (p.budget_total ?? null),
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
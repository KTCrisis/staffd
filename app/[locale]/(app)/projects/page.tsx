// app/[locale]/(app)/projects/page.tsx

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { Topbar }          from '@/components/layout/Topbar'
import { ProjectsClient }  from '@/components/projects/ProjectsClient'
import type { Tables }     from '@/types/supabase'

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

      myProjectIds = ((assignments ?? []) as Pick<Tables<'assignments'>, 'project_id'>[])
        .map((a) => a.project_id) as string[]
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

  type ProjectAssignmentConsultant = Pick<Tables<'consultants'>, 'id' | 'name' | 'initials' | 'avatar_color'>
  // La page lit `p.client` (legacy) qui n'est pas une colonne de la table projects :
  // la lecture retombait déjà sur null. Déclarée optionnelle pour préserver le runtime.
  type ProjectRow = Tables<'projects'> & {
    client?: string | null
    assignments: { consultant_id: string | null; consultants: ProjectAssignmentConsultant | null }[]
  }

  const projects = ((data ?? []) as ProjectRow[]).map((p) => ({
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
      .map((a) => a.consultants)
      .filter((c): c is ProjectAssignmentConsultant => Boolean(c))
      .map((c) => ({
        id:          c.id,
        name:        c.name,
        initials:    c.initials,
        avatarColor: c.avatar_color ?? 'green',
      })),
  }))

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <ProjectsClient projects={projects as React.ComponentProps<typeof ProjectsClient>['projects']} error={error?.message ?? null} userRole={role} />
    </>
  )
}
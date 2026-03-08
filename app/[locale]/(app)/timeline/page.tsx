// app/[locale]/(app)/timeline/page.tsx

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { redirect }        from 'next/navigation'
import { Topbar }          from '@/components/layout/Topbar'
import { TimelineClient }  from '@/components/timeline/TimelineClient'
import { canEdit }         from '@/lib/auth/roles'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function TimelinePage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('timeline')
  const { role, isSA, companyName, supabase } = await getPageAuth(tenant)

  if (!canEdit(role)) redirect('/dashboard')

  // ── Filtre manager via RPC ───────────────────────────────────
  let teamIds: string[] | null = null
  if (role === 'manager') {
    const { data, error } = await supabase.rpc('my_team_consultant_ids')
    teamIds = error ? [] : ((data as string[]) ?? [])
  }

  const noMatch = '00000000-0000-0000-0000-000000000000'

  let projectsQ = supabase
    .from('projects')
    .select(`
      id, name, status, start_date, end_date, client_name, is_internal,
      assignments ( consultant_id, consultants ( id, name, initials, avatar_color ) )
    `)
    .neq('status', 'archived')
    .order('start_date')

  let consultantsQ = supabase
    .from('consultant_occupancy')
    .select('id, name, initials, avatar_color, status')
    .order('name')

  let leavesQ = supabase
    .from('leave_requests')
    .select('id, consultant_id, type, status, start_date, end_date')
    .neq('status', 'refused')

  if (tenant) {
    projectsQ    = projectsQ.eq('company_id', tenant)
    consultantsQ = consultantsQ.eq('company_id', tenant)
    leavesQ      = leavesQ.eq('company_id', tenant)
  }

  // Manager : filtrer consultants et congés par équipe
  // Projets : on garde tous les projets du tenant mais on filtre l'affichage équipe côté client
  if (teamIds !== null) {
    if (teamIds.length === 0) {
      consultantsQ = consultantsQ.eq('id',           noMatch) as typeof consultantsQ
      leavesQ      = leavesQ.eq('consultant_id',     noMatch) as typeof leavesQ
    } else {
      consultantsQ = consultantsQ.in('id',           teamIds) as typeof consultantsQ
      leavesQ      = leavesQ.in('consultant_id',     teamIds) as typeof leavesQ
    }
  }

  const [projectsRes, consultantsRes, leavesRes] = await Promise.all([
    projectsQ, consultantsQ, leavesQ,
  ])

  const teamConsultantIds = teamIds ? new Set(teamIds) : null

  const projects = (projectsRes.data ?? []).map((p: any) => {
    const allTeam = (p.assignments ?? [])
      .map((a: any) => a.consultants)
      .filter(Boolean)
      .filter((c: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === c.id) === i)

    // Manager : ne montrer que les consultants de son équipe dans le projet
    const team = teamConsultantIds
      ? allTeam.filter((c: any) => teamConsultantIds.has(c.id))
      : allTeam

    return {
      id:         p.id,
      name:       p.name,
      status:     p.status,
      startDate:  p.start_date,
      endDate:    p.end_date,
      clientName: p.client_name,
      isInternal: p.is_internal ?? false,
      team,
    }
  }).filter((p: any) => !teamConsultantIds || p.team.length > 0)
  // Manager : exclure les projets sans aucun membre de son équipe

  const consultants = consultantsRes.data ?? []

  const leaveRequests = (leavesRes.data ?? []).map((l: any) => ({
    id:           l.id,
    consultantId: l.consultant_id,
    type:         l.type,
    status:       l.status,
    startDate:    l.start_date,
    endDate:      l.end_date,
  }))

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <TimelineClient
        projects={projects}
        consultants={consultants}
        leaveRequests={leaveRequests}
      />
    </>
  )
}
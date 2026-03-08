// app/[locale]/(app)/timeline/page.tsx

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { Topbar }          from '@/components/layout/Topbar'
import { TimelineClient }  from '@/components/timeline/TimelineClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function TimelinePage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('timeline')
  const { isSA, companyName, supabase } = await getPageAuth(tenant)

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

  const [projectsRes, consultantsRes, leavesRes] = await Promise.all([
    projectsQ, consultantsQ, leavesQ,
  ])

  const projects = (projectsRes.data ?? []).map((p: any) => ({
    id:         p.id,
    name:       p.name,
    status:     p.status,
    startDate:  p.start_date,
    endDate:    p.end_date,
    clientName: p.client_name,
    isInternal: p.is_internal ?? false,
    team: (p.assignments ?? [])
      .map((a: any) => a.consultants)
      .filter(Boolean)
      .filter((c: any, i: number, arr: any[]) => arr.findIndex(x => x.id === c.id) === i),
  }))

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
// app/[locale]/(app)/timeline/page.tsx
// ── Server Component ─────────────────────────────────────────

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { TimelineClient }     from '@/components/timeline/TimelineClient'

export default async function TimelinePage() {
  const t           = await getTranslations('timeline')
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const [projectsRes, consultantsRes, leavesRes] = await Promise.all([
    supabase
      .from('projects')
      .select(`
        id, name, status, start_date, end_date, client_name,
        assignments ( consultant_id, consultants ( id, name, initials, avatar_color ) )
      `)
      .neq('status', 'archived')
      .order('start_date'),

    supabase
      .from('consultant_occupancy')
      .select('id, name, initials, avatar_color, status')
      .order('name'),

    supabase
      .from('leave_requests')
      .select('id, consultant_id, type, status, start_date, end_date')
      .neq('status', 'refused'),
  ])

  // Normalise projets — construit team[] depuis la jointure
  const projects = (projectsRes.data ?? []).map((p: any) => ({
    id:         p.id,
    name:       p.name,
    status:     p.status,
    startDate:  p.start_date,
    endDate:    p.end_date,
    clientName: p.client_name,
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
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
      <TimelineClient
        projects={projects}
        consultants={consultants}
        leaveRequests={leaveRequests}
      />
    </>
  )
}
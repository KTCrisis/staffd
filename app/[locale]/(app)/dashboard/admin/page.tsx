// app/[locale]/(app)/dashboard/admin/page.tsx

import { cookies }              from 'next/headers'
import { createServerClient }   from '@supabase/ssr'
import { getTranslations }      from 'next-intl/server'
import { Topbar }               from '@/components/layout/Topbar'
import { AdminDashboardClient } from '@/components/dashboard/AdminDashboardClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const { tenant }  = await searchParams
  const t           = await getTranslations('dashboard')
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

  let consultantsQ = supabase.from('consultant_occupancy').select('*').order('name')
  let projectsQ    = supabase.from('projects').select('id, name, status, client_name, progress, tjm_vendu, start_date, end_date').neq('status', 'archived').order('status')
  let leavesQ      = supabase.from('leave_requests').select('status').eq('status', 'pending')
  let activityQ    = supabase.from('activity_feed').select('*').order('created_at', { ascending: false }).limit(5)

  if (tenant) {
    consultantsQ = consultantsQ.eq('company_id', tenant)
    projectsQ    = projectsQ.eq('company_id', tenant)
    leavesQ      = leavesQ.eq('company_id', tenant)
    activityQ    = activityQ.eq('company_id', tenant)
  }

  const [consultantsRes, projectsRes, leavesRes, activityRes] = await Promise.all([
    consultantsQ, projectsQ, leavesQ, activityQ,
  ])

  const consultants   = consultantsRes.data ?? []
  const projects      = projectsRes.data    ?? []
  const activity      = activityRes.data    ?? []
  const pendingLeaves = (leavesRes.data ?? []).length

  const active       = consultants.filter((c: any) => c.status !== 'leave')
  const avgOccupancy = active.length
    ? Math.round(active.reduce((s: number, c: any) => s + (c.occupancy_rate ?? 0), 0) / active.length)
    : 0

  const totalProjects   = projects.length
  const activeCount     = projects.filter((p: any) => p.status === 'active').length
  const projectProgress = totalProjects > 0 ? Math.round((activeCount / totalProjects) * 100) : 0

  const kpi = {
    activeConsultants: active.length,
    totalConsultants:  consultants.length,
    activeProjects:    activeCount,
    pendingLeaves,
    occupancyRate:     avgOccupancy,
  }

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
      <AdminDashboardClient
        consultants={consultants}
        activeProjects={projects.filter((p: any) => p.status === 'active').slice(0, 3)}
        activity={activity}
        kpi={kpi}
        projectProgress={projectProgress}
      />
    </>
  )
}
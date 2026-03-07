// app/[locale]/(app)/dashboard/admin/page.tsx
// ── Server Component ─────────────────────────────────────────
// Avant : 4 hooks useEffect séquentiels (waterfall client-side)
// Après : Promise.all côté serveur → données prêtes avant le premier paint

import { cookies }              from 'next/headers'
import { createServerClient }   from '@supabase/ssr'
import { getTranslations }      from 'next-intl/server'
import { Topbar }               from '@/components/layout/Topbar'
import { AdminDashboardClient } from '@/components/dashboard/AdminDashboardClient'

export default async function AdminDashboardPage() {
  const t           = await getTranslations('dashboard')
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // ── Promise.all : 4 requêtes en parallèle ───────────────────
  // Avant : ~600ms waterfall (4 × ~150ms séquentiels côté client)
  // Après : ~150ms (limité par la requête la plus lente)
  const [consultantsRes, projectsRes, leavesRes, activityRes] = await Promise.all([
    supabase
      .from('consultant_occupancy')
      .select('*')
      .order('name'),

    supabase
      .from('projects')
      .select('id, name, status, client_name, progress, tjm_vendu, start_date, end_date')
      .neq('status', 'archived')
      .order('status'),

    supabase
      .from('leave_requests')
      .select('status')
      .eq('status', 'pending'),

    supabase
      .from('activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const consultants   = consultantsRes.data ?? []
  const projects      = projectsRes.data    ?? []
  const activity      = activityRes.data    ?? []
  const pendingLeaves = (leavesRes.data ?? []).length

  // ── KPIs calculés côté serveur ──────────────────────────────
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

  const activeProjects = projects.filter((p: any) => p.status === 'active').slice(0, 3)

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
      <AdminDashboardClient
        consultants={consultants}
        activeProjects={activeProjects}
        activity={activity}
        kpi={kpi}
        projectProgress={projectProgress}
      />
    </>
  )
}
// app/[locale]/(app)/dashboard/manager/page.tsx
// ── Server Component ─────────────────────────────────────────
// Avant : 4 hooks séquentiels côté client (waterfall)
// Après : Promise.all côté serveur → données prêtes avant le premier paint

import { cookies }               from 'next/headers'
import { createServerClient }    from '@supabase/ssr'
import { getTranslations }       from 'next-intl/server'
import { Topbar }                from '@/components/layout/Topbar'
import { ManagerDashboardClient } from '@/components/dashboard/ManagerDashboardClient'
import { getMondayOf }           from '@/lib/utils'

export default async function ManagerDashboardPage() {
  const t           = await getTranslations('dashboardManager')
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const monday = getMondayOf(new Date())
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const mondayISO = monday.toISOString().slice(0, 10)
  const sundayISO = sunday.toISOString().slice(0, 10)

  // ── Promise.all : 4 requêtes en parallèle ───────────────────
  const [consultantsRes, leavesRes, timesheetsRes, activityRes] = await Promise.all([
    supabase
      .from('consultant_occupancy')
      .select('*')
      .order('name'),

    supabase
      .from('leave_requests')
      .select('id, status, type, start_date, end_date, consultant_id, consultants(name)')
      .eq('status', 'pending')
      .order('start_date'),

    supabase
      .from('timesheets')
      .select('id, status, consultant_id, date')
      .gte('date', mondayISO)
      .lte('date', sundayISO),

    supabase
      .from('activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const consultants = consultantsRes.data ?? []
  const activity    = activityRes.data    ?? []

  // ── Normalisation leave_requests ────────────────────────────
  // La jointure retourne consultants: { name } — on l'aplatit
  const leaveReqs = (leavesRes.data ?? []).map((l: any) => ({
    id:             l.id,
    status:         l.status,
    type:           l.type,
    startDate:      l.start_date,
    endDate:        l.end_date,
    consultantName: l.consultants?.name ?? '—',
  }))

  // ── KPIs calculés côté serveur ──────────────────────────────
  const available  = consultants.filter((c: any) => c.status === 'available').length
  const assigned   = consultants.filter((c: any) => c.status === 'assigned').length
  const pendingCra = (timesheetsRes.data ?? []).filter((ts: any) => ts.status === 'submitted').length
  const avgOcc     = consultants.length
    ? Math.round(consultants.reduce((s: number, c: any) => s + (c.occupancy_rate ?? 0), 0) / consultants.length)
    : 0

  const kpi = {
    available,
    assigned,
    pendingLeave: leaveReqs.length,
    pendingCra,
    avgOcc,
    total: consultants.length,
  }

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
      <ManagerDashboardClient
        consultants={consultants}
        leaveReqs={leaveReqs}
        activity={activity}
        kpi={kpi}
      />
    </>
  )
}
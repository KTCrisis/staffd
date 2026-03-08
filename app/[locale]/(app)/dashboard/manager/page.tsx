// app/[locale]/(app)/dashboard/manager/page.tsx

import { cookies }                from 'next/headers'
import { createServerClient }     from '@supabase/ssr'
import { getTranslations }        from 'next-intl/server'
import { Topbar }                 from '@/components/layout/Topbar'
import { ManagerDashboardClient } from '@/components/dashboard/ManagerDashboardClient'
import { getMondayOf }            from '@/lib/utils'

export default async function ManagerDashboardPage() {
  const t           = await getTranslations('dashboardManager')
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.user_role as string | undefined
  const isSA = user?.app_metadata?.is_super_admin === true

  const monday    = getMondayOf(new Date())
  const sunday    = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const mondayISO = monday.toISOString().slice(0, 10)
  const sundayISO = sunday.toISOString().slice(0, 10)

  // ── IDs de l'équipe du manager via RPC ───────────────────────
  let teamIds: string[] | null = null
  if (role === 'manager') {
    const { data, error } = await supabase.rpc('my_team_consultant_ids')
    teamIds = error ? [] : ((data as string[]) ?? [])
  }

  // ── 4 requêtes en parallèle ──────────────────────────────────
  const noMatch = '00000000-0000-0000-0000-000000000000'

  let consultantsQ = supabase.from('consultant_occupancy').select('*').order('name')
  let leavesQ      = supabase.from('leave_requests')
                       .select('id, status, type, start_date, end_date, consultant_id, consultants(name)')
                       .eq('status', 'pending').order('start_date')
  let timesheetsQ  = supabase.from('timesheets')
                       .select('id, status, consultant_id, date')
                       .gte('date', mondayISO).lte('date', sundayISO)

  if (teamIds !== null) {
    if (teamIds.length === 0) {
      consultantsQ = consultantsQ.eq('id',             noMatch) as typeof consultantsQ
      leavesQ      = leavesQ.eq('consultant_id',       noMatch) as typeof leavesQ
      timesheetsQ  = timesheetsQ.eq('consultant_id',   noMatch) as typeof timesheetsQ
    } else {
      consultantsQ = consultantsQ.in('id',             teamIds) as typeof consultantsQ
      leavesQ      = leavesQ.in('consultant_id',       teamIds) as typeof leavesQ
      timesheetsQ  = timesheetsQ.in('consultant_id',   teamIds) as typeof timesheetsQ
    }
  }

  const [consultantsRes, leavesRes, timesheetsRes, activityRes] = await Promise.all([
    consultantsQ,
    leavesQ,
    timesheetsQ,
    supabase
      .from('activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const consultants = consultantsRes.data ?? []
  const activity    = activityRes.data    ?? []

  const leaveReqs = (leavesRes.data ?? []).map((l: any) => ({
    id:             l.id,
    status:         l.status,
    type:           l.type,
    startDate:      l.start_date,
    endDate:        l.end_date,
    consultantName: l.consultants?.name ?? '—',
  }))

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
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} />
      <ManagerDashboardClient
        consultants={consultants}
        leaveReqs={leaveReqs}
        activity={activity}
        kpi={kpi}
      />
    </>
  )
}
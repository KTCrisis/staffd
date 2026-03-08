// app/[locale]/(app)/dashboard/manager/page.tsx

import { getPageAuth }            from '@/lib/auth/page-auth'
import { getTranslations }        from 'next-intl/server'
import { Topbar }                 from '@/components/layout/Topbar'
import { ManagerDashboardClient } from '@/components/dashboard/ManagerDashboardClient'
import { getMondayOf }            from '@/lib/utils'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function ManagerDashboardPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t = await getTranslations('dashboardManager')
  const { role, isSA, companyName, supabase } = await getPageAuth(tenant)

  const monday    = getMondayOf(new Date())
  const sunday    = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const mondayISO = monday.toISOString().slice(0, 10)
  const sundayISO = sunday.toISOString().slice(0, 10)

  let teamIds: string[] | null = null
  if (role === 'manager') {
    const { data, error } = await supabase.rpc('my_team_consultant_ids')
    teamIds = error ? [] : ((data as string[]) ?? [])
  }

  const noMatch = '00000000-0000-0000-0000-000000000000'

  let consultantsQ = supabase.from('consultant_occupancy').select('*').order('name')
  let leavesQ      = supabase.from('leave_requests')
                       .select('id, status, type, start_date, end_date, consultant_id, consultants(name)')
                       .eq('status', 'pending').order('start_date')
  let timesheetsQ  = supabase.from('timesheets')
                       .select('id, status, consultant_id, date')
                       .gte('date', mondayISO).lte('date', sundayISO)
  let activityQ    = supabase.from('activity_feed')
                       .select('*').order('created_at', { ascending: false }).limit(5)

  if (tenant) {
    consultantsQ = consultantsQ.eq('company_id', tenant)
    leavesQ      = leavesQ.eq('company_id', tenant)
    timesheetsQ  = timesheetsQ.eq('company_id', tenant)
    activityQ    = activityQ.eq('company_id', tenant)
  }

  if (teamIds !== null) {
    if (teamIds.length === 0) {
      consultantsQ = consultantsQ.eq('id',           noMatch) as typeof consultantsQ
      leavesQ      = leavesQ.eq('consultant_id',     noMatch) as typeof leavesQ
      timesheetsQ  = timesheetsQ.eq('consultant_id', noMatch) as typeof timesheetsQ
    } else {
      consultantsQ = consultantsQ.in('id',           teamIds) as typeof consultantsQ
      leavesQ      = leavesQ.in('consultant_id',     teamIds) as typeof leavesQ
      timesheetsQ  = timesheetsQ.in('consultant_id', teamIds) as typeof timesheetsQ
    }
  }

  const [consultantsRes, leavesRes, timesheetsRes, activityRes] = await Promise.all([
    consultantsQ, leavesQ, timesheetsQ, activityQ,
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
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <ManagerDashboardClient
        consultants={consultants}
        leaveReqs={leaveReqs}
        activity={activity}
        kpi={kpi}
      />
    </>
  )
}
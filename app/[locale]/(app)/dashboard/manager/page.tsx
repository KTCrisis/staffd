// app/[locale]/(app)/dashboard/manager/page.tsx

import { getPageAuth }            from '@/lib/auth/page-auth'
import { getTranslations }        from 'next-intl/server'
import { Topbar }                 from '@/components/layout/Topbar'
import { ManagerDashboardClient } from '@/components/dashboard/ManagerDashboardClient'
import { getMondayOf }            from '@/lib/utils'
import type { CalendarEvent }     from '@/components/dashboard/MiniCalendar'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function ManagerDashboardPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t = await getTranslations('dashboardManager')
  const { role, isSA, companyId: authCompanyId, companyName, supabase } = await getPageAuth(tenant)

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

  // ── Événements calendrier ──────────────────────────────────

  const now        = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`

  // Jours fériés
  let holidays: CalendarEvent[] = []
  const companyForCal = tenant ?? authCompanyId
  if (companyForCal) {
    const { data: comp } = await supabase
      .from('companies')
      .select('hr_settings')
      .eq('id', companyForCal)
      .maybeSingle()

    const countryCode = (comp?.hr_settings as any)?.country_code ?? 'FR'
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${now.getFullYear()}/${countryCode}`)
      if (res.ok) {
        const data = await res.json()
        holidays = (data ?? []).map((h: any) => ({
          date:  h.date,
          type:  'holiday' as const,
          label: h.localName ?? h.name,
        }))
      }
    } catch { /* silent */ }
  }

  // Congés approuvés de l'équipe ce mois
  let leaveCalQ = supabase
    .from('leave_requests')
    .select('start_date, end_date, type, consultants(name)')
    .eq('status', 'approved')
    .lte('start_date', monthEnd)
    .gte('end_date', monthStart)

  if (tenant) leaveCalQ = leaveCalQ.eq('company_id', tenant)
  if (teamIds && teamIds.length > 0) leaveCalQ = leaveCalQ.in('consultant_id', teamIds)
  else if (teamIds?.length === 0) leaveCalQ = leaveCalQ.eq('consultant_id', noMatch)

  const { data: leaveCalData } = await leaveCalQ

  const leaveEvents: CalendarEvent[] = (leaveCalData ?? []).flatMap((l: any) => {
    const evts: CalendarEvent[] = []
    const start = new Date(l.start_date + 'T00:00:00')
    const end   = new Date(l.end_date + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        evts.push({
          date:  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
          type:  'leave',
          label: `${l.consultants?.name ?? '—'} — ${l.type}`,
        })
      }
    }
    return evts
  })

  const calendarEvents = [...holidays, ...leaveEvents]

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <ManagerDashboardClient
        consultants={consultants}
        leaveReqs={leaveReqs}
        activity={activity}
        kpi={kpi}
        calendarEvents={calendarEvents}
      />
    </>
  )
}
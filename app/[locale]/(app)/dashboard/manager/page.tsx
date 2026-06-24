// app/[locale]/(app)/dashboard/manager/page.tsx

import { getPageAuth }            from '@/lib/auth/page-auth'
import { getTranslations }        from 'next-intl/server'
import { redirect }               from 'next/navigation'
import { Topbar }                 from '@/components/layout/Topbar'
import { ManagerDashboardClient } from '@/components/dashboard/ManagerDashboardClient'
import { getMondayOf, toISO }     from '@/lib/utils'
import type { CalendarEvent }     from '@/components/dashboard/MiniCalendar'
import type { Tables }            from '@/types/supabase'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

// Réponse de l'API publique date.nager.at (externe, non typée par le SDK Supabase)
interface NagerHoliday {
  date:      string
  localName: string
  name:      string
}

export default async function ManagerDashboardPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t = await getTranslations('dashboardManager')
  const { role, isSA, companyId: authCompanyId, companyName, supabase } = await getPageAuth(tenant)

  // Guard serveur — réservé manager/admin/super_admin (le middleware ne couvre pas /dashboard/*)
  if (!isSA && role !== 'admin' && role !== 'manager') redirect('/dashboard')

  const monday    = getMondayOf(new Date())
  const sunday    = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const mondayISO = toISO(monday)
  const sundayISO = toISO(sunday)

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

  if (consultantsRes.error) console.error('Manager dashboard consultants:', consultantsRes.error.message)
  if (leavesRes.error)      console.error('Manager dashboard leaves:', leavesRes.error.message)
  if (timesheetsRes.error)  console.error('Manager dashboard timesheets:', timesheetsRes.error.message)
  if (activityRes.error)    console.error('Manager dashboard activity:', activityRes.error.message)

  const consultants = (consultantsRes.data ?? []) as Tables<'consultant_occupancy'>[]
  const activity    = activityRes.data    ?? []

  type ManagerLeaveRow = Pick<Tables<'leave_requests'>, 'id' | 'status' | 'type' | 'start_date' | 'end_date'> & {
    consultants: Pick<Tables<'consultants'>, 'name'> | null
  }
  const leaveReqs = ((leavesRes.data ?? []) as ManagerLeaveRow[]).map((l) => ({
    id:             l.id,
    status:         l.status,
    type:           l.type,
    startDate:      l.start_date,
    endDate:        l.end_date,
    consultantName: l.consultants?.name ?? '—',
  }))

  type ManagerTimesheetRow = Pick<Tables<'timesheets'>, 'id' | 'status' | 'consultant_id' | 'date'>
  const available  = consultants.filter((c) => c.status === 'available').length
  const assigned   = consultants.filter((c) => c.status === 'assigned').length
  const pendingCra = ((timesheetsRes.data ?? []) as ManagerTimesheetRow[]).filter((ts) => ts.status === 'submitted').length
  const avgOcc     = consultants.length
    ? Math.round(consultants.reduce((s, c) => s + (c.occupancy_rate ?? 0), 0) / consultants.length)
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

    const countryCode = (comp?.hr_settings as { country_code?: string } | null)?.country_code ?? 'FR'
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${now.getFullYear()}/${countryCode}`)
      if (res.ok) {
        const data = await res.json() as NagerHoliday[] | null
        holidays = (data ?? []).map((h) => ({
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

  type LeaveCalRow = Pick<Tables<'leave_requests'>, 'start_date' | 'end_date' | 'type'> & {
    consultants: Pick<Tables<'consultants'>, 'name'> | null
  }
  const leaveEvents: CalendarEvent[] = ((leaveCalData ?? []) as LeaveCalRow[]).flatMap((l) => {
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
      {/* Le client attend Consultant[] (camelCase) mais reçoit les lignes brutes de
          la vue (snake_case) : dette de type préexistante, masquée par `any`.
          Pont type-only via `unknown`, aucune valeur runtime modifiée. */}
      <ManagerDashboardClient
        consultants={consultants as unknown as React.ComponentProps<typeof ManagerDashboardClient>['consultants']}
        leaveReqs={leaveReqs}
        activity={activity}
        kpi={kpi}
        calendarEvents={calendarEvents}
      />
    </>
  )
}
// app/[locale]/(app)/dashboard/admin/page.tsx

import { getPageAuth }          from '@/lib/auth/page-auth'
import { getTranslations }      from 'next-intl/server'
import { Topbar }               from '@/components/layout/Topbar'
import { AdminDashboardClient } from '@/components/dashboard/AdminDashboardClient'
import type { CalendarEvent }   from '@/components/dashboard/MiniCalendar'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('dashboard')
  const { isSA, companyId: authCompanyId, companyName, supabase } = await getPageAuth(tenant)

  // ── Queries principales ────────────────────────────────────
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
    const calYear     = now.getFullYear()

    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${calYear}/${countryCode}`)
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

  // Congés approuvés du mois
  let leaveEventsQ = supabase
    .from('leave_requests')
    .select('start_date, end_date, type, consultants(name)')
    .eq('status', 'approved')
    .lte('start_date', monthEnd)
    .gte('end_date', monthStart)

  if (tenant) leaveEventsQ = leaveEventsQ.eq('company_id', tenant)

  const { data: leaveEventsData } = await leaveEventsQ

  const leaveEvents: CalendarEvent[] = (leaveEventsData ?? []).flatMap((l: any) => {
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

  // Deadlines projets du mois
  const deadlineEvents: CalendarEvent[] = projects
    .filter((p: any) => p.end_date && p.end_date >= monthStart && p.end_date <= monthEnd)
    .map((p: any) => ({
      date:  p.end_date,
      type:  'deadline' as const,
      label: p.name,
    }))

  const calendarEvents = [...holidays, ...leaveEvents, ...deadlineEvents]

  // ── Render ─────────────────────────────────────────────────

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <AdminDashboardClient
        consultants={consultants}
        activeProjects={projects.filter((p: any) => p.status === 'active').slice(0, 3)}
        activity={activity}
        kpi={kpi}
        projectProgress={projectProgress}
        calendarEvents={calendarEvents}
      />
    </>
  )
}
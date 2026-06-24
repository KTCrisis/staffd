// app/[locale]/(app)/dashboard/consultant/page.tsx

import { getPageAuth }                  from '@/lib/auth/page-auth'
import { getTranslations }              from 'next-intl/server'
import { Topbar }                       from '@/components/layout/Topbar'
import { Panel }                        from '@/components/ui/Panel'
import { ConsultantDashboardClient }    from '@/components/dashboard/ConsultantDashboardClient'
import { getMondayOf, toISO }           from '@/lib/utils'
import type { Tables }                   from '@/types/supabase'

export default async function DashboardConsultantPage() {
  const t = await getTranslations('dashboardConsultant')
  const { role, isSA, userId, companyName, supabase } = await getPageAuth()

  const isFreelance = role === 'freelance'

  const { data: meData } = await supabase
    .from('consultant_occupancy')
    .select('*')
    .eq('user_id', userId ?? '')
    .single()

  if (!meData) {
    return (
      <>
        <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
        <div className="app-content">
          <Panel>
            <div className="cons-unlinked">
              <div className="cons-unlinked-icon">◈</div>
              <div className="cons-unlinked-title">{t('unlinked.title')}</div>
              <div className="cons-unlinked-msg">{t('unlinked.msg')}</div>
            </div>
          </Panel>
        </div>
      </>
    )
  }

  const me = meData

  const monday    = getMondayOf(new Date())
  const sunday    = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const mondayISO = toISO(monday)
  const sundayISO = toISO(sunday)

  const [projectsRes, leavesRes, timesheetsRes, invoicesRes] = await Promise.all([
    supabase
      .from('assignments')
      .select('project_id, projects(id, name, status)')
      .eq('consultant_id', me.id)
      .or('end_date.is.null,end_date.gte.' + toISO(new Date())),

    supabase
      .from('leave_requests')
      .select('id, type, status, start_date, end_date')
      .eq('consultant_id', me.id)
      .order('start_date', { ascending: false })
      .limit(10),

    supabase
      .from('timesheets')
      .select('id, date, value, status, project_id')
      .eq('consultant_id', me.id)
      .gte('date', mondayISO)
      .lte('date', sundayISO),

    // Factures freelance — compteur par statut
    isFreelance
      ? supabase
          .from('invoices')
          .select('id, status')
          .eq('consultant_id', me.id)
      : Promise.resolve({ data: null }),
  ])

  type ProjectBrief = Pick<Tables<'projects'>, 'id' | 'name' | 'status'>
  type AssignmentWithProject = { project_id: string | null; projects: ProjectBrief | null }
  const myProjects = ((projectsRes.data ?? []) as AssignmentWithProject[])
    .map((a) => a.projects)
    .filter((p): p is ProjectBrief => Boolean(p))
    .filter((p) => p.status === 'active')

  type MyLeaveRow = Pick<Tables<'leave_requests'>, 'id' | 'type' | 'status' | 'start_date' | 'end_date'>
  const myLeaves = ((leavesRes.data ?? []) as MyLeaveRow[]).map((l) => ({
    id:        l.id,
    type:      l.type,
    status:    l.status,
    startDate: l.start_date,
    endDate:   l.end_date,
  }))

  type MyTimesheetRow = Pick<Tables<'timesheets'>, 'id' | 'date' | 'value' | 'status' | 'project_id'>
  const myTimesheets = ((timesheetsRes.data ?? []) as MyTimesheetRow[]).map((ts) => ({
    id:        ts.id,
    date:      ts.date,
    value:     ts.value,
    status:    ts.status,
    projectId: ts.project_id,
  }))

  const weekTotal = myTimesheets.reduce((s, ts) => s + (ts.value ?? 0), 0)
  const hasDraft  = myTimesheets.some((ts) => ts.status === 'draft' && (ts.value ?? 0) > 0)

  // Compteurs factures freelance
  type InvoiceStatusRow = Pick<Tables<'invoices'>, 'id' | 'status'>
  const invoicesList = (invoicesRes.data ?? []) as InvoiceStatusRow[]
  const invoiceStats = isFreelance ? {
    total:   invoicesList.length,
    draft:   invoicesList.filter((i) => i.status === 'draft').length,
    sent:    invoicesList.filter((i) => i.status === 'sent').length,
    paid:    invoicesList.filter((i) => i.status === 'paid').length,
    overdue: invoicesList.filter((i) => i.status === 'overdue').length,
  } : null

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <ConsultantDashboardClient
        me={me}
        isFreelance={isFreelance}
        myProjects={myProjects}
        myLeaves={myLeaves}
        myTimesheets={myTimesheets as React.ComponentProps<typeof ConsultantDashboardClient>['myTimesheets']}
        weekTotal={weekTotal}
        hasDraft={hasDraft}
        monday={mondayISO}
        invoiceStats={invoiceStats}
      />
    </>
  )
}
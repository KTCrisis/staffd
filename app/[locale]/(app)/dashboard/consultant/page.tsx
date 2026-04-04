// app/[locale]/(app)/dashboard/consultant/page.tsx

import { getPageAuth }                  from '@/lib/auth/page-auth'
import { getTranslations }              from 'next-intl/server'
import { Topbar }                       from '@/components/layout/Topbar'
import { Panel }                        from '@/components/ui/Panel'
import { ConsultantDashboardClient }    from '@/components/dashboard/ConsultantDashboardClient'
import { getMondayOf, toISO }           from '@/lib/utils'

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

  const myProjects = (projectsRes.data ?? [])
    .map((a: any) => a.projects)
    .filter(Boolean)
    .filter((p: any) => p.status === 'active')

  const myLeaves = (leavesRes.data ?? []).map((l: any) => ({
    id:        l.id,
    type:      l.type,
    status:    l.status,
    startDate: l.start_date,
    endDate:   l.end_date,
  }))

  const myTimesheets = (timesheetsRes.data ?? []).map((ts: any) => ({
    id:        ts.id,
    date:      ts.date,
    value:     ts.value,
    status:    ts.status,
    projectId: ts.project_id,
  }))

  const weekTotal = myTimesheets.reduce((s: number, ts: { value?: number }) => s + (ts.value ?? 0), 0)
  const hasDraft  = myTimesheets.some((ts: { status?: string; value?: number }) => ts.status === 'draft' && (ts.value ?? 0) > 0)

  // Compteurs factures freelance
  const invoicesList = invoicesRes.data ?? []
  const invoiceStats = isFreelance ? {
    total:   invoicesList.length,
    draft:   invoicesList.filter((i: any) => i.status === 'draft').length,
    sent:    invoicesList.filter((i: any) => i.status === 'sent').length,
    paid:    invoicesList.filter((i: any) => i.status === 'paid').length,
    overdue: invoicesList.filter((i: any) => i.status === 'overdue').length,
  } : null

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <ConsultantDashboardClient
        me={me}
        isFreelance={isFreelance}
        myProjects={myProjects}
        myLeaves={myLeaves}
        myTimesheets={myTimesheets}
        weekTotal={weekTotal}
        hasDraft={hasDraft}
        monday={mondayISO}
        invoiceStats={invoiceStats}
      />
    </>
  )
}
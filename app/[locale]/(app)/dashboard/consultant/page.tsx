// app/[locale]/(app)/dashboard/consultant/page.tsx
// ── Server Component ─────────────────────────────────────────
// Avant : 4 hooks + useMemo pour filtrer "me" depuis toute la liste → waterfall
// Après : getUser() server-side → requêtes ciblées sur ce consultant uniquement

import { cookies }                 from 'next/headers'
import { createServerClient }      from '@supabase/ssr'
import { getTranslations }         from 'next-intl/server'
import { Topbar }                  from '@/components/layout/Topbar'
import { Panel }                   from '@/components/ui/Panel'
import { EmptyState }              from '@/components/ui/EmptyState'
import { ConsultantDashboardClient } from '@/components/dashboard/ConsultantDashboardClient'
import { getMondayOf, toISO }      from '@/lib/utils'

export default async function DashboardConsultantPage() {
  const t           = await getTranslations('dashboardConsultant')
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // ── Identité ─────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.user_role as string | undefined
  const isSA = role === 'super_admin'
  const isFreelance = role === 'freelance'

  // ── Trouver le profil consultant lié à ce user ───────────
  const { data: meData } = await supabase
    .from('consultant_occupancy')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  // Compte non lié — afficher message sans fetch supplémentaire
  if (!meData) {
    return (
      <>
        <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
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

  // ── Promise.all : 3 requêtes ciblées en parallèle ────────
  // Plus de fetch de toute la liste + filtre client-side
  // Chaque requête est scopée à ce consultant uniquement (+ RLS)
  const monday    = getMondayOf(new Date())
  const sunday    = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const mondayISO = toISO(monday)
  const sundayISO = toISO(sunday)

  const [projectsRes, leavesRes, timesheetsRes] = await Promise.all([
    // Projets actifs via assignments
    supabase
      .from('assignments')
      .select('project_id, projects(id, name, status)')
      .eq('consultant_id', me.id)
      .or('end_date.is.null,end_date.gte.' + toISO(new Date())),

    // Congés de ce consultant
    supabase
      .from('leave_requests')
      .select('id, type, status, start_date, end_date')
      .eq('consultant_id', me.id)
      .order('start_date', { ascending: false })
      .limit(10),

    // Timesheets de la semaine courante
    supabase
      .from('timesheets')
      .select('id, date, value, status, project_id')
      .eq('consultant_id', me.id)
      .gte('date', mondayISO)
      .lte('date', sundayISO),
  ])

  // ── Normalisation ────────────────────────────────────────
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

  // ── Stats semaine calculées côté serveur ─────────────────
  const weekTotal = myTimesheets.reduce((s, ts) => s + (ts.value ?? 0), 0)
  const hasDraft  = myTimesheets.some(ts => ts.status === 'draft' && (ts.value ?? 0) > 0)

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} />
      <ConsultantDashboardClient
        me={me}
        isFreelance={isFreelance}
        myProjects={myProjects}
        myLeaves={myLeaves}
        myTimesheets={myTimesheets}
        weekTotal={weekTotal}
        hasDraft={hasDraft}
        monday={mondayISO}
      />
    </>
  )
}
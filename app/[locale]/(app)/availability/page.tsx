// app/[locale]/(app)/availability/page.tsx
// ── Server Component ─────────────────────────────────────────
// Avant : 3 hooks séquentiels (waterfall)
// Après : Promise.all → données prêtes avant le premier paint

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { AvailabilityClient } from '@/components/availability/AvailabilityClient'

export default async function AvailabilityPage() {
  const t           = await getTranslations('staffing')
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const role       = user?.app_metadata?.user_role as string | undefined
  const userId     = user?.id ?? null
  const teamAccess = role === 'super_admin' || role === 'admin' || role === 'manager'

  // ── Promise.all : 3 requêtes en parallèle ───────────────────
  const [consultantsRes, leavesRes, assignmentsRes] = await Promise.all([
    supabase
      .from('consultant_occupancy')
      .select('*')
      .order('name'),

    supabase
      .from('leave_requests')
      .select('id, consultant_id, type, status, start_date, end_date')
      .neq('status', 'refused'),

    supabase
      .from('assignments')
      .select('*, projects(name)'),
  ])

  const consultants   = consultantsRes.data   ?? []
  const leaveRequests = (leavesRes.data ?? []).map((l: any) => ({
    id:           l.id,
    consultantId: l.consultant_id,
    type:         l.type,
    status:       l.status,
    startDate:    l.start_date,
    endDate:      l.end_date,
  }))
  const assignments = assignmentsRes.data ?? []

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
      <AvailabilityClient
        consultants={consultants}
        leaveRequests={leaveRequests}
        assignments={assignments}
        teamAccess={teamAccess}
        userId={userId}
      />
    </>
  )
}
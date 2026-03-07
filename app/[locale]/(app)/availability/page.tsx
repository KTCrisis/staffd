// app/[locale]/(app)/availability/page.tsx

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { AvailabilityClient } from '@/components/availability/AvailabilityClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function AvailabilityPage({ searchParams }: Props) {
  const { tenant }  = await searchParams
  const t           = await getTranslations('staffing')
  const cookieStore = await cookies()

  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const role       = user?.app_metadata?.user_role as string | undefined
  const userId     = user?.id ?? null
  const teamAccess = role === 'super_admin' || role === 'admin' || role === 'manager'
  const isSA       = user?.app_metadata?.is_super_admin === true

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    isSA
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  let consultantsQ  = supabase.from('consultant_occupancy').select('*').order('name')
  let leavesQ       = supabase.from('leave_requests').select('id, consultant_id, type, status, start_date, end_date').neq('status', 'refused')
  let assignmentsQ  = supabase.from('assignments').select('*, projects(name)')

  if (tenant) {
    consultantsQ = consultantsQ.eq('company_id', tenant)
    leavesQ      = leavesQ.eq('company_id', tenant)
    assignmentsQ = assignmentsQ.eq('company_id', tenant)
  }

  const [consultantsRes, leavesRes, assignmentsRes] = await Promise.all([
    consultantsQ,
    leavesQ,
    assignmentsQ,
  ])

  const consultants   = consultantsRes.data ?? []
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
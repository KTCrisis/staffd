// app/[locale]/(app)/leaves/page.tsx

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { LeavesClient }       from '@/components/leaves/LeavesClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function LeavesPage({ searchParams }: Props) {
  const { tenant }  = await searchParams
  const t           = await getTranslations('conges')
  const cookieStore = await cookies()

  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const role = user?.app_metadata?.user_role as string | undefined
  const isSA = role === 'super_admin'
  const userId    = user?.id
  const companyId = user?.app_metadata?.company_id as string | undefined


  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    isSA
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // ── Filtre manager via RPC ───────────────────────────────────
  let teamIds: string[] | null = null
  if (role === 'manager') {
    const { data, error } = await supabase.rpc('my_team_consultant_ids')
    teamIds = error ? [] : ((data as string[]) ?? [])
  }

  const noMatch = '00000000-0000-0000-0000-000000000000'

  let requestsQ = supabase
    .from('leave_requests')
    .select('*, consultants(name, avatar_color, initials)')
    .order('start_date', { ascending: false })
    .limit(50)

  let consultantsQ = supabase
    .from('consultant_occupancy')
    .select('id, name, initials, avatar_color, leave_days_left, rtt_left, user_id')
    .order('name')

  if (tenant) {
    requestsQ    = requestsQ.eq('company_id', tenant)
    consultantsQ = consultantsQ.eq('company_id', tenant)
  }

  if (teamIds !== null) {
    if (teamIds.length === 0) {
      requestsQ    = requestsQ.eq('consultant_id', noMatch)    as typeof requestsQ
      consultantsQ = consultantsQ.eq('id',         noMatch)    as typeof consultantsQ
    } else {
      requestsQ    = requestsQ.in('consultant_id', teamIds)    as typeof requestsQ
      consultantsQ = consultantsQ.in('id',         teamIds)    as typeof consultantsQ
    }
  }

  const [requestsRes, consultantsRes] = await Promise.all([requestsQ, consultantsQ])

  const requests = (requestsRes.data ?? []).map((r: any) => ({
    id:             r.id,
    consultantId:   r.consultant_id,
    consultantName: r.consultants?.name        ?? null,
    avatarColor:    r.consultants?.avatar_color ?? 'green',
    initials:       r.consultants?.initials     ?? '??',
    type:           r.type,
    status:         r.status,
    startDate:      r.start_date,
    endDate:        r.end_date,
    days:           r.days  ?? null,
    note:           r.note  ?? null,
  }))

  const consultants = consultantsRes.data ?? []

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} />
      <LeavesClient
        requests={requests}
        consultants={consultants}
        userRole={role}
        userId={userId}
        companyId={companyId}
      />
    </>
  )
}
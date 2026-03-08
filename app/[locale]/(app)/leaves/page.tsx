// app/[locale]/(app)/leaves/page.tsx

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { Topbar }          from '@/components/layout/Topbar'
import { LeavesClient }    from '@/components/leaves/LeavesClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function LeavesPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('conges')
  const { role, isSA, userId, companyId, companyName, supabase } = await getPageAuth(tenant)

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
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
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
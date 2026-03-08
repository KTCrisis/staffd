// app/[locale]/(app)/availability/page.tsx

import { getPageAuth }        from '@/lib/auth/page-auth'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { AvailabilityClient } from '@/components/availability/AvailabilityClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function AvailabilityPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('staffing')
  const { role, isSA, userId, companyId: authCompanyId, companyName, supabase } = await getPageAuth(tenant)

  const companyId  = (tenant ?? authCompanyId ?? '') as string
  const teamAccess = role === 'super_admin' || role === 'admin' || role === 'manager'

  // ── Filtre manager via RPC ───────────────────────────────────
  let managerConsultantIds: string[] | null = null
  if (role === 'manager') {
    const { data, error } = await supabase.rpc('my_team_consultant_ids')
    managerConsultantIds = error ? [] : ((data as string[]) ?? [])
  }

  // ── Queries de base ──────────────────────────────────────────
  let consultantsQ = supabase.from('consultant_occupancy').select('*').order('name')
  let leavesQ      = supabase.from('leave_requests').select('id, consultant_id, type, status, start_date, end_date').neq('status', 'refused')
  let assignmentsQ = supabase.from('assignments').select('*, projects(name)')

  if (tenant) {
    consultantsQ = consultantsQ.eq('company_id', tenant)
    leavesQ      = leavesQ.eq('company_id', tenant)
    assignmentsQ = assignmentsQ.eq('company_id', tenant)
  }

  if (managerConsultantIds && managerConsultantIds.length > 0) {
    consultantsQ = consultantsQ.in('id', managerConsultantIds)
    leavesQ      = leavesQ.in('consultant_id', managerConsultantIds)
    assignmentsQ = assignmentsQ.in('consultant_id', managerConsultantIds)
  } else if (managerConsultantIds?.length === 0) {
    consultantsQ = consultantsQ.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const [consultantsRes, leavesRes, assignmentsRes] = await Promise.all([
    consultantsQ, leavesQ, assignmentsQ,
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
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <AvailabilityClient
        consultants={consultants}
        leaveRequests={leaveRequests}
        assignments={assignments}
        teamAccess={teamAccess}
        userId={userId ?? null}
        companyId={companyId}
      />
    </>
  )
}
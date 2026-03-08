// app/[locale]/(app)/consultants/[id]/page.tsx

import { getPageAuth }            from '@/lib/auth/page-auth'
import { getTranslations }        from 'next-intl/server'
import { notFound }                from 'next/navigation'
import { Topbar }                  from '@/components/layout/Topbar'
import { ConsultantDetailClient }  from '@/components/consultants/ConsultantDetailClient'

interface Props {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ tenant?: string }>
}

export default async function ConsultantDetailPage({ params, searchParams }: Props) {
  const [{ id }, { tenant }] = await Promise.all([params, searchParams])
  const t = await getTranslations('consultants')
  const { role, isSA, companyId: authCompanyId, companyName, supabase } = await getPageAuth(tenant)

  const companyId = (tenant ?? authCompanyId ?? '') as string

  const [consultantRes, assignmentsRes, profitabilityRes] = await Promise.all([
    supabase
      .from('consultant_occupancy')
      .select('*')
      .eq('id', id)
      .single(),

    supabase
      .from('assignments')
      .select(`
        id, allocation, start_date, end_date,
        projects ( id, name, status, client_name )
      `)
      .eq('consultant_id', id)
      .order('start_date', { ascending: false }),

    (role === 'admin' || isSA)
      ? supabase
          .from('consultant_profitability')
          .select('*')
          .eq('consultant_id', id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  if (!consultantRes.data) notFound()

  const c = consultantRes.data as any

  const consultant = {
    id:              c.id,
    name:            c.name,
    initials:        c.initials,
    role:            c.role,
    email:           c.email ?? null,
    avatarColor:     c.avatar_color ?? 'green',
    status:          c.status,
    contractType:    c.contract_type ?? 'employee',
    occupancyRate:   c.occupancy_rate ?? 0,
    leaveDaysLeft:   c.leave_days_left ?? 0,
    leaveDaysTotal:  c.leave_days_total ?? 0,
    rttLeft:         c.rtt_left ?? 0,
    rttTotal:        c.rtt_total ?? 0,
    stack:           c.stack ?? [],
    currentProject:  c.project_names?.[0] ?? null,
    availableFrom:   c.available_from ?? null,
    tjmCoutReel:     c.tjm_cout_reel ?? null,
    tjmCible:        c.tjm_cible ?? null,
    user_id:         c.user_id ?? null,
    countryCode:     c.country_code ?? null,
  }

  const assignments = (assignmentsRes.data ?? []).map((a: any) => ({
    id:         a.id,
    allocation: a.allocation,
    startDate:  a.start_date,
    endDate:    a.end_date,
    project: a.projects ? {
      id:         a.projects.id,
      name:       a.projects.name,
      status:     a.projects.status,
      clientName: a.projects.client_name ?? null,
    } : null,
  }))

  const profitability = (profitabilityRes as any).data ?? null

  return (
    <>
      <Topbar
        title={consultant.name}
        breadcrumb={`// ${t('breadcrumb')} / ${consultant.name}`}
        isSuperAdmin={isSA}
        companyName={companyName}
      />
      <ConsultantDetailClient
        consultant={consultant}
        assignments={assignments}
        profitability={profitability}
        userRole={role}
        companyId={companyId}
      />
    </>
  )
}
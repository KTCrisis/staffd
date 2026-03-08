// app/[locale]/(app)/timesheets/page.tsx

import { getPageAuth }      from '@/lib/auth/page-auth'
import { getTranslations }  from 'next-intl/server'
import { Topbar }           from '@/components/layout/Topbar'
import { TimesheetsClient } from '@/components/timesheets/TimesheetsClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function TimesheetsPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('timesheets')
  const { role, isSA, userId, companyId, companyName, supabase } = await getPageAuth(tenant)

  // ── Filtre manager : récupère l'id de son équipe ─────────────
  let managerTeamId: string | null = null
  if (role === 'manager' && userId) {
    const { data: consultantData } = await supabase
      .from('consultants')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (consultantData?.id) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('manager_id', consultantData.id)
        .maybeSingle()
      managerTeamId = teamData?.id ?? null
    }
  }

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <TimesheetsClient
        userRole={role}
        userId={userId}
        companyId={companyId}
        tenant={tenant}
        managerTeamId={managerTeamId}
      />
    </>
  )
}
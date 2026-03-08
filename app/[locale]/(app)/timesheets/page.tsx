// app/[locale]/(app)/timesheets/page.tsx

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { TimesheetsClient }   from '@/components/timesheets/TimesheetsClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function TimesheetsPage({ searchParams }: Props) {
  const { tenant }  = await searchParams
  const t           = await getTranslations('timesheets')
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const userRole  = user?.app_metadata?.user_role as string | undefined
  const userId    = user?.id
  const companyId = user?.app_metadata?.company_id as string | undefined

  // ── Filtre manager : uniquement les membres de son équipe ───
  let teamMemberIds: string[] | null = null
  if (userRole === 'manager' && userId) {
    const { data: teamData } = await supabase
      .from('teams')
      .select('id, team_members!inner(consultant_id)')
      .eq('manager_id', userId)
      .maybeSingle()

    teamMemberIds = teamData
      ? (teamData.team_members as { consultant_id: string }[]).map(m => m.consultant_id)
      : [] // manager sans équipe → liste vide
  }

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
      <TimesheetsClient
        userRole={userRole}
        userId={userId}
        companyId={companyId}
        tenant={tenant}
        teamMemberIds={teamMemberIds}
      />
    </>
  )
}
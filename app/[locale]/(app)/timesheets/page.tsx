// app/[locale]/(app)/timesheets/page.tsx
// Données dépendent du state semaine (navigation) → hooks restent client.
// On extrait uniquement user depuis le serveur.

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

  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const userRole  = user?.app_metadata?.user_role as string | undefined
  const userId    = user?.id
  const companyId = user?.app_metadata?.company_id as string | undefined

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
      <TimesheetsClient
        userRole={userRole}
        userId={userId}
        companyId={companyId}
        tenant={tenant}
      />
    </>
  )
}
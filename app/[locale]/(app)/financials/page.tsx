// app/[locale]/(app)/financials/page.tsx

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { redirect }           from 'next/navigation'
import { Topbar }             from '@/components/layout/Topbar'
import { FinancialsClient }   from '@/components/financials/FinancialsClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function FinancialsPage({ searchParams }: Props) {
  const { tenant }  = await searchParams
  const t           = await getTranslations('financials')
  const cookieStore = await cookies()

  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const role = user?.app_metadata?.user_role as string | undefined
  const isSA = user?.app_metadata?.is_super_admin === true

  // Guard serveur — plus besoin du useEffect client
  if (role !== 'admin' && !isSA) redirect('/dashboard')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    isSA
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  let query = supabase.from('project_financials').select('*')
  if (tenant) query = query.eq('company_id', tenant)

  const { data: projects } = await query

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} />
      <FinancialsClient projects={projects ?? []} />
    </>
  )
}
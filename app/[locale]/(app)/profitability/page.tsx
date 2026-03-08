// app/[locale]/(app)/profitability/page.tsx

import { cookies }               from 'next/headers'
import { createServerClient }    from '@supabase/ssr'
import { getTranslations }       from 'next-intl/server'
import { redirect }              from 'next/navigation'
import { Topbar }                from '@/components/layout/Topbar'
import { ProfitabilityClient }   from '@/components/profitability/ProfitabilityClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function ProfitabilityPage({ searchParams }: Props) {
  const { tenant }  = await searchParams
  const t           = await getTranslations('profitability')
  const cookieStore = await cookies()

  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const role = user?.app_metadata?.user_role as string | undefined
  const isSA = user?.app_metadata?.is_super_admin === true

  // Guard serveur
  if (role !== 'admin' && role !== 'manager' && !isSA) redirect('/dashboard')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    isSA
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  let query = supabase.from('consultant_profitability').select('*')
  if (tenant) query = query.eq('company_id', tenant)

  const { data: consultants, error } = await query

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} />
      <ProfitabilityClient
        consultants={consultants ?? []}
        error={error?.message ?? null}
      />
    </>
  )
}
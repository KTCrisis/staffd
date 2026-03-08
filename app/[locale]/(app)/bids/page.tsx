// app/[locale]/(app)/bids/page.tsx
// ── Server Component ─────────────────────────────────────────

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { BidsClient }         from '@/components/bids/BidsClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function BidsPage({ searchParams }: Props) {
  const { tenant }  = await searchParams
  const t           = await getTranslations('bids')
  const cookieStore = await cookies()

  
  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const role = user?.app_metadata?.user_role as string | undefined
  const isSA = role === 'super_admin'
  const userId    = user?.id ?? null
  const companyId = (tenant ?? user?.app_metadata?.company_id ?? '') as string

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} />
      <BidsClient userRole={role} />
    </>
  )
}
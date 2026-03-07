// app/[locale]/(app)/bids/page.tsx
// ── Server Component ─────────────────────────────────────────

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { BidsClient }         from '@/components/bids/BidsClient'

export default async function BidsPage() {
  const t           = await getTranslations('bids')
  const cookieStore = await cookies()

  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const role = user?.app_metadata?.user_role as string | undefined

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
      <BidsClient userRole={role} />
    </>
  )
}
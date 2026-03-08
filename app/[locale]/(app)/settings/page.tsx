// app/[locale]/(app)/settings/page.tsx

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { redirect }           from 'next/navigation'
import { Topbar }             from '@/components/layout/Topbar'
import { SettingsClient }     from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const t           = await getTranslations('settings')
  const cookieStore = await cookies()

  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const role = user?.app_metadata?.user_role as string | undefined
  const isSA = role === 'super_admin'
  const companyId = user?.app_metadata?.company_id as string | undefined


  if (role !== 'admin' && !isSA) redirect('/dashboard')

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} />
      <SettingsClient
        userRole={role}
        companyId={companyId ?? ''}
        isSuperAdmin={isSA}
      />
    </>
  )
}
// app/[locale]/(app)/settings/page.tsx

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { redirect }        from 'next/navigation'
import { Topbar }          from '@/components/layout/Topbar'
import { SettingsClient }  from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const t = await getTranslations('settings')
  const { role, isSA, companyId, companyName } = await getPageAuth()

  if (role !== 'admin' && !isSA) redirect('/dashboard')

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <SettingsClient
        userRole={role}
        companyId={companyId ?? ''}
        isSuperAdmin={isSA}
      />
    </>
  )
}
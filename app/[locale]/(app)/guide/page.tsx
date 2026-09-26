// app/[locale]/(app)/guide/page.tsx
// User guide, open to every signed-in role.

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { Topbar }          from '@/components/layout/Topbar'
import { GuideView }       from '@/components/guide/GuideView'
import '@/styles/guide.css'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin', admin: 'Admin', manager: 'Manager',
  consultant: 'Consultant', freelance: 'Freelance', viewer: 'Lecture',
}

export default async function GuidePage() {
  const t = await getTranslations('guide')
  const { role, isSA, companyName } = await getPageAuth()

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <GuideView
        companyName={companyName ?? null}
        roleLabel={ROLE_LABELS[role ?? ''] ?? '—'}
        commit={process.env.NEXT_PUBLIC_APP_COMMIT ?? 'dev'}
      />
    </>
  )
}

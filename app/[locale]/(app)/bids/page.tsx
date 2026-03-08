// app/[locale]/(app)/bids/page.tsx

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { redirect }        from 'next/navigation'
import { Topbar }          from '@/components/layout/Topbar'
import { BidsClient }      from '@/components/bids/BidsClient'
import { canEdit }         from '@/lib/auth/roles'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function BidsPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('bids')
  const { role, isSA, companyName } = await getPageAuth(tenant)

  if (!canEdit(role)) redirect('/dashboard')

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <BidsClient userRole={role} />
    </>
  )
}
// app/[locale]/(app)/bids/page.tsx

import { getPageAuth }    from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { Topbar }          from '@/components/layout/Topbar'
import { BidsClient }      from '@/components/bids/BidsClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function BidsPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('bids')
  const { role, isSA, companyName } = await getPageAuth(tenant)

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <BidsClient userRole={role} />
    </>
  )
}
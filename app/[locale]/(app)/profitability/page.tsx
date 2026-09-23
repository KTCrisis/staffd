// app/[locale]/(app)/profitability/page.tsx

import { getPageAuth }         from '@/lib/auth/page-auth'
import { getTranslations }    from 'next-intl/server'
import { redirect }           from 'next/navigation'
import { Topbar }             from '@/components/layout/Topbar'
import { ProfitabilityClient } from '@/components/profitability/ProfitabilityClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function ProfitabilityPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('profitability')
  const { role, isSA, companyName, supabase } = await getPageAuth(tenant)

  if (role !== 'admin' && role !== 'manager' && !isSA) redirect('/dashboard')

  // Les non-facturables (dirigeant, commercial, support) n'ont pas de rentabilité propre (0009)
  let query = supabase.from('consultant_profitability').select('*').eq('fonction', 'consultant')
  if (tenant) query = query.eq('company_id', tenant)

  const { data: consultants, error } = await query

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <ProfitabilityClient
        consultants={consultants ?? []}
        error={error?.message ?? null}
      />
    </>
  )
}
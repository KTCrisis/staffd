// app/[locale]/(app)/financials/page.tsx

import { getPageAuth }      from '@/lib/auth/page-auth'
import { getTranslations }  from 'next-intl/server'
import { redirect }         from 'next/navigation'
import { Topbar }           from '@/components/layout/Topbar'
import { FinancialsClient } from '@/components/financials/FinancialsClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function FinancialsPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('financials')
  const { role, isSA, companyName, supabase } = await getPageAuth(tenant)

  if (role !== 'admin' && !isSA) redirect('/dashboard')

  let query = supabase.from('project_financials').select('*')
  if (tenant) query = query.eq('company_id', tenant)

  const { data: projects, error } = await query
  if (error) console.error('Financials query error:', error.message)

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <FinancialsClient projects={projects ?? []} />
    </>
  )
}
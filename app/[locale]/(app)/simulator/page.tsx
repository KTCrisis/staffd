// app/[locale]/(app)/simulator/page.tsx

import { getPageAuth }       from '@/lib/auth/page-auth'
import { getTranslations }   from 'next-intl/server'
import { redirect }          from 'next/navigation'
import { Topbar }            from '@/components/layout/Topbar'
import { SimulatorClient }   from '@/components/simulator/SimulatorClient'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function SimulatorPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('simulator')
  const { role, isSA, companyId, companyName, supabase } = await getPageAuth(tenant)

  if (role !== 'admin' && !isSA) redirect('/dashboard')

  // Défaut "jours travaillés / an" depuis les paramètres RH de la société
  let q = supabase.from('companies').select('hr_settings')
  if (tenant) q = q.eq('id', tenant)
  const { data } = await q.maybeSingle()
  const hr = (data?.hr_settings ?? {}) as { working_days_per_year?: number }
  const workingDays = hr.working_days_per_year ?? 218

  // Grille par grade (0005) : alimente le choix de grade et le banc profil/grille
  let gq = supabase
    .from('grades')
    .select('id, label, tjm_cible, occupation_cible, cout_annuel_charge')
    .order('position')
  const gradesCompany = tenant ?? companyId
  if (gradesCompany) gq = gq.eq('company_id', gradesCompany)
  const { data: grades } = await gq

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <SimulatorClient defaultWorkingDays={workingDays} grades={grades ?? []} />
    </>
  )
}

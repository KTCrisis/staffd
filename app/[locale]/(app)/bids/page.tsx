// app/[locale]/(app)/bids/page.tsx
// Pipeline commercial : affaires (opportunities) du tenant, par étape.

import { getPageAuth }     from '@/lib/auth/page-auth'
import { getTranslations } from 'next-intl/server'
import { redirect }        from 'next/navigation'
import { Topbar }          from '@/components/layout/Topbar'
import { PipelineClient }  from '@/components/bids/PipelineClient'
import { canEdit }         from '@/lib/auth/roles'
import { parseStages }     from '@/lib/crm'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function BidsPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('crm')
  const { role, isSA, userId, companyId, companyName, supabase } = await getPageAuth(tenant)

  if (!canEdit(role)) redirect('/dashboard')

  // Writes need a tenant: the caller's own, or the one a super_admin is viewing.
  const writeCompanyId = isSA ? (tenant ?? null) : (companyId ?? null)

  const scope = <T extends { eq: (c: string, v: string) => T }>(q: T) => (tenant ? q.eq('company_id', tenant) : q)

  const [opps, clients, owners, company, interactions, contacts, me] = await Promise.all([
    scope(supabase.from('opportunities').select('*')).order('expected_close_date', { ascending: true, nullsFirst: false }),
    scope(supabase.from('clients').select('id, name, client_type')).order('name'),
    scope(supabase.from('consultants').select('id, name')).order('name'),
    writeCompanyId
      ? supabase.from('companies').select('crm_settings').eq('id', writeCompanyId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    scope(supabase.from('interactions').select('*')).order('occurred_at', { ascending: false }),
    scope(supabase.from('contacts').select('id, name, client_id')).order('name'),
    userId
      ? supabase.from('consultants').select('id').eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const error = opps.error?.message ?? clients.error?.message ?? owners.error?.message
    ?? interactions.error?.message ?? contacts.error?.message ?? null

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <PipelineClient
        opportunities={opps.data ?? []}
        clients={clients.data ?? []}
        owners={owners.data ?? []}
        stages={parseStages(company.data?.crm_settings)}
        interactions={interactions.data ?? []}
        contacts={contacts.data ?? []}
        myConsultantId={me.data?.id ?? null}
        companyId={writeCompanyId}
        error={error}
      />
    </>
  )
}

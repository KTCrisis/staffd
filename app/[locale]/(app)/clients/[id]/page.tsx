// app/[locale]/(app)/clients/[id]/page.tsx

import { getPageAuth }        from '@/lib/auth/page-auth'
import { getTranslations }    from 'next-intl/server'
import { notFound }           from 'next/navigation'
import { Topbar }             from '@/components/layout/Topbar'
import { ClientDetailClient } from '@/components/clients/ClientDetailClient'
import { canEdit }            from '@/lib/auth/roles'

interface Props {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ tenant?: string }>
}

export default async function ClientDetailPage({ params, searchParams }: Props) {
  const [{ id }, { tenant }] = await Promise.all([params, searchParams])
  // id ends up in a PostgREST or() filter below: accept only a UUID.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound()
  const t = await getTranslations('clients')
  const { role, isSA, userId, companyName, supabase } = await getPageAuth(tenant)
  // Contacts are readable tenant-wide; interactions and deals are admin/manager (RLS).
  const crmAccess = canEdit(role)

  const none = Promise.resolve({ data: null, error: null })
  const [clientRes, projectsRes, contactsRes, interactionsRes, oppsRes, meRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('projects')
      .select('id, name, status, end_date, budget_total')
      .eq('client_id', id)
      .order('end_date', { ascending: false }),
    supabase.from('contacts').select('*').eq('client_id', id)
      .order('is_primary', { ascending: false }).order('name'),
    crmAccess ? supabase.from('interactions').select('*').eq('client_id', id) : none,
    crmAccess ? supabase.from('opportunities').select('id, name, status')
      .or(`client_id.eq.${id},end_client_id.eq.${id}`).order('name') : none,
    userId ? supabase.from('consultants').select('id').eq('user_id', userId).maybeSingle() : none,
  ])

  if (!clientRes.data) notFound()

  const raw = clientRes.data
  const client = {
    id:           raw.id,
    companyId:    raw.company_id,
    name:         raw.name,
    sector:       raw.sector        ?? null,
    clientType:   raw.client_type,
    website:      raw.website       ?? null,
    contactName:  raw.contact_name  ?? null,
    contactEmail: raw.contact_email ?? null,
    contactPhone: raw.contact_phone ?? null,
    notes:        raw.notes         ?? null,
    billingAddress: raw.billing_address ?? null,
    siren:        raw.siren         ?? null,
    tvaNumber:    raw.tva_number    ?? null,
  }

  type ProjectRow = {
    id:           string
    name:         string
    status:       string
    end_date:     string | null
    budget_total: number | null
  }

  const projects = ((projectsRes.data ?? []) as ProjectRow[]).map((p) => ({
    id:          p.id,
    name:        p.name,
    status:      p.status,
    endDate:     p.end_date     ?? null,
    budgetTotal: p.budget_total ?? null,
  }))

  return (
    <>
      <Topbar title={client.name} breadcrumb={`${t('breadcrumb')} / ${client.name}`} isSuperAdmin={isSA} companyName={companyName} />
      <ClientDetailClient
        client={client}
        projects={projects}
        crm={{
          access:        crmAccess,
          contacts:      contactsRes.data ?? [],
          interactions:  interactionsRes.data ?? [],
          opportunities: oppsRes.data ?? [],
          myConsultantId: meRes.data?.id ?? null,
        }}
      />
    </>
  )
}
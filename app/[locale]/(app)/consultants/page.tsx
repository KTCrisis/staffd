// app/[locale]/(app)/consultants/page.tsx

import { getPageAuth }       from '@/lib/auth/page-auth'
import { getTranslations }   from 'next-intl/server'
import { Topbar }            from '@/components/layout/Topbar'
import { ConsultantsClient } from '@/components/consultants/ConsultantsClient'
import type { Consultant }   from '@/types'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function ConsultantsPage({ searchParams }: Props) {
  const { tenant } = await searchParams
  const t          = await getTranslations('consultants')
  const { role, isSA, userId, companyId, companyName, supabase } = await getPageAuth(tenant)

  // ── Filtre manager : récupère l'id de son équipe ─────────────
  let managerTeamId: string | null = null
  if (role === 'manager' && userId) {
    const { data: consultantData } = await supabase
      .from('consultants')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (consultantData?.id) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('manager_id', consultantData.id)
        .maybeSingle()
      managerTeamId = teamData?.id ?? null
    }
  }

  // ── Fetch consultants ────────────────────────────────────────
  let query = supabase.from('consultant_occupancy').select('*')
  if (tenant)         query = query.eq('company_id', tenant)
  if (managerTeamId)  query = query.eq('team_id', managerTeamId)
  else if (role === 'manager') query = query.eq('id', '00000000-0000-0000-0000-000000000000')

  const { data } = await query.order('name')

  const consultants: Consultant[] = (data ?? []).map((r: any) => ({
    id:               r.id,
    companyId:        r.company_id,
    name:             r.name,
    initials:         r.initials,
    email:            r.email            ?? null,
    role:             r.role,
    avatarColor:      r.avatar_color     ?? 'green',
    stack:            r.stack            ?? [],
    status:           r.status,
    contractType:     r.contract_type    ?? 'employee',
    currentProject:   r.current_project  ?? null,
    availableFrom:    r.available_from   ?? null,
    occupancyRate:    r.occupancy_rate   ?? 0,
    leaveDaysLeft:    r.leave_days_left  ?? 0,
    leaveDaysTotal:   r.leave_days_total ?? 25,
    rttLeft:          r.rtt_left         ?? 0,
    tjm:              r.tjm              ?? null,
    tjmCible:         r.tjm_cible        ?? null,
    tjmCoutReel:      r.tjm_cout_reel    ?? null,
    tjmFacture:       r.tjm_facture      ?? null,
    salaireAnnuelBrut: r.salaire_annuel_brut ?? null,
    chargesPct:       r.charges_pct      ?? null,
    joursTravailles:  r.jours_travailles ?? null,
    country_code:     r.country_code     ?? null,
    user_id:          r.user_id          ?? null,
    teamId:           r.team_id          ?? null,
  }))

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <ConsultantsClient
        consultants={consultants}
        userRole={role}
        companyId={companyId}
      />
    </>
  )
}
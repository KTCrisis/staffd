// app/[locale]/(app)/consultants/page.tsx

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getTranslations }    from 'next-intl/server'
import { Topbar }             from '@/components/layout/Topbar'
import { ConsultantsClient }  from '@/components/consultants/ConsultantsClient'
import type { Consultant }    from '@/types'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function ConsultantsPage({ searchParams }: Props) {
  const { tenant }  = await searchParams
  const t           = await getTranslations('consultants')
  const cookieStore = await cookies()

  const { data: { user } } = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  ).auth.getUser()

  const role      = user?.app_metadata?.user_role  as string | undefined
  const userId    = user?.id
  const companyId = user?.app_metadata?.company_id as string | undefined
  const isSA      = user?.app_metadata?.is_super_admin === true

  // super_admin → service role key pour bypass RLS
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    isSA
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // ── Filtre manager : uniquement les membres de son équipe ───
  // On récupère d'abord les IDs membres de l'équipe gérée par ce user.
  let teamMemberIds: string[] | null = null
  if (role === 'manager' && userId) {
    const { data: teamData } = await supabase
      .from('teams')
      .select('id, team_members!inner(consultant_id)')
      .eq('manager_id', userId)
      .maybeSingle()

    if (teamData) {
      teamMemberIds = (teamData.team_members as { consultant_id: string }[])
        .map(m => m.consultant_id)
    } else {
      // Manager sans équipe assignée → liste vide (pas accès à tout)
      teamMemberIds = []
    }
  }

  // ── Fetch consultants ────────────────────────────────────────
  let query = supabase.from('consultant_occupancy').select('*')
  if (tenant)         query = query.eq('company_id', tenant)  // filtre super_admin
  if (teamMemberIds)  query = query.in('id', teamMemberIds.length ? teamMemberIds : ['__none__'])

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
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} />
      <ConsultantsClient
        consultants={consultants}
        userRole={role}
        companyId={companyId}
      />
    </>
  )
}
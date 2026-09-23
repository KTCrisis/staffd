// app/[locale]/(app)/consultants/page.tsx

import { getPageAuth }       from '@/lib/auth/page-auth'
import { getTranslations }   from 'next-intl/server'
import { Topbar }            from '@/components/layout/Topbar'
import { ConsultantsClient } from '@/components/consultants/ConsultantsClient'
import type { Consultant }   from '@/types'
import type { Tables }        from '@/types/supabase'

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

  // La vue consultant_occupancy expose `project_names` (tableau), d'où l'on dérive
  // le projet courant — comme le fait le mapper lib/data/consultants.
  // `country_code` n'est PAS exposé par la vue (à ajouter lors de la phase schéma
  // #4/#5) ; `available_from` n'existe nulle part (champ non implémenté).
  type OccupancyRow = Tables<'consultant_occupancy'> & {
    country_code?: string | null
  }
  const consultants = ((data ?? []) as OccupancyRow[]).map((r) => ({
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
    isFounder:        r.is_founder       ?? false,
    currentProject:   r.project_names?.[0] ?? null,
    availableFrom:    undefined,
    occupancyRate:    r.occupancy_rate   ?? 0,
    leaveDaysLeft:    r.leave_days_left  ?? 0,
    leaveDaysTotal:   r.leave_days_total ?? 25,
    rttLeft:          r.rtt_left         ?? 0,
    tjm:              r.tjm              ?? null,
    tjmCible:         r.tjm_cible        ?? null,
    gradeId:          r.grade_id         ?? null,
    gradeLabel:       r.grade_label      ?? null,
    dateEntree:       r.date_entree      ?? null,
    dateSortie:       r.date_sortie      ?? null,
    honorairesMensuels: r.honoraires_mensuels ?? null,
    fonction:         (r.fonction ?? 'consultant') as Consultant['fonction'],
    tjmCoutReel:      r.tjm_cout_reel    ?? null,
    tjmFacture:       r.tjm_facture      ?? null,
    salaireAnnuelBrut: r.salaire_annuel_brut ?? null,
    chargesPct:       r.charges_pct      ?? null,
    joursTravailles:  r.jours_travailles ?? null,
    country_code:     r.country_code     ?? null,
    user_id:          r.user_id          ?? null,
    teamId:           r.team_id          ?? null,
  }))

  // Consultant / freelance : la RLS ne lui rend que SA fiche (0011). Les
  // collègues viennent de l'annuaire, sans aucun montant ni solde de congés.
  let rows = consultants as Consultant[]
  if (role === 'consultant' || role === 'freelance') {
    let dq = supabase.from('consultant_directory').select('*').order('name')
    if (tenant) dq = dq.eq('company_id', tenant)
    const { data: dir } = await dq
    type DirRow = Pick<Tables<'consultant_directory'>,
      'id' | 'company_id' | 'user_id' | 'name' | 'initials' | 'role' | 'avatar_color'
      | 'status' | 'stack' | 'team_id' | 'contract_type' | 'is_founder' | 'fonction'>
    const own = new Map(rows.map(c => [c.id, c]))
    rows = ((dir ?? []) as DirRow[]).map(d => own.get(d.id ?? '') ?? ({
      id:            d.id ?? '',
      companyId:     d.company_id ?? '',
      name:          d.name ?? '',
      initials:      d.initials ?? '',
      role:          d.role ?? '',
      avatarColor:   (d.avatar_color ?? 'green') as Consultant['avatarColor'],
      stack:         d.stack ?? [],
      status:        (d.status ?? 'available') as Consultant['status'],
      contractType:  (d.contract_type ?? 'employee') as Consultant['contractType'],
      isFounder:     d.is_founder ?? false,
      fonction:      (d.fonction ?? 'consultant') as Consultant['fonction'],
      // Masqués pour un collègue : affichés « — »
      occupancyRate: undefined as unknown as number,
      leaveDaysLeft: undefined as unknown as number,
      user_id:       d.user_id ?? null,
      teamId:        d.team_id ?? undefined,
    } as Consultant))
  }

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} isSuperAdmin={isSA} companyName={companyName} />
      <ConsultantsClient
        consultants={rows}
        userRole={role}
        companyId={companyId}
      />
    </>
  )
}
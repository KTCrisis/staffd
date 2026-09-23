-- ============================================================
-- 0009 — Fonction dans l'entreprise : qui facture, qui ne facture pas
-- ============================================================
-- consultants.fonction : 'consultant' (facturable, défaut), 'dirigeant',
-- 'commercial', 'support' — les lignes d'effectif d'un plan d'affaires.
-- Un non-facturable sort du staffing, de la disponibilité, de l'occupation
-- moyenne et de la rentabilité ; son coût reste dans l'EBITDA (salaire ou
-- honoraires_mensuels) et il peut saisir des CRA internes.
-- consultant_occupancy expose fonction ; consultant_profitability expose
-- is_founder et fonction (colonnes AJOUTÉES EN FIN de vue).
-- ============================================================

alter table consultants add column if not exists fonction text not null default 'consultant';
alter table consultants drop constraint if exists consultants_fonction_check;
alter table consultants add  constraint consultants_fonction_check
  check (fonction in ('consultant','dirigeant','commercial','support'));

create or replace view consultant_occupancy with (security_invoker = true) as
select
  c.id, c.company_id, c.user_id, c.name, c.initials, c.email, c.role,
  c.avatar_color, c.stack, c.status, c.team_id,
  -- Contrat & coût
  c.contract_type, c.tjm, c.tjm_facture, c.tjm_cible,
  c.salaire_annuel_brut, c.charges_pct, c.jours_travailles,
  consultant_day_cost(c.contract_type, c.salaire_annuel_brut, c.charges_pct,
    c.jours_travailles, c.tjm_facture, c.tjm, g.cout_annuel_charge) as tjm_cout_reel,
  -- Congés
  c.leave_days_total, c.leave_days_taken,
  c.leave_days_total - c.leave_days_taken              as leave_days_left,
  c.rtt_total, c.rtt_taken,
  coalesce(c.rtt_total, 0) - coalesce(c.rtt_taken, 0) as rtt_left,
  coalesce(sum(a.allocation), 0)                       as occupancy_rate,
  array_agg(p.name) filter (where p.name is not null)  as project_names,
  c.is_founder,
  -- 0005 : grade
  c.grade_id,
  g.label                                              as grade_label,
  -- 0008 : présence et honoraires (EBITDA)
  c.date_entree,
  c.date_sortie,
  c.honoraires_mensuels,
  -- 0009 : fonction (non facturable si ≠ 'consultant')
  c.fonction
from consultants c
left join grades g      on g.id = c.grade_id
left join assignments a on a.consultant_id = c.id
  and (a.end_date is null or a.end_date >= current_date)
  and (a.start_date is null or a.start_date <= current_date)
left join projects p on p.id = a.project_id
group by c.id, g.id;

create or replace view consultant_profitability with (security_invoker = true) as
with rows as (
  select
    c.*,
    g.label as grade_label,
    a.id    as assignment_id,
    p.tjm_vendu, p.jours_vendus,
    a.allocation::float / 100 as alloc,
    consultant_day_cost(c.contract_type, c.salaire_annuel_brut, c.charges_pct,
      c.jours_travailles, c.tjm_facture, c.tjm, g.cout_annuel_charge) as day_cost,
    consultant_day_cost(c.contract_type, c.salaire_annuel_brut, c.charges_pct,
      c.jours_travailles, c.tjm_facture, c.tjm, g.cout_annuel_charge,
      a.tjm_facture_override) as day_cost_assignment
  from consultants c
  left join grades g      on g.id = c.grade_id
  left join assignments a on a.consultant_id = c.id
  left join projects p    on p.id = a.project_id
                         and p.status in ('active', 'on_hold')
                         and p.tjm_vendu is not null
  where (is_super_admin() or c.company_id = my_company_id())
)
select
  id                    as consultant_id,
  company_id,
  name,
  role,
  initials,
  avatar_color,
  contract_type,
  tjm_cible,
  occupancy_rate,
  status,
  day_cost              as tjm_cout,
  count(distinct assignment_id) as nb_assignments,
  -- Jours générés pondérés par allocation
  round(coalesce(sum(
    case when jours_vendus is not null and alloc is not null
         then jours_vendus * alloc else 0 end
  ), 0)::numeric, 1)    as jours_generes,
  -- CA généré = tjm_vendu projet × jours × allocation
  round(coalesce(sum(
    case when tjm_vendu is not null and jours_vendus is not null and alloc is not null
         then tjm_vendu * jours_vendus * alloc else 0 end
  ), 0)::numeric, 0)    as ca_genere,
  -- Coût consultant (tjm_facture_override de l'affectation si présent)
  round(coalesce(sum(
    case when jours_vendus is not null and alloc is not null
         then day_cost_assignment * jours_vendus * alloc else 0 end
  ), 0)::numeric, 0)    as cout_consultant,
  -- Marge brute = CA - coût
  round(coalesce(sum(
    case when tjm_vendu is not null and jours_vendus is not null and alloc is not null
         then (tjm_vendu - day_cost_assignment) * jours_vendus * alloc else 0 end
  ), 0)::numeric, 0)    as marge_brute,
  -- Marge %
  case
    when sum(case when tjm_vendu is not null and jours_vendus is not null and alloc is not null
                  then tjm_vendu * jours_vendus * alloc else 0 end) > 0
    then round((
      sum(case when tjm_vendu is not null and jours_vendus is not null and alloc is not null
               then (tjm_vendu - day_cost_assignment) * jours_vendus * alloc else 0 end)
      /
      sum(case when tjm_vendu is not null and jours_vendus is not null and alloc is not null
               then tjm_vendu * jours_vendus * alloc else 0 end) * 100
    )::numeric, 1)
    else 0
  end                   as marge_pct,
  -- 0005 : grade
  grade_id,
  grade_label,
  -- 0009 : associé et fonction (affichage, filtre des non-facturables)
  is_founder,
  fonction
from rows
group by id, company_id, name, role, initials, avatar_color, contract_type,
  tjm_cible, occupancy_rate, status, day_cost, grade_id, grade_label, is_founder, fonction;

insert into schema_migrations (version) values ('0009_staff_function') on conflict do nothing;

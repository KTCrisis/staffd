-- ============================================================
-- 0011 — Confidentialité : salaires, coûts et marges réservés
-- ============================================================
-- Avant : la politique consultants_select ouvrait toute la fiche (salaire,
-- charges, tarifs, honoraires) à tout membre du tenant ; les vues
-- consultant_profitability et project_financials n'avaient aucun filtre de
-- rôle. Un consultant lisait par l'API la paie et les marges de l'équipe.
--
-- Après :
--   · consultants : admin et manager voient le tenant ; un consultant ou un
--     freelance ne voit que SA fiche ;
--   · consultant_directory : annuaire sans aucun montant (nom, rôle, statut,
--     stack, équipe, fonction), pour les écrans où un consultant a besoin de
--     ses collègues. Vue exécutée avec les droits de son propriétaire (elle
--     contourne la RLS de consultants) : le filtre de tenant est DANS la vue ;
--   · consultant_profitability, project_financials : admin et manager ;
--   · consultant_occupancy (security_invoker) suit la nouvelle règle.
-- ============================================================

drop policy if exists "consultants_select" on consultants;
create policy "consultants_select" on consultants for select using (
  is_super_admin()
  or (company_id = my_company_id() and my_role() in ('admin','manager'))
  or user_id = auth.uid()
);

create or replace view consultant_directory as
select c.id, c.company_id, c.user_id, c.name, c.initials, c.role, c.avatar_color,
       c.status, c.stack, c.team_id, c.contract_type, c.is_founder, c.fonction
  from consultants c
 where is_super_admin() or c.company_id = my_company_id();

comment on view consultant_directory is
  'Colleague directory without any compensation field. Owner-rights view: tenant filter inside.';
revoke all on consultant_directory from anon;
revoke all on consultant_directory from authenticated;
grant select on consultant_directory to authenticated, service_role;

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
  where (is_super_admin() or (c.company_id = my_company_id() and my_role() in ('admin','manager')))
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

create or replace view project_financials with (security_invoker = true) as
with rows as (
  select
    p.id, p.company_id, p.name, p.client_name, p.tjm_vendu, p.jours_vendus,
    p.billing_mode, p.budget_total,
    a.consultant_id,
    -- Poids : jours calendaires × allocation
    greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
      * coalesce(a.allocation, 0) / 100.0 as w,
    coalesce(consultant_day_cost(c.contract_type, c.salaire_annuel_brut, c.charges_pct,
      c.jours_travailles, c.tjm_facture, c.tjm, g.cout_annuel_charge,
      a.tjm_facture_override), 0) as day_cost
  from projects p
  left join assignments a on a.project_id = p.id
  left join consultants c on c.id = a.consultant_id
  left join grades g      on g.id = c.grade_id
  where (is_super_admin() or (p.company_id = my_company_id() and my_role() in ('admin','manager')))
    and p.status in ('active', 'on_hold')
    and coalesce(p.is_activity_type, false) = false  -- exclut les activity types
)
select
  id,
  company_id,
  name,
  coalesce(client_name, 'Interne') as client,
  tjm_vendu,
  jours_vendus,
  -- tjm_reel : coût journalier moyen de l'équipe, pondéré par (jours × allocation)
  case when sum(w) > 0 then round(sum(day_cost * w) / sum(w), 2) end as tjm_reel,
  case when tjm_vendu is not null and sum(w) > 0
       then round(tjm_vendu - sum(day_cost * w) / sum(w), 2) end      as marge_par_jour,
  case when tjm_vendu is not null and jours_vendus is not null and sum(w) > 0
       then round((tjm_vendu - sum(day_cost * w) / sum(w)) * jours_vendus, 0) end
                                                                      as marge_brute_totale,
  case when tjm_vendu is not null and tjm_vendu > 0 and sum(w) > 0
       then round((1 - sum(day_cost * w) / sum(w) / tjm_vendu) * 100, 1) end
                                                                      as marge_pct,
  count(distinct consultant_id) as team_size,
  billing_mode,
  budget_total
from rows
group by id, company_id, name, client_name, tjm_vendu, jours_vendus,
  billing_mode, budget_total;

insert into schema_migrations (version) values ('0011_confidentiality') on conflict do nothing;

-- ============================================================
-- 0005 — Grille par grade (TJM cible, occupation cible, coût chargé)
-- ============================================================
-- grades : une ligne par grade et par tenant (très senior, senior, confirmé,
-- junior… libres). Valeurs de référence du plan d'affaires ; le simulateur et
-- la rentabilité les lisent.
-- consultants.grade_id : grade de la fiche. La clé étrangère composite
-- (company_id, grade_id) interdit de rattacher un consultant au grade d'un
-- autre tenant.
--
-- Coût journalier : une seule fonction, consultant_day_cost(), remplace les
-- quatre copies du CASE dans les vues. Ordre de résolution :
--   freelance                → tjm_facture_override > tjm_facture > tjm
--   salarié avec salaire     → salaire × (1 + charges %) / jours travaillés
--   salarié avec grade       → coût chargé annuel du grade / jours travaillés
--   sinon                    → tjm (champ historique)
-- Le salaire saisi sur la fiche déroge donc au grade ; le grade ne change
-- rien pour un consultant qui n'en a pas (aucune régression).
--
-- Lecture de grades : admin et manager (ce sont des coûts). Écriture : admin.
-- Les vues sont en security_invoker : un consultant qui lit
-- consultant_occupancy ne voit pas le coût du grade (jointure vide).
-- Les colonnes grade_id et grade_label sont AJOUTÉES EN FIN de vue.
-- ============================================================

create table if not exists grades (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references companies(id) on delete cascade,
  label              text not null,
  position           int  not null default 0,
  tjm_cible          numeric(10,2) check (tjm_cible >= 0),
  occupation_cible   numeric(5,2)  check (occupation_cible between 0 and 100),  -- en %
  cout_annuel_charge numeric(12,2) check (cout_annuel_charge >= 0),
  created_at         timestamptz default now(),
  unique (company_id, label),
  unique (company_id, id)
);
create index if not exists grades_company_idx on grades(company_id);

comment on table grades is
  'Tenant grade grid: target day rate, target occupancy (%), loaded annual cost. Read by simulator and profitability.';

alter table consultants add column if not exists grade_id uuid;
alter table consultants drop constraint if exists consultants_grade_fk;
alter table consultants add constraint consultants_grade_fk
  foreign key (company_id, grade_id) references grades(company_id, id)
  on delete set null (grade_id);

alter table grades enable row level security;
drop policy if exists "grades_select" on grades;
drop policy if exists "grades_insert" on grades;
drop policy if exists "grades_update" on grades;
drop policy if exists "grades_delete" on grades;
create policy "grades_select" on grades for select using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "grades_insert" on grades for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));
create policy "grades_update" on grades for update using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'))
                                          with check (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));
create policy "grades_delete" on grades for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));

grant all on grades to anon, authenticated, service_role;

-- ── Coût journalier d'un consultant (pure, sans accès aux tables) ──────────
create or replace function consultant_day_cost(
  p_contract_type text,
  p_salaire       numeric,
  p_charges_pct   numeric,
  p_jours         int,
  p_tjm_facture   numeric,
  p_tjm           numeric,
  p_grade_cost    numeric,
  p_override      numeric default null
) returns numeric
language sql immutable
set search_path = public
as $$
  select case
    when p_contract_type = 'freelance'
      then coalesce(p_override, p_tjm_facture, p_tjm)
    when p_salaire is not null
      then round(p_salaire * (1 + coalesce(p_charges_pct, 0) / 100.0) / nullif(p_jours, 0), 2)
    when p_grade_cost is not null
      then round(p_grade_cost / nullif(p_jours, 0), 2)
    else p_tjm
  end
$$;

-- ── consultant_occupancy ────────────────────────────────────────────────────
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
  g.label                                              as grade_label
from consultants c
left join grades g      on g.id = c.grade_id
left join assignments a on a.consultant_id = c.id
  and (a.end_date is null or a.end_date >= current_date)
  and (a.start_date is null or a.start_date <= current_date)
left join projects p on p.id = a.project_id
group by c.id, g.id;

-- ── consultant_profitability ────────────────────────────────────────────────
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
  grade_label
from rows
group by id, company_id, name, role, initials, avatar_color, contract_type,
  tjm_cible, occupancy_rate, status, day_cost, grade_id, grade_label;

-- ── project_financials ──────────────────────────────────────────────────────
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
  where (is_super_admin() or p.company_id = my_company_id())
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

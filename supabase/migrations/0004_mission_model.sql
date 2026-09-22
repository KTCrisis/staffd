-- ============================================================
-- 0004 — Modèle de mission : régie ou forfait sur le projet
-- ============================================================
-- projects.billing_mode : 'regie' (vente de jours : TJM × jours) ou 'forfait'
-- (montant fixe : budget_total). Le client final existe déjà
-- (projects.end_client_id, 2026.09.22) ; il est désormais saisi dans l'UI.
--
-- Reprise des données : un projet qui n'a qu'un budget, sans TJM ni jours,
-- est un forfait de fait.
-- project_financials expose billing_mode et budget_total (colonnes AJOUTÉES
-- EN FIN : create or replace view l'exige) ; win_opportunity reporte le type
-- de l'affaire sur le projet créé.
-- ============================================================

alter table projects add column if not exists billing_mode text not null default 'regie';
alter table projects drop constraint if exists projects_billing_mode_check;
alter table projects add  constraint projects_billing_mode_check check (billing_mode in ('regie','forfait'));

update projects set billing_mode = 'forfait'
 where budget_total is not null and (tjm_vendu is null or jours_vendus is null);

create or replace view project_financials with (security_invoker = true) as
select
  p.id,
  p.company_id,
  p.name,
  coalesce(p.client_name, 'Interne') as client,
  p.tjm_vendu,
  p.jours_vendus,

  -- ── tjm_reel : moyenne pondérée par (jours × allocation) ──────────────
  -- Pour chaque consultant : tjm_cout_reel × (durée_calendaire × allocation%)
  -- Divisé par la somme des poids → TJM moyen équipe pondéré
  case
    when sum(
      greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
      * coalesce(a.allocation, 0) / 100.0
    ) > 0
    then round(
      sum(
        -- tjm_cout_reel par consultant (même logique que consultant_occupancy)
        case
          when c.contract_type = 'freelance'
          then coalesce(a.tjm_facture_override, c.tjm_facture, c.tjm, 0)
          when c.contract_type = 'employee' and c.salaire_annuel_brut is not null
          then round(c.salaire_annuel_brut * (1 + c.charges_pct / 100.0) / c.jours_travailles, 2)
          else coalesce(c.tjm, 0)
        end
        *
        -- Poids : jours calendaires × allocation
        (greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
         * coalesce(a.allocation, 0) / 100.0)
      )
      /
      sum(
        greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
        * coalesce(a.allocation, 0) / 100.0
      )
    , 2)
    else null
  end as tjm_reel,

  -- ── marge_par_jour ────────────────────────────────────────────────────
  case
    when p.tjm_vendu is not null
      and sum(
        greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
        * coalesce(a.allocation, 0) / 100.0
      ) > 0
    then round(
      p.tjm_vendu - (
        sum(
          case
            when c.contract_type = 'freelance'
            then coalesce(a.tjm_facture_override, c.tjm_facture, c.tjm, 0)
            when c.contract_type = 'employee' and c.salaire_annuel_brut is not null
            then round(c.salaire_annuel_brut * (1 + c.charges_pct / 100.0) / c.jours_travailles, 2)
            else coalesce(c.tjm, 0)
          end
          * (greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
             * coalesce(a.allocation, 0) / 100.0)
        )
        /
        sum(
          greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
          * coalesce(a.allocation, 0) / 100.0
        )
      )
    , 2)
    else null
  end as marge_par_jour,

  -- ── marge_brute_totale = marge_par_jour × jours_vendus ───────────────
  case
    when p.tjm_vendu is not null and p.jours_vendus is not null
      and sum(
        greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
        * coalesce(a.allocation, 0) / 100.0
      ) > 0
    then round(
      (
        p.tjm_vendu - (
          sum(
            case
              when c.contract_type = 'freelance'
              then coalesce(a.tjm_facture_override, c.tjm_facture, c.tjm, 0)
              when c.contract_type = 'employee' and c.salaire_annuel_brut is not null
              then round(c.salaire_annuel_brut * (1 + c.charges_pct / 100.0) / c.jours_travailles, 2)
              else coalesce(c.tjm, 0)
            end
            * (greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
               * coalesce(a.allocation, 0) / 100.0)
          )
          /
          sum(
            greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
            * coalesce(a.allocation, 0) / 100.0
          )
        )
      ) * p.jours_vendus
    , 0)
    else null
  end as marge_brute_totale,

  -- ── marge_pct ─────────────────────────────────────────────────────────
  case
    when p.tjm_vendu is not null and p.tjm_vendu > 0
      and sum(
        greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
        * coalesce(a.allocation, 0) / 100.0
      ) > 0
    then round(
      (
        1 - (
          sum(
            case
              when c.contract_type = 'freelance'
              then coalesce(a.tjm_facture_override, c.tjm_facture, c.tjm, 0)
              when c.contract_type = 'employee' and c.salaire_annuel_brut is not null
              then round(c.salaire_annuel_brut * (1 + c.charges_pct / 100.0) / c.jours_travailles, 2)
              else coalesce(c.tjm, 0)
            end
            * (greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
               * coalesce(a.allocation, 0) / 100.0)
          )
          /
          sum(
            greatest(coalesce(a.end_date, current_date) - coalesce(a.start_date, current_date), 0)
            * coalesce(a.allocation, 0) / 100.0
          )
          /
          p.tjm_vendu
        )
      ) * 100
    , 1)
    else null
  end as marge_pct,

  count(distinct a.consultant_id) as team_size,

  -- 0004 : mode de facturation (CA d'un forfait = budget_total, pas TJM × jours)
  p.billing_mode,
  p.budget_total

from projects p
left join assignments a on a.project_id = p.id
left join consultants c on c.id = a.consultant_id
where (is_super_admin() or p.company_id = my_company_id())
  and p.status in ('active', 'on_hold')
  and coalesce(p.is_activity_type, false) = false  -- exclut les activity types
group by
  p.id, p.company_id, p.name, p.client_name, p.tjm_vendu, p.jours_vendus,
  p.billing_mode, p.budget_total;

create or replace function win_opportunity(p_opportunity_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  o          opportunities%rowtype;
  v_project  uuid;
  v_client   text;
begin
  select * into o from opportunities where id = p_opportunity_id for update;
  if not found then
    raise exception 'opportunity % not found', p_opportunity_id using errcode = 'P0002';
  end if;

  v_project := o.project_id;

  if v_project is null then
    select name into v_client from clients where id = o.client_id;

    insert into projects (
      company_id, client_id, end_client_id, opportunity_id, created_by,
      name, client_name, description,
      start_date, tjm_vendu, jours_vendus, budget_total, billing_mode, status
    ) values (
      o.company_id, o.client_id, o.end_client_id, o.id, auth.uid(),
      o.name, coalesce(v_client, o.name), o.description,
      o.start_date, o.tjm_vendu, o.jours_estimes,
      case when o.deal_type = 'forfait' then o.amount end,
      case when o.deal_type = 'forfait' then 'forfait' else 'regie' end,
      'active'
    )
    returning id into v_project;
  end if;

  update opportunities
     set status = 'won', probability = 100, lost_reason = null, project_id = v_project
   where id = o.id;

  return v_project;
end;
$$;

-- ============================================================
-- 0008 — EBITDA courant : charges d'exploitation, présence, honoraires
-- ============================================================
-- consultants : date_entree / date_sortie (mois de présence comptés dans la
-- masse salariale) ; honoraires_mensuels (forfait HT d'un associé facturé
-- via sa société : coût fixe mensuel, qu'il y ait mission ou non).
-- operating_expenses : charges d'exploitation HT, ponctuelles ou mensuelles,
-- catégories alignées sur un plan d'affaires. Admin seulement.
-- ebitda_monthly() : compte de résultat mensuel, mois en cours compris.
--
-- Règles de calcul, par mois M (bornes [début, fin], « à date » = min(fin, jour J)) :
--   CA régie      = Σ CRA validés × TJM vendu du projet
--   CA forfait    = budget × (min(jours validés cumulés à date, prévus)
--                             − min(cumul fin M-1, prévus)) ÷ jours prévus
--   Freelances    = Σ CRA validés × (tjm_facture_override > tjm_facture > tjm)
--   Salariés      = coût annuel chargé ÷ 12 × présence (salaire × (1+charges),
--                   sinon coût du grade, sinon tjm × jours travaillés)
--   Honoraires    = honoraires_mensuels × présence
--   Charges       = mensuelles actives en M + ponctuelles datées en M
--   EBITDA        = CA − (salariés + freelances + honoraires + charges)
-- Présence = jours calendaires couverts entre entrée et sortie ÷ jours du mois
-- (entrée inconnue → date de création de la fiche).
-- Mois en cours : les coûts fixes (salariés, honoraires, charges mensuelles)
-- sont proratisés aux jours ouvrés écoulés ; CA et freelances sont réels à
-- date. ca_en_attente = CRA régie saisis mais non validés (information).
-- Un consultant qui porte des honoraires_mensuels n'est compté QUE par eux.
-- Enregistre sa version dans schema_migrations.
-- ============================================================

alter table consultants add column if not exists date_entree         date;
alter table consultants add column if not exists date_sortie         date;
alter table consultants add column if not exists honoraires_mensuels numeric(10,2);
alter table consultants drop constraint if exists consultants_honoraires_check;
alter table consultants add  constraint consultants_honoraires_check check (honoraires_mensuels is null or honoraires_mensuels >= 0);
alter table consultants drop constraint if exists consultants_dates_check;
alter table consultants add  constraint consultants_dates_check check (date_sortie is null or date_entree is null or date_sortie >= date_entree);

-- consultant_occupancy expose les trois colonnes (AJOUTÉES EN FIN de vue)
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
  c.honoraires_mensuels
from consultants c
left join grades g      on g.id = c.grade_id
left join assignments a on a.consultant_id = c.id
  and (a.end_date is null or a.end_date >= current_date)
  and (a.start_date is null or a.start_date <= current_date)
left join projects p on p.id = a.project_id
group by c.id, g.id;

create table if not exists operating_expenses (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  category    text not null check (category in
                ('locaux','outils','rc_compta','marketing','deplacements','formation','autre')),
  label       text not null,
  amount      numeric(12,2) not null check (amount >= 0),     -- HT, par occurrence
  recurrence  text not null default 'monthly' check (recurrence in ('once','monthly')),
  start_month date not null,                                  -- ponctuelle : mois de la charge
  end_month   date,                                           -- mensuelle : dernier mois inclus
  created_at  timestamptz default now(),
  check (end_month is null or end_month >= start_month)
);
create index if not exists operating_expenses_company_idx on operating_expenses(company_id);

alter table operating_expenses enable row level security;
drop policy if exists "operating_expenses_all" on operating_expenses;
create policy "operating_expenses_all" on operating_expenses for all
  using      (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'))
  with check (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));
grant all on operating_expenses to anon, authenticated, service_role;

-- ── Jours ouvrés (lun-ven) entre deux dates incluses ───────────────────────
create or replace function working_days(p_from date, p_to date)
returns int
language sql immutable
set search_path = public
as $$
  select case when p_to < p_from then 0 else
    (select count(*)::int from generate_series(p_from, p_to, interval '1 day') d
      where extract(isodow from d) < 6)
  end
$$;

-- ── Compte de résultat mensuel ──────────────────────────────────────────────
create or replace function ebitda_monthly(
  p_company_id uuid,
  p_from       date,
  p_to         date,
  p_today      date default current_date
) returns table (
  month                date,
  prorata              numeric,
  ca_regie             numeric,
  ca_forfait           numeric,
  ca_total             numeric,
  ca_en_attente        numeric,
  cout_salaries        numeric,
  cout_freelances      numeric,
  cout_honoraires      numeric,
  charges_exploitation numeric,
  ebitda               numeric
)
language plpgsql
stable
security invoker
set search_path = public
as $$
#variable_conflict use_column
begin
  if not (is_super_admin() or (p_company_id = my_company_id() and coalesce(my_role(), '') = 'admin')) then
    raise exception 'EBITDA_FORBIDDEN' using errcode = 'P0001';
  end if;

  return query
  with months as (
    select m::date as m_start,
           (m + interval '1 month - 1 day')::date as m_end
      from generate_series(date_trunc('month', p_from),
                           date_trunc('month', least(p_to, p_today)),
                           interval '1 month') m
  ),
  b as (
    select m_start, m_end,
           least(m_end, p_today) as upto,
           (m_end - m_start + 1)::numeric as days_in_month,
           case when p_today between m_start and m_end
                then working_days(m_start, p_today)::numeric / nullif(working_days(m_start, m_end), 0)
                else 1 end as prorata
      from months
  ),
  ts as (
    select t.date, t.value, t.status, t.consultant_id, t.project_id,
           p.billing_mode, p.tjm_vendu, p.budget_total, p.jours_vendus,
           (coalesce(p.is_internal, false) or coalesce(p.is_activity_type, false)) as internal
      from timesheets t
      join projects p on p.id = t.project_id
     where t.company_id = p_company_id
  ),
  regie as (
    select b.m_start,
           coalesce(sum(ts.value * coalesce(ts.tjm_vendu, 0)) filter (where ts.status = 'approved'), 0)  as ca,
           coalesce(sum(ts.value * coalesce(ts.tjm_vendu, 0)) filter (where ts.status <> 'approved'), 0) as attente
      from b
      left join ts on ts.date between b.m_start and b.upto
                  and ts.billing_mode = 'regie' and not ts.internal
     group by b.m_start
  ),
  forfait_projects as (
    select p.id, p.budget_total, p.jours_vendus
      from projects p
     where p.company_id = p_company_id and p.billing_mode = 'forfait'
       and p.budget_total is not null and coalesce(p.jours_vendus, 0) > 0
  ),
  forfait as (
    select b.m_start,
           coalesce(sum(
             fp.budget_total * (
               least((select coalesce(sum(t.value), 0) from timesheets t
                       where t.project_id = fp.id and t.status = 'approved' and t.date <= b.upto), fp.jours_vendus)
             - least((select coalesce(sum(t.value), 0) from timesheets t
                       where t.project_id = fp.id and t.status = 'approved' and t.date < b.m_start), fp.jours_vendus)
             ) / fp.jours_vendus
           ), 0) as ca
      from b
      left join forfait_projects fp on true
     group by b.m_start
  ),
  freelances as (
    select b.m_start,
           coalesce(sum(ts.value * coalesce(
             (select a.tjm_facture_override from assignments a
               where a.consultant_id = ts.consultant_id and a.project_id = ts.project_id
                 and a.tjm_facture_override is not null
               order by a.start_date desc nulls last limit 1),
             c.tjm_facture, c.tjm, 0)), 0) as cout
      from b
      left join ts on ts.date between b.m_start and b.upto and ts.status = 'approved'
      left join consultants c on c.id = ts.consultant_id
                             and c.contract_type = 'freelance' and c.honoraires_mensuels is null
     where c.id is not null or ts.consultant_id is null
     group by b.m_start
  ),
  presence as (
    select b.m_start, b.prorata, c.id, c.contract_type, c.honoraires_mensuels,
           coalesce(c.salaire_annuel_brut * (1 + coalesce(c.charges_pct, 0) / 100.0),
                    g.cout_annuel_charge,
                    c.tjm * c.jours_travailles) as cout_annuel,
           greatest(0, least(b.m_end, coalesce(c.date_sortie, b.m_end))
                     - greatest(b.m_start, coalesce(c.date_entree, c.created_at::date)) + 1)::numeric
             / b.days_in_month as ratio
      from b
      cross join consultants c
      left join grades g on g.id = c.grade_id
     where c.company_id = p_company_id
  ),
  fixed as (
    select m_start,
           coalesce(sum(cout_annuel / 12 * ratio * prorata)
             filter (where contract_type = 'employee' and honoraires_mensuels is null), 0) as salaries,
           coalesce(sum(honoraires_mensuels * ratio * prorata)
             filter (where honoraires_mensuels is not null), 0) as honoraires
      from presence
     group by m_start
  ),
  charges as (
    select b.m_start,
           coalesce(sum(case when e.recurrence = 'monthly' then e.amount * b.prorata else e.amount end), 0) as total
      from b
      left join operating_expenses e
        on e.company_id = p_company_id
       and ((e.recurrence = 'monthly' and date_trunc('month', e.start_month) <= b.m_start
             and (e.end_month is null or date_trunc('month', e.end_month) >= b.m_start))
         or (e.recurrence = 'once' and date_trunc('month', e.start_month) = b.m_start))
     group by b.m_start
  )
  select b.m_start,
         round(b.prorata, 4),
         round(r.ca, 2),
         round(f.ca, 2),
         round(r.ca + f.ca, 2),
         round(r.attente, 2),
         round(coalesce(x.salaries, 0), 2),
         round(coalesce(fl.cout, 0), 2),
         round(coalesce(x.honoraires, 0), 2),
         round(ch.total, 2),
         round(r.ca + f.ca - coalesce(x.salaries, 0) - coalesce(fl.cout, 0)
               - coalesce(x.honoraires, 0) - ch.total, 2)
    from b
    join regie   r  on r.m_start  = b.m_start
    join forfait f  on f.m_start  = b.m_start
    join charges ch on ch.m_start = b.m_start
    left join freelances fl on fl.m_start = b.m_start
    left join fixed      x  on x.m_start  = b.m_start
   order by b.m_start;
end;
$$;

grant execute on function ebitda_monthly(uuid, date, date, date) to authenticated, service_role;

insert into schema_migrations (version) values ('0008_ebitda') on conflict do nothing;

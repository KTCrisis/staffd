-- STAFFD — Bootstrap complet Supabase
-- Dernière mise à jour : mars 2026 — projets internes · timesheets sem. courante · sync team_id
--                        audit RLS : invoices WITH CHECK · assignments consultant scope
--                                    activity_feed INSERT restreint · companies UPDATE admin
-- Sections : companies (mode solo/team) · clients · consultants · projects · assignments
--            timesheets · leaves · availability · activity_feed
--            invoices · invoice_lines · invoice_list (vue)
--            teams · team_members · team_details (vue)
-- 2 tenants démo : NexDigital + AgenceCreative
-- security_invoker = true sur toutes les vues (isolation RLS)
-- ============================================================


---0 Delete all
drop view if exists timesheet_summary      cascade;
drop view if exists project_financials     cascade;
drop view if exists consultants_with_leave cascade;
drop view if exists consultant_occupancy   cascade;
drop view if exists consultant_profitability cascade;
drop view if exists team_details            cascade;

drop view  if exists invoice_list           cascade;
drop table if exists invoice_lines          cascade;
drop table if exists invoices               cascade;
drop table if exists timesheets             cascade;
drop table if exists activity_feed          cascade;
drop table if exists availability_overrides cascade;
drop table if exists leave_requests         cascade;
drop table if exists assignments            cascade;
drop table if exists team_members           cascade;
drop table if exists teams                  cascade;
drop table if exists projects               cascade;
drop table if exists consultants            cascade;
drop table if exists clients                cascade;
drop table if exists companies              cascade;

drop function if exists is_super_admin()                              cascade;
drop function if exists my_company_id()                               cascade;
drop function if exists my_role()                                     cascade;
drop function if exists set_updated_at()                              cascade;
drop function if exists increment_leave_taken(uuid, int)              cascade;
drop function if exists increment_rtt_taken(uuid, int)                cascade;
drop function if exists auto_link_solo_consultant()                   cascade;
drop function if exists my_team_consultant_ids()                      cascade;
drop function if exists sync_consultant_team_id()                     cascade;
drop trigger if exists on_auth_user_solo_link on auth.users;
drop function if exists next_invoice_number(uuid)                     cascade;
drop function if exists merge_billing_settings(uuid, jsonb)           cascade;
drop function if exists merge_ai_settings(uuid, jsonb)               cascade;
drop function if exists merge_hr_settings(uuid, jsonb)              cascade;
-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- 2. TABLES
-- ============================================================

create table if not exists companies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text unique,
  mode             text not null default 'team' check (mode in ('solo','team')),
  billing_settings jsonb default '{}'::jsonb,  -- siret, tva, iban, mentions légales, préfixe
  ai_settings      jsonb default '{}'::jsonb,  -- ollama_endpoint, ollama_model, agents_enabled, mcp_tools
  hr_settings      jsonb default '{}'::jsonb,  -- country_code, default_cp, default_rtt, working_days, cra_deadline
  created_at       timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  sector text check (sector in ('ESN','Énergie','Finance','Industrie','Retail','Public','Autre')),
  website text, contact_name text, contact_email text, contact_phone text, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists consultants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null, initials text, email text, role text,
  avatar_color text default 'green' check (avatar_color in ('green','pink','cyan','gold','purple')),
  status text default 'available' check (status in ('available','assigned','leave','partial')),
  stack text[],
  country_code text default null,
  -- ── Contrat ─────────────────────────────────────────────────────────────
  contract_type text not null default 'employee'
    check (contract_type in ('employee','freelance')),
  -- ── Coût réel (employee) ────────────────────────────────────────────────
  -- tjm_cout_reel = salaire_annuel_brut × (1 + charges_pct/100) / jours_travailles
  salaire_annuel_brut numeric(10,2),          -- ex : 55000
  charges_pct         numeric(5,2) default 42, -- charges patronales FR ~42%
  jours_travailles    int          default 218, -- jours ouvrés/an FR standard
  -- ── Coût direct (freelance) ──────────────────────────────────────────────
  tjm_facture numeric(10,2),   -- tarif journalier du freelance (peut varier par mission)
  -- ── TJM legacy / fallback ───────────────────────────────────────────────
  tjm numeric(10,2),           -- gardé pour rétrocompatibilité — utilisé si salaire null
  -- ── Objectif commercial ─────────────────────────────────────────────────
  tjm_cible numeric(10,2),     -- TJM cible saisi manuellement — analysable par IA
  -- ── Congés ──────────────────────────────────────────────────────────────
  leave_days_total int default 25, leave_days_taken int default 0,
  rtt_total int default 0, rtt_taken int default 0,
  occupancy_rate int default 0,
  team_id uuid,   -- FK ajoutée après création de la table teams (voir ALTER plus bas)
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  description text,
  manager_id  uuid references consultants(id) on delete set null,
  created_at  timestamptz default now()
);

create table if not exists team_members (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  consultant_id uuid not null references consultants(id) on delete cascade,
  created_at    timestamptz default now(),
  unique (consultant_id)   -- 1 consultant = 1 équipe max
);

-- FK team_id sur consultants (après création de teams)
alter table consultants
  add constraint consultants_team_id_fkey
  foreign key (team_id) references teams(id) on delete set null;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  created_by uuid references auth.users(id),
  name text not null, client_name text,
  is_internal boolean not null default false,
  is_activity_type boolean not null default false,  -- types génériques CRA (Formation, Intercontrat…) — masqués dans /projects, gérés dans Settings/HR
  reference text, description text,
  start_date date, end_date date,
  progress int default 0 check (progress between 0 and 100),
  tjm_vendu numeric(10,2), jours_vendus int, budget_total numeric(10,2),
  status text not null default 'draft'
    check (status in ('draft','active','on_hold','completed','archived')),
  created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint projects_client_check check (is_internal = true OR client_name is not null)
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  consultant_id uuid references consultants(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  allocation int default 100 check (allocation between 0 and 100),
  start_date date, end_date date,
  -- Override TJM freelance si tarif différent sur cette mission spécifique
  tjm_facture_override numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  consultant_id uuid references consultants(id) on delete cascade,
  type text not null check (type in ('CP','RTT','Sans solde','Absence autorisée')),
  motif text, start_date date not null, end_date date not null, days int not null,
  status text not null default 'pending' check (status in ('pending','approved','refused')),
  impact_warning text, reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists availability_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  consultant_id uuid references consultants(id) on delete cascade,
  date date not null,
  status text not null check (status in ('free','busy','partial','leave')),
  note text, created_at timestamptz default now()
);

create table if not exists activity_feed (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  type text not null check (type in ('leave','assignment','milestone','alert')),
  message text not null, read boolean default false,
  created_at timestamptz default now()
);

create table if not exists timesheets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  consultant_id uuid references consultants(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  date date not null,
  value numeric(3,2) default 1.0 check (value between 0 and 1),
  status text default 'draft' check (status in ('draft','submitted','approved')),
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique(consultant_id, date, project_id)
);


-- ============================================================
-- 2b. TABLES — FACTURATION
-- ============================================================

create table if not exists invoices (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references companies(id) on delete cascade,
  consultant_id        uuid references consultants(id),
  client_id            uuid references clients(id),
  project_id           uuid references projects(id),

  invoice_number       text not null,
  invoice_date         date not null default current_date,
  due_date             date,

  status               text not null default 'draft'
                       check (status in ('draft','sent','paid','overdue','cancelled')),

  subtotal             numeric(12,2) not null default 0,
  tva_rate             numeric(5,2)  not null default 20,
  tva_amount           numeric(12,2) not null default 0,
  total_ttc            numeric(12,2) not null default 0,

  source_type          text check (source_type in ('timesheet','project','manual')),
  source_period_start  date,
  source_period_end    date,

  emitter_snapshot     jsonb,
  client_snapshot      jsonb,

  notes                text,
  payment_terms        int default 30,

  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  paid_at              timestamptz
);

create table if not exists invoice_lines (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references invoices(id) on delete cascade,
  company_id   uuid not null references companies(id),
  description  text not null,
  detail       text,
  quantity     numeric(8,2)  not null default 1,
  unit         text default 'day',
  unit_price   numeric(12,2) not null,
  line_total   numeric(12,2) generated always as (quantity * unit_price) stored,
  timesheet_ref jsonb,
  sort_order   int default 0
);

-- ============================================================
-- 3. FONCTIONS + TRIGGERS + RPC
-- ============================================================

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists clients_updated_at     on clients;
drop trigger if exists projects_updated_at    on projects;
drop trigger if exists consultants_updated_at on consultants;
drop trigger if exists timesheets_updated_at  on timesheets;

create trigger clients_updated_at     before update on clients     for each row execute function set_updated_at();
create trigger projects_updated_at    before update on projects    for each row execute function set_updated_at();
create trigger consultants_updated_at before update on consultants for each row execute function set_updated_at();
create trigger timesheets_updated_at  before update on timesheets  for each row execute function set_updated_at();
create trigger invoices_updated_at    before update on invoices    for each row execute function set_updated_at();

create or replace function next_invoice_number(p_company_id uuid)
returns text language plpgsql as $$
declare
  v_prefix  text;
  v_counter int;
  v_year    text := to_char(current_date, 'YYYY');
begin
  select
    coalesce((billing_settings->>'invoice_prefix'), 'INV-' || v_year || '-'),
    coalesce((billing_settings->>'invoice_counter')::int, 0) + 1
  into v_prefix, v_counter
  from companies where id = p_company_id;

  update companies
  set billing_settings = jsonb_set(
    coalesce(billing_settings, '{}'::jsonb),
    '{invoice_counter}',
    to_jsonb(v_counter)
  )
  where id = p_company_id;

  return v_prefix || lpad(v_counter::text, 4, '0');
end;
$$;

create or replace function my_company_id() returns uuid as $$
  select (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid;
$$ language sql stable;

create or replace function my_role() returns text as $$
  select auth.jwt() -> 'app_metadata' ->> 'user_role';
$$ language sql stable;

create or replace function is_super_admin() returns boolean as $$
  select (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'super_admin';
$$ language sql stable;

create or replace function increment_leave_taken(p_consultant_id uuid, p_days int)
returns void as $$
  update consultants set leave_days_taken = leave_days_taken + p_days where id = p_consultant_id;
$$ language sql;

create or replace function increment_rtt_taken(p_consultant_id uuid, p_days int)
returns void as $$
  update consultants set rtt_taken = rtt_taken + p_days where id = p_consultant_id;
$$ language sql;

-- ── Merge partiel de billing_settings ───────────────────────────────────────
-- Fusionne p_patch dans billing_settings sans écraser invoice_counter
-- et les autres clés non soumises dans le formulaire.
create or replace function merge_billing_settings(
  p_company_id uuid,
  p_patch       jsonb
) returns void language plpgsql as $$
begin
  update companies
  set billing_settings = coalesce(billing_settings, '{}'::jsonb) || p_patch
  where id = p_company_id;
end;
$$;

create or replace function merge_ai_settings(
  p_company_id uuid,
  p_patch       jsonb
) returns void language plpgsql as $$
begin
  update companies
  set ai_settings = coalesce(ai_settings, '{}'::jsonb) || p_patch
  where id = p_company_id;
end;
$$;

create or replace function merge_hr_settings(
  p_company_id uuid,
  p_patch       jsonb
) returns void language plpgsql as $$
begin
  update companies
  set hr_settings = coalesce(hr_settings, '{}'::jsonb) || p_patch
  where id = p_company_id;
end;
$$;

-- ── Auto-link solo consultant ────────────────────────────────────────────────
-- Quand un admin d'une company solo se connecte pour la première fois,
-- on cherche un consultant de sa company sans user_id et on le lie automatiquement.
-- Condition : company.mode = 'solo' AND role = 'admin' AND consultant.user_id IS NULL
create or replace function auto_link_solo_consultant()
returns trigger as $$
declare
  v_company_id  uuid;
  v_role        text;
  v_mode        text;
  v_consultant  uuid;
begin
  -- Lire le rôle et company_id depuis app_metadata
  v_role       := new.raw_app_meta_data ->> 'user_role';
  v_company_id := (new.raw_app_meta_data ->> 'company_id')::uuid;

  -- Ne s'applique qu'aux admins
  if v_role <> 'admin' or v_company_id is null then
    return new;
  end if;

  -- Vérifier que la company est en mode solo
  select mode into v_mode from companies where id = v_company_id;
  if v_mode <> 'solo' then
    return new;
  end if;

  -- Trouver le premier consultant sans user_id dans cette company
  select id into v_consultant
  from consultants
  where company_id = v_company_id
    and user_id is null
  order by created_at
  limit 1;

  if v_consultant is not null then
    update consultants
      set user_id = new.id
      where id = v_consultant;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger sur INSERT (nouveau compte) et UPDATE (mise à jour app_metadata)
create or replace trigger on_auth_user_solo_link
  after insert or update of raw_app_meta_data on auth.users
  for each row execute function auto_link_solo_consultant();

-- ── Helper : ids des consultants de l'équipe du manager connecté ────────────
-- Utilisé dans la RLS leave_requests pour scoper la vue manager à son équipe
create or replace function my_team_consultant_ids()
returns uuid[] as $$
  select array(
    select tm.consultant_id
    from team_members tm
    join teams t on t.id = tm.team_id
    where t.manager_id in (
      select id from consultants where user_id = auth.uid()
    )
  )
$$ language sql stable security definer;

-- ── Trigger : sync consultants.team_id depuis team_members ──────────────────
-- Maintient une dénormalisation pour accès rapide sans jointure supplémentaire
create or replace function sync_consultant_team_id()
returns trigger as $$
begin
  if tg_op = 'insert' or tg_op = 'update' then
    update consultants set team_id = new.team_id where id = new.consultant_id;
    return new;
  elsif tg_op = 'delete' then
    update consultants set team_id = null where id = old.consultant_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_sync_consultant_team_id
  after insert or update or delete on team_members
  for each row execute function sync_consultant_team_id();

-- ============================================================
-- 4. VUES (security_invoker = true — OBLIGATOIRE isolation RLS)
-- ============================================================

drop view if exists invoice_list             cascade;
drop view if exists timesheet_summary        cascade;
drop view if exists project_financials       cascade;
drop view if exists consultants_with_leave   cascade;
drop view if exists consultant_occupancy     cascade;
drop view if exists consultant_profitability cascade;
drop view if exists team_details             cascade;

create view consultant_occupancy with (security_invoker = true) as
select
  c.id, c.company_id, c.user_id, c.name, c.initials, c.email, c.role,
  c.avatar_color, c.stack, c.status, c.team_id,
  -- Contrat & coût
  c.contract_type, c.tjm, c.tjm_facture, c.tjm_cible,
  c.salaire_annuel_brut, c.charges_pct, c.jours_travailles,
  -- tjm_cout_reel calculé selon le type de contrat
  case
    when c.contract_type = 'employee' and c.salaire_annuel_brut is not null
    then round(c.salaire_annuel_brut * (1 + c.charges_pct / 100.0) / c.jours_travailles, 2)
    when c.contract_type = 'freelance'
    then coalesce(c.tjm_facture, c.tjm)
    else c.tjm
  end as tjm_cout_reel,
  -- Congés
  c.leave_days_total, c.leave_days_taken,
  c.leave_days_total - c.leave_days_taken              as leave_days_left,
  c.rtt_total, c.rtt_taken,
  coalesce(c.rtt_total, 0) - coalesce(c.rtt_taken, 0) as rtt_left,
  coalesce(sum(a.allocation), 0)                       as occupancy_rate,
  array_agg(p.name) filter (where p.name is not null)  as project_names
from consultants c
left join assignments a on a.consultant_id = c.id
  and (a.end_date is null or a.end_date >= current_date)
  and (a.start_date is null or a.start_date <= current_date)
left join projects p on p.id = a.project_id
group by c.id, c.company_id, c.user_id, c.name, c.initials, c.email, c.role,
  c.avatar_color, c.stack, c.status, c.team_id,
  c.contract_type, c.tjm, c.tjm_facture, c.tjm_cible,
  c.salaire_annuel_brut, c.charges_pct, c.jours_travailles,
  c.leave_days_total, c.leave_days_taken, c.rtt_total, c.rtt_taken;

create view consultants_with_leave with (security_invoker = true) as
select c.*,
  c.leave_days_total - c.leave_days_taken              as leave_days_left,
  coalesce(c.rtt_total, 0) - coalesce(c.rtt_taken, 0) as rtt_left
from consultants c;

create view project_financials with (security_invoker = true) as
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

  count(distinct a.consultant_id) as team_size

from projects p
left join assignments a on a.project_id = p.id
left join consultants c on c.id = a.consultant_id
where (is_super_admin() or p.company_id = my_company_id())
  and p.status in ('active', 'on_hold')
  and coalesce(p.is_activity_type, false) = false  -- exclut les activity types
group by
  p.id, p.company_id, p.name, p.client_name, p.tjm_vendu, p.jours_vendus;
  -- ── timesheet_summary ─────────────────────────────────────────────────────────
create view timesheet_summary with (security_invoker = true) as
select
  t.company_id, t.consultant_id, c.name as consultant_name,
  t.project_id, p.name as project_name,
  date_trunc('week', t.date)::date as week_start,
  sum(t.value) as days_logged,
  count(*) filter (where t.status = 'draft')     as draft_count,
  count(*) filter (where t.status = 'submitted') as submitted_count,
  count(*) filter (where t.status = 'approved')  as approved_count
from timesheets t
join consultants c on c.id = t.consultant_id
join projects    p on p.id = t.project_id
group by t.company_id, t.consultant_id, c.name, t.project_id, p.name, week_start;
  -- ── profitability ─────────────────────────────────────────────────────────
create view consultant_profitability with (security_invoker = true) as
select
  c.id                  as consultant_id,
  c.company_id, 
  c.name,
  c.role,
  c.initials,
  c.avatar_color,
  c.contract_type,
  c.tjm_cible,
  c.occupancy_rate,
  c.status,
  -- tjm_cout_reel : calculé selon le type de contrat
  -- employee avec salaire → salaire × (1 + charges%) / jours
  -- freelance             → tjm_facture (ou tjm en fallback)
  case
    when c.contract_type = 'employee' and c.salaire_annuel_brut is not null
    then round(c.salaire_annuel_brut * (1 + c.charges_pct / 100.0) / c.jours_travailles, 2)
    when c.contract_type = 'freelance'
    then coalesce(c.tjm_facture, c.tjm)
    else c.tjm
  end                   as tjm_cout,
  count(distinct a.id)  as nb_assignments,
  -- Jours générés pondérés par allocation
  round(coalesce(sum(
    case
      when p.jours_vendus is not null and a.allocation is not null
      then p.jours_vendus * (a.allocation::float / 100)
      else 0
    end
  ), 0)::numeric, 1)    as jours_generes,
  -- CA généré = tjm_vendu projet × jours × allocation
  round(coalesce(sum(
    case
      when p.tjm_vendu is not null and p.jours_vendus is not null and a.allocation is not null
      then p.tjm_vendu * p.jours_vendus * (a.allocation::float / 100)
      else 0
    end
  ), 0)::numeric, 0)    as ca_genere,
  -- Coût consultant réel (utilise tjm_facture_override sur l'assignment si dispo)
  round(coalesce(sum(
    case
      when p.jours_vendus is not null and a.allocation is not null
      then (
        case
          when c.contract_type = 'freelance'
          then coalesce(a.tjm_facture_override, c.tjm_facture, c.tjm)
          when c.salaire_annuel_brut is not null
          then round(c.salaire_annuel_brut * (1 + c.charges_pct / 100.0) / c.jours_travailles, 2)
          else c.tjm
        end
      ) * p.jours_vendus * (a.allocation::float / 100)
      else 0
    end
  ), 0)::numeric, 0)    as cout_consultant,
  -- Marge brute = CA - coût
  round(coalesce(sum(
    case
      when p.tjm_vendu is not null and p.jours_vendus is not null and a.allocation is not null
      then (
        p.tjm_vendu - (
          case
            when c.contract_type = 'freelance'
            then coalesce(a.tjm_facture_override, c.tjm_facture, c.tjm)
            when c.salaire_annuel_brut is not null
            then round(c.salaire_annuel_brut * (1 + c.charges_pct / 100.0) / c.jours_travailles, 2)
            else c.tjm
          end
        )
      ) * p.jours_vendus * (a.allocation::float / 100)
      else 0
    end
  ), 0)::numeric, 0)    as marge_brute,
  -- Marge %
  case
    when sum(
      case when p.tjm_vendu is not null and p.jours_vendus is not null and a.allocation is not null
      then p.tjm_vendu * p.jours_vendus * (a.allocation::float / 100) else 0 end
    ) > 0
    then round((
      sum(case
        when p.tjm_vendu is not null and p.jours_vendus is not null and a.allocation is not null
        then (
          p.tjm_vendu - (
            case
              when c.contract_type = 'freelance'
              then coalesce(a.tjm_facture_override, c.tjm_facture, c.tjm)
              when c.salaire_annuel_brut is not null
              then round(c.salaire_annuel_brut * (1 + c.charges_pct / 100.0) / c.jours_travailles, 2)
              else c.tjm
            end
          )
        ) * p.jours_vendus * (a.allocation::float / 100)
        else 0
      end) /
      sum(case
        when p.tjm_vendu is not null and p.jours_vendus is not null and a.allocation is not null
        then p.tjm_vendu * p.jours_vendus * (a.allocation::float / 100) else 0
      end) * 100
    )::numeric, 1)
    else 0
  end                   as marge_pct

from consultants c
left join assignments a on a.consultant_id = c.id
left join projects p    on p.id = a.project_id
                       and p.status in ('active', 'on_hold')
                       and p.tjm_vendu is not null
where (is_super_admin() or c.company_id = my_company_id())
group by
  c.id, c.company_id, c.name, c.role, c.initials, c.avatar_color,
  c.contract_type, c.tjm_cible, c.tjm, c.tjm_facture,
  c.salaire_annuel_brut, c.charges_pct, c.jours_travailles,
  c.occupancy_rate, c.status;


create or replace view invoice_list
with (security_invoker = true) as
select
  i.id,
  i.company_id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.status,
  i.subtotal,
  i.tva_rate,
  i.tva_amount,
  i.total_ttc,
  i.source_type,
  i.source_period_start,
  i.source_period_end,
  i.payment_terms,
  i.notes,
  i.created_at,
  i.paid_at,
  c.name   as client_name,
  p.name   as project_name,
  co.name  as consultant_name,
  case when i.status = 'sent' and i.due_date < current_date then true else false end as is_overdue,
  case when i.due_date is not null then current_date - i.due_date else null end as days_overdue
from invoices i
left join clients     c  on c.id  = i.client_id
left join projects    p  on p.id  = i.project_id
left join consultants co on co.id = i.consultant_id;

-- Vue team_details — enrichie avec manager + membres agrégés en JSON
create view team_details with (security_invoker = true) as
select
  t.id,
  t.company_id,
  t.name,
  t.description,
  t.manager_id,
  t.created_at,
  -- Manager info
  m.name         as manager_name,
  m.initials     as manager_initials,
  m.avatar_color as manager_avatar_color,
  -- Membres (array JSON) — exclut le manager lui-même
  coalesce(
    json_agg(
      json_build_object(
        'id',            c.id,
        'name',          c.name,
        'initials',      c.initials,
        'avatar_color',  c.avatar_color,
        'role',          c.role,
        'status',        c.status,
        'contract_type', c.contract_type
      ) order by c.name
    ) filter (where c.id is not null),
    '[]'::json
  ) as members
from teams t
left join consultants m  on m.id = t.manager_id
left join team_members tm on tm.team_id = t.id
left join consultants c   on c.id = tm.consultant_id
group by t.id, t.company_id, t.name, t.description, t.manager_id, t.created_at,
         m.name, m.initials, m.avatar_color;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

alter table companies              enable row level security;
alter table consultants            enable row level security;
alter table clients                enable row level security;
alter table projects               enable row level security;
alter table assignments            enable row level security;
alter table leave_requests         enable row level security;
alter table availability_overrides enable row level security;
alter table activity_feed          enable row level security;
alter table timesheets             enable row level security;
alter table teams                  enable row level security;
alter table team_members           enable row level security;


alter table invoices      enable row level security;
alter table invoice_lines enable row level security;

-- invoices — admin only (données financières)
drop policy if exists "invoices_select" on invoices;
drop policy if exists "invoices_insert" on invoices;
drop policy if exists "invoices_update" on invoices;
drop policy if exists "invoices_delete" on invoices;
create policy "invoices_select" on invoices for select using (
  is_super_admin()
  or (company_id = my_company_id() and my_role() in ('admin','manager'))
  or (company_id = my_company_id() and my_role() = 'freelance'
      and consultant_id in (select id from consultants where user_id = auth.uid()))
);
create policy "invoices_insert" on invoices for insert with check (
  is_super_admin()
  or (company_id = my_company_id() and my_role() in ('admin','manager'))
  or (company_id = my_company_id() and my_role() = 'freelance'
      and consultant_id in (select id from consultants where user_id = auth.uid()))
);
create policy "invoices_update" on invoices for update
  -- USING  : quelles lignes sont modifiables (état actuel)
  -- Freelance : seulement ses factures draft
  using (
    is_super_admin()
    or (company_id = my_company_id() and my_role() in ('admin','manager'))
    or (company_id = my_company_id() and my_role() = 'freelance' and status = 'draft'
        and consultant_id in (select id from consultants where user_id = auth.uid()))
  )
  -- WITH CHECK : valide le nouvel état de la ligne
  -- Sans ça, PostgreSQL réapplique USING sur la nouvelle ligne
  -- → un freelance pourrait auto-valider en passant status='sent'/'paid'
  -- Freelance : peut modifier librement ses propres factures (admin contrôle les transitions)
  with check (
    is_super_admin()
    or (company_id = my_company_id() and my_role() in ('admin','manager'))
    or (company_id = my_company_id() and my_role() = 'freelance'
        and consultant_id in (select id from consultants where user_id = auth.uid()))
  );
create policy "invoices_delete" on invoices for delete using (
  is_super_admin()
  or (company_id = my_company_id() and my_role() = 'admin')
  or (company_id = my_company_id() and my_role() = 'freelance' and status = 'draft'
      and consultant_id in (select id from consultants where user_id = auth.uid()))
);

-- invoice_lines
drop policy if exists "invoice_lines_select" on invoice_lines;
drop policy if exists "invoice_lines_insert" on invoice_lines;
drop policy if exists "invoice_lines_update" on invoice_lines;
drop policy if exists "invoice_lines_delete" on invoice_lines;
create policy "invoice_lines_select" on invoice_lines for select using (
  is_super_admin()
  or (company_id = my_company_id() and my_role() in ('admin','manager'))
  or (company_id = my_company_id() and my_role() = 'freelance'
      and invoice_id in (select id from invoices
        where consultant_id in (select id from consultants where user_id = auth.uid())))
);
create policy "invoice_lines_insert" on invoice_lines for insert with check (
  is_super_admin()
  or (company_id = my_company_id() and my_role() in ('admin','manager'))
  or (company_id = my_company_id() and my_role() = 'freelance'
      and invoice_id in (select id from invoices where status = 'draft'
        and consultant_id in (select id from consultants where user_id = auth.uid())))
);
create policy "invoice_lines_update" on invoice_lines for update using (
  is_super_admin()
  or (company_id = my_company_id() and my_role() in ('admin','manager'))
  or (company_id = my_company_id() and my_role() = 'freelance'
      and invoice_id in (select id from invoices where status = 'draft'
        and consultant_id in (select id from consultants where user_id = auth.uid())))
);
create policy "invoice_lines_delete" on invoice_lines for delete using (
  is_super_admin()
  or (company_id = my_company_id() and my_role() = 'admin')
  or (company_id = my_company_id() and my_role() = 'freelance'
      and invoice_id in (select id from invoices where status = 'draft'
        and consultant_id in (select id from consultants where user_id = auth.uid())))
);

-- companies
drop policy if exists "companies_select" on companies;
drop policy if exists "companies_insert" on companies;
drop policy if exists "companies_update" on companies;
drop policy if exists "companies_delete" on companies;
create policy "companies_select" on companies for select using (is_super_admin() or id = my_company_id());
create policy "companies_insert" on companies for insert with check (is_super_admin());
-- Admin peut modifier les settings de son propre tenant (billing, hr, ai)
-- Sans ça, la page Settings est complètement bloquée pour les admins
create policy "companies_update" on companies for update using (
  is_super_admin()
  or (id = my_company_id() and my_role() = 'admin')
);
create policy "companies_delete" on companies for delete using (is_super_admin());

-- consultants
drop policy if exists "consultants_select" on consultants;
drop policy if exists "consultants_insert" on consultants;
drop policy if exists "consultants_update" on consultants;
drop policy if exists "consultants_delete" on consultants;
drop policy if exists "consultants_read"   on consultants;
drop policy if exists "consultants_write"  on consultants;
create policy "consultants_select" on consultants for select using (is_super_admin() or company_id = my_company_id() or user_id = auth.uid());
create policy "consultants_insert" on consultants for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "consultants_update" on consultants for update using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "consultants_delete" on consultants for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));

-- clients
drop policy if exists "clients_select" on clients;
drop policy if exists "clients_insert" on clients;
drop policy if exists "clients_update" on clients;
drop policy if exists "clients_delete" on clients;
create policy "clients_select" on clients for select using (is_super_admin() or company_id = my_company_id());
create policy "clients_insert" on clients for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "clients_update" on clients for update using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "clients_delete" on clients for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));

-- projects
drop policy if exists "projects_select" on projects;
drop policy if exists "projects_insert" on projects;
drop policy if exists "projects_update" on projects;
drop policy if exists "projects_delete" on projects;
drop policy if exists "projects_read"   on projects;
drop policy if exists "projects_write"  on projects;
create policy "projects_select" on projects for select using (is_super_admin() or company_id = my_company_id());
create policy "projects_insert" on projects for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "projects_update" on projects for update using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "projects_delete" on projects for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));

-- assignments
drop policy if exists "assignments_select" on assignments;
drop policy if exists "assignments_insert" on assignments;
drop policy if exists "assignments_update" on assignments;
drop policy if exists "assignments_delete" on assignments;
drop policy if exists "assignments_read"   on assignments;
drop policy if exists "assignments_write"  on assignments;
create policy "assignments_select" on assignments for select using (
  is_super_admin()
  or (company_id = my_company_id() and my_role() in ('admin','manager'))
  -- Consultant/freelance : uniquement ses propres assignments
  -- Nécessaire pour le picker timesheet (projets disponibles = projets assignés)
  -- Évite l'exposition des TJM des collègues
  or consultant_id in (select id from consultants where user_id = auth.uid())
);
create policy "assignments_insert" on assignments for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "assignments_update" on assignments for update using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "assignments_delete" on assignments for delete using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));

-- leave_requests
-- Le manager ne voit que les congés des consultants de son équipe (my_team_consultant_ids())
-- L'admin voit tout son tenant
drop policy if exists "leave_requests_select" on leave_requests;
drop policy if exists "leave_requests_insert" on leave_requests;
drop policy if exists "leave_requests_update" on leave_requests;
drop policy if exists "leave_requests_delete" on leave_requests;
drop policy if exists "leave_requests_read"   on leave_requests;
create policy "leave_requests_select" on leave_requests for select using (
  is_super_admin()
  or (company_id = my_company_id() and my_role() = 'admin')
  or (company_id = my_company_id() and my_role() = 'manager'
      and consultant_id = any(my_team_consultant_ids()))
  or consultant_id in (select id from consultants where user_id = auth.uid())
);
create policy "leave_requests_insert" on leave_requests for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')) or (company_id = my_company_id() and consultant_id in (select id from consultants where user_id = auth.uid())));
create policy "leave_requests_update" on leave_requests for update using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "leave_requests_delete" on leave_requests for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));

-- teams — lecture tenant complet, écriture admin uniquement
drop policy if exists "teams_select" on teams;
drop policy if exists "teams_insert" on teams;
drop policy if exists "teams_update" on teams;
drop policy if exists "teams_delete" on teams;
create policy "teams_select" on teams for select using (is_super_admin() or company_id = my_company_id());
create policy "teams_insert" on teams for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));
create policy "teams_update" on teams for update using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));
create policy "teams_delete" on teams for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));

-- team_members — lecture tenant complet, écriture admin uniquement
drop policy if exists "team_members_select" on team_members;
drop policy if exists "team_members_insert" on team_members;
drop policy if exists "team_members_update" on team_members;
drop policy if exists "team_members_delete" on team_members;
create policy "team_members_select" on team_members for select using (
  is_super_admin() or team_id in (select id from teams where company_id = my_company_id())
);
create policy "team_members_insert" on team_members for insert with check (
  is_super_admin() or (
    team_id in (select id from teams where company_id = my_company_id())
    and my_role() = 'admin'
  )
);
create policy "team_members_update" on team_members for update using (
  is_super_admin() or (
    team_id in (select id from teams where company_id = my_company_id())
    and my_role() = 'admin'
  )
);
create policy "team_members_delete" on team_members for delete using (
  is_super_admin() or (
    team_id in (select id from teams where company_id = my_company_id())
    and my_role() = 'admin'
  )
);

-- availability_overrides
drop policy if exists "availability_select"           on availability_overrides;
drop policy if exists "availability_insert"           on availability_overrides;
drop policy if exists "availability_update"           on availability_overrides;
drop policy if exists "availability_delete"           on availability_overrides;
drop policy if exists "availability_overrides_select" on availability_overrides;
drop policy if exists "availability_overrides_insert" on availability_overrides;
drop policy if exists "availability_overrides_update" on availability_overrides;
drop policy if exists "availability_write"            on availability_overrides;
drop policy if exists "availability_read"             on availability_overrides;
create policy "availability_select" on availability_overrides for select using (is_super_admin() or company_id = my_company_id());
create policy "availability_insert" on availability_overrides for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "availability_update" on availability_overrides for update using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "availability_delete" on availability_overrides for delete using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));

-- activity_feed
drop policy if exists "activity_feed_select" on activity_feed;
drop policy if exists "activity_feed_insert" on activity_feed;
drop policy if exists "activity_read"        on activity_feed;
create policy "activity_feed_select" on activity_feed for select using (is_super_admin() or company_id = my_company_id());
-- INSERT restreint aux admins/managers — les consultants ne peuvent pas injecter d'événements
-- Le feed doit être écrit uniquement par des actions admin/manager ou via service role (triggers)
create policy "activity_feed_insert" on activity_feed for insert with check (
  is_super_admin()
  or (company_id = my_company_id() and my_role() in ('admin','manager'))
);

-- timesheets
drop policy if exists "timesheets_select"       on timesheets;
drop policy if exists "timesheets_insert"       on timesheets;
drop policy if exists "timesheets_update"       on timesheets;
drop policy if exists "timesheets_delete"       on timesheets;
drop policy if exists "ts_select"               on timesheets;
drop policy if exists "ts_insert"               on timesheets;
drop policy if exists "ts_update"               on timesheets;
drop policy if exists "ts_delete"               on timesheets;
drop policy if exists "timesheets_select_own"       on timesheets;
drop policy if exists "timesheets_insert_own"       on timesheets;
drop policy if exists "timesheets_update_own_draft" on timesheets;
create policy "timesheets_select" on timesheets for select using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')) or consultant_id in (select id from consultants where user_id = auth.uid()));
create policy "timesheets_insert" on timesheets for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')) or (company_id = my_company_id() and consultant_id in (select id from consultants where user_id = auth.uid())));
create policy "timesheets_update" on timesheets for update
  -- USING  : quelles lignes peuvent être modifiées (état actuel)
  using (
    is_super_admin()
    or (company_id = my_company_id() and my_role() in ('admin','manager'))
    or (status = 'draft' and consultant_id in (select id from consultants where user_id = auth.uid()))
  )
  -- WITH CHECK : ce que peut devenir la ligne (nouvel état)
  -- Sans ça, PostgreSQL réapplique USING sur la nouvelle ligne
  -- → un consultant ne peut plus soumettre car status='submitted' != 'draft'
  with check (
    is_super_admin()
    or (company_id = my_company_id() and my_role() in ('admin','manager'))
    or (consultant_id in (select id from consultants where user_id = auth.uid()))
  );
create policy "timesheets_delete" on timesheets for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin') or (status = 'draft' and consultant_id in (select id from consultants where user_id = auth.uid())));

-- ============================================================
-- 6. REALTIME
-- ============================================================
alter publication supabase_realtime add table leave_requests;
alter publication supabase_realtime add table timesheets;
alter publication supabase_realtime add table invoices;

-- ============================================================
-- 7. DONNÉES DÉMO
-- ============================================================

-- ── TENANT A : NexDigital ─────────────────────────────────────
insert into companies (id, name, slug, mode, billing_settings) values (
  'aaaaaaaa-0000-0000-0000-000000000001', 'NexDigital', 'nexdigital', 'team',
  '{
    "siret": "12345678901234",
    "tva_number": "FR12345678901",
    "tva_rate": 20,
    "payment_terms": 30,
    "bank_iban": "FR76 1234 5678 9012 3456 7890 123",
    "bank_bic": "BNPAFRPPXXX",
    "bank_name": "BNP Paribas",
    "legal_mention": "SAS au capital de 10 000€ — RCS Paris 123 456 789",
    "invoice_prefix": "NEX-2026-",
    "invoice_counter": 0
  }'::jsonb
) on conflict (id) do update set billing_settings = excluded.billing_settings;

insert into clients (id, company_id, name, sector, contact_name, contact_email) values
  ('bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ENGIE',            'Énergie', 'Sophie Renard',  'sophie.renard@engie.com'),
  ('bbbbbbbb-0002-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'BNP Paribas',      'Finance', 'Marc Delaunay',  'marc.delaunay@bnp.com'),
  ('bbbbbbbb-0003-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Société Générale', 'Finance', 'Julie Fontaine', 'julie.fontaine@socgen.com'),
  ('bbbbbbbb-0004-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Accenture',        'ESN',     'Thomas Bernard', 'thomas.bernard@accenture.com')
on conflict (id) do nothing;

-- contract_type / salaire_annuel_brut / charges_pct / jours_travailles / tjm_facture / tjm_cible
-- Alice, Baptiste, Clara, Emma → employees (coût = salaire chargé / 218j)
-- David → freelance (coût = tjm_facture par mission)
insert into consultants (id, company_id, name, initials, email, role, avatar_color, status, stack,
  contract_type, salaire_annuel_brut, charges_pct, jours_travailles, tjm_facture, tjm, tjm_cible,
  leave_days_total, leave_days_taken, rtt_total, rtt_taken, occupancy_rate) values
  ('cccccccc-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Alice Martin',  'AM','alice@nexdigital.fr',   'Lead Developer',   'green', 'assigned',ARRAY['React','Node.js','AWS'],       'employee',65000,42,218,null,null,800, 25, 7,10,2, 90),
  ('cccccccc-0002-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Baptiste Leroi','BL','baptiste@nexdigital.fr','Data Engineer',    'cyan',  'partial', ARRAY['Python','Spark','Databricks'], 'employee',55000,42,218,null,null,720, 25, 3,10,1, 50),
  ('cccccccc-0003-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Clara Kim',    'CK','clara@nexdigital.fr',   'UX Designer',      'pink',  'leave',   ARRAY['Figma','Storybook'],           'employee',48000,42,218,null,null,650, 25,18,10,4,  0),
  ('cccccccc-0004-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','David Mora',   'DM','david@nexdigital.fr',   'DevOps Engineer',  'gold',  'partial', ARRAY['Kubernetes','Terraform','GCP'],'freelance',null,  42,218, 680,null,750, 25, 5,10,2, 50),
  ('cccccccc-0005-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001','Emma Petit',   'EP','emma@nexdigital.fr',    'Backend Developer','purple','assigned',ARRAY['Java','Spring','PostgreSQL'],  'employee',50000,42,218,null,null,700, 25,25,10,0,100)
on conflict (id) do nothing;

insert into projects (id, company_id, client_id, name, client_name, is_internal, status, progress, start_date, end_date, tjm_vendu, jours_vendus, budget_total) values
  ('dddddddd-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0004-0000-0000-000000000004', 'Alpha CRM',         'Accenture',       false, 'active',  72, '2025-10-01', '2026-04-15', 850, 180, 153000),
  ('dddddddd-0002-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000002', 'Nexus v2',          'BNP Paribas',     false, 'active',  38, '2025-12-01', '2026-06-30', 800, 120,  96000),
  ('dddddddd-0003-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', 'DataLake Refonte',  'ENGIE',           false, 'active',  51, '2026-01-15', '2026-05-20', 780,  90,  70200),
  ('dddddddd-0004-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0003-0000-0000-000000000003', 'Audit Cyber SG',   'Société Générale', false, 'on_hold', 15, '2026-02-01', '2026-03-31', 900,  40,  36000),
  ('dddddddd-0005-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', null,                                   'Portail RH interne','NexDigital',      true,  'draft',    5, '2026-03-01', '2026-08-31', null, null, null)
on conflict (id) do nothing;

-- Projets internes NexDigital — apparaissent dans le picker timesheet
insert into projects (id, company_id, name, is_internal, is_activity_type, status, start_date, end_date) values
  ('a0000001-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Intercontrat', true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000002-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Formation',    true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000003-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Avant-vente',  true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000004-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Interne',      true, true, 'active', '2020-01-01', '2099-12-31')
on conflict (id) do nothing;

insert into assignments (company_id, consultant_id, project_id, allocation, start_date, end_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001', 90,'2025-10-01','2026-04-15'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001',100,'2025-10-01','2026-04-15'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002', 50,'2025-12-01','2026-06-30'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002', 50,'2025-12-01','2026-06-30'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000003', 10,'2026-01-15','2026-05-20'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','dddddddd-0003-0000-0000-000000000003',  0,'2026-01-15','2026-05-20'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004', 50,'2026-02-01','2026-03-31')
on conflict do nothing;

insert into leave_requests (company_id, consultant_id, type, start_date, end_date, days, status, impact_warning) values
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','CP', '2026-03-14','2026-03-18',5,'pending','Projet DataLake affecté — 1 dev manquant semaine 11'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','RTT','2026-03-05','2026-03-05',1,'pending',null),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','CP', '2026-04-01','2026-04-05',5,'pending',null),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','RTT','2026-02-10','2026-02-10',1,'approved',null),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','CP', '2026-01-27','2026-01-31',5,'approved',null)
on conflict do nothing;

insert into activity_feed (company_id, type, message, read) values
  ('aaaaaaaa-0000-0000-0000-000000000001','leave',     'Clara Kim — demande de congé 14–18 mars',false),
  ('aaaaaaaa-0000-0000-0000-000000000001','leave',     'Emma Petit — congé posé 1–5 avril',false),
  ('aaaaaaaa-0000-0000-0000-000000000001','assignment','Baptiste Leroi affecté → Nexus v2',false),
  ('aaaaaaaa-0000-0000-0000-000000000001','milestone', 'Projet Alpha CRM — jalon livré ✓',true),
  ('aaaaaaaa-0000-0000-0000-000000000001','alert',     'Fin de mission Emma Petit dans 12j',true)
on conflict do nothing;

insert into timesheets (company_id, consultant_id, project_id, date, value, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-23',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-24',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-25',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-26',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-27',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-23',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-24',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-25',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-23',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-24',0.5,'approved'),
  -- ── Alice Martin — semaines 02-fév → 20-fév ─────────────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-02',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-03',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-04',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-05',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-06',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-09',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-10',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-11',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-12',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000003','2026-02-12',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-13',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-16',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-17',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-18',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-19',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-20',1.0,'approved'),
  -- ── Baptiste Leroi — semaines 02-fév → 20-fév (50%) ─────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-02',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-03',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-04',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-05',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-09',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-10',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-11',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-16',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-17',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-18',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-19',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-20',0.5,'approved'),
  -- ── Emma Petit — semaines 02-fév → 20-fév (100%) ────────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-02',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-03',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-04',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-05',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-06',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-09',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-10',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-11',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-12',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-13',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-16',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-17',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-18',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-19',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-20',1.0,'approved'),
  -- ── David Mora — semaines 02-fév → 17-fév (50%+50%) ─────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-02',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-02-02',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-03',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-02-03',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-09',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-02-09',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-16',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-02-16',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-17',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-02-17',0.5,'approved'),
  -- ── Alice Martin — semaine 02–06 mars (90% Alpha CRM + 10% DataLake) ────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-03-02',1.0,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-03-03',1.0,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-03-04',1.0,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-03-05',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000003','2026-03-05',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-03-06',1.0,'draft'),
  -- ── Baptiste Leroi — semaine 02–06 mars (50% Nexus v2) ──────────────────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-03-02',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-03-03',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-03-04',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-03-05',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-03-06',0.5,'draft'),
  -- ── Emma Petit — semaine 02–06 mars (100% Alpha CRM) ────────────────────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-03-02',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-03-03',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-03-04',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-03-05',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-03-06',1.0,'draft'),
  -- ── David Mora — semaine 02–06 mars (50% Nexus v2 + 50% Audit Cyber) ────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-03-02',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-03-02',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-03-03',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-03-03',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-03-04',0.5,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-03-04',0.5,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-03-05',0.5,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-03-05',0.5,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-03-06',0.5,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-03-06',0.5,'draft'),
  -- ── Clara Kim — sem 02-mars (intercontrat — status leave DataLake) ──────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001','2026-03-02',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001','2026-03-03',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001','2026-03-04',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001','2026-03-05',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001','2026-03-06',1.0,'draft')
on conflict do nothing;

-- ── TENANT B : AgenceCreative ─────────────────────────────────
insert into companies (id, name, slug, mode, billing_settings) values (
  'bbbbbbbb-1111-0000-0000-000000000002', 'AgenceCreative', 'agencecreative', 'team',
  '{
    "siret": "55544433300021",
    "tva_number": "FR55544433300",
    "tva_rate": 20,
    "payment_terms": 45,
    "bank_iban": "FR76 5554 4433 3000 2134 5678 912",
    "bank_bic": "CEPAFRPP",
    "bank_name": "Caisse d Epargne",
    "legal_mention": "SARL au capital de 5 000€ — RCS Paris 554 433 300",
    "invoice_prefix": "AC-2026-",
    "invoice_counter": 0
  }'::jsonb
) on conflict (id) do nothing;

insert into clients (id, company_id, name, sector, contact_name, contact_email, notes) values
  ('cccccccc-1001-0000-0000-000000000001','bbbbbbbb-1111-0000-0000-000000000002','Renault',     'Industrie','Pierre Aubert',   'pierre.aubert@renault.com',   'Client historique — budget annuel 150k€'),
  ('cccccccc-1002-0000-0000-000000000002','bbbbbbbb-1111-0000-0000-000000000002','Decathlon',   'Retail',   'Marie Leclerc',   'marie.leclerc@decathlon.com', 'Refonte site e-commerce + social media'),
  ('cccccccc-1003-0000-0000-000000000003','bbbbbbbb-1111-0000-0000-000000000002','Mairie Paris','Public',   'Henri Dupuis',    'h.dupuis@paris.fr',           'AO remporté jan 2026 — comm institutionnelle'),
  ('cccccccc-1004-0000-0000-000000000004','bbbbbbbb-1111-0000-0000-000000000002','BioNaturel',  'Retail',   'Camille Fontaine','c.fontaine@bionaturel.fr',    'Startup bio — identité visuelle complète')
on conflict (id) do nothing;

-- Sophie, Julie, Tom, Antoine → employees
-- Lucas, Nina → freelances
insert into consultants (id, company_id, name, initials, email, role, avatar_color, status, stack,
  contract_type, salaire_annuel_brut, charges_pct, jours_travailles, tjm_facture, tjm, tjm_cible,
  leave_days_total, leave_days_taken, rtt_total, rtt_taken, occupancy_rate) values
  ('eeeeeeee-0001-0000-0000-000000000001','bbbbbbbb-1111-0000-0000-000000000002','Sophie Durand','SD','sophie@agencecreative.fr', 'Art Director',    'pink',  'assigned', ARRAY['Figma','After Effects','Photoshop'],  'employee',45000,42,218,null,null,600, 25, 5,8,1, 80),
  ('eeeeeeee-0002-0000-0000-000000000002','bbbbbbbb-1111-0000-0000-000000000002','Lucas Martin', 'LM','lucas@agencecreative.fr',  'Motion Designer', 'cyan',  'available',ARRAY['Blender','After Effects','Cinema 4D'],'freelance',null,  42,218, 450,null,520, 25, 0,8,0,  0),
  ('eeeeeeee-0003-0000-0000-000000000003','bbbbbbbb-1111-0000-0000-000000000002','Julie Renard', 'JR','julie@agencecreative.fr',  'Copywriter',      'gold',  'partial',  ARRAY['SEO','WordPress','Notion'],           'employee',36000,42,218,null,null,460, 25, 8,8,3, 50),
  ('eeeeeeee-0004-0000-0000-000000000004','bbbbbbbb-1111-0000-0000-000000000002','Tom Vasseur',  'TV','tom@agencecreative.fr',    'Dev Frontend',    'purple','assigned', ARRAY['Vue.js','Nuxt','TailwindCSS'],        'employee',46000,42,218,null,null,620, 25, 3,8,0,100),
  ('eeeeeeee-0005-0000-0000-000000000005','bbbbbbbb-1111-0000-0000-000000000002','Nina Colas',   'NC','nina@agencecreative.fr',   'Graphic Designer','green', 'assigned', ARRAY['Illustrator','InDesign','Figma'],     'freelance',null,  42,218, 460,null,520, 25,10,8,2, 80),
  ('eeeeeeee-0006-0000-0000-000000000006','bbbbbbbb-1111-0000-0000-000000000002','Antoine Lamy', 'AL','antoine@agencecreative.fr','Brand Strategist','pink',  'leave',    ARRAY['Notion','Miro','Keynote'],            'employee',42000,42,218,null,null,560, 25,20,8,4,  0)
on conflict (id) do nothing;

insert into projects (id, company_id, client_id, name, client_name, is_internal, status, progress, start_date, end_date, tjm_vendu, jours_vendus, budget_total, description) values
  ('ffffffff-0001-0000-0000-000000000001','bbbbbbbb-1111-0000-0000-000000000002','cccccccc-1001-0000-0000-000000000001','Campagne Renault EV',        'Renault',       false,'active', 60,'2026-01-01','2026-04-30',650, 80,52000,'Campagne 360° lancement gamme électrique — print, digital, OOH'),
  ('ffffffff-0002-0000-0000-000000000002','bbbbbbbb-1111-0000-0000-000000000002','cccccccc-1002-0000-0000-000000000002','Refonte Site Decathlon',     'Decathlon',     false,'active', 30,'2026-02-01','2026-07-31',600, 60,36000,'Refonte UX/UI site e-commerce + intégration CMS headless'),
  ('ffffffff-0003-0000-0000-000000000003','bbbbbbbb-1111-0000-0000-000000000002','cccccccc-1003-0000-0000-000000000003','Comm Institutionnelle Paris','Mairie Paris',  false,'active', 45,'2026-01-15','2026-06-30',700, 50,35000,'Charte graphique et supports comm ville de Paris'),
  ('ffffffff-0004-0000-0000-000000000004','bbbbbbbb-1111-0000-0000-000000000002','cccccccc-1004-0000-0000-000000000004','Identité BioNaturel',        'BioNaturel',    false,'on_hold',20,'2026-02-15','2026-05-15',580, 30,17400,'Logo, charte, packaging — en attente validation client'),
  ('ffffffff-0005-0000-0000-000000000005','bbbbbbbb-1111-0000-0000-000000000002',null,                                  'Brand Book Interne',         'AgenceCreative',true, 'draft',   5,'2026-04-01','2026-06-30',null,null, null,'Refonte brand book et templates internes')
on conflict (id) do nothing;

-- Projets internes AgenceCreative — apparaissent dans le picker timesheet
insert into projects (id, company_id, name, is_internal, is_activity_type, status, start_date, end_date) values
  ('a0000001-0000-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000002', 'Prospection', true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000002-0000-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000002', 'Formation',   true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000003-0000-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000002', 'Shooting',    true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000004-0000-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000002', 'Interne',     true, true, 'active', '2020-01-01', '2099-12-31')
on conflict (id) do nothing;

insert into assignments (company_id, consultant_id, project_id, allocation, start_date, end_date) values
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001', 80,'2026-01-01','2026-04-30'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001', 50,'2026-01-01','2026-04-30'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001', 80,'2026-01-01','2026-04-30'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002',100,'2026-02-01','2026-07-31'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','ffffffff-0002-0000-0000-000000000002', 50,'2026-02-01','2026-07-31'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003', 80,'2026-01-15','2026-06-30'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003', 50,'2026-01-15','2026-06-30'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0004-0000-0000-000000000004', 50,'2026-02-15','2026-05-15'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0006-0000-0000-000000000006','ffffffff-0004-0000-0000-000000000004', 80,'2026-02-15','2026-05-15')
on conflict do nothing;

insert into leave_requests (company_id, consultant_id, type, start_date, end_date, days, status, impact_warning) values
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','CP', '2026-03-20','2026-03-24',5, 'pending', null),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','RTT','2026-04-10','2026-04-10',1, 'approved',null),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0006-0000-0000-000000000006','CP', '2026-02-17','2026-03-07',15,'approved','Projet BioNaturel mis en pause — Antoine absent 3 semaines'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','RTT','2026-03-10','2026-03-10',1, 'pending', null),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','CP', '2026-05-04','2026-05-09',5, 'pending', 'Comm Paris affecté semaine 19')
on conflict do nothing;

insert into activity_feed (company_id, type, message, read) values
  ('bbbbbbbb-1111-0000-0000-000000000002','assignment','Tom Vasseur affecté → Refonte Site Decathlon',false),
  ('bbbbbbbb-1111-0000-0000-000000000002','leave',     'Lucas Martin — congé posé 20–24 mars',false),
  ('bbbbbbbb-1111-0000-0000-000000000002','leave',     'Antoine Lamy — 3 semaines de congé approuvées',false),
  ('bbbbbbbb-1111-0000-0000-000000000002','milestone', 'Campagne Renault EV — brief créatif validé ✓',true),
  ('bbbbbbbb-1111-0000-0000-000000000002','alert',     'Projet BioNaturel en pause — relance à confirmer',true)
on conflict do nothing;

insert into timesheets (company_id, consultant_id, project_id, date, value, status) values
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-23',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-24',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-25',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0004-0000-0000-000000000004','2026-02-25',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-23',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-24',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-25',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-02-23',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003','2026-02-23',0.5,'approved'),
  -- ── Sophie Durand — semaines 02-fév → 20-fév (80%) ──────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-02',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-03',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-04',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-05',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0004-0000-0000-000000000004','2026-02-05',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-09',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-10',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-16',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-17',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-18',1.0,'approved'),
  -- ── Tom Vasseur — semaines 02-fév → 20-fév (100%) ───────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-02',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-03',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-04',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-05',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-09',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-10',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-16',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-17',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-18',1.0,'approved'),
  -- ── Nina Colas — semaines 02-fév → 20-fév (80%) ─────────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-02-02',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-02-02',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-02-03',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-02-09',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-02-10',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-02-16',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-02-17',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-02-18',1.0,'approved'),
  -- ── Sophie Durand — semaine 02–06 mars (80% Renault EV + 50% BioNaturel) ────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-03-02',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-03-03',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-03-04',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0004-0000-0000-000000000004','2026-03-04',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-03-05',1.0,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-03-06',1.0,'draft'),
  -- ── Tom Vasseur — semaine 02–06 mars (100% Decathlon) ───────────────────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-03-02',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-03-03',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-03-04',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-03-05',1.0,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-03-06',1.0,'draft'),
  -- ── Nina Colas — semaine 02–06 mars (80% Renault + Comm Paris) ──────────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-03-02',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-03-02',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-03-03',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-03-03',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-03-04',1.0,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-03-05',0.5,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-03-06',1.0,'draft'),
  -- ── Julie Renard — semaine 02–06 mars (50% Renault + 50% Comm Paris) ────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-03-02',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003','2026-03-02',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-03-03',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003','2026-03-03',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-03-04',0.5,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003','2026-03-04',0.5,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-03-05',0.5,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003','2026-03-05',0.5,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-03-06',0.5,'draft'),
  -- ── Lucas Martin — sem 02-mars (intercontrat — pas d'affectation active) ────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','a0000001-0000-0000-0000-000000000002','2026-03-02',1.0,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','a0000001-0000-0000-0000-000000000002','2026-03-03',1.0,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','a0000001-0000-0000-0000-000000000002','2026-03-04',1.0,'draft')
on conflict do nothing;

-- ── ÉQUIPES — NexDigital ──────────────────────────────────────────────────────
-- Pôle Dev & Data  : manager = Alice Martin (Lead Developer)
-- Pôle Design & Ops : pas de manager défini (Clara seule, David freelance)
insert into teams (id, company_id, name, description, manager_id) values
  ('a1a1a1a1-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Pôle Dev & Data', 'Développement applicatif et ingénierie data',
   'cccccccc-0001-0000-0000-000000000001'),   -- manager : Alice Martin
  ('a2a2a2a2-0002-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Pôle Design & Ops', 'UX Design et DevOps',
   null)
on conflict (id) do nothing;

-- team_members NexDigital (le trigger sync_consultant_team_id met à jour consultants.team_id)
insert into team_members (team_id, consultant_id) values
  ('a1a1a1a1-0001-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000001'), -- Alice
  ('a1a1a1a1-0001-0000-0000-000000000001', 'cccccccc-0002-0000-0000-000000000002'), -- Baptiste
  ('a1a1a1a1-0001-0000-0000-000000000001', 'cccccccc-0005-0000-0000-000000000005'), -- Emma
  ('a2a2a2a2-0002-0000-0000-000000000002', 'cccccccc-0003-0000-0000-000000000003'), -- Clara
  ('a2a2a2a2-0002-0000-0000-000000000002', 'cccccccc-0004-0000-0000-000000000004')  -- David
on conflict (consultant_id) do nothing;

-- ── ÉQUIPES — AgenceCreative ──────────────────────────────────────────────────
-- Équipe Créa     : manager = Sophie Durand (Art Director)
-- Équipe Brand&Dev: manager = Antoine Lamy (Brand Strategist)
insert into teams (id, company_id, name, description, manager_id) values
  ('a3a3a3a3-0003-0000-0000-000000000003', 'bbbbbbbb-1111-0000-0000-000000000002',
   'Équipe Créa', 'Direction artistique, motion design et graphisme',
   'eeeeeeee-0001-0000-0000-000000000001'),   -- manager : Sophie Durand
  ('a4a4a4a4-0004-0000-0000-000000000004', 'bbbbbbbb-1111-0000-0000-000000000002',
   'Équipe Brand & Dev', 'Stratégie de marque, copywriting et intégration',
   'eeeeeeee-0006-0000-0000-000000000006')    -- manager : Antoine Lamy
on conflict (id) do nothing;

-- team_members AgenceCreative
insert into team_members (team_id, consultant_id) values
  ('a3a3a3a3-0003-0000-0000-000000000003', 'eeeeeeee-0001-0000-0000-000000000001'), -- Sophie
  ('a3a3a3a3-0003-0000-0000-000000000003', 'eeeeeeee-0002-0000-0000-000000000002'), -- Lucas
  ('a3a3a3a3-0003-0000-0000-000000000003', 'eeeeeeee-0005-0000-0000-000000000005'), -- Nina
  ('a4a4a4a4-0004-0000-0000-000000000004', 'eeeeeeee-0006-0000-0000-000000000006'), -- Antoine
  ('a4a4a4a4-0004-0000-0000-000000000004', 'eeeeeeee-0003-0000-0000-000000000003'), -- Julie
  ('a4a4a4a4-0004-0000-0000-000000000004', 'eeeeeeee-0004-0000-0000-000000000004')  -- Tom
on conflict (consultant_id) do nothing;




-- ============================================================
-- ── INVOICES — NexDigital (2 paid · 1 sent · 1 draft) ───────
-- ============================================================
insert into invoices (id, company_id, consultant_id, client_id, project_id,
  invoice_number, invoice_date, due_date, status,
  subtotal, tva_rate, tva_amount, total_ttc,
  source_type, source_period_start, source_period_end,
  emitter_snapshot, client_snapshot, notes, payment_terms) values

  ('11111111-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000001',
   'bbbbbbbb-0004-0000-0000-000000000004',
   'dddddddd-0001-0000-0000-000000000001',
   'NEX-2026-001','2026-01-31','2026-03-02','paid',
   42500.00,20,8500.00,51000.00,
   'timesheet','2026-01-01','2026-01-31',
   '{"name":"NexDigital","siret":"12345678901234","address":"12 rue de la Paix, 75001 Paris"}'::jsonb,
   '{"name":"Accenture","contact":"Thomas Bernard","email":"thomas.bernard@accenture.com"}'::jsonb,
   'Prestation janvier 2026 — Alpha CRM',30),

  ('11111111-2222-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0002-0000-0000-000000000002',
   'bbbbbbbb-0002-0000-0000-000000000002',
   'dddddddd-0002-0000-0000-000000000002',
   'NEX-2026-002','2026-01-31','2026-03-02','paid',
   18000.00,20,3600.00,21600.00,
   'timesheet','2026-01-01','2026-01-31',
   '{"name":"NexDigital","siret":"12345678901234","address":"12 rue de la Paix, 75001 Paris"}'::jsonb,
   '{"name":"BNP Paribas","contact":"Marc Delaunay","email":"marc.delaunay@bnp.com"}'::jsonb,
   'Prestation janvier 2026 — Nexus v2',30),

  ('11111111-3333-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000001',
   'bbbbbbbb-0004-0000-0000-000000000004',
   'dddddddd-0001-0000-0000-000000000001',
   'NEX-2026-003','2026-02-28','2026-03-30','sent',
   42500.00,20,8500.00,51000.00,
   'timesheet','2026-02-01','2026-02-28',
   '{"name":"NexDigital","siret":"12345678901234","address":"12 rue de la Paix, 75001 Paris"}'::jsonb,
   '{"name":"Accenture","contact":"Thomas Bernard","email":"thomas.bernard@accenture.com"}'::jsonb,
   'Prestation février 2026 — Alpha CRM',30),

  ('11111111-4444-0000-0000-000000000004',
   'aaaaaaaa-0000-0000-0000-000000000001',
   null,
   'bbbbbbbb-0001-0000-0000-000000000001',
   'dddddddd-0003-0000-0000-000000000003',
   'NEX-2026-004','2026-02-28','2026-03-30','draft',
   23400.00,20,4680.00,28080.00,
   'timesheet','2026-02-01','2026-02-28',
   '{"name":"NexDigital","siret":"12345678901234","address":"12 rue de la Paix, 75001 Paris"}'::jsonb,
   '{"name":"ENGIE","contact":"Sophie Renard","email":"sophie.renard@engie.com"}'::jsonb,
   'Prestation février 2026 — DataLake Refonte — à valider',30)

on conflict (id) do nothing;

insert into invoice_lines (invoice_id, company_id, description, quantity, unit, unit_price) values
  ('11111111-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Alice Martin — Lead Developer — Alpha CRM',  20.0,'day',850.00),
  ('11111111-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Emma Petit — Backend Developer — Alpha CRM', 30.0,'day',700.00),
  ('11111111-2222-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Baptiste Leroi — Data Engineer — Nexus v2',  12.5,'day',720.00),
  ('11111111-2222-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','David Mora — DevOps Engineer — Nexus v2',    12.5,'day',720.00),
  ('11111111-3333-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Alice Martin — Lead Developer — Alpha CRM',  20.0,'day',850.00),
  ('11111111-3333-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Emma Petit — Backend Developer — Alpha CRM', 30.0,'day',700.00),
  ('11111111-4444-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','Alice Martin — DataLake Refonte — ENGIE',    10.0,'day',780.00),
  ('11111111-4444-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','Baptiste Leroi — Data Engineering — ENGIE',  20.0,'day',780.00)
on conflict do nothing;

-- ── Extra activity feed ──────────────────────────────────────
insert into activity_feed (company_id, type, message, read) values
  ('aaaaaaaa-0000-0000-0000-000000000001','milestone','Nexus v2 — livraison sprint 3 validée ✓',true),
  ('aaaaaaaa-0000-0000-0000-000000000001','alert',    'David Mora — contrat freelance expire dans 30j',false),
  ('aaaaaaaa-0000-0000-0000-000000000001','leave',    'Baptiste Leroi — RTT 20 fév approuvé',true),
  ('aaaaaaaa-0000-0000-0000-000000000001','alert',    'Audit Cyber SG — projet en pause, relance à confirmer',false),
  ('aaaaaaaa-0000-0000-0000-000000000001','milestone','Facture NEX-2026-001 payée — 51 000€ ✓',true),
  ('bbbbbbbb-1111-0000-0000-000000000002','alert',    'Nina Colas — taux d occupation > 90% ce mois',false),
  ('bbbbbbbb-1111-0000-0000-000000000002','leave',    'Antoine Lamy — retour prévu le 10 mars',false),
  ('bbbbbbbb-1111-0000-0000-000000000002','milestone','Identité BioNaturel — moodboard validé ✓',true),
  ('bbbbbbbb-1111-0000-0000-000000000002','alert',    'Comm Paris — livrable semaine 12 à anticiper',false)
on conflict do nothing;

-- ── Availability overrides ───────────────────────────────────
insert into availability_overrides (company_id, consultant_id, date, status, note) values
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','2026-03-14','leave','CP approuvé'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','2026-03-15','leave','CP approuvé'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','2026-03-16','leave','CP approuvé'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','2026-03-17','leave','CP approuvé'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','2026-03-18','leave','CP approuvé'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','2026-03-10','partial','Mi-temps DataLake'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0006-0000-0000-000000000006','2026-03-10','free','Retour congé'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','2026-03-15','busy','Brief client Decathlon')
on conflict do nothing;

-- ── TENANT C : demo solo (freelance solo mode) ─────────────────────────────
insert into companies (id, name, slug, mode, billing_settings) values (
  'cccccccc-2222-0000-0000-000000000003', 'Marc Dupont', 'marcdupont', 'solo',
  '{
    "siret": "98765432100012",
    "tva_number": "FR98765432100",
    "tva_rate": 20,
    "payment_terms": 30,
    "bank_iban": "FR76 9876 5432 1000 1234 5678 901",
    "bank_bic": "AGRIFRPPXXX",
    "bank_name": "Crédit Agricole",
    "legal_mention": "Auto-entrepreneur — dispensé d immatriculation au RCS",
    "invoice_prefix": "MD-2026-",
    "invoice_counter": 0
  }'::jsonb
) on conflict (id) do nothing;

insert into clients (id, company_id, name, sector, contact_name, contact_email) values
  ('ffffffff-0001-0000-0000-000000000001', 'cccccccc-2222-0000-0000-000000000003', 'Studio Pixel', 'Autre', 'Camille Roy', 'camille@studiopixel.fr'),
  ('ffffffff-0002-0000-0000-000000000002', 'cccccccc-2222-0000-0000-000000000003', 'Agence Tempo', 'Autre', 'Hugo Blanc',  'hugo@agencetempo.fr')
on conflict (id) do nothing;

insert into consultants (id, company_id, name, initials, email, role, avatar_color, status, stack, contract_type, salaire_annuel_brut, charges_pct, jours_travailles, tjm, tjm_facture, tjm_cible, leave_days_total, leave_days_taken, rtt_total, rtt_taken, occupancy_rate)
values ('dddddddd-3333-0000-0000-000000000001', 'cccccccc-2222-0000-0000-000000000003', 'Marc Dupont', 'MD', 'marc@marcdupont.fr', 'Developer', 'green', 'assigned',
  ARRAY['React','Next.js','Supabase'], 'freelance', null, 42, 218, 650, 650, 700, 0, 0, 0, 0, 80)
on conflict (id) do nothing;

insert into projects (id, company_id, client_id, client_name, name, status, tjm_vendu, jours_vendus)
values
  ('eeeeeeee-4444-0000-0000-000000000001', 'cccccccc-2222-0000-0000-000000000003', 'ffffffff-0001-0000-0000-000000000001', 'Studio Pixel', 'Site vitrine Studio Pixel', 'active', 650, 15),
  ('eeeeeeee-4444-0000-0000-000000000002', 'cccccccc-2222-0000-0000-000000000003', 'ffffffff-0002-0000-0000-000000000002', 'Agence Tempo',  'Intégration e-commerce Tempo', 'active', 700, 20)
on conflict (id) do nothing;

-- ── Sync consultants.team_id depuis team_members ────────────
-- Le trigger ne s'applique pas rétroactivement aux INSERT démo
update consultants c
set team_id = tm.team_id
from team_members tm
where tm.consultant_id = c.id;

-- ============================================================
-- 8. INIT COMPTES app_metadata
-- ============================================================
-- super_admin
update auth.users set raw_app_meta_data = '{"provider":"email","providers":["email"],"user_role":"super_admin"}'::jsonb where email = 'flux7art@gmail.com';

-- admins
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"aaaaaaaa-0000-0000-0000-000000000001","user_role":"admin"}'::jsonb where email = 'demo1@staff7.art';
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"bbbbbbbb-1111-0000-0000-000000000002","user_role":"admin"}'::jsonb where email = 'demo2@staff7.art';

-- ── managers ─────────────────────────────────────────────────────────────────
-- Alice Martin — manager NexDigital (Pôle Dev & Data)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"aaaaaaaa-0000-0000-0000-000000000001","user_role":"manager"}'::jsonb where email = 'flux7art+alice@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+alice@gmail.com') where id = 'cccccccc-0001-0000-0000-000000000001';

-- Sophie Durand — manager AgenceCreative (Équipe Créa)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"bbbbbbbb-1111-0000-0000-000000000002","user_role":"manager"}'::jsonb where email = 'flux7art+sophie@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+sophie@gmail.com') where id = 'eeeeeeee-0001-0000-0000-000000000001';

-- ── consultants ───────────────────────────────────────────────────────────────
-- NexDigital — Emma Petit (à créer : flux7art+emma@gmail.com)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"aaaaaaaa-0000-0000-0000-000000000001","user_role":"consultant"}'::jsonb where email = 'flux7art+emma@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+emma@gmail.com') where id = 'cccccccc-0005-0000-0000-000000000005'; -- Emma Petit

-- AgenceCreative — Tom Vasseur (à créer : flux7art+tom@gmail.com)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"bbbbbbbb-1111-0000-0000-000000000002","user_role":"consultant"}'::jsonb where email = 'flux7art+tom@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+tom@gmail.com') where id = 'eeeeeeee-0004-0000-0000-000000000004'; -- Tom Vasseur

-- ── freelance ────────────────────────────────────────────────────────────────
-- David Mora — freelance NexDigital
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"aaaaaaaa-0000-0000-0000-000000000001","user_role":"freelance"}'::jsonb where email = 'flux7art+david@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+david@gmail.com') where id = 'cccccccc-0004-0000-0000-000000000004';

-- ── solo ─────────────────────────────────────────────────────────────────────
-- Marc Dupont — admin solo
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"cccccccc-2222-0000-0000-000000000003","user_role":"admin"}'::jsonb where email = 'flux7art+marc@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+marc@gmail.com') where id = 'dddddddd-3333-0000-0000-000000000001';

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- select id, name from companies;
-- select name, company_id, status, tjm from consultants order by company_id;
-- select * from consultant_occupancy limit 5;
-- select * from project_financials order by company_id;
-- select * from timesheet_summary;
-- select * from invoice_list order by invoice_date desc;
-- select next_invoice_number('aaaaaaaa-0000-0000-0000-000000000001');
-- select email, raw_app_meta_data->>'user_role' as role from auth.users order by email;
-- select id, name, mode from companies;
-- select t.name as team, m.name as manager, count(tm.id) as membres from teams t left join consultants m on m.id = t.manager_id left join team_members tm on tm.team_id = t.id group by t.id, t.name, m.name;
--
-- Comptes de test :
--   super_admin  : flux7art@gmail.com
--   admin A      : demo1@staff7.art             (NexDigital)
--   admin B      : demo2@staff7.art             (AgenceCreative)
--   manager A    : flux7art+alice@gmail.com     (NexDigital  — Alice Martin, Pôle Dev & Data)
--   manager B    : flux7art+sophie@gmail.com    (AgenceCreative — Sophie Durand, Équipe Créa)
--   consultant A : flux7art+emma@gmail.com      (NexDigital  — Emma Petit)     ← à créer
--   consultant B : flux7art+tom@gmail.com       (AgenceCreative — Tom Vasseur) ← à créer
--   freelance    : flux7art+david@gmail.com     (NexDigital  — David Mora)
--   solo         : flux7art+marc@gmail.com      (Marc Dupont, mode solo)
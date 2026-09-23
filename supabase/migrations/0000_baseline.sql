-- ============================================================
-- STAFFD — Schéma de référence (init Supabase)
-- Version : 2026.09.23
-- ============================================================
-- Schéma SEUL. Les données vivent dans des seeds séparés :
--   supabase/seed.fixtures.sql          jeux d'essai (ESN, agence, solo) — préprod et local
--   supabase/seed.tenant.example.sql    gabarit d'un tenant réel
--   supabase/seed.*.local.sql           tenants réels, ignorés par git (dépôt public)
-- En local : `npx supabase db reset` applique ce fichier puis les seeds (config.toml).
-- En prod  : base NEUVE seulement — SQL Editor, ce fichier PUIS le seed voulu.
--            Base existante : appliquer les migrations 0008+ absentes de sa table
--            schema_migrations, JAMAIS ce fichier : il commence par un drop-all qui
--            efface toutes les données métier (auth.users préservés).
--
-- Migrations : fichiers numérotés à la suite de ce baseline (prochain : 0008).
-- Chacune est idempotente, reportée ici en parallèle, et se termine par
--   insert into schema_migrations (version) values ('00NN_nom') on conflict do nothing;
-- `select * from schema_migrations order by version` dit où en est une base.
-- 0001 à 0007 ont été fusionnés dans ce fichier le 2026.09.23 (toutes les bases
-- étaient à 0007) ; leur texte reste dans l'historique git.
--
-- Sections : 0. drops · 1. extensions · 2. tables (PSA) · 2b. facturation
--            2c. CRM avant-vente · 3. fonctions/triggers/RPC · 4. vues
--            5. RLS · 6. realtime · grants PostgREST
-- security_invoker = true sur toutes les vues (isolation RLS)
--
-- Journal
--   2026.09.23  fusion de 0001-0007 dans ce fichier ; table schema_migrations.
--   2026.09.23  is_super_admin() rend false au lieu de NULL (0007_super_admin_boolean.sql).
--   2026.09.23  CRA fiables : déclencheur timesheets_guard (plafond 1 j/jour, congés,
--               transitions, verrou des validés) + reopen_timesheets() (0006_cra_integrity.sql).
--   2026.09.23  grille par grade : table grades, consultants.grade_id, consultant_day_cost(),
--               vues de coût réécrites sur la fonction (0005_grade_grid.sql).
--   2026.09.23  projects.billing_mode, project_financials étendue (0004_mission_model.sql).
--   2026.09.23  win_opportunity() : affaire gagnée → projet (0003_win_opportunity.sql).
--   2026.09.23  consultants.is_founder + consultant_occupancy (0002_founder.sql).
--   2026.09.23  companies.branding (cf. migrations/0001_branding.sql). Les évolutions
--               passent désormais par des migrations numérotées ; ce fichier reste
--               l'init d'une base neuve et ne se rejoue pas sur des données réelles.
--   2026.09.22  module CRM intégré (contacts, framework_agreements, opportunities,
--               interactions, vue opportunity_pipeline, companies.crm_settings,
--               clients.client_type, projects.end_client_id / framework_agreement_id
--               / opportunity_id) ; données démo sorties vers seed.fixtures.sql
--   2026.06.24  grants PostgREST explicites
--   2026.06.23  audit RLS : invoices WITH CHECK, search_path figé (SECURITY DEFINER)
--   2026.03     projets internes, timesheets sem. courante, sync team_id
-- ============================================================

---0 Delete all
drop view if exists timesheet_summary      cascade;
drop view if exists project_financials     cascade;
drop view if exists consultants_with_leave cascade;
drop view if exists consultant_occupancy   cascade;
drop view if exists consultant_profitability cascade;
drop view if exists team_details            cascade;
drop view if exists opportunity_pipeline    cascade;

drop view  if exists invoice_list           cascade;
drop table if exists interactions           cascade;
drop table if exists opportunities          cascade;
drop table if exists framework_agreements   cascade;
drop table if exists contacts               cascade;
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
drop table if exists grades                 cascade;
drop table if exists clients                cascade;
drop table if exists companies              cascade;
drop table if exists schema_migrations      cascade;

drop function if exists timesheets_guard()                            cascade;
drop function if exists reopen_timesheets(uuid, date, date)           cascade;
drop function if exists consultant_day_cost(text, numeric, numeric, int, numeric, numeric, numeric, numeric) cascade;
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
drop function if exists merge_crm_settings(uuid, jsonb)             cascade;
drop function if exists win_opportunity(uuid)                       cascade;
-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Registre des migrations appliquées à cette base (cf. en-tête). RLS sans
-- politique : lisible par la clé service et le SQL Editor, pas par l'API.
create table if not exists schema_migrations (
  version    text primary key,
  applied_at timestamptz not null default now()
);
alter table schema_migrations enable row level security;
insert into schema_migrations (version) values ('0007_squashed_into_baseline') on conflict do nothing;

create table if not exists companies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text unique,
  mode             text not null default 'team' check (mode in ('solo','team')),
  billing_settings jsonb default '{}'::jsonb,  -- siret, tva, iban, mentions légales, préfixe
  ai_settings      jsonb default '{}'::jsonb,  -- ollama_endpoint, ollama_model, agents_enabled, mcp_tools
  hr_settings      jsonb default '{}'::jsonb,  -- country_code, default_cp, default_rtt, working_days, cra_deadline
  crm_settings     jsonb default '{}'::jsonb,  -- enabled, stages, deal_types, sources (cf. section 2c)
  branding         jsonb default '{}'::jsonb,  -- name, tagline, heading_font, dark/light color tokens (lib/branding.ts)
  -- Typage léger d'entité + hiérarchie opérationnelle (business units). PSA pur :
  -- pas de graphe de capital ici (ownership/dividendes vivront dans le cockpit groupe).
  entity_type       text not null default 'company' check (entity_type in ('company','holding','filiale','sasu')),
  parent_company_id uuid references companies(id) on delete set null,
  created_at        timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  sector text check (sector in ('ESN','Énergie','Finance','Industrie','Retail','Public','Autre')),
  website text, contact_name text, contact_email text, contact_phone text, notes text,
  -- Sur une mission vendue via une autre ESN, le client qui PAIE n'est pas le
  -- client qui REÇOIT. Sans cette distinction la facture part au mauvais nom et
  -- la marge ne voit pas la commission de l'intermédiaire.
  --   'final' : on facture directement · 'intermediary' : donneur d'ordre (ESN)
  --   'both'  : l'un ou l'autre selon l'affaire
  client_type text not null default 'final'
    check (client_type in ('final','intermediary','both')),
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- Grille par grade (0005) : hypothèses du plan d'affaires par grade
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
  -- Associé fondateur : affichage seulement, les coûts suivent contract_type
  is_founder boolean not null default false,
  -- Grade (0005) : même tenant garanti par la clé composite
  grade_id uuid,
  constraint consultants_grade_fk foreign key (company_id, grade_id)
    references grades(company_id, id) on delete set null (grade_id),
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
  client_id uuid references clients(id) on delete set null,          -- donneur d'ordre (celui qu'on facture)
  end_client_id uuid references clients(id) on delete set null,      -- client final, si différent
  framework_agreement_id uuid,  -- FK posée en 2c (table créée plus bas)
  opportunity_id uuid,          -- FK posée en 2c : l'affaire dont le projet est issu
  created_by uuid references auth.users(id),
  name text not null, client_name text,
  is_internal boolean not null default false,
  is_activity_type boolean not null default false,  -- types génériques CRA (Formation, Intercontrat…) — masqués dans /projects, gérés dans Settings/HR
  reference text, description text,
  start_date date, end_date date,
  progress int default 0 check (progress between 0 and 100),
  tjm_vendu numeric(10,2), jours_vendus int, budget_total numeric(10,2),
  -- 'regie' : TJM × jours · 'forfait' : budget_total (cf. 0004)
  billing_mode text not null default 'regie' check (billing_mode in ('regie','forfait')),
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
-- 2c. TABLES — CRM (avant-vente)
-- ============================================================
-- Livré à TOUS les tenants (les tables existent toujours), activé par tenant via
-- companies.crm_settings.enabled. On ne conditionne jamais l'existence du schéma,
-- seulement l'affichage. Vocabulaire propre au cabinet (étapes, types, sources)
-- dans crm_settings, pas dans une contrainte SQL :
-- {
--   "enabled": true,
--   "stages": [{"key":"qualification","label":"Qualification","probability":10,"order":1}, …],
--   "deal_types": ["regie","forfait","sourcing"],
--   "sources": ["reseau","appel_offres","partenaire_esn","entrant"]
-- }

-- ── contacts ────────────────────────────────────────────────────────────────
-- Plusieurs interlocuteurs par client. Sur un grand compte il y a au minimum
-- le sponsor technique, l'acheteur et le signataire, et ce ne sont pas les
-- mêmes personnes.
create table if not exists contacts (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  client_id    uuid not null references clients(id)   on delete cascade,
  name         text not null,
  title        text,                    -- fonction déclarée (DSI, acheteur, architecte…)
  email        text,
  phone        text,
  linkedin_url text,
  -- Rôle dans la décision, distinct du titre : c'est ce qui sert à l'avant-vente.
  buying_role  text check (buying_role in ('sponsor','decideur','acheteur','prescripteur','utilisateur')),
  is_primary   boolean not null default false,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── framework_agreements ────────────────────────────────────────────────────
-- Contrats-cadres et référencements. Sur grand compte, une mission dépend
-- presque toujours d'un référencement en cours de validité, avec sa grille
-- tarifaire négociée.
--
-- rate_card en jsonb assumé : à cette échelle la grille se lit en entier avec
-- le contrat. Si vous voulez un jour interroger « quel est notre tarif négocié
-- pour un architecte chez ce client », il faudra la promouvoir en table.
--   [{"profile":"Architecte","seniority":"senior","tjm":850},
--    {"profile":"Consultant","seniority":"confirme","tjm":650}]
create table if not exists framework_agreements (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  client_id    uuid not null references clients(id)   on delete cascade,
  reference    text,                    -- référence du contrat côté client
  name         text not null,
  start_date   date,
  end_date     date,                    -- l'échéance qu'on ne veut pas découvrir trop tard
  status       text not null default 'active'
               check (status in ('draft','active','expired','terminated')),
  rate_card    jsonb default '[]'::jsonb,
  payment_terms int,                    -- délai négocié, écrase celui du tenant
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── opportunities ───────────────────────────────────────────────────────────
-- L'affaire. Remplit la page `bids`, coquille vide depuis avril.
--
-- Deux champs d'état, volontairement séparés :
--   stage  = étape du pipeline, PARAMÉTRABLE par tenant (crm_settings.stages),
--            donc sans contrainte de vérification ici. Validée côté application.
--   status = issue, NON paramétrable, parce que le reporting, le passage en
--            projet et le taux de transformation en dépendent.
create table if not exists opportunities (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references companies(id) on delete cascade,

  -- ── Qui ───────────────────────────────────────────────────────────────────
  client_id              uuid not null references clients(id) on delete cascade,        -- donneur d'ordre, celui qu'on facturera
  end_client_id          uuid references clients(id) on delete set null,                -- client final si différent
  framework_agreement_id uuid references framework_agreements(id) on delete set null,
  contact_id             uuid references contacts(id) on delete set null,               -- interlocuteur principal
  owner_id               uuid references consultants(id) on delete set null,            -- l'associé qui porte l'affaire

  -- ── Quoi ──────────────────────────────────────────────────────────────────
  name                   text not null,
  description            text,
  deal_type              text not null default 'regie'
                         check (deal_type in ('regie','forfait','sourcing')),
  -- 'regie'    : vente de jours, le montant vient du TJM et du volume
  -- 'forfait'  : audit, architecture, cadrage — montant fixe et livrables
  -- 'sourcing' : une demande captée qu'on adresse avec un profil (sous-traitance)

  -- ── Combien ───────────────────────────────────────────────────────────────
  amount                 numeric(12,2),   -- montant total estimé, les deux types confondus
  tjm_vendu              numeric(10,2),   -- régie : tarif de vente
  tjm_achat              numeric(10,2),   -- sourcing : coût d'achat du profil sous-traité
  jours_estimes          int,
  probability            int default 0 check (probability between 0 and 100),
  weighted_amount        numeric(12,2) generated always as
                         (coalesce(amount, 0) * coalesce(probability, 0) / 100.0) stored,

  -- ── Où en est-on ──────────────────────────────────────────────────────────
  stage                  text not null,   -- clé libre, validée contre crm_settings.stages
  status                 text not null default 'open'
                         check (status in ('open','won','lost','abandoned')),
  source                 text,            -- vocabulaire libre, cf. crm_settings.sources
  expected_close_date    date,
  start_date             date,            -- démarrage souhaité par le client : c'est lui
                                          -- qu'on confronte aux disponibilités
  lost_reason            text,

  -- ── Ce que ça devient ─────────────────────────────────────────────────────
  -- La jointure qui justifie de mettre un CRM dans un PSA plutôt qu'à côté.
  project_id             uuid references projects(id) on delete set null,

  created_at             timestamptz default now(),
  updated_at             timestamptz default now(),

  -- Une affaire perdue doit dire pourquoi, sinon le pipeline n'apprend rien.
  constraint opportunities_lost_reason_check
    check (status <> 'lost' or lost_reason is not null)
);

-- FK différées des colonnes ajoutées à projects (les tables existent maintenant)
alter table projects drop constraint if exists projects_framework_agreement_id_fkey;
alter table projects add  constraint projects_framework_agreement_id_fkey
  foreign key (framework_agreement_id) references framework_agreements(id) on delete set null;
alter table projects drop constraint if exists projects_opportunity_id_fkey;
alter table projects add  constraint projects_opportunity_id_fkey
  foreign key (opportunity_id) references opportunities(id) on delete set null;

-- ── interactions ────────────────────────────────────────────────────────────
-- Le journal des échanges. À ne pas confondre avec activity_feed, qui est un
-- fil de notifications système écrit par les actions de l'application.
create table if not exists interactions (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  client_id      uuid references clients(id)       on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  contact_id     uuid references contacts(id)      on delete set null,
  consultant_id  uuid references consultants(id)   on delete set null,   -- qui a fait l'échange
  type           text not null check (type in ('appel','reunion','email','note','relance')),
  occurred_at    timestamptz not null default now(),
  summary        text not null,
  -- La relance : sans échéance ni responsable, un CRM n'est qu'un carnet.
  next_step      text,
  next_step_due  date,
  next_step_done boolean not null default false,
  created_at     timestamptz default now(),
  -- Un échange se rattache à quelque chose, sinon il est introuvable.
  constraint interactions_anchor_check
    check (client_id is not null or opportunity_id is not null)
);

-- Index : le pipeline se filtre en permanence par tenant, étape et échéance.
create index if not exists idx_contacts_company        on contacts(company_id);
create index if not exists idx_contacts_client         on contacts(client_id);
create index if not exists idx_framework_company       on framework_agreements(company_id);
create index if not exists idx_framework_client        on framework_agreements(client_id);
create index if not exists idx_opportunities_company   on opportunities(company_id);
create index if not exists idx_opportunities_status    on opportunities(company_id, status);
create index if not exists idx_opportunities_stage     on opportunities(company_id, stage);
create index if not exists idx_opportunities_close     on opportunities(company_id, expected_close_date);
create index if not exists idx_interactions_company    on interactions(company_id);
create index if not exists idx_interactions_opp        on interactions(opportunity_id);
create index if not exists idx_interactions_followup   on interactions(company_id, next_step_due) where next_step_done = false;

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

drop trigger if exists contacts_updated_at             on contacts;
drop trigger if exists framework_agreements_updated_at on framework_agreements;
drop trigger if exists opportunities_updated_at        on opportunities;

create trigger contacts_updated_at             before update on contacts             for each row execute function set_updated_at();
create trigger framework_agreements_updated_at before update on framework_agreements for each row execute function set_updated_at();
create trigger opportunities_updated_at        before update on opportunities        for each row execute function set_updated_at();
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
  -- coalesce : jamais NULL, sinon une négation neutralise le refus (0007)
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'super_admin', false);
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

-- ── Affaire gagnée → projet (atomique, SECURITY INVOKER) — cf. 0003
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

-- ── Merge partiel de crm_settings ───────────────────────────────────────────
-- Même motif que merge_billing_settings : le formulaire ne soumet qu'une partie
-- des clés, la fusion préserve les autres.
create or replace function merge_crm_settings(
  p_company_id uuid,
  p_patch      jsonb
) returns void language plpgsql as $$
begin
  update companies
  set crm_settings = coalesce(crm_settings, '{}'::jsonb) || p_patch
  where id = p_company_id;
end;
$$;

-- ── Auto-link solo consultant ────────────────────────────────────────────────
-- Quand un admin d'une company solo se connecte pour la première fois,
-- on cherche un consultant de sa company sans user_id et on le lie automatiquement.
-- Condition : company.mode = 'solo' AND role = 'admin' AND consultant.user_id IS NULL
create or replace function auto_link_solo_consultant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
  select mode into v_mode from public.companies where id = v_company_id;
  if v_mode <> 'solo' then
    return new;
  end if;

  -- Trouver le premier consultant sans user_id dans cette company
  select id into v_consultant
  from public.consultants
  where company_id = v_company_id
    and user_id is null
  order by created_at
  limit 1;

  if v_consultant is not null then
    update public.consultants
      set user_id = new.id
      where id = v_consultant;
  end if;

  return new;
end;
$$;

-- Trigger sur INSERT (nouveau compte) et UPDATE (mise à jour app_metadata)
create or replace trigger on_auth_user_solo_link
  after insert or update of raw_app_meta_data on auth.users
  for each row execute function auto_link_solo_consultant();

-- ── Helper : ids des consultants de l'équipe du manager connecté ────────────
-- Utilisé dans la RLS leave_requests pour scoper la vue manager à son équipe
create or replace function my_team_consultant_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select array(
    select tm.consultant_id
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where t.manager_id in (
      select id from public.consultants where user_id = auth.uid()
    )
  )
$$;

-- ── Trigger : sync consultants.team_id depuis team_members ──────────────────
-- Maintient une dénormalisation pour accès rapide sans jointure supplémentaire
create or replace function sync_consultant_team_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'insert' or tg_op = 'update' then
    update public.consultants set team_id = new.team_id where id = new.consultant_id;
    return new;
  elsif tg_op = 'delete' then
    update public.consultants set team_id = null where id = old.consultant_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger trg_sync_consultant_team_id
  after insert or update or delete on team_members
  for each row execute function sync_consultant_team_id();

-- ── CRA fiables (0006) : plafond journalier, transitions, verrou ────────────
create or replace function timesheets_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_backend boolean := coalesce(auth.jwt() ->> 'role', '') not in ('authenticated', 'anon');
  v_manager boolean := is_super_admin() or coalesce(my_role(), '') in ('admin', 'manager');
  v_reopen  boolean := coalesce(current_setting('staffd.cra_reopen', true), '') = 'on';
  v_total   numeric;
begin
  if v_backend then
    return coalesce(new, old);
  end if;

  -- ── Suppression ─────────────────────────────────────────────
  if tg_op = 'DELETE' then
    if old.status = 'approved' then
      raise exception 'CRA_LOCKED' using errcode = 'P0001';
    end if;
    return old;
  end if;

  -- ── Verrou des lignes validées ──────────────────────────────
  if tg_op = 'UPDATE' and old.status = 'approved' then
    if not (v_reopen and new.status = 'submitted'
            and new.date = old.date and new.project_id = old.project_id
            and new.consultant_id = old.consultant_id and new.value = old.value) then
      raise exception 'CRA_LOCKED' using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- ── Transitions de statut ───────────────────────────────────
  if not v_manager then
    if new.status not in ('draft', 'submitted') then
      raise exception 'CRA_STATUS_FORBIDDEN' using errcode = 'P0001';
    end if;
  end if;

  -- ── Plafond journalier et congés ────────────────────────────
  if tg_op = 'INSERT'
     or new.date is distinct from old.date
     or new.consultant_id is distinct from old.consultant_id
     or new.value is distinct from old.value then

    -- Sérialise les écritures concurrentes sur (consultant, date)
    perform pg_advisory_xact_lock(hashtextextended(new.consultant_id::text || new.date::text, 0));

    if coalesce(new.value, 0) > 0 and exists (
      select 1 from leave_requests l
       where l.consultant_id = new.consultant_id
         and l.status = 'approved'
         and new.date between l.start_date and l.end_date
    ) then
      raise exception 'CRA_ON_LEAVE' using errcode = 'P0001';
    end if;

    select coalesce(sum(t.value), 0) into v_total
      from timesheets t
     where t.consultant_id = new.consultant_id
       and t.date = new.date
       and t.id <> new.id;

    if v_total + coalesce(new.value, 0) > 1 then
      raise exception 'CRA_DAY_CAP' using errcode = 'P0001',
        detail = format('%s + %s > 1', v_total, coalesce(new.value, 0));
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists timesheets_guard on timesheets;
create trigger timesheets_guard
  before insert or update or delete on timesheets
  for each row execute function timesheets_guard();

-- ── Réouverture d'une période validée (admin) ──────────────────────────────
-- Repasse en 'submitted' les lignes validées du consultant sur [début, fin].
-- Refus si une facture non annulée, construite depuis les CRA, recouvre la
-- période pour ce consultant (facture nominative, ou facture de projet /
-- globale qui inclut ses lignes).
create or replace function reopen_timesheets(
  p_consultant_id uuid,
  p_start         date,
  p_end           date
) returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count int;
begin
  if not (is_super_admin() or coalesce(my_role(), '') = 'admin') then
    raise exception 'CRA_FORBIDDEN' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from invoices i
     where i.status <> 'cancelled'
       and i.source_type = 'timesheet'
       and i.source_period_start <= p_end
       and i.source_period_end   >= p_start
       and (i.consultant_id is null or i.consultant_id = p_consultant_id)
       and (i.project_id is null or i.project_id in (
             select t.project_id from timesheets t
              where t.consultant_id = p_consultant_id
                and t.status = 'approved'
                and t.date between p_start and p_end))
  ) then
    raise exception 'CRA_INVOICED' using errcode = 'P0001';
  end if;

  perform set_config('staffd.cra_reopen', 'on', true);
  update timesheets
     set status = 'submitted', updated_at = now()
   where consultant_id = p_consultant_id
     and status = 'approved'
     and date between p_start and p_end;
  get diagnostics v_count = row_count;
  perform set_config('staffd.cra_reopen', 'off', true);

  return v_count;
end;
$$;

grant execute on function reopen_timesheets(uuid, date, date) to authenticated, service_role;

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

create view consultants_with_leave with (security_invoker = true) as
select c.*,
  c.leave_days_total - c.leave_days_taken              as leave_days_left,
  coalesce(c.rtt_total, 0) - coalesce(c.rtt_taken, 0) as rtt_left
from consultants c;

create view project_financials with (security_invoker = true) as
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

-- Vue opportunity_pipeline — affaire enrichie (marge de sous-traitance, relances)
-- security_invoker = true, obligatoire : sans ça la vue contourne la RLS.
create view opportunity_pipeline with (security_invoker = true) as
select
  o.id,
  o.company_id,
  o.name,
  o.deal_type,
  o.stage,
  o.status,
  o.probability,
  o.amount,
  o.weighted_amount,
  o.tjm_vendu,
  o.tjm_achat,
  o.jours_estimes,
  -- Marge unitaire quand l'affaire est de la sous-traitance : c'est le chiffre
  -- qui manque partout ailleurs quand on vend via un intermédiaire.
  case when o.tjm_vendu is not null and o.tjm_achat is not null
       then o.tjm_vendu - o.tjm_achat end                       as marge_par_jour,
  case when o.tjm_vendu is not null and o.tjm_vendu > 0 and o.tjm_achat is not null
       then round((1 - o.tjm_achat / o.tjm_vendu) * 100, 1) end as marge_pct,
  o.expected_close_date,
  o.start_date,
  c.name  as client_name,
  c.client_type,
  ec.name as end_client_name,
  fa.name as framework_name,
  fa.end_date as framework_end_date,
  ct.name as contact_name,
  ow.name as owner_name,
  o.project_id,
  -- Dernier échange et prochaine relance due, pour trier ce qui dort.
  (select max(i.occurred_at)   from interactions i where i.opportunity_id = o.id) as last_interaction_at,
  (select min(i.next_step_due) from interactions i where i.opportunity_id = o.id and i.next_step_done = false) as next_followup_due
from opportunities o
left join clients             c  on c.id  = o.client_id
left join clients             ec on ec.id = o.end_client_id
left join framework_agreements fa on fa.id = o.framework_agreement_id
left join contacts            ct on ct.id = o.contact_id
left join consultants         ow on ow.id = o.owner_id;

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
  -- WITH CHECK : la branche freelance impose status='draft' pour empêcher
  -- l'auto-validation (passage à sent/paid). Les transitions restent admin/manager.
  with check (
    is_super_admin()
    or (company_id = my_company_id() and my_role() in ('admin','manager'))
    or (company_id = my_company_id() and my_role() = 'freelance' and status = 'draft'
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

-- ── CRM — lecture tenant pour contacts ; opportunities, interactions et
-- framework_agreements portent tarifs d'achat et marges : admin/manager seulement.
alter table contacts             enable row level security;
alter table framework_agreements enable row level security;
alter table opportunities        enable row level security;
alter table interactions         enable row level security;
alter table grades               enable row level security;

-- contacts
drop policy if exists "contacts_select" on contacts;
drop policy if exists "contacts_insert" on contacts;
drop policy if exists "contacts_update" on contacts;
drop policy if exists "contacts_delete" on contacts;
create policy "contacts_select" on contacts for select using (is_super_admin() or company_id = my_company_id());
create policy "contacts_insert" on contacts for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "contacts_update" on contacts for update using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "contacts_delete" on contacts for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));

-- framework_agreements — tarifs négociés : lecture admin et manager seulement
drop policy if exists "framework_agreements_select" on framework_agreements;
drop policy if exists "framework_agreements_insert" on framework_agreements;
drop policy if exists "framework_agreements_update" on framework_agreements;
drop policy if exists "framework_agreements_delete" on framework_agreements;
create policy "framework_agreements_select" on framework_agreements for select using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "framework_agreements_insert" on framework_agreements for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));
create policy "framework_agreements_update" on framework_agreements for update using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));
create policy "framework_agreements_delete" on framework_agreements for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));

-- opportunities — porte tjm_achat et la marge : admin et manager seulement
drop policy if exists "opportunities_select" on opportunities;
drop policy if exists "opportunities_insert" on opportunities;
drop policy if exists "opportunities_update" on opportunities;
drop policy if exists "opportunities_delete" on opportunities;
create policy "opportunities_select" on opportunities for select using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "opportunities_insert" on opportunities for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "opportunities_update" on opportunities for update using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "opportunities_delete" on opportunities for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));

-- interactions
drop policy if exists "interactions_select" on interactions;
drop policy if exists "interactions_insert" on interactions;
drop policy if exists "interactions_update" on interactions;
drop policy if exists "interactions_delete" on interactions;
create policy "interactions_select" on interactions for select using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "interactions_insert" on interactions for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "interactions_update" on interactions for update using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "interactions_delete" on interactions for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));

-- grades (0005) : lecture admin/manager (coûts), écriture admin
drop policy if exists "grades_select" on grades;
drop policy if exists "grades_insert" on grades;
drop policy if exists "grades_update" on grades;
drop policy if exists "grades_delete" on grades;
create policy "grades_select" on grades for select using (is_super_admin() or (company_id = my_company_id() and my_role() in ('admin','manager')));
create policy "grades_insert" on grades for insert with check (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));
create policy "grades_update" on grades for update using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'))
                                          with check (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));
create policy "grades_delete" on grades for delete using (is_super_admin() or (company_id = my_company_id() and my_role() = 'admin'));


-- ============================================================
-- 6. REALTIME
-- ============================================================
alter publication supabase_realtime add table leave_requests;
alter publication supabase_realtime add table timesheets;
alter publication supabase_realtime add table invoices;

-- ============================================================
-- GRANTS rôles PostgREST (privilèges de TABLE, distincts de la RLS)
-- ============================================================
-- Sans ces grants, anon/authenticated/service_role n'ont que les privilèges
-- par défaut (TRUNCATE/REFERENCES/TRIGGER) et l'API renvoie « permission denied ».
-- La RLS reste la barrière d'accès aux LIGNES ; ici ce sont les droits de table.
-- (Le dashboard Supabase les pose automatiquement ; un schéma appliqué en SQL brut
--  doit les déclarer explicitement.)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines  to anon, authenticated, service_role;
--   solo         : flux7art+marc@gmail.com      (Marc Dupont, mode solo)
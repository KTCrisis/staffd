-- ============================================================
-- STAFFD — Schéma Supabase
-- Coller dans : Supabase > SQL Editor > New query > Run
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- ── Consultants ──────────────────────────────────────────────
create table consultants (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  -- Identité
  name            text        not null,
  initials        text        not null,   -- ex: "AM"
  email           text        unique,
  role            text        not null,   -- ex: "Data Engineer"
  avatar_color    text        default 'green',  -- green | pink | cyan | gold | purple

  -- Stack technique (tableau de tags)
  stack           text[]      default '{}',  -- ['Kafka', 'Python', 'MCP']

  -- Statut
  status          text        not null default 'available'
                  check (status in ('assigned', 'available', 'leave', 'partial')),

  -- Financier (confidentiel — visible admins seulement)
  tjm             numeric(8,2),           -- Taux Journalier Moyen en €

  -- Congés
  leave_days_total   int     default 25,  -- CP annuels
  leave_days_taken   int     default 0,   -- CP posés

  -- Occupation
  occupancy_rate  int         default 0   -- 0-100%
);

-- ── Projets ──────────────────────────────────────────────────
create table projects (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  -- Identité
  name            text        not null,
  client          text        not null,
  description     text,

  -- Dates
  start_date      date,
  end_date        date        not null,

  -- Avancement
  progress        int         default 0   check (progress between 0 and 100),
  status          text        not null    default 'starting'
                  check (status in ('starting', 'active', 'done', 'archived')),

  -- Financier
  tjm_vendu       numeric(8,2),           -- TJM négocié avec le client
  jours_vendus    int,                    -- Nombre de jours vendus au client

  -- TJM réel calculé automatiquement (voir fonction plus bas)
  -- tjm_reel = moyenne pondérée des TJM des consultants assignés
  -- marge_brute = (tjm_vendu - tjm_reel) * jours_vendus
  tjm_reel        numeric(8,2)            -- mis à jour par trigger
);

-- ── Assignments (consultant ↔ projet) ────────────────────────
create table assignments (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),

  consultant_id   uuid        not null references consultants(id) on delete cascade,
  project_id      uuid        not null references projects(id)    on delete cascade,

  -- Taux d'implication sur ce projet
  allocation      int         default 100  check (allocation between 1 and 100),  -- % du temps

  start_date      date,
  end_date        date,

  unique (consultant_id, project_id)
);

-- ── Congés ───────────────────────────────────────────────────
create table leave_requests (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  consultant_id   uuid        not null references consultants(id) on delete cascade,

  type            text        not null
                  check (type in ('CP', 'RTT', 'Sans solde', 'Maladie', 'Autre')),

  start_date      date        not null,
  end_date        date        not null,
  days            int         not null,

  status          text        not null default 'pending'
                  check (status in ('pending', 'approved', 'refused')),

  -- Contexte
  comment         text,
  impact_warning  text,       -- ex: "Projet DataLake affecté"

  -- Qui a validé / refusé
  reviewed_by     uuid        references auth.users(id),
  reviewed_at     timestamptz
);

-- ── Disponibilités (overrides manuels) ───────────────────────
-- Les dispos sont calculées dynamiquement depuis assignments + leave_requests
-- Cette table stocke les overrides manuels (bloquer un créneau, etc.)
create table availability_overrides (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),

  consultant_id   uuid        not null references consultants(id) on delete cascade,
  date            date        not null,

  status          text        not null
                  check (status in ('blocked', 'free', 'partial')),

  note            text,

  unique (consultant_id, date)
);

-- ── Activité (feed dashboard) ────────────────────────────────
create table activity_feed (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),

  type            text        not null
                  check (type in ('leave', 'assignment', 'milestone', 'alert')),

  message         text        not null,
  consultant_id   uuid        references consultants(id),
  project_id      uuid        references projects(id),
  read            boolean     default false
);

-- ============================================================
-- INDEXES (performance)
-- ============================================================

create index on assignments      (consultant_id);
create index on assignments      (project_id);
create index on leave_requests   (consultant_id);
create index on leave_requests   (status);
create index on leave_requests   (start_date, end_date);
create index on activity_feed    (created_at desc);
create index on availability_overrides (consultant_id, date);

-- ============================================================
-- VUES UTILES
-- ============================================================

-- Vue : consultants avec CP restants calculés
create or replace view consultants_with_leave as
select
  c.*,
  c.leave_days_total - c.leave_days_taken as leave_days_left
from consultants c;

-- Vue : TJM réel par projet (moyenne pondérée des TJM des consultants assignés)
create or replace view project_financials as
select
  p.id,
  p.name,
  p.client,
  p.tjm_vendu,
  p.jours_vendus,
  round(avg(c.tjm), 2)                            as tjm_reel,
  round(p.tjm_vendu - avg(c.tjm), 2)              as marge_par_jour,
  round((p.tjm_vendu - avg(c.tjm)) * p.jours_vendus, 2) as marge_brute_totale,
  round((p.tjm_vendu - avg(c.tjm)) / nullif(p.tjm_vendu, 0) * 100, 1) as marge_pct,
  count(a.consultant_id)                          as team_size
from projects p
left join assignments a  on a.project_id   = p.id
left join consultants c  on c.id           = a.consultant_id
group by p.id, p.name, p.client, p.tjm_vendu, p.jours_vendus;

-- Vue : taux d'occupation par consultant (basé sur les assignments actifs)
create or replace view consultant_occupancy as
select
  c.id,
  c.name,
  c.role,
  c.tjm,
  coalesce(sum(a.allocation), 0)                  as occupancy_rate,
  array_agg(p.name) filter (where p.name is not null) as project_names
from consultants c
left join assignments a on a.consultant_id = c.id
  and (a.end_date is null or a.end_date >= current_date)
  and (a.start_date is null or a.start_date <= current_date)
left join projects p    on p.id = a.project_id
group by c.id, c.name, c.role, c.tjm;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Activer RLS sur toutes les tables
alter table consultants              enable row level security;
alter table projects                 enable row level security;
alter table assignments              enable row level security;
alter table leave_requests           enable row level security;
alter table availability_overrides   enable row level security;
alter table activity_feed            enable row level security;

-- ── Policies : accès authentifié uniquement ──────────────────

-- Consultants : tout le monde authentifié peut lire
create policy "consultants_read"
  on consultants for select
  to authenticated
  using (true);

-- Consultants : seuls les admins peuvent modifier
-- (on utilisera les metadata de auth.users pour stocker le rôle)
create policy "consultants_write"
  on consultants for all
  to authenticated
  using (
    (auth.jwt() ->> 'user_role') in ('admin', 'manager')
  );

-- Projets : lecture pour tous les authentifiés
create policy "projects_read"
  on projects for select
  to authenticated
  using (true);

create policy "projects_write"
  on projects for all
  to authenticated
  using (
    (auth.jwt() ->> 'user_role') in ('admin', 'manager')
  );

-- Assignments : lecture pour tous
create policy "assignments_read"
  on assignments for select
  to authenticated
  using (true);

create policy "assignments_write"
  on assignments for all
  to authenticated
  using (
    (auth.jwt() ->> 'user_role') in ('admin', 'manager')
  );

-- Congés : lecture pour tous, écriture par le consultant concerné ou un manager
create policy "leave_requests_read"
  on leave_requests for select
  to authenticated
  using (true);

create policy "leave_requests_insert"
  on leave_requests for insert
  to authenticated
  with check (true);  -- à affiner quand l'auth consultant sera liée

create policy "leave_requests_update"
  on leave_requests for update
  to authenticated
  using (
    (auth.jwt() ->> 'user_role') in ('admin', 'manager')
  );

-- Activity feed : lecture pour tous
create policy "activity_read"
  on activity_feed for select
  to authenticated
  using (true);

-- Availability overrides : lecture pour tous, écriture managers+
create policy "availability_read"
  on availability_overrides for select
  to authenticated
  using (true);

create policy "availability_write"
  on availability_overrides for all
  to authenticated
  using (
    (auth.jwt() ->> 'user_role') in ('admin', 'manager')
  );

-- ============================================================
-- DONNÉES DE DÉMO (optionnel — à supprimer en prod)
-- ============================================================

insert into consultants (name, initials, email, role, avatar_color, stack, status, tjm, occupancy_rate) values
  ('Alice Martin',  'AM', 'alice@staffd.io',   'Data Engineer',       'green',  '{"Kafka","Python","Spark"}',    'assigned',  650, 100),
  ('Baptiste Leroy','BL', 'baptiste@staffd.io', 'Backend Developer',   'cyan',   '{"FastAPI","Python","Docker"}', 'assigned',  600, 80),
  ('Clara Kim',     'CK', 'clara@staffd.io',    'ML Engineer',         'pink',   '{"PyTorch","Ollama","Python"}', 'leave',     700, 0),
  ('David Mora',    'DM', 'david@staffd.io',    'DevOps / Infra',      'gold',   '{"K8s","Terraform","GCP"}',    'partial',   620, 50),
  ('Emma Petit',    'EP', 'emma@staffd.io',     'Data Analyst',        'purple', '{"Python","dbt","Looker"}',    'assigned',  580, 100);

-- Projets avec données financières
insert into projects (name, client, start_date, end_date, progress, status, tjm_vendu, jours_vendus) values
  ('Alpha CRM',       'Accenture',        '2026-01-05', '2026-04-15', 72, 'active',   750, 80),
  ('Nexus v2',        'BNP Paribas',      '2026-02-01', '2026-06-30', 38, 'active',   800, 60),
  ('DataLake Refonte','Engie',            '2026-01-15', '2026-05-20', 51, 'active',   720, 90),
  ('Infra K8s',       'Société Générale', '2026-03-01', '2026-08-31', 5,  'starting', 680, 45);

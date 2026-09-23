-- ============================================================
-- Amorce du registre des migrations sur une base EXISTANTE
-- ============================================================
-- À passer une fois dans le SQL Editor d'une base déjà à 0007 (préprod,
-- cabinet au 2026.09.23). Une base neuve n'en a pas besoin : le baseline
-- crée la table et y inscrit la même ligne. Idempotent.
-- ============================================================

create table if not exists schema_migrations (
  version    text primary key,
  applied_at timestamptz not null default now()
);
alter table schema_migrations enable row level security;
insert into schema_migrations (version) values ('0007_squashed_into_baseline') on conflict do nothing;

select * from schema_migrations order by version;

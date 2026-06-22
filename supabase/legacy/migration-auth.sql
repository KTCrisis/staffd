-- ============================================================
-- STAFFD — Migration Auth
-- Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Lier un consultant à son compte Supabase Auth
alter table consultants
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_consultants_user_id on consultants (user_id);

-- 2. Vue pour récupérer le rôle de l'utilisateur connecté
create or replace view my_profile as
select
  c.*,
  (auth.jwt() ->> 'user_role') as role
from consultants c
where c.user_id = auth.uid();

-- 3. RLS : un consultant ne voit que sa propre fiche
-- (en plus des policies existantes)
create policy "consultant_own_profile"
  on consultants for select
  to authenticated
  using (
    -- Admin et manager voient tout
    (auth.jwt() ->> 'user_role') in ('admin', 'manager')
    or
    -- Consultant ne voit que sa fiche
    user_id = auth.uid()
  );

-- Supprimer l'ancienne policy de lecture trop permissive
drop policy if exists "consultants_read" on consultants;

-- 4. Leave requests : consultant ne voit que les siennes
drop policy if exists "leave_requests_read" on leave_requests;

create policy "leave_requests_read"
  on leave_requests for select
  to authenticated
  using (
    (auth.jwt() ->> 'user_role') in ('admin', 'manager')
    or
    consultant_id = (
      select id from consultants where user_id = auth.uid() limit 1
    )
  );

-- 5. Fonction pour récupérer le rôle facilement
create or replace function get_my_role()
returns text as $$
  select coalesce(auth.jwt() ->> 'user_role', 'viewer')
$$ language sql stable;

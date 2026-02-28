-- ============================================================
-- STAFFD — Migration Auth
-- ============================================================

-- 1. Lier un consultant à son compte Supabase Auth
alter table consultants
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_consultants_user_id on consultants (user_id);

-- 2. Vue corrigée — renommer le rôle auth en "user_role"
create or replace view my_profile as
select
  c.*,
  (auth.jwt() ->> 'user_role') as user_role
from consultants c
where c.user_id = auth.uid();

-- 3. RLS : un consultant ne voit que sa propre fiche
create policy "consultant_own_profile"
  on consultants for select
  to authenticated
  using (
    (auth.jwt() ->> 'user_role') in ('admin', 'manager')
    or
    user_id = auth.uid()
  );

-- Supprimer l'ancienne policy trop permissive
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

-- 5. Fonction utilitaire
create or replace function get_my_role()
returns text as $$
  select coalesce(auth.jwt() ->> 'user_role', 'viewer')
$$ language sql stable;
-- ============================================================
-- STAFFD — Migration rôles : user_metadata → app_metadata
-- Supabase > SQL Editor > New query > Run
-- ============================================================
-- app_metadata est signé et NON modifiable par l'utilisateur
-- (contrairement à user_metadata qui est accessible en écriture via l'API client)

-- 1. Migrer les rôles existants vers app_metadata
update auth.users
set raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
  'user_role', raw_user_meta_data ->> 'user_role'
)
where raw_user_meta_data ->> 'user_role' is not null;

-- 2. Vérifier la migration
select id, email,
  raw_app_meta_data ->> 'user_role' as role_app_metadata,
  raw_user_meta_data ->> 'user_role' as role_user_metadata
from auth.users
where raw_user_meta_data ->> 'user_role' is not null;

-- 3. Nettoyer user_metadata (optionnel, après vérification)
-- update auth.users
-- set raw_user_meta_data = raw_user_meta_data - 'user_role'
-- where raw_user_meta_data ->> 'user_role' is not null;

-- ── Assigner un rôle admin (à l'avenir, toujours utiliser app_metadata) ──
-- update auth.users
-- set raw_app_meta_data = raw_app_meta_data || '{"user_role": "admin"}'
-- where email = 'votre@email.com';

-- ── Fix RLS : leave_requests_insert trop permissif ──────────────

drop policy if exists "leave_requests_insert" on leave_requests;

create policy "leave_requests_insert"
  on leave_requests for insert
  to authenticated
  with check (
    -- Admin et manager peuvent créer pour n'importe quel consultant
    (auth.jwt() ->> 'user_role') in ('admin', 'manager')
    or
    -- Un consultant ne peut créer que pour lui-même
    consultant_id = (
      select id from consultants
      where user_id = auth.uid()
      limit 1
    )
  );
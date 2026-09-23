-- ============================================================
-- 0007 — is_super_admin() rend un booléen, jamais NULL
-- ============================================================
-- Sans user_role dans le JWT (clé service, compte sans rôle), l'égalité
-- valait NULL. Dans une politique RLS « is_super_admin() or … », NULL se
-- comporte comme false : aucun effet. Mais sous une négation
-- (« if not (is_super_admin() or …) » dans reopen_timesheets, « if not
-- v_manager » dans timesheets_guard, 0006), NULL neutralisait le refus :
-- un compte sans rôle pouvait créer une ligne de CRA déjà validée.
-- ============================================================

create or replace function is_super_admin() returns boolean as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'super_admin', false);
$$ language sql stable;

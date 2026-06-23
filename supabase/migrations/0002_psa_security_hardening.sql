-- 0002_psa_security_hardening.sql
-- Durcissement sécurité PSA (audit 2026-06-23, paquet A). Aucun changement de
-- modèle de données : on redéfinit une policy et trois fonctions existantes.
--
-- Indépendant de 0001 (squelette de groupe, non appliqué) : ne touche que des
-- objets de 0000_baseline. Idempotent (drop policy if exists + create or replace).

-- ──────────────────────────────────────────────────────────────
-- #6 — Un freelance ne peut plus auto-valider ses factures
-- ──────────────────────────────────────────────────────────────
-- Le WITH CHECK d'origine omettait status='draft' sur la branche freelance :
-- il pouvait sélectionner une facture draft (USING) puis la repasser en
-- 'sent'/'paid' (WITH CHECK acceptait tout statut). On reverrouille : un
-- freelance ne peut écrire que des factures qui RESTENT en draft. Les
-- transitions de statut redeviennent réservées à admin/manager.
drop policy if exists "invoices_update" on invoices;
create policy "invoices_update" on invoices for update
  using (
    is_super_admin()
    or (company_id = my_company_id() and my_role() in ('admin','manager'))
    or (company_id = my_company_id() and my_role() = 'freelance' and status = 'draft'
        and consultant_id in (select id from consultants where user_id = auth.uid()))
  )
  with check (
    is_super_admin()
    or (company_id = my_company_id() and my_role() in ('admin','manager'))
    or (company_id = my_company_id() and my_role() = 'freelance' and status = 'draft'
        and consultant_id in (select id from consultants where user_id = auth.uid()))
  );

-- ──────────────────────────────────────────────────────────────
-- #8 — search_path figé sur les fonctions SECURITY DEFINER
-- ──────────────────────────────────────────────────────────────
-- Une fonction SECURITY DEFINER s'exécute avec les droits du propriétaire et
-- bypasse la RLS. Sans search_path figé, un objet placé dans un schéma
-- prioritaire peut détourner la résolution des tables. On fige search_path = ''
-- et on qualifie tout en public.* (recommandation Supabase).

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
  v_role       := new.raw_app_meta_data ->> 'user_role';
  v_company_id := (new.raw_app_meta_data ->> 'company_id')::uuid;

  if v_role <> 'admin' or v_company_id is null then
    return new;
  end if;

  select mode into v_mode from public.companies where id = v_company_id;
  if v_mode <> 'solo' then
    return new;
  end if;

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

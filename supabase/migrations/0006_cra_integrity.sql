-- ============================================================
-- 0006 — CRA fiables : plafond journalier, transitions, verrou
-- ============================================================
-- Trois garanties portées par la base, pas seulement par l'écran :
--
-- 1. Plafond : la somme des CRA d'un consultant sur une date ne dépasse pas
--    1 jour (projets internes compris), et aucun CRA sur un jour de congé
--    approuvé (congés en jours entiers). Contrôlé seulement quand la date,
--    le consultant ou la valeur changent : soumettre ou valider une ligne
--    existante ne relit pas le plafond.
-- 2. Transitions : un consultant ou un freelance n'écrit que des brouillons
--    et les soumet ; seuls admin et manager valident. La politique
--    timesheets_update laissait un consultant passer sa ligne de 'draft' à
--    'approved' (WITH CHECK sans condition de statut).
-- 3. Verrou : une ligne validée ne change plus (date, projet, valeur,
--    consultant) et ne se supprime pas. Pour la corriger, un admin la
--    rouvre avec reopen_timesheets(), qui refuse si une facture non annulée
--    issue des CRA couvre déjà la période.
--
-- Les erreurs portent un code stable (CRA_DAY_CAP, CRA_ON_LEAVE,
-- CRA_STATUS_FORBIDDEN, CRA_LOCKED, CRA_INVOICED, CRA_FORBIDDEN) que
-- l'interface traduit.
-- Les écritures du backend (service_role, psql : pas de JWT utilisateur)
-- ne sont pas bridées : seeds, reprises de données.
-- ============================================================

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

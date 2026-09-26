-- ============================================================
-- 0012 — Congés : statut tenu par la base, soldes tenus par la base, index
-- ============================================================
-- Avant :
--   · la politique leave_requests_insert laissait un consultant insérer sa
--     propre demande avec n'importe quel statut : un POST direct à l'API
--     créait un congé « approved » sans passer par un manager ;
--   · les soldes (leave_days_taken, rtt_taken) étaient incrémentés par
--     l'application après l'approbation, en deux appels non atomiques :
--     l'approbation par l'agent IA ne décomptait rien, un refus ou une
--     suppression après approbation ne rendait rien ;
--   · le réglage hr_settings.leave_auto_approve n'était lu nulle part ;
--   · aucune clé étrangère n'était indexée, y compris company_id et
--     consultants.user_id que chaque politique RLS évalue.
--
-- Après :
--   · leave_requests_guard (BEFORE INSERT) : hors admin, manager et backend,
--     une demande naît « pending ». Si le tenant a leave_auto_approve, une
--     demande CP ou RTT couverte par le solde naît « approved » ;
--   · leave_requests_balance (AFTER) : toute entrée ou sortie de l'état
--     « approved » ajuste le solde, quel que soit le chemin (UI, IA, SQL) ;
--   · increment_leave_taken / increment_rtt_taken supprimées : appliquer
--     cette migration AVANT de déployer l'application qui ne les appelle
--     plus. L'ancienne application les appelle encore, l'erreur est ignorée
--     côté client et le déclencheur a déjà compté : pas de double décompte.
--   · Les soldes existants ne sont pas recalculés : seules les transitions
--     postérieures à la migration comptent.
-- ============================================================

-- ── Statut à la création ────────────────────────────────────────────────────
create or replace function leave_requests_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_backend boolean := coalesce(auth.jwt() ->> 'role', '') not in ('authenticated', 'anon');
  v_manager boolean := is_super_admin() or coalesce(my_role(), '') in ('admin', 'manager');
  v_auto    boolean;
  v_left    numeric;
begin
  if v_backend or v_manager then
    return new;
  end if;

  if new.end_date < new.start_date or coalesce(new.days, 0) <= 0 then
    raise exception 'LEAVE_INVALID_PERIOD' using errcode = 'P0001';
  end if;

  new.status      := 'pending';
  new.reviewed_at := null;

  select coalesce((hr_settings ->> 'leave_auto_approve')::boolean, false)
    into v_auto
    from companies where id = new.company_id;

  if v_auto and new.type in ('CP', 'RTT') then
    -- Verrou de la fiche : deux demandes simultanées ne consomment pas le même solde
    select case when new.type = 'CP'
                then coalesce(leave_days_total, 0) - coalesce(leave_days_taken, 0)
                else coalesce(rtt_total, 0) - coalesce(rtt_taken, 0) end
      into v_left
      from consultants where id = new.consultant_id
       for update;

    if v_left >= new.days then
      new.status      := 'approved';
      new.reviewed_at := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists leave_requests_guard on leave_requests;
create trigger leave_requests_guard
  before insert on leave_requests
  for each row execute function leave_requests_guard();

-- ── Soldes : suivent l'état « approved », quel que soit le chemin ──────────
create or replace function leave_requests_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Retirer l'ancienne contribution
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'approved' then
    update consultants
       set leave_days_taken = leave_days_taken - case when old.type = 'CP'  then old.days else 0 end,
           rtt_taken        = rtt_taken        - case when old.type = 'RTT' then old.days else 0 end
     where id = old.consultant_id
       and old.type in ('CP', 'RTT');
  end if;

  -- Ajouter la nouvelle
  if tg_op in ('INSERT', 'UPDATE') and new.status = 'approved' then
    update consultants
       set leave_days_taken = leave_days_taken + case when new.type = 'CP'  then new.days else 0 end,
           rtt_taken        = rtt_taken        + case when new.type = 'RTT' then new.days else 0 end
     where id = new.consultant_id
       and new.type in ('CP', 'RTT');
  end if;

  return null;
end;
$$;

drop trigger if exists leave_requests_balance on leave_requests;
create trigger leave_requests_balance
  after insert or update or delete on leave_requests
  for each row execute function leave_requests_balance();

drop function if exists increment_leave_taken(uuid, int);
drop function if exists increment_rtt_taken(uuid, int);

-- ── Index des clés étrangères (jointures, cascades, filtres RLS) ────────────
create index if not exists idx_companies_parent_company_id        on companies (parent_company_id);
create index if not exists idx_clients_company_id                 on clients (company_id);
create index if not exists idx_consultants_company_id             on consultants (company_id);
create index if not exists idx_consultants_team_id                on consultants (team_id);
create index if not exists idx_consultants_user_id                on consultants (user_id);
create index if not exists idx_teams_company_id                   on teams (company_id);
create index if not exists idx_teams_manager_id                   on teams (manager_id);
create index if not exists idx_team_members_team_id               on team_members (team_id);
create index if not exists idx_projects_company_id                on projects (company_id);
create index if not exists idx_projects_client_id                 on projects (client_id);
create index if not exists idx_projects_created_by                on projects (created_by);
create index if not exists idx_projects_end_client_id             on projects (end_client_id);
create index if not exists idx_projects_framework_agreement_id    on projects (framework_agreement_id);
create index if not exists idx_projects_opportunity_id            on projects (opportunity_id);
create index if not exists idx_assignments_company_id             on assignments (company_id);
create index if not exists idx_assignments_consultant_id          on assignments (consultant_id);
create index if not exists idx_assignments_project_id             on assignments (project_id);
create index if not exists idx_leave_requests_company_id          on leave_requests (company_id);
create index if not exists idx_leave_requests_consultant_id       on leave_requests (consultant_id);
create index if not exists idx_availability_overrides_company_id  on availability_overrides (company_id);
create index if not exists idx_availability_overrides_consultant_id on availability_overrides (consultant_id);
create index if not exists idx_activity_feed_company_id           on activity_feed (company_id);
create index if not exists idx_timesheets_company_id              on timesheets (company_id);
create index if not exists idx_timesheets_project_id              on timesheets (project_id);
create index if not exists idx_invoices_client_id                 on invoices (client_id);
create index if not exists idx_invoices_consultant_id             on invoices (consultant_id);
create index if not exists idx_invoices_project_id                on invoices (project_id);
create index if not exists idx_invoice_lines_company_id           on invoice_lines (company_id);
create index if not exists idx_invoice_lines_invoice_id           on invoice_lines (invoice_id);
create index if not exists idx_opportunities_client_id            on opportunities (client_id);
create index if not exists idx_opportunities_contact_id           on opportunities (contact_id);
create index if not exists idx_opportunities_end_client_id        on opportunities (end_client_id);
create index if not exists idx_opportunities_framework_agreement_id on opportunities (framework_agreement_id);
create index if not exists idx_opportunities_owner_id             on opportunities (owner_id);
create index if not exists idx_opportunities_project_id           on opportunities (project_id);
create index if not exists idx_interactions_client_id             on interactions (client_id);
create index if not exists idx_interactions_consultant_id         on interactions (consultant_id);
create index if not exists idx_interactions_contact_id            on interactions (contact_id);

insert into schema_migrations (version) values ('0012_leave_guard') on conflict do nothing;

-- ============================================================
-- 0003 — Affaire gagnée → projet (atomique)
-- ============================================================
-- win_opportunity(id) passe l'affaire en « gagnée » (probabilité 100) et,
-- si elle n'a pas encore de projet, crée le projet correspondant puis lie les
-- deux (opportunities.project_id ↔ projects.opportunity_id), dans une seule
-- transaction : pas de projet orphelin, pas de doublon si l'on reclique.
--
-- SECURITY INVOKER : la RLS de l'appelant s'applique (admin/manager du tenant
-- pour opportunities et projects). Aucun privilège ajouté.
-- Retourne l'id du projet (existant ou créé).
-- ============================================================

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
      start_date, tjm_vendu, jours_vendus, budget_total, status
    ) values (
      o.company_id, o.client_id, o.end_client_id, o.id, auth.uid(),
      o.name, coalesce(v_client, o.name), o.description,
      o.start_date, o.tjm_vendu, o.jours_estimes,
      case when o.deal_type = 'forfait' then o.amount end,
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

grant execute on function win_opportunity(uuid) to authenticated, service_role;

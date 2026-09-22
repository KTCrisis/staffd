-- ============================================================
-- 0002 — Marqueur « fondateur » sur la fiche consultant
-- ============================================================
-- Un associé facturé via sa propre société se comporte, pour les coûts,
-- exactement comme un freelance (coût = tjm_facture). Le type de contrat reste
-- donc 'freelance' et pilote tous les calculs ; is_founder ne change que
-- l'affichage (badge « Fondateur » / « Founder »).
-- La vue consultant_occupancy l'expose en DERNIÈRE colonne : create or replace
-- view n'accepte d'ajouter des colonnes qu'en fin de liste.
-- ============================================================

alter table consultants add column if not exists is_founder boolean not null default false;

create or replace view consultant_occupancy with (security_invoker = true) as
select
  c.id, c.company_id, c.user_id, c.name, c.initials, c.email, c.role,
  c.avatar_color, c.stack, c.status, c.team_id,
  -- Contrat & coût
  c.contract_type, c.tjm, c.tjm_facture, c.tjm_cible,
  c.salaire_annuel_brut, c.charges_pct, c.jours_travailles,
  -- tjm_cout_reel calculé selon le type de contrat
  case
    when c.contract_type = 'employee' and c.salaire_annuel_brut is not null
    then round(c.salaire_annuel_brut * (1 + c.charges_pct / 100.0) / c.jours_travailles, 2)
    when c.contract_type = 'freelance'
    then coalesce(c.tjm_facture, c.tjm)
    else c.tjm
  end as tjm_cout_reel,
  -- Congés
  c.leave_days_total, c.leave_days_taken,
  c.leave_days_total - c.leave_days_taken              as leave_days_left,
  c.rtt_total, c.rtt_taken,
  coalesce(c.rtt_total, 0) - coalesce(c.rtt_taken, 0) as rtt_left,
  coalesce(sum(a.allocation), 0)                       as occupancy_rate,
  array_agg(p.name) filter (where p.name is not null)  as project_names,
  c.is_founder
from consultants c
left join assignments a on a.consultant_id = c.id
  and (a.end_date is null or a.end_date >= current_date)
  and (a.start_date is null or a.start_date <= current_date)
left join projects p on p.id = a.project_id
group by c.id, c.company_id, c.user_id, c.name, c.initials, c.email, c.role,
  c.avatar_color, c.stack, c.status, c.team_id,
  c.contract_type, c.tjm, c.tjm_facture, c.tjm_cible,
  c.salaire_annuel_brut, c.charges_pct, c.jours_travailles,
  c.leave_days_total, c.leave_days_taken, c.rtt_total, c.rtt_taken, c.is_founder;

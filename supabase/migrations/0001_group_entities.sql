-- 0001_group_entities.sql
-- Phase 2 (SQUELETTE) — graphe d'entités de groupe pour le cockpit connectd.
--
-- STATUT : brouillon, NON appliqué en prod. Additif et rétro-compatible
-- (colonnes nullables + nouvelle table), l'app actuelle l'ignore sans régression.
--
-- VOLONTAIREMENT HORS PÉRIMÈTRE ICI (viennent après l'atelier connectd du 10/07) :
--   - la matrice RLS à deux axes (capital lit / opérationnel écrit) ;
--   - la facture intercompany (issuer/payer entité) — phase 3 ;
--   - le roll-up de dividendes et la commission de structure — phase 4.
-- Voir docs/plan-cockpit-groupe.md.

-- ──────────────────────────────────────────────────────────────
-- 1. Typage des entités sur la table `companies` existante
-- ──────────────────────────────────────────────────────────────
-- entity_type='company' = comportement actuel (tenant PSA isolé) : aucune
-- société existante n'est impactée. Le groupe connectd utilise holding/filiale/sasu.
alter table companies
  add column if not exists entity_type text not null default 'company'
    check (entity_type in ('company', 'holding', 'filiale', 'sasu')),
  add column if not exists parent_company_id uuid references companies(id) on delete set null,
  add column if not exists group_id          uuid references companies(id) on delete set null;

comment on column companies.entity_type       is 'company (défaut, tenant isolé) | holding | filiale | sasu';
comment on column companies.parent_company_id is 'Hiérarchie OPÉRATIONNELLE (arbre, un parent). NE PAS utiliser pour les dividendes.';
comment on column companies.group_id          is 'Holding racine du groupe — sert au scoping RLS de groupe (phase 2 RLS, à venir). Pas de table groups séparée.';

-- ──────────────────────────────────────────────────────────────
-- 2. Graphe de CAPITAL (DAG) — distinct de l'arbre opérationnel
-- ──────────────────────────────────────────────────────────────
-- Les dividendes se calculent en parcourant CES arêtes, jamais parent_company_id.
-- Une SASU peut détenir la holding ET une filiale en direct → multi-arêtes, DAG.
create table if not exists ownership (
  id               uuid primary key default gen_random_uuid(),
  owner_company_id uuid not null references companies(id) on delete cascade,
  owned_company_id uuid not null references companies(id) on delete cascade,
  pct              numeric(5,2) not null check (pct > 0 and pct <= 100),
  created_at       timestamptz default now(),
  unique (owner_company_id, owned_company_id),
  check (owner_company_id <> owned_company_id)  -- anti auto-détention (garde-fou minimal)
);

comment on table ownership is
  'Arêtes de capital owner->owned (DAG). Dividendes = parcours de ces arêtes. '
  'Cap table par entité détenue = somme des pct entrants doit faire 100 (pool '
  'consultants inclus) — contrôlé applicativement. Acyclicité complète à garantir '
  'par trigger/appli (le check ne couvre que les auto-boucles).';

create index if not exists ownership_owner_idx on ownership(owner_company_id);
create index if not exists ownership_owned_idx on ownership(owned_company_id);

-- ──────────────────────────────────────────────────────────────
-- 3. RLS conservatrice (PROVISOIRE)
-- ──────────────────────────────────────────────────────────────
-- On n'ouvre rien tant que le modèle à deux axes n'est pas validé : lecture/écriture
-- limitées aux super_admins. Empêche tout trou de sécurité sur la nouvelle table
-- sans préjuger du modèle final.
alter table ownership enable row level security;

create policy "ownership_select_sa" on ownership for select using (is_super_admin());
create policy "ownership_write_sa"  on ownership for all    using (is_super_admin()) with check (is_super_admin());

-- TODO phase 2 (post-10/07) : matrice RLS à deux axes —
--   axe capital (détention via ownership)      → droit de LIRE le roll-up d'une entité ;
--   axe opérationnel (my_role dans l'entité)   → droit d'ÉCRIRE son staffing ;
--   isolation par group_id.
-- NE PAS étendre ces policies sans revue sécurité dédiée (la couche RLS vient d'être durcie).

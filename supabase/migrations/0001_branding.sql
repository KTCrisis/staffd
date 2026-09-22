-- ============================================================
-- 0001 — Branding par tenant
-- ============================================================
-- Première migration incrémentale. Le baseline (0000) initialise une base
-- NEUVE et commence par un drop-all : on ne le rejoue jamais sur une base qui
-- porte de vraies données. Chaque évolution de schéma est désormais un fichier
-- numéroté, idempotent, appliqué à toutes les bases (préprod, production) ;
-- le baseline est mis à jour en parallèle pour qu'une base neuve naisse à jour.
--
-- Contenu : companies.branding (nom affiché, baseline, police des titres,
-- surcharges de couleurs par thème). Lu par AppShell, filtré par
-- lib/branding.ts (liste fermée de variables, couleurs validées).
-- Lecture : la politique companies_select existante (membres du tenant).
-- Écriture : companies_update existante (admin du tenant).
-- ============================================================

alter table companies add column if not exists branding jsonb default '{}'::jsonb;

comment on column companies.branding is
  'Tenant branding: {name, tagline, heading_font, dark:{token:color}, light:{token:color}}. Filtered by lib/branding.ts.';

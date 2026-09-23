-- ============================================================
-- STAFFD — Seed d'un tenant réel (gabarit)
-- ============================================================
-- Copier en seed.<tenant>.local.sql (ignoré par git : le dépôt est public et
-- les adresses des associés sont des données personnelles), remplacer les
-- valeurs <…>, puis :
--   local : npx supabase db reset       (charge seed.fixtures.sql + seed.*.local.sql)
--   prod  : SQL Editor, 0000_baseline.sql PUIS ce fichier (jamais seed.fixtures.sql)
--
-- Les comptes doivent exister dans auth.users AVANT (Authentication > Add user) :
-- la section 3 ne crée aucun utilisateur, elle pose company_id et le rôle.
-- ============================================================

-- ============================================================
-- 1. TENANT
-- ============================================================
insert into companies (id, name, slug, mode, entity_type, billing_settings, crm_settings) values (
  '11110000-4444-0000-0000-000000000001', '<NOM DU CABINET>', '<slug>', 'team', 'company',
  '{
    "invoice_prefix": "<PREFIXE>-{YYYY}-",
    "invoice_counter": 0,
    "tva_rate": 20,
    "payment_terms": 30
  }'::jsonb,
  '{
    "enabled": true,
    "stages": [
      {"key":"qualification","label":"Qualification","probability":10,"order":1},
      {"key":"proposition",  "label":"Proposition",  "probability":40,"order":2},
      {"key":"negociation",  "label":"Négociation",  "probability":70,"order":3}
    ],
    "deal_types": ["regie","forfait","sourcing"],
    "sources": ["reseau","appel_offres","partenaire_esn","entrant"]
  }'::jsonb
) on conflict (id) do update
  set name = excluded.name, billing_settings = excluded.billing_settings,
      crm_settings = excluded.crm_settings;

-- ============================================================
-- 2. ASSOCIÉS (fiches consultant)
-- ============================================================
-- Associés facturés via leur société : contract_type 'freelance', coût = tjm_facture.
-- Laisser tjm_facture à null tant que les honoraires ne sont pas arrêtés.
insert into consultants (id, company_id, name, initials, email, role, avatar_color, status, contract_type) values
  ('11110000-0001-0000-0000-000000000001', '11110000-4444-0000-0000-000000000001', '<Associé 1>', '<A1>', '<email-1>', 'Associé', 'green',  'available', 'freelance'),
  ('11110000-0002-0000-0000-000000000002', '11110000-4444-0000-0000-000000000001', '<Associé 2>', '<A2>', '<email-2>', 'Associé', 'cyan',   'available', 'freelance'),
  ('11110000-0003-0000-0000-000000000003', '11110000-4444-0000-0000-000000000001', '<Associé 3>', '<A3>', '<email-3>', 'Associé', 'gold',   'available', 'freelance'),
  ('11110000-0004-0000-0000-000000000004', '11110000-4444-0000-0000-000000000001', '<Associé 4>', '<A4>', '<email-4>', 'Associé', 'purple', 'available', 'freelance')
on conflict (id) do nothing;

-- ============================================================
-- 3. COMPTES — les quatre associés en admin du tenant
-- ============================================================
update auth.users set raw_app_meta_data = raw_app_meta_data
  || '{"company_id":"11110000-4444-0000-0000-000000000001","user_role":"admin"}'::jsonb
  where email in ('<email-1>','<email-2>','<email-3>','<email-4>');

update consultants c set user_id = u.id
  from auth.users u
  where u.email = c.email and c.company_id = '11110000-4444-0000-0000-000000000001';

-- ============================================================
-- 4. BRANDING (optionnel) — filtré par lib/branding.ts : variables connues
--    (bg, bg2, bg3, bg4, green, pink, cyan, gold, purple, dim, text, text2,
--    border, border2), couleurs #hex ou rgb()/rgba() uniquement ; police des
--    titres parmi JetBrains Mono, Space Grotesk, Inter Tight.
-- ============================================================
-- update companies set branding = '{
--   "name": "<NOM>", "tagline": "// <baseline>", "heading_font": "Space Grotesk",
--   "dark": { "bg": "#101010", "green": "#<ACCENT>", "text": "#A0A0A0" }
-- }'::jsonb
-- where id = '11110000-4444-0000-0000-000000000001';

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- select name, email, user_id is not null as lie from consultants
--   where company_id = '11110000-4444-0000-0000-000000000001';
-- select email, raw_app_meta_data->>'user_role' as role from auth.users order by email;

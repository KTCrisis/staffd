-- ============================================================
-- STAFFD — Jeux d'essai (préprod et développement local)
-- ============================================================
-- S'applique APRÈS supabase/migrations/0000_baseline.sql. Données fictives,
-- versionnées. Ne JAMAIS charger sur une instance de production.
--
-- Chaque tenant couvre un cas de fonctionnement différent :
--   Norvane Conseil  ESN en équipe : salariés + un freelance, managers et équipes,
--                    RLS manager, factures, rentabilité salarié vs freelance
--   AgenceCreative   agence en équipe, autre métier : isolation entre tenants,
--                    projets forfait, second jeu de rôles
--   Marc Dupont      mode solo : un freelance seul, auto-liaison du compte
-- Non couvert : le portage salarial (trois parties : consultant, société de
-- portage, client final), absent aussi du schéma.
--
-- La section « comptes » ne fait que des UPDATE sur auth.users : sans les
-- comptes (stack local vierge), elle ne fait rien.
-- ============================================================

-- ============================================================
-- 1. DONNÉES
-- ============================================================

-- ── TENANT A : Norvane Conseil ─────────────────────────────────────
insert into companies (id, name, slug, mode, billing_settings) values (
  'aaaaaaaa-0000-0000-0000-000000000001', 'Norvane Conseil', 'norvane', 'team',
  '{
    "siret": "12345678901234",
    "tva_number": "FR12345678901",
    "tva_rate": 20,
    "payment_terms": 30,
    "bank_iban": "FR76 1234 5678 9012 3456 7890 123",
    "bank_bic": "BNPAFRPPXXX",
    "bank_name": "BNP Paribas",
    "legal_mention": "SAS au capital de 10 000€ — RCS Paris 123 456 789",
    "invoice_prefix": "NOR-{YYYY}-",
    "invoice_counter": 0
  }'::jsonb
) on conflict (id) do update set billing_settings = excluded.billing_settings;

insert into clients (id, company_id, name, sector, contact_name, contact_email) values
  ('bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ENGIE',            'Énergie', 'Sophie Renard',  'sophie.renard@engie.com'),
  ('bbbbbbbb-0002-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'BNP Paribas',      'Finance', 'Marc Delaunay',  'marc.delaunay@bnp.com'),
  ('bbbbbbbb-0003-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Société Générale', 'Finance', 'Julie Fontaine', 'julie.fontaine@socgen.com'),
  ('bbbbbbbb-0004-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Accenture',        'ESN',     'Thomas Bernard', 'thomas.bernard@accenture.com')
on conflict (id) do nothing;

-- contract_type / salaire_annuel_brut / charges_pct / jours_travailles / tjm_facture / tjm_cible
-- Alice, Baptiste, Clara, Emma → employees (coût = salaire chargé / 218j)
-- David → freelance (coût = tjm_facture par mission)
insert into consultants (id, company_id, name, initials, email, role, avatar_color, status, stack,
  contract_type, salaire_annuel_brut, charges_pct, jours_travailles, tjm_facture, tjm, tjm_cible,
  leave_days_total, leave_days_taken, rtt_total, rtt_taken, occupancy_rate) values
  ('cccccccc-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Alice Martin',  'AM','alice@norvane.fr',   'Lead Developer',   'green', 'assigned',ARRAY['React','Node.js','AWS'],       'employee',65000,42,218,null,null,800, 25, 7,10,2, 90),
  ('cccccccc-0002-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Baptiste Leroi','BL','baptiste@norvane.fr','Data Engineer',    'cyan',  'partial', ARRAY['Python','Spark','Databricks'], 'employee',55000,42,218,null,null,720, 25, 3,10,1, 50),
  ('cccccccc-0003-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Clara Kim',    'CK','clara@norvane.fr',   'UX Designer',      'pink',  'leave',   ARRAY['Figma','Storybook'],           'employee',48000,42,218,null,null,650, 25,18,10,4,  0),
  ('cccccccc-0004-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','David Mora',   'DM','david@norvane.fr',   'DevOps Engineer',  'gold',  'partial', ARRAY['Kubernetes','Terraform','GCP'],'freelance',null,  42,218, 680,null,750, 25, 5,10,2, 50),
  ('cccccccc-0005-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001','Emma Petit',   'EP','emma@norvane.fr',    'Backend Developer','purple','assigned',ARRAY['Java','Spring','PostgreSQL'],  'employee',50000,42,218,null,null,700, 25,25,10,0,100)
on conflict (id) do nothing;

insert into projects (id, company_id, client_id, name, client_name, is_internal, status, progress, start_date, end_date, tjm_vendu, jours_vendus, budget_total) values
  ('dddddddd-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0004-0000-0000-000000000004', 'Alpha CRM',         'Accenture',       false, 'active',  72, '2025-10-01', '2026-04-15', 850, 180, 153000),
  ('dddddddd-0002-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000002', 'Nexus v2',          'BNP Paribas',     false, 'active',  38, '2025-12-01', '2026-06-30', 800, 120,  96000),
  ('dddddddd-0003-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', 'DataLake Refonte',  'ENGIE',           false, 'active',  51, '2026-01-15', '2026-05-20', 780,  90,  70200),
  ('dddddddd-0004-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0003-0000-0000-000000000003', 'Audit Cyber SG',   'Société Générale', false, 'on_hold', 15, '2026-02-01', '2026-03-31', 900,  40,  36000),
  ('dddddddd-0005-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', null,                                   'Portail RH interne','Norvane Conseil',      true,  'draft',    5, '2026-03-01', '2026-08-31', null, null, null)
on conflict (id) do nothing;

-- Projets internes Norvane Conseil — apparaissent dans le picker timesheet
insert into projects (id, company_id, name, is_internal, is_activity_type, status, start_date, end_date) values
  ('a0000001-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Intercontrat', true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000002-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Formation',    true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000003-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Avant-vente',  true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000004-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Interne',      true, true, 'active', '2020-01-01', '2099-12-31')
on conflict (id) do nothing;

insert into assignments (company_id, consultant_id, project_id, allocation, start_date, end_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001', 90,'2025-10-01','2026-04-15'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001',100,'2025-10-01','2026-04-15'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002', 50,'2025-12-01','2026-06-30'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002', 50,'2025-12-01','2026-06-30'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000003', 10,'2026-01-15','2026-05-20'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','dddddddd-0003-0000-0000-000000000003',  0,'2026-01-15','2026-05-20'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004', 50,'2026-02-01','2026-03-31')
on conflict do nothing;

insert into leave_requests (company_id, consultant_id, type, start_date, end_date, days, status, impact_warning) values
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','CP', '2026-03-14','2026-03-18',5,'pending','Projet DataLake affecté — 1 dev manquant semaine 11'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','RTT','2026-03-05','2026-03-05',1,'pending',null),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','CP', '2026-04-01','2026-04-05',5,'pending',null),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','RTT','2026-02-10','2026-02-10',1,'approved',null),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','CP', '2026-01-27','2026-01-31',5,'approved',null)
on conflict do nothing;

insert into activity_feed (company_id, type, message, read) values
  ('aaaaaaaa-0000-0000-0000-000000000001','leave',     'Clara Kim — demande de congé 14–18 mars',false),
  ('aaaaaaaa-0000-0000-0000-000000000001','leave',     'Emma Petit — congé posé 1–5 avril',false),
  ('aaaaaaaa-0000-0000-0000-000000000001','assignment','Baptiste Leroi affecté → Nexus v2',false),
  ('aaaaaaaa-0000-0000-0000-000000000001','milestone', 'Projet Alpha CRM — jalon livré ✓',true),
  ('aaaaaaaa-0000-0000-0000-000000000001','alert',     'Fin de mission Emma Petit dans 12j',true)
on conflict do nothing;

insert into timesheets (company_id, consultant_id, project_id, date, value, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-23',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-24',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-25',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-26',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-27',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-23',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-24',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-25',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-23',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-24',0.5,'approved'),
  -- ── Alice Martin — semaines 02-fév → 20-fév ─────────────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-02',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-03',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-04',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-05',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-06',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-09',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-11',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-12',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000003','2026-02-12',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-13',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-16',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-17',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-18',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-19',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-02-20',1.0,'approved'),
  -- ── Baptiste Leroi — semaines 02-fév → 20-fév (50%) ─────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-02',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-03',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-04',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-05',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-09',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-10',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-11',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-16',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-17',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-18',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-19',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-02-20',0.5,'approved'),
  -- ── Emma Petit — semaines 02-fév → 20-fév (100%) ────────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-02',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-03',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-04',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-05',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-06',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-09',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-10',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-11',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-12',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-13',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-16',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-17',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-18',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-19',1.0,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-02-20',1.0,'approved'),
  -- ── David Mora — semaines 02-fév → 17-fév (50%+50%) ─────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-02',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-02-02',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-03',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-02-03',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-09',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-02-09',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-16',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-02-16',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-02-17',0.5,'approved'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-02-17',0.5,'approved'),
  -- ── Alice Martin — semaine 02–06 mars (90% Alpha CRM + 10% DataLake) ────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-03-02',1.0,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-03-03',1.0,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-03-04',1.0,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-03-05',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000003','2026-03-05',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','2026-03-06',1.0,'draft'),
  -- ── Baptiste Leroi — semaine 02–06 mars (50% Nexus v2) ──────────────────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-03-02',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-03-03',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-03-04',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-03-05',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','dddddddd-0002-0000-0000-000000000002','2026-03-06',0.5,'draft'),
  -- ── Emma Petit — semaine 02–06 mars (100% Alpha CRM) ────────────────────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-03-02',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-03-03',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-03-04',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-03-05',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0005-0000-0000-000000000005','dddddddd-0001-0000-0000-000000000001','2026-03-06',1.0,'draft'),
  -- ── David Mora — semaine 02–06 mars (50% Nexus v2 + 50% Audit Cyber) ────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-03-02',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-03-02',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-03-03',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-03-03',0.5,'submitted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-03-04',0.5,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-03-04',0.5,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-03-05',0.5,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-03-05',0.5,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0002-0000-0000-000000000002','2026-03-06',0.5,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0004-0000-0000-000000000004','dddddddd-0004-0000-0000-000000000004','2026-03-06',0.5,'draft'),
  -- ── Clara Kim — sem 02-mars (intercontrat — status leave DataLake) ──────────
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001','2026-03-02',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001','2026-03-03',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001','2026-03-04',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001','2026-03-05',1.0,'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001','2026-03-06',1.0,'draft')
on conflict do nothing;

-- ── TENANT B : AgenceCreative ─────────────────────────────────
insert into companies (id, name, slug, mode, billing_settings) values (
  'bbbbbbbb-1111-0000-0000-000000000002', 'AgenceCreative', 'agencecreative', 'team',
  '{
    "siret": "55544433300021",
    "tva_number": "FR55544433300",
    "tva_rate": 20,
    "payment_terms": 45,
    "bank_iban": "FR76 5554 4433 3000 2134 5678 912",
    "bank_bic": "CEPAFRPP",
    "bank_name": "Caisse d Epargne",
    "legal_mention": "SARL au capital de 5 000€ — RCS Paris 554 433 300",
    "invoice_prefix": "AC-{YYYY}-",
    "invoice_counter": 0
  }'::jsonb
) on conflict (id) do nothing;

insert into clients (id, company_id, name, sector, contact_name, contact_email, notes) values
  ('cccccccc-1001-0000-0000-000000000001','bbbbbbbb-1111-0000-0000-000000000002','Renault',     'Industrie','Pierre Aubert',   'pierre.aubert@renault.com',   'Client historique — budget annuel 150k€'),
  ('cccccccc-1002-0000-0000-000000000002','bbbbbbbb-1111-0000-0000-000000000002','Decathlon',   'Retail',   'Marie Leclerc',   'marie.leclerc@decathlon.com', 'Refonte site e-commerce + social media'),
  ('cccccccc-1003-0000-0000-000000000003','bbbbbbbb-1111-0000-0000-000000000002','Mairie Paris','Public',   'Henri Dupuis',    'h.dupuis@paris.fr',           'AO remporté jan 2026 — comm institutionnelle'),
  ('cccccccc-1004-0000-0000-000000000004','bbbbbbbb-1111-0000-0000-000000000002','BioNaturel',  'Retail',   'Camille Fontaine','c.fontaine@bionaturel.fr',    'Startup bio — identité visuelle complète')
on conflict (id) do nothing;

-- Sophie, Julie, Tom, Antoine → employees
-- Lucas, Nina → freelances
insert into consultants (id, company_id, name, initials, email, role, avatar_color, status, stack,
  contract_type, salaire_annuel_brut, charges_pct, jours_travailles, tjm_facture, tjm, tjm_cible,
  leave_days_total, leave_days_taken, rtt_total, rtt_taken, occupancy_rate) values
  ('eeeeeeee-0001-0000-0000-000000000001','bbbbbbbb-1111-0000-0000-000000000002','Sophie Durand','SD','sophie@agencecreative.fr', 'Art Director',    'pink',  'assigned', ARRAY['Figma','After Effects','Photoshop'],  'employee',45000,42,218,null,null,600, 25, 5,8,1, 80),
  ('eeeeeeee-0002-0000-0000-000000000002','bbbbbbbb-1111-0000-0000-000000000002','Lucas Martin', 'LM','lucas@agencecreative.fr',  'Motion Designer', 'cyan',  'available',ARRAY['Blender','After Effects','Cinema 4D'],'freelance',null,  42,218, 450,null,520, 25, 0,8,0,  0),
  ('eeeeeeee-0003-0000-0000-000000000003','bbbbbbbb-1111-0000-0000-000000000002','Julie Renard', 'JR','julie@agencecreative.fr',  'Copywriter',      'gold',  'partial',  ARRAY['SEO','WordPress','Notion'],           'employee',36000,42,218,null,null,460, 25, 8,8,3, 50),
  ('eeeeeeee-0004-0000-0000-000000000004','bbbbbbbb-1111-0000-0000-000000000002','Tom Vasseur',  'TV','tom@agencecreative.fr',    'Dev Frontend',    'purple','assigned', ARRAY['Vue.js','Nuxt','TailwindCSS'],        'employee',46000,42,218,null,null,620, 25, 3,8,0,100),
  ('eeeeeeee-0005-0000-0000-000000000005','bbbbbbbb-1111-0000-0000-000000000002','Nina Colas',   'NC','nina@agencecreative.fr',   'Graphic Designer','green', 'assigned', ARRAY['Illustrator','InDesign','Figma'],     'freelance',null,  42,218, 460,null,520, 25,10,8,2, 80),
  ('eeeeeeee-0006-0000-0000-000000000006','bbbbbbbb-1111-0000-0000-000000000002','Antoine Lamy', 'AL','antoine@agencecreative.fr','Brand Strategist','pink',  'leave',    ARRAY['Notion','Miro','Keynote'],            'employee',42000,42,218,null,null,560, 25,20,8,4,  0)
on conflict (id) do nothing;

insert into projects (id, company_id, client_id, name, client_name, is_internal, status, progress, start_date, end_date, tjm_vendu, jours_vendus, budget_total, description) values
  ('ffffffff-0001-0000-0000-000000000001','bbbbbbbb-1111-0000-0000-000000000002','cccccccc-1001-0000-0000-000000000001','Campagne Renault EV',        'Renault',       false,'active', 60,'2026-01-01','2026-04-30',650, 80,52000,'Campagne 360° lancement gamme électrique — print, digital, OOH'),
  ('ffffffff-0002-0000-0000-000000000002','bbbbbbbb-1111-0000-0000-000000000002','cccccccc-1002-0000-0000-000000000002','Refonte Site Decathlon',     'Decathlon',     false,'active', 30,'2026-02-01','2026-07-31',600, 60,36000,'Refonte UX/UI site e-commerce + intégration CMS headless'),
  ('ffffffff-0003-0000-0000-000000000003','bbbbbbbb-1111-0000-0000-000000000002','cccccccc-1003-0000-0000-000000000003','Comm Institutionnelle Paris','Mairie Paris',  false,'active', 45,'2026-01-15','2026-06-30',700, 50,35000,'Charte graphique et supports comm ville de Paris'),
  ('ffffffff-0004-0000-0000-000000000004','bbbbbbbb-1111-0000-0000-000000000002','cccccccc-1004-0000-0000-000000000004','Identité BioNaturel',        'BioNaturel',    false,'on_hold',20,'2026-02-15','2026-05-15',580, 30,17400,'Logo, charte, packaging — en attente validation client'),
  ('ffffffff-0005-0000-0000-000000000005','bbbbbbbb-1111-0000-0000-000000000002',null,                                  'Brand Book Interne',         'AgenceCreative',true, 'draft',   5,'2026-04-01','2026-06-30',null,null, null,'Refonte brand book et templates internes')
on conflict (id) do nothing;

-- Projets internes AgenceCreative — apparaissent dans le picker timesheet
insert into projects (id, company_id, name, is_internal, is_activity_type, status, start_date, end_date) values
  ('a0000001-0000-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000002', 'Prospection', true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000002-0000-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000002', 'Formation',   true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000003-0000-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000002', 'Shooting',    true, true, 'active', '2020-01-01', '2099-12-31'),
  ('a0000004-0000-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000002', 'Interne',     true, true, 'active', '2020-01-01', '2099-12-31')
on conflict (id) do nothing;

insert into assignments (company_id, consultant_id, project_id, allocation, start_date, end_date) values
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001', 80,'2026-01-01','2026-04-30'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001', 50,'2026-01-01','2026-04-30'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001', 80,'2026-01-01','2026-04-30'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002',100,'2026-02-01','2026-07-31'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','ffffffff-0002-0000-0000-000000000002', 50,'2026-02-01','2026-07-31'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003', 80,'2026-01-15','2026-06-30'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003', 50,'2026-01-15','2026-06-30'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0004-0000-0000-000000000004', 50,'2026-02-15','2026-05-15'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0006-0000-0000-000000000006','ffffffff-0004-0000-0000-000000000004', 80,'2026-02-15','2026-05-15')
on conflict do nothing;

insert into leave_requests (company_id, consultant_id, type, start_date, end_date, days, status, impact_warning) values
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','CP', '2026-03-20','2026-03-24',5, 'pending', null),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','RTT','2026-04-10','2026-04-10',1, 'approved',null),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0006-0000-0000-000000000006','CP', '2026-02-17','2026-03-07',15,'approved','Projet BioNaturel mis en pause — Antoine absent 3 semaines'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','RTT','2026-03-10','2026-03-10',1, 'pending', null),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','CP', '2026-05-04','2026-05-09',5, 'pending', 'Comm Paris affecté semaine 19')
on conflict do nothing;

insert into activity_feed (company_id, type, message, read) values
  ('bbbbbbbb-1111-0000-0000-000000000002','assignment','Tom Vasseur affecté → Refonte Site Decathlon',false),
  ('bbbbbbbb-1111-0000-0000-000000000002','leave',     'Lucas Martin — congé posé 20–24 mars',false),
  ('bbbbbbbb-1111-0000-0000-000000000002','leave',     'Antoine Lamy — 3 semaines de congé approuvées',false),
  ('bbbbbbbb-1111-0000-0000-000000000002','milestone', 'Campagne Renault EV — brief créatif validé ✓',true),
  ('bbbbbbbb-1111-0000-0000-000000000002','alert',     'Projet BioNaturel en pause — relance à confirmer',true)
on conflict do nothing;

insert into timesheets (company_id, consultant_id, project_id, date, value, status) values
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-23',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-24',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-25',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0004-0000-0000-000000000004','2026-02-25',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-23',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-24',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-25',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-02-23',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003','2026-02-23',0.5,'approved'),
  -- ── Sophie Durand — semaines 02-fév → 20-fév (80%) ──────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-02',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-03',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-04',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-05',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0004-0000-0000-000000000004','2026-02-05',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-09',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-10',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-16',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-17',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-02-18',1.0,'approved'),
  -- ── Tom Vasseur — semaines 02-fév → 20-fév (100%) ───────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-02',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-03',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-04',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-05',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-09',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-10',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-16',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-17',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-02-18',1.0,'approved'),
  -- ── Nina Colas — semaines 02-fév → 20-fév (80%) ─────────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-02-02',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-02-02',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-02-03',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-02-09',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-02-10',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-02-16',1.0,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-02-17',0.5,'approved'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-02-18',1.0,'approved'),
  -- ── Sophie Durand — semaine 02–06 mars (80% Renault EV + 50% BioNaturel) ────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-03-02',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-03-03',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-03-04',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0004-0000-0000-000000000004','2026-03-04',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-03-05',1.0,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','2026-03-06',1.0,'draft'),
  -- ── Tom Vasseur — semaine 02–06 mars (100% Decathlon) ───────────────────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-03-02',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-03-03',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-03-04',1.0,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-03-05',1.0,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0004-0000-0000-000000000004','ffffffff-0002-0000-0000-000000000002','2026-03-06',1.0,'draft'),
  -- ── Nina Colas — semaine 02–06 mars (80% Renault + Comm Paris) ──────────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-03-02',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-03-02',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-03-03',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-03-03',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-03-04',1.0,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0003-0000-0000-000000000003','2026-03-05',0.5,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0005-0000-0000-000000000005','ffffffff-0001-0000-0000-000000000001','2026-03-06',1.0,'draft'),
  -- ── Julie Renard — semaine 02–06 mars (50% Renault + 50% Comm Paris) ────────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-03-02',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003','2026-03-02',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-03-03',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003','2026-03-03',0.5,'submitted'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-03-04',0.5,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003','2026-03-04',0.5,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-03-05',0.5,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0003-0000-0000-000000000003','2026-03-05',0.5,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0003-0000-0000-000000000003','ffffffff-0001-0000-0000-000000000001','2026-03-06',0.5,'draft'),
  -- ── Lucas Martin — sem 02-mars (intercontrat — pas d'affectation active) ────
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','a0000001-0000-0000-0000-000000000002','2026-03-02',1.0,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','a0000001-0000-0000-0000-000000000002','2026-03-03',1.0,'draft'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','a0000001-0000-0000-0000-000000000002','2026-03-04',1.0,'draft')
on conflict do nothing;

-- ── ÉQUIPES — Norvane Conseil ──────────────────────────────────────────────────────
-- Pôle Dev & Data  : manager = Alice Martin (Lead Developer)
-- Pôle Design & Ops : pas de manager défini (Clara seule, David freelance)
insert into teams (id, company_id, name, description, manager_id) values
  ('a1a1a1a1-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Pôle Dev & Data', 'Développement applicatif et ingénierie data',
   'cccccccc-0001-0000-0000-000000000001'),   -- manager : Alice Martin
  ('a2a2a2a2-0002-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Pôle Design & Ops', 'UX Design et DevOps',
   null)
on conflict (id) do nothing;

-- team_members Norvane Conseil (le trigger sync_consultant_team_id met à jour consultants.team_id)
insert into team_members (team_id, consultant_id) values
  ('a1a1a1a1-0001-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000001'), -- Alice
  ('a1a1a1a1-0001-0000-0000-000000000001', 'cccccccc-0002-0000-0000-000000000002'), -- Baptiste
  ('a1a1a1a1-0001-0000-0000-000000000001', 'cccccccc-0005-0000-0000-000000000005'), -- Emma
  ('a2a2a2a2-0002-0000-0000-000000000002', 'cccccccc-0003-0000-0000-000000000003'), -- Clara
  ('a2a2a2a2-0002-0000-0000-000000000002', 'cccccccc-0004-0000-0000-000000000004')  -- David
on conflict (consultant_id) do nothing;

-- ── ÉQUIPES — AgenceCreative ──────────────────────────────────────────────────
-- Équipe Créa     : manager = Sophie Durand (Art Director)
-- Équipe Brand&Dev: manager = Antoine Lamy (Brand Strategist)
insert into teams (id, company_id, name, description, manager_id) values
  ('a3a3a3a3-0003-0000-0000-000000000003', 'bbbbbbbb-1111-0000-0000-000000000002',
   'Équipe Créa', 'Direction artistique, motion design et graphisme',
   'eeeeeeee-0001-0000-0000-000000000001'),   -- manager : Sophie Durand
  ('a4a4a4a4-0004-0000-0000-000000000004', 'bbbbbbbb-1111-0000-0000-000000000002',
   'Équipe Brand & Dev', 'Stratégie de marque, copywriting et intégration',
   'eeeeeeee-0006-0000-0000-000000000006')    -- manager : Antoine Lamy
on conflict (id) do nothing;

-- team_members AgenceCreative
insert into team_members (team_id, consultant_id) values
  ('a3a3a3a3-0003-0000-0000-000000000003', 'eeeeeeee-0001-0000-0000-000000000001'), -- Sophie
  ('a3a3a3a3-0003-0000-0000-000000000003', 'eeeeeeee-0002-0000-0000-000000000002'), -- Lucas
  ('a3a3a3a3-0003-0000-0000-000000000003', 'eeeeeeee-0005-0000-0000-000000000005'), -- Nina
  ('a4a4a4a4-0004-0000-0000-000000000004', 'eeeeeeee-0006-0000-0000-000000000006'), -- Antoine
  ('a4a4a4a4-0004-0000-0000-000000000004', 'eeeeeeee-0003-0000-0000-000000000003'), -- Julie
  ('a4a4a4a4-0004-0000-0000-000000000004', 'eeeeeeee-0004-0000-0000-000000000004')  -- Tom
on conflict (consultant_id) do nothing;




-- ============================================================
-- ── INVOICES — Norvane Conseil (2 paid · 1 sent · 1 draft) ───────
-- ============================================================
insert into invoices (id, company_id, consultant_id, client_id, project_id,
  invoice_number, invoice_date, due_date, status,
  subtotal, tva_rate, tva_amount, total_ttc,
  source_type, source_period_start, source_period_end,
  emitter_snapshot, client_snapshot, notes, payment_terms) values

  ('11111111-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000001',
   'bbbbbbbb-0004-0000-0000-000000000004',
   'dddddddd-0001-0000-0000-000000000001',
   'NOR-2026-001','2026-01-31','2026-03-02','paid',
   42500.00,20,8500.00,51000.00,
   'timesheet','2026-01-01','2026-01-31',
   '{"name":"Norvane Conseil","siret":"12345678901234","address":"12 rue de la Paix, 75001 Paris"}'::jsonb,
   '{"name":"Accenture","contact":"Thomas Bernard","email":"thomas.bernard@accenture.com"}'::jsonb,
   'Prestation janvier 2026 — Alpha CRM',30),

  ('11111111-2222-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0002-0000-0000-000000000002',
   'bbbbbbbb-0002-0000-0000-000000000002',
   'dddddddd-0002-0000-0000-000000000002',
   'NOR-2026-002','2026-01-31','2026-03-02','paid',
   18000.00,20,3600.00,21600.00,
   'timesheet','2026-01-01','2026-01-31',
   '{"name":"Norvane Conseil","siret":"12345678901234","address":"12 rue de la Paix, 75001 Paris"}'::jsonb,
   '{"name":"BNP Paribas","contact":"Marc Delaunay","email":"marc.delaunay@bnp.com"}'::jsonb,
   'Prestation janvier 2026 — Nexus v2',30),

  ('11111111-3333-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0001-0000-0000-000000000001',
   'bbbbbbbb-0004-0000-0000-000000000004',
   'dddddddd-0001-0000-0000-000000000001',
   'NOR-2026-003','2026-02-28','2026-03-30','sent',
   42500.00,20,8500.00,51000.00,
   'timesheet','2026-02-01','2026-02-28',
   '{"name":"Norvane Conseil","siret":"12345678901234","address":"12 rue de la Paix, 75001 Paris"}'::jsonb,
   '{"name":"Accenture","contact":"Thomas Bernard","email":"thomas.bernard@accenture.com"}'::jsonb,
   'Prestation février 2026 — Alpha CRM',30),

  ('11111111-4444-0000-0000-000000000004',
   'aaaaaaaa-0000-0000-0000-000000000001',
   null,
   'bbbbbbbb-0001-0000-0000-000000000001',
   'dddddddd-0003-0000-0000-000000000003',
   'NOR-2026-004','2026-02-28','2026-03-30','draft',
   23400.00,20,4680.00,28080.00,
   'timesheet','2026-02-01','2026-02-28',
   '{"name":"Norvane Conseil","siret":"12345678901234","address":"12 rue de la Paix, 75001 Paris"}'::jsonb,
   '{"name":"ENGIE","contact":"Sophie Renard","email":"sophie.renard@engie.com"}'::jsonb,
   'Prestation février 2026 — DataLake Refonte — à valider',30)

on conflict (id) do nothing;

insert into invoice_lines (invoice_id, company_id, description, quantity, unit, unit_price) values
  ('11111111-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Alice Martin — Lead Developer — Alpha CRM',  20.0,'day',850.00),
  ('11111111-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Emma Petit — Backend Developer — Alpha CRM', 30.0,'day',700.00),
  ('11111111-2222-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Baptiste Leroi — Data Engineer — Nexus v2',  12.5,'day',720.00),
  ('11111111-2222-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','David Mora — DevOps Engineer — Nexus v2',    12.5,'day',720.00),
  ('11111111-3333-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Alice Martin — Lead Developer — Alpha CRM',  20.0,'day',850.00),
  ('11111111-3333-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Emma Petit — Backend Developer — Alpha CRM', 30.0,'day',700.00),
  ('11111111-4444-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','Alice Martin — DataLake Refonte — ENGIE',    10.0,'day',780.00),
  ('11111111-4444-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','Baptiste Leroi — Data Engineering — ENGIE',  20.0,'day',780.00)
on conflict do nothing;

-- ── CRM — Norvane Conseil (pipeline de démonstration) ─────────
-- Accenture joue l'ESN intermédiaire : l'affaire BNP est facturée à Accenture,
-- BNP en est le client final. Couvre les trois types et les trois issues.
update clients set client_type = 'intermediary' where id = 'bbbbbbbb-0004-0000-0000-000000000004';
update companies set crm_settings = '{"enabled": true}'::jsonb where id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into opportunities (id, company_id, client_id, end_client_id, owner_id, name, deal_type,
  amount, tjm_vendu, tjm_achat, jours_estimes, probability, stage, status, source,
  expected_close_date, start_date, lost_reason) values
  ('abababab-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000001', null, 'cccccccc-0001-0000-0000-000000000001',
   'ENGIE — plateforme événementielle', 'regie', 184800, 880, null, 210, 40, 'proposition', 'open', 'reseau',
   current_date + 21, current_date + 45, null),
  ('abababab-0002-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0004-0000-0000-000000000004', 'bbbbbbbb-0002-0000-0000-000000000002', 'cccccccc-0001-0000-0000-000000000001',
   'BNP via Accenture — architecte data', 'sourcing', 90000, 750, 600, 120, 70, 'negociation', 'open', 'partenaire_esn',
   current_date + 7, current_date + 30, null),
  ('abababab-0003-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0003-0000-0000-000000000003', null, null,
   'Société Générale — audit API', 'forfait', 45000, null, null, null, 10, 'qualification', 'open', 'appel_offres',
   current_date - 3, null, null),
  ('abababab-0004-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000001', null, 'cccccccc-0002-0000-0000-000000000002',
   'ENGIE — cadrage streaming', 'forfait', 30000, null, null, null, 100, 'negociation', 'won', 'reseau',
   current_date - 20, current_date - 10, null),
  ('abababab-0005-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0002-0000-0000-000000000002', null, null,
   'BNP — gouvernance MCP', 'forfait', 60000, null, null, null, 40, 'proposition', 'lost', 'appel_offres',
   current_date - 40, null, 'Prix : concurrent intégrateur 20 % moins cher')
on conflict (id) do nothing;

-- ── CRM — contacts et échanges (ENGIE, Accenture) ────────────
insert into contacts (id, company_id, client_id, name, title, email, buying_role, is_primary) values
  ('acacacac-0001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001',
   'Sophie Renard', 'DSI adjointe', 'sophie.renard@exemple.fr', 'sponsor', true),
  ('acacacac-0002-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001',
   'Paul Morel', 'Acheteur IT', 'paul.morel@exemple.fr', 'acheteur', false),
  ('acacacac-0003-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0004-0000-0000-000000000004',
   'Thomas Bernard', 'Responsable sourcing', 'thomas.bernard@exemple.fr', 'prescripteur', true)
on conflict (id) do nothing;

insert into interactions (company_id, client_id, opportunity_id, contact_id, consultant_id, type, occurred_at, summary, next_step, next_step_due, next_step_done) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', 'abababab-0001-0000-0000-000000000001',
   'acacacac-0001-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000001', 'reunion', now() - interval '12 days',
   'Atelier de cadrage : besoin d''une plateforme événementielle pour 3 métiers, budget 2027 à confirmer.',
   'Envoyer la proposition chiffrée', current_date - 2, false),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', 'abababab-0001-0000-0000-000000000001',
   'acacacac-0002-0000-0000-000000000002', 'cccccccc-0001-0000-0000-000000000001', 'appel', now() - interval '3 days',
   'Référencement fournisseur à renouveler avant toute commande.',
   'Transmettre les pièces de référencement', current_date + 5, false),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', null,
   null, 'cccccccc-0002-0000-0000-000000000002', 'note', now() - interval '30 days',
   'Premier contact via le réseau.', null, null, false);

-- ── Extra activity feed ──────────────────────────────────────
insert into activity_feed (company_id, type, message, read) values
  ('aaaaaaaa-0000-0000-0000-000000000001','milestone','Nexus v2 — livraison sprint 3 validée ✓',true),
  ('aaaaaaaa-0000-0000-0000-000000000001','alert',    'David Mora — contrat freelance expire dans 30j',false),
  ('aaaaaaaa-0000-0000-0000-000000000001','leave',    'Baptiste Leroi — RTT 20 fév approuvé',true),
  ('aaaaaaaa-0000-0000-0000-000000000001','alert',    'Audit Cyber SG — projet en pause, relance à confirmer',false),
  ('aaaaaaaa-0000-0000-0000-000000000001','milestone','Facture NOR-2026-001 payée — 51 000€ ✓',true),
  ('bbbbbbbb-1111-0000-0000-000000000002','alert',    'Nina Colas — taux d occupation > 90% ce mois',false),
  ('bbbbbbbb-1111-0000-0000-000000000002','leave',    'Antoine Lamy — retour prévu le 10 mars',false),
  ('bbbbbbbb-1111-0000-0000-000000000002','milestone','Identité BioNaturel — moodboard validé ✓',true),
  ('bbbbbbbb-1111-0000-0000-000000000002','alert',    'Comm Paris — livrable semaine 12 à anticiper',false)
on conflict do nothing;

-- ── Availability overrides ───────────────────────────────────
insert into availability_overrides (company_id, consultant_id, date, status, note) values
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','2026-03-14','leave','CP approuvé'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','2026-03-15','leave','CP approuvé'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','2026-03-16','leave','CP approuvé'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','2026-03-17','leave','CP approuvé'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0003-0000-0000-000000000003','2026-03-18','leave','CP approuvé'),
  ('aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0002-0000-0000-000000000002','2026-03-10','partial','Mi-temps DataLake'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0006-0000-0000-000000000006','2026-03-10','free','Retour congé'),
  ('bbbbbbbb-1111-0000-0000-000000000002','eeeeeeee-0002-0000-0000-000000000002','2026-03-15','busy','Brief client Decathlon')
on conflict do nothing;

-- ── TENANT C : demo solo (freelance solo mode) ─────────────────────────────
insert into companies (id, name, slug, mode, billing_settings) values (
  'cccccccc-2222-0000-0000-000000000003', 'Marc Dupont', 'marcdupont', 'solo',
  '{
    "siret": "98765432100012",
    "tva_number": "FR98765432100",
    "tva_rate": 20,
    "payment_terms": 30,
    "bank_iban": "FR76 9876 5432 1000 1234 5678 901",
    "bank_bic": "AGRIFRPPXXX",
    "bank_name": "Crédit Agricole",
    "legal_mention": "Auto-entrepreneur — dispensé d immatriculation au RCS",
    "invoice_prefix": "MD-{YYYY}-",
    "invoice_counter": 0
  }'::jsonb
) on conflict (id) do nothing;

insert into clients (id, company_id, name, sector, contact_name, contact_email) values
  ('ffffffff-0001-0000-0000-000000000001', 'cccccccc-2222-0000-0000-000000000003', 'Studio Pixel', 'Autre', 'Camille Roy', 'camille@studiopixel.fr'),
  ('ffffffff-0002-0000-0000-000000000002', 'cccccccc-2222-0000-0000-000000000003', 'Agence Tempo', 'Autre', 'Hugo Blanc',  'hugo@agencetempo.fr')
on conflict (id) do nothing;

insert into consultants (id, company_id, name, initials, email, role, avatar_color, status, stack, contract_type, salaire_annuel_brut, charges_pct, jours_travailles, tjm, tjm_facture, tjm_cible, leave_days_total, leave_days_taken, rtt_total, rtt_taken, occupancy_rate)
values ('dddddddd-3333-0000-0000-000000000001', 'cccccccc-2222-0000-0000-000000000003', 'Marc Dupont', 'MD', 'marc@marcdupont.fr', 'Developer', 'green', 'assigned',
  ARRAY['React','Next.js','Supabase'], 'freelance', null, 42, 218, 650, 650, 700, 0, 0, 0, 0, 80)
on conflict (id) do nothing;

insert into projects (id, company_id, client_id, client_name, name, status, tjm_vendu, jours_vendus)
values
  ('eeeeeeee-4444-0000-0000-000000000001', 'cccccccc-2222-0000-0000-000000000003', 'ffffffff-0001-0000-0000-000000000001', 'Studio Pixel', 'Site vitrine Studio Pixel', 'active', 650, 15),
  ('eeeeeeee-4444-0000-0000-000000000002', 'cccccccc-2222-0000-0000-000000000003', 'ffffffff-0002-0000-0000-000000000002', 'Agence Tempo',  'Intégration e-commerce Tempo', 'active', 700, 20)
on conflict (id) do nothing;

-- ── Sync consultants.team_id depuis team_members ────────────
-- Le trigger ne s'applique pas rétroactivement aux INSERT démo
update consultants c
set team_id = tm.team_id
from team_members tm
where tm.consultant_id = c.id;

-- ============================================================
-- 3. INIT COMPTES app_metadata
-- ============================================================
-- super_admin
update auth.users set raw_app_meta_data = '{"provider":"email","providers":["email"],"user_role":"super_admin"}'::jsonb where email = 'flux7art@gmail.com';

-- admins
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"aaaaaaaa-0000-0000-0000-000000000001","user_role":"admin"}'::jsonb where email = 'demo1@staff7.art';
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"bbbbbbbb-1111-0000-0000-000000000002","user_role":"admin"}'::jsonb where email = 'demo2@staff7.art';

-- ── managers ─────────────────────────────────────────────────────────────────
-- Alice Martin — manager Norvane Conseil (Pôle Dev & Data)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"aaaaaaaa-0000-0000-0000-000000000001","user_role":"manager"}'::jsonb where email = 'flux7art+alice@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+alice@gmail.com') where id = 'cccccccc-0001-0000-0000-000000000001';

-- Sophie Durand — manager AgenceCreative (Équipe Créa)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"bbbbbbbb-1111-0000-0000-000000000002","user_role":"manager"}'::jsonb where email = 'flux7art+sophie@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+sophie@gmail.com') where id = 'eeeeeeee-0001-0000-0000-000000000001';

-- ── consultants ───────────────────────────────────────────────────────────────
-- Norvane Conseil — Emma Petit (à créer : flux7art+emma@gmail.com)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"aaaaaaaa-0000-0000-0000-000000000001","user_role":"consultant"}'::jsonb where email = 'flux7art+emma@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+emma@gmail.com') where id = 'cccccccc-0005-0000-0000-000000000005'; -- Emma Petit

-- AgenceCreative — Tom Vasseur (à créer : flux7art+tom@gmail.com)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"bbbbbbbb-1111-0000-0000-000000000002","user_role":"consultant"}'::jsonb where email = 'flux7art+tom@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+tom@gmail.com') where id = 'eeeeeeee-0004-0000-0000-000000000004'; -- Tom Vasseur

-- ── freelance ────────────────────────────────────────────────────────────────
-- David Mora — freelance Norvane Conseil
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"aaaaaaaa-0000-0000-0000-000000000001","user_role":"freelance"}'::jsonb where email = 'flux7art+david@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+david@gmail.com') where id = 'cccccccc-0004-0000-0000-000000000004';

-- ── solo ─────────────────────────────────────────────────────────────────────
-- Marc Dupont — admin solo
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"company_id":"cccccccc-2222-0000-0000-000000000003","user_role":"admin"}'::jsonb where email = 'flux7art+marc@gmail.com';
update consultants set user_id = (select id from auth.users where email = 'flux7art+marc@gmail.com') where id = 'dddddddd-3333-0000-0000-000000000001';

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- select id, name from companies;
-- select name, company_id, status, tjm from consultants order by company_id;
-- select * from consultant_occupancy limit 5;
-- select * from project_financials order by company_id;
-- select * from timesheet_summary;
-- select * from invoice_list order by invoice_date desc;
-- select next_invoice_number('aaaaaaaa-0000-0000-0000-000000000001');
-- select email, raw_app_meta_data->>'user_role' as role from auth.users order by email;
-- select id, name, mode from companies;
-- select t.name as team, m.name as manager, count(tm.id) as membres from teams t left join consultants m on m.id = t.manager_id left join team_members tm on tm.team_id = t.id group by t.id, t.name, m.name;
--
-- Comptes de test :
--   super_admin  : flux7art@gmail.com
--   admin A      : demo1@staff7.art             (Norvane Conseil)
--   admin B      : demo2@staff7.art             (AgenceCreative)
--   manager A    : flux7art+alice@gmail.com     (Norvane Conseil  — Alice Martin, Pôle Dev & Data)
--   manager B    : flux7art+sophie@gmail.com    (AgenceCreative — Sophie Durand, Équipe Créa)
--   consultant A : flux7art+emma@gmail.com      (Norvane Conseil  — Emma Petit)     ← à créer
--   consultant B : flux7art+tom@gmail.com       (AgenceCreative — Tom Vasseur) ← à créer
--   freelance    : flux7art+david@gmail.com     (Norvane Conseil  — David Mora)


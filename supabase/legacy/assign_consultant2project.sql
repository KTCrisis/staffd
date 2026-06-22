-- D'abord récupérer les IDs
select id, name from consultants;
select id, name from projects;

-- Puis créer les assignments
insert into assignments (consultant_id, project_id, allocation, start_date, end_date) values
  ('uuid-consultant', 'uuid-projet', 100, '2026-01-01', '2026-06-30'),
  ('uuid-consultant', 'uuid-projet', 50,  '2026-03-01', null);  -- null = pas de fin définie
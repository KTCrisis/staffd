insert into consultants (name, initials, email, role, avatar_color, stack, status, tjm, leave_days_total, leave_days_taken, occupancy_rate) values
  ('Prénom Nom',  'PN', 'email@societe.com', 'Data Engineer',     'green',  '{"Python","Kafka"}',       'available', 650, 25, 0, 0),
  ('Prénom Nom',  'PN', 'email@societe.com', 'Backend Developer', 'cyan',   '{"FastAPI","Docker"}',     'assigned',  600, 25, 3, 100),
  ('Prénom Nom',  'PN', 'email@societe.com', 'DevOps',            'gold',   '{"K8s","Terraform","GCP"}','partial',   620, 25, 0, 50);
-- ajoute autant de lignes que nécessaire
--avatar_color : green cyan pink gold purple
--status : available assigned partial leave
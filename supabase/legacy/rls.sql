-- Trigger updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- Fonctions helper
create or replace function my_company_id() returns uuid as $$
  select (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid;
$$ language sql stable;

create or replace function my_role() returns text as $$
  select auth.jwt() -> 'app_metadata' ->> 'user_role';
$$ language sql stable;

-- RLS companies
alter table companies enable row level security;
drop policy if exists "companies_select" on companies;
create policy "companies_select" on companies
  for select using (id = my_company_id());

-- RLS consultants
alter table consultants enable row level security;
drop policy if exists "consultants_select" on consultants;
drop policy if exists "consultants_insert" on consultants;
drop policy if exists "consultants_update" on consultants;
drop policy if exists "consultants_delete" on consultants;
create policy "consultants_select" on consultants
  for select using (company_id = my_company_id());
create policy "consultants_insert" on consultants
  for insert with check (company_id = my_company_id() and my_role() in ('admin','manager'));
create policy "consultants_update" on consultants
  for update using (company_id = my_company_id() and my_role() in ('admin','manager'));
create policy "consultants_delete" on consultants
  for delete using (company_id = my_company_id() and my_role() = 'admin');

-- RLS projects
alter table projects enable row level security;
drop policy if exists "projects_select" on projects;
drop policy if exists "projects_insert" on projects;
drop policy if exists "projects_update" on projects;
drop policy if exists "projects_delete" on projects;
create policy "projects_select" on projects
  for select using (company_id = my_company_id());
create policy "projects_insert" on projects
  for insert with check (company_id = my_company_id() and my_role() in ('admin','manager'));
create policy "projects_update" on projects
  for update using (company_id = my_company_id() and my_role() in ('admin','manager'));
create policy "projects_delete" on projects
  for delete using (company_id = my_company_id() and my_role() = 'admin');

-- RLS assignments
alter table assignments enable row level security;
drop policy if exists "assignments_select" on assignments;
drop policy if exists "assignments_insert" on assignments;
drop policy if exists "assignments_update" on assignments;
drop policy if exists "assignments_delete" on assignments;
create policy "assignments_select" on assignments
  for select using (company_id = my_company_id());
create policy "assignments_insert" on assignments
  for insert with check (company_id = my_company_id() and my_role() in ('admin','manager'));
create policy "assignments_update" on assignments
  for update using (company_id = my_company_id() and my_role() in ('admin','manager'));
create policy "assignments_delete" on assignments
  for delete using (company_id = my_company_id() and my_role() in ('admin','manager'));

-- RLS leave_requests
alter table leave_requests enable row level security;
drop policy if exists "leave_requests_select" on leave_requests;
drop policy if exists "leave_requests_insert" on leave_requests;
drop policy if exists "leave_requests_update" on leave_requests;
drop policy if exists "leave_requests_delete" on leave_requests;
create policy "leave_requests_select" on leave_requests
  for select using (company_id = my_company_id());
create policy "leave_requests_insert" on leave_requests
  for insert with check (company_id = my_company_id());
create policy "leave_requests_update" on leave_requests
  for update using (company_id = my_company_id() and my_role() in ('admin','manager'));
create policy "leave_requests_delete" on leave_requests
  for delete using (company_id = my_company_id() and my_role() in ('admin','manager'));

-- RLS availability_overrides
alter table availability_overrides enable row level security;
drop policy if exists "availability_select" on availability_overrides;
drop policy if exists "availability_insert" on availability_overrides;
drop policy if exists "availability_update" on availability_overrides;
drop policy if exists "availability_delete" on availability_overrides;
create policy "availability_select" on availability_overrides
  for select using (company_id = my_company_id());
create policy "availability_insert" on availability_overrides
  for insert with check (company_id = my_company_id() and my_role() in ('admin','manager'));
create policy "availability_update" on availability_overrides
  for update using (company_id = my_company_id() and my_role() in ('admin','manager'));
create policy "availability_delete" on availability_overrides
  for delete using (company_id = my_company_id() and my_role() in ('admin','manager'));

-- RLS activity_feed
alter table activity_feed enable row level security;
drop policy if exists "activity_feed_select" on activity_feed;
drop policy if exists "activity_feed_insert" on activity_feed;
create policy "activity_feed_select" on activity_feed
  for select using (company_id = my_company_id());
create policy "activity_feed_insert" on activity_feed
  for insert with check (company_id = my_company_id());
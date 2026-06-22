create table if not exists companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique,
  created_at timestamptz default now()
);

insert into companies (id, name, slug)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'NexDigital',
  'nexdigital'
) on conflict (id) do nothing;
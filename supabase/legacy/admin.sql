update auth.users
set raw_app_meta_data = raw_app_meta_data || 
  '{"company_id": "aaaaaaaa-0000-0000-0000-000000000001", "user_role": "admin"}'::jsonb
where email = 'ton@email.com';
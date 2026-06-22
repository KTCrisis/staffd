update consultants
set user_id = (select id from auth.users where email = 'email@societe.com')
where email = 'email@societe.com';

-- Répéter pour chaque consultant
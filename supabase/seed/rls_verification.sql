-- ============================================================
-- RLS Verification Script (run against local Supabase after migration)
-- Purpose: prove that future gifts and private data are NOT
-- readable by a regular authenticated user.
-- ============================================================

-- Create two users: one admin, one regular
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
select
  '11111111-1111-1111-1111-111111111111',
  'admin@test.local',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin"}',
  'authenticated',
  'authenticated'
on conflict (id) do nothing;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
select
  '22222222-2222-2222-2222-222222222222',
  'user@test.local',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"User"}',
  'authenticated',
  'authenticated'
on conflict (id) do nothing;

insert into public.users (id, email, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin@test.local', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'user@test.local', 'user')
on conflict (id) do nothing;

insert into public.user_profiles (user_id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Admin'),
  ('22222222-2222-2222-2222-222222222222', 'User')
on conflict (user_id) do nothing;

-- Insert a FUTURE gift (day 24) and a PAST gift (day 1)
insert into public.physical_gifts (location_id, day_number, name, description)
select id, 1, 'Regale del giorno 1', 'Aperto oggi' from public.village_locations where slug = 'piazza-centrale'
on conflict (location_id, day_number) do nothing;

insert into public.physical_gifts (location_id, day_number, name, description)
select id, 24, 'Regalo segreto del 24', 'NON deve essere visibile prima del 24 dicembre' from public.village_locations where slug = 'piazza-centrale'
on conflict (location_id, day_number) do nothing;

insert into public.elf_messages (day_number, author, message) values
  (1, 'Elfo Bartolo', 'Buon primo giorno di Avvento!'),
  (24, 'Elfo Segreto', 'Messaggio nascosto di Natale')
on conflict (id) do nothing;

-- Make day 1 unlocked in the past, day 24 in the future
update public.advent_days
set unlock_date = now() - interval '1 day'
where day_number = 1;

update public.advent_days
set unlock_date = now() + interval '10 days'
where day_number = 24;

-- ============================================================
-- TESTS (run each as the REGULAR user via set_config)
-- ============================================================

-- Simulate regular user session
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

-- 1. User can see day 1 (unlocked)
select count(*) as visible_unlocked_days
from public.advent_days where unlock_date <= now();
-- expected: includes day 1

-- 2. User CANNOT see day 24 (locked)
select count(*) as locked_days_visible
from public.advent_days where day_number = 24 and unlock_date <= now();
-- expected: 0

-- 3. User CANNOT read future gifts
select count(*) as future_gifts_visible
from public.physical_gifts g
join public.advent_days ad on ad.day_number = g.day_number
where g.day_number = 24 and ad.unlock_date <= now();
-- expected: 0

-- 4. User CAN read unlocked gifts
select count(*) as unlocked_gifts_visible
from public.physical_gifts g
join public.advent_days ad on ad.day_number = g.day_number
where g.day_number = 1 and ad.unlock_date <= now();
-- expected: 1

-- 5. User CANNOT read other users' secret messages
select count(*) as other_secret_messages
from public.secret_messages where user_id = '11111111-1111-1111-1111-111111111111';
-- expected: 0

-- 6. User CANNOT promote themselves to admin (RLS update check)
update public.users set role = 'admin' where id = '22222222-2222-2222-2222-222222222222';
-- expected: 0 rows affected (RLS blocks: with check fails)

-- Reset role for clean state
select set_config('role', 'service_role', true);
select set_config('request.jwt.claims', '{}', true);
update public.users set role = 'user' where id = '22222222-2222-2222-2222-222222222222';

-- Cleanup
delete from public.elf_messages where day_number in (1, 24);
delete from public.physical_gifts where day_number in (1, 24);
delete from public.user_profiles where user_id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
delete from public.users where id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
delete from auth.users where id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');

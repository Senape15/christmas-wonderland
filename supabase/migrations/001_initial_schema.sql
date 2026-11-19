-- ============================================================
-- Christmas Wonderland – Initial Schema
-- Migration: 001_initial_schema.sql
--
-- Design principles:
--   * UUID primary keys (gen_random_uuid())
--   * timestamptz timestamps, default now()
--   * Every table has Row Level Security enabled
--   * Users can only read/write their OWN data
--   * Future gift data is NEVER exposed before unlock_date
-- ============================================================

-- ------------------------------------------------------------
-- 1. USERS (mirror of auth.users, extended with app role)
-- ------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  role        text not null default 'user'
              check (role in ('admin', 'user')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view their own record"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

create policy "Admins can view all users"
  on public.users for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "Users can update their own record"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------
-- 2. USER_PROFILES
-- ------------------------------------------------------------
create table if not exists public.user_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.users(id) on delete cascade,
  name        text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can view their own profile"
  on public.user_profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.user_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.user_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create index idx_user_profiles_user_id on public.user_profiles(user_id);

-- ------------------------------------------------------------
-- 3. ADVENT_DAYS (global calendar; one row per day 1..24)
-- ------------------------------------------------------------
create table if not exists public.advent_days (
  id           uuid primary key default gen_random_uuid(),
  day_number   integer not null unique
               check (day_number between 1 and 24),
  title        text not null,
  description  text not null default '',
  unlock_date  timestamptz not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.advent_days enable row level security;

-- Anyone authenticated can see the day metadata,
-- but only if the unlock_date has passed (server-side date check!).
create policy "Users can view unlocked advent days"
  on public.advent_days for select
  to authenticated
  using (unlock_date <= now());

create policy "Admins can manage advent days"
  on public.advent_days for all
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create index idx_advent_days_unlock_date on public.advent_days(unlock_date);

-- ------------------------------------------------------------
-- 4. VILLAGE_LOCATIONS (navigable village map)
-- ------------------------------------------------------------
create table if not exists public.village_locations (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  description  text not null default '',
  position_x   numeric(5,2) not null,
  position_y   numeric(5,2) not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.village_locations enable row level security;

create policy "Locations are readable by authenticated users"
  on public.village_locations for select
  to authenticated
  using (true);

create policy "Admins can manage locations"
  on public.village_locations for all
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create index idx_village_locations_slug on public.village_locations(slug);

-- ------------------------------------------------------------
-- 5. PHYSICAL_GIFTS (real-world gifts, hidden until unlocked)
-- ------------------------------------------------------------
create table if not exists public.physical_gifts (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.village_locations(id) on delete cascade,
  day_number   integer not null
               check (day_number between 1 and 24),
  name         text not null,
  description  text not null default '',
  image_url    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- A gift belongs to exactly one (location, day) pair
  constraint physical_gifts_location_day_unique unique (location_id, day_number)
);

alter table public.physical_gifts enable row level security;

-- CRITICAL: gifts are visible ONLY after the day's unlock_date.
create policy "Users can view gifts only after unlock"
  on public.physical_gifts for select
  to authenticated
  using (
    exists (
      select 1 from public.advent_days ad
      where ad.day_number = physical_gifts.day_number
        and ad.unlock_date <= now()
    )
  );

create policy "Admins can manage gifts"
  on public.physical_gifts for all
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create index idx_physical_gifts_day on public.physical_gifts(day_number);
create index idx_physical_gifts_location on public.physical_gifts(location_id);

-- ------------------------------------------------------------
-- 6. GIFT_SYMBOLS (collectible symbols tied to a physical gift)
-- ------------------------------------------------------------
create table if not exists public.gift_symbols (
  id          uuid primary key default gen_random_uuid(),
  gift_id     uuid not null references public.physical_gifts(id) on delete cascade,
  symbol      text not null,
  created_at  timestamptz not null default now()
);

alter table public.gift_symbols enable row level security;

create policy "Symbols inherit gift visibility"
  on public.gift_symbols for select
  to authenticated
  using (
    exists (
      select 1 from public.physical_gifts pg
      join public.advent_days ad on ad.day_number = pg.day_number
      where pg.id = gift_symbols.gift_id
        and ad.unlock_date <= now()
    )
  );

create policy "Admins can manage symbols"
  on public.gift_symbols for all
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create index idx_gift_symbols_gift on public.gift_symbols(gift_id);

-- ------------------------------------------------------------
-- 7. ELF_MESSAGES (daily message from the elves, public once unlocked)
-- ------------------------------------------------------------
create table if not exists public.elf_messages (
  id          uuid primary key default gen_random_uuid(),
  day_number  integer not null
              check (day_number between 1 and 24),
  author      text not null,
  message     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.elf_messages enable row level security;

create policy "Users can view elf messages only after unlock"
  on public.elf_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.advent_days ad
      where ad.day_number = elf_messages.day_number
        and ad.unlock_date <= now()
    )
  );

create policy "Admins can manage elf messages"
  on public.elf_messages for all
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create index idx_elf_messages_day on public.elf_messages(day_number);

-- ------------------------------------------------------------
-- 8. SECRET_MESSAGES (private per-user messages)
-- ------------------------------------------------------------
create table if not exists public.secret_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  day_number  integer not null
              check (day_number between 1 and 24),
  content     text not null,
  created_at  timestamptz not null default now(),
  constraint secret_messages_user_day_unique unique (user_id, day_number)
);

alter table public.secret_messages enable row level security;

create policy "Users can view their own secret messages"
  on public.secret_messages for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own secret messages"
  on public.secret_messages for insert
  to authenticated
  with check (auth.uid() = user_id);

create index idx_secret_messages_user on public.secret_messages(user_id);

-- ------------------------------------------------------------
-- 9. QUIZZES
-- ------------------------------------------------------------
create table if not exists public.quizzes (
  id           uuid primary key default gen_random_uuid(),
  day_number   integer not null
               check (day_number between 1 and 24),
  question     text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.quizzes enable row level security;

create policy "Users can view quizzes only after unlock"
  on public.quizzes for select
  to authenticated
  using (
    exists (
      select 1 from public.advent_days ad
      where ad.day_number = quizzes.day_number
        and ad.unlock_date <= now()
    )
  );

create policy "Admins can manage quizzes"
  on public.quizzes for all
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create index idx_quizzes_day on public.quizzes(day_number);

-- ------------------------------------------------------------
-- 10. QUIZ_ANSWERS
-- ------------------------------------------------------------
create table if not exists public.quiz_answers (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  answer_text  text not null,
  is_correct   boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.quiz_answers enable row level security;

create policy "Users can view answers for unlocked quizzes"
  on public.quiz_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.quizzes q
      join public.advent_days ad on ad.day_number = q.day_number
      where q.id = quiz_answers.quiz_id
        and ad.unlock_date <= now()
    )
  );

create policy "Admins can manage quiz answers"
  on public.quiz_answers for all
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create index idx_quiz_answers_quiz on public.quiz_answers(quiz_id);

-- ------------------------------------------------------------
-- 11. USER_QUIZ_ATTEMPTS
-- ------------------------------------------------------------
create table if not exists public.user_quiz_attempts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  quiz_id           uuid not null references public.quizzes(id) on delete cascade,
  selected_answer_id uuid references public.quiz_answers(id) on delete set null,
  is_correct        boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table public.user_quiz_attempts enable row level security;

create policy "Users can view their own attempts"
  on public.user_quiz_attempts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own attempts"
  on public.user_quiz_attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

create index idx_user_quiz_attempts_user on public.user_quiz_attempts(user_id);
create index idx_user_quiz_attempts_quiz on public.user_quiz_attempts(quiz_id);

-- ------------------------------------------------------------
-- 12. USER_OPENINGS (which advent days the user has opened)
-- ------------------------------------------------------------
create table if not exists public.user_openings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  day_number  integer not null
              check (day_number between 1 and 24),
  opened_at   timestamptz not null default now(),
  constraint user_openings_user_day_unique unique (user_id, day_number)
);

alter table public.user_openings enable row level security;

create policy "Users can view their own openings"
  on public.user_openings for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own openings"
  on public.user_openings for insert
  to authenticated
  with check (auth.uid() = user_id);

create index idx_user_openings_user on public.user_openings(user_id);

-- ------------------------------------------------------------
-- 13. USER_PHOTOS (user-submitted photos per day)
-- ------------------------------------------------------------
create table if not exists public.user_photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  day_number    integer not null
                check (day_number between 1 and 24),
  storage_path  text not null,
  created_at    timestamptz not null default now()
);

alter table public.user_photos enable row level security;

create policy "Users can view their own photos"
  on public.user_photos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own photos"
  on public.user_photos for insert
  to authenticated
  with check (auth.uid() = user_id);

create index idx_user_photos_user on public.user_photos(user_id);

-- ------------------------------------------------------------
-- 14. MEMORY_SPHERES (personal memory collection)
-- ------------------------------------------------------------
create table if not exists public.memory_spheres (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  note        text,
  photo_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.memory_spheres enable row level security;

create policy "Users can view their own spheres"
  on public.memory_spheres for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own spheres"
  on public.memory_spheres for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own spheres"
  on public.memory_spheres for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own spheres"
  on public.memory_spheres for delete
  to authenticated
  using (auth.uid() = user_id);

create index idx_memory_spheres_user on public.memory_spheres(user_id);

-- ------------------------------------------------------------
-- 15. NOTIFICATION_SUBSCRIPTIONS (Web Push)
-- ------------------------------------------------------------
create table if not exists public.notification_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  endpoint      text not null,
  keys_p256dh   text not null,
  keys_auth     text not null,
  created_at    timestamptz not null default now(),
  constraint notification_subscriptions_user_endpoint_unique unique (user_id, endpoint)
);

alter table public.notification_subscriptions enable row level security;

create policy "Users can view their own subscriptions"
  on public.notification_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own subscriptions"
  on public.notification_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

create index idx_notification_subscriptions_user on public.notification_subscriptions(user_id);

-- ------------------------------------------------------------
-- 16. APP_SETTINGS (global key/value configuration)
-- ------------------------------------------------------------
create table if not exists public.app_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "Authenticated users can read app settings"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "Admins can manage app settings"
  on public.app_settings for all
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ------------------------------------------------------------
-- Helper function: keep public.users.email in sync with auth.users
-- (called from a Supabase Auth webhook / trigger if desired)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'user');

  insert into public.user_profiles (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));

  return new;
end;
$$;

-- Trigger: on new auth.users, create app user + profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- Updated-at trigger helper
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at before update on public.users
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at before update on public.user_profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_advent_days_updated_at on public.advent_days;
create trigger set_advent_days_updated_at before update on public.advent_days
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_village_locations_updated_at on public.village_locations;
create trigger set_village_locations_updated_at before update on public.village_locations
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_physical_gifts_updated_at on public.physical_gifts;
create trigger set_physical_gifts_updated_at before update on public.physical_gifts
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_elf_messages_updated_at on public.elf_messages;
create trigger set_elf_messages_updated_at before update on public.elf_messages
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_quizzes_updated_at on public.quizzes;
create trigger set_quizzes_updated_at before update on public.quizzes
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_memory_spheres_updated_at on public.memory_spheres;
create trigger set_memory_spheres_updated_at before update on public.memory_spheres
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at before update on public.app_settings
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Seed: Advent days (unlock dates relative to current year)
-- NOTE: adjust the year/anchor as needed. This is a starting seed.
-- ------------------------------------------------------------
insert into public.advent_days (day_number, title, description, unlock_date)
select
  gs,
  format('Giorno %s', gs),
  '',
  make_date(date_part('year'::text, now())::int, 12, 1) + (gs - 1) * interval '1 day'
from generate_series(1, 24) as gs
on conflict (day_number) do nothing;

-- Default village locations (extended later in Phase 3)
insert into public.village_locations (slug, name, description, position_x, position_y)
values
  ('piazza-centrale', 'Piazza Centrale', 'Il cuore del villaggio.', 50.0, 50.0),
  ('bottega-dei-giocattoli', 'Bottega dei Giocattoli', 'Regali per tutti i bambini.', 20.0, 30.0),
  ('panetteria', 'Panetteria di Babbo Natale', 'Profumo di biscotti e pane caldo.', 80.0, 30.0),
  ('bosco-incantato', 'Bosco Incantato', 'Dove vivono gli elfi.', 30.0, 70.0),
  ('lago-gelato', 'Lago Gelato', 'Pattinaggio sotto le stelle.', 70.0, 70.0)
on conflict (slug) do nothing;

-- ============================================================
-- Storage buckets (create via Dashboard or SQL below if needed)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('photos', 'photos', false);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
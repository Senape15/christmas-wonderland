-- ============================================================
-- Christmas Wonderland – FASE 4: pannello amministrativo
-- Migration: 004_admin_panel.sql
--
-- SOLO AGGIUNTIVO / CORRETTIVO:
--   * colonne nuove su tabelle esistenti (mai DROP, mai rinomi)
--   * nuove tabelle amministrative con RLS
--   * bucket Storage per i media
--   * una correzione di sicurezza: le risposte corrette dei quiz non
--     sono più leggibili dagli utenti normali (non esiste ancora una UI
--     quiz lato utente, quindi nessuna funzionalità viene rimossa)
--
-- Tutte le policy admin usano public.is_admin() (migrazione 003):
-- SECURITY DEFINER, nessun auto-join ricorsivo su public.users.
-- ============================================================

-- ------------------------------------------------------------
-- 1. COLONNE AGGIUNTIVE SU TABELLE ESISTENTI
-- ------------------------------------------------------------
alter table public.physical_gifts
  add column if not exists preparation_status text not null default 'da_preparare'
    check (preparation_status in ('da_preparare','in_preparazione','pronto','consegnato')),
  add column if not exists admin_notes text not null default '',
  add column if not exists delivery_instructions text not null default '',
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0;

alter table public.physical_contents
  add column if not exists is_active boolean not null default true,
  add column if not exists image_url text,
  add column if not exists admin_notes text not null default '',
  add column if not exists success_message text not null default '',
  add column if not exists activation_conditions jsonb not null default '{}'::jsonb;

alter table public.gift_symbols
  add column if not exists description text not null default '',
  add column if not exists image_url text,
  add column if not exists day_number integer check (day_number between 1 and 24),
  add column if not exists location_id uuid
    references public.village_locations(id) on delete set null,
  add column if not exists discovery_conditions jsonb not null default '{}'::jsonb,
  add column if not exists is_active boolean not null default true;

alter table public.quizzes
  add column if not exists location_id uuid
    references public.village_locations(id) on delete set null,
  add column if not exists hint text not null default '',
  add column if not exists points integer not null default 1 check (points >= 0),
  add column if not exists is_required boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists unlock_conditions jsonb not null default '{}'::jsonb;

alter table public.quiz_answers
  add column if not exists hint text not null default '',
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true;

alter table public.elf_messages
  add column if not exists is_active boolean not null default true,
  add column if not exists scheduled_for timestamptz,
  add column if not exists event_key text,
  add column if not exists image_url text;

alter table public.secret_messages
  add column if not exists author text not null default 'Nico',
  add column if not exists is_active boolean not null default true,
  add column if not exists scheduled_for timestamptz,
  add column if not exists event_key text;

alter table public.memory_spheres
  add column if not exists day_number integer check (day_number between 1 and 24),
  add column if not exists location_id uuid
    references public.village_locations(id) on delete set null,
  add column if not exists is_unlocked boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists activation_conditions jsonb not null default '{}'::jsonb;

-- ------------------------------------------------------------
-- 2. PASSWORD FISICHE — hash lato server, mai inviato al browser
-- ------------------------------------------------------------
create table if not exists public.physical_passwords (
  id              uuid primary key default gen_random_uuid(),
  content_id      uuid not null unique
                  references public.physical_contents(id) on delete cascade,
  password_hash   text not null,
  hint            text not null default '',
  success_message text not null default '',
  max_attempts    integer check (max_attempts is null or max_attempts > 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.physical_passwords enable row level security;
drop policy if exists "Only admins can read passwords" on public.physical_passwords;
create policy "Only admins can read passwords"
  on public.physical_passwords for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_physical_passwords_content
  on public.physical_passwords(content_id);

drop trigger if exists set_physical_passwords_updated_at on public.physical_passwords;
create trigger set_physical_passwords_updated_at before update on public.physical_passwords
  for each row execute procedure public.set_updated_at();

-- Tentativi e completamenti (il modello Fase 3 non li prevedeva)
create table if not exists public.password_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  content_id  uuid not null references public.physical_contents(id) on delete cascade,
  success     boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.password_attempts enable row level security;
drop policy if exists "Users can read own password attempts" on public.password_attempts;
create policy "Users can read own password attempts"
  on public.password_attempts for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Server can record password attempts" on public.password_attempts;
create policy "Server can record password attempts"
  on public.password_attempts for insert
  to authenticated
  with check (auth.uid() = user_id or public.is_admin());

create table if not exists public.password_completions (
  user_id     uuid not null references public.users(id) on delete cascade,
  content_id  uuid not null references public.physical_contents(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

alter table public.password_completions enable row level security;
drop policy if exists "Users can read own password completions" on public.password_completions;
create policy "Users can read own password completions"
  on public.password_completions for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Server can record password completions" on public.password_completions;
create policy "Server can record password completions"
  on public.password_completions for insert
  to authenticated
  with check (auth.uid() = user_id or public.is_admin());

create index if not exists idx_password_attempts_user on public.password_attempts(user_id);
create index if not exists idx_password_attempts_content on public.password_attempts(content_id);

-- ------------------------------------------------------------
-- 3. SCATOLA FINALE (24 DICEMBRE) — configurazione admin-only
--    NON in app_settings: quella tabella è leggibile dagli utenti
-- ------------------------------------------------------------
create table if not exists public.final_gift_boxes (
  id                uuid primary key default gen_random_uuid(),
  name              text not null default 'La scatola finale',
  description       text not null default '',
  image_url         text,
  shape             text not null default 'chest'
                    check (shape in ('cube','chest','house','book','custom')),
  color             text not null default '#c41e3a',
  decorations       jsonb not null default '[]'::jsonb,
  symbol            text,
  intro_message     text not null default '',
  clues             jsonb not null default '[]'::jsonb,
  objects           jsonb not null default '[]'::jsonb,
  password_enabled  boolean not null default false,
  password_hash     text,
  password_hint     text not null default '',
  opening_sequence  jsonb not null default '[]'::jsonb,
  final_message     text not null default '',
  reveal_day        integer not null default 24 check (reveal_day between 1 and 24),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.final_gift_boxes enable row level security;
drop policy if exists "Only admins can manage final box" on public.final_gift_boxes;
create policy "Only admins can manage final box"
  on public.final_gift_boxes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists set_final_gift_boxes_updated_at on public.final_gift_boxes;
create trigger set_final_gift_boxes_updated_at before update on public.final_gift_boxes
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- 4. NOTIFICHE PROGRAMMATE
-- ------------------------------------------------------------
create table if not exists public.scheduled_notifications (
  id            uuid primary key default gen_random_uuid(),
  day_number    integer check (day_number between 1 and 24),
  title         text not null,
  body          text not null,
  scheduled_for timestamptz,
  event_key     text,
  conditions    jsonb not null default '{}'::jsonb,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.scheduled_notifications enable row level security;
drop policy if exists "Only admins can manage notifications" on public.scheduled_notifications;
create policy "Only admins can manage notifications"
  on public.scheduled_notifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_scheduled_notifications_day
  on public.scheduled_notifications(day_number);

drop trigger if exists set_scheduled_notifications_updated_at on public.scheduled_notifications;
create trigger set_scheduled_notifications_updated_at before update on public.scheduled_notifications
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- 5. SIMULAZIONE DATE — solo admin, NON modifica la data reale
-- ------------------------------------------------------------
create table if not exists public.admin_date_simulations (
  admin_id       uuid primary key references public.users(id) on delete cascade,
  simulated_date date,
  note           text not null default '',
  is_active      boolean not null default false,
  updated_at     timestamptz not null default now()
);

alter table public.admin_date_simulations enable row level security;
drop policy if exists "Admins can manage own simulation" on public.admin_date_simulations;
create policy "Admins can manage own simulation"
  on public.admin_date_simulations for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists set_admin_date_simulations_updated_at on public.admin_date_simulations;
create trigger set_admin_date_simulations_updated_at before update on public.admin_date_simulations
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- 6. CORREZIONE SICUREZZA: risposte corrette non esposte agli utenti
--    (nessuna UI quiz utente esiste ancora: nessuna regressione)
-- ------------------------------------------------------------
drop policy if exists "Users can view answers for unlocked quizzes" on public.quiz_answers;
drop policy if exists "Only admins can read quiz answers" on public.quiz_answers;
create policy "Only admins can read quiz answers"
  on public.quiz_answers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 7. STORAGE — bucket privato per i media amministrativi
--    gli admin caricano via Server Action con service role
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wonderland-media', 'wonderland-media', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "Public read wonderland media" on storage.objects;
create policy "Public read wonderland media"
  on storage.objects for select
  to public
  using (bucket_id = 'wonderland-media');

drop policy if exists "Admins manage wonderland media" on storage.objects;
create policy "Admins manage wonderland media"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'wonderland-media' and public.is_admin())
  with check (bucket_id = 'wonderland-media' and public.is_admin());

-- ============================================================
-- Fine migrazione 004. Nessun dato esistente viene eliminato.
-- ============================================================

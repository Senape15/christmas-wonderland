-- ============================================================
-- Christmas Wonderland – FASE 7
-- PWA, Web Push, preferenze e log di consegna
--
-- Migrazione incrementale e idempotente. NON elimina dati e NON
-- disattiva RLS. Va eseguita manualmente nel SQL Editor di Supabase
-- dopo la 006, solo dopo autorizzazione esplicita.
-- ============================================================

-- ------------------------------------------------------------
-- 1. NOTIFICATION_SUBSCRIPTIONS (già creata nella 001)
--    Aggiungiamo stato del dispositivo e policy mancanti.
-- ------------------------------------------------------------
alter table public.notification_subscriptions
  add column if not exists user_agent text not null default '',
  add column if not exists platform text not null default 'web',
  add column if not exists is_active boolean not null default true,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop policy if exists "Users can update their own subscriptions"
  on public.notification_subscriptions;
create policy "Users can update their own subscriptions"
  on public.notification_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own subscriptions"
  on public.notification_subscriptions;
create policy "Users can delete their own subscriptions"
  on public.notification_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_notification_subscriptions_active
  on public.notification_subscriptions(user_id)
  where is_active;

drop trigger if exists set_notification_subscriptions_updated_at
  on public.notification_subscriptions;
create trigger set_notification_subscriptions_updated_at
  before update on public.notification_subscriptions
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- 2. PREFERENZE DI NOTIFICA (una riga per utente)
-- ------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id             uuid primary key references public.users(id) on delete cascade,
  enabled             boolean not null default true,
  daily_reminders     boolean not null default true,
  reminder            boolean not null default true,
  clues               boolean not null default true,
  quizzes             boolean not null default true,
  special             boolean not null default true,
  finale              boolean not null default true,
  preferred_time      time not null default '08:00',
  quiet_hours_start   time not null default '22:00',
  quiet_hours_end     time not null default '07:00',
  timezone            text not null default 'Europe/Rome',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can read their own notification preferences"
  on public.notification_preferences;
create policy "Users can read their own notification preferences"
  on public.notification_preferences for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own notification preferences"
  on public.notification_preferences;
create policy "Users can create their own notification preferences"
  on public.notification_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own notification preferences"
  on public.notification_preferences;
create policy "Users can update their own notification preferences"
  on public.notification_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_notification_preferences_updated_at
  on public.notification_preferences;
create trigger set_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- 3. SCHEDULED_NOTIFICATIONS: campi per invio reale
-- ------------------------------------------------------------
alter table public.scheduled_notifications
  add column if not exists kind text not null default 'special',
  add column if not exists url text not null default '/dashboard',
  add column if not exists audience text not null default 'all',
  add column if not exists target_user_id uuid references public.users(id) on delete set null,
  add column if not exists dedupe_key text,
  add column if not exists status text not null default 'pending',
  add column if not exists attempts integer not null default 0,
  add column if not exists recipients_count integer not null default 0,
  add column if not exists sent_at timestamptz,
  add column if not exists last_error text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'scheduled_notifications_kind_check'
  ) then
    alter table public.scheduled_notifications
      add constraint scheduled_notifications_kind_check
      check (kind in ('daily', 'reminder', 'content', 'clue', 'quiz', 'special', 'finale'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'scheduled_notifications_audience_check'
  ) then
    alter table public.scheduled_notifications
      add constraint scheduled_notifications_audience_check
      check (audience in ('all', 'admins', 'day_openers', 'not_opened', 'user'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'scheduled_notifications_status_check'
  ) then
    alter table public.scheduled_notifications
      add constraint scheduled_notifications_status_check
      check (status in ('pending', 'sending', 'sent', 'failed', 'skipped'));
  end if;
end $$;

create unique index if not exists idx_scheduled_notifications_dedupe
  on public.scheduled_notifications(dedupe_key)
  where dedupe_key is not null;

create index if not exists idx_scheduled_notifications_due
  on public.scheduled_notifications(status, scheduled_for)
  where is_active;

-- ------------------------------------------------------------
-- 4. LOG DELLE CONSEGNE (solo service role in scrittura)
--    Il vincolo su dedupe_key garantisce l'idempotenza.
-- ------------------------------------------------------------
create table if not exists public.notification_deliveries (
  id               uuid primary key default gen_random_uuid(),
  notification_id  uuid references public.scheduled_notifications(id) on delete set null,
  user_id          uuid not null references public.users(id) on delete cascade,
  subscription_id  uuid references public.notification_subscriptions(id) on delete set null,
  kind             text not null,
  title            text not null default '',
  dedupe_key       text not null,
  status           text not null default 'pending'
                   check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts         integer not null default 0,
  error            text,
  sent_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint notification_deliveries_dedupe_unique unique (dedupe_key)
);

alter table public.notification_deliveries enable row level security;

drop policy if exists "Admins can read notification deliveries"
  on public.notification_deliveries;
create policy "Admins can read notification deliveries"
  on public.notification_deliveries for select
  to authenticated
  using (public.is_admin());

-- Nessuna policy di INSERT/UPDATE/DELETE: scrive solo il service role.
create index if not exists idx_notification_deliveries_notification
  on public.notification_deliveries(notification_id, created_at desc);
create index if not exists idx_notification_deliveries_user
  on public.notification_deliveries(user_id, created_at desc);

drop trigger if exists set_notification_deliveries_updated_at
  on public.notification_deliveries;
create trigger set_notification_deliveries_updated_at
  before update on public.notification_deliveries
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Christmas Wonderland – FASE 6: ricordi, collezioni e album
-- Migration: 006_memories_and_collections.sql
--
-- SOLO AGGIUNTIVO / CORRETTIVO:
--   * metadati collezionistici sulle tabelle già esistenti
--     (categoria, rarità, descrizione speciale, sagoma anticipata);
--   * collegamento esplicito tra scatola finale e regalo fisico;
--   * nuove tabelle per il diario personale e i ricordi admin;
--   * irrigidimento delle scritture delle sfere (solo server);
--   * nessun DROP di dati, nessuna cancellazione, nessun contenuto demo.
--
-- NON applicare automaticamente al progetto remoto: eseguire manualmente nel
-- SQL Editor dopo 001–005.
-- ============================================================

-- ------------------------------------------------------------
-- 1. METADATI COLLEZIONISTICI – contenuti delle caselle
-- ------------------------------------------------------------
alter table public.physical_contents
  add column if not exists category text not null default '',
  add column if not exists rarity text not null default 'comune',
  add column if not exists special_description text not null default '',
  add column if not exists show_silhouette boolean not null default false,
  add column if not exists clue_group text,
  add column if not exists related_content_ids jsonb not null default '[]'::jsonb;

comment on column public.physical_contents.rarity is
  'Rarità mostrata nella collezione: comune, raro, speciale, leggendario.';
comment on column public.physical_contents.show_silhouette is
  'Se true, un oggetto non ancora ottenuto può apparire come sagoma (solo dopo lo sblocco del giorno).';
comment on column public.physical_contents.related_content_ids is
  'Elenco di id di altri contenuti (indizi) collegati. Mostrato solo per gli indizi già scoperti.';

-- ------------------------------------------------------------
-- 2. METADATI COLLEZIONISTICI – regali fisici
-- ------------------------------------------------------------
alter table public.physical_gifts
  add column if not exists category text not null default 'regalo',
  add column if not exists rarity text not null default 'comune',
  add column if not exists special_description text not null default '',
  add column if not exists show_silhouette boolean not null default false;

-- ------------------------------------------------------------
-- 3. METADATI COLLEZIONISTICI – simboli
-- ------------------------------------------------------------
alter table public.gift_symbols
  add column if not exists category text not null default 'simbolo',
  add column if not exists rarity text not null default 'comune',
  add column if not exists show_silhouette boolean not null default false;

-- ------------------------------------------------------------
-- 4. SFERE DELLA MEMORIA – istanti di sblocco e scoperta
--
-- `is_unlocked` esiste già dalla Fase 4. Qui aggiungiamo solo i timestamp
-- usati dal diario e dall'album. Le scritture vengono spostate al service role
-- (vedi punto 7): un utente non può sbloccarsi una sfera da solo.
-- ------------------------------------------------------------
alter table public.memory_spheres
  add column if not exists unlocked_at timestamptz,
  add column if not exists discovered_at timestamptz;

-- ------------------------------------------------------------
-- 5. SCATOLA FINALE – collegamento al regalo fisico
--
-- Il 24 dicembre il riepilogo deve poter mostrare il regalo reale
-- (il pupazzo) senza duplicare il sistema della scatola finale.
-- ------------------------------------------------------------
alter table public.final_gift_boxes
  add column if not exists physical_gift_id uuid
    references public.physical_gifts(id) on delete set null;

-- ------------------------------------------------------------
-- 6. MEMORY_ENTRIES – ricordi configurati dall'amministratore
--
-- Una sola tabella per:
--   * ricordi dell'album (placement = 'album');
--   * momenti del diario (placement = 'diary');
--   * ricordi speciali del 24 dicembre (placement = 'finale').
--
-- I contenuti con `day_number` restano invisibili finché il giorno non è
-- sbloccato (policy RLS). Le condizioni aggiuntive sono valutate dal server.
-- ------------------------------------------------------------
create table if not exists public.memory_entries (
  id                    uuid primary key default gen_random_uuid(),
  placement             text not null default 'album'
                        check (placement in ('album', 'diary', 'finale')),
  kind                  text not null default 'special',
  title                 text not null,
  description           text not null default '',
  content               text not null default '',
  image_url             text,
  day_number            integer check (day_number between 1 and 24),
  related_content_id    uuid
                        references public.physical_contents(id) on delete set null,
  activation_conditions jsonb not null default '{}'::jsonb,
  is_active             boolean not null default true,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.memory_entries enable row level security;

drop policy if exists "Memory entries only after unlock" on public.memory_entries;
create policy "Memory entries only after unlock"
  on public.memory_entries for select
  to authenticated
  using (
    is_active
    and (
      day_number is null
      or exists (
        select 1
        from public.advent_days ad
        where ad.day_number = memory_entries.day_number
          and ad.unlock_date <= now()
      )
    )
  );

drop policy if exists "Admins can manage memory entries" on public.memory_entries;
create policy "Admins can manage memory entries"
  on public.memory_entries for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_memory_entries_placement
  on public.memory_entries (placement, is_active, sort_order);
create index if not exists idx_memory_entries_day
  on public.memory_entries (day_number);

drop trigger if exists set_memory_entries_updated_at on public.memory_entries;
create trigger set_memory_entries_updated_at
  before update on public.memory_entries
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- 7. DIARY_EVENTS – diario personale, deduplicato per chiave evento
--
-- Gli eventi sono generati dal server a partire dai progressi reali
-- (aperture, contenuti, quiz, password, regali, simboli, sfere, giorni
-- completati, ricordi admin, scatola finale). La chiave `event_key` è
-- deterministica: lo stesso evento non può essere inserito due volte.
--
-- Nessuna policy INSERT/UPDATE/DELETE per gli utenti: scrive solo il service
-- role dopo i controlli server-side. Lettura limitata al proprietario/admin.
-- ------------------------------------------------------------
create table if not exists public.diary_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  event_key   text not null,
  category    text not null
              check (category in (
                'apertura', 'contenuto', 'indizio', 'quiz', 'password',
                'oggetto', 'simbolo', 'sfera', 'giornata', 'speciale', 'finale'
              )),
  title       text not null,
  description text not null default '',
  day_number  integer check (day_number between 1 and 24),
  image_url   text,
  source_type text
              check (source_type in (
                'day', 'content', 'quiz', 'password', 'gift',
                'symbol', 'sphere', 'memory', 'final_box'
              )),
  source_id   uuid,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  constraint diary_events_user_key_unique unique (user_id, event_key)
);

alter table public.diary_events enable row level security;

drop policy if exists "Users can read own diary events" on public.diary_events;
create policy "Users can read own diary events"
  on public.diary_events for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Nessuna policy INSERT/UPDATE/DELETE: scrittura esclusivamente service role.

create index if not exists idx_diary_events_user_time
  on public.diary_events (user_id, occurred_at);
create index if not exists idx_diary_events_user_category
  on public.diary_events (user_id, category);
create index if not exists idx_diary_events_user_day
  on public.diary_events (user_id, day_number);

-- ------------------------------------------------------------
-- 8. SFERE – rimozione delle scritture client
--
-- Prima un utente poteva inserire/modificare/eliminare le proprie sfere.
-- Con la Fase 6 lo sblocco è automatico e verificato dal server; le righe
-- sono create/modificate solo dal pannello admin e dal service role.
-- La lettura resta limitata al proprietario.
-- ------------------------------------------------------------
drop policy if exists "Users can insert their own spheres" on public.memory_spheres;
drop policy if exists "Users can update their own spheres" on public.memory_spheres;
drop policy if exists "Users can delete their own spheres" on public.memory_spheres;

-- ------------------------------------------------------------
-- 9. INDICI DI LETTURA per collezione, album e galleria
-- ------------------------------------------------------------
create index if not exists idx_physical_contents_collection
  on public.physical_contents (kind, day_number, is_active);

create index if not exists idx_physical_gifts_day_active
  on public.physical_gifts (day_number, is_active, sort_order);

create index if not exists idx_gift_symbols_day_active
  on public.gift_symbols (day_number, is_active);

-- ============================================================
-- Fine migrazione 006. Nessun contenuto narrativo viene modificato.
-- ============================================================

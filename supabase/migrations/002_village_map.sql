-- ============================================================
-- Christmas Wonderland – Fase 3: mappa navigabile del villaggio
-- Migration: 002_village_map.sql
--
-- SOLO MIGRAZIONE AGGIUNTIVA:
--   * nuove tabelle (village_hotspots, village_hotspot_messages,
--     physical_contents)
--   * nuove colonne su village_locations (sort_order, is_active)
--   * seed delle 6 zone e dei 24 punti illustrati
--   * nessun DROP, nessuna cancellazione di dati
--
-- Le associazioni luogo → giorno vivono SOLO qui nel database: il codice non
-- contiene alcuna data per un luogo e, se questa migrazione non è applicata,
-- il villaggio usa il catalogo illustrato con tutti i punti chiusi.
-- ============================================================

-- ------------------------------------------------------------
-- 1. VILLAGE_LOCATIONS – ordinamento e attivazione
-- ------------------------------------------------------------
alter table public.village_locations
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true;

-- ------------------------------------------------------------
-- 2. VILLAGE_HOTSPOTS – i 24 punti interattivi
--
-- Contiene solo metadati visivi e l'associazione al giorno. I testi narrativi
-- stanno in village_hotspot_messages, protetti da RLS fino allo sblocco.
-- ------------------------------------------------------------
create table if not exists public.village_hotspots (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.village_locations(id) on delete cascade,
  slug         text not null unique,
  name         text not null,
  kind         text not null
               check (kind in (
                 'tree','fountain','bench','lamp',
                 'mailbox','post-counter','archive','sled',
                 'oven','pastry-window','cafe-table','pantry',
                 'toy-train','toy-window','toy-shelf','rocking-horse',
                 'workbench','fireplace','toy-machine','warehouse',
                 'bridge','chalet','lake-sled','shore-lantern'
               )),
  position_x   numeric(5,2) not null check (position_x between 0 and 100),
  position_y   numeric(5,2) not null check (position_y between 0 and 100),
  day_number   integer check (day_number between 1 and 24),
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.village_hotspots enable row level security;

drop policy if exists "Hotspots are readable by authenticated users"
  on public.village_hotspots;
create policy "Hotspots are readable by authenticated users"
  on public.village_hotspots for select
  to authenticated
  using (true);

drop policy if exists "Admins can manage hotspots"
  on public.village_hotspots;
create policy "Admins can manage hotspots"
  on public.village_hotspots for all
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create index if not exists idx_village_hotspots_location
  on public.village_hotspots(location_id);
create index if not exists idx_village_hotspots_day
  on public.village_hotspots(day_number);
create index if not exists idx_village_hotspots_order
  on public.village_hotspots(sort_order);

drop trigger if exists set_village_hotspots_updated_at on public.village_hotspots;
create trigger set_village_hotspots_updated_at before update on public.village_hotspots
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- 3. VILLAGE_HOTSPOT_MESSAGES – testi narrativi per luogo
--
-- RLS: leggibili solo quando il giorno associato al luogo è sbloccato.
-- Prima di allora i teaser/messaggi non sono prelevabili nemmeno con una
-- query diretta all'API. In assenza di riga, l'app usa i testi di default
-- definiti in src/lib/story.ts.
-- ------------------------------------------------------------
create table if not exists public.village_hotspot_messages (
  id             uuid primary key default gen_random_uuid(),
  hotspot_id     uuid not null unique references public.village_hotspots(id) on delete cascade,
  hint           text not null default '',
  nico_message   text not null default '',
  nico_expression text not null default 'happy'
                 check (nico_expression in ('happy','curious','surprised','mysterious')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.village_hotspot_messages enable row level security;

drop policy if exists "Hotspot messages only after unlock"
  on public.village_hotspot_messages;
create policy "Hotspot messages only after unlock"
  on public.village_hotspot_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.village_hotspots h
      join public.advent_days ad on ad.day_number = h.day_number
      where h.id = village_hotspot_messages.hotspot_id
        and ad.unlock_date <= now()
    )
  );

drop policy if exists "Admins can manage hotspot messages"
  on public.village_hotspot_messages;
create policy "Admins can manage hotspot messages"
  on public.village_hotspot_messages for all
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create index if not exists idx_village_hotspot_messages_hotspot
  on public.village_hotspot_messages(hotspot_id);

drop trigger if exists set_village_hotspot_messages_updated_at
  on public.village_hotspot_messages;
create trigger set_village_hotspot_messages_updated_at
  before update on public.village_hotspot_messages
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- 4. PHYSICAL_CONTENTS – contenuti fisici collegati a giorno e luogo
--
-- Fase 3: solo struttura e relazioni (nessuna UI). Ogni giorno può avere più
-- contenuti: lettere, biglietti, oggetti, foto, indizi, enigmi, password.
-- La password reale resta nella scatola fisica: qui si conserva solo
-- l'eventuale suggerimento mostrabile.
--
-- RLS: visibile solo dopo unlock_date del giorno, come i regali fisici.
-- ------------------------------------------------------------
create table if not exists public.physical_contents (
  id                uuid primary key default gen_random_uuid(),
  hotspot_id        uuid references public.village_hotspots(id) on delete set null,
  day_number        integer not null check (day_number between 1 and 24),
  kind              text not null
                    check (kind in ('letter','note','object','photo','clue','puzzle','password')),
  title             text not null,
  content           text not null default '',
  password_required boolean not null default false,
  password_hint     text,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.physical_contents enable row level security;

drop policy if exists "Physical contents only after unlock"
  on public.physical_contents;
create policy "Physical contents only after unlock"
  on public.physical_contents for select
  to authenticated
  using (
    exists (
      select 1 from public.advent_days ad
      where ad.day_number = physical_contents.day_number
        and ad.unlock_date <= now()
    )
  );

drop policy if exists "Admins can manage physical contents"
  on public.physical_contents;
create policy "Admins can manage physical contents"
  on public.physical_contents for all
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create index if not exists idx_physical_contents_day
  on public.physical_contents(day_number);
create index if not exists idx_physical_contents_hotspot
  on public.physical_contents(hotspot_id);

drop trigger if exists set_physical_contents_updated_at on public.physical_contents;
create trigger set_physical_contents_updated_at before update on public.physical_contents
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- 5. SEED – le 6 zone del villaggio
--
-- Gli slug sono chiavi stabili usate dall'illustrazione e dal codice:
-- l'admin può modificare nome, descrizione e posizione, ma non lo slug.
-- ------------------------------------------------------------
insert into public.village_locations
  (slug, name, description, position_x, position_y, sort_order, is_active)
values
  ('piazza-centrale', 'Piazza Centrale',
   'Il cuore del villaggio, dove la Stella di Natale veglia sulle case.',
   50.00, 55.00, 1, true),
  ('ufficio-postale', 'Ufficio Postale',
   'Letterine, pacchi e storie in viaggio verso il Polo Nord.',
   20.00, 38.00, 2, true),
  ('pasticceria', 'Pasticceria',
   'Profumo di cannella, biscotti e cioccolata calda.',
   82.00, 76.00, 3, true),
  ('negozio-giocattoli', 'Negozio dei Giocattoli',
   'Giocattoli di legno e meraviglie costruite a mano.',
   20.00, 80.00, 4, true),
  ('laboratorio-babbo-natale', 'Laboratorio di Babbo Natale',
   'Dove i desideri prendono forma tra seghetti e nastri dorati.',
   72.00, 34.00, 5, true),
  ('lago-ghiacciato', 'Lago Ghiacciato',
   'Il lago dove il villaggio pattina sotto le stelle.',
   50.00, 86.00, 6, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  position_x = excluded.position_x,
  position_y = excluded.position_y,
  sort_order = excluded.sort_order,
  is_active = true;

-- Le 4 location dimostrative del seed 001 non fanno parte del villaggio
-- illustrato: restano nel database (nessuna cancellazione) ma disattivate.
update public.village_locations
set is_active = false
where slug in (
  'bottega-dei-giocattoli',
  'panetteria',
  'bosco-incantato',
  'lago-gelato'
);

-- ------------------------------------------------------------
-- 6. SEED – i 24 punti interattivi
--
-- L'associazione ai giorni 1..24 è una configurazione iniziale, pensata per
-- essere modificata dall'admin (day_number è nullable e modificabile).
-- Posizioni in percentuale sul mondo illustrato (1600 × 1100).
-- ------------------------------------------------------------
insert into public.village_hotspots
  (location_id, slug, name, kind, position_x, position_y, day_number, sort_order)
select
  l.id, v.slug, v.name, v.kind, v.position_x, v.position_y, v.day_number, v.sort_order
from (values
  -- Piazza Centrale
  ('piazza-centrale', 'albero-di-natale', 'Sotto il grande albero', 'tree', 50.00, 45.91, 1, 1),
  ('piazza-centrale', 'fontana-ghiacciata', 'Fontana ghiacciata', 'fountain', 37.50, 60.00, 2, 2),
  ('piazza-centrale', 'panchina-innevata', 'Panchina innevata', 'bench', 55.00, 65.45, 3, 3),
  ('piazza-centrale', 'lampione-decorato', 'Lampione decorato', 'lamp', 66.25, 62.73, 4, 4),
  -- Ufficio Postale
  ('ufficio-postale', 'cassetta-delle-lettere', 'Cassetta delle lettere', 'mailbox', 8.13, 40.91, 5, 5),
  ('ufficio-postale', 'sportello-postale', 'Sportello postale', 'post-counter', 20.63, 33.64, 6, 6),
  ('ufficio-postale', 'archivio-delle-lettere', 'Archivio delle lettere', 'archive', 30.00, 40.91, 7, 7),
  ('ufficio-postale', 'slitta-parcheggiata', 'Slitta parcheggiata', 'sled', 35.00, 47.27, 8, 8),
  -- Pasticceria
  ('pasticceria', 'forno', 'Forno', 'oven', 70.00, 80.91, 9, 9),
  ('pasticceria', 'vetrina-dei-dolci', 'Vetrina dei dolci', 'pastry-window', 81.25, 73.64, 10, 10),
  ('pasticceria', 'tavolino-esterno', 'Tavolino esterno', 'cafe-table', 91.25, 80.91, 11, 11),
  ('pasticceria', 'dispensa', 'Dispensa', 'pantry', 95.63, 89.09, 12, 12),
  -- Negozio dei Giocattoli
  ('negozio-giocattoli', 'trenino', 'Trenino', 'toy-train', 30.00, 87.27, 13, 13),
  ('negozio-giocattoli', 'vetrina-principale', 'Vetrina principale', 'toy-window', 18.75, 74.55, 14, 14),
  ('negozio-giocattoli', 'scaffale-dei-giocattoli', 'Scaffale dei giocattoli', 'toy-shelf', 8.13, 82.73, 15, 15),
  ('negozio-giocattoli', 'cavallo-a-dondolo', 'Cavallo a dondolo', 'rocking-horse', 4.38, 91.82, 16, 16),
  -- Laboratorio di Babbo Natale
  ('laboratorio-babbo-natale', 'banco-da-lavoro', 'Banco da lavoro', 'workbench', 63.75, 39.09, 17, 17),
  ('laboratorio-babbo-natale', 'camino', 'Camino', 'fireplace', 77.50, 30.91, 18, 18),
  ('laboratorio-babbo-natale', 'macchina-dei-giocattoli', 'Macchina dei giocattoli', 'toy-machine', 86.88, 40.00, 19, 19),
  ('laboratorio-babbo-natale', 'magazzino', 'Magazzino', 'warehouse', 70.63, 46.36, 20, 20),
  -- Lago Ghiacciato
  ('lago-ghiacciato', 'ponte', 'Ponte', 'bridge', 43.75, 78.00, 21, 21),
  ('lago-ghiacciato', 'chalet', 'Chalet', 'chalet', 61.25, 84.73, 22, 22),
  ('lago-ghiacciato', 'slitta-sul-lago', 'Slitta sul lago', 'lake-sled', 53.75, 92.00, 23, 23),
  ('lago-ghiacciato', 'lanterna-sulla-riva', 'Lanterna sulla riva', 'shore-lantern', 35.94, 84.09, 24, 24)
) as v(zone_slug, slug, name, kind, position_x, position_y, day_number, sort_order)
join public.village_locations l on l.slug = v.zone_slug
on conflict (slug) do update set
  location_id = excluded.location_id,
  name = excluded.name,
  kind = excluded.kind,
  position_x = excluded.position_x,
  position_y = excluded.position_y,
  day_number = excluded.day_number,
  sort_order = excluded.sort_order,
  is_active = true;

-- ============================================================
-- Fine migrazione 002. Nessun dato esistente viene eliminato.
-- ============================================================

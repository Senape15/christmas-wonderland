-- ============================================================
-- Verifica struttura dello schema (nessuna credenziale necessaria:
-- eseguito via `supabase db execute` che legge config.toml)
-- ============================================================

-- 1. Tutte le tabelle previste dalla Fase 1
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

-- 2. RLS abilitato su tutte le tabelle
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;

-- 3. Conteggio policy per tabella
select schemaname, tablename, count(*) as policies
from pg_policy
where schemaname = 'public'
group by schemaname, tablename
order by tablename;

-- 4. Vincoli di unicità
select conrelid::regclass as tabella, conname, pg_get_constraintdef(oid) as definizione
from pg_constraint
where contype = 'u' and connamespace = 'public'::regnamespace
order by tabella::text;

-- 5. Seed: giorni di Avvento e location
select day_number, title, unlock_date <= now() as sbloccato
from public.advent_days order by day_number limit 5;

select slug, name from public.village_locations order by slug;

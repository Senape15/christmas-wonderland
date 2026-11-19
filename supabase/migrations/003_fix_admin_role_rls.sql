-- ============================================================
-- Christmas Wonderland – Fix autorizzazione admin
-- Migration: 003_fix_admin_role_rls.sql
--
-- MOTIVAZIONE TECNICA (obbligatoria per toccare le policy RLS):
-- la policy "Admins can view all users" creata nella migrazione 001
-- interroga la STESSA tabella `public.users`:
--
--   using ( exists (select 1 from public.users u
--                    where u.id = auth.uid() and u.role = 'admin') )
--
-- PostgreSQL rileva il riferimento ricorsivo e solleva:
--   ERROR: infinite recursion detected in policy for relation "users"
--   SQLSTATE: 42P17
--
-- La SELECT con cui getCurrentUser() legge il ruolo fallisce. Il vecchio
-- codice nascondeva l'errore e restituiva 'user': anche un account promosso
-- ad admin veniva visto come utente normale e requireAdmin() lo respingeva.
--
-- Soluzione: funzione SECURITY DEFINER (eseguita come proprietario della
-- tabella, quindi senza RLS) che legge il ruolo. Le policy di `users` che
-- fanno auto-join vengono rimosse, anche se hanno un nome diverso.
--
-- SOLO CORRETTIVO: nessuna DROP TABLE, nessuna modifica dei dati, RLS resta
-- attiva e requireAdmin() resta la guardia di /admin.
-- Eseguire in Supabase SQL Editor.
-- ============================================================

-- 1. Funzione sicura per leggere il ruolo senza autoriferimenti RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'Legge il ruolo admin come proprietario della tabella: evita la ricorsione RLS su public.users.';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2. Rimuove TUTTE le policy di lettura di public.users che possono
--    contenere un auto-join, indipendentemente dal nome scelto al momento
--    in cui è stata creata. Vengono preservate solo le policy "own record".
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and cmd in ('SELECT', 'ALL')
      and policyname not in (
        'Users can view their own record',
        'Users can update their own record'
      )
  loop
    raise notice 'Rimozione policy ricorsiva: %', policy_row.policyname;
    execute format('drop policy %I on public.users', policy_row.policyname);
  end loop;
end $$;

-- 3. Ricrea la policy admin usando la funzione SECURITY DEFINER.
drop policy if exists "Admins can view all users" on public.users;
create policy "Admins can view all users"
  on public.users for select
  to authenticated
  using (public.is_admin());

-- ============================================================
-- VERIFICA (da eseguire sempre in SQL Editor dopo la migrazione):
--
--   select public.is_admin() as is_admin;              -- deve dare true
--   select policyname, qual::text from pg_policies
--   where schemaname = 'public' and tablename = 'users';
--     -- "Users can view their own record"  → (auth.uid() = id)
--     -- "Admins can view all users"        → public.is_admin()
--
-- Poi logout/login nell'app e aprire /admin.
-- ============================================================

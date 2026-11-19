-- ============================================================
-- FASE 8 – Correzioni di sicurezza lato database
-- ============================================================
-- SCRITTA MA NON APPLICATA: eseguire a mano nello SQL Editor solo dopo
-- autorizzazione esplicita e backup. Non disattiva RLS, non elimina tabelle,
-- non inserisce dati demo. È idempotente.
--
-- 1) La policy "Users can update their own record" della 001 consente a
--    qualunque utente autenticato di cambiare il proprio `role` in 'admin'
--    via PostgREST: `with check (auth.uid() = id)` non protegge la colonna.
--    Il ruolo è letto da public.users da getCurrentUser()/requireAdmin() e da
--    public.is_admin() nelle policy: l'auto-promozione darebbe accesso admin.
--    Il trigger blocca il cambio di ruolo alle sessioni `authenticated`;
--    i cambiamenti fatti dal server con service_role e dallo SQL Editor
--    (postgres) restano possibili, così come la Server Action setUserRole.
-- 2) La policy della simulazione admin controlla solo is_admin(): due admin
--    potevano leggere/modificare la simulazione dell'altro via API diretta.

create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and current_user = 'authenticated'
  then
    raise exception 'Il ruolo applicativo può essere modificato solo dal server';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_role_self_change on public.users;
create trigger trg_prevent_role_self_change
  before update on public.users
  for each row execute function public.prevent_role_self_change();

drop policy if exists "Admins can manage own simulation" on public.admin_date_simulations;
create policy "Admins can manage own simulation"
  on public.admin_date_simulations for all
  to authenticated
  using (public.is_admin() and admin_id = auth.uid())
  with check (public.is_admin() and admin_id = auth.uid());

-- Verifiche da eseguire dopo l'applicazione (SQL Editor):
--  select tgname from pg_trigger
--    where tgrelid = 'public.users'::regclass
--      and tgname = 'trg_prevent_role_self_change';  -- 1 riga
--  select policyname from pg_policies
--    where tablename = 'admin_date_simulations'
--      and policyname = 'Admins can manage own simulation';  -- 1 riga

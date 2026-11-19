-- ============================================================
-- Christmas Wonderland – FASE 5: esperienza quotidiana
-- Migration: 005_experience_and_security.sql
--
-- SOLO AGGIUNTIVO / CORRETTIVO:
--   * irrigidimento delle policy di scrittura sui progressi
--   * completamento della scatola finale (nuova tabella, senza duplicati)
--   * indice univoco che impedisce punteggi/quiz corretti duplicati
--   * allineamento delle date di sblocco alla mezzanotte di Europe/Rome
--
-- Le scritture di tentativi, completamenti e risposte ai quiz avvengono
-- esclusivamente nelle Server Actions con il client service role, dopo la
-- verifica server-side. Nessuna policy INSERT viene concessa agli utenti:
-- una richiesta diretta all'API non può falsificare un premio.
-- ============================================================

-- ------------------------------------------------------------
-- 1. APERTURE – un utente può aprire solo un giorno già sbloccato
--    (prima la policy controllava solo auth.uid() = user_id)
-- ------------------------------------------------------------
drop policy if exists "Users can insert their own openings" on public.user_openings;
drop policy if exists "Users can insert their own openings only when unlocked"
  on public.user_openings;

create policy "Users can insert their own openings only when unlocked"
  on public.user_openings for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.advent_days ad
      where ad.day_number = user_openings.day_number
        and ad.unlock_date <= now()
    )
  );

-- ------------------------------------------------------------
-- 2. PASSWORD – tentativi e completamenti registrati solo dal server
-- ------------------------------------------------------------
drop policy if exists "Server can record password attempts" on public.password_attempts;
drop policy if exists "Server can record password completions" on public.password_completions;

-- Lettura: resta consentita solo al proprietario (e agli admin).
-- Nessuna policy INSERT: service role (Server Actions) oppure nulla.

-- ------------------------------------------------------------
-- 3. QUIZ – tentativi registrati solo dal server, un solo successo
-- ------------------------------------------------------------
drop policy if exists "Users can insert their own attempts" on public.user_quiz_attempts;

-- Deduplica eventuali successi già presenti prima di creare l'indice univoco.
delete from public.user_quiz_attempts a
using public.user_quiz_attempts b
where a.user_id = b.user_id
  and a.quiz_id = b.quiz_id
  and a.is_correct
  and b.is_correct
  and (
    a.created_at > b.created_at
    or (a.created_at = b.created_at and a.id > b.id)
  );

create unique index if not exists uniq_user_quiz_correct_once
  on public.user_quiz_attempts (user_id, quiz_id)
  where is_correct;

-- ------------------------------------------------------------
-- 4. SCATOLA FINALE – completamento personale e non duplicabile
-- ------------------------------------------------------------
create table if not exists public.final_box_completions (
  user_id      uuid not null references public.users(id) on delete cascade,
  box_id       uuid not null references public.final_gift_boxes(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, box_id)
);

alter table public.final_box_completions enable row level security;

drop policy if exists "Users can read own final box completions"
  on public.final_box_completions;
create policy "Users can read own final box completions"
  on public.final_box_completions for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Nessuna policy INSERT: la scrittura passa dal service role dopo la verifica
-- della password e della data di rivelazione.

create index if not exists idx_final_box_completions_user
  on public.final_box_completions(user_id);

-- ------------------------------------------------------------
-- 5. DATE DI SBLOCCO – mezzanotte di Europe/Rome
--
-- Il seed iniziale creava le date a mezzanotte UTC: in Italia il giorno si
-- apriva alle 01:00. Normalizziamo l'istante alla mezzanotte civile di Roma.
-- L'operazione è idempotente e non tocca giorni, titoli o progressi.
-- ------------------------------------------------------------
update public.advent_days
set unlock_date =
  (date_trunc('day', unlock_date at time zone 'Europe/Rome'))
  at time zone 'Europe/Rome'
where unlock_date <>
  ((date_trunc('day', unlock_date at time zone 'Europe/Rome'))
   at time zone 'Europe/Rome');

-- ------------------------------------------------------------
-- 6. INDICI DI LETTURA per l'esperienza quotidiana
-- ------------------------------------------------------------
create index if not exists idx_physical_contents_day_active
  on public.physical_contents (day_number, is_active, sort_order);

create index if not exists idx_quizzes_day_active
  on public.quizzes (day_number, is_active);

create index if not exists idx_password_completions_user
  on public.password_completions (user_id);

-- ============================================================
-- Fine migrazione 005. Nessun contenuto narrativo viene modificato.
-- ============================================================

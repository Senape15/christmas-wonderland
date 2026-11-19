# Configurazione Supabase

Questa guida descrive come configurare il backend Supabase per Christmas Wonderland.

## 1. Creare il progetto

1. Vai su [supabase.com](https://supabase.com) e crea un nuovo progetto.
2. Annota **Project URL** e le chiavi API (*Project Settings → API*).

## 2. Applicare lo schema

Apri **SQL Editor** nel dashboard Supabase, incolla tutto il contenuto di
`supabase/migrations/001_initial_schema.sql` ed esegui (*Run*).

Lo script crea:

- 16 tabelle con UUID primary key e timestamp `timestamptz`
- Trigger `on_auth_user_created` che popola automaticamente `users` + `user_profiles`
  al primo login/signup
- Trigger `set_updated_at` sulle tabelle con colonna `updated_at`
- Seed dei 24 giorni di Avvento (unlock date a dicembre dell'anno corrente)
- Seed di 5 location iniziali del villaggio

### 2.1 Fase 3 – Villaggio navigabile (migrazione 002)

Sempre in **SQL Editor**, incolla e esegui l'intero contenuto di
`supabase/migrations/002_village_map.sql` **dopo** la 001. È una migrazione
aggiuntiva e idempotente: non elimina tabelle, righe o policy esistenti.

Lo script crea:

- le colonne `sort_order` e `is_active` su `village_locations`;
- `village_hotspots`: 24 punti illustrati con posizione percentuale, tipo,
  `day_number` configurabile e `is_active`;
- `village_hotspot_messages`: teaser e messaggi di Nico per luogo;
- `physical_contents`: contenuti fisici collegati a giorno e luogo;
- indici, trigger `updated_at` e policy RLS sulle nuove tabelle;
- seed delle 6 zone e dei 24 punti (giorni 1–24 modificabili dall'admin).

Le 4 location dimostrative della Fase 1 vengono solo **disattivate**
(`is_active = false`), non cancellate.

Dopo l'esecuzione verifica in *Table Editor*:

- `village_locations`: 6 righe con `is_active = true`;
- `village_hotspots`: 24 righe;
- `village_hotspot_messages` e `physical_contents`: esistono, anche se vuote.

Se la migrazione non viene applicata, l'app usa il catalogo illustrato di
riserva: i 24 luoghi restano visibili ma bloccati, senza associazioni a giorni.

### 2.2 Fase 3 – Correzione accesso admin (migrazione 003)

Esegui in SQL Editor anche `supabase/migrations/003_fix_admin_role_rls.sql`.
La policy `"Admins can view all users"` della migrazione 001 interroga la
stessa tabella `users`, generando l'errore PostgreSQL
`infinite recursion detected in policy for relation users`: la lettura del
ruolo falliva e l'app vedeva tutti come `user`.

La migrazione 003 crea `public.is_admin()` (`SECURITY DEFINER`, quindi non
soggetta a RLS) e sostituisce la policy ricorsiva con
`using (public.is_admin())`. Non disabilita RLS, non tocca i dati e non
rimuove `requireAdmin()`.

Verifica dopo l'esecuzione (da SQL Editor, con l'account admin):

```sql
select public.is_admin() as is_admin;  -- true
select role from public.users where id = 'd87ace72-e99e-49da-bdcc-b58b0239ff1c';  -- admin
```

Poi esegui logout/login nell'app e apri `/admin`.

Poi esegui in SQL Editor anche `supabase/migrations/004_admin_panel.sql`
(Fase 4). Aggiunge colonne alle tabelle esistenti, crea `physical_passwords`,
`password_attempts`, `password_completions`, `final_gift_boxes`,
`scheduled_notifications`, `admin_date_simulations`, il bucket Storage
`wonderland-media` e le policy admin con `public.is_admin()`.
Non elimina dati e non disattiva RLS.

Se la creazione del bucket fallisce, crealo da **Storage → New bucket**:
nome `wonderland-media`, public, limite 5 MB, MIME immagini.

### 2.3 Fase 5 – Esperienza quotidiana e sicurezza (migrazione 005)

> **Stato attuale: la migrazione 005 è applicata** al progetto Supabase
> remoto. Le istruzioni seguenti restano utili per un nuovo ambiente.

Sempre in **SQL Editor**, dopo la 004, incolla ed esegui
`supabase/migrations/005_experience_and_security.sql`. È una migrazione
additiva/correttiva:

- rimuove le policy INSERT client su `password_attempts`,
  `password_completions` e `user_quiz_attempts`: tentativi e completamenti
  saranno scritti solo dal service role nelle Server Actions, dopo la verifica
  server-side;
- sostituisce la policy INSERT di `user_openings` con una che richiede anche il
  giorno sbloccato;
- elimina eventuali successi quiz duplicati e crea l'indice univoco parziale
  `uniq_user_quiz_correct_once`, che impedisce punti doppi;
- crea `final_box_completions` (PK `(user_id, box_id)`, lettura al proprietario,
  nessun INSERT client);
- normalizza `advent_days.unlock_date` alla mezzanotte civile di `Europe/Rome`;
- aggiunge indici di lettura.

Verifica dopo l'esecuzione:

```sql
select count(*) from public.final_box_completions;

select indexname from pg_indexes
 where tablename = 'user_quiz_attempts'
   and indexname = 'uniq_user_quiz_correct_once';

select day_number, unlock_date,
       (unlock_date at time zone 'Europe/Rome')::date as giorno_roma
  from public.advent_days
 order by day_number;
```

Ogni `unlock_date` deve cadere alla mezzanotte civile di Roma del giorno
indicato. Poi fai logout/login e prova l'apertura di un giorno sbloccato.

> La migrazione elimina i successi quiz duplicati mantenendo il più vecchio.
> È un'operazione voluta: valuta un backup prima di eseguirla.

### 2.4 Fase 6 – Ricordi, collezioni e album (migrazione 006)

> **Stato attuale (2026-11-19): la migrazione 006 risulta applicata** sul
> progetto remoto (verifica in sola lettura di tabelle e colonne chiave).
> Queste istruzioni restano valide per un nuovo ambiente.

In **SQL Editor**, dopo la 005, incolla ed esegui
`supabase/migrations/006_memories_and_collections.sql`. È additiva e idempotente:

- aggiunge a `physical_contents`, `physical_gifts`, `gift_symbols` le colonne
  `category`, `rarity`, `special_description`, `show_silhouette` (più
  `clue_group` e `related_content_ids` sui contenuti);
- aggiunge `unlocked_at` e `discovered_at` a `memory_spheres`;
- aggiunge `physical_gift_id` a `final_gift_boxes` (il regalo fisico del 24);
- crea `memory_entries` (ricordi configurati dall'admin: album, diario, finale)
  e `diary_events` (diario personale con vincolo univoco `(user_id, event_key)`);
- rimuove le policy client INSERT/UPDATE/DELETE su `memory_spheres`: lo sblocco
  ora è automatico e verificato lato server;
- crea indici di lettura per collezione, album e galleria.

Nessun dato viene eliminato e RLS resta abilitata su ogni tabella. Le nuove
tabelle hanno policy di lettura solo per il proprietario (o per gli admin) e
nessuna scrittura client: `diary_events` è scritta dal service role, `memory_entries`
dall'admin.

Verifica dopo l'esecuzione:

```sql
select count(*) from public.memory_entries;
select count(*) from public.diary_events;

select column_name
  from information_schema.columns
 where table_name = 'physical_contents'
   and column_name in ('category', 'rarity', 'show_silhouette');

select polname
  from pg_policies
 where tablename = 'memory_spheres'
   and polname like '%their own%';  -- deve tornare vuoto
```

Dopo l'esecuzione fai logout/login: nei percorsi `/dashboard/diario`,
`/dashboard/album`, `/dashboard/collezione`, `/dashboard/indizi`,
`/dashboard/sfere`, `/dashboard/cronologia`, `/dashboard/galleria`,
`/dashboard/statistiche` e `/dashboard/ricordo-24` la nota «migrazione
necessaria» scompare e i ricordi vengono salvati.

### 2.5 Fase 7 – PWA e Web Push (migrazione 007)

> **Stato attuale (2026-11-19): la migrazione 007 risulta applicata** sul
> progetto remoto (verifica in sola lettura di tabelle e colonne chiave).
> L'app implementa la PWA anche senza di essa; preferenze e dispositivi
> richiedono la migrazione per essere salvati. Restano da configurare le
> chiavi VAPID e lo scheduler.

In **SQL Editor**, dopo la 006, incolla ed esegui
`supabase/migrations/007_push_notifications.sql`. È additiva e idempotente:

- estende `notification_subscriptions` con `user_agent`, `platform`,
  `is_active`, `last_seen_at`, `updated_at`, aggiungendo le policy `update` e
  `delete` per il proprietario (l'INSERT/lettura esistono dalla 001);
- crea `notification_preferences` (una riga per utente, RLS sul proprietario);
- crea `notification_deliveries` (log delle consegne con `dedupe_key` UNIQUE,
  lettura solo admin, scrittura solo service role);
- estende `scheduled_notifications` con `kind`, `audience`, `target_user_id`,
  `url`, `dedupe_key`, `status`, `attempts`, `recipients_count`, `sent_at`,
  `last_error` e i relativi vincoli;
- aggiunge indici per subscription attive, notifiche dovute e log.

Verifica dopo l'esecuzione:

```sql
select count(*) from public.notification_preferences;
select count(*) from public.notification_deliveries;

select column_name
  from information_schema.columns
 where table_name = 'scheduled_notifications'
   and column_name in ('kind', 'audience', 'status', 'dedupe_key');

select polname
  from pg_policies
 where tablename = 'notification_subscriptions'
   and polname like '%their own%';
```

### 2.6 Fase 8 – Sicurezza dei ruoli (migrazione 008)

> **Stato attuale: la migrazione 008 è scritta ma NON applicata.** Richiede
> backup e autorizzazione esplicita. Nessuna migrazione è stata applicata in
> questa sessione.

In SQL Editor, eseguire `supabase/migrations/008_role_security.sql` dopo la 007:

- crea un trigger che impedisce a una sessione `authenticated` di cambiare
  `public.users.role` (l'aggiornamento dal server con service_role e dallo SQL
  Editor resta possibile, così come `setUserRole`);
- vincola la policy della simulazione admin al proprio `admin_id`, così un
  admin non può leggere/modificare la simulazione di un altro tramite API.

Verifica:

```sql
select tgname from pg_trigger
 where tgrelid = 'public.users'::regclass
   and tgname = 'trg_prevent_role_self_change';
-- expected: 1 riga

select policyname from pg_policies
 where tablename = 'admin_date_simulations'
   and policyname = 'Admins can manage own simulation';
-- expected: 1 riga
```

Il test `supabase/seed/rls_verification.sql §6` verifica che un utente normale
non possa auto-promuoversi: senza la 008 l'aggiornamento riesce e il test
fallisce.

## 3. Row Level Security (RLS)

RLS è abilitato su ogni tabella. Le policy implementano:

- **users / user_profiles**: l'utente vede e modifica solo il proprio record;
  gli admin vedono tutto.
- **advent_days / elf_messages / quizzes / quiz_answers / physical_gifts / gift_symbols**:
  leggibili solo se `unlock_date <= now()`. Il confronto data è fatto dal
  database: il client non può mai vedere i regali futuri.
- **village_hotspots**: lettura agli utenti autenticati, scrittura solo admin.
- **village_hotspot_messages**: leggibili solo per i luoghi il cui giorno è già
  sbloccato; scrittura solo admin. In assenza di riga l'app usa i testi di
  default definiti in `src/lib/story.ts`.
- **physical_contents**: leggibili solo dopo lo sblocco del giorno; scrittura
  solo admin.
- **secret_messages / user_openings / user_quiz_attempts / user_photos /
  memory_spheres / notification_subscriptions**: accesso solo al proprietario
  (`auth.uid() = user_id`). Dopo la migrazione 005 le aperture si possono
  inserire solo per un giorno già sbloccato e i tentativi quiz non sono più
  inseribili dal client.
- **physical_passwords / final_gift_boxes**: leggibili e gestibili solo dagli
  admin. Gli hash delle password non raggiungono mai il browser.
- **password_attempts / password_completions / final_box_completions**: lettura
  al proprietario (e agli admin); dopo la 005 **nessun INSERT client**, perché
  le scritture avvengono esclusivamente con il service role dopo la verifica
  server-side.
- **quiz_answers**: le risposte corrette non sono leggibili dagli utenti normali;
  il client riceve solo id e testo delle risposte attive, e il testo corretto
  compare solo dopo una verifica positiva.
- **diary_events** (Fase 6): lettura solo al proprietario/admin, nessuna policy
  di scrittura per gli utenti; il service role scrive eventi con chiave univoca.
- **memory_entries** (Fase 6): lettura solo per righe attive e già sbloccate,
  gestione completa riservata agli admin tramite `public.is_admin()`.
- **memory_spheres** (Fase 6): dopo la 006 non esistono più policy client di
  inserimento/modifica/cancellazione; lo sblocco è deciso dal server.
- **notification_subscriptions** (Fase 7): lettura, inserimento, aggiornamento e
  cancellazione solo al proprietario (`auth.uid() = user_id`). Ogni dispositivo
  è una riga: più dispositivi per lo stesso utente sono supportati.
- **notification_preferences** (Fase 7): solo il proprietario può leggere e
  modificare le proprie preferenze.
- **notification_deliveries** (Fase 7): lettura agli admin, nessuna scrittura
  client; il ciclo di invio usa il service role.
- **scheduled_notifications**: gestione riservata agli admin; le tipologie e il
  pubblico sono validati anche dalle Server Actions.
- **app_settings**: lettura a tutti gli utenti autenticati, scrittura solo admin.
- Le policy admin usano una subquery sulla tabella `users` (ruolo `admin`),
  quindi non dipendono dal metadata JWT. **Eccezione**: la policy di lettura
  di `users` usa la funzione `public.is_admin()` (`SECURITY DEFINER`), perché
  un auto-join su `users` genera `infinite recursion detected in policy for
  relation users` e faceva leggere il ruolo come `user` a tutti (migrazione 003).

> Nota: il ruolo `authenticated` include sia admin che user; le policy admin
> verificano il ruolo nella tabella applicativa.

## 4. Autenticazione

*Authentication → Providers*:

- Attiva **Email** (password).
- *Site URL*: `http://localhost:3000`
- *Redirect URLs*: `http://localhost:3000/api/auth/callback`

La gestione sessione è delegata a `@supabase/ssr` (cookie-based,
PKCE flow) tramite `src/lib/supabase/server.ts` e `src/proxy.ts`.

Non esistono credenziali predefinite: il primo utente si registra dalla UI;
per promuovere un utente ad admin (prima creazione) esegui in SQL:

```sql
update public.users set role = 'admin' where email = 'tua.email@example.com';
```

## 5. Storage

Il bucket `wonderland-media` è stato creato dalla migrazione 004 ed è
**public-read**: contiene le immagini caricate dall'amministratore e gli asset
delle caselle. Le foto personali (`user_photos.storage_path`) sono trattate come
private: la galleria della Fase 6 genera **URL firmate di breve durata** con il
service role, senza pubblicare nuovi URL permanenti.

Se in futuro si vuole un bucket dedicato e privato per le foto utente:

| Bucket    | Public | Uso                        |
| --------- | ------ | -------------------------- |
| `photos`  | No     | Foto caricate dagli utenti |
| `avatars` | Sì     | Avatar profilo             |

Policy di esempio per `photos` (sola lettura/scrittura proprietario):

```sql
create policy "Users can upload their own photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
```

## 6. Variabili d'ambiente

Vedi [ENVIRONMENT.md](../ENVIRONMENT.md).

## 7. Web Push: chiavi VAPID e scheduler

### 7.1 Generare le chiavi VAPID

```bash
npx web-push generate-vapid-keys
```

Il comando stampa una chiave pubblica e una privata. Inseriscile in
`.env.local` (o nel gestore dei segreti della piattaforma):

| Variabile | Dove vive | Note |
| --- | --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Client + server | Serve a `PushManager.subscribe` |
| `VAPID_PRIVATE_KEY` | Solo server | Letta da `src/lib/push/config.ts` (`server-only`) |
| `VAPID_SUBJECT` | Solo server | `mailto:` o URL `https://` di contatto |

Regole:

- le chiavi VAPID non provengono da Supabase e non vanno ruotate a ogni deploy:
  cambiarle invalida tutte le subscription esistenti;
- la chiave privata non deve mai comparire in variabili `NEXT_PUBLIC_*`, nel
  database, nei log o in un repository;
- se manca una chiave, il delivery resta disattivato: l'app salva le preferenze
  e il pannello admin mostra «VAPID mancanti», senza inviare nulla.

### 7.2 Proteggere lo scheduler

`POST /api/push/cron` esegue il ciclo di invio (notifiche automatiche e
programmate). Richiede un segreto condiviso:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Salvalo in `PUSH_SCHEDULER_SECRET` (almeno 16 caratteri) e invialo in uno dei
due modi:

```http
Authorization: Bearer <PUSH_SCHEDULER_SECRET>
```

```http
x-wonderland-cron-secret: <PUSH_SCHEDULER_SECRET>
```

Senza segreto l'endpoint risponde `503`; con un segreto errato risponde `401`.
Il ciclo non viene mai avviato dal browser: non esiste alcun `setInterval` lato
client e l'app può restare chiusa.

### 7.3 Configurare un cron esterno

Qualsiasi scheduler che possa inviare una richiesta HTTP va bene. Esempio con
GitHub Actions (segreti nel repository, mai nel file):

```yaml
name: push-cycle
on:
  schedule:
    - cron: "*/15 * * * *"
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST "${{ secrets.APP_URL }}/api/push/cron" \
            -H "Authorization: Bearer ${{ secrets.PUSH_SCHEDULER_SECRET }}"
```

Con Supabase `pg_cron` + `pg_net` si può richiamare lo stesso endpoint dal
database, purché il segreto sia conservato in Vault e non scritto in chiaro
nella migration. Lo scheduler deve girare almeno ogni 15 minuti per rispettare
l'orario preferito e il promemoria (preferito + 4 ore).

Nessun invio parte per giorni futuri: il ciclo considera solo giorni già
sbloccati e rispetta preferenze, ore di silenzio, fuso `Europe/Rome` e chiavi
di deduplica.

## 8. Verifica

1. `npm run dev`
2. Registra un utente da `/register`.
3. Controlla in *Table Editor* che `users` e `user_profiles` siano popolati.
4. Da `/login` accedi e verifica il redirect a `/dashboard`.
5. Prova ad accedere a `/admin` con un utente non admin: deve reindirizzare a `/dashboard`.
6. Apri `/dashboard`: la mappa mostra 6 zone e 24 luoghi; i luoghi dei giorni
   futuri appaiono come decorazioni bloccate e non rivelano il giorno associato.
7. Apri il calendario: i 24 giorni mostrano i quattro stati (bloccato,
   disponibile, aperto, completato) e solo i giorni raggiunti sono apribili.
8. Apri un giorno sbloccato: la modale mostra i contenuti configurati, le
   password e i quiz. Verifica che:
   - una password errata non sblocchi il contenuto e consumi un tentativo;
   - una password corretta registri il completamento una sola volta;
   - una risposta quiz errata non riveli quella corretta;
   - una risposta corretta assegni i punti una sola volta;
   - i progressi in alto si aggiornino dopo il refresh.
9. Con la migrazione 005 applicata, il giorno 24 mostra la scatola finale e il
   messaggio di rivelazione solo dopo la password corretta.
10. Dopo la migrazione 006, verifica che le pagine del libro dei ricordi
    funzionino e che un secondo utente non veda eventi, oggetti o foto del primo.
11. Verifica che il riepilogo del 24 dicembre non mostri alcun contenuto finale
    prima dello sblocco del giorno e che la rivelazione resti vuota finché la
    scatola finale non viene aperta.
12. Dopo la migrazione 007, apri `/dashboard/impostazioni`: attiva le notifiche
    su un dispositivo, verifica che compaia nell'elenco e che la rimozione
    cancelli solo quel dispositivo.
13. Con le chiavi VAPID configurate, da `/admin/notifications` invia una
    notifica di prova: deve arrivare **solo** ai dispositivi
    dell'amministratore che l'ha richiesta. Controlla lo stato e gli eventuali
    errori nella console.
14. Richiama `POST /api/push/cron` con il segreto: la risposta riporta
    `sent`, `failed`, `skipped` ed `expired`. Senza segreto deve rispondere
    `503`/`401`.
15. Verifica la PWA: `/manifest.webmanifest` elenca le icone, il Service Worker
    è attivo, la pagina `/offline.html` appare senza rete e nessuna pagina
    `/dashboard` o `/admin` viene servita dalla cache dopo il logout.

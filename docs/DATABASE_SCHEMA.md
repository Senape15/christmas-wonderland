# Schema del database

Fonte unica di verità:

- `supabase/migrations/001_initial_schema.sql` – schema iniziale;
- `supabase/migrations/002_village_map.sql` – villaggio (Fase 3, additiva);
- `supabase/migrations/003_fix_admin_role_rls.sql` – correzione RLS admin;
- `supabase/migrations/004_admin_panel.sql` – pannello admin (Fase 4);
- `supabase/migrations/005_experience_and_security.sql` – esperienza
  quotidiana e irrigidimento delle scritture (Fase 5);
- `supabase/migrations/006_memories_and_collections.sql` – ricordi, collezioni e
  album (Fase 6);
- `supabase/migrations/007_push_notifications.sql` – PWA, Web Push, preferenze e
  log delle consegne (Fase 7);
- `supabase/migrations/008_role_security.sql` – correzioni di sicurezza Fase 8
  (blocco auto-promozione admin e scope della simulazione).

> **Stato (verifica in sola lettura del 2026-11-19):** le migrazioni **001–007
> risultano strutturalmente applicate** sul progetto remoto: tutte le tabelle e
> le colonne chiave sono presenti (`memory_entries`, `diary_events`,
> `memory_spheres.discovered_at`, `final_gift_boxes.physical_gift_id`,
> `notification_preferences`, `notification_deliveries`,
> `notification_subscriptions.is_active`, `scheduled_notifications.kind`,
> funzione `public.is_admin()`). La verifica via PostgREST non copre indici e
> policy SQL: confermarle nello SQL Editor. La **008 è scritta ma NON applicata**
> e richiede autorizzazione esplicita. Nessuna migrazione è stata applicata in
> questa sessione.

Convenzioni: chiavi primarie UUID (`gen_random_uuid()`), `created_at` /
`updated_at` in `timestamptz` (UTC, visualizzati in `Europe/Rome`), RLS abilitato
su ogni tabella.

## Tabella riassuntiva

| Tabella | Scopo | Proprietario |
| --- | --- | --- |
| `users` | Ruolo applicativo (admin/user) per ogni auth user | – |
| `user_profiles` | Nome e avatar | user |
| `advent_days` | Metadati dei 24 giorni + data sblocco | admin |
| `village_locations` | 6 zone del villaggio | admin |
| `village_hotspots` | 24 punti illustrati e giorno associato | admin |
| `village_hotspot_messages` | Teaser e messaggi di Nico per luogo | admin |
| `physical_contents` | Contenuti fisici (lettere, indizi, enigmi, password) | admin |
| `physical_passwords` | Hash password scatole (mai inviato al client) | admin |
| `password_attempts` | Tentativi password registrati dal server | user |
| `password_completions` | Scatole con password completata | user |
| `final_gift_boxes` | Configurazione scatola finale del 24 dicembre | admin |
| `final_box_completions` | Completamento personale della scatola finale (Fase 5) | user |
| `scheduled_notifications` | Notifiche programmate | admin |
| `admin_date_simulations` | Simulazione date (solo admin) | admin |
| `physical_gifts` | Regali fisici per location/giorno | admin |
| `gift_symbols` | Simboli collezionabili legati ai regali | admin |
| `elf_messages` | Messaggi giornalieri degli elfi | admin |
| `secret_messages` | Messaggi segreti privati per utente/giorno | user |
| `quizzes` | Quiz giornalieri | admin |
| `quiz_answers` | Risposte dei quiz (incluso `is_correct`) | admin |
| `user_quiz_attempts` | Tentativi quiz dell'utente | user |
| `user_openings` | Giorni aperti dall'utente | user |
| `user_photos` | Foto caricate dall'utente | user |
| `memory_spheres` | Sfera dei ricordi personale | user |
| `notification_subscriptions` | Endpoint Web Push e stato del dispositivo | user |
| `notification_preferences` | Preferenze di notifica per utente (Fase 7) | user |
| `notification_deliveries` | Log idempotente delle consegne (Fase 7) | admin (lettura) |
| `app_settings` | Configurazione globale key/value (jsonb) | admin |
| `memory_entries` | Ricordi configurati: album, diario, finale (Fase 6) | admin |
| `diary_events` | Diario personale deduplicato (Fase 6) | user |

## Relazioni principali

```
users 1──1 user_profiles
users 1──* secret_messages
users 1──* user_quiz_attempts
users 1──* user_openings
users 1──* user_photos
users 1──* memory_spheres
users 1──* notification_subscriptions
users 1──1 notification_preferences (Fase 7)
users 1──* notification_deliveries (Fase 7)
users 1──* password_attempts / password_completions
users 1──* final_box_completions
users 1──* diary_events (Fase 6)
users 1──* memory_spheres

advent_days 1──* (giorni riferiti da elf_messages, quizzes, physical_gifts,
                  secret_messages, user_openings, user_photos, physical_contents)

village_locations 1──* village_hotspots
village_hotspots 1──1 village_hotspot_messages
village_hotspots 0──* physical_contents
physical_contents 1──1 physical_passwords
physical_contents 1──* password_attempts / password_completions
quizzes 1──* quiz_answers
quizzes 1──* user_quiz_attempts
quiz_answers 1──* user_quiz_attempts (selected_answer_id)
final_gift_boxes 1──* final_box_completions
final_gift_boxes 0──1 physical_gifts (physical_gift_id, Fase 6)
physical_gifts 1──* gift_symbols

physical_contents 0──* memory_entries (related_content_id)
physical_contents 0──* physical_contents (related_content_ids, jsonb)
```

## Colonne rilevanti per la Fase 5

Aggiunte dalla Fase 4 e usate dall'esperienza quotidiana:

| Tabella | Colonne |
| --- | --- |
| `physical_contents` | `is_active`, `image_url`, `admin_notes`, `success_message`, `activation_conditions` (jsonb), `sort_order` |
| `physical_passwords` | `password_hash`, `hint`, `success_message`, `max_attempts`, `is_active` |
| `quizzes` | `hint`, `points`, `is_required`, `is_active`, `unlock_conditions` (jsonb) |
| `quiz_answers` | `hint`, `sort_order`, `is_active`, `is_correct` |
| `gift_symbols` | `description`, `image_url`, `day_number`, `location_id`, `discovery_conditions` (jsonb), `is_active` |
| `memory_spheres` | `day_number`, `location_id`, `is_unlocked`, `sort_order`, `activation_conditions` (jsonb) |
| `final_gift_boxes` | forma/colore/decorazioni, testi, indizi, oggetti, sequenza, `password_enabled`, `password_hash`, `password_hint`, `final_message`, `reveal_day`, `is_active` |
| `elf_messages` / `secret_messages` | `is_active`, `scheduled_for`, `event_key` |

### `final_box_completions` (Fase 5)

| Colonna | Tipo | Note |
| --- | --- | --- |
| `user_id` | uuid | FK `users(id)`, `on delete cascade` |
| `box_id` | uuid | FK `final_gift_boxes(id)`, `on delete cascade` |
| `completed_at` | timestamptz | default `now()` |

Chiave primaria `(user_id, box_id)`: un utente può completare una scatola una
sola volta. Lettura consentita al proprietario e agli admin; **nessuna policy
INSERT** (scrittura solo dal service role dopo la verifica server-side).

## Colonne e tabelle della Fase 6 (migrazione 006)

### Metadati collezionistici (tabelle esistenti)

| Tabella | Colonne aggiunte |
| --- | --- |
| `physical_contents` | `category` (testo), `rarity` (`comune`/`raro`/`speciale`/`leggendario`), `special_description`, `show_silhouette` (bool), `clue_group`, `related_content_ids` (jsonb, id di indizi collegati) |
| `physical_gifts` | `category`, `rarity`, `special_description`, `show_silhouette` |
| `gift_symbols` | `category`, `rarity`, `show_silhouette` |
| `memory_spheres` | `unlocked_at`, `discovered_at` (timestamptz, nullable) |
| `final_gift_boxes` | `physical_gift_id` (uuid → `physical_gifts.id`, `on delete set null`) |

Le sagome non ottenute mostrano solo un placeholder: nome, descrizione e
immagine reale non lasciano il server finché l'oggetto non è stato ottenuto.
`show_silhouette` è l'unica opzione che consente di visualizzare un oggetto non
ancora trovato, e solo per giorni già sbloccati.

### `memory_entries`

Ricordi configurati dall'amministratore. Una sola tabella per tre destinazioni.

| Colonna | Tipo | Note |
| --- | --- | --- |
| `id` | uuid | PK |
| `placement` | text | `album` \| `diary` \| `finale` |
| `kind` | text | Lettera, foto, regalo, indizio, momento speciale… |
| `title` / `description` / `content` / `image_url` | text | Testi e immagine del ricordo |
| `day_number` | integer | 1–24; `NULL` = sempre disponibile |
| `related_content_id` | uuid | FK `physical_contents(id)`, opzionale |
| `activation_conditions` | jsonb | Stesso formato delle altre condizioni |
| `is_active` / `sort_order` | bool / int | Filtri e ordinamento |

RLS: lettura solo per righe attive con giorno già sbloccato; gestione completa
agli admin tramite `public.is_admin()`.

### `diary_events`

| Colonna | Tipo | Note |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK `users(id)`, `on delete cascade` |
| `event_key` | text | Chiave deterministica, es. `day-opened:3` |
| `category` | text | `apertura`, `contenuto`, `indizio`, `quiz`, `password`, `oggetto`, `simbolo`, `sfera`, `giornata`, `speciale`, `finale` |
| `title` / `description` / `image_url` | text | Contenuto dell'evento |
| `day_number` | integer | 1–24, opzionale |
| `source_type` / `source_id` | text / uuid | Riferimento al contenuto originale |
| `occurred_at` | timestamptz | Data/ora dell'evento |

Vincolo univoco `(user_id, event_key)`: il server inserisce con
`on conflict do nothing`, quindi ricaricare una pagina non crea duplicati.
RLS: lettura solo al proprietario/admin; **nessuna policy di scrittura client**.

### Sfere e sicurezza

Dopo la 006 le policy client `insert`/`update`/`delete` su `memory_spheres`
vengono rimosse. Lo sblocco è calcolato dal server con le stesse condizioni JSON
delle altre risorse; la scoperta (`discovered_at`) è scritta una sola volta dal
service role. Nessuna politica RLS viene disabilitata.

## Colonne e tabelle della Fase 7 (migrazione 007)

La 007 è additiva e idempotente: non elimina dati e non disattiva RLS. Estende
le subscription esistenti, aggiunge preferenze e log delle consegne.

### `notification_subscriptions` (estesa)

| Colonna | Tipo | Note |
| --- | --- | --- |
| `user_agent` | text | Etichetta del dispositivo, mai mostrata come endpoint |
| `platform` | text | `web` per ora |
| `is_active` | bool | `false` quando il servizio push risponde 404/410 |
| `last_seen_at` | timestamptz | Ultima registrazione del dispositivo |
| `updated_at` | timestamptz | Trigger `set_updated_at` |

Il vincolo `(user_id, endpoint)` esiste dalla 001. La 007 aggiunge le policy
`update` e `delete` per il proprietario (`auth.uid() = user_id`) e un indice
parziale sulle subscription attive.

### `notification_preferences`

Una riga per utente (PK `user_id`).

| Colonna | Tipo | Default |
| --- | --- | --- |
| `enabled` | bool | `true` |
| `daily_reminders`, `reminder`, `clues`, `quizzes`, `special`, `finale` | bool | `true` |
| `preferred_time` | time | `08:00` |
| `quiet_hours_start` / `quiet_hours_end` | time | `22:00` / `07:00` |
| `timezone` | text | `Europe/Rome` |

RLS: select/insert/update solo al proprietario. Nessuna policy di delete: la
disattivazione completa passa dalle Server Actions e cancella le subscription.

### `notification_deliveries`

Log delle singole consegne, scritto **solo dal service role**.

| Colonna | Tipo | Note |
| --- | --- | --- |
| `id` | uuid | PK |
| `notification_id` | uuid | FK `scheduled_notifications(id)`, `on delete set null` |
| `user_id` | uuid | FK `users(id)`, `on delete cascade` |
| `subscription_id` | uuid | FK `notification_subscriptions(id)`, `on delete set null` |
| `kind` / `title` | text | Tipologia e titolo al momento dell'invio |
| `dedupe_key` | text | **UNIQUE**: garantisce l'idempotenza |
| `status` | text | `pending` \| `sent` \| `failed` \| `skipped` |
| `attempts` | integer | Tentativi controllati (max 3) |
| `error` | text | Ultimo errore del provider |
| `sent_at` | timestamptz | Data di consegna riuscita |

RLS: sola lettura agli admin (`public.is_admin()`). Nessuna policy di
INSERT/UPDATE/DELETE: la scrittura avviene con `SUPABASE_SERVICE_ROLE_KEY`.

### `scheduled_notifications` (estesa)

| Colonna | Tipo | Note |
| --- | --- | --- |
| `kind` | text | `daily`, `reminder`, `content`, `clue`, `quiz`, `special`, `finale` |
| `url` | text | Pagina aperta dalla notifica (default `/dashboard`) |
| `audience` | text | `all`, `admins`, `day_openers`, `not_opened`, `user` |
| `target_user_id` | uuid | Richiesto con `audience = 'user'` |
| `dedupe_key` | text | Chiave univoca opzionale per l'invio programmato |
| `status` | text | `pending` \| `sending` \| `sent` \| `failed` \| `skipped` |
| `attempts` | integer | Tentativi di invio |
| `recipients_count` | integer | Dispositivi raggiunti |
| `sent_at` | timestamptz | Data dell'ultimo invio riuscito |
| `last_error` | text | Ultimo errore o motivo dello scarto |

Le notifiche automatiche (`daily`, `reminder`) sono generate dal ciclo server a
partire dal calendario, non memorizzate come righe: usano una `dedupe_key`
deterministica per giorno e dispositivo.

## Condizioni di sblocco (JSON)

`physical_contents.activation_conditions`, `quizzes.unlock_conditions`,
`gift_symbols.discovery_conditions` e `memory_spheres.activation_conditions`
accettano lo stesso oggetto. Tutti i campi sono opzionali e valutati in AND:

```json
{
  "availableFrom": "2026-12-10",
  "afterDay": 9,
  "requiresDays": [3, 4],
  "requiresQuiz": "uuid-del-quiz",
  "requiresPassword": ["uuid-del-contenuto"]
}
```

- `availableFrom`: data civile `YYYY-MM-DD` (confronto nel fuso `Europe/Rome`)
  oppure datetime ISO;
- `afterDay`: il giorno indicato deve essere stato aperto;
- `requiresDays`: tutti i giorni indicati devono essere aperti;
- `requiresQuiz` / `requiresQuizzes`: quiz risolti correttamente;
- `requiresPassword` / `requiresPasswords`: password fisiche completate.

Le condizioni sono verificate **solo lato server**. Un campo sconosciuto viene
ignorato; una condizione malformata o non soddisfatta mantiene il contenuto
nascosto (fail-safe, nessuna anticipazione).

## Vincoli di unicità

- `users.email` UNIQUE
- `user_profiles.user_id` UNIQUE
- `advent_days.day_number` UNIQUE (1–24)
- `village_locations.slug` UNIQUE
- `village_hotspots.slug` UNIQUE
- `village_hotspot_messages.hotspot_id` UNIQUE
- `physical_gifts (location_id, day_number)` UNIQUE
- `secret_messages (user_id, day_number)` UNIQUE
- `user_openings (user_id, day_number)` UNIQUE
- `notification_subscriptions (user_id, endpoint)` UNIQUE
- `notification_preferences.user_id` PRIMARY KEY (Fase 7)
- `notification_deliveries.dedupe_key` UNIQUE (Fase 7): una sola consegna per
  chiave, anche se il ciclo viene eseguito più volte.
- indice univoco parziale su `scheduled_notifications.dedupe_key`
  `WHERE dedupe_key IS NOT NULL` (Fase 7)
- `app_settings.key` UNIQUE
- `password_completions (user_id, content_id)` UNIQUE
- `final_box_completions (user_id, box_id)` PRIMARY KEY
- **Fase 5:** indice univoco parziale
  `uniq_user_quiz_correct_once (user_id, quiz_id) WHERE is_correct`: un solo
  successo per quiz, quindi nessun punteggio duplicato.

## Indici utili

Oltre agli indici delle fasi precedenti:

- `user_quiz_attempts(user_id, quiz_id)`;
- `password_completions(user_id)`;
- `final_box_completions(user_id)`;
- `physical_contents(day_number, is_active, sort_order)` (Fase 5);
- `quizzes(day_number, is_active)` (Fase 5);
- `notification_subscriptions(user_id) WHERE is_active` (Fase 7);
- `scheduled_notifications(status, scheduled_for) WHERE is_active` (Fase 7);
- `notification_deliveries(notification_id, created_at desc)` e
  `(user_id, created_at desc)` (Fase 7);
- `advent_days(unlock_date)`.

## Sicurezza e RLS

- **Lettura dei giorni futuri**: le policy su `physical_gifts`, `gift_symbols`,
  `elf_messages`, `quizzes`, `quiz_answers`, `physical_contents` e
  `village_hotspot_messages` eseguono un join su `advent_days` con
  `unlock_date <= now()`. Un utente autenticato non può leggere i dati futuri
  nemmeno con query API dirette.
- **Ruolo admin**: la lettura di `users` usa `public.is_admin()`
  (`SECURITY DEFINER`) per evitare la ricorsione della policy. Non reintrodurre
  auto-join su `users`.
- **Scritture dei progressi**: dalla Fase 5 tentativi password, completamenti
  password, tentativi quiz e completamenti della scatola finale sono scritti
  **solo con il service role** nelle Server Actions, dopo la verifica
  server-side. Le policy INSERT client vengono rimosse dalla migrazione 005.
  Prima dell'applicazione della 005 le vecchie policy sono ancora attive.
- **Aperture**: la policy INSERT di `user_openings` richiede
  `auth.uid() = user_id` **e** che il giorno sia già sbloccato (Fase 5).
- **Dati mai pubblici**: `physical_passwords.password_hash`,
  `final_gift_boxes.password_hash` e `quiz_answers.is_correct` sono letti solo
  con il client service role. I payload pubblici (`PasswordChallenge`,
  `DayQuiz`) non contengono questi campi; la risposta corretta compare solo
  dopo una verifica positiva.
- **Password obbligatoria senza configurazione**: il contenuto viene nascosto,
  non mostrato senza gate.
- **Simulazione admin**: `admin_date_simulations` è una preferenza per-admin;
  non modifica `advent_days`, aperture, tentativi, completamenti o punteggi.
- **Fuso orario**: la migrazione 005 normalizza `advent_days.unlock_date` alla
  mezzanotte civile di `Europe/Rome`, così il giorno N si apre alle 00:00
  italiane e non alle 01:00.
- **Web Push (Fase 7)**: `notification_subscriptions` e
  `notification_preferences` sono accessibili solo al proprietario; la chiave
  privata VAPID non è mai nel database né nel bundle client.
  `notification_deliveries` è leggibile solo dagli admin e scritta solo dal
  service role. L'endpoint push non viene mai restituito al client: il servizio
  espone solo un'etichetta mascherata.
- **Scheduler**: `POST /api/push/cron` richiede `PUSH_SCHEDULER_SECRET`
  (Bearer o header `x-wonderland-cron-secret`); senza segreto risponde 503.
  Gli invii manuali passano da Server Actions che richiamano `requireAdmin()`.

## Estensibilità

- Ogni tabella utente ha `user_id` UUID: più utenti condividono l'app senza
  collisioni.
- `app_settings` in `jsonb` permette configurazioni future senza migrazioni.
- `village_hotspots.day_number` è nullable e modificabile: l'associazione
  luogo → giorno è configurazione admin, non una costante nel codice.
- `physical_contents` collega indizi fisici a giorno e luogo; il testo del
  contenuto e i messaggi di sblocco sono configurabili.
- I testi di cornice della storia restano in `src/lib/story.ts`; i contenuti
  giornalieri, i quiz, le password e la scatola finale vivono nel database.

# PROJECT_STATUS

**Progetto:** Christmas Wonderland
**Fase corrente:** FASE 7 – PWA, notifiche Web Push e installazione
**Data ultimo aggiornamento:** 2026-11-19
**Stato:** FASE 7 IMPLEMENTATA NEL CODICE. Le migrazioni **001–005 sono
applicate** sul progetto Supabase remoto. Le migrazioni **006 e 007 sono state
create ma NON applicate**: richiedono esecuzione manuale nel SQL Editor e
autorizzazione esplicita. La verifica end-to-end in browser con sessione
utente/admin e il delivery reale delle notifiche **non sono stati eseguiti**
(mancano credenziali, chiavi VAPID e scheduler).

> Il precedente stato che indicava la 005 come «da applicare» era obsoleto:
> la 005 è applicata e verificata in sola lettura.

---

## FASE 7 – PWA, Web Push e installazione

### Funzionalità implementate

- **Manifest e icone**: `src/app/manifest.ts` espone nome, nome breve
  «Wonderland», descrizione italiana, `display: standalone`, `start_url:
  /dashboard`, `scope: /`, orientamento portrait, colori del tema e tre icone
  (192, 512, maskable 512). `apple-touch-icon` 180×180 e metadati
  `appleWebApp` per iOS.
- **Icone generate e riproducibili**: `scripts/generate-pwa-icons.ps1` disegna
  l'albero natalizio con la palette del progetto usando `System.Drawing`; gli
  asset sono in `public/icons/`.
- **Service Worker** (`public/sw.js`): precache degli asset statici,
  network-first per le navigazioni con fallback `offline.html`, cache solo per
  GET same-origin e asset statici, `skipWaiting` + `clients.claim`, pulizia
  delle cache con versione diversa, gestione `push` e `notificationclick`,
  bypass completo della cache in sviluppo.
- **Offline sicuro** (`public/offline.html`): pagina natalizia che spiega cosa
  resta disponibile e cosa richiede la connessione. Nessuna pagina
  `/dashboard`, `/admin`, `/api` o risposta Supabase viene memorizzata: dopo il
  logout non restano dati privati sul dispositivo.
- **Installazione guidata**: `beforeinstallprompt` gestito, pulsante
  «Installa», rilevamento `appinstalled`, badge «App installata», istruzioni
  specifiche per Safari iOS e avviso per gli altri browser iOS. Nessun
  messaggio su desktop che non supportano l'installazione. `localStorage`
  ricorda il rifiuto.
- **Web Push lato server**: `web-push` + VAPID, subscription multiple per
  utente, gestione 404/410 con disattivazione automatica, retry controllati
  (max 3, intervallo minimo 10 minuti), log in `notification_deliveries` con
  `dedupe_key` UNIQUE.
- **Notifiche automatiche**: giornaliera dopo l'orario preferito e promemoria
  a +4 ore solo se la casella non è stata aperta. Nessuna notifica per giorni
  futuri, nessuna anticipazione narrativa, fuso `Europe/Rome`, rispetto di
  preferenze e ore di silenzio.
- **Notifiche programmate**: tipologie `daily`, `reminder`, `content`, `clue`,
  `quiz`, `special`, `finale`; pubblico `all`, `admins`, `day_openers`,
  `not_opened`, `user`; invio immediato, reinvio esplicito, stato, tentativi,
  destinatari raggiunti ed errori.
- **Scheduler server-side**: `POST /api/push/cron` protetto da
  `PUSH_SCHEDULER_SECRET` (Bearer o `x-wonderland-cron-secret`). Senza segreto
  risponde 503, con segreto errato 401, con metodo diverso 405. Nessun
  `setInterval` nel browser.
- **Preferenze utente**: pagina `/dashboard/impostazioni` con notifiche
  giornaliere, promemoria, indizi, quiz, comunicazioni speciali, finale, orario
  preferito, ore di silenzio, attivazione/disattivazione per dispositivo e
  disattivazione completa.
- **Admin**: `/admin/notifications` combina la console operativa (stato VAPID,
  dispositivi attivi, ciclo manuale, notifica di prova solo all'admin, tabella
  invii, ultime consegne) con il CRUD delle notifiche programmate. I campi Fase
  7 compaiono solo dopo la migrazione 007.
- **Logout sicuro**: il dispositivo viene rimosso dal server e disiscritto
  localmente **prima** di chiudere la sessione; un errore delle notifiche non
  blocca mai il logout.
- **Design**: pannelli e pulsanti usano i token `pine`, `gold`,
  `christmas-red`, `cream`; animazioni leggere e rispetto di
  `prefers-reduced-motion` (anche nella pagina offline).

### Regole di sicurezza implementate

| Regola | Comportamento |
| --- | --- |
| RLS | Attiva su tutte le tabelle. Preferenze e subscription sono accessibili solo al proprietario; i log solo agli admin. |
| Identità | Le Server Actions leggono l'utente dalla sessione: un `user_id` inviato dal client viene rifiutato dallo schema `.strict()`. |
| Endpoint push | Mai restituito al client: il servizio espone solo un'etichetta mascherata (`host/…1234`). |
| Chiavi VAPID | La privata è letta solo da moduli `server-only`; al browser arriva solo `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. |
| Endpoint cron | Segreto obbligatorio, confronto a tempo costante; nessun percorso non autenticato. |
| Autorizzazioni | Invio e gestione richiamano `requireAdmin()`; la sola presenza della pagina non è sufficiente. |
| Duplicati | `notification_deliveries.dedupe_key` UNIQUE + retry controllati; chiavi deterministiche per giorno e dispositivo. |
| Futuro | Il ciclo considera solo giorni sbloccati e non rivela il mistero del Grinch. |
| Cache | Nessuna pagina autenticata o risposta Supabase nel Service Worker. |
| Degrado | `detectPushCapabilities()` rileva la 007: prima della migrazione l'UI spiega cosa manca e non tenta scritture. |

### File creati

- Migration: `supabase/migrations/007_push_notifications.sql` (non applicata).
- PWA: `public/sw.js`, `public/offline.html`, `public/icons/*`,
  `scripts/generate-pwa-icons.ps1`, `src/app/manifest.ts`.
- Contratti: `src/types/notifications.ts`.
- Logica pura e test: `src/lib/push/{rules,generate,messages,auth,config}.ts`
  con `*.test.ts`; `src/lib/pwa/{install,base64,client}.ts` con test.
- Server: `src/lib/push/{dispatch,actions,admin-actions}.ts`,
  `src/lib/services/notifications.ts` (+ test), `src/app/api/push/cron/route.ts`.
- UI: `src/components/pwa/{ServiceWorkerRegistrar,InstallPrompt,OfflineBanner,NotificationSettings}.tsx`,
  `src/components/admin/{NotificationConsole,NotificationOps}.tsx`.
- Pagine: `src/app/dashboard/impostazioni/page.tsx`.
- Test aggiuntivi: `src/lib/push/{rules,generate,auth,config,dispatch,actions}.test.ts`,
  `src/lib/pwa/{install,base64,manifest,service-worker}.test.ts`,
  `src/lib/services/notifications.test.ts`.

### File modificati

- `src/app/layout.tsx` – manifest, icone, `appleWebApp`, viewport e tema.
- `src/app/dashboard/layout.tsx` – Service Worker, banner offline, prompt di
  installazione.
- `src/app/admin/notifications/page.tsx` – console + CRUD.
- `src/lib/memory-nav.ts` – voce «Notifiche».
- `src/components/layout/logout-button.tsx` – rimozione subscription prima del
  logout.
- `src/lib/admin/{resources,actions}.ts`, `src/lib/services/{admin,capabilities}.ts`,
  `src/components/admin/{AdminResourcePage,CrudManager}.tsx` – flag `phase7` e
  campi notifiche.
- `src/types/database.ts` – nuove tabelle e colonne.
- `package.json` / `package-lock.json` – `web-push`, `@types/web-push`.
- Documentazione: `README.md`, `AGENTS.md`, `PROJECT_STATUS.md`, `ENVIRONMENT.md`,
  `docs/DATABASE_SCHEMA.md`, `docs/SUPABASE_SETUP.md`, `.env.local.example`.

### Migration creata (non applicata)

`007_push_notifications.sql` è additiva e idempotente:

1. estende `notification_subscriptions` (`user_agent`, `platform`, `is_active`,
   `last_seen_at`, `updated_at`) e aggiunge le policy update/delete del
   proprietario;
2. crea `notification_preferences` con RLS sul proprietario;
3. estende `scheduled_notifications` con tipologia, pubblico, stato, tentativi,
   destinatari, errori e chiave anti-duplicato;
4. crea `notification_deliveries` con `dedupe_key` UNIQUE, lettura admin e
   scrittura riservata al service role;
5. aggiunge indici per subscription attive, notifiche dovute e log.

Nessun `DROP` di tabelle o colonne, nessun dato demo, nessuna disattivazione di
RLS.

### Operazioni manuali richieste

1. Backup/snapshot del progetto (consigliato).
2. SQL Editor → eseguire, in ordine e solo dopo autorizzazione:
   `006_memories_and_collections.sql` (se non già fatto) e
   `007_push_notifications.sql`.
3. Generare le chiavi VAPID con `npx web-push generate-vapid-keys` e impostare
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
4. Generare `PUSH_SCHEDULER_SECRET` e configurare un cron esterno ogni 15
   minuti su `POST /api/push/cron` (vedi `docs/SUPABASE_SETUP.md`, §7).
5. Su iOS le notifiche push richiedono l'app installata (Safari 16.4+): è un
   limite di piattaforma, non dell'app.
6. Fare logout/login e verificare preferenze, dispositivi e notifica di prova.

### Test eseguiti

| Verifica | Esito |
| --- | --- |
| `npm run typecheck` | ✅ 0 errori |
| `npm run lint` | ✅ 0 errori/warning |
| `npm test` | ✅ **271/271** test (36 file) |
| `npm run build` | ✅ 38 route, nessun errore di prerender |
| Nuovi test Fase 7 | ✅ 105 test: regole, fuso orario, preferenze, generazione automatica, deduplica, autorizzazione cron, VAPID, manifest, Service Worker, pagina offline, installazione/standalone, base64, azioni subscription, isolamento utenti, servizio notifiche |
| Smoke test runtime | ✅ `/manifest.webmanifest` 200 (3 icone, 1 maskable, 3 scorciatoie), `/sw.js` 200, `/offline.html` 200, icone 200, `GET /api/push/cron` 405, `POST` senza segreto 503, `/dashboard` e `/admin` 307 verso il login |

### Funzionalità non verificate / limiti noti

- **Delivery reale non verificato**: non sono state configurate chiavi VAPID né
  uno scheduler, quindi nessuna notifica è stata realmente consegnata. I test
  usano un sender mockato e verificano idempotenza, retry e gestione 404/410.
- **Migrazione 007 non applicata**: preferenze e dispositivi non vengono
  persistiti finché non viene eseguita; l'UI mostra la nota esplicativa.
- **Verifica end-to-end in browser non eseguita**: mancano credenziali
  utente/admin. Non sono stati provati live installazione su dispositivo reale,
  permessi del browser, ricezione push, responsive e comportamento iOS.
- **RLS reale non esercitata dai test**: i test dei servizi usano client
  mockati; verificano filtri e logica, non le policy del progetto remoto.
- **`beforeinstallprompt`** è disponibile solo su alcuni browser (Chrome/Edge/
  Android): altrove l'app resta usabile ma non mostra il pulsante di
  installazione, come previsto.
- **Scheduler**: finché non viene configurato un cron esterno, le notifiche
  automatiche partono solo dal pulsante «Esegui ciclo» dell'admin.

### Problemi noti

- Nessun problema bloccante introdotto dalla Fase 7.
- Le notifiche automatiche dipendono dal fatto che il ciclo venga richiamato:
  senza scheduler configurato non esiste alcun invio pianificato.
- La rotazione delle chiavi VAPID invalida tutte le subscription esistenti: va
  evitata o accompagnata da una nuova iscrizione dei dispositivi.

---

## FASE 6 – Ricordi, collezioni e album

### Funzionalità completate

- **Diario personale**: eventi derivati dai progressi reali (aperture,
  contenuti, indizi, quiz, password, oggetti, simboli, sfere, giornate complete,
  ricordi admin, scatola finale) e sincronizzati lato server con
  `on conflict (user_id, event_key) do nothing`. Nessun duplicato al refresh.
  Ordinamento cronologico e filtri per categoria/giorno.
- **Album dei ricordi**: lettere, note, foto, indizi, oggetti, enigmi, password,
  regali, messaggi degli elfi e segreti, sfere, ricordi configurati. Apertura
  del contenuto completo, navigazione tra i ricordi, filtri per tipo/giorno e
  data di scoperta formattata sul server (Europe/Rome).
- **Collezione oggetti**: regali fisici e contenuti di tipo `object`, con nome,
  descrizione, immagine, giorno, data di acquisizione, categoria, rarità e
  descrizione speciale. Sagome misteriose solo se l'admin ha impostato
  `show_silhouette` e solo per giorni sbloccati: nome/immagine reali non sono
  mai inviati prima del ritrovamento.
- **Simboli natalizi**: integrazione diretta di `gift_symbols`, deduplicati per
  id, con giorno di scoperta, categoria, rarità e percentuale di completamento.
- **Sfere della memoria**: integrazione di `memory_spheres`, sblocco automatico
  lato server quando giorno e condizioni sono soddisfatti, apertura registrata
  con `discovered_at`, animazione delicata e presenza nell'album. Nessuna
  scrittura client e nessuna sfera non sbloccata visibile.
- **Archivio indizi**: consultazione dopo la scoperta, giorno e contenuto
  originale, collegamenti incrociati solo verso indizi già scoperti. Nessun
  testo anticipa il colpevole prima del 24 dicembre.
- **Cronologia 1–24**: stati reali della Fase 5, eventi, ricordi, oggetti, quiz
  e indizi per giorno. I giorni futuri non espongono titolo, eventi o conteggi.
  Link di ritorno al calendario con deep link `?giorno=N`.
- **Galleria**: griglia, ingrandimento con navigazione, filtri per giorno e
  categoria, immagini di contenuti/regali/messaggi/ricordi/sfere e foto personali
  mostrate con **URL firmate di breve durata** (non URL pubblici permanenti).
- **Statistiche**: giorni completati, ricordi, oggetti, simboli, sfere, indizi,
  quiz, completamento complessivo e dettaglio per categoria. Tutto calcolato sul
  server sui soli elementi sbloccati, attivi, accessibili e non duplicati.
- **Ricordo del 24 dicembre**: riepilogo del viaggio, momenti importanti,
  oggetti, indizi, rivelazione configurata dall'admin e collegamento al regalo
  fisico (pupazzo) tramite `final_gift_boxes.physical_gift_id`. Riusa i gate
  della Fase 5; nessun sistema finale parallelo e nessuna anticipazione.
- **Admin**: nuovi campi Fase 6 (categoria, rarità, descrizione speciale,
  visibilità sagome, gruppo/collegamenti indizi, timestamp sfere, regalo fisico)
  e nuova sezione **Ricordi speciali** (`memory_entries`) per album, diario e
  finale. I campi compaiono solo se la migrazione 006 è stata applicata.
- **Navigazione utente**: Diario, Album, Collezione, Indizi, Sfere, Cronologia,
  più Galleria, Statistiche e Ricordo 24. Navigazione admin quasi invariata
  (una sola nuova voce).

### Regole di sicurezza implementate

| Regola | Comportamento |
| --- | --- |
| Proprietà dati | Ogni query personale filtra `user_id = auth.uid()`; il client riceve solo i propri dati. |
| Scritture | Diario e sfere sono scritte solo dal service role; nessuna policy client di scrittura. |
| Duplicati | `diary_events` ha vincolo univoco `(user_id, event_key)`; i simboli sono deduplicati per id; completamenti e premi non vengono riassegnati. |
| Futuro | Nessun titolo, testo, immagine o conteggio di giorni futuri lascia il server. |
| Rivelazione | Messaggio finale, indizi e oggetti della scatola restano vuoti finché il gate della Fase 5 non è superato. |
| Storage | Le immagini pubbliche dell'admin restano su `wonderland-media`; le foto personali usano URL firmate. |
| Validazione | Zod nelle Server Actions; input non validi rifiutati con messaggi italiani. |
| Compatibilità | `detectPhase6Capabilities()` rileva la 006: prima della migrazione le pagine mostrano i dati delle fasi precedenti e una nota esplicativa. |

### File creati

- Migration: `supabase/migrations/006_memories_and_collections.sql`.
- Contratti: `src/types/memories.ts`.
- Logica pura e test: `src/lib/memories/{format,diary,collection,album,clues,timeline,stats,finale,gallery}.ts`
  e i corrispondenti `*.test.ts`.
- Servizi: `src/lib/services/{capabilities,memories}.ts`,
  `src/lib/services/memories.test.ts`.
- Server Actions: `src/lib/memories-actions.ts`.
- Navigazione condivisa: `src/lib/memory-nav.ts`.
- UI: `src/components/memories/{MemoryShell,ui,DiaryView,AlbumView,CollectionView,CluesView,TimelineView,GalleryView,StatisticsView,FinaleView}.tsx`.
- Pagine: `src/app/dashboard/{diario,album,collezione,indizi,sfere,cronologia,galleria,statistiche,ricordo-24}/page.tsx`.
- Admin: `src/app/admin/special-memories/page.tsx`.

### File modificati

- `src/types/database.ts` – colonne Fase 6 e nuove tabelle.
- `src/lib/admin/resources.ts` – campi `phase6`, nuova risorsa `memory_entries`.
- `src/lib/admin/actions.ts`, `src/lib/admin/special-actions.ts` – validazione
  capability-aware e collegamento regalo finale.
- `src/lib/services/admin.ts` – letture admin capability-aware.
- `src/components/admin/{AdminResourcePage,CrudManager,AdminShell,FinalBoxForm}.tsx`.
- `src/app/admin/{physical-contents,final-box}/page.tsx`.
- `src/components/dashboard/DashboardContent.tsx`, `src/app/dashboard/page.tsx`
  – navigazione libro dei ricordi e deep link `?giorno=N`.
- `src/app/globals.css` – stili libro, schede, bagliori e `prefers-reduced-motion`.
- `README.md`, `AGENTS.md`, `docs/DATABASE_SCHEMA.md`, `docs/SUPABASE_SETUP.md`.

### Migration creata (non applicata)

`006_memories_and_collections.sql` è additiva e idempotente:

1. metadati collezionistici su `physical_contents`, `physical_gifts`,
   `gift_symbols` (`category`, `rarity`, `special_description`,
   `show_silhouette`, `clue_group`, `related_content_ids`);
2. `memory_spheres.unlocked_at` / `discovered_at`;
3. `final_gift_boxes.physical_gift_id` → `physical_gifts(id)`;
4. nuove tabelle `memory_entries` e `diary_events` con RLS;
5. rimozione delle policy client INSERT/UPDATE/DELETE su `memory_spheres`;
6. indici di lettura.

Nessun `DROP` di tabelle o colonne, nessun dato demo, nessuna disattivazione di RLS.

### Operazioni manuali richieste su Supabase

1. Backup/snapshot del progetto (consigliato).
2. SQL Editor → eseguire `supabase/migrations/006_memories_and_collections.sql`
   **dopo** la 005. Non usare `supabase db push` sul cloud.
3. Verifiche:

   ```sql
   select count(*) from public.memory_entries;
   select count(*) from public.diary_events;
   select column_name from information_schema.columns
    where table_name = 'physical_contents'
      and column_name in ('category', 'rarity', 'show_silhouette');
   select polname from pg_policies
    where tablename = 'memory_spheres' and polname like '%their own%';
   -- deve tornare vuoto
   ```

4. Dopo l'applicazione, fare logout/login: le note «migrazione necessaria»
   scompaiono e diario/sfere iniziano a essere persistiti.
5. Configurare da `/admin/special-memories` i ricordi speciali e, se desiderato,
   il regalo fisico in `/admin/final-box`.

### Test eseguiti

| Verifica | Esito |
| --- | --- |
| `npm run typecheck` | ✅ 0 errori |
| `npm run lint` | ✅ 0 errori/warning |
| `npm test` | ✅ **166/166** test |
| `npm run build` | ✅ 35 route (nessun errore di prerender) |
| Logica pura Fase 6 | ✅ 42 test (eventi/dedupe/filtri, album, oggetti/sagome, simboli duplicati, sfere, indizi, timeline, statistiche, finale) |
| Privacy Fase 6 | ✅ 3 test di servizio con client mockato (filtro `user_id` su tutte le tabelle personali, nessun id estraneo) |

### Funzionalità non verificate / limiti noti

- **Verifica end-to-end in browser non eseguita**: non dispongo di credenziali
  utente/admin. Non sono stati provati live: salvataggio reale del diario,
  sblocco reale delle sfere, rendering responsive, effetti con
  `prefers-reduced-motion`, upload e firme Storage.
- **Migrazione 006 non applicata**: prima della sua esecuzione il diario e le
  sfere funzionano in memoria (dedupe logico) ma non sono persistiti, e la
  sezione admin dei ricordi speciali è disabilitata con spiegazione.
- I test dei servizi usano client mockati: verificano la logica e i filtri,
  non la RLS reale del progetto remoto.
- I permessi Storage delle foto personali non sono stati creati: la galleria
  usa URL firmate service-role; se il bucket non contiene l'oggetto, l'immagine
  viene saltata silenziosamente.
- Le statistiche sulle immagini e sui momenti speciali dipendono dalla
  configurazione admin: senza dati configurati le sezioni risultano vuote.

### Problemi noti

- Nessun problema bloccante introdotto dalla Fase 6.
- La copia narrativa resta centralizzata in `src/lib/story.ts`; i contenuti dei
  giorni, i ricordi speciali e la rivelazione sono configurabili dal database.
- Il finale narrativo non viene anticipato: il nome del responsabile compare
  solo nei testi configurati dall'admin per il 24 dicembre.

---

## Storico Fase 5 – Esperienza quotidiana (completata, migrazione applicata)

Calendario a 4 stati, password e quiz verificati lato server, progressi reali,
scatola finale protetta e anteprima admin senza scritture. Logica pura in
`src/lib/experience/*`, servizi in `src/lib/services/{experience,verification}.ts`,
UI in `src/components/experience/*`. Migrazione `005_experience_and_security.sql`
applicata sul progetto remoto.

## Storico Fase 4 – Pannello amministrativo (completata e applicata)

Dashboard admin con statistiche reali, sezioni CRUD, upload su Storage, gestione
utenti e ruoli, password scrypt, scatola finale, simulazione date. Migration
`004_admin_panel.sql` applicata; bucket `wonderland-media` presente.

## Storico Fase 3 – Villaggio navigabile (completata)

6 zone illustrate, 24 hotspot, mappa SVG con pan/zoom, stati derivati dal
calendario reale, associazione luogo → giorno solo nel database. Migration
`002_village_map.sql` applicata.

## Storico Fase 2 – Calendario reale (completata)

Calendario 1–24, apertura con ricontrollo server-side di `unlock_date`, messaggi
elfi/segreti, progresso reale, animazioni CSS-only deterministiche.

## Storico Fase 1 – Fondamenta (completata)

Next.js 16 App Router, Supabase Auth, RLS su tutte le tabelle, ruoli applicativi,
schema iniziale e prime route pubbliche/protette.

---

## Prossime fasi

**Nessuna.** La Fase 7 è l'ultima prevista. Non avviare la Fase 8.

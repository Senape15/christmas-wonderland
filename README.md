# Christmas Wonderland

Un calendario dell'Avvento interattivo ambientato in un villaggio natalizio navigabile, installabile come PWA e con notifiche Web Push.

**Fase 8 – collaudo finale completato nel codice.** Le migrazioni **001–007
risultano strutturalmente applicate** sul progetto Supabase (verifica in sola
lettura del 2026-11-19). La migrazione **008_role_security.sql** è scritta ma
**non applicata**: contiene le correzioni di sicurezza dei ruoli e va eseguita
manualmente dopo autorizzazione. Il delivery reale delle notifiche non è stato
verificato: mancano chiavi VAPID e scheduler.

## Stack

| Tecnologia      | Uso                                            |
| --------------- | ---------------------------------------------- |
| Next.js 16 (App Router) | Framework, Server Components, Server Actions |
| React 19        | UI                                             |
| TypeScript      | Tipizzazione end-to-end                        |
| Tailwind CSS 4  | Stili, tema natalizio custom                   |
| Supabase        | PostgreSQL (RLS), Auth, Storage                |
| Godot 4.7       | Villaggio 2D navigabile esportato in Web        |
| Framer Motion   | Animazioni di apertura e interazione            |
| Zod             | Validazione server-side                        |
| web-push        | Notifiche Web Push con VAPID                   |

Timezone di riferimento: **Europe/Rome**.

## Esperienza quotidiana (Fase 5)

- Calendario a quattro stati: bloccato, disponibile, aperto, completato.
- Il giorno N si sblocca il giorno N di dicembre (mezzanotte italiana), senza
  accessi anticipati: il controllo è ripetuto sul server.
- Modale di apertura animata e accessibile (focus trap, `Esc`, movimento
  ridotto), con contenuti, regali, indizi, quiz, sfere dei ricordi e password
  fisiche letti dal database.
- Password e quiz verificati esclusivamente lato server; hash e risposte
  corrette non lasciano mai il server. Punti e completamenti non si duplicano.
- Progressi reali (giorni, quiz, password, indizi, regali, simboli, sfere,
  punti) e scatola finale del 24 dicembre con rivelazione protetta.
- Anteprima admin della data: sblocca i giorni fino alla data scelta senza
  salvare aperture, tentativi o progressi.

## Ricordi e collezioni (Fase 6)

Tutto converge in un'unica sezione, `/dashboard/ricordi`, con tre schede:
**Giornate** (1–24, con eventi, oggetti, quiz e indizi di ogni tappa),
**Ricordi** (lettere, foto, messaggi e contenuti scoperti) e **Sfere**
(le palle di neve della memoria). Un solo snapshot server (`getMemoriesHubData`)
alimenta le tre viste, così la sezione resta leggera.

- **Diario personale**: eventi derivati dai progressi reali e salvati lato server
  con chiave evento univoca `(user_id, event_key)`: nessun duplicato al refresh.
- **Album dei ricordi**: lettere, foto, oggetti, indizi, quiz risolti, regali,
  messaggi, sfere e ricordi configurati dall'admin, con navigazione tra i
  contenuti e data di scoperta.
- **Sfere della memoria**: sblocco automatico lato server a condizioni
  soddisfatte, apertura registrata una sola volta. Le sagome misteriose appaiono
  solo se l'admin le ha abilitate e mai per contenuti futuri.
- **Riepilogo del 24 dicembre** in `/dashboard/ricordo-24`, collegato al regalo
  fisico (pupazzo) e protetto dai gate della Fase 5.
- La sezione funziona anche prima della migrazione 006: mostra i dati delle fasi
  precedenti e una spiegazione invece di errori.

## PWA e notifiche (Fase 7)

- **Installabile**: manifest completo (nome, icone 192/512/maskable, tema,
  `standalone`, `start_url: /dashboard`) e pulsante «Installa» quando il browser
  espone `beforeinstallprompt`. Su iOS Safari mostra le istruzioni per
  «Aggiungi alla schermata Home»; sugli altri browser iOS spiega che serve
  Safari. Un badge discreto indica quando l'app è installata.
- **Service Worker sicuro**: cache solo di asset statici same-origin e
  navigazioni network-first con fallback offline. Nessuna pagina
  `/dashboard`, `/admin`, `/api` o risposta Supabase viene memorizzata: dopo il
  logout non restano dati privati.
- **Offline limitato**: pagina natalizia dedicata; caselle, password, quiz e
  progressi richiedono la connessione e non vengono mai modificati offline.
- **Notifiche Web Push**: subscription multiple per utente, VAPID con chiave
  privata solo server, gestione automatica delle subscription scadute
  (404/410), retry controllati e log idempotente (`dedupe_key` UNIQUE).
- **Notifiche automatiche**: giornaliera dopo l'orario preferito e promemoria a
  +4 ore se la casella non è aperta. Solo giorni sbloccati, fuso
  `Europe/Rome`, preferenze e ore di silenzio rispettate, nessuna anticipazione
  del finale.
- **Preferenze**: `/dashboard/impostazioni` riunisce Account e Notifiche; nella
  scheda Notifiche: tipologie, orario preferito, silenzio, gestione dispositivi e
  disattivazione completa.
- **Admin**: `/admin/notifications` con console operativa (stato VAPID,
  dispositivi, ciclo manuale, notifica di prova solo all'admin, stato ed errori
  degli invii) e CRUD delle notifiche programmate.
- **Scheduler**: `POST /api/push/cron` protetto da `PUSH_SCHEDULER_SECRET`.
  Nessun `setInterval` nel browser: le notifiche partono solo da un processo
  server-side.

## Avvio rapido

```bash
npm install
cp .env.local.example .env.local   # compila con i dati del tuo progetto Supabase
npm run dev                        # http://localhost:3000
```

## Configurazione Supabase

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Apri SQL Editor ed esegui in ordine:
   `supabase/migrations/001_initial_schema.sql`,
   `002_village_map.sql` (6 zone, 24 hotspot, RLS),
   `003_fix_admin_role_rls.sql` (corregge la policy ricorsiva del ruolo admin),
   `004_admin_panel.sql` (pannello amministrativo e scatola finale).
   **001–004 sono già applicate sul progetto attuale; 003 e 004 sono
   obbligatorie.**
3. Esegui anche `005_experience_and_security.sql` (Fase 5): rimuove le
   scritture client sui progressi, crea `final_box_completions`, impedisce i
   quiz corretti duplicati e allinea le date di sblocco alla mezzanotte di
   `Europe/Rome`. **È già applicata sul progetto attuale.**
4. **Fase 6 (risulta applicata):** per un nuovo ambiente esegui
   `supabase/migrations/006_memories_and_collections.sql`. Aggiunge le tabelle
   `memory_entries` e `diary_events`, i metadati collezionistici, il collegamento
   tra scatola finale e regalo fisico e rimuove le scritture client sulle sfere.
   È additiva e idempotente. Vedi [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md).
5. **Fase 7 (risulta applicata):** per un nuovo ambiente esegui
   `supabase/migrations/007_push_notifications.sql`. Aggiunge preferenze e log
   delle consegne, estende le subscription e le notifiche programmate. È
   additiva e idempotente. Poi configura le chiavi VAPID e lo scheduler come
   descritto in [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) §7.
6. **Fase 8 (manuale, NON applicata):** esegui
   `supabase/migrations/008_role_security.sql` dopo aver fatto il backup.
   Blocca l'auto-promozione ad admin e limita la simulazione al proprio admin.
7. In *Authentication → Providers* attiva Email e configura gli URL:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/api/auth/callback`
8. Copia *Project URL* e *anon public key* in `.env.local`.
9. Copia la *service_role key* in `SUPABASE_SERVICE_ROLE_KEY` (mai nel client).
10. Genera le chiavi VAPID con `npx web-push generate-vapid-keys` e imposta
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`.
   Genera anche `PUSH_SCHEDULER_SECRET` per l'endpoint cron.

Vedi [ENVIRONMENT.md](./ENVIRONMENT.md), [docs/RELEASE.md](./docs/RELEASE.md)
(pubblicazione), [docs/PWA_INSTALL.md](./docs/PWA_INSTALL.md) (installazione
delle PWA) e [docs/](./docs/) per i dettagli.

## Struttura del progetto

```
godot/
  christmas-village/ Sorgente Godot 4.7 del villaggio (esportazione Web in public/village/)
src/
  app/              Route App Router (login, register, dashboard, admin, api)
  components/
    village/        Villaggio Godot a tutto schermo (schermata iniziale)
    experience/     Modale del giorno, password, quiz, scatola finale
    settings/       Account e notifiche
    memories/       Hub unico: giornate, album, sfere e finale
    pwa/            Service Worker, prompt di installazione, banner offline,
                    impostazioni notifiche
    admin/          Pannello amministrativo completo (16 sezioni)
    calendar/       Griglia dell'Avvento a 4 stati e apertura della sorpresa
    nico/           Mascotte con 4 espressioni
    animations/     Neve e luci (CSS puro, server-safe)
  lib/
    admin/          Registry risorse, validazione Zod, azioni admin, hash password
    push/           Regole notifiche, generazione automatica, invio VAPID,
                    Server Actions utente/admin, protezione cron
    pwa/            Rilevamento installazione, base64, helper browser
    auth.ts         Data Access Layer (getCurrentUser, requireUser, requireAdmin)
    auth-actions.ts Server Actions (registrazione con validazione Zod)
    advent-actions.ts Server Action (apertura giorno, compatibilità)
    experience-actions.ts Server Actions (giorno, password, quiz, scatola finale)
    experience/     Logica pura: tempo, condizioni, completamento, quiz, password
    memories/       Logica pura: diario, album, collezione, indizi, timeline,
                    statistiche, galleria, finale
    story.ts        Testi narrativi senza anticipazioni sul colpevole
    services/       Logica server: advent, experience, verification, memories,
                    village, notifications
    village/        Catalogo illustrato + matematica pan/zoom testata
    supabase/       Client server, browser, admin, proxy
    utils.ts        Utility (cn, date)
  types/            Tipi TypeScript (auth, calendar, database, experience,
                    notifications, ...)
supabase/
  migrations/       001 schema, 002 villaggio, 003 fix admin, 004 admin,
                    005 Fase 5, 006 Fase 6 (manuale), 007 Fase 7 (manuale)
scripts/            Generazione riproducibile delle icone PWA
public/             Service Worker, pagina offline, icone
docs/               Documentazione tecnica
```

## Sicurezza

- Autenticazione Supabase + proxy (ex middleware) per redirect rapidi.
- Row Level Security abilitato su ogni tabella.
- I regali futuri (`physical_gifts`, `elf_messages`, `quiz`) sono visibili solo
  dopo `unlock_date` tramite policy SQL: il controllo delle date avviene
  **solo lato server/database**, mai nel client.
- I luoghi del villaggio non ancora sbloccati arrivano al client senza giorno,
  teaser o messaggi di Nico; i testi narrativi sono in una tabella con RLS che
  li rende leggibili solo dopo lo sblocco del giorno corrispondente.
- Nessuna associazione luogo → giorno è scritta nel codice: se la migrazione 002
  non è applicata, il villaggio usa il catalogo illustrato e resta tutto chiuso.
- Le pagine protette usano `requireUser()` / `requireAdmin()` (redirect server-side).
- Validazione server-side con Zod nelle Server Actions.
- **Fase 5:** le password fisiche e le risposte ai quiz sono verificate solo sul
  server. Hash, risposte corrette, tentativi e completamenti non vengono mai
  inviati al client; i payload pubblici espongono solo indizi, testi delle
  risposte attive ed esiti.
- Tentativi, completamenti e punti sono scritti con il client service role dopo
  i controlli. Dopo la migrazione 005 nessuna policy INSERT client consente di
  falsificare un premio con una richiesta diretta al database.
- Un contenuto con password obbligatoria ma senza configurazione attiva viene
  nascosto; le condizioni di sblocco sono valutate in ogni Server Action.
- **Fase 6:** diario e sfere sono scritti solo dal service role; le chiavi
  evento e il vincolo univoco impediscono duplicati. Ogni tabella personale è
  filtrata per `user_id` della sessione. Le foto personali sono mostrate con
  URL firmate di breve durata, non con URL pubblici permanenti. I contenuti
  futuri non raggiungono il client e la rivelazione del 24 dicembre resta
  vuota finché la scatola finale non è aperta.
- **Fase 7 – subscription e preferenze:** `notification_subscriptions` e
  `notification_preferences` sono leggibili e modificabili solo dal
  proprietario (`auth.uid() = user_id`). Ogni dispositivo è una riga: più
  dispositivi per lo stesso utente sono supportati. Le Server Actions leggono
  l'identità dalla sessione e rifiutano un `user_id` inviato dal client; il
  logout rimuove la subscription **prima** di chiudere la sessione.
- **Fase 7 – endpoint e log:** l'endpoint push completo non viene mai
  restituito al client: il servizio espone solo un'etichetta mascherata
  (`host/…1234`). `notification_deliveries` è leggibile solo dagli admin e
  scritta esclusivamente dal service role, con `dedupe_key` UNIQUE contro gli
  invii duplicati.
- **Fase 7 – chiavi e scheduler:** `VAPID_PRIVATE_KEY` e
  `PUSH_SCHEDULER_SECRET` sono lette solo da moduli `server-only`; al browser
  arriva unicamente `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. `POST /api/push/cron`
  richiede il segreto (Bearer o `x-wonderland-cron-secret`) con confronto a
  tempo costante: senza segreto risponde 503, con segreto errato 401, con
  metodo diverso 405. Nessun invio parte dal browser (niente `setInterval`).
- **Fase 7 – cache:** il Service Worker non memorizza pagine `/dashboard`,
  `/admin`, `/api` né risposte Supabase; dopo il logout non restano dati
  privati sul dispositivo. Le notifiche automatiche considerano solo giorni
  già sbloccati e non anticipano il finale.
- **Fase 8:** la migrazione 008 (non applicata) blocca l'auto-promozione ad
  admin e vincola la simulazione al proprio admin; le notifiche programmate
  accettano solo percorsi interni, il cron confronta il segreto su digest a
  lunghezza fissa e il logout via API disattiva i dispositivi push.
- Nessuna credenziale predefinita; nessun dato sensibile nel bundle client.

## Test

```bash
npm test          # Vitest: 274 test (utils, calendario, villaggio, admin, Fase 5, Fase 6, Fase 7, Fase 8)
npm run lint
npm run typecheck
npm run build
```

Vedere [PROJECT_STATUS.md](./PROJECT_STATUS.md) per i risultati delle verifiche.

## Licenza

Progetto interno – tutti i diritti riservati.

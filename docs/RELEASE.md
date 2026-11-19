# Guida al rilascio (Fase 8)

Questa guida descrive **come** pubblicare Christmas Wonderland. Non è stata
eseguita nessuna pubblicazione: il rilascio richiede autorizzazione esplicita.

## 1. Panoramica

| Componente | Consigliato | Alternativa |
| --- | --- | --- |
| Hosting app | Vercel (Next.js 16, App Router, Cache Components) | Qualsiasi host Node 20+ con supporto Next 16 |
| Database/Auth/Storage | Supabase (progetto esistente) | – |
| Scheduler push | GitHub Actions, Vercel Cron o cron esterno | `pg_cron` + Vault |
| Dominio | HTTPS, dominio proprio o `*.vercel.app` | – |

L'app non necessita di server persistenti: usa Server Components, Server
Actions e un endpoint cron. `next start` richiede Node 20 o superiore.

## 2. Preparazione Supabase

1. **Verificare lo schema.** Al 2026-11-19 le migrazioni **001–007 risultano
   strutturalmente presenti** sul progetto remoto (tabelle e colonne verificate
   in sola lettura tramite PostgREST con service role: `memory_entries`,
   `diary_events`, `memory_spheres.discovered_at`,
   `final_gift_boxes.physical_gift_id`, `notification_preferences`,
   `notification_deliveries`, `notification_subscriptions.is_active`,
   `scheduled_notifications.kind`). La verifica non copre indici e policy SQL:
   confermarle nello SQL Editor con le query in `docs/SUPABASE_SETUP.md` §2.4/§2.5.
2. **Applicare eventuali migrazioni mancanti** solo dopo autorizzazione e
   backup, nello SQL Editor, in ordine numerico. Non usare `supabase db push`
   su un progetto cloud. `supabase/migrations/008_role_security.sql` (Fase 8)
   corregge la policy di auto-aggiornamento del ruolo: **va applicata a mano**.
3. **Auth → Providers:** Email abilitato. Impostare:
   - *Site URL*: `https://<dominio-produzione>`
   - *Redirect URLs*: `https://<dominio-produzione>/api/auth/callback`
   - (sviluppo) `http://localhost:3000/api/auth/callback`
   - Se si abilita un provider OAuth, aggiungere il relativo callback Supabase.
4. **Storage:** bucket `wonderland-media` (immagini admin, public-read, 5 MB,
   MIME immagine). Le foto utente restano private e vengono lette con URL
   firmate di breve durata; non renderle pubbliche.
5. **RLS:** deve restare abilitata su ogni tabella. Non usare la service role
   per aggirarla al di fuori dei moduli `server-only` già autorizzati.
6. **Ruoli:** il ruolo applicativo vive in `public.users` (non nei JWT). Dopo la
   migrazione 008 i client autenticati non potranno più modificare `role`.

## 3. Collegare il repository e configurare Vercel

1. Vercel → *Add New… → Project* → importare il repository Git del progetto.
2. *Framework Preset*: **Next.js** (rilevamento automatico). *Root Directory*:
   `christmas-wonderland` se il repository contiene anche la workspace.
3. *Build Command*: `npm run build`. *Output Directory*: `.next` (default).
   *Install Command*: `npm ci`.
4. Node.js: **20.x** o superiore.
5. Aggiungere le variabili d'ambiente (§4) per **Production**, **Preview** e
   **Development** secondo necessità. Usare valori diversi per ambienti separati.
6. Non abilitare la pubblicazione di `.env*` nel repository: `.gitignore`
   esclude già tutti i file `.env*`.
7. Verificare che il deploy non esponga log con token: i log applicativi
   stampano solo messaggi di errore e id utente, mai credenziali.

## 4. Variabili d'ambiente

| Variabile | Dove | Obbligatoria | Note |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Sì | Project URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Sì | Chiave anonima, protetta da RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo Vercel/server | Sì per admin | **Mai** in `NEXT_PUBLIC_*` o nel client |
| `NEXT_PUBLIC_APP_URL` | Vercel | Consigliata | URL assoluto pubblico dell'app |
| `TZ` | Vercel | No | `Europe/Rome` (default consigliato) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Vercel | Per push | Pubblica, inclusa nel bundle |
| `VAPID_PRIVATE_KEY` | Solo Vercel | Per push | Privata, modulo `server-only` |
| `VAPID_SUBJECT` | Solo Vercel | Consigliata | `mailto:` o `https://` di contatto |
| `PUSH_SCHEDULER_SECRET` | Solo Vercel + scheduler | Per cron | ≥16 caratteri, casuale |

Generazione:

```bash
npx web-push generate-vapid-keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Regole:

- le chiavi VAPID si generano **una sola volta**: ruotarle invalida tutte le
  subscription esistenti;
- il segreto cron va salvato anche nel gestore segreti dello scheduler; non va
  mai scritto in un file del repository;
- senza VAPID il pulsante «Esegui ciclo» e l'endpoint cron rispondono 503 e
  nessuna notifica viene inviata; l'app resta utilizzabile.

## 5. Scheduler push

Configurare una richiesta `POST https://<dominio>/api/push/cron` ogni 15 minuti
con `Authorization: Bearer $PUSH_SCHEDULER_SECRET` (oppure header
`x-wonderland-cron-secret`). Esempio GitHub Actions in
`docs/SUPABASE_SETUP.md` §7.3. Il cron:

- invia solo notifiche dovute, a giorni già sbloccati e nel fuso `Europe/Rome`;
- rispetta preferenze, ore di silenzio e deduplica;
- gestisce 404/410 disattivando il dispositivo e ritenta al massimo 3 volte.

Non configurare un `setInterval` nel browser e non inviare notifiche di prova
a tutti gli utenti: la console admin invia solo all'admin che la richiede.

## 6. HTTPS e dominio

1. In Vercel → *Settings → Domains* aggiungere il dominio e attendere il
   certificato TLS (non modificare DNS senza autorizzazione).
2. Aggiornare Site URL e Redirect URLs di Supabase con il nuovo dominio.
3. Aggiornare `NEXT_PUBLIC_APP_URL` e rideployare.
4. Verificare che `https://<dominio>/manifest.webmanifest` e `/sw.js` siano
   serviti con HTTPS: senza HTTPS il Service Worker non si registra (tranne
   `localhost`) e la PWA non è installabile.

## 7. Backup

- **Database:** abilitare backup giornalieri/PITR in Supabase; prima di ogni
  migrazione eseguire un dump logico (`pg_dump` o export SQL Editor).
- **Storage:** copiare il bucket `wonderland-media` (immagini configurate admin).
- **Segreti:** conservare una copia cifrata delle variabili d'ambiente in un
  gestore aziendale; non in chat, ticket o repository.
- **Codice:** il repository Git è la sorgente; non commettere `.env.local`.
- **Verifica:** provare un restore in un progetto Supabase di staging vuoto
  prima di considerare il backup valido.

## 8. Procedura di aggiornamento

1. Backup completo (§7).
2. Applicare manualmente le nuove migrazioni nello SQL Editor (una alla volta,
   in ordine, controllando l'esito).
3. Eseguire in locale `npm run typecheck`, `npm run lint`, `npm test`,
   `npm run build`.
4. Eseguire il deploy (Vercel: merge/publish; non eseguire da questa sessione).
5. Smoke test: login admin, `/admin`, `/dashboard`, `/manifest.webmanifest`,
   `/sw.js`, `/offline.html`, `GET /api/push/cron` → 405.
6. Se è cambiato il Service Worker, verificare `CACHE_VERSION` e l'aggiornamento
   dei client (vedi `docs/PWA_INSTALL.md`).

## 9. Procedura di rollback

1. **App:** Vercel → *Deployments* → *Promote* la versione precedente. Non
   ripristinare solo il codice se le migrazioni non sono compatibili.
2. **Database:** le migrazioni 001–007 sono additive; non esiste uno script
   `down`. In caso di regressione grave: fermare le scritture, ripristinare il
   dump precedente in un progetto nuovo, aggiornare le env e ripuntare l'app.
3. **Push:** non ruotare VAPID durante un rollback: le subscription esistenti
   diventerebbero inutilizzabili.
4. **Scheduler:** disabilitare temporaneamente il cron se il rollback
   ripristina una versione senza le colonne delle migrazioni 006/007.
5. Dopo il rollback: rieseguire lo smoke test e annotare l'incidente.

## 10. Stato del rilascio

**DA CONFIGURARE / BLOCCATO:** questa guida è stata scritta senza eseguire
deploy, senza modificare DNS, senza applicare migrazioni remote e senza
configurare chiavi VAPID o scheduler. La pubblicazione richiede la tua
autorizzazione esplicita.

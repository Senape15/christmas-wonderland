# Variabili d'ambiente

Copia `.env.local.example` in `.env.local` e compila i valori.

| Variabile                        | Pubblica | Obbligatoria | Descrizione                                                        |
| -------------------------------- | -------- | ------------ | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`       | Sì       | Sì           | URL del progetto Supabase (es. `https://xyz.supabase.co`)          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Sì       | Sì           | Chiave anonima pubblica (si appoggia a RLS per la sicurezza)       |
| `SUPABASE_SERVICE_ROLE_KEY`      | No       | Solo admin   | Chiave di servizio: SOLO server, mai nel bundle client             |
| `NEXT_PUBLIC_APP_URL`            | Sì       | No           | URL pubblico dell'app (default: `http://localhost:3000`)           |
| `TZ`                             | No       | No           | Timezone applicativo, default `Europe/Rome`                        |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`   | Sì       | Per il push  | Chiave pubblica VAPID usata da `PushManager.subscribe`             |
| `VAPID_PRIVATE_KEY`              | No       | Per il push  | Chiave privata VAPID: solo server (`src/lib/push/config.ts`)       |
| `VAPID_SUBJECT`                  | No       | Consigliata  | Contatto `mailto:` o URL `https://` per il servizio push           |
| `PUSH_SCHEDULER_SECRET`          | No       | Per il cron  | Segreto (≥16 caratteri) richiesto da `POST /api/push/cron`         |

## Web Push (Fase 7)

Genera la coppia VAPID una sola volta:

```bash
npx web-push generate-vapid-keys
```

Inserisci la chiave pubblica in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e quella privata
in `VAPID_PRIVATE_KEY`. Se una delle due manca, l'app resta pienamente
funzionante ma il delivery è disattivato: le preferenze vengono salvate e il
pannello admin mostra «VAPID mancanti».

Imposta `VAPID_SUBJECT` con un contatto reale: i servizi push (FCM, Mozilla,
Apple) lo richiedono per identificare il mittente. Non inserire mai la chiave
privata in variabili `NEXT_PUBLIC_*`.

`PUSH_SCHEDULER_SECRET` protegge l'endpoint richiamato dal cron:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Senza questo valore l'endpoint risponde `503` e nessuna notifica viene inviata
da un processo esterno.

## Regole di sicurezza

- Le variabili `NEXT_PUBLIC_*` sono incluse nel bundle JavaScript: non inserire
  mai segreti.
- `SUPABASE_SERVICE_ROLE_KEY` aggira RLS: è usata solo da `createAdminClient()`
  dentro Server Actions amministrative, mai in componenti client.
- `VAPID_PRIVATE_KEY` e `PUSH_SCHEDULER_SECRET` sono lette esclusivamente da
  moduli `server-only`.
- `.env.local` è ignorato da git (presente in `.gitignore` di default).
- Non committare mai `.env.local` con valori reali.

## Dove trovarle in Supabase

*Project Settings → API*: Project URL, `anon` key, `service_role` key.

Le chiavi VAPID non provengono da Supabase: vanno generate con `web-push` (vedi
sopra) e conservate nel gestore dei segreti della piattaforma di deploy.

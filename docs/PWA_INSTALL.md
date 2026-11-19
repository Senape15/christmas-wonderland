# Installare Christmas Wonderland come PWA

La PWA è un **sito web installabile**, non un APK Android né un file EXE per
Windows. Non scarica un pacchetto da uno store: il browser crea un'icona che
apre l'app in una finestra propria, senza barra degli indirizzi (*standalone*).
I dati restano nel browser e l'autenticazione avviene sempre con Supabase.

## Requisiti

- HTTPS attivo (su `localhost` è ammesso HTTP solo per lo sviluppo);
- manifest valido: `name` «Christmas Wonderland», `short_name` «Wonderland»,
  icone 192/512/maskable, `display: standalone`, `start_url: /dashboard`;
- Service Worker registrato (`/sw.js`) e almeno un'icona 192 e una 512;
- browser aggiornato.Su iOS le push richiedono iOS 16.4+ e l'app installata.

`start_url` è una route protetta: se non hai una sessione, l'app apre `/login`
e poi torna alla dashboard dopo l'accesso. È normale.

## Windows — Chrome (o Edge)

1. Apri `https://<dominio>` in Chrome.
2. Accedi: la dashboard deve caricarsi.
3. Nella barra degli indirizzi compare l'icona «Installa» (un monitor con freccia).
   Se non compare: menu `⋮` → *Salva e condividi* → *Installa pagina come app*
   (in Edge: *App* → *Installa questo sito come app*).
4. Conferma *Installa*. Si apre una finestra standalone con il nome e l'icona
   Christmas Wonderland.
5. Per comodità: click destro sull'icona nella barra delle app → *Pinna alla
   barra delle attività* (oppure *Aggiungi a Start*).
6. Disinstallazione: finestra dell'app → menu `⋮` → *Disinstalla*, oppure
   Chrome → Impostazioni → App.

## Android — Chrome

1. Apri il sito in Chrome e accedi.
2. Compare il banner «Aggiungi a schermata Home»; in alternativa menu `⋮` →
   *Installa app* / *Aggiungi a schermata Home*.
3. Conferma. L'icona «Wonderland» appare nel drawer/launcher.
4. All'apertura concedi le notifiche se vuoi ricevere promemoria e novità.
   Su Android 13+ il permesso è richiesto dal sistema operativo.
5. Disinstallazione: tieni premuta l'icona → *Disinstalla*.

## iPhone/iPad — Safari

1. Apri il sito in **Safari** (altri browser iOS non possono installare PWA).
2. Tocca l'icona di condivisione (quadrato con freccia verso l'alto).
3. Seleziona *Aggiungi alla schermata Home* → *Aggiungi*.
4. **Apri l'app dalla schermata Home** (non da Safari): solo così Safari chiede
   il permesso per le notifiche. Su iOS 16.4+ le push per PWA funzionano solo
   se l'app è stata aggiunta alla schermata Home.
5. Disinstallazione: tieni premuta l'icona → *Rimuovi app*.

## Cosa funziona offline

La pagina offline natalizia spiega lo stato della connessione. Restano leggibili
solo le risorse statiche già scaricate (icone, CSS, JS e la pagina offline).
Caselle, quiz, password, progressi, album e notifiche richiedono la connessione:
nessuna pagina `/dashboard`, `/admin`, `/api` o risposta Supabase viene messa
in cache dal Service Worker. Dopo il logout non restano dati privati sul
dispositivo.

## Aggiornamenti della PWA

- Il Service Worker usa `updateViaCache: "none"` e verifica gli aggiornamenti
  quando la pagina torna visibile; il nuovo worker prende il controllo subito.
- `CACHE_VERSION` in `public/sw.js` va incrementato quando cambiano
  `offline.html` o il manifest: sono precacheati e altrimenti resterebbero
  vecchi finché non cambia la versione della cache.
- Se vedi una schermata obsoleta: chiudi l'app, riaprila e ricarica; se
  persiste, usa DevTools → Application → Service Workers → *Unregister* e
  *Clear site data*, poi accedi di nuovo.

## Verifica tecnica (sviluppo)

- `GET /manifest.webmanifest` → 200, `display: standalone`, icone 192/512/maskable;
- `GET /sw.js` → 200 e registrazione attiva con scope `/`;
- `GET /offline.html` → 200;
- DevTools → Application → Manifest: nessun errore;
- Lighthouse → *Installable*: requisiti soddisfatti (HTTPS necessario in prod).

**Limite dichiarato:** l'installazione non è stata provata su dispositivi fisici
in questa sessione. Le istruzioni sopra sono basate sulla configurazione del
manifest e del Service Worker verificata nel codice e via HTTP in locale; la
prova reale su Windows, Android e iOS resta **DA TESTARE SU DISPOSITIVO**.

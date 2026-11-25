# Christmas Village (Godot 4.3+)

## Prova in locale
Godot > Import > `project.godot` > F5. Nell'editor usa dati finti.

## Come si usa
- **Villaggio**: trascina per muoverti, rotellina/pinch per lo zoom.
- **Clic su un quartiere** (cartello, edificio, luogo o terreno): la camera vola dentro, gli altri
  quartieri si scuriscono, in alto compare il nome con "Torna al villaggio" (anche `Esc`).
- **Dentro il quartiere**: clic su un luogo per aprirlo (se è bloccato risponde Nico).
- **Nico** (elfo in basso a sinistra): tocca lui per sapere dove andare. "Portami lì" ti porta
  al quartiere del giorno e mette una freccia dorata sul luogo giusto.

## Luoghi e personaggi
- Clic su un luogo sbloccato dentro il quartiere: si apre la **scena del luogo** (sfondo, Nico a sinistra,
  il personaggio del posto a destra, dialogo a battute). In fondo: "Apri la sorpresa".
- Personaggi e dialoghi: `npcs.gd` (uno per `kind`, piu' Babbo Natale per la scatola finale).
- Sfondi: cartella `backgrounds/` (vedi `backgrounds/LEGGIMI.txt` per i nomi dei file).
- Per le strade passeggiano abitanti (`villager.gd`).

## File
- `main.gd` camera, quartieri, input, interfaccia e dialoghi di Nico (`_nico_say`)
- `nico.gd` ritratto animato di Nico, `zone_label.gd` cartelli dei quartieri, `fx.gd` effetti sul terreno
- `art.gd` libreria di disegno, `house.gd`/`prop.gd` luoghi e decorazioni, `sky.gd` cielo
- `place_scene.gd`/`place_bg.gd`/`npc_portrait.gd` scena del luogo, `villager.gd` abitanti, `npcs.gd` personaggi
- `api.gd` dati dal sito

## Quiz (da fare)
`_nico_say(testo, [{"label": "Risposta", "call": Callable}, ...])` mostra già domanda + risposte
come bottoni: i quiz si possono agganciare lì.

## Collegamento al sito (Next.js + Supabase)
1. Copia la cartella `next-integration/src` dentro la repo (aggiunge `GET /api/village`
   e la pagina `/dashboard/villaggio`).
2. In Godot: Project > Export > Add > Web, disattiva "Thread Support",
   esporta in `public/village/index.html` della repo (con .wasm e .pck).
3. Deploy su Vercel e apri `/dashboard/villaggio`.

Flusso: Godot -> `GET /api/village` (cookie di sessione) -> disegna i luoghi
con posizione/nome/stato del DB -> clic su "Apri la sorpresa" -> postMessage ->
la pagina apre `/dashboard?giorno=N` (UI esistente).

## Anteprima da riga di comando (opzionale)
`godot --path . -- --shot --zoom=0.8 --at=0,-60` salva /tmp/shot.png e chiude.
Aggiungi `--zone=pasticceria` per scattare dentro un quartiere.

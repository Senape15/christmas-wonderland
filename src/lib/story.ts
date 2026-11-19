import type { NicoExpression } from "@/types/nico";
import type {
  HotspotKind,
  HotspotState,
  StoryPhase,
  VillageHotspot,
} from "@/types/village";

/**
 * Testi narrativi di Fase 3.
 *
 * Trama ufficiale: «Il mistero della Stella di Natale». Il 1° dicembre il
 * villaggio scopre che la Stella ha perso la sua luce; Nico accompagna
 * l'utente in un'avventura di 24 giorni.
 *
 * REGOLA DI SEGRETO: il responsabile non deve essere nominato, mostrato o
 * reso riconoscibile prima del 24 dicembre. Qui non esiste alcun riferimento
 * al colpevole: solo indizi graduali e interpretabili.
 *
 * I testi sono volutamente centralizzati e deterministici: l'admin potrà
 * sovrascrivere i messaggi per singolo luogo dal database (`village_hotspots`),
 * senza toccare il codice.
 */

export const STORY_TITLE = "Il mistero della Stella di Natale";
export const STORY_SUBTITLE = "Un'avventura di 24 giorni con Nico";

const PHASE_INTRO: Record<StoryPhase, string> = {
  attesa:
    "Manca poco. Il villaggio sta lucidando le lanterne, impastando i biscotti e provando i canti di Natale. Il 1° dicembre scopriremo insieme cosa sta succedendo alla Stella di Natale.",
  "in-corso":
    "Il 1° dicembre il villaggio ha scoperto che la Stella di Natale ha perso la sua luce. Senza la sua energia la magia del Natale rischia di spegnersi. Esplora il villaggio, segui gli indizi e aiutaci a scoprire cosa si nasconde dietro questo mistero.",
  completo:
    "La storia ha attraversato tutto il villaggio, un giorno alla volta. Le lanterne brillano più forte: la luce del Natale è tornata.",
};

const PHASE_LABEL: Record<StoryPhase, string> = {
  attesa: "Il villaggio si prepara",
  "in-corso": "Il mistero è aperto",
  completo: "La luce è tornata",
};

const NICO_WELCOME: Record<StoryPhase, (name: string | null) => string> = {
  attesa: (name) =>
    `Ciao${name ? ` ${name}` : ""}! Io sono Nico. Il villaggio è quasi pronto: manca poco al 1° dicembre. Intanto guardati intorno, ogni angolo ha qualcosa da raccontare.`,
  "in-corso": (name) =>
    `Ciao${name ? ` ${name}` : ""}! Sono Nico. La Stella di Natale ha perso la sua luce… esplora il villaggio con me: seguiremo gli indizi, un giorno alla volta.`,
  completo: (name) =>
    `Ciao${name ? ` ${name}` : ""}! Sono Nico. Ce l'abbiamo fatta: la storia è completa e il villaggio brilla di nuovo.`,
};

const NICO_STATE_MESSAGE: Record<HotspotState, string> = {
  locked:
    "Questa parte del villaggio è ancora avvolta dalla neve. Presto potremo curiosare insieme…",
  available:
    "Ho lasciato qualcosa qui per te. Guarda bene: è il momento giusto.",
  discovered:
    "Questo posto lo conosci già, ma la sua sorpresa ti sta ancora aspettando. Possiamo aprirla quando vuoi.",
  completed:
    "Qui abbiamo già trovato un pezzo della storia. Lo ricorderemo, vero?",
};

const NICO_ZONE_MESSAGE: Record<string, string> = {
  "piazza-centrale":
    "La piazza è il cuore del villaggio. Da qui parte ogni avventura.",
  "ufficio-postale":
    "Le lettere raccontano sempre qualcosa. Anche quelle che sembrano vuote.",
  pasticceria: "Annusa! Cannella, burro e un pizzico di segreto.",
  "negozio-giocattoli":
    "Ogni giocattolo ha una storia. Alcuni aspettano solo di essere scelti.",
  "laboratorio-babbo-natale":
    "Qui i desideri prendono forma. Piano piano, senza rovinare la sorpresa.",
  "lago-ghiacciato":
    "Sotto il ghiaccio il lago è silenzioso. Sopra, il villaggio pattina e ride.",
};

const DEFAULT_LOCKED_HINT =
  "La neve ricopre ancora questo angolo del villaggio. Non è ancora il momento: torna quando la storia sarà pronta.";

const DEFAULT_COMPLETED_HINT =
  "Questa tappa della storia è già stata aperta. Nico la ricorda bene.";

const DEFAULT_AVAILABLE_HINT =
  "Qui c'è qualcosa che aspetta te. Avvicinati e scopri cosa nasconde.";

/**
 * Indizi legati al tipo di elemento illustrato. Sono teaser narrativi:
 * descrivono l'atmosfera e il gesto, mai il contenuto della sorpresa.
 */
const HOTSPOT_HINTS: Record<HotspotKind, string> = {
  tree: "Sotto i rami del grande albero c'è un pacchetto che sembra aspettare proprio te.",
  fountain:
    "La fontana è gelata, ma qualcosa scintilla tra le gocce di ghiaccio.",
  bench:
    "Sulla panchina c'è un segno lasciato nella neve… e un piccolo involucro.",
  lamp:
    "La lanterna arde nonostante il vento. Alla sua base è nascosto qualcosa.",
  mailbox:
    "La cassetta è piena zeppa. Una busta ha il tuo nome scritto a mano.",
  "post-counter":
    "Lo sportello è aperto. Dietro il vetro, un impiegato elfo ti fa cenno di avvicinarti.",
  archive:
    "Tra i pacchi impilati spunta un angolo di carta che non era lì ieri.",
  sled: "La slitta è carica di pacchi. Uno è più piccolo degli altri e non ha destinatario.",
  oven: "Il forno è caldo. Sul bordo c'è un biscotto con una forma che non riconosci.",
  "pastry-window":
    "La vetrina è piena di dolci. Uno, però, è decorato con un simbolo strano.",
  "cafe-table":
    "Sul tavolino ci sono due tazze. Una è ancora calda. L'altra aspetta te.",
  pantry:
    "La dispensa è socchiusa. Tra i barattoli c'è un biglietto piegato in quattro.",
  "toy-train":
    "Il trenino gira da solo intorno alla stazione. In un vagone c'è un pacchetto.",
  "toy-window":
    "La vetrina del negozio riflette le luci. Tra i riflessi, qualcosa si muove.",
  "toy-shelf":
    "Sullo scaffale, tra orsacchiotti e trottole, c'è uno spazio vuoto… e un indizio.",
  "rocking-horse":
    "Il cavallo a dondolo dondola piano, anche se non c'è vento.",
  workbench:
    "Sul banco da lavoro ci sono attrezzi, trucioli d'oro e una lettera aperta.",
  fireplace:
    "Il camino scoppietta. Nella cenere qualcuno ha disegnato un simbolo.",
  "toy-machine":
    "La macchina dei giocattoli sbuffa vapore. Sul nastro esce qualcosa di inatteso.",
  warehouse:
    "Il magazzino è in ordine… troppo in ordine. Una cassa è stata spostata.",
  bridge:
    "Dal ponte si vede tutto il lago. Sotto l'arcata c'è un luccichio.",
  chalet:
    "Lo chalet ha la porta socchiusa e una luce calda alla finestra.",
  "lake-sled":
    "Una slitta è ferma sul ghiaccio, con una sciarpa dimenticata sopra.",
  "shore-lantern":
    "La lanterna sulla riva segna il confine tra il sentiero e il ghiaccio.",
};

const NICO_AFTER_OPEN =
  "Un altro pezzo della storia è al suo posto. La luce della Stella si è fatta un po' più forte.";

const NICO_BEFORE_OPENING =
  "Piano piano. Quando la neve si sarà posata, potremo aprire questa sorpresa.";

const STATE_LABEL: Record<HotspotState, string> = {
  locked: "Non ancora disponibile",
  available: "Disponibile oggi",
  discovered: "Già scoperto",
  completed: "Completato",
};

type HotspotCopySource = Pick<
  VillageHotspot,
  "kind" | "hint" | "lockedHint" | "nicoMessage" | "nicoExpression"
>;

export function getStoryIntro(phase: StoryPhase): string {
  return PHASE_INTRO[phase];
}

export function getStoryPhaseLabel(phase: StoryPhase): string {
  return PHASE_LABEL[phase];
}

export function getNicoWelcome(phase: StoryPhase, name: string | null): string {
  return NICO_WELCOME[phase](name);
}

export function getNicoStateMessage(state: HotspotState): string {
  return NICO_STATE_MESSAGE[state];
}

export function getNicoZoneMessage(zoneSlug: string): string {
  return (
    NICO_ZONE_MESSAGE[zoneSlug] ??
    "Ogni zona del villaggio ha una storia da raccontare. Seguimi."
  );
}

export function getNicoAfterOpen(): string {
  return NICO_AFTER_OPEN;
}

export function getNicoBeforeOpening(): string {
  return NICO_BEFORE_OPENING;
}

export function getHotspotStateLabel(state: HotspotState): string {
  return STATE_LABEL[state];
}

/**
 * Testo della scheda narrativa.
 * - `locked`: usa solo `locked_hint` (o il default): mai il teaser del luogo.
 * - `available`/`discovered`: teaser del database, altrimenti quello del tipo.
 * - `completed`: messaggio di tappa conclusa.
 */
export function getHotspotHint(
  hotspot: HotspotCopySource,
  state: HotspotState
): string {
  if (state === "locked") {
    return hotspot.lockedHint.trim() || DEFAULT_LOCKED_HINT;
  }

  if (state === "completed") {
    return DEFAULT_COMPLETED_HINT;
  }

  return (
    hotspot.hint.trim() ||
    HOTSPOT_HINTS[hotspot.kind] ||
    DEFAULT_AVAILABLE_HINT
  );
}

/** Espressione di Nico: il luogo può suggerirla, ma lo stato ha priorità. */
export function getNicoExpressionForState(
  state: HotspotState,
  configured?: NicoExpression
): NicoExpression {
  if (state === "locked") return "curious";
  if (state === "completed") return "mysterious";
  if (state === "available") return configured ?? "happy";
  return configured ?? "curious";
}

/** Messaggio di Nico: override del database, altrimenti default per stato. */
export function getHotspotNicoMessage(
  hotspot: HotspotCopySource,
  state: HotspotState
): string {
  if (state === "locked") return getNicoStateMessage("locked");
  return hotspot.nicoMessage.trim() || getNicoStateMessage(state);
}

export function getHotspotKindHint(kind: HotspotKind): string {
  return HOTSPOT_HINTS[kind] ?? DEFAULT_AVAILABLE_HINT;
}

export function getDefaultLockedHint(): string {
  return DEFAULT_LOCKED_HINT;
}

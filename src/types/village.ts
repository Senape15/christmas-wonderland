import type { NicoExpression } from "@/types/nico";

/**
 * Stati di un punto interattivo del villaggio.
 *
 * - `locked`      → la sorpresa non è ancora disponibile (giorno futuro o
 *                   luogo non ancora associato). L'elemento resta visibile
 *                   come decorazione, ma non rivela nulla del futuro.
 * - `available`   → la sorpresa si sblocca oggi: è il momento di aprirla.
 * - `discovered`  → la tappa è già sbloccata (giorni recuperabili) ma la
 *                   sorpresa non è ancora stata aperta.
 * - `completed`   → la sorpresa è già stata aperta.
 */
export type HotspotState = "locked" | "available" | "discovered" | "completed";

/**
 * Tipi illustrati previsti dal villaggio. Sono le chiavi stabili usate
 * dall'illustrazione SVG e dal database (`village_hotspots.kind`).
 */
export type HotspotKind =
  | "tree"
  | "fountain"
  | "bench"
  | "lamp"
  | "mailbox"
  | "post-counter"
  | "archive"
  | "sled"
  | "oven"
  | "pastry-window"
  | "cafe-table"
  | "pantry"
  | "toy-train"
  | "toy-window"
  | "toy-shelf"
  | "rocking-horse"
  | "workbench"
  | "fireplace"
  | "toy-machine"
  | "warehouse"
  | "bridge"
  | "chalet"
  | "lake-sled"
  | "shore-lantern";

export const HOTSPOT_KINDS: readonly HotspotKind[] = [
  "tree",
  "fountain",
  "bench",
  "lamp",
  "mailbox",
  "post-counter",
  "archive",
  "sled",
  "oven",
  "pastry-window",
  "cafe-table",
  "pantry",
  "toy-train",
  "toy-window",
  "toy-shelf",
  "rocking-horse",
  "workbench",
  "fireplace",
  "toy-machine",
  "warehouse",
  "bridge",
  "chalet",
  "lake-sled",
  "shore-lantern",
] as const;

export function isHotspotKind(value: unknown): value is HotspotKind {
  return (
    typeof value === "string" &&
    (HOTSPOT_KINDS as readonly string[]).includes(value)
  );
}

/** Zona del villaggio (una delle sei aree illustrate). */
export interface VillageZone {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Posizione del centro zona sulla mappa, in percentuale (0-100). */
  positionX: number;
  positionY: number;
  sortOrder: number;
}

/** Punto interattivo del villaggio, già arricchito con lo stato reale. */
export interface VillageHotspot {
  id: string;
  zoneSlug: string;
  /** Identificativo stabile, indipendente dalla posizione o dal giorno. */
  slug: string;
  name: string;
  kind: HotspotKind;
  /** Posizione sulla mappa, in percentuale (0-100). */
  x: number;
  y: number;
  /**
   * Giorno associato alla sorpresa, se il luogo è già sbloccato.
   * Per i luoghi bloccati è sempre `null`: il client non deve conoscere in
   * anticipo l'associazione luogo → giorno.
   */
  dayNumber: number | null;
  state: HotspotState;
  /** Testo narrativo mostrato quando la tappa è accessibile. */
  hint: string;
  /** Testo mostrato quando la tappa non è ancora disponibile. */
  lockedHint: string;
  /** Messaggio di Nico specifico del luogo (vuoto = messaggio di default). */
  nicoMessage: string;
  /** Espressione di Nico per la scheda del luogo. */
  nicoExpression: NicoExpression;
  sortOrder: number;
}

/** Battuta di un personaggio nel villaggio (chiave = kind del luogo). */
export type VillageDialogueLine = ["npc" | "nico", string];

/**
 * Frasi configurate dall'admin tramite i quiz, già filtrate per giorno
 * sbloccato e per risposte completate dall'utente.
 */
export type VillageDialogues = Record<string, VillageDialogueLine[]>;

/** Fase narrativa derivata dal calendario reale (nessuna data inventata). */
export type StoryPhase = "attesa" | "in-corso" | "completo";

/** Tutto ciò che serve alla mappa: arriva già pronto dal server. */
export interface VillageData {
  zones: VillageZone[];
  hotspots: VillageHotspot[];
  phase: StoryPhase;
  /** La Stella di Natale è ancora luminosa? (prima del 1° dicembre) */
  starLit: boolean;
  /**
   * `true` quando i luoghi arrivano dal database (associazioni luogo → giorno
   * configurate). `false` quando la mappa usa il catalogo illustrato di
   * riserva: nessuna associazione inventata, tutti i luoghi restano chiusi.
   */
  hasDatabaseMapping: boolean;
}

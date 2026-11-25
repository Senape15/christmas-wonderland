import type { DayState } from "@/types/experience";

/**
 * Contratti pubblici della Fase 6.
 *
 * Questi oggetti attraversano il confine server → client. Non contengono mai:
 *  - dati di altri utenti;
 *  - contenuti di giorni non sbloccati;
 *  - hash, risposte corrette o il messaggio finale prima del gate.
 */

export type DiaryCategory =
  | "apertura"
  | "contenuto"
  | "indizio"
  | "quiz"
  | "password"
  | "oggetto"
  | "simbolo"
  | "sfera"
  | "giornata"
  | "speciale"
  | "finale";

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface DiaryEventView {
  id: string;
  eventKey: string;
  category: DiaryCategory;
  title: string;
  description: string;
  dayNumber: number | null;
  imageUrl: string | null;
  occurredAt: string;
  /** Già formattata sul server nel fuso Europe/Rome (nessun mismatch). */
  occurredAtLabel: string;
  sourceType: string | null;
  sourceId: string | null;
}

export type AlbumKind =
  | "letter"
  | "note"
  | "photo"
  | "clue"
  | "object"
  | "puzzle"
  | "password"
  | "gift"
  | "elf"
  | "secret"
  | "sphere"
  | "special"
  | "day";

export interface AlbumEntry {
  id: string;
  kind: AlbumKind;
  title: string;
  description: string;
  content: string;
  imageUrl: string | null;
  dayNumber: number | null;
  acquiredAt: string;
  acquiredAtLabel: string;
  sourceType: string;
  sourceId: string | null;
}

export interface AlbumData {
  entries: AlbumEntry[];
  kinds: FilterOption[];
  days: FilterOption[];
  phase6Ready: boolean;
}

export type CollectibleSource = "gift" | "content" | "symbol";

export interface CollectibleItem {
  id: string;
  source: CollectibleSource;
  name: string;
  description: string;
  specialDescription: string;
  imageUrl: string | null;
  dayNumber: number | null;
  acquiredAt: string | null;
  acquiredAtLabel: string | null;
  category: string;
  rarity: string;
  /** true = oggetto non ancora ottenuto, mostrato solo come sagoma. */
  silhouette: boolean;
}

export interface SymbolItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  dayNumber: number | null;
  acquiredAt: string | null;
  acquiredAtLabel: string | null;
  category: string;
  rarity: string;
  silhouette: boolean;
}

export interface SphereItem {
  id: string;
  title: string;
  note: string | null;
  photoUrl: string | null;
  dayNumber: number | null;
  isUnlocked: boolean;
  unlockedAt: string | null;
  discoveredAt: string | null;
  unlockedAtLabel: string | null;
  discoveredAtLabel: string | null;
  /** true quando la sfera è sbloccata ma non ancora aperta. */
  isNew: boolean;
}

export interface CollectionCounts {
  objectsFound: number;
  objectsTotal: number;
  symbolsFound: number;
  symbolsTotal: number;
  spheresFound: number;
  spheresTotal: number;
}

export interface CollectionData {
  objects: CollectibleItem[];
  symbols: SymbolItem[];
  spheres: SphereItem[];
  counts: CollectionCounts;
  phase6Ready: boolean;
}

export interface ClueLink {
  id: string;
  title: string;
  dayNumber: number | null;
}

export interface ClueItem {
  id: string;
  title: string;
  description: string;
  content: string;
  imageUrl: string | null;
  dayNumber: number | null;
  acquiredAt: string;
  acquiredAtLabel: string;
  group: string | null;
  sourceLabel: string | null;
  related: ClueLink[];
}

export interface TimelineDay {
  dayNumber: number;
  state: DayState;
  isUnlocked: boolean;
  isOpened: boolean;
  isCompleted: boolean;
  /** null per i giorni futuri: nessun titolo o dettaglio lascia il server. */
  title: string | null;
  events: DiaryEventView[];
  objects: number;
  quizzes: number;
  clues: number;
  memories: number;
}

export interface TimelineData {
  days: TimelineDay[];
  phase6Ready: boolean;
}

export interface FinaleMemory {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  dayNumber: number | null;
  kind: string;
}

export interface FinaleGift {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  dayNumber: number;
}

export interface FinaleBoxView {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  introMessage: string;
  finalMessage: string;
  clues: string[];
  objects: string[];
  completed: boolean;
  passwordEnabled: boolean;
  physicalGiftId: string | null;
}

export interface FinaleData {
  /** true solo dal giorno di rivelazione (24 dicembre) in poi. */
  available: boolean;
  completed: boolean;
  dayNumber: 24;
  /** Messaggio generico mostrato quando il gate non è ancora superato. */
  gateMessage: string;
  finalBox: FinaleBoxView | null;
  physicalGift: FinaleGift | null;
  journey: {
    daysCompleted: number;
    memories: number;
    objects: number;
    symbols: number;
    spheres: number;
    clues: number;
    quizzes: number;
  };
  importantMemories: FinaleMemory[];
  objects: CollectibleItem[];
  clues: ClueItem[];
  phase6Ready: boolean;
}

export interface SphereOpenResult {
  ok: boolean;
  error: string | null;
  sphere: SphereItem | null;
}

/**
 * Contenuti fisici collegati ai giorni del calendario.
 *
 * FASE 3: solo interfacce e relazioni (tabella `physical_contents` nella
 * migrazione 002). Nessun contenuto viene mostrato nell'interfaccia finché il
 * modulo dedicato non verrà realizzato in una fase successiva.
 *
 * Regola di progetto: ogni giorno può avere uno o più contenuti fisici
 * (lettere, biglietti, oggetti, foto, indizi, enigmi, password). La password
 * può essere obbligatoria o facoltativa, in base alla configurazione admin.
 */

export type PhysicalContentKind =
  | "letter"
  | "note"
  | "object"
  | "photo"
  | "clue"
  | "puzzle"
  | "password";

export const PHYSICAL_CONTENT_KINDS: readonly PhysicalContentKind[] = [
  "letter",
  "note",
  "object",
  "photo",
  "clue",
  "puzzle",
  "password",
] as const;

/**
 * Un contenuto fisico, collegato a un giorno e (opzionalmente) a un punto del
 * villaggio e quindi a una fase narrativa.
 *
 * - `dayNumber` è la fase narrativa di riferimento (1-24).
 * - `hotspotSlug` / `zoneSlug` collegano l'indizio fisico al luogo del
 *   villaggio in cui viene raccontato.
 * - `passwordRequired` indica se serve la password trovata nella scatola.
 *   La password reale non vive nel database: è un oggetto fisico. Qui si
 *   conserva solo il suggerimento mostrabile (`passwordHint`).
 */
export interface PhysicalContent {
  id: string;
  dayNumber: number;
  hotspotId: string | null;
  hotspotSlug: string | null;
  zoneSlug: string | null;
  kind: PhysicalContentKind;
  title: string;
  content: string;
  passwordRequired: boolean;
  passwordHint: string | null;
  sortOrder: number;
}

/** Aspetto configurabile della scatola finale (fase admin futura). */
export interface PhysicalBoxStyle {
  shape: "cube" | "chest" | "house" | "book" | "custom";
  look: string;
  color: string;
  decorations: string[];
  symbol: string | null;
}

/**
 * Configurazione della scatola finale.
 *
 * Non viene salvata in `app_settings` (leggibile da tutti gli utenti
 * autenticati) per non anticipare il regalo del 24 dicembre. Andrà gestita in
 * una tabella/settings riservata all'admin nella fase dedicata.
 */
export interface FinalGiftBoxConfig {
  style: PhysicalBoxStyle;
  finalMessage: string | null;
}

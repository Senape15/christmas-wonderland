/**
 * Riepilogo speciale del 24 dicembre.
 *
 * Riusa i gate della scatola finale della Fase 5: la disponibilità dipende
 * dal giorno di rivelazione configurato (`final_gift_boxes.reveal_day`) e
 * dallo sblocco reale del giorno. Il completamento deriva dalla tabella
 * `final_box_completions` (mai duplicata). Fino al gate non viene inviato
 * alcun contenuto narrativo: solo un messaggio generico.
 */

export const FINALE_GATE_MESSAGE =
  "Il riepilogo del viaggio si aprirà il 24 dicembre, quando la Stella tornerà a brillare.";

export interface FinaleGateInput {
  revealDay: number;
  dayUnlocked: boolean;
  completed: boolean;
}

export interface FinaleGate {
  available: boolean;
  completed: boolean;
  gateMessage: string;
}

export function resolveFinaleGate(input: FinaleGateInput): FinaleGate {
  // Il giorno di rivelazione deve essere già sbloccato: nessuna apertura
  // anticipata, nemmeno in presenza di un completamento registrato.
  const available = input.dayUnlocked;
  return {
    available,
    completed: available && input.completed,
    gateMessage: FINALE_GATE_MESSAGE,
  };
}

export interface FinaleJourneyFacts {
  daysCompleted: number;
  memories: number;
  objects: number;
  symbols: number;
  spheres: number;
  clues: number;
  quizzes: number;
}

/** Riepilogo numerico del viaggio, già filtrato dal server. */
export function buildFinaleJourney(
  facts: FinaleJourneyFacts
): FinaleJourneyFacts {
  const normalize = (value: number) =>
    Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

  return {
    daysCompleted: normalize(facts.daysCompleted),
    memories: normalize(facts.memories),
    objects: normalize(facts.objects),
    symbols: normalize(facts.symbols),
    spheres: normalize(facts.spheres),
    clues: normalize(facts.clues),
    quizzes: normalize(facts.quizzes),
  };
}

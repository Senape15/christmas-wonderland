/**
 * Testi delle notifiche automatiche.
 *
 * Regole narrative: nessun testo anticipa il colpevole o il finale prima del
 * 24 dicembre. I messaggi restano volutamente generici.
 */

export const DAILY_TITLE = "Christmas Wonderland";
export const DAILY_BODY =
  "Buongiorno! Una nuova sorpresa ti aspetta a Christmas Wonderland.";
export const REMINDER_BODY =
  "Non hai ancora aperto la casella di oggi. Nico ha qualcosa da mostrarti!";
export const CLUE_BODY =
  "Hai trovato qualcosa di interessante... Torna a scoprire il villaggio.";
export const QUIZ_BODY = "Un nuovo enigma ti aspetta!";
export const FINALE_BODY =
  "La Stella di Natale ha bisogno di te. È arrivato il momento di scoprire la verità.";
export const DEFAULT_URL = "/dashboard";

/** Testo di fallback quando l'admin non ne ha configurato uno. */
export const KIND_FALLBACK_BODY: Record<string, string> = {
  daily: DAILY_BODY,
  reminder: REMINDER_BODY,
  clue: CLUE_BODY,
  quiz: QUIZ_BODY,
  finale: FINALE_BODY,
  content: "C'è qualcosa di nuovo nel tuo calendario.",
  special: "Una comunicazione speciale ti aspetta a Christmas Wonderland.",
};

export function fallbackBody(kind: string): string {
  return KIND_FALLBACK_BODY[kind] ?? KIND_FALLBACK_BODY.special;
}

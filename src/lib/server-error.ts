/**
 * Gestione uniforme delle eccezioni nelle Server Actions.
 *
 * I catch non devono restituire al client il valore grezzo di un errore:
 * può contenere URL con credenziali, chiavi API o dati personali. Qui il
 * dettaglio completo (sanitizzato) va solo nei log del server, mentre al
 * client torna un messaggio leggibile e privo di informazioni sensibili.
 */

const SENSITIVE_PATTERN =
  /sb_secret_[A-Za-z0-9_-]+|sb_publishable_[A-Za-z0-9_-]+|Bearer\s+[A-Za-z0-9._-]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function redact(text: string): string {
  return text.replace(SENSITIVE_PATTERN, "[redatto]").slice(0, 400);
}

function asRecord(error: unknown): Record<string, unknown> | null {
  return typeof error === "object" && error !== null
    ? (error as Record<string, unknown>)
    : null;
}

/**
 * Registra l'errore originale sul server e restituisce il messaggio sicuro
 * da mostrare all'utente. Gestisce sia `Error` sia errori "plain object"
 * (per esempio errori Supabase/PostgREST through boundary di runtime).
 */
export function reportServerError(context: string, error: unknown): string {
  const record = asRecord(error);
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof record?.message === "string"
        ? record.message
        : typeof error === "string"
          ? error
          : null;
  const code = record?.code;
  const name =
    error instanceof Error
      ? error.name
      : typeof record?.name === "string"
        ? record.name
        : typeof error;

  console.error(`[${context}] errore originale`, {
    name,
    code: typeof code === "string" || typeof code === "number" ? code : undefined,
    message: rawMessage ? redact(rawMessage) : "valore senza messaggio",
  });

  return rawMessage ? redact(rawMessage) : "Errore sconosciuto";
}

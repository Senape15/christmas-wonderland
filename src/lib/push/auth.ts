import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Protezione dell'endpoint di scheduler.
 *
 * Il segreto vive solo nelle variabili d'ambiente del server: se manca,
 * l'endpoint risponde 503 invece di accettare richieste non autenticate.
 */

export const CRON_SECRET_HEADER = "x-wonderland-cron-secret";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

function safeEqual(a: string, b: string): boolean {
  // Confronta digests a lunghezza fissa: la lunghezza del segreto non deve
  // essere deducibile dal tempo di risposta.
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

export function authorizeCronRequest(
  headers: Headers,
  secret: string | undefined
): CronAuthResult {
  const configured = secret?.trim();
  if (!configured || configured.length < 16) {
    return {
      ok: false,
      status: 503,
      error:
        "Scheduler non configurato: imposta PUSH_SCHEDULER_SECRET (almeno 16 caratteri).",
    };
  }

  const authorization = headers.get("authorization") ?? "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  const direct = (headers.get(CRON_SECRET_HEADER) ?? "").trim();
  const provided = bearer || direct;

  if (!provided || !safeEqual(provided, configured)) {
    return { ok: false, status: 401, error: "Non autorizzato." };
  }

  return { ok: true };
}

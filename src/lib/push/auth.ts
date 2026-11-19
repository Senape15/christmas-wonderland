import { timingSafeEqual } from "node:crypto";

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
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function authorizeCronRequest(
  headers: Headers,
  secret: string | undefined
): CronAuthResult {
  if (!secret || secret.trim().length < 16) {
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

  if (!provided || !safeEqual(provided, secret)) {
    return { ok: false, status: 401, error: "Non autorizzato." };
  }

  return { ok: true };
}

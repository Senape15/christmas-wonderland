import "server-only";

/**
 * Configurazione VAPID.
 *
 * La chiave privata non deve MAI essere importata da un componente client:
 * questo modulo è marcato `server-only`.
 */

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function readVapidConfig(
  env: Record<string, string | undefined> = process.env
): VapidConfig | null {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;

  const rawSubject = (env.VAPID_SUBJECT ?? "mailto:admin@christmas-wonderland.test").trim();
  const subject =
    rawSubject.startsWith("mailto:") || rawSubject.startsWith("https://")
      ? rawSubject
      : `mailto:${rawSubject}`;

  return { publicKey, privateKey, subject };
}

export function isPushConfigured(
  env: Record<string, string | undefined> = process.env
): boolean {
  return readVapidConfig(env) !== null;
}

/** Chiave pubblica da consegnare al browser (mai la privata). */
export function publicVapidKey(
  env: Record<string, string | undefined> = process.env
): string {
  return env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
}

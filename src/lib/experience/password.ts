import type { PasswordChallenge } from "@/types/experience";

/**
 * Dati pubblici di una password fisica: MAI l'hash.
 * Il tipo non contiene `password_hash`, quindi non può essere inoltrato al
 * client per errore tramite spread.
 */
export interface PasswordConfigRow {
  hint: string;
  success_message: string;
  max_attempts: number | null;
  is_active: boolean;
}

export function computePasswordChallenge(
  config: PasswordConfigRow | null,
  attemptsUsed: number,
  completed: boolean
): PasswordChallenge | null {
  if (!config) return null;

  const maxAttempts =
    typeof config.max_attempts === "number" && config.max_attempts > 0
      ? config.max_attempts
      : null;
  const safeAttempts = Math.max(0, Math.floor(attemptsUsed));

  const remainingAttempts =
    maxAttempts === null ? null : Math.max(0, maxAttempts - safeAttempts);

  const canAttempt =
    config.is_active &&
    !completed &&
    (remainingAttempts === null || remainingAttempts > 0);

  return {
    hint: config.hint,
    maxAttempts,
    attemptsUsed: safeAttempts,
    remainingAttempts,
    completed,
    canAttempt,
  };
}

/** Messaggio di sblocco: restituito solo a completamento avvenuto. */
export function publicSuccessMessage(
  config: PasswordConfigRow | null,
  fallback: string
): string {
  return config?.success_message.trim() || fallback;
}

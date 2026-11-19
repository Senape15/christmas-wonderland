import { toRomeDateString } from "./time";

/**
 * Condizioni di sblocco configurabili dall'admin nei campi JSON:
 * `physical_contents.activation_conditions`, `quizzes.unlock_conditions`,
 * `gift_symbols.discovery_conditions`, `memory_spheres.activation_conditions`.
 *
 * Schema supportato (tutti i campi opcionali, valutati in AND):
 *
 * {
 *   "availableFrom": "2026-12-10",            // data civile o ISO datetime
 *   "afterDay": 9,                            // il giorno 9 deve essere aperto
 *   "requiresDays": [3, 4],                   // tutti i giorni indicati aperti
 *   "requiresQuiz": "uuid" | ["uuid", ...],   // quiz risolti correttamente
 *   "requiresPassword": "uuid" | ["uuid"]     // password fisiche completate
 * }
 *
 * Le condizioni sono verificate SOLO lato server. Se un campo non è
 * riconosciuto viene ignorato; se una condizione è malformata il contenuto
 * resta nascosto (fail-safe, nessuna anticipazione).
 */

export interface NormalizedConditions {
  availableFrom: string | null;
  requiresDays: number[];
  requiresQuizIds: string[];
  requiresPasswordContentIds: string[];
}

export interface ConditionState {
  now: Date;
  openedDays: ReadonlySet<number>;
  completedQuizIds: ReadonlySet<string>;
  completedContentIds: ReadonlySet<string>;
}

export interface ConditionResult {
  met: boolean;
  /** Motivo generico mostrabile all'utente, senza dettagli segreti. */
  reason: string | null;
}

const EMPTY: NormalizedConditions = {
  availableFrom: null,
  requiresDays: [],
  requiresQuizIds: [],
  requiresPasswordContentIds: [],
};

function asConditionObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return asConditionObject(parsed);
    } catch {
      return {};
    }
  }
  if (Array.isArray(value)) return {};
  if (typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function asStringList(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function asDayList(value: unknown): number[] {
  const raw = Array.isArray(value) ? value : [value];
  const days = raw
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 24);
  return Array.from(new Set(days));
}

export function parseConditions(value: unknown): NormalizedConditions {
  const object = asConditionObject(value);
  if (Object.keys(object).length === 0) return { ...EMPTY };

  const availableFromRaw =
    typeof object.availableFrom === "string" ? object.availableFrom.trim() : "";

  const requiresDays = [
    ...asDayList(object.requiresDays),
    ...asDayList(object.afterDay),
  ];

  const requiresQuizIds = Array.from(
    new Set([
      ...asStringList(object.requiresQuiz),
      ...asStringList(object.requiresQuizzes),
    ])
  );

  const requiresPasswordContentIds = Array.from(
    new Set([
      ...asStringList(object.requiresPassword),
      ...asStringList(object.requiresPasswords),
    ])
  );

  return {
    availableFrom: availableFromRaw || null,
    requiresDays: Array.from(new Set(requiresDays)),
    requiresQuizIds,
    requiresPasswordContentIds,
  };
}

function isAvailableFrom(
  availableFrom: string,
  now: Date
): boolean {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(availableFrom);

  if (dateOnly) {
    const today = toRomeDateString(now);
    return today !== "" && today >= availableFrom;
  }

  const target = new Date(availableFrom);
  if (Number.isNaN(target.getTime())) return false;
  return target.getTime() <= now.getTime();
}

export function evaluateConditions(
  value: unknown,
  state: ConditionState
): ConditionResult {
  const conditions = parseConditions(value);

  if (conditions.availableFrom && !isAvailableFrom(conditions.availableFrom, state.now)) {
    return { met: false, reason: "Non è ancora il momento di scoprire questo contenuto." };
  }

  if (!conditions.requiresDays.every((day) => state.openedDays.has(day))) {
    return {
      met: false,
      reason: "Manca ancora una tappa della storia: torna quando l'avrai aperta.",
    };
  }

  if (
    !conditions.requiresQuizIds.every((id) => state.completedQuizIds.has(id))
  ) {
    return {
      met: false,
      reason: "C'è ancora un enigma da risolvere prima di svelare questo contenuto.",
    };
  }

  if (
    !conditions.requiresPasswordContentIds.every((id) =>
      state.completedContentIds.has(id)
    )
  ) {
    return {
      met: false,
      reason: "Una password della scatola fisica deve ancora essere trovata.",
    };
  }

  return { met: true, reason: null };
}

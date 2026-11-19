import type { DayState, UserProgress } from "@/types/experience";
import { evaluateConditions, type ConditionState } from "./conditions";

/**
 * Regole di completamento di un giorno.
 *
 * Un giorno è COMPLETATO quando:
 *  - è stato aperto dall'utente; e
 *  - tutte le attività obbligatorie configurate sono concluse:
 *      * quiz attivi con `is_required = true`;
 *      * contenuti attivi con password obbligatoria e password attiva.
 *
 * I quiz facoltativi non bloccano il completamento. I premi non vengono mai
 * assegnati due volte: i set di id completati derivano da vincoli univoci nel
 * database e vengono ricostruiti dal server a ogni richiesta.
 */

export interface QuizRequirementRow {
  id: string;
  day_number: number;
  is_active: boolean;
  is_required: boolean;
}

export interface PasswordRequirementRow {
  id: string;
  day_number: number;
}

export interface DayRequirements {
  quizIds: string[];
  contentIds: string[];
}

export function buildDayRequirements(
  quizzes: readonly QuizRequirementRow[],
  passwordContents: readonly PasswordRequirementRow[]
): Map<number, DayRequirements> {
  const map = new Map<number, DayRequirements>();

  const ensure = (dayNumber: number): DayRequirements => {
    const current = map.get(dayNumber);
    if (current) return current;
    const created: DayRequirements = { quizIds: [], contentIds: [] };
    map.set(dayNumber, created);
    return created;
  };

  for (const quiz of quizzes) {
    if (!quiz.is_active || !quiz.is_required) continue;
    ensure(quiz.day_number).quizIds.push(quiz.id);
  }

  for (const content of passwordContents) {
    ensure(content.day_number).contentIds.push(content.id);
  }

  return map;
}

export interface CompletionFacts {
  openedDays: ReadonlySet<number>;
  correctQuizIds: ReadonlySet<string>;
  completedContentIds: ReadonlySet<string>;
}

export function isDayComplete(
  dayNumber: number,
  facts: CompletionFacts,
  requirements: ReadonlyMap<number, DayRequirements>
): boolean {
  if (!facts.openedDays.has(dayNumber)) return false;

  const required = requirements.get(dayNumber);
  if (!required) return true;

  return (
    required.quizIds.every((id) => facts.correctQuizIds.has(id)) &&
    required.contentIds.every((id) => facts.completedContentIds.has(id))
  );
}

export function deriveDayState(input: {
  dayNumber: number;
  isUnlocked: boolean;
  isOpened: boolean;
  facts: CompletionFacts;
  requirements: ReadonlyMap<number, DayRequirements>;
}): { state: DayState; isCompleted: boolean } {
  if (!input.isUnlocked) {
    return { state: "locked", isCompleted: false };
  }
  if (!input.isOpened) {
    return { state: "available", isCompleted: false };
  }

  const isCompleted = isDayComplete(
    input.dayNumber,
    input.facts,
    input.requirements
  );

  return {
    state: isCompleted ? "completed" : "opened",
    isCompleted,
  };
}

export interface ProgressQuizRow {
  id: string;
  day_number: number;
  points: number;
  is_active: boolean;
  is_required?: boolean;
  unlock_conditions?: unknown;
}

export interface ProgressContentRow {
  id: string;
  day_number: number;
  kind: string;
  is_active: boolean;
  /** Solo i contenuti con password obbligatoria entrano nei conteggi. */
  password_required?: boolean;
  /** Condizioni configurate dall'admin (indizi nascosti non vengono contati). */
  activation_conditions?: unknown;
}

export interface ProgressGiftRow {
  id: string;
  day_number: number;
}

export interface ProgressSymbolRow {
  id: string;
  day_number: number | null;
  discovery_conditions?: unknown;
}

export interface ProgressSphereRow {
  id: string;
  day_number: number | null;
  is_unlocked: boolean;
}

export interface ProgressDayRow {
  dayNumber: number;
  isUnlocked: boolean;
  isOpened: boolean;
  isCompleted: boolean;
}

export interface ProgressInput {
  days: readonly ProgressDayRow[];
  quizzes: readonly ProgressQuizRow[];
  contents: readonly ProgressContentRow[];
  passwordContentIds: ReadonlySet<string>;
  gifts: readonly ProgressGiftRow[];
  symbols: readonly ProgressSymbolRow[];
  spheres: readonly ProgressSphereRow[];
  correctQuizIds: ReadonlySet<string>;
  completedContentIds: ReadonlySet<string>;
  finalBoxCompleted: boolean;
  /** Se presente, i contenuti/simboli con condizioni non soddisfatte non contano. */
  conditionState?: ConditionState;
}

/**
 * Riepilogo dei progressi.
 *
 * I totali considerano solo i giorni già sbloccati: i contenuti futuri non
 * vengono conteggiati (e non sono nemmeno leggibili con la RLS utente).
 */
export function summarizeProgress(input: ProgressInput): UserProgress {
  const unlockedDays = new Set(
    input.days.filter((day) => day.isUnlocked).map((day) => day.dayNumber)
  );
  const openedDays = new Set(
    input.days.filter((day) => day.isOpened).map((day) => day.dayNumber)
  );

  const isVisible = (conditions: unknown): boolean =>
    !input.conditionState ||
    evaluateConditions(conditions, input.conditionState).met;

  const quizzes = input.quizzes.filter(
    (quiz) =>
      quiz.is_active &&
      unlockedDays.has(quiz.day_number) &&
      isVisible(quiz.unlock_conditions)
  );
  const quizzesCompleted = quizzes.filter((quiz) =>
    input.correctQuizIds.has(quiz.id)
  );
  const pointsAvailable = quizzes.reduce(
    (total, quiz) => total + Math.max(0, quiz.points),
    0
  );
  const pointsEarned = quizzesCompleted.reduce(
    (total, quiz) => total + Math.max(0, quiz.points),
    0
  );

  const passwordContents = input.contents.filter(
    (content) =>
      content.is_active &&
      content.password_required !== false &&
      unlockedDays.has(content.day_number) &&
      input.passwordContentIds.has(content.id)
  );
  const passwordsFound = passwordContents.filter((content) =>
    input.completedContentIds.has(content.id)
  ).length;

  const clueContents = input.contents.filter(
    (content) =>
      content.is_active &&
      content.kind === "clue" &&
      unlockedDays.has(content.day_number) &&
      (!content.password_required ||
        input.passwordContentIds.has(content.id)) &&
      isVisible(content.activation_conditions)
  );
  const cluesFound = clueContents.filter((content) =>
    openedDays.has(content.day_number)
  ).length;

  const gifts = input.gifts.filter((gift) => unlockedDays.has(gift.day_number));
  const giftsFound = gifts.filter((gift) => openedDays.has(gift.day_number)).length;

  const symbols = input.symbols.filter(
    (symbol) =>
      symbol.day_number !== null &&
      unlockedDays.has(symbol.day_number) &&
      isVisible(symbol.discovery_conditions)
  );
  const symbolsFound = symbols.filter(
    (symbol) =>
      symbol.day_number !== null && openedDays.has(symbol.day_number)
  ).length;

  const daysOpened = openedDays.size;
  const daysCompleted = input.days.filter((day) => day.isCompleted).length;
  const visibleSpheres = input.spheres.filter(
    (sphere) =>
      sphere.day_number === null || unlockedDays.has(sphere.day_number)
  );
  const spheresUnlocked = visibleSpheres.filter(
    (sphere) => sphere.is_unlocked
  ).length;

  const surprisesUnlocked =
    passwordsFound + quizzesCompleted.length + (input.finalBoxCompleted ? 1 : 0);

  return {
    daysOpened,
    daysCompleted,
    totalDays: 24,
    quizzesCompleted: quizzesCompleted.length,
    quizzesTotal: quizzes.length,
    pointsEarned,
    pointsAvailable,
    passwordsFound,
    passwordsTotal: passwordContents.length,
    cluesFound,
    cluesTotal: clueContents.length,
    giftsFound,
    giftsTotal: gifts.length,
    symbolsFound,
    symbolsTotal: symbols.length,
    spheresUnlocked,
    spheresTotal: visibleSpheres.length,
    surprisesUnlocked,
  };
}

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarData, buildCalendarDays, openAdventDay } from "./advent";
import type { CurrentUser } from "@/lib/auth";
import type { CalendarData, CalendarDay } from "@/types/calendar";
import {
  buildDayRequirements,
  deriveDayState,
  summarizeProgress,
  type CompletionFacts,
  type ProgressContentRow,
  type ProgressGiftRow,
  type ProgressQuizRow,
  type ProgressSphereRow,
  type ProgressSymbolRow,
} from "@/lib/experience/completion";
import {
  evaluateConditions,
  type ConditionState,
} from "@/lib/experience/conditions";
import {
  computePasswordChallenge,
  publicSuccessMessage,
} from "@/lib/experience/password";
import {
  gateFinalBoxDetails,
  gateFinalBoxMessage,
} from "@/lib/experience/final-box";
import {
  findCorrectAnswerText,
  toPublicQuiz,
  type QuizAnswerRow,
  type QuizRow,
} from "@/lib/experience/quiz";
import {
  createDateContext,
  isDayUnlocked,
  type DateContext,
  type SimulationRow,
} from "@/lib/experience/time";
import type {
  ContentKind,
  DayContent,
  DayExperience,
  DayExperienceResult,
  DayGift,
  DayMemorySphere,
  DayMessage,
  DayQuiz,
  DaySymbol,
  ExperienceData,
  FinalBoxView,
  UserProgress,
} from "@/types/experience";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

const CONTENT_KINDS: readonly ContentKind[] = [
  "letter",
  "note",
  "object",
  "photo",
  "clue",
  "puzzle",
  "password",
];

function isContentKind(value: string): value is ContentKind {
  return (CONTENT_KINDS as readonly string[]).includes(value);
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Client di lettura: RLS per gli utenti, service role solo per l'anteprima admin. */
async function getReadClient(simulation: boolean): Promise<ServerClient> {
  return simulation ? ((await createAdminClient()) as ServerClient) : createClient();
}

/**
 * Simulazione: solo un amministratore può attivarla, e riguarda solo la
 * propria vista. Un utente normale non può mai leggere questa tabella.
 */
export async function getSimulationRow(
  user: CurrentUser
): Promise<SimulationRow | null> {
  if (user.role !== "admin") return null;

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("admin_date_simulations")
      .select("simulated_date, note, is_active")
      .eq("admin_id", user.id)
      .maybeSingle();

    if (error || !data) return null;
    return data as SimulationRow;
  } catch {
    return null;
  }
}

export async function getDateContextForUser(
  user: CurrentUser
): Promise<DateContext> {
  const simulation = await getSimulationRow(user);
  return createDateContext(simulation);
}

interface CompletionSnapshot extends CompletionFacts {
  finalBoxIds: Set<string>;
}

async function loadCompletionSnapshot(
  userId: string
): Promise<CompletionSnapshot> {
  const supabase = await createClient();

  const [openings, quizAttempts, completions, finalBox] = await Promise.all([
    supabase.from("user_openings").select("day_number").eq("user_id", userId),
    supabase
      .from("user_quiz_attempts")
      .select("quiz_id, is_correct")
      .eq("user_id", userId)
      .eq("is_correct", true),
    supabase
      .from("password_completions")
      .select("content_id")
      .eq("user_id", userId),
    supabase.from("final_box_completions").select("box_id").eq("user_id", userId),
  ]);

  const openedDays = new Set<number>(
    (openings.data ?? []).map((row) => Number(row.day_number))
  );
  const correctQuizIds = new Set<string>(
    (quizAttempts.data ?? []).map((row) => String(row.quiz_id))
  );
  const completedContentIds = new Set<string>(
    (completions.data ?? []).map((row) => String(row.content_id))
  );
  const finalBoxIds = new Set<string>(
    (finalBox.data ?? []).map((row) => String(row.box_id))
  );

  return {
    openedDays,
    correctQuizIds,
    completedContentIds,
    finalBoxIds,
  };
}

interface ExperienceConfig {
  contents: ProgressContentRow[];
  quizzes: ProgressQuizRow[];
  passwordContentIds: Set<string>;
  gifts: ProgressGiftRow[];
  symbols: ProgressSymbolRow[];
  spheres: ProgressSphereRow[];
}

async function loadExperienceConfig(
  userId: string,
  simulation: boolean
): Promise<ExperienceConfig> {
  const client = await getReadClient(simulation);
  const admin = simulation ? null : await createAdminClient();

  const [contents, quizzes, passwords, gifts, symbols, spheres] =
    await Promise.all([
      client
        .from("physical_contents")
        .select(
          "id, day_number, kind, is_active, password_required, activation_conditions"
        )
        .eq("is_active", true),
      client
        .from("quizzes")
        .select("id, day_number, points, is_active, is_required, unlock_conditions")
        .eq("is_active", true),
      (admin ?? client)
        .from("physical_passwords")
        .select("content_id, is_active")
        .eq("is_active", true),
      client.from("physical_gifts").select("id, day_number").eq("is_active", true),
      client
        .from("gift_symbols")
        .select("id, day_number, discovery_conditions")
        .eq("is_active", true),
      client
        .from("memory_spheres")
        .select("id, day_number, is_unlocked")
        .eq("user_id", userId),
    ]);

  return {
    contents: (contents.data ?? []).map((row) => ({
      id: String(row.id),
      day_number: Number(row.day_number),
      kind: String(row.kind),
      is_active: Boolean(row.is_active),
      password_required: Boolean(row.password_required),
      activation_conditions: row.activation_conditions,
    })),
    quizzes: (quizzes.data ?? []).map((row) => ({
      id: String(row.id),
      day_number: Number(row.day_number),
      points: Number(row.points),
      is_active: Boolean(row.is_active),
      is_required: Boolean(row.is_required),
      unlock_conditions: row.unlock_conditions,
    })),
    passwordContentIds: new Set(
      (passwords.data ?? []).map((row) => String(row.content_id))
    ),
    gifts: (gifts.data ?? []).map((row) => ({
      id: String(row.id),
      day_number: Number(row.day_number),
    })),
    symbols: (symbols.data ?? []).map((row) => ({
      id: String(row.id),
      day_number: row.day_number === null ? null : Number(row.day_number),
      discovery_conditions: row.discovery_conditions,
    })),
    spheres: (spheres.data ?? []).map((row) => ({
      id: String(row.id),
      day_number: row.day_number === null ? null : Number(row.day_number),
      is_unlocked: Boolean(row.is_unlocked),
    })),
  };
}

/**
 * Dati del calendario per la dashboard, con completamento e progressi.
 * In modalità normale usa esclusivamente il client RLS dell'utente.
 * In simulazione (solo admin) legge i giorni futuri con il service role, ma
 * non registra aperture, tentativi o completamenti.
 */
export async function getExperienceData(
  user: CurrentUser
): Promise<ExperienceData> {
  const simulation = await getSimulationRow(user);
  const context = createDateContext(simulation);

  const calendarBase = context.isSimulation
    ? await loadSimulatedCalendar(user.id, context)
    : await getCalendarData(user.id);

  const [snapshot, config] = await Promise.all([
    loadCompletionSnapshot(user.id),
    loadExperienceConfig(user.id, context.isSimulation),
  ]);

  const requirements = buildDayRequirements(
    config.quizzes.map((quiz) => ({
      id: quiz.id,
      day_number: quiz.day_number,
      is_active: quiz.is_active,
      is_required: Boolean(quiz.is_required),
    })),
    config.contents
      .filter(
        (content) =>
          content.password_required !== false &&
          config.passwordContentIds.has(content.id)
      )
      .map((content) => ({ id: content.id, day_number: content.day_number }))
  );

  const days = calendarBase.days.map((day) => {
    const derived = deriveDayState({
      dayNumber: day.dayNumber,
      isUnlocked: day.isUnlocked,
      isOpened: day.isOpened,
      facts: snapshot,
      requirements,
    });

    return { ...day, ...derived };
  });

  const progressConditions: ConditionState = {
    now: context.now,
    openedDays: snapshot.openedDays,
    completedQuizIds: snapshot.correctQuizIds,
    completedContentIds: snapshot.completedContentIds,
  };

  const progress = summarizeProgress({
    days: days.map((day) => ({
      dayNumber: day.dayNumber,
      isUnlocked: day.isUnlocked,
      isOpened: day.isOpened,
      isCompleted: day.isCompleted,
    })),
    quizzes: config.quizzes,
    contents: config.contents,
    passwordContentIds: config.passwordContentIds,
    gifts: config.gifts,
    symbols: config.symbols,
    spheres: config.spheres,
    correctQuizIds: snapshot.correctQuizIds,
    completedContentIds: snapshot.completedContentIds,
    finalBoxCompleted: snapshot.finalBoxIds.size > 0,
    conditionState: progressConditions,
  });

  return {
    calendar: { ...calendarBase, days, simulation: context.simulation },
    progress,
  };
}

async function loadSimulatedCalendar(
  userId: string,
  context: DateContext
): Promise<CalendarData> {
  const admin = await createAdminClient();
  const [daysResult, openings, elves, secrets] = await Promise.all([
    admin.from("advent_days").select("*").order("day_number", { ascending: true }),
    admin.from("user_openings").select("day_number").eq("user_id", userId),
    admin
      .from("elf_messages")
      .select("day_number, author, message, is_active, scheduled_for")
      .order("day_number", { ascending: true }),
    admin
      .from("secret_messages")
      .select("day_number, content, is_active, scheduled_for")
      .eq("user_id", userId),
  ]);

  const opened = new Set((openings.data ?? []).map((row) => Number(row.day_number)));
  const visibleDays = (daysResult.data ?? []).map((row) => ({
    day_number: Number(row.day_number),
    title: String(row.title),
    description: String(row.description),
    unlock_date: String(row.unlock_date),
  }));

  const base = buildCalendarDays(visibleDays, opened, context.now);
  const days: CalendarDay[] = base.map((day) => {
    const row = visibleDays.find((item) => item.day_number === day.dayNumber);
    const unlocked = row ? isDayUnlocked(row.unlock_date, context) : false;
    return {
      dayNumber: day.dayNumber,
      title: unlocked && row ? row.title : null,
      description: unlocked && row ? row.description : null,
      unlockDate: unlocked && row ? row.unlock_date : null,
      isUnlocked: unlocked,
      isOpened: unlocked && opened.has(day.dayNumber),
    };
  });

  const unlocked = new Set(
    days.filter((day) => day.isUnlocked).map((day) => day.dayNumber)
  );

  // In anteprima non devono uscire messaggi di giorni oltre la data simulata.
  const elfMessages: CalendarData["elfMessages"] = {};
  for (const row of elves.data ?? []) {
    const dayNumber = Number(row.day_number);
    if (!unlocked.has(dayNumber)) continue;
    if (!isRowVisible(row, context.now)) continue;
    elfMessages[dayNumber] = {
      author: String(row.author),
      message: String(row.message),
    };
  }

  const secretMessages: Record<number, string> = {};
  for (const row of secrets.data ?? []) {
    if (!isRowVisible(row, context.now)) continue;
    const dayNumber = Number(row.day_number);
    if (unlocked.has(dayNumber)) secretMessages[dayNumber] = String(row.content);
  }

  return {
    days,
    elfMessages,
    secretMessages,
    openedCount: days.filter((day) => day.isOpened).length,
  };
}

function isRowVisible(
  row: { is_active?: boolean; scheduled_for?: string | null },
  now: Date
): boolean {
  if (row.is_active === false) return false;
  if (row.scheduled_for && new Date(row.scheduled_for) > now) return false;
  return true;
}

function toMessage(
  rows:
    | { author: string; message: string; is_active?: boolean; scheduled_for?: string | null }[]
    | null,
  now: Date
): DayMessage | null {
  const row = (rows ?? []).find((item) => isRowVisible(item, now));
  return row ? { author: row.author, message: row.message } : null;
}

function toSecret(
  rows:
    | { content: string; is_active?: boolean; scheduled_for?: string | null }[]
    | null,
  now: Date
): string | null {
  const row = (rows ?? []).find((item) => isRowVisible(item, now));
  return row ? row.content : null;
}

/**
 * Carica l'esperienza di un giorno.
 *
 * - Verifica server-side lo sblocco (data reale o simulazione admin).
 * - Se `recordOpening` è true e il giorno non è ancora aperto, registra
 *   l'apertura reale. In simulazione non scrive nulla.
 * - Non restituisce MAI contenuti futuri, hash o risposte corrette.
 */
export async function loadDayExperience(
  user: CurrentUser,
  dayNumber: number,
  options: { recordOpening: boolean }
): Promise<DayExperienceResult> {
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 24) {
    return { ok: false, data: null, error: "Giorno non valido." };
  }

  const simulation = await getSimulationRow(user);
  const context = createDateContext(simulation);
  const client = await getReadClient(context.isSimulation);
  const admin = await createAdminClient();

  const { data: day, error: dayError } = await client
    .from("advent_days")
    .select("day_number, title, description, unlock_date")
    .eq("day_number", dayNumber)
    .maybeSingle();

  if (dayError || !day || !isDayUnlocked(String(day.unlock_date), context)) {
    return {
      ok: false,
      data: null,
      error: "Questo giorno non è ancora sbloccato.",
    };
  }

  const { data: existingOpening } = await client
    .from("user_openings")
    .select("opened_at")
    .eq("user_id", user.id)
    .eq("day_number", dayNumber)
    .maybeSingle();

  let openedAt: string | null = existingOpening?.opened_at ?? null;
  let isReplay = Boolean(existingOpening);

  if (!existingOpening && options.recordOpening && !context.isSimulation) {
    const opening = await openAdventDay(user.id, dayNumber);
    if (!opening.ok) {
      return {
        ok: false,
        data: null,
        error: opening.error ?? "Non è stato possibile aprire il giorno.",
      };
    }
    openedAt = new Date().toISOString();
    isReplay = false;
  } else if (!existingOpening && !context.isSimulation) {
    return {
      ok: false,
      data: null,
      error: "Apri prima la casella per scoprire il contenuto.",
    };
  }

  const snapshot = await loadCompletionSnapshot(user.id);

  // In anteprima le condizioni "dopo il giorno N" considerano la linea
  // temporale simulata, non le aperture reali dell'admin.
  const conditionOpenedDays = context.isSimulation
    ? new Set(Array.from({ length: dayNumber }, (_, index) => index + 1))
    : snapshot.openedDays;

  const conditionState: ConditionState = {
    now: context.now,
    openedDays: conditionOpenedDays,
    completedQuizIds: snapshot.correctQuizIds,
    completedContentIds: snapshot.completedContentIds,
  };

  const { data: contentRows } = await client
    .from("physical_contents")
    .select(
      "id, day_number, kind, title, content, image_url, password_required, password_hint, success_message, activation_conditions, sort_order"
    )
    .eq("day_number", dayNumber)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const contentIds = (contentRows ?? []).map((row) => String(row.id));

  const [
    passwordConfigs,
    attempts,
    contentCompletions,
    giftRows,
    messageRows,
    secretRows,
    quizRows,
    sphereRows,
  ] = await Promise.all([
    contentIds.length > 0
      ? admin
          .from("physical_passwords")
          .select("content_id, hint, success_message, max_attempts, is_active")
          .in("content_id", contentIds)
      : Promise.resolve({ data: [], error: null }),
    contentIds.length > 0
      ? client
          .from("password_attempts")
          .select("content_id")
          .eq("user_id", user.id)
          .in("content_id", contentIds)
      : Promise.resolve({ data: [], error: null }),
    contentIds.length > 0
      ? client
          .from("password_completions")
          .select("content_id")
          .eq("user_id", user.id)
          .in("content_id", contentIds)
      : Promise.resolve({ data: [], error: null }),
    client
      .from("physical_gifts")
      .select("id, name, description, image_url")
      .eq("day_number", dayNumber)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    client
      .from("elf_messages")
      .select("author, message, is_active, scheduled_for")
      .eq("day_number", dayNumber),
    client
      .from("secret_messages")
      .select("content, is_active, scheduled_for")
      .eq("user_id", user.id)
      .eq("day_number", dayNumber),
    client
      .from("quizzes")
      .select("id, day_number, question, hint, points, is_required, is_active, unlock_conditions")
      .eq("day_number", dayNumber)
      .eq("is_active", true),
    client
      .from("memory_spheres")
      .select("id, title, note, photo_url, day_number, is_unlocked, activation_conditions")
      .eq("user_id", user.id)
      .eq("is_unlocked", true),
  ]);

  const passwordByContent = new Map(
    (passwordConfigs.data ?? []).map((row) => [String(row.content_id), row])
  );
  const attemptsByContent = new Map<string, number>();
  for (const row of attempts.data ?? []) {
    const id = String(row.content_id);
    attemptsByContent.set(id, (attemptsByContent.get(id) ?? 0) + 1);
  }
  const completedContents = new Set(
    (contentCompletions.data ?? []).map((row) => String(row.content_id))
  );

  let hiddenContents = 0;
  const contents: DayContent[] = [];
  for (const row of contentRows ?? []) {
    const condition = evaluateConditions(row.activation_conditions, conditionState);
    if (!condition.met) {
      hiddenContents += 1;
      continue;
    }

    const id = String(row.id);
    const kind = isContentKind(String(row.kind)) ? (row.kind as ContentKind) : "note";
    const configRow = passwordByContent.get(id) ?? null;
    const completed = completedContents.has(id);
    const attemptsUsed = attemptsByContent.get(id) ?? 0;
    const challenge = computePasswordChallenge(
      configRow,
      attemptsUsed,
      completed
    );
    const requiresPassword = Boolean(row.password_required && configRow?.is_active);

    // Un contenuto marcato "password obbligatoria" senza configurazione attiva
    // non deve rivelare il testo: meglio nasconderlo che aggirare il gate.
    if (row.password_required && !configRow?.is_active) {
      hiddenContents += 1;
      continue;
    }

    contents.push({
      id,
      kind,
      title: String(row.title),
      text: String(row.content ?? ""),
      imageUrl: row.image_url ? String(row.image_url) : null,
      sortOrder: Number(row.sort_order ?? 0),
      requiresPassword,
      password: challenge,
      successMessage: completed
        ? publicSuccessMessage(configRow, String(row.success_message ?? ""))
        : null,
      completed,
    });
  }

  // Simboli collegati ai regali del giorno o direttamente al giorno.
  const giftIds = (giftRows.data ?? []).map((row) => String(row.id));
  const symbolQueries = await Promise.all([
    giftIds.length > 0
      ? client
          .from("gift_symbols")
          .select("id, gift_id, symbol, description, image_url, discovery_conditions, is_active, day_number")
          .in("gift_id", giftIds)
      : Promise.resolve({ data: [], error: null }),
    client
      .from("gift_symbols")
      .select("id, gift_id, symbol, description, image_url, discovery_conditions, is_active, day_number")
      .eq("day_number", dayNumber),
  ]);

  const symbolById = new Map<string, Record<string, unknown>>();
  for (const result of symbolQueries) {
    for (const row of result.data ?? []) {
      symbolById.set(String(row.id), row);
    }
  }

  const symbolsByGift = new Map<string, DaySymbol[]>();
  for (const row of symbolById.values()) {
    if (!row.is_active) continue;
    if (!evaluateConditions(row.discovery_conditions, conditionState).met) continue;

    const symbol: DaySymbol = {
      id: String(row.id),
      symbol: String(row.symbol),
      description: String(row.description ?? ""),
      imageUrl: row.image_url ? String(row.image_url) : null,
    };
    const giftId = row.gift_id ? String(row.gift_id) : "";
    const list = symbolsByGift.get(giftId) ?? [];
    list.push(symbol);
    symbolsByGift.set(giftId, list);
  }

  const gifts: DayGift[] = (giftRows.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    imageUrl: row.image_url ? String(row.image_url) : null,
    symbols: symbolsByGift.get(String(row.id)) ?? [],
  }));

  const quizIds = (quizRows.data ?? []).map((row) => String(row.id));
  const [answerRows, quizAttempts] = await Promise.all([
    quizIds.length > 0
      ? admin
          .from("quiz_answers")
          .select("id, quiz_id, answer_text, is_correct, hint, sort_order, is_active")
          .in("quiz_id", quizIds)
      : Promise.resolve({ data: [], error: null }),
    quizIds.length > 0
      ? client
          .from("user_quiz_attempts")
          .select("quiz_id, selected_answer_id, is_correct")
          .eq("user_id", user.id)
          .in("quiz_id", quizIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const answersByQuiz = new Map<string, QuizAnswerRow[]>();
  for (const row of (answerRows.data ?? []) as QuizAnswerRow[]) {
    const list = answersByQuiz.get(row.quiz_id) ?? [];
    list.push(row);
    answersByQuiz.set(row.quiz_id, list);
  }

  const correctAnswers = new Set(
    (quizAttempts.data ?? [])
      .filter((row) => row.is_correct)
      .map((row) => String(row.quiz_id))
  );

  let hiddenQuizzes = 0;
  const quizzes: DayQuiz[] = [];
  for (const row of quizRows.data ?? []) {
    const quiz = row as unknown as QuizRow;
    if (!evaluateConditions(row.unlock_conditions, conditionState).met) {
      hiddenQuizzes += 1;
      continue;
    }

    const answers = answersByQuiz.get(String(row.id)) ?? [];
    const completed = correctAnswers.has(String(row.id));
    quizzes.push(
      toPublicQuiz(
        quiz,
        answers,
        completed,
        completed ? findCorrectAnswerText(answers) : null
      )
    );
  }

  const spheres: DayMemorySphere[] = (sphereRows.data ?? [])
    .filter(
      (row) =>
        (row.day_number === null || Number(row.day_number) === dayNumber) &&
        evaluateConditions(row.activation_conditions, conditionState).met
    )
    .map((row) => ({
      id: String(row.id),
      title: String(row.title),
      note: row.note ? String(row.note) : null,
      photoUrl: row.photo_url ? String(row.photo_url) : null,
    }));

  const hotspotQuery = await client
    .from("village_hotspots")
    .select("id, name")
    .eq("day_number", dayNumber)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  let hotspot: DayExperience["hotspot"] = null;
  if (hotspotQuery.data) {
    const { data: hotspotMessage } = await client
      .from("village_hotspot_messages")
      .select("hint, nico_message, nico_expression")
      .eq("hotspot_id", hotspotQuery.data.id)
      .maybeSingle();

    hotspot = {
      name: String(hotspotQuery.data.name),
      hint: String(hotspotMessage?.hint ?? ""),
      nicoMessage: String(hotspotMessage?.nico_message ?? ""),
      nicoExpression: String(hotspotMessage?.nico_expression ?? "happy"),
    };
  }

  // Scatola finale: solo dal giorno di rivelazione, mai l'hash.
  const finalBoxResult = await admin
    .from("final_gift_boxes")
    .select(
      "id, name, description, image_url, shape, color, decorations, symbol, intro_message, clues, objects, password_enabled, password_hint, opening_sequence, final_message, reveal_day"
    )
    .eq("is_active", true)
    .lte("reveal_day", dayNumber)
    .order("reveal_day", { ascending: false })
    .limit(1)
    .maybeSingle();

  let finalBox: FinalBoxView | null = null;
  if (finalBoxResult.data) {
    const box = finalBoxResult.data;
    const completedRecord = snapshot.finalBoxIds.has(String(box.id));
    const completed = !box.password_enabled || completedRecord;

    finalBox = {
      id: String(box.id),
      name: String(box.name),
      description: String(box.description ?? ""),
      imageUrl: box.image_url ? String(box.image_url) : null,
      shape: String(box.shape),
      color: String(box.color),
      decorations: toStringArray(box.decorations),
      symbol: box.symbol ? String(box.symbol) : null,
      introMessage: String(box.intro_message ?? ""),
      // Indizi, oggetti e messaggio finale sono la rivelazione: non devono
      // uscire dal server prima del gate della password.
      clues: gateFinalBoxDetails(box.clues, completed),
      objects: gateFinalBoxDetails(box.objects, completed),
      finalMessage: gateFinalBoxMessage(box.final_message, completed),
      passwordEnabled: Boolean(box.password_enabled),
      passwordHint: String(box.password_hint ?? ""),
      openingSequence: toStringArray(box.opening_sequence),
      completed,
    };
  }

  return {
    ok: true,
    error: null,
    data: {
      dayNumber,
      title: String(day.title),
      description: String(day.description ?? ""),
      isReplay,
      simulation: context.simulation,
      elfMessage: toMessage(messageRows.data, context.now),
      secretMessage: toSecret(secretRows.data, context.now),
      hotspot,
      contents,
      hiddenContents,
      gifts,
      quizzes,
      hiddenQuizzes,
      memorySpheres: spheres,
      finalBox,
      openedAt,
    },
  };
}

/** Progressi per un utente (usati dalla dashboard e dopo le azioni). */
export async function getUserProgress(
  user: CurrentUser
): Promise<UserProgress> {
  const { progress } = await getExperienceData(user);
  return progress;
}

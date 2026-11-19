import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentUser } from "@/lib/auth";
import type { ExperienceDay, UserProgress } from "@/types/experience";
import type {
  AlbumData,
  CluesData,
  CollectionData,
  DiaryData,
  DiaryEventView,
  FinaleData,
  GalleryData,
  GalleryImage,
  MemoryStatistics,
  SphereOpenResult,
  TimelineData,
} from "@/types/memories";
import {
  evaluateConditions,
  type ConditionState,
} from "@/lib/experience/conditions";
import { getDateContextForUser, getExperienceData } from "./experience";
import {
  detectPhase6Capabilities,
  type Phase6Capabilities,
} from "./capabilities";
import { formatRomeDateTime, excerpt } from "@/lib/memories/format";
import {
  buildDiaryEvents,
  buildDiaryFilterOptions,
  type DiaryContentFacts,
  type DiaryEventDraft,
  type DiaryFacts,
} from "@/lib/memories/diary";
import {
  buildAlbumEntries,
  buildAlbumFilterOptions,
  type AlbumFacts,
} from "@/lib/memories/album";
import {
  buildObjectItems,
  buildSphereItems,
  buildSymbolItems,
  shouldUnlockSphere,
  type CollectionFacts,
} from "@/lib/memories/collection";
import {
  buildClueGroupOptions,
  buildClueItems,
  buildDiscoveredClueTitles,
  type ClueContentFacts,
  type ClueFacts,
} from "@/lib/memories/clues";
import { buildTimelineDays } from "@/lib/memories/timeline";
import { buildMemoryStatistics } from "@/lib/memories/stats";
import { buildGalleryData } from "@/lib/memories/gallery";
import {
  buildFinaleJourney,
  resolveFinaleGate,
} from "@/lib/memories/finale";

type AnyRow = Record<string, unknown>;
type ServerClient = Awaited<ReturnType<typeof createClient>>;
type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

const MEDIA_BUCKET = "wonderland-media";
const SIGNED_URL_SECONDS = 60 * 60;

function asRow(value: unknown): AnyRow {
  return (value ?? {}) as AnyRow;
}

function s(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function nullable(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function n(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function b(value: unknown): boolean {
  return value === true || value === "true";
}

function list(value: unknown): string[] {
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

/** Riga di contenuto resa pubblica solo se effettivamente accessibile. */
interface SnapshotContent extends DiaryContentFacts {
  image_url: string | null;
  password_required: boolean;
  category: string;
  rarity: string;
  special_description: string;
  show_silhouette: boolean;
  clue_group: string | null;
  related_content_ids: string[];
  accessible: boolean;
}

interface SnapshotGift {
  id: string;
  day_number: number;
  name: string;
  description: string;
  image_url: string | null;
  category: string;
  rarity: string;
  special_description: string;
  show_silhouette: boolean;
}

interface SnapshotSymbol {
  id: string;
  gift_id: string | null;
  effectiveDay: number | null;
  symbol: string;
  description: string;
  image_url: string | null;
  category: string;
  rarity: string;
  show_silhouette: boolean;
}

interface SnapshotSphere {
  id: string;
  title: string;
  note: string | null;
  photo_url: string | null;
  day_number: number | null;
  is_unlocked: boolean;
  unlocked_at: string | null;
  discovered_at: string | null;
  conditionsMet: boolean;
}

interface SnapshotQuiz {
  id: string;
  day_number: number;
  question: string;
  answer: string;
  completed: boolean;
}

interface SnapshotMessage {
  id: string;
  day_number: number;
  kind: "elf" | "secret";
  title: string;
  author: string;
  message: string;
  image_url: string | null;
}

interface SnapshotMemoryEntry {
  id: string;
  placement: string;
  kind: string;
  title: string;
  description: string;
  content: string;
  image_url: string | null;
  day_number: number | null;
}

interface SnapshotFinalBox {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  intro_message: string;
  final_message: string;
  clues: string[];
  objects: string[];
  password_enabled: boolean;
  reveal_day: number;
  physical_gift_id: string | null;
}

export interface MemorySnapshot {
  user: CurrentUser;
  capabilities: Phase6Capabilities;
  isSimulation: boolean;
  now: string;
  days: ExperienceDay[];
  progress: UserProgress;
  openedAtByDay: Map<number, string>;
  conditionState: ConditionState;
  contents: SnapshotContent[];
  gifts: SnapshotGift[];
  symbols: SnapshotSymbol[];
  spheres: SnapshotSphere[];
  quizzes: SnapshotQuiz[];
  messages: SnapshotMessage[];
  memoryEntries: SnapshotMemoryEntry[];
  finalBox: SnapshotFinalBox | null;
  finalBoxCompletedAt: string | null;
  correctQuizAt: Map<string, string>;
  passwordCompletedAt: Map<string, string>;
  diaryRows: AnyRow[];
  userPhotos: AnyRow[];
  /** Viste del diario già sincronizzate in questa richiesta. */
  diaryViews: DiaryEventView[];
  diarySynced: boolean;
}

function isVisibleRow(
  row: AnyRow,
  unlockedDays: ReadonlySet<number>
): boolean {
  const day = row.day_number;
  if (day === null || day === undefined) return true;
  return unlockedDays.has(n(day));
}

function isScheduled(row: AnyRow, now: Date): boolean {
  const scheduled = nullable(row.scheduled_for);
  return !scheduled || new Date(scheduled).getTime() <= now.getTime();
}

function toDiaryView(row: AnyRow): DiaryEventView {
  const occurredAt = s(row.occurred_at);
  return {
    id: s(row.id),
    eventKey: s(row.event_key),
    category: s(row.category, "speciale") as DiaryEventView["category"],
    title: s(row.title),
    description: s(row.description),
    dayNumber: row.day_number === null ? null : n(row.day_number),
    imageUrl: nullable(row.image_url),
    occurredAt,
    occurredAtLabel: formatRomeDateTime(occurredAt),
    sourceType: nullable(row.source_type),
    sourceId: nullable(row.source_id),
  };
}

function draftToView(
  draft: ReturnType<typeof buildDiaryEvents>[number]
): DiaryEventView {
  return {
    id: draft.eventKey,
    eventKey: draft.eventKey,
    category: draft.category,
    title: draft.title,
    description: draft.description,
    dayNumber: draft.dayNumber,
    imageUrl: draft.imageUrl,
    occurredAt: draft.occurredAt,
    occurredAtLabel: formatRomeDateTime(draft.occurredAt),
    sourceType: draft.sourceType,
    sourceId: draft.sourceId,
  };
}

/**
 * Carica uno snapshot coerente di tutti i dati della Fase 6.
 *
 * - Usa `getExperienceData()` come unica fonte per stati e progressi (Fase 5).
 * - Legge i progressi con timestamps dal client RLS dell'utente.
 * - Usa il service role SOLO per config admin (password, risposte, scatola
 *   finale, foto firmate) e per scrivere diario/sfere dopo i controlli.
 * - In simulazione admin non scrive nulla.
 */
export async function loadMemorySnapshot(
  user: CurrentUser
): Promise<MemorySnapshot> {
  const experience = await getExperienceData(user);
  const context = await getDateContextForUser(user);
  const capabilities = await detectPhase6Capabilities();
  const client = await createClient();
  const admin = await createAdminClient();

  const days = experience.calendar.days;
  const unlockedDays = new Set(
    days.filter((day) => day.isUnlocked).map((day) => day.dayNumber)
  );
  const openedDays = new Set(
    days.filter((day) => day.isOpened).map((day) => day.dayNumber)
  );

  const [openings, quizAttempts, passwordCompletions, finalBoxCompletions] =
    await Promise.all([
      client
        .from("user_openings")
        .select("day_number, opened_at")
        .eq("user_id", user.id),
      client
        .from("user_quiz_attempts")
        .select("quiz_id, is_correct, created_at")
        .eq("user_id", user.id)
        .eq("is_correct", true),
      client
        .from("password_completions")
        .select("content_id, created_at")
        .eq("user_id", user.id),
      client
        .from("final_box_completions")
        .select("box_id, created_at")
        .eq("user_id", user.id),
    ]);

  const openedAtByDay = new Map<number, string>();
  for (const row of openings.data ?? []) {
    openedAtByDay.set(n(row.day_number), s(row.opened_at));
  }
  const correctQuizAt = new Map<string, string>();
  for (const row of quizAttempts.data ?? []) {
    correctQuizAt.set(s(row.quiz_id), s(row.created_at));
  }
  const passwordCompletedAt = new Map<string, string>();
  for (const row of passwordCompletions.data ?? []) {
    passwordCompletedAt.set(s(row.content_id), s(row.created_at));
  }
  const finalBoxCompletionAt = new Map<string, string>();
  for (const row of finalBoxCompletions.data ?? []) {
    finalBoxCompletionAt.set(s(row.box_id), s(row.created_at));
  }

  const conditionState: ConditionState = {
    now: context.now,
    openedDays,
    completedQuizIds: new Set(correctQuizAt.keys()),
    completedContentIds: new Set(passwordCompletedAt.keys()),
  };

  // In anteprima admin le condizioni "dopo il giorno N" seguono la timeline
  // simulata, non le aperture reali (coerente con loadDayExperience).
  const effectiveConditionState: ConditionState = context.isSimulation
    ? {
        ...conditionState,
        openedDays: new Set(
          Array.from({ length: 24 }, (_, index) => index + 1).filter(
            (day) => unlockedDays.has(day)
          )
        ),
      }
    : conditionState;

  const readClient: ServerClient = context.isSimulation
    ? ((await createAdminClient()) as ServerClient)
    : client;

  const [
    contentsResult,
    giftsResult,
    symbolsResult,
    spheresResult,
    quizzesResult,
    elfResult,
    secretResult,
    passwordsResult,
    finalBoxResult,
    userPhotosResult,
    diaryResult,
    entriesResult,
  ] = await Promise.all([
    readClient.from("physical_contents").select("*").eq("is_active", true),
    readClient.from("physical_gifts").select("*").eq("is_active", true),
    readClient.from("gift_symbols").select("*").eq("is_active", true),
    readClient.from("memory_spheres").select("*").eq("user_id", user.id),
    readClient.from("quizzes").select("*").eq("is_active", true),
    readClient.from("elf_messages").select("*").eq("is_active", true),
    client.from("secret_messages").select("*").eq("user_id", user.id),
    admin.from("physical_passwords").select("content_id, is_active").eq("is_active", true),
    admin.from("final_gift_boxes").select("*").eq("is_active", true).order("reveal_day", { ascending: false }).limit(1).maybeSingle(),
    client.from("user_photos").select("*").eq("user_id", user.id),
    capabilities.diaryEvents
      ? client.from("diary_events").select("*").eq("user_id", user.id)
      : Promise.resolve({ data: [], error: null }),
    capabilities.memoryEntries
      ? readClient.from("memory_entries").select("*").eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const activePasswordIds = new Set(
    (passwordsResult.data ?? []).map((row) => s(row.content_id))
  );

  const contents: SnapshotContent[] = [];
  for (const raw of contentsResult.data ?? []) {
    const row = asRow(raw);
    if (!isVisibleRow(row, unlockedDays)) continue;
    if (!evaluateConditions(row.activation_conditions, effectiveConditionState).met) {
      continue;
    }
    const id = s(row.id);
    const passwordRequired = b(row.password_required);
    if (passwordRequired && !activePasswordIds.has(id)) continue;

    contents.push({
      id,
      day_number: n(row.day_number),
      kind: s(row.kind, "note"),
      title: s(row.title),
      content: s(row.content),
      image_url: nullable(row.image_url),
      password_required: passwordRequired,
      category: s(row.category),
      rarity: s(row.rarity, "comune"),
      special_description: s(row.special_description),
      show_silhouette: b(row.show_silhouette),
      clue_group: nullable(row.clue_group),
      related_content_ids: list(row.related_content_ids),
      accessible: !passwordRequired || passwordCompletedAt.has(id),
    });
  }

  const gifts: SnapshotGift[] = [];
  for (const raw of giftsResult.data ?? []) {
    const row = asRow(raw);
    if (!isVisibleRow(row, unlockedDays)) continue;
    gifts.push({
      id: s(row.id),
      day_number: n(row.day_number),
      name: s(row.name),
      description: s(row.description),
      image_url: nullable(row.image_url),
      category: s(row.category, "regalo"),
      rarity: s(row.rarity, "comune"),
      special_description: s(row.special_description),
      show_silhouette: b(row.show_silhouette),
    });
  }
  const giftDayById = new Map(gifts.map((gift) => [gift.id, gift.day_number]));

  const symbols: SnapshotSymbol[] = [];
  const seenSymbols = new Set<string>();
  for (const raw of symbolsResult.data ?? []) {
    const row = asRow(raw);
    const id = s(row.id);
    if (seenSymbols.has(id)) continue;
    seenSymbols.add(id);

    const giftId = nullable(row.gift_id);
    const dayNumber =
      row.day_number === null || row.day_number === undefined
        ? (giftId ? (giftDayById.get(giftId) ?? null) : null)
        : n(row.day_number);
    if (dayNumber !== null && !unlockedDays.has(dayNumber)) continue;
    if (!evaluateConditions(row.discovery_conditions, effectiveConditionState).met) {
      continue;
    }

    symbols.push({
      id,
      gift_id: giftId,
      effectiveDay: dayNumber,
      symbol: s(row.symbol),
      description: s(row.description),
      image_url: nullable(row.image_url),
      category: s(row.category, "simbolo"),
      rarity: s(row.rarity, "comune"),
      show_silhouette: b(row.show_silhouette),
    });
  }

  const spheres: SnapshotSphere[] = [];
  for (const raw of spheresResult.data ?? []) {
    const row = asRow(raw);
    const dayNumber = row.day_number === null || row.day_number === undefined
      ? null
      : n(row.day_number);
    if (dayNumber !== null && !unlockedDays.has(dayNumber)) continue;

    spheres.push({
      id: s(row.id),
      title: s(row.title),
      note: nullable(row.note),
      photo_url: nullable(row.photo_url),
      day_number: dayNumber,
      is_unlocked: b(row.is_unlocked),
      unlocked_at: nullable(row.unlocked_at),
      discovered_at: nullable(row.discovered_at),
      conditionsMet: evaluateConditions(
        row.activation_conditions,
        effectiveConditionState
      ).met,
    });
  }

  // Sblocco automatico delle sfere: solo server, solo condizioni soddisfatte.
  const toUnlock = spheres
    .filter((sphere) =>
      shouldUnlockSphere({
        isUnlocked: sphere.is_unlocked,
        dayNumber: sphere.day_number,
        dayUnlocked: sphere.day_number === null || unlockedDays.has(sphere.day_number),
        dayOpened:
          sphere.day_number === null ? true : openedDays.has(sphere.day_number),
        conditionsMet: sphere.conditionsMet,
      })
    )
    .map((sphere) => sphere.id);

  if (
    toUnlock.length > 0 &&
    !context.isSimulation &&
    capabilities.sphereDiscoveryTimestamps
  ) {
    const unlockedAt = new Date().toISOString();
    await admin
      .from("memory_spheres")
      .update({ is_unlocked: true, unlocked_at: unlockedAt })
      .eq("user_id", user.id)
      .in("id", toUnlock)
      .eq("is_unlocked", false);

    for (const sphere of spheres) {
      if (!toUnlock.includes(sphere.id)) continue;
      sphere.is_unlocked = true;
      sphere.unlocked_at = sphere.unlocked_at ?? unlockedAt;
    }
  }

  const quizRows = (quizzesResult.data ?? []).map(asRow).filter((row) => {
    if (!isVisibleRow(row, unlockedDays)) return false;
    return evaluateConditions(row.unlock_conditions, effectiveConditionState).met;
  });
  const quizIds = quizRows.map((row) => s(row.id));
  const answerResult = quizIds.length > 0
    ? await admin
        .from("quiz_answers")
        .select("quiz_id, answer_text, is_correct, is_active")
        .in("quiz_id", quizIds)
    : { data: [] };

  const correctAnswerByQuiz = new Map<string, string>();
  for (const raw of answerResult.data ?? []) {
    const row = asRow(raw);
    if (row.is_correct !== true && row.is_correct !== "true") continue;
    if (row.is_active === false) continue;
    correctAnswerByQuiz.set(s(row.quiz_id), s(row.answer_text));
  }

  const quizzes: SnapshotQuiz[] = quizRows.map((row) => {
    const id = s(row.id);
    const completed = correctQuizAt.has(id);
    return {
      id,
      day_number: n(row.day_number),
      question: s(row.question),
      // La risposta corretta è resa nota solo dopo verifica lato server.
      answer: completed ? (correctAnswerByQuiz.get(id) ?? "") : "",
      completed,
    };
  });

  const messages: SnapshotMessage[] = [];
  for (const raw of elfResult.data ?? []) {
    const row = asRow(raw);
    if (!isVisibleRow(row, unlockedDays) || !isScheduled(row, context.now)) continue;
    messages.push({
      id: s(row.id),
      day_number: n(row.day_number),
      kind: "elf",
      title: s(row.author, "Messaggio degli elfi"),
      author: s(row.author, "Messaggio degli elfi"),
      message: s(row.message),
      image_url: nullable(row.image_url),
    });
  }
  for (const raw of secretResult.data ?? []) {
    const row = asRow(raw);
    if (!isVisibleRow(row, unlockedDays) || !isScheduled(row, context.now)) continue;
    messages.push({
      id: s(row.id),
      day_number: n(row.day_number),
      kind: "secret",
      title: s(row.author, "Messaggio segreto"),
      author: s(row.author, "Messaggio segreto"),
      message: s(row.content),
      image_url: null,
    });
  }

  const memoryEntries: SnapshotMemoryEntry[] = [];
  for (const raw of entriesResult.data ?? []) {
    const row = asRow(raw);
    if (!isVisibleRow(row, unlockedDays)) continue;
    if (!evaluateConditions(row.activation_conditions, effectiveConditionState).met) {
      continue;
    }
    memoryEntries.push({
      id: s(row.id),
      placement: s(row.placement, "album"),
      kind: s(row.kind, "special"),
      title: s(row.title),
      description: s(row.description),
      content: s(row.content),
      image_url: nullable(row.image_url),
      day_number: row.day_number === null || row.day_number === undefined
        ? null
        : n(row.day_number),
    });
  }

  const boxRow = finalBoxResult.data ? asRow(finalBoxResult.data) : null;
  const finalBox: SnapshotFinalBox | null = boxRow
    ? {
        id: s(boxRow.id),
        name: s(boxRow.name),
        description: s(boxRow.description),
        image_url: nullable(boxRow.image_url),
        intro_message: s(boxRow.intro_message),
        final_message: s(boxRow.final_message),
        clues: list(boxRow.clues),
        objects: list(boxRow.objects),
        password_enabled: b(boxRow.password_enabled),
        reveal_day: n(boxRow.reveal_day, 24),
        physical_gift_id: nullable(boxRow.physical_gift_id),
      }
    : null;

  const snapshot: MemorySnapshot = {
    user,
    capabilities,
    isSimulation: context.isSimulation,
    now: context.now.toISOString(),
    days,
    progress: experience.progress,
    openedAtByDay,
    conditionState: effectiveConditionState,
    contents,
    gifts,
    symbols,
    spheres,
    quizzes,
    messages,
    memoryEntries,
    finalBox,
    finalBoxCompletedAt: finalBox
      ? (finalBoxCompletionAt.get(finalBox.id) ?? null)
      : null,
    correctQuizAt,
    passwordCompletedAt,
    diaryRows: (diaryResult.data ?? []).map(asRow),
    userPhotos: (userPhotosResult.data ?? []).map(asRow),
    diaryViews: [],
    diarySynced: false,
  };

  // Registra gli eventi a ogni accesso alle sezioni dei ricordi: l'operazione
  // è idempotente e scrive solo il service role, mai in simulazione.
  await syncDiaryEvents(snapshot);
  return snapshot;
}

/** Adatta lo snapshot alle strutture attese dalla logica pura del diario. */
function diaryFacts(snapshot: MemorySnapshot): DiaryFacts {
  return {
    now: snapshot.now,
    days: snapshot.days.map((day) => ({
      dayNumber: day.dayNumber,
      title: day.title,
      isUnlocked: day.isUnlocked,
      isOpened: day.isOpened,
      isCompleted: day.isCompleted,
    })),
    openedAtByDay: snapshot.openedAtByDay,
    accessibleContents: snapshot.contents.filter((content) => content.accessible),
    correctQuizzes: snapshot.quizzes
      .filter((quiz) => quiz.completed)
      .map((quiz) => ({
        id: quiz.id,
        day_number: quiz.day_number,
        question: quiz.question,
      })),
    correctQuizAt: snapshot.correctQuizAt,
    passwordCompletedAt: snapshot.passwordCompletedAt,
    gifts: snapshot.gifts,
    symbols: snapshot.symbols,
    spheres: snapshot.spheres,
    memoryEntries: snapshot.memoryEntries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      content: entry.content,
      image_url: entry.image_url,
      day_number: entry.day_number,
      kind: entry.kind,
    })),
    finalBox: snapshot.finalBox
      ? {
          id: snapshot.finalBox.id,
          name: snapshot.finalBox.name,
          reveal_day: snapshot.finalBox.reveal_day,
          completed_at: snapshot.finalBoxCompletedAt,
        }
      : null,
  };
}

function collectionFacts(snapshot: MemorySnapshot): CollectionFacts {
  return {
    days: snapshot.days.map((day) => ({
      dayNumber: day.dayNumber,
      isUnlocked: day.isUnlocked,
      isOpened: day.isOpened,
    })),
    openedAtByDay: snapshot.openedAtByDay,
    contents: snapshot.contents,
    gifts: snapshot.gifts,
    symbols: snapshot.symbols,
    spheres: snapshot.spheres,
    passwordCompletedAt: snapshot.passwordCompletedAt,
  };
}

function albumFacts(snapshot: MemorySnapshot): AlbumFacts {
  return {
    days: snapshot.days.map((day) => ({
      dayNumber: day.dayNumber,
      title: day.title,
      description: day.description,
      isUnlocked: day.isUnlocked,
      isOpened: day.isOpened,
    })),
    openedAtByDay: snapshot.openedAtByDay,
    accessibleContents: snapshot.contents.filter((content) => content.accessible),
    gifts: snapshot.gifts,
    quizzes: snapshot.quizzes.filter((quiz) => quiz.completed),
    correctQuizAt: snapshot.correctQuizAt,
    messages: snapshot.messages,
    symbols: snapshot.symbols,
    spheres: snapshot.spheres,
    memories: snapshot.memoryEntries,
    quizAnswerAt: snapshot.correctQuizAt,
  };
}

function clueFacts(snapshot: MemorySnapshot): ClueFacts {
  const contents: ClueContentFacts[] = snapshot.contents.map((content) => ({
    id: content.id,
    day_number: content.day_number,
    kind: content.kind,
    title: content.title,
    content: content.content,
    image_url: content.image_url,
    password_required: content.password_required,
    clue_group: content.clue_group,
    related_content_ids: content.related_content_ids,
  }));

  return {
    days: snapshot.days.map((day) => ({
      dayNumber: day.dayNumber,
      isUnlocked: day.isUnlocked,
      isOpened: day.isOpened,
    })),
    openedAtByDay: snapshot.openedAtByDay,
    contents,
    passwordCompletedAt: snapshot.passwordCompletedAt,
    discoveredTitles: buildDiscoveredClueTitles(
      contents,
      snapshot.days.map((day) => ({
        dayNumber: day.dayNumber,
        isUnlocked: day.isUnlocked,
        isOpened: day.isOpened,
      })),
      snapshot.passwordCompletedAt
    ),
  };
}

/** Sincronizza gli eventi derivati nel diario persistente (idempotente). */
async function syncDiaryEvents(
  snapshot: MemorySnapshot
): Promise<DiaryEventView[]> {
  const drafts = buildDiaryEvents(diaryFacts(snapshot));

  if (
    drafts.length > 0 &&
    snapshot.capabilities.diaryEvents &&
    !snapshot.isSimulation
  ) {
    const admin = await createAdminClient();
    const { error } = await admin.from("diary_events").upsert(
      drafts.map((draft) => ({
        user_id: snapshot.user.id,
        event_key: draft.eventKey,
        category: draft.category,
        title: draft.title,
        description: draft.description,
        day_number: draft.dayNumber,
        image_url: draft.imageUrl,
        source_type: draft.sourceType,
        source_id: draft.sourceId,
        occurred_at: draft.occurredAt,
      })),
      { onConflict: "user_id,event_key", ignoreDuplicates: true }
    );

    if (!error) {
      // Rileggi il diario persistente: contiene anche gli eventi delle
      // sessioni precedenti con il loro timestamp originale.
      const client = await createClient();
      const { data } = await client
        .from("diary_events")
        .select("*")
        .eq("user_id", snapshot.user.id);
      if (data) snapshot.diaryRows = data.map(asRow);
    }
  }

  // Prima della migrazione (o in simulazione) il diario è derivato in memoria.
  const stored = snapshot.diaryRows.map(toDiaryView);

  const keys = new Set(drafts.map((draft) => draft.eventKey));
  const merged = stored.length === 0
    ? drafts.map(draftToView)
    : [...stored.filter((event) => keys.has(event.eventKey))];
  const storedKeys = new Set(merged.map((event) => event.eventKey));
  for (const draft of drafts) {
    if (!storedKeys.has(draft.eventKey)) merged.push(draftToView(draft));
  }

  const views = merged.sort((a, b) => {
    const time = a.occurredAt.localeCompare(b.occurredAt);
    if (time !== 0) return time;
    return (a.dayNumber ?? 0) - (b.dayNumber ?? 0);
  });

  snapshot.diaryViews = views;
  snapshot.diarySynced = true;
  return views;
}

export async function getDiaryData(user: CurrentUser): Promise<DiaryData> {
  const snapshot = await loadMemorySnapshot(user);
  const events = snapshot.diaryViews;
  const drafts: DiaryEventDraft[] = events.map((event) => ({
    eventKey: event.eventKey,
    category: event.category,
    title: event.title,
    description: event.description,
    dayNumber: event.dayNumber,
    imageUrl: event.imageUrl,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    occurredAt: event.occurredAt,
  }));
  const filters = buildDiaryFilterOptions(drafts);

  return {
    events,
    categories: filters.categories,
    days: filters.days,
    phase6Ready: snapshot.capabilities.ready,
  };
}

export async function getAlbumData(user: CurrentUser): Promise<AlbumData> {
  const snapshot = await loadMemorySnapshot(user);
  const entries = buildAlbumEntries(albumFacts(snapshot));
  const filters = buildAlbumFilterOptions(entries);

  return {
    entries,
    kinds: filters.kinds,
    days: filters.days,
    phase6Ready: snapshot.capabilities.ready,
  };
}

export async function getCollectionData(
  user: CurrentUser
): Promise<CollectionData> {
  const snapshot = await loadMemorySnapshot(user);
  const facts = collectionFacts(snapshot);
  const objects = buildObjectItems(facts);
  const symbols = buildSymbolItems(facts);
  const spheres = buildSphereItems(facts);

  return {
    objects: objects.items,
    symbols: symbols.items,
    spheres: spheres.items,
    counts: {
      objectsFound: objects.found,
      objectsTotal: objects.total,
      symbolsFound: symbols.found,
      symbolsTotal: symbols.total,
      spheresFound: spheres.found,
      spheresTotal: spheres.total,
    },
    phase6Ready: snapshot.capabilities.ready,
  };
}

export async function getCluesData(user: CurrentUser): Promise<CluesData> {
  const snapshot = await loadMemorySnapshot(user);
  const clues = buildClueItems(clueFacts(snapshot));

  return {
    clues,
    groups: buildClueGroupOptions(clues),
    phase6Ready: snapshot.capabilities.ready,
  };
}

export async function getTimelineData(user: CurrentUser): Promise<TimelineData> {
  const snapshot = await loadMemorySnapshot(user);
  const events = snapshot.diaryViews;
  const objects = buildObjectItems(collectionFacts(snapshot));
  const clues = buildClueItems(clueFacts(snapshot));
  const album = buildAlbumEntries(albumFacts(snapshot));

  const objectsByDay = new Map<number, number>();
  for (const item of objects.items.filter((item) => !item.silhouette)) {
    if (item.dayNumber === null) continue;
    objectsByDay.set(item.dayNumber, (objectsByDay.get(item.dayNumber) ?? 0) + 1);
  }
  const cluesByDay = new Map<number, number>();
  for (const clue of clues) {
    if (clue.dayNumber === null) continue;
    cluesByDay.set(clue.dayNumber, (cluesByDay.get(clue.dayNumber) ?? 0) + 1);
  }
  const quizzesByDay = new Map<number, number>();
  for (const quiz of snapshot.quizzes.filter((quiz) => quiz.completed)) {
    quizzesByDay.set(quiz.day_number, (quizzesByDay.get(quiz.day_number) ?? 0) + 1);
  }
  const memoriesByDay = new Map<number, number>();
  for (const entry of album) {
    if (entry.dayNumber === null) continue;
    memoriesByDay.set(entry.dayNumber, (memoriesByDay.get(entry.dayNumber) ?? 0) + 1);
  }

  return {
    days: buildTimelineDays(
      snapshot.days.map((day) => ({
        dayNumber: day.dayNumber,
        state: day.state,
        title: day.title,
        isUnlocked: day.isUnlocked,
        isOpened: day.isOpened,
        isCompleted: day.isCompleted,
      })),
      events,
      { objectsByDay, quizzesByDay, cluesByDay, memoriesByDay }
    ),
    phase6Ready: snapshot.capabilities.ready,
  };
}

async function resolvePhotoUrls(
  admin: AdminClient,
  photos: readonly AnyRow[],
  unlockedDays: ReadonlySet<number>
): Promise<{ row: AnyRow; url: string }[]> {
  const resolved: { row: AnyRow; url: string }[] = [];
  for (const row of photos) {
    const dayNumber = n(row.day_number);
    if (!unlockedDays.has(dayNumber)) continue;

    const path = s(row.storage_path);
    if (!path) continue;
    if (/^https?:\/\//i.test(path)) {
      resolved.push({ row, url: path });
      continue;
    }

    // URL firmata di breve durata: mai un URL pubblico permanente.
    const { data, error } = await admin.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (!error && data?.signedUrl) resolved.push({ row, url: data.signedUrl });
  }
  return resolved;
}

export async function getGalleryData(user: CurrentUser): Promise<GalleryData> {
  const snapshot = await loadMemorySnapshot(user);
  const unlockedDays = new Set(
    snapshot.days.filter((day) => day.isUnlocked).map((day) => day.dayNumber)
  );
  const admin = await createAdminClient();
  const photoUrls = await resolvePhotoUrls(admin, snapshot.userPhotos, unlockedDays);

  const images: GalleryImage[] = [];

  for (const content of snapshot.contents.filter((item) => item.accessible)) {
    if (!content.image_url) continue;
    images.push({
      id: `content:${content.id}`,
      src: content.image_url,
      alt: content.title,
      dayNumber: content.day_number,
      category: content.kind === "photo" ? "Fotografie" : "Contenuti",
      sourceType: "content",
      sourceId: content.id,
      acquiredAtLabel: formatRomeDateTime(
        snapshot.openedAtByDay.get(content.day_number)
      ),
    });
  }

  for (const gift of snapshot.gifts) {
    if (!gift.image_url || !unlockedDays.has(gift.day_number)) continue;
    images.push({
      id: `gift:${gift.id}`,
      src: gift.image_url,
      alt: gift.name,
      dayNumber: gift.day_number,
      category: "Regali",
      sourceType: "gift",
      sourceId: gift.id,
      acquiredAtLabel: formatRomeDateTime(
        snapshot.openedAtByDay.get(gift.day_number)
      ),
    });
  }

  for (const message of snapshot.messages) {
    if (!message.image_url) continue;
    images.push({
      id: `message:${message.id}`,
      src: message.image_url,
      alt: message.title,
      dayNumber: message.day_number,
      category: "Messaggi",
      sourceType: "day",
      sourceId: message.id,
      acquiredAtLabel: formatRomeDateTime(
        snapshot.openedAtByDay.get(message.day_number)
      ),
    });
  }

  for (const entry of snapshot.memoryEntries) {
    if (!entry.image_url) continue;
    images.push({
      id: `memory:${entry.id}`,
      src: entry.image_url,
      alt: entry.title,
      dayNumber: entry.day_number,
      category: "Ricordi",
      sourceType: "memory",
      sourceId: entry.id,
      acquiredAtLabel:
        entry.day_number !== null &&
        snapshot.openedAtByDay.has(entry.day_number)
          ? formatRomeDateTime(snapshot.openedAtByDay.get(entry.day_number))
          : null,
    });
  }

  for (const sphere of snapshot.spheres.filter((item) => item.is_unlocked)) {
    if (!sphere.photo_url) continue;
    if (sphere.day_number !== null && !unlockedDays.has(sphere.day_number)) continue;
    images.push({
      id: `sphere:${sphere.id}`,
      src: sphere.photo_url,
      alt: sphere.title,
      dayNumber: sphere.day_number,
      category: "Sfere",
      sourceType: "sphere",
      sourceId: sphere.id,
      acquiredAtLabel: formatRomeDateTime(sphere.unlocked_at),
    });
  }

  for (const photo of photoUrls) {
    images.push({
      id: `photo:${s(photo.row.id)}`,
      src: photo.url,
      alt: "Foto personale",
      dayNumber: n(photo.row.day_number),
      category: "Foto personali",
      sourceType: "photo",
      sourceId: s(photo.row.id),
      acquiredAtLabel: formatRomeDateTime(s(photo.row.created_at)),
    });
  }

  const gallery = buildGalleryData(images);
  return {
    images: gallery.images,
    categories: gallery.categories,
    days: gallery.days,
    phase6Ready: snapshot.capabilities.ready,
  };
}

export async function getStatisticsData(
  user: CurrentUser
): Promise<{ stats: MemoryStatistics; phase6Ready: boolean }> {
  const snapshot = await loadMemorySnapshot(user);
  const objects = buildObjectItems(collectionFacts(snapshot));
  const symbols = buildSymbolItems(collectionFacts(snapshot));
  const spheres = buildSphereItems(collectionFacts(snapshot));
  const clues = buildClueItems(clueFacts(snapshot));
  const album = buildAlbumEntries(albumFacts(snapshot));
  const day24 = snapshot.days.find((day) => day.dayNumber === 24);
  const gate = resolveFinaleGate({
    revealDay: snapshot.finalBox?.reveal_day ?? 24,
    dayUnlocked: Boolean(day24?.isUnlocked),
    completed: Boolean(snapshot.finalBoxCompletedAt),
  });

  return {
    stats: buildMemoryStatistics({
      daysOpened: snapshot.progress.daysOpened,
      daysCompleted: snapshot.progress.daysCompleted,
      totalDays: snapshot.progress.totalDays,
      memories: album.length,
      objects: objects.found,
      objectsTotal: objects.total,
      symbols: symbols.found,
      symbolsTotal: symbols.total,
      spheres: spheres.found,
      spheresTotal: spheres.total,
      clues: clues.length,
      cluesTotal: snapshot.progress.cluesTotal,
      quizzesCompleted: snapshot.progress.quizzesCompleted,
      quizzesTotal: snapshot.progress.quizzesTotal,
      finaleCompleted: gate.completed,
      finaleAvailable: gate.available,
    }),
    phase6Ready: snapshot.capabilities.ready,
  };
}

export async function getFinaleData(user: CurrentUser): Promise<FinaleData> {
  const snapshot = await loadMemorySnapshot(user);
  const objects = buildObjectItems(collectionFacts(snapshot));
  const clues = buildClueItems(clueFacts(snapshot));
  const symbols = buildSymbolItems(collectionFacts(snapshot));
  const spheres = buildSphereItems(collectionFacts(snapshot));
  const album = buildAlbumEntries(albumFacts(snapshot));
  const day24 = snapshot.days.find((day) => day.dayNumber === 24);
  const box = snapshot.finalBox;
  const boxCompleted = box
    ? box.password_enabled
      ? Boolean(snapshot.finalBoxCompletedAt)
      : true
    : false;

  const gate = resolveFinaleGate({
    revealDay: box?.reveal_day ?? 24,
    dayUnlocked: Boolean(day24?.isUnlocked),
    completed: boxCompleted,
  });

  const journey = buildFinaleJourney({
    daysCompleted: snapshot.progress.daysCompleted,
    memories: album.length,
    objects: objects.found,
    symbols: symbols.found,
    spheres: spheres.found,
    clues: clues.length,
    quizzes: snapshot.progress.quizzesCompleted,
  });

  if (!gate.available || !box) {
    return {
      available: false,
      completed: false,
      dayNumber: 24,
      gateMessage: gate.gateMessage,
      finalBox: null,
      physicalGift: null,
      journey,
      importantMemories: [],
      objects: [],
      clues: [],
      phase6Ready: snapshot.capabilities.ready,
    };
  }

  let physicalGift: FinaleData["physicalGift"] = null;
  if (box.physical_gift_id) {
    const admin = await createAdminClient();
    const { data } = await admin
      .from("physical_gifts")
      .select("id, name, description, image_url, day_number")
      .eq("id", box.physical_gift_id)
      .maybeSingle();
    if (data) {
      physicalGift = {
        id: s(data.id),
        name: s(data.name),
        description: s(data.description),
        imageUrl: nullable(data.image_url),
        dayNumber: n(data.day_number),
      };
    }
  }

  return {
    available: true,
    completed: gate.completed,
    dayNumber: 24,
    gateMessage: gate.gateMessage,
    finalBox: {
      id: box.id,
      name: box.name,
      description: box.description,
      imageUrl: box.image_url,
      introMessage: box.intro_message,
      // La rivelazione resta vuota finché la scatola non è stata aperta.
      finalMessage: gate.completed ? box.final_message : "",
      clues: gate.completed ? box.clues : [],
      objects: gate.completed ? box.objects : [],
      completed: gate.completed,
      passwordEnabled: box.password_enabled,
      physicalGiftId: box.physical_gift_id,
    },
    physicalGift,
    journey,
    importantMemories: snapshot.memoryEntries
      .filter((entry) => entry.placement === "finale")
      .slice(0, 12)
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        description: excerpt(entry.description || entry.content),
        imageUrl: entry.image_url,
        dayNumber: entry.day_number,
        kind: entry.kind,
      })),
    objects: objects.items.filter((item) => !item.silhouette),
    clues,
    phase6Ready: snapshot.capabilities.ready,
  };
}

/**
 * Registra l'apertura di una sfera della memoria.
 *
 * Controlli server-side:
 *  - utente dalla sessione;
 *  - sfera di proprietà dell'utente (RLS + filtro esplicito);
 *  - condizioni di attivazione e giorno sbloccato;
 *  - scritta solo con service role, una sola volta.
 */
export async function openMemorySphere(
  user: CurrentUser,
  sphereId: string
): Promise<SphereOpenResult> {
  const snapshot = await loadMemorySnapshot(user);
  const sphere = snapshot.spheres.find((item) => item.id === sphereId);
  if (!sphere) {
    return { ok: false, error: "Sfera non trovata.", sphere: null };
  }

  const dayUnlocked =
    sphere.day_number === null
      ? true
      : snapshot.days.some(
          (day) => day.dayNumber === sphere.day_number && day.isUnlocked
        );
  const dayOpened =
    sphere.day_number === null
      ? true
      : snapshot.days.some(
          (day) => day.dayNumber === sphere.day_number && day.isOpened
        );

  const canOpen = shouldUnlockSphere({
    isUnlocked: sphere.is_unlocked,
    dayNumber: sphere.day_number,
    dayUnlocked,
    dayOpened,
    conditionsMet: sphere.conditionsMet,
  });
  if (!canOpen || snapshot.isSimulation) {
    return {
      ok: false,
      error: "Questa sfera non è ancora disponibile.",
      sphere: null,
    };
  }

  if (!sphere.discovered_at && !snapshot.isSimulation) {
    const admin = await createAdminClient();
    await admin
      .from("memory_spheres")
      .update({ discovered_at: new Date().toISOString(), is_unlocked: true })
      .eq("user_id", user.id)
      .eq("id", sphereId)
      .is("discovered_at", null);
  }

  const discoveredAt = sphere.discovered_at ?? new Date().toISOString();
  return {
    ok: true,
    error: null,
    sphere: {
      id: sphere.id,
      title: sphere.title,
      note: sphere.note,
      photoUrl: sphere.photo_url,
      dayNumber: sphere.day_number,
      isUnlocked: true,
      unlockedAt: sphere.unlocked_at,
      discoveredAt,
      unlockedAtLabel: formatRomeDateTime(sphere.unlocked_at),
      discoveredAtLabel: formatRomeDateTime(discoveredAt),
      isNew: false,
    },
  };
}

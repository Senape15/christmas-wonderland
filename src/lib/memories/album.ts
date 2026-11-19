import type { AlbumEntry, AlbumKind, FilterOption } from "@/types/memories";
import { dayLabel, excerpt, formatRomeDateTime } from "./format";

/**
 * Album dei ricordi.
 *
 * L'album riunisce SOLO contenuti già sbloccati e accessibili all'utente:
 * lettere, fotografie, oggetti, indizi, quiz risolti, regali, messaggi degli
 * elfi, sfere aperte e ricordi configurati dall'amministratore. Nessun
 * elemento di un giorno futuro entra nel payload.
 */

export interface AlbumDayFacts {
  dayNumber: number;
  title: string | null;
  description: string | null;
  isUnlocked: boolean;
  isOpened: boolean;
}

export interface AlbumContentFacts {
  id: string;
  day_number: number;
  kind: string;
  title: string;
  content: string;
  image_url: string | null;
  password_required: boolean;
}

export interface AlbumGiftFacts {
  id: string;
  day_number: number;
  name: string;
  description: string;
  image_url: string | null;
}

export interface AlbumQuizFacts {
  id: string;
  day_number: number;
  question: string;
  answer: string;
}

export interface AlbumMessageFacts {
  id: string;
  day_number: number;
  kind: "elf" | "secret";
  title: string;
  message: string;
  author: string | null;
}

export interface AlbumSymbolFacts {
  id: string;
  effectiveDay: number | null;
  symbol: string;
  description: string;
  image_url: string | null;
}

export interface AlbumSphereFacts {
  id: string;
  day_number: number | null;
  title: string;
  note: string | null;
  photo_url: string | null;
  is_unlocked: boolean;
  unlocked_at: string | null;
}

export interface AlbumMemoryFacts {
  id: string;
  placement: string;
  kind: string;
  title: string;
  description: string;
  content: string;
  image_url: string | null;
  day_number: number | null;
}

export interface AlbumFacts {
  days: AlbumDayFacts[];
  openedAtByDay: ReadonlyMap<number, string>;
  accessibleContents: AlbumContentFacts[];
  gifts: AlbumGiftFacts[];
  quizzes: AlbumQuizFacts[];
  correctQuizAt: ReadonlyMap<string, string>;
  messages: AlbumMessageFacts[];
  symbols: AlbumSymbolFacts[];
  spheres: AlbumSphereFacts[];
  memories: AlbumMemoryFacts[];
  quizAnswerAt: ReadonlyMap<string, string>;
}

const CONTENT_KIND: Record<string, AlbumKind> = {
  letter: "letter",
  note: "note",
  photo: "photo",
  clue: "clue",
  object: "object",
  puzzle: "puzzle",
  password: "password",
};

export const ALBUM_KIND_LABELS: Record<AlbumKind, string> = {
  letter: "Lettere",
  note: "Messaggi",
  photo: "Fotografie",
  clue: "Indizi",
  object: "Oggetti",
  puzzle: "Enigmi",
  password: "Password",
  gift: "Regali",
  elf: "Messaggi degli elfi",
  secret: "Messaggi segreti",
  sphere: "Sfere",
  special: "Momenti speciali",
  day: "Ricordi del giorno",
};

const KIND_ORDER: AlbumKind[] = [
  "day",
  "letter",
  "note",
  "photo",
  "clue",
  "object",
  "puzzle",
  "password",
  "gift",
  "elf",
  "secret",
  "sphere",
  "special",
];

function openedAt(facts: AlbumFacts, dayNumber: number): string {
  return facts.openedAtByDay.get(dayNumber) ?? "";
}

export function buildAlbumEntries(facts: AlbumFacts): AlbumEntry[] {
  const entries: AlbumEntry[] = [];
  const seen = new Set<string>();
  const openedDays = new Set(
    facts.days.filter((day) => day.isOpened).map((day) => day.dayNumber)
  );

  const push = (entry: AlbumEntry) => {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    entries.push(entry);
  };

  for (const day of facts.days) {
    if (!day.isOpened) continue;
    const acquiredAt = openedAt(facts, day.dayNumber);
    push({
      id: `day:${day.dayNumber}`,
      kind: "day",
      title: day.title ?? `Giorno ${day.dayNumber}`,
      description: day.description ?? "",
      content: "",
      imageUrl: null,
      dayNumber: day.dayNumber,
      acquiredAt,
      acquiredAtLabel: formatRomeDateTime(acquiredAt, dayLabel(day.dayNumber)),
      sourceType: "day",
      sourceId: null,
    });
  }

  for (const content of facts.accessibleContents) {
    if (!openedDays.has(content.day_number)) continue;
    const kind = CONTENT_KIND[content.kind] ?? "note";
    const acquiredAt = openedAt(facts, content.day_number);
    push({
      id: `content:${content.id}`,
      kind,
      title: content.title,
      description: excerpt(content.content),
      content: content.content,
      imageUrl: content.image_url,
      dayNumber: content.day_number,
      acquiredAt,
      acquiredAtLabel: formatRomeDateTime(acquiredAt),
      sourceType: "content",
      sourceId: content.id,
    });
  }

  for (const gift of facts.gifts) {
    if (!openedDays.has(gift.day_number)) continue;
    const acquiredAt = openedAt(facts, gift.day_number);
    push({
      id: `gift:${gift.id}`,
      kind: "gift",
      title: gift.name,
      description: excerpt(gift.description),
      content: gift.description,
      imageUrl: gift.image_url,
      dayNumber: gift.day_number,
      acquiredAt,
      acquiredAtLabel: formatRomeDateTime(acquiredAt),
      sourceType: "gift",
      sourceId: gift.id,
    });
  }

  for (const quiz of facts.quizzes) {
    if (!openedDays.has(quiz.day_number)) continue;
    const acquiredAt =
      facts.correctQuizAt.get(quiz.id) ?? openedAt(facts, quiz.day_number);
    push({
      id: `quiz:${quiz.id}`,
      kind: "puzzle",
      title: quiz.question,
      description: "Risposta corretta",
      content: quiz.answer,
      imageUrl: null,
      dayNumber: quiz.day_number,
      acquiredAt,
      acquiredAtLabel: formatRomeDateTime(acquiredAt),
      sourceType: "quiz",
      sourceId: quiz.id,
    });
  }

  for (const message of facts.messages) {
    if (!openedDays.has(message.day_number)) continue;
    const acquiredAt = openedAt(facts, message.day_number);
    push({
      id: `${message.kind}:${message.id}`,
      kind: message.kind,
      title: message.title,
      description: excerpt(message.message),
      content: message.message,
      imageUrl: null,
      dayNumber: message.day_number,
      acquiredAt,
      acquiredAtLabel: formatRomeDateTime(acquiredAt),
      sourceType: "day",
      sourceId: message.id,
    });
  }

  for (const symbol of facts.symbols) {
    if (symbol.effectiveDay === null || !openedDays.has(symbol.effectiveDay)) {
      continue;
    }
    const acquiredAt = openedAt(facts, symbol.effectiveDay);
    push({
      id: `symbol:${symbol.id}`,
      kind: "object",
      title: symbol.symbol,
      description: excerpt(symbol.description),
      content: symbol.description,
      imageUrl: symbol.image_url,
      dayNumber: symbol.effectiveDay,
      acquiredAt,
      acquiredAtLabel: formatRomeDateTime(acquiredAt),
      sourceType: "symbol",
      sourceId: symbol.id,
    });
  }

  for (const sphere of facts.spheres) {
    if (!sphere.is_unlocked) continue;
    if (sphere.day_number !== null && !openedDays.has(sphere.day_number)) {
      continue;
    }
    const acquiredAt =
      sphere.unlocked_at ??
      (sphere.day_number === null ? "" : openedAt(facts, sphere.day_number));
    push({
      id: `sphere:${sphere.id}`,
      kind: "sphere",
      title: sphere.title,
      description: excerpt(sphere.note),
      content: sphere.note ?? "",
      imageUrl: sphere.photo_url,
      dayNumber: sphere.day_number,
      acquiredAt,
      acquiredAtLabel: formatRomeDateTime(acquiredAt),
      sourceType: "sphere",
      sourceId: sphere.id,
    });
  }

  for (const memory of facts.memories) {
    if (memory.placement === "finale") continue;
    if (memory.day_number !== null && !openedDays.has(memory.day_number)) {
      continue;
    }
    const acquiredAt =
      memory.day_number === null ? "" : openedAt(facts, memory.day_number);
    push({
      id: `memory:${memory.id}`,
      kind: "special",
      title: memory.title,
      description: excerpt(memory.description || memory.content),
      content: memory.content || memory.description,
      imageUrl: memory.image_url,
      dayNumber: memory.day_number,
      acquiredAt,
      acquiredAtLabel: formatRomeDateTime(acquiredAt),
      sourceType: "memory",
      sourceId: memory.id,
    });
  }

  entries.sort((a, b) => {
    const day = (a.dayNumber ?? 0) - (b.dayNumber ?? 0);
    if (day !== 0) return day;
    if (a.acquiredAt !== b.acquiredAt) {
      return a.acquiredAt.localeCompare(b.acquiredAt);
    }
    return a.title.localeCompare(b.title, "it");
  });

  return entries;
}

export function buildAlbumFilterOptions(entries: readonly AlbumEntry[]): {
  kinds: FilterOption[];
  days: FilterOption[];
} {
  const kindCounts = new Map<AlbumKind, number>();
  const dayCounts = new Map<number, number>();

  for (const entry of entries) {
    kindCounts.set(entry.kind, (kindCounts.get(entry.kind) ?? 0) + 1);
    if (entry.dayNumber !== null) {
      dayCounts.set(entry.dayNumber, (dayCounts.get(entry.dayNumber) ?? 0) + 1);
    }
  }

  const kinds = KIND_ORDER.filter((kind) => kindCounts.has(kind)).map(
    (kind) => ({
      value: kind,
      label: ALBUM_KIND_LABELS[kind],
      count: kindCounts.get(kind) ?? 0,
    })
  );

  const days = Array.from(dayCounts.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, count]) => ({
      value: String(day),
      label: dayLabel(day),
      count,
    }));

  return { kinds, days };
}

export function filterAlbumEntries(
  entries: readonly AlbumEntry[],
  filters: { kind?: AlbumKind | null; dayNumber?: number | null }
): AlbumEntry[] {
  return entries.filter((entry) => {
    if (filters.kind && entry.kind !== filters.kind) return false;
    if (
      typeof filters.dayNumber === "number" &&
      entry.dayNumber !== filters.dayNumber
    ) {
      return false;
    }
    return true;
  });
}

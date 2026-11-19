import type { DiaryCategory, FilterOption } from "@/types/memories";
import { excerpt } from "./format";

/**
 * Costruzione deterministica del diario personale.
 *
 * Gli eventi NON vengono creati a ogni caricamento pagina: sono derivati dai
 * progressi reali e identificati da una `eventKey` stabile. La tabella
 * `diary_events` ha un vincolo univoco `(user_id, event_key)`, quindi lo stesso
 * evento non può essere registrato due volte anche se la sincronizzazione
 * viene eseguita più volte.
 *
 * Regole di riservatezza:
 *  - si generano eventi solo per giorni aperti e contenuti accessibili;
 *  - i giorni futuri non producono eventi;
 *  - le descrizioni sono brevi e non contengono anticipazioni narrative.
 */

export interface DiaryDayFacts {
  dayNumber: number;
  title: string | null;
  isUnlocked: boolean;
  isOpened: boolean;
  isCompleted: boolean;
}

export interface DiaryContentFacts {
  id: string;
  day_number: number;
  kind: string;
  title: string;
  content: string;
  image_url: string | null;
  password_required: boolean;
}

export interface DiaryQuizFacts {
  id: string;
  day_number: number;
  question: string;
}

export interface DiaryGiftFacts {
  id: string;
  day_number: number;
  name: string;
  description: string;
  image_url: string | null;
}

export interface DiarySymbolFacts {
  id: string;
  effectiveDay: number | null;
  symbol: string;
  description: string;
  image_url: string | null;
}

export interface DiarySphereFacts {
  id: string;
  day_number: number | null;
  title: string;
  note: string | null;
  photo_url: string | null;
  is_unlocked: boolean;
  unlocked_at: string | null;
}

export interface DiaryMemoryFacts {
  id: string;
  title: string;
  description: string;
  content: string;
  image_url: string | null;
  day_number: number | null;
  kind: string;
}

export interface DiaryFinalBoxFacts {
  id: string;
  name: string;
  reveal_day: number;
  completed_at: string | null;
}

export interface DiaryFacts {
  now: string;
  days: DiaryDayFacts[];
  openedAtByDay: ReadonlyMap<number, string>;
  /** Solo contenuti visibili, di giorni aperti e con password soddisfatta. */
  accessibleContents: DiaryContentFacts[];
  /** Solo quiz visibili e risolti correttamente. */
  correctQuizzes: DiaryQuizFacts[];
  correctQuizAt: ReadonlyMap<string, string>;
  passwordCompletedAt: ReadonlyMap<string, string>;
  /** Solo regali di giorni aperti. */
  gifts: DiaryGiftFacts[];
  /** Solo simboli effettivamente scoperti. */
  symbols: DiarySymbolFacts[];
  /** Solo sfere sbloccate. */
  spheres: DiarySphereFacts[];
  /** Solo ricordi admin visibili. */
  memoryEntries: DiaryMemoryFacts[];
  finalBox: DiaryFinalBoxFacts | null;
}

export interface DiaryEventDraft {
  eventKey: string;
  category: DiaryCategory;
  title: string;
  description: string;
  dayNumber: number | null;
  imageUrl: string | null;
  sourceType: string | null;
  sourceId: string | null;
  occurredAt: string;
}

const CONTENT_CATEGORY: Record<string, DiaryCategory> = {
  clue: "indizio",
  object: "oggetto",
};

export const DIARY_CATEGORY_LABELS: Record<DiaryCategory, string> = {
  apertura: "Apertura",
  contenuto: "Contenuto",
  indizio: "Indizio",
  quiz: "Quiz",
  password: "Password",
  oggetto: "Oggetto",
  simbolo: "Simbolo",
  sfera: "Sfera",
  giornata: "Giornata",
  speciale: "Speciale",
  finale: "Finale",
};

const CATEGORY_ORDER: DiaryCategory[] = [
  "apertura",
  "contenuto",
  "indizio",
  "oggetto",
  "simbolo",
  "quiz",
  "password",
  "sfera",
  "giornata",
  "speciale",
  "finale",
];

function openedAt(facts: DiaryFacts, dayNumber: number): string {
  return facts.openedAtByDay.get(dayNumber) ?? facts.now;
}

export function buildDiaryEvents(facts: DiaryFacts): DiaryEventDraft[] {
  const events: DiaryEventDraft[] = [];
  const seen = new Set<string>();

  const push = (event: DiaryEventDraft) => {
    if (seen.has(event.eventKey)) return;
    seen.add(event.eventKey);
    events.push(event);
  };

  const openedDays = new Set(
    facts.days.filter((day) => day.isOpened).map((day) => day.dayNumber)
  );

  for (const day of facts.days) {
    if (!day.isOpened) continue;

    push({
      eventKey: `day-opened:${day.dayNumber}`,
      category: "apertura",
      title: `Hai aperto la casella del giorno ${day.dayNumber}`,
      description: day.title ? `${day.title}` : "",
      dayNumber: day.dayNumber,
      imageUrl: null,
      sourceType: "day",
      sourceId: null,
      occurredAt: openedAt(facts, day.dayNumber),
    });

    if (day.isCompleted) {
      push({
        eventKey: `day-completed:${day.dayNumber}`,
        category: "giornata",
        title: `Giornata completata: ${day.title ?? `giorno ${day.dayNumber}`}`,
        description:
          "Hai concluso tutte le attività obbligatorie di questa tappa.",
        dayNumber: day.dayNumber,
        imageUrl: null,
        sourceType: "day",
        sourceId: null,
        // Non esiste un timestamp di completamento separato: il primo
        // rilevamento server-side è il momento più affidabile.
        occurredAt: facts.now,
      });
    }
  }

  for (const content of facts.accessibleContents) {
    if (!openedDays.has(content.day_number)) continue;

    const category = CONTENT_CATEGORY[content.kind] ?? "contenuto";
    const occurredAt = content.password_required
      ? (facts.passwordCompletedAt.get(content.id) ??
        openedAt(facts, content.day_number))
      : openedAt(facts, content.day_number);

    push({
      eventKey: `content:${content.id}`,
      category,
      title:
        category === "indizio"
          ? `Nuovo indizio: ${content.title}`
          : category === "oggetto"
            ? `Oggetto trovato: ${content.title}`
            : `Hai trovato: ${content.title}`,
      description: excerpt(content.content),
      dayNumber: content.day_number,
      imageUrl: content.image_url,
      sourceType: "content",
      sourceId: content.id,
      occurredAt,
    });

    if (content.password_required && facts.passwordCompletedAt.has(content.id)) {
      push({
        eventKey: `password:${content.id}`,
        category: "password",
        title: `Password trovata: ${content.title}`,
        description: "La scatola fisica è stata sbloccata.",
        dayNumber: content.day_number,
        imageUrl: content.image_url,
        sourceType: "password",
        sourceId: content.id,
        occurredAt:
          facts.passwordCompletedAt.get(content.id) ??
          openedAt(facts, content.day_number),
      });
    }
  }

  for (const quiz of facts.correctQuizzes) {
    if (!openedDays.has(quiz.day_number)) continue;
    push({
      eventKey: `quiz:${quiz.id}`,
      category: "quiz",
      title: `Quiz risolto: ${excerpt(quiz.question, 120)}`,
      description: "Hai trovato la risposta corretta.",
      dayNumber: quiz.day_number,
      imageUrl: null,
      sourceType: "quiz",
      sourceId: quiz.id,
      occurredAt:
        facts.correctQuizAt.get(quiz.id) ?? openedAt(facts, quiz.day_number),
    });
  }

  for (const gift of facts.gifts) {
    if (!openedDays.has(gift.day_number)) continue;
    push({
      eventKey: `gift:${gift.id}`,
      category: "oggetto",
      title: `Regalo scoperto: ${gift.name}`,
      description: excerpt(gift.description),
      dayNumber: gift.day_number,
      imageUrl: gift.image_url,
      sourceType: "gift",
      sourceId: gift.id,
      occurredAt: openedAt(facts, gift.day_number),
    });
  }

  for (const symbol of facts.symbols) {
    if (symbol.effectiveDay === null || !openedDays.has(symbol.effectiveDay)) {
      continue;
    }
    push({
      eventKey: `symbol:${symbol.id}`,
      category: "simbolo",
      title: `Simbolo scoperto: ${symbol.symbol}`,
      description: excerpt(symbol.description),
      dayNumber: symbol.effectiveDay,
      imageUrl: symbol.image_url,
      sourceType: "symbol",
      sourceId: symbol.id,
      occurredAt: openedAt(facts, symbol.effectiveDay),
    });
  }

  for (const sphere of facts.spheres) {
    if (!sphere.is_unlocked) continue;
    if (sphere.day_number !== null && !openedDays.has(sphere.day_number)) {
      continue;
    }
    push({
      eventKey: `sphere:${sphere.id}`,
      category: "sfera",
      title: `Sfera della memoria: ${sphere.title}`,
      description: excerpt(sphere.note),
      dayNumber: sphere.day_number,
      imageUrl: sphere.photo_url,
      sourceType: "sphere",
      sourceId: sphere.id,
      occurredAt:
        sphere.unlocked_at ??
        (sphere.day_number === null
          ? facts.now
          : openedAt(facts, sphere.day_number)),
    });
  }

  for (const memory of facts.memoryEntries) {
    if (memory.day_number !== null && !openedDays.has(memory.day_number)) {
      continue;
    }
    push({
      eventKey: `memory:${memory.id}`,
      category: "speciale",
      title: memory.title,
      description: excerpt(memory.description || memory.content),
      dayNumber: memory.day_number,
      imageUrl: memory.image_url,
      sourceType: "memory",
      sourceId: memory.id,
      occurredAt:
        memory.day_number === null
          ? facts.now
          : openedAt(facts, memory.day_number),
    });
  }

  if (facts.finalBox?.completed_at) {
    push({
      eventKey: `finale:${facts.finalBox.id}`,
      category: "finale",
      title: "La scatola finale è stata aperta",
      description: facts.finalBox.name,
      dayNumber: facts.finalBox.reveal_day,
      imageUrl: null,
      sourceType: "final_box",
      sourceId: facts.finalBox.id,
      occurredAt: facts.finalBox.completed_at,
    });
  }

  return events.sort((a, b) => {
    const time = a.occurredAt.localeCompare(b.occurredAt);
    if (time !== 0) return time;
    const day = (a.dayNumber ?? 0) - (b.dayNumber ?? 0);
    if (day !== 0) return day;
    return a.title.localeCompare(b.title, "it");
  });
}

export function filterDiaryEvents(
  events: readonly DiaryEventDraft[],
  filters: { category?: DiaryCategory | null; dayNumber?: number | null }
): DiaryEventDraft[] {
  return events.filter((event) => {
    if (filters.category && event.category !== filters.category) return false;
    if (
      typeof filters.dayNumber === "number" &&
      event.dayNumber !== filters.dayNumber
    ) {
      return false;
    }
    return true;
  });
}

export function buildDiaryFilterOptions(
  events: readonly DiaryEventDraft[]
): { categories: FilterOption[]; days: FilterOption[] } {
  const categoryCounts = new Map<DiaryCategory, number>();
  const dayCounts = new Map<number, number>();

  for (const event of events) {
    categoryCounts.set(
      event.category,
      (categoryCounts.get(event.category) ?? 0) + 1
    );
    if (event.dayNumber !== null) {
      dayCounts.set(event.dayNumber, (dayCounts.get(event.dayNumber) ?? 0) + 1);
    }
  }

  const categories = CATEGORY_ORDER.filter((category) =>
    categoryCounts.has(category)
  ).map((category) => ({
    value: category,
    label: DIARY_CATEGORY_LABELS[category],
    count: categoryCounts.get(category) ?? 0,
  }));

  const days = Array.from(dayCounts.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, count]) => ({
      value: String(day),
      label: `Giorno ${day}`,
      count,
    }));

  return { categories, days };
}

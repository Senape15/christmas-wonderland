import type { ClueItem, ClueLink, FilterOption } from "@/types/memories";
import { dayLabel, excerpt, formatRomeDateTime } from "./format";

/**
 * Archivio degli indizi.
 *
 * Un indizio diventa leggibile solo dopo essere stato scoperto (giorno aperto
 * e, se previsto, password soddisfatta). I collegamenti incrociati vengono
 * mostrati SOLO verso indizi già scoperti: nessun titolo o riferimento a
 * contenuti futuri lascia il server. Nessun testo rivela il responsabile
 * prima del 24 dicembre.
 */

export interface ClueDayFacts {
  dayNumber: number;
  isUnlocked: boolean;
  isOpened: boolean;
}

export interface ClueContentFacts {
  id: string;
  day_number: number;
  kind: string;
  title: string;
  content: string;
  image_url: string | null;
  password_required: boolean;
  clue_group?: string | null;
  related_content_ids?: readonly string[] | null;
  source_label?: string | null;
}

export interface ClueFacts {
  days: ClueDayFacts[];
  openedAtByDay: ReadonlyMap<number, string>;
  /** Solo contenuti visibili (giorno sbloccato e condizioni soddisfatte). */
  contents: ClueContentFacts[];
  passwordCompletedAt: ReadonlyMap<string, string>;
  /** Titoli degli indizi scoperti, indicizzati per id. */
  discoveredTitles: ReadonlyMap<string, { title: string; dayNumber: number }>;
}

function openedAt(facts: ClueFacts, dayNumber: number): string {
  return facts.openedAtByDay.get(dayNumber) ?? "";
}

export function buildClueItems(facts: ClueFacts): ClueItem[] {
  const dayMap = new Map(facts.days.map((day) => [day.dayNumber, day]));
  const clues: ClueItem[] = [];

  for (const content of facts.contents) {
    if (content.kind !== "clue") continue;

    const day = dayMap.get(content.day_number);
    if (!day?.isUnlocked || !day.isOpened) continue;
    if (content.password_required && !facts.passwordCompletedAt.has(content.id)) {
      continue;
    }

    const related: ClueLink[] = [];
    for (const relatedId of content.related_content_ids ?? []) {
      if (relatedId === content.id) continue;
      // Solo indizi già scoperti: nessun collegamento anticipa il futuro.
      const discovered = facts.discoveredTitles.get(relatedId);
      if (!discovered) continue;
      if (related.some((link) => link.id === relatedId)) continue;
      related.push({
        id: relatedId,
        title: discovered.title,
        dayNumber: discovered.dayNumber,
      });
    }

    const acquiredAt =
      facts.passwordCompletedAt.get(content.id) ??
      openedAt(facts, content.day_number);

    clues.push({
      id: content.id,
      title: content.title,
      description: excerpt(content.content),
      content: content.content,
      imageUrl: content.image_url,
      dayNumber: content.day_number,
      acquiredAt,
      acquiredAtLabel: formatRomeDateTime(acquiredAt, dayLabel(content.day_number)),
      group: content.clue_group?.trim() || null,
      sourceLabel: content.source_label?.trim() || dayLabel(content.day_number),
      related,
    });
  }

  clues.sort((a, b) => {
    const day = (a.dayNumber ?? 0) - (b.dayNumber ?? 0);
    if (day !== 0) return day;
    return a.title.localeCompare(b.title, "it");
  });

  return clues;
}

/** Mappa degli indizi scoperti, calcolata dai soli contenuti ammessi. */
export function buildDiscoveredClueTitles(
  contents: readonly ClueContentFacts[],
  days: readonly ClueDayFacts[],
  passwordCompletedAt: ReadonlyMap<string, string>
): Map<string, { title: string; dayNumber: number }> {
  const dayMap = new Map(days.map((day) => [day.dayNumber, day]));
  const result = new Map<string, { title: string; dayNumber: number }>();

  for (const content of contents) {
    if (content.kind !== "clue") continue;
    const day = dayMap.get(content.day_number);
    if (!day?.isUnlocked || !day.isOpened) continue;
    if (content.password_required && !passwordCompletedAt.has(content.id)) {
      continue;
    }
    result.set(content.id, {
      title: content.title,
      dayNumber: content.day_number,
    });
  }

  return result;
}

export function buildClueGroupOptions(
  clues: readonly ClueItem[]
): FilterOption[] {
  const counts = new Map<string, number>();
  for (const clue of clues) {
    const key = clue.group ?? "senza-gruppo";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => {
      // Il gruppo "senza gruppo" resta sempre in fondo all'elenco.
      if (a === "senza-gruppo") return 1;
      if (b === "senza-gruppo") return -1;
      return a.localeCompare(b, "it");
    })
    .map(([group, count]) => ({
      value: group,
      label: group === "senza-gruppo" ? "Senza gruppo" : group,
      count,
    }));
}

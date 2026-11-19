import type {
  CollectibleItem,
  SphereItem,
  SymbolItem,
} from "@/types/memories";
import { formatRomeDateTime } from "./format";

/**
 * Collezione di oggetti, simboli e sfere.
 *
 * Le sagome sono mostrate SOLO quando l'amministratore ha impostato
 * `show_silhouette` e il giorno è già sbloccato. Per un elemento non ancora
 * ottenuto non vengono mai inviati nome, descrizione o immagine reali.
 */

export interface CollectionDayFacts {
  dayNumber: number;
  isUnlocked: boolean;
  isOpened: boolean;
}

export interface CollectionContentFacts {
  id: string;
  day_number: number;
  kind: string;
  title: string;
  content: string;
  image_url: string | null;
  password_required: boolean;
  category?: string | null;
  rarity?: string | null;
  special_description?: string | null;
  show_silhouette?: boolean | null;
}

export interface CollectionGiftFacts {
  id: string;
  day_number: number;
  name: string;
  description: string;
  image_url: string | null;
  category?: string | null;
  rarity?: string | null;
  special_description?: string | null;
  show_silhouette?: boolean | null;
}

export interface CollectionSymbolFacts {
  id: string;
  effectiveDay: number | null;
  symbol: string;
  description: string;
  image_url: string | null;
  category?: string | null;
  rarity?: string | null;
  show_silhouette?: boolean | null;
}

export interface CollectionSphereFacts {
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

export interface CollectionFacts {
  days: CollectionDayFacts[];
  openedAtByDay: ReadonlyMap<number, string>;
  /** Contenuti visibili (condizioni soddisfatte, password configurata). */
  contents: CollectionContentFacts[];
  /** Regali visibili (giorno sbloccato). */
  gifts: CollectionGiftFacts[];
  /** Simboli visibili (giorno sbloccato, condizioni soddisfatte). */
  symbols: CollectionSymbolFacts[];
  /** Tutte le sfere dell'utente. */
  spheres: CollectionSphereFacts[];
  passwordCompletedAt: ReadonlyMap<string, string>;
}

export interface ObjectBuildResult {
  items: CollectibleItem[];
  found: number;
  total: number;
}

export interface SymbolBuildResult {
  items: SymbolItem[];
  found: number;
  total: number;
}

export interface SphereBuildResult {
  items: SphereItem[];
  found: number;
  total: number;
}

function dayState(
  facts: CollectionFacts,
  dayNumber: number | null
): { unlocked: boolean; opened: boolean } {
  if (dayNumber === null) return { unlocked: true, opened: true };
  const day = facts.days.find((item) => item.dayNumber === dayNumber);
  return {
    unlocked: Boolean(day?.isUnlocked),
    opened: Boolean(day?.isOpened),
  };
}

function openedAt(facts: CollectionFacts, dayNumber: number): string {
  return facts.openedAtByDay.get(dayNumber) ?? "";
}

function isContentAccessible(
  facts: CollectionFacts,
  content: CollectionContentFacts
): boolean {
  if (!content.password_required) return true;
  return facts.passwordCompletedAt.has(content.id);
}

function acquiredLabel(value: string | null | undefined): string | null {
  return value ? formatRomeDateTime(value) : null;
}

function objectSilhouette(
  source: CollectibleItem["source"],
  id: string,
  dayNumber: number
): CollectibleItem {
  return {
    id: `${source}:${id}`,
    source,
    name: "",
    description: "",
    specialDescription: "",
    imageUrl: null,
    dayNumber,
    acquiredAt: null,
    acquiredAtLabel: null,
    category: "Misterioso",
    rarity: "",
    silhouette: true,
  };
}

export function buildObjectItems(facts: CollectionFacts): ObjectBuildResult {
  const items: CollectibleItem[] = [];
  let found = 0;
  let total = 0;

  for (const content of facts.contents) {
    if (content.kind !== "object") continue;
    const day = dayState(facts, content.day_number);
    if (!day.unlocked) continue;

    total += 1;
    const acquired = day.opened && isContentAccessible(facts, content);

    if (!acquired) {
      if (content.show_silhouette) {
        items.push(objectSilhouette("content", content.id, content.day_number));
      }
      continue;
    }

    found += 1;
    const acquiredAt = content.password_required
      ? (facts.passwordCompletedAt.get(content.id) ??
        openedAt(facts, content.day_number))
      : openedAt(facts, content.day_number);

    items.push({
      id: `content:${content.id}`,
      source: "content",
      name: content.title,
      description: content.content,
      specialDescription: content.special_description ?? "",
      imageUrl: content.image_url,
      dayNumber: content.day_number,
      acquiredAt: acquiredAt || null,
      acquiredAtLabel: acquiredLabel(acquiredAt),
      category: content.category?.trim() || "Ricordo",
      rarity: content.rarity?.trim() || "comune",
      silhouette: false,
    });
  }

  for (const gift of facts.gifts) {
    const day = dayState(facts, gift.day_number);
    if (!day.unlocked) continue;

    total += 1;
    if (!day.opened) {
      if (gift.show_silhouette) {
        items.push(objectSilhouette("gift", gift.id, gift.day_number));
      }
      continue;
    }

    found += 1;
    const acquiredAt = openedAt(facts, gift.day_number);
    items.push({
      id: `gift:${gift.id}`,
      source: "gift",
      name: gift.name,
      description: gift.description,
      specialDescription: gift.special_description ?? "",
      imageUrl: gift.image_url,
      dayNumber: gift.day_number,
      acquiredAt: acquiredAt || null,
      acquiredAtLabel: acquiredLabel(acquiredAt),
      category: gift.category?.trim() || "Regalo",
      rarity: gift.rarity?.trim() || "comune",
      silhouette: false,
    });
  }

  items.sort((a, b) => {
    const day = (a.dayNumber ?? 0) - (b.dayNumber ?? 0);
    if (day !== 0) return day;
    if (a.silhouette !== b.silhouette) return a.silhouette ? 1 : -1;
    return a.name.localeCompare(b.name, "it");
  });

  return { items, found, total };
}

export function buildSymbolItems(facts: CollectionFacts): SymbolBuildResult {
  const items: SymbolItem[] = [];
  const seen = new Set<string>();
  let found = 0;
  let total = 0;

  for (const symbol of facts.symbols) {
    // La stessa riga può arrivare da due query (regalo + giorno): deduplica.
    if (seen.has(symbol.id)) continue;
    seen.add(symbol.id);

    const day = dayState(facts, symbol.effectiveDay);
    if (!day.unlocked) continue;

    total += 1;
    const discovered = day.opened;

    if (!discovered && !symbol.show_silhouette) continue;

    if (discovered) found += 1;
    const acquiredAt = discovered && symbol.effectiveDay !== null
      ? openedAt(facts, symbol.effectiveDay)
      : null;

    items.push({
      id: symbol.id,
      name: discovered ? symbol.symbol : "",
      description: discovered ? symbol.description : "",
      imageUrl: discovered ? symbol.image_url : null,
      dayNumber: symbol.effectiveDay,
      acquiredAt: acquiredAt || null,
      acquiredAtLabel: acquiredLabel(acquiredAt),
      category: discovered
        ? (symbol.category?.trim() || "Simbolo")
        : "Misterioso",
      rarity: discovered ? (symbol.rarity?.trim() || "comune") : "",
      silhouette: !discovered,
    });
  }

  items.sort((a, b) => {
    const day = (a.dayNumber ?? 0) - (b.dayNumber ?? 0);
    if (day !== 0) return day;
    if (a.silhouette !== b.silhouette) return a.silhouette ? 1 : -1;
    return a.name.localeCompare(b.name, "it");
  });

  return { items, found, total };
}

/**
 * Regola di sblocco di una sfera:
 *  - se è già sbloccata resta visibile (solo se il giorno è sbloccato);
 *  - altrimenti servono condizioni soddisfatte e giorno aperto;
 *  - una sfera senza giorno si sblocca appena le condizioni sono soddisfatte.
 */
export function shouldUnlockSphere(input: {
  isUnlocked: boolean;
  dayNumber: number | null;
  dayUnlocked: boolean;
  dayOpened: boolean;
  conditionsMet: boolean;
}): boolean {
  if (input.dayNumber !== null && !input.dayUnlocked) return false;
  if (input.isUnlocked) return true;
  if (!input.conditionsMet) return false;
  if (input.dayNumber === null) return true;
  return input.dayOpened;
}

export function buildSphereItems(facts: CollectionFacts): SphereBuildResult {
  const items: SphereItem[] = [];
  let found = 0;
  let total = 0;

  for (const sphere of facts.spheres) {
    const day = dayState(facts, sphere.day_number);
    if (!day.unlocked) continue;

    // Totale delle sfere potenzialmente visibili: solo condizioni soddisfatte.
    if (sphere.conditionsMet) total += 1;

    const unlocked = shouldUnlockSphere({
      isUnlocked: sphere.is_unlocked,
      dayNumber: sphere.day_number,
      dayUnlocked: day.unlocked,
      dayOpened: day.opened,
      conditionsMet: sphere.conditionsMet,
    });

    if (!unlocked) continue;

    found += 1;
    items.push({
      id: sphere.id,
      title: sphere.title,
      note: sphere.note,
      photoUrl: sphere.photo_url,
      dayNumber: sphere.day_number,
      isUnlocked: true,
      unlockedAt: sphere.unlocked_at,
      discoveredAt: sphere.discovered_at,
      unlockedAtLabel: acquiredLabel(sphere.unlocked_at),
      discoveredAtLabel: acquiredLabel(sphere.discovered_at),
      isNew: !sphere.discovered_at,
    });
  }

  items.sort((a, b) => {
    const day = (a.dayNumber ?? 0) - (b.dayNumber ?? 0);
    if (day !== 0) return day;
    return a.title.localeCompare(b.title, "it");
  });

  return { items, found, total };
}

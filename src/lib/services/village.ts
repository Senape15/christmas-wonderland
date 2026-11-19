import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/utils";
import { CATALOG_HOTSPOTS, CATALOG_ZONES } from "@/lib/village/catalog";
import type { CalendarData, CalendarDay } from "@/types/calendar";
import type { NicoExpression } from "@/types/nico";
import { isNicoExpression } from "@/types/nico";
import type {
  HotspotKind,
  HotspotState,
  StoryPhase,
  VillageData,
  VillageHotspot,
  VillageZone,
} from "@/types/village";
import { isHotspotKind } from "@/types/village";

/**
 * Dati della mappa del villaggio.
 *
 * SECURITY: questo servizio non legge mai `advent_days` direttamente. Riceve
 * il calendario già filtrato da RLS (`getCalendarData`) e ne usa solo gli stati
 * `isUnlocked` / `isOpened` / `unlockDate`. Per i luoghi non ancora disponibili
 * rimuove dal payload il giorno associato, il teaser e il messaggio di Nico:
 * il client non deve poter dedurre in anticipo cosa lo aspetta.
 */

/** Input minimo di un punto, prima del calcolo dello stato. */
export interface VillageHotspotSeed {
  id: string;
  zoneSlug: string;
  slug: string;
  name: string;
  kind: HotspotKind;
  x: number;
  y: number;
  dayNumber?: number | null;
  hint?: string;
  lockedHint?: string;
  nicoMessage?: string;
  nicoExpression?: NicoExpression;
  sortOrder?: number;
}

export interface DeriveVillageInput {
  zones: readonly VillageZone[];
  hotspots: readonly VillageHotspotSeed[];
  days: readonly CalendarDay[];
  now: Date;
  hasDatabaseMapping: boolean;
}

const romeDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Confronta due istanti nel fuso Europe/Rome (non in UTC).
 * `en-CA` produce `YYYY-MM-DD`, quindi il confronto è lessicografico.
 */
export function isSameDayInRome(a: Date, b: Date): boolean {
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return romeDateFormatter.format(a) === romeDateFormatter.format(b);
}

/**
 * Stato del punto derivato dal giorno reale.
 *
 * - giorno assente o futuro → `locked`
 * - giorno aperto → `completed`
 * - giorno sbloccato oggi → `available`
 * - giorno sbloccato nei giorni precedenti e non aperto → `discovered`
 *   (i giorni recuperabili restano accessibili, senza bloccare i successivi)
 */
export function deriveHotspotState(
  day: CalendarDay | undefined,
  now: Date
): HotspotState {
  if (!day || !day.isUnlocked) return "locked";
  if (day.isOpened) return "completed";
  if (day.unlockDate && isSameDayInRome(new Date(day.unlockDate), now)) {
    return "available";
  }
  return "discovered";
}

export function deriveStoryPhase(days: readonly CalendarDay[]): StoryPhase {
  const anyUnlocked = days.some((day) => day.isUnlocked);
  if (!anyUnlocked) return "attesa";
  if (days.every((day) => day.isOpened)) return "completo";
  return "in-corso";
}

/**
 * Funzione pura: unisce configurazione dei luoghi e calendario reale.
 * Esportata per i test (stati, ordinamento, nessuna anticipazione del futuro).
 */
export function deriveVillageData({
  zones,
  hotspots,
  days,
  now,
  hasDatabaseMapping,
}: DeriveVillageInput): VillageData {
  const dayByNumber = new Map(days.map((day) => [day.dayNumber, day]));

  const mappedHotspots: VillageHotspot[] = hotspots
    .map((hotspot, index) => {
      const day =
        hotspot.dayNumber !== null && hotspot.dayNumber !== undefined
          ? dayByNumber.get(hotspot.dayNumber)
          : undefined;
      const state = deriveHotspotState(day, now);
      const revealed = state !== "locked";

      return {
        id: hotspot.id,
        zoneSlug: hotspot.zoneSlug,
        slug: hotspot.slug,
        name: hotspot.name,
        kind: hotspot.kind,
        x: hotspot.x,
        y: hotspot.y,
        // Mai l'associazione luogo → giorno prima dello sblocco.
        dayNumber: revealed ? (hotspot.dayNumber ?? null) : null,
        state,
        // Mai teaser o messaggi configurati prima dello sblocco.
        hint: revealed ? (hotspot.hint ?? "") : "",
        lockedHint: hotspot.lockedHint ?? "",
        nicoMessage: revealed ? (hotspot.nicoMessage ?? "") : "",
        nicoExpression: hotspot.nicoExpression ?? "happy",
        sortOrder: hotspot.sortOrder ?? index,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const usedZoneSlugs = new Set(mappedHotspots.map((hotspot) => hotspot.zoneSlug));

  const orderedZones = [...zones]
    .filter((zone) => usedZoneSlugs.has(zone.slug))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const phase = deriveStoryPhase(days);

  return {
    zones: orderedZones,
    hotspots: mappedHotspots,
    phase,
    starLit: phase === "attesa",
    hasDatabaseMapping,
  };
}

function toPercent(value: unknown, fallback = 50): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), 100);
}

async function loadVillageFromDatabase(): Promise<{
  zones: VillageZone[];
  hotspots: VillageHotspotSeed[];
} | null> {
  const supabase = await createClient();

  const [zonesResult, hotspotsResult, messagesResult] = await Promise.all([
    supabase
      .from("village_locations")
      .select(
        "id, slug, name, description, position_x, position_y, sort_order"
      )
      .order("sort_order", { ascending: true }),
    supabase
      .from("village_hotspots")
      .select(
        "id, location_id, slug, name, kind, position_x, position_y, day_number, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    // RLS restituisce i messaggi solo per i luoghi già sbloccati: i testi
    // narrativi delle tappe future non lasciano mai il database.
    supabase
      .from("village_hotspot_messages")
      .select("hotspot_id, hint, nico_message, nico_expression"),
  ]);

  if (zonesResult.error || hotspotsResult.error || messagesResult.error) {
    return null;
  }

  const zones: VillageZone[] = (zonesResult.data ?? []).map((zone, index) => ({
    id: zone.id,
    slug: zone.slug,
    name: zone.name,
    description: zone.description,
    positionX: toPercent(zone.position_x),
    positionY: toPercent(zone.position_y),
    sortOrder: zone.sort_order ?? index,
  }));

  const zoneSlugById = new Map(zones.map((zone) => [zone.id, zone.slug]));

  const messageByHotspotId = new Map(
    (messagesResult.data ?? []).map((message) => [message.hotspot_id, message])
  );

  const hotspots: VillageHotspotSeed[] = [];
  for (const row of hotspotsResult.data ?? []) {
    const zoneSlug = zoneSlugById.get(row.location_id);
    if (!zoneSlug) continue;
    if (!isHotspotKind(row.kind)) continue;

    const message = messageByHotspotId.get(row.id);

    hotspots.push({
      id: row.id,
      zoneSlug,
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      x: toPercent(row.position_x),
      y: toPercent(row.position_y),
      dayNumber:
        typeof row.day_number === "number" ? row.day_number : null,
      hint: message?.hint ?? "",
      lockedHint: "",
      nicoMessage: message?.nico_message ?? "",
      nicoExpression: isNicoExpression(message?.nico_expression)
        ? message.nico_expression
        : "happy",
      sortOrder: row.sort_order ?? undefined,
    });
  }

  return { zones, hotspots };
}

/**
 * Dati completi per la mappa, lato server.
 *
 * Se le tabelle non esistono ancora (migrazione 002 non applicata) o non
 * contengono luoghi, usa il catalogo illustrato: nessuna associazione
 * luogo → giorno inventata, tutti i punti restano chiusi.
 */
export async function getVillageData(
  calendar: CalendarData,
  now: Date = new Date()
): Promise<VillageData> {
  const fromDatabase = await loadVillageFromDatabase();

  if (fromDatabase && fromDatabase.hotspots.length > 0) {
    return deriveVillageData({
      zones: fromDatabase.zones,
      hotspots: fromDatabase.hotspots,
      days: calendar.days,
      now,
      hasDatabaseMapping: true,
    });
  }

  return deriveVillageData({
    zones: CATALOG_ZONES,
    hotspots: CATALOG_HOTSPOTS,
    days: calendar.days,
    now,
    hasDatabaseMapping: false,
  });
}

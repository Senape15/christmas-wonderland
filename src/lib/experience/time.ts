import { APP_TIMEZONE } from "@/lib/utils";
import type { SimulationView } from "@/types/experience";

/**
 * Data "effettiva" dell'esperienza.
 *
 * In modalità normale è l'orologio reale. Un amministratore con una
 * simulazione attiva vede i giorni come se ci si trovasse alla data scelta,
 * senza che venga modificato alcun dato (aperture, progressi o database).
 */

export interface SimulationRow {
  simulated_date: string | null;
  note: string;
  is_active: boolean;
}

export interface DateContext {
  /** Istante usato per i confronti temporali (mai inoltrato al client). */
  now: Date;
  simulation: SimulationView | null;
  isSimulation: boolean;
}

const romeDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data civile a Roma nel formato `YYYY-MM-DD`. */
export function toRomeDateString(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return romeDateFormatter.format(date);
}

export function createDateContext(
  simulation: SimulationRow | null,
  realNow: Date = new Date()
): DateContext {
  if (simulation?.is_active && simulation.simulated_date) {
    const date = simulation.simulated_date.slice(0, 10);
    return {
      // Mezzogiorno UTC cade nello stesso giorno civile a Roma (CET/CEST):
      // sufficiente per stati "oggi", condizioni e confronti di giorno.
      now: new Date(`${date}T12:00:00Z`),
      simulation: { date, note: simulation.note },
      isSimulation: true,
    };
  }

  return { now: realNow, simulation: null, isSimulation: false };
}

/**
 * Un giorno è sbloccato quando la sua data civile a Roma è raggiunta.
 * In simulazione vale la data scelta dall'admin per l'intera giornata,
 * indipendentemente dall'orario configurato in `unlock_date`.
 */
export function isDayUnlocked(
  unlockDate: string,
  context: DateContext
): boolean {
  if (!unlockDate) return false;

  if (context.simulation) {
    const dayDate = toRomeDateString(unlockDate);
    return dayDate !== "" && dayDate <= context.simulation.date;
  }

  const unlock = new Date(unlockDate);
  return !Number.isNaN(unlock.getTime()) && unlock.getTime() <= context.now.getTime();
}

export function isSameRomeDay(a: Date, b: Date): boolean {
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return toRomeDateString(a) === toRomeDateString(b);
}

/** `true` quando la data simulata è valida (`YYYY-MM-DD`). */
export function isValidRomeDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

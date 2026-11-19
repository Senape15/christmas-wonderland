/**
 * Simulazione date: logica pura di anteprima.
 *
 * NON modifica alcun dato reale: trasforma solo la vista dei giorni in base
 * a una data scelta dall'admin. I controlli server-side di sblocco restano
 * invariati e continuano a usare la data reale.
 */

const romeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export interface PreviewDay {
  dayNumber: number;
  title: string;
  unlockDate: string;
  wouldBeUnlocked: boolean;
}

export function buildSimulationPreview(
  days: readonly { day_number: number; title: string; unlock_date: string }[],
  simulatedDate: string
): PreviewDay[] {
  return days.map((day) => ({
    dayNumber: day.day_number,
    title: day.title,
    unlockDate: day.unlock_date,
    wouldBeUnlocked: romeFormatter.format(new Date(day.unlock_date)) <= simulatedDate,
  }));
}

export function isSimulationDateValid(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

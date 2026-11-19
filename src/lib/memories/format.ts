import { APP_TIMEZONE } from "@/lib/utils";

/**
 * Formattazione deterministica delle date della Fase 6.
 *
 * Le etichette vengono calcolate sul server e incluse nei payload: formattarle
 * nel browser produrrebbe stringhe diverse da quelle renderizzate dal server
 * (fuso orario e mezzanotte), causando mismatch di idratazione.
 */

const dateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRomeDateTime(
  value: string | null | undefined,
  fallback = "Data non disponibile"
): string {
  const date = parse(value);
  return date ? dateTimeFormatter.format(date) : fallback;
}

export function formatRomeDate(
  value: string | null | undefined,
  fallback = "Data non disponibile"
): string {
  const date = parse(value);
  return date ? dateFormatter.format(date) : fallback;
}

/** Etichetta uniforme per un giorno dell'Avvento. */
export function dayLabel(dayNumber: number | null | undefined): string {
  return typeof dayNumber === "number" && dayNumber >= 1 && dayNumber <= 24
    ? `Giorno ${dayNumber}`
    : "Senza giorno";
}

/** Accorcia un testo mantenendo le parole intere quando possibile. */
export function excerpt(value: string | null | undefined, max = 240): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

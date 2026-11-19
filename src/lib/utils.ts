import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale = "it-IT") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Oggi";
  if (diffDays === 1) return "Domani";
  if (diffDays <= 7) return `Tra ${diffDays} giorni`;
  return formatDate(d);
}

export function isDateUnlocked(unlockDate: string | Date) {
  return new Date(unlockDate) <= new Date();
}

/** Fuso orario dell'esperienza: tutte le date mostrate usano questa zona. */
export const APP_TIMEZONE = "Europe/Rome";

/**
 * Etichetta di "oggi" (es. "Martedì, 17 Novembre 2026").
 *
 * Va calcolata sul server e passata come prop: formattarla nel browser
 * produrrebbe stringhe diverse da quelle renderizzate dal server (fuso
 * orario e mezzanotte), causando mismatch di idratazione.
 */
export function formatTodayLabel(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("it-IT", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const capitalize = (value: string) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

  return `${capitalize(pick("weekday"))}, ${pick("day")} ${capitalize(
    pick("month")
  )} ${pick("year")}`;
}

/** Anno corrente nel fuso dell'esperienza (Europe/Rome). */
export function getAppYear(date: Date = new Date()): number {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
  }).format(date);

  return Number(value);
}

/**
 * Valori inline compatibili con la serializzazione del CSSOM.
 *
 * Il browser non conserva gli stili inline come li scriviamo: li ri-analizza e
 * li riserializza (massimo 6 cifre significative, hex → `rgb()`, zeri finali
 * rimossi). Durante l'idratazione React confronta i valori del DOM con quelli
 * calcolati nel client: se non coincidono carattere per carattere segnala un
 * mismatch. Questi helper producono subito la forma "normalizzata", così
 * server e client generano la stessa identica stringa.
 */

/** Numero CSS stabile: arrotondato e senza zeri finali (es. `56.44`). */
export function cssNumber(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value)) return "0";
  return String(Number(value.toFixed(fractionDigits)));
}

/** Lunghezza CSS stabile (es. `56.44%`, `4.69px`, `2.73s`). */
export function cssLength(
  value: number,
  unit: "px" | "%" | "s",
  fractionDigits = 2
): string {
  return `${cssNumber(value, fractionDigits)}${unit}`;
}

/**
 * Converte un colore esadecimale nel formato `rgb(r, g, b)` restituito dal
 * CSSOM. Valori già in altri formati vengono lasciati invariati.
 */
export function cssRgb(color: string): string {
  const value = color.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (!match) return value;

  const raw = match[1];
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);

  return `rgb(${r}, ${g}, ${b})`;
}

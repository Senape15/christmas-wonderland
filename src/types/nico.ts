/**
 * Espressioni disponibili per Nico, l'elfo guida del villaggio.
 *
 * Vive in `types/` (e non nel componente) perché viene usata anche dai dati
 * del villaggio e dai servizi server. `Nico.tsx` la riesporta per compatibilità.
 */
export type NicoExpression = "happy" | "curious" | "surprised" | "mysterious";

export const NICO_EXPRESSIONS: readonly NicoExpression[] = [
  "happy",
  "curious",
  "surprised",
  "mysterious",
] as const;

export function isNicoExpression(value: unknown): value is NicoExpression {
  return (
    typeof value === "string" &&
    (NICO_EXPRESSIONS as readonly string[]).includes(value)
  );
}

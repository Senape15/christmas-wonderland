import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { cssLength, cssNumber } from "@/lib/css-values";
import { hashUnit } from "@/lib/deterministic";

interface SnowfallProps {
  count?: number;
  className?: string;
}

/**
 * Neve decorativa.
 *
 * Per evitare mismatch di idratazione:
 * - i valori sono calcolati con un hash intero deterministico (identico in
 *   Node e nel browser), non con `Math.random()` né `Math.sin`;
 * - gli stili inline usano stringhe già nella forma che il CSSOM conserva
 *   (2 decimali, con unità), altrimenti il browser li riserializza e React
 *   segnala una differenza;
 * - l'animazione è interamente CSS (`.snowflake` + `@keyframes snowfall`),
 *   quindi nessuno stile cambia dopo l'idratazione.
 */
export function Snowfall({ count = 50, className }: SnowfallProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => {
        const size = 2 + hashUnit(index, 4) * 5;
        const style = {
          left: cssLength(hashUnit(index, 1) * 100, "%"),
          width: cssLength(size, "px"),
          height: cssLength(size, "px"),
          animationDuration: cssLength(8 + hashUnit(index, 3) * 8, "s"),
          animationDelay: cssLength(hashUnit(index, 2) * 8, "s"),
          "--flake-opacity": cssNumber(0.3 + hashUnit(index, 5) * 0.5),
        } as CSSProperties;

        return (
          <div
            key={index}
            className="snowflake absolute rounded-full bg-snow"
            style={style}
          />
        );
      })}
    </div>
  );
}

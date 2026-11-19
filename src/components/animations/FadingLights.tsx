import { cn } from "@/lib/utils";
import { cssLength, cssRgb } from "@/lib/css-values";
import { hashUnit } from "@/lib/deterministic";

interface FadingLightsProps {
  count?: number;
  colors?: string[];
  className?: string;
}

const DEFAULT_COLORS = ["#d4a843", "#c41e3a", "#4dabf7", "#4dbb7f"];

/**
 * Luci pulsanti decorative (es. finestre illuminate, lampioni).
 *
 * Come `Snowfall`: hash intero deterministico, stili inline già normalizzati
 * (colori in `rgb()`, durate con 2 decimali) e animazione in CSS puro, così il
 * markup del server coincide con quello idratato.
 * `prefers-reduced-motion` è gestito globalmente in `globals.css`.
 */
export function FadingLights({
  count = 12,
  colors = DEFAULT_COLORS,
  className,
}: FadingLightsProps) {
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;

  return (
    <div
      className={cn("pointer-events-none flex w-full justify-between gap-2", className)}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="fading-light h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor: cssRgb(palette[index % palette.length]),
            animationDuration: cssLength(2 + hashUnit(index, 2) * 2, "s"),
            animationDelay: cssLength(index * 0.25, "s"),
          }}
        />
      ))}
    </div>
  );
}

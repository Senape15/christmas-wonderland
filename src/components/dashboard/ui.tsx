import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NavIcon } from "@/components/layout/nav-icons";
import type { DayState } from "@/types/experience";

/** Anello di progresso riutilizzabile (hero e pannello progressi). */
export function ProgressRing({
  percent,
  size = 68,
  stroke = 6,
  className,
  label,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safe / 100);

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${safe}% completato`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#d4a843"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="relative text-sm font-bold tabular-nums text-cream-50">
        {safe}%
      </span>
    </div>
  );
}

/** Titolo di sezione con occhiello, descrizione e azione opzionale. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  id,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3 sm:gap-4",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-light/75">
          {eyebrow}
        </p>
        <h2
          id={id}
          className="mt-1 font-display text-xl font-bold leading-tight text-cream-50 sm:text-2xl"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-cream-300/65">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Barra di avanzamento accessibile, con percentuale già calcolata. */
export function ProgressBar({
  value,
  total,
  label,
  className,
  tone = "gold",
}: {
  value: number;
  total: number;
  label: string;
  className?: string;
  tone?: "gold" | "ice" | "red" | "pine";
}) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const tones: Record<typeof tone, string> = {
    gold: "bg-gradient-to-r from-gold-dark via-gold to-gold-light",
    ice: "bg-gradient-to-r from-ice-500 to-ice-300",
    red: "bg-gradient-to-r from-christmas-red-dark to-christmas-red-light",
    pine: "bg-gradient-to-r from-pine-600 to-pine-300",
  };

  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-pine-950/70",
        className
      )}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
      aria-valuetext={`${value} di ${total}`}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700", tones[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

const STATE_BADGE: Record<
  DayState,
  { label: string; icon: "lock" | "sparkles" | "play" | "check"; className: string }
> = {
  locked: {
    label: "In arrivo",
    icon: "lock",
    className: "border-cream-300/20 bg-cream-50/5 text-cream-200/70",
  },
  available: {
    label: "Pronta oggi",
    icon: "sparkles",
    className: "border-gold/50 bg-gold/15 text-gold-light",
  },
  opened: {
    label: "Da completare",
    icon: "play",
    className: "border-ice-300/45 bg-ice-900/40 text-ice-300",
  },
  completed: {
    label: "Completata",
    icon: "check",
    className:
      "border-christmas-red-light/45 bg-christmas-red/15 text-cream-50",
  },
};

export function DayStateBadge({
  state,
  className,
}: {
  state: DayState;
  className?: string;
}) {
  const badge = STATE_BADGE[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        badge.className,
        className
      )}
    >
      <NavIcon name={badge.icon} className="h-3.5 w-3.5" />
      {badge.label}
    </span>
  );
}

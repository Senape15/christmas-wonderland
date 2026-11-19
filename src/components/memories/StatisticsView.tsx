import type { StatisticsData } from "@/types/memories";
import { PhaseNotice, StatChip } from "./ui";

export function StatisticsView({ data }: { data: StatisticsData }) {
  const { stats } = data;

  return (
    <div>
      {!data.phase6Ready && <PhaseNotice />}

      <div className="mb-8 rounded-2xl border border-gold/30 bg-pine-950/60 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-light/80">
              Completamento complessivo
            </p>
            <p className="font-display text-4xl font-bold text-gold-light">
              {stats.overallPercent}%
            </p>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-cream-300/65">
            Calcolato lato server su giorni, oggetti, simboli, sfere, indizi e
            quiz già sbloccati. Nessun elemento futuro o duplicato viene conteggiato.
          </p>
        </div>
        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-pine-800"
          role="progressbar"
          aria-valuenow={stats.overallPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Percentuale complessiva di completamento"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-christmas-red to-gold transition-all duration-700"
            style={{ width: `${stats.overallPercent}%` }}
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Giorni completati" value={`${stats.daysCompleted}/${stats.totalDays}`} />
        <StatChip label="Ricordi" value={stats.memories} />
        <StatChip label="Oggetti" value={`${stats.objects}/${stats.objectsTotal}`} />
        <StatChip label="Simboli" value={`${stats.symbols}/${stats.symbolsTotal}`} />
        <StatChip label="Sfere" value={`${stats.spheres}/${stats.spheresTotal}`} />
        <StatChip label="Indizi" value={`${stats.clues}/${stats.cluesTotal}`} />
        <StatChip label="Quiz" value={`${stats.quizzesCompleted}/${stats.quizzesTotal}`} />
        <StatChip label="Finale" value={stats.finaleCompleted ? "Aperto" : stats.finaleAvailable ? "Disponibile" : "Da venire"} />
      </div>

      <h3 className="mb-3 font-display text-lg font-semibold text-cream-50">
        Dettaglio delle collezioni
      </h3>
      <div className="space-y-3">
        {stats.categories.map((category) => (
          <div key={category.key} className="rounded-xl border border-cream-300/12 bg-pine-950/45 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-cream-100">{category.label}</span>
              <span className="text-xs text-cream-300/70">
                {category.found}/{category.total} · {category.percent}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-pine-800">
              <div
                className="h-full rounded-full bg-gold/80"
                style={{ width: `${category.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

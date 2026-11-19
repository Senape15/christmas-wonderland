import type { MemoryStatistics, StatisticsCategory } from "@/types/memories";

/**
 * Statistiche complessive della memoria.
 *
 * Tutti i conteggi arrivano già filtrati dal server: niente giorni futuri,
 * niente contenuti inattivi o inaccessibili, niente duplicati. La percentuale
 * complessiva è calcolata solo su categorie con un totale noto (giorni,
 * oggetti, simboli, sfere, indizi, quiz); le memorie sono mostrate come
 * numero perché il loro totale non è predeterminabile.
 */

export interface StatisticsFacts {
  daysOpened: number;
  daysCompleted: number;
  totalDays: number;
  memories: number;
  objects: number;
  objectsTotal: number;
  symbols: number;
  symbolsTotal: number;
  spheres: number;
  spheresTotal: number;
  clues: number;
  cluesTotal: number;
  quizzesCompleted: number;
  quizzesTotal: number;
  finaleCompleted: boolean;
  finaleAvailable: boolean;
}

function percent(found: number, total: number): number {
  if (total <= 0) return 0;
  const value = Math.round((found / total) * 100);
  return Math.min(100, Math.max(0, value));
}

function category(
  key: string,
  label: string,
  found: number,
  total: number
): StatisticsCategory {
  return {
    key,
    label,
    found,
    total,
    percent: percent(found, total),
  };
}

export function buildMemoryStatistics(facts: StatisticsFacts): MemoryStatistics {
  const categories: StatisticsCategory[] = [
    category("giorni", "Giorni completati", facts.daysCompleted, facts.totalDays),
    category("oggetti", "Oggetti", facts.objects, facts.objectsTotal),
    category("simboli", "Simboli", facts.symbols, facts.symbolsTotal),
    category("sfere", "Sfere della memoria", facts.spheres, facts.spheresTotal),
    category("indizi", "Indizi", facts.clues, facts.cluesTotal),
    category("quiz", "Quiz", facts.quizzesCompleted, facts.quizzesTotal),
  ];

  let foundSum = 0;
  let totalSum = 0;
  for (const item of categories) {
    if (item.total <= 0) continue;
    foundSum += Math.min(item.found, item.total);
    totalSum += item.total;
  }

  return {
    daysOpened: facts.daysOpened,
    daysCompleted: facts.daysCompleted,
    totalDays: facts.totalDays,
    memories: facts.memories,
    objects: facts.objects,
    objectsTotal: facts.objectsTotal,
    symbols: facts.symbols,
    symbolsTotal: facts.symbolsTotal,
    spheres: facts.spheres,
    spheresTotal: facts.spheresTotal,
    clues: facts.clues,
    cluesTotal: facts.cluesTotal,
    quizzesCompleted: facts.quizzesCompleted,
    quizzesTotal: facts.quizzesTotal,
    finaleCompleted: facts.finaleCompleted,
    finaleAvailable: facts.finaleAvailable,
    overallPercent: percent(foundSum, totalSum),
    categories,
  };
}

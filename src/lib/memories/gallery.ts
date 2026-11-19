import type { FilterOption, GalleryImage } from "@/types/memories";
import { dayLabel } from "./format";

/**
 * Galleria immagini: ordinamento e filtri.
 *
 * Le URL arrivano già risolte dal server: per le foto personali vengono
 * generate URL firmate di breve durata, mai URL pubblici permanenti.
 */

export function buildGalleryData(
  images: readonly GalleryImage[]
): {
  images: GalleryImage[];
  categories: FilterOption[];
  days: FilterOption[];
} {
  const sorted = images
    .slice()
    .sort((a, b) => {
      const day = (a.dayNumber ?? 0) - (b.dayNumber ?? 0);
      if (day !== 0) return day;
      const category = a.category.localeCompare(b.category, "it");
      if (category !== 0) return category;
      return a.alt.localeCompare(b.alt, "it");
    })
    .filter((image, index, all) =>
      // La stessa immagine può provenire da più fonti: deduplica per URL.
      all.findIndex((item) => item.src === image.src) === index
    );

  const categoryCounts = new Map<string, number>();
  const dayCounts = new Map<number, number>();
  for (const image of sorted) {
    categoryCounts.set(
      image.category,
      (categoryCounts.get(image.category) ?? 0) + 1
    );
    if (image.dayNumber !== null) {
      dayCounts.set(image.dayNumber, (dayCounts.get(image.dayNumber) ?? 0) + 1);
    }
  }

  return {
    images: sorted,
    categories: Array.from(categoryCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b, "it"))
      .map(([category, count]) => ({
        value: category,
        label: category,
        count,
      })),
    days: Array.from(dayCounts.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, count]) => ({
        value: String(day),
        label: dayLabel(day),
        count,
      })),
  };
}

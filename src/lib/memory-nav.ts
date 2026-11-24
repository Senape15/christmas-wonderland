import type { NavIconName } from "@/components/layout/nav-icons";

export interface MemoryNavItem {
  href: string;
  label: string;
  description: string;
  icon: NavIconName;
}

/**
 * Voci condivise della navigazione del libro dei ricordi.
 *
 * L'emoji non è più il linguaggio visivo della dashboard: ogni voce porta
 * un'icona SVG (`icon`) e una riga di supporto (`description`) usata dal menu
 * a tutto schermo e dalla griglia "Ricordi" della home.
 */
export const MEMORY_NAV: readonly MemoryNavItem[] = [
  {
    href: "/dashboard",
    label: "Calendario",
    description: "Le 24 caselle dell'Avvento",
    icon: "calendar",
  },
  {
    href: "/dashboard/diario",
    label: "Diario",
    description: "La storia, giorno per giorno",
    icon: "diary",
  },
  {
    href: "/dashboard/album",
    label: "Album",
    description: "Le foto del tuo Avvento",
    icon: "album",
  },
  {
    href: "/dashboard/collezione",
    label: "Collezione",
    description: "Oggetti e simboli trovati",
    icon: "collection",
  },
  {
    href: "/dashboard/indizi",
    label: "Indizi",
    description: "I segnali della Stella",
    icon: "clue",
  },
  {
    href: "/dashboard/sfere",
    label: "Sfere",
    description: "I ricordi da custodire",
    icon: "sphere",
  },
  {
    href: "/dashboard/cronologia",
    label: "Cronologia",
    description: "Tutti i momenti importanti",
    icon: "timeline",
  },
  {
    href: "/dashboard/galleria",
    label: "Galleria",
    description: "Immagini e istantanee",
    icon: "gallery",
  },
  {
    href: "/dashboard/statistiche",
    label: "Statistiche",
    description: "Numeri e progressi",
    icon: "stats",
  },
  {
    href: "/dashboard/ricordo-24",
    label: "Ricordo 24",
    description: "Il gran finale",
    icon: "gift",
  },
  {
    href: "/dashboard/impostazioni",
    label: "Notifiche",
    description: "Promemoria e preferenze",
    icon: "bell",
  },
] as const;

import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Set di icone della shell dell'app.
 *
 * Sono SVG inline (nessuna dipendenza esterna) con tratto `currentColor`:
 * funzionano sia nei Server Component (MemoryShell) sia nei Client Component
 * (dock, menu, dashboard) e mantengono dimensioni/colore coerenti.
 */
export type NavIconName =
  | "tree"
  | "menu"
  | "close"
  | "home"
  | "calendar"
  | "flag"
  | "diary"
  | "album"
  | "collection"
  | "clue"
  | "sphere"
  | "timeline"
  | "gallery"
  | "stats"
  | "gift"
  | "bell"
  | "map"
  | "expand"
  | "shrink"
  | "lock"
  | "check"
  | "play"
  | "chevronRight"
  | "arrowRight"
  | "quiz"
  | "key"
  | "sparkles"
  | "user"
  | "logout"
  | "snow";

const ICONS: Record<NavIconName, ReactNode> = {
  tree: (
    <>
      <path d="M12 3 7.5 9h3L6 15h5v4h2v-4h5l-4.5-6h3L12 3Z" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  home: (
    <>
      <path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9Z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 4c4-2 7 2 12 0v9c-5 2-8-2-12 0" />
    </>
  ),
  diary: (
    <>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v18H7.5A2.5 2.5 0 0 0 5 22V4.5Z" />
      <path d="M5 18a2.5 2.5 0 0 1 2.5-2.5H19M9 6h6" />
    </>
  ),
  album: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 5-5 4 4 3-3 4 4" />
    </>
  ),
  collection: (
    <>
      <path d="m12 3 2.6 5.4 6 .8-4.3 4.2 1 6-5.3-2.9-5.3 2.9 1-6L3.4 9.2l6-.8L12 3Z" />
    </>
  ),
  clue: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5M8.5 9a2 2 0 0 1 2-2" />
    </>
  ),
  sphere: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v3l2 2" />
      <path d="M18 4.5 19 3M20.5 7l1.5-.5" />
    </>
  ),
  timeline: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  gallery: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  stats: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="2" />
      <path d="M2 9h20M12 9v12M12 9c-3 0-5-1-5-3s3-2 5 3ZM12 9c3 0 5-1 5-3s-3-2-5 3Z" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  expand: (
    <>
      <path d="M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4M16 21h4a1 1 0 0 0 1-1v-4" />
    </>
  ),
  shrink: (
    <>
      <path d="M3 8h4a1 1 0 0 0 1-1V3M21 8h-4a1 1 0 0 1-1-1V3M3 16h4a1 1 0 0 1 1 1v4M21 16h-4a1 1 0 0 0-1 1v4" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </>
  ),
  check: <path d="m4 12.5 5 5L20 6.5" />,
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  arrowRight: <path d="M4 12h16m-6-6 6 6-6 6" />,
  quiz: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.2 1-1.2 1.8v.3" />
      <path d="M12 17h.01" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="m11 11 9 9M16 16l2-2M19 19l2-2" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" />
      <path d="M15 8l4 4-4 4M19 12H9" />
    </>
  ),
  snow: (
    <>
      <path d="M12 2v20M4 6l16 12M20 6 4 18" />
      <path d="m9 4 3 3 3-3M9 20l3-3 3 3" />
    </>
  ),
};

interface NavIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: NavIconName;
  className?: string;
}

export function NavIcon({ name, className, ...props }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-5 w-5 shrink-0", className)}
      {...props}
    >
      {ICONS[name]}
    </svg>
  );
}

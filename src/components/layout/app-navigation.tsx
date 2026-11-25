"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NavIcon, type NavIconName } from "@/components/layout/nav-icons";

interface DockItem {
  href: string;
  label: string;
  icon: NavIconName;
  isActive: (pathname: string) => boolean;
}

const DOCK_ITEMS: readonly DockItem[] = [
  {
    href: "/dashboard",
    label: "Villaggio",
    icon: "map",
    isActive: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/dashboard/calendario",
    label: "Calendario",
    icon: "calendar",
    isActive: (pathname) => pathname.startsWith("/dashboard/calendario"),
  },
  {
    href: "/dashboard/ricordi",
    label: "Ricordi",
    icon: "diary",
    isActive: (pathname) =>
      pathname.startsWith("/dashboard/ricordi") ||
      pathname.startsWith("/dashboard/ricordo-24"),
  },
  {
    href: "/dashboard/impostazioni",
    label: "Impostazioni",
    icon: "user",
    isActive: (pathname) => pathname.startsWith("/dashboard/impostazioni"),
  },
];

/**
 * Navigazione principale dell'app: quattro voci, sempre visibili.
 *
 * Il villaggio è la schermata iniziale; calendario, ricordi e impostazioni
 * sono le uniche altre destinazioni, così la dashboard resta leggera.
 */
export function AppDock() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-4 sm:px-4"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-1 rounded-[26px] border border-cream-300/15 bg-pine-950/90 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        {DOCK_ITEMS.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-2 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                active
                  ? "bg-gold/15 text-gold-light"
                  : "text-cream-200/60 hover:bg-white/5 hover:text-cream-50"
              )}
            >
              <NavIcon
                name={item.icon}
                className={cn(
                  "h-[19px] w-[19px]",
                  active && "drop-shadow-[0_0_8px_rgba(212,168,67,0.45)]"
                )}
              />
              <span className="max-w-full truncate">{item.label}</span>
              {active && (
                <span className="absolute top-1 h-1 w-5 rounded-full bg-gold" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

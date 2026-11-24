"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MEMORY_NAV } from "@/lib/memory-nav";
import { NavIcon, type NavIconName } from "@/components/layout/nav-icons";
import { LogoutButton } from "@/components/layout/logout-button";
import type { CurrentUser } from "@/lib/auth";

interface AppNavigationContextValue {
  openMenu: () => void;
}

const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getHashSnapshot() {
  return window.location.hash;
}

function getHashServerSnapshot() {
  return "";
}

interface DockItem {
  href: string;
  label: string;
  icon: NavIconName;
  section?: string;
}

const DOCK_ITEMS: readonly DockItem[] = [
  { href: "/dashboard", label: "Oggi", icon: "home", section: "home" },
  {
    href: "/dashboard#calendario",
    label: "Calendario",
    icon: "calendar",
    section: "calendario",
  },
  { href: "/dashboard#sfide", label: "Sfide", icon: "flag", section: "sfide" },
  { href: "/dashboard/diario", label: "Ricordi", icon: "diary", section: "ricordi" },
];

const MENU_GROUPS = [
  {
    title: "Il villaggio",
    items: [
      {
        href: "/dashboard",
        label: "Oggi",
        description: "La tua dashboard",
        icon: "home" as NavIconName,
      },
      {
        href: "/dashboard#mappa",
        label: "Mappa del villaggio",
        description: "Esplora le sei zone",
        icon: "map" as NavIconName,
      },
      {
        href: "/dashboard#calendario",
        label: "Calendario dell'Avvento",
        description: "24 giorni, 24 sorprese",
        icon: "calendar" as NavIconName,
      },
      {
        href: "/dashboard#sfide",
        label: "Sfide",
        description: "Le missioni del giorno",
        icon: "flag" as NavIconName,
      },
    ],
  },
  {
    title: "Il libro dei ricordi",
    items: MEMORY_NAV.filter(
      (item) =>
        item.href !== "/dashboard" && item.href !== "/dashboard/impostazioni"
    ),
  },
  {
    title: "Account",
    items: [
      {
        href: "/dashboard/impostazioni",
        label: "Notifiche",
        description: "Promemoria e preferenze",
        icon: "bell" as NavIconName,
      },
    ],
  },
];

/**
 * Shell di navigazione condivisa da tutte le pagine autenticate.
 *
 * - dock inferiore (app-like) sempre visibile;
 * - menu a tutto schermo con `<dialog>` nativo: focus trap, chiusura con Esc
 *   e clic sullo sfondo gestiti dal browser;
 * - link grandi, descrizioni e icone per rendere ogni sezione raggiungibile
 *   in un tocco.
 */
export function AppNavigationProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef("");

  const openMenu = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
  }, []);

  const closeMenu = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const handleDialogClose = useCallback(() => {
    document.body.style.overflow = previousOverflow.current;
  }, []);

  const identity = user.name ?? user.email;
  const initial = identity.trim().charAt(0).toUpperCase() || "?";

  return (
    <AppNavigationContext.Provider value={{ openMenu }}>
      {children}
      <AppDock />

      <dialog
        ref={dialogRef}
        id="app-menu"
        aria-labelledby="app-menu-title"
        onClose={handleDialogClose}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-[30px] border border-cream-300/15 bg-pine-950 p-0 text-cream-50 shadow-[0_-20px_80px_rgba(0,0,0,0.55)] backdrop:bg-pine-950/80 backdrop:backdrop-blur-sm sm:inset-0 sm:m-auto sm:max-h-[82dvh] sm:max-w-xl sm:rounded-[30px]"
      >
        <div className="flex max-h-[88dvh] flex-col sm:max-h-[82dvh]">
          <div className="relative shrink-0 border-b border-cream-300/10 bg-gradient-to-br from-pine-800/70 to-pine-950 px-5 pb-4 pt-3 sm:px-6">
            <span
              aria-hidden="true"
              className="mx-auto mb-3 block h-1 w-10 rounded-full bg-cream-300/25 sm:hidden"
            />
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-christmas-red to-christmas-red-dark text-lg font-bold text-gold-light shadow-[var(--shadow-glow-red)]">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gold-light/75">
                  Il tuo villaggio
                </p>
                <h2
                  id="app-menu-title"
                  className="truncate font-display text-lg font-bold text-cream-50"
                >
                  {identity}
                </h2>
                <p className="truncate text-[11px] text-cream-300/55">
                  {user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Chiudi il menu"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cream-300/15 text-cream-200/70 transition-colors hover:border-gold/40 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <NavIcon name="close" className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
            {MENU_GROUPS.map((group) => (
              <section key={group.title} className="mb-5 last:mb-0">
                <h3 className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cream-300/45">
                  {group.title}
                </h3>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={closeMenu}
                        className="group flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-cream-50/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/20 bg-gold/10 text-gold-light">
                          <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-cream-50">
                            {item.label}
                          </span>
                          <span className="block truncate text-[11px] text-cream-300/55">
                            {item.description}
                          </span>
                        </span>
                        <NavIcon
                          name="chevronRight"
                          className="h-4 w-4 text-cream-300/35 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-light"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <div className="border-t border-cream-300/10 pt-4">
              <LogoutButton
                label="Esci dall'account"
                className="w-full border border-christmas-red/30 bg-christmas-red/10 text-christmas-red-light hover:bg-christmas-red/20 hover:text-cream-50"
              />
            </div>
          </div>
        </div>
      </dialog>
    </AppNavigationContext.Provider>
  );
}

export function MenuButton({
  className,
  label = "Apri il menu",
}: {
  className?: string;
  label?: string;
}) {
  const context = useContext(AppNavigationContext);
  return (
    <button
      type="button"
      onClick={() => context?.openMenu()}
      aria-label={label}
      aria-haspopup="dialog"
      aria-controls="app-menu"
      className={cn(
        "grid h-11 w-11 place-items-center rounded-2xl border border-cream-300/15 bg-pine-950/50 text-cream-100 backdrop-blur transition-colors hover:border-gold/40 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        className
      )}
    >
      <NavIcon name="menu" className="h-5 w-5" />
    </button>
  );
}

function AppDock() {
  const pathname = usePathname();
  const hash = useSyncExternalStore(
    subscribeToHash,
    getHashSnapshot,
    getHashServerSnapshot
  );
  const context = useContext(AppNavigationContext);

  const isDashboard = pathname === "/dashboard";
  const activeSection = isDashboard
    ? hash === "#calendario"
      ? "calendario"
      : hash === "#sfide"
        ? "sfide"
        : "home"
    : pathname.startsWith("/dashboard/")
      ? "ricordi"
      : "home";

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-4 sm:px-4"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-1 rounded-[26px] border border-cream-300/15 bg-pine-950/90 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        {DOCK_ITEMS.map((item) => {
          const isActive = item.section === activeSection;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-2 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                isActive
                  ? "bg-gold/15 text-gold-light"
                  : "text-cream-200/60 hover:bg-white/5 hover:text-cream-50"
              )}
            >
              <NavIcon
                name={item.icon}
                className={cn(
                  "h-[19px] w-[19px]",
                  isActive && "drop-shadow-[0_0_8px_rgba(212,168,67,0.45)]"
                )}
              />
              <span className="max-w-full truncate">{item.label}</span>
              {isActive && (
                <span className="absolute top-1 h-1 w-5 rounded-full bg-gold" />
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => context?.openMenu()}
          aria-label="Apri tutte le sezioni"
          aria-haspopup="dialog"
          aria-controls="app-menu"
          className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-2 text-[10px] font-semibold text-cream-200/60 transition-colors hover:bg-white/5 hover:text-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <NavIcon name="menu" className="h-[19px] w-[19px]" />
          <span className="max-w-full truncate">Menu</span>
        </button>
      </div>
    </nav>
  );
}

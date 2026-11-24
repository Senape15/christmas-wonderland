import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { Snowfall } from "@/components/animations/Snowfall";
import { NavIcon } from "@/components/layout/nav-icons";
import { MenuButton } from "@/components/layout/app-navigation";
import { MEMORY_NAV } from "@/lib/memory-nav";

export function MemoryShell({
  user,
  active,
  title,
  subtitle,
  children,
}: {
  user: CurrentUser;
  active: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const activeItem = MEMORY_NAV.find((item) => item.href === active);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-pine-950 text-cream-50">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(212,168,67,0.10),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(196,30,58,0.10),transparent_40%)]"
      />
      <Snowfall count={32} className="fixed inset-0 z-0 opacity-50" />

      <header className="sticky top-0 z-40 border-b border-cream-300/10 bg-pine-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2.5 px-4 sm:px-6">
          <Link
            href="/dashboard"
            aria-label="Torna alla dashboard"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cream-300/15 bg-pine-900/50 text-cream-100 transition-colors hover:border-gold/40 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <NavIcon name="arrowRight" className="h-5 w-5 rotate-180" />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light/65">
              Il libro dei ricordi
            </p>
            <p className="truncate text-sm font-bold text-cream-50">
              Christmas Wonderland
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[12rem] truncate text-xs text-cream-300/55 sm:inline">
              {user.name ?? user.email}
            </span>
            <MenuButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-32 pt-5 sm:px-6 sm:pt-6">
        <div className="memory-book rounded-[30px] border border-gold/20 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="mb-6 flex items-start gap-3 border-b border-gold/15 pb-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold-light">
              <NavIcon name={activeItem?.icon ?? "diary"} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-light/70">
                Ricordi di Natale
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-cream-50 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-cream-200/70">
                {subtitle}
              </p>
            </div>
          </div>
          {children}
        </div>
      </main>

      <footer className="relative z-10 pb-28 text-center text-[11px] text-cream-300/40">
        Christmas Wonderland · Ogni ricordo è solo tuo
      </footer>
    </div>
  );
}

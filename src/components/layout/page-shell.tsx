import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { Snowfall } from "@/components/animations/Snowfall";
import { NavIcon } from "@/components/layout/nav-icons";

/**
 * Guscio leggero delle sezioni interne dell'app (calendario, ricordi,
 * impostazioni). Il villaggio resta la schermata principale e la navigazione
 * vive nella dock inferiore condivisa.
 */
export function PageShell({
  user,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  user: CurrentUser;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const identity = user.name ?? user.email;
  const initial = identity.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-pine-950 text-cream-50">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_-5%,rgba(212,168,67,0.12),transparent_42%),radial-gradient(circle_at_85%_8%,rgba(196,30,58,0.12),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(28,61,90,0.22),transparent_45%)]"
      />
      <Snowfall count={32} className="fixed inset-0 z-0 opacity-50" />

      <header className="sticky top-0 z-40 border-b border-cream-300/10 bg-pine-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2.5 px-4 sm:px-6">
          <Link
            href="/dashboard"
            aria-label="Torna al villaggio"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cream-300/15 bg-pine-900/50 text-cream-100 transition-colors hover:border-gold/40 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <NavIcon name="arrowRight" className="h-5 w-5 rotate-180" />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light/65">
              {eyebrow}
            </p>
            <p className="truncate text-sm font-bold text-cream-50">
              Christmas Wonderland
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[12rem] truncate text-xs text-cream-300/55 sm:inline">
              {identity}
            </span>
            <Link
              href="/dashboard/impostazioni"
              aria-label="Apri le impostazioni"
              className="grid h-10 w-10 place-items-center rounded-full border border-gold/25 bg-gold/10 text-xs font-bold text-gold-light transition-colors hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {initial}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-5 sm:px-6 sm:pt-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold leading-tight text-cream-50 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-cream-200/70">
            {subtitle}
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}

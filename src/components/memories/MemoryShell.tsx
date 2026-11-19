import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { Snowfall } from "@/components/animations/Snowfall";
import { FadingLights } from "@/components/animations/FadingLights";
import { LogoutButton } from "@/components/layout/logout-button";
import { cn } from "@/lib/utils";
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
  return (
    <div className="relative min-h-screen overflow-hidden bg-pine-900 text-cream-50">
      <Snowfall count={36} className="fixed inset-0 z-0 opacity-60" />

      <header className="relative z-10 border-b border-cream-300/10 bg-pine-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-christmas-red text-lg shadow-[var(--shadow-glow-red)]"
              aria-label="Torna al calendario"
            >
              🎄
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gold-light">
                Christmas Wonderland
              </h1>
              <p className="text-xs text-cream-300/60">Il libro dei ricordi</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-cream-300/60 sm:inline">
              {user.name ?? user.email}
            </span>
            <LogoutButton />
          </div>
        </div>

        <nav aria-label="Sezioni dei ricordi" className="mx-auto max-w-6xl px-3 pb-2 sm:px-6">
          <ul className="flex flex-wrap items-center justify-center gap-1">
            {MEMORY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active === item.href ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    active === item.href
                      ? "bg-gold text-pine-950 shadow-[var(--shadow-glow-gold)]"
                      : "text-cream-200/70 hover:bg-cream-300/10 hover:text-cream-50"
                  )}
                >
                  <span aria-hidden="true">{item.emoji}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="memory-book rounded-3xl border border-gold/25 p-5 shadow-[var(--shadow-glow-gold)] sm:p-8">
          <FadingLights count={10} className="mb-4" />
          <div className="mb-7 border-b border-gold/20 pb-5">
            <p className="text-xs uppercase tracking-[0.24em] text-gold-light/80">
              Ricordi di Natale
            </p>
            <h2 className="font-display text-2xl font-bold text-cream-50 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cream-200/75">
              {subtitle}
            </p>
          </div>
          {children}
        </div>
      </main>

      <footer className="relative z-10 pb-6 text-center text-xs text-cream-300/40">
        Christmas Wonderland · Ogni ricordo è solo tuo
      </footer>
    </div>
  );
}

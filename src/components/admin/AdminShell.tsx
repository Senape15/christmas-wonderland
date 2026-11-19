"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_GROUPS: { label: string; items: { href: string; label: string }[] }[] = [
  {
    label: "PANORAMICA",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    label: "CONTENUTI",
    items: [
      { href: "/admin/days", label: "Giorni dell'Avvento" },
      { href: "/admin/locations", label: "Luoghi e mappa" },
      { href: "/admin/gifts", label: "Regali fisici" },
      { href: "/admin/physical-contents", label: "Contenuti scatole" },
      { href: "/admin/final-box", label: "Scatola finale" },
    ],
  },
  {
    label: "ESPERIENZA",
    items: [
      { href: "/admin/quizzes", label: "Quiz e prove" },
      { href: "/admin/symbols", label: "Simboli" },
      { href: "/admin/memories", label: "Sfere dei ricordi" },
      { href: "/admin/special-memories", label: "Ricordi speciali" },
      { href: "/admin/photos", label: "Fotografie" },
      { href: "/admin/messages", label: "Messaggi" },
      { href: "/admin/notifications", label: "Notifiche" },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { href: "/admin/users", label: "Utenti" },
      { href: "/admin/simulation", label: "Simulazione date" },
    ],
  },
];

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-pine-950 text-cream-50">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-cream-300/10 bg-pine-900/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" className="font-display text-lg font-bold text-gold-light">
          Christmas Wonderland
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Apri navigazione"
          aria-expanded={open}
          className="rounded-lg border border-cream-300/20 px-3 py-1.5 text-sm"
        >
          ☰
        </button>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto border-r border-cream-300/10 bg-pine-900 px-4 py-6 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="mb-8 px-2">
            <p className="font-display text-lg font-bold leading-tight text-gold-light">
              Christmas Wonderland
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-cream-200/50">
              Pannello amministrativo
            </p>
          </div>

          <nav aria-label="Navigazione amministrativa" className="space-y-6">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.18em] text-cream-200/40">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active =
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-gold/15 font-semibold text-gold-light"
                              : "text-cream-100/75 hover:bg-cream-50/5 hover:text-cream-50"
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mt-10 border-t border-cream-300/10 px-2 pt-4">
            <p className="truncate text-xs text-cream-200/60" title={email}>
              {email}
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

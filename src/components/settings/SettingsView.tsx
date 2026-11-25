"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/layout/logout-button";
import { NavIcon } from "@/components/layout/nav-icons";
import { NotificationSettings } from "@/components/pwa/NotificationSettings";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth";
import type { NotificationOverview } from "@/types/notifications";

type Tab = "account" | "notifiche";

export function SettingsView({
  user,
  overview,
  vapidPublicKey,
}: {
  user: CurrentUser;
  overview: NotificationOverview;
  vapidPublicKey: string;
}) {
  const [tab, setTab] = useState<Tab>("account");

  const identity = user.name ?? user.email;
  const initial = identity.trim().charAt(0).toUpperCase() || "?";

  const tabs: { key: Tab; label: string; icon: "user" | "bell" }[] = [
    { key: "account", label: "Account", icon: "user" },
    { key: "notifiche", label: "Notifiche", icon: "bell" },
  ];

  return (
    <div>
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Impostazioni"
      >
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
              tab === item.key
                ? "border-gold bg-gold text-pine-950"
                : "border-cream-300/20 text-cream-200/75 hover:border-gold/50 hover:text-cream-50"
            )}
          >
            <NavIcon name={item.icon} className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <div className="space-y-4">
          <section className="rounded-[28px] border border-cream-300/12 bg-pine-900/35 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-christmas-red to-christmas-red-dark text-2xl font-bold text-gold-light shadow-[var(--shadow-glow-red)]">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-light/70">
                  Il tuo account
                </p>
                <h2 className="mt-0.5 truncate font-display text-xl font-bold text-cream-50">
                  {identity}
                </h2>
                <p className="truncate text-sm text-cream-300/60">{user.email}</p>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-cream-300/10 bg-pine-950/40 p-4">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cream-300/50">
                  Nome
                </dt>
                <dd className="mt-1 truncate text-sm text-cream-100">
                  {user.name ?? "Non impostato"}
                </dd>
              </div>
              <div className="rounded-2xl border border-cream-300/10 bg-pine-950/40 p-4">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cream-300/50">
                  Email
                </dt>
                <dd className="mt-1 truncate text-sm text-cream-100">
                  {user.email}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setTab("notifiche")}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-gold/35 bg-gold/10 px-4 py-2.5 text-sm font-semibold text-gold-light transition-colors hover:border-gold hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <NavIcon name="bell" className="h-4 w-4" />
                Gestisci le notifiche
              </button>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cream-300/20 px-4 py-2.5 text-sm font-semibold text-cream-100 transition-colors hover:border-gold/45 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <NavIcon name="stats" className="h-4 w-4" />
                  Pannello admin
                </Link>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-cream-300/12 bg-pine-900/35 p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-cream-50">
              Sessione
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-cream-200/70">
              Esci dall&apos;account su questo dispositivo. Le notifiche e i
              dati restano salvati e li ritroverai al prossimo accesso.
            </p>
            <LogoutButton
              label="Esci dall'account"
              className="mt-4 w-full sm:w-auto"
            />
          </section>
        </div>
      )}

      {tab === "notifiche" && (
        <NotificationSettings overview={overview} vapidPublicKey={vapidPublicKey} />
      )}
    </div>
  );
}

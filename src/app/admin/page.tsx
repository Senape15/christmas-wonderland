import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats, getDayOverview } from "@/lib/services/admin";
import { SectionHeader, StatCard } from "@/components/admin/ui";

export const instant = false;

const QUICK_LINKS = [
  { href: "/admin/days", label: "Giorni", hint: "Date, titoli e descrizioni" },
  { href: "/admin/locations", label: "Villaggio", hint: "Zone, hotspot e testi" },
  { href: "/admin/gifts", label: "Regali", hint: "Inventario fisico" },
  { href: "/admin/physical-contents", label: "Scatole", hint: "Indizi e password" },
  { href: "/admin/final-box", label: "Scatola finale", hint: "24 dicembre" },
  { href: "/admin/quizzes", label: "Quiz", hint: "Domande e risposte" },
  { href: "/admin/messages", label: "Messaggi", hint: "Elfi e segreti" },
  { href: "/admin/simulation", label: "Simulazione", hint: "Anteprima date" },
];

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [stats, overview] = await Promise.all([
    getDashboardStats(),
    getDayOverview(),
  ]);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Dashboard amministrativa"
        description="Stato reale dell'esperienza, letto direttamente da Supabase."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Giorni configurati" value={stats.totalDays} hint="1–24 dicembre" />
        <StatCard label="Giorni sbloccati" value={stats.unlockedDays} tone="ice" hint="in base alla data reale" />
        <StatCard label="Aperture totali" value={stats.totalOpenings} tone="pine" hint=" registrate dagli utenti" />
        <StatCard label="Regali configurati" value={stats.giftsConfigured} hint={`${stats.giftsMissing} mancanti`} />
        <StatCard label="Indizi inseriti" value={stats.cluesInserted} tone="ice" />
        <StatCard label="Quiz disponibili" value={stats.quizzes} tone="red" />
        <StatCard label="Messaggi elfi" value={stats.elfMessages} />
        <StatCard label="Messaggi segreti" value={stats.secretMessages} />
        <StatCard label="Utenti registrati" value={stats.users} tone="pine" />
        <StatCard label="Notifiche" value={stats.notifications} tone="red" />
      </div>

      <section className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-light/80">
          Prossimo evento programmato
        </p>
        {stats.nextEvent ? (
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-lg font-semibold text-cream-50">{stats.nextEvent.label}</p>
            <p className="text-sm text-cream-200/70">
              {new Date(stats.nextEvent.date).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-cream-200/60">Nessun evento futuro configurato.</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-cream-50">Panoramica dei 24 giorni</h2>
            <p className="text-sm text-cream-200/60">Configurazione reale di ogni tappa.</p>
          </div>
          <Link href="/admin/days" className="text-sm text-gold-light hover:underline">
            Gestisci →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {overview.map((day) => (
            <Link
              key={day.dayNumber}
              href="/admin/days"
              className="rounded-xl border border-cream-300/15 bg-cream-50/[0.04] p-3 transition-colors hover:border-gold/40 hover:bg-gold/5"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold text-gold-light">
                  {String(day.dayNumber).padStart(2, "0")}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${day.unlocked ? "bg-ice-300" : "bg-cream-300/30"}`}
                  title={day.unlocked ? "Sbloccato" : "Bloccato"}
                />
              </div>
              <p className="mt-1 truncate text-xs font-medium text-cream-100/90" title={day.title}>
                {day.title}
              </p>
              <p className="mt-1 text-[11px] text-cream-200/50">
                {new Date(day.unlockDate).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" })}
              </p>
              <div className="mt-2 space-y-0.5 border-t border-cream-300/10 pt-2 text-[11px] text-cream-200/60">
                <p title={day.location ?? undefined}>📍 {day.location ?? "Nessun luogo"}</p>
                <p title={day.gift ?? undefined}>🎁 {day.gift ?? "Nessun regalo"}</p>
                <p>📄 {day.clues} indizi · ❓ {day.quizzes} quiz</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-cream-50">Accesso rapido</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-cream-300/15 bg-pine-900/50 p-4 transition-colors hover:border-gold/50"
            >
              <p className="font-semibold text-cream-50">{link.label}</p>
              <p className="mt-1 text-xs text-cream-200/55">{link.hint}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

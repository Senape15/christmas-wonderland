import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getExperienceData } from "@/lib/services/experience";
import { PageShell } from "@/components/layout/page-shell";
import { CalendarView } from "@/components/calendar/CalendarView";

export const metadata = {
  title: "Calendario dell'Avvento · Christmas Wonderland",
};

async function CalendarData({
  searchParams,
}: {
  searchParams: Promise<{ giorno?: string | string[] }>;
}) {
  // I parametri URL vengono letti dentro il boundary Suspense per non
  // bloccare la shell della pagina (cacheComponents / partialPrefetching).
  const params = await searchParams;
  const raw = Array.isArray(params.giorno) ? params.giorno[0] : params.giorno;
  const parsed = Number(raw);
  const initialDay =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= 24 ? parsed : null;

  const user = await requireUser();
  const experience = await getExperienceData(user);

  return (
    <PageShell
      user={user}
      eyebrow="Il calendario"
      title="I 24 giorni dell'Avvento"
      subtitle="Una casella al giorno. Tocca quella disponibile per aprire la sorpresa, rileggere i contenuti e completare le missioni."
    >
      <CalendarView experience={experience} initialDay={initialDay} />
    </PageShell>
  );
}

export default function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ giorno?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pine-950 text-cream-100">
          <p className="text-sm text-cream-300/70">
            Sto preparando il calendario…
          </p>
        </div>
      }
    >
      <CalendarData searchParams={searchParams} />
    </Suspense>
  );
}

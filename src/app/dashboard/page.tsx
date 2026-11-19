import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getExperienceData } from "@/lib/services/experience";
import { getVillageData } from "@/lib/services/village";
import { formatTodayLabel, getAppYear } from "@/lib/utils";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

async function DashboardData({
  searchParams,
}: {
  searchParams: Promise<{ giorno?: string | string[] }>;
}) {
  // I dati dell'URL vengono letti qui dentro, non nella pagina: senza questa
  // separazione la route bloccherebbe la navigazione (errore Next
  // `instant-shell-url-data`). Il resto della pagina resta così nel guscio.
  const params = await searchParams;
  const raw = Array.isArray(params.giorno) ? params.giorno[0] : params.giorno;
  const parsed = Number(raw);
  const initialDay =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= 24 ? parsed : null;

  const user = await requireUser();
  // Un'unica lettura server-side: calendario con i 4 stati, progressi reali
  // dell'utente e simulazione admin (se attiva per questo amministratore).
  const experience = await getExperienceData(user);
  // La mappa usa solo gli stati già filtrati dal calendario: nessun dato di
  // giorni futuri lascia il server.
  const village = await getVillageData(experience.calendar);
  // Formattata qui: il client riceve una stringa già pronta, identica a quella
  // renderizzata dal server (nessun mismatch di idratazione sul fuso orario).
  const todayLabel = formatTodayLabel();
  const todayYear = getAppYear();

  return (
    <DashboardContent
      user={user}
      experience={experience}
      village={village}
      todayLabel={todayLabel}
      todayYear={todayYear}
      initialDay={initialDay}
    />
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ giorno?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pine-900 text-cream-100">
          <p className="text-sm text-cream-300/70">
            Sto preparando il villaggio…
          </p>
        </div>
      }
    >
      <DashboardData searchParams={searchParams} />
    </Suspense>
  );
}

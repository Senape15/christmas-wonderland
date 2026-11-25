import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getMemoriesHubData } from "@/lib/services/memories";
import { PageShell } from "@/components/layout/page-shell";
import { MemoriesHub } from "@/components/memories/MemoriesHub";

export const metadata = {
  title: "Ricordi · Christmas Wonderland",
};

async function MemoriesData() {
  const user = await requireUser();
  const data = await getMemoriesHubData(user);

  return (
    <PageShell
      user={user}
      eyebrow="Il libro dei ricordi"
      title="Le tue giornate"
      subtitle="Tutti i ricordi raccolti giorno per giorno, le foto e le sfere della memoria. Solo ciò che hai davvero sbloccato."
    >
      <MemoriesHub
        timeline={data.timeline}
        album={data.album}
        collection={data.collection}
      />
    </PageShell>
  );
}

export default function MemoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pine-950 text-cream-100">
          <p className="text-sm text-cream-300/70">
            Sto aprendo il libro dei ricordi…
          </p>
        </div>
      }
    >
      <MemoriesData />
    </Suspense>
  );
}

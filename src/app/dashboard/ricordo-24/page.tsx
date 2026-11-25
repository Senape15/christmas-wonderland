import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getFinaleData } from "@/lib/services/memories";
import { PageShell } from "@/components/layout/page-shell";
import { FinaleView } from "@/components/memories/FinaleView";

export const metadata = {
  title: "Il ricordo del 24 dicembre · Christmas Wonderland",
};

async function FinaleData() {
  const user = await requireUser();
  const data = await getFinaleData(user);

  return (
    <PageShell
      user={user}
      eyebrow="Il gran finale"
      title="Il ricordo del 24 dicembre"
      subtitle="Il riepilogo finale del viaggio e la rivelazione, disponibili solo quando la Stella torna a brillare."
    >
      <FinaleView data={data} />
    </PageShell>
  );
}

export default function FinalePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pine-950 text-cream-100">
          <p className="text-sm text-cream-300/70">
            Sto preparando il ricordo finale…
          </p>
        </div>
      }
    >
      <FinaleData />
    </Suspense>
  );
}

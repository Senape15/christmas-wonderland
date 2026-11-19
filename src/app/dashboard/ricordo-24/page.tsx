import { requireUser } from "@/lib/auth";
import { getFinaleData } from "@/lib/services/memories";
import { MemoryShell } from "@/components/memories/MemoryShell";
import { FinaleView } from "@/components/memories/FinaleView";

export default async function FinalePage() {
  const user = await requireUser();
  const data = await getFinaleData(user);

  return (
    <MemoryShell
      user={user}
      active="/dashboard/ricordo-24"
      title="Il ricordo del 24 dicembre"
      subtitle="Il riepilogo finale del viaggio e la rivelazione, disponibili solo quando la Stella torna a brillare."
    >
      <FinaleView data={data} />
    </MemoryShell>
  );
}

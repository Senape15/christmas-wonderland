import { requireUser } from "@/lib/auth";
import { getStatisticsData } from "@/lib/services/memories";
import { MemoryShell } from "@/components/memories/MemoryShell";
import { StatisticsView } from "@/components/memories/StatisticsView";

export const instant = false;

export default async function StatisticsPage() {
  const user = await requireUser();
  const data = await getStatisticsData(user);

  return (
    <MemoryShell
      user={user}
      active="/dashboard/statistiche"
      title="Statistiche delle collezioni"
      subtitle="Un quadro completo dei tuoi progressi, calcolato esclusivamente sui contenuti che hai davvero sbloccato."
    >
      <StatisticsView data={data} />
    </MemoryShell>
  );
}

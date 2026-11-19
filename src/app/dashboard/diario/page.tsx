import { requireUser } from "@/lib/auth";
import { getDiaryData } from "@/lib/services/memories";
import { MemoryShell } from "@/components/memories/MemoryShell";
import { DiaryView } from "@/components/memories/DiaryView";

export default async function DiaryPage() {
  const user = await requireUser();
  const data = await getDiaryData(user);

  return (
    <MemoryShell
      user={user}
      active="/dashboard/diario"
      title="Il tuo diario"
      subtitle="Tutti gli eventi importanti del tuo Avvento, annotati automaticamente e ordinati nel tempo."
    >
      <DiaryView data={data} />
    </MemoryShell>
  );
}

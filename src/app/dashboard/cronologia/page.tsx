import { requireUser } from "@/lib/auth";
import { getTimelineData } from "@/lib/services/memories";
import { MemoryShell } from "@/components/memories/MemoryShell";
import { TimelineView } from "@/components/memories/TimelineView";

export default async function TimelinePage() {
  const user = await requireUser();
  const data = await getTimelineData(user);

  return (
    <MemoryShell
      user={user}
      active="/dashboard/cronologia"
      title={"Cronologia dell'Avvento"}
      subtitle="Dal 1° al 24 dicembre: ogni giornata con i suoi ricordi, oggetti, quiz e indizi."
    >
      <TimelineView data={data} />
    </MemoryShell>
  );
}

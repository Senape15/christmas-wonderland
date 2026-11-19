import { requireUser } from "@/lib/auth";
import { getCluesData } from "@/lib/services/memories";
import { MemoryShell } from "@/components/memories/MemoryShell";
import { CluesView } from "@/components/memories/CluesView";

export const instant = false;

export default async function CluesPage() {
  const user = await requireUser();
  const data = await getCluesData(user);

  return (
    <MemoryShell
      user={user}
      active="/dashboard/indizi"
      title="Archivio degli indizi"
      subtitle="Rileggi gli indizi scoperti e scopri i legami che li uniscono, senza anticipare la fine della storia."
    >
      <CluesView data={data} />
    </MemoryShell>
  );
}

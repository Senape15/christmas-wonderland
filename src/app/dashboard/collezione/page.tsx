import { requireUser } from "@/lib/auth";
import { getCollectionData } from "@/lib/services/memories";
import { MemoryShell } from "@/components/memories/MemoryShell";
import { CollectionView } from "@/components/memories/CollectionView";

export const instant = false;

export default async function CollectionPage() {
  const user = await requireUser();
  const data = await getCollectionData(user);

  return (
    <MemoryShell
      user={user}
      active="/dashboard/collezione"
      title="La tua collezione"
      subtitle="Oggetti, simboli natalizi e sfere della memoria raccolti lungo il percorso."
    >
      <CollectionView data={data} />
    </MemoryShell>
  );
}

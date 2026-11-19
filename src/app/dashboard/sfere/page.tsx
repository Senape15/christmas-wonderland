import { requireUser } from "@/lib/auth";
import { getCollectionData } from "@/lib/services/memories";
import { MemoryShell } from "@/components/memories/MemoryShell";
import { CollectionView } from "@/components/memories/CollectionView";

export default async function SpheresPage() {
  const user = await requireUser();
  const data = await getCollectionData(user);

  return (
    <MemoryShell
      user={user}
      active="/dashboard/sfere"
      title="Sfere della memoria"
      subtitle="Ogni sfera custodisce un ricordo speciale. Si illumina quando le sue condizioni si avverano."
    >
      <CollectionView data={data} initialTab="sfere" />
    </MemoryShell>
  );
}

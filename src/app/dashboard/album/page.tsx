import { requireUser } from "@/lib/auth";
import { getAlbumData } from "@/lib/services/memories";
import { MemoryShell } from "@/components/memories/MemoryShell";
import { AlbumView } from "@/components/memories/AlbumView";

export default async function AlbumPage() {
  const user = await requireUser();
  const data = await getAlbumData(user);

  return (
    <MemoryShell
      user={user}
      active="/dashboard/album"
      title="Album dei ricordi"
      subtitle="Lettere, fotografie, indizi e momenti speciali di un Natale da ricordare."
    >
      <AlbumView data={data} />
    </MemoryShell>
  );
}

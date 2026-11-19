import { requireUser } from "@/lib/auth";
import { getGalleryData } from "@/lib/services/memories";
import { MemoryShell } from "@/components/memories/MemoryShell";
import { GalleryView } from "@/components/memories/GalleryView";

export const instant = false;

export default async function GalleryPage() {
  const user = await requireUser();
  const data = await getGalleryData(user);

  return (
    <MemoryShell
      user={user}
      active="/dashboard/galleria"
      title="Galleria delle immagini"
      subtitle="Le immagini scoperte durante l'Avvento, raccolte in un'unica galleria personale."
    >
      <GalleryView data={data} />
    </MemoryShell>
  );
}

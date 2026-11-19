import { AdminResourcePage } from "@/components/admin/AdminResourcePage";

export default function AdminPhotosPage() {
  return (
    <AdminResourcePage
      resourceKeys={["user_photos"]}
      title="Fotografie"
      description="Foto caricate dagli utenti nel bucket protetto wonderland-media. Carica nuove immagini dalle sezioni che supportano image_url."
    />
  );
}

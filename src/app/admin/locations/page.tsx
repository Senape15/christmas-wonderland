import { AdminResourcePage } from "@/components/admin/AdminResourcePage";

export default function AdminLocationsPage() {
  return (
    <AdminResourcePage
      resourceKeys={["village_locations", "village_hotspots", "village_hotspot_messages"]}
      title="Luoghi e mappa"
      description="Zone, 24 punti interattivi e relativi testi narrativi. Le modifiche aggiornano direttamente la mappa dell'applicazione."
    />
  );
}

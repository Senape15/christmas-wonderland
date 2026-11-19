import { AdminResourcePage } from "@/components/admin/AdminResourcePage";

export const instant = false;

export default function AdminSpecialMemoriesPage() {
  return (
    <AdminResourcePage
      resourceKeys={["memory_entries"]}
      title="Ricordi speciali"
      description="Configura i ricordi dell'album, gli eventi del diario e i momenti del 24 dicembre. La rivelazione finale resta nella Scatola finale."
    />
  );
}

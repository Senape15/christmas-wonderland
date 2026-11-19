import { AdminResourcePage } from "@/components/admin/AdminResourcePage";

export default function AdminDaysPage() {
  return (
    <AdminResourcePage
      resourceKeys={["advent_days"]}
      title="Giorni dell'Avvento"
      description="Modifica titoli, descrizioni e date di sblocco. Le date devono restare tra il 1° e il 24 dicembre."
    />
  );
}

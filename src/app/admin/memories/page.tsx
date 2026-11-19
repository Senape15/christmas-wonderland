import { AdminResourcePage } from "@/components/admin/AdminResourcePage";

export const instant = false;

export default function AdminMemoriesPage() {
  return (
    <AdminResourcePage
      resourceKeys={["memory_spheres"]}
      title="Sfere dei ricordi"
      description="Contenuti personalizzati delle sfere, associabili a giorni e luoghi."
    />
  );
}

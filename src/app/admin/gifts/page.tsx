import { AdminResourcePage } from "@/components/admin/AdminResourcePage";

export const instant = false;

export default function AdminGiftsPage() {
  return (
    <AdminResourcePage
      resourceKeys={["physical_gifts"]}
      title="Regali fisici"
      description="Inventario reale dei regali: stato di preparazione, note private e istruzioni di consegna."
    />
  );
}

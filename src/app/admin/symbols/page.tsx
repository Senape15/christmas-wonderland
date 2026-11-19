import { AdminResourcePage } from "@/components/admin/AdminResourcePage";

export const instant = false;

export default function AdminSymbolsPage() {
  return (
    <AdminResourcePage
      resourceKeys={["gift_symbols"]}
      title="Simboli"
      description="Simboli collezionabili associati a giorni, luoghi e regali."
    />
  );
}

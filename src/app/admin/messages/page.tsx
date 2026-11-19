import { AdminResourcePage } from "@/components/admin/AdminResourcePage";

export const instant = false;

export default function AdminMessagesPage() {
  return (
    <AdminResourcePage
      resourceKeys={["elf_messages", "secret_messages"]}
      title="Diario degli elfi e messaggi"
      description="Messaggi giornalieri, personalizzati e programmati, collegabili a eventi narrativi."
    />
  );
}

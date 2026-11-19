import { requireAdmin } from "@/lib/auth";
import { getUsersWithProgress } from "@/lib/services/admin";
import { UsersManager } from "@/components/admin/UsersManager";
import { SectionHeader } from "@/components/admin/ui";

export default async function AdminUsersPage() {
  const user = await requireAdmin();
  const rows = await getUsersWithProgress();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Utenti"
        description="Account registrati, avanzamento e ruoli. Solo un amministratore può cambiare i ruoli."
      />
      <UsersManager rows={rows} currentUserId={user.id} />
    </div>
  );
}

import { requireAdmin } from "@/lib/auth";
import { getAdminLookups, getAdminRows, getPasswordConfig } from "@/lib/services/admin";
import { detectPhase6Capabilities } from "@/lib/services/capabilities";
import { CrudManager } from "@/components/admin/CrudManager";
import { PasswordManager } from "@/components/admin/PasswordManager";
import { SectionHeader } from "@/components/admin/ui";

export const instant = false;

export default async function AdminPhysicalContentsPage() {
  await requireAdmin();
  const [rows, lookups, capabilities] = await Promise.all([
    getAdminRows("physical_contents"),
    getAdminLookups(),
    detectPhase6Capabilities(),
  ]);

  const passwordContents = rows
    .filter((row) => row.kind === "password")
    .map((row) => ({
      id: String(row.id),
      title: String(row.title),
      dayNumber: Number(row.day_number),
    }));

  const configs = await Promise.all(
    passwordContents.map((content) => getPasswordConfig(content.id))
  );

  return (
    <div className="space-y-10">
      <SectionHeader
        title="Contenuti delle scatole"
        description="Lettere, oggetti, foto, puzzle e password. La password viene configurata qui sotto e verificata solo lato server."
      />

      <CrudManager
        resourceKey="physical_contents"
        rows={rows}
        lookups={lookups}
        createLabel="Nuovo contenuto"
        phase6Ready={capabilities.ready}
      />

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-cream-50">Sistema password</h2>
          <p className="mt-1 text-sm text-cream-200/60">
            La password non viene mai mostrata al browser: viene salvata come hash e verificata sul server.
          </p>
        </div>
        <PasswordManager contents={passwordContents} configs={configs} />
      </section>
    </div>
  );
}

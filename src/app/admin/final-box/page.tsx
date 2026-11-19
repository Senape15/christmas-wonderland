import { requireAdmin } from "@/lib/auth";
import { getFinalBox } from "@/lib/services/admin";
import { detectPhase6Capabilities } from "@/lib/services/capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import { FinalBoxForm } from "@/components/admin/FinalBoxForm";
import { SectionHeader } from "@/components/admin/ui";

export default async function AdminFinalBoxPage() {
  await requireAdmin();
  const [box, capabilities] = await Promise.all([
    getFinalBox(),
    detectPhase6Capabilities(),
  ]);
  const supabase = await createAdminClient();
  const { data: gifts } = await supabase
    .from("physical_gifts")
    .select("id, name, day_number")
    .order("day_number", { ascending: true });
  const giftOptions = (gifts ?? []).map((gift) => ({
    value: String(gift.id),
    label: `Giorno ${gift.day_number} · ${gift.name}`,
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Scatola finale – 24 dicembre"
        description="Configurazione riservata all'amministratore: mai esposta agli utenti prima della rivelazione."
      />
      <FinalBoxForm
        initial={box}
        phase6Ready={capabilities.ready}
        giftOptions={giftOptions}
      />
    </div>
  );
}

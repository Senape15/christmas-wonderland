import { requireAdmin } from "@/lib/auth";
import { getDayOverview, getSimulation } from "@/lib/services/admin";
import { SimulationPanel } from "@/components/admin/SimulationPanel";

export const instant = false;

export default async function AdminSimulationPage() {
  await requireAdmin();
  const [days, simulation] = await Promise.all([
    getDayOverview(),
    getSimulation(),
  ]);

  return <SimulationPanel days={days} simulation={simulation} />;
}

import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { GodotVillage } from "@/components/village/GodotVillage";

async function VillageGate() {
  await requireUser();
  return <GodotVillage />;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-pine-950 text-cream-100">
          <div className="text-center">
            <p className="font-display text-lg font-bold text-cream-50">
              Christmas Wonderland
            </p>
            <p className="mt-1 text-sm text-cream-300/70">
              Sto preparando il villaggio…
            </p>
          </div>
        </div>
      }
    >
      <VillageGate />
    </Suspense>
  );
}

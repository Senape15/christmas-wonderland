import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { GodotVillage } from "@/components/village/GodotVillage";

export const instant = false;

async function VillageGate() {
  await requireUser();
  return <GodotVillage />;
}

export default function VillaggioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pine-900 text-cream-100">
          <p className="text-sm text-cream-300/70">Sto preparando il villaggio…</p>
        </div>
      }
    >
      <VillageGate />
    </Suspense>
  );
}

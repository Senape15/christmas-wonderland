import { connection } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getExperienceData } from "@/lib/services/experience";
import { getVillageData } from "@/lib/services/village";

/**
 * Dati del villaggio per il client Godot (/village/index.html).
 * Stessa logica della dashboard: gli stati arrivano già filtrati dal calendario,
 * quindi i luoghi futuri restano `locked` con dayNumber = null.
 */
export async function GET() {
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const experience = await getExperienceData(user);
  const village = await getVillageData(experience.calendar);
  return NextResponse.json(village, {
    headers: { "Cache-Control": "no-store" },
  });
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Incorpora il villaggio Godot e apre l'esperienza del giorno richiesto. */
export function GodotVillage() {
  const router = useRouter();

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; day?: unknown };
      if (data?.type !== "wonderland:open-day") return;
      const day = Number(data.day);
      if (Number.isInteger(day) && day >= 1 && day <= 24) {
        router.push(`/dashboard?giorno=${day}`);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return (
    <iframe
      src="/village/index.html"
      title="Villaggio di Natale"
      className="h-dvh w-full border-0 bg-pine-900"
      allow="fullscreen"
    />
  );
}

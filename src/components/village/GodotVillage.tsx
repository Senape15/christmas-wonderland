"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavIcon } from "@/components/layout/nav-icons";

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
    <div className="relative h-dvh w-full bg-pine-900">
      <iframe
        src="/village/index.html"
        title="Villaggio di Natale"
        className="h-full w-full border-0"
        allow="fullscreen"
      />
      <Link
        href="/dashboard"
        aria-label="Torna alla dashboard"
        className="absolute left-3 top-3 z-10 inline-flex min-h-10 items-center gap-2 rounded-full border border-cream-300/25 bg-pine-950/85 px-3 text-xs font-semibold text-cream-100 backdrop-blur-md transition-colors hover:border-gold hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <NavIcon name="chevronRight" className="h-4 w-4 rotate-180" />
        Dashboard
      </Link>
    </div>
  );
}

import type { NextConfig } from "next";

// Non sono asset con hash nel nome: una settimana di cache più revalidate
// evita di riscaricare 38 MB a ogni visita senza bloccare i futuri aggiornamenti.
const VILLAGE_CACHE = "public, max-age=604800, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    // I file pesanti del villaggio (38 MB di WASM + PCK) non cambiano tra i
    // deploy: senza questi header il sito li riscarica a ogni visita, mentre
    // la PWA li recupera dal Service Worker e sembra molto più veloce.
    return [
      {
        source: "/village/index.wasm",
        headers: [{ key: "Cache-Control", value: VILLAGE_CACHE }],
      },
      {
        source: "/village/index.pck",
        headers: [{ key: "Cache-Control", value: VILLAGE_CACHE }],
      },
      {
        source: "/village/index.js",
        headers: [{ key: "Cache-Control", value: VILLAGE_CACHE }],
      },
    ];
  },
};

export default nextConfig;

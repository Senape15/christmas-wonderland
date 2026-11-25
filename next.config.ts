import type { NextConfig } from "next";

// Il PCK cambia a ogni export e non ha hash nel nome: una cache lunga
// servirebbe la versione vecchia per giorni. Rivalidiamo sempre; la velocità
// nell'app viene dal Service Worker, non da qui.
const VILLAGE_CACHE = "public, max-age=0, must-revalidate";

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

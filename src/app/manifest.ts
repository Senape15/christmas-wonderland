import type { MetadataRoute } from "next";

/**
 * Manifest della PWA.
 *
 * `start_url` punta alla dashboard: se l'utente non ha una sessione valida,
 * il proxy lo porta al login (nessun contenuto privato viene memorizzato).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Christmas Wonderland",
    short_name: "Wonderland",
    description:
      "Il calendario dell'Avvento interattivo: villaggio, caselle, indizi e ricordi di Natale.",
    lang: "it",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#041f12",
    theme_color: "#0b2e1a",
    categories: ["entertainment", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Calendario", short_name: "Calendario", url: "/dashboard" },
      { name: "Album dei ricordi", short_name: "Album", url: "/dashboard/album" },
      {
        name: "Impostazioni notifiche",
        short_name: "Notifiche",
        url: "/dashboard/impostazioni",
      },
    ],
  };
}

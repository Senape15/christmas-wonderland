import type {
  VillageHotspot,
  VillageZone,
} from "@/types/village";

/**
 * Catalogo illustrato di riserva.
 *
 * Contiene le sei zone e i ventiquattro elementi disegnati sulla mappa: serve
 * a mostrare il villaggio anche quando le tabelle `village_locations` /
 * `village_hotspots` non sono ancora state create o popolate.
 *
 * IMPORTANTE: qui NON esiste alcuna associazione luogo → giorno. Le
 * associazioni vivono solo nel database (`village_hotspots.day_number`),
 * quindi il codice non fissa mai una data per un luogo. In assenza di
 * configurazione tutti i luoghi restano "non ancora disponibili".
 */
export const CATALOG_ZONES: readonly VillageZone[] = [
  {
    id: "z-piazza-centrale",
    slug: "piazza-centrale",
    name: "Piazza Centrale",
    description:
      "Il cuore del villaggio, dove la Stella di Natale veglia sulle case.",
    positionX: 50,
    positionY: 55,
    sortOrder: 1,
  },
  {
    id: "z-ufficio-postale",
    slug: "ufficio-postale",
    name: "Ufficio Postale",
    description:
      "Letterine, pacchi e storie in viaggio verso il Polo Nord.",
    positionX: 20,
    positionY: 38,
    sortOrder: 2,
  },
  {
    id: "z-pasticceria",
    slug: "pasticceria",
    name: "Pasticceria",
    description: "Profumo di cannella, biscotti e cioccolata calda.",
    positionX: 82,
    positionY: 76,
    sortOrder: 3,
  },
  {
    id: "z-negozio-giocattoli",
    slug: "negozio-giocattoli",
    name: "Negozio dei Giocattoli",
    description: "Giocattoli di legno e meraviglie costruite a mano.",
    positionX: 20,
    positionY: 80,
    sortOrder: 4,
  },
  {
    id: "z-laboratorio-babbo-natale",
    slug: "laboratorio-babbo-natale",
    name: "Laboratorio di Babbo Natale",
    description: "Dove i desideri prendono forma tra seghetti e nastri dorati.",
    positionX: 72,
    positionY: 34,
    sortOrder: 5,
  },
  {
    id: "z-lago-ghiacciato",
    slug: "lago-ghiacciato",
    name: "Lago Ghiacciato",
    description: "Il lago dove il villaggio pattina sotto le stelle.",
    positionX: 50,
    positionY: 86,
    sortOrder: 6,
  },
] as const;

interface CatalogHotspot {
  zoneSlug: string;
  slug: string;
  name: string;
  kind: VillageHotspot["kind"];
  x: number;
  y: number;
  sortOrder: number;
}

const CATALOG_HOTSPOT_ROWS: readonly CatalogHotspot[] = [
  // Piazza Centrale
  { zoneSlug: "piazza-centrale", slug: "albero-di-natale", name: "Sotto il grande albero", kind: "tree", x: 50, y: 45.91, sortOrder: 1 },
  { zoneSlug: "piazza-centrale", slug: "fontana-ghiacciata", name: "Fontana ghiacciata", kind: "fountain", x: 37.5, y: 60, sortOrder: 2 },
  { zoneSlug: "piazza-centrale", slug: "panchina-innevata", name: "Panchina innevata", kind: "bench", x: 55, y: 65.45, sortOrder: 3 },
  { zoneSlug: "piazza-centrale", slug: "lampione-decorato", name: "Lampione decorato", kind: "lamp", x: 66.25, y: 62.73, sortOrder: 4 },

  // Ufficio Postale
  { zoneSlug: "ufficio-postale", slug: "cassetta-delle-lettere", name: "Cassetta delle lettere", kind: "mailbox", x: 8.13, y: 40.91, sortOrder: 5 },
  { zoneSlug: "ufficio-postale", slug: "sportello-postale", name: "Sportello postale", kind: "post-counter", x: 20.63, y: 33.64, sortOrder: 6 },
  { zoneSlug: "ufficio-postale", slug: "archivio-delle-lettere", name: "Archivio delle lettere", kind: "archive", x: 30, y: 40.91, sortOrder: 7 },
  { zoneSlug: "ufficio-postale", slug: "slitta-parcheggiata", name: "Slitta parcheggiata", kind: "sled", x: 35, y: 47.27, sortOrder: 8 },

  // Pasticceria
  { zoneSlug: "pasticceria", slug: "forno", name: "Forno", kind: "oven", x: 70, y: 80.91, sortOrder: 9 },
  { zoneSlug: "pasticceria", slug: "vetrina-dei-dolci", name: "Vetrina dei dolci", kind: "pastry-window", x: 81.25, y: 73.64, sortOrder: 10 },
  { zoneSlug: "pasticceria", slug: "tavolino-esterno", name: "Tavolino esterno", kind: "cafe-table", x: 91.25, y: 80.91, sortOrder: 11 },
  { zoneSlug: "pasticceria", slug: "dispensa", name: "Dispensa", kind: "pantry", x: 95.63, y: 89.09, sortOrder: 12 },

  // Negozio dei Giocattoli
  { zoneSlug: "negozio-giocattoli", slug: "trenino", name: "Trenino", kind: "toy-train", x: 30, y: 87.27, sortOrder: 13 },
  { zoneSlug: "negozio-giocattoli", slug: "vetrina-principale", name: "Vetrina principale", kind: "toy-window", x: 18.75, y: 74.55, sortOrder: 14 },
  { zoneSlug: "negozio-giocattoli", slug: "scaffale-dei-giocattoli", name: "Scaffale dei giocattoli", kind: "toy-shelf", x: 8.13, y: 82.73, sortOrder: 15 },
  { zoneSlug: "negozio-giocattoli", slug: "cavallo-a-dondolo", name: "Cavallo a dondolo", kind: "rocking-horse", x: 4.38, y: 91.82, sortOrder: 16 },

  // Laboratorio di Babbo Natale
  { zoneSlug: "laboratorio-babbo-natale", slug: "banco-da-lavoro", name: "Banco da lavoro", kind: "workbench", x: 63.75, y: 39.09, sortOrder: 17 },
  { zoneSlug: "laboratorio-babbo-natale", slug: "camino", name: "Camino", kind: "fireplace", x: 77.5, y: 30.91, sortOrder: 18 },
  { zoneSlug: "laboratorio-babbo-natale", slug: "macchina-dei-giocattoli", name: "Macchina dei giocattoli", kind: "toy-machine", x: 86.88, y: 40, sortOrder: 19 },
  { zoneSlug: "laboratorio-babbo-natale", slug: "magazzino", name: "Magazzino", kind: "warehouse", x: 70.63, y: 46.36, sortOrder: 20 },

  // Lago Ghiacciato
  { zoneSlug: "lago-ghiacciato", slug: "ponte", name: "Ponte", kind: "bridge", x: 43.75, y: 78, sortOrder: 21 },
  { zoneSlug: "lago-ghiacciato", slug: "chalet", name: "Chalet", kind: "chalet", x: 61.25, y: 84.73, sortOrder: 22 },
  { zoneSlug: "lago-ghiacciato", slug: "slitta-sul-lago", name: "Slitta sul lago", kind: "lake-sled", x: 53.75, y: 92, sortOrder: 23 },
  { zoneSlug: "lago-ghiacciato", slug: "lanterna-sulla-riva", name: "Lanterna sulla riva", kind: "shore-lantern", x: 35.94, y: 84.09, sortOrder: 24 },
] as const;

export const CATALOG_HOTSPOTS: readonly VillageHotspot[] =
  CATALOG_HOTSPOT_ROWS.map((row) => ({
    id: `h-${row.slug}`,
    zoneSlug: row.zoneSlug,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    x: row.x,
    y: row.y,
    dayNumber: null,
    state: "locked",
    hint: "",
    lockedHint: "",
    nicoMessage: "",
    nicoExpression: "happy",
    sortOrder: row.sortOrder,
  }));

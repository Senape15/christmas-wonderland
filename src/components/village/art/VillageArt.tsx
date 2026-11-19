import type { CSSProperties } from "react";
import { C, DistantPine, Mountain, Pine } from "./primitives";
import { ZoneBakery } from "./ZoneBakery";
import { ZoneLake } from "./ZoneLake";
import { ZonePiazza } from "./ZonePiazza";
import { ZonePostOffice } from "./ZonePostOffice";
import { ZoneToyShop } from "./ZoneToyShop";
import { ZoneWorkshop } from "./ZoneWorkshop";
import { VILLAGE_WORLD } from "@/lib/village/transform";

/**
 * Illustrazione completa del villaggio (1600 × 1100).
 *
 * Tutto statico lato server: le uniche animazioni sono CSS con valori
 * costanti. La Stella cambia luminosità in base alla fase narrativa
 * (`starLit`): prima del 1° dicembre è accesa, poi perde la luce.
 */

interface Flake {
  x: string;
  y: string;
  r: string;
  delay: string;
  duration: string;
  opacity: string;
}

/** Fiocchi deterministici: nessun Math.random, server e client coincidono. */
function buildFlakes(count: number): Flake[] {
  let seed = 987654321;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  return Array.from({ length: count }, () => ({
    x: (next() * VILLAGE_WORLD.width).toFixed(1),
    y: (next() * VILLAGE_WORLD.height).toFixed(1),
    r: (1.1 + next() * 2.1).toFixed(2),
    delay: (next() * 9).toFixed(2),
    duration: (7 + next() * 7).toFixed(2),
    opacity: (0.28 + next() * 0.42).toFixed(2),
  }));
}

const FLAKES = buildFlakes(44);

const ZONE_LABELS: { x: number; y: number; label: string }[] = [
  { x: 820, y: 806, label: "PIAZZA CENTRALE" },
  { x: 330, y: 568, label: "UFFICIO POSTALE" },
  { x: 1290, y: 1016, label: "PASTICCERIA" },
  { x: 250, y: 1046, label: "NEGOZIO DEI GIOCATTOLI" },
  { x: 1230, y: 570, label: "LABORATORIO" },
  { x: 780, y: 1084, label: "LAGO GHIACCIATO" },
];

export function VillageArt({ starLit }: { starLit: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${VILLAGE_WORLD.width} ${VILLAGE_WORLD.height}`}
      width={VILLAGE_WORLD.width}
      height={VILLAGE_WORLD.height}
      role="img"
      aria-label="Illustrazione del villaggio di Natale con la piazza, l'ufficio postale, la pasticceria, il negozio dei giocattoli, il laboratorio e il lago ghiacciato."
      className="block h-auto w-full select-none"
    >
      <defs>
        <linearGradient id="village-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#071427" />
          <stop offset="45%" stopColor="#10233d" />
          <stop offset="100%" stopColor="#1d3b58" />
        </linearGradient>
        <linearGradient id="village-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e7eff6" />
          <stop offset="55%" stopColor="#f3f8fc" />
          <stop offset="100%" stopColor="#dbe7f1" />
        </linearGradient>
        <linearGradient id="village-path" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8d8e6" />
          <stop offset="100%" stopColor="#b3c7d8" />
        </linearGradient>
        <radialGradient id="village-star" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="45%" stopColor="#f0d78c" />
          <stop offset="100%" stopColor="#d4a843" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Cielo */}
      <rect width={VILLAGE_WORLD.width} height={VILLAGE_WORLD.height} fill="url(#village-sky)" />

      {/* Stelle lontane */}
      {[
        [180, 70, 1.6], [320, 130, 1.2], [470, 60, 1.8], [610, 110, 1.1],
        [980, 70, 1.5], [1120, 120, 1.2], [1280, 60, 1.9], [1430, 130, 1.3],
        [240, 200, 1.1], [1390, 210, 1.4], [760, 60, 1.2], [880, 120, 1],
      ].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={C.cream100} opacity="0.75" />
      ))}

      {/* Montagne lontane */}
      <Mountain x={-120} y={360} width={620} height={250} />
      <Mountain x={300} y={356} width={700} height={290} />
      <Mountain x={820} y={358} width={640} height={240} />
      <Mountain x={1260} y={354} width={520} height={270} />

      {/* Stella di Natale */}
      <g className={starLit ? "star-glow" : undefined} opacity={starLit ? 1 : 0.42}>
        <circle cx={800} cy={150} r={starLit ? 120 : 62} fill="url(#village-star)" opacity={starLit ? 0.85 : 0.35} />
        <path
          d="M800,84 L816,132 L866,134 L826,164 L840,212 L800,184 L760,212 L774,164 L734,134 L784,132 Z"
          fill={starLit ? C.goldLight : "#8f9dab"}
        />
        {!starLit && (
          <path
            d="M700,150 q100,-34 200,0"
            stroke="#0b1a2b"
            strokeWidth="10"
            fill="none"
            opacity="0.35"
          />
        )}
      </g>

      {/* Suolo innevato */}
      <path
        d="M0,352 Q220,326 430,346 Q640,366 820,342 Q1010,318 1210,344 Q1420,370 1600,340 L1600,1100 L0,1100 Z"
        fill="url(#village-ground)"
      />
      <path
        d="M0,352 Q220,326 430,346 Q640,366 820,342 Q1010,318 1210,344 Q1420,370 1600,340"
        stroke="#ffffff"
        strokeWidth="7"
        fill="none"
        opacity="0.75"
      />

      {/* Bosco di sfondo */}
      {[
        [70, 366, 0.45], [140, 362, 0.35], [560, 366, 0.4], [640, 360, 0.32],
        [900, 356, 0.38], [960, 362, 0.3], [1180, 366, 0.42], [1300, 358, 0.34],
        [1480, 366, 0.46], [1540, 360, 0.36], [380, 364, 0.3], [1020, 360, 0.34],
      ].map(([x, y, scale]) => (
        <DistantPine key={`${x}-${y}`} x={x} y={y} scale={scale} />
      ))}

      {/* Sentieri del villaggio */}
      <g opacity="0.9">
        <path
          d="M820,720 Q700,600 500,470 Q400,410 330,430"
          stroke="url(#village-path)"
          strokeWidth="46"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M880,720 Q1020,560 1180,420 Q1220,380 1250,380"
          stroke="url(#village-path)"
          strokeWidth="46"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M820,790 Q790,850 760,880"
          stroke="url(#village-path)"
          strokeWidth="52"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M900,780 Q1120,820 1260,860"
          stroke="url(#village-path)"
          strokeWidth="40"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M720,780 Q560,830 420,880 Q340,910 300,900"
          stroke="url(#village-path)"
          strokeWidth="40"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M470,940 Q520,930 560,930"
          stroke="url(#village-path)"
          strokeWidth="34"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M1000,920 Q1040,960 1000,1000"
          stroke="url(#village-path)"
          strokeWidth="30"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Zone illustrate */}
      <ZonePostOffice />
      <ZoneWorkshop />
      <ZonePiazza />
      <ZoneToyShop />
      <ZoneBakery />
      <ZoneLake />

      {/* Targhette delle zone */}
      {ZONE_LABELS.map((zone) => (
        <g key={zone.label}>
          <rect
            x={zone.x - zone.label.length * 4.6 - 12}
            y={zone.y - 15}
            width={zone.label.length * 9.2 + 24}
            height={24}
            rx={12}
            fill="#06251a"
            opacity="0.45"
          />
          <text
            x={zone.x}
            y={zone.y + 2}
            textAnchor="middle"
            fontSize="13"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight="600"
            letterSpacing="1.6"
            fill={C.cream100}
            opacity="0.92"
          >
            {zone.label}
          </text>
        </g>
      ))}

      {/* Neve che cade sulla mappa */}
      <g aria-hidden="true">
        {FLAKES.map((flake, index) => (
          <circle
            key={index}
            cx={flake.x}
            cy={flake.y}
            r={flake.r}
            fill="#ffffff"
            opacity={flake.opacity}
            className="map-snowflake"
            style={
              {
                animationDelay: `${flake.delay}s`,
                animationDuration: `${flake.duration}s`,
                "--flake-opacity": flake.opacity,
              } as CSSProperties
            }
          />
        ))}
      </g>

      {/* Vignettatura morbida ai bordi */}
      <rect width={VILLAGE_WORLD.width} height={VILLAGE_WORLD.height} fill="none" stroke="#04140c" strokeWidth="40" opacity="0.18" />

      {/* Pini decorativi di primo piano */}
      <Pine x={1592} y={1086} scale={0.85} />
      <Pine x={14} y={1086} scale={0.7} tone={C.pine600} />
    </svg>
  );
}

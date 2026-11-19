import type { ReactNode } from "react";

/**
 * Palette e forme riutilizzabili dell'illustrazione del villaggio.
 *
 * Tutto è SVG statico: nessun hook, nessun valore casuale, nessuna animazione
 * JavaScript. Le poche animazioni (fumo, luci) sono CSS con valori costanti,
 * così il markup del server e quello idratato coincidono.
 */
export const C = {
  pine950: "#041f12",
  pine900: "#0b2e1a",
  pine800: "#14432a",
  pine700: "#1a5c38",
  pine600: "#1e7a4a",
  pine400: "#4dbb7f",
  red: "#c41e3a",
  redDark: "#9b1b30",
  redLight: "#e63950",
  gold: "#d4a843",
  goldLight: "#f0d78c",
  windowGlow: "#f7e3a1",
  goldDark: "#a8842f",
  snow: "#fafbfc",
  snowSoft: "#f0f4f8",
  frost: "#e2e8f0",
  ice300: "#a5d8ff",
  ice400: "#74c0fc",
  ice500: "#4dabf7",
  ice900: "#1c3d5a",
  wood300: "#c49a6c",
  wood400: "#a67c52",
  wood500: "#8b5e3c",
  wood600: "#6f4a2e",
  wood700: "#5a3a24",
  wood800: "#3d2617",
  cream50: "#fdfbf7",
  cream100: "#f5f0e6",
  cream200: "#ede4d3",
  cream300: "#e0d3bc",
  night900: "#0a1628",
  night800: "#101f38",
  night700: "#1a2d4d",
  shadow: "#04140c",
  skin: "#ffd9b3",
} as const;

const SMOKE_DELAYS = ["0s", "1.3s", "2.6s"] as const;
const SMOKE_DURATIONS = ["4.2s", "4.2s", "4.2s"] as const;

/** Camino in muratura con cappello di neve e fumo CSS. */
export function Chimney({
  x,
  y,
  scale = 1,
}: {
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <rect x="-13" y="0" width="26" height="62" rx="3" fill="#7a4a3a" />
      <rect x="-13" y="0" width="8" height="62" fill="#8f5a46" opacity="0.7" />
      <rect x="-9" y="-4" width="22" height="9" rx="3" fill={C.snowSoft} />
      <rect x="-16" y="-12" width="32" height="9" rx="3" fill={C.snow} />
      {SMOKE_DELAYS.map((delay, index) => (
        <circle
          key={delay}
          cx={index % 2 === 0 ? -2 : 4}
          cy="-18"
          r={7 + index * 2}
          fill={C.frost}
          opacity="0.5"
          className="village-smoke"
          style={{ animationDelay: delay, animationDuration: SMOKE_DURATIONS[index] }}
        />
      ))}
    </g>
  );
}

/** Pino innevato, a strati. `scale` 1 ≈ 110 px di altezza. */
export function Pine({
  x,
  y,
  scale = 1,
  tone = C.pine700,
}: {
  x: number;
  y: number;
  scale?: number;
  tone?: string;
}) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <ellipse cx="0" cy="6" rx="34" ry="9" fill={C.shadow} opacity="0.18" />
      <rect x="-5" y="-32" width="10" height="38" rx="2" fill={C.wood700} />
      <path d="M0,-118 L-42,-30 L42,-30 Z" fill={tone} />
      <path d="M0,-92 L-52,-8 L52,-8 Z" fill={tone} />
      <path d="M0,-66 L-62,14 L62,14 Z" fill={tone} />
      <path d="M0,-118 L-30,-52 L-12,-52 L-36,-16 L0,-24 Z" fill={C.snow} opacity="0.82" />
      <path d="M0,-92 L-38,-30 L-20,-30 L-44,4 L0,-6 Z" fill={C.snow} opacity="0.66" />
      <path d="M0,-66 L-46,-6 L-26,-6 L-50,10 L0,2 Z" fill={C.snow} opacity="0.5" />
    </g>
  );
}

/** Abete lontano, silhouette scura senza dettagli. */
export function DistantPine({
  x,
  y,
  scale = 1,
}: {
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} opacity="0.55">
      <path d="M0,-70 L-24,-8 L24,-8 Z" fill={C.pine900} />
      <path d="M0,-50 L-30,16 L30,16 Z" fill={C.pine900} />
      <path d="M0,-70 L-12,-20 L0,-24 L-14,2 L0,-2 Z" fill={C.ice300} opacity="0.4" />
    </g>
  );
}

/** Monte innevato sullo sfondo. */
export function Mountain({
  x,
  y,
  width,
  height,
  tone = C.night700,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  tone?: string;
}) {
  return (
    <g opacity="0.75">
      <path
        d={`M${x},${y} L${x + width * 0.5},${y - height} L${x + width},${y} Z`}
        fill={tone}
      />
      <path
        d={`M${x + width * 0.5},${y - height} L${x + width * 0.28},${y - height * 0.32} L${x + width * 0.5},${y - height * 0.45} L${x + width * 0.7},${y - height * 0.28} Z`}
        fill={C.snowSoft}
        opacity="0.65"
      />
    </g>
  );
}

/** Casa in legno con facciata, lato in profondità, tetto innevato e luci. */
export function TimberHouse({
  x,
  y,
  width = 280,
  height = 150,
  roofHeight = 105,
  wall = C.wood500,
  side = C.wood700,
  sign,
  awning = null,
  doorOffset = 0,
  children,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  roofHeight?: number;
  wall?: string;
  side?: string;
  sign?: ReactNode;
  awning?: "red" | "green" | null;
  doorOffset?: number;
  children?: ReactNode;
}) {
  const doorX = width / 2 - 17 + doorOffset;
  const windowY = height * 0.36;
  const windowSize = Math.min(38, height * 0.26);

  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={width / 2} cy={height + 8} rx={width * 0.62} ry="16" fill={C.shadow} opacity="0.2" />

      {/* Lato destro in profondità */}
      <polygon
        points={`${width},0 ${width + 30},16 ${width + 30},${height + 16} ${width},${height}`}
        fill={side}
      />

      {/* Facciata */}
      <rect width={width} height={height} rx="4" fill={wall} />
      <rect x="6" y="6" width={width - 12} height="8" fill={C.snowSoft} opacity="0.35" />
      <rect x="0" y={height - 16} width={width} height="16" fill={C.wood800} opacity="0.35" />

      {/* Travi in legno */}
      <rect x="10" y="12" width="7" height={height - 24} fill={C.wood800} opacity="0.55" />
      <rect x={width - 17} y="12" width="7" height={height - 24} fill={C.wood800} opacity="0.55" />
      <rect x="10" y={height * 0.18} width={width - 20} height="6" fill={C.wood800} opacity="0.4" />

      {/* Finestra sinistra */}
      <Window x={width * 0.13} y={windowY} size={windowSize} />
      {/* Finestra destra */}
      <Window x={width - width * 0.13 - windowSize} y={windowY} size={windowSize} />

      {/* Porta */}
      <rect x={doorX - 4} y={height - 66} width="42" height="66" rx="4" fill={C.wood800} />
      <rect x={doorX} y={height - 62} width="34" height="58" rx="3" fill={C.wood700} />
      <circle cx={doorX + 28} cy={height - 32} r="2.6" fill={C.gold} />
      <rect x={doorX + 4} y={height - 54} width="26" height="7" rx="3" fill={C.windowGlow} opacity="0.55" />

      {/* Tetto innevato con spessore */}
      <path
        d={`M${-20},0 L${width / 2},${-roofHeight} L${width + 20},0 L${width + 6},14 L${width / 2},${-roofHeight + 18} L-6,14 Z`}
        fill={C.snow}
      />
      <path
        d={`M${-12},-2 L${width / 2},${-roofHeight + 12} L${width + 12},-2`}
        stroke={C.wood700}
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${width / 2},${-roofHeight + 12} L${width / 2 + 22},${-roofHeight + 26} L${width / 2 + 8},${-roofHeight + 30} L${width / 2},${-roofHeight + 22} Z`}
        fill={C.snowSoft}
      />

      {/* Ghiaccioli */}
      <path d={`M${width * 0.2},10 l4,16 l4,-16 Z`} fill={C.ice300} opacity="0.8" />
      <path d={`M${width * 0.72},10 l3,13 l3,-13 Z`} fill={C.ice300} opacity="0.7" />

      {/* Tenda / pensilina */}
      {awning === "red" &&
        Array.from({ length: 6 }, (_, index) => (
          <path
            key={index}
            d={`M${width * 0.18 + index * 18},${height * 0.24} h18 v16 l-9,-6 l-9,6 Z`}
            fill={index % 2 === 0 ? C.red : C.cream100}
          />
        ))}
      {awning === "green" &&
        Array.from({ length: 6 }, (_, index) => (
          <path
            key={index}
            d={`M${width * 0.18 + index * 18},${height * 0.24} h18 v16 l-9,-6 l-9,6 Z`}
            fill={index % 2 === 0 ? C.pine700 : C.cream100}
          />
        ))}

      {sign}
      {children}
    </g>
  );
}

/** Finestra calda con cornice in legno e luce dorata. */
export function Window({
  x,
  y,
  size = 36,
  arched = false,
}: {
  x: number;
  y: number;
  size?: number;
  arched?: boolean;
}) {
  return (
    <g>
      <rect x={x - 4} y={y - 4} width={size + 8} height={size + 8} rx="4" fill={C.wood800} />
      <rect x={x} y={y} width={size} height={size} rx={arched ? size / 2 : 3} fill={C.goldLight} opacity="0.95" />
      <rect x={x} y={y} width={size} height={size * 0.55} rx="3" fill={C.gold} opacity="0.45" />
      <rect x={x + size / 2 - 1.5} y={y} width="3" height={size} fill={C.wood800} />
      <rect x={x} y={y + size / 2 - 1.5} width={size} height="3" fill={C.wood800} />
      <rect x={x - 7} y={y + size + 4} width={size + 14} height="5" rx="2" fill={C.snow} />
    </g>
  );
}

/** Lampione decorato con alone caldo. */
export function LampPost({
  x,
  y,
  scale = 1,
  twin = false,
}: {
  x: number;
  y: number;
  scale?: number;
  twin?: boolean;
}) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <ellipse cx="0" cy="2" rx="18" ry="5" fill={C.shadow} opacity="0.25" />
      <rect x="-4" y="-74" width="8" height="76" rx="3" fill={C.wood800} />
      <rect x="-10" y="-58" width="20" height="6" rx="3" fill={C.wood700} />
      <rect x="-14" y="-80" width="28" height="8" rx="3" fill={C.wood800} />
      {twin && (
        <>
          <path d="M-2,-70 L-26,-62" stroke={C.wood800} strokeWidth="3" />
          <path d="M2,-70 L26,-62" stroke={C.wood800} strokeWidth="3" />
          <circle cx="-28" cy="-58" r="7" fill={C.gold} opacity="0.95" />
          <circle cx="28" cy="-58" r="7" fill={C.gold} opacity="0.95" />
        </>
      )}
      <rect x="-11" y="-98" width="22" height="22" rx="4" fill={C.wood800} />
      <rect x="-8" y="-95" width="16" height="16" rx="3" fill={C.goldLight} className="fading-light" style={{ animationDuration: "3.4s" }} />
      <circle cx="0" cy="-87" r="26" fill={C.gold} opacity="0.16" />
      <path d="M-14,-98 L0,-110 L14,-98 Z" fill={C.snow} />
    </g>
  );
}

/** Piccola lanterna da terra / riva. */
export function SmallLantern({
  x,
  y,
  scale = 1,
}: {
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <ellipse cx="0" cy="2" rx="14" ry="4" fill={C.shadow} opacity="0.25" />
      <rect x="-3" y="-46" width="6" height="48" rx="2" fill={C.wood800} />
      <rect x="-10" y="-58" width="20" height="18" rx="4" fill={C.wood800} />
      <rect x="-7" y="-55" width="14" height="12" rx="2" fill={C.goldLight} className="fading-light" style={{ animationDuration: "2.8s" }} />
      <circle cx="0" cy="-49" r="22" fill={C.gold} opacity="0.18" />
      <path d="M-12,-58 L0,-68 L12,-58 Z" fill={C.snow} />
    </g>
  );
}

/** Ghirlanda di luci lungo un arco. */
export function StringLights({
  x,
  y,
  width,
}: {
  x: number;
  y: number;
  width: number;
}) {
  const count = Math.max(3, Math.round(width / 26));
  const bulbs = [C.gold, C.red, C.ice500, C.pine400] as const;

  return (
    <g>
      <path
        d={`M${x},${y} Q${x + width / 2},${y + 26} ${x + width},${y}`}
        stroke={C.pine800}
        strokeWidth="3"
        fill="none"
      />
      {Array.from({ length: count }, (_, index) => {
        const t = (index + 0.5) / count;
        const px = x + width * t;
        const py = y + 26 * 4 * t * (1 - t);
        return (
          <circle
            key={index}
            cx={px}
            cy={py}
            r="3.4"
            fill={bulbs[index % bulbs.length]}
            className="fading-light"
            style={{ animationDuration: index % 2 === 0 ? "2.6s" : "3.2s" }}
          />
        );
      })}
    </g>
  );
}

/** Pacchetto regalo. */
export function GiftBox({
  x,
  y,
  size = 22,
  color = C.red,
  ribbon = C.gold,
  rotate = 0,
}: {
  x: number;
  y: number;
  size?: number;
  color?: string;
  ribbon?: string;
  rotate?: number;
}) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rotate})`}>
      <rect width={size} height={size * 0.85} rx="2" fill={color} />
      <rect x={size * 0.42} width={size * 0.16} height={size * 0.85} fill={ribbon} />
      <rect y={size * 0.3} width={size} height={size * 0.14} fill={ribbon} />
      <path
        d={`M${size * 0.5},0 q-6,-7 -9,0 q6,-2 9,0 q3,-7 9,0 q-3,-2 -9,0 Z`}
        fill={ribbon}
      />
      <rect x="0" y={-2} width={size} height="4" rx="2" fill={C.snow} opacity="0.85" />
    </g>
  );
}

/** Banco di neve morbido. */
export function SnowMound({
  x,
  y,
  rx = 60,
  ry = 16,
  opacity = 0.9,
}: {
  x: number;
  y: number;
  rx?: number;
  ry?: number;
  opacity?: number;
}) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={C.snowSoft} opacity={opacity} />;
}

/** Piccolo pupazzo di neve decorativo (non un personaggio/colpevole). */
export function Snowman({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <ellipse cx="0" cy="2" rx="22" ry="6" fill={C.shadow} opacity="0.2" />
      <circle cx="0" cy="-14" r="18" fill={C.snowSoft} />
      <circle cx="0" cy="-42" r="13" fill={C.snow} />
      <circle cx="-5" cy="-45" r="1.8" fill={C.wood800} />
      <circle cx="5" cy="-45" r="1.8" fill={C.wood800} />
      <path d="M0,-40 l10,4 l-10,2 Z" fill={C.gold} />
      <path d="M-12,-54 q12,-10 24,0 q-6,4 -12,3 q-6,1 -12,-3 Z" fill={C.red} />
      <rect x="-16" y="-28" width="32" height="5" rx="2.5" fill={C.pine700} />
      <path d="M8,-30 l14,6 l-15,4 Z" fill={C.red} />
    </g>
  );
}

/** Pattinatore stilizzato sul ghiaccio. */
export function Skater({
  x,
  y,
  scale = 1,
  color = C.red,
}: {
  x: number;
  y: number;
  scale?: number;
  color?: string;
}) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <ellipse cx="0" cy="2" rx="12" ry="3" fill={C.ice900} opacity="0.25" />
      <circle cx="0" cy="-34" r="6" fill={C.skin} />
      <path d="M-8,-54 q8,-6 16,0 l-2,5 q-6,-3 -12,0 Z" fill={C.pine800} />
      <path d="M0,-28 l-2,18 l-7,10" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M-2,-10 l8,8" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M-2,-26 l12,8" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  );
}

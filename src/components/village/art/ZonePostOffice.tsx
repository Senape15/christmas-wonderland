import {
  C,
  DistantPine,
  LampPost,
  Pine,
  SnowMound,
  StringLights,
  TimberHouse,
} from "./primitives";

/**
 * Ufficio Postale.
 *
 * Hotspot (percentuali): cassetta (8.13, 40.91) · sportello (20.63, 33.64)
 * · archivio (30, 40.91) · slitta (35, 47.27)
 */
export function ZonePostOffice() {
  return (
    <g aria-hidden="true">
      {/* Edificio principale */}
      <TimberHouse
        x={250}
        y={300}
        width={250}
        height={150}
        roofHeight={96}
        wall={C.wood500}
        side={C.wood700}
        awning="red"
        sign={
          <g>
            <rect x={92} y={186} width={70} height={24} rx={4} fill={C.pine800} />
            <rect x={92} y={186} width={70} height={24} rx={4} fill="none" stroke={C.gold} strokeWidth="2" />
            <text
              x={127}
              y={203}
              textAnchor="middle"
              fontSize="13"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontWeight="700"
              fill={C.goldLight}
              letterSpacing="1"
            >
              POSTE
            </text>
          </g>
        }
      >
        {/* Sacchi di lettere davanti alla porta */}
        <g transform="translate(118,124)">
          <ellipse cx={0} cy={4} rx={20} ry={6} fill={C.shadow} opacity="0.25" />
          <path d="M-16,0 q4,-18 16,-18 q12,0 16,18 q-16,6 -32,0 Z" fill={C.cream200} />
          <path d="M-8,-12 l8,7 l8,-7" stroke={C.wood600} strokeWidth="2" fill="none" />
        </g>
        <g transform="translate(146,126) scale(0.82)">
          <ellipse cx={0} cy={4} rx={20} ry={6} fill={C.shadow} opacity="0.25" />
          <path d="M-16,0 q4,-18 16,-18 q12,0 16,18 q-16,6 -32,0 Z" fill={C.cream300} />
          <path d="M-8,-12 l8,7 l8,-7" stroke={C.wood600} strokeWidth="2" fill="none" />
        </g>
      </TimberHouse>

      <StringLights x={256} y={286} width={242} />

      {/* Cassetta delle lettere */}
      <g transform="translate(130,450)">
        <ellipse cx={0} cy={3} rx={20} ry={6} fill={C.shadow} opacity="0.25" />
        <rect x={-3} y={-38} width={6} height={40} rx={2} fill={C.wood800} />
        <rect x={-19} y={-78} width={38} height={42} rx={6} fill={C.red} />
        <rect x={-19} y={-78} width={38} height={10} rx={5} fill={C.redDark} />
        <rect x={-11} y={-66} width={22} height={5} rx={2} fill={C.wood800} opacity="0.85" />
        <path d="M-22,-78 L0,-92 L22,-78 Z" fill={C.snow} />
        <rect x={-14} y={-56} width={28} height={9} rx={2} fill={C.cream100} opacity="0.9" />
        <path d="M-18,-86 q18,-8 36,0" stroke={C.gold} strokeWidth="2" fill="none" opacity="0.8" />
      </g>

      {/* Archivio: casse e pacchi impilati */}
      <g transform="translate(480,450)">
        <ellipse cx={0} cy={4} rx={38} ry={10} fill={C.shadow} opacity="0.22" />
        <rect x={-34} y={-30} width={38} height={34} rx={3} fill={C.wood400} />
        <rect x={-34} y={-30} width={38} height={7} rx={3} fill={C.wood300} />
        <rect x={4} y={-22} width={30} height={26} rx={3} fill={C.wood500} />
        <rect x={-28} y={-62} width={32} height={32} rx={3} fill={C.cream200} />
        <path d="M-28,-62 l32,32 M4,-62 l-32,32" stroke={C.wood500} strokeWidth="2" opacity="0.5" />
        <rect x={-24} y={-70} width={22} height={8} rx={2} fill={C.cream100} />
        <rect x={6} y={-48} width={26} height={20} rx={2} fill={C.cream300} />
        <rect x={-6} y={-84} width={10} height={8} rx={1} fill={C.redLight} />
      </g>

      {/* Slitta parcheggiata */}
      <g transform="translate(560,520)">
        <ellipse cx={0} cy={6} rx={46} ry={12} fill={C.shadow} opacity="0.22" />
        <path d="M-44,0 q46,16 88,-2" stroke={C.wood800} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M-44,0 q-8,-12 4,-18" stroke={C.wood800} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M-34,-10 l72,0 l-12,-26 l-46,0 Z" fill={C.red} />
        <path d="M-34,-10 l72,0 l-4,-8 l-66,0 Z" fill={C.redDark} />
        <path d="M-30,-14 q32,8 64,-2" stroke={C.gold} strokeWidth="2.5" fill="none" />
        <rect x={-8} y={-48} width={26} height={22} rx={3} fill={C.goldDark} />
        <rect x={-2} y={-50} width={18} height={6} rx={2} fill={C.gold} />
        <path d="M-40,-30 q20,-12 40,-4 q18,8 38,0" stroke={C.ice300} strokeWidth="3" fill="none" opacity="0.8" />
      </g>

      <SnowMound x={210} y={470} rx={54} ry={12} />
      <SnowMound x={380} y={492} rx={60} ry={14} />
      <Pine x={520} y={318} scale={0.62} />
      <Pine x={180} y={330} scale={0.45} tone={C.pine600} />
      <DistantPine x={90} y={360} scale={0.7} />
      <LampPost x={214} y={470} scale={0.85} />
    </g>
  );
}

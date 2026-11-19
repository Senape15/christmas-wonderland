import {
  C,
  GiftBox,
  LampPost,
  Pine,
  SnowMound,
  StringLights,
  TimberHouse,
} from "./primitives";

/**
 * Negozio dei Giocattoli.
 *
 * Hotspot (percentuali): trenino (30, 87.27) · vetrina (18.75, 74.55)
 * · scaffale (8.13, 82.73) · cavallo (4.38, 91.82)
 */
export function ZoneToyShop() {
  return (
    <g aria-hidden="true">
      <TimberHouse
        x={150}
        y={750}
        width={280}
        height={150}
        roofHeight={98}
        wall="#7d5236"
        side={C.wood700}
        awning="green"
        doorOffset={58}
        sign={
          <g>
            <rect x={94} y={180} width={92} height={24} rx={4} fill={C.pine800} />
            <rect x={94} y={180} width={92} height={24} rx={4} fill="none" stroke={C.gold} strokeWidth="2" />
            <text
              x={140}
              y={197}
              textAnchor="middle"
              fontSize="12"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontWeight="700"
              fill={C.goldLight}
              letterSpacing="1"
            >
              GIOCATTOLI
            </text>
          </g>
        }
      >
        {/* Vetrina principale */}
        <g>
          <rect x={78} y={58} width={110} height={64} rx={4} fill={C.wood800} />
          <rect x={84} y={64} width={98} height={52} rx={3} fill={C.goldLight} opacity="0.92" />
          <rect x={84} y={64} width={98} height={20} rx={3} fill={C.gold} opacity="0.38" />
          <rect x={132} y={64} width={3} height={52} fill={C.wood800} />
          {/* giocattoli in vetrina */}
          <circle cx={104} cy={104} r={8} fill={C.cream200} />
          <circle cx={102} cy={102} r={2} fill={C.wood800} />
          <circle cx={108} cy={102} r={2} fill={C.wood800} />
          <rect x={148} y={96} width={22} height={12} rx={2} fill={C.red} />
          <circle cx={152} cy={108} r={4} fill={C.wood800} />
          <circle cx={166} cy={108} r={4} fill={C.wood800} />
          <path d="M118,110 l6,-14 l6,14 Z" fill={C.pine600} />
          <path d="M100,124 q49,7 98,0" stroke={C.snow} strokeWidth="4" fill="none" />
        </g>
        {/* Piccolo trenino di legno sul davanzale */}
        <g transform="translate(212,118)">
          <rect x={-24} y={0} width={48} height={6} rx={3} fill={C.wood600} />
          <rect x={-16} y={-14} width={20} height={14} rx={2} fill={C.red} />
          <circle cx={-10} cy={3} r={4} fill={C.wood800} />
          <circle cx={2} cy={3} r={4} fill={C.wood800} />
          <rect x={6} y={-10} width={12} height={10} rx={2} fill={C.gold} />
        </g>
      </TimberHouse>

      <StringLights x={156} y={726} width={272} />

      {/* Scaffale dei giocattoli all'aperto */}
      <g transform="translate(130,910)">
        <ellipse cx={0} cy={4} rx={34} ry={9} fill={C.shadow} opacity="0.22" />
        <rect x={-32} y={-64} width={6} height={66} fill={C.wood700} />
        <rect x={26} y={-64} width={6} height={66} fill={C.wood700} />
        <rect x={-32} y={-64} width={64} height={7} rx={2} fill={C.wood500} />
        <rect x={-32} y={-36} width={64} height={6} rx={2} fill={C.wood500} />
        <rect x={-32} y={-8} width={64} height={6} rx={2} fill={C.wood500} />
        {/* giocattoli sugli scaffali */}
        <circle cx={-18} cy={-74} r={8} fill={C.cream200} />
        <circle cx={-18} cy={-76} r={2} fill={C.wood800} />
        <rect x={2} y={-82} width={16} height={17} rx={2} fill={C.pine600} />
        <path d="M2,-82 l8,-8 l8,8 Z" fill={C.red} />
        <circle cx={-14} cy={-44} r={7} fill={C.red} />
        <circle cx={-14} cy={-44} r={3} fill={C.goldLight} />
        <rect x={4} y={-52} width={18} height={15} rx={2} fill={C.gold} />
        <path d="M-22,-16 l10,-12 l10,12 Z" fill={C.ice500} />
        <rect x={4} y={-20} width={16} height={12} rx={2} fill={C.redLight} />
        <path d="M-32,-64 q32,-9 64,0" stroke={C.snow} strokeWidth="3" fill="none" />
      </g>

      {/* Cavallo a dondolo */}
      <g transform="translate(70,1010) scale(1.15)">
        <ellipse cx={0} cy={4} rx={40} ry={10} fill={C.shadow} opacity="0.2" />
        <path d="M-38,0 Q0,16 38,0" stroke={C.wood600} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M-22,-2 l6,-22 M22,-2 l-6,-22" stroke={C.wood600} strokeWidth="5" strokeLinecap="round" />
        <path d="M-26,-24 q10,-14 26,-12 q14,2 20,-10 l6,8 q-8,12 -22,12 q-16,0 -24,10 Z" fill={C.cream100} />
        <path d="M-26,-24 q10,-14 26,-12 q14,2 20,-10 l6,8 q-8,12 -22,12 q-16,0 -24,10 Z" fill={C.red} opacity="0.85" />
        <path d="M20,-34 l6,-16 l6,4 l-4,10 Z" fill={C.gold} />
        <circle cx={26} cy={-36} r={2} fill={C.wood800} />
        <path d="M-10,-26 q8,-6 16,0" stroke={C.goldDark} strokeWidth="3" fill="none" />
        <path d="M-24,-30 q6,-4 12,0" stroke={C.pine700} strokeWidth="3" fill="none" />
        <path d="M-40,-30 l-8,-6 l-2,8 Z" fill={C.cream200} />
      </g>

      {/* Trenino su binario circolare */}
      <g transform="translate(480,960)">
        <ellipse cx={0} cy={0} rx={90} ry={38} fill="none" stroke={C.wood600} strokeWidth="4" strokeDasharray="9 7" opacity="0.85" />
        <ellipse cx={0} cy={0} rx={76} ry={30} fill={C.ice300} opacity="0.16" />
        {/* stazione */}
        <g transform="translate(-58,-30)">
          <rect x={-14} y={-14} width={28} height={16} rx={2} fill={C.cream200} />
          <path d="M-18,-14 L0,-26 L18,-14 Z" fill={C.red} />
          <rect x={-4} y={-8} width={8} height={10} fill={C.wood700} />
        </g>
        {/* locomotiva */}
        <g transform="translate(26,10) rotate(-8)">
          <rect x={-22} y={-16} width={34} height={16} rx={3} fill={C.pine700} />
          <rect x={8} y={-24} width={14} height={14} rx={2} fill={C.gold} />
          <rect x={2} y={-32} width={7} height={10} rx={2} fill={C.wood800} />
          <circle cx={-14} cy={2} r={5} fill={C.wood800} />
          <circle cx={-2} cy={2} r={5} fill={C.wood800} />
          <circle cx={14} cy={2} r={5} fill={C.wood800} />
          <circle cx={15} cy={-30} r={7} fill={C.frost} opacity="0.6" className="village-smoke" style={{ animationDuration: "3.6s" }} />
        </g>
        <g transform="translate(-46,22) rotate(6) scale(0.8)">
          <rect x={-12} y={-12} width={26} height={13} rx={2} fill={C.red} />
          <circle cx={-6} cy={2} r={4} fill={C.wood800} />
          <circle cx={6} cy={2} r={4} fill={C.wood800} />
        </g>
        <GiftBox x={54} y={-4} size={16} color={C.cream100} ribbon={C.red} rotate={10} />
      </g>

      <SnowMound x={330} y={930} rx={48} ry={11} />
      <SnowMound x={210} y={962} rx={40} ry={10} />
      <Pine x={108} y={760} scale={0.42} />
      <LampPost x={390} y={900} scale={0.78} />
    </g>
  );
}

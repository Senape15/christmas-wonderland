import {
  C,
  Chimney,
  LampPost,
  Pine,
  SnowMound,
  StringLights,
  TimberHouse,
} from "./primitives";

/**
 * Pasticceria.
 *
 * Hotspot (percentuali): forno (70, 80.91) · vetrina (81.25, 73.64)
 * · tavolino (91.25, 80.91) · dispensa (95.63, 89.09)
 */
export function ZoneBakery() {
  return (
    <g aria-hidden="true">
      <TimberHouse
        x={1150}
        y={740}
        width={300}
        height={160}
        roofHeight={104}
        wall="#8a5a3f"
        side={C.wood700}
        awning="red"
        doorOffset={-52}
        sign={
          <g>
            <rect x={112} y={182} width={108} height={26} rx={5} fill={C.cream100} />
            <rect x={112} y={182} width={108} height={26} rx={5} fill="none" stroke={C.gold} strokeWidth="2" />
            <text
              x={166}
              y={200}
              textAnchor="middle"
              fontSize="12"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontWeight="700"
              fill={C.redDark}
              letterSpacing="1"
            >
              DOLCI
            </text>
          </g>
        }
      >
        {/* Vetrina dei dolci */}
        <g>
          <rect x={126} y={62} width={96} height={62} rx={4} fill={C.wood800} />
          <rect x={132} y={68} width={84} height={50} rx={3} fill={C.goldLight} opacity="0.95" />
          <rect x={132} y={68} width={84} height={20} rx={3} fill={C.gold} opacity="0.4" />
          <rect x={174} y={68} width={3} height={50} fill={C.wood800} />
          {/* torte e biscotti */}
          <circle cx={148} cy={104} r={9} fill={C.cream50} />
          <circle cx={148} cy={101} r={4} fill={C.red} />
          <rect x={162} y={98} width={11} height={9} rx={2} fill={C.wood400} />
          <path d="M186,108 q6,-12 12,0 Z" fill={C.redLight} />
          <circle cx={199} cy={100} r={4} fill={C.cream200} />
          <path d="M124,124 q48,7 96,0" stroke={C.snow} strokeWidth="4" fill="none" />
        </g>
        {/* Vassoio di biscotti sul davanzale */}
        <g transform="translate(60,120)">
          <rect x={-20} y={0} width={40} height={7} rx={3} fill={C.wood600} />
          <circle cx={-12} cy={-3} r={4.5} fill={C.goldLight} />
          <circle cx={0} cy={-3} r={4.5} fill={C.gold} />
          <circle cx={12} cy={-3} r={4.5} fill={C.goldLight} />
        </g>
      </TimberHouse>

      <Chimney x={1206} y={226} scale={0.85} />
      <StringLights x={1156} y={716} width={292} />

      {/* Forno a legna */}
      <g transform="translate(1120,890)">
        <ellipse cx={0} cy={4} rx={46} ry={12} fill={C.shadow} opacity="0.22" />
        <path d="M-42,0 L-42,-44 Q0,-86 42,-44 L42,0 Z" fill="#8e5b47" />
        <path d="M-42,0 L-42,-44 Q-22,-63 0,-70 L0,0 Z" fill="#a16852" opacity="0.75" />
        {/* mattoni */}
        {[0, 1, 2].map((row) => (
          <path
            key={row}
            d={`M-40,${-14 - row * 16} q40,-6 80,0`}
            stroke="#6e4234"
            strokeWidth="2"
            fill="none"
            opacity="0.55"
          />
        ))}
        <path d="M-18,0 L-18,-20 Q0,-34 18,-20 L18,0 Z" fill={C.wood800} />
        <path d="M-14,0 L-14,-18 Q0,-29 14,-18 L14,0 Z" fill="#f7b267" />
        <path d="M-14,0 L-14,-18 Q0,-29 14,-18 L14,0 Z" fill={C.gold} opacity="0.5" />
        <circle cx={0} cy={-12} r={22} fill={C.gold} opacity="0.22" />
        <path d="M-44,-44 Q0,-62 44,-44 L40,-36 Q0,-52 -40,-36 Z" fill={C.snow} />
      </g>

      {/* Tavolino esterno */}
      <g transform="translate(1460,890)">
        <ellipse cx={0} cy={6} rx={44} ry={12} fill={C.shadow} opacity="0.2" />
        <rect x={-2} y={-30} width={4} height={34} fill={C.wood700} />
        <ellipse cx={0} cy={-32} rx={40} ry={12} fill={C.cream100} />
        <ellipse cx={0} cy={-36} rx={38} ry={11} fill={C.cream50} />
        <ellipse cx={0} cy={-38} rx={34} ry={8} fill={C.snow} opacity="0.8" />
        <ellipse cx={-14} cy={-42} rx={6} ry={4} fill={C.red} />
        <ellipse cx={14} cy={-44} rx={6} ry={4} fill={C.pine600} />
        {/* sgabelli */}
        <rect x={-44} y={-16} width={16} height={6} rx={3} fill={C.wood600} />
        <rect x={-38} y={-12} width={4} height={12} fill={C.wood700} />
        <rect x={28} y={-16} width={16} height={6} rx={3} fill={C.wood600} />
        <rect x={34} y={-12} width={4} height={12} fill={C.wood700} />
      </g>

      {/* Dispensa */}
      <g transform="translate(1530,980)">
        <ellipse cx={0} cy={4} rx={34} ry={10} fill={C.shadow} opacity="0.22" />
        <rect x={-34} y={-62} width={64} height={64} rx={4} fill={C.wood400} />
        <rect x={-34} y={-62} width={64} height={8} fill={C.wood300} />
        <path d="M-40,-62 L-2,-88 L36,-62 Z" fill={C.snow} />
        <path d="M-30,-62 L-2,-80 L26,-62" stroke={C.wood600} strokeWidth="4" fill="none" />
        <rect x={-24} y={-46} width={20} height={26} rx={3} fill={C.cream200} />
        <rect x={-22} y={-50} width={16} height={5} rx={2} fill={C.red} />
        <rect x={4} y={-40} width={16} height={20} rx={3} fill={C.cream300} />
        <rect x={2} y={-44} width={20} height={5} rx={2} fill={C.pine600} />
        <rect x={-6} y={-16} width={30} height={16} rx={3} fill={C.wood500} />
      </g>

      <SnowMound x={1090} y={930} rx={44} ry={10} />
      <SnowMound x={1400} y={944} rx={52} ry={12} />
      <Pine x={1520} y={800} scale={0.5} />
      <LampPost x={1072} y={840} scale={0.8} />
    </g>
  );
}

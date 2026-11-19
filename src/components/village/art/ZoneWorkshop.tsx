import {
  C,
  Chimney,
  GiftBox,
  LampPost,
  Pine,
  SnowMound,
  StringLights,
  TimberHouse,
} from "./primitives";

/**
 * Laboratorio di Babbo Natale.
 *
 * Hotspot (percentuali): banco (63.75, 39.09) · camino (77.5, 30.91)
 * · macchina (86.88, 40) · magazzino (70.63, 46.36)
 */
export function ZoneWorkshop() {
  return (
    <g aria-hidden="true">
      <TimberHouse
        x={1080}
        y={280}
        width={340}
        height={170}
        roofHeight={106}
        wall="#6f4a2e"
        side={C.wood800}
        awning={null}
        doorOffset={-64}
        sign={
          <g>
            <rect x={128} y={196} width={96} height={24} rx={4} fill={C.wood800} />
            <rect x={128} y={196} width={96} height={24} rx={4} fill="none" stroke={C.gold} strokeWidth="2" />
            <text
              x={176}
              y={213}
              textAnchor="middle"
              fontSize="11"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontWeight="700"
              fill={C.goldLight}
              letterSpacing="0.6"
            >
              LABORATORIO
            </text>
          </g>
        }
      >
        {/* Scaffali di giocattoli in lavorazione dietro le finestre */}
        <g transform="translate(246,60)">
          <rect x={0} y={0} width={30} height={40} rx={2} fill={C.wood800} opacity="0.5" />
          <rect x={4} y={6} width={22} height={5} fill={C.wood300} />
          <rect x={4} y={20} width={22} height={5} fill={C.wood300} />
          <path d="M8,18 l4,-6 l4,6 Z" fill={C.red} />
          <rect x={18} y={34} width={8} height={6} rx={1} fill={C.gold} />
        </g>
        {/* Attrezzi appesi */}
        <g transform="translate(76,52)">
          <path d="M0,0 l0,20" stroke={C.cream300} strokeWidth="3" />
          <path d="M-5,20 l10,0 l-5,10 Z" fill={C.frost} />
          <path d="M16,4 l0,18" stroke={C.cream300} strokeWidth="3" />
          <rect x={10} y={20} width={12} height={6} rx={2} fill={C.frost} />
        </g>
      </TimberHouse>

      <Chimney x={1252} y={196} scale={0.95} />
      <StringLights x={1086} y={256} width={330} />

      {/* Banco da lavoro esterno */}
      <g transform="translate(1020,430)">
        <ellipse cx={0} cy={4} rx={56} ry={13} fill={C.shadow} opacity="0.22" />
        <rect x={-50} y={-32} width={100} height={9} rx={3} fill={C.wood400} />
        <rect x={-50} y={-23} width={100} height={6} fill={C.wood600} />
        <rect x={-46} y={-23} width={8} height={26} fill={C.wood700} />
        <rect x={38} y={-23} width={8} height={26} fill={C.wood700} />
        {/* attrezzi sul banco */}
        <rect x={-34} y={-44} width={20} height={8} rx={2} fill={C.frost} />
        <rect x={-30} y={-52} width={8} height={10} rx={2} fill={C.wood500} />
        <path d="M-4,-32 l14,-12" stroke={C.wood800} strokeWidth="4" strokeLinecap="round" />
        <path d="M8,-42 l8,-6" stroke={C.frost} strokeWidth="4" strokeLinecap="round" />
        <rect x={20} y={-40} width={14} height={9} rx={2} fill={C.gold} />
        <path d="M-40,-32 q4,-5 9,0" stroke={C.wood700} strokeWidth="2" fill="none" />
        <path d="M16,-22 q10,-8 20,0 q-10,6 -20,0 Z" fill={C.cream200} opacity="0.6" />
      </g>

      {/* Macchina dei giocattoli */}
      <g transform="translate(1390,440)">
        <ellipse cx={0} cy={4} rx={40} ry={11} fill={C.shadow} opacity="0.24" />
        <rect x={-30} y={-64} width={60} height={64} rx={5} fill="#4a5568" />
        <rect x={-30} y={-64} width={60} height={10} rx={4} fill="#5b6779" />
        <rect x={-18} y={-52} width={36} height={20} rx={3} fill={C.pine800} />
        <circle cx={0} cy={-42} r={9} fill={C.gold} opacity="0.9" />
        <path d="M-4,-42 l8,-4 l0,8 Z" fill={C.wood800} />
        <rect x={-26} y={-24} width={52} height={6} rx={3} fill="#3a4452" />
        {[0, 1, 2].map((index) => (
          <circle
            key={index}
            cx={-8 + index * 10}
            cy={-12}
            r={4 + index}
            fill={C.frost}
            opacity="0.55"
            className="village-smoke"
            style={{ animationDelay: `${index === 0 ? "0s" : index === 1 ? "1.2s" : "2.4s"}`, animationDuration: "4s" }}
          />
        ))}
        {/* nastro trasportatore */}
        <rect x={-44} y={-6} width={88} height={7} rx={3} fill={C.wood700} />
        <circle cx={-30} cy={0} r={5} fill={C.wood800} />
        <circle cx={30} cy={0} r={5} fill={C.wood800} />
        <GiftBox x={22} y={-22} size={14} color={C.red} ribbon={C.goldLight} />
      </g>

      {/* Magazzino: casse e pacchi */}
      <g transform="translate(1130,510)">
        <ellipse cx={0} cy={4} rx={62} ry={14} fill={C.shadow} opacity="0.22" />
        <rect x={-56} y={-40} width={54} height={44} rx={3} fill={C.wood500} />
        <rect x={-56} y={-40} width={54} height={8} fill={C.wood400} />
        <path d="M-50,-32 l42,0 M-50,-20 l42,0" stroke={C.wood700} strokeWidth="2" opacity="0.6" />
        <rect x={4} y={-30} width={46} height={34} rx={3} fill={C.wood600} />
        <rect x={-44} y={-72} width={44} height={32} rx={3} fill={C.cream200} />
        <path d="M-44,-72 l44,32 M0,-72 l-44,32" stroke={C.wood500} strokeWidth="2" opacity="0.5" />
        <rect x={8} y={-58} width={34} height={28} rx={2} fill={C.cream300} />
        <rect x={14} y={-64} width={22} height={7} rx={2} fill={C.red} />
        <rect x={-10} y={-96} width={22} height={22} rx={2} fill={C.gold} />
        <path d="M-10,-96 l22,22 M12,-96 l-22,22" stroke={C.redDark} strokeWidth="2" opacity="0.6" />
      </g>

      <SnowMound x={1180} y={470} rx={54} ry={12} />
      <SnowMound x={1340} y={478} rx={46} ry={11} />
      <Pine x={1064} y={300} scale={0.55} tone={C.pine600} />
      <LampPost x={1060} y={470} scale={0.8} />
    </g>
  );
}

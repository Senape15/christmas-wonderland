import {
  C,
  LampPost,
  Pine,
  Skater,
  SmallLantern,
  SnowMound,
  TimberHouse,
} from "./primitives";

/**
 * Lago Ghiacciato.
 *
 * Hotspot (percentuali): ponte (43.75, 78) · chalet (61.25, 84.73)
 * · slitta (53.75, 92) · lanterna (35.94, 84.09)
 */
export function ZoneLake() {
  return (
    <g aria-hidden="true">
      {/* Bacino del lago */}
      <ellipse cx={780} cy={950} rx={300} ry={132} fill="#8fb8d6" opacity="0.55" />
      <ellipse cx={780} cy={950} rx={286} ry={122} fill={C.ice300} opacity="0.75" />
      <ellipse cx={780} cy={946} rx={262} ry={108} fill="#cfe8ff" opacity="0.55" />

      {/* Crepe e riflessi sul ghiaccio */}
      <path d="M600,930 q60,-10 120,4 q60,14 118,0" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.55" />
      <path d="M660,1006 q40,-14 84,-4" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.45" />
      <path d="M840,884 q50,10 92,-2" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.45" />
      <path d="M712,872 l-18,26 l14,6" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M902,972 l22,20 l-10,10" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.4" />

      {/* Riva innevata */}
      <path d="M470,952 q60,-40 120,-10 q40,20 30,60 q-60,40 -120,10 q-50,-24 -30,-60 Z" fill={C.snowSoft} opacity="0.9" />
      <path d="M1050,960 q50,-26 92,6 q30,26 4,54 q-56,26 -98,-4 q-28,-26 2,-56 Z" fill={C.snowSoft} opacity="0.9" />

      {/* Ponte di legno */}
      <g transform="translate(700,858)">
        {/* arcata sotto il ponte */}
        <path d="M-86,22 Q0,74 86,22" stroke={C.wood700} strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M-86,22 Q0,66 86,22" stroke={C.wood500} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* impalcato */}
        <rect x={-96} y={-6} width={192} height={14} rx={4} fill={C.wood600} />
        <rect x={-96} y={-10} width={192} height={7} rx={3} fill={C.snow} />
        {Array.from({ length: 11 }, (_, index) => (
          <rect key={index} x={-92 + index * 18} y={-4} width={3} height={12} fill={C.wood800} opacity="0.5" />
        ))}
        {/* parapetti */}
        <rect x={-92} y={-44} width={6} height={42} rx={3} fill={C.wood700} />
        <rect x={86} y={-44} width={6} height={42} rx={3} fill={C.wood700} />
        <path d="M-89,-40 Q0,-20 89,-40" stroke={C.wood500} strokeWidth="5" fill="none" />
        <path d="M-89,-40 Q0,-20 89,-40" stroke={C.snow} strokeWidth="2" fill="none" opacity="0.8" />
        {[-60, -30, 0, 30, 60].map((offset) => (
          <rect key={offset} x={offset - 2} y={-38} width={4} height={30} rx={2} fill={C.wood700} />
        ))}
      </g>

      {/* Chalet sull'isolotto */}
      <g>
        <ellipse cx={980} cy={958} rx={78} ry={26} fill={C.snowSoft} />
        <ellipse cx={980} cy={966} rx={86} ry={26} fill={C.ice400} opacity="0.45" />
        <TimberHouse
          x={928}
          y={880}
          width={104}
          height={78}
          roofHeight={54}
          wall={C.wood400}
          side={C.wood600}
          doorOffset={26}
        >
          <rect x={10} y={-54} width={12} height={24} fill="#8e5b47" />
          <rect x={9} y={-58} width={14} height={6} rx={2} fill={C.snow} />
          <rect x={78} y={54} width={16} height={12} rx={2} fill={C.wood800} />
        </TimberHouse>
        <SnowMound x={1006} y={962} rx={26} ry={7} />
      </g>

      {/* Slitta sul lago */}
      <g transform="translate(860,1012)">
        <ellipse cx={0} cy={5} rx={44} ry={11} fill="#5b86a6" opacity="0.3" />
        <path d="M-40,0 q44,14 82,-2" stroke={C.wood800} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M-40,0 q-8,-10 2,-16" stroke={C.wood800} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M-32,-8 l66,0 l-10,-24 l-44,0 Z" fill={C.pine600} />
        <path d="M-32,-8 l66,0 l-4,-7 l-58,0 Z" fill={C.pine800} />
        <path d="M-28,-12 q30,7 58,-2" stroke={C.gold} strokeWidth="2" fill="none" />
        <path d="M-18,-32 q18,-8 34,0 q-16,10 -34,0 Z" fill={C.red} />
        <path d="M-22,-30 q6,4 12,2" stroke={C.cream100} strokeWidth="2" fill="none" />
      </g>

      {/* Lanterna sulla riva */}
      <SmallLantern x={575} y={925} scale={1.15} />

      {/* Pattinatori */}
      <Skater x={672} y={1000} scale={1.05} color={C.red} />
      <Skater x={930} y={1004} scale={0.95} color={C.pine600} />
      <Skater x={748} y={1032} scale={0.8} color={C.goldDark} />

      {/* Cannaie e cumuli di neve */}
      <path d="M512,918 q6,-26 12,0 M520,922 q8,-30 14,-2" stroke={C.wood600} strokeWidth="2.5" fill="none" opacity="0.7" />
      <SnowMound x={540} y={960} rx={40} ry={10} />
      <SnowMound x={1020} y={1000} rx={36} ry={9} />
      <Pine x={1080} y={900} scale={0.6} />
      <Pine x={470} y={880} scale={0.5} tone={C.pine600} />
      <LampPost x={1046} y={1008} scale={0.72} />
    </g>
  );
}

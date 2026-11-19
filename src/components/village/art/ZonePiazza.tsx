import { C, GiftBox, LampPost, Pine, SnowMound, StringLights } from "./primitives";

/**
 * Piazza Centrale – il cuore del villaggio.
 *
 * Coordinate degli hotspot (percentuali sul mondo 1600 × 1100):
 *   albero (50, 45.91) · fontana (37.5, 60) · panchina (55, 65.45) · lampione (66.25, 62.73)
 */
export function ZonePiazza() {
  return (
    <g aria-hidden="true">
      {/* Lastricato innevato della piazza */}
      <ellipse cx={820} cy={665} rx={340} ry={158} fill="#cfdae4" opacity="0.75" />
      <ellipse cx={820} cy={665} rx={308} ry={138} fill="#e6eef4" opacity="0.9" />
      <ellipse cx={820} cy={665} rx={250} ry={104} fill={C.snowSoft} opacity="0.9" />

      {[0, 1, 2, 3].map((ring) => (
        <ellipse
          key={ring}
          cx={820}
          cy={665}
          rx={286 - ring * 22}
          ry={126 - ring * 12}
          fill="none"
          stroke="#b9c9d6"
          strokeWidth="2"
          opacity="0.5"
        />
      ))}

      {/* Grande albero di Natale */}
      <g>
        <ellipse cx={800} cy={658} rx={92} ry={22} fill={C.shadow} opacity="0.22" />
        <rect x={788} y={548} width={24} height={112} rx={5} fill={C.wood700} />
        <rect x={794} y={548} width={7} height={112} fill={C.wood600} opacity="0.7" />

        <path d="M800,352 L718,470 L882,470 Z" fill={C.pine700} />
        <path d="M800,412 L700,540 L900,540 Z" fill={C.pine700} />
        <path d="M800,486 L678,632 L922,632 Z" fill={C.pine800} />

        <path d="M800,352 L756,432 L778,430 L744,492 L800,470 Z" fill={C.snow} opacity="0.72" />
        <path d="M800,412 L742,504 L768,500 L734,556 L800,534 Z" fill={C.snow} opacity="0.55" />
        <path d="M800,486 L724,598 L756,592 L714,642 L800,618 Z" fill={C.snow} opacity="0.42" />

        <StringLights x={716} y={520} width={168} />
        <StringLights x={694} y={590} width={212} />

        {/* Stella in cima */}
        <path
          d="M800,318 L806,336 L825,338 L811,350 L815,368 L800,358 L785,368 L789,350 L775,338 L794,336 Z"
          fill={C.goldLight}
        />
        <circle cx={800} cy={344} r={26} fill={C.gold} opacity="0.22" />

        <GiftBox x={748} y={628} size={26} color={C.red} />
        <GiftBox x={782} y={634} size={22} color={C.pine600} ribbon={C.goldLight} />
        <GiftBox x={812} y={626} size={28} color={C.cream100} ribbon={C.red} />
        <GiftBox x={846} y={636} size={20} color={C.gold} ribbon={C.redDark} rotate={-6} />
      </g>

      {/* Fontana ghiacciata */}
      <g>
        <ellipse cx={600} cy={654} rx={62} ry={18} fill={C.shadow} opacity="0.18" />
        <ellipse cx={600} cy={636} rx={58} ry={20} fill="#c3d3e0" />
        <path d="M542,636 L542,650 Q600,676 658,650 L658,636 Q600,660 542,636 Z" fill="#9fb5c6" />
        <ellipse cx={600} cy={636} rx={48} ry={14} fill={C.ice300} opacity="0.9" />
        <path d="M600,632 L600,590" stroke={C.ice400} strokeWidth="7" strokeLinecap="round" />
        <path d="M600,596 q-22,-6 -26,-26 q22,2 26,26 Z" fill={C.ice300} opacity="0.9" />
        <path d="M600,604 q22,-8 24,-30 q-22,4 -24,30 Z" fill={C.ice300} opacity="0.8" />
        <circle cx={600} cy={584} r={9} fill={C.ice300} />
        <path d="M538,640 q10,8 22,4 q-12,10 -22,-4 Z" fill={C.snow} />
        <path d="M636,644 q14,6 26,-2 q-12,12 -26,2 Z" fill={C.snow} />

        {/* ghiaccioli */}
        <path d="M560,650 l3,14 l3,-14 Z" fill={C.ice300} opacity="0.85" />
        <path d="M630,652 l2.6,11 l2.6,-11 Z" fill={C.ice300} opacity="0.8" />
      </g>

      {/* Panchina innevata */}
      <g>
        <ellipse cx={880} cy={726} rx={54} ry={11} fill={C.shadow} opacity="0.2" />
        <rect x={838} y={690} width={8} height={36} rx={3} fill={C.wood800} />
        <rect x={914} y={690} width={8} height={36} rx={3} fill={C.wood800} />
        <rect x={840} y={700} width={80} height={9} rx={4} fill={C.wood500} />
        <rect x={840} y={712} width={80} height={8} rx={4} fill={C.wood500} />
        <rect x={840} y={682} width={80} height={8} rx={4} fill={C.wood600} />
        <rect x={840} y={674} width={80} height={8} rx={4} fill={C.wood600} />
        <path d="M838,674 q42,-12 84,0 q-12,6 -84,0 Z" fill={C.snow} />
        <path d="M838,700 q42,-9 84,0 q-12,5 -84,0 Z" fill={C.snow} opacity="0.9" />
      </g>

      {/* Lampione decorato */}
      <LampPost x={1060} y={700} scale={1.25} twin />

      <SnowMound x={980} y={748} rx={52} ry={13} />
      <SnowMound x={660} y={748} rx={46} ry={11} />

      {/* Piccoli abitanti */}
      <g transform="translate(700,690)">
        <ellipse cx={0} cy={2} rx={11} ry={3} fill={C.shadow} opacity="0.22" />
        <circle cx={0} cy={-30} r={6} fill={C.skin} />
        <path d="M-8,-50 q8,-6 16,0 l-2,5 q-6,-3 -12,0 Z" fill={C.red} />
        <path d="M0,-24 l-1,14 l-6,9" stroke={C.pine700} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M-1,-10 l7,8" stroke={C.pine700} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M-1,-22 l10,7" stroke={C.pine700} strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <g transform="translate(940,724) scale(0.92)">
        <ellipse cx={0} cy={2} rx={11} ry={3} fill={C.shadow} opacity="0.22" />
        <circle cx={0} cy={-30} r={6} fill={C.skin} />
        <path d="M-8,-50 q8,-6 16,0 l-2,5 q-6,-3 -12,0 Z" fill={C.pine700} />
        <path d="M0,-24 l-1,14 l-6,9" stroke={C.wood800} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M-1,-10 l7,8" stroke={C.wood800} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M-1,-22 l10,7" stroke={C.wood800} strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>

      <Pine x={1160} y={640} scale={0.55} />
    </g>
  );
}

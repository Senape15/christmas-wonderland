"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { NicoExpression } from "@/types/nico";

// Il tipo vive in `@/types/nico`: qui viene riesportato per non cambiare
// l'API pubblica della mascotte usata dalle fasi precedenti.
export type { NicoExpression };

interface NicoProps {
  expression?: NicoExpression;
  bubbleText?: string;
  showBubble?: boolean;
  animated?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Nico – piccolo elfo natalizio, mascot di Christmas Wonderland.
 *
 * La silhouette (cappello, sciarpa, tunica, stivali) è IDENTICA per
 * tutte le espressioni: cambia solo il gruppo volto (occhi/sopracciglia/bocca).
 * Sostituire l'SVG in un secondo momento = modificare solo questa componente.
 */
export function Nico({
  expression = "happy",
  bubbleText,
  showBubble = false,
  animated = true,
  className,
  ariaLabel = "Nico, l'elfo di Christmas Wonderland",
}: NicoProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <AnimatePresence>
        {showBubble && bubbleText && (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mb-3 max-w-xs rounded-2xl rounded-bl-sm border border-gold/40 bg-cream-50 px-4 py-3 text-sm font-medium text-pine-900 shadow-[var(--shadow-card)]"
            role="status"
          >
            {bubbleText}
            <span className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-gold/40 bg-cream-50" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.svg
        viewBox="0 0 200 240"
        className="h-auto w-full drop-shadow-lg"
        role="img"
        aria-label={ariaLabel}
        animate={shouldAnimate ? { y: [0, -6, 0] } : undefined}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Ombra a terra */}
        <ellipse cx="100" cy="228" rx="46" ry="8" fill="#041f12" opacity="0.4" />

        {/* Gambe e stivali */}
        <rect x="82" y="182" width="14" height="30" rx="4" fill="#3d2617" />
        <rect x="104" y="182" width="14" height="30" rx="4" fill="#3d2617" />
        <ellipse cx="87" cy="214" rx="13" ry="6" fill="#5a3a24" />
        <ellipse cx="113" cy="214" rx="13" ry="6" fill="#5a3a24" />

        {/* Tunica verde */}
        <path d="M70,120 L130,120 L142,190 L58,190 Z" fill="#1e7a4a" stroke="#d4a843" strokeWidth="2" />

        {/* Cintura rossa con fibbia oro */}
        <rect x="60" y="148" width="80" height="12" rx="3" fill="#c41e3a" />
        <rect x="93" y="146" width="14" height="16" rx="2" fill="none" stroke="#d4a843" strokeWidth="3" />

        {/* Braccia */}
        <path d="M70,124 L46,158 L56,166 L74,140 Z" fill="#1a5c38" />
        <path d="M130,124 L154,158 L144,166 L126,140 Z" fill="#1a5c38" />
        <circle cx="51" cy="162" r="7" fill="#ffd9b3" />
        <circle cx="149" cy="162" r="7" fill="#ffd9b3" />

        {/* Sciarpa dorata */}
        <rect x="66" y="106" width="68" height="16" rx="8" fill="#d4a843" />
        <path d="M118,114 L140,114 L136,152 L116,148 Z" fill="#d4a843" />
        <path d="M118,124 L138,124 M117,134 L136,131" stroke="#a8842f" strokeWidth="2" />

        {/* Orecchie da elfo */}
        <path d="M70,78 L50,64 L64,90 Z" fill="#ffd9b3" />
        <path d="M130,78 L150,64 L136,90 Z" fill="#ffd9b3" />

        {/* Testa */}
        <circle cx="100" cy="82" r="30" fill="#ffd9b3" />

        {/* Guance */}
        <circle cx="80" cy="94" r="4" fill="#f4a261" opacity="0.45" />
        <circle cx="120" cy="94" r="4" fill="#f4a261" opacity="0.45" />

        {/* ===== VOLTO (varia per espressione) ===== */}
        <Face expression={expression} />

        {/* Cappello da elfo */}
        <path
          d="M70,60 C80,32 112,20 130,34 C122,34 118,40 120,48 C110,36 88,42 78,64 Z"
          fill="#1a5c38"
        />
        <rect x="66" y="56" width="68" height="11" rx="5.5" fill="#c41e3a" />
        {/* Campanellino */}
        <line x1="128" y1="36" x2="132" y2="30" stroke="#d4a843" strokeWidth="2" />
        <circle cx="133" cy="28" r="5" fill="#d4a843" />
        <circle cx="133" cy="28" r="2" fill="#f0d78c" />
      </motion.svg>
    </div>
  );
}

function Face({ expression }: { expression: NicoExpression }) {
  switch (expression) {
    case "happy":
      return (
        <g>
          <path d="M82,76 Q88,73 94,76" stroke="#8b5e3c" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M106,76 Q112,73 118,76" stroke="#8b5e3c" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M82,86 Q88,80 94,86" stroke="#3d2617" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M106,86 Q112,80 118,86" stroke="#3d2617" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M86,95 Q100,110 114,95 Q100,101 86,95 Z" fill="#9b1b30" />
        </g>
      );
    case "curious":
      return (
        <g>
          <path d="M82,76 Q88,74 94,76" stroke="#8b5e3c" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M104,71 Q112,67 118,73" stroke="#8b5e3c" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="88" cy="85" r="4.5" fill="#3d2617" />
          <circle cx="112" cy="85" r="4.5" fill="#3d2617" />
          <circle cx="89.5" cy="83.5" r="1.5" fill="#ffffff" />
          <circle cx="113.5" cy="83.5" r="1.5" fill="#ffffff" />
          <path d="M94,100 Q100,103 106,100" stroke="#3d2617" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case "surprised":
      return (
        <g>
          <path d="M80,70 Q88,66 96,70" stroke="#8b5e3c" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M104,70 Q112,66 120,70" stroke="#8b5e3c" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="88" cy="85" r="6" fill="#ffffff" stroke="#3d2617" strokeWidth="1.5" />
          <circle cx="112" cy="85" r="6" fill="#ffffff" stroke="#3d2617" strokeWidth="1.5" />
          <circle cx="88" cy="86" r="2.5" fill="#3d2617" />
          <circle cx="112" cy="86" r="2.5" fill="#3d2617" />
          <ellipse cx="100" cy="102" rx="5" ry="7" fill="#9b1b30" />
        </g>
      );
    case "mysterious":
      return (
        <g>
          <path d="M80,78 Q88,75 96,78" stroke="#8b5e3c" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M104,74 Q112,71 118,75" stroke="#8b5e3c" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M82,86 Q88,89 94,86" stroke="#3d2617" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M106,86 Q112,89 118,86" stroke="#3d2617" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M90,98 Q100,103 110,97" stroke="#9b1b30" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      );
  }
}

export default Nico;

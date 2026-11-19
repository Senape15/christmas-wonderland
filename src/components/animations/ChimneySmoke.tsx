"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChimneySmokeProps {
  count?: number;
  className?: string;
}

/**
 * Fumo che esce dai camini: cerchi che salgono, si allargano e svaniscono.
 */
export function ChimneySmoke({ count = 3, className }: ChimneySmokeProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className={cn("pointer-events-none", className)} aria-hidden="true">
        <div className="h-3 w-3 rounded-full bg-frost/40 blur-sm" />
      </div>
    );
  }

  return (
    <div className={cn("pointer-events-none relative h-10 w-4", className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          className="absolute bottom-0 left-0 rounded-full bg-frost/50 blur-sm"
          style={{ width: 6 + i * 2, height: 6 + i * 2 }}
          initial={{ y: 0, opacity: 0.6, scale: 0.6 }}
          animate={{ y: -40, opacity: 0, scale: 2.4 }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 1.2,
          }}
        />
      ))}
    </div>
  );
}

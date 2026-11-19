/**
 * Christmas Wonderland – Design Tokens
 *
 * Centralizza colori, spaziature, tipografia e stili condivisi.
 * I valori sono espressi come classi Tailwind (stringhe) per essere
 * consumati dai componenti React senza importare CSS direttamente.
 */

export const COLORS = {
  // Verde abete
  pine: {
    950: "#041f12",
    900: "#0b2e1a",
    800: "#14432a",
    700: "#1a5c38",
    600: "#1e7a4a",
    500: "#22a05f",
    400: "#4dbb7f",
    300: "#83d4a8",
    200: "#b5e6cb",
    100: "#dcf3e6",
  },
  // Rosso natalizio
  red: {
    light: "#e63950",
    DEFAULT: "#c41e3a",
    dark: "#9b1b30",
  },
  // Oro caldo
  gold: {
    light: "#f0d78c",
    DEFAULT: "#d4a843",
    dark: "#a8842f",
    glow: "rgba(212, 168, 67, 0.4)",
  },
  // Bianco neve
  snow: "#fafbfc",
  snowSoft: "#f0f4f8",
  frost: "#e2e8f0",
  // Azzurro ghiaccio
  ice: {
    300: "#a5d8ff",
    400: "#74c0fc",
    500: "#4dabf7",
    900: "#1c3d5a",
  },
  // Marrone legno
  wood: {
    300: "#c49a6c",
    400: "#a67c52",
    500: "#8b5e3c",
    600: "#6f4a2e",
    700: "#5a3a24",
    800: "#3d2617",
  },
  // Toni crema
  cream: {
    50: "#fdfbf7",
    100: "#f5f0e6",
    200: "#ede4d3",
    300: "#e0d3bc",
  },
  // Notte
  night: {
    900: "#0a1628",
    800: "#101f38",
    700: "#1a2d4d",
  },
} as const;

export const SPACING = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
} as const;

export const TYPOGRAPHY = {
  fontFamily: "var(--font-sans)",
  sizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "3.75rem",
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const RADII = {
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
} as const;

export const SHADOWS = {
  card: "0 4px 24px rgba(0, 0, 0, 0.35)",
  cardHover: "0 8px 32px rgba(0, 0, 0, 0.45)",
  glowGold: "0 0 20px rgba(212, 168, 67, 0.35), 0 0 40px rgba(212, 168, 67, 0.15)",
  glowRed: "0 0 20px rgba(196, 30, 58, 0.35), 0 0 40px rgba(196, 30, 58, 0.15)",
  insetSnow: "inset 0 1px 0 rgba(255, 255, 255, 0.15)",
} as const;

export const TRANSITIONS = {
  fast: "150ms ease",
  normal: "250ms ease",
  slow: "400ms ease",
} as const;

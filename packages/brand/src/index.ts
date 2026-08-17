/**
 * Programmatic access to LIEND brand tokens.
 * Keep in sync with tokens.css — that file is the styling source of truth.
 */

export const liendColors = {
  ink: "#03040d",
  inkRaised: "#070913",
  inkSoft: "#0a0d19",
  inkMuted: "#101421",
  text: "#f4f6fb",
  textSoft: "#bbc2d2",
  textMuted: "#747e94",
  violet: "#7957ff",
  violetSoft: "#a68dff",
  blue: "#3d78ff",
  cyan: "#26d8e8",
  teal: "#28cfbc",
  danger: "#ff7f96",
  warning: "#eec781",
  success: "#53e0bd",
} as const

export const liendMotion = {
  /** Colour feedback across every surface. */
  color: "150ms ease-in",
  /** Panel and surface transitions in the App. */
  surface: "220ms cubic-bezier(0.2, 0.7, 0.2, 1)",
} as const

export type LiendColor = keyof typeof liendColors

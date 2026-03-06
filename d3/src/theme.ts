/**
 * trad-charts D3 theme — dark purple chrome with Catppuccin Mocha accents.
 *
 * Loads palette.json and maps tokens to ~25 semantic roles used by all components.
 * Every hardcoded color in the original tyche components is replaced with a
 * theme property so the entire palette can be changed in one place.
 */

import palette from '../../palette.json' with { type: 'json' };
import type { ColorScheme } from './types/options.ts';

// ---------------------------------------------------------------------------
// Font stacks
// ---------------------------------------------------------------------------

export const fonts = {
  body: `"${palette.fonts.body}", "DejaVu Sans", sans-serif`,
  title: `"${palette.fonts.title}", monospace`,
} as const;

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export const theme = {
  // Backgrounds
  background: palette.surfaces.base,
  surface: palette.surfaces.surface0,
  surfaceAlt: palette.surfaces.surface1,

  // Text hierarchy
  text: palette.text.text,
  textSecondary: palette.text.subtext0,
  textMuted: palette.overlays.overlay1,
  textShadow: 'rgba(15, 8, 18, 0.8)',

  // Borders & grid
  border: palette.surfaces.surface1,
  borderSubtle: palette.surfaces.surface2,
  grid: palette.grid.color,
  gridAlpha: palette.grid.alpha,

  // Semantic colors
  positive: palette.accents.green,
  negative: palette.accents.red,
  neutral: palette.accents.blue,
  reference: palette.overlays.overlay0,

  // Interactive / muted
  muted: palette.overlays.overlay1,
  disabled: palette.overlays.overlay0,

  // Tooltip
  tooltipBg: `rgba(37, 23, 48, 0.95)`, // surface0 at 95%
  tooltipText: palette.text.text,
  tooltipTextSecondary: `rgba(232, 227, 237, 0.9)`, // text at 90%

  // Context menu / hover
  hoverBg: palette.surfaces.surface0,

  // Violin fills (accents at low opacity for dark background)
  violinBelow: `rgba(243, 139, 168, 0.15)`, // red at 15%
  violinAbove: `rgba(166, 227, 161, 0.15)`, // green at 15%
  violinBelowStroke: `rgba(243, 139, 168, 0.30)`, // red at 30%
  violinAboveStroke: `rgba(166, 227, 161, 0.30)`, // green at 30%
  violinNeutral: palette.surfaces.surface1,

  // CI region
  ciRegionFill: palette.accents.blue,
  ciRegionFillOpacity: 0.08,
  ciRegionStroke: palette.accents.blue,
  ciRegionStrokeOpacity: 0.3,

  // Dot stroke (matches background so dots appear cleanly punched out)
  dotStroke: palette.surfaces.base,

  // Close button overlay (for tooltip pin)
  closeButtonBg: `rgba(232, 227, 237, 0.2)`, // text at 20%

  // Axis
  axisDomain: palette.text.subtext0,
  axisTick: palette.text.subtext0,

  // Editable input
  inputBorder: palette.text.subtext0,
  inputBg: palette.surfaces.surface0,
} as const;

export type TradTheme = typeof theme;

// ---------------------------------------------------------------------------
// Default color scheme for QuantileDots threshold coloring
// ---------------------------------------------------------------------------

export const defaultColorScheme: ColorScheme = {
  above: palette.accents.green,
  below: palette.overlays.overlay1,
  neutral: palette.accents.blue,
};

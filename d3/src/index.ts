/**
 * trad-charts D3 — Interactive chart components
 *
 * Dark purple chrome with Catppuccin Mocha accents.
 * Framework-agnostic D3 components using Mike Bostock's reusable chart pattern.
 */

// Core Components
export { QuantileDots } from './core/QuantileDots.ts';
export { RidgeDotplot } from './core/RidgeDotplot.ts';
export { DraggableCIBounds } from './core/DraggableCIBounds.ts';
export { ThresholdLine } from './core/ThresholdLine.ts';
export { Tooltip } from './core/Tooltip.ts';
export { HintArea } from './core/HintArea.ts';
export { ContextMenu } from './core/ContextMenu.ts';

// Theme
export { theme, fonts, defaultColorScheme } from './theme.ts';
export type { TradTheme } from './theme.ts';

// Types
export type {
  QuantileDotsData,
  RidgeDotplotData,
  VariantData,
  SortedSamplePair,
  ColorScheme,
  QuantileDotsOptions,
  CIBoundsOptions,
  ThresholdLineOptions,
  HintAreaOptions,
  ContextMenuOptions,
  ContextMenuItem,
  DotHoverEventDetail,
  DotClickEventDetail,
  CIDragEventDetail,
  ThresholdDragEventDetail,
  VariantClickEventDetail,
} from './types/index.ts';

// Utility functions
export {
  computeQuantiles,
  sortSamples,
  getCIBounds,
  getPercentile,
  getSortedPairs,
  convertPercentToEffect,
  convertEffectToPercent,
} from './utils/quantiles.ts';

export { computeKDE } from './utils/kde.ts';

export { validateSamples, validateCIBounds, validateNumDots } from './utils/validation.ts';

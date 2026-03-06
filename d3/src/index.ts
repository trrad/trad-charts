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
export { ForestPlot } from './core/ForestPlot.ts';
export { CIBand } from './core/CIBand.ts';
export { DensityCompare } from './core/DensityCompare.ts';

// Theme
export { theme, fonts, defaultColorScheme, seriesColors } from './theme.ts';
export type { TradTheme } from './theme.ts';

// Types
export type {
  QuantileDotsData,
  RidgeDotplotData,
  VariantData,
  SortedSamplePair,
  ForestPlotData,
  ForestPlotItem,
  CIBandData,
  DensityCompareData,
  DensityCompareSeries,
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
  ForestItemHoverEventDetail,
  ForestItemClickEventDetail,
  BandHoverEventDetail,
  DensityHoverEventDetail,
  SeriesToggleEventDetail,
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

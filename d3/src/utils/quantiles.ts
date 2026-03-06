/**
 * Quantile computation utilities for visualization components
 */

import * as d3 from 'd3';

export function computeQuantiles(samples: number[], numQuantiles = 20): number[] {
  if (!samples || samples.length === 0) {
    throw new Error('computeQuantiles: samples array cannot be empty');
  }

  if (numQuantiles < 2) {
    throw new Error(`computeQuantiles: numQuantiles must be >= 2, got ${numQuantiles}`);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;

  return Array.from({ length: numQuantiles }, (_, i) => {
    const p = (i + 0.5) / numQuantiles;
    const index = Math.floor(n * p);
    return sorted[Math.min(index, n - 1)];
  });
}

export function getCIBounds(
  sorted: number[],
  lowerP: number,
  upperP: number
): { lower: number; upper: number } {
  if (lowerP < 0 || lowerP > 1) {
    throw new Error(`getCIBounds: lowerP must be between 0 and 1, got ${lowerP}`);
  }
  if (upperP < 0 || upperP > 1) {
    throw new Error(`getCIBounds: upperP must be between 0 and 1, got ${upperP}`);
  }
  if (lowerP >= upperP) {
    throw new Error(`getCIBounds: lowerP (${lowerP}) must be < upperP (${upperP})`);
  }

  const n = sorted.length;
  const lowerIndex = Math.floor(n * lowerP);
  const upperIndex = Math.floor(n * upperP);

  return {
    lower: sorted[Math.min(lowerIndex, n - 1)],
    upper: sorted[Math.min(upperIndex, n - 1)],
  };
}

export function sortSamples(samples: number[]): number[] {
  if (!samples || samples.length === 0) {
    throw new Error('sortSamples: samples array cannot be empty');
  }

  const validSamples = samples.filter((x) => Number.isFinite(x));

  if (validSamples.length === 0) {
    throw new Error('sortSamples: no valid (finite) samples found');
  }

  if (validSamples.length < samples.length) {
    console.warn(
      `sortSamples: filtered out ${samples.length - validSamples.length} non-finite values`
    );
  }

  return [...validSamples].sort((a, b) => a - b);
}

export function getPercentile(sorted: number[], percentile: number): number {
  if (percentile < 0 || percentile > 1) {
    throw new Error(`getPercentile: percentile must be between 0 and 1, got ${percentile}`);
  }

  const n = sorted.length;
  const index = Math.floor(n * percentile);
  return sorted[Math.min(index, n - 1)];
}

export function getSortedPairs(
  samples: number[],
  effectSamples?: number[]
): Array<{ pct: number; effect: number }> | null {
  if (!effectSamples || effectSamples.length === 0) {
    return null;
  }

  if (samples.length !== effectSamples.length) {
    console.warn('getSortedPairs: samples and effectSamples have different lengths');
    return null;
  }

  const pairs = samples.map((pct, i) => ({
    pct,
    effect: effectSamples[i],
  }));

  pairs.sort((a, b) => a.pct - b.pct);

  return pairs;
}

export function convertPercentToEffect(
  percentThreshold: number,
  controlSamples?: number[] | null
): number {
  if (!controlSamples || controlSamples.length === 0) {
    return 0;
  }

  const meanControl = d3.mean(controlSamples) || 0;
  return percentThreshold * meanControl;
}

export function convertEffectToPercent(
  effectThreshold: number,
  controlSamples?: number[] | null
): number {
  if (!controlSamples || controlSamples.length === 0) {
    return 0;
  }

  const meanControl = d3.mean(controlSamples) || 0;

  if (meanControl === 0) {
    return 0;
  }

  return effectThreshold / meanControl;
}

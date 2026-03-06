/**
 * Kernel Density Estimation (KDE) for violin overlay visualization
 *
 * Implements Mike Bostock's approach with Silverman's rule for bandwidth selection
 * and Epanechnikov kernel (optimal for MSE).
 */

import * as d3 from 'd3';
import type { KDEPoint } from '../types/index.ts';

/**
 * Compute kernel density estimation for violin overlay
 *
 * Uses:
 * - Silverman's rule for automatic bandwidth selection
 * - Epanechnikov kernel (most efficient, optimal for MSE)
 * - Robust bandwidth estimation using IQR
 *
 * @param samples - Raw posterior samples
 * @param domain - [min, max] range for evaluation
 * @param numPoints - Number of evaluation points (default: 50)
 * @returns Array of {value, density} points for visualization
 */
export function computeKDE(
  samples: number[],
  domain: [number, number],
  numPoints = 50
): KDEPoint[] {
  if (!samples || samples.length === 0) {
    throw new Error('computeKDE: samples array cannot be empty');
  }

  if (samples.length < 10) {
    console.warn('computeKDE: very few samples (< 10), KDE may be unreliable');
  }

  const [min, max] = domain;

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error(`computeKDE: domain must contain finite values, got [${min}, ${max}]`);
  }

  if (min >= max) {
    throw new Error(`computeKDE: domain min (${min}) must be < max (${max})`);
  }

  // Sort for quantile computation
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;

  // Automatic bandwidth using Silverman's rule of thumb
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  const sigma = Math.min(d3.deviation(samples) || 1, iqr / 1.34);
  const bandwidth = 1.06 * sigma * Math.pow(n, -0.2);

  if (bandwidth <= 0 || !Number.isFinite(bandwidth)) {
    const range = max - min;
    const fallbackBandwidth = range / 20;
    console.warn(
      `computeKDE: invalid bandwidth (${bandwidth}), using fallback (${fallbackBandwidth})`
    );
    return computeKDEWithBandwidth(samples, domain, fallbackBandwidth, numPoints);
  }

  return computeKDEWithBandwidth(samples, domain, bandwidth, numPoints);
}

function computeKDEWithBandwidth(
  samples: number[],
  domain: [number, number],
  bandwidth: number,
  numPoints: number
): KDEPoint[] {
  const [min, max] = domain;

  const kernel = (x: number): number => {
    const u = x / bandwidth;
    return Math.abs(u) <= 1 ? (0.75 * (1 - u * u)) / bandwidth : 0;
  };

  const points = Array.from(
    { length: numPoints },
    (_, i) => min + (i / (numPoints - 1)) * (max - min)
  );

  return points.map((x) => ({
    value: x,
    density: d3.mean(samples, (d) => kernel(x - d)) || 0,
  }));
}

export function computeKDECustom(
  samples: number[],
  domain: [number, number],
  bandwidth: number,
  numPoints = 50
): KDEPoint[] {
  if (bandwidth <= 0 || !Number.isFinite(bandwidth)) {
    throw new Error(`computeKDECustom: bandwidth must be positive and finite, got ${bandwidth}`);
  }

  return computeKDEWithBandwidth(samples, domain, bandwidth, numPoints);
}

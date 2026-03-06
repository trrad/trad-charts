/**
 * Input validation utilities for visualization components
 */

import type { ScaleLinear } from 'd3-scale';

export function validateSamples(
  samples: unknown,
  componentName: string
): asserts samples is number[] {
  if (!samples) {
    throw new Error(`${componentName}: samples cannot be null or undefined`);
  }

  if (!Array.isArray(samples)) {
    throw new Error(`${componentName}: samples must be an array, got ${typeof samples}`);
  }

  if (samples.length === 0) {
    throw new Error(`${componentName}: samples array cannot be empty`);
  }

  const invalidIndex = samples.findIndex((x) => typeof x !== 'number');
  if (invalidIndex !== -1) {
    throw new Error(
      `${componentName}: samples must contain only numbers, found ${typeof samples[invalidIndex]} at index ${invalidIndex}`
    );
  }

  const nonFiniteIndex = samples.findIndex((x) => !Number.isFinite(x));
  if (nonFiniteIndex !== -1) {
    throw new Error(
      `${componentName}: samples must contain only finite numbers, found ${samples[nonFiniteIndex]} at index ${nonFiniteIndex}`
    );
  }

  if (samples.length < 10) {
    console.warn(
      `${componentName}: very few samples (${samples.length}), visualization may be unreliable`
    );
  }
}

export function validateCIBounds(lower: number, upper: number, componentName: string): void {
  if (typeof lower !== 'number' || !Number.isFinite(lower)) {
    throw new Error(`${componentName}: ciLower must be a finite number, got ${lower}`);
  }

  if (typeof upper !== 'number' || !Number.isFinite(upper)) {
    throw new Error(`${componentName}: ciUpper must be a finite number, got ${upper}`);
  }

  if (lower < 0 || lower > 1) {
    throw new Error(`${componentName}: ciLower must be between 0 and 1, got ${lower}`);
  }

  if (upper < 0 || upper > 1) {
    throw new Error(`${componentName}: ciUpper must be between 0 and 1, got ${upper}`);
  }

  if (lower >= upper) {
    throw new Error(`${componentName}: ciLower (${lower}) must be < ciUpper (${upper})`);
  }
}

export function validateScale(
  scale: unknown,
  componentName: string
): asserts scale is ScaleLinear<number, number> {
  if (!scale || typeof scale !== 'function') {
    throw new Error(`${componentName}: scale is required and must be a d3.scaleLinear instance`);
  }

  const scaleObj = scale as unknown as Record<string, unknown>;
  if (typeof scaleObj.domain !== 'function' || typeof scaleObj.range !== 'function') {
    throw new Error(
      `${componentName}: scale must be a valid D3 scale with domain() and range() methods`
    );
  }
}

export function validatePositive(value: number, name: string, componentName: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${componentName}: ${name} must be a finite number, got ${value}`);
  }

  if (value <= 0) {
    throw new Error(`${componentName}: ${name} must be positive, got ${value}`);
  }
}

export function validateNonNegative(value: number, name: string, componentName: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${componentName}: ${name} must be a finite number, got ${value}`);
  }

  if (value < 0) {
    throw new Error(`${componentName}: ${name} must be non-negative, got ${value}`);
  }
}

export function validateNumDots(numDots: number, componentName: string): void {
  if (typeof numDots !== 'number' || !Number.isFinite(numDots) || !Number.isInteger(numDots)) {
    throw new Error(`${componentName}: numDots must be an integer, got ${numDots}`);
  }

  if (numDots < 2) {
    throw new Error(`${componentName}: numDots must be >= 2, got ${numDots}`);
  }

  if (numDots > 1000) {
    console.warn(
      `${componentName}: numDots is very large (${numDots}), performance may be affected`
    );
  }
}

export function validateVariants(variants: unknown, componentName: string): void {
  if (!Array.isArray(variants)) {
    throw new Error(`${componentName}: variants must be an array`);
  }

  if (variants.length === 0) {
    throw new Error(`${componentName}: variants array cannot be empty`);
  }

  variants.forEach((variant, index) => {
    if (!variant || typeof variant !== 'object') {
      throw new Error(`${componentName}: variant at index ${index} must be an object`);
    }

    const v = variant as Record<string, unknown>;

    if (typeof v.name !== 'string' || (v.name as string).length === 0) {
      throw new Error(`${componentName}: variant at index ${index} must have a non-empty name`);
    }

    if (typeof v.displayName !== 'string' || (v.displayName as string).length === 0) {
      throw new Error(
        `${componentName}: variant at index ${index} must have a non-empty displayName`
      );
    }

    if (!Array.isArray(v.samples) || v.samples.length === 0) {
      throw new Error(`${componentName}: variant '${v.name}' must have a non-empty samples array`);
    }

    validateSamples(v.samples, `${componentName} (variant '${v.name}')`);
  });
}

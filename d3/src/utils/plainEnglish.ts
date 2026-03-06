/**
 * Plain English Messaging Utilities
 *
 * Converts statistical concepts to plain, probabilistic English.
 */

export function getConfidenceLevel(probability: number): string {
  if (probability >= 0.95) return 'very likely';
  if (probability >= 0.8) return 'likely';
  if (probability >= 0.6) return 'possible';
  if (probability >= 0.4) return 'uncertain';
  return 'unlikely';
}

export function getConfidenceStatement(probability: number): string {
  if (probability >= 0.95) return "We're quite confident";
  if (probability >= 0.8) return "We're moderately confident";
  if (probability >= 0.6) return 'There is some evidence';
  if (probability >= 0.4) return 'Results are inconclusive';
  return 'There is little evidence';
}

export function formatCredibleInterval(
  lower: number,
  upper: number,
  coverage: number,
  unit: string = '%'
): string {
  const coveragePercent = (coverage * 100).toFixed(0);
  const lowerStr = formatValue(lower, unit).replace('.0%', '%');
  const upperStr = formatValue(upper, unit).replace('.0%', '%');

  return `${coveragePercent}% probability the true lift is between ${lowerStr} and ${upperStr}`;
}

export function formatValue(value: number, unit: string = '%'): string {
  if (unit === '%') {
    const percentValue = (value * 100).toFixed(0);
    const sign = value >= 0 ? '+' : '';
    return `${sign}${percentValue}%`;
  } else if (unit === '$') {
    return `$${value.toFixed(2)}`;
  } else {
    return `${value.toFixed(2)}${unit}`;
  }
}

export function explainTailProbability(
  tailProb: number,
  bound: number,
  isLower: boolean,
  unit: string = '%'
): string {
  const probPercent = (tailProb * 100).toFixed(0);
  const boundStr = formatValue(bound, unit).replace('.0%', '%');
  const comparison = isLower ? 'lower' : 'higher';

  return `${probPercent}% probability it's ${comparison} than ${boundStr}`;
}

export function describeLiftDirection(lift: number, _includeMedian: boolean = false): string {
  const absValue = Math.abs(lift);
  const percentValue = (absValue * 100).toFixed(0);

  if (lift >= 0) {
    return `${percentValue}% median lift`;
  } else {
    return `${percentValue}% median decline`;
  }
}

export function formatThresholdProbability(
  probability: number,
  threshold: number,
  unit: string = '%'
): string {
  const probPercent = (probability * 100).toFixed(0);

  if (unit === '%') {
    const absThreshold = Math.abs(threshold);
    const thresholdPercent = (absThreshold * 100).toFixed(0);

    if (threshold >= 0) {
      return `${probPercent}% chance of improvement exceeding ${thresholdPercent}%`;
    } else {
      return `${probPercent}% chance of decrease smaller than ${thresholdPercent}%`;
    }
  } else {
    const thresholdStr = formatValue(threshold, unit);
    return `${probPercent}% chance exceeding ${thresholdStr}`;
  }
}

export function describeProbabilityPosition(percentile: number): string {
  const below = (percentile * 100).toFixed(0);
  const above = ((1 - percentile) * 100).toFixed(0);
  return `${below}% chance below this value, ${above}% above`;
}

export function describeValuePosition(value: number, percentile: number, isInCI: boolean): string {
  const percentileStr = (percentile * 100).toFixed(0);
  const ordinal = getOrdinal(parseInt(percentileStr));

  let description = `This represents the ${ordinal} percentile`;

  if (percentile === 0.5) {
    description += ' (median)';
  }

  return description;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function describeCIPosition(isInCI: boolean, coverage: number): string {
  const coveragePercent = (coverage * 100).toFixed(0);
  const tailPercent = ((1 - coverage) * 100).toFixed(0);

  if (isInCI) {
    return `This dot is within the middle ${coveragePercent}% range`;
  } else {
    return `This dot is in the outer ${tailPercent}% (tail)`;
  }
}

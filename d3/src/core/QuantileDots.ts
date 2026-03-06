/**
 * QuantileDots - Quantile dotplot visualization with optional KDE violin overlay
 *
 * Framework-agnostic D3 component using Mike Bostock's reusable chart pattern.
 * Renders quantile dots from posterior samples with optional violin overlay.
 */
// @ts-nocheck

import * as d3 from 'd3';
import { computeQuantiles, sortSamples, getCIBounds, getPercentile } from '../utils/index.ts';
import { computeKDE } from '../utils/index.ts';
import { validateSamples, validateCIBounds, validateNumDots } from '../utils/index.ts';
import {
  describeValuePosition,
  describeProbabilityPosition,
  describeCIPosition,
  formatCredibleInterval,
  formatThresholdProbability,
  formatValue,
} from '../utils/plainEnglish.ts';
import { theme, fonts, defaultColorScheme } from '../theme.ts';
import { Tooltip } from './Tooltip.ts';
import type {
  QuantileDotsData,
  DotHoverEventDetail,
  DotClickEventDetail,
  ColorScheme,
} from '../types/index.ts';

export function QuantileDots() {
  let width: number | null = null;
  let height = 60;
  let dotRadius = 3;
  let dotOpacity = 0.85;
  let dotSpacing = 8;
  let scale: d3.ScaleLinear<number, number> | null = null;
  let numDots = 20;
  let ciLower = 0.1;
  let ciUpper = 0.9;
  let showViolin = true;
  let violinOpacity = 0.4;
  let backgroundType: 'violin' | 'histogram' | 'none' = 'violin';
  let colorScheme: ColorScheme = { ...defaultColorScheme };
  let showTooltip = true;

  let cachedSorted: number[] | null = null;
  let cachedQuantiles: number[] | null = null;
  let cachedSamplesLength = 0;
  let cachedKDE: Array<{ value: number; density: number }> | null = null;

  const listeners: Record<string, (event: CustomEvent) => void> = {};

  const tooltip = Tooltip();

  function chart(selection: d3.Selection<Element, QuantileDotsData, Element | null, unknown>) {
    selection.each(function (data: QuantileDotsData) {
      const container = d3.select(this);
      const { samples, threshold, effectSamples, thresholdEffect } = data;

      validateSamples(samples, 'QuantileDots');
      validateCIBounds(ciLower, ciUpper, 'QuantileDots');
      validateNumDots(numDots, 'QuantileDots');

      if (!cachedSorted || cachedSamplesLength !== samples.length) {
        cachedSorted = sortSamples(samples);
        cachedSamplesLength = samples.length;
        cachedQuantiles = null;
      }

      if (!cachedQuantiles) {
        cachedQuantiles = computeQuantiles(cachedSorted, numDots);
      }

      const ciBounds = getCIBounds(cachedSorted, ciLower, ciUpper);

      const containerElement = this as HTMLElement;
      const bbox = containerElement.getBoundingClientRect();
      const effectiveWidth = width ?? bbox.width ?? 400;

      const xScale =
        scale ||
        d3
          .scaleLinear()
          .domain(d3.extent(cachedSorted) as [number, number])
          .nice()
          .range([20, effectiveWidth - 20]);

      let svg = container.select<SVGSVGElement>('svg.quantile-dots-svg');
      if (svg.empty()) {
        svg = container
          .append('svg')
          .attr('class', 'quantile-dots-svg')
          .attr('width', effectiveWidth)
          .attr('height', height);
      } else {
        svg.attr('width', effectiveWidth).attr('height', height);
      }

      if (showViolin && backgroundType !== 'none') {
        if (backgroundType === 'histogram') {
          const binner = d3
            .bin()
            .domain(xScale.domain() as [number, number])
            .thresholds(50);
          const histogram = binner(cachedSorted);

          const maxCount = d3.max(histogram, (d) => d.length) || 1;
          const heightScale = d3
            .scaleLinear()
            .domain([0, maxCount])
            .range([0, height * 0.75]);

          svg
            .selectAll('.hist-bar')
            .data(histogram)
            .join('rect')
            .attr('class', 'hist-bar')
            .attr('x', (d) => xScale(d.x0!))
            .attr('width', (d) => Math.max(0, xScale(d.x1!) - xScale(d.x0!)))
            .attr('y', (d) => height - heightScale(d.length) - 10)
            .attr('height', (d) => heightScale(d.length))
            .attr('fill', theme.surfaceAlt)
            .attr('opacity', 0.5);

          svg.selectAll('.violin-bg').remove();
        } else {
          const domain = xScale.domain();
          const kde = computeKDE(cachedSorted, domain as [number, number], 100);
          cachedKDE = kde;
          const maxDensity = d3.max(kde, (d) => d.density) || 1;

          const heightScale = d3
            .scaleLinear()
            .domain([0, maxDensity])
            .range([0, height * 0.9]);

          const area = d3
            .area<{ value: number; density: number }>()
            .x((d) => xScale(d.value))
            .y0(height - 5)
            .y1((d) => height - heightScale(d.density) - 5)
            .curve(d3.curveBasis);

          svg.selectAll('.violin-bg').remove();
          svg.selectAll('.violin-bg-ci').remove();
          svg.selectAll('.hist-bar').remove();

          if (threshold !== undefined && threshold !== null) {
            let kdeBelow = kde.filter((d) => d.value <= threshold);
            const thresholdDensity =
              kde.find((d) => d.value === threshold)?.density ||
              kde.filter((d) => d.value <= threshold).pop()?.density ||
              0;
            if (kdeBelow.length === 0 || kdeBelow[kdeBelow.length - 1].value !== threshold) {
              kdeBelow = [...kdeBelow, { value: threshold, density: thresholdDensity }];
            }
            const probBelow =
              cachedSorted.filter((s) => s <= threshold).length / cachedSorted.length;

            svg
              .selectAll('.violin-segment-below')
              .data(kdeBelow.length > 0 ? [kdeBelow] : [])
              .join('path')
              .attr('class', 'violin-segment-below')
              .attr('d', area)
              .attr('fill', theme.violinBelow)
              .attr('stroke', theme.violinBelowStroke)
              .attr('stroke-width', 1)
              .attr('opacity', 0.85)
              .attr('pointer-events', 'all')
              .style('cursor', 'pointer')
              .on('mouseover', function () {
                d3.select(this).attr('opacity', 1).attr('stroke-width', 1.5);
              })
              .on('mouseout', function () {
                d3.select(this).attr('opacity', 0.85).attr('stroke-width', 1);
              });

            let kdeAbove = kde.filter((d) => d.value >= threshold);
            if (kdeAbove.length === 0 || kdeAbove[0].value !== threshold) {
              kdeAbove = [{ value: threshold, density: thresholdDensity }, ...kdeAbove];
            }
            const probAbove =
              cachedSorted.filter((s) => s > threshold).length / cachedSorted.length;

            svg
              .selectAll('.violin-segment-above')
              .data(kdeAbove.length > 0 ? [kdeAbove] : [])
              .join('path')
              .attr('class', 'violin-segment-above')
              .attr('d', area)
              .attr('fill', theme.violinAbove)
              .attr('stroke', theme.violinAboveStroke)
              .attr('stroke-width', 1)
              .attr('opacity', 0.85)
              .attr('pointer-events', 'all')
              .style('cursor', 'pointer')
              .on('mouseover', function () {
                d3.select(this).attr('opacity', 1).attr('stroke-width', 1.5);
              })
              .on('mouseout', function () {
                d3.select(this).attr('opacity', 0.85).attr('stroke-width', 1);
              });

            const xDomain = xScale.domain();
            const belowCenter = (xDomain[0] + threshold) / 2;
            const aboveCenter = (threshold + xDomain[1]) / 2;

            if (probBelow > 0.05) {
              svg
                .selectAll('.segment-label-below')
                .data([probBelow])
                .join('text')
                .attr('class', 'segment-label-below')
                .attr('x', xScale(belowCenter))
                .attr('y', height * 0.75)
                .attr('text-anchor', 'middle')
                .attr('font-family', fonts.body)
                .attr('font-size', '13px')
                .attr('font-weight', '700')
                .attr('fill', theme.negative)
                .style('text-shadow', `0 1px 2px ${theme.textShadow}`)
                .text(`${(probBelow * 100).toFixed(0)}% chance worse`);
            } else {
              svg.selectAll('.segment-label-below').remove();
            }

            if (probAbove > 0.05) {
              svg
                .selectAll('.segment-label-above')
                .data([probAbove])
                .join('text')
                .attr('class', 'segment-label-above')
                .attr('x', xScale(aboveCenter))
                .attr('y', height * 0.75)
                .attr('text-anchor', 'middle')
                .attr('font-family', fonts.body)
                .attr('font-size', '13px')
                .attr('font-weight', '700')
                .attr('fill', theme.positive)
                .style('text-shadow', `0 1px 2px ${theme.textShadow}`)
                .text(`${(probAbove * 100).toFixed(0)}% chance better`);
            } else {
              svg.selectAll('.segment-label-above').remove();
            }
          } else {
            svg
              .selectAll('.violin-segment-single')
              .data([kde])
              .join('path')
              .attr('class', 'violin-segment-single')
              .attr('d', area)
              .attr('fill', theme.violinNeutral)
              .attr('opacity', 0.8);

            svg.selectAll('.violin-segment-below').remove();
            svg.selectAll('.violin-segment-above').remove();
            svg.selectAll('.segment-label-below').remove();
            svg.selectAll('.segment-label-above').remove();
          }
        }
      } else {
        svg.selectAll('.violin-bg, .hist-bar, .ci-region').remove();
      }

      interface DotPosition {
        value: number;
        x: number;
        y: number;
        color: string;
        isOutsideCI: boolean;
      }

      const dotPositions: DotPosition[] = [];
      const baseY = height - dotRadius - 10;

      const stackHeights = new Map<number, number>();
      const binWidth = dotRadius * 2.5;

      const ciLowerValue = getPercentile(cachedSorted, ciLower);
      const ciUpperValue = getPercentile(cachedSorted, ciUpper);

      cachedQuantiles.forEach((value) => {
        const x = xScale(value);
        const binIndex = Math.round(x / binWidth);

        let color =
          threshold !== undefined
            ? value > threshold
              ? colorScheme.above
              : colorScheme.below
            : colorScheme.neutral;

        const isOutsideCI = value < ciLowerValue || value > ciUpperValue;

        const stackHeight = stackHeights.get(binIndex) || 0;

        dotPositions.push({
          value: value,
          x: x,
          y: baseY - stackHeight * dotSpacing,
          color: color,
          isOutsideCI: isOutsideCI,
        });

        stackHeights.set(binIndex, stackHeight + 1);
      });

      const dots = svg
        .selectAll<SVGCircleElement, DotPosition>('circle.quantile-dot')
        .data(dotPositions)
        .join('circle')
        .attr('class', 'quantile-dot')
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('r', dotRadius)
        .attr('fill', (d) => d.color)
        .attr('fill-opacity', (d) => (d.isOutsideCI ? 0.3 : dotOpacity))
        .attr('stroke', theme.dotStroke)
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer');

      dots
        .on('mouseover', function (event, d) {
          d3.select(this)
            .attr('r', dotRadius * 1.5)
            .attr('stroke-width', 2);

          if (showTooltip && cachedSorted) {
            const percentile =
              cachedSorted.findIndex((s: number) => s === d.value) / cachedSorted.length;

            const lines: string[] = [];

            if (effectSamples && effectSamples.length === samples.length) {
              const sampleIndex = cachedSorted.findIndex((s: number) => s === d.value);
              if (sampleIndex >= 0 && sampleIndex < effectSamples.length) {
                const sortedEffect = [...effectSamples].sort((a, b) => {
                  const aLift = samples[effectSamples.indexOf(a)];
                  const bLift = samples[effectSamples.indexOf(b)];
                  return (aLift || 0) - (bLift || 0);
                });
                const effectValue = sortedEffect[sampleIndex];
                const dollarStr =
                  effectValue >= 0
                    ? `+$${effectValue.toFixed(2)}`
                    : `-$${Math.abs(effectValue).toFixed(2)}`;
                const pctStr = formatValue(d.value, '%');
                lines.push(`${dollarStr} (${pctStr} lift)`);
              } else {
                lines.push(formatValue(d.value, '%'));
              }
            } else {
              lines.push(formatValue(d.value, '%'));
            }

            const below = (percentile * 100).toFixed(0);
            const above = ((1 - percentile) * 100).toFixed(0);
            lines.push(`${below}% chance this outcome is below this value`);
            lines.push(`${above}% chance this outcome is above this value`);

            tooltip.show(
              {
                title: null,
                lines,
              },
              event
            );
          }

          if (listeners['dotHover']) {
            const detail: DotHoverEventDetail = {
              value: d.value,
              x: d.x,
              y: d.y,
              color: d.color,
              ciLower: ciBounds.lower,
              ciUpper: ciBounds.upper,
              ciLevel: ciUpper - ciLower,
            };
            const customEvent = new CustomEvent('dotHover', { detail });
            listeners['dotHover'](customEvent);
          }
        })
        .on('mouseout', function () {
          d3.select(this).attr('r', dotRadius).attr('stroke-width', 0.5);

          if (showTooltip) {
            tooltip.scheduleHide();
          }
        })
        .on('click', function (event, d) {
          if (listeners['dotClick']) {
            const detail: DotClickEventDetail = {
              value: d.value,
              x: d.x,
              y: d.y,
            };
            const customEvent = new CustomEvent('dotClick', { detail });
            listeners['dotClick'](customEvent);
          }
        });
    });
  }

  chart.width = function (value?: number | null): unknown {
    if (arguments.length === 0) return width;
    width = value ?? null;
    return chart;
  };

  chart.height = function (value?: number): unknown {
    if (arguments.length === 0) return height;
    height = value!;
    return chart;
  };

  chart.dotRadius = function (value?: number): unknown {
    if (arguments.length === 0) return dotRadius;
    dotRadius = value!;
    return chart;
  };

  chart.dotSpacing = function (value?: number): unknown {
    if (arguments.length === 0) return dotSpacing;
    dotSpacing = value!;
    return chart;
  };

  chart.dotOpacity = function (value?: number): unknown {
    if (arguments.length === 0) return dotOpacity;
    dotOpacity = value!;
    return chart;
  };

  chart.scale = function (value?: d3.ScaleLinear<number, number> | null): unknown {
    if (arguments.length === 0) return scale;
    scale = value ?? null;
    return chart;
  };

  chart.numDots = function (value?: number): unknown {
    if (arguments.length === 0) return numDots;
    numDots = value!;
    cachedQuantiles = null;
    return chart;
  };

  chart.ciLower = function (value?: number): unknown {
    if (arguments.length === 0) return ciLower;
    ciLower = value!;
    return chart;
  };

  chart.ciUpper = function (value?: number): unknown {
    if (arguments.length === 0) return ciUpper;
    ciUpper = value!;
    return chart;
  };

  chart.showViolin = function (value?: boolean): unknown {
    if (arguments.length === 0) return showViolin;
    showViolin = value!;
    return chart;
  };

  chart.violinOpacity = function (value?: number): unknown {
    if (arguments.length === 0) return violinOpacity;
    violinOpacity = value!;
    return chart;
  };

  chart.backgroundType = function (value?: 'violin' | 'histogram' | 'none'): unknown {
    if (arguments.length === 0) return backgroundType;
    backgroundType = value!;
    return chart;
  };

  chart.colorScheme = function (value?: ColorScheme): unknown {
    if (arguments.length === 0) return colorScheme;
    colorScheme = value!;
    return chart;
  };

  chart.showTooltip = function (value?: boolean): unknown {
    if (arguments.length === 0) return showTooltip;
    showTooltip = value!;
    return chart;
  };

  chart.getKDE = function (): Array<{ value: number; density: number }> | null {
    return cachedKDE;
  };

  chart.on = function (event: string, handler: ((event: CustomEvent) => void) | null): unknown {
    if (handler === null) {
      delete listeners[event];
    } else {
      listeners[event] = handler;
    }
    return chart;
  };

  return chart;
}

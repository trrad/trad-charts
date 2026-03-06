/**
 * DraggableCIBounds - Interactive credible interval percentile handles
 *
 * Framework-agnostic D3 component for adjusting CI bounds via dragging.
 */
// @ts-nocheck

import * as d3 from 'd3';
import { sortSamples, getPercentile } from '../utils/index.ts';
import {
  formatCredibleInterval,
  explainTailProbability,
  formatValue,
} from '../utils/plainEnglish.ts';
import { theme } from '../theme.ts';
import { Tooltip } from './Tooltip.ts';
import type { CIDragEventDetail } from '../types/index.ts';

export function DraggableCIBounds() {
  let scale: d3.ScaleLinear<number, number> | null = null;
  let samples: number[] = [];
  let lowerPercentile = 0.1;
  let upperPercentile = 0.9;
  let yRange: [number, number] = [0, 100];
  let handleRadius = 5;
  let handleColor = theme.textMuted;
  let lineColor = theme.textMuted;
  let lineWidth = 1.5;
  let percentileStep = 0.01;
  let showTooltip = true;

  let cachedSorted: number[] | null = null;

  const listeners: Record<string, (event: CustomEvent) => void> = {};

  const tooltip = Tooltip();

  function chart(selection: d3.Selection<SVGGElement, unknown, Element | null, unknown>) {
    selection.each(function () {
      const container = d3.select(this);

      if (!scale) {
        throw new Error('DraggableCIBounds: scale is required');
      }

      if (!samples || samples.length === 0) {
        throw new Error('DraggableCIBounds: samples array is required');
      }

      if (!cachedSorted || cachedSorted.length !== samples.length) {
        cachedSorted = sortSamples(samples);
      }

      const [yMin, yMax] = yRange;

      const lowerValue = getPercentile(cachedSorted, lowerPercentile);
      const upperValue = getPercentile(cachedSorted, upperPercentile);

      let group = container.select<SVGGElement>('g.ci-bounds-group');
      if (group.empty()) {
        group = container.append('g').attr('class', 'ci-bounds-group');
      }

      let defs = container.select('defs');
      if (defs.empty()) {
        defs = container.append('defs');
      }

      let pattern = defs.select('#ci-pattern');
      if (pattern.empty()) {
        pattern = defs
          .append('pattern')
          .attr('id', 'ci-pattern')
          .attr('patternUnits', 'userSpaceOnUse')
          .attr('width', 8)
          .attr('height', 8);

        pattern
          .append('path')
          .attr('d', 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4')
          .attr('stroke', theme.textMuted)
          .attr('stroke-width', 1)
          .attr('opacity', 0.5);
      }

      group
        .selectAll('rect.ci-background')
        .data([{ lower: lowerValue, upper: upperValue }])
        .join('rect')
        .attr('class', 'ci-background')
        .attr('x', scale(lowerValue))
        .attr('y', yMin)
        .attr('width', scale(upperValue) - scale(lowerValue))
        .attr('height', yMax - yMin)
        .attr('fill', 'url(#ci-pattern)')
        .attr('opacity', 0.3)
        .attr('pointer-events', 'none');

      const lowerLine = group
        .selectAll('line.ci-bound-lower')
        .data([lowerValue])
        .join('line')
        .attr('class', 'ci-bound-lower')
        .attr('x1', scale(lowerValue))
        .attr('x2', scale(lowerValue))
        .attr('y1', yMin)
        .attr('y2', yMax)
        .attr('stroke', lineColor)
        .attr('stroke-width', lineWidth)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.6)
        .style('cursor', 'ew-resize');

      const upperLine = group
        .selectAll('line.ci-bound-upper')
        .data([upperValue])
        .join('line')
        .attr('class', 'ci-bound-upper')
        .attr('x1', scale(upperValue))
        .attr('x2', scale(upperValue))
        .attr('y1', yMin)
        .attr('y2', yMax)
        .attr('stroke', lineColor)
        .attr('stroke-width', lineWidth)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.6)
        .style('cursor', 'ew-resize');

      group.selectAll('circle.ci-handle-lower').remove();
      group.selectAll('circle.ci-handle-upper').remove();
      group.selectAll('text.ci-label-lower').remove();
      group.selectAll('text.ci-label-upper').remove();

      const dragLower = d3
        .drag()
        .on('start', function (event) {
          lowerLine.attr('stroke-width', lineWidth * 1.5).attr('opacity', 0.9);

          tooltip.hide(true);

          if (showTooltip) {
            const ciCoverage = upperPercentile - lowerPercentile;
            const lv = getPercentile(cachedSorted!, lowerPercentile);
            const uv = getPercentile(cachedSorted!, upperPercentile);

            tooltip.show(
              {
                title: null,
                lines: [
                  `${(ciCoverage * 100).toFixed(0)}% credible interval`,
                  formatCredibleInterval(lv, uv, ciCoverage),
                ],
              },
              event.sourceEvent
            );
          }
        })
        .on('drag', function (event) {
          const value = scale!.invert(event.x);

          let closestP = 0;
          let minDiff = Infinity;
          for (let p = 0; p <= 1; p += percentileStep) {
            const pValue = getPercentile(cachedSorted!, p);
            const diff = Math.abs(pValue - value);
            if (diff < minDiff) {
              minDiff = diff;
              closestP = p;
            }
          }

          closestP = Math.max(0, Math.min(closestP, upperPercentile - percentileStep));
          lowerPercentile = closestP;

          const newValue = getPercentile(cachedSorted!, lowerPercentile);
          const uv = getPercentile(cachedSorted!, upperPercentile);
          const newX = scale!(newValue);
          const upperX = scale!(uv);
          lowerLine.attr('x1', newX).attr('x2', newX);

          group
            .select('rect.ci-background')
            .attr('x', newX)
            .attr('width', upperX - newX);

          if (showTooltip) {
            const ciCoverage = upperPercentile - lowerPercentile;

            tooltip.show(
              {
                title: null,
                lines: [
                  `${(ciCoverage * 100).toFixed(0)}% credible interval`,
                  formatCredibleInterval(newValue, uv, ciCoverage),
                ],
              },
              event.sourceEvent
            );
          }

          emitDragEvent();
        })
        .on('end', function () {
          lowerLine.attr('stroke-width', lineWidth).attr('opacity', 0.6);

          if (showTooltip) {
            tooltip.hide();
          }
        });

      const dragUpper = d3
        .drag()
        .on('start', function (event) {
          upperLine.attr('stroke-width', lineWidth * 1.5).attr('opacity', 0.9);

          tooltip.hide(true);

          if (showTooltip) {
            const ciCoverage = upperPercentile - lowerPercentile;
            const lv = getPercentile(cachedSorted!, lowerPercentile);
            const uv = getPercentile(cachedSorted!, upperPercentile);

            tooltip.show(
              {
                title: null,
                lines: [
                  `${(ciCoverage * 100).toFixed(0)}% credible interval`,
                  formatCredibleInterval(lv, uv, ciCoverage),
                ],
              },
              event.sourceEvent
            );
          }
        })
        .on('drag', function (event) {
          const value = scale!.invert(event.x);

          let closestP = 1;
          let minDiff = Infinity;
          for (let p = 0; p <= 1; p += percentileStep) {
            const pValue = getPercentile(cachedSorted!, p);
            const diff = Math.abs(pValue - value);
            if (diff < minDiff) {
              minDiff = diff;
              closestP = p;
            }
          }

          closestP = Math.max(lowerPercentile + percentileStep, Math.min(1, closestP));
          upperPercentile = closestP;

          const newValue = getPercentile(cachedSorted!, upperPercentile);
          const lv = getPercentile(cachedSorted!, lowerPercentile);
          const newX = scale!(newValue);
          const lowerX = scale!(lv);
          upperLine.attr('x1', newX).attr('x2', newX);

          group.select('rect.ci-background').attr('width', newX - lowerX);

          if (showTooltip) {
            const ciCoverage = upperPercentile - lowerPercentile;

            tooltip.show(
              {
                title: null,
                lines: [
                  `${(ciCoverage * 100).toFixed(0)}% credible interval`,
                  formatCredibleInterval(lv, newValue, ciCoverage),
                ],
              },
              event.sourceEvent
            );
          }

          emitDragEvent();
        })
        .on('end', function () {
          upperLine.attr('stroke-width', lineWidth).attr('opacity', 0.6);

          if (showTooltip) {
            tooltip.hide();
          }
        });

      lowerLine.call(dragLower as unknown as d3.DragBehavior<SVGLineElement, unknown, unknown>);
      upperLine.call(dragUpper as unknown as d3.DragBehavior<SVGLineElement, unknown, unknown>);

      lowerLine
        .on('mouseover', function (event) {
          if (showTooltip) {
            const ciCoverage = upperPercentile - lowerPercentile;
            const lv = getPercentile(cachedSorted!, lowerPercentile);
            const uv = getPercentile(cachedSorted!, upperPercentile);

            tooltip.show(
              {
                title: 'Credible Interval (drag to adjust)',
                lines: [
                  `${(ciCoverage * 100).toFixed(0)}% probability the lift is between ${formatValue(lv).replace('.0%', '%')} and ${formatValue(uv).replace('.0%', '%')}`,
                  '',
                  'Tails:',
                  `\u2022 ${(lowerPercentile * 100).toFixed(0)}% chance below ${formatValue(lv).replace('.0%', '%')}`,
                  `\u2022 ${((1 - upperPercentile) * 100).toFixed(0)}% chance above ${formatValue(uv).replace('.0%', '%')}`,
                ],
              },
              event
            );
          }
          lowerLine.attr('stroke-width', lineWidth * 1.3).attr('opacity', 0.8);
        })
        .on('mouseout', function () {
          if (!d3.select(this).classed('dragging')) {
            if (showTooltip) tooltip.hide();
            lowerLine.attr('stroke-width', lineWidth).attr('opacity', 0.6);
          }
        });

      upperLine
        .on('mouseover', function (event) {
          if (showTooltip) {
            const ciCoverage = upperPercentile - lowerPercentile;
            const lv = getPercentile(cachedSorted!, lowerPercentile);
            const uv = getPercentile(cachedSorted!, upperPercentile);

            tooltip.show(
              {
                title: 'Credible Interval (drag to adjust)',
                lines: [
                  `${(ciCoverage * 100).toFixed(0)}% probability the lift is between ${formatValue(lv).replace('.0%', '%')} and ${formatValue(uv).replace('.0%', '%')}`,
                  '',
                  'Tails:',
                  `\u2022 ${(lowerPercentile * 100).toFixed(0)}% chance below ${formatValue(lv).replace('.0%', '%')}`,
                  `\u2022 ${((1 - upperPercentile) * 100).toFixed(0)}% chance above ${formatValue(uv).replace('.0%', '%')}`,
                ],
              },
              event
            );
          }
          upperLine.attr('stroke-width', lineWidth * 1.3).attr('opacity', 0.8);
        })
        .on('mouseout', function () {
          if (!d3.select(this).classed('dragging')) {
            if (showTooltip) tooltip.hide();
            upperLine.attr('stroke-width', lineWidth).attr('opacity', 0.6);
          }
        });

      function emitDragEvent() {
        if (listeners['ciDrag']) {
          const detail: CIDragEventDetail = {
            lower: lowerPercentile,
            upper: upperPercentile,
          };
          const customEvent = new CustomEvent('ciDrag', { detail });
          listeners['ciDrag'](customEvent);
        }
      }
    });
  }

  chart.scale = function (value?: d3.ScaleLinear<number, number> | null): unknown {
    if (arguments.length === 0) return scale;
    scale = value ?? null;
    return chart;
  };

  chart.samples = function (value?: number[]): unknown {
    if (arguments.length === 0) return samples;
    samples = value!;
    cachedSorted = null;
    return chart;
  };

  chart.lowerPercentile = function (value?: number): unknown {
    if (arguments.length === 0) return lowerPercentile;
    lowerPercentile = value!;
    return chart;
  };

  chart.upperPercentile = function (value?: number): unknown {
    if (arguments.length === 0) return upperPercentile;
    upperPercentile = value!;
    return chart;
  };

  chart.yRange = function (value?: [number, number]): unknown {
    if (arguments.length === 0) return yRange;
    yRange = value!;
    return chart;
  };

  chart.handleRadius = function (value?: number): unknown {
    if (arguments.length === 0) return handleRadius;
    handleRadius = value!;
    return chart;
  };

  chart.handleColor = function (value?: string): unknown {
    if (arguments.length === 0) return handleColor;
    handleColor = value!;
    return chart;
  };

  chart.lineColor = function (value?: string): unknown {
    if (arguments.length === 0) return lineColor;
    lineColor = value!;
    return chart;
  };

  chart.lineWidth = function (value?: number): unknown {
    if (arguments.length === 0) return lineWidth;
    lineWidth = value!;
    return chart;
  };

  chart.percentileStep = function (value?: number): unknown {
    if (arguments.length === 0) return percentileStep;
    percentileStep = value!;
    return chart;
  };

  chart.showTooltip = function (value?: boolean): unknown {
    if (arguments.length === 0) return showTooltip;
    showTooltip = value!;
    return chart;
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

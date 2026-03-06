/**
 * CIBand - Interactive credible interval band chart
 *
 * Framework-agnostic D3 component using Mike Bostock's reusable chart pattern.
 * Renders posterior mean with narrow/wide CI bands, optional truth line and observations.
 */
// @ts-nocheck

import * as d3 from 'd3';
import { theme, fonts } from '../theme.ts';
import { Tooltip } from './Tooltip.ts';
import type {
  CIBandData,
  BandHoverEventDetail,
} from '../types/index.ts';

const Z_SCORES: Record<number, number> = {
  0.50: 0.6745,
  0.80: 1.2816,
  0.90: 1.6449,
  0.95: 1.96,
  0.99: 2.5758,
};

export function CIBand() {
  let width = 600;
  let height = 300;
  let margin = { top: 30, right: 30, bottom: 40, left: 60 };
  let showTruth = true;
  let showObservations = true;
  let title: string | null = null;
  let xlabel: string | null = null;
  let ylabel: string | null = null;

  const listeners: Record<string, (event: CustomEvent) => void> = {};

  const tooltip = Tooltip();

  function chart(selection: d3.Selection<Element, CIBandData, Element | null, unknown>) {
    selection.each(function (data: CIBandData) {
      const container = d3.select(this);

      // Data prep
      const { x, mean, std } = data;
      const ciLevels = data.ciLevels ?? [0.50, 0.95];
      const zNarrow = Z_SCORES[ciLevels[0]];
      const zWide = Z_SCORES[ciLevels[1]];

      const ciNarrowLower = x.map((_, i) => mean[i] - zNarrow * std[i]);
      const ciNarrowUpper = x.map((_, i) => mean[i] + zNarrow * std[i]);
      const ciWideLower = x.map((_, i) => mean[i] - zWide * std[i]);
      const ciWideUpper = x.map((_, i) => mean[i] + zWide * std[i]);

      // Paired arrays for area/line generators
      const widePoints = x.map((xVal, i) => ({ x: xVal, low: ciWideLower[i], high: ciWideUpper[i] }));
      const narrowPoints = x.map((xVal, i) => ({ x: xVal, low: ciNarrowLower[i], high: ciNarrowUpper[i] }));
      const meanPoints = x.map((xVal, i) => ({ x: xVal, y: mean[i] }));

      // Scales
      const xScale = d3
        .scaleLinear()
        .domain(d3.extent(x) as [number, number])
        .range([margin.left, width - margin.right]);

      const yExtentValues = [...ciWideLower, ...ciWideUpper];
      if (showTruth && data.truth) {
        yExtentValues.push(...data.truth);
      }
      if (showObservations && data.observations) {
        yExtentValues.push(...data.observations.map((o) => o.y));
      }
      const yScale = d3
        .scaleLinear()
        .domain(d3.extent(yExtentValues) as [number, number])
        .nice()
        .range([height - margin.bottom, margin.top]);

      // SVG setup
      let svg = container.select<SVGSVGElement>('svg.ci-band-svg');
      if (svg.empty()) {
        svg = container
          .append('svg')
          .attr('class', 'ci-band-svg')
          .attr('width', width)
          .attr('height', height);
      } else {
        svg.attr('width', width).attr('height', height);
      }

      // Grid lines
      const yTicks = yScale.ticks(6);
      svg
        .selectAll<SVGLineElement, number>('.grid-line')
        .data(yTicks)
        .join('line')
        .attr('class', 'grid-line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', (d) => yScale(d))
        .attr('y2', (d) => yScale(d))
        .attr('stroke', theme.grid)
        .attr('opacity', theme.gridAlpha)
        .attr('stroke-dasharray', '2,2');

      // Bottom x-axis
      const xAxis = d3.axisBottom(xScale).ticks(8);
      let xAxisGroup = svg.select<SVGGElement>('.x-axis');
      if (xAxisGroup.empty()) {
        xAxisGroup = svg.append('g').attr('class', 'x-axis');
      }
      xAxisGroup
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(xAxis)
        .selectAll('text')
        .attr('fill', theme.textSecondary)
        .attr('font-family', fonts.body)
        .attr('font-size', '11px');
      xAxisGroup.selectAll('.tick line').attr('stroke', theme.textSecondary);
      xAxisGroup.select('.domain').attr('stroke', theme.textSecondary);

      // Left y-axis
      const yAxis = d3.axisLeft(yScale).ticks(6);
      let yAxisGroup = svg.select<SVGGElement>('.y-axis');
      if (yAxisGroup.empty()) {
        yAxisGroup = svg.append('g').attr('class', 'y-axis');
      }
      yAxisGroup
        .attr('transform', `translate(${margin.left},0)`)
        .call(yAxis)
        .selectAll('text')
        .attr('fill', theme.textSecondary)
        .attr('font-family', fonts.body)
        .attr('font-size', '11px');
      yAxisGroup.selectAll('.tick line').attr('stroke', theme.textSecondary);
      yAxisGroup.select('.domain').attr('stroke', theme.textSecondary);

      // Wide CI area
      const wideArea = d3
        .area<{ x: number; low: number; high: number }>()
        .x((d) => xScale(d.x))
        .y0((d) => yScale(d.low))
        .y1((d) => yScale(d.high))
        .curve(d3.curveMonotoneX);

      svg
        .selectAll<SVGPathElement, typeof widePoints>('.ci-wide')
        .data([widePoints])
        .join('path')
        .attr('class', 'ci-wide')
        .attr('d', wideArea)
        .attr('fill', theme.neutral)
        .attr('opacity', 0.15);

      // Narrow CI area
      const narrowArea = d3
        .area<{ x: number; low: number; high: number }>()
        .x((d) => xScale(d.x))
        .y0((d) => yScale(d.low))
        .y1((d) => yScale(d.high))
        .curve(d3.curveMonotoneX);

      svg
        .selectAll<SVGPathElement, typeof narrowPoints>('.ci-narrow')
        .data([narrowPoints])
        .join('path')
        .attr('class', 'ci-narrow')
        .attr('d', narrowArea)
        .attr('fill', theme.neutral)
        .attr('opacity', 0.30);

      // Mean line
      const meanLine = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .curve(d3.curveMonotoneX);

      svg
        .selectAll<SVGPathElement, typeof meanPoints>('.mean-line')
        .data([meanPoints])
        .join('path')
        .attr('class', 'mean-line')
        .attr('d', meanLine)
        .attr('fill', 'none')
        .attr('stroke', theme.neutral)
        .attr('stroke-width', 2);

      // Truth line
      if (showTruth && data.truth) {
        const truthPoints = x.map((xVal, i) => ({ x: xVal, y: data.truth![i] }));
        const truthLine = d3
          .line<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y))
          .curve(d3.curveMonotoneX);

        svg
          .selectAll<SVGPathElement, typeof truthPoints>('.truth-line')
          .data([truthPoints])
          .join('path')
          .attr('class', 'truth-line')
          .attr('d', truthLine)
          .attr('fill', 'none')
          .attr('stroke', theme.positive)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '6,3');
      } else {
        svg.selectAll('.truth-line').remove();
      }

      // Zero reference line
      const yDomain = yScale.domain();
      if (yDomain[0] <= 0 && yDomain[1] >= 0) {
        svg
          .selectAll<SVGLineElement, number>('.zero-line')
          .data([0])
          .join('line')
          .attr('class', 'zero-line')
          .attr('x1', margin.left)
          .attr('x2', width - margin.right)
          .attr('y1', yScale(0))
          .attr('y2', yScale(0))
          .attr('stroke', theme.reference)
          .attr('opacity', 0.4)
          .attr('stroke-dasharray', '4,3');
      } else {
        svg.selectAll('.zero-line').remove();
      }

      // Observation scatter
      if (showObservations && data.observations) {
        svg
          .selectAll<SVGCircleElement, { x: number; y: number }>('.obs-dot')
          .data(data.observations)
          .join('circle')
          .attr('class', 'obs-dot')
          .attr('cx', (d) => xScale(d.x))
          .attr('cy', (d) => yScale(d.y))
          .attr('r', 2.5)
          .attr('fill', theme.textMuted)
          .attr('opacity', 0.5);
      } else {
        svg.selectAll('.obs-dot').remove();
      }

      // Title
      svg.selectAll('.chart-title').remove();
      if (title) {
        svg
          .append('text')
          .attr('class', 'chart-title')
          .attr('x', width / 2)
          .attr('y', margin.top / 2)
          .attr('text-anchor', 'middle')
          .attr('font-family', fonts.title)
          .attr('font-size', '14px')
          .attr('fill', theme.text)
          .text(title);
      }

      // X-axis label
      svg.selectAll('.x-label').remove();
      if (xlabel) {
        svg
          .append('text')
          .attr('class', 'x-label')
          .attr('x', (margin.left + width - margin.right) / 2)
          .attr('y', height - 6)
          .attr('text-anchor', 'middle')
          .attr('font-family', fonts.body)
          .attr('font-size', '12px')
          .attr('fill', theme.textSecondary)
          .text(xlabel);
      }

      // Y-axis label
      svg.selectAll('.y-label').remove();
      if (ylabel) {
        svg
          .append('text')
          .attr('class', 'y-label')
          .attr('x', -(margin.top + height - margin.bottom) / 2)
          .attr('y', 16)
          .attr('text-anchor', 'middle')
          .attr('transform', 'rotate(-90)')
          .attr('font-family', fonts.body)
          .attr('font-size', '12px')
          .attr('fill', theme.textSecondary)
          .text(ylabel);
      }

      // Hover interaction
      svg.selectAll('.hover-overlay').remove();
      svg.selectAll('.crosshair').remove();
      svg.selectAll('.hover-dot').remove();

      const overlay = svg
        .append('rect')
        .attr('class', 'hover-overlay')
        .attr('x', margin.left)
        .attr('y', margin.top)
        .attr('width', width - margin.left - margin.right)
        .attr('height', height - margin.top - margin.bottom)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair');

      const bisector = d3.bisector((d: number) => d).left;

      overlay
        .on('mousemove', function (event) {
          const [mx] = d3.pointer(event);
          const xVal = xScale.invert(mx);
          const idx = Math.min(
            x.length - 1,
            Math.max(0, bisector(x, xVal))
          );

          // Pick the closer of idx and idx-1
          let nearestIdx = idx;
          if (idx > 0) {
            const d0 = Math.abs(x[idx - 1] - xVal);
            const d1 = Math.abs(x[idx] - xVal);
            if (d0 < d1) nearestIdx = idx - 1;
          }

          const nearestX = x[nearestIdx];
          const nearestMean = mean[nearestIdx];

          // Draw crosshair
          svg.selectAll('.crosshair').remove();
          svg
            .append('line')
            .attr('class', 'crosshair')
            .attr('x1', xScale(nearestX))
            .attr('x2', xScale(nearestX))
            .attr('y1', margin.top)
            .attr('y2', height - margin.bottom)
            .attr('stroke', theme.textMuted)
            .attr('opacity', 0.4)
            .attr('stroke-dasharray', '3,2')
            .attr('pointer-events', 'none');

          // Draw hover dot
          svg.selectAll('.hover-dot').remove();
          svg
            .append('circle')
            .attr('class', 'hover-dot')
            .attr('cx', xScale(nearestX))
            .attr('cy', yScale(nearestMean))
            .attr('r', 4)
            .attr('fill', theme.neutral)
            .attr('pointer-events', 'none');

          // Tooltip
          const isWholeNumbers = x.every((v) => Number.isInteger(v));
          const xLabel = isWholeNumbers ? String(Math.round(nearestX)) : nearestX.toFixed(2);

          const narrowLevel = Math.round(ciLevels[0] * 100);
          const wideLevel = Math.round(ciLevels[1] * 100);

          const lines: string[] = [
            `Mean: ${nearestMean.toFixed(3)}`,
            `${narrowLevel}% CI: [${ciNarrowLower[nearestIdx].toFixed(3)}, ${ciNarrowUpper[nearestIdx].toFixed(3)}]`,
            `${wideLevel}% CI: [${ciWideLower[nearestIdx].toFixed(3)}, ${ciWideUpper[nearestIdx].toFixed(3)}]`,
          ];

          if (showTruth && data.truth) {
            lines.push(`Truth: ${data.truth[nearestIdx].toFixed(3)}`);
          }

          tooltip.show(
            {
              title: `x = ${xLabel}`,
              lines,
            },
            event
          );

          // Emit bandHover event
          if (listeners['bandHover']) {
            const detail: BandHoverEventDetail = {
              x: nearestX,
              mean: nearestMean,
              ciNarrowLower: ciNarrowLower[nearestIdx],
              ciNarrowUpper: ciNarrowUpper[nearestIdx],
              ciWideLower: ciWideLower[nearestIdx],
              ciWideUpper: ciWideUpper[nearestIdx],
              truth: data.truth ? data.truth[nearestIdx] : undefined,
            };
            const customEvent = new CustomEvent('bandHover', { detail });
            listeners['bandHover'](customEvent);
          }
        })
        .on('mouseout', function () {
          svg.selectAll('.crosshair').remove();
          svg.selectAll('.hover-dot').remove();
          tooltip.scheduleHide();
        });
    });
  }

  chart.width = function (value?: number): unknown {
    if (arguments.length === 0) return width;
    width = value!;
    return chart;
  };

  chart.height = function (value?: number): unknown {
    if (arguments.length === 0) return height;
    height = value!;
    return chart;
  };

  chart.margin = function (value?: { top: number; right: number; bottom: number; left: number }): unknown {
    if (arguments.length === 0) return margin;
    margin = value!;
    return chart;
  };

  chart.showTruth = function (value?: boolean): unknown {
    if (arguments.length === 0) return showTruth;
    showTruth = value!;
    return chart;
  };

  chart.showObservations = function (value?: boolean): unknown {
    if (arguments.length === 0) return showObservations;
    showObservations = value!;
    return chart;
  };

  chart.title = function (value?: string | null): unknown {
    if (arguments.length === 0) return title;
    title = value ?? null;
    return chart;
  };

  chart.xlabel = function (value?: string | null): unknown {
    if (arguments.length === 0) return xlabel;
    xlabel = value ?? null;
    return chart;
  };

  chart.ylabel = function (value?: string | null): unknown {
    if (arguments.length === 0) return ylabel;
    ylabel = value ?? null;
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

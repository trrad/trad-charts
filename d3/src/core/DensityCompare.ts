/**
 * DensityCompare - Interactive density comparison chart
 *
 * Framework-agnostic D3 component using Mike Bostock's reusable chart pattern.
 * Renders overlaid KDE density curves for multiple sample series with
 * interactive legend toggling, crosshair hover, and tooltip.
 */
// @ts-nocheck

import * as d3 from 'd3';
import { computeKDE } from '../utils/kde.ts';
import { validateSamples } from '../utils/validation.ts';
import { theme, fonts, seriesColors } from '../theme.ts';
import { Tooltip } from './Tooltip.ts';
import type {
  DensityCompareData,
  DensityCompareSeries,
  KDEPoint,
  DensityHoverEventDetail,
  SeriesToggleEventDetail,
} from '../types/index.ts';

export function DensityCompare() {
  let width = 600;
  let height = 300;
  let margin = { top: 30, right: 30, bottom: 40, left: 60 };
  let showMedian = true;
  let showFill = true;
  let kdePoints = 100;
  let title: string | null = null;
  let xlabel: string | null = null;

  const listeners: Record<string, (event: CustomEvent) => void> = {};
  const tooltip = Tooltip();

  // Persist across re-renders
  const visibleSeries = new Set<string>();
  let initialized = false;

  // Cached KDE results for hover interpolation
  let cachedKDEs: Map<string, KDEPoint[]> = new Map();
  let cachedMedians: Map<string, number> = new Map();
  let cachedColors: Map<string, string> = new Map();

  function chart(selection: d3.Selection<Element, DensityCompareData, Element | null, unknown>) {
    selection.each(function (data: DensityCompareData) {
      const container = d3.select(this);
      const { series } = data;

      // --- Data prep ---
      for (const s of series) {
        validateSamples(s.samples, 'DensityCompare');
      }

      // Initialize visibility on first render or when series change
      if (!initialized) {
        visibleSeries.clear();
        for (const s of series) {
          visibleSeries.add(s.label);
        }
        initialized = true;
      }

      // Shared domain: min/max across all series with 5% padding
      let globalMin = Infinity;
      let globalMax = -Infinity;
      for (const s of series) {
        for (const v of s.samples) {
          if (v < globalMin) globalMin = v;
          if (v > globalMax) globalMax = v;
        }
      }
      const padding = (globalMax - globalMin) * 0.05;
      const domain: [number, number] = [globalMin - padding, globalMax + padding];

      // Compute KDE and median for each series
      cachedKDEs.clear();
      cachedMedians.clear();
      cachedColors.clear();

      for (let i = 0; i < series.length; i++) {
        const s = series[i];
        const kde = computeKDE(s.samples, domain, kdePoints);
        cachedKDEs.set(s.label, kde);

        const sorted = [...s.samples].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
        cachedMedians.set(s.label, median);

        cachedColors.set(s.label, seriesColors[i % seriesColors.length]);
      }

      // --- Scales ---
      const xScale = d3.scaleLinear()
        .domain(domain)
        .range([margin.left, width - margin.right]);

      // y domain from visible series only
      let maxDensity = 0;
      for (const s of series) {
        if (!visibleSeries.has(s.label)) continue;
        const kde = cachedKDEs.get(s.label)!;
        for (const pt of kde) {
          if (pt.density > maxDensity) maxDensity = pt.density;
        }
      }
      if (maxDensity === 0) maxDensity = 1;

      const yScale = d3.scaleLinear()
        .domain([0, maxDensity])
        .range([height - margin.bottom, margin.top]);

      // --- SVG setup ---
      let svg = container.select<SVGSVGElement>('svg.density-compare-svg');
      if (svg.empty()) {
        svg = container
          .append('svg')
          .attr('class', 'density-compare-svg')
          .attr('width', width)
          .attr('height', height);
      } else {
        svg.attr('width', width).attr('height', height);
      }

      // Clear previous content for re-render
      svg.selectAll('*').remove();

      // --- Axes ---
      // X axis
      const xAxisG = svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).ticks(8));

      xAxisG.selectAll('text')
        .attr('fill', theme.textSecondary)
        .attr('font-family', fonts.body)
        .attr('font-size', '11px');
      xAxisG.selectAll('line')
        .attr('stroke', theme.textSecondary);
      xAxisG.select('.domain')
        .attr('stroke', theme.textSecondary);

      // Y axis
      const yAxisG = svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(4));

      yAxisG.selectAll('text')
        .attr('fill', theme.textSecondary)
        .attr('font-family', fonts.body)
        .attr('font-size', '11px');
      yAxisG.selectAll('line')
        .attr('stroke', theme.textSecondary);
      yAxisG.select('.domain').remove();

      // Y-axis label
      yAxisG.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(margin.top + (height - margin.top - margin.bottom) / 2))
        .attr('y', -margin.left + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', theme.textSecondary)
        .attr('font-family', fonts.body)
        .attr('font-size', '11px')
        .text('Density');

      // --- Per-series rendering ---
      const seriesGroup = svg.append('g').attr('class', 'series-layer');

      for (let i = 0; i < series.length; i++) {
        const s = series[i];
        if (!visibleSeries.has(s.label)) continue;

        const kde = cachedKDEs.get(s.label)!;
        const color = cachedColors.get(s.label)!;
        const median = cachedMedians.get(s.label)!;

        const g = seriesGroup.append('g').attr('class', `series-${i}`);

        // Filled area
        if (showFill) {
          const area = d3.area<KDEPoint>()
            .x((d) => xScale(d.value))
            .y0(yScale(0))
            .y1((d) => yScale(d.density))
            .curve(d3.curveBasis);

          g.append('path')
            .datum(kde)
            .attr('d', area)
            .attr('fill', color)
            .attr('opacity', 0.12);
        }

        // KDE line
        const line = d3.line<KDEPoint>()
          .x((d) => xScale(d.value))
          .y((d) => yScale(d.density))
          .curve(d3.curveBasis);

        g.append('path')
          .datum(kde)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2);

        // Median line
        if (showMedian) {
          const medianDensity = interpolateDensity(kde, median);

          g.append('line')
            .attr('x1', xScale(median))
            .attr('x2', xScale(median))
            .attr('y1', yScale(0))
            .attr('y2', yScale(medianDensity))
            .attr('stroke', color)
            .attr('opacity', 0.6)
            .attr('stroke-dasharray', '4,3')
            .attr('stroke-width', 1);
        }
      }

      // --- Legend ---
      const legendGroup = svg.append('g').attr('class', 'legend');
      const legendX = width - margin.right - 10;
      let legendY = margin.top + 5;

      for (let i = 0; i < series.length; i++) {
        const s = series[i];
        const color = cachedColors.get(s.label)!;
        const isVisible = visibleSeries.has(s.label);
        const itemG = legendGroup.append('g')
          .attr('transform', `translate(${legendX},${legendY})`)
          .style('cursor', 'pointer')
          .attr('opacity', isVisible ? 1 : 0.3);

        itemG.append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', color)
          .attr('rx', 2);

        itemG.append('text')
          .attr('x', -8)
          .attr('y', 10)
          .attr('text-anchor', 'end')
          .attr('font-family', fonts.body)
          .attr('font-size', '11px')
          .attr('fill', theme.text)
          .text(s.label);

        itemG.on('click', () => {
          if (visibleSeries.has(s.label)) {
            visibleSeries.delete(s.label);
          } else {
            visibleSeries.add(s.label);
          }

          // Re-render
          chart(selection);

          // Emit event
          if (listeners['seriesToggle']) {
            const detail: SeriesToggleEventDetail = {
              label: s.label,
              visible: visibleSeries.has(s.label),
            };
            const customEvent = new CustomEvent('seriesToggle', { detail });
            listeners['seriesToggle'](customEvent);
          }
        });

        legendY += 20;
      }

      // --- Title ---
      if (title) {
        svg.append('text')
          .attr('x', width / 2)
          .attr('y', margin.top / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('font-family', fonts.title)
          .attr('font-size', '14px')
          .attr('fill', theme.text)
          .text(title);
      }

      // --- X-axis label ---
      if (xlabel) {
        svg.append('text')
          .attr('x', margin.left + (width - margin.left - margin.right) / 2)
          .attr('y', height - 4)
          .attr('text-anchor', 'middle')
          .attr('font-family', fonts.body)
          .attr('font-size', '12px')
          .attr('fill', theme.textSecondary)
          .text(xlabel);
      }

      // --- Hover interaction ---
      const hoverGroup = svg.append('g').attr('class', 'hover-layer');

      svg.append('rect')
        .attr('class', 'hover-overlay')
        .attr('x', margin.left)
        .attr('y', margin.top)
        .attr('width', width - margin.left - margin.right)
        .attr('height', height - margin.top - margin.bottom)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mousemove', function (event: MouseEvent) {
          const [mx] = d3.pointer(event);
          const xVal = xScale.invert(mx);

          // Clear previous hover elements
          hoverGroup.selectAll('*').remove();

          // Vertical crosshair line
          hoverGroup.append('line')
            .attr('x1', xScale(xVal))
            .attr('x2', xScale(xVal))
            .attr('y1', margin.top)
            .attr('y2', height - margin.bottom)
            .attr('stroke', theme.textMuted)
            .attr('opacity', 0.3)
            .attr('stroke-dasharray', '3,2');

          // Intersection dots and tooltip data
          const densities: { label: string; density: number; color: string }[] = [];

          for (const s of series) {
            if (!visibleSeries.has(s.label)) continue;

            const kde = cachedKDEs.get(s.label)!;
            const color = cachedColors.get(s.label)!;
            const density = interpolateDensity(kde, xVal);

            hoverGroup.append('circle')
              .attr('cx', xScale(xVal))
              .attr('cy', yScale(density))
              .attr('r', 3)
              .attr('fill', color)
              .attr('stroke', theme.text)
              .attr('stroke-width', 0.5);

            densities.push({ label: s.label, density, color });
          }

          // Tooltip
          const lines = densities.map(
            (d) => `<span style="color:${d.color}">\u25CF</span> ${d.label}: ${d.density.toFixed(4)}`
          );

          tooltip.show(
            {
              title: `x = ${xVal.toFixed(3)}`,
              lines,
            },
            event
          );

          // Emit event
          if (listeners['densityHover']) {
            const detail: DensityHoverEventDetail = { x: xVal, densities };
            const customEvent = new CustomEvent('densityHover', { detail });
            listeners['densityHover'](customEvent);
          }
        })
        .on('mouseout', function () {
          hoverGroup.selectAll('*').remove();
          tooltip.scheduleHide();
        });
    });
  }

  /**
   * Linearly interpolate density at a given x value from KDE points.
   */
  function interpolateDensity(kde: KDEPoint[], x: number): number {
    if (kde.length === 0) return 0;
    if (x <= kde[0].value) return kde[0].density;
    if (x >= kde[kde.length - 1].value) return kde[kde.length - 1].density;

    for (let i = 0; i < kde.length - 1; i++) {
      if (kde[i].value <= x && x <= kde[i + 1].value) {
        const t = (x - kde[i].value) / (kde[i + 1].value - kde[i].value);
        return kde[i].density + t * (kde[i + 1].density - kde[i].density);
      }
    }

    return 0;
  }

  // --- Chainable getter/setter methods ---

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

  chart.showMedian = function (value?: boolean): unknown {
    if (arguments.length === 0) return showMedian;
    showMedian = value!;
    return chart;
  };

  chart.showFill = function (value?: boolean): unknown {
    if (arguments.length === 0) return showFill;
    showFill = value!;
    return chart;
  };

  chart.kdePoints = function (value?: number): unknown {
    if (arguments.length === 0) return kdePoints;
    kdePoints = value!;
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

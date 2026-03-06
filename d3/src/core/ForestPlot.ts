/**
 * ForestPlot - Interactive forest plot for heterogeneous treatment effects
 *
 * Framework-agnostic D3 component using Mike Bostock's reusable chart pattern.
 * Renders point estimates with confidence intervals, colored by effect direction.
 */
// @ts-nocheck

import * as d3 from 'd3';
import { theme, fonts } from '../theme.ts';
import { Tooltip } from './Tooltip.ts';
import type {
  ForestPlotData,
  ForestPlotItem,
  ForestItemHoverEventDetail,
  ForestItemClickEventDetail,
} from '../types/index.ts';

export function ForestPlot() {
  let width = 600;
  let height: number | null = null;
  let rowHeight = 32;
  let margin = { top: 30, right: 30, bottom: 40, left: 140 };
  let sortByEstimate = false;
  let title: string | null = null;
  let xlabel: string | null = null;
  let nullValue = 0;

  let highlightedIndex: number | null = null;

  const listeners: Record<string, (event: CustomEvent) => void> = {};

  const tooltip = Tooltip();

  function chart(selection: d3.Selection<Element, ForestPlotData, Element | null, unknown>) {
    selection.each(function (data: ForestPlotData) {
      const container = d3.select(this);

      // Data prep
      let items = [...data.items];
      if (sortByEstimate) {
        items.sort((a, b) => b.estimate - a.estimate);
      }

      const effectiveNullValue = data.nullValue ?? nullValue;

      // Computed height
      const totalHeight = height ?? items.length * rowHeight + margin.top + margin.bottom;

      // Scales
      const xMin = d3.min(items, (d) => d.ciLower)!;
      const xMax = d3.max(items, (d) => d.ciUpper)!;
      const xScale = d3
        .scaleLinear()
        .domain([xMin, xMax])
        .nice()
        .range([margin.left, width - margin.right]);

      const yScale = d3
        .scaleBand()
        .domain(items.map((d) => d.label))
        .range([margin.top, totalHeight - margin.bottom])
        .padding(0.3);

      // SVG setup
      let svg = container.select<SVGSVGElement>('svg.forest-plot-svg');
      if (svg.empty()) {
        svg = container
          .append('svg')
          .attr('class', 'forest-plot-svg')
          .attr('width', width)
          .attr('height', totalHeight);
      } else {
        svg.attr('width', width).attr('height', totalHeight);
      }

      // Bottom x-axis
      const xAxis = d3.axisBottom(xScale).ticks(6);
      let xAxisGroup = svg.select<SVGGElement>('.x-axis');
      if (xAxisGroup.empty()) {
        xAxisGroup = svg.append('g').attr('class', 'x-axis');
      }
      xAxisGroup
        .attr('transform', `translate(0,${totalHeight - margin.bottom})`)
        .call(xAxis)
        .selectAll('text')
        .attr('fill', theme.textSecondary)
        .attr('font-family', fonts.body)
        .attr('font-size', '11px');
      xAxisGroup.selectAll('.tick line').attr('stroke', theme.textSecondary);
      xAxisGroup.select('.domain').attr('stroke', theme.textSecondary);

      // Left y-axis
      const yAxis = d3.axisLeft(yScale).tickSize(0);
      let yAxisGroup = svg.select<SVGGElement>('.y-axis');
      if (yAxisGroup.empty()) {
        yAxisGroup = svg.append('g').attr('class', 'y-axis');
      }
      yAxisGroup
        .attr('transform', `translate(${margin.left},0)`)
        .call(yAxis)
        .selectAll('text')
        .attr('fill', theme.text)
        .attr('font-family', fonts.body)
        .attr('font-size', '12px');
      yAxisGroup.select('.domain').remove();

      // Reference line
      let refLine = svg.select<SVGLineElement>('.reference-line');
      if (refLine.empty()) {
        refLine = svg.append('line').attr('class', 'reference-line');
      }
      refLine
        .attr('x1', xScale(effectiveNullValue))
        .attr('x2', xScale(effectiveNullValue))
        .attr('y1', margin.top)
        .attr('y2', totalHeight - margin.bottom)
        .attr('stroke', theme.reference)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.6);

      // Row groups
      const rows = svg
        .selectAll<SVGGElement, ForestPlotItem>('.forest-row')
        .data(items, (d) => d.label)
        .join('g')
        .attr('class', 'forest-row')
        .style('cursor', 'pointer');

      // CI whisker
      rows
        .selectAll<SVGLineElement, ForestPlotItem>('.ci-whisker')
        .data((d) => [d])
        .join('line')
        .attr('class', 'ci-whisker')
        .attr('x1', (d) => xScale(d.ciLower))
        .attr('x2', (d) => xScale(d.ciUpper))
        .attr('y1', (d) => yScale(d.label)! + yScale.bandwidth() / 2)
        .attr('y2', (d) => yScale(d.label)! + yScale.bandwidth() / 2)
        .attr('stroke', (d) => d.estimate >= effectiveNullValue ? theme.positive : theme.negative)
        .attr('stroke-width', 2);

      // Left endcap
      rows
        .selectAll<SVGLineElement, ForestPlotItem>('.endcap-left')
        .data((d) => [d])
        .join('line')
        .attr('class', 'endcap-left')
        .attr('x1', (d) => xScale(d.ciLower))
        .attr('x2', (d) => xScale(d.ciLower))
        .attr('y1', (d) => yScale(d.label)! + yScale.bandwidth() / 2 - 4)
        .attr('y2', (d) => yScale(d.label)! + yScale.bandwidth() / 2 + 4)
        .attr('stroke', (d) => d.estimate >= effectiveNullValue ? theme.positive : theme.negative)
        .attr('stroke-width', 2);

      // Right endcap
      rows
        .selectAll<SVGLineElement, ForestPlotItem>('.endcap-right')
        .data((d) => [d])
        .join('line')
        .attr('class', 'endcap-right')
        .attr('x1', (d) => xScale(d.ciUpper))
        .attr('x2', (d) => xScale(d.ciUpper))
        .attr('y1', (d) => yScale(d.label)! + yScale.bandwidth() / 2 - 4)
        .attr('y2', (d) => yScale(d.label)! + yScale.bandwidth() / 2 + 4)
        .attr('stroke', (d) => d.estimate >= effectiveNullValue ? theme.positive : theme.negative)
        .attr('stroke-width', 2);

      // Estimate dot
      rows
        .selectAll<SVGCircleElement, ForestPlotItem>('.estimate-dot')
        .data((d) => [d])
        .join('circle')
        .attr('class', 'estimate-dot')
        .attr('cx', (d) => xScale(d.estimate))
        .attr('cy', (d) => yScale(d.label)! + yScale.bandwidth() / 2)
        .attr('r', 5)
        .attr('fill', (d) => d.estimate >= effectiveNullValue ? theme.positive : theme.negative);

      // Apply highlight/dim state
      rows.attr('opacity', (d, i) => {
        if (highlightedIndex === null) return 1;
        return i === highlightedIndex ? 1 : 0.3;
      });

      // Hover interaction
      rows
        .on('mouseover', function (event, d) {
          const rowGroup = d3.select(this);

          rowGroup.select('.estimate-dot').attr('r', 7);
          rowGroup.select('.ci-whisker').attr('stroke-width', 3);

          const lines: string[] = [
            `Estimate: ${d.estimate.toFixed(3)}`,
            `95% CI: [${d.ciLower.toFixed(3)}, ${d.ciUpper.toFixed(3)}]`,
            d.estimate >= effectiveNullValue ? 'Positive effect' : 'Negative effect',
          ];

          tooltip.show(
            {
              title: d.label,
              lines,
            },
            event
          );

          if (listeners['itemHover']) {
            const detail: ForestItemHoverEventDetail = {
              label: d.label,
              estimate: d.estimate,
              ciLower: d.ciLower,
              ciUpper: d.ciUpper,
              index: items.indexOf(d),
            };
            const customEvent = new CustomEvent('itemHover', { detail });
            listeners['itemHover'](customEvent);
          }
        })
        .on('mouseout', function () {
          const rowGroup = d3.select(this);

          rowGroup.select('.estimate-dot').attr('r', 5);
          rowGroup.select('.ci-whisker').attr('stroke-width', 2);

          tooltip.scheduleHide();
        })
        .on('click', function (event, d) {
          const clickedIndex = items.indexOf(d);

          // Toggle highlight
          if (highlightedIndex === clickedIndex) {
            highlightedIndex = null;
          } else {
            highlightedIndex = clickedIndex;
          }

          // Update all row opacities
          rows.attr('opacity', (_d, i) => {
            if (highlightedIndex === null) return 1;
            return i === highlightedIndex ? 1 : 0.3;
          });

          if (listeners['itemClick']) {
            const detail: ForestItemClickEventDetail = {
              label: d.label,
              estimate: d.estimate,
              ciLower: d.ciLower,
              ciUpper: d.ciUpper,
              index: clickedIndex,
            };
            const customEvent = new CustomEvent('itemClick', { detail });
            listeners['itemClick'](customEvent);
          }
        });

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
          .attr('y', totalHeight - 6)
          .attr('text-anchor', 'middle')
          .attr('font-family', fonts.body)
          .attr('font-size', '12px')
          .attr('fill', theme.textSecondary)
          .text(xlabel);
      }
    });
  }

  chart.width = function (value?: number): unknown {
    if (arguments.length === 0) return width;
    width = value!;
    return chart;
  };

  chart.height = function (value?: number | null): unknown {
    if (arguments.length === 0) return height;
    height = value ?? null;
    return chart;
  };

  chart.rowHeight = function (value?: number): unknown {
    if (arguments.length === 0) return rowHeight;
    rowHeight = value!;
    return chart;
  };

  chart.margin = function (value?: { top: number; right: number; bottom: number; left: number }): unknown {
    if (arguments.length === 0) return margin;
    margin = value!;
    return chart;
  };

  chart.sortByEstimate = function (value?: boolean): unknown {
    if (arguments.length === 0) return sortByEstimate;
    sortByEstimate = value!;
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

  chart.nullValue = function (value?: number): unknown {
    if (arguments.length === 0) return nullValue;
    nullValue = value!;
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

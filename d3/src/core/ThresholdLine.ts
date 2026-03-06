/**
 * ThresholdLine - Draggable vertical threshold line for business decision points
 *
 * Framework-agnostic D3 component using Mike Bostock's reusable chart pattern.
 */
// @ts-nocheck

import * as d3 from 'd3';
import { formatValue } from '../utils/plainEnglish.ts';
import {
  convertPercentToEffect,
  makeEditable,
  parsePercentInput,
  parseDollarInput,
} from '../utils/index.ts';
import { theme } from '../theme.ts';
import { Tooltip } from './Tooltip.ts';
import type { ThresholdDragEventDetail } from '../types/index.ts';

export function ThresholdLine() {
  let scale: d3.ScaleLinear<number, number> | null = null;
  let yRange: [number, number] = [0, 100];
  let value = 0;
  let lineColor = theme.textMuted;
  let lineWidth = 1.5;
  let handleRadius = 4;
  let showLabel = true;
  let labelColor = theme.textSecondary;
  let showTooltip = true;
  let samples: number[] = [];
  let controlSamples: number[] | undefined = undefined;

  const listeners: Record<string, (event: CustomEvent) => void> = {};

  const tooltip = Tooltip();

  function chart(selection: d3.Selection<SVGGElement, unknown, Element | null, unknown>) {
    selection.each(function () {
      const container = d3.select(this);

      if (!scale) {
        throw new Error('ThresholdLine: scale is required');
      }

      const xPos = scale(value);
      const [yMin, yMax] = yRange;

      let group = container.select<SVGGElement>('g.threshold-line-group');
      if (group.empty()) {
        group = container.append('g').attr('class', 'threshold-line-group');
      }

      const line = group
        .selectAll('line.threshold-line')
        .data([value])
        .join('line')
        .attr('class', 'threshold-line')
        .attr('x1', xPos)
        .attr('x2', xPos)
        .attr('y1', yMin)
        .attr('y2', yMax)
        .attr('stroke', lineColor)
        .attr('stroke-width', lineWidth)
        .attr('opacity', 0.7)
        .style('cursor', 'ew-resize');

      const capTop = group
        .selectAll('line.threshold-cap-top')
        .data([value])
        .join('line')
        .attr('class', 'threshold-cap-top')
        .attr('x1', xPos - 4)
        .attr('x2', xPos + 4)
        .attr('y1', yMin)
        .attr('y2', yMin)
        .attr('stroke', lineColor)
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round')
        .style('cursor', 'ew-resize');

      const capBottom = group
        .selectAll('line.threshold-cap-bottom')
        .data([value])
        .join('line')
        .attr('class', 'threshold-cap-bottom')
        .attr('x1', xPos - 4)
        .attr('x2', xPos + 4)
        .attr('y1', yMax)
        .attr('y2', yMax)
        .attr('stroke', lineColor)
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round')
        .style('cursor', 'ew-resize');

      group.selectAll('text.threshold-label-top').remove();
      group.selectAll('text.threshold-label-bottom').remove();

      const drag = d3
        .drag()
        .on('start', function () {
          line.attr('stroke-width', lineWidth * 1.5).attr('opacity', 0.9);
          capTop.attr('stroke-width', 3);
          capBottom.attr('stroke-width', 3);
        })
        .on('drag', function (event) {
          const newValue = scale!.invert(event.x);

          const domain = scale!.domain();
          const constrainedValue = Math.max(domain[0], Math.min(domain[1], newValue));
          value = constrainedValue;

          const newX = scale!(value);

          capTop.attr('x1', newX - 4).attr('x2', newX + 4);
          capBottom.attr('x1', newX - 4).attr('x2', newX + 4);

          line.attr('x1', newX).attr('x2', newX);

          if (listeners['thresholdDrag']) {
            const detail: ThresholdDragEventDetail = { value };
            const customEvent = new CustomEvent('thresholdDrag', { detail });
            listeners['thresholdDrag'](customEvent);
          }
        })
        .on('end', function () {
          line.attr('stroke-width', lineWidth).attr('opacity', 0.7);
          capTop.attr('stroke-width', 2);
          capBottom.attr('stroke-width', 2);
        });

      line.call(drag as unknown as d3.DragBehavior<SVGLineElement, unknown, unknown>);
      capTop.call(drag as unknown as d3.DragBehavior<SVGLineElement, unknown, unknown>);
      capBottom.call(drag as unknown as d3.DragBehavior<SVGLineElement, unknown, unknown>);
    });
  }

  chart.scale = function (val?: d3.ScaleLinear<number, number> | null): unknown {
    if (arguments.length === 0) return scale;
    scale = val ?? null;
    return chart;
  };

  chart.yRange = function (val?: [number, number]): unknown {
    if (arguments.length === 0) return yRange;
    yRange = val!;
    return chart;
  };

  chart.value = function (val?: number): unknown {
    if (arguments.length === 0) return value;
    value = val!;
    return chart;
  };

  chart.lineColor = function (val?: string): unknown {
    if (arguments.length === 0) return lineColor;
    lineColor = val!;
    return chart;
  };

  chart.lineWidth = function (val?: number): unknown {
    if (arguments.length === 0) return lineWidth;
    lineWidth = val!;
    return chart;
  };

  chart.handleRadius = function (val?: number): unknown {
    if (arguments.length === 0) return handleRadius;
    handleRadius = val!;
    return chart;
  };

  chart.showLabel = function (val?: boolean): unknown {
    if (arguments.length === 0) return showLabel;
    showLabel = val!;
    return chart;
  };

  chart.labelColor = function (val?: string): unknown {
    if (arguments.length === 0) return labelColor;
    labelColor = val!;
    return chart;
  };

  chart.samples = function (val?: number[]): unknown {
    if (arguments.length === 0) return samples;
    samples = val!;
    return chart;
  };

  chart.controlSamples = function (val?: number[]): unknown {
    if (arguments.length === 0) return controlSamples;
    controlSamples = val;
    return chart;
  };

  chart.showTooltip = function (val?: boolean): unknown {
    if (arguments.length === 0) return showTooltip;
    showTooltip = val!;
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

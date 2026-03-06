/**
 * HintArea - Progressive disclosure component for revealing additional information
 *
 * Framework-agnostic D3 component that provides interactive hint areas that reveal
 * detailed information on hover or click.
 */
// @ts-nocheck

import * as d3 from 'd3';
import { theme, fonts } from '../theme.ts';

export interface HintAreaOptions {
  position?: [number, number];
  content?: string;
  triggerText?: string;
  triggerColor?: string;
  backgroundColor?: string;
  textColor?: string;
  maxWidth?: number;
  mode?: 'hover' | 'click';
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

export function HintArea() {
  let position: [number, number] = [0, 0];
  let content = '';
  let triggerText = '?';
  let triggerColor = theme.textMuted;
  let backgroundColor = theme.surface;
  let textColor = theme.text;
  let maxWidth = 300;
  let mode: 'hover' | 'click' = 'hover';
  let placement: 'top' | 'bottom' | 'left' | 'right' | 'auto' = 'auto';

  function chart(selection: d3.Selection<SVGGElement, unknown, Element | null, unknown>) {
    selection.each(function () {
      const container = d3.select(this);
      const [x, y] = position;

      let group = container.select<SVGGElement>('g.hint-area-group');
      if (group.empty()) {
        group = container.append('g').attr('class', 'hint-area-group');
      }

      group.attr('transform', `translate(${x}, ${y})`);

      group
        .selectAll('circle.hint-trigger')
        .data([null])
        .join('circle')
        .attr('class', 'hint-trigger')
        .attr('r', 8)
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('fill', theme.background)
        .attr('stroke', triggerColor)
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer');

      group
        .selectAll('text.hint-trigger-text')
        .data([null])
        .join('text')
        .attr('class', 'hint-trigger-text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .style('font-family', fonts.body)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', triggerColor)
        .style('pointer-events', 'none')
        .text(triggerText);

      let hintContent = group.select<SVGForeignObjectElement>('foreignObject.hint-content');
      if (hintContent.empty()) {
        hintContent = group
          .append('foreignObject')
          .attr('class', 'hint-content')
          .style('display', 'none')
          .style('pointer-events', 'none');
      }

      const htmlDiv = hintContent
        .selectAll('div')
        .data([null])
        .join('xhtml:div')
        .style('background', backgroundColor)
        .style('color', textColor)
        .style('padding', '12px 14px')
        .style('border-radius', '6px')
        .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)')
        .style('font-family', fonts.body)
        .style('font-size', '13px')
        .style('line-height', '1.5')
        .style('max-width', `${maxWidth}px`)
        .html(content);

      const updateHintPosition = () => {
        const divNode = htmlDiv.node() as HTMLDivElement;
        if (!divNode) return;

        const bbox = divNode.getBoundingClientRect();
        const width = bbox.width;
        const height = bbox.height;

        hintContent.attr('width', width).attr('height', height);

        let offsetX = 0;
        let offsetY = 0;
        const pad = 12;

        if (placement === 'auto' || placement === 'top') {
          offsetX = -width / 2;
          offsetY = -height - pad - 8;
        } else if (placement === 'bottom') {
          offsetX = -width / 2;
          offsetY = pad + 8;
        } else if (placement === 'left') {
          offsetX = -width - pad - 8;
          offsetY = -height / 2;
        } else if (placement === 'right') {
          offsetX = pad + 8;
          offsetY = -height / 2;
        }

        hintContent.attr('x', offsetX).attr('y', offsetY);
      };

      const trigger = group.select('circle.hint-trigger');

      if (mode === 'hover') {
        trigger
          .on('mouseenter', function () {
            hintContent.style('display', 'block');
            updateHintPosition();
          })
          .on('mouseleave', function () {
            hintContent.style('display', 'none');
          });
      } else if (mode === 'click') {
        let isVisible = false;
        trigger.on('click', function (event: MouseEvent) {
          event.stopPropagation();
          isVisible = !isVisible;
          hintContent.style('display', isVisible ? 'block' : 'none');
          if (isVisible) {
            updateHintPosition();
          }
        });

        d3.select('body').on('click.hint-area', function () {
          if (isVisible) {
            isVisible = false;
            hintContent.style('display', 'none');
          }
        });
      }
    });
  }

  chart.position = function (value?: [number, number]): unknown {
    if (arguments.length === 0) return position;
    position = value!;
    return chart;
  };

  chart.content = function (value?: string): unknown {
    if (arguments.length === 0) return content;
    content = value!;
    return chart;
  };

  chart.triggerText = function (value?: string): unknown {
    if (arguments.length === 0) return triggerText;
    triggerText = value!;
    return chart;
  };

  chart.triggerColor = function (value?: string): unknown {
    if (arguments.length === 0) return triggerColor;
    triggerColor = value!;
    return chart;
  };

  chart.backgroundColor = function (value?: string): unknown {
    if (arguments.length === 0) return backgroundColor;
    backgroundColor = value!;
    return chart;
  };

  chart.textColor = function (value?: string): unknown {
    if (arguments.length === 0) return textColor;
    textColor = value!;
    return chart;
  };

  chart.maxWidth = function (value?: number): unknown {
    if (arguments.length === 0) return maxWidth;
    maxWidth = value!;
    return chart;
  };

  chart.mode = function (value?: 'hover' | 'click'): unknown {
    if (arguments.length === 0) return mode;
    mode = value!;
    return chart;
  };

  chart.placement = function (value?: 'top' | 'bottom' | 'left' | 'right' | 'auto'): unknown {
    if (arguments.length === 0) return placement;
    placement = value!;
    return chart;
  };

  return chart;
}

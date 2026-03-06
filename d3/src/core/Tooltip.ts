/**
 * Tooltip - Context-aware tooltip with plain English probability statements
 *
 * Framework-agnostic D3 component using Mike Bostock's reusable chart pattern.
 * Provides intelligent tooltip positioning and formatted content display.
 */

import * as d3 from 'd3';
import { theme, fonts } from '../theme.ts';

export interface TooltipContent {
  title?: string | null;
  lines: string[];
}

export interface TooltipInstance {
  show: (content: TooltipContent, event: MouseEvent) => void;
  hide: (force?: boolean) => void;
  scheduleHide: () => void;
  destroy: () => void;
  pin: () => void;
  unpin: () => void;
  isPinned: () => boolean;
  offsetX: (value?: number) => number | TooltipInstance;
  offsetY: (value?: number) => number | TooltipInstance;
  maxWidth: (value?: number) => number | TooltipInstance;
  padding: (value?: number) => number | TooltipInstance;
  backgroundColor: (value?: string) => string | TooltipInstance;
  textColor: (value?: string) => string | TooltipInstance;
  fontSize: (value?: number) => number | TooltipInstance;
}

export function Tooltip(): TooltipInstance {
  let offsetX = 12;
  let offsetY = 12;
  let maxWidth = 280;
  let padding = 8;
  let backgroundColor: string = theme.tooltipBg;
  let textColor = theme.tooltipText;
  let borderRadius = 4;
  let fontSize = 12;
  let lineHeight = 1.5;
  let boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';

  let tooltipDiv: d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown> | null = null;

  let pinned = false;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  const hideDelay = 600;

  function clearHideTimeout() {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function ensureContainer() {
    if (!tooltipDiv || tooltipDiv.empty()) {
      tooltipDiv = d3
        .select('body')
        .append('div')
        .attr('class', 'trad-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'auto')
        .style('background-color', backgroundColor)
        .style('color', textColor)
        .style('border-radius', `${borderRadius}px`)
        .style('padding', `${padding}px`)
        .style('font-family', fonts.body)
        .style('font-size', `${fontSize}px`)
        .style('line-height', String(lineHeight))
        .style('max-width', `${maxWidth}px`)
        .style('box-shadow', boxShadow)
        .style('z-index', '9999')
        .style('opacity', '0')
        .style('transition', 'opacity 150ms ease-in-out')
        .on('mouseenter', () => {
          clearHideTimeout();
        })
        .on('mouseleave', () => {
          if (!pinned) {
            scheduleHide();
          }
        })
        .on('click', (event: MouseEvent) => {
          if (!(event.target as HTMLElement).classList.contains('tooltip-close-btn')) {
            pin();
          }
        });
    }
    return tooltipDiv;
  }

  function scheduleHide() {
    clearHideTimeout();
    hideTimeout = setTimeout(() => {
      if (!pinned) {
        hide();
      }
    }, hideDelay);
  }

  function show(content: TooltipContent, event: MouseEvent) {
    clearHideTimeout();
    const container = ensureContainer();

    let html = '';

    if (pinned) {
      html += `<button class="tooltip-close-btn" style="
        position: absolute;
        top: 4px;
        right: 4px;
        background: ${theme.closeButtonBg};
        border: none;
        border-radius: 3px;
        color: ${theme.tooltipText};
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 2px 6px;
        opacity: 0.7;
        transition: opacity 150ms;
      " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'" onclick="event.stopPropagation();">×</button>`;
    }

    if (content.title) {
      html += `<div style="font-weight: 600; margin-bottom: ${content.lines.length > 0 ? '8px' : '0'}; padding-right: ${pinned ? '20px' : '0'}">${content.title}</div>`;
    }
    if (content.lines.length > 0) {
      html += content.lines
        .map((line) => `<div style="margin: 4px 0; color: ${theme.tooltipTextSecondary};">${line}</div>`)
        .join('');
    }

    container.html(html);

    if (pinned) {
      container.select('.tooltip-close-btn').on('click', () => {
        unpin();
        hide();
      });
    }

    const [mouseX, mouseY] = [event.pageX, event.pageY];
    const tooltipNode = container.node();
    if (!tooltipNode) return;

    const tooltipRect = tooltipNode.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = mouseX + offsetX;
    let top = mouseY + offsetY;

    if (left + tooltipRect.width > viewportWidth - 10) {
      left = mouseX - tooltipRect.width - offsetX;
    }

    if (top + tooltipRect.height > viewportHeight - 10) {
      top = mouseY - tooltipRect.height - offsetY;
    }

    left = Math.max(10, left);
    top = Math.max(10, top);

    container.style('left', `${left}px`).style('top', `${top}px`).style('opacity', '1');
  }

  function hide(force: boolean = false) {
    clearHideTimeout();
    if (force) {
      pinned = false;
      if (tooltipDiv) {
        tooltipDiv.style('opacity', '0');
      }
    } else if (!pinned && tooltipDiv) {
      tooltipDiv.style('opacity', '0');
    }
  }

  function pin() {
    pinned = true;
    clearHideTimeout();
    if (tooltipDiv && !tooltipDiv.empty()) {
      const currentHtml = tooltipDiv.html();
      if (!currentHtml.includes('tooltip-close-btn')) {
        const closeBtn = `<button class="tooltip-close-btn" style="
          position: absolute;
          top: 4px;
          right: 4px;
          background: ${theme.closeButtonBg};
          border: none;
          border-radius: 3px;
          color: ${theme.tooltipText};
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 2px 6px;
          opacity: 0.7;
          transition: opacity 150ms;
        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'" onclick="event.stopPropagation();">×</button>`;
        tooltipDiv.html(closeBtn + currentHtml);

        tooltipDiv.select('.tooltip-close-btn').on('click', () => {
          unpin();
          hide();
        });
      }
    }
  }

  function unpin() {
    pinned = false;
  }

  function isPinned() {
    return pinned;
  }

  function destroy() {
    if (tooltipDiv) {
      tooltipDiv.remove();
      tooltipDiv = null;
    }
  }

  const tooltip = {
    show,
    hide,
    scheduleHide,
    destroy,
    pin,
    unpin,
    isPinned,
  } as TooltipInstance;

  tooltip.offsetX = function (value?: number): number | TooltipInstance {
    if (arguments.length === 0) return offsetX;
    offsetX = value!;
    return tooltip;
  };

  tooltip.offsetY = function (value?: number): number | TooltipInstance {
    if (arguments.length === 0) return offsetY;
    offsetY = value!;
    return tooltip;
  };

  tooltip.maxWidth = function (value?: number): number | TooltipInstance {
    if (arguments.length === 0) return maxWidth;
    maxWidth = value!;
    if (tooltipDiv) {
      tooltipDiv.style('max-width', `${maxWidth}px`);
    }
    return tooltip;
  };

  tooltip.padding = function (value?: number): number | TooltipInstance {
    if (arguments.length === 0) return padding;
    padding = value!;
    if (tooltipDiv) {
      tooltipDiv.style('padding', `${padding}px`);
    }
    return tooltip;
  };

  tooltip.backgroundColor = function (value?: string): string | TooltipInstance {
    if (arguments.length === 0) return backgroundColor;
    backgroundColor = value!;
    if (tooltipDiv) {
      tooltipDiv.style('background-color', backgroundColor);
    }
    return tooltip;
  };

  tooltip.textColor = function (value?: string): string | TooltipInstance {
    if (arguments.length === 0) return textColor;
    textColor = value!;
    if (tooltipDiv) {
      tooltipDiv.style('color', textColor);
    }
    return tooltip;
  };

  tooltip.fontSize = function (value?: number): number | TooltipInstance {
    if (arguments.length === 0) return fontSize;
    fontSize = value!;
    if (tooltipDiv) {
      tooltipDiv.style('font-size', `${fontSize}px`);
    }
    return tooltip;
  };

  return tooltip;
}

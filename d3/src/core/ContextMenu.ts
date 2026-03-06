/**
 * ContextMenu - Right-click context menu for interactive actions
 *
 * Framework-agnostic D3 component for showing context menus on right-click.
 */

import * as d3 from 'd3';
import { theme, fonts } from '../theme.ts';

export interface ContextMenuItem {
  label: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

export interface ContextMenuOptions {
  items?: ContextMenuItem[];
  backgroundColor?: string;
  textColor?: string;
  hoverColor?: string;
  borderColor?: string;
  borderRadius?: number;
  fontSize?: number;
  minWidth?: number;
}

export function ContextMenu() {
  let items: ContextMenuItem[] = [];
  let backgroundColor = theme.surface;
  let textColor = theme.text;
  let hoverColor = theme.hoverBg;
  let borderColor = theme.border;
  let borderRadius = 6;
  let fontSize = 13;
  let minWidth = 180;

  let menuDiv: d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown> | null = null;

  function createMenu() {
    if (menuDiv) {
      menuDiv.remove();
    }

    menuDiv = d3
      .select('body')
      .append('div')
      .attr('class', 'trad-context-menu')
      .style('position', 'fixed')
      .style('display', 'none')
      .style('background', backgroundColor)
      .style('border', `1px solid ${borderColor}`)
      .style('border-radius', `${borderRadius}px`)
      .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)')
      .style('padding', '6px 0')
      .style('min-width', `${minWidth}px`)
      .style('z-index', '10000')
      .style('font-family', fonts.body)
      .style('font-size', `${fontSize}px`);

    return menuDiv;
  }

  function renderItems() {
    if (!menuDiv) return;

    menuDiv.selectAll('*').remove();

    items.forEach((item) => {
      if (item.divider || item.label === 'divider') {
        menuDiv!
          .append('div')
          .style('height', '1px')
          .style('background', borderColor)
          .style('margin', '6px 0');
      } else {
        const itemDiv = menuDiv!
          .append('div')
          .attr('class', 'context-menu-item')
          .style('padding', '8px 16px')
          .style('cursor', item.disabled ? 'not-allowed' : 'pointer')
          .style('color', item.disabled ? theme.disabled : textColor)
          .style('user-select', 'none')
          .text(item.label);

        if (!item.disabled) {
          itemDiv
            .on('mouseenter', function () {
              d3.select(this).style('background', hoverColor);
            })
            .on('mouseleave', function () {
              d3.select(this).style('background', 'transparent');
            })
            .on('click', function (event) {
              event.stopPropagation();
              if (item.action) {
                item.action();
              }
              hide();
            });
        }
      }
    });
  }

  function show(x: number, y: number) {
    if (!menuDiv) {
      createMenu();
    }

    renderItems();

    menuDiv!.style('display', 'block').style('left', `${x}px`).style('top', `${y}px`);

    setTimeout(() => {
      const menuNode = menuDiv!.node();
      if (menuNode) {
        const rect = menuNode.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let adjustedX = x;
        let adjustedY = y;

        if (rect.right > viewportWidth) {
          adjustedX = viewportWidth - rect.width - 10;
        }

        if (rect.bottom > viewportHeight) {
          adjustedY = viewportHeight - rect.height - 10;
        }

        menuDiv!.style('left', `${adjustedX}px`).style('top', `${adjustedY}px`);
      }
    }, 0);

    d3.select('body').on('click.context-menu', hide);
  }

  function hide() {
    if (menuDiv) {
      menuDiv.style('display', 'none');
    }
    d3.select('body').on('click.context-menu', null);
  }

  function destroy() {
    if (menuDiv) {
      menuDiv.remove();
      menuDiv = null;
    }
    d3.select('body').on('click.context-menu', null);
  }

  const menu = {
    show,
    hide,
    destroy,

    items: function (value?: ContextMenuItem[]): unknown {
      if (arguments.length === 0) return items;
      items = value!;
      return menu;
    },

    backgroundColor: function (value?: string): unknown {
      if (arguments.length === 0) return backgroundColor;
      backgroundColor = value!;
      if (menuDiv) createMenu();
      return menu;
    },

    textColor: function (value?: string): unknown {
      if (arguments.length === 0) return textColor;
      textColor = value!;
      return menu;
    },

    hoverColor: function (value?: string): unknown {
      if (arguments.length === 0) return hoverColor;
      hoverColor = value!;
      return menu;
    },

    borderColor: function (value?: string): unknown {
      if (arguments.length === 0) return borderColor;
      borderColor = value!;
      if (menuDiv) createMenu();
      return menu;
    },

    borderRadius: function (value?: number): unknown {
      if (arguments.length === 0) return borderRadius;
      borderRadius = value!;
      if (menuDiv) createMenu();
      return menu;
    },

    fontSize: function (value?: number): unknown {
      if (arguments.length === 0) return fontSize;
      fontSize = value!;
      if (menuDiv) createMenu();
      return menu;
    },

    minWidth: function (value?: number): unknown {
      if (arguments.length === 0) return minWidth;
      minWidth = value!;
      if (menuDiv) createMenu();
      return menu;
    },
  };

  return menu;
}

/**
 * Editable label utility for D3 visualizations
 *
 * Provides click-to-edit functionality for text labels, allowing users to
 * enter exact values and have the visualization update accordingly.
 */

import * as d3 from 'd3';
import { theme, fonts } from '../theme.ts';

export interface EditableLabelConfig {
  initialValue: number;
  displayFormat: (value: number) => string;
  parseInput: (input: string) => number | null;
  validate?: (value: number) => string | null;
  onChange: (newValue: number) => void;
  placeholder?: string;
  className?: string;
  fontSize?: string;
  fontWeight?: string;
  fill?: string;
  cursor?: string;
}

export function makeEditable(
  selection: d3.Selection<SVGTextElement, unknown, Element | null, unknown>,
  config: EditableLabelConfig
): void {
  const {
    initialValue,
    displayFormat,
    parseInput,
    validate,
    onChange,
    placeholder = 'Enter value',
    className = 'editable-label',
    fontSize = '11px',
    fontWeight = '600',
    fill = theme.text,
    cursor = 'pointer',
  } = config;

  let currentValue = initialValue;

  selection
    .attr('class', className)
    .style('cursor', cursor)
    .style('font-size', fontSize)
    .style('font-weight', fontWeight)
    .style('fill', fill)
    .text(displayFormat(currentValue));

  selection.on('click', function (event) {
    event.stopPropagation();

    const textElement = d3.select(this);
    const parent = d3.select(this.parentNode as Element);

    const bbox = (this as SVGTextElement).getBBox();
    const x = parseFloat(textElement.attr('x') || '0');
    const y = parseFloat(textElement.attr('y') || '0');
    const textAnchor = textElement.attr('text-anchor') || 'start';

    textElement.style('display', 'none');

    const foreignObject = parent
      .append('foreignObject')
      .attr('class', 'editable-label-input-container')
      .attr('width', Math.max(80, bbox.width + 20))
      .attr('height', 30);

    if (textAnchor === 'middle') {
      foreignObject.attr('x', x - Math.max(80, bbox.width + 20) / 2);
    } else if (textAnchor === 'end') {
      foreignObject.attr('x', x - Math.max(80, bbox.width + 20));
    } else {
      foreignObject.attr('x', x);
    }
    foreignObject.attr('y', y - 20);

    const input = foreignObject
      .append('xhtml:div')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'flex')
      .style('align-items', 'center')
      .append('xhtml:input')
      .attr('type', 'text')
      .attr('placeholder', placeholder)
      .attr('value', displayFormat(currentValue))
      .style('width', '100%')
      .style('padding', '4px 6px')
      .style('font-family', fonts.body)
      .style('font-size', fontSize)
      .style('font-weight', fontWeight)
      .style('border', `2px solid ${theme.inputBorder}`)
      .style('border-radius', '3px')
      .style('background', theme.inputBg)
      .style('color', theme.text)
      .style('outline', 'none')
      .style('text-align', 'center');

    const inputNode = input.node() as HTMLInputElement;
    if (inputNode) {
      inputNode.focus();
      inputNode.select();
    }

    const commitEdit = () => {
      const inputValue = inputNode?.value || '';
      const parsedValue = parseInput(inputValue);

      if (parsedValue !== null) {
        if (validate) {
          const error = validate(parsedValue);
          if (error) {
            alert(error);
            return;
          }
        }

        currentValue = parsedValue;
        onChange(parsedValue);

        textElement.text(displayFormat(currentValue));
      }

      foreignObject.remove();
      textElement.style('display', null);
    };

    const cancelEdit = () => {
      foreignObject.remove();
      textElement.style('display', null);
    };

    input.on('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitEdit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelEdit();
      }
    });

    input.on('blur', () => {
      setTimeout(commitEdit, 100);
    });
  });

  (selection as unknown as Record<string, unknown>).updateValue = (newValue: number) => {
    currentValue = newValue;
    selection.text(displayFormat(currentValue));
  };
}

export function parsePercentInput(input: string): number | null {
  const trimmed = input.trim().replace('%', '').replace(/,/g, '');
  const num = parseFloat(trimmed);

  if (isNaN(num)) {
    return null;
  }

  return num / 100;
}

export function parseDollarInput(input: string): number | null {
  const trimmed = input.trim().replace('$', '').replace(/,/g, '');
  const num = parseFloat(trimmed);

  if (isNaN(num)) {
    return null;
  }

  return num;
}

export function rangeValidator(
  min: number,
  max: number,
  unit: string = ''
): (value: number) => string | null {
  return (value: number) => {
    if (value < min || value > max) {
      return `Value must be between ${min}${unit} and ${max}${unit}`;
    }
    return null;
  };
}

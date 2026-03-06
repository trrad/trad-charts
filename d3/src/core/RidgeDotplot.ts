/**
 * RidgeDotplot - Multi-variant ridge plot using QuantileDots
 *
 * Framework-agnostic D3 component using Mike Bostock's reusable chart pattern.
 * Renders multiple variants in a ridge layout for easy comparison.
 */
// @ts-nocheck

import * as d3 from 'd3';
import { QuantileDots } from './QuantileDots.ts';
import { ThresholdLine } from './ThresholdLine.ts';
import { DraggableCIBounds } from './DraggableCIBounds.ts';
import {
  getPercentile,
  convertPercentToEffect,
  convertEffectToPercent,
  makeEditable,
  parsePercentInput,
  parseDollarInput,
} from '../utils/index.ts';
import {
  formatValue,
  describeLiftDirection,
  formatThresholdProbability,
} from '../utils/plainEnglish.ts';
import { theme, fonts } from '../theme.ts';
import type { RidgeDotplotData, VariantData } from '../types/index.ts';

export interface VariantClickEventDetail {
  variant: VariantData;
  index: number;
}

export function RidgeDotplot() {
  let width: number | null = null;
  let height: number | null = null;
  let margin = { top: 60, right: 80, bottom: 70, left: 60 };
  let dotRadius = 3;
  let ridgeHeight = 120;
  let ridgeSpacing = 15;
  let numDots = 20;
  let ciLower = 0.1;
  let ciUpper = 0.9;
  let showViolin = true;
  let showReferenceLineAtZero = true;
  let showCIBounds = true;
  let showStatistics = true;
  let showTooltip = true;
  let scale: d3.ScaleLinear<number, number> | null = null;
  let valueFormat: ((value: number) => string) | null = null;

  const listeners: Record<string, (event: CustomEvent) => void> = {};

  function chart(selection: d3.Selection<Element, RidgeDotplotData, Element | null, unknown>) {
    selection.each(function (data: RidgeDotplotData) {
      const container = d3.select(this);
      const { variants, threshold } = data;

      if (!variants || variants.length === 0) {
        console.warn('RidgeDotplot: No variants provided');
        return;
      }

      const containerElement = this as HTMLElement;
      const bbox = containerElement.getBoundingClientRect();
      const effectiveWidth = width ?? bbox.width ?? 800;
      const computedRidgeHeight = ridgeHeight;
      const extraStatSpace = showStatistics ? 35 : 0;
      const totalRidgeArea =
        variants.length * (computedRidgeHeight + ridgeSpacing + extraStatSpace);
      const effectiveHeight = height ?? totalRidgeArea + margin.top + margin.bottom;

      const allSamples = variants.flatMap((v) => v.samples);

      const mean = d3.mean(allSamples) || 0;
      const stdDev = d3.deviation(allSamples) || 0;
      const filteredSamples = allSamples.filter((s) => Math.abs(s - mean) <= 3 * stdDev);

      const extent = d3.extent(filteredSamples.length > 0 ? filteredSamples : allSamples) as [
        number,
        number,
      ];

      const range = extent[1] - extent[0];
      const padding = range * 0.1;

      const xScale =
        scale ||
        d3
          .scaleLinear()
          .domain([extent[0] - padding, extent[1] + padding])
          .range([margin.left, effectiveWidth - margin.right]);

      const yScale = d3
        .scaleBand()
        .domain(variants.map((v) => v.name))
        .range([margin.top, effectiveHeight - margin.bottom])
        .paddingInner(ridgeSpacing / computedRidgeHeight)
        .paddingOuter(0.1);

      let svg = container.select<SVGSVGElement>('svg.ridge-dotplot-svg');
      if (svg.empty()) {
        svg = container
          .append('svg')
          .attr('class', 'ridge-dotplot-svg')
          .attr('width', effectiveWidth)
          .attr('height', effectiveHeight)
          .style('background-color', theme.background);
      } else {
        svg.attr('width', effectiveWidth).attr('height', effectiveHeight);
      }

      // Grid background
      const gridGroup = svg
        .selectAll('.grid-background')
        .data([null])
        .join('g')
        .attr('class', 'grid-background');

      const xTicks = xScale.ticks(10);
      gridGroup
        .selectAll('.grid-line-vertical')
        .data(xTicks)
        .join('line')
        .attr('class', 'grid-line-vertical')
        .attr('x1', (d) => xScale(d))
        .attr('x2', (d) => xScale(d))
        .attr('y1', margin.top)
        .attr('y2', effectiveHeight - margin.bottom)
        .attr('stroke', theme.grid)
        .attr('stroke-width', 1)
        .attr('opacity', theme.gridAlpha);

      const yTicks = yScale.domain();
      gridGroup
        .selectAll('.grid-line-horizontal')
        .data(yTicks)
        .join('line')
        .attr('class', 'grid-line-horizontal')
        .attr('x1', margin.left)
        .attr('x2', effectiveWidth - margin.right)
        .attr('y1', (d) => (yScale(d) || 0) + computedRidgeHeight / 2)
        .attr('y2', (d) => (yScale(d) || 0) + computedRidgeHeight / 2)
        .attr('stroke', theme.border)
        .attr('stroke-width', 1)
        .attr('opacity', 0.3);

      // Reference line at zero
      if (showReferenceLineAtZero && xScale.domain()[0] <= 0 && xScale.domain()[1] >= 0) {
        svg
          .selectAll('.reference-line')
          .data([0])
          .join('line')
          .attr('class', 'reference-line')
          .attr('x1', xScale(0))
          .attr('x2', xScale(0))
          .attr('y1', margin.top)
          .attr('y2', effectiveHeight - margin.bottom)
          .attr('stroke', theme.reference)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,2')
          .attr('opacity', 0.6);
      } else {
        svg.selectAll('.reference-line').remove();
      }

      // Calculate threshold effect once
      let thresholdEffect: number | undefined;
      const firstVariantWithControl = variants.find(
        (v) => v.controlSamples && v.controlSamples.length > 0
      );
      if (
        threshold !== undefined &&
        threshold !== null &&
        firstVariantWithControl?.controlSamples
      ) {
        thresholdEffect = convertPercentToEffect(threshold, firstVariantWithControl.controlSamples);
      }

      // Render ridges
      const ridges = svg
        .selectAll<SVGGElement, VariantData>('.ridge')
        .data(variants, (d: VariantData) => d.name)
        .join('g')
        .attr('class', 'ridge')
        .attr('transform', (d) => `translate(0, ${yScale(d.name)})`);

      ridges.each(function (variantData, idx) {
        const ridge = d3.select(this);

        const dotsContainer = ridge
          .selectAll('.dots-container')
          .data([variantData])
          .join('g')
          .attr('class', 'dots-container');

        const dots = QuantileDots()
          .width(effectiveWidth - margin.left - margin.right)
          .scale(xScale)
          .height(computedRidgeHeight)
          .dotRadius(dotRadius)
          .numDots(numDots)
          .ciLower(ciLower)
          .ciUpper(ciUpper)
          .showViolin(showViolin)
          .showTooltip(showTooltip);

        dotsContainer
          .datum({
            samples: variantData.samples,
            threshold,
            effectSamples: variantData.effectSamples,
            thresholdEffect,
          })
          .call(dots as unknown as (sel: d3.Selection<Element, unknown, Element | null, unknown>) => void);

        const kdeData = dots.getKDE();

        dots.on('dotHover', (event: CustomEvent) => {
          if (listeners['dotHover']) {
            const detail = {
              ...event.detail,
              variant: variantData.displayName,
              variantIndex: idx,
            };
            const customEvent = new CustomEvent('dotHover', { detail });
            listeners['dotHover'](customEvent);
          }
        });

        dots.on('dotClick', (event: CustomEvent) => {
          if (listeners['dotClick']) {
            const detail = {
              ...event.detail,
              variant: variantData.displayName,
              variantIndex: idx,
            };
            const customEvent = new CustomEvent('dotClick', { detail });
            listeners['dotClick'](customEvent);
          }
        });

        if (showCIBounds) {
          const ciBoundsContainer = ridge
            .selectAll('.ci-bounds-container')
            .data([variantData])
            .join('g')
            .attr('class', 'ci-bounds-container');

          const ciBounds = DraggableCIBounds()
            .scale(xScale)
            .samples(variantData.samples)
            .lowerPercentile(ciLower)
            .upperPercentile(ciUpper)
            .yRange([0, computedRidgeHeight])
            .showTooltip(false);

          ciBoundsContainer.call(ciBounds as unknown as (sel: d3.Selection<Element, unknown, Element | null, unknown>) => void);

          ciBounds.on('ciDrag', (event: CustomEvent) => {
            if (listeners['ciDrag']) {
              listeners['ciDrag'](event);
            }
          });
        }

        if (showStatistics) {
          const sorted = [...variantData.samples].sort((a, b) => a - b);
          const ciLowerValue = getPercentile(sorted, ciLower);
          const ciUpperValue = getPercentile(sorted, ciUpper);

          if (!variantData.effectSamples || variantData.effectSamples.length === 0) {
            throw new Error(
              `Missing effectSamples for variant "${variantData.name}". ` +
                `All variants must provide both samples (% lift) and effectSamples ($ lift).`
            );
          }
          if (!variantData.controlSamples || variantData.controlSamples.length === 0) {
            throw new Error(
              `Missing controlSamples for variant "${variantData.name}". ` +
                `controlSamples needed to compute unbiased percent lift estimate.`
            );
          }

          const effectMean = d3.mean(variantData.effectSamples)!;
          const controlMean = d3.mean(variantData.controlSamples)!;

          const variantMean = controlMean !== 0 ? effectMean / controlMean : 0;

          (variantData as VariantData & { _mean: number })._mean = variantMean;

          const dollarLift =
            effectMean >= 0 ? `+$${effectMean.toFixed(2)}` : `-$${Math.abs(effectMean).toFixed(2)}`;
          const pctValue = Math.abs(variantMean * 100).toFixed(0);
          const triangle = variantMean >= 0 ? '\u25B2' : '\u25BC';
          const meanColor = variantMean >= 0 ? theme.positive : theme.negative;

          // Density-contoured CI region
          if (kdeData && kdeData.length > 0) {
            const maxDensity = d3.max(kdeData, (d) => d.density) || 1;
            const heightScale = d3
              .scaleLinear()
              .domain([0, maxDensity])
              .range([0, computedRidgeHeight * 0.9]);

            const getDensityAt = (targetValue: number): number => {
              let i = 0;
              while (i < kdeData.length - 1 && kdeData[i].value < targetValue) i++;

              if (i === 0) return kdeData[0].density;
              if (i >= kdeData.length) return kdeData[kdeData.length - 1].density;

              const x0 = kdeData[i - 1].value;
              const x1 = kdeData[i].value;
              const y0 = kdeData[i - 1].density;
              const y1 = kdeData[i].density;
              const t = (targetValue - x0) / (x1 - x0);
              return y0 + t * (y1 - y0);
            };

            const lowerDensity = getDensityAt(ciLowerValue);
            const upperDensity = getDensityAt(ciUpperValue);

            const kdeInCI = kdeData.filter(
              (d) => d.value >= ciLowerValue && d.value <= ciUpperValue
            );

            const pathData: string[] = [];

            pathData.push(`M ${xScale(ciLowerValue)},${computedRidgeHeight - 5}`);

            const lowerY = computedRidgeHeight - heightScale(lowerDensity) - 5;
            pathData.push(`L ${xScale(ciLowerValue)},${lowerY}`);

            kdeInCI.forEach((d) => {
              const y = computedRidgeHeight - heightScale(d.density) - 5;
              pathData.push(`L ${xScale(d.value)},${y}`);
            });

            const upperY = computedRidgeHeight - heightScale(upperDensity) - 5;
            pathData.push(`L ${xScale(ciUpperValue)},${upperY}`);
            pathData.push(`L ${xScale(ciUpperValue)},${computedRidgeHeight - 5}`);

            pathData.push('Z');

            ridge
              .selectAll('.ci-density-region')
              .data([pathData.join(' ')])
              .join('path')
              .attr('class', 'ci-density-region')
              .attr('d', (d) => d)
              .attr('fill', theme.ciRegionFill)
              .attr('fill-opacity', theme.ciRegionFillOpacity)
              .attr('stroke', theme.ciRegionStroke)
              .attr('stroke-width', 0.5)
              .attr('stroke-opacity', theme.ciRegionStrokeOpacity)
              .attr('pointer-events', 'none');

            ridge
              .selectAll('.mean-reference')
              .data([variantMean])
              .join('line')
              .attr('class', 'mean-reference')
              .attr('x1', xScale(variantMean))
              .attr('x2', xScale(variantMean))
              .attr('y1', 0)
              .attr('y2', computedRidgeHeight)
              .attr('stroke', theme.neutral)
              .attr('stroke-width', 2)
              .attr('stroke-dasharray', '4,2')
              .attr('opacity', 0.5)
              .attr('pointer-events', 'none');
          } else {
            ridge.selectAll('.ci-density-region').remove();
            ridge.selectAll('.mean-reference').remove();
          }

          // Consolidated mean label
          const labelX = xScale(variantMean) + 6;
          const labelY = -8;

          const labelGroup = ridge
            .selectAll('.mean-label-group')
            .data([variantMean])
            .join('g')
            .attr('class', 'mean-label-group')
            .attr('transform', `translate(${labelX}, ${labelY})`);

          labelGroup.selectAll('text').remove();

          // Line 1: "expected value"
          labelGroup
            .append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('font-family', fonts.body)
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('fill', theme.textMuted)
            .attr('text-anchor', 'start')
            .text('expected value');

          // Line 2: Dollar value with "/user"
          const line2 = labelGroup
            .append('text')
            .attr('x', 0)
            .attr('y', 15)
            .attr('font-family', fonts.body)
            .attr('text-anchor', 'start');

          line2
            .append('tspan')
            .attr('font-size', '13px')
            .attr('font-weight', '700')
            .attr('fill', meanColor)
            .text(dollarLift);

          line2
            .append('tspan')
            .attr('font-size', '13px')
            .attr('font-weight', '700')
            .attr('fill', theme.neutral)
            .text('/user');

          // Line 3: Percent lift
          const directionWord = effectMean >= 0 ? 'increase' : 'decrease';
          labelGroup
            .append('text')
            .attr('x', 0)
            .attr('y', 30)
            .attr('font-family', fonts.body)
            .attr('font-size', '13px')
            .attr('font-weight', '700')
            .attr('fill', meanColor)
            .attr('text-anchor', 'start')
            .text(`${triangle}${pctValue}% ${directionWord}`);

          // Remove old formats
          ridge.selectAll('.median-label-top').remove();
          ridge.selectAll('.median-label-bottom').remove();
          ridge.selectAll('.median-label-top-suffix').remove();
          ridge.selectAll('.median-label').remove();

          // CI bound labels
          const formatter = valueFormat || formatValue;

          const effectLower = variantData.controlSamples
            ? convertPercentToEffect(ciLowerValue, variantData.controlSamples)
            : 0;
          const effectUpper = variantData.controlSamples
            ? convertPercentToEffect(ciUpperValue, variantData.controlSamples)
            : 0;

          // Left CI bound - $ label at top
          ridge
            .selectAll('.ci-lower-label-top')
            .data([effectLower])
            .join('text')
            .attr('class', 'ci-lower-label-top')
            .attr('x', xScale(ciLowerValue))
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .attr('font-family', fonts.body)
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('fill', theme.textMuted)
            .text((d) => (d >= 0 ? `$${d.toFixed(2)}` : `-$${Math.abs(d).toFixed(2)}`));

          // Left CI bound - % label at bottom
          ridge
            .selectAll('.ci-lower-label')
            .data([ciLowerValue])
            .join('text')
            .attr('class', 'ci-lower-label')
            .attr('x', xScale(ciLowerValue))
            .attr('y', computedRidgeHeight + 15)
            .attr('text-anchor', 'middle')
            .attr('font-family', fonts.body)
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('fill', theme.textMuted)
            .text((d) => formatter(d));

          // Right CI bound - $ label at top
          ridge
            .selectAll('.ci-upper-label-top')
            .data([effectUpper])
            .join('text')
            .attr('class', 'ci-upper-label-top')
            .attr('x', xScale(ciUpperValue))
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .attr('font-family', fonts.body)
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('fill', theme.textMuted)
            .text((d) => (d >= 0 ? `$${d.toFixed(2)}` : `-$${Math.abs(d).toFixed(2)}`));

          // Right CI bound - % label at bottom
          ridge
            .selectAll('.ci-upper-label')
            .data([ciUpperValue])
            .join('text')
            .attr('class', 'ci-upper-label')
            .attr('x', xScale(ciUpperValue))
            .attr('y', computedRidgeHeight + 15)
            .attr('text-anchor', 'middle')
            .attr('font-family', fonts.body)
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('fill', theme.textMuted)
            .text((d) => formatter(d));

          ridge.selectAll('.threshold-shaded-region').remove();
          ridge.selectAll('.threshold-probability-label').remove();
        }
      });

      // Variant labels
      ridges
        .selectAll('.variant-label')
        .data((d) => [d])
        .join('text')
        .attr('class', 'variant-label')
        .attr('x', 10)
        .attr('y', -5)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'hanging')
        .text((d) => d.displayName)
        .style('font-family', fonts.body)
        .style('font-size', '15px')
        .style('font-weight', (d) => (d.isBaseline ? '700' : '600'))
        .style('fill', (d) => (d.isBaseline ? theme.text : theme.textSecondary))
        .style('cursor', 'pointer')
        .on('click', function (_event, d) {
          const idx = variants.findIndex((v) => v.name === d.name);
          if (listeners['variantClick']) {
            const detail: VariantClickEventDetail = {
              variant: d,
              index: idx,
            };
            const customEvent = new CustomEvent('variantClick', { detail });
            listeners['variantClick'](customEvent);
          }
        });

      // Sample size info
      ridges
        .selectAll('.variant-sample-size')
        .data((d) => [d])
        .join('text')
        .attr('class', 'variant-sample-size')
        .attr('x', 10)
        .attr('y', 13)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'hanging')
        .text((d) => {
          if (d.userCount && d.converterCount) {
            return `${d.userCount.toLocaleString()} users \u00B7 ${d.converterCount.toLocaleString()} converters`;
          } else if (d.userCount) {
            return `${d.userCount.toLocaleString()} users`;
          }
          return '';
        })
        .style('font-family', fonts.body)
        .style('font-size', '12px')
        .style('font-weight', '400')
        .style('fill', theme.textSecondary)
        .style('cursor', 'pointer')
        .on('click', function (_event, d) {
          const idx = variants.findIndex((v) => v.name === d.name);
          if (listeners['variantClick']) {
            const detail: VariantClickEventDetail = {
              variant: d,
              index: idx,
            };
            const customEvent = new CustomEvent('variantClick', { detail });
            listeners['variantClick'](customEvent);
          }
        });

      // Threshold line
      if (threshold !== undefined && threshold !== null) {
        const thresholdGroup = svg
          .selectAll('.threshold-container')
          .data([threshold])
          .join('g')
          .attr('class', 'threshold-container');

        const firstVariant = variants[0];

        const thresholdLine = ThresholdLine()
          .scale(xScale)
          .yRange([margin.top, effectiveHeight - margin.bottom])
          .value(threshold)
          .samples(firstVariant.samples)
          .controlSamples(firstVariant.controlSamples);

        thresholdGroup.call(thresholdLine as unknown as (sel: d3.Selection<Element, unknown, Element | null, unknown>) => void);

        thresholdLine.on('thresholdDrag', (event: CustomEvent) => {
          if (listeners['thresholdDrag']) {
            listeners['thresholdDrag'](event);
          }
        });

        svg.selectAll('.threshold-labels').remove();
      } else {
        svg.selectAll('.threshold-container').remove();
        svg.selectAll('.threshold-labels').remove();
      }

      // X-axis
      const xAxis = d3
        .axisBottom(xScale)
        .ticks(10)
        .tickFormat((d) =>
          valueFormat ? valueFormat(Number(d)) : `${(Number(d) * 100).toFixed(0)}%`
        );
      const xAxisGroup = svg
        .selectAll<SVGGElement, null>('.x-axis')
        .data([null])
        .join('g')
        .attr('class', 'x-axis axis')
        .attr('transform', `translate(0, ${effectiveHeight - margin.bottom})`);

      xAxisGroup.call(xAxis as unknown as (sel: d3.Selection<SVGGElement, null, Element | null, unknown>) => void);

      xAxisGroup.select('.domain').attr('stroke-width', 2).attr('stroke', theme.axisDomain);
      xAxisGroup.selectAll('.tick line').attr('stroke-width', 2).attr('stroke', theme.axisTick);
      xAxisGroup
        .selectAll('.tick text')
        .style('font-family', fonts.body)
        .style('font-size', '12px')
        .style('font-weight', '400')
        .style('fill', theme.textSecondary);

      // Threshold tick on bottom axis
      if (threshold !== undefined) {
        const thresholdX = xScale(threshold);
        const labelOffset = 10;
        const labelY = 40;

        xAxisGroup
          .selectAll('.threshold-tick-line')
          .data([threshold])
          .join('line')
          .attr('class', 'threshold-tick-line')
          .attr('x1', thresholdX)
          .attr('x2', thresholdX)
          .attr('y1', 0)
          .attr('y2', 12)
          .attr('stroke', theme.axisDomain);

        xAxisGroup
          .selectAll('.threshold-connector')
          .data([threshold])
          .join('path')
          .attr('class', 'threshold-connector')
          .attr(
            'd',
            `M ${thresholdX} 12 L ${thresholdX} ${labelY - 10} L ${thresholdX + labelOffset} ${labelY - 2}`
          )
          .attr('stroke', theme.textMuted)
          .attr('stroke-width', 1.5)
          .attr('fill', 'none');

        xAxisGroup.selectAll('.threshold-tick-label').remove();
        xAxisGroup.selectAll('.editable-label-input-container').remove();

        const thresholdLabel = xAxisGroup
          .append('text')
          .attr('class', 'threshold-tick-label')
          .attr('x', thresholdX + labelOffset)
          .attr('y', labelY)
          .attr('text-anchor', 'start');

        makeEditable(thresholdLabel, {
          initialValue: threshold,
          displayFormat: (value) => {
            const rounded = Math.abs(value) < 0.0005 ? 0 : value;
            return `${(rounded * 100).toFixed(0)}%`;
          },
          parseInput: parsePercentInput,
          validate: (value) => {
            const domain = xScale.domain();
            if (value < domain[0] || value > domain[1]) {
              return `Threshold must be between ${(domain[0] * 100).toFixed(0)}% and ${(domain[1] * 100).toFixed(0)}%`;
            }
            return null;
          },
          onChange: (newValue) => {
            data.threshold = newValue;
            chart(selection as unknown as d3.Selection<Element, RidgeDotplotData, Element | null, unknown>);
          },
          fontSize: '12px',
          fontWeight: '600',
          fill: theme.text,
          cursor: 'pointer',
        });

        const tickThreshold = 0.03;
        xAxisGroup.selectAll('.tick text').each(function () {
          const tickText = d3.select(this);
          const tickValue = parseFloat(tickText.text().replace('%', '')) / 100;
          if (!isNaN(tickValue) && Math.abs(tickValue - threshold) < tickThreshold) {
            tickText.style('opacity', '0');
          } else {
            tickText.style('opacity', '1');
          }
        });
      } else {
        xAxisGroup.selectAll('.threshold-tick-line').remove();
        xAxisGroup.selectAll('.threshold-tick-label').remove();
        xAxisGroup.selectAll('.threshold-connector').remove();

        xAxisGroup.selectAll('.tick text').style('opacity', '1');
      }

      // Top dollar axis
      if (variants.some((v) => v.controlSamples && v.controlSamples.length > 0)) {
        const variantWithControl = variants.find(
          (v) => v.controlSamples && v.controlSamples.length > 0
        );

        if (variantWithControl && variantWithControl.controlSamples) {
          const topAxis = d3
            .axisTop(xScale)
            .tickValues(xScale.ticks(10))
            .tickSize(6)
            .tickFormat((d) => {
              const percentValue = Number(d);
              const dollarValue = convertPercentToEffect(
                percentValue,
                variantWithControl.controlSamples
              );

              const finalValue = Math.abs(dollarValue) < 0.005 ? 0 : dollarValue;

              if (Math.abs(finalValue) >= 1000) {
                return d3.format('$,.0f')(finalValue);
              } else if (Math.abs(finalValue) >= 1) {
                return d3.format('$,.2f')(finalValue);
              } else {
                return d3.format('$.2f')(finalValue);
              }
            });

          const topAxisGroup = svg
            .selectAll<SVGGElement, null>('.x-axis-top')
            .data([null])
            .join('g')
            .attr('class', 'x-axis-top axis')
            .attr('transform', `translate(0, ${margin.top - 10})`);

          topAxisGroup.call(topAxis as unknown as (sel: d3.Selection<SVGGElement, null, Element | null, unknown>) => void);

          topAxisGroup.select('.domain').attr('stroke-width', 2).attr('stroke', theme.axisDomain);
          topAxisGroup.selectAll('.tick line').attr('stroke-width', 2).attr('stroke', theme.axisTick);
          topAxisGroup
            .selectAll('.tick text')
            .style('font-family', fonts.body)
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('fill', theme.textSecondary);

          if (threshold !== undefined) {
            const thresholdX = xScale(threshold);
            const labelOffset = 10;
            const labelY = -40;
            let dollarValue = convertPercentToEffect(
              threshold,
              variantWithControl.controlSamples
            );

            if (Math.abs(dollarValue) < 0.005) {
              dollarValue = 0;
            }

            topAxisGroup
              .selectAll('.threshold-tick-line')
              .data([threshold])
              .join('line')
              .attr('class', 'threshold-tick-line')
              .attr('x1', thresholdX)
              .attr('x2', thresholdX)
              .attr('y1', 0)
              .attr('y2', -12)
              .attr('stroke', theme.axisDomain)
              .attr('stroke-width', 3);

            topAxisGroup
              .selectAll('.threshold-connector')
              .data([threshold])
              .join('path')
              .attr('class', 'threshold-connector')
              .attr(
                'd',
                `M ${thresholdX} -12 L ${thresholdX} ${labelY + 10} L ${thresholdX + labelOffset} ${labelY + 2}`
              )
              .attr('stroke', theme.textMuted)
              .attr('stroke-width', 1.5)
              .attr('fill', 'none');

            topAxisGroup.selectAll('.threshold-tick-label').remove();
            topAxisGroup.selectAll('.editable-label-input-container').remove();

            const topThresholdLabel = topAxisGroup
              .append('text')
              .attr('class', 'threshold-tick-label')
              .attr('x', thresholdX + labelOffset)
              .attr('y', labelY)
              .attr('text-anchor', 'start');

            makeEditable(topThresholdLabel, {
              initialValue: dollarValue,
              displayFormat: (value) => {
                const rounded = Math.abs(value) < 0.005 ? 0 : value;
                if (rounded >= 0) {
                  return Math.abs(rounded) >= 1000
                    ? d3.format('$,.0f')(rounded)
                    : Math.abs(rounded) >= 1
                      ? d3.format('$,.2f')(rounded)
                      : d3.format('$.2f')(rounded);
                } else {
                  return Math.abs(rounded) >= 1000
                    ? `-${d3.format('$,.0f')(Math.abs(rounded))}`
                    : Math.abs(rounded) >= 1
                      ? `-${d3.format('$,.2f')(Math.abs(rounded))}`
                      : `-${d3.format('$.2f')(Math.abs(rounded))}`;
                }
              },
              parseInput: parseDollarInput,
              validate: (value) => {
                const domain = xScale.domain();
                const minDollar = convertPercentToEffect(
                  domain[0],
                  variantWithControl.controlSamples
                );
                const maxDollar = convertPercentToEffect(
                  domain[1],
                  variantWithControl.controlSamples
                );

                if (value < minDollar || value > maxDollar) {
                  return `Threshold must be between ${d3.format('$.2f')(minDollar)} and ${d3.format('$.2f')(maxDollar)}`;
                }
                return null;
              },
              onChange: (newDollarValue) => {
                const newPercent = convertEffectToPercent(
                  newDollarValue,
                  variantWithControl.controlSamples
                );

                data.threshold = newPercent;
                chart(selection as unknown as d3.Selection<Element, RidgeDotplotData, Element | null, unknown>);
              },
              fontSize: '12px',
              fontWeight: '600',
              fill: theme.text,
              cursor: 'pointer',
            });

            const tickThresholdDollar = 0.15;
            topAxisGroup.selectAll('.tick text').each(function () {
              const tickText = d3.select(this);
              const tickString = tickText.text().replace(/[$,]/g, '');
              const tickValue = parseFloat(tickString);
              if (!isNaN(tickValue) && Math.abs(tickValue - dollarValue) < tickThresholdDollar) {
                tickText.style('opacity', '0');
              } else {
                tickText.style('opacity', '1');
              }
            });
          } else {
            topAxisGroup.selectAll('.threshold-tick-line').remove();
            topAxisGroup.selectAll('.threshold-tick-label').remove();
            topAxisGroup.selectAll('.threshold-connector').remove();

            topAxisGroup.selectAll('.tick text').style('opacity', '1');
          }
        }
      } else {
        svg.selectAll('.x-axis-top').remove();
      }
    });
  }

  chart.width = function (value?: number | null): unknown {
    if (arguments.length === 0) return width;
    width = value ?? null;
    return chart;
  };

  chart.height = function (value?: number | null): unknown {
    if (arguments.length === 0) return height;
    height = value ?? null;
    return chart;
  };

  chart.margin = function (value?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }): unknown {
    if (arguments.length === 0) return margin;
    margin = value!;
    return chart;
  };

  chart.dotRadius = function (value?: number): unknown {
    if (arguments.length === 0) return dotRadius;
    dotRadius = value!;
    return chart;
  };

  chart.ridgeHeight = function (value?: number): unknown {
    if (arguments.length === 0) return ridgeHeight;
    ridgeHeight = value!;
    return chart;
  };

  chart.ridgeSpacing = function (value?: number): unknown {
    if (arguments.length === 0) return ridgeSpacing;
    ridgeSpacing = value!;
    return chart;
  };

  chart.numDots = function (value?: number): unknown {
    if (arguments.length === 0) return numDots;
    numDots = value!;
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

  chart.showReferenceLineAtZero = function (value?: boolean): unknown {
    if (arguments.length === 0) return showReferenceLineAtZero;
    showReferenceLineAtZero = value!;
    return chart;
  };

  chart.scale = function (value?: d3.ScaleLinear<number, number> | null): unknown {
    if (arguments.length === 0) return scale;
    scale = value ?? null;
    return chart;
  };

  chart.showCIBounds = function (value?: boolean): unknown {
    if (arguments.length === 0) return showCIBounds;
    showCIBounds = value!;
    return chart;
  };

  chart.showStatistics = function (value?: boolean): unknown {
    if (arguments.length === 0) return showStatistics;
    showStatistics = value!;
    return chart;
  };

  chart.valueFormat = function (value?: ((v: number) => string) | null): unknown {
    if (arguments.length === 0) return valueFormat;
    valueFormat = value ?? null;
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

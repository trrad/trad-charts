// src/core/QuantileDots.ts
import * as d35 from "d3";

// src/utils/quantiles.ts
import * as d3 from "d3";
function computeQuantiles(samples, numQuantiles = 20) {
  if (!samples || samples.length === 0) {
    throw new Error("computeQuantiles: samples array cannot be empty");
  }
  if (numQuantiles < 2) {
    throw new Error(`computeQuantiles: numQuantiles must be >= 2, got ${numQuantiles}`);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  return Array.from({ length: numQuantiles }, (_, i) => {
    const p = (i + 0.5) / numQuantiles;
    const index = Math.floor(n * p);
    return sorted[Math.min(index, n - 1)];
  });
}
function getCIBounds(sorted, lowerP, upperP) {
  if (lowerP < 0 || lowerP > 1) {
    throw new Error(`getCIBounds: lowerP must be between 0 and 1, got ${lowerP}`);
  }
  if (upperP < 0 || upperP > 1) {
    throw new Error(`getCIBounds: upperP must be between 0 and 1, got ${upperP}`);
  }
  if (lowerP >= upperP) {
    throw new Error(`getCIBounds: lowerP (${lowerP}) must be < upperP (${upperP})`);
  }
  const n = sorted.length;
  const lowerIndex = Math.floor(n * lowerP);
  const upperIndex = Math.floor(n * upperP);
  return {
    lower: sorted[Math.min(lowerIndex, n - 1)],
    upper: sorted[Math.min(upperIndex, n - 1)]
  };
}
function sortSamples(samples) {
  if (!samples || samples.length === 0) {
    throw new Error("sortSamples: samples array cannot be empty");
  }
  const validSamples = samples.filter((x) => Number.isFinite(x));
  if (validSamples.length === 0) {
    throw new Error("sortSamples: no valid (finite) samples found");
  }
  if (validSamples.length < samples.length) {
    console.warn(
      `sortSamples: filtered out ${samples.length - validSamples.length} non-finite values`
    );
  }
  return [...validSamples].sort((a, b) => a - b);
}
function getPercentile(sorted, percentile) {
  if (percentile < 0 || percentile > 1) {
    throw new Error(`getPercentile: percentile must be between 0 and 1, got ${percentile}`);
  }
  const n = sorted.length;
  const index = Math.floor(n * percentile);
  return sorted[Math.min(index, n - 1)];
}
function getSortedPairs(samples, effectSamples) {
  if (!effectSamples || effectSamples.length === 0) {
    return null;
  }
  if (samples.length !== effectSamples.length) {
    console.warn("getSortedPairs: samples and effectSamples have different lengths");
    return null;
  }
  const pairs = samples.map((pct, i) => ({
    pct,
    effect: effectSamples[i]
  }));
  pairs.sort((a, b) => a.pct - b.pct);
  return pairs;
}
function convertPercentToEffect(percentThreshold, controlSamples) {
  if (!controlSamples || controlSamples.length === 0) {
    return 0;
  }
  const meanControl = d3.mean(controlSamples) || 0;
  return percentThreshold * meanControl;
}
function convertEffectToPercent(effectThreshold, controlSamples) {
  if (!controlSamples || controlSamples.length === 0) {
    return 0;
  }
  const meanControl = d3.mean(controlSamples) || 0;
  if (meanControl === 0) {
    return 0;
  }
  return effectThreshold / meanControl;
}

// src/utils/kde.ts
import * as d32 from "d3";
function computeKDE(samples, domain, numPoints = 50) {
  if (!samples || samples.length === 0) {
    throw new Error("computeKDE: samples array cannot be empty");
  }
  if (samples.length < 10) {
    console.warn("computeKDE: very few samples (< 10), KDE may be unreliable");
  }
  const [min, max3] = domain;
  if (!Number.isFinite(min) || !Number.isFinite(max3)) {
    throw new Error(`computeKDE: domain must contain finite values, got [${min}, ${max3}]`);
  }
  if (min >= max3) {
    throw new Error(`computeKDE: domain min (${min}) must be < max (${max3})`);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const sigma = Math.min(d32.deviation(samples) || 1, iqr / 1.34);
  const bandwidth = 1.06 * sigma * Math.pow(n, -0.2);
  if (bandwidth <= 0 || !Number.isFinite(bandwidth)) {
    const range = max3 - min;
    const fallbackBandwidth = range / 20;
    console.warn(
      `computeKDE: invalid bandwidth (${bandwidth}), using fallback (${fallbackBandwidth})`
    );
    return computeKDEWithBandwidth(samples, domain, fallbackBandwidth, numPoints);
  }
  return computeKDEWithBandwidth(samples, domain, bandwidth, numPoints);
}
function computeKDEWithBandwidth(samples, domain, bandwidth, numPoints) {
  const [min, max3] = domain;
  const kernel = (x) => {
    const u = x / bandwidth;
    return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) / bandwidth : 0;
  };
  const points = Array.from(
    { length: numPoints },
    (_, i) => min + i / (numPoints - 1) * (max3 - min)
  );
  return points.map((x) => ({
    value: x,
    density: d32.mean(samples, (d) => kernel(x - d)) || 0
  }));
}

// src/utils/validation.ts
function validateSamples(samples, componentName) {
  if (!samples) {
    throw new Error(`${componentName}: samples cannot be null or undefined`);
  }
  if (!Array.isArray(samples)) {
    throw new Error(`${componentName}: samples must be an array, got ${typeof samples}`);
  }
  if (samples.length === 0) {
    throw new Error(`${componentName}: samples array cannot be empty`);
  }
  const invalidIndex = samples.findIndex((x) => typeof x !== "number");
  if (invalidIndex !== -1) {
    throw new Error(
      `${componentName}: samples must contain only numbers, found ${typeof samples[invalidIndex]} at index ${invalidIndex}`
    );
  }
  const nonFiniteIndex = samples.findIndex((x) => !Number.isFinite(x));
  if (nonFiniteIndex !== -1) {
    throw new Error(
      `${componentName}: samples must contain only finite numbers, found ${samples[nonFiniteIndex]} at index ${nonFiniteIndex}`
    );
  }
  if (samples.length < 10) {
    console.warn(
      `${componentName}: very few samples (${samples.length}), visualization may be unreliable`
    );
  }
}
function validateCIBounds(lower, upper, componentName) {
  if (typeof lower !== "number" || !Number.isFinite(lower)) {
    throw new Error(`${componentName}: ciLower must be a finite number, got ${lower}`);
  }
  if (typeof upper !== "number" || !Number.isFinite(upper)) {
    throw new Error(`${componentName}: ciUpper must be a finite number, got ${upper}`);
  }
  if (lower < 0 || lower > 1) {
    throw new Error(`${componentName}: ciLower must be between 0 and 1, got ${lower}`);
  }
  if (upper < 0 || upper > 1) {
    throw new Error(`${componentName}: ciUpper must be between 0 and 1, got ${upper}`);
  }
  if (lower >= upper) {
    throw new Error(`${componentName}: ciLower (${lower}) must be < ciUpper (${upper})`);
  }
}
function validateNumDots(numDots, componentName) {
  if (typeof numDots !== "number" || !Number.isFinite(numDots) || !Number.isInteger(numDots)) {
    throw new Error(`${componentName}: numDots must be an integer, got ${numDots}`);
  }
  if (numDots < 2) {
    throw new Error(`${componentName}: numDots must be >= 2, got ${numDots}`);
  }
  if (numDots > 1e3) {
    console.warn(
      `${componentName}: numDots is very large (${numDots}), performance may be affected`
    );
  }
}

// src/utils/plainEnglish.ts
function formatCredibleInterval(lower, upper, coverage, unit = "%") {
  const coveragePercent = (coverage * 100).toFixed(0);
  const lowerStr = formatValue(lower, unit).replace(".0%", "%");
  const upperStr = formatValue(upper, unit).replace(".0%", "%");
  return `${coveragePercent}% probability the true lift is between ${lowerStr} and ${upperStr}`;
}
function formatValue(value, unit = "%") {
  if (unit === "%") {
    const percentValue = (value * 100).toFixed(0);
    const sign = value >= 0 ? "+" : "";
    return `${sign}${percentValue}%`;
  } else if (unit === "$") {
    return `$${value.toFixed(2)}`;
  } else {
    return `${value.toFixed(2)}${unit}`;
  }
}

// src/utils/editableLabel.ts
import * as d33 from "d3";

// ../palette.json
var palette_default = {
  surfaces: {
    crust: "#0f0812",
    mantle: "#150c1a",
    base: "#1a0f1f",
    surface0: "#251730",
    surface1: "#33213f",
    surface2: "#432d52"
  },
  overlays: {
    overlay0: "#5a4168",
    overlay1: "#7a6488",
    overlay2: "#9688a0"
  },
  text: {
    subtext0: "#a297a8",
    subtext1: "#d4ccd8",
    text: "#e8e3ed"
  },
  accents: {
    rosewater: "#f5e0dc",
    flamingo: "#f2cdcd",
    pink: "#f5c2e7",
    mauve: "#cba6f7",
    red: "#f38ba8",
    maroon: "#eba0b3",
    peach: "#fab387",
    yellow: "#f9e2af",
    green: "#a6e3a1",
    teal: "#94e2d5",
    sky: "#89dceb",
    sapphire: "#74c7ec",
    blue: "#89b4fa",
    lavender: "#b4befe"
  },
  fonts: {
    title: "3270 Nerd Font Propo",
    body: "IBM Plex Sans"
  },
  grid: {
    color: "#4d4338",
    alpha: 0.7
  }
};

// src/theme.ts
var fonts = {
  body: `"${palette_default.fonts.body}", "DejaVu Sans", sans-serif`,
  title: `"${palette_default.fonts.title}", monospace`
};
var theme = {
  // Backgrounds
  background: palette_default.surfaces.base,
  surface: palette_default.surfaces.surface0,
  surfaceAlt: palette_default.surfaces.surface1,
  // Text hierarchy
  text: palette_default.text.text,
  textSecondary: palette_default.text.subtext0,
  textMuted: palette_default.overlays.overlay1,
  textShadow: "rgba(15, 8, 18, 0.8)",
  // Borders & grid
  border: palette_default.surfaces.surface1,
  borderSubtle: palette_default.surfaces.surface2,
  grid: palette_default.grid.color,
  gridAlpha: palette_default.grid.alpha,
  // Semantic colors
  positive: palette_default.accents.green,
  negative: palette_default.accents.red,
  neutral: palette_default.accents.blue,
  reference: palette_default.overlays.overlay0,
  // Interactive / muted
  muted: palette_default.overlays.overlay1,
  disabled: palette_default.overlays.overlay0,
  // Tooltip
  tooltipBg: `rgba(37, 23, 48, 0.95)`,
  // surface0 at 95%
  tooltipText: palette_default.text.text,
  tooltipTextSecondary: `rgba(232, 227, 237, 0.9)`,
  // text at 90%
  // Context menu / hover
  hoverBg: palette_default.surfaces.surface0,
  // Violin fills (accents at low opacity for dark background)
  violinBelow: `rgba(243, 139, 168, 0.15)`,
  // red at 15%
  violinAbove: `rgba(166, 227, 161, 0.15)`,
  // green at 15%
  violinBelowStroke: `rgba(243, 139, 168, 0.30)`,
  // red at 30%
  violinAboveStroke: `rgba(166, 227, 161, 0.30)`,
  // green at 30%
  violinNeutral: palette_default.surfaces.surface1,
  // CI region
  ciRegionFill: palette_default.accents.blue,
  ciRegionFillOpacity: 0.08,
  ciRegionStroke: palette_default.accents.blue,
  ciRegionStrokeOpacity: 0.3,
  // Dot stroke (matches background so dots appear cleanly punched out)
  dotStroke: palette_default.surfaces.base,
  // Close button overlay (for tooltip pin)
  closeButtonBg: `rgba(232, 227, 237, 0.2)`,
  // text at 20%
  // Axis
  axisDomain: palette_default.text.subtext0,
  axisTick: palette_default.text.subtext0,
  // Editable input
  inputBorder: palette_default.text.subtext0,
  inputBg: palette_default.surfaces.surface0
};
var defaultColorScheme = {
  above: palette_default.accents.green,
  below: palette_default.overlays.overlay1,
  neutral: palette_default.accents.blue
};

// src/utils/editableLabel.ts
function makeEditable(selection, config) {
  const {
    initialValue,
    displayFormat,
    parseInput,
    validate,
    onChange,
    placeholder = "Enter value",
    className = "editable-label",
    fontSize = "11px",
    fontWeight = "600",
    fill = theme.text,
    cursor = "pointer"
  } = config;
  let currentValue = initialValue;
  selection.attr("class", className).style("cursor", cursor).style("font-size", fontSize).style("font-weight", fontWeight).style("fill", fill).text(displayFormat(currentValue));
  selection.on("click", function(event) {
    event.stopPropagation();
    const textElement = d33.select(this);
    const parent = d33.select(this.parentNode);
    const bbox = this.getBBox();
    const x = parseFloat(textElement.attr("x") || "0");
    const y = parseFloat(textElement.attr("y") || "0");
    const textAnchor = textElement.attr("text-anchor") || "start";
    textElement.style("display", "none");
    const foreignObject = parent.append("foreignObject").attr("class", "editable-label-input-container").attr("width", Math.max(80, bbox.width + 20)).attr("height", 30);
    if (textAnchor === "middle") {
      foreignObject.attr("x", x - Math.max(80, bbox.width + 20) / 2);
    } else if (textAnchor === "end") {
      foreignObject.attr("x", x - Math.max(80, bbox.width + 20));
    } else {
      foreignObject.attr("x", x);
    }
    foreignObject.attr("y", y - 20);
    const input = foreignObject.append("xhtml:div").style("width", "100%").style("height", "100%").style("display", "flex").style("align-items", "center").append("xhtml:input").attr("type", "text").attr("placeholder", placeholder).attr("value", displayFormat(currentValue)).style("width", "100%").style("padding", "4px 6px").style("font-family", fonts.body).style("font-size", fontSize).style("font-weight", fontWeight).style("border", `2px solid ${theme.inputBorder}`).style("border-radius", "3px").style("background", theme.inputBg).style("color", theme.text).style("outline", "none").style("text-align", "center");
    const inputNode = input.node();
    if (inputNode) {
      inputNode.focus();
      inputNode.select();
    }
    const commitEdit = () => {
      const inputValue = inputNode?.value || "";
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
      textElement.style("display", null);
    };
    const cancelEdit = () => {
      foreignObject.remove();
      textElement.style("display", null);
    };
    input.on("keydown", function(event2) {
      if (event2.key === "Enter") {
        event2.preventDefault();
        commitEdit();
      } else if (event2.key === "Escape") {
        event2.preventDefault();
        cancelEdit();
      }
    });
    input.on("blur", () => {
      setTimeout(commitEdit, 100);
    });
  });
  selection.updateValue = (newValue) => {
    currentValue = newValue;
    selection.text(displayFormat(currentValue));
  };
}
function parsePercentInput(input) {
  const trimmed = input.trim().replace("%", "").replace(/,/g, "");
  const num = parseFloat(trimmed);
  if (isNaN(num)) {
    return null;
  }
  return num / 100;
}
function parseDollarInput(input) {
  const trimmed = input.trim().replace("$", "").replace(/,/g, "");
  const num = parseFloat(trimmed);
  if (isNaN(num)) {
    return null;
  }
  return num;
}

// src/core/Tooltip.ts
import * as d34 from "d3";
function Tooltip() {
  let offsetX = 12;
  let offsetY = 12;
  let maxWidth = 280;
  let padding = 8;
  let backgroundColor = theme.tooltipBg;
  let textColor = theme.tooltipText;
  let borderRadius = 4;
  let fontSize = 12;
  let lineHeight = 1.5;
  let boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
  let tooltipDiv = null;
  let pinned = false;
  let hideTimeout = null;
  const hideDelay = 600;
  function clearHideTimeout() {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }
  function ensureContainer() {
    if (!tooltipDiv || tooltipDiv.empty()) {
      tooltipDiv = d34.select("body").append("div").attr("class", "trad-tooltip").style("position", "absolute").style("pointer-events", "auto").style("background-color", backgroundColor).style("color", textColor).style("border-radius", `${borderRadius}px`).style("padding", `${padding}px`).style("font-family", fonts.body).style("font-size", `${fontSize}px`).style("line-height", String(lineHeight)).style("max-width", `${maxWidth}px`).style("box-shadow", boxShadow).style("z-index", "9999").style("opacity", "0").style("transition", "opacity 150ms ease-in-out").on("mouseenter", () => {
        clearHideTimeout();
      }).on("mouseleave", () => {
        if (!pinned) {
          scheduleHide();
        }
      }).on("click", (event) => {
        if (!event.target.classList.contains("tooltip-close-btn")) {
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
  function show(content, event) {
    clearHideTimeout();
    const container = ensureContainer();
    let html = "";
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
      " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'" onclick="event.stopPropagation();">\xD7</button>`;
    }
    if (content.title) {
      html += `<div style="font-weight: 600; margin-bottom: ${content.lines.length > 0 ? "8px" : "0"}; padding-right: ${pinned ? "20px" : "0"}">${content.title}</div>`;
    }
    if (content.lines.length > 0) {
      html += content.lines.map((line) => `<div style="margin: 4px 0; color: ${theme.tooltipTextSecondary};">${line}</div>`).join("");
    }
    container.html(html);
    if (pinned) {
      container.select(".tooltip-close-btn").on("click", () => {
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
    container.style("left", `${left}px`).style("top", `${top}px`).style("opacity", "1");
  }
  function hide(force = false) {
    clearHideTimeout();
    if (force) {
      pinned = false;
      if (tooltipDiv) {
        tooltipDiv.style("opacity", "0");
      }
    } else if (!pinned && tooltipDiv) {
      tooltipDiv.style("opacity", "0");
    }
  }
  function pin() {
    pinned = true;
    clearHideTimeout();
    if (tooltipDiv && !tooltipDiv.empty()) {
      const currentHtml = tooltipDiv.html();
      if (!currentHtml.includes("tooltip-close-btn")) {
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
        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'" onclick="event.stopPropagation();">\xD7</button>`;
        tooltipDiv.html(closeBtn + currentHtml);
        tooltipDiv.select(".tooltip-close-btn").on("click", () => {
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
    isPinned
  };
  tooltip.offsetX = function(value) {
    if (arguments.length === 0) return offsetX;
    offsetX = value;
    return tooltip;
  };
  tooltip.offsetY = function(value) {
    if (arguments.length === 0) return offsetY;
    offsetY = value;
    return tooltip;
  };
  tooltip.maxWidth = function(value) {
    if (arguments.length === 0) return maxWidth;
    maxWidth = value;
    if (tooltipDiv) {
      tooltipDiv.style("max-width", `${maxWidth}px`);
    }
    return tooltip;
  };
  tooltip.padding = function(value) {
    if (arguments.length === 0) return padding;
    padding = value;
    if (tooltipDiv) {
      tooltipDiv.style("padding", `${padding}px`);
    }
    return tooltip;
  };
  tooltip.backgroundColor = function(value) {
    if (arguments.length === 0) return backgroundColor;
    backgroundColor = value;
    if (tooltipDiv) {
      tooltipDiv.style("background-color", backgroundColor);
    }
    return tooltip;
  };
  tooltip.textColor = function(value) {
    if (arguments.length === 0) return textColor;
    textColor = value;
    if (tooltipDiv) {
      tooltipDiv.style("color", textColor);
    }
    return tooltip;
  };
  tooltip.fontSize = function(value) {
    if (arguments.length === 0) return fontSize;
    fontSize = value;
    if (tooltipDiv) {
      tooltipDiv.style("font-size", `${fontSize}px`);
    }
    return tooltip;
  };
  return tooltip;
}

// src/core/QuantileDots.ts
function QuantileDots() {
  let width = null;
  let height = 60;
  let dotRadius = 3;
  let dotOpacity = 0.85;
  let dotSpacing = 8;
  let scale = null;
  let numDots = 20;
  let ciLower = 0.1;
  let ciUpper = 0.9;
  let showViolin = true;
  let violinOpacity = 0.4;
  let backgroundType = "violin";
  let colorScheme = { ...defaultColorScheme };
  let showTooltip = true;
  let cachedSorted = null;
  let cachedQuantiles = null;
  let cachedSamplesLength = 0;
  let cachedKDE = null;
  const listeners = {};
  const tooltip = Tooltip();
  function chart(selection) {
    selection.each(function(data) {
      const container = d35.select(this);
      const { samples, threshold, effectSamples, thresholdEffect } = data;
      validateSamples(samples, "QuantileDots");
      validateCIBounds(ciLower, ciUpper, "QuantileDots");
      validateNumDots(numDots, "QuantileDots");
      if (!cachedSorted || cachedSamplesLength !== samples.length) {
        cachedSorted = sortSamples(samples);
        cachedSamplesLength = samples.length;
        cachedQuantiles = null;
      }
      if (!cachedQuantiles) {
        cachedQuantiles = computeQuantiles(cachedSorted, numDots);
      }
      const ciBounds = getCIBounds(cachedSorted, ciLower, ciUpper);
      const containerElement = this;
      const bbox = containerElement.getBoundingClientRect();
      const effectiveWidth = width ?? bbox.width ?? 400;
      const xScale = scale || d35.scaleLinear().domain(d35.extent(cachedSorted)).nice().range([20, effectiveWidth - 20]);
      let svg = container.select("svg.quantile-dots-svg");
      if (svg.empty()) {
        svg = container.append("svg").attr("class", "quantile-dots-svg").attr("width", effectiveWidth).attr("height", height);
      } else {
        svg.attr("width", effectiveWidth).attr("height", height);
      }
      if (showViolin && backgroundType !== "none") {
        if (backgroundType === "histogram") {
          const binner = d35.bin().domain(xScale.domain()).thresholds(50);
          const histogram = binner(cachedSorted);
          const maxCount = d35.max(histogram, (d) => d.length) || 1;
          const heightScale = d35.scaleLinear().domain([0, maxCount]).range([0, height * 0.75]);
          svg.selectAll(".hist-bar").data(histogram).join("rect").attr("class", "hist-bar").attr("x", (d) => xScale(d.x0)).attr("width", (d) => Math.max(0, xScale(d.x1) - xScale(d.x0))).attr("y", (d) => height - heightScale(d.length) - 10).attr("height", (d) => heightScale(d.length)).attr("fill", theme.surfaceAlt).attr("opacity", 0.5);
          svg.selectAll(".violin-bg").remove();
        } else {
          const domain = xScale.domain();
          const kde = computeKDE(cachedSorted, domain, 100);
          cachedKDE = kde;
          const maxDensity = d35.max(kde, (d) => d.density) || 1;
          const heightScale = d35.scaleLinear().domain([0, maxDensity]).range([0, height * 0.9]);
          const area2 = d35.area().x((d) => xScale(d.value)).y0(height - 5).y1((d) => height - heightScale(d.density) - 5).curve(d35.curveBasis);
          svg.selectAll(".violin-bg").remove();
          svg.selectAll(".violin-bg-ci").remove();
          svg.selectAll(".hist-bar").remove();
          if (threshold !== void 0 && threshold !== null) {
            let kdeBelow = kde.filter((d) => d.value <= threshold);
            const thresholdDensity = kde.find((d) => d.value === threshold)?.density || kde.filter((d) => d.value <= threshold).pop()?.density || 0;
            if (kdeBelow.length === 0 || kdeBelow[kdeBelow.length - 1].value !== threshold) {
              kdeBelow = [...kdeBelow, { value: threshold, density: thresholdDensity }];
            }
            const probBelow = cachedSorted.filter((s) => s <= threshold).length / cachedSorted.length;
            svg.selectAll(".violin-segment-below").data(kdeBelow.length > 0 ? [kdeBelow] : []).join("path").attr("class", "violin-segment-below").attr("d", area2).attr("fill", theme.violinBelow).attr("stroke", theme.violinBelowStroke).attr("stroke-width", 1).attr("opacity", 0.85).attr("pointer-events", "all").style("cursor", "pointer").on("mouseover", function() {
              d35.select(this).attr("opacity", 1).attr("stroke-width", 1.5);
            }).on("mouseout", function() {
              d35.select(this).attr("opacity", 0.85).attr("stroke-width", 1);
            });
            let kdeAbove = kde.filter((d) => d.value >= threshold);
            if (kdeAbove.length === 0 || kdeAbove[0].value !== threshold) {
              kdeAbove = [{ value: threshold, density: thresholdDensity }, ...kdeAbove];
            }
            const probAbove = cachedSorted.filter((s) => s > threshold).length / cachedSorted.length;
            svg.selectAll(".violin-segment-above").data(kdeAbove.length > 0 ? [kdeAbove] : []).join("path").attr("class", "violin-segment-above").attr("d", area2).attr("fill", theme.violinAbove).attr("stroke", theme.violinAboveStroke).attr("stroke-width", 1).attr("opacity", 0.85).attr("pointer-events", "all").style("cursor", "pointer").on("mouseover", function() {
              d35.select(this).attr("opacity", 1).attr("stroke-width", 1.5);
            }).on("mouseout", function() {
              d35.select(this).attr("opacity", 0.85).attr("stroke-width", 1);
            });
            const xDomain = xScale.domain();
            const belowCenter = (xDomain[0] + threshold) / 2;
            const aboveCenter = (threshold + xDomain[1]) / 2;
            if (probBelow > 0.05) {
              svg.selectAll(".segment-label-below").data([probBelow]).join("text").attr("class", "segment-label-below").attr("x", xScale(belowCenter)).attr("y", height * 0.75).attr("text-anchor", "middle").attr("font-family", fonts.body).attr("font-size", "13px").attr("font-weight", "700").attr("fill", theme.negative).style("text-shadow", `0 1px 2px ${theme.textShadow}`).text(`${(probBelow * 100).toFixed(0)}% chance worse`);
            } else {
              svg.selectAll(".segment-label-below").remove();
            }
            if (probAbove > 0.05) {
              svg.selectAll(".segment-label-above").data([probAbove]).join("text").attr("class", "segment-label-above").attr("x", xScale(aboveCenter)).attr("y", height * 0.75).attr("text-anchor", "middle").attr("font-family", fonts.body).attr("font-size", "13px").attr("font-weight", "700").attr("fill", theme.positive).style("text-shadow", `0 1px 2px ${theme.textShadow}`).text(`${(probAbove * 100).toFixed(0)}% chance better`);
            } else {
              svg.selectAll(".segment-label-above").remove();
            }
          } else {
            svg.selectAll(".violin-segment-single").data([kde]).join("path").attr("class", "violin-segment-single").attr("d", area2).attr("fill", theme.violinNeutral).attr("opacity", 0.8);
            svg.selectAll(".violin-segment-below").remove();
            svg.selectAll(".violin-segment-above").remove();
            svg.selectAll(".segment-label-below").remove();
            svg.selectAll(".segment-label-above").remove();
          }
        }
      } else {
        svg.selectAll(".violin-bg, .hist-bar, .ci-region").remove();
      }
      const dotPositions = [];
      const baseY = height - dotRadius - 10;
      const stackHeights = /* @__PURE__ */ new Map();
      const binWidth = dotRadius * 2.5;
      const ciLowerValue = getPercentile(cachedSorted, ciLower);
      const ciUpperValue = getPercentile(cachedSorted, ciUpper);
      cachedQuantiles.forEach((value) => {
        const x = xScale(value);
        const binIndex = Math.round(x / binWidth);
        let color = threshold !== void 0 ? value > threshold ? colorScheme.above : colorScheme.below : colorScheme.neutral;
        const isOutsideCI = value < ciLowerValue || value > ciUpperValue;
        const stackHeight = stackHeights.get(binIndex) || 0;
        dotPositions.push({
          value,
          x,
          y: baseY - stackHeight * dotSpacing,
          color,
          isOutsideCI
        });
        stackHeights.set(binIndex, stackHeight + 1);
      });
      const dots = svg.selectAll("circle.quantile-dot").data(dotPositions).join("circle").attr("class", "quantile-dot").attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", dotRadius).attr("fill", (d) => d.color).attr("fill-opacity", (d) => d.isOutsideCI ? 0.3 : dotOpacity).attr("stroke", theme.dotStroke).attr("stroke-width", 0.5).style("cursor", "pointer");
      dots.on("mouseover", function(event, d) {
        d35.select(this).attr("r", dotRadius * 1.5).attr("stroke-width", 2);
        if (showTooltip && cachedSorted) {
          const percentile = cachedSorted.findIndex((s) => s === d.value) / cachedSorted.length;
          const lines = [];
          if (effectSamples && effectSamples.length === samples.length) {
            const sampleIndex = cachedSorted.findIndex((s) => s === d.value);
            if (sampleIndex >= 0 && sampleIndex < effectSamples.length) {
              const sortedEffect = [...effectSamples].sort((a, b) => {
                const aLift = samples[effectSamples.indexOf(a)];
                const bLift = samples[effectSamples.indexOf(b)];
                return (aLift || 0) - (bLift || 0);
              });
              const effectValue = sortedEffect[sampleIndex];
              const dollarStr = effectValue >= 0 ? `+$${effectValue.toFixed(2)}` : `-$${Math.abs(effectValue).toFixed(2)}`;
              const pctStr = formatValue(d.value, "%");
              lines.push(`${dollarStr} (${pctStr} lift)`);
            } else {
              lines.push(formatValue(d.value, "%"));
            }
          } else {
            lines.push(formatValue(d.value, "%"));
          }
          const below = (percentile * 100).toFixed(0);
          const above = ((1 - percentile) * 100).toFixed(0);
          lines.push(`${below}% chance this outcome is below this value`);
          lines.push(`${above}% chance this outcome is above this value`);
          tooltip.show(
            {
              title: null,
              lines
            },
            event
          );
        }
        if (listeners["dotHover"]) {
          const detail = {
            value: d.value,
            x: d.x,
            y: d.y,
            color: d.color,
            ciLower: ciBounds.lower,
            ciUpper: ciBounds.upper,
            ciLevel: ciUpper - ciLower
          };
          const customEvent = new CustomEvent("dotHover", { detail });
          listeners["dotHover"](customEvent);
        }
      }).on("mouseout", function() {
        d35.select(this).attr("r", dotRadius).attr("stroke-width", 0.5);
        if (showTooltip) {
          tooltip.scheduleHide();
        }
      }).on("click", function(event, d) {
        if (listeners["dotClick"]) {
          const detail = {
            value: d.value,
            x: d.x,
            y: d.y
          };
          const customEvent = new CustomEvent("dotClick", { detail });
          listeners["dotClick"](customEvent);
        }
      });
    });
  }
  chart.width = function(value) {
    if (arguments.length === 0) return width;
    width = value ?? null;
    return chart;
  };
  chart.height = function(value) {
    if (arguments.length === 0) return height;
    height = value;
    return chart;
  };
  chart.dotRadius = function(value) {
    if (arguments.length === 0) return dotRadius;
    dotRadius = value;
    return chart;
  };
  chart.dotSpacing = function(value) {
    if (arguments.length === 0) return dotSpacing;
    dotSpacing = value;
    return chart;
  };
  chart.dotOpacity = function(value) {
    if (arguments.length === 0) return dotOpacity;
    dotOpacity = value;
    return chart;
  };
  chart.scale = function(value) {
    if (arguments.length === 0) return scale;
    scale = value ?? null;
    return chart;
  };
  chart.numDots = function(value) {
    if (arguments.length === 0) return numDots;
    numDots = value;
    cachedQuantiles = null;
    return chart;
  };
  chart.ciLower = function(value) {
    if (arguments.length === 0) return ciLower;
    ciLower = value;
    return chart;
  };
  chart.ciUpper = function(value) {
    if (arguments.length === 0) return ciUpper;
    ciUpper = value;
    return chart;
  };
  chart.showViolin = function(value) {
    if (arguments.length === 0) return showViolin;
    showViolin = value;
    return chart;
  };
  chart.violinOpacity = function(value) {
    if (arguments.length === 0) return violinOpacity;
    violinOpacity = value;
    return chart;
  };
  chart.backgroundType = function(value) {
    if (arguments.length === 0) return backgroundType;
    backgroundType = value;
    return chart;
  };
  chart.colorScheme = function(value) {
    if (arguments.length === 0) return colorScheme;
    colorScheme = value;
    return chart;
  };
  chart.showTooltip = function(value) {
    if (arguments.length === 0) return showTooltip;
    showTooltip = value;
    return chart;
  };
  chart.getKDE = function() {
    return cachedKDE;
  };
  chart.on = function(event, handler) {
    if (handler === null) {
      delete listeners[event];
    } else {
      listeners[event] = handler;
    }
    return chart;
  };
  return chart;
}

// src/core/RidgeDotplot.ts
import * as d38 from "d3";

// src/core/ThresholdLine.ts
import * as d36 from "d3";
function ThresholdLine() {
  let scale = null;
  let yRange = [0, 100];
  let value = 0;
  let lineColor = theme.textMuted;
  let lineWidth = 1.5;
  let handleRadius = 4;
  let showLabel = true;
  let labelColor = theme.textSecondary;
  let showTooltip = true;
  let samples = [];
  let controlSamples = void 0;
  const listeners = {};
  const tooltip = Tooltip();
  function chart(selection) {
    selection.each(function() {
      const container = d36.select(this);
      if (!scale) {
        throw new Error("ThresholdLine: scale is required");
      }
      const xPos = scale(value);
      const [yMin, yMax] = yRange;
      let group = container.select("g.threshold-line-group");
      if (group.empty()) {
        group = container.append("g").attr("class", "threshold-line-group");
      }
      const line = group.selectAll("line.threshold-line").data([value]).join("line").attr("class", "threshold-line").attr("x1", xPos).attr("x2", xPos).attr("y1", yMin).attr("y2", yMax).attr("stroke", lineColor).attr("stroke-width", lineWidth).attr("opacity", 0.7).style("cursor", "ew-resize");
      const capTop = group.selectAll("line.threshold-cap-top").data([value]).join("line").attr("class", "threshold-cap-top").attr("x1", xPos - 4).attr("x2", xPos + 4).attr("y1", yMin).attr("y2", yMin).attr("stroke", lineColor).attr("stroke-width", 2).attr("stroke-linecap", "round").style("cursor", "ew-resize");
      const capBottom = group.selectAll("line.threshold-cap-bottom").data([value]).join("line").attr("class", "threshold-cap-bottom").attr("x1", xPos - 4).attr("x2", xPos + 4).attr("y1", yMax).attr("y2", yMax).attr("stroke", lineColor).attr("stroke-width", 2).attr("stroke-linecap", "round").style("cursor", "ew-resize");
      group.selectAll("text.threshold-label-top").remove();
      group.selectAll("text.threshold-label-bottom").remove();
      const drag3 = d36.drag().on("start", function() {
        line.attr("stroke-width", lineWidth * 1.5).attr("opacity", 0.9);
        capTop.attr("stroke-width", 3);
        capBottom.attr("stroke-width", 3);
      }).on("drag", function(event) {
        const newValue = scale.invert(event.x);
        const domain = scale.domain();
        const constrainedValue = Math.max(domain[0], Math.min(domain[1], newValue));
        value = constrainedValue;
        const newX = scale(value);
        capTop.attr("x1", newX - 4).attr("x2", newX + 4);
        capBottom.attr("x1", newX - 4).attr("x2", newX + 4);
        line.attr("x1", newX).attr("x2", newX);
        if (listeners["thresholdDrag"]) {
          const detail = { value };
          const customEvent = new CustomEvent("thresholdDrag", { detail });
          listeners["thresholdDrag"](customEvent);
        }
      }).on("end", function() {
        line.attr("stroke-width", lineWidth).attr("opacity", 0.7);
        capTop.attr("stroke-width", 2);
        capBottom.attr("stroke-width", 2);
        if (listeners["thresholdDragEnd"]) {
          const detail = { value };
          const customEvent = new CustomEvent("thresholdDragEnd", { detail });
          listeners["thresholdDragEnd"](customEvent);
        }
      });
      line.call(drag3);
      capTop.call(drag3);
      capBottom.call(drag3);
    });
  }
  chart.scale = function(val) {
    if (arguments.length === 0) return scale;
    scale = val ?? null;
    return chart;
  };
  chart.yRange = function(val) {
    if (arguments.length === 0) return yRange;
    yRange = val;
    return chart;
  };
  chart.value = function(val) {
    if (arguments.length === 0) return value;
    value = val;
    return chart;
  };
  chart.lineColor = function(val) {
    if (arguments.length === 0) return lineColor;
    lineColor = val;
    return chart;
  };
  chart.lineWidth = function(val) {
    if (arguments.length === 0) return lineWidth;
    lineWidth = val;
    return chart;
  };
  chart.handleRadius = function(val) {
    if (arguments.length === 0) return handleRadius;
    handleRadius = val;
    return chart;
  };
  chart.showLabel = function(val) {
    if (arguments.length === 0) return showLabel;
    showLabel = val;
    return chart;
  };
  chart.labelColor = function(val) {
    if (arguments.length === 0) return labelColor;
    labelColor = val;
    return chart;
  };
  chart.samples = function(val) {
    if (arguments.length === 0) return samples;
    samples = val;
    return chart;
  };
  chart.controlSamples = function(val) {
    if (arguments.length === 0) return controlSamples;
    controlSamples = val;
    return chart;
  };
  chart.showTooltip = function(val) {
    if (arguments.length === 0) return showTooltip;
    showTooltip = val;
    return chart;
  };
  chart.on = function(event, handler) {
    if (handler === null) {
      delete listeners[event];
    } else {
      listeners[event] = handler;
    }
    return chart;
  };
  return chart;
}

// src/core/DraggableCIBounds.ts
import * as d37 from "d3";
function DraggableCIBounds() {
  let scale = null;
  let samples = [];
  let lowerPercentile = 0.1;
  let upperPercentile = 0.9;
  let yRange = [0, 100];
  let handleRadius = 5;
  let handleColor = theme.textMuted;
  let lineColor = theme.textMuted;
  let lineWidth = 1.5;
  let percentileStep = 0.01;
  let showTooltip = true;
  let cachedSorted = null;
  const listeners = {};
  const tooltip = Tooltip();
  function chart(selection) {
    selection.each(function() {
      const container = d37.select(this);
      if (!scale) {
        throw new Error("DraggableCIBounds: scale is required");
      }
      if (!samples || samples.length === 0) {
        throw new Error("DraggableCIBounds: samples array is required");
      }
      if (!cachedSorted || cachedSorted.length !== samples.length) {
        cachedSorted = sortSamples(samples);
      }
      const [yMin, yMax] = yRange;
      const lowerValue = getPercentile(cachedSorted, lowerPercentile);
      const upperValue = getPercentile(cachedSorted, upperPercentile);
      let group = container.select("g.ci-bounds-group");
      if (group.empty()) {
        group = container.append("g").attr("class", "ci-bounds-group");
      }
      let defs = container.select("defs");
      if (defs.empty()) {
        defs = container.append("defs");
      }
      let pattern = defs.select("#ci-pattern");
      if (pattern.empty()) {
        pattern = defs.append("pattern").attr("id", "ci-pattern").attr("patternUnits", "userSpaceOnUse").attr("width", 8).attr("height", 8);
        pattern.append("path").attr("d", "M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4").attr("stroke", theme.textMuted).attr("stroke-width", 1).attr("opacity", 0.5);
      }
      group.selectAll("rect.ci-background").data([{ lower: lowerValue, upper: upperValue }]).join("rect").attr("class", "ci-background").attr("x", scale(lowerValue)).attr("y", yMin).attr("width", scale(upperValue) - scale(lowerValue)).attr("height", yMax - yMin).attr("fill", "url(#ci-pattern)").attr("opacity", 0.3).attr("pointer-events", "none");
      const lowerLine = group.selectAll("line.ci-bound-lower").data([lowerValue]).join("line").attr("class", "ci-bound-lower").attr("x1", scale(lowerValue)).attr("x2", scale(lowerValue)).attr("y1", yMin).attr("y2", yMax).attr("stroke", lineColor).attr("stroke-width", lineWidth).attr("stroke-dasharray", "3,3").attr("opacity", 0.6).style("cursor", "ew-resize");
      const upperLine = group.selectAll("line.ci-bound-upper").data([upperValue]).join("line").attr("class", "ci-bound-upper").attr("x1", scale(upperValue)).attr("x2", scale(upperValue)).attr("y1", yMin).attr("y2", yMax).attr("stroke", lineColor).attr("stroke-width", lineWidth).attr("stroke-dasharray", "3,3").attr("opacity", 0.6).style("cursor", "ew-resize");
      group.selectAll("circle.ci-handle-lower").remove();
      group.selectAll("circle.ci-handle-upper").remove();
      group.selectAll("text.ci-label-lower").remove();
      group.selectAll("text.ci-label-upper").remove();
      const dragLower = d37.drag().on("start", function(event) {
        lowerLine.attr("stroke-width", lineWidth * 1.5).attr("opacity", 0.9);
        tooltip.hide(true);
        if (showTooltip) {
          const ciCoverage = upperPercentile - lowerPercentile;
          const lv = getPercentile(cachedSorted, lowerPercentile);
          const uv = getPercentile(cachedSorted, upperPercentile);
          tooltip.show(
            {
              title: null,
              lines: [
                `${(ciCoverage * 100).toFixed(0)}% credible interval`,
                formatCredibleInterval(lv, uv, ciCoverage)
              ]
            },
            event.sourceEvent
          );
        }
      }).on("drag", function(event) {
        const value = scale.invert(event.x);
        let closestP = 0;
        let minDiff = Infinity;
        for (let p = 0; p <= 1; p += percentileStep) {
          const pValue = getPercentile(cachedSorted, p);
          const diff = Math.abs(pValue - value);
          if (diff < minDiff) {
            minDiff = diff;
            closestP = p;
          }
        }
        closestP = Math.max(0, Math.min(closestP, upperPercentile - percentileStep));
        lowerPercentile = closestP;
        const newValue = getPercentile(cachedSorted, lowerPercentile);
        const uv = getPercentile(cachedSorted, upperPercentile);
        const newX = scale(newValue);
        const upperX = scale(uv);
        lowerLine.attr("x1", newX).attr("x2", newX);
        group.select("rect.ci-background").attr("x", newX).attr("width", upperX - newX);
        if (showTooltip) {
          const ciCoverage = upperPercentile - lowerPercentile;
          tooltip.show(
            {
              title: null,
              lines: [
                `${(ciCoverage * 100).toFixed(0)}% credible interval`,
                formatCredibleInterval(newValue, uv, ciCoverage)
              ]
            },
            event.sourceEvent
          );
        }
        emitDragEvent();
      }).on("end", function() {
        lowerLine.attr("stroke-width", lineWidth).attr("opacity", 0.6);
        if (showTooltip) {
          tooltip.hide();
        }
      });
      const dragUpper = d37.drag().on("start", function(event) {
        upperLine.attr("stroke-width", lineWidth * 1.5).attr("opacity", 0.9);
        tooltip.hide(true);
        if (showTooltip) {
          const ciCoverage = upperPercentile - lowerPercentile;
          const lv = getPercentile(cachedSorted, lowerPercentile);
          const uv = getPercentile(cachedSorted, upperPercentile);
          tooltip.show(
            {
              title: null,
              lines: [
                `${(ciCoverage * 100).toFixed(0)}% credible interval`,
                formatCredibleInterval(lv, uv, ciCoverage)
              ]
            },
            event.sourceEvent
          );
        }
      }).on("drag", function(event) {
        const value = scale.invert(event.x);
        let closestP = 1;
        let minDiff = Infinity;
        for (let p = 0; p <= 1; p += percentileStep) {
          const pValue = getPercentile(cachedSorted, p);
          const diff = Math.abs(pValue - value);
          if (diff < minDiff) {
            minDiff = diff;
            closestP = p;
          }
        }
        closestP = Math.max(lowerPercentile + percentileStep, Math.min(1, closestP));
        upperPercentile = closestP;
        const newValue = getPercentile(cachedSorted, upperPercentile);
        const lv = getPercentile(cachedSorted, lowerPercentile);
        const newX = scale(newValue);
        const lowerX = scale(lv);
        upperLine.attr("x1", newX).attr("x2", newX);
        group.select("rect.ci-background").attr("width", newX - lowerX);
        if (showTooltip) {
          const ciCoverage = upperPercentile - lowerPercentile;
          tooltip.show(
            {
              title: null,
              lines: [
                `${(ciCoverage * 100).toFixed(0)}% credible interval`,
                formatCredibleInterval(lv, newValue, ciCoverage)
              ]
            },
            event.sourceEvent
          );
        }
        emitDragEvent();
      }).on("end", function() {
        upperLine.attr("stroke-width", lineWidth).attr("opacity", 0.6);
        if (showTooltip) {
          tooltip.hide();
        }
      });
      lowerLine.call(dragLower);
      upperLine.call(dragUpper);
      lowerLine.on("mouseover", function(event) {
        if (showTooltip) {
          const ciCoverage = upperPercentile - lowerPercentile;
          const lv = getPercentile(cachedSorted, lowerPercentile);
          const uv = getPercentile(cachedSorted, upperPercentile);
          tooltip.show(
            {
              title: "Credible Interval (drag to adjust)",
              lines: [
                `${(ciCoverage * 100).toFixed(0)}% probability the lift is between ${formatValue(lv).replace(".0%", "%")} and ${formatValue(uv).replace(".0%", "%")}`,
                "",
                "Tails:",
                `\u2022 ${(lowerPercentile * 100).toFixed(0)}% chance below ${formatValue(lv).replace(".0%", "%")}`,
                `\u2022 ${((1 - upperPercentile) * 100).toFixed(0)}% chance above ${formatValue(uv).replace(".0%", "%")}`
              ]
            },
            event
          );
        }
        lowerLine.attr("stroke-width", lineWidth * 1.3).attr("opacity", 0.8);
      }).on("mouseout", function() {
        if (!d37.select(this).classed("dragging")) {
          if (showTooltip) tooltip.hide();
          lowerLine.attr("stroke-width", lineWidth).attr("opacity", 0.6);
        }
      });
      upperLine.on("mouseover", function(event) {
        if (showTooltip) {
          const ciCoverage = upperPercentile - lowerPercentile;
          const lv = getPercentile(cachedSorted, lowerPercentile);
          const uv = getPercentile(cachedSorted, upperPercentile);
          tooltip.show(
            {
              title: "Credible Interval (drag to adjust)",
              lines: [
                `${(ciCoverage * 100).toFixed(0)}% probability the lift is between ${formatValue(lv).replace(".0%", "%")} and ${formatValue(uv).replace(".0%", "%")}`,
                "",
                "Tails:",
                `\u2022 ${(lowerPercentile * 100).toFixed(0)}% chance below ${formatValue(lv).replace(".0%", "%")}`,
                `\u2022 ${((1 - upperPercentile) * 100).toFixed(0)}% chance above ${formatValue(uv).replace(".0%", "%")}`
              ]
            },
            event
          );
        }
        upperLine.attr("stroke-width", lineWidth * 1.3).attr("opacity", 0.8);
      }).on("mouseout", function() {
        if (!d37.select(this).classed("dragging")) {
          if (showTooltip) tooltip.hide();
          upperLine.attr("stroke-width", lineWidth).attr("opacity", 0.6);
        }
      });
      function emitDragEvent() {
        if (listeners["ciDrag"]) {
          const detail = {
            lower: lowerPercentile,
            upper: upperPercentile
          };
          const customEvent = new CustomEvent("ciDrag", { detail });
          listeners["ciDrag"](customEvent);
        }
      }
    });
  }
  chart.scale = function(value) {
    if (arguments.length === 0) return scale;
    scale = value ?? null;
    return chart;
  };
  chart.samples = function(value) {
    if (arguments.length === 0) return samples;
    samples = value;
    cachedSorted = null;
    return chart;
  };
  chart.lowerPercentile = function(value) {
    if (arguments.length === 0) return lowerPercentile;
    lowerPercentile = value;
    return chart;
  };
  chart.upperPercentile = function(value) {
    if (arguments.length === 0) return upperPercentile;
    upperPercentile = value;
    return chart;
  };
  chart.yRange = function(value) {
    if (arguments.length === 0) return yRange;
    yRange = value;
    return chart;
  };
  chart.handleRadius = function(value) {
    if (arguments.length === 0) return handleRadius;
    handleRadius = value;
    return chart;
  };
  chart.handleColor = function(value) {
    if (arguments.length === 0) return handleColor;
    handleColor = value;
    return chart;
  };
  chart.lineColor = function(value) {
    if (arguments.length === 0) return lineColor;
    lineColor = value;
    return chart;
  };
  chart.lineWidth = function(value) {
    if (arguments.length === 0) return lineWidth;
    lineWidth = value;
    return chart;
  };
  chart.percentileStep = function(value) {
    if (arguments.length === 0) return percentileStep;
    percentileStep = value;
    return chart;
  };
  chart.showTooltip = function(value) {
    if (arguments.length === 0) return showTooltip;
    showTooltip = value;
    return chart;
  };
  chart.on = function(event, handler) {
    if (handler === null) {
      delete listeners[event];
    } else {
      listeners[event] = handler;
    }
    return chart;
  };
  return chart;
}

// src/core/RidgeDotplot.ts
function RidgeDotplot() {
  let width = null;
  let height = null;
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
  let scale = null;
  let valueFormat = null;
  const listeners = {};
  function chart(selection) {
    selection.each(function(data) {
      const container = d38.select(this);
      const { variants, threshold } = data;
      if (!variants || variants.length === 0) {
        console.warn("RidgeDotplot: No variants provided");
        return;
      }
      const containerElement = this;
      const bbox = containerElement.getBoundingClientRect();
      const effectiveWidth = width ?? bbox.width ?? 800;
      const computedRidgeHeight = ridgeHeight;
      const extraStatSpace = showStatistics ? 35 : 0;
      const totalRidgeArea = variants.length * (computedRidgeHeight + ridgeSpacing + extraStatSpace);
      const effectiveHeight = height ?? totalRidgeArea + margin.top + margin.bottom;
      const allSamples = variants.flatMap((v) => v.samples);
      const mean4 = d38.mean(allSamples) || 0;
      const stdDev = d38.deviation(allSamples) || 0;
      const filteredSamples = allSamples.filter((s) => Math.abs(s - mean4) <= 3 * stdDev);
      const extent3 = d38.extent(filteredSamples.length > 0 ? filteredSamples : allSamples);
      const range = extent3[1] - extent3[0];
      const padding = range * 0.1;
      const xScale = scale || d38.scaleLinear().domain([extent3[0] - padding, extent3[1] + padding]).range([margin.left, effectiveWidth - margin.right]);
      const yScale = d38.scaleBand().domain(variants.map((v) => v.name)).range([margin.top, effectiveHeight - margin.bottom]).paddingInner(ridgeSpacing / computedRidgeHeight).paddingOuter(0.1);
      let svg = container.select("svg.ridge-dotplot-svg");
      if (svg.empty()) {
        svg = container.append("svg").attr("class", "ridge-dotplot-svg").attr("width", effectiveWidth).attr("height", effectiveHeight).style("background-color", theme.background);
      } else {
        svg.attr("width", effectiveWidth).attr("height", effectiveHeight);
      }
      const gridGroup = svg.selectAll(".grid-background").data([null]).join("g").attr("class", "grid-background");
      const xTicks = xScale.ticks(10);
      gridGroup.selectAll(".grid-line-vertical").data(xTicks).join("line").attr("class", "grid-line-vertical").attr("x1", (d) => xScale(d)).attr("x2", (d) => xScale(d)).attr("y1", margin.top).attr("y2", effectiveHeight - margin.bottom).attr("stroke", theme.grid).attr("stroke-width", 1).attr("opacity", theme.gridAlpha);
      const yTicks = yScale.domain();
      gridGroup.selectAll(".grid-line-horizontal").data(yTicks).join("line").attr("class", "grid-line-horizontal").attr("x1", margin.left).attr("x2", effectiveWidth - margin.right).attr("y1", (d) => (yScale(d) || 0) + computedRidgeHeight / 2).attr("y2", (d) => (yScale(d) || 0) + computedRidgeHeight / 2).attr("stroke", theme.border).attr("stroke-width", 1).attr("opacity", 0.3);
      if (showReferenceLineAtZero && xScale.domain()[0] <= 0 && xScale.domain()[1] >= 0) {
        svg.selectAll(".reference-line").data([0]).join("line").attr("class", "reference-line").attr("x1", xScale(0)).attr("x2", xScale(0)).attr("y1", margin.top).attr("y2", effectiveHeight - margin.bottom).attr("stroke", theme.reference).attr("stroke-width", 1.5).attr("stroke-dasharray", "4,2").attr("opacity", 0.6);
      } else {
        svg.selectAll(".reference-line").remove();
      }
      let thresholdEffect;
      const firstVariantWithControl = variants.find(
        (v) => v.controlSamples && v.controlSamples.length > 0
      );
      if (threshold !== void 0 && threshold !== null && firstVariantWithControl?.controlSamples) {
        thresholdEffect = convertPercentToEffect(threshold, firstVariantWithControl.controlSamples);
      }
      const ridges = svg.selectAll(".ridge").data(variants, (d) => d.name).join("g").attr("class", "ridge").attr("transform", (d) => `translate(0, ${yScale(d.name)})`);
      ridges.each(function(variantData, idx) {
        const ridge = d38.select(this);
        const dotsContainer = ridge.selectAll(".dots-container").data([variantData]).join("g").attr("class", "dots-container");
        const dots = QuantileDots().width(effectiveWidth - margin.left - margin.right).scale(xScale).height(computedRidgeHeight).dotRadius(dotRadius).numDots(numDots).ciLower(ciLower).ciUpper(ciUpper).showViolin(showViolin).showTooltip(showTooltip);
        dotsContainer.datum({
          samples: variantData.samples,
          threshold,
          effectSamples: variantData.effectSamples,
          thresholdEffect
        }).call(dots);
        const kdeData = dots.getKDE();
        dots.on("dotHover", (event) => {
          if (listeners["dotHover"]) {
            const detail = {
              ...event.detail,
              variant: variantData.displayName,
              variantIndex: idx
            };
            const customEvent = new CustomEvent("dotHover", { detail });
            listeners["dotHover"](customEvent);
          }
        });
        dots.on("dotClick", (event) => {
          if (listeners["dotClick"]) {
            const detail = {
              ...event.detail,
              variant: variantData.displayName,
              variantIndex: idx
            };
            const customEvent = new CustomEvent("dotClick", { detail });
            listeners["dotClick"](customEvent);
          }
        });
        if (showCIBounds) {
          const ciBoundsContainer = ridge.selectAll(".ci-bounds-container").data([variantData]).join("g").attr("class", "ci-bounds-container");
          const ciBounds = DraggableCIBounds().scale(xScale).samples(variantData.samples).lowerPercentile(ciLower).upperPercentile(ciUpper).yRange([0, computedRidgeHeight]).showTooltip(false);
          ciBoundsContainer.call(ciBounds);
          ciBounds.on("ciDrag", (event) => {
            if (listeners["ciDrag"]) {
              listeners["ciDrag"](event);
            }
          });
        }
        if (showStatistics) {
          const sorted = [...variantData.samples].sort((a, b) => a - b);
          const ciLowerValue = getPercentile(sorted, ciLower);
          const ciUpperValue = getPercentile(sorted, ciUpper);
          if (!variantData.effectSamples || variantData.effectSamples.length === 0) {
            throw new Error(
              `Missing effectSamples for variant "${variantData.name}". All variants must provide both samples (% lift) and effectSamples ($ lift).`
            );
          }
          if (!variantData.controlSamples || variantData.controlSamples.length === 0) {
            throw new Error(
              `Missing controlSamples for variant "${variantData.name}". controlSamples needed to compute unbiased percent lift estimate.`
            );
          }
          const effectMean = d38.mean(variantData.effectSamples);
          const controlMean = d38.mean(variantData.controlSamples);
          const variantMean = controlMean !== 0 ? effectMean / controlMean : 0;
          variantData._mean = variantMean;
          const dollarLift = effectMean >= 0 ? `+$${effectMean.toFixed(2)}` : `-$${Math.abs(effectMean).toFixed(2)}`;
          const pctValue = Math.abs(variantMean * 100).toFixed(0);
          const triangle = variantMean >= 0 ? "\u25B2" : "\u25BC";
          const meanColor = variantMean >= 0 ? theme.positive : theme.negative;
          if (kdeData && kdeData.length > 0) {
            const maxDensity = d38.max(kdeData, (d) => d.density) || 1;
            const heightScale = d38.scaleLinear().domain([0, maxDensity]).range([0, computedRidgeHeight * 0.9]);
            const getDensityAt = (targetValue) => {
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
            const pathData = [];
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
            pathData.push("Z");
            ridge.selectAll(".ci-density-region").data([pathData.join(" ")]).join("path").attr("class", "ci-density-region").attr("d", (d) => d).attr("fill", theme.ciRegionFill).attr("fill-opacity", theme.ciRegionFillOpacity).attr("stroke", theme.ciRegionStroke).attr("stroke-width", 0.5).attr("stroke-opacity", theme.ciRegionStrokeOpacity).attr("pointer-events", "none");
            ridge.selectAll(".mean-reference").data([variantMean]).join("line").attr("class", "mean-reference").attr("x1", xScale(variantMean)).attr("x2", xScale(variantMean)).attr("y1", 0).attr("y2", computedRidgeHeight).attr("stroke", theme.neutral).attr("stroke-width", 2).attr("stroke-dasharray", "4,2").attr("opacity", 0.5).attr("pointer-events", "none");
          } else {
            ridge.selectAll(".ci-density-region").remove();
            ridge.selectAll(".mean-reference").remove();
          }
          const labelX = xScale(variantMean) + 6;
          const labelY = -8;
          const labelGroup = ridge.selectAll(".mean-label-group").data([variantMean]).join("g").attr("class", "mean-label-group").attr("transform", `translate(${labelX}, ${labelY})`);
          labelGroup.selectAll("text").remove();
          labelGroup.append("text").attr("x", 0).attr("y", 0).attr("font-family", fonts.body).attr("font-size", "10px").attr("font-weight", "500").attr("fill", theme.textMuted).attr("text-anchor", "start").text("expected value");
          const line2 = labelGroup.append("text").attr("x", 0).attr("y", 15).attr("font-family", fonts.body).attr("text-anchor", "start");
          line2.append("tspan").attr("font-size", "13px").attr("font-weight", "700").attr("fill", meanColor).text(dollarLift);
          line2.append("tspan").attr("font-size", "13px").attr("font-weight", "700").attr("fill", theme.neutral).text("/user");
          const directionWord = effectMean >= 0 ? "increase" : "decrease";
          labelGroup.append("text").attr("x", 0).attr("y", 30).attr("font-family", fonts.body).attr("font-size", "13px").attr("font-weight", "700").attr("fill", meanColor).attr("text-anchor", "start").text(`${triangle}${pctValue}% ${directionWord}`);
          ridge.selectAll(".median-label-top").remove();
          ridge.selectAll(".median-label-bottom").remove();
          ridge.selectAll(".median-label-top-suffix").remove();
          ridge.selectAll(".median-label").remove();
          const formatter = valueFormat || formatValue;
          const effectLower = variantData.controlSamples ? convertPercentToEffect(ciLowerValue, variantData.controlSamples) : 0;
          const effectUpper = variantData.controlSamples ? convertPercentToEffect(ciUpperValue, variantData.controlSamples) : 0;
          ridge.selectAll(".ci-lower-label-top").data([effectLower]).join("text").attr("class", "ci-lower-label-top").attr("x", xScale(ciLowerValue)).attr("y", -10).attr("text-anchor", "middle").attr("font-family", fonts.body).attr("font-size", "10px").attr("font-weight", "500").attr("fill", theme.textMuted).text((d) => d >= 0 ? `$${d.toFixed(2)}` : `-$${Math.abs(d).toFixed(2)}`);
          ridge.selectAll(".ci-lower-label").data([ciLowerValue]).join("text").attr("class", "ci-lower-label").attr("x", xScale(ciLowerValue)).attr("y", computedRidgeHeight + 15).attr("text-anchor", "middle").attr("font-family", fonts.body).attr("font-size", "10px").attr("font-weight", "500").attr("fill", theme.textMuted).text((d) => formatter(d));
          ridge.selectAll(".ci-upper-label-top").data([effectUpper]).join("text").attr("class", "ci-upper-label-top").attr("x", xScale(ciUpperValue)).attr("y", -10).attr("text-anchor", "middle").attr("font-family", fonts.body).attr("font-size", "10px").attr("font-weight", "500").attr("fill", theme.textMuted).text((d) => d >= 0 ? `$${d.toFixed(2)}` : `-$${Math.abs(d).toFixed(2)}`);
          ridge.selectAll(".ci-upper-label").data([ciUpperValue]).join("text").attr("class", "ci-upper-label").attr("x", xScale(ciUpperValue)).attr("y", computedRidgeHeight + 15).attr("text-anchor", "middle").attr("font-family", fonts.body).attr("font-size", "10px").attr("font-weight", "500").attr("fill", theme.textMuted).text((d) => formatter(d));
          ridge.selectAll(".threshold-shaded-region").remove();
          ridge.selectAll(".threshold-probability-label").remove();
        }
      });
      ridges.selectAll(".variant-label").data((d) => [d]).join("text").attr("class", "variant-label").attr("x", 10).attr("y", -5).attr("text-anchor", "start").attr("dominant-baseline", "hanging").text((d) => d.displayName).style("font-family", fonts.body).style("font-size", "15px").style("font-weight", (d) => d.isBaseline ? "700" : "600").style("fill", (d) => d.isBaseline ? theme.text : theme.textSecondary).style("cursor", "pointer").on("click", function(_event, d) {
        const idx = variants.findIndex((v) => v.name === d.name);
        if (listeners["variantClick"]) {
          const detail = {
            variant: d,
            index: idx
          };
          const customEvent = new CustomEvent("variantClick", { detail });
          listeners["variantClick"](customEvent);
        }
      });
      ridges.selectAll(".variant-sample-size").data((d) => [d]).join("text").attr("class", "variant-sample-size").attr("x", 10).attr("y", 13).attr("text-anchor", "start").attr("dominant-baseline", "hanging").text((d) => {
        if (d.userCount && d.converterCount) {
          return `${d.userCount.toLocaleString()} users \xB7 ${d.converterCount.toLocaleString()} converters`;
        } else if (d.userCount) {
          return `${d.userCount.toLocaleString()} users`;
        }
        return "";
      }).style("font-family", fonts.body).style("font-size", "12px").style("font-weight", "400").style("fill", theme.textSecondary).style("cursor", "pointer").on("click", function(_event, d) {
        const idx = variants.findIndex((v) => v.name === d.name);
        if (listeners["variantClick"]) {
          const detail = {
            variant: d,
            index: idx
          };
          const customEvent = new CustomEvent("variantClick", { detail });
          listeners["variantClick"](customEvent);
        }
      });
      if (threshold !== void 0 && threshold !== null) {
        const thresholdGroup = svg.selectAll(".threshold-container").data([threshold]).join("g").attr("class", "threshold-container");
        const firstVariant = variants[0];
        const thresholdLine = ThresholdLine().scale(xScale).yRange([margin.top, effectiveHeight - margin.bottom]).value(threshold).samples(firstVariant.samples).controlSamples(firstVariant.controlSamples);
        thresholdGroup.call(thresholdLine);
        thresholdLine.on("thresholdDrag", (event) => {
          if (listeners["thresholdDrag"]) {
            listeners["thresholdDrag"](event);
          }
        });
        svg.selectAll(".threshold-labels").remove();
      } else {
        svg.selectAll(".threshold-container").remove();
        svg.selectAll(".threshold-labels").remove();
      }
      const xAxis = d38.axisBottom(xScale).ticks(10).tickFormat(
        (d) => valueFormat ? valueFormat(Number(d)) : `${(Number(d) * 100).toFixed(0)}%`
      );
      const xAxisGroup = svg.selectAll(".x-axis").data([null]).join("g").attr("class", "x-axis axis").attr("transform", `translate(0, ${effectiveHeight - margin.bottom})`);
      xAxisGroup.call(xAxis);
      xAxisGroup.select(".domain").attr("stroke-width", 2).attr("stroke", theme.axisDomain);
      xAxisGroup.selectAll(".tick line").attr("stroke-width", 2).attr("stroke", theme.axisTick);
      xAxisGroup.selectAll(".tick text").style("font-family", fonts.body).style("font-size", "12px").style("font-weight", "400").style("fill", theme.textSecondary);
      if (threshold !== void 0) {
        const thresholdX = xScale(threshold);
        const labelOffset = 10;
        const labelY = 40;
        xAxisGroup.selectAll(".threshold-tick-line").data([threshold]).join("line").attr("class", "threshold-tick-line").attr("x1", thresholdX).attr("x2", thresholdX).attr("y1", 0).attr("y2", 12).attr("stroke", theme.axisDomain);
        xAxisGroup.selectAll(".threshold-connector").data([threshold]).join("path").attr("class", "threshold-connector").attr(
          "d",
          `M ${thresholdX} 12 L ${thresholdX} ${labelY - 10} L ${thresholdX + labelOffset} ${labelY - 2}`
        ).attr("stroke", theme.textMuted).attr("stroke-width", 1.5).attr("fill", "none");
        xAxisGroup.selectAll(".threshold-tick-label").remove();
        xAxisGroup.selectAll(".editable-label-input-container").remove();
        const thresholdLabel = xAxisGroup.append("text").attr("class", "threshold-tick-label").attr("x", thresholdX + labelOffset).attr("y", labelY).attr("text-anchor", "start");
        makeEditable(thresholdLabel, {
          initialValue: threshold,
          displayFormat: (value) => {
            const rounded = Math.abs(value) < 5e-4 ? 0 : value;
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
            chart(selection);
          },
          fontSize: "12px",
          fontWeight: "600",
          fill: theme.text,
          cursor: "pointer"
        });
        const tickThreshold = 0.03;
        xAxisGroup.selectAll(".tick text").each(function() {
          const tickText = d38.select(this);
          const tickValue = parseFloat(tickText.text().replace("%", "")) / 100;
          if (!isNaN(tickValue) && Math.abs(tickValue - threshold) < tickThreshold) {
            tickText.style("opacity", "0");
          } else {
            tickText.style("opacity", "1");
          }
        });
      } else {
        xAxisGroup.selectAll(".threshold-tick-line").remove();
        xAxisGroup.selectAll(".threshold-tick-label").remove();
        xAxisGroup.selectAll(".threshold-connector").remove();
        xAxisGroup.selectAll(".tick text").style("opacity", "1");
      }
      if (variants.some((v) => v.controlSamples && v.controlSamples.length > 0)) {
        const variantWithControl = variants.find(
          (v) => v.controlSamples && v.controlSamples.length > 0
        );
        if (variantWithControl && variantWithControl.controlSamples) {
          const topAxis = d38.axisTop(xScale).tickValues(xScale.ticks(10)).tickSize(6).tickFormat((d) => {
            const percentValue = Number(d);
            const dollarValue = convertPercentToEffect(
              percentValue,
              variantWithControl.controlSamples
            );
            const finalValue = Math.abs(dollarValue) < 5e-3 ? 0 : dollarValue;
            if (Math.abs(finalValue) >= 1e3) {
              return d38.format("$,.0f")(finalValue);
            } else if (Math.abs(finalValue) >= 1) {
              return d38.format("$,.2f")(finalValue);
            } else {
              return d38.format("$.2f")(finalValue);
            }
          });
          const topAxisGroup = svg.selectAll(".x-axis-top").data([null]).join("g").attr("class", "x-axis-top axis").attr("transform", `translate(0, ${margin.top - 10})`);
          topAxisGroup.call(topAxis);
          topAxisGroup.select(".domain").attr("stroke-width", 2).attr("stroke", theme.axisDomain);
          topAxisGroup.selectAll(".tick line").attr("stroke-width", 2).attr("stroke", theme.axisTick);
          topAxisGroup.selectAll(".tick text").style("font-family", fonts.body).style("font-size", "12px").style("font-weight", "500").style("fill", theme.textSecondary);
          if (threshold !== void 0) {
            const thresholdX = xScale(threshold);
            const labelOffset = 10;
            const labelY = -40;
            let dollarValue = convertPercentToEffect(
              threshold,
              variantWithControl.controlSamples
            );
            if (Math.abs(dollarValue) < 5e-3) {
              dollarValue = 0;
            }
            topAxisGroup.selectAll(".threshold-tick-line").data([threshold]).join("line").attr("class", "threshold-tick-line").attr("x1", thresholdX).attr("x2", thresholdX).attr("y1", 0).attr("y2", -12).attr("stroke", theme.axisDomain).attr("stroke-width", 3);
            topAxisGroup.selectAll(".threshold-connector").data([threshold]).join("path").attr("class", "threshold-connector").attr(
              "d",
              `M ${thresholdX} -12 L ${thresholdX} ${labelY + 10} L ${thresholdX + labelOffset} ${labelY + 2}`
            ).attr("stroke", theme.textMuted).attr("stroke-width", 1.5).attr("fill", "none");
            topAxisGroup.selectAll(".threshold-tick-label").remove();
            topAxisGroup.selectAll(".editable-label-input-container").remove();
            const topThresholdLabel = topAxisGroup.append("text").attr("class", "threshold-tick-label").attr("x", thresholdX + labelOffset).attr("y", labelY).attr("text-anchor", "start");
            makeEditable(topThresholdLabel, {
              initialValue: dollarValue,
              displayFormat: (value) => {
                const rounded = Math.abs(value) < 5e-3 ? 0 : value;
                if (rounded >= 0) {
                  return Math.abs(rounded) >= 1e3 ? d38.format("$,.0f")(rounded) : Math.abs(rounded) >= 1 ? d38.format("$,.2f")(rounded) : d38.format("$.2f")(rounded);
                } else {
                  return Math.abs(rounded) >= 1e3 ? `-${d38.format("$,.0f")(Math.abs(rounded))}` : Math.abs(rounded) >= 1 ? `-${d38.format("$,.2f")(Math.abs(rounded))}` : `-${d38.format("$.2f")(Math.abs(rounded))}`;
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
                  return `Threshold must be between ${d38.format("$.2f")(minDollar)} and ${d38.format("$.2f")(maxDollar)}`;
                }
                return null;
              },
              onChange: (newDollarValue) => {
                const newPercent = convertEffectToPercent(
                  newDollarValue,
                  variantWithControl.controlSamples
                );
                data.threshold = newPercent;
                chart(selection);
              },
              fontSize: "12px",
              fontWeight: "600",
              fill: theme.text,
              cursor: "pointer"
            });
            const tickThresholdDollar = 0.15;
            topAxisGroup.selectAll(".tick text").each(function() {
              const tickText = d38.select(this);
              const tickString = tickText.text().replace(/[$,]/g, "");
              const tickValue = parseFloat(tickString);
              if (!isNaN(tickValue) && Math.abs(tickValue - dollarValue) < tickThresholdDollar) {
                tickText.style("opacity", "0");
              } else {
                tickText.style("opacity", "1");
              }
            });
          } else {
            topAxisGroup.selectAll(".threshold-tick-line").remove();
            topAxisGroup.selectAll(".threshold-tick-label").remove();
            topAxisGroup.selectAll(".threshold-connector").remove();
            topAxisGroup.selectAll(".tick text").style("opacity", "1");
          }
        }
      } else {
        svg.selectAll(".x-axis-top").remove();
      }
    });
  }
  chart.width = function(value) {
    if (arguments.length === 0) return width;
    width = value ?? null;
    return chart;
  };
  chart.height = function(value) {
    if (arguments.length === 0) return height;
    height = value ?? null;
    return chart;
  };
  chart.margin = function(value) {
    if (arguments.length === 0) return margin;
    margin = value;
    return chart;
  };
  chart.dotRadius = function(value) {
    if (arguments.length === 0) return dotRadius;
    dotRadius = value;
    return chart;
  };
  chart.ridgeHeight = function(value) {
    if (arguments.length === 0) return ridgeHeight;
    ridgeHeight = value;
    return chart;
  };
  chart.ridgeSpacing = function(value) {
    if (arguments.length === 0) return ridgeSpacing;
    ridgeSpacing = value;
    return chart;
  };
  chart.numDots = function(value) {
    if (arguments.length === 0) return numDots;
    numDots = value;
    return chart;
  };
  chart.ciLower = function(value) {
    if (arguments.length === 0) return ciLower;
    ciLower = value;
    return chart;
  };
  chart.ciUpper = function(value) {
    if (arguments.length === 0) return ciUpper;
    ciUpper = value;
    return chart;
  };
  chart.showViolin = function(value) {
    if (arguments.length === 0) return showViolin;
    showViolin = value;
    return chart;
  };
  chart.showReferenceLineAtZero = function(value) {
    if (arguments.length === 0) return showReferenceLineAtZero;
    showReferenceLineAtZero = value;
    return chart;
  };
  chart.scale = function(value) {
    if (arguments.length === 0) return scale;
    scale = value ?? null;
    return chart;
  };
  chart.showCIBounds = function(value) {
    if (arguments.length === 0) return showCIBounds;
    showCIBounds = value;
    return chart;
  };
  chart.showStatistics = function(value) {
    if (arguments.length === 0) return showStatistics;
    showStatistics = value;
    return chart;
  };
  chart.valueFormat = function(value) {
    if (arguments.length === 0) return valueFormat;
    valueFormat = value ?? null;
    return chart;
  };
  chart.showTooltip = function(value) {
    if (arguments.length === 0) return showTooltip;
    showTooltip = value;
    return chart;
  };
  chart.on = function(event, handler) {
    if (handler === null) {
      delete listeners[event];
    } else {
      listeners[event] = handler;
    }
    return chart;
  };
  return chart;
}

// src/core/HintArea.ts
import * as d39 from "d3";
function HintArea() {
  let position = [0, 0];
  let content = "";
  let triggerText = "?";
  let triggerColor = theme.textMuted;
  let backgroundColor = theme.surface;
  let textColor = theme.text;
  let maxWidth = 300;
  let mode = "hover";
  let placement = "auto";
  function chart(selection) {
    selection.each(function() {
      const container = d39.select(this);
      const [x, y] = position;
      let group = container.select("g.hint-area-group");
      if (group.empty()) {
        group = container.append("g").attr("class", "hint-area-group");
      }
      group.attr("transform", `translate(${x}, ${y})`);
      group.selectAll("circle.hint-trigger").data([null]).join("circle").attr("class", "hint-trigger").attr("r", 8).attr("cx", 0).attr("cy", 0).attr("fill", theme.background).attr("stroke", triggerColor).attr("stroke-width", 1.5).style("cursor", "pointer");
      group.selectAll("text.hint-trigger-text").data([null]).join("text").attr("class", "hint-trigger-text").attr("x", 0).attr("y", 0).attr("text-anchor", "middle").attr("dominant-baseline", "central").style("font-family", fonts.body).style("font-size", "11px").style("font-weight", "600").style("fill", triggerColor).style("pointer-events", "none").text(triggerText);
      let hintContent = group.select("foreignObject.hint-content");
      if (hintContent.empty()) {
        hintContent = group.append("foreignObject").attr("class", "hint-content").style("display", "none").style("pointer-events", "none");
      }
      const htmlDiv = hintContent.selectAll("div").data([null]).join("xhtml:div").style("background", backgroundColor).style("color", textColor).style("padding", "12px 14px").style("border-radius", "6px").style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.3)").style("font-family", fonts.body).style("font-size", "13px").style("line-height", "1.5").style("max-width", `${maxWidth}px`).html(content);
      const updateHintPosition = () => {
        const divNode = htmlDiv.node();
        if (!divNode) return;
        const bbox = divNode.getBoundingClientRect();
        const width = bbox.width;
        const height = bbox.height;
        hintContent.attr("width", width).attr("height", height);
        let offsetX = 0;
        let offsetY = 0;
        const pad = 12;
        if (placement === "auto" || placement === "top") {
          offsetX = -width / 2;
          offsetY = -height - pad - 8;
        } else if (placement === "bottom") {
          offsetX = -width / 2;
          offsetY = pad + 8;
        } else if (placement === "left") {
          offsetX = -width - pad - 8;
          offsetY = -height / 2;
        } else if (placement === "right") {
          offsetX = pad + 8;
          offsetY = -height / 2;
        }
        hintContent.attr("x", offsetX).attr("y", offsetY);
      };
      const trigger = group.select("circle.hint-trigger");
      if (mode === "hover") {
        trigger.on("mouseenter", function() {
          hintContent.style("display", "block");
          updateHintPosition();
        }).on("mouseleave", function() {
          hintContent.style("display", "none");
        });
      } else if (mode === "click") {
        let isVisible = false;
        trigger.on("click", function(event) {
          event.stopPropagation();
          isVisible = !isVisible;
          hintContent.style("display", isVisible ? "block" : "none");
          if (isVisible) {
            updateHintPosition();
          }
        });
        d39.select("body").on("click.hint-area", function() {
          if (isVisible) {
            isVisible = false;
            hintContent.style("display", "none");
          }
        });
      }
    });
  }
  chart.position = function(value) {
    if (arguments.length === 0) return position;
    position = value;
    return chart;
  };
  chart.content = function(value) {
    if (arguments.length === 0) return content;
    content = value;
    return chart;
  };
  chart.triggerText = function(value) {
    if (arguments.length === 0) return triggerText;
    triggerText = value;
    return chart;
  };
  chart.triggerColor = function(value) {
    if (arguments.length === 0) return triggerColor;
    triggerColor = value;
    return chart;
  };
  chart.backgroundColor = function(value) {
    if (arguments.length === 0) return backgroundColor;
    backgroundColor = value;
    return chart;
  };
  chart.textColor = function(value) {
    if (arguments.length === 0) return textColor;
    textColor = value;
    return chart;
  };
  chart.maxWidth = function(value) {
    if (arguments.length === 0) return maxWidth;
    maxWidth = value;
    return chart;
  };
  chart.mode = function(value) {
    if (arguments.length === 0) return mode;
    mode = value;
    return chart;
  };
  chart.placement = function(value) {
    if (arguments.length === 0) return placement;
    placement = value;
    return chart;
  };
  return chart;
}

// src/core/ContextMenu.ts
import * as d310 from "d3";
function ContextMenu() {
  let items = [];
  let backgroundColor = theme.surface;
  let textColor = theme.text;
  let hoverColor = theme.hoverBg;
  let borderColor = theme.border;
  let borderRadius = 6;
  let fontSize = 13;
  let minWidth = 180;
  let menuDiv = null;
  function createMenu() {
    if (menuDiv) {
      menuDiv.remove();
    }
    menuDiv = d310.select("body").append("div").attr("class", "trad-context-menu").style("position", "fixed").style("display", "none").style("background", backgroundColor).style("border", `1px solid ${borderColor}`).style("border-radius", `${borderRadius}px`).style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.3)").style("padding", "6px 0").style("min-width", `${minWidth}px`).style("z-index", "10000").style("font-family", fonts.body).style("font-size", `${fontSize}px`);
    return menuDiv;
  }
  function renderItems() {
    if (!menuDiv) return;
    menuDiv.selectAll("*").remove();
    items.forEach((item) => {
      if (item.divider || item.label === "divider") {
        menuDiv.append("div").style("height", "1px").style("background", borderColor).style("margin", "6px 0");
      } else {
        const itemDiv = menuDiv.append("div").attr("class", "context-menu-item").style("padding", "8px 16px").style("cursor", item.disabled ? "not-allowed" : "pointer").style("color", item.disabled ? theme.disabled : textColor).style("user-select", "none").text(item.label);
        if (!item.disabled) {
          itemDiv.on("mouseenter", function() {
            d310.select(this).style("background", hoverColor);
          }).on("mouseleave", function() {
            d310.select(this).style("background", "transparent");
          }).on("click", function(event) {
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
  function show(x, y) {
    if (!menuDiv) {
      createMenu();
    }
    renderItems();
    menuDiv.style("display", "block").style("left", `${x}px`).style("top", `${y}px`);
    setTimeout(() => {
      const menuNode = menuDiv.node();
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
        menuDiv.style("left", `${adjustedX}px`).style("top", `${adjustedY}px`);
      }
    }, 0);
    d310.select("body").on("click.context-menu", hide);
  }
  function hide() {
    if (menuDiv) {
      menuDiv.style("display", "none");
    }
    d310.select("body").on("click.context-menu", null);
  }
  function destroy() {
    if (menuDiv) {
      menuDiv.remove();
      menuDiv = null;
    }
    d310.select("body").on("click.context-menu", null);
  }
  const menu = {
    show,
    hide,
    destroy,
    items: function(value) {
      if (arguments.length === 0) return items;
      items = value;
      return menu;
    },
    backgroundColor: function(value) {
      if (arguments.length === 0) return backgroundColor;
      backgroundColor = value;
      if (menuDiv) createMenu();
      return menu;
    },
    textColor: function(value) {
      if (arguments.length === 0) return textColor;
      textColor = value;
      return menu;
    },
    hoverColor: function(value) {
      if (arguments.length === 0) return hoverColor;
      hoverColor = value;
      return menu;
    },
    borderColor: function(value) {
      if (arguments.length === 0) return borderColor;
      borderColor = value;
      if (menuDiv) createMenu();
      return menu;
    },
    borderRadius: function(value) {
      if (arguments.length === 0) return borderRadius;
      borderRadius = value;
      if (menuDiv) createMenu();
      return menu;
    },
    fontSize: function(value) {
      if (arguments.length === 0) return fontSize;
      fontSize = value;
      if (menuDiv) createMenu();
      return menu;
    },
    minWidth: function(value) {
      if (arguments.length === 0) return minWidth;
      minWidth = value;
      if (menuDiv) createMenu();
      return menu;
    }
  };
  return menu;
}
export {
  ContextMenu,
  DraggableCIBounds,
  HintArea,
  QuantileDots,
  RidgeDotplot,
  ThresholdLine,
  Tooltip,
  computeKDE,
  computeQuantiles,
  convertEffectToPercent,
  convertPercentToEffect,
  defaultColorScheme,
  fonts,
  getCIBounds,
  getPercentile,
  getSortedPairs,
  sortSamples,
  theme,
  validateCIBounds,
  validateNumDots,
  validateSamples
};
//# sourceMappingURL=trad-charts-d3.js.map

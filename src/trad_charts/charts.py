"""Chart helper functions — opinionated, consistent, publishable.

Each helper:
- Takes an Axes and data, returns the Axes
- Applies TITLE_FONT to titles automatically
- Always sets axis labels (no unlabeled axes)
- Uses semantic colors (pal.blue/pal.red) not cycle positions for meaning
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np

from trad_charts.theme import TITLE_FONT, get_palette

if TYPE_CHECKING:
    from matplotlib.axes import Axes
    from numpy.typing import ArrayLike


_pal = get_palette()


def forest_plot(
    ax: Axes,
    *,
    labels: list[str],
    estimates: ArrayLike,
    ci_lower: ArrayLike,
    ci_upper: ArrayLike,
    title: str = "",
    xlabel: str = "Effect Size",
    null_value: float = 0.0,
) -> Axes:
    """Horizontal forest plot with capped CI bars and semantic coloring.

    Points right of null_value are blue (positive), left are red (negative).
    """
    estimates = np.asarray(estimates)
    ci_lower = np.asarray(ci_lower)
    ci_upper = np.asarray(ci_upper)

    for i, (est, lo, hi) in enumerate(zip(estimates, ci_lower, ci_upper)):
        color = _pal.blue if est >= null_value else _pal.red
        xerr_lo = est - lo
        xerr_hi = hi - est
        ax.errorbar(
            est, i, xerr=[[xerr_lo], [xerr_hi]],
            fmt="o", color=color, markersize=8,
            linewidth=2, capsize=4, capthick=1.5, zorder=5,
        )

    ax.axvline(null_value, color=_pal.overlay0, linewidth=1, linestyle="--", alpha=0.6)
    ax.set_yticks(range(len(labels)))
    ax.set_yticklabels(labels)
    ax.set_xlabel(xlabel)
    if title:
        ax.set_title(title, **TITLE_FONT)
    ax.invert_yaxis()
    ax.grid(axis="y", visible=False)
    return ax


def ci_band(
    ax: Axes,
    *,
    x: ArrayLike,
    mean: ArrayLike,
    std: ArrayLike,
    truth: ArrayLike | None = None,
    observations: tuple[ArrayLike, ArrayLike] | None = None,
    title: str = "",
    xlabel: str = "",
    ylabel: str = "",
    ci_levels: tuple[float, float] = (0.50, 0.95),
) -> Axes:
    """Posterior mean with layered credible interval bands.

    Optionally overlays ground truth and observed data points.
    """
    x = np.asarray(x)
    mean = np.asarray(mean)
    std = np.asarray(std)

    # Wide CI
    z_wide = {0.95: 1.96, 0.99: 2.576, 0.90: 1.645}.get(ci_levels[1], 1.96)
    ax.fill_between(
        x, mean - z_wide * std, mean + z_wide * std,
        alpha=0.15, color=_pal.blue, linewidth=0,
        label=f"{ci_levels[1]:.0%} CI",
    )

    # Narrow CI
    z_narrow = {0.50: 0.674, 0.80: 1.282, 0.68: 1.0}.get(ci_levels[0], 0.674)
    ax.fill_between(
        x, mean - z_narrow * std, mean + z_narrow * std,
        alpha=0.3, color=_pal.blue, linewidth=0,
        label=f"{ci_levels[0]:.0%} CI",
    )

    ax.plot(x, mean, color=_pal.blue, linewidth=2, label="Posterior mean")

    if truth is not None:
        ax.plot(x, np.asarray(truth), color=_pal.red, linewidth=1.5,
                linestyle="--", label="Truth")

    ax.axhline(0, color=_pal.overlay0, linewidth=0.8, linestyle=":", alpha=0.5)

    if observations is not None:
        obs_x, obs_y = observations
        ax.scatter(obs_x, obs_y, color=_pal.yellow, s=25, alpha=0.8,
                   zorder=4, label="Observed")

    if xlabel:
        ax.set_xlabel(xlabel)
    if ylabel:
        ax.set_ylabel(ylabel)
    if title:
        ax.set_title(title, **TITLE_FONT)
    ax.legend(loc="upper left")
    return ax


def distribution(
    ax: Axes,
    *,
    data: list[ArrayLike],
    labels: list[str],
    title: str = "",
    ylabel: str = "",
    style: str = "violin",
) -> Axes:
    """Distribution comparison — violin+box or box-only.

    Each series gets its own color from the palette cycle.
    """
    positions = list(range(len(data)))
    colors = _pal.cycle

    if style == "violin":
        parts = ax.violinplot(data, positions=positions,
                              showextrema=False, showmedians=False)
        for i, pc in enumerate(parts["bodies"]):
            pc.set_facecolor(colors[i % len(colors)])
            pc.set_alpha(0.3)
            pc.set_edgecolor(colors[i % len(colors)])

    bp = ax.boxplot(
        data, positions=positions,
        widths=0.15 if style == "violin" else 0.5,
        patch_artist=True, showfliers=False,
        medianprops=dict(color=_pal.text, linewidth=2),
    )
    for i, patch in enumerate(bp["boxes"]):
        patch.set_facecolor(colors[i % len(colors)])
        patch.set_alpha(0.6)
        patch.set_edgecolor(colors[i % len(colors)])
    for element in ["whiskers", "caps"]:
        for line in bp[element]:
            line.set_color(_pal.overlay0)

    ax.set_xticks(positions)
    ax.set_xticklabels(labels)
    if ylabel:
        ax.set_ylabel(ylabel)
    if title:
        ax.set_title(title, **TITLE_FONT)
    return ax


def power_curve(
    ax: Axes,
    *,
    sample_sizes: ArrayLike,
    power: ArrayLike,
    power_ci: ArrayLike | None = None,
    fpr: ArrayLike | None = None,
    title: str = "",
    xlabel: str = "Sample Size",
    ylabel: str = "Rate",
    target_power: float = 0.80,
    log_scale: bool = True,
) -> Axes:
    """Power curve with optional CI band and reference lines."""
    sample_sizes = np.asarray(sample_sizes)
    power = np.asarray(power)

    if power_ci is not None:
        power_ci = np.asarray(power_ci)
        ax.fill_between(
            sample_sizes, power - power_ci, power + power_ci,
            alpha=0.2, color=_pal.blue,
        )

    ax.plot(sample_sizes, power, "-o", color=_pal.blue, markersize=5, label="Power")
    ax.axhline(target_power, color=_pal.green, linewidth=1, linestyle="--",
               alpha=0.7, label=f"{target_power:.0%} target")

    if fpr is not None:
        fpr = np.asarray(fpr)
        ax.plot(sample_sizes, fpr, "-s", color=_pal.red, markersize=4,
                alpha=0.7, label="FPR")
        ax.axhline(0.05, color=_pal.red, linewidth=1, linestyle="--",
                    alpha=0.5, label="5% FPR")

    if log_scale:
        ax.set_xscale("log")
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    if title:
        ax.set_title(title, **TITLE_FONT)
    ax.legend(loc="center right")
    return ax


def grouped_bar(
    ax: Axes,
    *,
    categories: list[str],
    groups: dict[str, ArrayLike],
    title: str = "",
    ylabel: str = "",
    target_line: float | None = None,
    target_label: str = "Target",
) -> Axes:
    """Grouped bar chart with automatic width calculation."""
    n_groups = len(groups)
    x_pos = np.arange(len(categories))
    bar_width = 0.8 / n_groups
    colors = _pal.cycle

    for i, (name, values) in enumerate(groups.items()):
        offset = (i - (n_groups - 1) / 2) * bar_width
        ax.bar(
            x_pos + offset, values, bar_width,
            label=name, color=colors[i % len(colors)],
            alpha=0.8, edgecolor=colors[i % len(colors)],
        )

    if target_line is not None:
        ax.axhline(target_line, color=_pal.green, linewidth=1,
                    linestyle="--", alpha=0.5, label=target_label)

    ax.set_xticks(x_pos)
    ax.set_xticklabels(categories)
    if ylabel:
        ax.set_ylabel(ylabel)
    if title:
        ax.set_title(title, **TITLE_FONT)
    ax.legend()
    return ax


# ---------------------------------------------------------------------------
# KDE utilities (manual — avoids scipy hard dep)
# ---------------------------------------------------------------------------

def _silverman_bandwidth(data: np.ndarray) -> float:
    """Silverman's rule with robust sigma (matches D3 density default)."""
    std = np.std(data, ddof=1)
    iqr = np.subtract(*np.percentile(data, [75, 25]))
    sigma = min(std, iqr / 1.34) if iqr > 0 else std
    return 1.06 * sigma * len(data) ** -0.2


def _epanechnikov_kde(data: np.ndarray, grid: np.ndarray, bandwidth: float) -> np.ndarray:
    """Epanechnikov kernel density estimate (matches D3 density kernel)."""
    n = len(data)
    density = np.zeros_like(grid)
    for xi in data:
        u = (grid - xi) / bandwidth
        mask = np.abs(u) <= 1
        density[mask] += 0.75 * (1 - u[mask] ** 2)
    density /= n * bandwidth
    return density


# ---------------------------------------------------------------------------
# posterior_density
# ---------------------------------------------------------------------------

def posterior_density(
    ax: Axes,
    *,
    samples: ArrayLike,
    threshold: float | None = None,
    ci: tuple[float, float] = (0.05, 0.95),
    point_estimate: str = "median",
    title: str = "",
    xlabel: str = "",
) -> Axes:
    """Posterior density plot with CI shading, threshold split, and probability labels.

    KDE density curve with the credible interval region filled darker.
    If a threshold is set, the density is split into two colored halves
    with probability annotations.
    """
    samples = np.asarray(samples, dtype=float)

    # KDE
    grid = np.linspace(samples.min(), samples.max(), 300)
    bw = _silverman_bandwidth(samples)
    density = _epanechnikov_kde(samples, grid, bw)

    # CI bounds
    ci_lo = np.quantile(samples, ci[0])
    ci_hi = np.quantile(samples, ci[1])

    if threshold is not None:
        # Split fill at threshold
        below = grid <= threshold
        above = grid >= threshold
        ax.fill_between(grid[below], 0, density[below],
                        color=_pal.red, alpha=0.15, linewidth=0)
        ax.fill_between(grid[above], 0, density[above],
                        color=_pal.blue, alpha=0.15, linewidth=0)

        # Darker fill within CI
        ci_mask_below = below & (grid >= ci_lo) & (grid <= ci_hi)
        ci_mask_above = above & (grid >= ci_lo) & (grid <= ci_hi)
        if ci_mask_below.any():
            ax.fill_between(grid[ci_mask_below], 0, density[ci_mask_below],
                            color=_pal.red, alpha=0.25, linewidth=0)
        if ci_mask_above.any():
            ax.fill_between(grid[ci_mask_above], 0, density[ci_mask_above],
                            color=_pal.blue, alpha=0.25, linewidth=0)

        # Outline
        ax.plot(grid[below], density[below], color=_pal.red, linewidth=1.5)
        ax.plot(grid[above], density[above], color=_pal.blue, linewidth=1.5)

        # Threshold line
        ax.axvline(threshold, color=_pal.overlay1, linewidth=1,
                   linestyle="--", alpha=0.6)

        # Probability labels
        p_above = np.mean(samples >= threshold)
        p_below = 1 - p_above
        peak = density.max()
        if below.any():
            ax.text(grid[below].mean(), peak * 0.7,
                    f"{p_below:.0%}", ha="center", va="center",
                    fontsize=12, color=_pal.red, alpha=0.9, fontweight="bold")
        if above.any():
            ax.text(grid[above].mean(), peak * 0.7,
                    f"{p_above:.0%}", ha="center", va="center",
                    fontsize=12, color=_pal.blue, alpha=0.9, fontweight="bold")
    else:
        # Single-color density
        ax.fill_between(grid, 0, density, color=_pal.blue, alpha=0.15, linewidth=0)
        # Darker CI region
        ci_mask = (grid >= ci_lo) & (grid <= ci_hi)
        ax.fill_between(grid[ci_mask], 0, density[ci_mask],
                        color=_pal.blue, alpha=0.25, linewidth=0)
        ax.plot(grid, density, color=_pal.blue, linewidth=1.5)

    # Point estimate
    if point_estimate == "median":
        est = np.median(samples)
    elif point_estimate == "mean":
        est = np.mean(samples)
    else:
        est = None

    if est is not None:
        ax.axvline(est, color=_pal.text, linewidth=1.5, alpha=0.7, zorder=4)

    # CI bracket tick marks
    for bound in (ci_lo, ci_hi):
        ax.axvline(bound, color=_pal.overlay0, linewidth=1, linestyle=":",
                   alpha=0.5)

    ax.set_ylim(0, None)
    ax.set_yticks([])
    ax.grid(axis="y", visible=False)
    if xlabel:
        ax.set_xlabel(xlabel)
    if title:
        ax.set_title(title, **TITLE_FONT)
    return ax


# ---------------------------------------------------------------------------
# density_compare
# ---------------------------------------------------------------------------

def density_compare(
    ax: Axes,
    *,
    data: list[ArrayLike],
    labels: list[str],
    title: str = "",
    xlabel: str = "",
    ylabel: str = "Density",
    fill: bool = True,
    show_median: bool = False,
) -> Axes:
    """Overlaid KDE density curves for comparing distributions.

    Each distribution gets its own KDE line in a distinct color from the
    palette cycle. Optional light fill and median markers.
    """
    colors = _pal.cycle

    # Compute shared grid across all distributions
    all_vals = np.concatenate([np.asarray(d, dtype=float) for d in data])
    grid = np.linspace(all_vals.min(), all_vals.max(), 300)

    for i, (samples, label) in enumerate(zip(data, labels)):
        samples = np.asarray(samples, dtype=float)
        color = colors[i % len(colors)]
        bw = _silverman_bandwidth(samples)
        density = _epanechnikov_kde(samples, grid, bw)

        ax.plot(grid, density, color=color, linewidth=2, label=label)
        if fill:
            ax.fill_between(grid, 0, density, color=color,
                            alpha=0.1, linewidth=0)
        if show_median:
            med = float(np.median(samples))
            ax.axvline(med, color=color, linewidth=1, linestyle="--",
                       alpha=0.6)

    ax.set_ylim(0, None)
    if xlabel:
        ax.set_xlabel(xlabel)
    if ylabel:
        ax.set_ylabel(ylabel)
    if title:
        ax.set_title(title, **TITLE_FONT)
    ax.legend()
    return ax


# ---------------------------------------------------------------------------
# mcmc_trace
# ---------------------------------------------------------------------------

def mcmc_trace(
    ax: Axes,
    *,
    trace: ArrayLike,
    target: float | None = None,
    burn_in: int = 0,
    running_mean_window: float = 0.1,
    title: str = "",
    ylabel: str = "",
) -> Axes:
    """MCMC trace plot with running mean, burn-in shading, and target line.

    Designed for convergence diagnostics — the running mean should converge
    toward the target value as the chain mixes.
    """
    trace = np.asarray(trace, dtype=float)
    n = len(trace)
    iterations = np.arange(n)

    # 1. Raw trace
    ax.plot(iterations, trace, color=_pal.blue, alpha=0.4, linewidth=0.5)

    # 2. Running mean
    window = max(2, int(n * running_mean_window))
    kernel = np.ones(window) / window
    running_avg = np.convolve(trace, kernel, mode="valid")
    offset = window - 1
    ax.plot(iterations[offset:], running_avg, color=_pal.peach,
            linewidth=1.8, label=f"Running mean (w={window})")

    # 3. Burn-in shading
    if burn_in > 0:
        ax.axvspan(0, burn_in, color=_pal.surface1, alpha=0.4, zorder=0)
        ax.axvline(burn_in, color=_pal.overlay0, linewidth=1,
                   linestyle=":", alpha=0.7)

    # 4. Target reference
    if target is not None:
        ax.axhline(target, color=_pal.green, linewidth=1.5, linestyle="--",
                   alpha=0.8, label=f"Target = {target}")

    ax.set_xlabel("Iteration")
    if ylabel:
        ax.set_ylabel(ylabel)
    if title:
        ax.set_title(title, **TITLE_FONT)
    ax.legend(loc="upper right")
    return ax


# ---------------------------------------------------------------------------
# calibration_plot
# ---------------------------------------------------------------------------

def calibration_plot(
    ax: Axes,
    *,
    nominal: ArrayLike,
    actual: ArrayLike,
    title: str = "",
    xlabel: str = "Nominal Coverage",
    ylabel: str = "Actual Coverage",
    show_deviation: bool = True,
) -> Axes:
    """Calibration plot — nominal vs actual coverage on the identity line.

    Points on the diagonal indicate perfect calibration. Deviation lines
    (lollipops to the identity line) highlight miscalibration magnitude.
    Points are colored blue (well-calibrated) / yellow / red (miscalibrated).
    """
    nominal = np.asarray(nominal, dtype=float)
    actual = np.asarray(actual, dtype=float)

    # Identity line + tolerance band
    line_range = np.array([0, 1])
    ax.plot(line_range, line_range, color=_pal.overlay1, linewidth=1,
            linestyle="--", alpha=0.6, label="Perfect calibration")
    ax.fill_between(line_range, line_range - 0.05, line_range + 0.05,
                    color=_pal.overlay0, alpha=0.1, linewidth=0,
                    label="\u00b15% tolerance")

    # Color by deviation severity
    deviations = np.abs(actual - nominal)
    colors = []
    for d in deviations:
        if d <= 0.03:
            colors.append(_pal.blue)
        elif d <= 0.07:
            colors.append(_pal.yellow)
        else:
            colors.append(_pal.red)

    # Deviation lines (lollipop to diagonal)
    if show_deviation:
        for n_val, a_val, c in zip(nominal, actual, colors):
            ax.plot([n_val, n_val], [n_val, a_val], color=c,
                    linewidth=1.5, alpha=0.6, zorder=4)

    # Scatter points
    ax.scatter(nominal, actual, c=colors, s=80, edgecolors="none",
               zorder=5, alpha=0.9)

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_aspect("equal")
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    if title:
        ax.set_title(title, **TITLE_FONT)
    ax.legend(loc="upper left")
    return ax

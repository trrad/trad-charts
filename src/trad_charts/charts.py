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

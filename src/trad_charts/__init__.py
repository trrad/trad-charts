"""trad-charts — personal matplotlib theme and chart helpers.

Site-aligned purple chrome (tradcliffe.com) with Catppuccin Mocha data accents.
Consistent, publishable charts with minimal boilerplate.

Usage:
    from trad_charts import apply_theme, get_palette, TITLE_FONT, watermark

    apply_theme()
    pal = get_palette()

    fig, ax = plt.subplots()
    ax.plot(x, y, color=pal.blue)
    ax.set_title("My Chart", **TITLE_FONT)
    watermark(fig)
"""

from trad_charts.theme import TITLE_FONT, Palette, apply_theme, get_palette, watermark
from trad_charts.charts import (
    forest_plot, ci_band, distribution, power_curve, grouped_bar,
    posterior_density, density_compare, mcmc_trace, calibration_plot,
)

__all__ = [
    # Theme
    "TITLE_FONT",
    "Palette",
    "apply_theme",
    "get_palette",
    "watermark",
    # Chart helpers
    "forest_plot",
    "ci_band",
    "distribution",
    "power_curve",
    "grouped_bar",
    "posterior_density",
    "density_compare",
    "mcmc_trace",
    "calibration_plot",
]

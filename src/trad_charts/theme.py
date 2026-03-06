"""trad-charts matplotlib theme.

Site-aligned purple chrome (tradcliffe.com) with Catppuccin Mocha data accents.
Minimal dark theme with subtle warm grid lines, inspired by seaborn whitegrid.
Designed for publishable artifacts (PNG/SVG for web and docs).

Font pairing: 3270 Nerd Font Propo (titles) + IBM Plex Sans (body).
Titles require an explicit fontdict since matplotlib rcParams don't support
per-element font families. Use TITLE_FONT:

    from pytyche.viz.theme import apply_theme, get_palette, TITLE_FONT

    apply_theme()
    pal = get_palette()

    fig, ax = plt.subplots()
    ax.plot(x, y, color=pal.blue)
    ax.set_title("My Chart", **TITLE_FONT)
"""

from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

import matplotlib as mpl
import matplotlib.font_manager as fm
from cycler import cycler

if TYPE_CHECKING:
    from matplotlib.axes import Axes
    from matplotlib.figure import Figure


# ---------------------------------------------------------------------------
# Font registration
# ---------------------------------------------------------------------------

_FONT_DIR = Path.home() / ".local" / "share" / "fonts"

_TITLE_FAMILY = "3270 Nerd Font Propo"
_BODY_FAMILY = "IBM Plex Sans"

# Fallback stacks for when preferred fonts aren't installed
_BODY_FALLBACK = [_BODY_FAMILY, "DejaVu Sans", "sans-serif"]
_TITLE_FALLBACK = [_TITLE_FAMILY, "monospace"]


def _register_fonts() -> None:
    """Register user-installed fonts with matplotlib's font manager.

    Matplotlib doesn't always discover ~/.local/share/fonts automatically.
    We explicitly register known font files so they're available to rcParams.
    """
    font_files = [
        _FONT_DIR / "IBMPlexSans-Regular.ttf",
        _FONT_DIR / "IBMPlexSans-Bold.ttf",
        _FONT_DIR / "IBMPlexSans-Italic.ttf",
        _FONT_DIR / "3270NerdFont" / "3270NerdFontPropo-Regular.ttf",
    ]
    for path in font_files:
        if path.exists():
            fm.fontManager.addfont(str(path))


_register_fonts()


# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Palette:
    """Chart palette — site-aligned purple chrome + Catppuccin Mocha data accents.

    Surface/text tiers match tradcliffe.com's purple terminal aesthetic.
    Accent colors from Catppuccin Mocha — optimized for distinguishability.
    """

    # Surfaces (purple base, derived from site --terminal-bg / --terminal-alt)
    crust: str = "#0f0812"
    mantle: str = "#150c1a"
    base: str = "#1a0f1f"        # --terminal-bg
    surface0: str = "#251730"    # --terminal-alt
    surface1: str = "#33213f"
    surface2: str = "#432d52"

    # Overlays
    overlay0: str = "#5a4168"
    overlay1: str = "#7a6488"
    overlay2: str = "#9688a0"

    # Text (site-aligned)
    subtext0: str = "#a297a8"    # --text-muted
    subtext1: str = "#d4ccd8"    # --smoke
    text: str = "#e8e3ed"        # --mist / --text

    # Accents
    rosewater: str = "#f5e0dc"
    flamingo: str = "#f2cdcd"
    pink: str = "#f5c2e7"
    mauve: str = "#cba6f7"
    red: str = "#f38ba8"
    maroon: str = "#eba0b3"
    peach: str = "#fab387"
    yellow: str = "#f9e2af"
    green: str = "#a6e3a1"
    teal: str = "#94e2d5"
    sky: str = "#89dceb"
    sapphire: str = "#74c7ec"
    blue: str = "#89b4fa"
    lavender: str = "#b4befe"

    @property
    def cycle(self) -> list[str]:
        """Default color cycle for multi-series plots.

        Curated 8-color set: blue+peach lead (universal colorblind-safe
        pair), purples excluded (conflict with chrome), luminance-varied.
        All accent colors remain available as named fields.
        """
        return [
            self.blue,      # primary anchor
            self.peach,     # blue+orange = universal safe pair
            self.green,     # distinct hue
            self.red,       # pink-red, lighter than pure red
            self.yellow,    # brightest, unmistakable
            self.teal,      # cyan slot
            self.flamingo,  # warm neutral
            self.sky,       # light cyan
        ]

    @property
    def sequential(self) -> list[str]:
        """Blue sequential ramp for heatmaps/density."""
        return [self.base, self.surface0, self.surface1, self.overlay0, self.blue]

    @property
    def diverging(self) -> tuple[str, str, str]:
        """(negative, neutral, positive) for diverging scales."""
        return (self.red, self.surface1, self.blue)


_PALETTE = Palette()


def get_palette() -> Palette:
    """Return the chart palette."""
    return _PALETTE


# ---------------------------------------------------------------------------
# Title font
# ---------------------------------------------------------------------------

TITLE_FONT: dict[str, str] = {
    "fontfamily": _TITLE_FALLBACK[0],
    "fontweight": "bold",
}
"""Keyword dict for mixed-font titles. Unpack into set_title():

    ax.set_title("My Chart", **TITLE_FONT)
"""


# ---------------------------------------------------------------------------
# Theme application
# ---------------------------------------------------------------------------

def apply_theme(*, context: str = "paper") -> None:
    """Apply the pytyche theme to matplotlib rcParams.

    Args:
        context: Scaling context. "paper" (default) for publication,
                 "talk" for presentations (larger text).
    """
    pal = _PALETTE

    scale = {"paper": 1.0, "talk": 1.4}.get(context, 1.0)
    base_font = 11 * scale

    rc = {
        # --- Figure ---
        "figure.facecolor": pal.base,
        "figure.edgecolor": pal.base,
        "figure.figsize": (8, 5),
        "figure.dpi": 150,
        "savefig.facecolor": pal.base,
        "savefig.edgecolor": pal.base,
        "savefig.dpi": 200,
        "savefig.bbox": "tight",
        "savefig.pad_inches": 0.25,
        "figure.constrained_layout.use": True,
        "figure.constrained_layout.h_pad": 0.1,
        "figure.constrained_layout.w_pad": 0.08,
        "figure.constrained_layout.hspace": 0.15,
        "figure.constrained_layout.wspace": 0.1,

        # --- Axes ---
        "axes.facecolor": pal.base,
        "axes.edgecolor": pal.surface1,
        "axes.linewidth": 0.8,
        "axes.titlesize": base_font * 1.66,
        "axes.titleweight": "bold",
        "axes.titlepad": 18,
        "axes.titlecolor": pal.text,
        "axes.labelsize": base_font,
        "axes.labelcolor": pal.subtext0,
        "axes.labelpad": 8,
        "axes.prop_cycle": cycler(color=pal.cycle),
        "axes.axisbelow": True,
        "axes.spines.top": False,
        "axes.spines.right": False,

        # --- Grid (warm amber lines on purple base) ---
        "axes.grid": True,
        "axes.grid.which": "major",
        "grid.color": "#4d4338",
        "grid.linewidth": 0.6,
        "grid.alpha": 0.7,
        "grid.linestyle": "-",

        # --- Ticks ---
        "xtick.color": pal.overlay1,
        "ytick.color": pal.overlay1,
        "xtick.labelsize": base_font * 0.9,
        "ytick.labelsize": base_font * 0.9,
        "xtick.major.size": 0,
        "ytick.major.size": 0,
        "xtick.major.pad": 6,
        "ytick.major.pad": 6,
        "xtick.minor.size": 0,
        "ytick.minor.size": 0,

        # --- Text (IBM Plex Sans body, titles via TITLE_FONT) ---
        "text.color": pal.text,
        "font.family": "sans-serif",
        "font.sans-serif": _BODY_FALLBACK,
        "font.size": base_font,
        "mathtext.default": "regular",

        # --- Legend ---
        "legend.facecolor": pal.surface0,
        "legend.edgecolor": pal.surface1,
        "legend.labelcolor": pal.text,
        "legend.fontsize": base_font * 0.85,
        "legend.framealpha": 0.9,
        "legend.borderpad": 0.6,
        "legend.columnspacing": 1.5,

        # --- Lines & markers ---
        "lines.linewidth": 2.0,
        "lines.markersize": 6,
        "scatter.marker": "o",

        # --- Patches (bars, boxes, etc.) ---
        "patch.facecolor": pal.blue,
        "patch.edgecolor": pal.surface1,
        "patch.linewidth": 0.8,

        # --- Boxplot ---
        "boxplot.boxprops.color": pal.overlay1,
        "boxplot.whiskerprops.color": pal.overlay0,
        "boxplot.capprops.color": pal.overlay0,
        "boxplot.medianprops.color": pal.text,
        "boxplot.medianprops.linewidth": 2.0,
        "boxplot.flierprops.marker": ".",
        "boxplot.flierprops.markerfacecolor": pal.overlay0,
        "boxplot.flierprops.markeredgecolor": pal.overlay0,
        "boxplot.flierprops.markersize": 4,

        # --- Image ---
        "image.cmap": "magma",
    }

    mpl.rcParams.update(rc)


# ---------------------------------------------------------------------------
# Watermark
# ---------------------------------------------------------------------------

_WATERMARK_DEFAULT = "tradcliffe.com"


def watermark(
    target: "Figure | Axes",
    text: str = _WATERMARK_DEFAULT,
    *,
    alpha: float = 0.3,
) -> None:
    """Add a small watermark to the top-right of each axes in a figure,
    or to a single axes.

    Args:
        target: A matplotlib Figure (stamps all axes) or a single Axes.
        text: Watermark text. Defaults to "tradcliffe.com".
        alpha: Opacity (0-1). Defaults to 0.3 — present but unobtrusive.
    """
    from matplotlib.axes import Axes
    from matplotlib.figure import Figure

    if isinstance(target, Figure):
        axes_list = target.axes
    elif isinstance(target, Axes):
        axes_list = [target]
    else:
        raise TypeError(f"Expected Figure or Axes, got {type(target)}")

    for ax in axes_list:
        ax.text(
            1.0, 1.04, text,
            transform=ax.transAxes,
            ha="right", va="bottom",
            fontsize=9,
            color=_PALETTE.subtext0,
            alpha=alpha,
            fontstyle="italic",
        )

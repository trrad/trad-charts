"""6-panel showcase of the trad-charts theme and helpers.

Run: uv run python examples/showcase.py
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

from trad_charts import (
    apply_theme, get_palette, watermark, TITLE_FONT,
    forest_plot, ci_band, distribution, power_curve, grouped_bar,
)

apply_theme()
pal = get_palette()
rng = np.random.default_rng(42)

fig = plt.figure(figsize=(16, 14))
gs = fig.add_gridspec(3, 2)

# 1. Forest plot
ax1 = fig.add_subplot(gs[0, 0])
forest_plot(
    ax1,
    labels=["Overall", "High-value", "New visitors", "Mobile",
            "Returning", "Desktop", "Low-intent"],
    estimates=[0.032, 0.078, 0.041, -0.012, 0.055, 0.019, -0.005],
    ci_lower=[-0.005, 0.031, -0.008, -0.058, 0.012, -0.022, -0.041],
    ci_upper=[0.069, 0.125, 0.090, 0.034, 0.098, 0.060, 0.031],
    title="Forest Plot: HTE by Segment",
    xlabel="Treatment Effect (RPV)",
)

# 2. CI band
ax2 = fig.add_subplot(gs[0, 1])
x = np.linspace(0, 1, 80)
true_cate = 15 * (x - 0.3)
mean = true_cate + rng.normal(0, 0.4, len(x))
std = 2.0 + 1.5 * np.abs(x - 0.5)
obs_x = rng.uniform(0, 1, 20)
obs_y = np.interp(obs_x, x, true_cate) + rng.normal(0, 3, 20)

ci_band(
    ax2,
    x=x, mean=mean, std=std,
    truth=true_cate,
    observations=(obs_x, obs_y),
    title="CATE with Credible Intervals",
    xlabel="x1 covariate",
    ylabel="CATE ($)",
)

# 3. Distribution comparison
ax3 = fig.add_subplot(gs[1, 0])
dist_data = [rng.normal(mu, sig, 200) for mu, sig in
             [(0.03, 0.008), (0.06, 0.015), (0.04, 0.010),
              (0.05, 0.020), (0.025, 0.005)]]

distribution(
    ax3,
    data=dist_data,
    labels=["constant", "reversal", "sparse", "nonlinear", "heavy_tail"],
    title="RMSE Distribution by Scenario",
    ylabel="RMSE",
)

# 4. Density / histogram overlay (manual — no helper yet)
ax4 = fig.add_subplot(gs[1, 1])
for i, (name, mu, sig) in enumerate([
    ("Control", 45, 12), ("Treatment A", 52, 10), ("Treatment B", 48, 15),
]):
    samples = rng.normal(mu, sig, 500)
    ax4.hist(samples, bins=35, alpha=0.25, color=pal.cycle[i],
             density=True, label=name)
    xd = np.linspace(samples.min(), samples.max(), 100)
    ax4.plot(xd, stats.norm.pdf(xd, mu, sig), color=pal.cycle[i], linewidth=1.5)

ax4.set_xlabel("Revenue per Visitor ($)")
ax4.set_ylabel("Density")
ax4.set_title("Revenue Distribution by Variant", **TITLE_FONT)
ax4.legend()

# 5. Power curve
ax5 = fig.add_subplot(gs[2, 0])
sample_sizes = np.array([500, 1000, 2000, 5000, 10000, 20000, 50000])
n_sims = 50
power_means = []
power_cis = []
for n in sample_sizes:
    p = 1 / (1 + np.exp(-0.0008 * (n - 5000)))
    draws = rng.binomial(1, p, n_sims)
    m = draws.mean()
    se = np.sqrt(m * (1 - m) / n_sims)
    power_means.append(m)
    power_cis.append(1.96 * se)

power_curve(
    ax5,
    sample_sizes=sample_sizes,
    power=power_means,
    power_ci=power_cis,
    title="Power vs Sample Size",
)

# 6. Grouped bar
ax6 = fig.add_subplot(gs[2, 1])
grouped_bar(
    ax6,
    categories=["constant", "reversal", "sparse", "nonlinear", "heavy_tail"],
    groups={
        "Power": [0.82, 0.45, 0.78, 0.65, 0.91],
        "Coverage": [0.84, 0.72, 0.81, 0.76, 0.88],
    },
    title="Power & Coverage by Scenario",
    ylabel="Rate",
    target_line=0.80,
    target_label="80% target",
)

watermark(fig)
fig.savefig("examples/showcase.png")
print("Saved to examples/showcase.png")

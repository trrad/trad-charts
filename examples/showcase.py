"""9-panel showcase of the trad-charts theme and helpers.

Run: uv run python examples/showcase.py
"""

import numpy as np
import matplotlib.pyplot as plt

from trad_charts import (
    apply_theme, watermark,
    forest_plot, ci_band, distribution, power_curve, grouped_bar,
    posterior_density, density_compare, mcmc_trace, calibration_plot,
)

apply_theme()
rng = np.random.default_rng(42)

fig = plt.figure(figsize=(18, 16))
gs = fig.add_gridspec(3, 3)

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

# 3. Posterior density — treatment effect with threshold
ax3 = fig.add_subplot(gs[0, 2])
posterior = rng.normal(0.032, 0.018, 4000)
posterior_density(
    ax3,
    samples=posterior,
    threshold=0.0,
    ci=(0.05, 0.95),
    title="Posterior: P(effect > 0)",
    xlabel="Treatment Effect (RPV)",
)

# 4. Distribution comparison
ax4 = fig.add_subplot(gs[1, 0])
dist_data = [rng.normal(mu, sig, 200) for mu, sig in
             [(0.03, 0.008), (0.06, 0.015), (0.04, 0.010),
              (0.05, 0.020), (0.025, 0.005)]]

distribution(
    ax4,
    data=dist_data,
    labels=["constant", "reversal", "sparse", "nonlinear", "heavy_tail"],
    title="RMSE Distribution by Scenario",
    ylabel="RMSE",
)

# 5. Density comparison
ax5 = fig.add_subplot(gs[1, 1])
density_compare(
    ax5,
    data=[rng.normal(45, 12, 500), rng.normal(52, 10, 500), rng.normal(48, 15, 500)],
    labels=["Control", "Treatment A", "Treatment B"],
    title="Revenue Distribution by Variant",
    xlabel="Revenue per Visitor ($)",
    show_median=True,
)

# 6. MCMC trace — sigma^2 convergence
ax6 = fig.add_subplot(gs[1, 2])
n_iter = 2000
trace = np.empty(n_iter)
trace[0] = 3.0
for i in range(1, n_iter):
    trace[i] = trace[i - 1] + rng.normal(0, 0.05)
    trace[i] = 0.98 * trace[i] + 0.02 * 1.0

mcmc_trace(
    ax6,
    trace=trace,
    target=1.0,
    burn_in=200,
    running_mean_window=0.1,
    title="MCMC Trace: sigma^2",
    ylabel="sigma^2",
)

# 7. Power curve
ax7 = fig.add_subplot(gs[2, 0])
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
    ax7,
    sample_sizes=sample_sizes,
    power=power_means,
    power_ci=power_cis,
    title="Power vs Sample Size",
)

# 8. Grouped bar
ax8 = fig.add_subplot(gs[2, 1])
grouped_bar(
    ax8,
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

# 9. Calibration plot
ax9 = fig.add_subplot(gs[2, 2])
nominal = np.array([0.50, 0.60, 0.70, 0.80, 0.90, 0.95])
actual = np.array([0.52, 0.63, 0.58, 0.77, 0.92, 0.89])
calibration_plot(
    ax9,
    nominal=nominal,
    actual=actual,
    title="CI Calibration",
)

watermark(fig)
fig.savefig("examples/showcase.png")
print("Saved to examples/showcase.png")

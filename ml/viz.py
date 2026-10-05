"""Shared chart style: validated reference palette (categorical, sequential blue, diverging blue<->red)."""

from __future__ import annotations

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

# Categorical slots in fixed order (never cycled), text inks, grid.
C1, C2, C3, C4 = "#2a78d6", "#eb6834", "#1baf7a", "#eda100"
INK, INK2, MUTED, GRID = "#0b0b0b", "#52514e", "#8a8984", "#e4e3df"
SEQ = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"]
SEQ_CMAP = sns.blend_palette(SEQ, as_cmap=True)
DIV_CMAP = sns.blend_palette(["#184f95", "#3987e5", "#f0efec", "#e66767", "#b8302f"], as_cmap=True)
DIV_CMAP_R = sns.blend_palette(["#b8302f", "#e66767", "#f0efec", "#3987e5", "#184f95"], as_cmap=True)


def apply_style() -> None:
    plt.rcParams.update({
        "figure.dpi": 110, "savefig.dpi": 150, "savefig.bbox": "tight", "font.size": 9,
        "axes.edgecolor": GRID, "axes.labelcolor": INK2, "axes.titlecolor": INK, "axes.titlesize": 10,
        "xtick.color": INK2, "ytick.color": INK2, "axes.grid": True, "grid.color": GRID,
        "grid.linewidth": 0.6, "axes.spines.top": False, "axes.spines.right": False,
        "legend.frameon": False, "figure.facecolor": "white", "savefig.facecolor": "white",
    })

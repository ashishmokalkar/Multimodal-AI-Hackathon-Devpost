"""Summary figures for the README, built from saved experiment outputs (no model fitting).

Run:  python -m ml.report_figures      -> reports/figures/*.png
"""

from __future__ import annotations

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

from ml.data import ROOT, TARGETS, VESSELS
from ml.viz import C1, C2, DIV_CMAP_R, GRID, INK, INK2, MUTED, SEQ, apply_style

OUT = ROOT / "reports" / "figures"
REP = ROOT / "reports"
GOALS = {"cad": 0.94, "lad": 0.87, "lcx": 0.78, "rca": 0.76}
LABEL = {t: t.upper() for t in TARGETS}
SEQ_R = sns.blend_palette(SEQ[1:], as_cmap=True)  # light (far from best) -> dark (best)


def stage_scores() -> pd.DataFrame:
    base = pd.read_csv(REP / "eda" / "tables" / "baselines.csv")
    base = base[base.target.isin(TARGETS)].groupby("target").auc_mean.max()
    f2 = pd.read_csv(REP / "phase2" / "confirmation.csv").groupby("target").auc_F2.max()
    tuned = pd.Series({t: pd.read_csv(REP / "phase3" / t / "leaderboard.csv").auc.max() for t in TARGETS})
    return pd.DataFrame({"Untuned baseline": base, "+ Feature engineering": f2, "+ Model zoo & tuning": tuned}).loc[TARGETS]


def progress(scores: pd.DataFrame) -> None:
    colors = [SEQ[2], SEQ[4], SEQ[6]]  # ordinal ramp: later stage = darker
    fig, axes = plt.subplots(1, 4, figsize=(12, 2.6))
    for ax, t in zip(axes, TARGETS):
        vals = scores.loc[t].values
        lo, hi = min(vals.min(), GOALS[t]) - 0.012, max(vals.max(), GOALS[t]) + 0.012
        ax.plot(range(3), vals, color=GRID, lw=2, zorder=1)
        for i, (v, c, name) in enumerate(zip(vals, colors, scores.columns)):
            ax.scatter(i, v, s=90, color=c, edgecolor="white", linewidth=2, zorder=3, label=name)
        ax.axhline(GOALS[t], color=INK2, lw=1, ls=(0, (4, 3)))
        ax.text(-0.35, GOALS[t], f"goal {GOALS[t]:.2f}", va="bottom", ha="left", color=INK2, fontsize=8)
        ax.annotate(f"{vals[-1]:.3f}", (2, vals[-1]), xytext=(0, 9), textcoords="offset points", ha="center",
                    color=INK, fontsize=9, fontweight="bold")
        ax.annotate(f"{vals[0]:.3f}", (0, vals[0]), xytext=(0, -14), textcoords="offset points", ha="center",
                    color=INK2, fontsize=8)
        ax.set_title(f"{LABEL[t]}   (+{vals[-1] - vals[0]:.3f})")
        ax.set_xticks([]); ax.set_xlim(-0.4, 2.4); ax.set_ylim(lo, hi)
        ax.grid(axis="x", visible=False)
    axes[0].set_ylabel("CV ROC-AUC")
    handles, labels = axes[0].get_legend_handles_labels()
    fig.legend(handles, labels, loc="lower center", ncol=3, bbox_to_anchor=(0.5, -0.08))
    fig.suptitle("Best cross-validated ROC-AUC after each phase", color=INK, y=1.03)
    fig.tight_layout(); fig.savefig(OUT / "progress.png"); plt.close(fig)


def leaderboard() -> pd.DataFrame:
    auc = pd.DataFrame({t: pd.read_csv(REP / "phase3" / t / "leaderboard.csv").set_index("model").auc for t in TARGETS})
    auc = auc.loc[auc.mean(axis=1).sort_values(ascending=False).index]
    gap = auc - auc.max()
    fig, ax = plt.subplots(figsize=(6.2, 5))
    sns.heatmap(gap, cmap=SEQ_R, vmin=-0.06, vmax=0, annot=auc.map(lambda v: f"{v:.3f}"), fmt="",
                linewidths=2, linecolor="white", cbar_kws={"label": "AUC gap to best model for target"}, ax=ax,
                annot_kws={"fontsize": 9})
    for j, t in enumerate(TARGETS):  # outline the winner per target
        i = auc.index.get_loc(auc[t].idxmax())
        ax.add_patch(plt.Rectangle((j, i), 1, 1, fill=False, edgecolor=C2, lw=2.5))
    ax.set_xticklabels([LABEL[t] for t in TARGETS]); ax.set_ylabel(""); ax.set_xlabel(""); ax.grid(False)
    ax.set_title("Tuned model leaderboard (ROC-AUC, repeats r5–r9)\norange box = best per target")
    fig.savefig(OUT / "leaderboard_heatmap.png"); plt.close(fig)
    return auc


def feature_ablation() -> None:
    s = pd.read_csv(REP / "phase2" / "candidate_summary.csv")
    s["feature"] = np.where(s["mode"] == "replace", s.candidate + " (replace)", s.candidate)
    delta = s.pivot(index="feature", columns="target", values="mean_delta")[TARGETS]
    sel = s.pivot(index="feature", columns="target", values="selected")[TARGETS]
    delta = delta.loc[delta.mean(axis=1).sort_values(ascending=False).index]
    sel = sel.loc[delta.index]
    annot = delta.map(lambda v: f"{v:+.3f}") + sel.map(lambda k: " ●" if k else "")
    fig, ax = plt.subplots(figsize=(6.4, 6))
    sns.heatmap(delta, cmap=DIV_CMAP_R, center=0, vmin=-0.02, vmax=0.02, annot=annot, fmt="", linewidths=2,
                linecolor="white", cbar_kws={"label": "mean ΔAUC vs F1 (3 models)"}, ax=ax, annot_kws={"fontsize": 8})
    ax.set_xticklabels([LABEL[t] for t in TARGETS]); ax.set_ylabel(""); ax.set_xlabel(""); ax.grid(False)
    ax.set_title("Engineered feature ablation (screening repeats r0–r4)\n● = kept in F2 for that target")
    fig.savefig(OUT / "feature_ablation.png"); plt.close(fig)


def vessel_vs_cad() -> None:
    b = pd.read_csv(REP / "eda" / "tables" / "baselines.csv")
    best = b.groupby("target").auc_mean.max()
    allp = [best[v] for v in VESSELS]
    within = [best[f"{v}|cad=1"] for v in VESSELS]
    x = np.arange(len(VESSELS)); w = 0.36
    fig, ax = plt.subplots(figsize=(6, 3.2))
    for off, vals, c, lab in ((-w / 2, allp, C1, "All 303 patients"), (w / 2, within, C2, "CAD patients only (n=216)")):
        ax.bar(x + off, vals, width=w - 0.04, color=c, label=lab)
        for xi, v in zip(x + off, vals):
            ax.text(xi, v + 0.008, f"{v:.2f}", ha="center", color=INK2, fontsize=8)
    ax.axhline(0.5, color=MUTED, lw=1, ls=(0, (4, 3)))
    ax.text(2.55, 0.5, "chance", va="center", color=MUTED, fontsize=8)
    ax.set_xticks(x, [v.upper() for v in VESSELS]); ax.set_ylim(0.4, 0.95); ax.set_ylabel("CV ROC-AUC")
    ax.set_title("Vessel models mostly detect CAD, not which artery")
    ax.legend(loc="upper right"); ax.grid(axis="x", visible=False)
    fig.savefig(OUT / "vessel_vs_cad.png"); plt.close(fig)



def main() -> None:
    apply_style()
    OUT.mkdir(parents=True, exist_ok=True)
    scores = stage_scores()
    progress(scores)
    leaderboard()
    feature_ablation()
    vessel_vs_cad()
    print(scores.round(3).to_string())
    print(f"wrote {sorted(p.name for p in OUT.glob('*.png'))}")


if __name__ == "__main__":
    main()

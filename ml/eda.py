"""Exploratory data analysis for the Z-Alizadeh Sani extension dataset.

Run:  python -m ml.eda
Writes tables to reports/eda/tables/ and figures to reports/eda/figures/.
Findings and their modelling implications are written up in reports/EDA.md.
"""

from __future__ import annotations

import json
import warnings
from itertools import combinations

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from scipy import stats
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import mutual_info_classif
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, brier_score_loss, f1_score,
                             roc_auc_score)
from sklearn.model_selection import RepeatedStratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from statsmodels.stats.multitest import multipletests
from statsmodels.stats.outliers_influence import variance_inflation_factor
from xgboost import XGBClassifier

from ml.data import FEATURE_GROUPS, FEATURES, ROOT, TARGETS, VESSELS, load_clean
from ml.viz import C1, C2, C3, DIV_CMAP as DIV, GRID, INK, INK2, SEQ, apply_style

warnings.filterwarnings("ignore")
OUT = ROOT / "reports" / "eda"
TAB, FIG = OUT / "tables", OUT / "figures"
SEED = 42

apply_style()

CONTINUOUS = ["age", "weight", "height", "bmi", "bp", "pr", "fbs", "cr", "tg", "ldl", "hdl", "bun",
              "esr", "hb", "k", "na", "wbc", "lymph", "neut", "plt", "ef_tte"]
ORDINAL = ["function_class", "region_rwma", "vhd"]
BINARY = [f for f in FEATURES if f not in CONTINUOUS + ORDINAL]

# Features that also exist (directly or via simple mapping) in UCI Heart Disease raw files.
UCI_OVERLAP = ["age", "sex_male", "bp", "pr", "typical_chest_pain", "atypical", "nonanginal",
               "fbs", "htn", "dm", "current_smoker", "fh", "lvh", "st_depression", "st_elevation",
               "t_inversion", "ef_tte"]


def log(title: str, obj=None) -> None:
    print(f"\n=== {title}")
    if obj is not None:
        print(obj.to_string() if hasattr(obj, "to_string") else obj)


def save(df: pd.DataFrame, name: str) -> None:
    df.to_csv(TAB / f"{name}.csv", float_format="%.4f")


# --------------------------------------------------------------------------- models
def models() -> dict:
    return {
        "logreg": make_pipeline(StandardScaler(), LogisticRegression(C=0.1, max_iter=5000)),
        "random_forest": RandomForestClassifier(n_estimators=300, min_samples_leaf=2, n_jobs=-1,
                                                random_state=SEED),
        "xgboost": XGBClassifier(n_estimators=300, max_depth=3, learning_rate=0.05, subsample=0.8,
                                 colsample_bytree=0.7, eval_metric="logloss", random_state=SEED,
                                 n_jobs=-1, verbosity=0),
    }


def cv_scores(model, X: np.ndarray, y: np.ndarray, n_repeats: int = 10, train_frac: float = 1.0,
              seed: int = SEED) -> dict:
    """Repeated stratified 5-fold CV; returns mean/std of fold metrics and pooled OOF AUC."""
    rskf = RepeatedStratifiedKFold(n_splits=5, n_repeats=n_repeats, random_state=seed)
    rng = np.random.default_rng(seed)
    rows = []
    for tr, te in rskf.split(X, y):
        if train_frac < 1.0:  # stratified subsample of the training fold (learning curves)
            keep = np.concatenate([rng.choice(tr[y[tr] == c], max(2, int(round(train_frac * (y[tr] == c).sum()))),
                                              replace=False) for c in (0, 1)])
            tr = keep
        m = clone(model).fit(X[tr], y[tr])
        p = m.predict_proba(X[te])[:, 1]
        pred = (p >= 0.5).astype(int)
        rows.append({"auc": roc_auc_score(y[te], p), "accuracy": accuracy_score(y[te], pred),
                     "balanced_acc": balanced_accuracy_score(y[te], pred), "f1": f1_score(y[te], pred),
                     "brier": brier_score_loss(y[te], p)})
    r = pd.DataFrame(rows)
    return {**{f"{k}_mean": v for k, v in r.mean().items()}, **{f"{k}_std": v for k, v in r.std().items()}}


# --------------------------------------------------------------------------- sections
def overview(df: pd.DataFrame) -> dict:
    info = {"n_rows": len(df), "n_features": len(FEATURES), "n_continuous": len(CONTINUOUS),
            "n_ordinal": len(ORDINAL), "n_binary": len(BINARY)}
    log("Overview", pd.Series(info))
    # Is the file sorted by label? (matters for any un-shuffled split)
    order = {t: stats.spearmanr(np.arange(len(df)), df[t])[0] for t in TARGETS}
    blocks = df[TARGETS].groupby(np.arange(len(df)) // 50).mean()
    log("Row order vs target (Spearman rho)", pd.Series(order).round(3))
    log("Target prevalence per block of 50 rows", blocks.round(2))
    save(blocks, "row_order_prevalence")
    return {**info, "row_order_rho": order}


def targets(df: pd.DataFrame) -> None:
    prev = df[TARGETS].agg(["sum", "mean"]).T
    log("Target prevalence", prev)
    co = pd.DataFrame({a: [((df[a] == 1) & (df[b] == 1)).sum() for b in TARGETS] for a in TARGETS}, index=TARGETS)
    phi = df[TARGETS].corr()
    log("Target co-occurrence counts", co)
    log("Target correlation (phi)", phi.round(3))
    any_v = df[VESSELS].max(axis=1)
    log("CAD vs any stenotic vessel", pd.crosstab(df["cad"], any_v, rownames=["cad"], colnames=["any_vessel"]))
    combos = df[VESSELS].astype(str).agg("".join, axis=1).map(
        lambda s: "+".join(v.upper() for v, c in zip(VESSELS, s) if c == "1") or "none")
    combo_counts = combos.value_counts()
    log("Vessel pattern counts", combo_counts)
    # P(vessel | CAD)
    cond = df[df.cad == 1][VESSELS].mean()
    log("P(vessel stenotic | CAD=1)", cond.round(3))
    save(co, "target_cooccurrence"); save(phi, "target_phi"); save(combo_counts.to_frame("n"), "vessel_patterns")

    fig, ax = plt.subplots(figsize=(6, 3))
    ax.barh(combo_counts.index[::-1], combo_counts.values[::-1], color=C1, height=0.6)
    for i, v in enumerate(combo_counts.values[::-1]):
        ax.text(v + 1, i, str(v), va="center", color=INK2)
    ax.set_title("Vessel stenosis patterns (n patients)")
    ax.grid(axis="y", visible=False)
    fig.savefig(FIG / "vessel_patterns.png"); plt.close(fig)


def feature_profiles(df: pd.DataFrame) -> None:
    X = df[FEATURES]
    bin_prev = X[BINARY].mean().sort_values()
    log("Binary feature prevalence (rare < 5% flagged)", bin_prev.round(3))
    desc = X[CONTINUOUS].describe(percentiles=[.01, .25, .5, .75, .99]).T
    desc["skew"] = X[CONTINUOUS].skew()
    q1, q3 = X[CONTINUOUS].quantile(.25), X[CONTINUOUS].quantile(.75)
    iqr = q3 - q1
    desc["n_outliers_3iqr"] = ((X[CONTINUOUS] < q1 - 3 * iqr) | (X[CONTINUOUS] > q3 + 3 * iqr)).sum()
    log("Continuous feature summary", desc.round(2))
    save(desc, "continuous_summary"); save(bin_prev.to_frame("prevalence"), "binary_prevalence")
    for c in ORDINAL:
        log(f"{c} counts", X[c].value_counts().sort_index())

    # Distributions by CAD status
    fig, axes = plt.subplots(4, 6, figsize=(15, 9))
    for ax, c in zip(axes.flat, CONTINUOUS):
        for cls, color, label in ((0, C1, "Normal"), (1, C2, "CAD")):
            sns.kdeplot(df.loc[df.cad == cls, c], ax=ax, color=color, lw=2, label=label, cut=0)
        ax.set_title(c); ax.set_xlabel(""); ax.set_ylabel(""); ax.set_yticks([])
    for ax in axes.flat[len(CONTINUOUS):]:
        ax.axis("off")
    axes.flat[0].legend(loc="upper left")
    fig.suptitle("Continuous features by CAD status (density)", color=INK)
    fig.tight_layout(); fig.savefig(FIG / "continuous_by_cad.png"); plt.close(fig)


def consistency_checks(df: pd.DataFrame) -> None:
    bmi_calc = df.weight / (df.height / 100) ** 2
    log("BMI recomputed |diff| max", round(float((bmi_calc - df.bmi).abs().max()), 3))
    log("Obesity vs BMI>=25", pd.crosstab(df.obesity, df.bmi >= 25))
    log("Obesity vs BMI>=30", pd.crosstab(df.obesity, df.bmi >= 30))
    log("DM vs FBS>=126", pd.crosstab(df.dm, df.fbs >= 126))
    log("HTN vs BP>=140", pd.crosstab(df.htn, df.bp >= 140))
    log("DLP vs (LDL>=130 | TG>=150 | HDL<40)",
        pd.crosstab(df.dlp, (df.ldl >= 130) | (df.tg >= 150) | (df.hdl < 40)))
    cp = df.typical_chest_pain + df.atypical + df.nonanginal
    log("Chest pain categories per patient (typical+atypical+nonanginal)", cp.value_counts().sort_index())
    log("Typical x Atypical", pd.crosstab(df.typical_chest_pain, df.atypical))
    log("Neut + Lymph", (df.neut + df.lymph).describe().round(1))
    log("Function class vs dyspnea", pd.crosstab(df.function_class, df.dyspnea))
    log("Smoker current vs ex", pd.crosstab(df.current_smoker, df.ex_smoker))
    log("Region RWMA>0 vs EF<50", pd.crosstab(df.region_rwma > 0, df.ef_tte < 50))
    log("Sex vs height (mean)", df.groupby("sex_male").height.mean().round(1))


def redundancy(df: pd.DataFrame) -> None:
    corr = df[FEATURES].corr(method="spearman")
    pairs = [(a, b, corr.loc[a, b]) for a, b in combinations(FEATURES, 2) if abs(corr.loc[a, b]) >= 0.5]
    pairs = pd.DataFrame(pairs, columns=["a", "b", "spearman"]).sort_values("spearman", key=abs, ascending=False)
    log("Feature pairs with |Spearman| >= 0.5", pairs.round(3))
    save(pairs.set_index(["a", "b"]), "correlated_pairs")
    Z = StandardScaler().fit_transform(df[CONTINUOUS + ORDINAL])
    vif = pd.Series([variance_inflation_factor(Z, i) for i in range(Z.shape[1])], index=CONTINUOUS + ORDINAL)
    log("VIF (continuous+ordinal), top 10", vif.sort_values(ascending=False).head(10).round(1))
    save(vif.to_frame("vif"), "vif")

    fig, ax = plt.subplots(figsize=(13, 11))
    sns.heatmap(corr, cmap=DIV, vmin=-1, vmax=1, center=0, square=True, linewidths=0.3, linecolor="white",
                cbar_kws={"shrink": 0.6, "label": "Spearman correlation"}, ax=ax)
    ax.set_title("Feature correlation (Spearman)"); ax.grid(False)
    fig.savefig(FIG / "feature_correlation.png"); plt.close(fig)


def univariate(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for t in TARGETS:
        y = df[t].values
        mi = mutual_info_classif(df[FEATURES], y, discrete_features=[f in BINARY + ORDINAL for f in FEATURES],
                                 random_state=SEED)
        for f, m in zip(FEATURES, mi):
            x = df[f].values
            auc = roc_auc_score(y, x)
            if f in BINARY:
                p = stats.fisher_exact(pd.crosstab(x, y).values)[1] if len(np.unique(x)) > 1 else 1.0
                eff = x[y == 1].mean() - x[y == 0].mean()
            else:
                p = stats.mannwhitneyu(x[y == 1], x[y == 0]).pvalue
                eff = np.median(x[y == 1]) - np.median(x[y == 0])
            rows.append({"target": t, "feature": f, "auc": auc, "auc_abs": max(auc, 1 - auc),
                         "direction": "+" if auc >= 0.5 else "-", "effect": eff, "p": p, "mutual_info": m})
    u = pd.DataFrame(rows)
    u["q_fdr"] = u.groupby("target").p.transform(lambda p: multipletests(p, method="fdr_bh")[1])
    save(u.set_index(["target", "feature"]), "univariate")
    for t in TARGETS:
        top = u[u.target == t].sort_values("auc_abs", ascending=False).head(15)
        log(f"Top univariate features for {t.upper()}",
            top[["feature", "auc", "direction", "effect", "q_fdr", "mutual_info"]].round(4).set_index("feature"))
        log(f"{t.upper()}: n features with FDR q<0.05", int((u[(u.target == t)].q_fdr < 0.05).sum()))

    piv = u.pivot(index="feature", columns="target", values="auc_abs")[TARGETS]
    piv = piv.loc[piv.max(axis=1).sort_values(ascending=False).index[:30]]
    fig, ax = plt.subplots(figsize=(5, 9))
    sns.heatmap(piv, cmap=sns.blend_palette(SEQ, as_cmap=True), vmin=0.5, vmax=0.8, annot=True, fmt=".2f",
                linewidths=2, linecolor="white", cbar_kws={"label": "univariate AUC (direction-free)"}, ax=ax)
    ax.set_title("Top 30 features: univariate AUC per target"); ax.set_ylabel(""); ax.set_xlabel(""); ax.grid(False)
    fig.savefig(FIG / "univariate_auc_heatmap.png"); plt.close(fig)
    return u


def vessel_specific(df: pd.DataFrame) -> None:
    for v in VESSELS:
        log(f"Region RWMA vs {v.upper()} (row %)", (pd.crosstab(df.region_rwma, df[v], normalize="index") * 100).round(0))
    log("Region RWMA vs number of stenotic vessels",
        pd.crosstab(df.region_rwma, df[VESSELS].sum(axis=1)))
    # Within CAD patients only: what distinguishes which vessel is involved?
    sub = df[df.cad == 1]
    rows = []
    for v in VESSELS:
        for f in FEATURES:
            if sub[f].nunique() > 1:
                auc = roc_auc_score(sub[v], sub[f])
                rows.append({"vessel": v, "feature": f, "auc_abs": max(auc, 1 - auc), "direction": "+" if auc >= .5 else "-"})
    r = pd.DataFrame(rows)
    for v in VESSELS:
        log(f"Within CAD=1 (n={len(sub)}): top features for {v.upper()}",
            r[r.vessel == v].sort_values("auc_abs", ascending=False).head(8).set_index("feature").round(3))
    save(r.set_index(["vessel", "feature"]), "within_cad_vessel_univariate")


def baselines(df: pd.DataFrame) -> pd.DataFrame:
    X = df[FEATURES].values.astype(float)
    rows = []
    for t in TARGETS:
        y = df[t].values
        rows.append({"target": t, "model": "majority_class", "accuracy_mean": max(y.mean(), 1 - y.mean()),
                     "auc_mean": 0.5})
        for name, m in models().items():
            rows.append({"target": t, "model": name, **cv_scores(m, X, y)})
    # Vessel models restricted to CAD patients: how much is "where" vs "whether"?
    sub = df[df.cad == 1]
    for v in VESSELS:
        rows.append({"target": f"{v}|cad=1", "model": "random_forest",
                     **cv_scores(models()["random_forest"], sub[FEATURES].values.astype(float), sub[v].values)})
        rows.append({"target": f"{v}|cad=1", "model": "logreg",
                     **cv_scores(models()["logreg"], sub[FEATURES].values.astype(float), sub[v].values)})
    b = pd.DataFrame(rows).set_index(["target", "model"])
    cols = ["auc_mean", "auc_std", "accuracy_mean", "balanced_acc_mean", "f1_mean", "brier_mean"]
    log("Baseline models: repeated stratified 5-fold x10 (all features)", b[cols].round(3))
    save(b, "baselines")

    plot = b.reset_index()
    plot = plot[plot.target.isin(TARGETS) & (plot.model != "majority_class")]
    fig, ax = plt.subplots(figsize=(7, 3.2))
    w = 0.25
    for i, (mname, color) in enumerate(zip(["logreg", "random_forest", "xgboost"], [C1, C2, C3])):
        d = plot[plot.model == mname].set_index("target").loc[TARGETS]
        x = np.arange(len(TARGETS)) + (i - 1) * w
        ax.bar(x, d.auc_mean, width=w - 0.03, color=color, label=mname)
        ax.errorbar(x, d.auc_mean, yerr=d.auc_std, fmt="none", ecolor=INK2, elinewidth=1, capsize=2)
    ax.set_xticks(range(len(TARGETS)), [t.upper() for t in TARGETS]); ax.set_ylim(0.5, 1.0)
    ax.set_ylabel("ROC-AUC (mean ± fold SD)"); ax.set_title("Untuned baselines, all 55 features")
    ax.legend(ncol=3, loc="upper right"); ax.grid(axis="x", visible=False)
    fig.savefig(FIG / "baseline_auc.png"); plt.close(fig)
    return b


def learning_curves(df: pd.DataFrame) -> None:
    X = df[FEATURES].values.astype(float)
    fracs = [0.2, 0.35, 0.5, 0.65, 0.8, 1.0]
    rows = []
    for t in TARGETS:
        y = df[t].values
        for name in ["logreg", "random_forest"]:
            for f in fracs:
                s = cv_scores(models()[name], X, y, n_repeats=4, train_frac=f)
                rows.append({"target": t, "model": name, "train_frac": f, "n_train": int(round(f * len(y) * 0.8)),
                             "auc": s["auc_mean"], "auc_std": s["auc_std"]})
    lc = pd.DataFrame(rows)
    save(lc.set_index(["target", "model", "train_frac"]), "learning_curves")
    log("Learning curves (AUC by training size)", lc.pivot_table(index=["target", "model"], columns="n_train", values="auc").round(3))

    fig, axes = plt.subplots(1, 4, figsize=(14, 3.2), sharey=True)
    for ax, t in zip(axes, TARGETS):
        for name, color in (("logreg", C1), ("random_forest", C2)):
            d = lc[(lc.target == t) & (lc.model == name)]
            ax.plot(d.n_train, d.auc, color=color, lw=2, marker="o", ms=4, label=name)
        ax.set_title(t.upper()); ax.set_xlabel("training patients")
    axes[0].set_ylabel("CV ROC-AUC"); axes[0].legend(loc="lower right")
    fig.suptitle("Learning curves: does more data help?", color=INK)
    fig.tight_layout(); fig.savefig(FIG / "learning_curves.png"); plt.close(fig)


def group_ablation(df: pd.DataFrame) -> None:
    rows = []
    sets = {f"only:{g}": cols for g, cols in FEATURE_GROUPS.items()}
    sets.update({f"drop:{g}": [f for f in FEATURES if f not in cols] for g, cols in FEATURE_GROUPS.items()})
    sets["uci_overlap"] = UCI_OVERLAP
    sets["all"] = FEATURES
    for t in TARGETS:
        y = df[t].values
        for name, cols in sets.items():
            for mname in ["logreg", "random_forest"]:
                s = cv_scores(models()[mname], df[cols].values.astype(float), y, n_repeats=4)
                rows.append({"target": t, "feature_set": name, "model": mname, "n_features": len(cols),
                             "auc": s["auc_mean"]})
    a = pd.DataFrame(rows)
    best = a.groupby(["target", "feature_set"]).auc.max().unstack(0)[TARGETS]
    order = ["all", "uci_overlap"] + [k for k in sets if k.startswith("only:")] + [k for k in sets if k.startswith("drop:")]
    best = best.loc[order]
    log("Feature-group ablation (best of logreg/RF AUC)", best.round(3))
    save(a.set_index(["target", "feature_set", "model"]), "group_ablation")

    fig, ax = plt.subplots(figsize=(5, 6.5))
    sns.heatmap(best, cmap=sns.blend_palette(SEQ, as_cmap=True), vmin=0.5, vmax=0.95, annot=True, fmt=".2f",
                linewidths=2, linecolor="white", cbar_kws={"label": "CV ROC-AUC"}, ax=ax)
    ax.set_title("Which feature groups carry the signal?"); ax.set_ylabel(""); ax.set_xlabel(""); ax.grid(False)
    ax.set_xticklabels([t.upper() for t in TARGETS])
    fig.savefig(FIG / "group_ablation.png"); plt.close(fig)


def model_importance(df: pd.DataFrame) -> None:
    """Multivariate importance: permutation-free, cheap view via RF impurity + L1-logreg selection."""
    rows = []
    X = df[FEATURES].values.astype(float)
    for t in TARGETS:
        y = df[t].values
        rf = clone(models()["random_forest"]).fit(X, y)
        l1 = make_pipeline(StandardScaler(), LogisticRegression(penalty="l1", C=0.1, solver="liblinear")).fit(X, y)
        coef = l1[-1].coef_[0]
        for f, imp, c in zip(FEATURES, rf.feature_importances_, coef):
            rows.append({"target": t, "feature": f, "rf_importance": imp, "l1_coef": c})
    m = pd.DataFrame(rows)
    save(m.set_index(["target", "feature"]), "multivariate_importance")
    for t in TARGETS:
        d = m[m.target == t]
        log(f"{t.upper()}: L1-logreg (C=0.1) keeps {int((d.l1_coef != 0).sum())} features",
            d[d.l1_coef != 0].sort_values("l1_coef", key=abs, ascending=False).set_index("feature")[["l1_coef", "rf_importance"]].round(3))


def main() -> None:
    TAB.mkdir(parents=True, exist_ok=True)
    FIG.mkdir(parents=True, exist_ok=True)
    df = load_clean()
    summary = overview(df)
    targets(df)
    feature_profiles(df)
    consistency_checks(df)
    redundancy(df)
    univariate(df)
    vessel_specific(df)
    model_importance(df)
    baselines(df)
    learning_curves(df)
    group_ablation(df)
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2, default=float))
    print(f"\nWrote tables to {TAB.relative_to(ROOT)} and figures to {FIG.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

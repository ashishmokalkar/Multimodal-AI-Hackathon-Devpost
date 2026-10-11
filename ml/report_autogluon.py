"""Compare AutoGluon pipelines (works in either env).

Run:  python -m ml.report_autogluon [--stage screen|eval]

screen: every ag_<pipeline>_screen run vs the reference ag_best_screen (repeats r0-r1, paired, corrected SE),
        plus untuned logistic regression on the same folds as the floor the reference advice asks for.
eval:   every ag_<pipeline> run on r5-r9 vs the best phase-3 model, untuned LR (P1 baseline, r5-r9) and default TabPFN.
"""

from __future__ import annotations

import argparse
import json

import pandas as pd

from ml.cv import OOF_DIR, CVResult, load_folds, run_cv
from ml.data import ROOT, TARGETS, load_clean
from ml.evaluate import paired_compare
from ml.features import build

OUT = ROOT / "reports" / "autogluon"
F2 = json.loads((ROOT / "reports" / "phase2" / "f2_feature_sets.json").read_text())["f2"]


def untuned_lr(t: str, repeats: list[str], name: str) -> CVResult:
    """Untuned logistic regression on F2 (same preprocessing as every linear model), computed once and cached."""
    if (OOF_DIR / t / f"{name}.npz").exists():
        return CVResult.load(t, name)
    from ml.models import make

    df = load_clean()
    return run_cv(make("logreg"), build(df, **F2[t]), df[t].values, folds=load_folds(df)[repeats], name=name,
                  target=t, algo="logreg", feature_set="F2", stage="untuned", repeats="-".join([repeats[0], repeats[-1]]))


def row(t, name, res, ref, ref_name) -> dict:
    c = paired_compare(ref.fold_metrics, res.fold_metrics)
    s = res.summary
    return {"target": t, "run": name, "auc": s["auc_mean"], "auc_sd": res.fold_metrics.auc.std(),
            "balanced_acc": s["balanced_acc_mean"], "accuracy": s["accuracy_mean"], "brier": s["brier_mean"],
            "ece": s["ece"], f"vs_{ref_name}": c["diff_mean"], "se": c["diff_se"], "better": c["keep"],
            "worse": c["diff_mean"] < -c["diff_se"]}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", choices=["screen", "eval"], default="screen")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for t in TARGETS:
        if args.stage == "screen":
            runs = sorted(p.stem for p in (OOF_DIR / t).glob("ag_*_screen.npz"))
            if "ag_best_screen" not in runs:
                continue
            ref, ref_name = CVResult.load(t, "ag_best_screen"), "ag_best"
            extra = {"logreg_untuned_screen": untuned_lr(t, ["r0", "r1"], "logreg_untuned_screen")}
        else:
            runs = sorted(p.stem for p in (OOF_DIR / t).glob("ag_*.npz") if not p.stem.endswith("_screen"))
            if not runs:
                continue
            board = pd.read_csv(ROOT / "reports" / "phase3" / t / "leaderboard.csv")
            ref, ref_name = CVResult.load(t, board.iloc[0].run), f"best_phase3"
            extra = {f"phase3:{board.iloc[0].model}": ref,
                     "logreg_untuned_r5r9": untuned_lr(t, [f"r{i}" for i in range(5, 10)], "logreg_untuned_r5r9"),
                     "tabpfn_default": CVResult.load(t, "tp2_tabpfn_F2")}
        for name in runs:
            rows.append(row(t, name, CVResult.load(t, name), ref, ref_name))
        for name, res in extra.items():
            rows.append(row(t, name, res, ref, ref_name))
    out = pd.DataFrame(rows).sort_values(["target", "auc"], ascending=[True, False])
    out.to_csv(OUT / f"{args.stage}.csv", index=False, float_format="%.4f")
    for t, g in out.groupby("target", sort=False):
        print(f"\n[{t}]\n{g.drop(columns='target').round(4).to_string(index=False)}")


if __name__ == "__main__":
    main()

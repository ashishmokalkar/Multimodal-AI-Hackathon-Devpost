"""Plan phase 4: multi-label strategies for LAD / LCX / RCA.

Run:  python -m ml.run_strategies [--n-jobs 25]

For each vessel and each of its top-3 phase-3 models (tuned params, same seed bagging):
  S0 independent (phase-3 run, reused), S1 hierarchical, S2 CAD-stacked, S3 stacked binary relevance.
All runs are scored on the untouched repeats r5-r9 and compared (paired, corrected SE) with the
best S0 model for that vessel. Also reports a localisation AUC: AUC among CAD patients only,
i.e. how well the model says *which* artery rather than *whether* there is disease.
"""

from __future__ import annotations

import argparse
import json

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

from ml.cv import CVResult, load_folds, run_cv
from ml.data import ROOT, TARGETS, VESSELS, load_clean
from ml.evaluate import bootstrap_ci, paired_compare
from ml.features import build
from ml.models import make
from ml.strategies import Hierarchical, Stacked, Upstream, oof_lookup

P3 = ROOT / "reports" / "phase3"
OUT = ROOT / "reports" / "phase4"
F2 = json.loads((ROOT / "reports" / "phase2" / "f2_feature_sets.json").read_text())["f2"]
EVAL = [f"r{i}" for i in range(5, 10)]
TOP_K = 3


def phase3_model(target: str, model: str, run: str):
    params = json.loads((P3 / target / "best_params.json").read_text())[model]
    return make(model, params, n_seeds=5 if run.endswith("seedbag5") else 1)


def localisation_auc(res: CVResult, cad: np.ndarray) -> float:
    m = cad == 1
    return float(np.mean([roc_auc_score(res.y[m], row[m]) for row in res.oof]))


def describe(res: CVResult, cad: np.ndarray) -> dict:
    s = res.summary
    return {"auc": s["auc_mean"], "auc_pooled": bootstrap_ci(res.y, res.oof, n_boot=200).loc["auc", "estimate"],
            "loc_auc": localisation_auc(res, cad), "brier": s["brier_mean"], "ece": s["ece"]}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-jobs", type=int, default=-1)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    df = load_clean()
    folds = load_folds(df)[EVAL]
    X = {t: build(df, **F2[t]) for t in TARGETS}
    y = {t: df[t].values for t in TARGETS}
    diseased = df[VESSELS].max(axis=1).values
    boards = {t: pd.read_csv(P3 / t / "leaderboard.csv") for t in TARGETS}

    cad_best = boards["cad"].iloc[0]
    cad_lookup = oof_lookup(folds, CVResult.load("cad", cad_best.run).oof)
    # Upstream feature models: tuned elastic-net LR per target (fast, well-behaved logits).
    upstream = {t: Upstream(t, phase3_model(t, "logreg", boards[t].set_index("model").loc["logreg", "run"]), X[t], y[t])
                for t in TARGETS}
    print(f"P(CAD) for S1 from {cad_best.run} (AUC {cad_best.auc:.3f}); upstream features from tuned logreg", flush=True)

    rows, choice = [], {}
    for v in VESSELS:
        board = boards[v]
        best_s0 = CVResult.load(v, board.iloc[0].run)
        rows.append({"vessel": v, "model": board.iloc[0].model, "strategy": "S0", "run": best_s0.name,
                     **describe(best_s0, y["cad"]), "vs_best_S0": 0.0, "se": np.nan, "keep": False})
        candidates = []
        for _, m in board.head(TOP_K).iterrows():
            model = phase3_model(v, m.model, m.run)
            strategies = {
                "S1": Hierarchical(model, diseased, cad_lookup=cad_lookup),
                "S2": Stacked(model, [upstream["cad"]]),
                "S3": Stacked(model, [upstream[t] for t in TARGETS if t != v]),
            }
            s0 = CVResult.load(v, m.run)
            for sname, fp in strategies.items():
                res = run_cv(fp, X[v], y[v], folds=folds, name=f"p4_{m.model}_{sname}", target=v, n_jobs=args.n_jobs,
                             algo=m.model, feature_set="F2", strategy=sname, repeats="r5-r9")
                c_best = paired_compare(best_s0.fold_metrics, res.fold_metrics)
                c_own = paired_compare(s0.fold_metrics, res.fold_metrics)
                row = {"vessel": v, "model": m.model, "strategy": sname, "run": res.name, **describe(res, y["cad"]),
                       "vs_own_S0": c_own["diff_mean"], "vs_best_S0": c_best["diff_mean"], "se": c_best["diff_se"],
                       "keep": c_best["keep"]}
                rows.append(row)
                candidates.append((row, res))
                print(f"[{v}] {m.model:13s} {sname}: auc {row['auc']:.4f} loc {row['loc_auc']:.3f} "
                      f"vs own S0 {row['vs_own_S0']:+.4f} vs best S0 {row['vs_best_S0']:+.4f} keep={row['keep']}",
                      flush=True)
        kept = [r for r, _ in candidates if r["keep"]]
        win = max(kept, key=lambda r: r["auc"]) if kept else rows[[r["vessel"] for r in rows].index(v)]
        choice[v] = {"strategy": win["strategy"], "model": win["model"], "run": win["run"], "auc": win["auc"]}

    table = pd.DataFrame(rows)
    table.to_csv(OUT / "strategy_results.csv", index=False, float_format="%.4f")
    (OUT / "strategy_choice.json").write_text(json.dumps(choice, indent=2))
    cols = ["vessel", "model", "strategy", "auc", "auc_pooled", "loc_auc", "brier", "ece", "vs_own_S0", "vs_best_S0", "se", "keep"]
    print("\n" + table[cols].round(4).to_string(index=False))
    print("\nChosen per vessel:", json.dumps(choice, indent=1))


if __name__ == "__main__":
    main()

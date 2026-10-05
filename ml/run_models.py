"""Plan phase 3: model zoo with defaults, Optuna tuning and seed bagging, per target.

Run:  python -m ml.run_models --target lcx            (one target)
      python -m ml.run_models --target lcx --models xgboost catboost --trials-scale 0.5

Protocol (tuning never sees the folds it is scored on):
  * features: F2[target] from reports/phase2/f2_feature_sets.json
  * default:  every model with default params, scored on repeats r5-r9
  * tune:     Optuna TPE maximising mean AUC on repeats r0-r2 (15 folds)
  * tuned:    best params scored on r5-r9, paired comparison vs default
  * seedbag:  top-3 stochastic tuned models averaged over 5 seeds, scored on r5-r9
Outputs go to reports/phase3/<target>/ (per-model results cached in models/, so re-runs resume;
pass --force to recompute); scored runs are logged to reports/experiments.csv
and their OOF predictions are saved for ensembling (plan phase 7).
"""

from __future__ import annotations

import argparse
import json
import time

import optuna
import pandas as pd

from ml.cv import CVResult, load_folds, run_cv
from ml.data import ROOT, TARGETS, load_clean
from ml.evaluate import bootstrap_ci, paired_compare
from ml.features import build
from ml.models import REGISTRY, available, make

OUT = ROOT / "reports" / "phase3"
F2_PATH = ROOT / "reports" / "phase2" / "f2_feature_sets.json"
TUNE, EVAL = [f"r{i}" for i in range(3)], [f"r{i}" for i in range(5, 10)]
TRIALS = {"logreg": 60, "svm_rbf": 50, "knn": 30, "gnb": 20, "random_forest": 40, "extra_trees": 40,
          "xgboost": 60, "lightgbm": 60, "catboost": 40, "ebm": 12}

optuna.logging.set_verbosity(optuna.logging.WARNING)


def tune(name: str, X, y, folds, n_trials: int, n_jobs: int, seed: int = 0) -> tuple[dict, float]:
    def objective(trial):
        params = REGISTRY[name].space(trial)
        fm = run_cv(make(name, params), X, y, folds=folds, name="tune", target="tune", save=False, log=False,
                    n_jobs=n_jobs).fold_metrics
        return fm.auc.mean()

    study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=seed))
    study.optimize(objective, n_trials=n_trials)
    best = {**REGISTRY[name].defaults, **REGISTRY[name].space(optuna.trial.FixedTrial(study.best_params))}
    return best, study.best_value


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True, choices=TARGETS)
    ap.add_argument("--models", nargs="*", default=None)
    ap.add_argument("--trials-scale", type=float, default=1.0)
    ap.add_argument("--n-jobs", type=int, default=-1, help="parallel CV folds")
    ap.add_argument("--force", action="store_true", help="ignore cached per-model results and re-run")
    args = ap.parse_args()

    t = args.target
    out = OUT / t
    out.mkdir(parents=True, exist_ok=True)
    df = load_clean()
    folds = load_folds(df)
    f2 = json.loads(F2_PATH.read_text())["f2"][t]
    X, y = build(df, **f2), df[t].values
    names = [n for n in (args.models or REGISTRY) if available(n)]
    print(f"[{t}] {X.shape[1]} features; models: {names}", flush=True)

    rows, scored = [], {}
    cache_dir = out / "models"
    cache_dir.mkdir(exist_ok=True)
    for name in names:
        cache = cache_dir / f"{name}.json"
        if cache.exists() and not args.force:  # resume: reuse finished models
            c = json.loads(cache.read_text())
            rows.append(c["row"])
            scored[name] = (CVResult.load(t, c["run"]), c["params"])
            print(f"[{t}] {name}: cached ({c['run']})", flush=True)
            continue
        t0 = time.time()
        default = run_cv(make(name), X, y, folds=folds[EVAL], name=f"p3_{name}_default", target=t, n_jobs=args.n_jobs,
                         algo=name, feature_set="F2", strategy="S0", stage="default", repeats="r5-r9")
        row = {"model": name, "auc_default": default.summary["auc_mean"]}
        if REGISTRY[name].space is not None:
            best, tune_auc = tune(name, X, y, folds[TUNE], max(5, int(TRIALS.get(name, 30) * args.trials_scale)), args.n_jobs)
            tuned = run_cv(make(name, best), X, y, folds=folds[EVAL], name=f"p3_{name}_tuned", target=t, n_jobs=args.n_jobs,
                           algo=name, feature_set="F2", strategy="S0", stage="tuned", repeats="r5-r9", params=best)
            c = paired_compare(default.fold_metrics, tuned.fold_metrics)
            row.update({"auc_tune_r0r2": tune_auc, "auc_tuned": tuned.summary["auc_mean"], "tuned_vs_default": c["diff_mean"],
                        "tuned_vs_default_se": c["diff_se"], "tuning_kept": c["keep"]})
            # Keep the tuned params only if they are not worse than defaults on the eval repeats.
            scored[name] = (tuned, best) if c["diff_mean"] >= 0 else (default, REGISTRY[name].defaults)
        else:
            scored[name] = (default, REGISTRY[name].defaults)
        row["seconds"] = round(time.time() - t0)
        rows.append(row)
        cache.write_text(json.dumps({"row": row, "run": scored[name][0].name, "params": scored[name][1]},
                                    indent=2, default=str))
        print(f"[{t}] {name}: {json.dumps({k: round(v, 4) if isinstance(v, float) else v for k, v in row.items()})}",
              flush=True)

    # Include models cached by earlier invocations (e.g. when re-running a subset with --models)
    for c in sorted(cache_dir.glob("*.json")):
        if c.stem not in scored and c.stem in REGISTRY:
            cached = json.loads(c.read_text())
            rows.append(cached["row"])
            scored[c.stem] = (CVResult.load(t, cached["run"]), cached["params"])

    # Seed bagging for the top-3 stochastic models
    ranked = sorted(scored, key=lambda n: scored[n][0].summary["auc_mean"], reverse=True)
    for name in [n for n in ranked if REGISTRY[n].stochastic][:3]:
        base, params = scored[name]
        row = next(r for r in rows if r["model"] == name)
        if "auc_seedbag5" in row:  # already evaluated in a previous (cached) run
            continue
        bag = run_cv(make(name, params, n_seeds=5), X, y, folds=folds[EVAL], name=f"p3_{name}_seedbag5", target=t, n_jobs=args.n_jobs,
                     algo=name, feature_set="F2", strategy="S0", stage="seedbag5", repeats="r5-r9", params=params)
        c = paired_compare(base.fold_metrics, bag.fold_metrics)
        row.update({"auc_seedbag5": bag.summary["auc_mean"], "seedbag_vs_single": c["diff_mean"]})
        if c["diff_mean"] > 0:
            scored[name] = (bag, params)
        (cache_dir / f"{name}.json").write_text(json.dumps({"row": row, "run": scored[name][0].name,
                                                             "params": params}, indent=2, default=str))
        print(f"[{t}] seedbag {name}: {bag.summary['auc_mean']:.4f} (delta {c['diff_mean']:+.4f})", flush=True)

    # Leaderboard with bootstrap CIs on the best configuration per model
    board = []
    for name, (res, _) in scored.items():
        s, ci = res.summary, bootstrap_ci(res.y, res.oof, n_boot=1000)
        # pooled AUC = AUC over each repeat's concatenated OOF predictions; a large gap to the fold mean
        # means the probability scale drifts between folds (unstable / badly calibrated model).
        board.append({"model": name, "run": res.name, "auc": s["auc_mean"], "auc_pooled": ci.loc["auc", "estimate"],
                      "unstable": s["auc_mean"] - ci.loc["auc", "estimate"] > 0.03, "auc_ci_low": ci.loc["auc", "ci_low"],
                      "auc_ci_high": ci.loc["auc", "ci_high"], "accuracy": s["accuracy_mean"],
                      "balanced_acc": s["balanced_acc_mean"], "f1": s["f1_mean"], "brier": s["brier_mean"],
                      "ece": s["ece"]})
    board = pd.DataFrame(board).sort_values("auc", ascending=False)
    pd.DataFrame(rows).to_csv(out / "tuning_summary.csv", index=False, float_format="%.4f")
    board.to_csv(out / "leaderboard.csv", index=False, float_format="%.4f")
    (out / "best_params.json").write_text(json.dumps({n: scored[n][1] for n in scored}, indent=2, default=str))
    print(f"\n[{t}] LEADERBOARD (repeats r5-r9)\n{board.round(4).to_string(index=False)}", flush=True)


if __name__ == "__main__":
    main()

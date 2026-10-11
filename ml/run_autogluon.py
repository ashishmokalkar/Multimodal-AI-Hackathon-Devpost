"""AutoGluon pipelines on our fixed folds (run in the separate AutoGluon env: .venv-ag, see requirements-autogluon.txt).

Run:  .venv-ag/Scripts/python -m ml.run_autogluon --stage screen --pipelines best medium --targets cad
      .venv-ag/Scripts/python -m ml.run_autogluon --stage eval   --pipelines final
      plan v2 (GPU, per-label v2 view):  ... --tag ag2 --gpus 1 --pipelines fam_tabicl fam_cat ...

Nested by construction: our outer folds are the test sets; every AutoGluon choice (model selection, bagging,
stacking weights, early stopping, HPO) happens inside the outer training fold via AutoGluon's own k-fold bagging.
  screen: repeats r0-r1 (10 folds) to compare pipelines, each varying one part of the ML pipeline;
  eval:   repeats r5-r9 (25 folds), the same untouched repeats every other model is reported on.
Each outer-fold fit is cached (data/interim/autogluon/cache), so runs resume. Results go to the shared OOF store
and reports/experiments.csv as ag_<pipeline>[_screen], comparable (paired) with every earlier run.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import tempfile
import time
from pathlib import Path

import numpy as np

from ml.cv import load_folds, run_cv
from ml.data import FEATURES, ROOT, TARGETS, load_clean
from ml.features import build

AG_DIR = ROOT / "data" / "interim" / "autogluon"
F2 = json.loads((ROOT / "reports" / "phase2" / "f2_feature_sets.json").read_text())["f2"]
SCREEN, EVAL = ["r0", "r1"], [f"r{i}" for i in range(5, 10)]

BAG = {"num_bag_folds": 5, "num_bag_sets": 1, "num_stack_levels": 1, "dynamic_stacking": False}
# Each pipeline changes one part of the ML pipeline relative to "best" (the reference).
PIPELINES: dict[str, dict] = {
    # model portfolio / AutoML preset
    "medium": {"features": "F2", "fit": {"presets": "medium_quality"}, "time": 60},
    "best": {"features": "F2", "fit": {"hyperparameters": "zeroshot", **BAG}, "time": 150},
    "best_v150": {"features": "F2", "fit": {"hyperparameters": "zeroshot_2025_12_18_cpu", **BAG, "num_stack_levels": 0},
                  "time": 150},
    "tabfm": {"features": "F2", "fit": {"hyperparameters": "zeroshot_2025_tabfm", **BAG, "num_stack_levels": 0}, "time": 600},
    "commercial": {"features": "F2", "fit": {"hyperparameters": "commercial_2026_08_05", **BAG, "num_stack_levels": 0},
                   "time": 600},  # foundation models are slow on CPU: 300 s left TabICL / Mitra / RealMLP untrained
    "interpretable": {"features": "F2", "fit": {"hyperparameters": {"EBM": {}, "LR": {}, "IM_RULEFIT": {}, "IM_FIGS": {}},
                                                **BAG, "num_stack_levels": 0}, "time": 150},
    # feature engineering: AutoGluon's own feature generation on raw columns vs our engineered F2
    "best_F0": {"features": "F0", "fit": {"hyperparameters": "zeroshot", **BAG}, "time": 150},
    # feature selection: AutoGluon permutation-importance feature pruning
    "prune": {"features": "F2", "fit": {"hyperparameters": "zeroshot", **BAG, "feature_prune_kwargs": {}}, "time": 200},
    # tuning: per-model HPO inside the bags instead of the zero-shot portfolio
    "hpo": {"features": "F2", "fit": {"hyperparameters": {"GBM": {}, "CAT": {}, "XGB": {}, "NN_TORCH": {}, "LR": {}},
                                      "hyperparameter_tune_kwargs": {"num_trials": 10, "scheduler": "local",
                                                                     "searcher": "random"}, **BAG}, "time": 300},
    # bagging / stacking depth (deeper than the reference's 5 folds x 1 stack level)
    "stack2": {"features": "F2", "fit": {"hyperparameters": "zeroshot", **BAG, "num_bag_folds": 8, "num_bag_sets": 2,
                                         "num_stack_levels": 2}, "time": 300},
    # stacked union of the families that won screening on some label (Mitra needs a GPU, so it is left out)
    "union": {"features": "F2", "fit": {"hyperparameters": "UNION", **BAG}, "time": 900},
}


def union_hyperparameters() -> dict:
    """EBM + LR (CAD winners), CPU GBMs, and the foundation models that ran on CPU in screening (LCX/RCA winners)."""
    from autogluon.tabular.configs.hyperparameter_configs import get_hyperparameter_config

    tabfm, comm = get_hyperparameter_config("zeroshot_2025_tabfm"), get_hyperparameter_config("commercial_2026_08_05")
    return {"LR": {}, "EBM": {}, "CAT": tabfm["CAT"][:2], "GBM": tabfm["GBM"] + comm["GBM"][:1], "XGB": tabfm["XGB"],
            "REALTABPFN-V2": tabfm["REALTABPFN-V2"], "TABICL": comm["TABICL"], "TABDPT-TURBO": comm["TABDPT-TURBO"],
            "TABM": tabfm["TABM"][:2]}


# Plan v2 S3: every AutoGluon model family bagged alone (5 folds, no stacking) on the per-label v2 feature view.
FAMILIES = ["LR", "KNN", "RF", "XT", "GBM", "CAT", "XGB", "EBM", "NN_TORCH", "FASTAI", "REALMLP", "TABM",
            "FT_TRANSFORMER", "REALTABPFN-V2", "REALTABPFN-V2.5", "TABPFN-2.6", "TABPFN-3", "TABICL", "MITRA",
            "TABDPT", "TABPFNMIX", "NORI", "IM_RULEFIT", "IM_FIGS", "IM_BOOSTEDRULES", "IM_HSTREE", "IM_GREEDYTREE"]
for _fam in FAMILIES:
    PIPELINES[f"fam_{_fam.lower()}"] = {"features": "V2", "fit": {"hyperparameters": {_fam: {}}, **BAG,
                                                                  "num_stack_levels": 0},
                                        "time": 1200 if _fam == "MITRA" else 600}   # Mitra fine-tunes: ~8 min/fold


# Plan v2 S4/S5: per-label compositions = union of the top-k single families (by their r0-r1 screen AUC), bagged and
# optionally stacked; then one-change variants of each label's best composition (tuning, imbalance, metric, bagging,
# stacking). "TOP:k" and "BESTCOMP" are resolved per target in `resolve`.
COMPOSITIONS = {"comp6_L0": (6, 0), "comp6_L1": (6, 1), "comp10_L1": (10, 1)}
for _name, (_k, _lvl) in COMPOSITIONS.items():
    PIPELINES[_name] = {"features": "V2", "fit": {"hyperparameters": f"TOP:{_k}", **BAG, "num_stack_levels": _lvl},
                        "time": 1200}
# Not repeated here (each composition already costs 20-120 min per label on this laptop): AutoGluon HPO (every family
# was tuned in S3, AutoGluon HPO lost to the portfolio in the CPU screen and needs Ray memory), AutoGluon calibration
# (S8 compares five calibrators nested), and feature pruning (S2 screened ten in-fold selectors).
VARIANTS = {
    "balanced": {"_sample_weight": "balance_weight"},
    "logloss": {"_eval_metric": "log_loss"},
    "bag10x3": {"num_bag_folds": 10, "num_bag_sets": 3},
    "stack2_dystack": {"num_stack_levels": 2, "dynamic_stacking": True},
}
# Families without a GPU build here (LightGBM aborts with "GPU Tree Learner was not enabled"): pinned to the CPU when
# they sit in a composition fitted with --gpus.
CPU_FAMILIES = {"LR", "KNN", "RF", "XT", "GBM", "CAT", "XGB", "EBM", "IM_RULEFIT", "IM_FIGS", "IM_BOOSTEDRULES",
                "IM_HSTREE", "IM_GREEDYTREE"}
for _v in VARIANTS:
    PIPELINES[f"bestcomp_{_v}"] = {"features": "V2", "fit": "BESTCOMP", "variant": _v, "time": 1800}


def _family_ranking(target: str) -> list[str]:
    from ml.cv import OOF_DIR, CVResult

    scores = {}
    for fam in FAMILIES:
        run = f"ag2_fam_{fam.lower()}_screen"
        if (OOF_DIR / target / f"{run}.npz").exists():
            scores[fam] = CVResult.load(target, run).summary["auc_mean"]
    return sorted(scores, key=scores.get, reverse=True)


# Plan v2 S7: a label's k-th best screened ag2 pipeline (by r0-r1 AUC), re-run on further repeats for ensembling.
for _k in (1, 2):
    PIPELINES[f"finalist{_k}"] = {"features": "V2", "fit": f"FINALIST:{_k}", "time": 1800}


def finalist(target: str, k: int) -> str:
    """Name of the label's k-th best ag2 screening pipeline; recorded in finalists.json for the report."""
    from ml.cv import OOF_DIR, CVResult

    path = AG_DIR / "finalists.json"
    chosen = json.loads(path.read_text()) if path.exists() else {}
    key = f"{target}:{k}"
    if key not in chosen:
        scores = {p.stem[len("ag2_"):-len("_screen")]: CVResult.load(target, p.stem).summary["auc_mean"]
                  for p in (OOF_DIR / target).glob("ag2_*_screen.npz")}
        chosen[key] = sorted(scores, key=scores.get, reverse=True)[k - 1]
        path.write_text(json.dumps(chosen, indent=2))
    return chosen[key]


def resolve(spec: dict, target: str) -> dict:
    """Per-target spec: expands TOP:k compositions, BESTCOMP variants and FINALIST:k into concrete arguments."""
    from ml.cv import OOF_DIR, CVResult

    spec = json.loads(json.dumps(spec))
    if isinstance(spec["fit"], str) and spec["fit"].startswith("FINALIST:"):
        return resolve(PIPELINES[finalist(target, int(spec["fit"].split(":")[1]))], target)
    if spec["fit"] == "BESTCOMP":
        comps = {c: CVResult.load(target, f"ag2_{c}_screen").summary["auc_mean"] for c in COMPOSITIONS
                 if (OOF_DIR / target / f"ag2_{c}_screen.npz").exists()}
        base = resolve(PIPELINES[max(comps, key=comps.get)], target)
        over = dict(VARIANTS[spec["variant"]])
        spec.update({k[1:]: over.pop(k) for k in list(over) if k.startswith("_")})   # predictor-level options
        spec["fit"] = {**base["fit"], **over}
    hp = spec["fit"].get("hyperparameters")
    if isinstance(hp, str) and hp.startswith("TOP:"):
        top = [f for f in _family_ranking(target) if f not in ("MITRA",)][: int(hp[4:])]   # Mitra: 8 min/fold
        spec["fit"]["hyperparameters"] = {f: ({"ag_args_fit": {"num_gpus": 0}} if f in CPU_FAMILIES else {}) for f in top}
    return spec


def features(df, target: str, name: str):
    if name == "V2":   # the per-label feature view F* chosen in plan v2 S2 (reports/v2/decisions.json)
        from ml.v2 import fstar

        return fstar(df, target)
    return df[FEATURES] if name == "F0" else build(df, **F2[target])


class AGFold:
    """fit_predict callable for ml.cv.run_cv: one AutoGluon predictor per outer training fold."""

    def __init__(self, pipeline: str, spec: dict, target: str, cpus: int, time_scale: float, gpus: float = 0,
                 tag: str = "ag"):
        self.pipeline, self.spec, self.target, self.cpus, self.time_scale = pipeline, spec, target, cpus, time_scale
        self.gpus, self.tag = gpus, tag

    def __call__(self, X_tr, y_tr, X_te, tr, te) -> np.ndarray:
        from autogluon.tabular import TabularPredictor

        self.spec = resolve(self.spec, self.target)

        key = hashlib.md5(np.sort(te).astype(np.int64).tobytes()).hexdigest()[:12]
        cols = hashlib.md5(",".join(X_tr.columns).encode()).hexdigest()[:8]   # cache is tied to the exact features
        sub = self.pipeline if self.tag == "ag" else f"{self.tag}/{self.pipeline}/{cols}"
        cache = AG_DIR / "cache" / sub / self.target / f"{key}.json"
        if cache.exists():
            return np.array(json.loads(cache.read_text())["p"])
        cache.parent.mkdir(parents=True, exist_ok=True)
        path = tempfile.mkdtemp(dir=AG_DIR / "tmp")
        t0 = time.time()
        try:
            predictor = TabularPredictor(label="__y", eval_metric=self.spec.get("eval_metric", "roc_auc"), path=path,
                                         verbosity=0, sample_weight=self.spec.get("sample_weight"))
            fit = self.spec["fit"]
            predictor.fit(X_tr.assign(__y=y_tr), time_limit=self.spec["time"] * self.time_scale, num_cpus=self.cpus,
                          num_gpus=self.gpus, fit_strategy="sequential",
                          ag_args_ensemble={"fold_fitting_strategy": "sequential_local"},
                          # AutoGluon's pre-fit memory estimate refuses Mitra / TabPFNMix even at 4x headroom, though
                          # they use < 2 GB of GPU memory here; disable the check (actual usage is monitored instead).
                          **({"ag_args_fit": {"ag.max_memory_usage_ratio": 100.0}} if "ag_args_fit" not in fit else {}),
                          **{**self.spec["fit"], **({"hyperparameters": union_hyperparameters()}
                                                    if self.spec["fit"].get("hyperparameters") == "UNION" else {})})
            p = predictor.predict_proba(X_te)[predictor.positive_class].to_numpy()
            board = predictor.leaderboard(silent=True)
            info = {"best": predictor.model_best, "n_models": int(len(board)), "val": float(board.score_val.max()),
                    "seconds": round(time.time() - t0), "models": board.model.tolist(),
                    "failed": sorted(predictor.model_failures(verbose=False).get("model", []))}
        finally:
            shutil.rmtree(path, ignore_errors=True)
        cache.write_text(json.dumps({"p": p.tolist(), **info}))
        return p


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", choices=["screen", "eval"], default="screen")
    ap.add_argument("--pipelines", nargs="*", default=list(PIPELINES))
    ap.add_argument("--targets", nargs="*", default=TARGETS, choices=TARGETS)
    ap.add_argument("--concurrent", type=int, default=3, help="outer folds fitted in parallel")
    ap.add_argument("--cpus", type=int, default=7, help="CPU cores per AutoGluon fit")
    ap.add_argument("--time-scale", type=float, default=1.0, help="multiplier on each pipeline's time limit")
    ap.add_argument("--gpus", type=float, default=0, help="GPUs per AutoGluon fit (folds share the one GPU)")
    ap.add_argument("--tag", default="ag", help="run-name prefix; plan v2 runs use ag2")
    ap.add_argument("--repeats", nargs="*", default=None, help="override the stage's repeats, e.g. r2 r3 r4")
    args = ap.parse_args()
    os.environ.setdefault("TABPFN_DISABLE_TELEMETRY", "1")
    (AG_DIR / "tmp").mkdir(parents=True, exist_ok=True)
    df = load_clean()
    repeats = args.repeats or (SCREEN if args.stage == "screen" else EVAL)
    folds = load_folds(df)[repeats]
    for name in args.pipelines:
        spec = PIPELINES[name] if name in PIPELINES else json.loads((AG_DIR / f"{name}.json").read_text())
        for t in args.targets:
            t0 = time.time()
            suffix = {"screen": "_screen", "eval": ""}[args.stage] if args.repeats is None else "_" + "".join(repeats)
            run = f"{args.tag}_{name}{suffix}"
            try:
                res = run_cv(AGFold(name, spec, t, args.cpus, args.time_scale, args.gpus, args.tag),
                             features(df, t, spec["features"]), df[t].values, folds=folds, name=run, target=t,
                             n_jobs=args.concurrent, algo="autogluon", pipeline=name, feature_set=spec["features"],
                             repeats=f"{repeats[0]}-{repeats[-1]}", gpus=args.gpus)
            except Exception as e:   # one family failing (e.g. no model trains) must not stop the remaining runs
                print(f"[{t}] {run}: FAILED {type(e).__name__}: {str(e)[:200]}", flush=True)
                continue
            print(f"[{t}] {run}: auc {res.summary['auc_mean']:.4f} acc {res.summary['accuracy_mean']:.4f} "
                  f"({(time.time() - t0) / 60:.1f} min)", flush=True)


if __name__ == "__main__":
    main()

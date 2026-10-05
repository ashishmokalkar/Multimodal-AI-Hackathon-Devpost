"""Fixed repeated cross-validation folds, CV runner, OOF store and experiment log.

Every experiment uses the same saved folds (data/processed/folds.csv) so that runs
can be compared fold-by-fold with `evaluate.paired_compare`.

A run is either a sklearn estimator (cloned per fold) or a `fit_predict` callable
`(X_train, y_train, X_test, train_idx, test_idx) -> p_test` for custom strategies
(hierarchical models, chains, external-data pooling, ...).
"""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Union

import numpy as np
import pandas as pd
from joblib import Parallel, delayed
from sklearn.base import BaseEstimator, clone
from sklearn.model_selection import StratifiedKFold

from ml.data import ROOT, VESSELS, load_clean
from ml.evaluate import calibration, metrics, summarize

N_SPLITS = 5
N_REPEATS = 10
SEED = 42
FOLDS_PATH = ROOT / "data" / "processed" / "folds.csv"
OOF_DIR = ROOT / "data" / "processed" / "oof"
EXPERIMENT_LOG = ROOT / "reports" / "experiments.csv"

FitPredict = Callable[[pd.DataFrame, np.ndarray, pd.DataFrame, np.ndarray, np.ndarray], np.ndarray]
Model = Union[BaseEstimator, FitPredict]


def stratification_key(df: pd.DataFrame) -> pd.Series:
    """Vessel pattern (e.g. '101' = LAD+RCA) plus CAD, so every target is balanced per fold."""
    return df["cad"].astype(str) + df[VESSELS].astype(str).agg("".join, axis=1)


def make_folds(df: pd.DataFrame, n_splits: int = N_SPLITS, n_repeats: int = N_REPEATS,
               seed: int = SEED) -> pd.DataFrame:
    key = stratification_key(df)
    # Merge strata too small to stratify (the single CAD-label-conflict patient) into the nearest pattern.
    counts = key.value_counts()
    key = key.where(key.map(counts) >= n_splits, "1" + key.str[1:])
    folds = pd.DataFrame(index=df.index)
    for r in range(n_repeats):
        skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=seed + r)
        col = np.empty(len(df), dtype=int)
        for f, (_, te) in enumerate(skf.split(np.zeros(len(df)), key)):
            col[te] = f
        folds[f"r{r}"] = col
    return folds


def load_folds(df: pd.DataFrame | None = None) -> pd.DataFrame:
    """Load saved folds, creating them on first use."""
    if FOLDS_PATH.exists():
        folds = pd.read_csv(FOLDS_PATH, index_col=0)
    else:
        folds = make_folds(df if df is not None else load_clean())
        FOLDS_PATH.parent.mkdir(parents=True, exist_ok=True)
        folds.to_csv(FOLDS_PATH)
    if df is not None and len(folds) != len(df):
        raise ValueError(f"folds.csv has {len(folds)} rows but data has {len(df)}; delete it to regenerate")
    return folds


def iter_splits(folds: pd.DataFrame, n_repeats: int | None = None):
    for r, col in enumerate(folds.columns[:n_repeats]):
        f_ids = folds[col].values
        for f in np.unique(f_ids):
            yield r, int(f), np.where(f_ids != f)[0], np.where(f_ids == f)[0]


@dataclass
class CVResult:
    name: str
    target: str
    oof: np.ndarray                 # (n_repeats, n_patients) out-of-fold probabilities
    fold_metrics: pd.DataFrame      # one row per (repeat, fold)
    y: np.ndarray
    meta: dict = field(default_factory=dict)

    @property
    def summary(self) -> dict[str, float]:
        s = summarize(self.fold_metrics.drop(columns=["repeat", "fold"]))
        cal = pd.DataFrame([calibration(self.y, row) for row in self.oof]).mean()
        return {**s, **cal.to_dict()}

    def save(self) -> None:
        d = OOF_DIR / self.target
        d.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(d / f"{self.name}.npz", oof=self.oof, y=self.y)
        self.fold_metrics.to_csv(d / f"{self.name}_folds.csv", index=False)

    @classmethod
    def load(cls, target: str, name: str) -> "CVResult":
        d = OOF_DIR / target
        z = np.load(d / f"{name}.npz")
        return cls(name, target, z["oof"], pd.read_csv(d / f"{name}_folds.csv"), z["y"])


def _fit_one(model: Model, X: pd.DataFrame, y: np.ndarray, tr: np.ndarray, te: np.ndarray) -> np.ndarray:
    if isinstance(model, BaseEstimator):
        m = clone(model).fit(X.iloc[tr], y[tr])
        return m.predict_proba(X.iloc[te])[:, 1]
    return np.asarray(model(X.iloc[tr], y[tr], X.iloc[te], tr, te), dtype=float)


def run_cv(model: Model, X: pd.DataFrame, y: np.ndarray, *, name: str, target: str,
           folds: pd.DataFrame | None = None, n_repeats: int | None = None, n_jobs: int = -1,
           save: bool = True, log: bool = True, **meta) -> CVResult:
    """Evaluate `model` on the fixed folds. Folds run in parallel; keep the model single-threaded."""
    folds = load_folds() if folds is None else folds
    splits = list(iter_splits(folds, n_repeats))
    preds = Parallel(n_jobs=n_jobs)(delayed(_fit_one)(model, X, y, tr, te) for _, _, tr, te in splits)

    reps = len({r for r, *_ in splits})
    oof = np.full((reps, len(y)), np.nan)
    rows = []
    for (r, f, _, te), p in zip(splits, preds):
        oof[r, te] = p
        rows.append({"repeat": r, "fold": f, **metrics(y[te], p)})
    result = CVResult(name, target, oof, pd.DataFrame(rows), y, {"n_features": X.shape[1], **meta})
    if save:
        result.save()
    if log:
        log_experiment(result)
    return result


def _git_hash() -> str:
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True,
                              text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


LOG_METRICS = ["auc", "pr_auc", "logloss", "brier", "accuracy", "balanced_acc", "precision", "recall", "f1"]


def log_experiment(result: CVResult) -> None:
    s = result.summary
    row = {
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "git": _git_hash(),
        "target": result.target,
        "name": result.name,
        "n_repeats": result.oof.shape[0],
        "auc_mean": s["auc_mean"], "auc_std": s["auc_std"], "auc_se": s["auc_se"],
        **{f"{m}_mean": s[f"{m}_mean"] for m in LOG_METRICS if m != "auc"},
        "ece": s["ece"], "cal_slope": s["cal_slope"],
        "meta": json.dumps(result.meta, default=str),
    }
    EXPERIMENT_LOG.parent.mkdir(parents=True, exist_ok=True)
    new = pd.DataFrame([row])
    if EXPERIMENT_LOG.exists():
        new = pd.concat([pd.read_csv(EXPERIMENT_LOG), new], ignore_index=True)
    new.to_csv(EXPERIMENT_LOG, index=False, float_format="%.4f")

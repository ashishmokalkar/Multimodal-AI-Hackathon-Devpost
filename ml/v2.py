"""Plan v2 shared pieces: feature views built from a spec, probe models, and the keep rule.

A view spec is a dict, e.g. {"base": "F1", "rare": "keep", "add": ["pretest_prob"], "replace": [], "risk": []}.
Every later stage (and the AutoGluon runner) builds features through `view`, so a decision taken in one
stage (reports/v2/decisions.json) carries forward unchanged.
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin, clone
from sklearn.linear_model import LogisticRegression

from ml.cv import OOF_DIR, CVResult, run_cv
from ml.data import ROOT
from ml.evaluate import paired_compare
from ml.features import build
from ml.preprocess import linear_pipeline

V2 = ROOT / "reports" / "v2"
DECISIONS = V2 / "decisions.json"
SCREEN, TUNE, EVAL = [f"r{i}" for i in range(5)], [f"r{i}" for i in range(3)], [f"r{i}" for i in range(5, 10)]
RARE = ["cva", "chf", "weak_peripheral_pulse", "low_th_ang"]   # < 6 positive patients each
BASE_VIEW = {"base": "F1", "rare": "keep", "add": [], "replace": [], "risk": []}


def decisions() -> dict:
    return json.loads(DECISIONS.read_text()) if DECISIONS.exists() else {}


def save_decision(target: str, key: str, value) -> None:
    d = decisions()
    d.setdefault(target, {})[key] = value
    DECISIONS.parent.mkdir(parents=True, exist_ok=True)
    DECISIONS.write_text(json.dumps(d, indent=2))


def view(df: pd.DataFrame, spec: dict) -> pd.DataFrame:
    """Feature matrix for a view spec (all four labels are always excluded)."""
    spec = {**BASE_VIEW, **spec}
    X = build(df, add=list(spec["add"]), replace=list(spec["replace"]), base=spec["base"])
    if spec["risk"]:
        from ml.risk_scores import risk_scores

        X = X.join(risk_scores(df)[list(spec["risk"])])
    if spec["rare"] == "drop":
        X = X.drop(columns=[c for c in RARE if c in X.columns])
    elif spec["rare"] == "merge":
        present = [c for c in RARE if c in X.columns]
        X = X.drop(columns=present).assign(rare_cv_history=df[present].sum(axis=1))
    return X


class DropTrainRows(ClassifierMixin, BaseEstimator):
    """Drop given patients (by DataFrame index) from the training fold only; test folds are never changed."""

    def __init__(self, model, rows: tuple = ()):
        self.model = model
        self.rows = rows

    def fit(self, X, y):
        keep = ~X.index.isin(list(self.rows))
        self.model_ = clone(self.model).fit(X[keep], np.asarray(y)[keep])
        self.classes_ = self.model_.classes_
        return self

    def predict_proba(self, X):
        return self.model_.predict_proba(X)


class Subsample(ClassifierMixin, BaseEstimator):
    """Train on a stratified random fraction of the training fold (learning curves); test folds are unchanged."""

    def __init__(self, model, fraction: float = 1.0, seed: int = 0):
        self.model = model
        self.fraction = fraction
        self.seed = seed

    def fit(self, X, y):
        y = np.asarray(y)
        rng = np.random.default_rng(self.seed)
        keep = np.concatenate([rng.choice(np.where(y == c)[0], max(2, round(self.fraction * (y == c).sum())),
                                          replace=False) for c in np.unique(y)])
        self.model_ = clone(self.model).fit(X.iloc[keep], y[keep])
        self.classes_ = self.model_.classes_
        return self

    def predict_proba(self, X):
        return self.model_.predict_proba(X)


def probes(linear: dict | None = None) -> dict:
    """Three fixed, untuned probes of different inductive bias: linear, GBM, foundation model."""
    from ml.models import make

    return {"logreg": linear_pipeline(LogisticRegression(C=0.1, max_iter=5000), **(linear or {})),
            "catboost": make("catboost"),
            "tabpfn": make("tabpfn")}


def score(model, X, y, target: str, name: str, folds, n_jobs: int, **meta) -> CVResult:
    """Cached CV run on the given folds (screening runs are saved for reuse but not logged)."""
    if (OOF_DIR / target / f"{name}.npz").exists():
        return CVResult.load(target, name)
    return run_cv(model, X, y, folds=folds, name=name, target=target, n_jobs=n_jobs, log=False, **meta)


def jobs(probe: str) -> int:
    return 1 if probe == "tabpfn" else 20     # TabPFN shares one 8 GB GPU: one process at a time


def compare(base: CVResult, new: CVResult) -> dict:
    c = paired_compare(base.fold_metrics, new.fold_metrics)
    return {"auc": new.summary["auc_mean"], "delta": c["diff_mean"], "se": c["diff_se"], "keep": c["keep"],
            "hurt": c["diff_mean"] < -c["diff_se"]}


def keep_rule(rows: pd.DataFrame) -> bool:
    """Phase-2 rule across probes: mean gain > 0, at least one probe passes 1 corrected SE, none hurt by > 1 SE."""
    return bool(rows.delta.mean() > 0 and rows.keep.any() and not rows.hurt.any())


def fstar(df: pd.DataFrame, target: str) -> pd.DataFrame:
    """The S2 feature view F* for a label."""
    return view(df, decisions()[target]["fstar"])


def wrap(target: str, model, embed: bool = True):
    """Model with the in-fold feature steps S2 adopted for this label (interactions, embeddings, selection)."""
    from sklearn.pipeline import Pipeline

    from ml.selection import StabilitySelection, TopKImportance, TopKMutualInfo
    from ml.v2_fe import PairwiseProducts, TabPFNEmbedding

    d = decisions()[target]
    steps = []
    if d.get("fe3_pairs"):
        steps.append(("pairs", PairwiseProducts(10)))
    if d.get("fe5_embedding") and embed:
        steps.append(("pfnemb", TabPFNEmbedding(8)))
    sel = d.get("selection")
    if sel:
        selector = (StabilitySelection() if sel == "stability" else
                    TopKMutualInfo(int(sel[2:])) if sel.startswith("mi") else TopKImportance(int(sel[2:]), sel[:2]))
        steps.append(("select", selector))
    return Pipeline(steps + [("model", model)]) if steps else model


def best_single(target: str):
    """(name, model) of the label's best single candidate on the screening repeats: the S3 TabPFN choice or the best
    re-tuned classical model, each with the label's S2 in-fold steps."""
    from ml.models import make

    d = decisions()[target]
    cands = {f"classical:{m}": c["screen_auc"] for m, c in d.get("classical", {}).items()}
    if "tabpfn" in d:
        cands["tabpfn"] = d["tabpfn"]["screen_auc"]
    name = max(cands, key=cands.get)
    if name == "tabpfn":
        tp = d["tabpfn"]
        model = (make("tabpfn_ft", {"epochs": 30, "learning_rate": 1e-5}) if tp["finetune"]
                 else make("tabpfn", tp["params"], n_seeds=tp["n_seeds"]))
        return name, wrap(target, model, embed=False)
    c = d["classical"][name.split(":")[1]]
    return name, wrap(target, make(name.split(":")[1], c["params"], n_seeds=c["n_seeds"]))

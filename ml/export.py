"""Plan v2 S9: export each label's champion for the API / dashboard as a cross-fitted model.

Run:  python -m ml.export            -> models/<target>.joblib + models/manifest.json (+ reports/v2/s9/s9_served.csv)

Serving (cross-fitting). Each label's champion pipeline is fitted five times, once per fold of the fixed repeat r0
(each fit sees 4/5 of the 303 patients). A request is scored by a weighted average of the five fold models in which
any fold model that trained on a dataset patient close to the request is down-weighted to zero (Gower distance on the
model inputs; fully excluded within GATE_NEAR, faded out by GATE_FAR; the closest two distinct dataset patients are
0.025 apart). So:
  * a dataset patient, typed in exactly or with small edits (what-if), is scored by the fold model that never saw them;
  * a new patient far from every dataset patient is scored by the average of the five fold models.
A model fitted on all 303 patients is not served: it memorises them (in-sample AUC ~1.0), so any request that matched
or nearly matched a training patient would have returned its label rather than a prediction.

Post-processing, fitted on the champion's r0-r4 out-of-fold scores, i.e. on models of exactly the kind served (each
trained on 4/5 of the patients), so calibration matches the served scores:
  * calibration  Platt scaling per label;
  * consistency  P(vessel) is capped at P(CAD);
  * thresholds   max balanced accuracy, fitted on the capped scores; a vessel is flagged only when CAD is flagged too
                 (hierarchical rule; vessel thresholds are fitted under that rule);
  * conformal    split-conformal quantile (90 %) of 1 - p(true label) on the capped scores, so the "uncertain" flag
                 uses the same numbers the API returns.
Validation (s9_served.csv): the same post-processing fitted per r5-r9 outer fold on that fold's training patients'
r0-r4 scores, applied to its test patients' r5-r9 scores.
Reproducibility: the r0-r4 / r5-r9 champion scores and the RCA stack weights are snapshotted in
models/export_inputs.npz/.json, so the export reruns on a fresh clone (CPU only) without data/processed/oof.
Model choices themselves (decisions.json) came from the full plan-v2 search, including GPU TabPFN runs that are not
needed here. Input: rows in the `ml.data.load_clean()` format (snake_case raw features); feature engineering is row-wise.
"""

from __future__ import annotations

import json
import platform
import time
from dataclasses import dataclass, field

import joblib
import numpy as np
import pandas as pd

from ml.data import ROOT, TARGETS, VESSELS

MODELS = ROOT / "models"
INPUTS = MODELS / "export_inputs"
ALPHA = 0.1
MODEL_VERSION = "cardioclarity-v2.1.0"
DEMO_SEED = 2026
CROSSFIT_REPEAT = "r0"
GATE_NEAR, GATE_FAR = 0.03, 0.05


def _logit(p):
    p = np.clip(np.asarray(p, dtype=float), 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


def _sigmoid(z):
    return 1 / (1 + np.exp(-z))


@dataclass
class ChampionModel:
    target: str
    option: str                                   # e.g. "classical:catboost", "ensemble:lr_stack", "phase3:ebm"
    feature_kind: str                             # "f2" (phase-3 builder) or "fstar" (plan-v2 view)
    feature_spec: dict
    members: dict                                 # name -> fitted estimator
    stack: dict | None = None                     # {"intercept": b, "weights": {name: w}} for an L2 logistic stack
    platt: tuple[float, float] = (1.0, 0.0)       # p_cal = sigmoid(a * logit(raw) + b)
    threshold: float = 0.5
    conformal_q: float = 1.0
    meta: dict = field(default_factory=dict)

    def features(self, df: pd.DataFrame) -> pd.DataFrame:
        if self.feature_kind == "f2":
            from ml.features import build

            return build(df, **self.feature_spec)
        from ml.v2 import view

        return view(df, self.feature_spec)

    def raw_score(self, df: pd.DataFrame) -> np.ndarray:
        return self.raw_score_features(self.features(df))

    def raw_score_features(self, X: pd.DataFrame) -> np.ndarray:
        preds = {n: m.predict_proba(X)[:, 1] for n, m in self.members.items()}
        if self.stack is None:
            return next(iter(preds.values()))
        z = self.stack["intercept"] + sum(w * _logit(preds[n]) for n, w in self.stack["weights"].items())
        return _sigmoid(z)

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        return self.calibrate(self.raw_score(df))

    def calibrate(self, raw: np.ndarray) -> np.ndarray:
        a, b = self.platt
        return _sigmoid(a * _logit(raw) + b)

    def conformal_set(self, p: np.ndarray) -> list[list[int]]:
        return [[lab for lab, s in ((0, pi), (1, 1 - pi)) if s <= self.conformal_q] for pi in np.atleast_1d(p)]


@dataclass
class NeighbourIndex:
    """Gower distance from a request to every dataset patient, and the fold-model weights that follow from it."""

    columns: list[str]
    X: np.ndarray                                 # (n_patients, n_inputs) model inputs of the dataset patients
    span: np.ndarray                              # per-input range (numeric inputs are scaled by it)
    binary: np.ndarray                            # 0/1 inputs count as match / mismatch
    fold_of: np.ndarray                           # cross-fit fold of each dataset patient
    near: float = GATE_NEAR
    far: float = GATE_FAR

    @classmethod
    def build(cls, df: pd.DataFrame, fold_of: np.ndarray) -> "NeighbourIndex":
        columns = [c for c in df.columns if c not in TARGETS]
        X = df[columns].astype(float).values
        binary = np.array([set(np.unique(X[:, j])) <= {0.0, 1.0} for j in range(X.shape[1])])
        span = X.max(0) - X.min(0)
        span[span == 0] = 1.0
        return cls(columns, X, span, binary, np.asarray(fold_of, dtype=int))

    def distances(self, df: pd.DataFrame) -> np.ndarray:
        """(n_rows, n_patients) Gower distance: mean over inputs of |difference| / range (numeric) or mismatch (0/1)."""
        from scipy.spatial.distance import cdist

        Z = df[self.columns].astype(float).values
        num, bin_ = ~self.binary, self.binary
        G = cdist(Z[:, num] / self.span[num], self.X[:, num] / self.span[num], "cityblock")
        if bin_.any():
            G += cdist(Z[:, bin_], self.X[:, bin_], "hamming") * bin_.sum()
        return G / len(self.columns)

    def nearest(self, df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        G = self.distances(df)
        i = G.argmin(1)
        return i, G[np.arange(len(i)), i]

    def weights(self, df: pd.DataFrame) -> np.ndarray:
        """(n_rows, n_folds) weights summing to 1. Fold model k trained on every dataset patient outside fold k; its
        weight is 1 minus how close the request is to the nearest of those patients (1 beyond GATE_FAR, 0 within
        GATE_NEAR). If every fold model saw a close patient, the least-affected ones are used."""
        closeness = np.clip((self.far - self.distances(df)) / (self.far - self.near), 0, 1)
        k_folds = int(self.fold_of.max()) + 1
        seen = np.stack([closeness[:, self.fold_of != k].max(1) for k in range(k_folds)], axis=1)
        w = 1 - seen
        none = w.sum(1) <= 1e-9
        if none.any():
            w[none] = (seen[none] <= seen[none].min(1, keepdims=True) + 1e-12).astype(float)
        return w / w.sum(1, keepdims=True)


@dataclass
class CrossFitModel:
    """One label's served model: five fold models of the champion, weighted per request by NeighbourIndex."""

    target: str
    option: str
    folds: list[ChampionModel]
    index: NeighbourIndex
    threshold: float
    conformal_q: float
    meta: dict = field(default_factory=dict)

    def predict_proba(self, df: pd.DataFrame, weights: np.ndarray | None = None) -> np.ndarray:
        w = self.index.weights(df) if weights is None else weights
        X = self.folds[0].features(df)          # the same row-wise feature view for every fold model
        out = np.zeros(len(df))
        for k, model in enumerate(self.folds):
            rows = np.where(w[:, k] > 0)[0]
            if len(rows):
                out[rows] += w[rows, k] * model.calibrate(model.raw_score_features(X.iloc[rows]))
        return out

    def conformal_set(self, p: np.ndarray) -> list[list[int]]:
        return [[lab for lab, s in ((0, pi), (1, 1 - pi)) if s <= self.conformal_q] for pi in np.atleast_1d(p)]


def predict_all(models: dict, df: pd.DataFrame, uncapped: bool = False):
    """Calibrated probabilities for every label, with P(vessel) capped at P(CAD). With uncapped=True also returns
    the probabilities before the cap."""
    index = getattr(models["cad"], "index", None)
    w = index.weights(df) if index is not None else None
    raw = {t: models[t].predict_proba(df, w) if w is not None else models[t].predict_proba(df) for t in TARGETS}
    out = dict(raw)
    for v in VESSELS:
        out[v] = np.minimum(raw[v], raw["cad"])
    return (out, raw) if uncapped else out


def decide(probs: dict, thresholds: dict) -> dict[str, np.ndarray]:
    """Flags: CAD at its own threshold; a vessel only when it is above its own threshold and CAD is flagged too
    (a narrowed artery is coronary artery disease, so a vessel flag without a CAD flag would contradict itself)."""
    cad = np.asarray(probs["cad"]) >= thresholds["cad"]
    return {"cad": cad, **{v: (np.asarray(probs[v]) >= thresholds[v]) & cad for v in VESSELS}}


def load_models(demo: bool = False, fast: bool = True) -> dict:
    """The exported cross-fitted models (demo is accepted for backwards compatibility; every dataset patient,
    including the demo samples, is now scored by the fold model that never saw them). fast=True swaps in vectorised
    prediction for random/extra-trees forests and RBF SVMs (same numbers; the export checks this)."""
    models = {t: joblib.load(MODELS / f"{t}.joblib") for t in TARGETS}
    if fast:
        for model in models.values():
            for fold in getattr(model, "folds", [model]):
                for member in fold.members.values():
                    _accelerate(member)
    return models


# --------------------------------------------------------------------------------------------- fast prediction
# Serving runs five fold models per label, and sklearn's forests and SVC pay a large per-call / per-tree Python cost
# (a 500-tree forest makes 500 joblib calls for a single row). These replacements compute the same quantities in a few
# vectorised operations. They are attached to loaded instances only (never pickled).
def _forest_proba(self, X):
    X32 = np.ascontiguousarray(np.asarray(X, dtype=np.float32))
    out = np.zeros((len(X32), self.n_classes_))
    for tree in self.estimators_:
        p = tree.tree_.predict(X32)                  # (n, classes), or (n, 1, classes) in older sklearn
        out += p[:, : self.n_classes_] if p.ndim == 2 else p[:, 0, : self.n_classes_]
    return out / len(self.estimators_)


def _svc_decision(self, X):
    from scipy.spatial.distance import cdist

    K = np.exp(-self._gamma * cdist(np.asarray(X, dtype=float), self.support_vectors_, "sqeuclidean"))
    return K @ self.dual_coef_[0] + self.intercept_[0]


_svc_decision.__name__ = "decision_function"      # sklearn's calibration reads the response method by name


def _accelerate(obj, depth: int = 0) -> None:
    """Attach the fast prediction functions to every forest / binary RBF SVC inside a fitted member."""
    from types import MethodType

    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.svm import SVC

    if depth > 6:
        return
    if isinstance(obj, (RandomForestClassifier, ExtraTreesClassifier)) and obj.n_outputs_ == 1:
        obj.predict_proba = MethodType(_forest_proba, obj)
    elif isinstance(obj, SVC) and obj.kernel == "rbf" and len(obj.classes_) == 2:
        obj.decision_function = MethodType(_svc_decision, obj)
    elif isinstance(obj, Pipeline):
        for _, step in obj.steps:
            _accelerate(step, depth + 1)
    elif isinstance(obj, CalibratedClassifierCV):
        for cc in obj.calibrated_classifiers_:
            _accelerate(cc.estimator, depth + 1)
    else:
        for inner in getattr(obj, "models_", []):        # ml.models.SeedBag
            _accelerate(inner, depth + 1)


# --------------------------------------------------------------------------------------------- post-processing
def _bal_acc(flag: np.ndarray, y: np.ndarray) -> float:
    return (flag[y == 1].mean() + (~flag)[y == 0].mean()) / 2


def _grid_threshold(p: np.ndarray, y: np.ndarray, gate: np.ndarray | None = None) -> float:
    """Max balanced accuracy over the same quantile grid as ml.run_v2._threshold, optionally under a gate."""
    grid = np.unique(np.quantile(p, np.linspace(0.02, 0.98, 97)))
    score = [_bal_acc((p >= g) & (gate if gate is not None else True), y) for g in grid]
    return float(grid[int(np.argmax(score))])


def fit_postprocessing(oof: dict, ys: dict, rows: np.ndarray) -> dict:
    """Platt per label, cap, hierarchical thresholds and conformal quantiles, all fitted on the r0-r4 scores of
    `rows` (repeats stacked). Returns {label: {"platt": (a, b), "threshold": t, "q": q}}."""
    from sklearn.linear_model import LogisticRegression

    params, cal = {}, {}
    for t in TARGETS:
        z = _logit(oof[t][:, rows].ravel())
        y_rep = np.tile(ys[t][rows], oof[t].shape[0])
        lr = LogisticRegression(C=1e6).fit(z[:, None], y_rep)
        a, b = float(lr.coef_[0, 0]), float(lr.intercept_[0])
        params[t] = {"platt": (a, b)}
        cal[t] = _sigmoid(a * z + b)
    capped = {t: cal[t] if t == "cad" else np.minimum(cal[t], cal["cad"]) for t in TARGETS}
    y_rep = {t: np.tile(ys[t][rows], oof[t].shape[0]) for t in TARGETS}
    params["cad"]["threshold"] = _grid_threshold(capped["cad"], y_rep["cad"])
    cad_flag = capped["cad"] >= params["cad"]["threshold"]
    for v in VESSELS:
        params[v]["threshold"] = _grid_threshold(capped[v], y_rep[v], gate=cad_flag)
    for t in TARGETS:
        score = np.where(y_rep[t] == 1, 1 - capped[t], capped[t])
        level = min(1.0, np.ceil((len(score) + 1) * (1 - ALPHA)) / len(score))
        params[t]["q"] = float(np.quantile(score, level, method="higher"))
    return params


def apply_postprocessing(raw: dict, params: dict) -> dict:
    cal = {t: _sigmoid(params[t]["platt"][0] * _logit(raw[t]) + params[t]["platt"][1]) for t in TARGETS}
    return {t: cal[t] if t == "cad" else np.minimum(cal[t], cal["cad"]) for t in TARGETS}


def validate_served(df: pd.DataFrame, inputs: dict) -> pd.DataFrame:
    """The served post-processing evaluated on r5-r9: fitted per outer fold on the training patients' r0-r4 scores,
    applied to the test patients' r5-r9 scores. One row per label (means over the 25 outer folds / 5 repeats)."""
    from sklearn.metrics import brier_score_loss, f1_score, precision_score, recall_score, roc_auc_score

    from ml.cv import iter_splits, load_folds
    from ml.evaluate import bootstrap_ci, calibration

    ys = {t: df[t].values for t in TARGETS}
    oof04 = {t: inputs[t]["r0r4"] for t in TARGETS}
    oof59 = {t: inputs[t]["r5r9"] for t in TARGETS}
    eval_folds = load_folds(df)[[f"r{i}" for i in range(5, 10)]]
    served = {t: np.full((5, len(df)), np.nan) for t in TARGETS}
    rows = {t: [] for t in TARGETS}
    for r, _f, tr, te in iter_splits(eval_folds):
        params = fit_postprocessing(oof04, ys, tr)
        p = apply_postprocessing({t: oof59[t][r, te] for t in TARGETS}, params)
        flags = decide(p, {t: params[t]["threshold"] for t in TARGETS})
        for t in TARGETS:
            served[t][r, te] = p[t]
            y, f = ys[t][te], flags[t].astype(int)
            sets = np.column_stack([p[t] <= params[t]["q"], 1 - p[t] <= params[t]["q"]])
            rows[t].append({"fold_auc": roc_auc_score(y, p[t]), "threshold": params[t]["threshold"], "accuracy": (f == y).mean(),
                            "balanced_acc": _bal_acc(f.astype(bool), y), "f1": f1_score(y, f, zero_division=0),
                            "precision": precision_score(y, f, zero_division=0),
                            "recall": recall_score(y, f, zero_division=0),
                            "coverage": sets[np.arange(len(te)), y].mean(), "avg_set_size": sets.sum(1).mean(),
                            "singleton_rate": (sets.sum(1) == 1).mean()})
    out = []
    for t in TARGETS:
        y = ys[t]
        ci = bootstrap_ci(y, served[t]).loc["auc"]
        cal_stats = pd.DataFrame([calibration(y, row) for row in served[t]]).mean()
        folds_mean = pd.DataFrame(rows[t]).mean()
        # AUC as reported throughout the project: mean over the 25 r5-r9 test folds (CI: patient bootstrap)
        out.append({"target": t, "auc": float(folds_mean.pop("fold_auc")),
                    "auc_ci_low": float(ci.ci_low), "auc_ci_high": float(ci.ci_high),
                    "brier": float(np.mean([brier_score_loss(y, row) for row in served[t]])),
                    **cal_stats.to_dict(), **folds_mean.to_dict()})
    return pd.DataFrame(out)


# --------------------------------------------------------------------------------------------- export inputs
def _r5r9_run(t: str, option: str) -> str:
    if option.startswith("phase3:"):
        return pd.read_csv(ROOT / "reports" / "phase3" / t / "leaderboard.csv").iloc[0].run
    if option.startswith("classical:"):
        return f"v2e_classical_{option.split(':')[1]}"
    return f"v2s7_{option.split(':')[1]}"


def _champion_spec(t: str, stack: dict | None):
    """(option, feature_kind, spec, {member: unfitted estimator}) from the committed decisions and reports."""
    from ml.models import make
    from ml.v2 import decisions, wrap

    d = decisions()[t]
    option = d["champion"]
    if option.startswith("phase3:"):
        model = option.split(":", 1)[1]
        board = pd.read_csv(ROOT / "reports" / "phase3" / t / "leaderboard.csv").iloc[0]
        params = json.loads((ROOT / "reports" / "phase3" / t / "best_params.json").read_text())[model]
        f2 = json.loads((ROOT / "reports" / "phase2" / "f2_feature_sets.json").read_text())["f2"][t]
        return option, "f2", f2, {model: make(model, params, n_seeds=5 if board.run.endswith("seedbag5") else 1)}

    def member(name):
        m = name.split(":", 1)[1]
        c = d["classical"][m]
        return wrap(t, make(m, c["params"], n_seeds=c["n_seeds"]))

    names = [option] if option.startswith("classical:") else list(stack["weights"])
    return option, "fstar", d["fstar"], {n: member(n) for n in names}


def _champion_oof(df, t: str):
    """(r0-r4 OOF (5, n), stack or None) of the champion, rebuilt from data/processed/oof (full pipeline only)."""
    from ml.cv import CVResult, load_folds
    from ml.run_v2 import candidate_pool, ensemble_predict, ensemble_weights
    from ml.v2 import decisions

    option, y = decisions()[t]["champion"], df[t].values
    if option.startswith("phase3:"):
        board = pd.read_csv(ROOT / "reports" / "phase3" / t / "leaderboard.csv").iloc[0]
        return CVResult.load(t, f"{board.run}_r0r4").oof, None
    pool = candidate_pool(df, t, load_folds(df)[[f"r{i}" for i in range(5, 10)]], build_eval=False)
    S = {n: v[0].oof for n, v in pool.items()}
    if option.startswith("classical:"):
        return S[option], None
    method = option.split(":", 1)[1]
    if method != "lr_stack":
        raise NotImplementedError(f"export of ensemble method {method}")
    w = ensemble_weights(method, S, y, np.arange(len(y)))
    names = [n for n in w if n != "__intercept__"]
    if any(not n.startswith("classical:") for n in names):
        raise NotImplementedError("stack members outside the classical zoo")
    oof = ensemble_predict(method, w, {n: S[n].ravel() for n in names}).reshape(S[names[0]].shape)
    return oof, {"intercept": w["__intercept__"], "weights": {n: w[n] for n in names}}


def _champion_parts(df, t: str):
    """(feature_kind, spec, {member: unfitted estimator}, stack or None, r0-r4 OOF raw scores (5, n)); used by S9c."""
    oof, stack = _champion_oof(df, t)
    _option, kind, spec, members = _champion_spec(t, stack)
    return kind, spec, members, stack, oof


def export_inputs(df: pd.DataFrame, rebuild: bool = False) -> dict:
    """{label: {"r0r4": (5, n), "r5r9": (5, n), "stack": dict | None}}. Built from data/processed/oof when it exists
    (and snapshotted to models/export_inputs.*), otherwise read from the committed snapshot."""
    from ml.cv import OOF_DIR, CVResult
    from ml.v2 import decisions

    npz, meta = INPUTS.with_suffix(".npz"), INPUTS.with_suffix(".json")
    have_oof = all((OOF_DIR / t).exists() for t in TARGETS)
    if npz.exists() and meta.exists() and not (rebuild and have_oof):
        arrays, info = np.load(npz), json.loads(meta.read_text())
        return {t: {"r0r4": arrays[f"{t}_r0r4"], "r5r9": arrays[f"{t}_r5r9"], "stack": info["stack"][t]}
                for t in TARGETS}
    if not have_oof:
        raise FileNotFoundError("No export snapshot and no data/processed/oof; run the plan-v2 pipeline first")
    out = {}
    for t in TARGETS:
        oof, stack = _champion_oof(df, t)
        out[t] = {"r0r4": oof, "r5r9": CVResult.load(t, _r5r9_run(t, decisions()[t]["champion"])).oof,
                  "stack": stack}
    np.savez_compressed(npz, **{f"{t}_{k}": out[t][k] for t in TARGETS for k in ("r0r4", "r5r9")})
    meta.write_text(json.dumps({"note": "Champion out-of-fold scores (raw, before calibration) on the fixed folds: "
                                        "r0-r4 (post-processing) and r5-r9 (validation); RCA stack weights.",
                                "stack": {t: out[t]["stack"] for t in TARGETS}}, indent=2))
    return out


def demo_patients(df: pd.DataFrame, seed: int = DEMO_SEED) -> list[int]:
    """One real patient per vessel pattern (LAD x LCX x RCA), chosen at random with a fixed seed; the no-disease
    pattern also requires CAD = 0 (skips the dataset's one label conflict). Row positions in load_clean()."""
    rng = np.random.default_rng(seed)
    rows = []
    for lad in (0, 1):
        for lcx in (0, 1):
            for rca in (0, 1):
                m = (df.lad == lad) & (df.lcx == lcx) & (df.rca == rca) & (df.cad == int(lad or lcx or rca))
                rows.append(int(rng.choice(np.where(m)[0])))
    return sorted(rows)


# --------------------------------------------------------------------------------------------- export
def _memorisation_check(models: dict, df: pd.DataFrame, seed: int = 0) -> dict:
    """AUC of the served probabilities on the 303 dataset patients, as typed in and after small random edits. With
    memorisation these would be ~1.0; served correctly they stay at cross-validated levels."""
    from sklearn.metrics import roc_auc_score

    rng = np.random.default_rng(seed)
    cols = models["cad"].index.columns
    exact = predict_all(models, df)
    numeric = [c for c, b in zip(cols, models["cad"].index.binary) if not b]
    edited = df.astype({c: float for c in numeric})
    for i in range(len(df)):
        for c in rng.choice(numeric, 2, replace=False):
            edited.iloc[i, edited.columns.get_loc(c)] = df.iloc[i][c] * rng.uniform(0.95, 1.05)
    nudged = predict_all(models, edited)
    return {t: {"auc_exact": float(roc_auc_score(df[t], exact[t])),
                "auc_two_inputs_nudged_5pct": float(roc_auc_score(df[t], nudged[t]))} for t in TARGETS}


def export(rebuild_inputs: bool = False) -> dict:
    from datetime import datetime

    from sklearn.base import clone

    from ml.cv import load_folds
    from ml.data import load_clean

    df = load_clean()
    ys = {t: df[t].values for t in TARGETS}
    inputs = export_inputs(df, rebuild=rebuild_inputs)
    fold_of = load_folds(df)[CROSSFIT_REPEAT].values
    index = NeighbourIndex.build(df, fold_of)
    params = fit_postprocessing({t: inputs[t]["r0r4"] for t in TARGETS}, ys, np.arange(len(df)))
    validation = validate_served(df, inputs)
    (ROOT / "reports" / "v2" / "s9").mkdir(parents=True, exist_ok=True)
    validation.to_csv(ROOT / "reports" / "v2" / "s9" / "s9_served.csv", index=False, float_format="%.4f")
    print(validation.round(4).to_string(index=False), flush=True)
    val = validation.set_index("target")
    manifest = {"model_version": MODEL_VERSION, "created": datetime.now().astimezone().isoformat(timespec="seconds"),
                "n_patients": len(df), "conformal_level": 1 - ALPHA, "python": platform.python_version(),
                "serving": (f"cross-fitted: 5 fold models per label (folds of repeat {CROSSFIT_REPEAT}); a request is "
                            "scored by the fold models that never saw a dataset patient within Gower distance "
                            f"{GATE_NEAR} (faded out by {GATE_FAR}); far from every dataset patient, by all five"),
                "consistency": "P(vessel) capped at P(CAD); a vessel is flagged only when CAD is flagged",
                "validation": ("10 x 5-fold repeated stratified CV on fixed folds; model choices made on repeats "
                               "r0-r4, metrics on repeats r5-r9 only; calibration, cap, thresholds and conformal sets "
                               "fitted per outer fold on training patients"),
                "demo_patients": {"rows": demo_patients(df),
                                  "note": "dataset samples listed by the API; scored like every dataset patient"},
                "targets": {}}
    models = {}
    for t in TARGETS:
        y = ys[t]
        option, kind, spec, members = _champion_spec(t, inputs[t]["stack"])
        X = ChampionModel(t, option, kind, spec, {}).features(df)
        p = params[t]
        t0 = time.time()
        folds = []
        for k in range(int(fold_of.max()) + 1):
            tr = fold_of != k
            fitted = {n: clone(m).fit(X[tr], y[tr]) for n, m in members.items()}
            folds.append(ChampionModel(t, option, kind, spec, fitted, inputs[t]["stack"], p["platt"],
                                       p["threshold"], p["q"]))
        models[t] = CrossFitModel(t, option, folds, index, p["threshold"], p["q"], {"fit_seconds": time.time() - t0})
    # checks: one row at a time == batch; latency; memorisation
    full = predict_all(models, df)
    for i in range(3):
        one = predict_all(models, df.iloc[[i]])
        assert all(np.isclose(one[t][0], full[t][i], atol=1e-9) for t in TARGETS), "single row differs from batch"
    t0 = time.time()
    for i in range(5):
        predict_all(models, df.iloc[[i]])
    latency_ms = (time.time() - t0) / 5 * 1000
    memo = _memorisation_check(models, df)
    for t in TARGETS:
        v, path = val.loc[t], MODELS / f"{t}.joblib"
        models[t].meta = {
            "option": models[t].option, "members": list(models[t].folds[0].members),
            "stack": inputs[t]["stack"], "n_features": len(models[t].folds[0].features(df.iloc[:1]).columns),
            "platt": list(params[t]["platt"]), "threshold": params[t]["threshold"], "conformal_q": params[t]["q"],
            "validation": {"auc_r5r9": float(v.auc), "auc_r5r9_ci95": [float(v.auc_ci_low), float(v.auc_ci_high)],
                           "calibrated_r5r9": {"auc": float(v.auc), "brier": float(v.brier), "ece": float(v.ece),
                                               "cal_slope": float(v.cal_slope)},
                           "threshold_rule_r5r9": {k: float(v[k]) for k in ("threshold", "accuracy", "balanced_acc",
                                                                             "f1", "precision", "recall")},
                           "conformal_r5r9": {k: float(v[k]) for k in ("coverage", "avg_set_size", "singleton_rate")}},
            "memorisation_check": memo[t], "fit_seconds_5_folds": round(models[t].meta["fit_seconds"], 1),
            "latency_ms_single_patient_all_labels": round(latency_ms, 1)}
        joblib.dump(models[t], path, compress=3)
        models[t].meta["file_mb"] = round(path.stat().st_size / 1e6, 2)
        joblib.dump(models[t], path, compress=3)
        manifest["targets"][t] = models[t].meta
        print(f"[{t}] {models[t].option}: threshold {params[t]['threshold']:.3f}, conformal q {params[t]['q']:.3f}, "
              f"{models[t].meta['file_mb']} MB, served AUC on dataset patients {memo[t]['auc_exact']:.3f} "
              f"(nudged {memo[t]['auc_two_inputs_nudged_5pct']:.3f})", flush=True)
    print(f"latency {latency_ms:.0f} ms per patient (all labels)", flush=True)
    reloaded = load_models()
    a, b = predict_all(models, df.iloc[:20]), predict_all(reloaded, df.iloc[:20])
    assert all(np.allclose(a[t], b[t]) for t in TARGETS)
    (MODELS / "manifest.json").write_text(json.dumps(manifest, indent=2, default=float))
    return manifest


if __name__ == "__main__":
    import sys
    import warnings

    warnings.filterwarnings("ignore")
    # run through the importable module so pickles reference ml.export classes, not __main__ ones
    from ml import export as module

    module.export(rebuild_inputs="--rebuild-inputs" in sys.argv)

"""Plan v2 S9: refit each label's champion on all 303 patients and export it for the API / dashboard.

Run:  python -m ml.export            -> models/<target>.joblib + models/manifest.json
                                         models/demo/<target>.joblib (same pipelines, refitted without the 8 demo
                                         patients, so the dashboard's real demo patients get out-of-sample predictions)

Per label (champion = best r0-r4 option, decisions.json "champion"; see reports/v2/s9/s9_selection.csv):
  * raw score   the champion pipeline (feature view -> in-fold steps -> model; or the L2 logistic stack over its
                members' logits) fitted on all patients;
  * calibration Platt scaling fitted on the champion's r0-r4 out-of-fold scores (validated per r5-r9 outer fold in S9b);
  * threshold   max balanced accuracy on the calibrated r0-r4 OOF;
  * conformal   split-conformal quantile (90 %) of 1 - p(true label) on the calibrated r0-r4 OOF;
  * consistency P(vessel) is capped at P(CAD) in `predict_all` (S9b: never lowers AUC or Brier).
Input: rows in the `ml.data.load_clean()` format (snake_case raw features). All feature engineering is row-wise.
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
ALPHA = 0.1
MODEL_VERSION = "cardiotwin-v2.0.0"
DEMO_SEED = 2026


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
        X = self.features(df)
        preds = {n: m.predict_proba(X)[:, 1] for n, m in self.members.items()}
        if self.stack is None:
            return next(iter(preds.values()))
        z = self.stack["intercept"] + sum(w * _logit(preds[n]) for n, w in self.stack["weights"].items())
        return _sigmoid(z)

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        a, b = self.platt
        return _sigmoid(a * _logit(self.raw_score(df)) + b)

    def conformal_set(self, p: np.ndarray) -> list[list[int]]:
        return [[lab for lab, s in ((0, pi), (1, 1 - pi)) if s <= self.conformal_q] for pi in np.atleast_1d(p)]


def predict_all(models: dict, df: pd.DataFrame) -> dict[str, np.ndarray]:
    """Calibrated probabilities for every label, with P(vessel) capped at P(CAD)."""
    out = {t: models[t].predict_proba(df) for t in TARGETS}
    for v in VESSELS:
        out[v] = np.minimum(out[v], out["cad"])
    return out


def load_models(demo: bool = False) -> dict:
    """The exported champions; demo=True loads the copies refitted without the demo patients."""
    folder = MODELS / "demo" if demo else MODELS
    return {t: joblib.load(folder / f"{t}.joblib") for t in TARGETS}


# --------------------------------------------------------------------------------------------- export
def _champion_parts(df, t: str):
    """(feature_kind, spec, {member: unfitted estimator}, stack or None, r0-r4 OOF raw scores (5, n))."""
    from ml.cv import CVResult, load_folds
    from ml.models import make
    from ml.run_v2 import candidate_pool, ensemble_predict, ensemble_weights
    from ml.v2 import decisions, wrap

    d = decisions()[t]
    option, y = d["champion"], df[t].values
    if option.startswith("phase3:"):
        model = option.split(":", 1)[1]
        board = pd.read_csv(ROOT / "reports" / "phase3" / t / "leaderboard.csv").iloc[0]
        params = json.loads((ROOT / "reports" / "phase3" / t / "best_params.json").read_text())[model]
        f2 = json.loads((ROOT / "reports" / "phase2" / "f2_feature_sets.json").read_text())["f2"][t]
        est = make(model, params, n_seeds=5 if board.run.endswith("seedbag5") else 1)
        return "f2", f2, {model: est}, None, CVResult.load(t, f"{board.run}_r0r4").oof
    eval_folds = load_folds(df)[[f"r{i}" for i in range(5, 10)]]
    pool = candidate_pool(df, t, eval_folds, build_eval=False)
    S = {n: v[0].oof for n, v in pool.items()}

    def member(name):
        m = name.split(":", 1)[1]
        c = d["classical"][m]
        return wrap(t, make(m, c["params"], n_seeds=c["n_seeds"]))

    if option.startswith("classical:"):
        return "fstar", d["fstar"], {option: member(option)}, None, S[option]
    method = option.split(":", 1)[1]
    if method != "lr_stack":
        raise NotImplementedError(f"export of ensemble method {method}")
    w = ensemble_weights(method, S, y, np.arange(len(y)))
    names = [n for n in w if n != "__intercept__"]
    if any(not n.startswith("classical:") for n in names):
        raise NotImplementedError("stack members outside the classical zoo")
    oof = ensemble_predict(method, w, {n: S[n].ravel() for n in names}).reshape(S[names[0]].shape)
    stack = {"intercept": w["__intercept__"], "weights": {n: w[n] for n in names}}
    return "fstar", d["fstar"], {n: member(n) for n in names}, stack, oof


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


def export() -> dict:
    from datetime import datetime

    from sklearn.base import clone
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import roc_auc_score

    from ml.data import load_clean
    from ml.run_v2 import _threshold
    from ml.v2 import V2, decisions

    df = load_clean()
    (MODELS / "demo").mkdir(parents=True, exist_ok=True)
    sel = pd.read_csv(V2 / "s9" / "s9_selection.csv")
    cal = pd.read_csv(V2 / "s9" / "s9_calibration.csv")
    thr = pd.read_csv(V2 / "s9" / "s9_thresholds.csv")
    conf = pd.read_csv(V2 / "s9" / "s9_conformal.csv")
    final = pd.read_csv(V2 / "s9" / "s9_final.csv").set_index("target")
    demo = demo_patients(df)
    keep = ~np.isin(np.arange(len(df)), demo)
    manifest = {"model_version": MODEL_VERSION, "created": datetime.now().astimezone().isoformat(timespec="seconds"),
                "n_patients": len(df), "conformal_level": 1 - ALPHA, "python": platform.python_version(),
                "consistency": "P(vessel) capped at P(CAD)",
                "validation": ("10 x 5-fold repeated stratified CV on fixed folds; choices made on repeats r0-r4, "
                               "metrics on repeats r5-r9 only; calibration and thresholds fitted per outer fold on "
                               "training patients"),
                "demo_patients": {"rows": demo, "note": "models/demo/* are refitted without these patients"},
                "targets": {}}
    models = {}
    for t in TARGETS:
        y = df[t].values
        kind, spec, members, stack, oof = _champion_parts(df, t)
        option = decisions()[t]["champion"]
        X = ChampionModel(t, option, kind, spec, {}).features(df)
        t0 = time.time()
        fitted = {n: clone(m).fit(X, y) for n, m in members.items()}
        fit_s = time.time() - t0
        fitted_demo = {n: clone(m).fit(X[keep], y[keep]) for n, m in members.items()}
        # post-processing fitted on r0-r4 OOF (all 303 patients x 5 repeats)
        z, y_rep = _logit(oof.ravel()), np.tile(y, oof.shape[0])
        lr = LogisticRegression(C=1e6).fit(z[:, None], y_rep)
        a, b = float(lr.coef_[0, 0]), float(lr.intercept_[0])
        p_cal = _sigmoid(a * z + b)
        threshold = _threshold("max_balanced_acc", p_cal, y_rep)
        score = np.where(y_rep == 1, 1 - p_cal, p_cal)
        q = float(np.quantile(score, min(1.0, np.ceil((len(score) + 1) * (1 - ALPHA)) / len(score)), method="higher"))
        m = ChampionModel(t, option, kind, spec, fitted, stack, (a, b), threshold, q)
        m_demo = ChampionModel(t, option, kind, spec, fitted_demo, stack, (a, b), threshold, q)
        # checks: one row at a time == batch; latency of a single-patient prediction
        p_all = m.predict_proba(df)
        one = np.array([m.predict_proba(df.iloc[[i]])[0] for i in range(5)])
        assert np.allclose(one, p_all[:5], atol=1e-9), f"{t}: single-row prediction differs from batch"
        t0 = time.time()
        for i in range(20):
            m.predict_proba(df.iloc[[i]])
        latency_ms = (time.time() - t0) / 20 * 1000
        s = sel[(sel.target == t) & (sel.option == option)].iloc[0]
        c = cal[(cal.target == t) & (cal.calibrator == "platt")].iloc[0]
        th = thr[(thr.target == t) & (thr.rule == "max_balanced_acc")].iloc[0]
        cf = conf[conf.target == t].iloc[0]
        path = MODELS / f"{t}.joblib"
        m.meta = {"option": option, "members": list(fitted), "stack": stack, "n_features": X.shape[1],
                  "features": list(X.columns), "platt": [a, b], "threshold": threshold, "conformal_q": q,
                  "validation": {"auc_r0r4": s.auc_r0r4, "auc_r5r9": s.auc_r5r9,
                                 "auc_r5r9_ci95": [float(final.loc[t, "auc_ci_low"]), float(final.loc[t, "auc_ci_high"])],
                                 "calibrated_r5r9": {k: float(c[k]) for k in ("auc", "brier", "ece", "cal_slope")},
                                 "threshold_rule_r5r9": {k: float(th[k]) for k in ("threshold", "accuracy", "balanced_acc",
                                                                                   "f1", "precision", "recall")},
                                 "conformal_r5r9": {k: float(cf[k]) for k in ("coverage", "avg_set_size",
                                                                              "singleton_rate")}},
                  "fit_seconds": round(fit_s, 1), "latency_ms_single_patient": round(latency_ms, 1),
                  "in_sample_auc": float(roc_auc_score(y, p_all))}
        joblib.dump(m, path)
        m.meta["file_mb"] = round(path.stat().st_size / 1e6, 2)
        joblib.dump(m, path)
        m_demo.meta = {**m.meta, "trained_without_rows": demo}
        joblib.dump(m_demo, MODELS / "demo" / f"{t}.joblib")
        manifest["targets"][t] = m.meta
        models[t] = m
        print(f"[{t}] {option}: {X.shape[1]} features, threshold {threshold:.3f}, conformal q {q:.3f}, "
              f"{latency_ms:.0f} ms/patient, {m.meta['file_mb']} MB, in-sample AUC {m.meta['in_sample_auc']:.3f}",
              flush=True)
    # reload round trip
    reloaded = load_models()
    a, b = predict_all(models, df), predict_all(reloaded, df)
    assert all(np.allclose(a[t], b[t]) for t in TARGETS)
    (MODELS / "manifest.json").write_text(json.dumps(manifest, indent=2, default=float))
    return manifest


if __name__ == "__main__":
    import warnings

    warnings.filterwarnings("ignore")
    # run through the importable module so pickles reference ml.export.ChampionModel, not __main__.ChampionModel
    from ml import export as module

    module.export()

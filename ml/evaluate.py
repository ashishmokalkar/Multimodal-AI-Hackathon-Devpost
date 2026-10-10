"""Classification metrics, bootstrap confidence intervals and paired run comparison."""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import rankdata
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score, balanced_accuracy_score,
                             brier_score_loss, f1_score, log_loss, precision_score, recall_score,
                             roc_auc_score)

EPS = 1e-6


def metrics(y: np.ndarray, p: np.ndarray, threshold: float = 0.5) -> dict[str, float]:
    """Threshold-free and thresholded metrics for one set of predictions."""
    pred = (p >= threshold).astype(int)
    tn = int(((pred == 0) & (y == 0)).sum())
    return {
        "auc": roc_auc_score(y, p),
        "pr_auc": average_precision_score(y, p),
        "logloss": log_loss(y, np.clip(p, EPS, 1 - EPS), labels=[0, 1]),
        "brier": brier_score_loss(y, p),
        "accuracy": accuracy_score(y, pred),
        "balanced_acc": balanced_accuracy_score(y, pred),
        "precision": precision_score(y, pred, zero_division=0),
        "recall": recall_score(y, pred, zero_division=0),
        "specificity": tn / max(int((y == 0).sum()), 1),
        "f1": f1_score(y, pred, zero_division=0),
    }


def summarize(fold_metrics: pd.DataFrame) -> dict[str, float]:
    """Mean, SD and standard error of per-fold metrics."""
    n = len(fold_metrics)
    out = {}
    for col in fold_metrics.columns:
        out[f"{col}_mean"] = fold_metrics[col].mean()
        out[f"{col}_std"] = fold_metrics[col].std(ddof=1)
        out[f"{col}_se"] = fold_metrics[col].std(ddof=1) / np.sqrt(n)
    return out


def _repeat_metrics(y: np.ndarray, P: np.ndarray, threshold: float) -> dict[str, float]:
    """Vectorised metrics averaged over repeats; P has shape (n_repeats, n). Used by the bootstrap."""
    pos, neg = y == 1, y == 0
    n_pos, n_neg = pos.sum(), neg.sum()
    ranks = rankdata(P, axis=1)
    auc = (ranks[:, pos].sum(axis=1) - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)
    pred = P >= threshold
    tp, fp = (pred & pos).sum(axis=1), (pred & neg).sum(axis=1)
    fn, tn = n_pos - tp, n_neg - fp
    recall, spec = tp / n_pos, tn / n_neg
    precision = np.divide(tp, tp + fp, out=np.zeros(len(tp), float), where=(tp + fp) > 0)
    f1 = np.divide(2 * tp, 2 * tp + fp + fn, out=np.zeros(len(tp), float), where=(2 * tp + fp + fn) > 0)
    Pc = np.clip(P, EPS, 1 - EPS)
    return {
        "auc": auc.mean(),
        "logloss": -(y * np.log(Pc) + (1 - y) * np.log(1 - Pc)).mean(axis=1).mean(),
        "brier": ((P - y) ** 2).mean(axis=1).mean(),
        "accuracy": ((tp + tn) / len(y)).mean(),
        "balanced_acc": ((recall + spec) / 2).mean(),
        "precision": precision.mean(),
        "recall": recall.mean(),
        "specificity": spec.mean(),
        "f1": f1.mean(),
    }


def bootstrap_ci(y: np.ndarray, oof: np.ndarray, threshold: float = 0.5, n_boot: int = 1000,
                 alpha: float = 0.05, seed: int = 0) -> pd.DataFrame:
    """Percentile CI over patients for metrics of repeated-CV OOF predictions.

    `oof` has shape (n_repeats, n_patients). Each bootstrap resamples patients and
    averages the metric across repeats, so CIs reflect patient sampling variability.
    """
    rng = np.random.default_rng(seed)
    n = len(y)
    point = pd.Series(_repeat_metrics(y, oof, threshold))
    boots = []
    for _ in range(n_boot):
        idx = rng.integers(0, n, n)
        if y[idx].min() == y[idx].max():
            continue
        boots.append(_repeat_metrics(y[idx], oof[:, idx], threshold))
    b = pd.DataFrame(boots)
    return pd.DataFrame({"estimate": point, "ci_low": b.quantile(alpha / 2), "ci_high": b.quantile(1 - alpha / 2)})


def calibration(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> dict[str, float]:
    """Expected calibration error plus calibration slope/intercept (logistic recalibration)."""
    p = np.clip(p, EPS, 1 - EPS)
    bins = np.minimum((p * n_bins).astype(int), n_bins - 1)
    ece = sum(abs(y[bins == b].mean() - p[bins == b].mean()) * (bins == b).mean()
              for b in range(n_bins) if (bins == b).any())
    logit = np.log(p / (1 - p)).reshape(-1, 1)
    lr = LogisticRegression(C=1e6, max_iter=1000).fit(logit, y)
    return {"ece": float(ece), "cal_slope": float(lr.coef_[0, 0]), "cal_intercept": float(lr.intercept_[0])}


def paired_compare(a: pd.DataFrame, b: pd.DataFrame, metric: str = "auc", test_frac: float = 0.2) -> dict[str, float]:
    """Compare two runs evaluated on the same folds. Positive diff means `b` is better.

    Folds from repeated CV overlap, so the naive SE is too optimistic. We use the
    Nadeau-Bengio corrected variance: var(d) * (1/J + n_test/n_train).
    Decision rule (plan.md §0): keep `b` only if mean diff > 1 corrected SE.
    """
    key = ["repeat", "fold"]
    m = a[key + [metric]].merge(b[key + [metric]], on=key, suffixes=("_a", "_b"))
    if len(m) != len(a) or len(m) != len(b):
        raise ValueError("Runs were not evaluated on identical folds")
    d = m[f"{metric}_b"] - m[f"{metric}_a"]
    var = d.var(ddof=1)
    se_naive = np.sqrt(var / len(d))
    se = np.sqrt(var * (1 / len(d) + test_frac / (1 - test_frac)))
    return {"diff_mean": d.mean(), "diff_se": se, "diff_se_naive": se_naive, "win_rate": (d > 0).mean(),
            "keep": bool(d.mean() > se)}

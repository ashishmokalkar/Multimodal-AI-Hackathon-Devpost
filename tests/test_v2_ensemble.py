import numpy as np
from sklearn.metrics import brier_score_loss

from ml.run_v2 import METHODS, _calibrator, _threshold, ensemble_predict, ensemble_weights


def synthetic(n=300, seed=0):
    rng = np.random.default_rng(seed)
    y = rng.integers(0, 2, n)
    good = np.clip(0.5 + 0.35 * (2 * y - 1) + rng.normal(0, 0.25, (5, n)), 0.01, 0.99)
    noise = rng.uniform(0.01, 0.99, (5, n))
    return y, {"good": good, "noise": noise, "good2": np.clip(good + rng.normal(0, 0.05, good.shape), 0.01, 0.99)}


def test_weights_use_only_the_given_rows_and_prefer_signal():
    y, S = synthetic()
    rows = np.arange(200)
    for method in METHODS:
        w = ensemble_weights(method, S, y, rows)
        p = ensemble_predict(method, w, {n: S[n][0, 200:] for n in w if n != "__intercept__"})
        assert p.shape == (100,) and np.isfinite(p).all()
    w = ensemble_weights("caruana", S, y, rows)
    assert max(w, key=w.get) == "good" and w.get("noise", 0) < 0.25   # signal dominates; greedy may add a little noise
    # weights must not change when labels outside `rows` change (no peeking at test patients)
    y2 = y.copy()
    y2[200:] = 1 - y2[200:]
    assert ensemble_weights("caruana", S, y, rows) == ensemble_weights("caruana", S, y2, rows)


def test_calibrators_and_thresholds():
    rng = np.random.default_rng(1)
    y = rng.integers(0, 2, 2000)
    p = np.clip(0.5 + 0.45 * (2 * y - 1) * rng.uniform(0, 1, 2000), 0.01, 0.99) ** 2   # miscalibrated (too low)
    for kind in ("platt", "beta", "isotonic"):                 # can remove the systematic shift
        assert brier_score_loss(y, _calibrator(kind, p, y)(p)) <= brier_score_loss(y, p) + 1e-9
    assert np.isfinite(_calibrator("temperature", p, y)(p)).all()   # scale only: cannot fix a shift
    for rule in ("0.5", "youden", "max_balanced_acc", "max_f1"):
        assert 0 <= _threshold(rule, p, y) <= 1

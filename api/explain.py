"""Per-input explanations of the served probability: baseline Shapley values (Sundararajan & Najmi, 2020).

The explained quantity is exactly what the API returns (calibrated probability, vessel capped at CAD), as a function
of the contract inputs. The baseline is a reference patient (median measurements, no risk factors or findings).
For each random ordering of the inputs that differ from the reference, the inputs are switched one at a time from
the reference value to the patient's value; an input's contribution is its average change in probability.

  * scale       probability (0.12 = +12 percentage points)
  * additive    exactly: base_value + sum(contributions) == probability (every ordering telescopes)
  * model-free  the same for every model (EBM, boosted trees, the stacked ensemble), so swapping a model never
                changes how explanations are read; engineered features (risk scores, BMI, ...) are credited back to
                the inputs they are computed from
  * stable      orderings use a fixed seed, so the same input always gets the same explanation
"""

from __future__ import annotations

import numpy as np

from api.features import NAMES, REFERENCE, to_model_frame
from ml.data import TARGETS

N_ORDERINGS = 32          # antithetic pairs: each random ordering is also used reversed


def predict(models: dict, rows: list[dict]) -> dict[str, np.ndarray]:
    from ml.export import predict_all

    return predict_all(models, to_model_frame(rows))


def explain(models: dict, patient: dict, n_orderings: int = N_ORDERINGS, seed: int = 0) -> dict:
    """{target: {"base_value", "probability", "contributions": {input: value}}} for one patient."""
    diff = [n for n in NAMES if patient[n] != REFERENCE[n]]
    rng = np.random.default_rng(seed)
    orders = []
    for _ in range(max(1, n_orderings // 2)):
        o = rng.permutation(len(diff))
        orders += [o, o[::-1]]
    rows = []
    for o in orders:
        cur = dict(REFERENCE)
        rows.append(dict(cur))
        for j in o:
            cur[diff[j]] = patient[diff[j]]
            rows.append(dict(cur))
    p = predict(models, rows)
    out = {}
    for t in TARGETS:
        contrib = np.zeros(len(diff))
        pt = p[t].reshape(len(orders), len(diff) + 1)
        for k, o in enumerate(orders):
            contrib[o] += np.diff(pt[k])
        contrib /= len(orders)
        out[t] = {"base_value": float(pt[0, 0]), "probability": float(pt[0, -1]),
                  "contributions": {n: float(c) for n, c in zip(diff, contrib)}}
    return out

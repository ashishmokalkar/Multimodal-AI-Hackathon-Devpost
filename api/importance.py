"""Precompute global importance for GET /model/importance: for every dataset patient, the same per-input explanation
the API serves (cross-fitted models: each dataset patient is explained by the fold model that never saw them), summarised per target as the mean absolute contribution and the share of patients for
whom the input raised the probability.

Run from the repository root:  python -m api.importance      -> models/importance.json
"""

from __future__ import annotations

import json

import numpy as np

from api.explain import explain
from api.features import NAMES, from_model_row
from ml.data import TARGETS, load_clean
from ml.export import MODELS, load_models


def main() -> None:
    models = load_models()
    df = load_clean()
    sums = {t: {n: [] for n in NAMES} for t in TARGETS}
    for i, (_, row) in enumerate(df.iterrows()):
        e = explain(models, from_model_row(row))
        for t in TARGETS:
            for n in NAMES:
                sums[t][n].append(e[t]["contributions"].get(n, 0.0))
        if (i + 1) % 50 == 0:
            print(f"{i + 1}/{len(df)} patients", flush=True)
    targets = {}
    for t in TARGETS:
        rows = [{"feature": n, "mean_abs_contribution": round(float(np.mean(np.abs(v))), 5),
                 "share_raising": round(float(np.mean(np.array(v) > 1e-6)), 4)} for n, v in sums[t].items()]
        targets[t] = sorted(rows, key=lambda r: -r["mean_abs_contribution"])
    manifest = json.loads((MODELS / "manifest.json").read_text())
    out = {"model_version": manifest["model_version"], "n_patients": len(df),
           "description": ("Average size of each input's contribution (probability units) over the dataset "
                           "patients, using the same explanations /predict returns (each patient scored by the cross-validation "
                           "model that never saw them); share_raising "
                           "is the share of patients for whom the input raised the probability."),
           "targets": targets}
    (MODELS / "importance.json").write_text(json.dumps(out, indent=1))
    for t in TARGETS:
        print(t, [(r["feature"], r["mean_abs_contribution"]) for r in targets[t][:5]])


if __name__ == "__main__":
    import warnings

    warnings.filterwarnings("ignore")
    main()

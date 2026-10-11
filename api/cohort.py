"""Precompute the comparison cohort for GET /cohort: every dataset patient's age, sex and served probabilities, each
scored through the same path as POST /predict (cross-fitted models, so each patient is scored by the fold model that
never saw them). The frontend compares a patient with the same-sex, similar-age patients in this table ("higher than
72% of 41 women aged 60-70"), in the spirit of a nomogram.

The 303 patients were referred for coronary angiography at one hospital, so the comparison is with that referral
group, not with the general population.

Run from the repository root:  python -m api.cohort      -> models/cohort.json
"""

from __future__ import annotations

import json

from api.explain import predict
from api.features import from_model_row
from ml.data import TARGETS, load_clean
from ml.export import MODELS, load_models

API_KEYS = {"cad": "cad", "lad": "LAD", "lcx": "LCX", "rca": "RCA"}
POPULATION = ("303 adults referred for coronary angiography at one hospital in Tehran (Z-Alizadeh Sani dataset); "
              "each scored by the cross-validation model that never saw them. A comparison with this referral "
              "group, not with the general population.")


def build() -> dict:
    models = load_models()
    df = load_clean()
    rows = [from_model_row(r) for _, r in df.iterrows()]
    probs = predict(models, rows)
    patients = [{"patient": i + 1, "age": int(row["Age"]), "sex": row["Sex"],
                 **{API_KEYS[t]: round(float(probs[t][i]), 4) for t in TARGETS}}
                for i, row in enumerate(rows)]
    manifest = json.loads((MODELS / "manifest.json").read_text())
    return {"model_version": manifest["model_version"], "n_patients": len(patients), "population": POPULATION,
            "patients": patients}


def main() -> None:
    out = build()
    (MODELS / "cohort.json").write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {out['n_patients']} patients to {MODELS / 'cohort.json'}")


if __name__ == "__main__":
    import warnings

    warnings.filterwarnings("ignore")
    main()

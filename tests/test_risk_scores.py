import numpy as np
import pandas as pd

from ml.data import load_clean
from ml.risk_scores import cad_consortium, esc2019_ptp, esc2024_rfcl, risk_scores, updated_df_ptp


def patient(age, male, typ=0, aty=0, non=0, dysp=0, n_rf=0, dm=0):
    rf = dict(fh=0, current_smoker=0, dlp=0, htn=0)   # the 5th risk factor is diabetes (dm)
    for k in list(rf)[:n_rf]:
        rf[k] = 1
    return pd.DataFrame([dict(age=age, sex_male=male, typical_chest_pain=typ, atypical=aty, nonanginal=non,
                              dyspnea=dysp, dm=dm, ex_smoker=0, **rf)])


def test_rfcl_reproduces_esc2024_table_cells():
    # (age, male, symptom, n risk factors) -> ESC 2024 Figure 4 value (%), formula within 0.6 pp
    cells = [((55, 1, "typ", 5), 33), ((45, 0, "aty", 0), 1), ((65, 1, "non", 2), 12), ((75, 0, "typ", 4), 23)]
    for (age, male, sym, n_rf), expected in cells:
        df = patient(age, male, **{sym: 1}, n_rf=min(n_rf, 4), dm=int(n_rf == 5))
        assert abs(100 * esc2024_rfcl(df)[0] - expected) <= 0.65


def test_lookup_tables_use_the_right_cells():
    assert esc2019_ptp(patient(62, 0, dysp=1))[0] == 0.14          # women, dyspnoea, 60-69
    assert esc2019_ptp(patient(45, 1, typ=1))[0] == 0.22           # men, typical, 40-49
    assert updated_df_ptp(patient(85, 1, typ=1))[0] == 0.93        # men, typical, 80+
    assert updated_df_ptp(patient(33, 0, non=1))[0] == 0.05        # women, non-anginal, 30-39


def test_cad_consortium_clinical_coefficients():
    x = -7.539 + 0.062 * 60 + 1.332 + 1.998 + 0.828 + 1.049 - 0.402   # male, 60, typical, diabetic, setting 1
    assert np.isclose(cad_consortium(patient(60, 1, typ=1, dm=1))[0], 1 / (1 + np.exp(-x)))


def test_scores_are_finite_and_label_free():
    df = load_clean()
    r = risk_scores(df)
    assert r.notna().all().all() and np.isfinite(r.to_numpy()).all()
    assert r.equals(risk_scores(df.drop(columns=["cad", "lad", "lcx", "rca"])))   # no label is used

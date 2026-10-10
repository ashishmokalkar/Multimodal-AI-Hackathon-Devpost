"""Published clinical pre-test probability models as features (plan v2, FE2).

Every number below was taken from the primary source (guideline PDF, paper appendix or the authors' code) and
cross-checked where possible; see reports/v2/s2/RISK_SCORES.md for sources and caveats. All scores are functions
of baseline patient characteristics only, never of a label, so they are computed once on the whole table.

Symptom mapping from Z-Alizadeh Sani: chest_pain_type (0 none, 1 non-anginal, 2 atypical, 3 typical) and dyspnea.
Patients without chest pain fall in the lowest symptom class ("non-anginal" / "non-specific"), except where a model
has a dyspnoea class and the patient reports dyspnoea.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from ml.features import CHEST_PAIN_LEVELS, chest_pain_type

TYPICAL, ATYPICAL = CHEST_PAIN_LEVELS["typical"], CHEST_PAIN_LEVELS["atypical"]


def _sigmoid(x):
    return 1 / (1 + np.exp(-x))


def _symptoms(df):
    cp = chest_pain_type(df).values
    return (cp == TYPICAL).astype(int), (cp == ATYPICAL).astype(int)


def _ever_smoker(df):
    return ((df.current_smoker == 1) | (df.ex_smoker == 1)).astype(int).values


# ---------------------------------------------------------------- ESC 2019 Table 5 (Juarez-Orozco 2019), % ---------
# columns: typical M/W, atypical M/W, non-anginal M/W, dyspnoea M/W; rows: 30-39, 40-49, 50-59, 60-69, 70+
_ESC2019 = np.array([[3, 5, 4, 3, 1, 1, 0, 3],
                     [22, 10, 10, 6, 3, 2, 12, 3],
                     [32, 13, 17, 6, 11, 3, 20, 9],
                     [44, 16, 26, 11, 22, 6, 27, 14],
                     [52, 27, 34, 19, 24, 10, 32, 12]]) / 100


def esc2019_ptp(df) -> np.ndarray:
    typ, aty = _symptoms(df)
    band = np.clip(df.age.values // 10 - 3, 0, 4).astype(int)
    sym = np.where(typ == 1, 0, np.where(aty == 1, 1, np.where(df.dyspnea.values == 1, 3, 2)))
    col = sym * 2 + (1 - df.sex_male.values)   # men first, then women
    return _ESC2019[band, col]


# ---------------------------------------------------------------- ESC 2024 RF-CL (Winther 2020; authors' cadptp code) -
def esc2024_rfcl(df) -> np.ndarray:
    """Risk-factor-weighted clinical likelihood. Symptom groups: typical / atypical-or-dyspnoea (reference) /
    non-anginal; risk factors: family history, ever smoking, dyslipidaemia, hypertension, diabetes, coded 1 (0-1),
    2 (2-3), 3 (4-5). Reproduces the ESC 2024 Figure 4 table within 0.6 percentage points."""
    typ, aty = _symptoms(df)
    nonanginal = ((typ == 0) & (aty == 0) & (df.dyspnea.values == 0)).astype(int)
    n_rf = df.fh.values + _ever_smoker(df) + df.dlp.values + df.htn.values + df.dm.values
    rf3 = np.select([n_rf <= 1, n_rf <= 3], [1, 2], 3)
    male, age = df.sex_male.values, df.age.values
    x = (-9.5260 + 1.6128 * male + 0.08440 * age + 2.7112 * typ - 0.4675 * nonanginal + 1.4940 * rf3
         - 0.0187 * age * typ - 0.0131 * age * rf3 - 0.2799 * typ * rf3 - 0.2091 * male * rf3)
    return _sigmoid(x)


def winther_basic_ptp(df) -> np.ndarray:
    typ, aty = _symptoms(df)
    nonanginal = ((typ == 0) & (aty == 0) & (df.dyspnea.values == 0)).astype(int)
    x = (-7.0753 + 1.2308 * df.sex_male.values + 0.0642 * df.age.values + 2.2501 * typ - 0.5095 * nonanginal
         - 0.0191 * df.age.values * typ)
    return _sigmoid(x)


# ---------------------------------------------------------------- Updated Diamond-Forrester (ESC 2013 Table 13), % --
# columns: typical M/W, atypical M/W, non-anginal M/W; rows: 30-39 ... 70-79, 80+
_UDF = np.array([[59, 28, 29, 10, 18, 5],
                 [69, 37, 38, 14, 25, 8],
                 [77, 47, 49, 20, 34, 12],
                 [84, 58, 59, 28, 44, 17],
                 [89, 68, 69, 37, 54, 24],
                 [93, 76, 78, 47, 65, 32]]) / 100


def updated_df_ptp(df) -> np.ndarray:
    typ, aty = _symptoms(df)
    band = np.clip(df.age.values // 10 - 3, 0, 5).astype(int)
    sym = np.where(typ == 1, 0, np.where(aty == 1, 1, 2))
    return _UDF[band, sym * 2 + (1 - df.sex_male.values)]


# ---------------------------------------------------------------- CAD Consortium (Genders, BMJ 2012, appendix T4) ---
def cad_consortium(df, clinical: bool = True, setting: int = 1) -> np.ndarray:
    """setting = 1: high-prevalence (invasive angiography) cohorts, which is what Z-Alizadeh Sani is."""
    typ, aty = _symptoms(df)
    male, age = df.sex_male.values, df.age.values
    if not clinical:
        return _sigmoid(-6.917 + 0.063 * age + 1.358 * male + 0.658 * aty + 1.975 * typ + 1.065 * setting)
    dm = df.dm.values
    x = (-7.539 + 0.062 * age + 1.332 * male + 0.633 * aty + 1.998 * typ + 0.828 * dm + 0.338 * df.htn.values
         + 0.422 * df.dlp.values + 0.461 * _ever_smoker(df) + 1.049 * setting - 0.402 * dm * typ)
    return _sigmoid(x)


# ---------------------------------------------------------------- Duke clinical score (Pryor 1993, appendix) --------
# Not available in Z-Alizadeh Sani and set to 0, as in published re-applications: prior MI, symptom duration,
# weekly angina episodes / nocturnal or progressive pain, carotid bruit. Sex is coded 1 = female in this model.
def _duke_inputs(df):
    typ, aty = _symptoms(df)
    female, age = 1 - df.sex_male.values, df.age.values
    st_t = ((df.st_depression == 1) | (df.t_inversion == 1) | (df.st_elevation == 1)).astype(int).values
    vascular = df.weak_peripheral_pulse.values + df.cva.values          # PVD + cerebrovascular history
    return typ, aty, female, age, st_t, vascular


def duke_significant(df) -> np.ndarray:
    typ, aty, female, age, st_t, _ = _duke_inputs(df)
    smoke, hl, q = _ever_smoker(df), df.dlp.values, df.q_wave.values
    x = (-7.376 + 0.1126 * age - 0.328 * female - 0.0301 * age * female + 2.581 * typ + 0.976 * aty
         + 1.213 * q + 2.596 * smoke + 1.845 * hl + 0.694 * df.dm.values + 0.637 * st_t - 0.0404 * age * smoke
         - 0.0251 * age * hl + 0.550 * female * smoke)
    return _sigmoid(x)


def duke_severe(df) -> np.ndarray:
    """P(3-vessel or left main) = P(significant) * P(severe | significant)."""
    typ, aty, female, age, _, vascular = _duke_inputs(df)
    pain_type = 2 * typ + aty
    rfi = df.dlp.values + df.dm.values + df.htn.values
    x = (-3.4732 + 0.3014 * pain_type + 0.0299 * age + 0.3513 * df.q_wave.values - 0.3823 * female
         + 0.1734 * rfi + 0.2402 * vascular)
    return duke_significant(df) * _sigmoid(x)


def duke_left_main(df) -> np.ndarray:
    typ, _, female, age, _, vascular = _duke_inputs(df)
    x = -6.7271 + 1.1252 * typ + 0.0483 * np.minimum(age, 65) - 0.5770 * female + 0.5923 * vascular
    return _sigmoid(x)


# ---------------------------------------------------------------- Jang 2019 (PROMISE, high-risk CAD [50]) -----------
def jang_score(df) -> np.ndarray:
    """Relative linear predictor from the published odds ratios (no intercept was published).
    eGFR from creatinine (mg/dL) with CKD-EPI 2021; GFR has an effect only up to 95 mL/min/1.73 m2."""
    typ, aty = _symptoms(df)
    female, age, cr = 1 - df.sex_male.values, df.age.values, df.cr.values
    kappa, alpha = np.where(female == 1, 0.7, 0.9), np.where(female == 1, -0.241, -0.302)
    egfr = (142 * np.minimum(cr / kappa, 1) ** alpha * np.maximum(cr / kappa, 1) ** -1.200 * 0.9938 ** age
            * np.where(female == 1, 1.012, 1.0))
    return (np.log(1.06) * age + np.log(3.52) * (1 - female) + np.log(2.02) * df.dm.values
            + np.log(1.65) * df.fh.values + np.log(2.42) * typ + np.log(2.42 / 1.33) * aty
            + np.log(1.58) * df.current_smoker.values + np.log(0.99) * np.minimum(egfr, 95)
            + np.log(1.01) * df.bp.values)


SCORES = {"esc2019_ptp": esc2019_ptp, "esc2024_rfcl": esc2024_rfcl, "winther_basic_ptp": winther_basic_ptp,
          "updated_df_ptp": updated_df_ptp, "cadc_basic": lambda d: cad_consortium(d, clinical=False),
          "cadc_clinical": cad_consortium, "duke_significant": duke_significant, "duke_severe": duke_severe,
          "duke_left_main": duke_left_main, "jang_score": jang_score}


def risk_scores(df: pd.DataFrame) -> pd.DataFrame:
    return pd.DataFrame({k: f(df) for k, f in SCORES.items()}, index=df.index)

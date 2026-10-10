"""Feature cleaning (F1) and engineered feature candidates (F2).

All transforms are deterministic per-row functions with constants fixed in advance
(clinical thresholds, published tables). Nothing is fitted on data, so they are safe
to apply before cross-validation splits. Anything data-dependent (winsorising,
scaling, selection) lives in `ml.preprocess` and is fitted inside each fold.
"""

from __future__ import annotations

from typing import Callable

import numpy as np
import pandas as pd

from ml.data import FEATURES

# ----------------------------------------------------------------------------- F1: cleaning
# EDA §5: exact or near-exact redundancy, mutually exclusive dummies, a 1-patient level.
F1_DROP = ["weight", "height", "obesity", "typical_chest_pain", "atypical", "nonanginal",
           "current_smoker", "ex_smoker", "function_class"]

# Anginal-ness order: none < nonanginal < atypical < typical (matches UCI `cp` semantics).
CHEST_PAIN_LEVELS = {"none": 0, "nonanginal": 1, "atypical": 2, "typical": 3}


def chest_pain_type(df: pd.DataFrame) -> pd.Series:
    cp = np.select([df.typical_chest_pain == 1, df.atypical == 1, df.nonanginal == 1],
                   [CHEST_PAIN_LEVELS["typical"], CHEST_PAIN_LEVELS["atypical"], CHEST_PAIN_LEVELS["nonanginal"]],
                   CHEST_PAIN_LEVELS["none"])
    return pd.Series(cp, index=df.index, name="chest_pain_type")


def to_f1(df: pd.DataFrame) -> pd.DataFrame:
    out = df[FEATURES].copy()
    out["chest_pain_type"] = chest_pain_type(df)
    out["smoking"] = np.select([df.current_smoker == 1, df.ex_smoker == 1], [2, 1], 0)  # never/ex/current
    out["fc_ge2"] = (df.function_class >= 1).astype(int)  # FC1 has n=1; merge into FC>=2
    return out.drop(columns=F1_DROP)


# ----------------------------------------------------------------------------- F2 candidates
# Diamond & Forrester (NEJM 1979) pre-test probability of CAD (%), by age decade, sex and
# chest pain type. Ages < 30 use the 30-39 row, ages >= 70 the 60-69 row.
_DF_TABLE = {  # (chest_pain_type, sex_male): [30-39, 40-49, 50-59, 60-69]
    (3, 1): [69.7, 87.3, 92.0, 94.3], (3, 0): [25.8, 55.2, 79.4, 90.6],
    (2, 1): [21.8, 46.1, 58.9, 67.1], (2, 0): [4.2, 13.3, 32.4, 54.4],
    (1, 1): [5.2, 14.1, 21.5, 28.1], (1, 0): [0.8, 2.8, 8.4, 18.6],
    (0, 1): [1.9, 5.5, 9.7, 12.3], (0, 0): [0.3, 1.0, 3.2, 7.5],
}


def pretest_prob(df: pd.DataFrame) -> pd.DataFrame:
    band = np.clip((df.age.values // 10).astype(int) - 3, 0, 3)
    cp = chest_pain_type(df).values
    p = [_DF_TABLE[(c, s)][b] / 100 for c, s, b in zip(cp, df.sex_male.values, band)]
    return pd.DataFrame({"pretest_prob": p}, index=df.index)


def nlr(df):
    return pd.DataFrame({"nlr": df.neut / df.lymph}, index=df.index)


def lipid_ratios(df):
    return pd.DataFrame({"tg_hdl_ratio": df.tg / df.hdl, "ldl_hdl_ratio": df.ldl / df.hdl}, index=df.index)


def risk_factor_count(df):
    cols = ["dm", "htn", "current_smoker", "fh", "dlp", "obesity"]
    return pd.DataFrame({"risk_factor_count": df[cols].sum(axis=1)}, index=df.index)


def comorbidity_count(df):
    cols = ["crf", "cva", "chf", "airway_disease", "thyroid_disease", "edema", "weak_peripheral_pulse", "lung_rales"]
    return pd.DataFrame({"comorbidity_count": df[cols].sum(axis=1)}, index=df.index)


def ecg_ischemia(df):
    cols = ["q_wave", "st_elevation", "st_depression", "t_inversion"]
    return pd.DataFrame({"ecg_ischemia_any": (df[cols].sum(axis=1) > 0).astype(int),
                         "ecg_ischemia_count": df[cols].sum(axis=1)}, index=df.index)


def rwma_flags(df):
    return pd.DataFrame({"rwma_any": (df.region_rwma > 0).astype(int),
                         "rwma_severe": (df.region_rwma >= 3).astype(int)}, index=df.index)


def ef_category(df):  # 0: >=50 normal, 1: 40-49 mildly reduced, 2: <40 reduced
    return pd.DataFrame({"ef_category": np.select([df.ef_tte < 40, df.ef_tte < 50], [2, 1], 0)}, index=df.index)


def glycaemia_bp_stages(df):
    return pd.DataFrame({"fbs_diabetic": (df.fbs >= 126).astype(int),
                         "bp_stage": np.select([df.bp >= 140, df.bp >= 120], [2, 1], 0)}, index=df.index)


def age_sex(df):
    return pd.DataFrame({"age_x_male": df.age * df.sex_male,
                         "female_ge50": ((df.sex_male == 0) & (df.age >= 50)).astype(int)}, index=df.index)


def metabolic_syndrome(df):
    low_hdl = np.where(df.sex_male == 1, df.hdl < 40, df.hdl < 50)
    parts = np.column_stack([df.bmi >= 30, df.tg >= 150, low_hdl, df.bp >= 130, df.fbs >= 100])
    return pd.DataFrame({"metabolic_score": parts.sum(axis=1)}, index=df.index)


def inflammation(df):
    return pd.DataFrame({"plr": df.plt / (df.wbc * df.lymph / 100),  # platelet / absolute lymphocytes
                         "anc": df.wbc * df.neut / 100},               # absolute neutrophil count
                        index=df.index)


# name -> (builder, columns of F1 it replaces when used in "replace" mode)
CANDIDATES: dict[str, tuple[Callable[[pd.DataFrame], pd.DataFrame], list[str]]] = {
    "pretest_prob": (pretest_prob, []),
    "nlr": (nlr, ["neut", "lymph"]),
    "lipid_ratios": (lipid_ratios, []),
    "risk_factor_count": (risk_factor_count, []),
    "comorbidity_count": (comorbidity_count, ["crf", "cva", "chf", "airway_disease", "thyroid_disease",
                                              "edema", "weak_peripheral_pulse", "lung_rales"]),
    "ecg_ischemia": (ecg_ischemia, []),
    "rwma_flags": (rwma_flags, []),
    "ef_category": (ef_category, []),
    "glycaemia_bp_stages": (glycaemia_bp_stages, []),
    "age_sex": (age_sex, []),
    "metabolic_syndrome": (metabolic_syndrome, []),
    "inflammation": (inflammation, []),
}


def build(df: pd.DataFrame, add: list[str] = (), replace: list[str] = (), base: str = "F1") -> pd.DataFrame:
    """Feature matrix: base set (F0 raw / F1 cleaned) plus engineered candidates.

    `add` appends candidate columns; `replace` appends them and drops the F1 columns they summarise.
    """
    X = df[FEATURES].copy() if base == "F0" else to_f1(df)
    drop: list[str] = []
    for name in [*add, *replace]:
        builder, replaces = CANDIDATES[name]
        X = X.join(builder(df))
        if name in replace:
            drop += replaces
    return X.drop(columns=[c for c in drop if c in X.columns])

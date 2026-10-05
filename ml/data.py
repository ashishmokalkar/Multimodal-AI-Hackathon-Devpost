"""Load and encode the Z-Alizadeh Sani extension dataset.

`load_clean()` returns a fully numeric DataFrame with snake_case columns:
feature columns plus the four binary targets in `TARGETS`. Encoding choices
are documented in reports/EDA.md.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_XLSX = ROOT / "data" / "raw" / "z_alizadeh_sani_ext" / "z_alizadeh_sani_ext.xlsx"
SHEET = "Sheet 1 - Table 1"

TARGETS = ["cad", "lad", "lcx", "rca"]
VESSELS = ["lad", "lcx", "rca"]
# Raw columns that must never be used as model inputs (target leakage).
LEAKAGE_RAW = ["LAD", "LCX", "RCA", "Cath"]

RENAME = {
    "Age": "age", "Weight": "weight", "Length": "height", "Sex": "sex_male", "BMI": "bmi",
    "DM": "dm", "HTN": "htn", "Current Smoker": "current_smoker", "EX-Smoker": "ex_smoker",
    "FH": "fh", "Obesity": "obesity", "CRF": "crf", "CVA": "cva", "Airway disease": "airway_disease",
    "Thyroid Disease": "thyroid_disease", "CHF": "chf", "DLP": "dlp", "BP": "bp", "PR": "pr",
    "Edema": "edema", "Weak Peripheral Pulse": "weak_peripheral_pulse", "Lung rales": "lung_rales",
    "Systolic Murmur": "systolic_murmur", "Diastolic Murmur": "diastolic_murmur",
    "Typical Chest Pain": "typical_chest_pain", "Dyspnea": "dyspnea", "Function Class": "function_class",
    "Atypical": "atypical", "Nonanginal": "nonanginal", "Exertional CP": "exertional_cp",
    "LowTH Ang": "low_th_ang", "Q Wave": "q_wave", "St Elevation": "st_elevation",
    "St Depression": "st_depression", "Tinversion": "t_inversion", "LVH": "lvh",
    "Poor R Progression": "poor_r_progression", "BBB": "bbb", "FBS": "fbs", "CR": "cr", "TG": "tg",
    "LDL": "ldl", "HDL": "hdl", "BUN": "bun", "ESR": "esr", "HB": "hb", "K": "k", "Na": "na",
    "WBC": "wbc", "Lymph": "lymph", "Neut": "neut", "PLT": "plt", "EF-TTE": "ef_tte",
    "Region RWMA": "region_rwma", "VHD": "vhd", "LAD": "lad", "LCX": "lcx", "RCA": "rca", "Cath": "cad",
}

FEATURE_GROUPS = {
    "demographic": ["age", "weight", "height", "sex_male", "bmi"],
    "history": ["dm", "htn", "current_smoker", "ex_smoker", "fh", "obesity", "crf", "cva",
                "airway_disease", "thyroid_disease", "chf", "dlp"],
    "exam": ["bp", "pr", "edema", "weak_peripheral_pulse", "lung_rales", "systolic_murmur",
             "diastolic_murmur"],
    "symptoms": ["typical_chest_pain", "dyspnea", "function_class", "atypical", "nonanginal",
                 "low_th_ang"],
    "ecg": ["q_wave", "st_elevation", "st_depression", "t_inversion", "lvh", "poor_r_progression",
            "bbb_lbbb", "bbb_rbbb"],
    "lab": ["fbs", "cr", "tg", "ldl", "hdl", "bun", "esr", "hb", "k", "na", "wbc", "lymph", "neut", "plt"],
    "echo": ["ef_tte", "region_rwma", "vhd"],
}
FEATURES = [f for group in FEATURE_GROUPS.values() for f in group]

# Dropped: constant in this dataset (all 'N').
DROPPED = ["exertional_cp"]

YN_COLS = ["obesity", "crf", "cva", "airway_disease", "thyroid_disease", "chf", "dlp",
           "weak_peripheral_pulse", "lung_rales", "systolic_murmur", "diastolic_murmur", "dyspnea",
           "atypical", "nonanginal", "exertional_cp", "low_th_ang", "lvh", "poor_r_progression"]
VHD_ORDER = {"N": 0, "mild": 1, "Moderate": 2, "Severe": 3}


def load_raw() -> pd.DataFrame:
    return pd.read_excel(RAW_XLSX, sheet_name=SHEET)


def load_clean() -> pd.DataFrame:
    df = load_raw().rename(columns=RENAME)
    unknown = set(df.columns) - set(RENAME.values())
    if unknown:
        raise ValueError(f"Unexpected columns in raw data: {sorted(unknown)}")

    df["sex_male"] = df["sex_male"].map({"Male": 1, "Fmale": 0})
    for c in YN_COLS:
        df[c] = df[c].map({"Y": 1, "N": 0})
    df["vhd"] = df["vhd"].map(VHD_ORDER)
    bbb = df.pop("bbb")
    df["bbb_lbbb"] = (bbb == "LBBB").astype(int)
    df["bbb_rbbb"] = (bbb == "RBBB").astype(int)
    df["cad"] = (df["cad"] == "CAD").astype(int)
    for v in VESSELS:
        df[v] = (df[v] == "Stenotic").astype(int)

    df = df.drop(columns=DROPPED)
    if df.isna().any().any():
        bad = df.columns[df.isna().any()].tolist()
        raise ValueError(f"Unmapped values produced NaN in: {bad}")
    return df[FEATURES + TARGETS]

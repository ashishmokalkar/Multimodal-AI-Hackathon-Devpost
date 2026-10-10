"""AngioCAD (Zenodo 15826856, CC BY 4.0): external cohort harmonised to Z-Alizadeh Sani column names (plan v2, E1-E3).

377 Iranian patients (Isfahan, 2025) with segment-level stenosis grades (NL, 1-25, 26-50, 51-75, 76-90, 91-99, 100 %).
Harmonisation:
  * labels: a segment is stenotic at >= 51 % (Z-Alizadeh uses >= 50 %; the 26-50 band cannot be split).
    LAD = LM, proximal / mid / distal LAD, D1, D2.   LCX = LM, proximal / mid / distal LCX, OM, plus PDA and PLB in
    left-dominant hearts.   RCA = proximal / mid / distal RCA, plus PDA and PLB in right-dominant hearts.
    CAD = any of the three.
  * units: LVEF, neutrophil and lymphocyte fractions -> %; "BUN" is urea (median 31 vs 16 mg/dL in Z-Alizadeh),
    converted with BUN = urea / 2.14.
  * implausible entries -> missing: BMI > 70, Hb > 25 g/dL, creatinine > 15 mg/dL, platelets < 20 x 10^3/uL.
  * presentation: `acute` = STEMI or NSTEMI (55 % of AngioCAD; Z-Alizadeh is an elective chest-pain cohort).
Columns AngioCAD does not record (chest pain, ECG, BP, ESR, K, Na, RWMA, VHD, family history, ...) are absent;
models that pool both cohorts see them as missing.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from ml.data import ROOT

RAW = ROOT / "data" / "raw" / "angiocad" / "AngioCAD_Features.xlsx"
STENOTIC = {"51-75", "76-90", "91-99", "100"}
SEGMENTS = {"lad": ["LM", "Prox LAD", "Mid LAD", "Dist LAD", "1st dig", "2nd dig"],
            "lcx": ["LM", "Prox LCX", "Mid LCX", "Dist LCX", "OM"],
            "rca": ["Prox RCA", "Mid RCA", "Dist RCA"]}
DOMINANCE_SEGMENTS = ["PDA", "PLB"]


def load_angiocad() -> pd.DataFrame:
    raw = pd.read_excel(RAW)
    sten = raw[sum(SEGMENTS.values(), []) + DOMINANCE_SEGMENTS].astype(str).isin(STENOTIC)
    left_dominant = (raw.dominance == "Left").to_numpy()
    dom = sten[DOMINANCE_SEGMENTS].any(axis=1).to_numpy()
    out = pd.DataFrame({
        "age": raw.Age, "sex_male": (raw.Sex == "Male").astype(int), "weight": raw.Weight,
        "bmi": raw.BMI.where(raw.BMI <= 70), "dm": raw.DM, "htn": raw.HTN, "dlp": raw.Hyperlipidemia,
        "current_smoker": raw["Current Smoker"], "cva": raw.Stroke, "weak_peripheral_pulse": raw.PVD,
        "ef_tte": raw.LVEF * 100, "tg": raw.TG, "ldl": raw.LDL, "hdl": raw.HDL, "fbs": raw.FBS,
        "cr": raw.Cr.where(raw.Cr <= 15), "bun": raw["BUN "] / 2.14, "hb": raw.Hgb.where(raw.Hgb <= 25),
        "wbc": raw.leukocytes, "neut": raw.Neut * 100, "lymph": raw.Lymph * 100, "plt": raw.PLT.where(raw.PLT >= 20),
        "acute": raw.Diagnosis.isin(["STEMI", "NSTEMI"]).astype(int), "diagnosis": raw.Diagnosis,
    })
    out["lad"] = sten[SEGMENTS["lad"]].any(axis=1).astype(int)
    out["lcx"] = (sten[SEGMENTS["lcx"]].any(axis=1).to_numpy() | (left_dominant & dom)).astype(int)
    out["rca"] = (sten[SEGMENTS["rca"]].any(axis=1).to_numpy() | (~left_dominant & dom)).astype(int)
    out["cad"] = out[["lad", "lcx", "rca"]].max(axis=1)
    return out


def aligned(ext: pd.DataFrame, columns: pd.Index) -> pd.DataFrame:
    """External rows on a Z-Alizadeh feature matrix's columns (missing where AngioCAD has no equivalent)."""
    return ext.reindex(columns=columns).astype(float)


if __name__ == "__main__":
    a = load_angiocad()
    print(a.shape, a[["cad", "lad", "lcx", "rca", "acute"]].mean().round(3).to_dict())
    print(a.groupby("diagnosis")[["cad", "lad", "lcx", "rca"]].mean().round(2))
    print("missing:", a.isna().sum()[a.isna().sum() > 0].to_dict())
    print(np.round(a.describe().loc[["min", "50%", "max"]], 1).T.to_string())

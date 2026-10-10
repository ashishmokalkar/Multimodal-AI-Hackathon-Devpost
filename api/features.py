"""Frontend-facing input features (contract v1.1.0) and their conversion to the model encoding.

Everything the models need is computed here, exactly once, in the backend:
  * names        contract names (e.g. "Ex-Smoker" -> smoking status) map to the dataset encoding of ml.data.load_clean();
  * units        WBC is entered as x10^3/uL (as printed on lab reports) and multiplied by 1000 here;
  * derived      BMI = weight / height^2 and the dataset's obesity flag (BMI > 25) are computed, not entered;
  * merged       the three exclusive chest-pain flags and the two exclusive smoking flags become one choice each;
  * dropped      "Exertional CP" (constant 'N' in all 303 patients) is not an input.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from ml.data import FEATURES

DEMO, EXAM, ECG, LAB, ECHO = "Demographics", "Symptoms/Exam", "ECG", "Lab", "Echo"

CHEST_PAIN = ["None", "Typical", "Atypical", "Non-anginal"]
SMOKING = ["Never", "Former", "Current"]
BBB = ["None", "LBBB", "RBBB"]
VHD = ["None", "Mild", "Moderate", "Severe"]


def _num(name, label, group, unit, lo, hi, default, description, col, scale=1.0):
    return {"name": name, "label": label, "group": group, "type": "number", "unit": unit, "min": lo, "max": hi,
            "default": default, "description": description, "_col": col, "_scale": scale}


def _bool(name, label, group, description, col):
    return {"name": name, "label": label, "group": group, "type": "boolean", "default": False,
            "description": description, "_col": col}


def _cat(name, label, group, options, default, description, unit=None):
    d = {"name": name, "label": label, "group": group, "type": "categorical", "options": options, "default": default,
         "description": description}
    if unit:
        d["unit"] = unit
    return d


# min/max are plausibility limits (outside -> HTTP 422); the narrower ranges seen in training produce a warning.
# Numeric defaults are the dataset medians; yes/no defaults are "No" and choices default to their "none" option.
FEATURE_SPECS: list[dict] = [
    _num("Age", "Age", DEMO, "years", 18, 100, 58, "Age in completed years.", "age"),
    _num("Weight", "Weight", DEMO, "kg", 35, 200, 74, "Body weight.", "weight"),
    _num("Length", "Height", DEMO, "cm", 130, 210, 165, "Body height. BMI is calculated from height and weight.",
         "height"),
    _cat("Sex", "Sex", DEMO, ["Female", "Male"], "Male", "Sex recorded at the time of the visit."),
    _bool("DM", "Diabetes", DEMO, "Diagnosed diabetes mellitus.", "dm"),
    _bool("HTN", "High blood pressure", DEMO, "Diagnosed hypertension.", "htn"),
    _cat("Smoking", "Smoking", DEMO, SMOKING, "Never", "Never smoked, former smoker, or current smoker."),
    _bool("FH", "Family history of heart disease", DEMO, "Early coronary heart disease in a close relative.", "fh"),
    _bool("CRF", "Chronic kidney failure", DEMO, "Diagnosed chronic renal failure.", "crf"),
    _bool("CVA", "Previous stroke", DEMO, "History of stroke (cerebrovascular accident).", "cva"),
    _bool("Airway", "Lung airway disease", DEMO, "Asthma or chronic obstructive pulmonary disease.", "airway_disease"),
    _bool("Thyroid Disease", "Thyroid disease", DEMO, "Diagnosed thyroid disease.", "thyroid_disease"),
    _bool("CHF", "Heart failure", DEMO, "Diagnosed congestive heart failure.", "chf"),
    _bool("DLP", "High cholesterol (dyslipidaemia)", DEMO, "Diagnosed abnormal blood fats.", "dlp"),
    _num("BP", "Blood pressure (systolic)", EXAM, "mmHg", 70, 240, 130, "Systolic (upper) blood pressure.", "bp"),
    _num("PR", "Pulse rate", EXAM, "beats/min", 35, 180, 70, "Resting heart rate.", "pr"),
    _cat("Chest Pain", "Chest pain type", EXAM, CHEST_PAIN, "None",
         "Typical: chest discomfort brought on by exertion or stress and relieved by rest. Atypical: two of those "
         "features. Non-anginal: one or none. None: no chest pain."),
    _bool("Dyspnea", "Shortness of breath", EXAM, "Breathlessness reported by the patient.", "dyspnea"),
    _cat("Function Class", "Functional class", EXAM, [0, 1, 2, 3], 0,
         "Functional class as coded in the source dataset (0-3; 0 in 211 of 303 patients)."),
    _bool("LowTH Ang", "Low-threshold angina", EXAM, "Chest pain brought on by little effort.", "low_th_ang"),
    _bool("Edema", "Leg swelling (oedema)", EXAM, "Peripheral oedema on examination.", "edema"),
    _bool("Weak Peripheral Pulse", "Weak pulses in the limbs", EXAM, "Weak peripheral pulse on examination.",
          "weak_peripheral_pulse"),
    _bool("Lung rales", "Crackles in the lungs", EXAM, "Lung rales heard on examination.", "lung_rales"),
    _bool("Systolic Murmur", "Systolic heart murmur", EXAM, "Murmur heard during systole.", "systolic_murmur"),
    _bool("Diastolic Murmur", "Diastolic heart murmur", EXAM, "Murmur heard during diastole.", "diastolic_murmur"),
    _bool("Q Wave", "Q waves", ECG, "Pathological Q waves on the ECG.", "q_wave"),
    _bool("ST Elevation", "ST elevation", ECG, "ST-segment elevation on the ECG.", "st_elevation"),
    _bool("ST Depression", "ST depression", ECG, "ST-segment depression on the ECG.", "st_depression"),
    _bool("T inversion", "T-wave inversion", ECG, "Inverted T waves on the ECG.", "t_inversion"),
    _bool("LVH", "Thickened heart muscle (LVH)", ECG, "Left ventricular hypertrophy on the ECG.", "lvh"),
    _bool("Poor R Progression", "Poor R-wave progression", ECG, "Poor R-wave progression on the ECG.",
          "poor_r_progression"),
    _cat("BBB", "Bundle branch block", ECG, BBB, "None", "Left (LBBB) or right (RBBB) bundle branch block on the ECG."),
    _num("FBS", "Fasting blood sugar", LAB, "mg/dL", 40, 600, 98, "Fasting plasma glucose.", "fbs"),
    _num("CR", "Creatinine", LAB, "mg/dL", 0.3, 15, 1.0, "Serum creatinine (kidney function).", "cr"),
    _num("TG", "Triglycerides", LAB, "mg/dL", 20, 2000, 122, "Fasting triglycerides.", "tg"),
    _num("LDL", "LDL cholesterol", LAB, "mg/dL", 10, 400, 100, "'Bad' cholesterol.", "ldl"),
    _num("HDL", "HDL cholesterol", LAB, "mg/dL", 10, 150, 39, "'Good' cholesterol.", "hdl"),
    _num("BUN", "Blood urea nitrogen", LAB, "mg/dL", 2, 180, 16, "Kidney function marker.", "bun"),
    _num("ESR", "ESR", LAB, "mm/h", 0, 150, 15, "Erythrocyte sedimentation rate (inflammation marker).", "esr"),
    _num("HB", "Haemoglobin", LAB, "g/dL", 5, 20, 13.2, "Blood haemoglobin.", "hb"),
    _num("K", "Potassium", LAB, "mmol/L", 2, 8, 4.2, "Serum potassium.", "k"),
    _num("Na", "Sodium", LAB, "mmol/L", 110, 170, 141, "Serum sodium.", "na"),
    _num("WBC", "White blood cells", LAB, "x10^3/uL", 1, 50, 7.1,
         "White cell count as printed on most lab reports (x10^3/uL, same number as x10^9/L).", "wbc", 1000.0),
    _num("Lymph", "Lymphocytes", LAB, "%", 0, 100, 32, "Lymphocytes as a percentage of white cells.", "lymph"),
    _num("Neut", "Neutrophils", LAB, "%", 0, 100, 60, "Neutrophils as a percentage of white cells.", "neut"),
    _num("PLT", "Platelets", LAB, "x10^3/uL", 10, 1000, 210, "Platelet count.", "plt"),
    _num("EF-TTE", "Ejection fraction", ECHO, "%", 5, 90, 50,
         "How much blood the left ventricle pumps out with each beat, from a heart ultrasound (echo).", "ef_tte"),
    _cat("Region RWMA", "Regional wall-motion abnormality", ECHO, [0, 1, 2, 3, 4], 0,
         "Regional wall-motion abnormality on echo, as coded in the source dataset (0-4; 0 in 217 of 303 patients)."),
    _cat("VHD", "Heart valve disease", ECHO, VHD, "None", "Valvular heart disease severity on echo."),
]
SPECS = {f["name"]: f for f in FEATURE_SPECS}
NAMES = [f["name"] for f in FEATURE_SPECS]
REFERENCE = {f["name"]: f["default"] for f in FEATURE_SPECS}   # the "typical patient" explanations start from


def public_schema() -> list[dict]:
    """GET /features payload (private keys removed)."""
    return [{k: v for k, v in f.items() if not k.startswith("_")} for f in FEATURE_SPECS]


def training_ranges() -> dict[str, tuple[float, float]]:
    """Range of each numeric input seen in the 303 training patients, in contract units."""
    from ml.data import load_clean

    df = load_clean()
    return {f["name"]: (float(df[f["_col"]].min() / f.get("_scale", 1.0)), float(df[f["_col"]].max() / f.get("_scale", 1.0)))
            for f in FEATURE_SPECS if f["type"] == "number"}


def to_model_frame(rows: list[dict]) -> pd.DataFrame:
    """Contract-valued patients -> rows in the ml.data.load_clean() encoding (the exported models' input)."""
    p = pd.DataFrame(rows, columns=NAMES)
    out = pd.DataFrame(index=p.index)
    for f in FEATURE_SPECS:
        if f["type"] == "number":
            out[f["_col"]] = p[f["name"]].astype(float) * f.get("_scale", 1.0)
        elif f["type"] == "boolean":
            out[f["_col"]] = p[f["name"]].astype(bool).astype(int)
    out["sex_male"] = (p["Sex"] == "Male").astype(int)
    out["bmi"] = out["weight"] / (out["height"] / 100) ** 2
    out["obesity"] = (out["bmi"] > 25).astype(int)
    out["current_smoker"] = (p["Smoking"] == "Current").astype(int)
    out["ex_smoker"] = (p["Smoking"] == "Former").astype(int)
    out["typical_chest_pain"] = (p["Chest Pain"] == "Typical").astype(int)
    out["atypical"] = (p["Chest Pain"] == "Atypical").astype(int)
    out["nonanginal"] = (p["Chest Pain"] == "Non-anginal").astype(int)
    out["function_class"] = p["Function Class"].astype(int)
    out["region_rwma"] = p["Region RWMA"].astype(int)
    out["bbb_lbbb"] = (p["BBB"] == "LBBB").astype(int)
    out["bbb_rbbb"] = (p["BBB"] == "RBBB").astype(int)
    out["vhd"] = p["VHD"].map({v: i for i, v in enumerate(VHD)}).astype(int)
    return out[FEATURES]


def from_model_row(row: pd.Series) -> dict:
    """A load_clean() row -> contract values (used for the real dataset demo patients)."""
    out = {}
    for f in FEATURE_SPECS:
        if f["type"] == "number":
            v = float(row[f["_col"]]) / f.get("_scale", 1.0)
            out[f["name"]] = int(v) if float(v).is_integer() else round(v, 2)
        elif f["type"] == "boolean":
            out[f["name"]] = bool(row[f["_col"]])
    out["Sex"] = "Male" if row.sex_male else "Female"
    out["Smoking"] = "Current" if row.current_smoker else "Former" if row.ex_smoker else "Never"
    out["Chest Pain"] = ("Typical" if row.typical_chest_pain else "Atypical" if row.atypical
                         else "Non-anginal" if row.nonanginal else "None")
    out["Function Class"] = int(row.function_class)
    out["Region RWMA"] = int(row.region_rwma)
    out["BBB"] = "LBBB" if row.bbb_lbbb else "RBBB" if row.bbb_rbbb else "None"
    out["VHD"] = VHD[int(row.vhd)]
    return {n: out[n] for n in NAMES}


def validate(features: dict) -> list[dict]:
    """FastAPI-style error items for missing, unknown or out-of-domain values (empty list = valid)."""
    errors = []
    for name in features:
        if name not in SPECS:
            errors.append({"loc": ["body", "features", name], "msg": "Unknown feature", "type": "extra_forbidden"})
    for f in FEATURE_SPECS:
        loc = ["body", "features", f["name"]]
        if f["name"] not in features:
            errors.append({"loc": loc, "msg": "Field required", "type": "missing"})
            continue
        v = features[f["name"]]
        if f["type"] == "number":
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not np.isfinite(v):
                errors.append({"loc": loc, "msg": "Input should be a number", "type": "float_type"})
            elif v < f["min"]:
                errors.append({"loc": loc, "msg": f"Input should be greater than or equal to {f['min']}",
                               "type": "greater_than_equal"})
            elif v > f["max"]:
                errors.append({"loc": loc, "msg": f"Input should be less than or equal to {f['max']}",
                               "type": "less_than_equal"})
        elif f["type"] == "boolean" and not isinstance(v, bool):
            errors.append({"loc": loc, "msg": "Input should be a valid boolean", "type": "bool_type"})
        elif f["type"] == "categorical" and not any(v == o and type(v) is type(o) for o in f["options"]):
            errors.append({"loc": loc, "msg": f"Input should be one of {f['options']}", "type": "enum"})
    return errors

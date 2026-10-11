"""UCI Heart Disease (raw 76-attribute files) -> our feature schema (plan.md §6).

The raw files hold per-vessel angiography columns (attributes 59-68, value 2 = >= 50% narrowing),
which give LAD/LCX/RCA labels for Cleveland, VA Long Beach and Switzerland (604 patients).
Hungarian contributes CAD labels only (its vessel data is recorded almost exclusively for positives).

`load_uci()` returns one row per patient with harmonised features named exactly like ours
(NaN where UCI has no equivalent), the four targets (NaN where unknown) and `source`.
`shared_view(df)` builds the same harmonised columns for Z-Alizadeh rows.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from ml.data import ROOT
from ml.features import CHEST_PAIN_LEVELS, pretest_prob

UCI_DIR = ROOT / "data" / "raw" / "uci_heart_disease"
FILES = {"cleveland": "cleveland.data", "hungarian": "hungarian.data", "switzerland": "switzerland.data",
         "va": "long-beach-va.data"}

ATTRS = ("id ccf age sex painloc painexer relrest pncaden cp trestbps htn chol smoke cigs years fbs dm famhist "
         "restecg ekgmo ekgday ekgyr dig prop nitr pro diuretic proto thaldur thaltime met thalach thalrest tpeakbps "
         "tpeakbpd dummy trestbpd exang xhypo oldpeak slope rldv5 rldv5e ca restckm exerckm restef restwm exeref "
         "exerwm thal thalsev thalpul earlobe cmo cday cyr num lmt ladprox laddist diag cxmain ramus om1 om2 "
         "rcaprox rcadist lvx1 lvx2 lvx3 lvx4 lvf cathef junk name").split()

# Vessel territories (segment value 2 = >= 50% stenosis). Left main feeds both LAD and LCX.
VESSEL_SEGMENTS = {
    "lad": ["lmt", "ladprox", "laddist", "diag"],
    "lcx": ["lmt", "cxmain", "ramus", "om1", "om2"],
    "rca": ["rcaprox", "rcadist"],
}

# Harmonised feature columns shared by both datasets (names match ml.features where they exist).
SHARED = ["age", "sex_male", "chest_pain_type", "bp", "pr", "htn", "dm", "fh", "smoking", "lvh",
          "fbs_gt120", "st_t_abnormal", "pretest_prob", "age_x_male", "female_ge50"]

# UCI cp: 1 typical angina, 2 atypical angina, 3 non-anginal pain, 4 asymptomatic
UCI_CP = {1: CHEST_PAIN_LEVELS["typical"], 2: CHEST_PAIN_LEVELS["atypical"], 3: CHEST_PAIN_LEVELS["nonanginal"],
          4: CHEST_PAIN_LEVELS["none"]}


def parse_raw(path) -> pd.DataFrame:
    """Records are whitespace-separated and end with the literal token 'name'; -9 means missing."""
    tokens = path.read_text(encoding="latin-1").split()
    records, cur = [], []
    for tok in tokens:
        cur.append(tok)
        if tok == "name":
            records.append(cur)
            cur = []
    rows = [r for r in records if len(r) == len(ATTRS)]  # a few corrupted Cleveland records are dropped
    df = pd.DataFrame(rows, columns=ATTRS).drop(columns=["name"])
    df = df.apply(pd.to_numeric, errors="coerce")
    return df.mask(df == -9)


def _vessel_label(raw: pd.DataFrame, segments: list[str]) -> pd.Series:
    """1 if any segment >= 50% narrowed; 0 if every segment this source records is known and none is; else NaN.

    Segments a source never records (e.g. Cleveland has no diag/ramus/om2) are ignored rather than
    treated as unknown, otherwise no Cleveland patient could ever be labelled 'not stenotic'.
    """
    recorded = [s for s in segments if raw[s].notna().any()]
    seg = raw[recorded]
    any_sten = (seg == 2).any(axis=1)
    all_known = seg.notna().all(axis=1)
    return pd.Series(np.where(any_sten, 1.0, np.where(all_known, 0.0, np.nan)), index=raw.index)


def _derived(out: pd.DataFrame) -> pd.DataFrame:
    """Features computed from age / sex / chest pain, identical for both datasets."""
    out["age_x_male"] = out.age * out.sex_male
    out["female_ge50"] = ((out.sex_male == 0) & (out.age >= 50)).astype(float).where(out.sex_male.notna())
    cp = out.chest_pain_type
    rows = pd.DataFrame({"age": out.age, "sex_male": out.sex_male, "typical_chest_pain": (cp == 3).astype(int),
                         "atypical": (cp == 2).astype(int), "nonanginal": (cp == 1).astype(int)})
    ok = out[["age", "sex_male", "chest_pain_type"]].notna().all(axis=1)  # NaN for UCI rows by design
    out["pretest_prob"] = np.nan
    out.loc[ok, "pretest_prob"] = pretest_prob(rows[ok].astype({"sex_male": int})).pretest_prob
    return out


def harmonise_uci(raw: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=raw.index)
    out["age"] = raw.age
    out["sex_male"] = raw.sex
    # Chest-pain semantics are NOT transferable: in UCI 'asymptomatic' has the highest CAD rate
    # (Cleveland 71%, VA 82%) and typical angina a low one (27%), the reverse of Z-Alizadeh (typical 94%).
    # So chest pain (and the pre-test probability derived from it) is set missing for UCI rows.
    out["chest_pain_type"] = np.nan
    out["uci_cp"] = raw.cp.map(UCI_CP)  # kept for diagnostics only, never a model feature
    out["bp"] = raw.trestbps.where(raw.trestbps > 0)
    out["pr"] = raw.thalrest.where(raw.thalrest > 0)
    out["htn"] = raw.htn
    out["dm"] = raw.dm.fillna(0)  # UCI records diabetes only when present (Cleveland: 23 x '1', 259 x missing)
    out["fh"] = raw.famhist
    out["smoking"] = raw.smoke.map({0: 0, 1: 2})  # UCI has current smoking only (no ex-smoker level)
    out["lvh"] = (raw.restecg == 2).astype(float).where(raw.restecg.notna())
    out["fbs_gt120"] = raw.fbs
    out["st_t_abnormal"] = (raw.restecg == 1).astype(float).where(raw.restecg.notna())
    out = _derived(out)
    out["cad"] = (raw.num > 0).astype(float).where(raw.num.notna())
    for v, segs in VESSEL_SEGMENTS.items():
        out[v] = _vessel_label(raw, segs)
    return out


def load_uci() -> pd.DataFrame:
    parts = []
    for source, fname in FILES.items():
        h = harmonise_uci(parse_raw(UCI_DIR / fname))
        if source == "hungarian":
            # Hungarian vessel segments are recorded almost only for stenotic patients (every labelled
            # LAD/LCX/RCA is positive): a selection bias, so Hungary contributes CAD labels only.
            h[list(VESSEL_SEGMENTS)] = np.nan
        h.insert(0, "source", source)
        parts.append(h)
    return pd.concat(parts, ignore_index=True)


def shared_view(df: pd.DataFrame) -> pd.DataFrame:
    """Harmonised SHARED columns for Z-Alizadeh rows (from `ml.data.load_clean()` output)."""
    from ml.features import chest_pain_type
    out = pd.DataFrame(index=df.index)
    out["age"] = df.age
    out["sex_male"] = df.sex_male
    out["chest_pain_type"] = chest_pain_type(df)
    out["bp"] = df.bp
    out["pr"] = df.pr
    out["htn"] = df.htn
    out["dm"] = df.dm
    out["fh"] = df.fh
    out["smoking"] = np.select([df.current_smoker == 1, df.ex_smoker == 1], [2, 1], 0)
    out["lvh"] = df.lvh
    out["fbs_gt120"] = (df.fbs > 120).astype(int)
    out["st_t_abnormal"] = ((df.st_depression + df.st_elevation + df.t_inversion) > 0).astype(int)
    return _derived(out.astype(float))[SHARED]

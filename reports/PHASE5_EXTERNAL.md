# Phase 5: external data (UCI Heart Disease)

Reproduce with `python scripts/download_data.py` then `python -m ml.run_external --n-jobs 25` (about 25 min).
Code: `ml/external.py` (parser and harmonisation), `ml/strategies.py::Pooled`, `ml/run_external.py`. Outputs: `reports/phase5/`.

**Bottom line: the external data does not improve any target, so we do not use it for the final models.**
That is still a useful result. The transfer check below is an honest external validation, and the data work uncovered two dataset pitfalls worth documenting.

## Data
The raw 76-attribute UCI files contain per-segment angiography columns (value 2 = ≥ 50% narrowing). Segments map to our vessels as follows:
LAD = left main + proximal/distal LAD + diagonal; LCX = left main + circumflex + ramus + OM1/OM2; RCA = proximal/distal RCA.

| Source | Patients | CAD labels | Vessel labels | CAD prevalence |
|---|---|---|---|---|
| Cleveland | 282 | ✅ | ✅ | 44% |
| VA Long Beach | 200 | ✅ | ✅ | 74% |
| Switzerland | 123 | ✅ | ✅ | 93% |
| Hungary | 294 | ✅ | ❌ (see below) | 36% |
| **Total** | **899** | **899** | **605** | |

CAD agrees with "any vessel stenotic" for 99.4% of the vessel-labelled patients, which confirms the label mapping.

### Pitfalls found during harmonisation
1. **Cleveland never records three minor segments** (diag, ramus, om2: 100% missing). A naive "all segments known" rule made every Cleveland vessel label positive. Fix: ignore segments a source never records.
2. **Hungarian vessel segments are recorded almost only for stenotic patients.** Every Hungarian vessel label was positive, a selection bias. Hungary contributes CAD labels only.
3. **Chest-pain semantics are reversed between the cohorts:**

   | Chest pain | CAD rate, Z-Alizadeh | CAD rate, Cleveland / VA |
   |---|---|---|
   | Typical angina | **94%** | 27% / 62% |
   | Asymptomatic | 63% | **71% / 82%** |

   Transferring chest pain (and the Diamond-Forrester pre-test probability built on it) would teach the model the wrong direction for our strongest feature. These columns are set to **missing for UCI rows**.
4. Diabetes is recorded only when present in UCI (`NaN` means no).

Shared features after harmonisation: age, sex, BP, resting HR, HTN, DM, family history, smoking, LVH, FBS > 120, ST-T abnormality, age × sex.

## Experiments (top-3 phase 3 models per target, untouched repeats r5–r9)

### E0: transfer check (train on UCI only, score all 303 Z-Alizadeh patients)
| Target | UCI-trained → Z-Alizadeh | Same features, trained within Z-Alizadeh |
|---|---|---|
| CAD | 0.714 | 0.838 |
| LAD | 0.644 | 0.738 |
| LCX | 0.666 | 0.704 |
| RCA | 0.627 | 0.700 |

UCI carries real signal for our patients (all well above 0.5) but loses 0.04–0.12 AUC to **cohort shift**. The cohorts differ in sex (UCI vessel cohort 92% male vs 58%), era (1980s vs 2010s), referral pattern (the chest-pain reversal) and prevalence.

### E1: UCI model's score as one extra feature · E2: pooled training (UCI rows weighted w, `source` flag)
| Target | E1 mean Δ vs own S0 | E1 best Δ | E2 mean Δ vs own S0 | E2 best Δ | Passes decision rule |
|---|---|---|---|---|---|
| CAD | −0.001 | +0.001 | −0.034 | −0.004 | ❌ |
| LAD | −0.000 | −0.000 | −0.007 | +0.001 | ❌ |
| LCX | +0.003 | +0.004 | −0.007 | −0.001 | ❌ |
| RCA | +0.003 | +0.010 (XGB) | −0.006 | +0.000 | ❌ |

Weight screening (repeats r0–r4) shows the pattern clearly: **AUC falls as the UCI weight rises** for 8 of 12 model-target pairs (for example RCA logistic regression: w 0.25 → 0.740, 0.5 → 0.737, 1.0 → 0.734).
(An SVM on pooled CAD data degraded sharply, to 0.84. The imputed, weighted, mixed-cohort kernel geometry clearly does not suit RBF-SVM.)

## Why it didn't help, and what that means
- The EDA learning curves said **more Z-Alizadeh-like data** would help LCX and RCA. UCI is not Z-Alizadeh-like: the strongest feature (chest pain) can't be shared, and roughly half our engineered and lab features have no UCI equivalent.
- **E1** is the safest form of transfer (it can only add one feature), and it is neutral to slightly positive (+0.003 on LCX and RCA, within noise). Its OOF predictions are kept as **optional diversity candidates for the phase 7 ensemble**.
- **E2 (pooling)** is consistently negative and is dropped.

## For the write-up / judges
- External validity: a model built from routine features in one population (UCI, US/European 1980s) reaches AUC 0.63–0.71 in another (Iran 2010s). This motivates per-site recalibration if the tool were ever deployed.
- The negative result is reported with the same paired, corrected-SE methodology as the positive ones. We did not keep searching for a configuration that happens to look good.

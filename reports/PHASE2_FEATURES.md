# Phase 2: feature cleaning and engineering

Reproduce with `python -m ml.run_features` (about 15 min on 28 cores). Raw outputs are in `reports/phase2/`.
Code: `ml/features.py` (F1 cleaning and candidates), `ml/preprocess.py` (fold-fitted linear preprocessing).

## Protocol
- **Screening** on CV repeats r0–r4 and **confirmation** on the untouched repeats r5–r9 (same fixed folds file).
  This limits the bias from choosing features and scoring them on the same splits. The final unbiased number still comes from nested CV (plan P7).
- Each candidate is added to F1 and tested with 3 untuned models (logistic regression, RF, XGBoost) × 4 targets.
- **Keep rule per target:** the mean ΔAUC over the models is > 0, at least one model passes the corrected-SE decision rule, and no model loses more than 1 corrected SE.

## Results

### Final: F2 vs raw F0 on the untouched repeats r5–r9 (ROC-AUC)
| Target | Best model | F0 | F2 | Δ | Passes decision rule |
|---|---|---|---|---|---|
| CAD | Logistic regression | 0.924 | **0.932** | +0.008 | ✅ |
| LAD | Random forest | 0.842 | **0.849** | +0.007 | ❌ (LR +0.015 ✅, XGB +0.015 ✅) |
| LCX | Random forest | 0.741 | **0.764** | +0.023 | ✅ |
| RCA | Logistic regression | 0.714 | **0.736** | +0.022 | ✅ |

**Exit criterion met:** the best model for each target improves. The only drop is RCA with RF (−0.006), well within noise.

### What was kept
| Target | F2 = F1 + … | n features |
|---|---|---|
| CAD | `pretest_prob`, `age_x_male` / `female_ge50`, `comorbidity_count` (replaces 8 rare binaries) | 45 |
| LAD | `pretest_prob`, `rwma_any` / `rwma_severe` | 52 |
| LCX | `pretest_prob`, `age_x_male` / `female_ge50`, `comorbidity_count` (replace) | 45 |
| RCA | `comorbidity_count` (replace) | 42 |

The exact sets are in `reports/phase2/f2_feature_sets.json`. Build them with `ml.features.build(df, add=..., replace=...)`.

### Findings
1. **`pretest_prob` (Diamond-Forrester) is the most valuable engineered feature.** It is selected for CAD, LAD and LCX, and it is the largest single gain for LCX (+0.019 mean ΔAUC). Its univariate AUC is 0.83 for CAD and 0.71 for LCX, higher than any raw feature.
2. **Summing rare binaries into `comorbidity_count` helps 3 of 4 targets.** Dropping 8 near-empty columns removes noise.
3. **Cleaning (F0 → F1) is neutral on its own**, once linear models one-hot encode `chest_pain_type`. An ordinal 0–3 chest-pain code cost LR −0.010 AUC on CAD before that fix.
4. **Robust linear preprocessing** (P1/P99 winsorising + log1p on skewed labs, fitted per fold) gives LR a small gain on CAD, LAD and LCX. It is now the default in `linear_pipeline`.
5. **Did not help:** NLR, lipid ratios (TG/HDL, LDL/HDL), PLR/ANC, metabolic score, ECG-ischaemia pooling, EF category, FBS/BP stages. Several of them **hurt** LCX/RCA (up to −0.014). The inflammation signal for RCA (neut, lymph) is already captured by the raw columns.
6. Engineered features help **linear models and XGBoost much more than RF** (RF changes are within noise), which is consistent with RF already finding thresholds and interactions itself.

## Caveats
- The confirmation repeats use the same 303 patients with different splits, so they are less optimistic than the screening numbers but still not a true hold-out. Nested CV in P7 gives the number we report.
- The `pretest_prob` table values are from Diamond & Forrester (NEJM 1979). Verify them against the paper before citing.

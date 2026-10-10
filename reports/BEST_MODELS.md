# Best models per label (plan v2, stage S9)

This is the final choice of model for each output (CAD, LAD, LCX, RCA), after the full plan-v2 search:
- cleaning, preprocessing and feature engineering, including 10 published clinical risk scores;
- TabPFN v2.5–v3.5, including tuning and fine-tuning;
- 27 AutoGluon model families on the GPU, with compositions, bagging and stacking;
- the re-tuned classical zoo;
- multi-label strategies;
- the AngioCAD external cohort;
- grand ensembles and post-processing.

The plan is in [plan_v2.md](../plan_v2.md). The raw tables are in [reports/v2/s9/](v2/s9/).

## Protocol (why the numbers are honest)
- **Fixed folds:** 10 repeats × 5 stratified folds, saved in `data/processed/folds.csv`.
  - Every decision (cleaning, features, tuning, model choice, ensemble weights, calibration) used **repeats r0–r4 only**.
  - **Repeats r5–r9 were never looked at until this report.** Every number below is on r5–r9 unless marked otherwise.
- **Champion rule:** the highest mean AUC on r0–r4, chosen among all single candidates, five ensemble methods and the phase-3 champion (re-scored on r0–r4).
  - Ensembles were scored on r0–r4 by leaving one repeat out: weights fitted on the other four repeats' out-of-fold (OOF) predictions for the split's training patients.
  - This is mildly optimistic for ensembles, because those OOF predictions come from models that saw the test patients in other repeats. It still did not change which ensemble ranked first.
- **Comparisons are paired** (same folds). The SE is Nadeau–Bengio corrected. We call a difference real only when it exceeds 1 corrected SE.
- **One caveat:** the phase-3 leaderboard was ranked on r5–r9. The CAD champion (the phase-3 EBM) therefore carries a small selection effect. The three v2 champions do not.

## Champions

| Label | Champion | Features | ROC-AUC (r5–r9) | 95% CI | vs phase-3 best | vs untuned LR (raw 55) | vs default TabPFN | vs best AutoGluon |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **CAD** | EBM (glassbox GAM), phase 3 | 45 (F2) | **0.939** | 0.908–0.962 | = (same model) | +0.015 (SE 0.013) | +0.008 (0.010) | +0.003 (0.007) |
| **LAD** | CatBoost, re-tuned | 53 (F\*: + Duke score, top-20 RF selection) | **0.866** | 0.824–0.905 | +0.005 (0.014) | **+0.055** (0.017) | **+0.024** (0.011) | +0.006 (0.009) |
| **LCX** | XGBoost, re-tuned | 66 (F\*: + all 10 risk scores, pairwise products, top-30 selection) | **0.784** | 0.727–0.824 | +0.012 (0.022) | **+0.121** (0.039) | **+0.042** (0.026) | −0.002 (0.013) |
| **RCA** | L2 logistic stack of 8 classical models | 44 (F\*: + Jang score) | **0.767** | 0.715–0.811 | +0.016 (0.017) | **+0.054** (0.027) | **+0.029** (0.018) | +0.014 (0.015) |

Bold differences exceed 1 corrected SE.

The RCA stack's non-negative weights on member logits are: LightGBM 0.80, logistic regression 0.51, EBM 0.46, kNN 0.37, Gaussian NB 0.14, random forest 0.06, SVM 0.05, extra trees 0.004.

### Progress against goals and competitors

| | CAD | LAD | LCX | RCA |
|---|:---:|:---:|:---:|:---:|
| Untuned baseline (EDA) | 0.925 | 0.851 | 0.744 | 0.717 |
| Phase 3 best | 0.939 | 0.861 | 0.772 | 0.752 |
| **Final (plan v2)** | **0.939** | **0.866** | **0.784** | **0.767** |
| Goal / stretch | 0.94 / 0.95 | 0.87 / 0.89 | 0.78 / 0.81 | 0.76 / 0.79 |
| Other public Track A repos | 0.85–0.94 | 0.79–0.86 | 0.67–0.75 | 0.66–0.74 |

LCX and RCA meet their goals. CAD and LAD land just under theirs. All four are at or above the top of the competitor ranges.

**What the extra search bought:** the gains over phase 3 are modest (+0.005 to +0.016) and **none is significant on its own** at n = 303. The gains against simple baselines are large and significant.

## Post-processing (S9b: fitted per r5–r9 outer fold on training patients' r0–r4 OOF)

| Label | Calibrated AUC* | Brier | ECE | Calibration slope | Threshold (max balanced accuracy) | Accuracy | Balanced accuracy | F1 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| CAD | 0.932 | 0.088 | 0.040 | 0.97 | 0.69 | 0.867 | 0.868 | 0.903 |
| LAD | 0.864 | 0.146 | 0.047 | 0.94 | 0.54 | 0.781 | 0.773 | 0.813 |
| LCX | 0.767 | 0.191 | 0.053 | 0.92 | 0.35 | 0.683 | 0.695 | 0.646 |
| RCA | 0.762 | 0.191 | 0.047 | 0.92 | 0.36 | 0.669 | 0.682 | 0.625 |

<sub>*AUC pooled over each repeat's five test folds, so it is slightly below the per-fold mean above.</sub>

- **Calibration:** Platt scaling on the logit, for all four labels.
  - It matters most for the RCA stack: ECE drops from 0.138 to 0.047, and the slope moves from 0.40 to 0.92.
  - Isotonic was always worst at n = 303.
- **Thresholds:** we use the threshold that maximises balanced accuracy, which favours sensitivity on the minority classes.
  - For LCX and RCA it moves the cut-off from 0.5 to about 0.35, raising balanced accuracy from 0.696 to 0.695 (LCX, unchanged) and from 0.660 to 0.682 (RCA), and F1 from 0.63 to 0.65 and from 0.55 to 0.63.
  - For CAD it moves the cut-off up to 0.69, trading accuracy (0.882 → 0.867) for balanced accuracy (0.847 → 0.868).
- **Consistency:** P(vessel) is capped at P(CAD).
  - Vessel AUC changes by +0.003 / +0.002 / +0.003 (LAD / LCX / RCA), and Brier never gets worse.
  - It is kept so that the 3D view can never show a vessel as more likely than any disease at all.
- **Conformal prediction sets (90% split conformal):**

  | Label | Coverage | Mean set size | Single-answer sets |
  |---|:---:|:---:|:---:|
  | CAD | 0.895 | 1.03 | 96% |
  | LAD | 0.889 | 1.24 | 76% |
  | LCX | 0.900 | 1.46 | 54% |
  | RCA | 0.889 | 1.46 | 54% |

  For roughly half of the patients, the model honestly cannot call LCX or RCA either way. The dashboard shows these patients as "uncertain".

## Robustness (S9c, r5–r9)

**Seeds:** refitting the single-model champions with two more seeds moves AUC by at most 0.004:

| Label | AUC range across 3 seeds |
|---|:---:|
| CAD | 0.938–0.939 |
| LAD | 0.866–0.869 |
| LCX | 0.782–0.784 |

The RCA stack averages 8 models and was not refitted.

**Learning curve:** AUC with 50% / 75% / 100% of each training fold:

| Label | 50% | 75% | 100% |
|---|:---:|:---:|:---:|
| CAD | 0.923 | 0.927 | 0.939 |
| LAD | 0.853 | 0.861 | 0.866 |
| LCX | 0.767 | 0.781 | 0.784 |

AUC is still rising at 100%. More patients would help, but harmonised external data did not (see below).

**Subgroups:**

| Group (n) | CAD | LAD | LCX | RCA |
|---|:---:|:---:|:---:|:---:|
| Male (176) | 0.908 | 0.876 | 0.776 | 0.725 |
| Female (127) | 0.965 | 0.844 | 0.746 | 0.805 |
| Age < 50 (58) | 0.902 | 0.855 | 0.765 | 0.853 |
| Age 50–64 (150) | 0.946 | 0.867 | 0.780 | 0.770 |
| **Age ≥ 65 (95)** | **0.848** | **0.807** | **0.651** | **0.677** |
| Diabetic (90) | 0.975 | **0.739** | 0.727 | 0.694 |
| Non-diabetic (213) | 0.919 | 0.900 | 0.785 | 0.739 |

The models are weakest in patients aged 65 and over, and for LAD in diabetics. The dashboard should flag lower reliability for these groups.

## What did not make the cut (all measured on the same folds)

| Tried | Result |
|---|---|
| TabPFN v2.5 / v2.6 / v3 / v3.5: defaults, a 13-parameter search, seed bags, fine-tuning, an AutoTabPFN-style ensemble | Best untuned model, but never beats the re-tuned classical models. Fine-tuning was never kept |
| AutoGluon: 27 families on the GPU (incl. RealTabPFN-v2.5, TabICL, Mitra, TabM, FT-Transformer, TabPFNMix, imodels) | The best family per label ties the champion (see the table above) |
| AutoGluon: top-6/top-10 compositions, 1–2 stack levels, dynamic stacking, 10×3 bagging, balanced weights, log-loss metric | No variant beats the best single family. Stacking hurts RCA (−0.02) |
| Grand ensembles (top-3 mean/rank, Caruana, LR stack) | Only RCA's LR stack ranks first on r0–r4. The models' OOF predictions correlate 0.91–0.96 |
| Multi-label strategies: joint 8-pattern model, hierarchical P(vessel \| CAD), classifier chains | None passes the keep rule |
| AngioCAD (377 patients, Zenodo 15826856) pooled into training | Pooling all patients hurts. Angina-only pooling is neutral. Cross-cohort transfer AUC: 0.61–0.78 |
| TabPFN embeddings as features (FE5) | Not kept for any label |
| Published risk scores as features (ESC 2019/2024, CAD Consortium, Duke, Jang…) | **Kept** for LAD (Duke), LCX (all 10) and RCA (Jang) |

## Export (S9, `python -m ml.export`)

Each champion is refitted on all 303 patients and saved to `models/<label>.joblib`, with `models/manifest.json` recording features, weights, calibration, threshold, conformal quantile and validation metrics.

| Label | Exported threshold | Conformal q | Latency / patient (CPU) | File size |
|---|:---:|:---:|:---:|:---:|
| CAD | 0.689 | 0.546 | 6 ms | 0.1 MB |
| LAD | 0.550 | 0.684 | 13 ms | 0.6 MB |
| LCX | 0.324 | 0.711 | 22 ms | 0.2 MB |
| RCA | 0.357 | 0.682 | 86 ms | 6.3 MB |

- **Interface:** `ml.export.load_models()` + `predict_all(models, df)` give calibrated probabilities with the consistency cap. `ChampionModel.conformal_set(p)` gives the prediction set.
  - Input is raw patient rows in the `ml.data.load_clean()` format. All feature engineering is row-wise.
  - A one-row prediction equals the batch prediction; the export asserts this.
- **Runtime:** CPU only, in the main environment. **No TabPFN or AutoGluon at runtime**, so there is no GPU, licence token or second environment.
- **Licences:** EBM (MIT), CatBoost and XGBoost (Apache-2.0), LightGBM (MIT), scikit-learn (BSD).
- **Explanations:**
  - CAD: exact additive EBM contributions.
  - LAD / LCX: TreeSHAP.
  - RCA: member SHAP values combined on the logit scale with the stack weights.
  - For raw-input attributions in the API: permutation SHAP of the end-to-end pipeline. Engineered features fold back into the inputs they come from.

## Reproduce
```bash
python -m ml.run_v2 --stage s9a   # champion selection on r0-r4      -> reports/v2/s9/s9_selection.csv
python -m ml.run_v2 --stage s9b   # calibration/threshold/conformal  -> s9_calibration|thresholds|conformal|consistency.csv
python -m ml.run_v2 --stage s9c   # robustness                       -> s9_subgroups|seeds|learning_curve.csv
python -m ml.run_v2 --stage s9d   # final r5-r9 comparison           -> s9_final.csv
python -m ml.export               # refit on all 303 + export        -> models/
```

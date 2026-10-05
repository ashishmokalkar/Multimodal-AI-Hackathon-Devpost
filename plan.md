# ML Plan: maximising predictive performance (CAD, LAD, LCX, RCA)

This plan builds on [reports/EDA.md](reports/EDA.md); section references such as "EDA §7" point there.
Predictive performance is **30% of judging** ("classification performance, risk estimation quality, validation methodology").
We win by **(a) a real gain on LCX and RCA, and (b) validation rigour that stands up to scrutiny.**

---

## 0. Goals and ground rules

### Targets (CV ROC-AUC)
| Target | Untuned baseline | Goal | Stretch | Main lever |
|---|---|---|---|---|
| CAD | 0.925 | 0.94 | 0.95 | Feature engineering, ensembling, UCI CAD data (920 patients) |
| LAD | 0.851 | 0.87 | 0.89 | Hierarchical modelling, echo features, tuning |
| LCX | 0.744 | 0.78 | 0.81 | **External vessel data**, per-target features, GBM tuning |
| RCA | 0.717 | 0.76 | 0.79 | **External vessel data**, inflammation features (NLR), chains |

### Metrics
- **Primary metric for choosing models: mean ROC-AUC** over repeated CV. It doesn't depend on a threshold and is the most stable metric at n = 303.
- **Secondary: log-loss and Brier score.** The probabilities drive the 3D colours, so they must be calibrated.
- **Reported to the judges:** accuracy, precision, recall, F1, balanced accuracy, ROC-AUC, PR-AUC, Brier score and calibration slope, each with a **95% bootstrap CI**, at both a 0.5 threshold and a tuned threshold.

### Non-negotiable rules (anti-leakage checklist)
- [ ] LAD, LCX, RCA and Cath are **never** inputs to any model (a vessel model can't use another vessel's label either, except through OOF predictions in a chain; see §5).
- [ ] **Shuffled** splits only. The file is partly sorted by label (EDA §2).
- [ ] Every data-dependent step (winsorising, scaling, feature selection, tuning, calibration, threshold choice, ensemble weights) is fitted **inside** the training fold.
- [ ] External (UCI) rows go into **training folds only**. Scores are always on held-out Z-Alizadeh rows.
- [ ] Every experiment uses the **same saved folds** (`data/processed/folds.csv`), so comparisons between models are paired.

### Decision rule
Keep a change only if the **paired** ΔAUC (same folds) is greater than **1 standard error** of the per-fold differences.
Fold SD is 0.03–0.06 (EDA §1 #9), so smaller gains are noise.
Log every run to `reports/experiments.csv`: run id, target, feature set, model, strategy, AUC mean, SD, SE, Brier, git hash.

---

## 1. Code layout

```
ml/
  data.py          # (done) load + encode Z-Alizadeh
  features.py      # engineered features + named feature sets F0–F4
  external.py      # UCI raw 76-attribute parser + harmonisation to our schema
  preprocess.py    # sklearn ColumnTransformers per model family
  models.py        # model registry: name -> factory, search space, family
  strategies.py    # independent / hierarchical / classifier-chain / multi-output wrappers
  cv.py            # fixed repeated folds, CV runner, OOF prediction store, experiment logger
  tune.py          # Optuna nested tuning
  ensemble.py      # OOF stacking, hill-climbing selection, rank averaging
  calibrate.py     # Platt / beta / isotonic + reliability metrics
  evaluate.py      # metrics + bootstrap CIs + ROC / calibration plots -> reports/metrics/
  train_final.py   # fit the chosen pipelines on all data -> models/*.joblib + metrics.json
```

The API and dashboard read `models/` and `reports/metrics/metrics.json`. Adding a model means one registry entry, and adding a feature means one function in `features.py`; this covers the "extensible architecture" requirement.

---

## 2. Data preparation

### 2.1 Cleaning decisions (`ml/data.py`, done unless noted)
| Item | Decision |
|---|---|
| `exertional_cp` | Dropped (constant) |
| Label conflict (Cath = Normal, vessel stenotic; 1 patient) | Keep the original labels for **evaluation** (required target). For the **hierarchical** model, train P(v \| CAD) on `any_vessel = 1`. Document this. |
| `function_class` = 1 (n = 1) | Merge into 2 (`fc_ge2`) |
| PLT = 25, TG = 1050, FBS = 400 | Keep the rows. Winsorise at P1/P99 for linear/SVM/kNN models only (fitted in the fold) |

### 2.2 Preprocessing per model family (`ml/preprocess.py`)
| Family | Steps |
|---|---|
| **Linear / SVM / kNN** | Drop redundant columns (weight, height, obesity, the raw chest-pain dummies) → winsorise P1/P99 → `log1p` on skewed features (TG, FBS, ESR, BUN, WBC, PLT, HDL) → standardise → one-hot `chest_pain_type` and `smoking` |
| **Trees / GBMs** | Raw and engineered columns. No scaling or log. Categoricals as integers (CatBoost: native categoricals). NaN allowed (needed for pooled UCI) |
| **TabPFN** | Cleaned numeric columns, ≤ 100 features, no scaling (handled internally) |
| **EBM** | Raw and engineered columns. It bins internally |

---

## 3. Feature engineering (`ml/features.py`)

### 3.1 New features (from EDA §5–§6)
| Feature | Definition | Rationale |
|---|---|---|
| `chest_pain_type` | typical / atypical / nonanginal / none | 3 exclusive dummies → 1. Matches UCI `cp` |
| `pretest_prob` | Diamond-Forrester / CAD Consortium table (age band × sex × CP type) | Clinical prior. Likely the strongest single feature for CAD |
| `nlr` | neut / lymph | Neut and lymph are the top RCA/LAD signals and collinear with each other |
| `tg_hdl_ratio` | TG / HDL | Atherogenic index |
| `ldl_hdl_ratio` | LDL / HDL | Lipid risk ratio |
| `risk_factor_count` | DM + HTN + current smoker + FH + DLP + obesity | Dense summary of sparse binaries |
| `comorbidity_count` | CRF + CVA + CHF + airway + thyroid + edema + weak pulse + lung rales | Keeps the signal in rare binaries (< 5%) |
| `ecg_ischemia_any`, `ecg_ischemia_count` | Q wave, ST elevation, ST depression, T inversion | Pools rare ECG flags |
| `rwma_any`, `rwma_severe` (≥ 3) | From `region_rwma` | RWMA ≥ 3 → LAD stenosis in 28/28 patients |
| `ef_category` | < 40 / 40–49 / ≥ 50 | Clinical thresholds |
| `smoking` | never / ex / current | 2 exclusive dummies → 1 |
| `fbs_diabetic`, `bp_stage` | FBS ≥ 126; BP < 120 / 120–139 / ≥ 140 | Clinical thresholds; also align with UCI's binary FBS |
| `age_sex` | age × sex_male; menopause proxy (female ∧ age ≥ 50) | Sex-specific age effect on CAD |
| `metabolic_syndrome_proxy` | count of (BMI ≥ 30, TG ≥ 150, HDL low (sex-specific), BP ≥ 130, FBS ≥ 100) | Composite risk |

Test each engineered feature by **ablation** on the fixed folds: add it to F1 and apply the §0 decision rule. Don't add all of them blindly.

### 3.2 Feature sets
| Set | Contents |
|---|---|
| **F0** | Raw 55 (baseline) |
| **F1** | Cleaned: redundant columns dropped or merged (about 45) |
| **F2** | F1 + engineered features that pass the ablation |
| **F3[target]** | F2 after per-target selection (§3.3) |
| **F4** | UCI-overlap schema (about 13–17), for external-data experiments |

### 3.3 Feature selection (per target, inside CV only)
Candidates, all run in the inner folds:
1. **L1 / elastic-net stability selection**: keep features chosen in ≥ 60% of bootstrap fits.
2. **Boruta or permutation importance** on RF.
3. **mRMR** (top-k with k ∈ {10, 15, 20, 30}).
4. **SHAP-based recursive elimination** on CatBoost.

Compare each against "no selection" per model. GBMs often do best without selection, while linear models, SVM and TabPFN usually benefit. EDA showed that dropping the exam/ECG/history groups improves LCX and RCA, so expect selection to matter most for those two.

---

## 4. Model zoo (`ml/models.py`)

Each model gets a **small, heavily regularised** search space; n = 303 punishes complexity.

| Model | Why it's here | Key hyperparameters (search space) |
|---|---|---|
| Logistic regression (elastic-net) | Best for CAD already (0.925). Glassbox | C ∈ [1e-3, 10] log; l1_ratio ∈ [0, 1]; class_weight ∈ {None, balanced} |
| SVM (RBF) + Platt | Smooth nonlinear model; good at small n | C ∈ [0.01, 100]; gamma ∈ [1e-4, 1] |
| Random forest | Best untuned for LAD | n_est 500; max_depth ∈ {3..8, None}; min_samples_leaf ∈ [1, 10]; max_features ∈ {sqrt, 0.3, 0.5} |
| ExtraTrees | More variance reduction; diverse from RF | same as RF |
| XGBoost | Best untuned for LCX | depth ∈ [2, 4]; eta ∈ [0.01, 0.1]; n_est ∈ [100, 800]; subsample, colsample ∈ [0.5, 1]; min_child_weight ∈ [1, 10]; λ, α ∈ [1e-3, 10] |
| LightGBM | Fast; strong with NaN (pooled data) | num_leaves ∈ [4, 15]; min_data_in_leaf ∈ [10, 40]; same regularisers |
| **CatBoost** | Usually the strongest GBM on small tabular data; native categoricals; ordered boosting resists overfitting | depth ∈ [3, 6]; l2_leaf_reg ∈ [1, 20]; lr ∈ [0.01, 0.1]; iterations ∈ [200, 1000] |
| **TabPFN v2** | Pretrained transformer for tabular data with ≤ 10k rows; strong at n = 303 with no tuning | n_estimators (ensemble size); run on CPU. **Check its licence before shipping** |
| **EBM** (InterpretML) | Glassbox GAM with interactions; accuracy often near GBMs. Gives the dashboard exact per-feature curves | max_bins, interactions ∈ [0, 10], learning_rate |
| kNN, Gaussian NB | Cheap, low-correlation ensemble members | k ∈ [5, 50]; distance weighting |

**Seed bagging:** for every stochastic model, average 5–10 seeds. It's cheap at n = 303 and reliably removes variance.

---

## 5. Multi-label strategy (`ml/strategies.py`)

EDA §7: vessel models mostly re-learn CAD (within-CAD AUC is only 0.55–0.62). Exploiting the label structure is the biggest structural lever.

| Strategy | Description | Expected effect |
|---|---|---|
| **S0 Independent** | One binary model per target (baseline) | — |
| **S1 Hierarchical** | P(v) = P(CAD) × P(v \| CAD). The second model is trained on CAD patients only | Uses all the data for the "whether" part and a focused model for the "where" part. Consistent by construction (P(v) ≤ P(CAD)) |
| **S2 Stacked CAD feature** | Out-of-fold P(CAD) added as an input to each vessel model | A cheap version of S1 |
| **S3 Classifier chains** | CAD → LAD → LCX → RCA, each using OOF predictions of the earlier links. **Ensemble of chains** with random orders | Captures vessel co-occurrence (φ 0.28–0.39) |
| **S4 Multi-output** | CatBoost `MultiLogloss` or a small shared-trunk model on 4 outputs, plus the auxiliary ordinal "number of diseased vessels" | Shared representation |

Pick the strategy **per vessel** by CV. Whatever wins, apply a **consistency post-processing step** for the UI: P(CAD) ≥ max over vessels of P(v).

---

## 6. External data (`ml/external.py`)

### 6.1 Sources
| Source | n | Labels | Use |
|---|---|---|---|
| UCI Cleveland raw | 282 | CAD + LAD/LCX/RCA | Vessels + CAD |
| UCI VA Long Beach raw | 199 | CAD + LAD/LCX/RCA | Vessels + CAD |
| UCI Switzerland raw | 123 | CAD + LAD/LCX/RCA (94% CAD) | Vessels; down-weight for CAD |
| UCI Hungarian raw | 294 | CAD only (vessels mostly missing) | CAD only |

Vessel mapping: **LAD** = lmt ∨ ladprox ∨ laddist ∨ diag; **LCX** = cxmain ∨ ramus ∨ om1 ∨ om2; **RCA** = rcaprox ∨ rcadist (value 2 = ≥ 50% narrowing).

### 6.2 Feature harmonisation
| Ours | UCI | Notes |
|---|---|---|
| age, sex_male | age, sex | direct |
| bp | trestbps | direct |
| pr | thalrest | resting HR |
| chest_pain_type | cp (1–4) | exact 4-level match |
| fbs (binarised > 120) | fbs | ours binarised for the shared view |
| htn, dm, current_smoker, fh | htn, dm, smoke, famhist | dm and smoke often missing → NaN |
| lvh; st_depression ∨ t_inversion ∨ st_elevation | restecg (2 = LVH; 1 = ST-T abnormality) | collapse ours to the same 3 levels |
| ef_tte | cathef / restef | different modality and scale; test with and without |

Don't use: exercise-test features (thalach, oldpeak, slope, thal), which we don't have, and `ca` (fluoroscopy, near-leakage).

### 6.3 How to use it (try in order; keep what passes the decision rule)
1. **E1 Stacked transfer:** train a model on UCI (F4 schema) and add its prediction for each Z-Alizadeh patient as a feature. Low risk.
2. **E2 Pooled training:** train on Z-Alizadeh training fold + UCI with a `source` indicator. Sample weight for UCI rows w ∈ {0.25, 0.5, 1}, tuned in the inner CV. GBMs handle the NaNs.
3. **E3 Importance-weighted pooling:** a domain classifier (Z-Alizadeh vs UCI) gives density-ratio weights, which down-weight UCI patients unlike ours.
4. **E4 Pretrain → fine-tune:** warm-start CatBoost/LightGBM on UCI, then continue boosting on Z-Alizadeh.

Expected: the biggest gain on **LCX and RCA** (learning curves still rising), a small gain on CAD and LAD.
Watch: shifts in CAD prevalence (Switzerland 94%) and era/population differences. Weighting and the `source` flag mitigate both.

---

## 7. Hyperparameter tuning (`ml/tune.py`)

- **Optuna** TPE sampler with a median pruner, **50–100 trials** per (model, target, feature set).
- Objective: mean AUC (or log-loss for models we will calibrate) over the **inner** 5-fold CV of the outer training fold.
- **Nested CV for reporting:** outer repeated stratified 5-fold × 5 (25 outer fits). Tune inside each. The reported score is the outer mean. This is the number we put in the documentation.
- To save time during development, tune once per target on a 5 × 2 outer CV, freeze the parameters, and re-check them on the full 5 × 10 folds.
- Keep the search spaces small (§4). Over-tuning at n = 303 overfits the validation folds.

---

## 8. Ensembling (`ml/ensemble.py`)

All base models write **OOF predictions** on the fixed folds to `data/processed/oof/<target>/<model>.parquet`.

| Method | Description | When to use |
|---|---|---|
| **Rank / logit averaging** | Equal-weight mean of the top-k models' logits | Robust default |
| **Hill-climbing selection** (Caruana) | Greedily add models with replacement to maximise OOF AUC; bag 20× | Usually the best on small data |
| **Stacking** | Logistic regression with non-negative weights on the base models' OOF logits (+ optional S2 CAD prob) | If the base models are diverse |
| **Seed + model bagging** | Already inside each base model | Always |

- Choose ensemble weights **inside the outer folds** (nested); otherwise the ensemble score is optimistic.
- Diversity matters more than individual score. Aim for a **linear model + a GBM + TabPFN/EBM + RF/ET** mix and check the correlations between the OOF predictions.
- Expect +0.01 to 0.02 AUC over the best single model.

---

## 9. Calibration and thresholds (`ml/calibrate.py`)

- Calibrate the **final ensemble** per target with **Platt / beta calibration**. Isotonic is too data-hungry at n = 303 (try it only on the pooled data). Fit on inner OOF predictions.
- Report: Brier, expected calibration error (ECE), calibration slope and intercept, reliability diagrams → `reports/metrics/`.
- **Thresholds per target**, chosen on OOF predictions inside the CV:
  - `t_acc`: maximises accuracy (the headline accuracy number)
  - `t_youden`: maximises sensitivity + specificity − 1 (balanced)
  - `t_screen`: recall ≥ 0.90 (clinical screening mode, shown in the UI)
- **Conformal prediction** (split / Mondrian per class) on the calibrated probabilities gives the per-vessel uncertainty shown in the 3D view.

---

## 10. Execution order

| Phase | Work | Output | Exit criterion |
|---|---|---|---|
| **P1 Harness** | `cv.py` (fixed folds, OOF store, logger), `evaluate.py` (metrics + bootstrap CIs) | Baselines reproduced on the saved folds | Numbers match the EDA ±0.01 |
| **P2 Features** | `features.py`, F1/F2, per-feature ablation | Feature-set leaderboard | F2 ≥ F0 on all 4 targets |
| **P3 Model zoo** | All §4 models with defaults, then Optuna tuning, on F1/F2 | Leaderboard per target (`reports/experiments.csv`) | Best single model per target identified |
| **P4 Strategy** | S1–S4 multi-label strategies for the vessels | Strategy per vessel | Beats S0 or S0 kept |
| **P5 External** | `external.py` harmonisation; E1 → E2 → E3/E4 | ΔAUC per target with / without UCI | Kept only if it passes the decision rule |
| **P6 Selection** | Per-target feature selection (§3.3) for linear/SVM/TabPFN | F3[target] | — |
| **P7 Ensemble** | Hill-climbing / stacking, nested | Final ensemble per target | ≥ best single model + 1 SE |
| **P8 Calibrate + thresholds** | Platt/beta, thresholds, conformal | Calibrated models, `metrics.json` | ECE < 0.05; calibration slope 0.8–1.2 |
| **P9 Final fit + export** | `train_final.py` on all data (+ UCI if kept) | `models/*.joblib`, model card, `metrics.json`, ROC/calibration plots | API can load it and predict one patient in < 200 ms |

P1 → P3 give a solid submission on their own. P4 → P8 are where the extra accuracy comes from. If time runs short, do **P5 (external data) and P7 (ensemble) before P6**.

---

## 11. Deliverables for the dashboard and judges

- `models/<target>.joblib`: the calibrated final pipeline (preprocessing included) plus `models/manifest.json` (feature list, thresholds, versions, training date).
- `reports/metrics/metrics.json`: per-target metrics with CIs at each threshold, ROC and PR points, calibration bins, confusion matrices.
- SHAP: TreeExplainer for the GBM members and LinearExplainer for LR. Combine the members' SHAP values on the **logit scale** using the ensemble weights. The EBM gives exact contributions.
- A "baseline vs final" table and an ablation table (features, strategy, external data, ensemble) for the 6-page documentation.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Overfitting the validation folds through many experiments | Nested CV for the final numbers; small search spaces; 1-SE decision rule; one final untouched run |
| UCI distribution shift hurts | Weighting, `source` flag, E1 (stacking) before pooling; keep only if it passes the decision rule |
| TabPFN / CatBoost install or licence issues on Windows | Both are optional ensemble members; the plan works without them |
| Ensemble too opaque for the SHAP dashboard | Combine member SHAP values on the logit scale; EBM/LR as glassbox fallbacks |
| Compute time (nested CV × Optuna × models) | Develop on 5 × 2 outer CV; `n_jobs=1` per model with parallel folds; cache OOF predictions |

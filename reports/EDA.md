# Exploratory Data Analysis: Z-Alizadeh Sani extension

Reference document for the modelling work. Every number here comes from `python -m ml.eda`
(about 12 min), which writes the tables to `reports/eda/tables/` and the figures to `reports/eda/figures/`.
Encoding lives in `ml/data.py`.

**All CV numbers use repeated stratified 5-fold cross-validation (10 repeats for the baselines, 4 for the learning curves and ablation),
with untuned models: L2 logistic regression with C=0.1, a random forest with 300 trees, and XGBoost with depth 3.**

---

## 1. TL;DR: what matters for accuracy

| # | Finding | What it means for us |
|---|---|---|
| 1 | **CAD is easy (AUC ≈ 0.93), vessels are hard.** LAD ≈ 0.85, LCX ≈ 0.73, RCA ≈ 0.72. | Spend modelling effort on **LCX/RCA**. CAD is close to its ceiling. |
| 2 | **Vessel models mostly predict "has CAD", not "which artery".** Restricted to CAD patients, vessel AUC drops to 0.55 (LAD), 0.62 (LCX) and 0.59 (RCA). | Model the vessels hierarchically or jointly (§9). Be honest in the UI and docs: localisation from clinical data is weak. |
| 3 | **The learning curves are still rising for LCX and RCA** and flat for CAD and LAD. | **External data (UCI, about 600 patients with vessel labels) should help LCX and RCA most.** |
| 4 | **The UCI-overlap feature subset loses almost nothing**: CAD 0.93, LAD 0.83, LCX 0.71, RCA 0.72. | Transfer from UCI Heart Disease is workable. The shared features carry nearly all the signal. |
| 5 | **Symptoms (chest pain type) are the strongest group.** Echo matters for LAD. ECG on its own is useless for LCX (AUC 0.47). | Pick features per target. Clinically consistent (the LCX territory is "electrically silent" on ECG). |
| 6 | **The rows are partly sorted by label.** CAD prevalence falls from 80% in the first rows to 33% in the last. | **Always shuffle.** Never use a sequential or hold-out-the-tail split. |
| 7 | **Heavy redundancy**: BMI = f(weight, height) exactly, obesity = BMI ≥ 25, neut ↔ lymph ρ = −0.91, chest-pain columns are one-hot. | Collapse before linear models (VIF up to 98). Trees don't mind. |
| 8 | **15 binary features have under 5% prevalence** (CHF = 1 case, LowTH Ang = 2). | Drop them or merge them into a "comorbidity count". They add noise and SHAP clutter. |
| 9 | **Fold-to-fold AUC SD is 0.03–0.06.** | Differences under about 0.02 between models are noise. Use repeated CV and report CIs. |
| 10 | 1 label conflict: `Cath = Normal` with a stenotic vessel. | Fix by rule (CAD = any vessel) and document it. |

---

## 2. Dataset at a glance

- **303 patients × 55 features** (after dropping the constant `exertional_cp`) plus 4 targets. No missing values, no duplicate rows.
- Feature types: **21 continuous, 3 ordinal** (`function_class`, `region_rwma`, `vhd`), **31 binary**.
- Encoding (`ml/data.py`): Y/N → 1/0, `Sex` → `sex_male`, `VHD` → 0–3 ordinal, `BBB` → `bbb_lbbb` + `bbb_rbbb`, targets → 1 = CAD / Stenotic.

### Row order is not random
| Rows | 0–49 | 50–99 | 100–149 | 150–199 | 200–249 | 250–299 | 300–302 |
|---|---|---|---|---|---|---|---|
| CAD prevalence | 0.80 | 0.82 | 0.82 | 0.64 | 0.74 | 0.48 | 0.33 |
| LCX prevalence | 0.44 | 0.54 | 0.48 | 0.34 | 0.38 | 0.20 | 0.00 |

The Spearman ρ between row index and CAD is −0.23. **Use shuffled stratified CV only.**

---

## 3. Targets

| Target | Positive | Prevalence | Majority-class accuracy |
|---|---|---|---|
| CAD | 216 | 71.3% | 0.713 |
| LAD | 177 | 58.4% | 0.584 |
| LCX | 119 | 39.3% | 0.607 |
| RCA | 114 | 37.6% | 0.624 |

**Accuracy is misleading here.** Always a "CAD" guess scores 71%. Lead with ROC-AUC, balanced accuracy and F1.

**The structure between labels** (`reports/eda/figures/vessel_patterns.png`):

| Pattern | n | | Pattern | n |
|---|---|---|---|---|
| none | 86 | | LAD+RCA | 24 |
| LAD+LCX+RCA | 63 | | RCA only | 17 |
| LAD only | 57 | | LCX only | 13 |
| LAD+LCX | 33 | | LCX+RCA | 10 |

- **CAD ≡ "any vessel stenotic"**, with exactly 1 exception (Cath = Normal but a vessel is stenotic).
- P(LAD | CAD) = 0.82, P(LCX | CAD) = 0.55, P(RCA | CAD) = 0.53.
- Phi correlation: CAD–LAD 0.74, CAD–LCX 0.51, CAD–RCA 0.49. Between vessels it is 0.28–0.39.
- Vessel count: 0 → 86, 1 → 87, 2 → 67, 3 → 63. **An ordinal "number of diseased vessels" target is available as an auxiliary task.**

---

## 4. Feature profiles

### Continuous (`tables/continuous_summary.csv`, `figures/continuous_by_cad.png`)
- **Right-skewed** (skew > 1.3): `tg` 3.8, `plt` 2.6, `fbs` 2.3, `bun` 1.8, `esr` 1.6, `hdl` 1.5, `wbc` 1.4. **Log-transform these for linear and NN models.**
- `ef_tte` is left-skewed (−1.3) and capped at 60.
- Extreme but plausible values: TG 1050, PLT 25 (very low, possibly an entry error), FBS 400, HDL 111. There are few outliers (≤ 9 per feature at 3×IQR). **Winsorise at the 1st and 99th percentiles rather than dropping rows.**
- `pr` (pulse) is heaped at 70 and 80, so it was recorded coarsely.

### Ordinal
- `function_class`: 0 → 211, **1 → 1**, 2 → 73, 3 → 18. Merge 1 into 2 or treat it as binary "FC ≥ 2".
- `region_rwma`: 0 → 217, 1 → 26, 2 → 32, 3 → 14, 4 → 14. The coding meaning is not documented. It behaves like a severity or extent score (§6).
- `vhd`: N 116, mild 149, moderate 27, severe 11.

### Rare binaries (< 5% prevalence; candidates to drop or merge)
`chf` 0.3%, `low_th_ang` 0.7%, `weak_peripheral_pulse` 1.7%, `cva` 1.7%, `crf` 2.0%, `thyroid_disease` 2.3%,
`bbb_rbbb` 2.6%, `poor_r_progression` 3.0%, `diastolic_murmur` 3.0%, `ex_smoker` 3.3%, `lung_rales` 3.6%,
`airway_disease` 3.6%, `edema` 4.0%, `bbb_lbbb` 4.3%, `st_elevation` 4.6%.

---

## 5. Consistency checks and redundancy

| Check | Result | Action |
|---|---|---|
| BMI vs weight/height² | **Exact** (max diff 0.0) | Keep `bmi` only (VIF weight 98, BMI 83, height 50) |
| Obesity vs BMI | Obesity = **BMI ≥ 25** (1 exception) | Drop `obesity` (it's a threshold of BMI) |
| Height vs sex | ρ = 0.72 (157 vs 170 cm) | Height adds nothing beyond sex |
| Typical / Atypical / Nonanginal | **Mutually exclusive**: 164 typical, 93 atypical, 16 nonanginal, **30 with none** | Merge into one `chest_pain_type` with 4 levels (the 4th is "asymptomatic", which matches the UCI `cp` coding) |
| Neut vs Lymph | ρ = −0.91. Neut + Lymph ≈ 92 ± 4 (they're % of WBC) | Use **NLR = neut / lymph** (a known CAD inflammation marker) |
| DM vs FBS ≥ 126 | 70/90 DM have high FBS; 12 non-DM have high FBS | Keep both (DM = history, FBS = current) |
| HTN vs BP ≥ 140 | No non-HTN patient has BP ≥ 140; 78 HTN patients are controlled | Keep both |
| DLP vs lipid thresholds | **Barely related** (likely on statins) | Lipid values are a weak signal, so don't over-trust LDL |
| Current vs ex-smoker | Mutually exclusive | Merge into `smoking`: never / ex / current |
| Function class vs dyspnoea | FC ≥ 2 is mostly dyspnoea | Correlated; fine for trees |
| RWMA > 0 vs EF < 50 | 57/86 RWMA patients have low EF | Related but distinct |

Full table: `tables/correlated_pairs.csv`, `tables/vif.csv`, `figures/feature_correlation.png`.

---

## 6. Which features carry signal?

### Univariate (direction-free AUC; FDR-corrected Mann-Whitney / Fisher tests): `tables/univariate.csv`

| Rank | CAD | LAD | LCX | RCA |
|---|---|---|---|---|
| 1 | typical chest pain 0.80 | typical chest pain 0.73 | **age 0.68** | typical chest pain 0.65 |
| 2 | age 0.72 | EF (↓) 0.71 | typical chest pain 0.65 | **neut 0.64** |
| 3 | atypical (↓) 0.71 | age 0.68 | BP 0.62 | age 0.63 |
| 4 | EF (↓) 0.69 | region RWMA 0.68 | PLT (↓) 0.60 | **lymph (↓) 0.63** |
| 5 | region RWMA 0.67 | atypical (↓) 0.67 | FBS 0.59 | **DM 0.63** |
| 6 | BP 0.66 | ESR 0.62 | TG 0.59 | ESR 0.61 |
| 7 | HTN 0.66 | neut 0.61 | HTN 0.59 | atypical (↓) 0.61 |
| 8 | FBS 0.65 | lymph (↓) 0.61 | EF (↓) 0.59 | FBS 0.60 |
| Significant (q < 0.05) | 18 | 16 | 10 | 10 |

Observations:
- **Chest pain type plus age** dominate every target.
- **LAD is "echo-visible":** EF and RWMA are strong because the LAD supplies the largest territory (the anterior wall).
- **RCA has an inflammation signal:** neutrophils ↑, lymphocytes ↓ and ESR ↑, which supports engineering **NLR**.
- **LCX is driven by age, BP and metabolic factors.** No ECG feature helps, which is consistent with how often LCX ischaemia is ECG-silent.
- The data is noisy: about 37–45 of the 55 features are not significant for each target.

### Region RWMA vs vessels
| RWMA | % LAD stenotic | % LCX | % RCA |
|---|---|---|---|
| 0 | 47% | 35% | 35% |
| 1–2 | 81% | 50% | 38–44% |
| 3–4 | **100%** | 50% | 43–50% |

**Any RWMA ≥ 3 means LAD stenosis in 28/28 patients.** No patient without CAD has RWMA ≥ 3. RWMA is a strong LAD marker but tells us little about LCX or RCA.

### Multivariate (`tables/multivariate_importance.csv`)
L1 logistic regression (C = 0.1) keeps 12 features for CAD, 17 for LAD, 13 for LCX and 13 for RCA.
- CAD: typical CP, age, region RWMA, DM, T inversion, HTN, nonanginal (−), TG …
- LAD: typical CP, region RWMA, age, EF (−), T inversion …
- LCX: age, typical CP, Na, Cr, DM, TG, sex …
- RCA: **DM**, typical CP, **neut**, age, sex, ESR, TG …

**Each vessel needs its own feature set.** A single shared selection would hurt LCX and RCA.

---

## 7. The key insight: vessel prediction ≈ CAD prediction

| Target | CV AUC, all patients | CV AUC within CAD = 1 (n = 216) |
|---|---|---|
| LAD | 0.85 | **0.55** (≈ chance) |
| LCX | 0.73 | **0.62** |
| RCA | 0.71 | **0.59** |

Most of the vessel models' skill comes from separating diseased from healthy patients. Telling which artery is diseased is only slightly better than chance. Within CAD patients the best localising features are:
- LAD: EF and RWMA (weak, about 0.65)
- LCX: Na, PLT, age
- RCA: neut, lymph, DM

**What this means for us:**
1. Structure the vessel models as **P(vessel) = P(CAD) × P(vessel | CAD)**, or use a multi-label model (classifier chain / multi-output) so the vessel probabilities stay consistent with CAD.
2. Spend feature engineering on the *within-CAD* separation (localising features), because that is where the headroom is.
3. In the 3D UI and the documentation, present vessel colours as **"relative likelihood of involvement"**, with uncertainty shown. Don't imply that the model knows where a lesion is.
4. **LAD baseline caveat:** an "LAD = CAD" rule already scores high, since 82% of CAD patients have LAD disease.

---

## 8. Baselines and headroom

### Untuned baselines (5-fold × 10 repeats): `tables/baselines.csv`, `figures/baseline_auc.png`
| Target | LogReg AUC | RF AUC | XGB AUC | Best accuracy | Best balanced accuracy | Best F1 |
|---|---|---|---|---|---|---|
| CAD | **0.925** ± 0.03 | 0.923 | 0.913 | 0.872 | 0.828 | 0.912 |
| LAD | 0.823 | **0.851** ± 0.04 | 0.825 | 0.784 | 0.764 | 0.827 |
| LCX | 0.663 | 0.729 | **0.744** ± 0.06 | 0.689 | 0.658 | 0.559 |
| RCA | **0.717** ± 0.06 | 0.713 | 0.699 | 0.680 | 0.638 | 0.526 |

- A linear model is as good as anything for CAD. Trees win for LAD and LCX, which suggests interactions or nonlinearity there.
- At a 0.5 threshold, LCX and RCA have **low F1 (0.45–0.56)**, so thresholds need tuning (§9).

### Learning curves (`figures/learning_curves.png`)
| Target | AUC at 48 → 242 training patients | Trend at full size |
|---|---|---|
| CAD | 0.88 → 0.93 | Nearly flat; little gain from more data |
| LAD | 0.80 → 0.85 | Flat after about 120 for RF |
| LCX | 0.67 → 0.72 (RF) | **Still rising** |
| RCA | 0.65 → 0.71 | **Still rising** |

### Feature-group ablation (best of LogReg and RF): `figures/group_ablation.png`
| Feature set | CAD | LAD | LCX | RCA |
|---|---|---|---|---|
| All 55 | 0.93 | 0.85 | 0.72 | 0.71 |
| **UCI-overlap only (17)** | **0.93** | 0.83 | 0.71 | 0.72 |
| Symptoms only | 0.83 | 0.75 | 0.64 | 0.68 |
| Echo only | 0.75 | 0.74 | 0.59 | 0.55 |
| ECG only | 0.69 | 0.67 | **0.47** | 0.54 |
| Drop symptoms | **0.86** | **0.79** | 0.70 | 0.68 |
| Drop echo | 0.92 | **0.81** | 0.73 | 0.71 |
| Drop lab | 0.93 | 0.84 | **0.68** | 0.71 |
| Drop exam | 0.93 | 0.85 | 0.73 | 0.73 |

Dropping the exam, ECG or history groups slightly **improves** LCX and RCA, which confirms they add noise. Labs matter for LCX.

---

## 9. Modelling plan derived from this EDA

### 9.1 External data (priority: LCX, RCA)
- **UCI Heart Disease raw 76-attribute files**: Cleveland 282, VA Long Beach 199, Switzerland 123, all with LAD/LCX/RCA labels (verified earlier: "2" means ≥ 50% narrowing; agrees with `num` in 98–100% of cases).
- Shared features (17 → about 13 after mapping): age, sex, BP, resting HR (`thalrest`) ↔ PR, chest pain type (4 levels, an exact match), FBS > 120 (we binarise ours), HTN, DM (sparse in UCI), smoking, FH, LVH and ST-T changes (`restecg`), EF.
- Since UCI-overlap features alone reach ~0.93 / 0.83 / 0.71 / 0.72, transfer is workable.
- Approaches, in order of how much I trust them:
  1. **External model as a feature (stacking):** train on UCI with the shared features and add its out-of-fold prediction as one input to our model.
  2. **Pooled training with a `source` indicator** and sample weights, so the Z-Alizadeh rows count more.
  3. **Pre-train then fine-tune** (warm start for GBMs / NN).
- **Evaluate only on held-out Z-Alizadeh folds.** UCI rows are added to the training folds only.

### 9.2 Feature engineering
| Feature | Why |
|---|---|
| `chest_pain_type` ∈ {typical, atypical, nonanginal, none} | Collapses 3 exclusive dummies; aligns with UCI `cp` |
| `nlr = neut / lymph` | Neut and lymph are among the top RCA/LAD signals and nearly collinear |
| `tg_hdl_ratio` | Insulin-resistance / atherogenic marker; TG and HDL are both weak alone |
| `pretest_prob` (Diamond-Forrester / CAD Consortium from age, sex, CP type) | Encodes clinical prior knowledge in one strong feature |
| `risk_factor_count` = DM + HTN + smoker + FH + DLP + obesity | Dense summary of sparse binaries |
| `comorbidity_count` = CRF + CVA + CHF + airway + thyroid + … | Rescues the signal in rare binaries |
| `any_ecg_ischemia` = Q wave ∨ ST elev ∨ ST dep ∨ T inversion | Rare ECG flags pooled |
| `rwma_any`, `ef_category` (< 40 / 40–50 / > 50) | Thresholds that clinicians use |
| `smoking` ∈ {never, ex, current}, `fc_ge2` | Fixes sparse levels |
| log(TG, FBS, ESR, BUN, WBC, PLT, HDL) | Skew (linear/NN models only) |
| Drop: weight, height, obesity, exertional_cp, FC = 1 level | Exact redundancy / constant |

### 9.3 Feature selection
- **Per target**, inside the CV loop (never on the full data, which leaks).
- Candidates: L1/elastic-net, Boruta or permutation importance on RF, mRMR. Expect about 10–20 features per target.
- Run it inside **nested CV** so the reported score includes the selection step.

### 9.4 Models
- **CAD:** regularised logistic regression is already at about 0.93. Try elastic-net, CatBoost and TabPFN, then ensemble.
- **Vessels:** tree ensembles (RF, ExtraTrees, CatBoost, LightGBM with strong regularisation, depth ≤ 3–4) and TabPFN (built for small tabular data).
- **Multi-label structure:** a classifier chain (CAD → LAD → LCX → RCA), or the hierarchical P(CAD) × P(v | CAD), or a multi-output model. Optional auxiliary ordinal target "number of diseased vessels".
- Handle class imbalance with class weights rather than SMOTE (SMOTE inside CV is easy to get wrong and rarely helps AUC).

### 9.5 Validation protocol
- **Repeated stratified 5-fold × 10, shuffled**, with all preprocessing, imputation, selection and threshold tuning inside the folds.
- **Nested CV** for hyperparameter search (inner 5-fold), or a fixed small grid.
- Report the mean ± SD **and a 95% bootstrap CI** for AUC, accuracy, precision, recall, F1, balanced accuracy, Brier score and calibration slope.
- Optional: stratify on the multi-label pattern (iterative stratification) so rare patterns such as "LCX only" (n = 13) appear in every fold.

### 9.6 Ensembling and calibration
- Soft-vote / stacking across LR + GBM + RF + TabPFN, using out-of-fold predictions for the meta-learner.
- **Calibrate** with isotonic or Platt scaling inside the CV, and check reliability diagrams. The 3D colours are probabilities, so they need to be trustworthy.
- **Tune thresholds per target** on out-of-fold predictions (Youden's J, or a recall ≥ 0.85 constraint for screening) rather than 0.5.
- **Conformal prediction** gives coverage-guaranteed uncertainty for the "uncertainty shimmer" in the 3D view.

### 9.7 Literature context (from memory; verify before citing)
- Published Z-Alizadeh Sani CAD results are often reported at about 90–94% accuracy. Many of them use feature selection on the full dataset or single splits, which inflates scores.
- Vessel-level results in the original authors' work are reported in the low-to-mid 80s % accuracy, but against majority baselines of 58–62%.
- **Our story for the judges is rigour:** leakage-free nested CV, CIs and calibration, plus honest numbers that beat the baselines.

---

## 10. Files

| Path | Contents |
|---|---|
| `ml/data.py` | Loading, encoding, feature groups, target list |
| `ml/eda.py` | Reproduces every table and figure above |
| `reports/eda/tables/*.csv` | Univariate stats, baselines, learning curves, ablation, correlation, VIF … |
| `reports/eda/figures/*.png` | Distributions, heatmaps, learning curves, ablation, baselines |

# Phase 4: multi-label strategies for the vessels

Reproduce with `python -m ml.run_strategies --n-jobs 25` (about 10 min). Code: `ml/strategies.py`. Outputs: `reports/phase4/`.

## What we tested
EDA §7 showed that vessel models mostly re-learn "has CAD". We tested whether using the label structure helps.

| Strategy | Prediction for vessel *v* |
|---|---|
| **S0 Independent** | one model per vessel (the phase 3 tuned models) |
| **S1 Hierarchical** | P(CAD) from the best CAD model (EBM, out-of-fold on the same splits) × P(v \| ≥ 1 stenotic vessel), the conditional model trained on diseased patients only |
| **S2 CAD-stacked** | S0 model + logit P(CAD) as a feature |
| **S3 Stacked binary relevance** | S0 model + logit P(·) of **all other** targets as features |

For S2 and S3, the training rows get **inner 5-fold out-of-fold** predictions from the upstream models, so no in-sample leakage is possible. A spy-estimator test asserts that upstream models never see test rows.
Each vessel's top-3 phase 3 models were tried with each strategy, scored on the untouched repeats r5–r9 and paired against the best S0 model.
We also report a **localisation AUC**: the AUC computed among CAD patients only, i.e. "which artery" rather than "whether".

## Results (ROC-AUC, repeats r5–r9)

| Vessel | Best S0 | Best S1 | Best S2 | Best S3 | Δ best vs S0 | Passes decision rule |
|---|---|---|---|---|---|---|
| LAD | 0.861 (SVM) | **0.866** (LR) | 0.862 (SVM) | 0.859 (SVM) | +0.004 (SE 0.013) | ❌ |
| LCX | 0.772 (RF) | **0.780** (LightGBM) | 0.772 (RF) | 0.772 (LightGBM) | +0.008 (SE 0.016) | ❌ |
| RCA | **0.752** (LR) | 0.748 (XGB) | 0.750 (XGB) | 0.751 (XGB) | −0.000 | ❌ |

Full table: `reports/phase4/strategy_results.csv`.

## Findings
1. **No strategy significantly beats independent models.** The best S1 numbers (LAD +0.004, LCX +0.008) are well within one corrected SE. **S0 stays the primary choice** (`strategy_choice.json`).
2. **Hierarchical (S1) helps tree models and hurts linear ones on RCA.**
   - Trees: LCX LightGBM +0.010 and RCA XGBoost +0.010 vs their own S0.
   - Linear models: RCA logistic regression −0.012 and RCA SVM −0.012.
   The conditional model trains on only about 175 diseased patients, and linear models lose more from that.
3. **S1 improves calibration noticeably.** LCX random forest ECE goes from 0.083 to 0.043 and Brier from 0.200 to 0.189. By construction it also guarantees **P(vessel) ≤ P(CAD)**, which is exactly the consistency the 3D view needs.
4. **Stacking other targets' predictions (S2/S3) adds nothing.** Those predictions are functions of the same features, so the vessel model already has that information. S3 is slightly *worse* (an extra noisy input).
5. **Localisation is the bottleneck, and no strategy fixes it.** Localisation AUC stays at about 0.67–0.69 for LAD, 0.61–0.65 for LCX and 0.56–0.61 for RCA, and S1 lowers it slightly.
   Telling arteries apart needs **new information, not re-arranged labels**. This points directly to phase 5 (external vessel-labelled data).

## What we carry forward
- **Phase 7 (ensembling):** the S1 OOF predictions (especially LightGBM-S1 for LCX, 0.780, the best single LCX number) are kept as **diverse ensemble candidates**. Hill-climbing will include them only if they add value.
- **Phase 9 (export / UI):** apply the hierarchical consistency rule P(v) ≤ P(CAD) when displaying vessel risk, whichever model wins.
- Not pursued: classifier chains with random orders and multi-output CatBoost. S3 (which uses all the other labels) already bounds what label-dependency features can add, and it added nothing.

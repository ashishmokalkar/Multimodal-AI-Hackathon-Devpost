# Phase 3: model zoo and hyperparameter tuning

Reproduce with `python -m ml.run_models --target <cad|lad|lcx|rca> [--n-jobs 15]`. Each target takes about 15–25 min on 28 cores; two targets ran in parallel.
Per-model results are cached in `reports/phase3/<target>/models/`, so re-runs resume (`--force` recomputes).
Outputs per target: `leaderboard.csv`, `tuning_summary.csv`, `best_params.json`. OOF predictions are in `data/processed/oof/<target>/p3_*`.

## Protocol
- Features: **F2[target]** from phase 2.
- **Defaults** are scored on repeats r5–r9.
- **Optuna TPE tuning** maximises mean AUC on repeats **r0–r2** (15 folds). Trials per model: LR 60, SVM 50, kNN 30, GNB 20, RF/ET 40, XGB/LGBM 60, CatBoost 40, EBM 12.
- **Tuned** parameters are scored on the untouched r5–r9 and kept only if they are not worse than the defaults there.
- **Seed bagging** (5 seeds) is tried on the top-3 stochastic models per target.
- TabPFN was skipped (it needs a one-time licence acceptance; see `requirements-tabpfn.txt`).

## Results (ROC-AUC on repeats r5–r9, 95% patient-bootstrap CI)

| Target | Best model | AUC | 95% CI | Untuned F0 baseline | Gain | Plan goal |
|---|---|---|---|---|---|---|
| CAD | **EBM** (tuned) | **0.939** | 0.908–0.962 | 0.925 | +0.014 | 0.94 |
| LAD | **SVM-RBF** (tuned) | **0.861** | 0.815–0.902 | 0.851 | +0.010 | 0.87 |
| LCX | **Random forest** (tuned, 5-seed bag) | **0.772** | 0.717–0.818 | 0.744 | +0.028 | 0.78 |
| RCA | **Logistic regression** (elastic-net, tuned) | **0.752** | 0.694–0.802 | 0.717 | +0.035 | 0.76 |

### Top 5 per target
| Rank | CAD | LAD | LCX | RCA |
|---|---|---|---|---|
| 1 | EBM 0.939 | SVM 0.861 | RF 0.772 | LR 0.752 |
| 2 | LR 0.936 | LR 0.858 | CatBoost 0.771 | SVM 0.745 |
| 3 | SVM 0.934 | CatBoost 0.855 | LightGBM 0.770 | XGBoost 0.738 |
| 4 | ExtraTrees 0.931 | RF 0.854 | XGBoost 0.763 | LightGBM 0.733 |
| 5 | CatBoost 0.930 | XGBoost 0.851 | EBM 0.747 | CatBoost 0.728 |

## Findings
1. **No single model family wins.** The top 3–5 models per target sit within about 0.01 AUC of each other, well inside their CIs. That makes ensembling across families (phase 7) the next lever.
2. **The structure differs by target.** CAD and RCA favour smooth models (LR, SVM, EBM). LCX favours tree ensembles and GBMs (about +0.03 over linear models), which suggests interactions there. LAD is in between.
3. **Tuning gains are largest for the vessel targets**: LR +0.041 on LCX, XGBoost +0.048 on RCA, SVM +0.034 on LAD. The gains on CAD are small (≤ 0.015).
4. **Tuning folds are optimistic.** The best tuning-fold AUC (r0–r2) beats the untouched r5–r9 AUC by 0.005–0.01 on average. This confirms that scores must come from folds the tuning never saw.
5. **Seed bagging** helps random forest a little (+0.007 on LCX) and does nothing for the GBMs.
6. **Calibration needs work (phase 8).** LR tuned with `class_weight=balanced` has ECE 0.14–0.19 on CAD and LAD. EBM, CatBoost, LightGBM and SVM are already reasonably calibrated (ECE ≈ 0.04–0.07).
7. **EBM tops CAD** and is a glassbox model, a strong option for the explanation dashboard.

## Bug found and fixed: unstable SVM probabilities
The first LAD SVM run reported a fold-mean AUC of 0.862 but a **pooled** AUC (all OOF predictions of a repeat scored together) of only 0.759.
The tuner had chosen gamma ≈ 1e-4. In one fold, the single internal Platt-scaling fit collapsed every probability to about 0.1.
- Fix: `CalibratedClassifierCV(..., ensemble=True)` (averages 5 Platt fits) and a gamma floor of 1e-3.
- Now: fold-mean 0.861 vs pooled 0.862, ECE 0.209 → 0.037.
- **Safeguard:** every leaderboard now reports `auc_pooled` and flags `unstable` when fold-mean minus pooled is > 0.03. No current model is flagged.

## Caveats
- The r5–r9 scores reuse the same 303 patients as tuning (with different splits), so they are still slightly optimistic. The reported numbers will come from nested CV in phase 7.
- Thresholded metrics (accuracy, F1) use 0.5. Threshold tuning happens in phase 8.

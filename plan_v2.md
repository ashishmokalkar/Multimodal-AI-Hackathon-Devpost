# Plan v2: best possible model for each of the 4 labels (GPU, from scratch)

> **Status (2026-10-08): complete.** Final ROC-AUC on the untouched repeats r5–r9:
>
> | Label | Model | ROC-AUC |
> |---|---|:---:|
> | CAD | EBM | 0.939 |
> | LAD | CatBoost | 0.866 |
> | LCX | XGBoost | 0.784 |
> | RCA | Logistic stack of 8 classical models | 0.767 |
>
> All four are exported to `models/` and run on CPU only. The results and everything that did not help are in [reports/BEST_MODELS.md](reports/BEST_MODELS.md).

**Goal:** the highest honestly-validated ROC-AUC per label (CAD, LAD, LCX, RCA), with calibrated probabilities and a tuned decision threshold, because the judges also score "risk estimation quality" and "validation methodology".

**Starting point:** nothing is assumed. Every earlier choice is re-tested here:
- the cleaning set (F1) and the engineered set (F2);
- the TabPFN settings;
- the AutoGluon screening winners (they were CPU-limited).

Earlier results are reused only as baselines, and only where re-running is provably identical (deterministic CPU models with the same folds and parameters).

Hardware:
- **GPU:** NVIDIA RTX 2000 Ada Laptop, 8 GB, CUDA 13.2 driver.
- **CPU:** 20 cores / 28 threads.
- **RAM:** 32 GB.

Software environments:
- **AutoGluon 1.6.3** runs in `.venv-ag` (it pins its own torch).
- **The main pipeline** runs in `.venv`.

---

## 0. Evaluation protocol: fixed, never tuned
| Item | Rule |
|---|---|
| Folds | The saved 5-fold × 10-repeat stratified splits (`data/processed/folds.csv`), stratified on the CAD+vessel pattern, identical for every experiment |
| Screening | Repeats r0–r4 (25 folds) for cheap runs; r0–r1 (10 folds) for expensive AutoGluon runs. Every choice is made here |
| Tuning (inner) | Optuna on r0–r2 for our own models. AutoGluon's k-fold bagging inside each outer training fold is its inner loop, so the whole setup is nested CV |
| Final report | Repeats r5–r9 (25 folds), never used for any choice. Reported as mean ± SD over outer folds, with patient-bootstrap 95% CIs |
| Decision rule | A change is kept only if its paired gain is > 1 Nadeau–Bengio corrected SE (otherwise the simpler or cheaper option wins) |
| Metrics | ROC-AUC (primary), PR-AUC, balanced accuracy, accuracy, F1, Brier, ECE, calibration slope |
| Mandatory baselines in every table | Untuned logistic regression, default TabPFN, the best phase-3 model |
| Leakage guards | All four labels are excluded from features for every target. All preprocessing, selection, resampling, calibration and threshold choices are fitted inside training folds only. No SMOTE or feature selection on full data. The Kaggle CSV is a duplicate and is not used |

## 1. Infrastructure (stage S0)
1. Install CUDA PyTorch in `.venv-ag` (torch 2.13 + cu128) and in `.venv` (for TabPFN v3.5). Verify `torch.cuda.is_available()` and benchmark TabPFN fold time on GPU vs CPU.
2. Runner support:
   - `--gpus` (AutoGluon `num_gpus`);
   - GPU sharing across concurrent folds, with a VRAM check via `nvidia-smi`;
   - per-fold caching (resumable);
   - model lists and failures recorded per fit;
   - Windows power-throttling opt-out.
3. Time limits per fit sized so that every portfolio member actually trains. Any fit with untrained or failed members is flagged, and its pipeline is re-run with a larger budget.

## 2. Data cleaning (stage S1)
| ID | Experiment | Variants |
|---|---|---|
| C1 | Encoding clean-up | F0 raw 55 columns vs F1: chest-pain type as one 0–3 variable, smoking 0–2, functional class ≥2; drop weight/height (keep BMI), obesity, chest-pain/smoker dummies |
| C2 | Rare binary features (< 6 positives: `cva`, `chf`, `weak_peripheral_pulse`, `low_th_ang`) | keep vs drop vs merge into one "other cardiovascular history" flag |
| C3 | Label inconsistency: 1 patient has `Cath = Normal` but a stenotic vessel | keep vs drop from **training folds only** (test folds never change) |
| C4 | Outliers / skew | none vs P1/P99 winsorising vs log1p of skewed labs (for linear, kNN and NN models; trees and TabPFN are tested without it) |
| C5 | Missing values / duplicates / constants | checked: none present, so nothing to do (documented) |

## 3. Preprocessing (stage S1)
| ID | Experiment | Variants |
|---|---|---|
| P1 | Scaling for linear / kernel / kNN models | standard vs robust (winsorise + log + scale) vs quantile-normal |
| P2 | Categorical encoding | ordinal vs one-hot (linear); category dtype vs numeric for AutoGluon (`feature_metadata`) |
| P3 | AutoGluon feature generators | default `AutoMLPipelineFeatureGenerator` vs the `interpretable` generator vs the GBM_PREP generators (arithmetic features, categorical interactions, out-of-fold target encoding) |
| P4 | TabPFN preprocessing | none / safepower / quantile / squashing / mixed per member; categorical encodings; explicit categoricals; feature/class shift; row subsampling |

## 4. Feature engineering (stage S2)
| ID | Experiment | Notes |
|---|---|---|
| FE1 | Our 12 engineered candidates (pre-test probability, NLR, lipid ratios, risk-factor count, ECG ischaemia, RWMA flags, EF bands, …) | re-screened per label with three diverse probes (LR, CatBoost, TabPFN-GPU), phase-2 keep rule |
| FE2 | **Published clinical risk scores (new)** | ESC 2019 pre-test probability (incl. dyspnoea), ESC 2024 risk-factor-weighted clinical likelihood, CAD Consortium clinical model, updated Diamond–Forrester, Duke clinical score + Duke severe/left-main sub-scores, Jang 2019 high-risk score. Coefficients and tables are in `reports/RESEARCH_ACCURACY.md`. Each is screened alone and as a group |
| FE3 | Automated feature construction | AutoGluon arithmetic / interaction generators (P3); pairwise products of the top-10 features, screened in-fold |
| FE4 | Cross-label features | out-of-fold P(CAD) and other-vessel probabilities as inputs (inner-CV, never in-sample) |
| FE5 | Learned representations | TabPFN / TabICL embeddings (in-fold) as extra features for linear/GBM models |
| **Output** | Per label, the feature view that wins on r0–r4 (F*) | carried into stages S3–S6 |

## 5. Feature selection (stage S2)
| ID | Experiment |
|---|---|
| FS1 | none (all F* features) |
| FS2 | in-fold top-k by random-forest / L1 / mutual information, k ∈ {10, 15, 20, 30} |
| FS3 | AutoGluon permutation-importance feature pruning (`feature_prune_kwargs`) |
| FS4 | Stability selection (L1 over bootstraps, in-fold) |

Earlier evidence suggests selection hurts here (the signal is spread over many weak features), but it is re-tested on the new feature views.

## 6. Models (stage S3: single families, each bagged alone so we know which families carry signal for each label)
| Family | Members | Where |
|---|---|---|
| Linear / kernel / distance | LR (elastic-net), SVM-RBF, kNN, GNB | `.venv` (phase-3 tuned; re-scored on r0–r4 for ensembling) |
| Trees / GBMs | RF, ExtraTrees, XGBoost, LightGBM, CatBoost (+ GPU variants where they exist) | `.venv` and AutoGluon |
| Glass-box | EBM, RuleFit, FIGS, HS-tree, boosted rules | AutoGluon `interpretable` + our EBM |
| Neural (GPU) | NN_TORCH, FastAI, RealMLP, TabM, FT-Transformer | AutoGluon |
| **Foundation models (GPU)** | TabPFN v3.5 (ours), RealTabPFN-v2, RealTabPFN-v2.5, TabPFN-2.6, TabPFN-3, TabICL (v1/v2), Mitra, TabDPT, TabPFNMix, Nori | AutoGluon + ours |
| TabPFN extreme (ours, GPU) | 1) checkpoints v2.5 / v2.6 / v3 / v3.5 (each needs a one-time licence acceptance); 2) n_estimators up to 64; 3) 50-trial Optuna over the full 13-parameter space; 4) seed bags; 5) **fine-tuning** (`FinetunedTabPFNClassifier`, inner early stopping) | `.venv` |

## 7. Hyperparameter tuning (stage S4)
| ID | Experiment |
|---|---|
| T1 | AutoGluon zero-shot portfolios (`zeroshot`, `zeroshot_2025_12_18_cpu/gpu`, `zeroshot_2025_tabfm`, `commercial`, `noncommercial`) vs |
| T2 | AutoGluon HPO (`hyperparameter_tune_kwargs`, 20–50 trials per family, run alone so Ray has memory) |
| T3 | Optuna for our own models (50 trials, r0–r2): TabPFN; re-check of the phase-3 tuned models only if F* changed |

The trial budget stays modest (≤ 100): at n = 303, more trials mostly overfit the validation folds.

## 8. Class imbalance and the internal metric (stage S4)
| ID | Experiment |
|---|---|
| I1 | `sample_weight`: none vs `balance_weight` |
| I2 | AutoGluon `eval_metric` for early stopping and ensemble selection: roc_auc vs log_loss |
| I3 | AutoGluon `calibrate`: on vs off |

## 9. Bagging (stage S5)
| ID | Experiment |
|---|---|
| B1 | `num_bag_folds` ∈ {5, 8, 10} |
| B2 | `num_bag_sets` ∈ {1, 3, 5} (repeated bagging) |
| B3 | `vary_seed_across_folds`, seed bags for TabPFN (5–10 seeds) |

## 10. Stacking (stage S5)
| ID | Experiment |
|---|---|
| ST1 | `num_stack_levels` ∈ {0, 1, 2, 3} |
| ST2 | dynamic stacking (DyStack) on vs off |
| ST3 | stacker portfolio at L2: full vs light (LR + GBM) vs linear only |
| ST4 | `use_bag_holdout`, ensemble_size for the weighted ensemble |
| ST5 | composition: union of the best families per label (from S3) as one stacked AutoGluon model |

## 11. Multi-label strategy (stage S6)
| ID | Experiment |
|---|---|
| M1 | independent per label (S0) |
| M2 | hierarchical: P(v) = P(CAD) × P(v \| ≥ 1 diseased vessel) |
| M3 | stacked binary relevance / classifier chains (OOF probabilities of the other labels) |
| M4 | joint 8-class vessel-pattern model (marginals give P(LAD/LCX/RCA); P(CAD) = 1 − P(none)) |
| M5 | consistency post-processing: P(vessel) ≤ P(CAD); P(CAD) ≥ max P(vessel) |

## 12. External data (stage S6)
| ID | Experiment |
|---|---|
| E1 | **AngioCAD** (Zenodo 15826856, 377 patients, segment-level LAD/LCX/RCA grades, CC BY 4.0): download + checksum, harmonise units (neutrophils/lymphocytes/EF fractions → %), map segments (LM counts for LAD and LCX), flag STEMI/acute presentations |
| E2 | Bidirectional external validation on the shared features (counts for "use of public datasets") |
| E3 | Pooled training of the **vessel-localisation** model (M2's conditional part) with a source flag and weight w ∈ {0.25, 0.5, 1}; AutoGluon `sample_weight` |
| E4 | UCI Heart Disease: re-tested only inside the best pipeline (phase 5 found cohort shift) |

## 13. Ensembling across everything (stage S7)
- **Candidate pool:** OOF predictions of every competitive run, from our models, TabPFN variants and AutoGluon pipelines. Each candidate is scored on r0–r4 (for weight fitting) and r5–r9 (for reporting).
- **Methods, with weights fitted on r0–r4 only:**
  - top-k mean and rank-mean;
  - Caruana greedy selection;
  - non-negative LR stacker;
  - AutoGluon `WeightedEnsemble` on the OOF matrix.
- **Diversity check:** pairwise OOF correlation; a candidate is kept only if it adds to the ensemble on r0–r4.

## 14. Post-processing (stage S8)
| ID | Experiment |
|---|---|
| PP1 | Calibration: none vs Platt vs isotonic vs beta vs temperature, fitted nested on OOF (r0–r4), scored on r5–r9 (Brier, ECE, slope) |
| PP2 | Decision threshold per label: 0.5 vs Youden vs max balanced accuracy vs max F1, chosen on r0–r4 |
| PP3 | Label-consistency constraints (M5) |
| PP4 | Conformal prediction: per-patient uncertainty intervals for the 3D dashboard |

## 15. Final selection, reporting and export (stage S9)
1. **Choose the champion per label** on r0–r4 evidence. Report it on r5–r9 against:
   - the best phase-3 model;
   - untuned LR;
   - default TabPFN;
   - competitor ranges.
2. **Robustness:** seed sensitivity, learning curve, subgroups (sex, age bands).
3. **Refit on all 303 patients and export** for the dashboard. Record prediction latency, memory, explanation support (SHAP / EBM / AutoGluon feature importance) and the licence needs of each component.
4. **Write-up:** `reports/BEST_MODELS.md`. Update the README, plan and memory.

## Execution order and budget (GPU)
| Stage | Content | Est. time |
|---|---|---|
| S0 | CUDA install, GPU benchmark, runner GPU support | 0.5 h |
| S1 | Cleaning + preprocessing (C1–C4, P1–P2) with fast probes on r0–r4 | 1 h |
| S2 | Feature engineering (FE1–FE5) incl. new risk scores + selection (FS1–FS4) | 3 h |
| S3 | Model families alone (AutoGluon GPU + ours), TabPFN extreme incl. checkpoints and fine-tuning | 8–10 h |
| S4 | Tuning, imbalance, internal metric, calibration flag | 3 h |
| S5 | Bagging + stacking grid on the best composition per label | 4 h |
| S6 | Multi-label strategies + AngioCAD external data | 3 h |
| S7 | Grand ensemble (needs r0–r4 + r5–r9 OOF for the finalists) | 3 h |
| S8 | Calibration, thresholds, constraints, conformal | 1 h |
| S9 | Final r5–r9 report, refit, export, write-up | 2 h |

**Total:** ~30 h of compute, run in the background stage by stage, with results reported after each stage.
Stages are ordered by information flow: each one feeds its winners forward. Every stage writes `reports/v2/<stage>/` plus rows in `reports/experiments.csv`.

**Needs from you:**
- For the TabPFN checkpoint comparison: a one-time licence acceptance per older checkpoint (v2.5, v2.6, v3). The helper opens the browser, as before.
- Nothing else.

# TabPFN: like-for-like run through phases 1–5

TabPFN v3.5 (a pretrained tabular foundation model, CPU) was run through **every step the other 10 models went through**, on the same fixed folds with the same decision rule.
Reproduce with `python -m ml.run_tabpfn` then `python -m ml.run_tabpfn_extra` (about 2.5 h + 3 h on CPU; it needs a one-time licence acceptance via `python scripts/tabpfn_login.py`). Outputs: `reports/tabpfn/`.

**Verdict (after phases 1–5 and the extra levers in §"Option A" below):**
- TabPFN is the **strongest untuned model** we have tried.
- Its own feature view, a 13-parameter search and a post-hoc ensemble of configurations brought it **level with the best model on CAD and LAD**, but it is **never significantly better on any label**:

  | Label | Best TabPFN variant | Best model | Gap |
  |---|---|---|---|
  | CAD | 0.935 | 0.939 | −0.004 |
  | LAD | 0.864 (hierarchical) | 0.861 | +0.003, SE 0.014 |
  | LCX | 0.757 | 0.772 | −0.016 |
  | RCA | 0.738 | 0.752 | −0.014 |

- On LCX and RCA it stays clearly behind.
- Its predictions correlate 0.94–0.96 with our best models, so blending adds at most +0.000 AUC, though it slightly improves calibration on CAD and LAD.
- **Decision:** not the deployed model for any label, because it ties at best and costs ~1.5 GB plus seconds per prediction. Its OOF predictions stay in the phase-7 stacking pool.

## T1 (phase 1): untuned, raw 55 features, all 10 repeats
| Target | TabPFN | LR | RF | XGB | TabPFN vs best baseline |
|---|---|---|---|---|---|
| CAD | **0.932** | 0.923 | 0.920 | 0.908 | **+0.009** (kept, > 1 corrected SE) |
| LAD | 0.845 | 0.821 | **0.848** | 0.827 | −0.003 |
| LCX | 0.738 | 0.660 | 0.740 | **0.741** | −0.004 |
| RCA | **0.738** | 0.718 | 0.715 | 0.693 | **+0.020** (kept) |

Out of the box, TabPFN equals or beats every untuned baseline. It is clearly better on CAD and RCA.

## T2 (phase 2): feature sets, repeats r5–r9
| Target | F0 raw | F1 cleaned | F2 engineered | F2 vs F0 (TabPFN) | F2 vs F0 (LR / RF / XGB) |
|---|---|---|---|---|---|
| CAD | 0.930 | 0.930 | 0.931 | +0.001 | +0.008 / +0.004 / +0.014 |
| LAD | 0.837 | 0.837 | 0.843 | +0.005 | +0.015 / +0.007 / +0.015 |
| LCX | 0.735 | 0.733 | 0.742 | +0.008 | +0.027 / +0.023 / +0.015 |
| RCA | 0.738 | 0.735 | 0.739 | +0.001 | +0.022 / −0.006 / +0.002 |

Our engineered features help TabPFN 2–5× less than they help the classical models. It already learns most of that structure itself.

## T3 (phase 3): tuning and seed bagging, F2
- **Search space:** number of ensemble members, softmax temperature, average-before-softmax, class balancing, polynomial features, fingerprint feature and outlier removal.
- **Tuning:** 20 Optuna TPE trials on r0–r2.

| Target | Default | Tuned | 5-seed bag | Kept | Best phase-3 model | Gap (corrected SE) | Rank / 11 |
|---|---|---|---|---|---|---|---|
| CAD | 0.931 | **0.934** | 0.931 | tuned | EBM 0.939 | −0.005 (0.008) | **4** |
| LAD | 0.843 | 0.843 | 0.842 | tuned | SVM 0.861 | −0.019 (0.010) | 9 |
| LCX | 0.742 | **0.750** | 0.748 | tuned | RF 0.772 | −0.022 (0.016) | 5 |
| RCA | 0.739 | 0.739 | 0.738 | tuned | LR 0.752 | −0.013 (0.013) | **3** |

- Tuning moved AUC by only 0.000–0.008, and seed bagging never helped. TabPFN's defaults are already near its best.
- CAD calibration is the best of any model: ECE **0.036** vs 0.044 for EBM, with Brier 0.089.

## T4 (phase 4): multi-label strategies (single seed)
| Vessel | S0 (own) | S1 hierarchical | S2 CAD-stacked | S3 stacked BR | Best S1–S3 vs best phase-3 S0 |
|---|---|---|---|---|---|
| LAD | 0.843 | **0.861** (+0.018, kept vs own S0) | 0.847 | 0.849 | −0.001 (ties SVM 0.861) |
| LCX | 0.750 | 0.752 | 0.747 | 0.737 | −0.020 |
| RCA | 0.739 | 0.736 | 0.744 | 0.744 | −0.008 |

- The hierarchical strategy is the one real TabPFN improvement: P(CAD) × P(LAD | diseased) lifts LAD by +0.018.
- It only **ties** the existing best LAD model, and its calibration is worse than SVM's (ECE 0.062 vs 0.037).

## T5 (phase 5): UCI external data (single seed)
| Target | E1 transfer feature | E2 pooled (UCI weight) | vs own S0 |
|---|---|---|---|
| CAD | 0.933 | 0.933 (0.5) | −0.001 / −0.001 |
| LAD | 0.842 | 0.848 (1.0) | −0.001 / +0.005 |
| LCX | 0.744 | 0.752 (0.5) | −0.006 / +0.002 |
| RCA | 0.741 | 0.736 (1.0) | +0.003 / −0.002 |

As with every other model, no gain survives the decision rule. TabPFN has no sample weights, so pooling keeps a random fraction of UCI rows equal to the weight.

## T6: does TabPFN add diversity? (fixed equal-weight blends, no fitted weights)
| Target | Correlation with best model | Best | Best + TabPFN | Top-3 | Top-3 + TabPFN |
|---|---|---|---|---|---|
| CAD | 0.960 | 0.939 | 0.938 | 0.942 | 0.941 |
| LAD | 0.960 | 0.861 | 0.855 | 0.863 | 0.857 |
| LCX | 0.945 | 0.772 | 0.759 | 0.775 | 0.768 |
| RCA | 0.941 | 0.752 | 0.746 | 0.752 | 0.750 |

- We had hoped TabPFN's different inductive bias would make its predictions differ from our models'. They don't (r = 0.94–0.96).
- Adding it to a blend lowers AUC on every label (−0.001 to −0.013).

## Option A: the remaining TabPFN levers (`python -m ml.run_tabpfn_extra`, about 3 h)

### T7: TabPFN's own feature view and in-fold feature selection (screening repeats r0–r4, T3 params)
| View | CAD | LAD | LCX | RCA |
|---|---|---|---|---|
| F0 raw | 0.934 | 0.852 | 0.730 | 0.737 |
| F1 cleaned | 0.937 | 0.852 | 0.740 | 0.736 |
| **F2 (phase 2)** | **0.942** | **0.853** | **0.755** | 0.739 |
| Fall = F1 + all 12 engineered | 0.937 | 0.853 | 0.741 | 0.732 |
| Fall + RF top-10 / 20 / 30 | 0.919 / 0.924 / 0.930 | 0.847 / 0.853 / 0.849 | 0.744 / 0.750 / 0.749 | 0.702 / 0.723 / **0.741** |
| Fall + L1 top-10 / 20 / 30 | 0.922 / 0.927 / 0.929 | 0.840 / 0.844 / 0.845 | 0.717 / 0.725 / 0.720 | 0.737 / 0.738 / 0.734 |

- **F2 is kept on every label.** No view beat it by more than 1 corrected SE; the best challenger was RCA RF top-30 at +0.002.
- Feature selection never helps TabPFN. It hurts more the fewer features are kept, as it did for the classical models (Kaggle review).
- On the screening repeats, the phase-2 features matter more for TabPFN (CAD +0.008, LCX +0.025 vs F0) than the T2 confirmation suggested.

### T8: wider search (30 Optuna trials on r0–r2, warm-started from the T3 optimum and the defaults)
Added: feature transforms (none / safepower / quantile / squashing / mixed per member), categorical encoding, explicit multi-level categoricals, feature and class shift method, and row subsampling.

| Label | T3 (r0–r2) | T8 (r0–r2) | T8 on r5–r9 | vs T3 on r5–r9 | vs best phase-3 |
|---|---|---|---|---|---|
| CAD | 0.9446 | 0.9452 | 0.935 | +0.001 | −0.004 |
| LAD | 0.8541 | **0.8665** | **0.856** | **+0.013 (kept, > 1 SE)** | −0.005 |
| LCX | 0.7496 | 0.7551 | 0.752 | +0.002 | −0.020 |
| RCA | 0.7386 | 0.7446 | 0.738 | −0.001 | −0.014 |

- Every winning configuration used a **lower softmax temperature (0.57–0.64)** and a non-default feature transform (squashing, quantile or safepower), mostly with numeric categorical encoding.
- Three of four winners used **80% row subsampling**.
- The LAD gain is real: quantile transform, 16 members, 80% rows.

### T9: post-hoc ensemble of TabPFN configurations (the AutoTabPFN method, on our folds)
AutoTabPFN itself is deprecated: its last release (tabpfn-extensions 0.4.3) pins AutoGluon 1.5, which would downgrade our scikit-learn and GBM libraries.
We reproduced its method instead:
- **Portfolio:** 8 configurations (6 distinct top T8 trials, the T3 optimum, and defaults on raw F0 for diversity), each scored on r0–r4.
- **Weights:** Caruana greedy ensemble selection with replacement (25 rounds) picks them on r0–r4.
- **Scoring:** the fixed blend is scored on r5–r9.

| Label | Members (weights) | r5–r9 AUC | vs T3 | vs best phase-3 |
|---|---|---|---|---|
| CAD | 5 (0.36 / 0.24 / 0.20 / 0.12 / 0.08) | 0.935 | +0.001 | −0.004 |
| LAD | 2 (0.52 / 0.48) | 0.856 | +0.013 (kept) | −0.006 |
| LCX | 3 (0.64 / 0.24 / 0.12) | 0.753 | +0.002 | −0.019 |
| RCA | 5 (0.32 / 0.32 / 0.28 / 0.04 / 0.04) | 0.738 | −0.001 | −0.014 |

- The ensemble equals the single best configuration: the tuned configurations are near-duplicates, scoring within 0.0004 of each other on CAD.
- The raw-F0 default never received weight.

### T10: every TabPFN variant vs the best phase-3 model (r5–r9, paired, corrected SE)
| Label | Best phase-3 | T3 tuned | T8 wide | T9 ensemble | T8 + S1 hierarchical | T9 + best phase-3 (equal blend) |
|---|---|---|---|---|---|---|
| CAD | EBM 0.939 | 0.934 | 0.935 | 0.935 | n/a | **0.939** (Brier 0.085 vs 0.087) |
| LAD | SVM 0.861 | 0.843 | 0.856 | 0.856 | **0.864** (+0.003, SE 0.014) | 0.861 (ECE 0.066 vs SVM 0.037) |
| LCX | RF 0.772 | 0.750 | 0.752 | 0.753 | 0.757 | 0.761 |
| RCA | LR 0.752 | 0.739 | 0.738 | 0.738 | 0.737 | 0.745 |

- **No TabPFN variant beats the best model by more than 1 corrected SE on any label.**
- LAD hierarchical (0.864) is the only variant numerically ahead, by +0.003 with SE 0.014: a tie.
- On LCX and RCA, most variants are worse than the best model by more than 1 SE.
- The CAD blend with EBM ties on AUC with slightly better Brier and ECE. That is a phase-7 stacking question, not a reason to deploy TabPFN.

## Engineering notes
- **Licence.** TabPFN's own login needs an interactive terminal. `scripts/tabpfn_login.py` runs the same browser-callback flow from any shell.
- **Memory.** Each TabPFN instance loads its own ~1.5 GB network. The wrapper (`ml.models.TabPFN`) stores the training rows in `fit` and builds the network only inside `predict_proba`, so a 5-seed bag holds one network at a time. Predictions are identical to the eager version (max difference 1e-6).
- **CPU.** Windows 11 put the long background run into efficiency mode (E-cores, no turbo), which made inference about 5× slower. Each TabPFN process now opts out once (`_disable_power_throttling`).
- **Throughput.** 6 processes × 3 torch threads, about 3 s per fold.

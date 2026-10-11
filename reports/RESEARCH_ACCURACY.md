# Research: how to raise accuracy for each output label

Written after phase 5 and the Kaggle review. It combines:
- (1) the competition brief,
- (2) a measurement of our own headroom,
- (3) three web-research tracks: external datasets, published risk models, and prior results on this dataset.

## 1. What the judges score (Track A brief)
| Criterion | Weight | What it covers |
|---|---|---|
| **Predictive performance** | **30%** (largest) | classification performance, **risk estimation quality** (calibration), **validation methodology** |
| 3D visualisation | 25% | vessel colours come from our per-vessel probabilities |
| Clinical interpretability | 20% | SHAP / feature attributions per prediction |
| System integration | 15% | real-time predictions in the dashboard |
| Technical implementation | 10% | includes **"use of public datasets"** |

So accuracy is the biggest lever, but calibrated probabilities and honest validation are scored inside the same 30%. Using a public external dataset also earns points under "technical implementation" even if it does not raise AUC.

## 2. Where we stand
| Label | Ours (r5–r9, honest) | Other Track A repos, honest validation | Published "SOTA" (mostly leaky) |
|---|---|---|---|
| CAD | **0.939** AUC / 0.884 acc | 0.85–0.94 AUC | 93–98% acc |
| LAD | **0.861** | 0.79–0.86 | 86–90% acc |
| LCX | **0.772** | 0.67–0.75 | 83–89% acc |
| RCA | **0.752** | 0.66–0.74 | 83–86% acc |

- We are **at or above the top of every honest range** among the competitor repos found.
- Published 83–89% vessel accuracies rely on:
  - feature selection or metaheuristic search (GA/PSO/whale) on the full data;
  - kernels or subsets picked after seeing results;
  - SMOTE before the split;
  - ~31-patient test sets;
  - in one case, a non-public 500-patient dataset.
- An honestly validated SVM in the same MBE 2022 paper reached LCX 77% and RCA 72% accuracy.

**Headroom check on our own models:**
- The top-5 models per label make highly correlated predictions (r = 0.91–0.95).
- Averaging the top 3 adds only +0.000–0.003 AUC.
- A tuned threshold adds only +0.001–0.004 accuracy.
- **More gains must come from new information** (external knowledge, external data) **or genuinely different model types**, not from more tuning.

## 3. External data: what exists
| Dataset | n | Vessel labels | Overlap with our features | Access | Verdict |
|---|---|---|---|---|---|
| **AngioCAD** (Isfahan, Iran, 2025, Zenodo 15826856) | 377 with features | **Yes:** 15 segments graded (LM, LAD×3, D1, D2, LCX×3, OM, RCA×3, PDA, PLB) | age, sex, BMI, DM, HTN, DLP, smoker, **EF**, TG, LDL, HDL, total chol, FBS, Cr, BUN, Hb, **WBC, neut, lymph**, PLT (+ monocytes, RDW, meds, dominance) | Open, CC BY 4.0, 170 KB of xlsx | **Best candidate.** Same country, recent, our labs. Lacks chest pain, BP, ECG, ESR, K, Na, RWMA. ~49% STEMI (acute) vs elective in Z-Alizadeh. Units: neut/lymph/EF are fractions |
| UCI Heart Disease raw (Cleveland/VA/Swiss) | 605 | yes | 12 basic features | open | **Tried in phase 5: no gain** (cohort shift, chest-pain semantics reversed) |
| CADICA (Spain) | 42 | partial | demographics, risk factors | open | too small |
| PLOS ONE 0290805 / 0220841 (China) | 1,210 / 365 | no (Gensini/SYNTAX only) | labs | open | no matching labels |
| PROMISE, ISCHEMIA, CASS, WISE (BioLINCC) | 1k–10k | CCTA/ICA anatomy | rich | IRB + data agreement, **weeks** | not feasible in the hackathon timeline |
| MIMIC-IV (+ notes) | thousands | free text only | rich | credentialing 1–2 weeks + NLP | not feasible |
| Kaggle "Z-Alizadeh sani dataset" | 303 | no | — | open | **exact duplicate of our data** (see KAGGLE_REVIEW.md) |

## 4. External knowledge: published risk models usable as features
These encode tens of thousands of patients without importing their cohort shift. The model learns how much to trust each score.

| Model | Derivation | Inputs we have | Notes |
|---|---|---|---|
| Diamond-Forrester 1979 | ~1970s | age, sex, CP type | **already used** (`pretest_prob`, our best engineered feature) |
| **Updated Diamond-Forrester** (Genders 2011, ESC 2013 table) | 2,260 ICA-referred | age, sex, CP type | ICA-referred calibration matches our cohort |
| **ESC 2019 PTP** (Juarez-Orozco) | 15,815 | age, sex, CP type, **dyspnoea column** | uses `dyspnea` for patients without chest pain |
| **ESC 2024 RF-CL** (Winther 2020) | 41,177 | age, sex, symptoms, **risk-factor count** (FH, current/ex smoking, DLP, HTN, DM) | brings in risk factors; adjust up for Q/ST-T, LV dysfunction |
| **CAD Consortium clinical** (Genders BMJ 2012) | 5,677 | age, sex, CP type, DM, HTN, DLP, smoking, DM × typical, setting = ICA | full coefficients verified from the appendix |
| **Duke clinical score** (Pryor 1993) | Duke 1969–83 | age, sex, CP, Q waves, ST-T, smoking, lipids, DM | ≥75% outcome; also **severe (LM/3VD) and left-main** sub-models (partial inputs) |
| Jang 2019 high-risk CAD (PROMISE) | 4,589 | age, sex, DM, FH, CP, smoking, SBP (+GFR from Cr) | relative score only (intercept not published) |

No validated **vessel-specific** (LAD/LCX/RCA) clinical model exists in the literature. The Duke severe/left-main scores are the closest proxy for multivessel disease.

## 5. Plan per output label

### Applies to all labels
1. **Knowledge features** (§4): add 6 published scores and run them through the phase 2 ablation (screen r0–r4, confirm r5–r9).
2. **AngioCAD** (§3):
   - (a) bidirectional external validation on the shared features. This is "use of public datasets" and evidence of generalisation.
   - (b) **pooled training of the vessel *localisation* model only.** The within-CAD vessel signal we found came from EF, neutrophils/lymphocytes, DM, PLT and Na, and AngioCAD has most of these, while chest pain (which it lacks) matters for *whether*, not *where*. So it plugs into the hierarchical strategy:
     - P(CAD) from the Z-Alizadeh model;
     - P(vessel | diseased) trained on Z-Alizadeh plus AngioCAD diseased patients (217 + ~298).
   - Restrict to stable/unstable angina, or add a diagnosis flag, to limit the STEMI shift.
3. **TabPFN** (needs your one-time licence acceptance): a different inductive bias from trees and linear models, so it adds real ensemble diversity.
4. **Ensemble across different feature views and model types** (nested), then **calibration**, **per-label thresholds** and **conformal uncertainty**. That covers "risk estimation quality", the 3D colours, and accuracy/F1 at an honest threshold.
5. **Nested CV** for the final reported numbers ("validation methodology").

### Per label
| Label | Now | Bottleneck | Most promising levers (in order) | Realistic target |
|---|---|---|---|---|
| **CAD** | 0.939 | near the honest ceiling (competitor max 0.94) | knowledge features (ESC 2024 RF-CL, CAD Consortium); ensemble EBM + LR + SVM; **calibration + threshold** for accuracy (0.884) | 0.94–0.95 |
| **LAD** | 0.861 | echo carries the signal (EF, RWMA) | AngioCAD-pooled conditional model (251 LAD+, has EF); EF × RWMA and RWMA-severity features; ensemble SVM + LR + CatBoost | 0.86–0.88 |
| **LCX** | 0.772 | localisation (within-CAD AUC 0.63), interactions (trees win) | AngioCAD conditional pooling (137 LCX+); Duke severe/LM score (LM feeds LCX); RF + CatBoost + LightGBM-hierarchical ensemble; TabPFN | 0.77–0.80 |
| **RCA** | 0.752 | weakest localisation (0.60); signal in DM + inflammation | AngioCAD (174 RCA+, has neut/lymph/monocytes); RF-CL / CAD Consortium (DM terms); LR + SVM + XGB ensemble | 0.75–0.78 |

### Ruled out (do not repeat)
- Kaggle CSV (duplicate data)
- UCI pooling (cohort shift)
- Univariate correlation filtering (−0.01 to −0.05)
- Label stacking (no gain)
- SMOTE or feature selection outside CV (leakage)
- "Recognizer" target-encoding features as published (likely leaky)

## Sources
- AngioCAD: https://zenodo.org/records/15826856 · paper doi 10.1016/j.cmpb.2026.109368
- ESC 2019 CCS (Knuuti, EHJ 2020;41:407), ESC 2024 CCS (Vrints, EHJ 2024;45:3415), Winther JACC 2020;76:2421
- CAD Consortium: Genders BMJ 2012;344:e3485 (PMC3374026, web appendix table 4)
- Updated DF: Genders EHJ 2011;32:1316 (ESC 2013 SCAD table 13)
- Duke: Pryor Ann Intern Med 1993;118:81 · Jang Circ CV Imaging 2019 (PMC6368397)
- Z-Alizadeh literature: Alizadehsani 2012 JMSS (PMC3660711), 2013 RCM (PMC4253773), 2013 CMPB, 2016 KBS, 2018 CMPB, 2020 Soft Comput; Zhang 2022 MBE 19:4568; Nasarian 2023 arXiv 2308.15339
- Track A competitor repos (honest validation ranges): Cardio3D, cardia-atlas, cardiolens, gautamhardik/multimodal-hackathon-track-a, cardiosight-3d, AparnaaSuresh/cardiotwin-ai (note: same "CardioTwin" name)

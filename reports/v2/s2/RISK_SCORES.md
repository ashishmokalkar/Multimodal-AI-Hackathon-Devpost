# Published clinical risk scores used as features (plan v2, FE2)

Implementation: `ml/risk_scores.py`.
- **Sources:** every number comes from the primary source and was cross-checked where a second source existed.
- **Leakage:** the scores use baseline patient characteristics only. They never see a label, so they are computed once on the whole table.

**Symptom mapping from Z-Alizadeh Sani.**
- `chest_pain_type`: 0 none, 1 non-anginal, 2 atypical, 3 typical.
- Patients without chest pain fall into the lowest symptom class. The exception is a model with a dyspnoea class (ESC 2019, RF-CL) when the patient reports dyspnoea.

| Feature | Model | Source | Check / caveat |
|---|---|---|---|
| `esc2019_ptp` | ESC 2019 CCS Table 5 (Juarez-Orozco 2019, n = 15,815), incl. the dyspnoea column | Knuuti, EHJ 2020;41:407 (doi 10.1093/eurheartj/ehz425); identical in PMC7391397 and PMC7590886 | Table look-up. Age < 30 uses the 30–39 row |
| `esc2024_rfcl` | ESC 2024 risk-factor-weighted clinical likelihood (Winther 2020) | Vrints, EHJ 2024;45:3415, Fig. 4. Formula from the authors' `cadptp` code (github.com/CardioLab/cadptp) | **RF3** is coded 1 (0–1 risk factors), 2 (2–3), 3 (4–5). Reproduces the guideline table: 85 of 90 cells exact, the rest within 0.6 pp; our spot checks give 32.4 vs 33, 0.8 vs 1, 11.6 vs 12 |
| `winther_basic_ptp` | Winther basic PTP (age, sex, symptoms) | `cadptp` code | as above |
| `updated_df_ptp` | Updated Diamond–Forrester (Genders 2011) | ESC 2013 SCAD guideline Table 13 (doi 10.1093/eurheartj/eht296) | **Table only.** The published regression in Sci Rep 2023 does not reproduce it |
| `cadc_basic`, `cadc_clinical` | CAD Consortium basic and clinical models | Genders, BMJ 2012;344:e3485, web appendix Table 4 (PMC3374026) | Every coefficient checked as exp(β) = the printed OR. `setting = 1`, because Z-Alizadeh is an invasive-angiography (high-prevalence) cohort. Smoking = current or past |
| `duke_significant`, `duke_severe`, `duke_left_main` | Duke clinical score, Pryor 1993 (appendix) | Ann Intern Med 1993;118:81–90 | Sex is coded 1 = female in the source. Missing inputs are set to 0: prior MI, symptom duration, weekly episodes, carotid bruit. Vascular index = weak peripheral pulse + CVA. ST-T change = ST depression, ST elevation or T inversion. Severe = P(significant) × P(severe \| significant) |
| `jang_score` | Jang 2019 PROMISE high-risk CAD [50] | Circ CV Imaging 2019 (PMC6368397) | **Relative score.** No intercept was published, so it is the sum of the log odds ratios. eGFR uses CKD-EPI 2021, with an effect only up to 95 |

**Unverified and not used:**
- the Genders 2011 regression coefficients;
- the Jang 2019 intercept and its unrounded coefficients (they sit in a supplement that couldn't be reached);
- the Duke smoking and hyperlipidaemia thresholds (the paper doesn't define them).

**Univariate AUC on all 303 patients** (descriptive only; no selection uses it):

| Score | CAD | LAD | LCX | RCA |
|---|---|---|---|---|
| esc2019_ptp | 0.806 | 0.753 | 0.707 | 0.696 |
| esc2024_rfcl | 0.865 | 0.793 | 0.743 | 0.719 |
| winther_basic_ptp | 0.837 | 0.781 | 0.733 | 0.696 |
| updated_df_ptp | 0.828 | 0.772 | 0.726 | 0.699 |
| cadc_basic | 0.848 | 0.788 | 0.742 | 0.700 |
| cadc_clinical | 0.879 | 0.795 | 0.759 | 0.733 |
| duke_significant | 0.876 | 0.807 | 0.749 | 0.728 |
| duke_severe | 0.883 | 0.803 | 0.767 | 0.736 |
| duke_left_main | 0.874 | 0.798 | 0.728 | 0.713 |
| jang_score | 0.832 | 0.753 | 0.767 | 0.726 |

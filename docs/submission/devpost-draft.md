# Devpost project text — draft

**Status:** Corrected review candidate, not mapped to a live Devpost form.
The current form and its requirements still require H's manual check; the
planning fetch returned HTTP 403. Ashish's ML verification and H's full
document/video review are also pending. All text below is a draft, not a
submission or final claim.

## Project title

CardioTwin: Interactive Coronary Risk Exploration

## One-line summary

A local educational prototype that pairs model-returned CAD and vessel
probabilities with a selectable 3D heart and an accessible explanation
dashboard.

## Inspiration

Risk numbers can be hard to connect to the clinical measurements and
anatomical regions they describe. We wanted a compact way to inspect a model's
CAD and vessel-level outputs together with the input profile, uncertainty,
warnings and explanation—without presenting a prediction as a diagnosis.

## What it does

Users choose one of eight real dataset demonstration patients or enter the
complete supported structured profile. A valid sample ID or an exact match
to a public sample's supported features selects demo estimators; other valid
profiles use final estimators. A local FastAPI service returns CAD, LAD, LCX
and RCA predictions. The React dashboard keeps model/source provenance,
target thresholds, uncertainty and response warnings visible. Users can
rotate and zoom the heart, select a vessel, inspect signed probability-point
contributions in **Why?**, and review inputs and derived values in **Inputs**.
The explanation uses baseline Shapley attribution with 32 input orderings on
the served calibrated probability, including the CAD cap for vessel outputs.
Its reference risk is a model prediction for reference inputs, not measured
population prevalence. Editing clears stale output while a fresh prediction
is requested; retaining a sample ID supports a paired demo-model comparison.

The 3D coronary paths are schematic and not patient-specific lesion maps.
This prototype accepts structured clinical, ECG, laboratory and
echocardiographic features; it does not import medical images or documents.

## How we built it

The browser app uses React, TypeScript, Vite, Three.js and React Three Fiber.
It calls a local FastAPI service implementing the pinned real API profile
(`1.1.0`) and model version (`cardiotwin-v2.0.0`). Four separate target
estimators return probabilities, labels, thresholds, warnings and attribution.
The frontend displays these responses rather than recomputing model outputs.

The dataset contains 303 records from the Extension of the Z-Alizadeh Sani
dataset (UCI #411). The model report uses fixed-fold repeated stratified
cross-validation. The reported mean per-fold ROC-AUC values on repeats r5-r9
are CAD 0.939, LAD 0.866, LCX 0.784 and RCA 0.767, with target-specific
confidence intervals in `reports/BEST_MODELS.md`. The separate pooled
calibrated AUCs are 0.932, 0.864, 0.767 and 0.762; accuracy, precision,
recall and F1 use Platt-calibrated probabilities with target-specific
threshold rules selected to maximize balanced accuracy. These are
cross-validation estimates, not clinical or external validation or
independent validation of the final/demo refits. The CAD champion has a
documented selection caveat, and ensemble comparisons have a mild-optimism
caveat.

## Safety and limitations

**For decision-support and educational purposes only. Not a substitute for
formal diagnostic imaging or clinical judgement.** Probabilities are not
diagnoses or percentages of narrowing. Target thresholds are independent,
vessel probabilities are capped by returned CAD probability, and equal values
alone do not prove that the cap changed a prediction. Attribution points are
not causal effects. The cohort is small and single-source; the model is not
clinically validated or deployed. Review the application's uncertainty and
warning messages.

## Built with

React, TypeScript, Vite, Three.js, React Three Fiber, FastAPI, scikit-learn,
CatBoost, XGBoost, EBM, and the Z-Alizadeh Sani extension dataset.

## Sources and access

- Frozen application source: [`39ffab1`](https://github.com/ashishmokalkar/Multimodal-AI-Hackathon-Devpost/tree/39ffab1c8adecd707c0f40ce826c12a568c41267)
- Dataset: [UCI Machine Learning Repository #411](https://archive.ics.uci.edu/dataset/411/extension+of+z-alizadeh+sani+dataset), credited under CC BY 4.0 in the repository.
- Heart mesh: *Realistic Human Heart* by neshallads, [Sketchfab](https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089), CC BY 4.0. Vessel overlays are project-authored schematics.
- Project document: [corrected review PDF](project-document.pdf), also linked from the [GitHub review package](README.md); final acceptance and judge-accessible link remain pending.
- Demo video: [4:21 captioned review rough cut](demo-review.mp4), copied unchanged from the S5 session artifacts for colleague review. This private-repository copy is not a YouTube upload; full human review and the final public video link remain pending.

## Draft-review dependencies

Ashish must verify or replace the ML/data/evaluation statements before
finalisation. H must inspect the current Devpost form, required fields,
asset/link mechanics and judge access. The project and video links above are
not claims that the current submission form or public access has been tested.

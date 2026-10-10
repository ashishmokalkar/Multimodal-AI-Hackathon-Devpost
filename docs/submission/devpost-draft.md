# Devpost project text — draft

**Status:** Not mapped to a live Devpost form. The current form and its
requirements still require H's manual check; the planning fetch returned
HTTP 403. All text below is a draft, not a submission or final claim.

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
complete supported structured profile. A local FastAPI service returns CAD,
LAD, LCX and RCA predictions. The React dashboard keeps model/source
provenance, target thresholds, uncertainty and response warnings visible.
Users can rotate and zoom the heart, select a vessel, inspect signed
probability-point contributions in **Why?**, and review inputs and derived
values in **Inputs**. Editing clears stale output while a fresh prediction is
requested; retaining the sample ID supports a paired demo-model comparison.

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
cross-validation; its reported ROC-AUC values are CAD 0.939, LAD 0.866,
LCX 0.784 and RCA 0.767, with target-specific confidence intervals recorded
in `reports/BEST_MODELS.md`. These are cross-validation estimates, not
clinical or external validation. The CAD champion has a documented selection
caveat; the demo estimators' refitting does not create separate validation
metrics.

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
- Project document: draft at `docs/submission/project-document.pdf`; final link pending review and upload.
- Demo video: a 4:21 real interactive captioned rough cut is retained in the S5 session artifacts; playback and captions were checked. It is not uploaded and has no public video link yet.

## Draft-review dependencies

Ashish must verify or replace the ML/data/evaluation statements before
finalisation. H must inspect the current Devpost form, required fields,
asset/link mechanics and judge access. The project and video links above are
not claims that the current submission form or public access has been tested.

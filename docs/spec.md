# Frontend Specification — CAD Risk 3D Visualizer

Living document. `planning/plan.md` must stay in sync with this file (see `workflow.md §3`). Sections marked **[TBD-Sn]** are to be resolved in sprint *n*.

## 1. Vision

A browser app where a clinician enters (or loads) a patient's clinical/ECG/lab/echo features, receives CAD and per-vessel (LAD/LCX/RCA) stenosis probabilities from the ML backend, sees them mapped as colours on an interactive 3D heart, and can inspect *why* via SHAP-style feature contributions — all framed by a clear "decision-support only" disclaimer.

### Score map (what the frontend is responsible for)

| Criterion | Weight | Frontend contribution |
|---|---|---|
| 3D Visualization | 25 % | Heart model, vessel colour-mapping, rotate/zoom/select, vessel detail |
| Clinical Interpretability | 20 % | SHAP charts, physiological breakdown, plain-language explanation |
| System Integration | 15 % | Typed API client, mock→real swap, real-time update on input change |
| Technical Implementation | 10 % | Architecture, code quality, reproducibility, asset provenance |
| Predictive Performance | 30 % | Colleague; we surface metrics in a "Model" drawer |

## 2. Users & core scenarios

1. **Clinician demo flow** — pick a sample patient → prediction appears → heart colours update → click RCA → see RCA probability, top contributing features → open "Why?" tab → signed contribution chart. An additive waterfall requires a confirmed common attribution/base/output scale.
2. **What-if flow** — edit a feature (e.g. toggle Typical Chest Pain, raise FBS) → prediction re-runs (debounced) → colours animate → contribution chart updates.
3. **Model transparency** — open Model drawer → see validation metrics (acc/prec/rec/F1/AUC) per target, dataset size, model version.

## 3. Screens & layout

Single-page app, desktop-first (≥1280 px), degrades to stacked layout on tablets.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Header: title · model version · [Model metrics] · DISCLAIMER BANNER  │
├────────────────┬─────────────────────────────┬───────────────────────┤
│ Patient panel  │ 3D Canvas                   │ Results panel         │
│ · sample picker│ · heart + LAD/LCX/RCA       │ · Overall CAD gauge   │
│ · grouped form │ · legend (prob → colour)    │ · LAD / LCX / RCA     │
│   (data-driven │ · camera presets            │   vessel cards        │
│   from API)    │ · hover tooltip, click=select│ · Tabs: Why? │ Vitals│
│ · Predict btn  │ · selected-vessel callout   │   (SHAP)   (breakdown)│
├────────────────┴─────────────────────────────┴───────────────────────┤
│ Footer: disclaimer · dataset credit · asset licences                 │
└──────────────────────────────────────────────────────────────────────┘
```

First load shows a **modal disclaimer** that must be acknowledged. Banner and footer disclaimers are always visible.

S2's approved sequencing (D-024) delivers readable CAD/vessel summaries and a
selected-target top-driver/value list before the full tabs/charts/metrics
experience in S3. Basic camera focus/reset supports the core demo flow; decorative
controls and elaborate transitions are not priorities. Delivery remains gated.

**S3 sequencing (D-032, D-034):** H approved an independent mock-backed
dashboard phase while M's response is pending: selected-target signed charts,
patient input/contribution breakdown and a labelled metrics drawer using the
existing contract. Gate 0 approved the detailed scope/budget/dates and
authorised Phase 1 only. Real integration requires a separate readiness self-check and
human gate; mock UI work cannot establish backend compatibility.

**UI/UX review and approved next phase (D-035, D-036):** H requested one Opus 5.5
extra-high read-only review after dashboard delivery. The reviewer identified
cropped heart captures and below-fold controls/source labels, unclear edited
states and weak chart zero/label readability. Approved remedies are a bounded
desktop workspace with independently scrolling side panels and stable canvas,
always-visible prediction actions/viewer controls, compact probability summaries
with prominent source/version, explicit state guidance and a zero-aligned,
readable signed chart. Verify at actual 1920 x 1080 and 1280 x 800 viewports,
not from full-page screenshot height. The precise resize cause needs live
reproduction. H approved Gate 1 with mandatory presentation carryover and
authorised UI/UX Phase 2, not real integration. Phase 2 implemented the
viewport-bounded desktop workspace, independently scrolling patient/results
panels, stable canvas, compact prediction/source summaries, distinct state
guidance and the readable zero-aligned signed chart without changing geometry,
clinical meaning or the API. Exact 1920 x 1080/1280 x 800 captures and
measurements are under `docs/evidence/s3p2-*`; H approved Human Gate 2 (D-037).
H then separately approved Gate R and runtime-first integration Phase 3
(D-038). Phase 3 has now implemented the approved real profile and verified
the WSL runtime, Windows localhost path and live frontend flow. Evidence is
under `docs/evidence/s3p3-*`. H closed Phase 3 at Human Gate 3 with explicit
warning-evidence carryover to Phase 4 (D-042). This is local integration
evidence, not complete warning verification, deployment or clinical validation.
Preserve the bounded layout during integration, including long provenance,
warnings and uncertainty. Small-heart framing and concise explanation copy
remain separately approved post-integration polish candidates. CSV import
with preview/confirmation is only a future candidate, not current scope;
broader UI research, document extraction and animation are not authorised.

## 4. Architecture

```
frontend/ (Vite + React 18 + TS)
  src/
    app/            App shell, layout, providers (QueryClient, Zustand store)
    api/            client.ts (fetch wrapper), types.ts (generated/hand-written from contract), hooks.ts (useFeatures, usePredict, useSamples, useMetrics)
    features/
      patient/      Data-driven form, sample picker, validation (zod from FeatureSchema)
      viewer/       R3F Canvas, HeartModel, VesselMesh, Legend, CameraPresets, vesselMap.ts
      results/      CadGauge, VesselCard, ShapChart, VitalsTable, ModelDrawer
      safety/       DisclaimerModal, DisclaimerBanner
    store/          uiStore (selectedVessel, hoveredVessel, cameraPreset), patientStore (features draft)
    lib/            colorScale.ts, format.ts
  public/models/   heart.glb (+ LICENSE)
mock-api/ (FastAPI)
  app/main.py, schemas.py, mock_data.py, samples.json
docs/api-contract.md
```

Data flow: form edit → `patientStore` → debounced `usePredict` (TanStack Query mutation) → one fresh, validated `PredictionResponse` → (a) `results/*` render, (b) `viewer` maps `vessels[id].probability` → colour via `colorScale`, (c) selecting a vessel in either panel sets `uiStore.selectedVessel` so 3D, results and target explanations stay in lock-step (brief: "consistent correspondence"). CAD/clear resets the selected target to CAD. Selection itself does not reposition the camera.

S2 acceptance requires a shared availability state: editing inputs or changing/resetting
the sample clears prior prediction detail immediately; pending/retry/error states
show no old probabilities or contributions, and unavailable vessels use a neutral
colour rather than a success-shaped default. A selected anatomical target may
persist without risk detail. Older request successes/errors must not overwrite a
newer input revision or request, including during the debounce interval.

**Local hosting (D-026; mock setup verified 2026-10-09):** the frontend runs on
Windows, while the mock API uses a separate Linux-native environment in WSL 2.
Keep the existing Windows checkout/Git workflow; do not reuse its Windows
virtual environment in Linux. API access through Windows localhost is verified;
no host protections were disabled and no public service is exposed.
M has now supplied the real API/model/runtime handoff at the D-038 source pin.
H approved a separate Linux-native Python 3.11.9 real environment using its
pinned requirements; do not replace the mock environment. Import only the
approved `api/`, model artifacts, required `ml/` support, primary XLSX and
subgroup report files, retaining their root-relative paths. The API depends
on source data/reports as well as joblib files. The pinned source bytes and
artifact hashes are recorded in `docs/evidence/s3p3-source-hashes.txt`.
Runtime setup used the separate home-directory environment and completed in
4m39s; all eight models, five endpoints, CORS and Windows localhost were
verified without modifying the mock environment. The approved 45-minute/
60-credit stop limits were not reached. Do not retrain, export, downgrade
model dependencies, retry blocked Windows launchers or merge branches.
Human Gate 3 is approved with D-042's carryover. H subsequently closed S3
at Gate 4 with remaining viewport evidence explicitly deferred to S4 (D-044).

Extensibility (brief §Technical Considerations): new feature → appears automatically via `GET /features`; new vessel → add entry to `vesselMap.ts` + mesh node name; new model → backend only, metrics drawer is schema-driven.

## 5. API contract (mock v1.0.0 and approved real v1.1.0 profiles)

| Method & path | Purpose | Response (shape) |
|---|---|---|
| `GET /health` | liveness, mode | `{status, model_version, contract_version, mock}` |
| `GET /features` | feature schema for form | `FeatureSchema[]` = `{name, label, group, type: number\|boolean\|categorical, unit?, min?, max?, options?, default, description?}` |
| `GET /patients/samples` | demo patients | `{id, label, features, synthetic, ground_truth?}[]` |
| `POST /predict` | run models | `{request_id, model_version, cad: Target, vessels: {LAD, LCX, RCA}: Target, explanations: {cad, LAD, LCX, RCA}: Explanation, risk_summary}` |
| `GET /model/metrics` | validation metrics | per target: `{accuracy, precision, recall, f1, roc_auc}`, `{validation, n_samples, trained_at}` |

`Target = {probability: 0..1, label, threshold}`; `Explanation = {base_value, contributions: {feature, value, contribution, direction}[]}`. Errors: FastAPI default `{detail}`; 422 on invalid features. CORS open for `localhost:5173`.

`docs/api-contract.md` now records the H-approved real v1.1 profile (D-038)
beside the preserved v1.0 mock examples. Validate health/version/mode and real
additions explicitly; do not silently strip them or reuse old mock metadata.
Unsupported/inconsistent profiles fail visibly without a mock fallback.
Keep raw conversion and feature engineering in M's backend.

The real form has 49 metadata-defined inputs: BBB/VHD categories, Function
Class 0-3, WBC x10^3/uL, single Chest Pain and Smoking choices; BMI/Obesity
are derived, and Exertional CP is removed. Reference defaults are clearly
labelled demo/reference values, not recorded patient measurements.
Real targets add `uncertain`; predictions add `warnings`, `derived`,
`prediction_source`, and explanations add `scale`/`method`. Metrics add
model name, ROC-AUC CI, balanced accuracy, Brier, ECE and validation threshold.
Display returned target labels/thresholds, not a universal 0.5 rule.

Real-sample what-if requests retain origin `sample_id` across edits to use the
same holdout demo model set. Snapshot it with the requested features; reset or
custom start clears it and selecting another sample replaces it. Edited
scenarios are labelled as such and do not inherit ground truth for their changed
inputs. Synthetic mock requests omit the real-only field. Preserve all request
revision/latest-result guards and clear prediction-dependent additions on edits.

Expected feature groups (Z-Alizadeh Sani extension; final list comes from M via `/features`): Demographic (Age, Sex, BMI, DM, HTN, Smoker, FH, Obesity, CRF, CVA, Airway, Thyroid, CHF, DLP…), Symptoms/Exam (BP, PR, Edema, Murmurs, Typical/Atypical CP, Dyspnea, Function Class…), ECG (Q Wave, ST Elevation/Depression, T inversion, LVH, Poor R Progression, BBB), Lab/Echo (FBS, CR, TG, LDL, HDL, BUN, ESR, HB, K, Na, WBC, Lymph, Neut, PLT, EF-TTE, Region RWMA, VHD). **Excluded from inputs:** LAD, LCX, RCA, Cath (target leakage).

## 6. 3D pipeline

- Heart asset: `frontend/public/models/heart.glb`, *Realistic Human Heart* by neshallads, CC BY 4.0. The upstream GLB has one heart mesh and no separately addressable coronary arteries. The runtime wraps it in a named `Heart` group.
- Vessel geometry: D-012's approved fallback is active. Project-authored `TubeGeometry` meshes named `LAD`, `LCX`, and `RCA` follow hand-authored `CatmullRomCurve3` paths. They are schematic, not patient-specific lesion maps. The LAD 0.80, LCX 0.30, and RCA 0.55 values used during S1 were illustrative fixtures only; runtime probabilities are never hard-coded.
- S2's mock-based viewer maps only the current accepted `PredictionResponse` to per-vessel colours, summaries, hover details, and selection details. When a current response is unavailable, all vessels use a distinct neutral colour and no old probability or contribution is shown. These mock-driven updates are not real-model integration.
- Loading: `useGLTF` (drei); use Draco only if needed and serve its decoder locally. `<Bounds fit>` on load; `frameloop="demand"`; `dpr={[1, 1.5]}`. No runtime asset/decoder CDN calls.
- Colour mapping: probability → `d3-scale`-style interpolation green (#2e7d32) → amber (#f9a825) → red (#c62828), with vessel labels and numeric values as a secondary encoding. The continuous legend shows 0-100% predicted probability, not clinical severity cutoffs or percentage artery narrowing; unavailable values have a distinct neutral encoding. D-047 authorises a separate selected-target decision-threshold marker from the accepted response, without changing probability hues or treating 50% as a classification boundary.
- Interaction: `OrbitControls` (damped), hover → emissive highlight + tooltip, click → select using the existing emissive highlight and shared results selection. Keyboard-operable result controls provide an alternative to 3D picking. Basic manual LAD/LCX/RCA focus controls and Reset frame the schematic geometry; result selection itself does not change the camera. Focus translates the camera and orbit target together to preserve the current orbit and zoom. No unverified anatomical-view labels or elaborate flyTo animation.
- Performance target: ≥50 fps during active rendering/interaction at 1080p; heart plus vessels ≤150k triangles total; GLB ≤8 MB. Phase 3 measured results are recorded with the evidence for the Gate 3 handoff.
- Loading/error states are shown explicitly. The GLB and all its embedded textures are local; no runtime asset or decoder CDN is used.
- Real uncertainty is conveyed in text and a static non-colour cue in result
  controls and viewer legend/callout/accessible details. It is neither an error
  nor an invented quantitative interval. Keep continuous probability colours;
  no pulsing/glow redesign, severity categories, global tint or lesion locations.
- D-047 authorises a persistent selected-vessel label using the existing Html
  tooltip pattern, retaining selected emissive/radius cues and probability
  hues. Hover/selection must not duplicate the same label or intercept picking.
  CAD clears the selected overlay; unavailable state has no stale risk or
  threshold marker. Ordinary selection still does not move the camera.

## 7. Interpretability presentation

- **S2 minimum:** CAD drivers by default, selected-vessel drivers on selection. Show up to five signed contributions sorted by absolute magnitude with deterministic ties, readable feature labels, entered values from the accepted response/submitted snapshot, and units from feature metadata. Explain unavailable/empty lists explicitly. Mock contributions remain visibly illustrative; values on an unconfirmed scale are not labelled probability-point changes or verified SHAP. No additive waterfall is required in S2.
- **Why? tab (S3 approved scope):** non-additive horizontal signed bars for up to ten returned contributions for the selected target (CAD by default; switches to vessel on selection), sorted by absolute magnitude with stable ties. Show readable labels, input values/units and signed numeric values as alternatives to colour. Positive/negative are model-contribution signs, not established clinical protective/harmful effects. Keep predicted probability separate; do not draw a base-to-probability waterfall while the scale is unconfirmed.
- Explanation scale must be agreed with M: the ML roadmap proposes logit-scale attributions. Do not add them to a probability-scale base or present them as probability-point changes. A waterfall may imply additivity only when the base, contributions and endpoint use the same documented scale; the final probability remains a separate labelled value.
- **Inputs tab (S3 approved scope):** metadata-grouped patient measurements/inputs and the selected target's returned contributions. Values must correspond to the accepted prediction input revision; response contribution values take precedence for attributed inputs. A missing contribution says "Not returned", not zero effect; absent input values are unavailable, not invented defaults. `FeatureSchema.min/max` are input-validation bounds, not clinical reference intervals. No normal/abnormal classification without a separately sourced, agreed reference dataset.
- **Metrics drawer (S3 approved scope):** show response-provided accuracy, precision, recall, F1 and ROC-AUC for CAD/LAD/LCX/RCA, with model version, validation description, sample count and training date. Mock metrics are explicitly illustrative, not deployed-model validation. Loading/error states are explicit; mismatched prediction/metrics versions must not be presented as one validated model.
- Plain-language summaries describe model drivers, not disease causation, and identify the attribution scale. Do not describe an unconfirmed signed contribution as a change in disease probability.

**S2 Phase 2 implementation status (2026-10-09):** The mock frontend now
selects the corresponding response explanation for CAD/LAD/LCX/RCA, labels
response-snapshot input values with feature metadata, sorts the leading five
contributions, and explicitly handles empty output. Explanations are marked
mock/illustrative and model-scale unconfirmed. O accepted the technical
self-check and H approved Gate 2 (D-029). H approved the Phase 3 closeout and
closed S2 on 2026-10-10 (D-031). WSL hosting resolves the mock verification route
only, not real-backend runtime or contract compatibility. This status is not
real-model integration or explanation-scale agreement. The Oct 10-11
integration window is provisional. During S3 planning, H allowed an independent
mock-dashboard plan while M's response is pending (D-032); contract changes,
delivery date and runtime/model handoff remain required at the separate
real-integration readiness gate. H approved S3 Gate 0 and authorised independent
Phase 1 only (D-034). X implemented and locally verified the mock-backed Why?/
Inputs dashboard and metrics drawer, with evidence under `docs/evidence/s3p1-*`;
Human Gate 1 is approved with presentation gaps carried into mandatory UI/UX
Phase 2 (D-036). This remains mock-only and does not establish real-backend
compatibility. Gate R remains separate and blocked on
M's contract/runtime/model handoff and H's approval at that historical boundary.

**S3 real-profile approval (2026-10-10, D-038):** M's final handoff supersedes
the experimental logit-scale proposal above: real explanations are baseline
Shapley on the served probability, including vessel capping, with 32 orderings.
After validating scale/method and full-list additivity, real signed values are
shown in percentage points (`0.12` = `+12 percentage points`), with the
reference model risk and method. For every target, test the complete returned
list with `abs(base_value + sum(contributions) - probability) < 0.003`,
allowing four-decimal JSON rounding. The top-ten chart remains a labelled
subset, not a waterfall or complete additive bridge. Mock/unconfirmed values
retain model-unit qualifications; attribution is not causation.

Surface response warnings and uncertainty without silently inventing defaults.
Show derived BMI/Obesity read-only; the latter is the dataset's BMI >25 flag,
not a clinical obesity diagnosis. Extend the existing metrics drawer with
returned validation detail, distinguishing CV-summary thresholds from the
current decision threshold and reported validation from final/demo fitting
sets. Matching version strings do not validate the demo refit; retain selection/
validation caveats from `reports/BEST_MODELS.md`.

**S3 Phase 3 implementation (2026-10-10; Gate 3 approved with D-042 carryover):** The frontend
validates health/mode and the approved mock v1.0/real v1.1 profiles separately,
requires all real-only fields, and clears prediction-dependent data on edits,
requests, failures and profile changes. The real 49-input schema, sample
provenance, response-derived values, uncertainty/warnings, probability-point
explanations and validation metrics are rendered from accepted API responses.
The imported serving/API/model/preprocessing code remains unchanged; focused
API/frontend tests and live evidence are under `docs/evidence/s3p3-*`.
All eight samples plus an edited holdout scenario pass full-list additivity
checks (maximum observed error 0.0004 against the 0.003 tolerance). The pinned
API suite passed six tests with no skips; frontend lint/typecheck/test/build
passed, with 55 tests across 15 files. Live evidence records exact 1920x1080
and 1280x800 viewports and 151.0 FPS during active orbit. The reproducible
Windows-frontend/WSL-API setup and shutdown steps are in the root README.
The footer distinguishes generated synthetic mock records from the real
Z-Alizadeh Sani extension (UCI #411; source-reported CC BY 4.0). This establishes
neither independent validation of demo refits nor clinical validity or
deployment. H closed Phase 3 with the unverified warning live checks explicitly
carried into Phase 4, not certified by that approval.

**Gate 3 review correction (D-041):** The core integration is supported, but
response warnings were placed after the chart/input table and risk summary,
so initial desktop captures did not reveal their existence. Acceptance requires:
show a compact warning count/status beside the probability/source summary at
1920x1080 and 1280x800, with keyboard-accessible full response text. Preserve
the bounded layout and clear warning UI on every prediction invalidation;
only a current accepted real response supplies warning assessment. Empty
warnings are not clinical reassurance, and mock output must not imply a real
warning check. H approved this narrow correction, not a broader redesign.

The correction places a compact count beside the probabilities and uses native
`details`/`summary` for non-empty real warnings. Empty real warnings explicitly
say “none returned” without reassurance; mock v1.0 explicitly says real-model
warning assessment is unavailable. Focused UI/store regressions pass. Exact
1920x1080/1280x800 live acceptance evidence remains incomplete after repeated
CDP canvas-sizing failures. H explicitly moved those remaining checks into
Phase 4 and closed Phase 3 (D-042). Phase 4 bundles a materially different
headed-browser verification route with retrospective/cleanup; missing saved
captures, live keyboard activation and closed/open canvas measurements stay
open until reviewed. H explicitly revised Gate 4 under D-044 to carry the
remaining viewport evidence into S4. Product/API requirements and budget limits are
unchanged; this is not permission for broader UI implementation.

**Historical Phase 4 evidence before D-044:** Headed Edge captured
patient 20 with the real model/version, four probabilities and the visible
warning count at both exact screenshot sizes; expanded captures show the full
age-related reliability caution. Document overflow measured 0 CSS px. At
1920x1080 the canvas measured 590.859 px closed and 591.859 px expanded. At
1280x800 the first closed-state canvas measurement was taken before resizing
settled and differs from the later expanded measurement; no stable pair is
claimed. The headed browser's CSS viewport was set through DevTools metrics,
not independently resized as a physical OS window. Windows OS `SendKeys` did
not activate the focused disclosure, and the attempt to select Custom patient
did not produce a live empty-warning response. The four patient-20 images and
raw measurements are under
`docs/evidence/s3p4-warning-*`; empty-warning and keyboard evidence remain open
for H's manual check at that report.

**Human closeout (D-044):** H manually confirmed physical Enter and Space
opening/closing of the warning disclosure, and that a fresh Custom-patient
response clears patient 20's warning and displays the qualified "none returned"
status. These observations have no exact viewport measurements or new
screenshots. H approved Gate 4 and closed S3 with the settled 1280x800
closed/open pair, missing saved empty-state captures and remaining viewport
proof deferred to S4 release-candidate verification before code freeze.
This changes evidence sequencing, not clinical-safety or layout requirements.
H subsequently approved S4 Gate 0 and Phase 1 under D-045.

**S4 summary-first presentation (D-045):** Reduce results/explanation density
using the existing components, formatting helpers and native disclosures.
Keep real/mock/version, custom/dataset/edited and final/demo source context,
all four probabilities/labels/thresholds, uncertainty and warning status
visible; keep complete returned source/method and numeric/input detail
keyboard-reachable. Move the signed top-ten chart ahead of lengthy method
copy, without shrinking its existing 11 CSS px text, dropping contributions,
changing probability-point units or implying causation/clinical benefit.
At 1280x800, patient 20's CAD Why? view with disclosures collapsed and results
scroll at zero must show at least three complete labelled chart rows.
Preserve accepted snapshots, missing/zero/mock distinctions, derived-value
qualifications, freshness and the bounded viewer/layout. No new backend/
model/API semantics, assets, imports, geometry, packages or broader redesign.
Phase 1 requires before/after desktop evidence and existing frontend checks.
Later hardening completes D-044's open evidence before end Oct 11 code freeze.

**S4 feedback/hardening (D-047):** H accepted Phase 1 and approved only feedback
IDs F01/F04/F06/F08/F09 plus existing release-candidate/carryover checks.
Add the threshold marker and selected label described above; clarify independent
thresholds and served vessel-probability capping in existing model details,
without recomputing outputs or inferring capping from equality. Make generic
repo-relative setup instructions for the tested Linux runtime and optional
WSL adaptation; distinguish tested Node 24.19.0 from the declared engine range.
Retain sample origin through edits, the pinned profile guards, schematic
geometry, asset/dependency/loading paths and disclaimer behavior. Anatomy,
contract extension and bundle optimisation remain separately scoped/deferred.
Preserve Phase 1's readability and complete D-044's remaining evidence before
code freeze. Original Phase 2 was 150 combined/100 X, with a 60 cumulative
warning limit. D-048 moves 75 unused Phase 1 credits to Phase 2 (now 225
combined; X still 100) and permits publication only under a 65 cumulative
corrective ceiling. Retain the recorded corrective and combined overruns;
S4's 700 total and all other caps remain unchanged.
H subsequently approved D-049: S4's phase/executor/corrective/publication
amounts are planning estimates under one shared hard 700-credit O+X budget.
E may use its remaining budget for approved scope without micro-allowance
requests. Historical overruns, S5 500, reserve 700 and project 7000 remain.
Approval is not implementation/verification; use the workflow/plan feedback
ledger and Human Gate 2 to close the batch.

The Phase 2 source, portable README and live warning/selection evidence are
present locally but unpublished. O's evidence review supports the bounded
changes; H authorised publication-only completion under D-048, then explicitly
authorised O's scoped commit/push under D-049. Human Gate 2
is still pending. Local tests/captures or budget approval do not authorise
cleanup, code freeze, broader features, public deployment or clinical claims.

S4 completes code under a 700-credit cap; S5 finalises the submission Oct
12-13 under 500, splitting the existing 1200 allocation (D-045). Draft/final
document/video dates and Oct 14 submission-only remain protected. S5 does
not authorise new features; any blocking frozen-code fix needs H approval.

## 8. Clinical safety

- Modal on first load (acknowledge required), persistent header banner, footer. Text: *"For decision-support and educational purposes only. Not a substitute for formal diagnostic imaging or clinical judgement."*
- Probabilities never shown as "diagnosis"; labels say "predicted".
- Warning existence/count is visible with the prediction summary without
  scrolling; full response cautions are keyboard-accessible. Do not bury
  reliability warnings behind long charts/tables or retain them after edits.

## 9. Non-functional

- Node LTS (≥20, pinned in `.nvmrc` to the installed version), pnpm via corepack. `pnpm lint`, `pnpm typecheck`, `pnpm build` clean. Vitest for pure logic (`colorScale`, `vesselMap`, schema validation).
- No GPU requirement; no external network calls other than the API.
- Accessibility: keyboard focus on cards/tabs, ARIA labels on 3D canvas summary.

## 10. Assets & licences

| Asset | Source | Licence | Path |
|---|---|---|---|
| Heart mesh | *Realistic Human Heart*, neshallads, Sketchfab | CC BY 4.0; attribution beside the distributed model and in `assets/heart/LICENSE.md` | `frontend/public/models/heart.glb` |
| LAD/LCX/RCA overlays | Project-authored schematic `TubeGeometry` paths | Project-generated; not patient-specific lesion maps | `frontend/src/features/viewer/` |
| Mock dataset samples | Generated synthetic records; not extracted UCI patients | Project-generated fixtures | `mock-api/data/samples.json` |
| Real dataset and eight demo patients (imported from the approved pin) | Extension of Z-Alizadeh Sani dataset, UCI #411; Alizadehsani, Roshanzamir and Sani (2013) | M reports CC BY 4.0; preserve UCI licence/citation | `data/raw/z_alizadeh_sani_ext/z_alizadeh_sani_ext.xlsx`, real `/patients/samples` |

Asset candidates, rejected options, source URLs, and mesh-addressability findings
are recorded in `assets/heart/CANDIDATES.md`.

## 11. Out of scope

Deployment (D-006), authentication, patient persistence, mobile layout, DICOM/imaging.
Current Phase 3 also excludes CSV/XLSX/Word/PDF/OCR/document extraction, FHIR,
beating-heart/depth-layer animation, nearest-flip scenarios, a broader camera/
layout redesign and unsupported lesion/severity mapping. Post-integration
polish or CSV work needs a separate H-approved scope/calendar decision.

## 12. Open questions

- Q1/Q2: M's serving inputs, target thresholds, probability-scale baseline
  Shapley and `/model/metrics` handoff are supplied and approved under D-038.
  WSL loading, semantic frontend integration and live evidence were verified in
  Phase 3; H approved Human Gate 3 with warning live evidence carried to Phase
  4 (D-042). H subsequently closed S3 at Gate 4 with remaining viewport
  evidence carried to S4 (D-044). Deployment, clinical validity and separately
  validated demo-refit metrics are not established.
- Q3: Faizan remains accountable for the video/document (D-033); M offers ML
  sections and joint script/architecture input. His contribution timing remains
  to confirm. Draft Oct 12, final Oct 13; submission-only Oct 14.

### Current ML handoff (reviewed and approved 2026-10-10)

Source: `ML-dev` at `6d3e403ffae65857124929335bbc534e8fd116c4`;
`handover_docs/ML_ANSWERS_FOR_FRONTEND.md`, `api/README.md`,
`models/manifest.json`, `reports/BEST_MODELS.md`. API/model code is from
`9ddb96b`; the latest commit moves handoff documents and adds UI research.
The API is declared available now, contract v1.1.0, model version
`cardiotwin-v2.0.0`. At Gate R, O had inspected the source but not run the
runtime; Windows verification was M's report and WSL was unverified. X has
since verified the pinned runtime and local Windows-to-WSL path as recorded
under `docs/evidence/s3p3-*`. Gate R authorized that bounded attempt; Human
Gate 3 is approved with D-042's warning-evidence carryover to Gate 4. The older
evidence below remains historical, not current dependency status.

### ML branch evidence (reviewed 2026-10-08)

Source: `origin/ML-dev` at `d09ebda`. The actual branch name is `ML-dev`, not `ml`; this evidence is not M's acknowledgement of `docs/api-contract.md`.

Rechecked remotely at H's request on **2026-10-09**: GitHub comparison reports
`ML-dev` identical to `d09ebda7317a94f9d23f5c5b8706c6222a531b5e`, with no new
commits or changed files. The findings below remain the branch evidence;
M's unpushed/local work and API delivery date are unknown. S2 Gate 1 approval
did not close these questions. At S2 Gate 2, H explicitly treated Oct 10-11
integration as provisional and required M's response before S3 Gate 0 can
close (D-029 supersedes D-028's follow-up boundary); the answers remain open.
H subsequently closed S2 at Gate 3 (D-031) and approved the S3 planning split
(D-032). M's response is now required at the separate real-integration readiness
gate, not before independent UI Gate 0. Neither mock work nor WSL hosting
resolves real-backend compatibility.

| Question | Confirmed evidence | Still open |
|---|---|---|
| Q1: inputs | `ml/data.py`, `data/README.md`, and `reports/EDA.md` define 55 cleaned inputs: 21 continuous, 3 ordinal, 31 binary; snake_case identifiers; target columns excluded. Raw data is available at `data/raw/z_alizadeh_sani_ext/z_alizadeh_sani_ext.xlsx`, sheet `Sheet 1 - Table 1`. | Serving payload names, units, allowed ranges/defaults, and final per-target pipeline inputs need agreement. Observed dataset bounds are not clinical reference ranges. |
| Q1: thresholds/explanations | Evaluation currently uses 0.5. `plan.md` proposes tuned thresholds, TreeExplainer/LinearExplainer and logit-scale contributions; model export/calibration/explanation serving is not implemented in the reviewed branch. | Final thresholds, explanation methods for the final selected models, scale, and API availability. Do not assume every model supports TreeExplainer. |
| Q2: metrics | `ml/evaluate.py` computes metrics; report files contain validation results. `plan.md` proposes `reports/metrics/metrics.json` and final model exports. No FastAPI app or `/model/metrics` endpoint exists in the reviewed tree. | Whether M will serve all five contract endpoints, and delivery timing. Metrics from experiments must not be relabelled as final deployed-model metrics. |
| Q3: submission | No assignment of video/document ownership found in the reviewed ML roadmap. | H/M must assign owners before S4. |

Integration differences to resolve before the real-backend swap:

- ML raw identifiers include `EX-Smoker`, `Airway disease`, `St Elevation`, `St Depression`, and `Tinversion`; the mock uses different spellings. Define an explicit serving-name map rather than silently accepting mismatches.
- Raw `BBB` is categorical (`N`, `LBBB`, `RBBB`) and becomes two binary model inputs; the mock currently uses a boolean.
- Raw `VHD` has four levels (`N`, `mild`, `Moderate`, `Severe`) mapped to 0–3; the mock currently uses a boolean.
- `Function Class` is 0–3 in the data, versus mock options 1–4.
- ML WBC values are 3700–18000, while the form uses thousands per microlitre (default 7.5). Confirm the serving unit and apply the factor-of-1000 conversion exactly once.
- Constant `Exertional CP` is dropped by ML; `BBB` expansion keeps the cleaned count at 55. Matching feature counts alone does not prove schema compatibility.

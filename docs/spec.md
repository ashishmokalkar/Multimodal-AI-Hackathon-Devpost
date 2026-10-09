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

1. **Clinician demo flow** — pick a sample patient → prediction appears → heart colours update → click RCA → see RCA probability, top contributing features → open "Why?" tab → SHAP waterfall.
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
selected-target top-driver/value list before the full gauge/tabs/charts/metrics
experience in S3. Basic camera focus/reset supports the core demo flow; decorative
controls and elaborate transitions are not priorities. Delivery remains gated.

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
no host protections were disabled and no public service is exposed. Using WSL
for the real backend still requires M's confirmed Python/dependency/model-artifact
requirements; this is not backend compatibility sign-off.

Extensibility (brief §Technical Considerations): new feature → appears automatically via `GET /features`; new vessel → add entry to `vesselMap.ts` + mesh node name; new model → backend only, metrics drawer is schema-driven.

## 5. API contract (summary — authoritative mock v1.0.0 in `docs/api-contract.md`; real-backend agreement pending)

| Method & path | Purpose | Response (shape) |
|---|---|---|
| `GET /health` | liveness, mode | `{status, model_version, contract_version, mock}` |
| `GET /features` | feature schema for form | `FeatureSchema[]` = `{name, label, group, type: number\|boolean\|categorical, unit?, min?, max?, options?, default, description?}` |
| `GET /patients/samples` | demo patients | `{id, label, features, synthetic, ground_truth?}[]` |
| `POST /predict` | run models | `{request_id, model_version, cad: Target, vessels: {LAD, LCX, RCA}: Target, explanations: {cad, LAD, LCX, RCA}: Explanation, risk_summary}` |
| `GET /model/metrics` | validation metrics | per target: `{accuracy, precision, recall, f1, roc_auc}`, `{validation, n_samples, trained_at}` |

`Target = {probability: 0..1, label, threshold}`; `Explanation = {base_value, contributions: {feature, value, contribution, direction}[]}`. Errors: FastAPI default `{detail}`; 422 on invalid features. CORS open for `localhost:5173`.

The current mock contract is not yet an agreed serving interface for `ML-dev`. Keep raw-input conversion and target-specific feature engineering in the backend, not in the frontend form. Confirm categorical options, units, and explanation output scale before claiming the real backend can be substituted by changing the base URL.

Expected feature groups (Z-Alizadeh Sani extension; final list comes from M via `/features`): Demographic (Age, Sex, BMI, DM, HTN, Smoker, FH, Obesity, CRF, CVA, Airway, Thyroid, CHF, DLP…), Symptoms/Exam (BP, PR, Edema, Murmurs, Typical/Atypical CP, Dyspnea, Function Class…), ECG (Q Wave, ST Elevation/Depression, T inversion, LVH, Poor R Progression, BBB), Lab/Echo (FBS, CR, TG, LDL, HDL, BUN, ESR, HB, K, Na, WBC, Lymph, Neut, PLT, EF-TTE, Region RWMA, VHD). **Excluded from inputs:** LAD, LCX, RCA, Cath (target leakage).

## 6. 3D pipeline

- Heart asset: `frontend/public/models/heart.glb`, *Realistic Human Heart* by neshallads, CC BY 4.0. The upstream GLB has one heart mesh and no separately addressable coronary arteries. The runtime wraps it in a named `Heart` group.
- Vessel geometry: D-012's approved fallback is active. Project-authored `TubeGeometry` meshes named `LAD`, `LCX`, and `RCA` follow hand-authored `CatmullRomCurve3` paths. They are schematic, not patient-specific lesion maps. The LAD 0.80, LCX 0.30, and RCA 0.55 values used during S1 were illustrative fixtures only; runtime probabilities are never hard-coded.
- S2's mock-based viewer maps only the current accepted `PredictionResponse` to per-vessel colours, summaries, hover details, and selection details. When a current response is unavailable, all vessels use a distinct neutral colour and no old probability or contribution is shown. These mock-driven updates are not real-model integration.
- Loading: `useGLTF` (drei); use Draco only if needed and serve its decoder locally. `<Bounds fit>` on load; `frameloop="demand"`; `dpr={[1, 1.5]}`. No runtime asset/decoder CDN calls.
- Colour mapping: probability → `d3-scale`-style interpolation green (#2e7d32) → amber (#f9a825) → red (#c62828), with vessel labels and numeric values as a secondary encoding. The continuous legend shows 0-100% predicted probability, not clinical severity cutoffs or percentage artery narrowing; unavailable values have a distinct neutral encoding.
- Interaction: `OrbitControls` (damped), hover → emissive highlight + tooltip, click → select using the existing emissive highlight and shared results selection. Keyboard-operable result controls provide an alternative to 3D picking. Basic manual LAD/LCX/RCA focus presets and Reset frame the schematic geometry without automatic camera jumps or unverified anatomical-view labels; elaborate flyTo animation is not S2 scope.
- Performance target: ≥50 fps during active rendering/interaction at 1080p; heart plus vessels ≤150k triangles total; GLB ≤8 MB. Phase 3 measured results are recorded with the evidence for the Gate 3 handoff.
- Loading/error states are shown explicitly. The GLB and all its embedded textures are local; no runtime asset or decoder CDN is used.

## 7. Interpretability presentation

- **S2 minimum:** CAD drivers by default, selected-vessel drivers on selection. Show up to five signed contributions sorted by absolute magnitude with deterministic ties, readable feature labels, entered values from the accepted response/submitted snapshot, and units from feature metadata. Explain unavailable/empty lists explicitly. Mock contributions remain visibly illustrative; values on an unconfirmed scale are not labelled probability-point changes or verified SHAP. No additive waterfall is required in S2.
- **Why? tab**: horizontal bar / waterfall of top-10 `contributions` for the selected target (CAD by default; switches to vessel on selection). Red = pushes toward disease, blue = protective. Shows `base_value` and final probability.
- Explanation scale must be agreed with M: the ML roadmap proposes logit-scale attributions. Do not add them to a probability-scale base or present them as probability-point changes. A waterfall may imply additivity only when the base, contributions and endpoint use the same documented scale; the final probability remains a separate labelled value.
- **Vitals tab (S3):** table of features, entered values and model contributions. `FeatureSchema.min/max` are input-validation bounds, not clinical reference intervals. Clinical normal ranges/out-of-range claims require a separately sourced, agreed reference dataset; otherwise show units and values without normal/abnormal classification.
- Plain-language summaries describe model drivers, not disease causation, and identify the attribution scale. Do not describe an unconfirmed signed contribution as a change in disease probability.

## 8. Clinical safety

- Modal on first load (acknowledge required), persistent header banner, footer. Text: *"For decision-support and educational purposes only. Not a substitute for formal diagnostic imaging or clinical judgement."*
- Probabilities never shown as "diagnosis"; labels say "predicted".

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

Asset candidates, rejected options, source URLs, and mesh-addressability findings
are recorded in `assets/heart/CANDIDATES.md`.

## 11. Out of scope

Deployment (D-006), authentication, patient persistence, mobile layout, DICOM/imaging.

## 12. Open questions

- Q1 → M: exact preprocessed feature list, types and ranges; threshold per target; SHAP availability per target (TreeExplainer?).
- Q2 → M: will the backend expose `/model/metrics`, or do we read a static JSON from the repo?
- Q3 → H/M: who records the demo video and writes the shared 6-page doc skeleton (S4)?

### ML branch evidence (reviewed 2026-10-08)

Source: `origin/ML-dev` at `d09ebda`. The actual branch name is `ML-dev`, not `ml`; this evidence is not M's acknowledgement of `docs/api-contract.md`.

Rechecked remotely at H's request on **2026-10-09**: GitHub comparison reports
`ML-dev` identical to `d09ebda7317a94f9d23f5c5b8706c6222a531b5e`, with no new
commits or changed files. The findings below remain the branch evidence;
M's unpushed/local work and API delivery date are unknown. S2 Gate 1 approval
does not close these questions; their follow-up is deferred to Gate 2 (D-028).

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

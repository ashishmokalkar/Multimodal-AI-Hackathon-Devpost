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

Data flow: form edit → `patientStore` → debounced `usePredict` (TanStack Query mutation) → `PredictionResponse` → (a) `results/*` render, (b) `viewer` maps `vessels[id].probability` → colour via `colorScale`, (c) selecting a vessel in either panel sets `uiStore.selectedVessel` so 3D and results stay in lock-step (brief: "consistent correspondence").

Extensibility (brief §Technical Considerations): new feature → appears automatically via `GET /features`; new vessel → add entry to `vesselMap.ts` + mesh node name; new model → backend only, metrics drawer is schema-driven.

## 5. API contract (summary — authoritative version in `docs/api-contract.md`, **[TBD-S1]**)

| Method & path | Purpose | Response (shape) |
|---|---|---|
| `GET /health` | liveness, mode | `{status, model_version, mock}` |
| `GET /features` | feature schema for form | `FeatureSchema[]` = `{name, label, group, type: number\|boolean\|categorical, unit?, min?, max?, options?, default, description?}` |
| `GET /patients/samples` | demo patients | `{id, label, features, ground_truth?}[]` |
| `POST /predict` | run models | `{request_id, model_version, cad: Target, vessels: {LAD, LCX, RCA}: Target, explanations: {cad, LAD, LCX, RCA}: Explanation, risk_summary}` |
| `GET /model/metrics` | validation metrics | per target: `{accuracy, precision, recall, f1, roc_auc}`, `{validation, n_samples, trained_at}` |

`Target = {probability: 0..1, label, threshold}`; `Explanation = {base_value, contributions: {feature, value, contribution, direction}[]}`. Errors: FastAPI default `{detail}`; 422 on invalid features. CORS open for `localhost:5173`.

Expected feature groups (Z-Alizadeh Sani extension; final list comes from M via `/features`): Demographic (Age, Sex, BMI, DM, HTN, Smoker, FH, Obesity, CRF, CVA, Airway, Thyroid, CHF, DLP…), Symptoms/Exam (BP, PR, Edema, Murmurs, Typical/Atypical CP, Dyspnea, Function Class…), ECG (Q Wave, ST Elevation/Depression, T inversion, LVH, Poor R Progression, BBB), Lab/Echo (FBS, CR, TG, LDL, HDL, BUN, ESR, HB, K, Na, WBC, Lymph, Neut, PLT, EF-TTE, Region RWMA, VHD). **Excluded from inputs:** LAD, LCX, RCA, Cath (target leakage).

## 6. 3D pipeline

- Asset: GLB with named nodes `Heart`, `LAD`, `LCX`, `RCA` (plus optional `Aorta`, `Torso_ghost`). Source + licence **[TBD-S1 spike, D-012]**.
- Loading: `useGLTF` (drei) with Draco; `<Bounds fit>` on load; `frameloop="demand"`; `dpr={[1, 1.5]}`.
- Colour mapping: probability → `d3-scale`-style interpolation green (#2e7d32) → amber (#f9a825) → red (#c62828), with a numeric legend; colour-blind-safe secondary encoding (label + pattern/opacity).
- Interaction: `OrbitControls` (damped), hover → emissive highlight + tooltip, click → select (outline via `@react-three/postprocessing` or emissive) and camera preset flyTo (anterior for LAD, lateral for LCX, inferior for RCA).
- Performance target: ≥50 fps on integrated GPU at 1080p; mesh ≤150k triangles total; GLB ≤8 MB.
- Fallback (D-012): generic heart mesh + `TubeGeometry` along hand-authored `CatmullRomCurve3` splines per vessel.

## 7. Interpretability presentation

- **Why? tab**: horizontal bar / waterfall of top-10 `contributions` for the selected target (CAD by default; switches to vessel on selection). Red = pushes toward disease, blue = protective. Shows `base_value` and final probability.
- **Vitals tab**: table of every feature: value entered, reference range (from `FeatureSchema.min/max` or a curated `referenceRanges.ts`), contribution bar, out-of-range flag.
- Plain-language sentence generated client-side: "Top drivers for LAD risk: Typical chest pain (+0.21), Age 67 (+0.09), …".

## 8. Clinical safety

- Modal on first load (acknowledge required), persistent header banner, footer. Text: *"For decision-support and educational purposes only. Not a substitute for formal diagnostic imaging or clinical judgement."*
- Probabilities never shown as "diagnosis"; labels say "predicted".

## 9. Non-functional

- Node LTS (≥20, pinned in `.nvmrc` to the installed version), pnpm via corepack. `pnpm lint`, `pnpm typecheck`, `pnpm build` clean. Vitest for pure logic (`colorScale`, `vesselMap`, schema validation).
- No GPU requirement; no external network calls other than the API.
- Accessibility: keyboard focus on cards/tabs, ARIA labels on 3D canvas summary.

## 10. Assets & licences  **[TBD-S1]**

| Asset | Source | Licence | Path |
|---|---|---|---|
| Heart mesh | — | — | `assets/heart/` |
| Dataset samples | UCI Z-Alizadeh Sani extension | CC BY 4.0 | `mock-api/app/samples.json` |

## 11. Out of scope

Deployment (D-006), authentication, patient persistence, mobile layout, DICOM/imaging.

## 12. Open questions

- Q1 → M: exact preprocessed feature list, types and ranges; threshold per target; SHAP availability per target (TreeExplainer?).
- Q2 → M: will the backend expose `/model/metrics`, or do we read a static JSON from the repo?
- Q3 → H/M: who records the demo video and writes the shared 6-page doc skeleton (S4)?

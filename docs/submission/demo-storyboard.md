# CardioClarity demo storyboard

**Target:** 4:20; the measured rough cut is 4:21. Captions only, no narration
or music. Record the frozen
real profile and actual responses; keep the browser interaction continuous
enough to show that the dashboard works, not a screenshot slideshow.

| Time | Live action / view | Caption intent and proof |
|---|---|---|
| 00:00-00:18 | Start on the real-profile app with the disclaimer visible or just acknowledged. | Introduce the problem and decision-support-only scope. |
| 00:18-00:52 | Confirm dataset patient 20 is selected, request a real prediction and keep the source/version, four probabilities and warning status in view. | Identify this as a real dataset demonstration sample; predictions are not diagnoses or narrowing percentages. |
| 00:52-01:22 | Orbit and zoom the heart, then select LAD. Keep the returned target, persistent selection label and camera stable. | Explain that color maps returned probability and the target marker is its separate decision threshold. |
| 01:22-01:52 | Open the patient-20 warning disclosure using browser input; show the full returned reliability text, then close it. | Read the caution as a model qualification, not a patient-specific diagnosis. |
| 01:52-02:25 | Open **Why?** for the selected target. Show chart rows and the concise explanation. | Name baseline Shapley attribution (32 input orderings) on the served calibrated/capped probability. The reference risk is a prediction for reference inputs, not population prevalence; contributions are signed probability points, not causal effects, and the chart is a top-ten subset. |
| 02:25-02:55 | Open **Inputs** and show accepted source values, units and a returned derived value. | The service accepts structured clinical, ECG, lab and echo values; no image/OCR import is demonstrated. |
| 02:55-03:30 | Edit one valid patient-20 input by a small amount. Show the old result clearing, then wait for a real fresh API response using the same sample ID. Do not steer toward a particular changed prediction. | Explain freshness and paired what-if provenance; do not treat the original ground truth as truth for the edit. |
| 03:30-03:55 | Open model metrics/details. Keep the validation method, cohort and caveats visible. | Summarise cross-validation evidence and its limits; no clinical or external-validation claim. |
| 03:55-04:20 | Return to the live dashboard; finish on the system/source attribution and local setup information. | Name the local React/Three/FastAPI pipeline, the UCI dataset and the CC BY heart mesh. No deployment claim. |

## Capture notes

- Frozen application source: `39ffab1c8adecd707c0f40ce826c12a568c41267`.
- Use the real API profile (`mock: false`) and confirm the actual health,
  source/version and responses before recording. Do not inject data or edit
  displayed output.
- Use browser/OS pointer and keyboard input for the disclosure and controls.
  Keep returned probabilities, provenance and warning status unobscured by
  captions. Keep the persistent clinical disclaimer visible where possible.
- If patient 20 or the real API is unavailable, stop and report the missing
  step instead of substituting mock footage as real.
- Timing is a target. Measure the exported video's actual duration and revise
  the captions to the captured cut before reporting it as complete.

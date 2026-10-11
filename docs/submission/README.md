# CardioClarity review package

**Status: review drafts, not final submission assets.** Human Gate 2 is
pending. This private repository requires GitHub repository access; sharing
these links does not establish public or judge access.

| Asset | Link | Current candidate |
|---|---|---|
| Project document | [PDF](project-document.pdf) / [Markdown source](project-document.md) | Five pages, including references; corrected S5-F01/F02/F03 candidate |
| Captioned demo | [Review video](demo-review.mp4) | 4:21, H.264, 1920x1080, no audio; unchanged Phase 1 rough cut |
| Video text | [Storyboard](demo-storyboard.md) / [Captions](demo-captions.vtt) | Captions are also burned into the video |
| Submission text | [Devpost draft](devpost-draft.md) | Not submitted or checked against the current live form |

Open the PDF or video link and use **Download** or **View raw** if GitHub
does not preview it. Play the downloaded MP4 locally to review the complete
cut. The video is committed for colleague review only; the required YouTube
upload and final links are still pending.

## Review requested

Ashish: verify or correct the dataset/preprocessing, target-leakage
exclusion, model choices, cross-validation and metric aggregation, subgroup
cautions, demo-model refits/routing, and baseline Shapley method in document
sections 2-4 and the matching submission text.

Faizan: read every PDF page, watch the complete captioned video, and verify
the current Devpost form, deadline, required assets, upload mechanics and
judge access. Forward consolidated feedback and Ashish's sign-off through
the agreed manual workflow.

Pending reviews are not approvals. Retain the clinical-safety, validation,
schematic-anatomy and noncausal-attribution qualifications when proposing
changes.

## Source and provenance

Frozen application source:
[`39ffab1`](https://github.com/ashishmokalkar/Multimodal-AI-Hackathon-Devpost/tree/39ffab1c8adecd707c0f40ce826c12a568c41267).
Submission drafts are on `frontend`, not in that older frozen-source commit.
Real API contract: `1.1.0`; model: `cardioclarity-v2.0.0`.

The review video is a byte-identical copy of the retained captioned rough
cut, not a new recording:

- Size: 7,097,500 bytes.
- SHA-256: `52bdfe826f63a6535e65854b40296cb17db96bf16fbe57f8480f04c1e493745c`.
- Raw recording remains outside Git.

Evidence: [draft package](../evidence/s5p1-package-verification.txt) and
[document corrections](../evidence/s5p2-correction-verification.txt).
Their earlier local-only video status is historical; D-055 authorises this
review copy without changing source freeze or accepting Gate 2.

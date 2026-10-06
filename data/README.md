# Data

```
data/
├── raw/         # original downloads, never edited (committed, checksummed)
├── interim/     # cleaned / harmonised intermediates (git-ignored, regenerated)
└── processed/   # model-ready feature matrices and CV splits (git-ignored, regenerated)
```

Re-create raw data from scratch with:

```bash
python scripts/download_data.py
```

The script verifies SHA-256 checksums so everyone trains on byte-identical data.

## `raw/z_alizadeh_sani_ext/` — primary hackathon dataset

| | |
|---|---|
| Name | Extension of Z-Alizadeh Sani dataset |
| Source | UCI ML Repository, id 411 — https://archive.ics.uci.edu/dataset/411/extention+of+z+alizadeh+sani+dataset |
| Creators | Roohallah Alizadehsani, Mohamad Roshanzamir, Zahra Sani (2013) |
| File | `z_alizadeh_sani_ext.xlsx` (original name: `extention of Z-Alizadeh sani dataset.xlsx`) |
| SHA-256 | `739343245c2ba578b541370217531750d8e936022f928b83e0d91756caa3ff0b` |
| Shape | 303 patients × 59 columns, no missing values, no duplicate rows |

Licence and citation terms: see the UCI dataset page above.

### Columns

Use the sheet **`Sheet 1 - Table 1`**. The second sheet (`Sheet1`) contains only a header row
for a wider version of the dataset (medications, stress test, per-segment cath results) with
**no data** and should be ignored.

| Group | Columns |
|---|---|
| Demographic | Age, Weight, Length (height, cm), Sex, BMI |
| History / risk factors | DM, HTN, Current Smoker, EX-Smoker, FH, Obesity, CRF, CVA, Airway disease, Thyroid Disease, CHF, DLP |
| Examination | BP, PR, Edema, Weak Peripheral Pulse, Lung rales, Systolic Murmur, Diastolic Murmur |
| Symptoms | Typical Chest Pain, Dyspnea, Function Class, Atypical, Nonanginal, Exertional CP, LowTH Ang |
| ECG | Q Wave, St Elevation, St Depression, Tinversion, LVH, Poor R Progression, BBB |
| Laboratory | FBS, CR, TG, LDL, HDL, BUN, ESR, HB, K, Na, WBC, Lymph, Neut, PLT |
| Echo | EF-TTE, Region RWMA, VHD |
| **Targets (never use as inputs)** | **LAD, LCX, RCA** (`Stenotic`/`Normal`), **Cath** (`CAD`/`Normal`) |

### Target balance

| Target | Positive | Negative |
|---|---|---|
| Cath (CAD) | 216 | 87 |
| LAD | 177 | 126 |
| LCX | 119 | 184 |
| RCA | 114 | 189 |

Number of stenotic vessels per patient: 0 → 86, 1 → 87, 2 → 67, 3 → 63.

### Known quirks (handle in cleaning)

- `Sex` uses the spelling `Fmale`.
- Binary columns mix encodings: some are `0/1`, others `Y/N`.
- `Exertional CP` is constant (`N` for all 303) and carries no information.
- Very rare positives: `CHF` (1), `LowTH Ang` (2), `CVA` (5), `Weak Peripheral Pulse` (5), `CRF` (6).
- Categoricals: `BBB` ∈ {N, LBBB, RBBB}; `VHD` ∈ {N, mild, Moderate, Severe}; `Function Class` ∈ {0,1,2,3}; `Region RWMA` ∈ {0..4}.
- Label inconsistency: 1 patient has `Cath = Normal` but at least one vessel marked `Stenotic`.
  Every `Cath = CAD` patient has ≥1 stenotic vessel.

## `raw/uci_heart_disease/`: external data (UCI Heart Disease, id 45)

| | |
|---|---|
| Source | https://archive.ics.uci.edu/dataset/45/heart+disease |
| Files | `cleveland.data`, `hungarian.data`, `switzerland.data`, `long-beach-va.data` (raw 76-attribute format), `heart-disease.names`, `WARNING` |
| Used for | Phase 5 transfer / pooling experiments (`ml/external.py`), **not** used by the final models (no gain, see `reports/PHASE5_EXTERNAL.md`) |

Raw records are whitespace-separated, end with the token `name`, and use `-9` for missing values.
Attributes 59–68 are per-segment angiography results (2 = ≥ 50% narrowing), which give LAD/LCX/RCA labels for
Cleveland (282 parseable records), VA (200) and Switzerland (123). Hungarian vessel data is recorded almost only for positive
patients and is excluded. `WARNING` says `cleveland.data` was corrupted; all 282 parseable records match `processed.cleveland.data`.

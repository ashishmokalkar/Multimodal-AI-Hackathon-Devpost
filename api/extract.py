"""Reads a patient's lab, ECG and echo reports (photos or PDFs) with a vision model and returns our inputs.

The model sees the documents plus the list of the 49 inputs (with units and options) and returns every value it can
find, each with the line it read it from. Everything it returns is checked here against the input definitions (type,
unit range, allowed options); anything that does not pass is reported as skipped, never silently used. Nothing is
stored: the files are sent to the model and forgotten.

Key: env OPENAI_API_KEY (locally also read from the repository's git-ignored .env). Model: env OPENAI_MODEL.
"""

from __future__ import annotations

import base64
import json
import os
import threading
import time
from pathlib import Path

import requests

from api.features import NAMES, SPECS

MODEL = os.environ.get("OPENAI_MODEL", "gpt-5.5")
MAX_FILES = 4
MAX_BYTES = 8 * 1024 * 1024
MEDIA = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
# a public demo pays per call, so each server instance reads at most this many uploads per hour
HOURLY_LIMIT = int(os.environ.get("EXTRACT_HOURLY_LIMIT", "60"))
_calls: list[float] = []
_lock = threading.Lock()


class ExtractError(Exception):
    """A problem the user can act on (shown as is)."""


def _key() -> str | None:
    key = os.environ.get("OPENAI_API_KEY")
    if key:
        return key.strip()
    env = Path(__file__).resolve().parent.parent / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip("'\"") or None
    return None


def available() -> bool:
    return _key() is not None


def _inputs_text() -> str:
    lines = []
    for name in NAMES:
        f = SPECS[name]
        if f["type"] == "number":
            kind = f"number in {f['unit']}"
        elif f["type"] == "boolean":
            kind = "true or false"
        else:
            kind = "one of " + ", ".join(str(o) for o in f["options"])
        lines.append(f"- {name}: {f['label']} ({kind})")
    return "\n".join(lines)


PROMPT = """You read a patient's medical reports (lab reports, ECG printouts, echo reports, clinic notes) and extract
values for a heart-disease risk model. Extract ONLY values that are written in the documents. Never guess or fill in
typical values; leave out anything the documents do not state.

Inputs (name: meaning (format)):
{inputs}

Rules:
- Convert to the unit given above when the report uses another one (glucose mmol/L x 18 = mg/dL; creatinine umol/L
  / 88.4 = mg/dL; haemoglobin g/L / 10 = g/dL; if only blood urea is given, BUN = urea / 2.14). Put the report's own
  value and unit in "as_written".
- PR is the pulse / heart rate (an ECG's ventricular rate counts). BP is the systolic blood pressure.
- ECG findings: true when the report states the finding; false only when the report explicitly says it is absent or
  the ECG is normal for it (for example "no acute ST-T changes" makes ST Elevation, ST Depression and T inversion
  false). BBB: None, LBBB or RBBB.
- Echo: EF-TTE is the LVEF in %. Region RWMA is the number of wall regions with abnormal motion (0 if "no RWMA").
  VHD is the worst valve disease described (None, Mild, Moderate, Severe).
- Age, Sex, Weight and Height (Length, cm) may be in a report header.
- History items (DM, HTN, smoking, family history, ...) only if a report states them.
- "evidence" is the exact short text you read the value from; "document" is the file it came from.
- For each file, say what kind of document it is.
"""


def _schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["documents", "values"],
        "properties": {
            "documents": {"type": "array", "items": {
                "type": "object", "additionalProperties": False, "required": ["file", "kind"],
                "properties": {"file": {"type": "string"},
                               "kind": {"type": "string", "enum": ["lab report", "ECG", "echo report", "clinic note",
                                                                  "other"]}}}},
            "values": {"type": "array", "items": {
                "type": "object", "additionalProperties": False,
                "required": ["name", "value", "as_written", "evidence", "document"],
                "properties": {"name": {"type": "string", "enum": list(NAMES)},
                               "value": {"type": "string"},
                               "as_written": {"type": "string"},
                               "evidence": {"type": "string"},
                               "document": {"type": "string"}}}},
        },
    }


def _parse(name: str, raw: str):
    """The model's text value as our input value, or raise ValueError with the reason."""
    f = SPECS[name]
    text = raw.strip()
    if f["type"] == "number":
        number = float(text.replace(",", "").split()[0])
        if not f["min"] <= number <= f["max"]:
            raise ValueError(f"{number:g} {f['unit']} is outside {f['min']:g}-{f['max']:g}")
        return round(number, 2)
    if f["type"] == "boolean":
        word = text.lower()
        if word in {"true", "yes", "present", "1"}:
            return True
        if word in {"false", "no", "absent", "0"}:
            return False
        raise ValueError(f"'{text}' is not yes or no")
    for option in f["options"]:
        if str(option).lower() == text.lower():
            return option
    raise ValueError(f"'{text}' is not one of {', '.join(str(o) for o in f['options'])}")


def _rate_limit() -> None:
    now = time.time()
    with _lock:
        _calls[:] = [t for t in _calls if now - t < 3600]
        if len(_calls) >= HOURLY_LIMIT:
            raise ExtractError("Report reading is busy right now; please try again later.")
        _calls.append(now)


def extract(files: list[dict]) -> dict:
    """files: [{name, media_type, data (base64)}] -> {documents, values, skipped, model}."""
    key = _key()
    if not key:
        raise ExtractError("Report reading is not configured on this server.")
    if not files:
        raise ExtractError("Add at least one report.")
    if len(files) > MAX_FILES:
        raise ExtractError(f"Add at most {MAX_FILES} reports at a time.")
    content: list[dict] = [{"type": "text", "text": PROMPT.format(inputs=_inputs_text())}]
    for f in files:
        if f["media_type"] not in MEDIA:
            raise ExtractError(f"{f['name']}: use a photo (JPG, PNG, WebP) or a PDF.")
        try:
            size = len(base64.b64decode(f["data"], validate=True))
        except ValueError as error:
            raise ExtractError(f"{f['name']} could not be read.") from error
        if size > MAX_BYTES:
            raise ExtractError(f"{f['name']} is larger than {MAX_BYTES // 1024 // 1024} MB.")
        content.append({"type": "text", "text": f"File: {f['name']}"})
        url = f"data:{f['media_type']};base64,{f['data']}"
        if f["media_type"] == "application/pdf":
            content.append({"type": "file", "file": {"filename": f["name"], "file_data": url}})
        else:
            content.append({"type": "image_url", "image_url": {"url": url, "detail": "high"}})
    _rate_limit()
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}"},
        json={"model": MODEL, "messages": [{"role": "user", "content": content}],
              "response_format": {"type": "json_schema",
                                  "json_schema": {"name": "report_values", "strict": True, "schema": _schema()}}},
        timeout=120,
    )
    if response.status_code != 200:
        detail = response.json().get("error", {}).get("message", "") if response.headers.get(
            "content-type", "").startswith("application/json") else ""
        raise ExtractError(f"The report reader returned an error ({response.status_code}). {detail[:200]}".strip())
    result = json.loads(response.json()["choices"][0]["message"]["content"])
    values, skipped, seen = [], [], set()
    for item in result["values"]:
        name = item["name"]
        if name in seen:
            continue
        try:
            value = _parse(name, item["value"])
        except (ValueError, IndexError) as error:
            skipped.append({"name": name, "label": SPECS[name]["label"], "reason": str(error),
                            "evidence": item["evidence"], "document": item["document"]})
            continue
        seen.add(name)
        values.append({"name": name, "label": SPECS[name]["label"], "group": SPECS[name]["group"],
                       "value": value, "unit": SPECS[name].get("unit"), "as_written": item["as_written"],
                       "evidence": item["evidence"], "document": item["document"]})
    return {"documents": result["documents"], "values": values, "skipped": skipped, "model": MODEL}

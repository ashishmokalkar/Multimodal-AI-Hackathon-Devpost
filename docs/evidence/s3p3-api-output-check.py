"""Capture real-profile metadata, prediction latency, and full-list additivity."""

from __future__ import annotations

import json
import math
import statistics
import time
import urllib.request

BASE_URL = "http://127.0.0.1:8000"


def get(path: str) -> dict | list:
    with urllib.request.urlopen(BASE_URL + path, timeout=10) as response:
        return json.loads(response.read())


def predict(features: dict, sample_id: str | None = None) -> tuple[dict, float]:
    payload = {"features": features}
    if sample_id is not None:
        payload["sample_id"] = sample_id
    request = urllib.request.Request(
        BASE_URL + "/predict",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    started = time.perf_counter()
    with urllib.request.urlopen(request, timeout=15) as response:
        result = json.loads(response.read())
    return result, (time.perf_counter() - started) * 1000


health = get("/health")
features = get("/features")
samples = get("/patients/samples")
metrics = get("/model/metrics")
assert health == {
    "status": "ok",
    "model_version": "cardiotwin-v2.0.0",
    "contract_version": "1.1.0",
    "mock": False,
}
feature_by_name = {feature["name"]: feature for feature in features}
assert len(features) == len(feature_by_name) == 49
assert len(samples) == len({sample["id"] for sample in samples}) == 8
assert all(not sample["synthetic"] for sample in samples)
assert metrics["mock"] is False
assert set(metrics["targets"]) == {"cad", "LAD", "LCX", "RCA"}
assert feature_by_name["BBB"]["options"] == ["None", "LBBB", "RBBB"]
assert feature_by_name["VHD"]["options"] == ["None", "Mild", "Moderate", "Severe"]
assert feature_by_name["Function Class"]["options"] == [0, 1, 2, 3]
assert feature_by_name["Chest Pain"]["options"] == [
    "None",
    "Typical",
    "Atypical",
    "Non-anginal",
]
assert feature_by_name["Smoking"]["options"] == ["Never", "Former", "Current"]
assert feature_by_name["WBC"]["unit"] == "x10^3/uL"

checks = []
latencies = []
uncertainty_values = set()
warning_count = 0
no_warning_count = 0


def check_response(label: str, body: dict, latency_ms: float) -> None:
    global warning_count, no_warning_count
    assert body["mock"] is False
    assert body["model_version"] == "cardiotwin-v2.0.0"
    latencies.append(latency_ms)
    warning_count += bool(body["warnings"])
    no_warning_count += not bool(body["warnings"])
    targets = [("cad", body["cad"])] + [
        (vessel, body["vessels"][vessel]) for vessel in ("LAD", "LCX", "RCA")
    ]
    residuals = {}
    for name, target in targets:
        uncertainty_values.add(target["uncertain"])
        explanation = body["explanations"][name]
        assert explanation["scale"] == "probability" and explanation["method"]
        assert all(
            math.isfinite(item["contribution"])
            for item in explanation["contributions"]
        )
        residual = abs(
            explanation["base_value"]
            + sum(item["contribution"] for item in explanation["contributions"])
            - target["probability"]
        )
        assert residual < 0.003, (label, name, residual)
        residuals[name] = residual
    checks.append(
        {
            "scenario": label,
            "prediction_source": body["prediction_source"],
            "warnings": body["warnings"],
            "derived": body["derived"],
            "targets": {
                name: {
                    "probability": target["probability"],
                    "label": target["label"],
                    "threshold": target["threshold"],
                    "uncertain": target["uncertain"],
                    "contribution_count": len(
                        body["explanations"][name]["contributions"]
                    ),
                    "full_list_additivity_error": residuals[name],
                }
                for name, target in targets
            },
            "prediction_latency_ms": round(latency_ms, 2),
        }
    )


responses = []
for sample in samples:
    body, elapsed_ms = predict(sample["features"], sample["id"])
    assert "trained without this patient" in body["prediction_source"]
    check_response(sample["id"], body, elapsed_ms)
    responses.append((sample, body))

sample, original = responses[0]
edited_features = dict(sample["features"])
previous_chest_pain = edited_features["Chest Pain"]
edited_features["Chest Pain"] = next(
    option
    for option in feature_by_name["Chest Pain"]["options"]
    if option != previous_chest_pain
)
edited, edited_latency = predict(edited_features, sample["id"])
assert edited["request_id"] != original["request_id"]
assert edited["prediction_source"] == original["prediction_source"]
assert any(
    edited["cad"]["probability"] != original["cad"]["probability"]
    or edited["vessels"][vessel]["probability"]
    != original["vessels"][vessel]["probability"]
    for vessel in ("LAD", "LCX", "RCA")
)
check_response("edited-" + sample["id"], edited, edited_latency)

final, final_latency = predict(edited_features)
assert "all 303 patients" in final["prediction_source"]
check_response("custom-final-model", final, final_latency)
assert uncertainty_values == {False, True}
assert warning_count > 0 and no_warning_count > 0
assert all(
    target["threshold"] != 0.5
    for _, body in responses
    for target in [body["cad"], *body["vessels"].values()]
)
assert all(
    target["threshold"] != 0.5
    for target in [edited["cad"], *edited["vessels"].values()]
)

preflight = urllib.request.Request(
    BASE_URL + "/predict",
    method="OPTIONS",
    headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    },
)
with urllib.request.urlopen(preflight, timeout=10) as response:
    cors = {
        "status": response.status,
        "allow_origin": response.headers.get("Access-Control-Allow-Origin"),
        "allow_methods": response.headers.get("Access-Control-Allow-Methods"),
    }
assert cors["status"] == 200
assert cors["allow_origin"] == "http://localhost:5173"

report = {
    "captured_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "health": health,
    "features": {
        "count": len(features),
        "unique": len(feature_by_name),
        "BBB": feature_by_name["BBB"]["options"],
        "VHD": feature_by_name["VHD"]["options"],
        "Function Class": feature_by_name["Function Class"]["options"],
        "Chest Pain": feature_by_name["Chest Pain"]["options"],
        "Smoking": feature_by_name["Smoking"]["options"],
        "WBC_unit": feature_by_name["WBC"]["unit"],
    },
    "samples": {
        "count": len(samples),
        "all_non_synthetic": all(not sample["synthetic"] for sample in samples),
        "ids": [sample["id"] for sample in samples],
    },
    "metrics": {
        "model_version": metrics["model_version"],
        "targets": list(metrics["targets"]),
        "sample_count": metrics["n_samples"],
        "thresholds": {
            name: target["threshold"]
            for name, target in metrics["targets"].items()
        },
    },
    "cors": cors,
    "uncertainty_values_seen": sorted(uncertainty_values),
    "warning_response_count": warning_count,
    "no_warning_response_count": no_warning_count,
    "prediction_latency_ms": {
        "min": round(min(latencies), 2),
        "median": round(statistics.median(latencies), 2),
        "max": round(max(latencies), 2),
        "count": len(latencies),
    },
    "max_full_list_additivity_error": max(
        max(target["full_list_additivity_error"] for target in item["targets"].values())
        for item in checks
    ),
    "checks": checks,
    "paired_edit": {
        "feature": "Chest Pain",
        "from": previous_chest_pain,
        "to": edited_features["Chest Pain"],
        "sample_id_retained": sample["id"],
        "prediction_source_unchanged": edited["prediction_source"]
        == original["prediction_source"],
        "original_request_id": original["request_id"],
        "edited_request_id": edited["request_id"],
    },
    "custom_provenance": final["prediction_source"],
}

output_path = "docs/evidence/s3p3-api-output-check.json"
with open(output_path, "w", encoding="utf-8") as output:
    json.dump(report, output, indent=2)
    output.write("\n")
print(json.dumps(report, indent=2))

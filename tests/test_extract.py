"""Report reading: the checks on the vision model's answer, without calling the model."""
import json

import pytest

from api import extract as ex


def test_parse_accepts_only_valid_values():
    assert ex._parse("FBS", "360") == 360
    assert ex._parse("CR", "1.3 mg/dL") == 1.3
    assert ex._parse("Sex", "female") == "Female"
    assert ex._parse("Region RWMA", "0") == 0
    assert ex._parse("Poor R Progression", "true") is True
    assert ex._parse("ST Elevation", "No") is False
    with pytest.raises(ValueError):
        ex._parse("FBS", "6000")                      # outside the input's range
    with pytest.raises(ValueError):
        ex._parse("VHD", "trivial")                   # not an allowed option
    with pytest.raises(ValueError):
        ex._parse("DM", "maybe")


def test_extract_checks_the_models_answer(monkeypatch):
    answer = {"documents": [{"file": "lab.pdf", "kind": "lab report"}],
              "values": [{"name": "FBS", "value": "360", "as_written": "360 mg/dL", "evidence": "FBS 360 H",
                          "document": "lab.pdf"},
                         {"name": "HB", "value": "110", "as_written": "110 g/L", "evidence": "Hb 110",
                          "document": "lab.pdf"},
                         {"name": "FBS", "value": "98", "as_written": "98", "evidence": "again", "document": "lab.pdf"}]}

    class Reply:
        status_code = 200
        headers = {"content-type": "application/json"}

        def json(self):
            return {"choices": [{"message": {"content": json.dumps(answer)}}]}

    sent = {}
    monkeypatch.setattr(ex, "_key", lambda: "test-key")
    monkeypatch.setattr(ex.requests, "post", lambda url, **kw: sent.update(kw) or Reply())
    out = ex.extract([{"name": "lab.pdf", "media_type": "application/pdf", "data": "JVBERi0xLjQ="}])
    assert [v["name"] for v in out["values"]] == ["FBS"] and out["values"][0]["value"] == 360   # first FBS kept
    assert [s["name"] for s in out["skipped"]] == ["HB"]                                        # 110 g/dL rejected
    assert sent["json"]["response_format"]["json_schema"]["strict"] is True


def test_extract_refuses_bad_uploads(monkeypatch):
    monkeypatch.setattr(ex, "_key", lambda: "test-key")
    with pytest.raises(ex.ExtractError):
        ex.extract([{"name": "x.docx", "media_type": "application/msword", "data": "AAAA"}])
    with pytest.raises(ex.ExtractError):
        ex.extract([])
    monkeypatch.setattr(ex, "_key", lambda: None)
    with pytest.raises(ex.ExtractError):
        ex.extract([{"name": "a.png", "media_type": "image/png", "data": "AAAA"}])

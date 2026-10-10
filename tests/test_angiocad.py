import pandas as pd
import pytest

from ml.angiocad import RAW, load_angiocad

pytestmark = pytest.mark.skipif(not RAW.exists(), reason="run scripts/download_data.py angiocad first")


def test_labels_follow_segment_and_dominance_rules():
    a = load_angiocad()
    raw = pd.read_excel(RAW)
    assert len(a) == 377 and a.cad.equals(a[["lad", "lcx", "rca"]].max(axis=1))
    # patient 1: proximal LAD 100 %, everything else < 51 % -> LAD only
    assert a.loc[0, ["lad", "lcx", "rca"]].tolist() == [1, 0, 0]
    # a left-dominant patient whose only lesion is a stenotic PDA counts as LCX, not RCA
    pda_only = (raw["PDA"].astype(str).isin({"51-75", "76-90", "91-99", "100"})
                & (raw.dominance == "Left"))
    for i in raw.index[pda_only]:
        assert a.loc[i, "lcx"] == 1


def test_units_are_harmonised_to_z_alizadeh():
    a = load_angiocad()
    assert a.ef_tte.max() <= 80 and a.neut.median() > 30 and a.lymph.median() > 10   # % not fractions
    assert a.bun.median() < 25                                                          # urea -> BUN
    assert a.bmi.max() <= 70 and a.hb.max() <= 25                                       # implausible -> missing

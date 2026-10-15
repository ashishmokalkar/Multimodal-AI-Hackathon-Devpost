"""Screening-camp lists: CSV and Excel read into a header and rows."""
import base64
import io

import pytest
from openpyxl import Workbook

from api.sheet import SheetError, read_sheet


def b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def test_reads_csv_and_excel_the_same_way():
    csv_out = read_sheet("camp.csv", b64("Patient,Age,Diabetes\nP-01,68,Yes\n\nP-02,41,No\n".encode()))
    book = Workbook()
    for row in (["Patient", "Age", "Diabetes"], ["P-01", 68, "Yes"], ["P-02", 41.0, "No"]):
        book.active.append(row)
    buffer = io.BytesIO()
    book.save(buffer)
    xlsx_out = read_sheet("camp.xlsx", b64(buffer.getvalue()))
    assert csv_out == xlsx_out == {"columns": ["Patient", "Age", "Diabetes"],
                                   "rows": [["P-01", "68", "Yes"], ["P-02", "41", "No"]]}


def test_refuses_what_it_cannot_read():
    with pytest.raises(SheetError):
        read_sheet("notes.txt", b64(b"hello"))
    with pytest.raises(SheetError):
        read_sheet("camp.csv", b64(b"Patient,Age\n"))            # no patients
    with pytest.raises(SheetError):
        read_sheet("camp.xlsx", b64(b"not a workbook"))

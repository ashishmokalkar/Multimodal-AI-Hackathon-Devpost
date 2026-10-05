"""Download raw datasets into data/raw/ and verify their checksums.

Usage:
    python scripts/download_data.py            # download every dataset
    python scripts/download_data.py z_alizadeh_sani_ext
    python scripts/download_data.py --force    # re-download even if present

Raw files are never modified after download; cleaning happens in later
pipeline steps that write to data/interim/ and data/processed/.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"


@dataclass(frozen=True)
class Dataset:
    url: str
    zip_sha256: str
    # Member name inside the zip -> local filename under data/raw/<key>/
    files: dict[str, str]
    # Expected sha256 of each extracted local file
    file_sha256: dict[str, str]


DATASETS: dict[str, Dataset] = {
    # Primary hackathon dataset (UCI id 411): 303 patients, CAD + LAD/LCX/RCA labels.
    "z_alizadeh_sani_ext": Dataset(
        url="https://archive.ics.uci.edu/static/public/411/extention+of+z+alizadeh+sani+dataset.zip",
        zip_sha256="e97af1a18733d64fa88caa0628e5fe7ce6b2e26ec4c7ee03baade92a6f1470e8",
        files={"extention of Z-Alizadeh sani dataset.xlsx": "z_alizadeh_sani_ext.xlsx"},
        file_sha256={"z_alizadeh_sani_ext.xlsx": "739343245c2ba578b541370217531750d8e936022f928b83e0d91756caa3ff0b"},
    ),
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def download(key: str, ds: Dataset, force: bool) -> None:
    out_dir = RAW_DIR / key
    targets = [out_dir / name for name in ds.files.values()]
    if not force and all(p.exists() and sha256(p.read_bytes()) == ds.file_sha256[p.name] for p in targets):
        print(f"[{key}] already present and verified")
        return

    print(f"[{key}] downloading {ds.url}")
    resp = requests.get(ds.url, timeout=60)
    resp.raise_for_status()
    if sha256(resp.content) != ds.zip_sha256:
        sys.exit(f"[{key}] checksum mismatch for downloaded archive; upstream file may have changed")

    out_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        for member, local_name in ds.files.items():
            data = zf.read(member)
            if sha256(data) != ds.file_sha256[local_name]:
                sys.exit(f"[{key}] checksum mismatch for {member}")
            (out_dir / local_name).write_bytes(data)
            print(f"[{key}] wrote {(out_dir / local_name).relative_to(ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("datasets", nargs="*", help=f"datasets to fetch (default: all): {', '.join(DATASETS)}")
    parser.add_argument("--force", action="store_true", help="re-download even if files exist")
    args = parser.parse_args()

    unknown = set(args.datasets) - DATASETS.keys()
    if unknown:
        parser.error(f"unknown dataset(s): {', '.join(sorted(unknown))}")

    for key in args.datasets or DATASETS:
        download(key, DATASETS[key], args.force)


if __name__ == "__main__":
    main()

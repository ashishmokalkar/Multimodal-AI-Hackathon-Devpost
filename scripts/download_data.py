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
    # sha256 of the zip archive; "" means `url` is a per-file template with a {name} placeholder (no archive)
    zip_sha256: str
    # Member name inside the zip (or remote file name) -> local filename under data/raw/<key>/
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
    # External data (UCI id 45): raw 76-attribute files include per-vessel angiography columns.
    "uci_heart_disease": Dataset(
        url="https://archive.ics.uci.edu/static/public/45/heart+disease.zip",
        zip_sha256="b17cd273da9ce1caa4710fce80227ea454d4dbf9fcbc8e6a9121672751563adc",
        files={name: name for name in ["cleveland.data", "hungarian.data", "switzerland.data", "long-beach-va.data",
                                       "heart-disease.names", "WARNING"]},
        file_sha256={
            "cleveland.data": "9278214845d1cf45cdce6404038b232ce23dedaf801709650712f6d145d1b7b7",
            "hungarian.data": "b8e4bbd06b9bf9ec831c992ba397639f22815e525c43b489e1a6e75b3be29a75",
            "switzerland.data": "fe1618a50ec2fc99f57ec1ca3fa93bd1fcad93b9daf92d49704476e3a3e4d0b2",
            "long-beach-va.data": "16d44b28ccb139d07509ee17f22c51fcd568caea8beb607d1503e4a679133353",
            "heart-disease.names": "ec7ed5aa4ed8321097808f47b836301c2a0c36f3bb09c40b8b43b622363e6b61",
            "WARNING": "01ae7cb6ab43a387b206f7127ce81869639d9d3076d447c12d7df17ad583f954",
        },
    ),
    # External data (plan v2, E1-E3): AngioCAD, Isfahan 2025, 377 patients with segment-level stenosis grades.
    # Zenodo record 15826856, CC BY 4.0 (doi 10.1016/j.cmpb.2026.109368).
    "angiocad": Dataset(
        url="https://zenodo.org/records/15826856/files/{name}?download=1",
        zip_sha256="",
        files={"AngioCAD_Features.xlsx": "AngioCAD_Features.xlsx", "AngioCAD_Labels.xlsx": "AngioCAD_Labels.xlsx"},
        file_sha256={"AngioCAD_Features.xlsx": "978f2415ab52f11724e1ef00bb63597b8497487afd84b97f7112fc7975a33295",
                     "AngioCAD_Labels.xlsx": "5bba3f4ba8bed0df0d2f412d5e2ca6deacca0eff20d531a599fe1b8f4d897425"},
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

    out_dir.mkdir(parents=True, exist_ok=True)
    if not ds.zip_sha256:   # individual files, no archive
        for remote, local_name in ds.files.items():
            url = ds.url.format(name=remote)
            print(f"[{key}] downloading {url}")
            resp = requests.get(url, timeout=60)
            resp.raise_for_status()
            if sha256(resp.content) != ds.file_sha256[local_name]:
                sys.exit(f"[{key}] checksum mismatch for {remote}; upstream file may have changed")
            (out_dir / local_name).write_bytes(resp.content)
            print(f"[{key}] wrote {(out_dir / local_name).relative_to(ROOT)}")
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

#!/usr/bin/env python3
"""
Get the local data into the lakehouse (guide Step 5).

Two destinations, pick with ``--target``:

  ``volume``  → a Unity Catalog volume, via the Databricks SDK.  Free Edition path.
  ``adls``    → ADLS Gen2, via azure-identity + azure-storage-file-datalake.  💳 PAID path.

Both write the *same* layout, so nothing downstream cares which you used::

    <root>/landing/npci/{apps,remitter_banks,beneficiary_banks,summary}/*.csv
    <root>/landing/transactions/year=YYYY/month=MM/*.csv
    <root>/landing/status_updates/*.csv
    <root>/landing/settlement/*.txt
    <root>/landing/disputes/*.csv
    <root>/landing/dims/*.csv
    <root>/landing/stream_sample/*.jsonl

Examples::

    python scripts/upload_data.py --target volume --catalog upi_dev
    python scripts/upload_data.py --target volume --catalog upi_dev --only npci
    python scripts/upload_data.py --target adls --account upilake --container lake --env dev

The ``--only`` flag matters for filming: upload ``npci`` first, run the Auto Loader
demo on eight small files, *then* upload the 365 MB history and run it again to show
incremental discovery picking up only what's new.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DATA = REPO / "data"

# local directory  →  path under landing/
DATASETS = {
    "npci":          (DATA / "upi-raw-npci",                        "npci"),
    "dims":          (DATA / "upi-synthetic-data/dims",             "dims"),
    "transactions":  (DATA / "upi-synthetic-data/transactions",     "transactions"),
    "status_updates":(DATA / "upi-synthetic-data/status_updates",   "status_updates"),
    "settlement":    (DATA / "upi-synthetic-data/settlement",       "settlement"),
    "disputes":      (DATA / "upi-synthetic-data/disputes",         "disputes"),
    "stream_sample": (DATA / "upi-synthetic-data/stream_sample",    "stream_sample"),
    "contract":      (DATA / "upi-synthetic-data",                  "_contract"),  # yaml/json/README only
}

CONTRACT_FILES = {"data_contract.yaml", "calibration.json", "README.md", "fraud_seed_log.csv"}


def files_for(name: str) -> list[tuple[Path, str]]:
    """Return (local_path, relative_destination) pairs for one dataset."""
    src, dest_root = DATASETS[name]
    if not src.exists():
        raise SystemExit(f"missing {src} — unzip the data or run the generator first")

    out = []
    if name == "contract":
        for f in sorted(src.iterdir()):
            if f.is_file() and f.name in CONTRACT_FILES:
                out.append((f, f"{dest_root}/{f.name}"))
        return out

    for f in sorted(src.rglob("*")):
        if f.is_file() and not f.name.startswith("."):
            out.append((f, f"{dest_root}/{f.relative_to(src).as_posix()}"))
    return out


def upload_to_volume(pairs, catalog: str, schema: str, volume: str, dry_run: bool):
    from databricks.sdk import WorkspaceClient

    w = WorkspaceClient()          # reads ~/.databrickscfg or DATABRICKS_HOST/TOKEN
    base = f"/Volumes/{catalog}/{schema}/{volume}/landing"

    for i, (local, rel) in enumerate(pairs, 1):
        target = f"{base}/{rel}"
        if dry_run:
            print(f"  would upload {local.name} → {target}")
            continue
        with open(local, "rb") as fh:
            w.files.upload(target, fh, overwrite=True)
        if i % 25 == 0 or i == len(pairs):
            print(f"  {i}/{len(pairs)}")


def upload_to_adls(pairs, account: str, container: str, env: str, dry_run: bool):
    from azure.identity import DefaultAzureCredential
    from azure.storage.filedatalake import DataLakeServiceClient

    svc = DataLakeServiceClient(
        account_url=f"https://{account}.dfs.core.windows.net",
        credential=DefaultAzureCredential(),
    )
    fs = svc.get_file_system_client(container)
    base = f"{env}/landing"

    for i, (local, rel) in enumerate(pairs, 1):
        target = f"{base}/{rel}"
        if dry_run:
            print(f"  would upload {local.name} → abfss://{container}@{account}.../{target}")
            continue
        fc = fs.get_file_client(target)
        with open(local, "rb") as fh:
            fc.upload_data(fh, overwrite=True)
        if i % 25 == 0 or i == len(pairs):
            print(f"  {i}/{len(pairs)}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--target", choices=["volume", "adls"], default="volume")
    ap.add_argument("--only", nargs="*", choices=sorted(DATASETS), default=sorted(DATASETS),
                    help="upload just these datasets (default: all)")
    ap.add_argument("--dry-run", action="store_true")
    # volume target
    ap.add_argument("--catalog", default="upi_dev")
    ap.add_argument("--schema", default="bronze")
    ap.add_argument("--volume", default="landing")
    # adls target
    ap.add_argument("--account", default=os.getenv("ADLS_ACCOUNT", "upilake"))
    ap.add_argument("--container", default=os.getenv("ADLS_CONTAINER", "lake"))
    ap.add_argument("--env", default="dev")
    args = ap.parse_args()

    pairs = []
    for name in args.only:
        chunk = files_for(name)
        size = sum(p.stat().st_size for p, _ in chunk) / 1e6
        print(f"{name:15s} {len(chunk):4d} files  {size:8.1f} MB")
        pairs.extend(chunk)

    total = sum(p.stat().st_size for p, _ in pairs) / 1e6
    print(f"\n{len(pairs)} files, {total:.1f} MB → {args.target}")
    if args.dry_run:
        print("(dry run)\n")

    if args.target == "volume":
        upload_to_volume(pairs, args.catalog, args.schema, args.volume, args.dry_run)
    else:
        upload_to_adls(pairs, args.account, args.container, args.env, args.dry_run)

    print("done")


if __name__ == "__main__":
    sys.exit(main())

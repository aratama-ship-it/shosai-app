#!/usr/bin/env python3
"""Validate the product-independent show source and write inspectable evidence."""
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import sys
from showwright_core import inspect_core


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "romeo-juliet.showwright.json"
REPORT = HERE / "qa/core-checks.json"


def write(value):
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    write({"status": "running", "startedAt": datetime.now(timezone.utc).isoformat()})
    try:
        core = json.loads(SOURCE.read_text(encoding="utf-8"))
        report = inspect_core(core, SOURCE)
        report.update(
            checkedAt=datetime.now(timezone.utc).isoformat(),
            source=SOURCE.name,
            sha256=sha256(SOURCE.read_bytes()).hexdigest(),
            validator="showwright_core.py + showwright-core.schema.json",
            scope="Product-independent structure, provenance, references, governance and declared semantic constraints.",
        )
        write(report)
        if report["errors"]:
            print("\n".join(report["errors"]), file=sys.stderr)
            return 1
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0
    except Exception as error:
        write({"status": "fail", "checkedAt": datetime.now(timezone.utc).isoformat(), "error": str(error)})
        raise


if __name__ == "__main__":
    raise SystemExit(main())

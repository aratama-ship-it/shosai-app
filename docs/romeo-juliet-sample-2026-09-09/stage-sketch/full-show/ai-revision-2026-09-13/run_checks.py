#!/usr/bin/env python3
"""Read-only artifact checks plus isolated localhost browser checks; writes QA evidence."""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import re
import subprocess
import sys
from browser_check import runtime

HERE = Path(__file__).resolve().parent
REPORT = HERE / "qa/audit-checks.json"


def write(report):
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    report = {"status": "running", "startedAt": datetime.now(timezone.utc).isoformat(), "steps": []}
    write(report)
    try:
        node, env = runtime()
        commands = [
            ("core-validation", [sys.executable, "-B", "validate_showwright_core.py"]),
            ("reproducibility", [sys.executable, "build_revision.py", "--check"]),
            ("python-generator-regressions", [sys.executable, "-B", "-m", "unittest", "-v", "test_revision.py"]),
            ("python-core-regressions", [sys.executable, "-B", "-m", "unittest", "-v", "test_showwright_core.py"]),
            ("js-regressions", [node, "--test", "regression.test.cjs"]),
            ("native-structure", [node, "validate_revision.mjs"]),
            ("browser", [sys.executable, "browser_check.py"]),
            ("reproducibility-after-browser", [sys.executable, "build_revision.py", "--check"]),
        ]
        test_counts = {}
        for name, command in commands:
            result = subprocess.run(command, cwd=HERE, env=env, capture_output=True, text=True, timeout=180)
            report["steps"].append({"name": name, "exitCode": result.returncode,
                                    "output": result.stdout + result.stderr})
            write(report)
            print(f"{name}: {'PASS' if result.returncode == 0 else 'FAIL'}", flush=True)
            if result.returncode:
                raise RuntimeError(f"{name} failed; see step output")
            if "regressions" in name:
                patterns = [r"Ran (\d+) tests?", r"(?:#|ℹ) tests (\d+)"]
                output = result.stdout + result.stderr
                matches = [re.search(pattern, output) for pattern in patterns]
                count = next((int(match.group(1)) for match in matches if match), None)
                if count is None:
                    raise RuntimeError(f"{name} did not report a machine-readable test count")
                test_counts[name] = count
        structure = json.loads((HERE / "qa/structure-checks.json").read_text())
        browser = json.loads((HERE / "qa/browser-checks.json").read_text())
        core = json.loads((HERE / "qa/core-checks.json").read_text())
        if core["status"] != "pass" or structure["status"] != "pass" or browser["status"] != "pass":
            raise RuntimeError("Incomplete subordinate evidence")
        if structure["sha256"] != browser["revisedSha256"]:
            raise RuntimeError("Structure/browser JSON hashes differ")
        if structure["productFiles"] != browser["productFiles"]:
            raise RuntimeError("Product changed between structure/browser checks")
        report.update(status="pass", checkedAt=datetime.now(timezone.utc).isoformat(),
                      revisedSha256=structure["sha256"], counts=structure["counts"],
                      coreSha256=core["sha256"],
                      regressionTests={"bySuite": test_counts, "total": sum(test_counts.values())},
                      evidenceSha256={name: sha256((HERE / "qa" / name).read_bytes()).hexdigest()
                                      for name in ["core-checks.json", "structure-checks.json", "browser-checks.json"]})
        write(report)
        return 0
    except Exception as error:
        report.update(status="fail", checkedAt=datetime.now(timezone.utc).isoformat(), error=str(error))
        write(report)
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

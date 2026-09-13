"""Exercise the release command with isolated fake candidates, never user data."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "tools/check-beta-update-safety.py"


class BetaSafetyGateTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.candidate = self.root / "candidate"
        self.candidate.mkdir()
        (self.candidate / "stage.html").write_text("test fixture only", encoding="utf-8")
        self.evidence = self.root / "evidence.md"
        self.evidence.write_text("Synthetic test evidence; not a real beta verification.", encoding="utf-8")
        result = self.run_gate("--fingerprint")
        self.assertEqual(result.returncode, 0)
        self.record = {
            "candidate_sha256": result.stdout.strip(),
            "current_beta_reference": "synthetic beta fixture",
            "warning_presented": True,
            "checks": dict.fromkeys(("existing_features", "project_roundtrip", "audio_continuity",
                                     "storage_failure_safety", "update_and_rollback", "target_browsers"), True),
            "unresolved_risks": [],
            "evidence": [{"path": "evidence.md", "sha256": hashlib.sha256(self.evidence.read_bytes()).hexdigest()}],
        }
        self.review = self.root / "review.json"

    def run_gate(self, *args):
        result = subprocess.run([sys.executable, str(SCRIPT), "--candidate", str(self.candidate), *args],
                                capture_output=True, text=True)
        self.assertIn("ベータ更新の互換性警告", result.stderr)
        return result

    def check_record(self):
        self.review.write_text(json.dumps(self.record), encoding="utf-8")
        return self.run_gate("--review", str(self.review))

    def test_missing_review_stops(self):
        self.assertEqual(self.run_gate().returncode, 2)

    def test_complete_record_passes_with_warning(self):
        self.assertEqual(self.check_record().returncode, 0)

    def test_changed_or_added_candidate_stops(self):
        (self.candidate / "stage.html").write_text("music removed", encoding="utf-8")
        self.assertEqual(self.check_record().returncode, 2)
        (self.candidate / "stage.html").write_text("test fixture only", encoding="utf-8")
        (self.candidate / "worker.js").write_text("new worker", encoding="utf-8")
        self.assertEqual(self.check_record().returncode, 2)

    def test_incomplete_checks_or_warning_stop(self):
        for key in self.record["checks"]:
            with self.subTest(key=key):
                self.record["checks"][key] = False
                self.assertEqual(self.check_record().returncode, 2)
                self.record["checks"][key] = True
        self.record["warning_presented"] = False
        self.assertEqual(self.check_record().returncode, 2)

    def test_unresolved_risks_stop(self):
        self.record["unresolved_risks"] = ["audio compatibility unknown"]
        self.assertEqual(self.check_record().returncode, 2)

    def test_changed_missing_or_empty_evidence_stops(self):
        self.evidence.write_text("changed evidence", encoding="utf-8")
        self.assertEqual(self.check_record().returncode, 2)
        self.evidence.write_text("", encoding="utf-8")
        self.assertEqual(self.check_record().returncode, 2)
        self.record["evidence"][0]["path"] = "nonexistent.md"
        self.assertEqual(self.check_record().returncode, 2)

    def test_invalid_json_stops(self):
        self.review.write_text("{broken", encoding="utf-8")
        self.assertEqual(self.run_gate("--review", str(self.review)).returncode, 2)

    def test_symlink_candidate_stops(self):
        (self.candidate / "linked.txt").symlink_to(self.evidence)
        self.assertEqual(self.run_gate("--fingerprint").returncode, 2)


if __name__ == "__main__":
    unittest.main()

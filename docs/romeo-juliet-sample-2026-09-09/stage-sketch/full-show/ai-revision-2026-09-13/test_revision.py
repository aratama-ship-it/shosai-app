import json
import tarfile
import unittest
from unittest.mock import patch
import build_revision as build


class RevisionTests(unittest.TestCase):
    def test_field_audit_matches_documents(self):
        expected = build.field_changes(build.load(build.SOURCE), build.load(build.OUTPUT))
        self.assertEqual(build.load(build.HERE / "ai-field-changes.json")["changes"], expected)

    def test_id_based_order_and_value_changes(self):
        changes = build.field_changes([{"id": "a", "v": 1}, {"id": "b"}],
                                      [{"id": "b"}, {"id": "a", "v": 2}])
        self.assertEqual([item["path"] for item in changes], ["/by-id/a/v", "/order"])

    def test_json_pointer_escaping_and_null(self):
        self.assertEqual(build.field_changes({"a/b~": None}, {"a/b~": 0}),
                         [{"path": "/a~1b~0", "op": "replace", "before": None, "after": 0}])

    def test_add_remove_and_status_changes_are_explicit(self):
        changes = build.field_changes(
            {"id": "decision", "status": "ai-proposal", "obsolete": True},
            {"id": "decision", "status": "confirmed", "sourceRefs": ["owner"]},
        )
        self.assertEqual([item["op"] for item in changes], ["remove", "add", "replace"])
        self.assertEqual([item["path"] for item in changes],
                         ["/obsolete", "/sourceRefs", "/status"])

    def test_object_key_order_is_not_a_change(self):
        self.assertEqual(build.field_changes({"a": 1, "b": 2}, {"b": 2, "a": 1}), [])

    def test_scalar_list_order_is_semantic(self):
        self.assertEqual(build.field_changes(["a", "b"], ["b", "a"])[0]["path"], "")

    def test_duplicate_changed_ids_fail(self):
        with self.assertRaises(ValueError):
            build.field_changes([{"id": "a"}, {"id": "a"}], [{"id": "a"}])

    def test_template_missing_or_extra_values_fail(self):
        self.assertEqual(build.render_template("@@Q03@@", {"@@Q03@@": "ok"}), "ok")
        for template, values in [("@@MISSING@@", {}), ("no token", {"@@EXTRA@@": ""})]:
            with self.assertRaises(ValueError):
                build.render_template(template, values)

    def test_changed_source_hash_fails_before_writing(self):
        with patch.dict(build.EXPECTED_INPUTS, {build.SOURCE: "0" * 64}):
            with self.assertRaises(SystemExit):
                build.build(check=True)

    def test_sample_json_unchanged_by_refactor(self):
        with tarfile.open(build.HERE / "qa/pre-refactor-2026-09-13.tar.gz") as archive:
            member = next(item for item in archive.getmembers()
                          if item.name.split("/")[-1] == build.OUTPUT.name)
            generated = build.render_outputs()[build.OUTPUT].encode()
            self.assertEqual(archive.extractfile(member).read(), generated)


if __name__ == "__main__":
    unittest.main()

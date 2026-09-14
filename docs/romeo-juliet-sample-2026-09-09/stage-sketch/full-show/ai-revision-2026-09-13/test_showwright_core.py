from copy import deepcopy
import unittest
from showwright_core import HERE, inspect_core, load


SOURCE = HERE / "romeo-juliet.showwright.json"


class ShowwrightCoreTests(unittest.TestCase):
    def setUp(self):
        self.core = load(SOURCE)
        self.transition = self.core["transitions"][0]

    def errors(self, mutate):
        candidate = deepcopy(self.core)
        mutate(candidate)
        return inspect_core(candidate, SOURCE)["errors"]

    def assertRejected(self, mutate, needle):
        errors = self.errors(mutate)
        self.assertTrue(any(needle in item for item in errors), errors)

    def test_valid_core(self):
        self.assertEqual(inspect_core(self.core, SOURCE)["status"], "pass")

    def test_null_is_not_zero(self):
        self.assertRejected(
            lambda core: core["transitions"][0]["timing"]["duration"].update(value=0),
            "/timing/duration/value",
        )

    def test_three_technical_frames(self):
        self.assertRejected(lambda core: core["transitions"][0]["technicalFrames"].pop(),
                            "constraint-m6-frame-count")

    def test_bar_enters_in_middle_and_remains(self):
        self.assertRejected(
            lambda core: core["transitions"][0]["technicalFrames"][0]["assetStates"][0].update(state="onstage"),
            "constraint-m6-bar-sequence",
        )

    def test_exact_carrier_roles(self):
        self.assertRejected(lambda core: core["transitions"][0]["responsibleRoleIds"].pop(),
                            "constraint-m6-carriers")

    def test_mask_progression(self):
        self.assertRejected(lambda core: core["transitions"][0]["technicalFrames"][1]["maskedRoleIds"].pop(),
                            "constraint-m6-mask-progression")

    def test_all_roles_carry_masks_before_blackout(self):
        self.assertRejected(lambda core: core["transitions"][0]["preBlackoutCarriedRoleIds"].pop(),
                            "constraint-m6-preblackout-masks")

    def test_carriers_mask_only_after_bar_fix(self):
        self.assertRejected(
            lambda core: core["transitions"][0]["technicalFrames"][1]["maskedRoleIds"].append("FRIAR_JOHN"),
            "constraint-m6-carrier-mask-timing",
        )

    def test_five_relight_conditions(self):
        self.assertRejected(lambda core: core["transitions"][0]["relightConditions"].__setitem__(0, "別条件"),
                            "constraint-m6-relight-count")

    def test_manual_relight(self):
        self.assertRejected(lambda core: core["transitions"][0].update(relightMode="automatic"),
                            "constraint-m6-relight-mode")

    def test_delay_policy_and_record(self):
        self.assertRejected(lambda core: core["transitions"][0].update(delayPolicy="hold-current-state"),
                            "constraint-m6-delay-policy")
        self.assertRejected(lambda core: core["transitions"][0].update(delayRecordRequired=False),
                            "constraint-m6-delay-record")

    def test_role_and_lighting_are_not_duplicates(self):
        self.assertRejected(
            lambda core: core["scenes"][0]["lighting"].update(intent=core["scenes"][0]["dramaticRole"]),
            "constraint-role-light-duplicates",
        )

    def test_duplicate_and_dangling_ids(self):
        self.assertRejected(lambda core: core["roles"][1].update(id=core["roles"][0]["id"]),
                            "duplicate stable ids")
        self.assertRejected(lambda core: core["scenes"][0]["roleIds"].append("MISSING"),
                            "missing role MISSING")

    def test_adapter_fields_are_rejected(self):
        self.assertRejected(lambda core: core["assets"][0].update(propShape="counter"),
                            "unexpected property propShape")

    def test_confirmed_requires_owner_source(self):
        self.assertRejected(
            lambda core: core["decisions"][0].update(sourceRefs=["source-ai-proposal"]),
            "confirmed decision lacks owner source",
        )

    def test_production_approval_requires_validation(self):
        def mutate(core):
            core["decisions"][0]["governance"]["productionApproval"] = "approved"
        self.assertRejected(mutate, "production approval without real-stage validation")

    def test_file_provenance_hash_is_checked(self):
        self.assertRejected(
            lambda core: core["provenance"]["sources"][0].update(sha256="0" * 64),
            "source hash changed",
        )

    def test_owner_approval_identity_is_checked(self):
        report = inspect_core(self.core, SOURCE)
        self.assertFalse(any("owner approval:" in item for item in report["errors"]))

    def test_unsupported_constraint_cannot_silently_pass(self):
        def mutate(core):
            extra = deepcopy(core["constraints"][0])
            extra.update(id="constraint-unsupported", subjectIds=[core["scenes"][0]["id"]],
                         field="technicalFrames")
            core["constraints"].append(extra)
        self.assertRejected(mutate, "unsupported or unscoped assertions")


if __name__ == "__main__":
    unittest.main()

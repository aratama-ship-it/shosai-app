"""Product-independent AI showwright core validation."""
from __future__ import annotations

from hashlib import sha256
import json
import math
from pathlib import Path
import re


HERE = Path(__file__).resolve().parent
SCHEMA = HERE / "showwright-core.schema.json"
FORBIDDEN_ADAPTER_KEYS = {
    "u", "v", "propShape", "heldBy", "holdMode", "lightingIntent",
    "pieces", "route", "stageSketchKind", "stageSketchPropShape",
}


class CoreValidationError(ValueError):
    pass


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def _kind(value, expected):
    if expected == "null":
        return value is None
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
    return {
        "object": isinstance(value, dict),
        "array": isinstance(value, list),
        "string": isinstance(value, str),
    }.get(expected, False)


def _resolve(schema, root):
    ref = schema.get("$ref")
    if not ref:
        return schema
    if not ref.startswith("#/"):
        raise CoreValidationError(f"Unsupported schema reference: {ref}")
    current = root
    for part in ref[2:].split("/"):
        current = current[part.replace("~1", "/").replace("~0", "~")]
    return current


def schema_issues(value, schema, root=None, path="$"):
    """Validate the strict subset of JSON Schema used by our checked-in contract."""
    root = root or schema
    issues = []
    if "$ref" in schema:
        issues.extend(schema_issues(value, _resolve(schema, root), root, path))
        schema = {key: item for key, item in schema.items() if key != "$ref"}
    if "const" in schema and value != schema["const"]:
        issues.append(f"{path}: expected constant {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        issues.append(f"{path}: value {value!r} is outside enum")
    expected_type = schema.get("type")
    if expected_type is not None:
        allowed = expected_type if isinstance(expected_type, list) else [expected_type]
        if not any(_kind(value, item) for item in allowed):
            issues.append(f"{path}: expected type {allowed}, got {type(value).__name__}")
            return issues
    if "oneOf" in schema:
        matched = sum(not schema_issues(value, option, root, path) for option in schema["oneOf"])
        if matched != 1:
            issues.append(f"{path}: expected exactly one oneOf match, got {matched}")
    for clause in schema.get("allOf", []):
        issues.extend(schema_issues(value, clause, root, path))
    if "if" in schema and not schema_issues(value, schema["if"], root, path):
        issues.extend(schema_issues(value, schema.get("then", {}), root, path))
    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                issues.append(f"{path}: missing required property {key}")
        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for key in value.keys() - properties.keys():
                issues.append(f"{path}: unexpected property {key}")
        for key, child in value.items():
            if key in properties:
                issues.extend(schema_issues(child, properties[key], root, f"{path}/{key}"))
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            issues.append(f"{path}: fewer than {schema['minItems']} items")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            issues.append(f"{path}: more than {schema['maxItems']} items")
        if schema.get("uniqueItems"):
            encoded = [json.dumps(item, ensure_ascii=False, sort_keys=True) for item in value]
            if len(encoded) != len(set(encoded)):
                issues.append(f"{path}: items are not unique")
        if "items" in schema:
            for index, item in enumerate(value):
                issues.extend(schema_issues(item, schema["items"], root, f"{path}/{index}"))
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            issues.append(f"{path}: string is too short")
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            issues.append(f"{path}: string is too long")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            issues.append(f"{path}: string does not match {schema['pattern']}")
    if _kind(value, "number") and "minimum" in schema and value < schema["minimum"]:
        issues.append(f"{path}: number is below {schema['minimum']}")
    return issues


def _walk(value, path="$"):
    yield path, value
    if isinstance(value, dict):
        for key, child in value.items():
            yield from _walk(child, f"{path}/{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from _walk(child, f"{path}/{index}")


def _constraint_actual(core, transition, constraint):
    field = constraint["field"]
    if field == "technicalFrames":
        return transition["technicalFrames"]
    if field in {
        "responsibleRoleIds", "preBlackoutCarriedRoleIds", "relightConditions",
        "delayPolicy", "relightMode", "delayRecordRequired",
    }:
        return transition[field]
    if field == "technicalFrames.asset-rolling-bar.state":
        return [
            next(item["state"] for item in frame["assetStates"]
                 if item["assetId"] == "asset-rolling-bar")
            for frame in transition["technicalFrames"]
        ]
    if field == "maskProgressionBeforeFramesDestination":
        return [0] + [len(frame["maskedRoleIds"]) for frame in transition["technicalFrames"]] + [
            len(transition["destinationMaskedRoleIds"])
        ]
    if field == "responsibleRoleMaskCountsByFrame":
        responsible = set(transition["responsibleRoleIds"])
        return [len(responsible & set(frame["maskedRoleIds"]))
                for frame in transition["technicalFrames"]]
    if field == "timing.duration.value":
        return transition["timing"]["duration"]["value"]
    if field == "timing.transitionDeadline.value":
        return transition["timing"]["transitionDeadline"]["value"]
    if field == "dramaticRoleEqualsLightingIntent":
        return [
            scene["id"] for scene in core["scenes"]
            if scene["dramaticRole"].strip() == scene["lighting"]["intent"].strip()
        ]
    raise KeyError(f"unsupported constraint field: {field}")


def _constraint_passes(rule, actual, expected):
    if rule == "count-equals":
        return len(actual) == expected
    if rule == "set-equals":
        return set(actual) == set(expected) and len(actual) == len(expected)
    if rule == "equals":
        return actual == expected
    if rule == "is-null":
        return actual is None and expected is None
    if rule == "contains-all":
        return set(expected).issubset(actual)
    if rule == "precedes":
        return expected is True
    raise KeyError(f"unsupported constraint rule: {rule}")


def inspect_core(core, core_path: Path):
    schema = load(SCHEMA)
    errors = schema_issues(core, schema)
    warnings = []
    provenance_checks = []
    constraint_results = []
    source_ids = [item["id"] for item in core.get("provenance", {}).get("sources", [])]
    if len(source_ids) != len(set(source_ids)):
        errors.append("provenance: duplicate source ids")
    sources = {item["id"]: item for item in core.get("provenance", {}).get("sources", [])}

    collections = ["sections", "scenes", "cast", "roles", "assets", "transitions", "decisions", "constraints"]
    entities = []
    for name in collections:
        for item in core.get(name, []):
            entities.append((name, item.get("id")))
    evaluated_constraints = set()
    for transition in core.get("transitions", []):
        entities.extend(("technicalFrames", item.get("id")) for item in transition.get("technicalFrames", []))
    entity_ids = [item[1] for item in entities if item[1]]
    duplicates = sorted({item for item in entity_ids if entity_ids.count(item) > 1})
    if duplicates:
        errors.append(f"entities: duplicate stable ids {duplicates}")
    entity_set = set(entity_ids)
    indexes = {name: {item["id"]: item for item in core.get(name, [])} for name in collections}

    for source in sources.values():
        source_path = source["path"]
        if "://" not in source_path:
            target = (core_path.parent / source_path).resolve()
            if not source.get("sha256"):
                errors.append(f"{source['id']}: local file source has no sha256")
                provenance_checks.append({"sourceId": source["id"], "status": "fail", "reason": "missing sha256"})
            elif not target.is_file():
                errors.append(f"{source['id']}: source file not found")
                provenance_checks.append({"sourceId": source["id"], "status": "fail", "reason": "file not found"})
            else:
                actual_hash = digest(target)
                passed = actual_hash == source["sha256"]
                provenance_checks.append({"sourceId": source["id"], "status": "pass" if passed else "fail",
                                          "expectedSha256": source["sha256"], "actualSha256": actual_hash})
                if not passed:
                    errors.append(f"{source['id']}: source hash changed")
        else:
            provenance_checks.append({"sourceId": source["id"], "status": "referenced",
                                      "locator": source.get("locator", "")})

    for section in core.get("sections", []):
        for scene_id in section["sceneIds"]:
            if scene_id not in indexes["scenes"]:
                errors.append(f"{section['id']}: missing scene {scene_id}")
    section_members = [item for section in core.get("sections", []) for item in section["sceneIds"]]
    if sorted(section_members) != sorted(indexes["scenes"]):
        errors.append("sections: scenes must appear exactly once")
    for scene in core.get("scenes", []):
        if scene["sectionId"] not in indexes["sections"]:
            errors.append(f"{scene['id']}: missing section {scene['sectionId']}")
        if scene["id"] not in indexes["sections"].get(scene["sectionId"], {}).get("sceneIds", []):
            errors.append(f"{scene['id']}: absent from its section")
        for role_id in scene["roleIds"]:
            if role_id not in indexes["roles"]:
                errors.append(f"{scene['id']}: missing role {role_id}")
        for cast_id in scene.get("castIds", []):
            if cast_id not in indexes["cast"]:
                errors.append(f"{scene['id']}: missing cast member {cast_id}")
        for asset_id in scene["assetIds"]:
            if asset_id not in indexes["assets"]:
                errors.append(f"{scene['id']}: missing asset {asset_id}")
    for member in core.get("cast", []):
        for role_id in member["roleIds"]:
            if role_id not in indexes["roles"]:
                errors.append(f"{member['id']}: missing role {role_id}")

    for transition in core.get("transitions", []):
        for key in ("fromSceneId", "toSceneId"):
            if transition[key] not in indexes["scenes"]:
                errors.append(f"{transition['id']}: missing {key} {transition[key]}")
        for key in ("responsibleRoleIds", "preBlackoutCarriedRoleIds", "destinationMaskedRoleIds"):
            for role_id in transition.get(key, []):
                if role_id not in indexes["roles"]:
                    errors.append(f"{transition['id']}: missing role {role_id}")
        for frame in transition.get("technicalFrames", []):
            for role_id in frame["maskedRoleIds"]:
                if role_id not in indexes["roles"]:
                    errors.append(f"{frame['id']}: missing masked role {role_id}")
            for state in frame["assetStates"]:
                if state["assetId"] not in indexes["assets"]:
                    errors.append(f"{frame['id']}: missing asset {state['assetId']}")

    for path, value in _walk(core):
        if isinstance(value, dict):
            forbidden = sorted(value.keys() & FORBIDDEN_ADAPTER_KEYS)
            if forbidden:
                errors.append(f"{path}: adapter fields in core {forbidden}")
            for key, allowed in (("sourceRefs", sources), ("decisionIds", indexes["decisions"])):
                for reference in value.get(key, []):
                    if reference not in allowed:
                        errors.append(f"{path}/{key}: missing reference {reference}")
            for reference in value.get("subjectIds", []):
                if reference not in entity_set:
                    errors.append(f"{path}/subjectIds: missing entity {reference}")

    for decision in core.get("decisions", []):
        gov = decision["governance"]
        if decision["status"] == "confirmed":
            if gov["sampleAdoption"] != "adopted":
                errors.append(f"{decision['id']}: confirmed decision is not sample-adopted")
            if not any(sources[ref]["kind"] == "owner-statement" for ref in decision["sourceRefs"]):
                errors.append(f"{decision['id']}: confirmed decision lacks owner source")
        if decision["status"] == "ai-proposal" and gov["authorship"] not in {"ai", "mixed"}:
            errors.append(f"{decision['id']}: AI proposal has incompatible authorship")
        if gov["productionApproval"] == "approved" and gov["realStageValidation"] != "validated":
            errors.append(f"{decision['id']}: production approval without real-stage validation")
        if decision["status"] != "confirmed":
            warnings.append(f"{decision['id']}: {decision['status']}")

    for transition in core.get("transitions", []):
        constraints = [item for item in core.get("constraints", []) if transition["id"] in item["subjectIds"]]
        for constraint in constraints:
            try:
                actual = _constraint_actual(core, transition, constraint)
                passed = _constraint_passes(constraint["rule"], actual, constraint["expected"])
                evaluated_constraints.add(constraint["id"])
                reported_actual = len(actual) if constraint["rule"] == "count-equals" else actual
                constraint_results.append({"id": constraint["id"], "status": "pass" if passed else "fail",
                                           "severity": constraint["severity"],
                                           "expected": constraint["expected"], "actual": reported_actual})
            except (KeyError, StopIteration) as error:
                errors.append(f"{constraint['id']}: {error}")
                continue
            if not passed:
                message = f"{constraint['id']}: expected {constraint['expected']!r}, got {actual!r}"
                (errors if constraint["severity"] == "error" else warnings).append(message)
    global_constraints = [
        item for item in core.get("constraints", [])
        if item["field"] == "dramaticRoleEqualsLightingIntent"
    ]
    for constraint in global_constraints:
        actual = _constraint_actual(core, None, constraint)
        evaluated_constraints.add(constraint["id"])
        passed = _constraint_passes(constraint["rule"], actual, constraint["expected"])
        reported_actual = len(actual) if constraint["rule"] == "count-equals" else actual
        constraint_results.append({"id": constraint["id"], "status": "pass" if passed else "fail",
                                   "severity": constraint["severity"],
                                   "expected": constraint["expected"], "actual": reported_actual})
        if not passed:
            errors.append(f"{constraint['id']}: duplicate scene ids {actual}")
    unsupported = sorted(set(indexes["constraints"]) - evaluated_constraints)
    if unsupported:
        errors.append(f"constraints: unsupported or unscoped assertions {unsupported}")

    approval_source = sources.get("source-owner-approval")
    if approval_source and "://" not in approval_source["path"]:
        approval = load((core_path.parent / approval_source["path"]).resolve())
        choices = {item.get("id"): item.get("choice") for item in approval.get("decisions", [])}
        if approval.get("status") != "owner_approved_for_sample":
            errors.append("owner approval: wrong status")
        if choices != {"M6-C1": "A", "M6-C2": "A", "M6-C3": "A"}:
            errors.append(f"owner approval: unexpected decisions {choices}")
        effect = approval.get("effect", {})
        expected_effect = {
            "sampleConfigurationApproved": True,
            "productImplementationApproved": False,
            "realStageValidationCompleted": False,
            "productionUseApproved": False,
        }
        if effect != expected_effect:
            errors.append(f"owner approval: unexpected effect {effect}")

    return {
        "status": "pass" if not errors else "fail",
        "schemaVersion": core.get("schemaVersion"),
        "schemaIssues": [item for item in errors if item.startswith("$")],
        "errors": errors,
        "warnings": warnings,
        "provenanceChecks": provenance_checks,
        "decisionLedger": [
            {"id": item["id"], "status": item["status"], "text": item["text"],
             "governance": item["governance"], "sourceRefs": item["sourceRefs"]}
            for item in core.get("decisions", [])
        ],
        "constraintResults": constraint_results,
        "counts": {
            "sections": len(core.get("sections", [])),
            "scenes": len(core.get("scenes", [])),
            "cast": len(core.get("cast", [])),
            "roles": len(core.get("roles", [])),
            "assets": len(core.get("assets", [])),
            "transitions": len(core.get("transitions", [])),
            "technicalFrames": sum(len(item.get("technicalFrames", [])) for item in core.get("transitions", [])),
            "decisions": len(core.get("decisions", [])),
            "constraints": len(core.get("constraints", [])),
            "constraintsPassed": len(evaluated_constraints),
            "confirmedDecisions": sum(item.get("status") == "confirmed" for item in core.get("decisions", [])),
            "aiProposals": sum(item.get("status") == "ai-proposal" for item in core.get("decisions", [])),
            "unconfirmedDecisions": sum(item.get("status") == "unconfirmed" for item in core.get("decisions", [])),
        },
    }


def validate_core(core, core_path: Path):
    report = inspect_core(core, core_path)
    if report["errors"]:
        raise CoreValidationError("\n".join(report["errors"]))
    return report

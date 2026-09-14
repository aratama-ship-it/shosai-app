#!/usr/bin/env python3
"""Build the isolated AI showwright for StageSketch revision."""

from __future__ import annotations

from copy import deepcopy
from hashlib import sha256
from html import escape
import json
from pathlib import Path
import re
import sys
from showwright_core import validate_core


HERE = Path(__file__).resolve().parent
FULL_SHOW = HERE.parent
M6 = FULL_SHOW / "m6-transition-candidate"
REPO = HERE.parents[4]
SOURCE = FULL_SHOW / "romeo-juliet-full-show.stage-sketch.json"
AI_INPUT = M6 / "ai-input.json"
AI_PROPOSAL = M6 / "ai-proposal.json"
OWNER_APPROVAL = M6 / "owner-approval-2026-09-12.json"
OUTPUT = HERE / "romeo-juliet-full-show-ai-revised.stage-sketch.json"
MANIFEST = HERE / "ai-change-manifest.json"
TEMPLATE = HERE / "index.template.html"
INDEX = HERE / "index.html"
CORE_SOURCE = HERE / "romeo-juliet.showwright.json"

EXPECTED_SOURCE_SHA256 = "7086d75a843a0ea7253d3dd630defe994cf491432aabcc19e7774d5000a5d780"
EXPECTED_INPUTS = {
    SOURCE: EXPECTED_SOURCE_SHA256,
    AI_INPUT: "8d566e2c1abe30edeb6a2aeae9df0d4cd10259c30eb5e00418345c620d04ec39",
    AI_PROPOSAL: "4f08d32c113e5a37796ef7bcf9d1265464a509a9808518554989824d41100364",
    OWNER_APPROVAL: "cb81b4f5ef0c4667f95de020e7252efc4196fe023d80d05008416de71aed8334",
}
SYSTEM_NAME = "AI showwright for StageSketch"
FROM_ID = "rj-frame-rj-cond-01-b-02"
TO_ID = "rj-frame-rj-cond-01-c-01"
BAR_ID = "rj-set-bar"
SHELF_ID = "rj-set-bar-shelf"
BAR_DIMS = {"w": 2.4, "d": 0.6, "h": 1.1}


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def field_changes(before, after, path=""):
    """ID-addressed audit, not JSON Patch. Preserve array order separately."""
    if before == after:
        return []
    if isinstance(before, dict) and isinstance(after, dict):
        changes = []
        for key in sorted(before.keys() | after.keys()):
            child = path + "/" + key.replace("~", "~0").replace("/", "~1")
            if key not in before:
                changes.append({"path": child, "op": "add", "after": after[key]})
            elif key not in after:
                changes.append({"path": child, "op": "remove", "before": before[key]})
            else:
                changes.extend(field_changes(before[key], after[key], child))
        return changes
    if isinstance(before, list) and isinstance(after, list) and all(
        isinstance(item, dict) and isinstance(item.get("id"), str) for item in before + after
    ):
        left, right = ({item["id"]: item for item in values} for values in (before, after))
        if len(left) != len(before) or len(right) != len(after):
            raise ValueError("Duplicate ids in " + path)
        changes = field_changes(left, right, path + "/by-id")
        if list(left) != list(right):
            changes.append({"path": path + "/order", "op": "replace", "before": list(left), "after": list(right)})
        return changes
    return [{"path": path, "op": "replace", "before": before, "after": after}]


def render_template(template: str, values: dict) -> str:
    tokens = set(re.findall(r"@@[A-Z0-9_]+@@", template))
    if tokens != set(values):
        raise ValueError(f"Template tokens differ: {tokens ^ set(values)}")
    return re.sub(r"@@[A-Z0-9_]+@@", lambda match: values[match[0]], template)


def slug(role: str) -> str:
    return role.lower().replace("_", "-")


def people_by_role(scene: dict) -> dict[str, dict]:
    return {
        piece["originId"]: piece
        for piece in scene.get("pieces", [])
        if piece.get("type") == "performer"
    }


def pieces_by_set(scene: dict) -> dict[str, dict]:
    return {
        piece["setId"]: piece
        for piece in scene.get("pieces", [])
        if piece.get("setId")
    }


def set_bar_shape(document: dict, dims: dict[str, float]) -> None:
    project = document["project"]
    project["sets"] = [item for item in project["sets"] if item["id"] != SHELF_ID]
    bar_asset = next(item for item in project["sets"] if item["id"] == BAR_ID)
    bar_asset.update({
        "name": "キャスター付き一体型バー",
        "kind": "prop",
        "propShape": "counter",
        "dims": deepcopy(dims),
        "note": "Stage Sketch既存のcounter形状へ型割当を修正。寸法はcounter既定値であり実測値・搬入可否・安全性を示さない。",
        "estimated": True,
        "confidence": "unverified",
        "sourceNote": "元生成物のblock 10.08m指定を、現行Stage Sketchのcounter 2.4×0.6×1.1mへ修正。背面棚は移動バーと別物のため本案では置かない。",
    })
    for scene in project["scenes"]:
        if scene.get("kind") != "scene":
            continue
        scene["pieces"] = [piece for piece in scene.get("pieces", []) if piece.get("setId") != SHELF_ID]
        for piece in scene["pieces"]:
            if piece.get("setId") == BAR_ID:
                piece.update({
                    "type": "prop",
                    "propShape": "counter",
                    "name": "キャスター付き一体型バー",
                    "dims": deepcopy(dims),
                })


def mask_for(scene_id: str, holder: dict, template: dict, worn: bool) -> dict:
    mask = deepcopy(template)
    mask["id"] = f"{scene_id}-{mask['setId']}"
    mask["u"] = holder["u"]
    mask["v"] = holder["v"]
    mask["heldBy"] = holder["id"]
    mask["holdMode"] = "face" if worn else "hand"
    mask["holdSide"] = "R"
    mask["route"] = None
    return mask


def transition_lighting(frame_id: str) -> dict:
    return {
        "version": 1,
        "objective": "客席に何も見せないブラックアウトを維持し、転換工程を技術確認図として記録する。",
        "audienceFocus": "客席へ見せない暗転中の技術確認図。",
        "layers": {
            "performer": {"intent": "conceal", "note": "暗転を維持し、人物移動と仮面装着を客席から隠す。"},
            "background": {"intent": "conceal", "note": "バー搬入を客席から隠す。"},
            "space": {"intent": "conceal", "note": "通路と固定状態は舞台監督が手動確認する。"},
        },
        "transition": {
            "triggerType": "manual",
            "triggerNote": "バー固定・通路クリア・10人の位置・全員の仮面・照明準備を舞台監督が手動確認。自動GOなし。",
            "change": "hold",
            "tempo": "hold",
        },
        "mood": "",
        "referenceNote": f"M6-SAMPLE-A / {frame_id}",
        "implementationNote": "技術確認図。実物・稽古・搬入・安全の承認ではない。",
        "safetyStatus": "not-assessed",
        "sourceRefs": [{"kind": "user", "label": "M6本人確定条件", "locator": "owner-approval-2026-09-12.json"}],
    }


def build_transition_scene(frame: dict, q02: dict, q03: dict, mask_templates: dict[str, dict],
                           carriers: tuple[str, str]) -> dict:
    scene = deepcopy(q03)
    scene.update({
        "id": frame["id"],
        "title": frame["title"],
        "note": frame["note"],
        "pieces": [],
        "notes": [],
        "strokes": [],
        "arrows": [],
        "studyBeatId": None,
        "beat": {"role": frame["role"], "energy": None},
        "rehearsal": {"holdDurationSeconds": None, "transitionToNextSeconds": None},
        "lightingIntent": transition_lighting(frame["id"]),
        "cueSeconds": None,
        "audioTrackId": None,
        "blackout": True,
    })

    starts = people_by_role(q02)
    goals = people_by_role(q03)
    for role, start in starts.items():
        goal = goals[role]
        person = deepcopy(goal)
        person["id"] = f"{frame['id']}-{slug(role)}"
        person["u"] = round(start["u"] + (goal["u"] - start["u"]) * frame["progress"], 4)
        person["v"] = round(start["v"] + (goal["v"] - start["v"]) * frame["progress"], 4)
        person["pose"] = "walk"
        person["route"] = None
        if role in frame["carrierPositions"]:
            person.update(frame["carrierPositions"][role])
            person["name"] = "運搬担当（ロレンス担当）" if role == carriers[0] else "運搬担当（ジョン担当）"
        scene["pieces"].append(person)

    people = people_by_role(scene)
    if frame.get("bar"):
        bar = deepcopy(pieces_by_set(q03)[BAR_ID])
        bar["id"] = f"{frame['id']}-{BAR_ID}"
        bar["u"] = frame["bar"]["u"]
        bar["v"] = frame["bar"]["v"]
        bar["route"] = None
        if frame["bar"]["u"] != frame["bar"]["targetU"]:
            bar["route"] = {
                "u": frame["bar"]["targetU"],
                "v": frame["bar"]["targetV"],
                "bu": 0.70,
                "bv": 0.10,
            }
        scene["pieces"].append(bar)

    worn_roles = set(frame["maskRoles"])
    for role, holder in people.items():
        scene["pieces"].append(mask_for(scene["id"], holder, mask_templates[role], role in worn_roles))
    return scene


def render_sources(manifest: dict) -> str:
    labels = {
        "showwrightCore": "ショーライター内部形式",
        "sourceNative": "元ファイル",
        "aiInput": "AI入力",
        "aiProposal": "AI提案",
        "ownerApproval": "本人承認記録",
    }
    hrefs = {
        "showwrightCore": "romeo-juliet.showwright.json",
        "sourceNative": "../romeo-juliet-full-show.stage-sketch.json",
        "aiInput": "../m6-transition-candidate/ai-input.json",
        "aiProposal": "../m6-transition-candidate/ai-proposal.json",
        "ownerApproval": "../m6-transition-candidate/owner-approval-2026-09-12.json",
    }
    rows = []
    for key in labels:
        rows.append(
            f'<li><a href="{hrefs[key]}">{labels[key]}</a><code>{manifest["sources"][key]["sha256"]}</code></li>'
        )
    rows.append('<li><a href="ai-change-manifest.json">AI変更台帳</a><code>生成物</code></li>')
    rows.append('<li><a href="showwright-core.schema.json">内部形式スキーマ</a><code>JSON Schema 2020-12 / v1.0.0</code></li>')
    rows.append('<li><a href="qa/core-checks.json">ショーライターコア検査</a><code>意味制約・判断状態・出典</code></li>')
    rows.append('<li><a href="ai-field-changes.json">変更項目の前後をすべて確認</a><code>元JSONとのID単位差分</code></li>')
    rows.append('<li><a href="qa/audit-checks.json">今回の一周点検</a><code>再生成・回帰検査</code></li>')
    rows.append('<li><a href="qa/structure-checks.json">構造検査結果</a><code>実行後生成</code></li>')
    rows.append('<li><a href="qa/browser-checks.json">ブラウザ読込試験</a><code>実行後生成</code></li>')
    return "\n".join(rows)


def render_items(items: list[str]) -> str:
    return "\n".join(f"<li>{escape(item)}</li>" for item in items)


def render_outputs() -> dict[Path, str]:
    for path, expected in EXPECTED_INPUTS.items():
        if digest(path) != expected:
            raise SystemExit(f"Input hash changed: {path.name}. Re-review before rebuilding.")

    document = load(SOURCE)
    original_document = deepcopy(document)
    core = load(CORE_SOURCE)
    validate_core(core, CORE_SOURCE)
    core_scenes = {scene["id"]: scene for scene in core["scenes"]}
    core_transition = next(
        item for item in core["transitions"]
        if item["fromSceneId"] == FROM_ID and item["toSceneId"] == TO_ID
    )
    core_frames = {item["id"]: item for item in core_transition["technicalFrames"]}
    carriers = tuple(core_transition["responsibleRoleIds"])
    if len(carriers) != 2:
        raise SystemExit("M6 core must have exactly two bar carriers.")
    proposal = load(AI_PROPOSAL)
    if [item["id"] for item in proposal["frames"]] != [
        item["id"] for item in core_transition["technicalFrames"]
    ]:
        raise SystemExit("M6 proposal/core technical-frame order differs.")
    approval = load(OWNER_APPROVAL)
    if approval.get("status") != "owner_approved_for_sample":
        raise SystemExit("Owner approval is not valid for the sample.")
    choices = {item.get("id"): item.get("choice") for item in approval.get("decisions", [])}
    if choices != {"M6-C1": "A", "M6-C2": "A", "M6-C3": "A"}:
        raise SystemExit("Expected the identified M6-C1/C2/C3 A/A/A owner decisions.")
    expected_effect = {
        "sampleConfigurationApproved": True,
        "productImplementationApproved": False,
        "realStageValidationCompleted": False,
        "productionUseApproved": False,
    }
    if approval.get("effect") != expected_effect:
        raise SystemExit("Owner approval scope changed; re-review before rebuilding.")
    project = document["project"]
    original_project_id = project["id"]
    original_scene_count = sum(scene.get("kind") == "scene" for scene in project["scenes"])
    original_set_count = len(project["sets"])
    original_duplicate_count = sum(
        scene.get("kind") == "scene"
        and scene.get("beat", {}).get("role", "").strip()
        and scene.get("beat", {}).get("role", "").strip() == scene.get("lightingIntent", {}).get("objective", "").strip()
        for scene in project["scenes"]
    )

    project.update({
        "id": "romeo-juliet-full-show-ai-revised-2026-09-13",
        "title": "ロミオとジュリエット｜全編サンプル（AI showwright for StageSketch 改訂）",
        "versionLabel": "AI showwright for StageSketch 改訂 2026-09-13",
        "parentVersionId": original_project_id,
        "branchReason": "元ショーを上書きしない隔離AI改訂。M6本人確定条件、バーの型割当修正、照明意図の意味修正を反映。",
        "createdAt": "2026-09-13T00:00:00+09:00",
    })

    set_bar_shape(document, BAR_DIMS)
    scenes = project["scenes"]
    q02 = next(scene for scene in scenes if scene.get("id") == FROM_ID)
    q03 = next(scene for scene in scenes if scene.get("id") == TO_ID)

    # The approved bar carriers become anonymous bar staff at the Q03 destination.
    q03_people = people_by_role(q03)
    for role, position in proposal["barStaffPositions"].items():
        q03_people[role].update(position)
        q03_people[role]["name"] = "バー係（ロレンス担当）" if role == carriers[0] else "バー係（ジョン担当）"

    q03_sets = pieces_by_set(q03)
    mask_templates = {role: deepcopy(q03_sets[f"rj-mask-{slug(role)}"]) for role in q03_people}

    # All ten masks are explicitly carried before blackout. `hand` is the closest
    # Stage Sketch representation for carried; it does not assert literal hand use.
    q02_people = people_by_role(q02)
    for role, position in proposal["preBlackoutPositions"].items():
        q02_people[role].update(position)
        q02_people[role]["route"] = None
    for role, holder in q02_people.items():
        q02["pieces"].append(mask_for(q02["id"], holder, mask_templates[role], worn=False))

    q02["note"] = "【本人確定条件反映】10名は暗転前から仮面を携帯。ロレンス担当とジョン担当は右袖寄りへ準備し、暗転後に役を離れてバーを運ぶ。携帯表示のhandは模式表現で、実際の手の使い方は未確認。"
    q02["rehearsal"] = {"holdDurationSeconds": None, "transitionToNextSeconds": None}
    q02["lightingIntent"]["layers"]["performer"]["note"] = "挑発を合図に即暗転。舞台監督が5条件を手動確認して再照明を指示するまで暗転を維持する。"
    q02["lightingIntent"]["transition"] = {
        "triggerType": "manual",
        "triggerNote": "バー固定・通路クリア・10人の位置・全員の仮面・照明準備を手動確認。バーが遅れた場合は暗転維持、設置完了後に再照明し遅延を記録。",
        "change": "blackout",
        "tempo": "hold",
    }

    approved_frames = []
    roles = set(q03_people)
    for index, source_frame in enumerate(proposal["frames"]):
        frame = deepcopy(source_frame)
        semantic = core_frames.get(frame["id"])
        if not semantic:
            raise SystemExit(f"Core technical frame missing: {frame['id']}")
        frame.update({
            "title": semantic["title"],
            "maskRoles": semantic["maskedRoleIds"],
            "role": semantic["intent"],
            "note": semantic["notes"],
        })
        frame["bar"] = deepcopy(frame.get("bar"))
        if frame["bar"] and index == 1:
            frame["bar"]["u"] = 0.92
        if not set(frame["maskRoles"]).issubset(roles):
            raise SystemExit(f"Unknown mask role in {frame['id']}")
        approved_frames.append(build_transition_scene(frame, q02, q03, mask_templates, carriers))

    for current, following in zip(approved_frames, approved_frames[1:]):
        now = people_by_role(current)
        nxt = people_by_role(following)
        for role in carriers:
            now[role]["route"] = {
                "u": nxt[role]["u"],
                "v": nxt[role]["v"],
                "bu": round((now[role]["u"] + nxt[role]["u"]) / 2, 4),
                "bv": max(0.06, round(min(now[role]["v"], nxt[role]["v"]) - 0.03, 4)),
            }

    source_index = next(i for i, scene in enumerate(scenes) if scene.get("id") == FROM_ID)
    if scenes[source_index + 1].get("id") != TO_ID:
        raise SystemExit("Q02 and Q03 are no longer adjacent in the source.")
    project["scenes"] = scenes[: source_index + 1] + approved_frames + scenes[source_index + 1 :]

    q03["note"] = "【本人確定＋型割当修正】全員が仮面を着け、二名はバー固定後にバー係位置へ移る。バーはStage Sketch既存counter形状。既定寸法は実測値ではなく未確認。"
    q03["blackout"] = True

    missing_objectives = []
    for scene in project["scenes"]:
        if scene.get("kind") != "scene" or scene["id"] in {item["id"] for item in approved_frames}:
            continue
        objective = core_scenes.get(scene["id"], {}).get("lighting", {}).get("intent")
        if not objective:
            missing_objectives.append(scene["id"])
            continue
        scene["lightingIntent"]["objective"] = objective
    if missing_objectives:
        raise SystemExit(f"Lighting objective missing for: {missing_objectives}")

    output_text = json.dumps(document, ensure_ascii=False, indent=2) + "\n"
    output_sha = sha256(output_text.encode()).hexdigest()
    changes = field_changes(original_document, document)
    core_decisions = core["decisions"]
    confirmed = [item["text"] for item in core_decisions if item["status"] == "confirmed"]
    ai_proposals = [item["text"] for item in core_decisions if item["status"] == "ai-proposal"] + [
        "バーを現行Stage Sketchの既存counter形状へ割り当てる。2.4×0.6×1.1mはシステム既定値で実測値ではない。",
        "携帯中の仮面をStage Sketch上でholdMode=handと表示する。実際の手の使い方を確定しない。",
        "人物位置とバー搬入経路はStage Sketch用のAI配置案。",
    ]
    unconfirmed = [item["text"] for item in core_decisions if item["status"] == "unconfirmed"] + [
        "実会場の袖幅、搬入経路、バミリ、床条件、二名での取扱安全性。",
        "M6各工程の実行可能性と、仮面携帯・バー運搬時の実際の手の使い方。",
    ]

    manifest = {
        "kind": "stage-sketch-ai-change-manifest",
        "version": 1,
        "systemName": SYSTEM_NAME,
        "status": "isolated_ai_revision_with_owner_review_required",
        "generatedAt": "2026-09-13T00:00:00+09:00",
        "generatedAtPolicy": "deterministic artifact version timestamp; actual validation time is recorded in qa reports",
        "scope": "Romeo and Juliet full-show sample only; no production source changes",
        "sources": {
            "showwrightCore": {"path": CORE_SOURCE.name, "sha256": digest(CORE_SOURCE), "schemaVersion": core["schemaVersion"]},
            "sourceNative": {"path": "../romeo-juliet-full-show.stage-sketch.json", "sha256": digest(SOURCE)},
            "aiInput": {"path": "../m6-transition-candidate/ai-input.json", "sha256": digest(AI_INPUT)},
            "aiProposal": {"path": "../m6-transition-candidate/ai-proposal.json", "sha256": digest(AI_PROPOSAL)},
            "ownerApproval": {"path": "../m6-transition-candidate/owner-approval-2026-09-12.json", "sha256": digest(OWNER_APPROVAL)},
        },
        "output": {"path": OUTPUT.name, "sha256": output_sha},
        "compatibilityEvidence": {
            "policy": "Product hashes are recorded in QA reports, not pinned in deterministic generated artifacts.",
            "structureReport": "qa/structure-checks.json",
            "browserReport": "qa/browser-checks.json",
        },
        "counts": {
            "sourceScenes": original_scene_count,
            "revisedScenes": sum(scene.get("kind") == "scene" for scene in project["scenes"]),
            "insertedM6TechnicalScenes": 3,
            "sourceSets": original_set_count,
            "revisedSets": len(project["sets"]),
            "removedShelfAssets": 1,
            "sourceIdenticalRoleLightingObjectives": original_duplicate_count,
            "revisedIdenticalRoleLightingObjectives": 0,
            "coreScenes": len(core["scenes"]),
            "coreTransitions": len(core["transitions"]),
            "coreDecisions": len(core["decisions"]),
            "coreConstraints": len(core["constraints"]),
        },
        "confirmed": confirmed,
        "aiProposals": ai_proposals,
        "unconfirmed": unconfirmed,
        "changes": [
            {"path": "project.id/title/versionLabel/parentVersionId/branchReason", "reason": "元ショーと区別できる隔離改訂"},
            {"path": "project.sets[rj-set-bar]", "before": {"kind": "block", "dims": {"w": 10.08, "d": 0.65, "h": 1.0}}, "after": {"kind": "prop", "propShape": "counter", "dims": BAR_DIMS}, "reason": "元生成スクリプトの型・寸法指定を現行Stage Sketch既存形状へ修正"},
            {"path": "project.sets[rj-set-bar-shelf]", "before": "10.08m wall", "after": None, "reason": "移動バーと無条件に一体運用しない"},
            {"path": "Q02→Q03", "after": "暗転中技術確認図3枚、10枚の仮面状態、右袖からのバー搬入、手動再照明条件"},
            {"path": "Q02.rehearsal + inserted M6 rehearsal", "after": {"holdDurationSeconds": None, "transitionToNextSeconds": None}},
            {"path": "all scene lightingIntent.objective", "after": "照明が何を見せるかを記述し、beat.roleとの同文重複を解消"},
        ],
        "barDisplayCorrection": {
            "classification": "source-generator mapping correction",
            "ownerShapeDecisionRequired": False,
            "stageSketchKind": "prop",
            "stageSketchPropShape": "counter",
            "systemDefaultDims": BAR_DIMS,
            "actualDimensionsConfirmed": False,
        },
        "approvalEvidence": approval,
        "coreValidation": {"path": "qa/core-checks.json", "schema": "showwright-core.schema.json"},
        "fieldChanges": {"path": "ai-field-changes.json", "count": len(changes), "format": "ID-addressed audit; by-id and order are audit paths, not JSON Patch"},
    }

    template = TEMPLATE.read_text(encoding="utf-8")
    html = render_template(template, {
        "@@SOURCE_ROWS@@": render_sources(manifest),
        "@@OUTPUT_SHA@@": output_sha,
        "@@SCENES@@": str(manifest["counts"]["revisedScenes"]),
        "@@SETS@@": str(len(project["sets"])),
        "@@Q03_ROLE@@": escape(q03["beat"]["role"]),
        "@@Q03_LIGHT@@": escape(q03["lightingIntent"]["objective"]),
        "@@CORE_SCENES@@": str(len(core["scenes"])),
        "@@CORE_TRANSITIONS@@": str(len(core["transitions"])),
        "@@CORE_DECISIONS@@": str(len(core["decisions"])),
        "@@CORE_CONSTRAINTS@@": str(len(core["constraints"])),
        "@@CONFIRMED_ITEMS@@": render_items(confirmed),
        "@@AI_PROPOSAL_ITEMS@@": render_items(ai_proposals),
        "@@UNCONFIRMED_ITEMS@@": render_items(unconfirmed),
    })
    outputs = {
        OUTPUT: output_text,
        MANIFEST: json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        HERE / "ai-field-changes.json": json.dumps({"sourceSha256": EXPECTED_SOURCE_SHA256, "outputSha256": output_sha, "changes": changes}, ensure_ascii=False, indent=2) + "\n",
        INDEX: html,
    }
    return outputs


def build(check=False) -> None:
    outputs = render_outputs()
    if check:
        stale = [path.name for path, content in outputs.items() if not path.exists() or path.read_text(encoding="utf-8") != content]
        if stale:
            raise SystemExit("Generated files differ: " + ", ".join(stale))
        print("PASS: all 4 generated files reproduce byte-for-byte")
        return
    for path, content in outputs.items():
        path.write_text(content, encoding="utf-8")
    output_sha = sha256(outputs[OUTPUT].encode()).hexdigest()
    print(f"wrote {OUTPUT.relative_to(REPO)}")
    print(f"sha256 {output_sha}")
    print(f"wrote {MANIFEST.relative_to(REPO)}")
    print(f"wrote {INDEX.relative_to(REPO)}")


if __name__ == "__main__":
    build(check="--check" in sys.argv)

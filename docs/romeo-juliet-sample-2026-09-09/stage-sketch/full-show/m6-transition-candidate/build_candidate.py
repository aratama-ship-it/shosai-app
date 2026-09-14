"""Build an isolated Stage Sketch v3 candidate from the M6 owner decisions and AI proposal."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / "romeo-juliet-full-show.stage-sketch.json"
INPUT = HERE / "ai-input.json"
PROPOSAL = HERE / "ai-proposal.json"
APPROVAL = HERE / "owner-approval-2026-09-12.json"
OUTPUT = HERE / "romeo-juliet-m6-transition-candidate.stage-sketch.json"
MANIFEST = HERE / "candidate-manifest.json"
TEMPLATE = HERE / "index.template.html"
PAGE = HERE / "index.html"

FROM_ID = "rj-frame-rj-cond-01-b-02"
TO_ID = "rj-frame-rj-cond-01-c-01"
BAR_ID = "rj-set-bar"
SHELF_ID = "rj-set-bar-shelf"
CARRIERS = ("FRIAR_LAWRENCE", "FRIAR_JOHN")


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def slug(role):
    return role.lower().replace("_", "-")


def clamp(value):
    return round(max(0, min(1, value)), 4)


source = read(SOURCE)
ai_input = read(INPUT)
proposal = read(PROPOSAL)
approval = read(APPROVAL)

assert sha(SOURCE) == ai_input["source"]["nativeSha256"] == proposal["sourceNativeSha256"]
assert proposal["status"] == "ai_proposal_not_adopted"
assert tuple(proposal["carrierRoles"]) == CARRIERS
assert approval["status"] == "owner_approved_for_sample"
assert [item["id"] for item in approval["decisions"]] == ["M6-C1", "M6-C2", "M6-C3"]
assert all(item["choice"] == "A" for item in approval["decisions"])

candidate = deepcopy(source)
project = candidate["project"]
project["id"] = "romeo-juliet-m6-transition-candidate"
project["title"] = "ロミオとジュリエット｜M6転換（サンプル採用）"
project["versionLabel"] = "M6転換・サンプル採用"
project["branchReason"] = (
    "本人判断12件を土台に、Q02→Q03の暗転転換へ技術確認図3枚を加えた隔離サンプル。"
    "配置・仮面順・3枚構成は本人がサンプルとして採用。実物・稽古・安全は未確認。"
)
project["createdAt"] = "2026-09-12T00:00:00+09:00"
project["activeSceneId"] = FROM_ID

scene_by_id = {scene["id"]: scene for scene in project["scenes"]}
q02 = scene_by_id[FROM_ID]
q03 = scene_by_id[TO_ID]


def performer_by_role(scene):
    return {
        piece["originId"]: piece
        for piece in scene["pieces"]
        if piece["type"] == "performer"
    }


def piece_by_set(scene):
    return {
        piece["setId"]: piece
        for piece in scene["pieces"]
        if piece.get("setId")
    }


q02_people = performer_by_role(q02)
q03_people = performer_by_role(q03)
q03_sets = piece_by_set(q03)

# Owner asked to pre-position the two carrier slots near audience-right wing.
for role, position in proposal["preBlackoutPositions"].items():
    q02_people[role]["u"] = position["u"]
    q02_people[role]["v"] = position["v"]
q02["note"] = (
    "【M6サンプル採用】挑発で暗転。ロレンス／ジョン担当は右袖寄りへ事前配置する。"
    "配置はサンプルとして本人採用。時間・実会場経路は未確認。"
)
q02["transitionNote"] = (
    "剣が触れる前に暗転。人物移動と仮面装着を段階的に始め、バーは最初でも最後でもない時点で右袖から搬入する。"
)
q02["rehearsal"] = {"holdDurationSeconds": None, "transitionToNextSeconds": None}

# The owner changed the destination: both carriers remain as bar staff.
for role, position in proposal["barStaffPositions"].items():
    person = q03_people[role]
    person["u"] = position["u"]
    person["v"] = position["v"]
    person["pose"] = "open"
    person["facing"] = 0
    person["name"] = (
        "バー係（ロレンス担当）" if role == "FRIAR_LAWRENCE"
        else "バー係（ジョン担当）"
    )
    mask = q03_sets["rj-mask-" + slug(role)]
    mask["u"] = position["u"]
    mask["v"] = position["v"]
    mask["heldBy"] = person["id"]
q03["blackout"] = False
q03["note"] = (
    "【M6サンプル採用】全員が仮面。ロレンス／ジョン担当はバー係として残る。"
    "配置はサンプルとして本人採用。舞台監督が5条件を手動確認後に再照明する。"
    "時間・実会場・安全は未確認。"
)
q03["transitionNote"] = (
    "バー固定、通路クリア、10人の改訂位置、全員の仮面、照明準備を舞台監督が手動確認する。"
    "未完了なら暗転を維持し、完了後に遅延を記録する。"
)

for asset in project["sets"]:
    if asset["id"] in (BAR_ID, SHELF_ID):
        asset["note"] = (
            "本人判断ではキャスター付き一体型バー。Stage Sketch上は既存のバーと背面棚の2駒を"
            "同時に動かして表示する。寸法・重量・固定・ロック数は未確認。"
        )

q02_people = performer_by_role(q02)
q03_people = performer_by_role(q03)
q03_sets = piece_by_set(q03)


def make_scene(frame, index):
    scene = {
        "id": frame["id"],
        "title": frame["title"].replace("（AI仮案）", "（サンプル採用）"),
        "kind": "scene",
        "depth": 1,
        "note": frame["note"].replace("【AI仮案・", "【サンプル採用・AI原案・"),
        "transitionNote": (
            "暗転中の工程を読む技術図。客席向け場面や自動GOではない。"
            "工程時間と締切はnullのまま保持する。"
        ),
        "background": "#40362d",
        "pieces": [],
        "notes": [],
        "strokes": [],
        "arrows": [],
        "studyBeatId": None,
        "beat": {"role": "暗転転換の技術確認", "energy": 3},
        "rehearsal": {"holdDurationSeconds": None, "transitionToNextSeconds": None},
        "lightingIntent": {
            "version": 1,
            "objective": "客席へバー搬入を見せず、段階的な変化を暗転内で進める",
            "audienceFocus": "暗転を維持。配置は制作側の確認用",
            "layers": {
                "performer": {"intent": "conceal", "note": "暗転内で移動と仮面装着"},
                "background": {"intent": "conceal", "note": "バー搬入を見せない"},
                "space": {"intent": "conceal", "note": "通路確認は制作側で行う"}
            },
            "transition": {
                "triggerType": "manual",
                "triggerNote": "舞台監督の手動確認。自動GOなし",
                "change": "hold",
                "tempo": "hold"
            },
            "mood": "",
            "referenceNote": "M6-SAMPLE-A / " + frame["id"],
            "implementationNote": "技術確認図。実物・稽古・安全の承認ではない。",
            "safetyStatus": "not-assessed",
            "sourceRefs": [{"kind": "user", "label": "M6本人判断12件", "locator": "ai-input.json"}]
        },
        "cueSeconds": None,
        "audioTrackId": None,
        "blackout": index == 0
    }
    for role, start in q02_people.items():
        end = q03_people[role]
        person = deepcopy(end)
        person["id"] = frame["id"] + "-" + slug(role)
        person["u"] = clamp(start["u"] + (end["u"] - start["u"]) * frame["progress"])
        person["v"] = clamp(start["v"] + (end["v"] - start["v"]) * frame["progress"])
        person["pose"] = "walk"
        person["facing"] = end["facing"]
        person["route"] = None
        if role in frame["carrierPositions"]:
            person.update(frame["carrierPositions"][role])
            person["name"] = (
                "運搬担当（ロレンス担当）" if role == "FRIAR_LAWRENCE"
                else "運搬担当（ジョン担当）"
            )
        scene["pieces"].append(person)

    people = performer_by_role(scene)
    if frame["bar"]:
        bar = deepcopy(q03_sets[BAR_ID])
        bar["id"] = frame["id"] + "-" + BAR_ID
        bar["u"] = frame["bar"]["u"]
        bar["v"] = frame["bar"]["v"]
        bar["route"] = None
        shelf = deepcopy(q03_sets[SHELF_ID])
        shelf["id"] = frame["id"] + "-" + SHELF_ID
        shelf["u"] = frame["bar"]["u"]
        shelf["v"] = 0.025 if frame["bar"]["u"] == 0.5 else 0.06
        shelf["route"] = None
        if frame["bar"]["u"] != frame["bar"]["targetU"]:
            bar["route"] = {
                "u": frame["bar"]["targetU"],
                "v": frame["bar"]["targetV"],
                "bu": 0.70,
                "bv": 0.12
            }
            shelf["route"] = {"u": 0.5, "v": 0.025, "bu": 0.70, "bv": 0.04}
        scene["pieces"].extend([bar, shelf])

    for role in frame["maskRoles"]:
        mask = deepcopy(q03_sets["rj-mask-" + slug(role)])
        holder = people[role]
        mask["id"] = frame["id"] + "-mask-" + slug(role)
        mask["u"] = holder["u"]
        mask["v"] = holder["v"]
        mask["heldBy"] = holder["id"]
        mask["route"] = None
        scene["pieces"].append(mask)
    return scene


frames = [make_scene(frame, index) for index, frame in enumerate(proposal["frames"])]

# Curved paths for the two carrier slots make the candidate movement inspectable.
for current, following in zip(frames, frames[1:]):
    now = performer_by_role(current)
    nxt = performer_by_role(following)
    for role in CARRIERS:
        now[role]["route"] = {
            "u": nxt[role]["u"],
            "v": nxt[role]["v"],
            "bu": round((now[role]["u"] + nxt[role]["u"]) / 2, 4),
            "bv": max(0.06, round(min(now[role]["v"], nxt[role]["v"]) - 0.03, 4))
        }

source_index = next(i for i, scene in enumerate(project["scenes"]) if scene["id"] == FROM_ID)
assert project["scenes"][source_index + 1]["id"] == TO_ID
project["scenes"][source_index + 1:source_index + 1] = frames

dump(OUTPUT, candidate)

review_ids = [FROM_ID] + [frame["id"] for frame in proposal["frames"]] + [TO_ID]
review_scenes = []
for scene_id in review_ids:
    scene = next(item for item in project["scenes"] if item["id"] == scene_id)
    review_scenes.append({
        "id": scene["id"],
        "title": scene["title"],
        "note": scene["note"],
        "blackout": scene["blackout"],
        "pieces": [
            {
                "id": piece["id"],
                "type": piece["type"],
                "role": piece.get("originId"),
                "castId": piece.get("castId"),
                "setId": piece.get("setId"),
                "name": piece.get("name"),
                "u": piece["u"],
                "v": piece["v"],
                "color": piece["color"],
                "route": piece.get("route"),
                "heldBy": piece.get("heldBy")
            }
            for piece in scene["pieces"]
        ]
    })

manifest = {
    "kind": "stage-sketch-transition-candidate-manifest",
    "version": 1,
    "status": "owner_approved_sample_candidate",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "sourceNativeSha256": sha(SOURCE),
    "sourceDecisionSha256": proposal["sourceDecisionSha256"],
    "ownerApprovalSha256": sha(APPROVAL),
    "candidateSha256": sha(OUTPUT),
    "sourceCounts": {
        "sectionsAndScenes": len(source["project"]["scenes"]),
        "scenes": sum(item["kind"] == "scene" for item in source["project"]["scenes"]),
        "cast": len(source["project"]["cast"]),
        "sets": len(source["project"]["sets"])
    },
    "candidateCounts": {
        "sectionsAndScenes": len(project["scenes"]),
        "scenes": sum(item["kind"] == "scene" for item in project["scenes"]),
        "cast": len(project["cast"]),
        "sets": len(project["sets"])
    },
    "insertedSceneIds": [frame["id"] for frame in frames],
    "maskCounts": {
        scene["id"]: sum(piece.get("holdMode") == "face" for piece in scene["pieces"])
        for scene in frames + [q03]
    },
    "barCounts": {
        scene["id"]: sum(piece.get("setId") == BAR_ID for piece in scene["pieces"])
        for scene in frames + [q03]
    },
    "carrierRoles": list(CARRIERS),
    "approvedChoices": {item["id"]: item["choice"] for item in approval["decisions"]},
    "unknownsPreserved": len(ai_input["mustRemainUnknown"]),
    "productChanges": 0,
    "sourceSampleChanges": 0,
    "realCaseEvidence": 0
}
dump(MANIFEST, manifest)

review_data = {
    "status": manifest["status"],
    "candidateSha256": manifest["candidateSha256"],
    "scenes": review_scenes,
    "carrierRoles": list(CARRIERS),
    "ready": ai_input["ownerConfirmed"]["ready"],
    "unknowns": ai_input["mustRemainUnknown"],
    "approval": approval
}
html = TEMPLATE.read_text(encoding="utf-8")
html = html.replace("__REVIEW_DATA__", json.dumps(review_data, ensure_ascii=False))
html = html.replace("__CANDIDATE_SHA__", manifest["candidateSha256"])
PAGE.write_text(html, encoding="utf-8")

print(json.dumps(manifest, ensure_ascii=False, indent=2))

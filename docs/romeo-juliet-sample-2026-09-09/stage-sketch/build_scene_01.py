"""Build a deterministic Stage Sketch v3 draft for Romeo and Juliet scene 1."""

from datetime import datetime, timezone, timedelta
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PLAN_PATH = ROOT / "direction-notes" / "scene-01-blocking-plan.json"
CAST_PATH = ROOT / "script-book" / "cast.json"
OUTPUT_PATH = HERE / "scene-01-stage-sketch-v3.json"


plan = json.loads(PLAN_PATH.read_text(encoding="utf-8"))
cast_summary = json.loads(CAST_PATH.read_text(encoding="utf-8"))
roles = {role["id"]: role for group in cast_summary["groups"] for role in group["roles"]}
palette = {item["roleId"]: item for item in plan["castPalette"]}

assert plan["sceneId"] == "RJ-DIR-01"
assert set(roles) == set(palette)
assert len(roles) == cast_summary["summary"]["performerCount"] == 10
assert sum(beat["toSeconds"] - beat["fromSeconds"] for beat in plan["timing"]["beats"]) == 180

created_at = datetime(2026, 9, 9, 12, 0, tzinfo=timezone(timedelta(hours=9))).isoformat()
updated_at = datetime(2026, 9, 11, 12, 0, tzinfo=timezone(timedelta(hours=9))).isoformat()

cast = []
for role_id in roles:
    role = roles[role_id]
    cast.append({
        "id": f"cast-rj01-{role_id.lower().replace('_', '-')}",
        "name": role["name"],
        "color": palette[role_id]["color"],
        "heightCm": 165,
        "note": "役の担当者を識別する仮名。第1場面では中央二役以外は匿名の群衆役。身長165cmは表示用仮値。",
        "locked": False,
    })

cast_ids = {role_id: item["id"] for role_id, item in zip(roles, cast)}


def lighting_intent(cue_id):
    final = cue_id == plan["cueSnapshots"][-1]["id"]
    return {
        "version": 1,
        "objective": "ベンヴォーリオの制止と四隅の乱戦を同時に読み分ける。" if not final else "ティボルトが制止を挑発へ変えようとする瞬間を見せ、接触前に暗転する。",
        "audienceFocus": "中央のベンヴォーリオとティーボルトを主眼にしつつ、四隅の運動を周辺視野に残す。",
        "layers": {
            "performer": {"intent": "separate", "note": "中程度の中央スポットと抑えた全体照明を分ける。"},
            "background": {"intent": "soften", "note": "背景は主張させない。"},
            "space": {"intent": "reveal", "note": "四隅と中央の五領域を見せる。"},
        },
        "transition": {
            "triggerType": "action" if final else "unknown",
            "triggerNote": "ベンヴォーリオの制止にティボルトが応じず、決闘へ変えようとする動きが見えた瞬間。" if final else "",
            "change": "blackout" if final else "hold",
            "tempo": "instant" if final else "hold",
        },
        "mood": "抑制された緊張",
        "referenceNote": "RJ-NOTE-0023〜0026、RJ-NOTE-0034とRJ-BLOCK-01から作成。",
        "implementationNote": "灯数・色・照度・スポット径は未決定。照明意図だけを保存する。",
        "safetyStatus": "not-assessed",
        "sourceRefs": [{"kind": "user", "label": "第1場面の演出指定", "locator": "RJ-NOTE-0023 / RJ-NOTE-0024 / RJ-NOTE-0025 / RJ-NOTE-0026 / RJ-NOTE-0034"}],
    }


scenes = [{
    "id": "section-rj01",
    "kind": "section",
    "depth": 0,
    "title": "第1場面｜二つの家、二つの群れ",
    "studyBeatId": None,
    "note": "12m×9mを基準にした約3分の未稽古仮配置。",
    "background": "#40362d",
    "notes": [],
    "pieces": [],
    "strokes": [],
    "beat": None,
    "rehearsal": None,
    "lightingIntent": None,
}]

beat_by_id = {beat["id"]: beat for beat in plan["timing"]["beats"]}
for snapshot in plan["cueSnapshots"]:
    cue_id = snapshot["id"]
    cue_letter = cue_id.rsplit("-", 1)[-1]
    pieces = []
    for position in snapshot["positions"]:
        role_id = position["roleId"]
        route = position.get("route")
        pieces.append({
            "id": f"piece-{cue_id.lower()}-{role_id.lower().replace('_', '-')}",
            "type": "performer",
            "u": position["u"],
            "v": position["v"],
            "size": 100,
            "color": palette[role_id]["color"],
            "name": roles[role_id]["name"],
            "castId": cast_ids[role_id],
            "setId": None,
            "originId": role_id,
            "facing": position["facing"],
            "dims": None,
            "pose": position["pose"],
            "route": route,
            "base": 0,
            "supportId": None,
            "beam": None,
            "locked": False,
        })
    scenes.append({
        "id": f"scene-{cue_id.lower()}",
        "kind": "scene",
        "depth": 1,
        "title": snapshot["title"],
        "studyBeatId": None,
        "note": f"{snapshot['note']} 時間は約3分を分割した未稽古の仮値。中央二役以外は匿名の群衆役。",
        "background": "#40362d",
        "notes": [],
        "pieces": pieces,
        "strokes": [],
        "beat": {"role": beat_by_id[cue_letter]["label"], "energy": 4 if cue_letter in ("A", "C") else 3},
        "rehearsal": {"holdDurationSeconds": snapshot["holdDurationSeconds"], "transitionToNextSeconds": 0},
        "lightingIntent": lighting_intent(cue_id),
    })

document = {
    "kind": "shosai-stage-sketch",
    "version": 3,
    "mcpMeta": {
        "status": "draft",
        "revision": 2,
        "createdAt": created_at,
        "updatedAt": updated_at,
        "createdBy": "romeo-juliet-sample-builder",
        "sourcePrompt": "RJ-DIR-01の四隅4組、中央のベンヴォーリオによる制止とティボルトの挑発、約3分、接触前の即ブラックアウトという承認済み演出をStage Sketch v3下書きへ変換。未稽古・未取り込み。",
    },
    "project": {
        "id": "romeo-juliet-sample-scene-01",
        "title": "ロミオとジュリエット｜第1場面",
        "versionLabel": "第1場面 仮配置 v3 · 制止と挑発",
        "parentVersionId": None,
        "branchReason": "場面数を減らす方針へ訂正し、第1場面の約3分構成を復元",
        "createdAt": created_at,
        "sceneStudyId": None,
        "sceneStudySourceVersion": None,
        "venue": plan["referenceStage"]["venue"],
        "venueSize": plan["referenceStage"]["venueSize"],
        "venueDims": None,
        "rehearsal": {"version": 1, "primaryMode": "ordered", "soundtrack": None},
        "cast": cast,
        "sets": [],
        "rigs": [],
        "scenes": scenes,
        "activeSceneId": "scene-rj01-a",
    },
}

OUTPUT_PATH.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Built {OUTPUT_PATH.name}: {len(cast)} cast, {len(scenes) - 1} cues, Stage Sketch v3.")

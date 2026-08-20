#!/usr/bin/env python3
"""舞台技術カードの調査ドラフトを、静的アプリ用JavaScriptへ束ねる。"""

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DRAFTS = HERE.parent / "show-reference" / "data" / "drafts"
SOURCES = (
    (DRAFTS / "stage_apparatus_10_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave2_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave3_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave4_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave5_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave6_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave7_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave8_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave9_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave10_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_supplemental_2026-08-04.json", 1),
    (DRAFTS / "stage_apparatus_10_wave11_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave12_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave13_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave14_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave15_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave16_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave17_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave18_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave19_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave20_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave21_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave22_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave23_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave24_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave25_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave26_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave27_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave28_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave29_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave30_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave31_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave32_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave33_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave34_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave35_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave36_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave37_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave38_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave39_2026-08-04.json", 10),
    (DRAFTS / "stage_apparatus_10_wave40_2026-08-04.json", 10),
    *((DRAFTS / f"stage_apparatus_10_wave{wave}_2026-08-04.json", 10) for wave in range(41, 71)),
    *(
        (path, len(json.loads(path.read_text(encoding="utf-8")).get("cards", [])))
        for path in sorted(
            (
                item for item in DRAFTS.glob("stage_apparatus_10_wave*_2026-08-*.json")
                if 71 <= int(item.name.split("wave", 1)[1].split("_", 1)[0]) <= 95
            ),
            key=lambda item: int(json.loads(item.read_text(encoding="utf-8"))["wave"]),
        )
    ),
)
OUTPUT = HERE / "stage-apparatus-data.js"


def load_library() -> dict:
    batches = []
    cards = []
    unresolved = []
    created_dates = []
    for source, expected_count in SOURCES:
        data = json.loads(source.read_text(encoding="utf-8"))
        batch_cards = data.get("cards", [])
        if len(batch_cards) != expected_count:
            raise SystemExit(f"{source.name}: 舞台技術カードは{expected_count}件である必要があります: {len(batch_cards)}件")
        batches.append({"source": source.name, "purpose": data.get("purpose", "")})
        cards.extend(batch_cards)
        unresolved.extend(data.get("unresolved", []))
        if data.get("created"):
            created_dates.append(data["created"])

    ids = [card.get("id") for card in cards]
    if len(set(ids)) != len(ids):
        raise SystemExit("舞台技術カードのIDが重複しています")
    required = (
        "name_ja", "family", "planning_scale", "creative_capability", "mechanism",
        "minimum_viable_version", "budget_jpy_inferred", "venue_requirements",
        "crew_roles", "failure_modes", "examples",
    )
    for card in cards:
        missing = [key for key in required if not card.get(key)]
        if missing:
            raise SystemExit(f"{card.get('id')}: 必須項目がありません: {', '.join(missing)}")

    return {
        "schema_version": "0.3-draft",
        "created": max(created_dates),
        "status": "research_draft_not_merged",
        "purpose": f"制作の書斎で比較・検索する舞台技術カード{len(cards)}件。第71便以降は、既存カードとの重複監査と個別の一次実装資料確認を通過し、確認済み事実・演出展開案・危険区分・権利文化境界を追加。既存32件は汎用索引から直接資料へ出典修復済み。予算は企画初期用のAI推定で、業者見積ではない。",
        "budget_basis": {
            "currency": "JPY",
            "scope": "1会場・短期公演の装置、制御、設置、主要技術リハーサル。会場、出演者、旅費、コンテンツ制作、権利、税は原則除外。",
            "confidence": "low_to_medium",
        },
        "research_batches": batches,
        "cards": cards,
        "unresolved": list(dict.fromkeys(unresolved)),
    }


def render() -> str:
    data = load_library()
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    return (
        "/* Generated by build_stage_apparatus.py from research drafts. Do not edit by hand. */\n"
        f"window.STAGE_APPARATUS_LIBRARY = {payload};\n"
    )


expected = render()
if "--check" in sys.argv:
    current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""
    if current != expected:
        print("！stage-apparatus-data.js が調査ドラフトと一致していません")
        raise SystemExit(1)
    print("stage-apparatus-data.js は調査ドラフトと一致しています")
    raise SystemExit(0)

OUTPUT.write_text(expected, encoding="utf-8")
print(f"stage-apparatus-data.js を書き出しました（カード {len(load_library()['cards'])}件）")

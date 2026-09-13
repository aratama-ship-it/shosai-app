#!/usr/bin/env python3
"""独立した舞台スケッチ正本 ``stage.html`` と派生成果物を検証する。

2026-09-12以降、制作の書斎 ``index.html`` から舞台スケッチを生成しない。
舞台スケッチのHTMLは ``stage.html`` を直接編集し、このスクリプトで必須要素と
隔離描画ページ ``study-frame.html`` の整合を確認する。

使い方:
    python3 build_stage.py          … study-frame.html を更新して検証
    python3 build_stage.py --check  … ファイルを書き換えず整合だけ確認
"""

import re
import subprocess
import sys
from pathlib import Path

from stage_extract import modal_count

HERE = Path(__file__).resolve().parent
STAGE = HERE / "stage.html"
DESK = HERE / "index.html"
CHECK = "--check" in sys.argv

subprocess.run(
    [sys.executable, str(HERE / "build_study.py")] + (["--check"] if CHECK else []),
    check=True,
)

stage = STAGE.read_text(encoding="utf-8")
desk = DESK.read_text(encoding="utf-8")
errors: list[str] = []

required_stage_markers = [
    '<main id="view-stage" class="view">',
    '<body class="is-standalone">',
    'rel="manifest" href="stage-sketch.webmanifest"',
    'rel="apple-touch-icon" href="icons/stage-sketch-180.png"',
    'rel="icon" href="icons/stage-sketch-192.png"',
    'stage-pwa.js?v=',
    'stage-sketch.js?v=',
]
for marker in required_stage_markers:
    if marker not in stage:
        errors.append(f"stage.html に必須要素がありません: {marker}")

for forbidden in ["db.js?v=", "app.js?v=", "roster.js?v=", "data-nav=\"db\""]:
    if forbidden in stage:
        errors.append(f"stage.html に書斎側の要素が混ざっています: {forbidden}")

for forbidden in [
    'id="view-stage"',
    'data-nav="stage"',
    'href="#stage"',
    'stage-sketch.js?v=',
    'stage-session.js?v=',
    'stage-study-owner.js?v=',
]:
    if forbidden in desk:
        errors.append(f"index.html に舞台スケッチ側の要素が残っています: {forbidden}")

pwa_at = stage.find("stage-pwa.js?v=")
sketch_at = stage.find("stage-sketch.js?v=")
if pwa_at < 0 or sketch_at < 0 or pwa_at > sketch_at:
    errors.append("stage-pwa.js は stage-sketch.js より前に読み込む必要があります")

js = (HERE / "stage-sketch.js").read_text(encoding="utf-8")
ids = sorted(set(re.findall(r'getElementById\("([^"]+)"\)', js)))
known_optional = {
    "stage-show-front",
    "stage-show-plan",
    "stage-study-body",
    "stage-scene-note-input",
    "stage-import-notice",
}
missing = [item for item in ids if f'id="{item}"' not in stage and item not in known_optional]
if missing:
    errors.append("stage.html に足りない id: " + ", ".join(missing))

if errors:
    for error in errors:
        print("！" + error)
    raise SystemExit(1)

print(f"stage.html は独立した正本です（{len(stage)}文字）")
print(f"窓: {modal_count()}枚 / 参照する id: {len(ids)}個")
print("書斎 index.html に舞台スケッチの画面・導線・実行スクリプトはありません")

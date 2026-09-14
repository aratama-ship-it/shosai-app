#!/usr/bin/env python3
"""stage-sketch.js の分割候補ブロックが外部のトップレベル識別子をいくつ参照するかを数え、
B1_split_dependency_map.md を作り直す（WO-B1 の各段の前に取り直す）。
使い方: python3 docs/system-audit-2026-09-09/make_split_dependency_map.py   （shosai-app を cwd に）
候補は下の GROUPS を編集する。製品コードは読むだけ。"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = (ROOT / "stage-sketch.js").read_text(encoding="utf-8").split("\n")
OUT = Path(__file__).resolve().parent / "B1_split_dependency_map.md"

GROUPS = {
    "a 会場描画": ["drawFrontVenue", "drawPlanVenue", "drawStage"],
    "b スマホ/iPad作業面": ["initPhoneViewerWorkspace", "initTabletPwaWorkspace"],
    "c 印刷・ピッチ書き出し": ["openPrintPage", "runPitchExport"],
    "d 体モデル": ["pieceParts", "buildRig", "drawPerformer", "poseExtent"],
}

decl = {}
for i, line in enumerate(SRC):
    m = re.match(r"^  (?:async )?function ([A-Za-z0-9_]+)", line) or re.match(r"^  (?:const|let|var) ([A-Za-z0-9_]+)", line)
    if m:
        decl.setdefault(m.group(1), i + 1)


def block(name):
    start = decl[name] - 1
    end = len(SRC)
    for j in range(start + 1, len(SRC)):
        if SRC[j].startswith("  }") and not SRC[j].startswith("   "):
            end = j
            break
    return start + 1, end + 1, "\n".join(SRC[start:end + 1])


lines = ["# B-1 stage-sketch.js 分割候補の依存マップ（機械抽出・make_split_dependency_map.py）", "",
         "各候補ブロックが、ブロック外で定義されたトップレベル識別子（IIFE直下の関数・定数）をいくつ参照しているか。"
         "参照が少ない順に切り出しやすい。`state`/`els`/`render` 等は共有の文脈なので、切り出し先には引数か `window.SHOSAI_STAGE_*` 経由で渡す。", ""]
for label, names in GROUPS.items():
    names = [n for n in names if n in decl]
    own = set(names)
    used, ranges, total = set(), [], 0
    for n in names:
        a, b, text = block(n)
        ranges.append(f"`{n}` {a}〜{b}行（{b - a + 1}行）")
        total += b - a + 1
        ids = set(re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\b", text))
        used |= {i for i in ids if i in decl and i not in own}
    lines += [f"## {label}（合計 {total} 行）", "", "- 範囲: " + "／".join(ranges), f"- 外部参照する識別子: {len(used)} 個",
              "- 一覧: " + ", ".join(f"`{u}`" for u in sorted(used)), ""]
OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"{OUT.name} を書き出しました")

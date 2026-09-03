#!/usr/bin/env python3
"""認証なしの舞台スケッチ体験版（try.html）を index.html から作る。"""

import re
import sys
from pathlib import Path

from stage_extract import modal_count, modal_html, present_html, script_srcs, tour, ver, view

HERE = Path(__file__).resolve().parent
OUT = HERE / "try.html"
CHECK = "--check" in sys.argv


# 公開体験版では共有セッションを出さない。読み込むと起動時に /whoami を叩き、
# 認証の無い公開ホストでは 404 が2件出る（2026-09-03 実測）。機能を隠すだけでなく
# 読み込み自体を止める。
PUBLIC_SKIP_JS = {"stage-session.js"}


def public_scripts() -> str:
    lines = []
    for src in script_srcs:
        bare = src.split("?", 1)[0]
        if bare == "stage-pwa.js" or bare in PUBLIC_SKIP_JS:
            continue
        lines.append(f'<script src="{src}"></script>')
    lines.append('<script src="stage-public.js?v=1"></script>')
    return "\n".join(lines)


page = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="index, follow">
<title>舞台スケッチ（体験版）</title>
<meta name="theme-color" content="#191512">
<link rel="icon" href="icons/stage-sketch-192.png" sizes="192x192" type="image/png">
<link rel="stylesheet" href="{ver('style.css')}">
<link rel="stylesheet" href="stage-public.css?v=1">
<style>
  /* 単独ページでは、他の画面へ行く帯を持たない。
     その代わり上の余白だけ詰めて、絵が早く出るようにする。 */
  body {{ padding-top: 0; }}
  .spine {{ display: none; }}
</style>
</head>
<body class="is-standalone is-public">

{view}

{tour}

{modal_html}

{present_html}

{public_scripts()}
</body>
</html>
"""

if CHECK:
    current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    if current == page:
        print("try.html は index.html と揃っています")
        sys.exit(0)
    print("！try.html が古いです。python3 build_public.py で作り直してください")
    sys.exit(1)

OUT.write_text(page, encoding="utf-8")

js = (HERE / "stage-sketch.js").read_text(encoding="utf-8")
ids = sorted(set(re.findall(r'getElementById\("([^"]+)"\)', js)))
missing = [item for item in ids if f'id="{item}"' not in page]
known_optional = {
    "stage-show-front", "stage-show-plan", "stage-study-body",
    "stage-scene-note-input", "stage-import-notice",
}
missing = [item for item in missing if item not in known_optional]

print(f"try.html を書き出しました（{len(page)} 文字）")
print(f"窓: {modal_count()}枚 / 参照する id: {len(ids)}個")
if missing:
    print("！足りない id:", ", ".join(missing))
    sys.exit(1)
print("足りない id はありません")


#!/usr/bin/env python3
"""舞台スケッチだけの単独ページ（stage.html）を index.html から作る。

テスターへ渡すときに、資料棚や名簿を含めた全体を渡す必要はない。
かといって手で複製すると、index.html を直すたびに二枚が食い違う。
そこで正本は index.html のままにし、必要な部分だけ抜いて組み直す。

抜くもの:
  ・<main id="view-stage"> … 舞台スケッチの画面そのもの
  ・</main> 以降にある窓（.stage-modal / .stage-modal-backdrop）
  ・style.css と、舞台スケッチが使う3本のスクリプト
        stage-venues.js / stage-i18n.js / stage-sketch.js

抜かないもの: db.js・data.js・app.js・roster.js（他のタブのためのもの）

使い方:
    python3 build_stage.py          … 作り直す
    python3 build_stage.py --check  … 作り直しが要るかだけ見る（要るなら終了コード1）

★JS と CSS は本体と共有なので、直せば単独ページにも即とどく。
  直し忘れが起きるのは HTML（画面の組み立て）の方だけ。
  index.html を触ったら、必ずこれを走らせること。
"""

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "index.html"
OUT = HERE / "stage.html"

CHECK = "--check" in sys.argv
html = SRC.read_text(encoding="utf-8")

# --- 舞台スケッチの画面 ---
start = html.index('<main id="view-stage"')
end = html.index("</main>", start) + len("</main>")
view = html[start:end]
# 単独ページでは常に開いている
view = view.replace('<main id="view-stage" class="view" hidden>', '<main id="view-stage" class="view">', 1)

# --- 使い方の案内。窓の手前に置いてある ---
tour_start = html.index('<div class="stage-tour" id="stage-tour"')
tour_end = html.index('<div class="stage-modal-backdrop"', tour_start)
tour = html[tour_start:tour_end].rstrip()

# --- 窓（モーダル）。</main> より後ろに並んでいる ---
tail = html[end:]
modals = re.findall(
    r'<div class="stage-modal-backdrop"[\s\S]*?</div>\s*|<div class="stage-modal[\s\S]*?\n</div>\s*',
    tail,
)
modal_html = "".join(modals).rstrip()

# --- 参照している版（?v=…）を index.html から引き継ぐ ---
def ver(name: str) -> str:
    m = re.search(re.escape(name) + r'(\?v=\d+)?', html)
    return m.group(0) if m else name

page = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>舞台スケッチ — 制作の書斎</title>
<link rel="stylesheet" href="{ver('style.css')}">
<style>
  /* 単独ページでは、他の画面へ行く帯を持たない。
     その代わり上の余白だけ詰めて、絵が早く出るようにする。 */
  body {{ padding-top: 0; }}
  .spine {{ display: none; }}
  .stage-standalone-note {{
    margin: 0 auto 10px;
    padding: 8px 18px 0;
    max-width: 1600px;
    color: rgba(240, 231, 214, 0.4);
    font-size: 10.5px;
    letter-spacing: 0.06em;
  }}
</style>
</head>
<body class="is-standalone">

<p class="stage-standalone-note">舞台スケッチ（テスト版） — 描いたものはこの端末のブラウザにだけ保存されます。</p>

{view}

{tour}

{modal_html}

<script src="{ver('stage-venues.js')}"></script>
<script src="{ver('stage-i18n.js')}"></script>
<script src="{ver('stage-sketch.js')}"></script>
</body>
</html>
"""

if CHECK:
    current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    if current == page:
        print("stage.html は index.html と揃っています")
        sys.exit(0)
    print("！stage.html が古いです。python3 build_stage.py で作り直してください")
    sys.exit(1)

OUT.write_text(page, encoding="utf-8")

# --- 抜け落ちの確認 ---
# stage-sketch.js が触る id が、この一枚に全部あるか数える
js = (HERE / "stage-sketch.js").read_text(encoding="utf-8")
ids = sorted(set(re.findall(r'getElementById\("([^"]+)"\)', js)))
missing = [i for i in ids if f'id="{i}"' not in page]
# 舞台スケッチが「あれば使う」だけの id は、無くても構わない
# あれば使うだけの id。無くても舞台スケッチは動く
#   stage-show-front / stage-show-plan … 旧い開閉のつまみ
#   stage-study-body … 場面問答の欄（舞台スケッチとは別の画面のもの）
known_optional = {"stage-show-front", "stage-show-plan", "stage-study-body"}
missing = [i for i in missing if i not in known_optional]

print(f"stage.html を書き出しました（{len(page)} 文字）")
print(f"窓: {len(modals)}枚 / 参照する id: {len(ids)}個")
if missing:
    print("！足りない id:", ", ".join(missing))
    sys.exit(1)
print("足りない id はありません")

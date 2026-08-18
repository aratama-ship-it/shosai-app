#!/usr/bin/env python3
"""舞台スケッチだけの単独ページ（stage.html）を index.html から作る。

テスターへ渡すときに、資料棚や名簿を含めた全体を渡す必要はない。
かといって手で複製すると、index.html を直すたびに二枚が食い違う。
そこで正本は index.html のままにし、必要な部分だけ抜いて組み直す。

抜くもの:
  ・<main id="view-stage"> … 舞台スケッチの画面そのもの
  ・</main> 以降にある窓（.stage-modal / .stage-modal-backdrop）
  ・style.css と、舞台スケッチが使うスクリプト
        ★並びは index.html の <script> から自動で拾う（下の SKIP_JS 以外を全部）。
          ここに手で並べていたころ、新しく足した stage-first-person.js が
          載らないまま作り直され、単独ページから「この人の視界」が消えかけた。
          正本に足したものが黙って落ちない形にしておく。

抜かないもの: db.js・data.js・app.js・roster.js など、他のタブのためのもの（SKIP_JS）

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

# --- プレゼン中の送り・終了の帯。窓ではないので、上の抜き出しには掛からない。
#     置き忘れると全画面で前後のシーンへ行けず、抜けることもできなくなる。 ---
present = re.search(
    r'<div class="stage-present-overlay"[\s\S]*?\n</div>',
    tail,
)
present_html = present.group(0).rstrip() if present else ""

# --- 参照している版（?v=…）を index.html から引き継ぐ ---
def ver(name: str) -> str:
    m = re.search(re.escape(name) + r'(\?v=\d+)?', html)
    return m.group(0) if m else name


# 他のタブ（資料棚・名簿・机・スクラップブック）のためのもの。単独ページには要らない
SKIP_JS = {
    "db.js", "data.js", "book-seeds.js", "shelf-classification.js",
    "stage-apparatus-data.js", "desk-media.js", "app.js", "roster.js",
}


def stage_scripts() -> str:
    """index.html が読む順のまま、舞台スケッチに要るものだけを並べ直す。

    stage-pwa.js は単独ページだけのもの（ホーム画面へ入れて使うため）。
    本体の直前に置く——舞台スケッチ本体より先に立ち上がる必要がある。
    """
    lines = []
    for src in re.findall(r'<script src="([^"]+)"', html):
        bare = re.sub(r"\?v=\d+", "", src)
        if bare in SKIP_JS:
            continue
        if bare == "stage-sketch.js":
            lines.append('<script src="stage-pwa.js?v=3"></script>')
        lines.append(f'<script src="{src}"></script>')
    return "\n".join(lines)

page = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>舞台スケッチ — 制作の書斎</title>
<meta name="theme-color" content="#191512">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="舞台スケッチ">
<link rel="manifest" href="stage-sketch.webmanifest">
<link rel="apple-touch-icon" href="icons/stage-sketch-180.png">
<link rel="icon" href="icons/stage-sketch-192.png" sizes="192x192" type="image/png">
<link rel="stylesheet" href="{ver('style.css')}">
<style>
  /* 単独ページでは、他の画面へ行く帯を持たない。
     その代わり上の余白だけ詰めて、絵が早く出るようにする。 */
  body {{ padding-top: 0; }}
  .spine {{ display: none; }}
</style>
</head>
<body class="is-standalone">

{view}

{tour}

{modal_html}

{present_html}

{stage_scripts()}
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
#   stage-scene-note-input … シーン一覧の描画時にJSが選択中の行へ付ける
#   stage-study-body … 見本のショーの欄。同梱をボツにしたので、いまはどこにも無い
#     （stage-scene-study-data.js はCodexの資料として残してあるが、読み込んでいない）
#   stage-import-notice … 読み込み失敗の知らせ。JSがその場で作って body へ足す
known_optional = {
    "stage-show-front", "stage-show-plan", "stage-study-body",
    "stage-scene-note-input", "stage-import-notice",
}
missing = [i for i in missing if i not in known_optional]

print(f"stage.html を書き出しました（{len(page)} 文字）")
print(f"窓: {len(modals)}枚 / 参照する id: {len(ids)}個")
if missing:
    print("！足りない id:", ", ".join(missing))
    sys.exit(1)
print("足りない id はありません")

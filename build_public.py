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
PUBLIC_SKIP_JS = {
    "stage-session.js",
    # ★個人用ショーの同梱データ（618KB・実制作のショー）。認証の内側だから積めていた。
    #   公開版に載せると全部読める。2026-09-03 に公開直前で発見。絶対に外すこと。
    "stage-shows.local.js",
    # 名簿の合言葉。公開版は名簿を持たない。
    "roster-key.local.js",
}


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
<script>
/* 公開体験版には認証が無いので /whoami は存在しない。本体は404を正しく受け流すが、
   誰のコンソールにも赤い404が出るのは公開物として避けたい（2026-09-03）。
   本体を書き換えず、ここで「誰でもない」と即答して呼び出しを止める。 */
(function () {{
  var real = window.fetch;
  if (typeof real !== "function") return;
  window.fetch = function (input, init) {{
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (url === "/whoami" || url.slice(-8) === "/whoami") {{
      return Promise.resolve(new Response("{{}}", {{
        status: 200, headers: {{ "Content-Type": "application/json" }},
      }}));
    }}
    return real.apply(this, arguments);
  }};
}})();
</script>
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

# --- 配信フォルダを組む -------------------------------------------------
# ★許可リストではなく「集めたものだけを配る」形にする。
#   wrangler の directory をこのフォルダにすれば、ここに無いものは原理的に配れない。
#   フォルダごと作り直すので、消し忘れも残らない。
#   （2026-09-03: try.html が個人ショー618KBを読んでいたのを公開直前に発見。
#     許可リストで塞ぐ方式だと、参照を足したときに気づけない。）
import shutil

DIST = HERE / "public-dist"


def collect_dist() -> list[str]:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    copied = []

    def put(rel: str) -> None:
        src = HERE / rel
        if not src.exists():
            raise SystemExit(f"！配信に要るファイルがない: {rel}")
        dst = DIST / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        copied.append(rel)

    # 入口。/ で開けるように index.html の名前で置く
    shutil.copy2(OUT, DIST / "index.html")
    copied.append("index.html（try.html の写し）")

    # try.html が読む css / js だけを、生成物から読み取って運ぶ
    page = OUT.read_text(encoding="utf-8")
    for ref in re.findall(r'(?:src|href)="([^":]+?)(?:\?v=\d+)?"', page):
        if ref.startswith(("http", "//", "#", "data:")):
            continue
        if ref.endswith((".js", ".css")):
            put(ref)

    # 製品版ベータの紹介ページ（手で書いたもの）。/beta.html で開ける名前にする
    shutil.copy2(HERE / "public-beta.html", DIST / "beta.html")
    copied.append("beta.html（public-beta.html の写し）")

    # 見た目に要るアイコン
    for icon in ("icons/stage-sketch-192.png", "icons/stage-sketch-180.png"):
        put(icon)

    return copied


files = collect_dist()
print(f"配信フォルダ public-dist/ を作りました（{len(files)}件）")
for name in files:
    print(f"  - {name}")

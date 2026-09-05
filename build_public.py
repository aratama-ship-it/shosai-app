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
    # ---- ここから下は「錠が掛かっていて使えない機能」の実装。
    #   積んでも触れないのに、スマホでは解析だけで時間を食う。
    #   配信物は2MB（gzip 550KB）あり、スマホで重いという指摘を受けて外した
    #   （2026-09-03）。外して壊れないことは実画面で確認すること。
    "stage-first-person.js",    # この人の視界（122KB）
    "stage-venue-editor.js",    # 会場エディタ（76KB・stage-sketchからの参照なし）
    "manual/manual-content.js", # 冊子（44KB）
    "stage-audio-store.js",     # 楽曲（参照側に || null の守りあり）
    "stage-prompt-i18n.js",     # AI指示の訳（同上）
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
SITE = "https://stagesketch-try.juggler-arata.workers.dev"


# --- 英語版LP（/en/index.html）を作る ------------------------------------
# ★なぜ別URLなのか（2026-09-05）:
#   SNSのクローラー（Twitterbot / facebookexternalhit / Slackbot）とGoogleは
#   JSを実行しない。LPは本文の日英を data-ja / data-en とJSで切り替えているが、
#   <title> と description / og:* をJSで書き換えても、共有カードにも検索結果にも
#   届かない（英語で読んでいても日本語のカードが出る）。
#   Accept-Language を見るサーバー側の出し分けも、クローラーがそのヘッダーを
#   送らないので効かない。だから「言語ごとに別URL＋hreflang」にする。
#
# ★HTMLは二重に持たない。日本語版（public-lp/index.html）が唯一の正本で、
#   ここは meta だけを差し替えて生成する。英語の文言を直すときは下の EN_META を直す。
#
# ★英語は commit 71db200（英語の全面校閲）の用語に揃える:
#   立ち位置=positions／動線=movement／正面図=front view／平面図=plan view／
#   客席=the house／体験版=the preview／製品版ベータ=the full beta／
#   登録不要=No sign-up／綴りはブリティッシュ。
EN_TITLE = "Stage Sketch | Share positions and movement in a front view and a plan view"
EN_DESC = (
    "For directors, performers and production teams. A browser tool for drawing stage "
    "positions, movement and the view from the house in a front view and a plan view at "
    "once. No sign-up for the preview."
)
EN_OG_DESC = (
    "For directors, performers and production teams. A browser tool for drawing stage "
    "positions, movement and the view from the house in a front view and a plan view at once."
)
EN_OG_ALT = (
    "Stage Sketch — a tool for drawing stage positions and movement at once, in a front view "
    "as the house sees it and a plan view from above. Preview in the browser, no sign-up, "
    "free during the beta."
)


def english_lp(html: str) -> str:
    """日本語版LPから、meta だけ英語に差し替えた /en/index.html を作る。

    置換は1件ずつ数を確かめる。LP側の書き方が変わったらここで止める
    （黙って日本語のmetaのまま英語ページを出さないため）。
    """

    def sub(old: str, new: str, n: int = 1) -> None:
        nonlocal html
        got = html.count(old)
        if got != n:
            raise SystemExit(f"！英語版LPの差し替えに失敗（想定{n}件・実際{got}件）: {old[:60]}")
        html = html.replace(old, new)

    sub('<html lang="ja">', '<html lang="en">')
    sub(
        """<!-- 検索・共有向けの題と説明（2026-09-05 マーケ観点の見直し・第1弾／第3弾で英語版を分離）。
     ★description に「PC用のアプリ」と書かない（ブラウザ対応／Mac対応の札と食い違う）。
     ★og:image は絶対URLでないとSNSのカードが出ない。og:url／twitter:card／canonical も同時に。
     ★このファイルは日本語版（/）の正本。英語版（/en/）は build_public.py が
       このファイルから meta だけ英語に差し替えて生成する。英語の文言を直すときは
       build_public.py の english_lp() を直す（HTMLを二重に持たない）。
     ★SNSのクローラーとGoogleはJSを実行しない前提。だから題・説明・OGPは
       JSで書き換えるのではなく、言語ごとに別URL（/ と /en/）で静的に持つ。 -->""",
        """<!-- ★このファイルは生成物。直接編集しない。
     public-lp/index.html（日本語版が正本）から build_public.py の english_lp() が
     meta だけ英語に差し替えて作る。作り直しは python3 build_public.py。
     Generated file — do not edit. Built from public-lp/index.html by build_public.py. -->""",
    )
    sub("<title>舞台スケッチ｜立ち位置・動線を正面図と平面図で共有</title>", f"<title>{EN_TITLE}</title>")
    sub(
        '<meta name="description" content="演出家・演者・制作チーム向け。舞台の立ち位置、動線、'
        '客席からの見え方を正面図と平面図で同時に描けるブラウザツール。体験版は登録不要。">',
        f'<meta name="description" content="{EN_DESC}">',
    )
    sub('<meta property="og:site_name" content="舞台スケッチ">',
        '<meta property="og:site_name" content="Stage Sketch">')
    sub('<meta property="og:title" content="舞台スケッチ — 立ち位置・動線を正面図と平面図で共有">',
        '<meta property="og:title" content="Stage Sketch — Share positions and movement in a front view and a plan view">')
    sub(
        '<meta property="og:description" content="演出家・演者・制作チーム向け。舞台の立ち位置、動線、'
        '客席からの見え方を正面図と平面図で同時に描けるブラウザツール。">',
        f'<meta property="og:description" content="{EN_OG_DESC}">',
    )
    sub(
        '<meta property="og:image:alt" content="舞台スケッチ — 舞台の立ち位置と動線を、'
        '客席からの正面図と真上の平面図で同時に描くツール。ブラウザ体験版・登録不要・'
        'ベータ期間中は無償。">',
        f'<meta property="og:image:alt" content="{EN_OG_ALT}">',
    )
    sub(
        '<meta property="og:locale" content="ja_JP">\n'
        '<meta property="og:locale:alternate" content="en_GB">',
        '<meta property="og:locale" content="en_GB">\n'
        '<meta property="og:locale:alternate" content="ja_JP">',
    )

    # 自分自身を指す2本（canonical と og:url）だけ /en/ に向ける。
    # hreflang の3本（ja / en / x-default）は両ページで同じ内容なので触らない。
    sub(f'<link rel="canonical" href="{SITE}/">', f'<link rel="canonical" href="{SITE}/en/">')
    sub(f'<meta property="og:url" content="{SITE}/">', f'<meta property="og:url" content="{SITE}/en/">')

    # ★/en/ は1階層下。相対パスのままだと /en/media/... を取りに行って404になる。
    #   属性を名指しせず、src / href / poster を総なめにして絶対パスへ直す。
    #   （2026-09-05: 名指しの一覧を作ったら poster="media/hero-poster.jpg" を
    #     取りこぼし、英語版だけ動画のポスターが404になった。実画面で発見。）
    absolute = ("http://", "https://", "//", "#", "data:", "mailto:", "tel:", "?", "/")
    rel_attr = re.compile(r'\b(src|href|poster)="([^"]*)"')

    def to_absolute(m: "re.Match[str]") -> str:
        url = m.group(2)
        if not url or url.startswith(absolute):
            return m.group(0)
        return f'{m.group(1)}="/{url}"'

    before = rel_attr.findall(html)
    html = rel_attr.sub(to_absolute, html)
    fixed = [f'{a}="{u}"' for a, u in before if u and not u.startswith(absolute)]
    if not fixed:
        raise SystemExit("！英語版LP: 相対パスの書き換え対象が1つも無い（LPの書き方が変わった？）")

    # 取りこぼしがあればここで止める（英語版だけ404、を二度とやらないため）
    left = [f'{a}="{u}"' for a, u in rel_attr.findall(html) if u and not u.startswith(absolute)]
    if left:
        raise SystemExit(f"！英語版LP: 相対パスが残っている: {', '.join(sorted(set(left)))}")

    # 言語の決定。URLで英語と決まっているので、端末の言語や ?lang= で上書きしない。
    sub(
        """  var asked = new URLSearchParams(location.search).get("lang");
  var lang = asked === "en" || asked === "ja" ? asked
    : (String(navigator.language || "").toLowerCase().indexOf("ja") === 0 ? "ja" : "en");
  document.documentElement.lang = lang;
  if (lang === "en") {
    document.title = "Stage Sketch | Share positions and movement in a front view and a plan view";
  }
""",
        """  /* ★このページは /en/。URLで言語が決まっているので、端末の言語や ?lang= で
     上書きしない。題は最初から英語で書いてある（JSでは触らない）。 */
  var lang = "en";
  document.documentElement.lang = lang;
""",
    )

    if "data-ja" not in html or "data-en" not in html:
        raise SystemExit("！英語版LP: 本文の日英切替（data-ja / data-en）が消えている")
    if "舞台スケッチ｜" in html.split("</head>", 1)[0]:
        raise SystemExit("！英語版LP: head に日本語の題が残っている")
    return html


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

    # 入口は LP（public-lp/index.html）。体験版は /try.html に置く。
    # 2026-09-04: それまでは体験版が入口だったが、LPを作ったので入れ替えた。
    shutil.copy2(HERE / "public-lp" / "index.html", DIST / "index.html")
    copied.append("index.html（public-lp/index.html の写し・LP本体）")
    shutil.copy2(OUT, DIST / "try.html")
    copied.append("try.html（体験版）")

    # 英語圏向けの入口 /en/。日本語版から meta だけ英語に差し替えた写し。
    # ★中身（本文HTML）は日本語版と同じで、表示は data-ja / data-en が切り替える。
    en_dir = DIST / "en"
    en_dir.mkdir(exist_ok=True)
    (en_dir / "index.html").write_text(
        english_lp((HERE / "public-lp" / "index.html").read_text(encoding="utf-8")),
        encoding="utf-8",
    )
    copied.append("en/index.html（英語版LP・meta英語／本文は共通）")

    # LPが使う動画とポスター
    media = HERE / "public-lp" / "media"
    for name in ("hero-ja.mp4", "hero-ja.webm", "hero-poster.jpg"):
        src = media / name
        if not src.exists():
            raise SystemExit(f"！LPの動画がない: {src}")
        (DIST / "media").mkdir(exist_ok=True)
        shutil.copy2(src, DIST / "media" / name)
        copied.append(f"media/{name}")

    # LPの「12の機能」が参照する画像。LP本体から参照を読み取り、欠けていれば止める
    # （名指しのリストにすると、LPへ足した画像が配信から漏れる）。
    lp_html = (HERE / "public-lp" / "index.html").read_text(encoding="utf-8")

    # SNSカード用の画像（og:image）。絶対URLで書いてあるので、media/ 以下の名前だけ取り出して運ぶ。
    # ★2026-09-05: 1200×630 の専用画像（public-lp/og/ から build_og.py で作る）。無ければ止める。
    og = re.search(r'property="og:image" content="[^"]*?/media/([^"/]+)"', lp_html)
    if not og:
        raise SystemExit("！LPに og:image が無い（media/ 以下の絶対URLで書く）")
    og_src = media / og.group(1)
    if not og_src.exists():
        raise SystemExit(f"！og:image の画像がない: {og_src}（python3 public-lp/og/build_og.py で作る）")
    shutil.copy2(og_src, DIST / "media" / og.group(1))
    copied.append(f"media/{og.group(1)}（og:image）")
    feature_refs = sorted(set(re.findall(r'src="media/features/([^"]+)"', lp_html)))
    if feature_refs:
        (DIST / "media" / "features").mkdir(parents=True, exist_ok=True)
    for name in feature_refs:
        src = media / "features" / name
        if not src.exists():
            raise SystemExit(f"！LPが参照する画像がない: {src}")
        shutil.copy2(src, DIST / "media" / "features" / name)
        copied.append(f"media/features/{name}")

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

#!/usr/bin/env python3
"""認証なしの舞台スケッチ体験版（try.html）を index.html から作る。"""

import re
import sys
from pathlib import Path

from stage_extract import modal_count, modal_html, present_html, script_srcs, tour, ver, view

HERE = Path(__file__).resolve().parent
OUT = HERE / "try.html"
CHECK = "--check" in sys.argv

# 公開先。canonical / og:url / og:image は絶対URLでないとSNSのカードも検索も効かない。
# ★独自ドメインへ移すときは、ここと public-lp/index.html・public-beta.html の絶対URLを直す。
SITE = "https://stagesketch-try.juggler-arata.workers.dev"


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
<!-- 検索・共有向けの説明とSNSカード（2026-09-05 第3弾）。
     ★JSで書き換えない。クローラーはJSを実行しないので、英語版は別URL /en/try.html
       として build_public.py が生成する。題は本体（stage-public.js）が開いた言語で
       書き換えるが、それは人が見る画面の話で、カードと検索結果はここが正。 -->
<meta name="description" content="舞台スケッチの体験版。登録不要、ブラウザでそのまま試せます。舞台の立ち位置と動線を、客席からの正面図と真上の平面図で同時に描けます（演者3人・セット2つまで）。">
<link rel="canonical" href="{SITE}/try">
<link rel="alternate" hreflang="ja" href="{SITE}/try">
<link rel="alternate" hreflang="en" href="{SITE}/en/try">
<link rel="alternate" hreflang="x-default" href="{SITE}/try">
<meta property="og:type" content="website">
<meta property="og:site_name" content="舞台スケッチ">
<meta property="og:title" content="舞台スケッチ（体験版）— 登録不要でそのまま試せます">
<meta property="og:description" content="舞台の立ち位置と動線を、客席からの正面図と真上の平面図で同時に描くツール。体験版は登録不要です。">
<meta property="og:url" content="{SITE}/try">
<meta property="og:image" content="{SITE}/media/og-1200x630.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="舞台スケッチ — 舞台の立ち位置と動線を、客席からの正面図と真上の平面図で同時に描くツール。ブラウザ体験版・登録不要・ベータ期間中は無償。">
<meta property="og:locale" content="ja_JP">
<meta property="og:locale:alternate" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
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


# --- 英語版のページ（/en/ 配下）を作る ------------------------------------
# ★なぜ別URLなのか（2026-09-05）:
#   SNSのクローラー（Twitterbot / facebookexternalhit / Slackbot）とGoogleは
#   JSを実行しない。公開ページは本文の日英をJSで切り替えているが、<title> と
#   description / og:* をJSで書き換えても、共有カードにも検索結果にも届かない
#   （英語で読んでいても日本語のカードが出る）。Accept-Language を見るサーバー側の
#   出し分けも、クローラーがそのヘッダーを送らないので効かない。
#   だから「言語ごとに別URL＋hreflang」にする。
#
# ★HTMLは二重に持たない。日本語版が唯一の正本で、ここは meta だけを差し替えて生成する。
#   英語の文言を直すときはこのファイルの EN_* と english_*() を直す。
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
# 体験版（/en/try）。題は本体（stage-public.js）が出す英語の題と同じにする。
# 開いた瞬間に題が入れ替わって見えるのを避けるため、静的な題も同じ文字列にそろえる。
EN_TRY_TITLE = "Stage Sketch (Preview)"
EN_TRY_DESC = (
    "The preview of Stage Sketch. No sign-up — it runs in the browser. Draw stage positions "
    "and movement in a front view and a plan view at the same time (up to three performers "
    "and two set pieces)."
)
EN_TRY_OG_TITLE = "Stage Sketch (Preview) — try it in the browser, no sign-up"
EN_TRY_OG_DESC = (
    "A tool for drawing stage positions and movement in a front view and a plan view that "
    "move together. No sign-up for the preview."
)
# 製品版ベータの紹介（/en/beta）
EN_BETA_TITLE = "About the full beta — Stage Sketch"
EN_BETA_DESC = (
    "What the full beta of Stage Sketch offers, how it differs from the preview, what it is "
    "like to be given access, and how to ask for it. Free during the beta."
)
EN_BETA_OG_DESC = (
    "How the full beta differs from the preview, that it is free during the beta, and how to "
    "request access. A tool for drawing stage positions and movement in a front view and a plan view."
)

# 相対パスとみなさないもの（そのまま置く）
ABSOLUTE_REF = ("http://", "https://", "//", "#", "data:", "mailto:", "tel:", "?", "/")
HERE_REF = ("./", "../")
REF_ATTR = re.compile(r'\b(src|href|poster)="([^"]*)"')

GENERATED_NOTE = """<!-- ★このファイルは生成物。直接編集しない。
     {src}（日本語版が正本）から build_public.py が meta だけ英語に差し替えて作る。
     作り直しは python3 build_public.py。
     Generated file — do not edit. Built from {src} by build_public.py. -->"""


class EnglishPage:
    """日本語版HTMLから英語版を作る。

    置換は1件ずつ数を確かめ、当たらなければ止める。日本語のmetaのまま英語ページを
    出すくらいなら、ビルドが失敗した方がよい。
    """

    def __init__(self, html: str, name: str):
        self.html = html
        self.name = name

    def sub(self, old: str, new: str, n: int = 1) -> "EnglishPage":
        got = self.html.count(old)
        if got != n:
            raise SystemExit(f"！英語版{self.name}の差し替えに失敗（想定{n}件・実際{got}件）: {old[:60]}")
        self.html = self.html.replace(old, new)
        return self

    def self_url(self, ja_path: str, en_path: str) -> "EnglishPage":
        """自分自身を指す2本（canonical と og:url）を英語版のURLへ向ける。

        hreflang の3本（ja / en / x-default）は両ページで同じ内容なので触らない。
        """
        self.sub(f'<link rel="canonical" href="{SITE}{ja_path}">',
                 f'<link rel="canonical" href="{SITE}{en_path}">')
        self.sub(f'<meta property="og:url" content="{SITE}{ja_path}">',
                 f'<meta property="og:url" content="{SITE}{en_path}">')
        return self

    def english_card(self) -> "EnglishPage":
        """SNSカードの画像を英語版（og-1200x630-en.jpg）にし、alt と locale も英語にする。"""
        self.sub(f'<meta property="og:image" content="{SITE}/media/og-1200x630.jpg">',
                 f'<meta property="og:image" content="{SITE}/media/og-1200x630-en.jpg">')
        self.sub(
            '<meta property="og:image:alt" content="舞台スケッチ — 舞台の立ち位置と動線を、'
            '客席からの正面図と真上の平面図で同時に描くツール。ブラウザ体験版・登録不要・'
            'ベータ期間中は無償。">',
            f'<meta property="og:image:alt" content="{EN_OG_ALT}">',
        )
        self.sub('<meta property="og:site_name" content="舞台スケッチ">',
                 '<meta property="og:site_name" content="Stage Sketch">')
        self.sub(
            '<meta property="og:locale" content="ja_JP">\n'
            '<meta property="og:locale:alternate" content="en_GB">',
            '<meta property="og:locale" content="en_GB">\n'
            '<meta property="og:locale:alternate" content="ja_JP">',
        )
        return self

    def to_en_paths(self) -> "EnglishPage":
        """/en/ 配下用にパスを直す。

        ★/en/ は1階層下。素材（media / icons / css / js）の相対パスをそのままにすると
          /en/media/... を取りに行って404になる。ルートからの絶対パスへ直す。
        ★兄弟ページ（.html）と ./ は直さない。/en/ の中で解決されるのが正しい
          （/en/index.html の beta.html は /en/beta.html、/en/beta.html の ./ は /en/）。
        ★属性を名指しで並べない。2026-09-05、名指しの一覧が poster="media/hero-poster.jpg" を
          取りこぼし、英語版だけ動画のポスターが404になった（実画面で発見）。
        """

        def keep(url: str) -> bool:
            if not url or url.startswith(ABSOLUTE_REF) or url.startswith(HERE_REF):
                return True
            return url.split("?", 1)[0].split("#", 1)[0].endswith(".html")

        targets = [u for _, u in REF_ATTR.findall(self.html) if not keep(u)]
        if not targets:
            raise SystemExit(f"！英語版{self.name}: 絶対パスに直す対象が1つも無い（書き方が変わった？）")
        self.html = REF_ATTR.sub(
            lambda m: m.group(0) if keep(m.group(2)) else f'{m.group(1)}="/{m.group(2)}"',
            self.html,
        )
        left = [u for _, u in REF_ATTR.findall(self.html) if not keep(u)]
        if left:
            raise SystemExit(f"！英語版{self.name}: 相対パスが残っている: {', '.join(sorted(set(left)))}")
        return self

    def done(self, *, japanese_head_markers: tuple[str, ...]) -> str:
        """head に日本語が残っていないかを最後に確かめて返す。"""
        head = self.html.split("</head>", 1)[0]
        left = [m for m in japanese_head_markers if m in head]
        if left:
            raise SystemExit(f"！英語版{self.name}: head に日本語が残っている: {', '.join(left)}")
        return self.html


def english_lp(html: str) -> str:
    """日本語版LP（public-lp/index.html）から /en/index.html を作る。"""
    page = EnglishPage(html, "LP")
    page.sub('<html lang="ja">', '<html lang="en">')
    page.sub(
        """<!-- 検索・共有向けの題と説明（2026-09-05 マーケ観点の見直し・第1弾／第3弾で英語版を分離）。
     ★description に「PC用のアプリ」と書かない（ブラウザ対応／Mac対応の札と食い違う）。
     ★og:image は絶対URLでないとSNSのカードが出ない。og:url／twitter:card／canonical も同時に。
     ★このファイルは日本語版（/）の正本。英語版（/en/）は build_public.py が
       このファイルから meta だけ英語に差し替えて生成する。英語の文言を直すときは
       build_public.py の english_lp() を直す（HTMLを二重に持たない）。
     ★SNSのクローラーとGoogleはJSを実行しない前提。だから題・説明・OGPは
       JSで書き換えるのではなく、言語ごとに別URL（/ と /en/）で静的に持つ。 -->""",
        GENERATED_NOTE.format(src="public-lp/index.html"),
    )
    page.sub("<title>舞台スケッチ｜立ち位置・動線を正面図と平面図で共有</title>", f"<title>{EN_TITLE}</title>")
    page.sub(
        '<meta name="description" content="演出家・演者・制作チーム向け。舞台の立ち位置、動線、'
        '客席からの見え方を正面図と平面図で同時に描けるブラウザツール。体験版は登録不要。">',
        f'<meta name="description" content="{EN_DESC}">',
    )
    page.sub('<meta property="og:title" content="舞台スケッチ — 立ち位置・動線を正面図と平面図で共有">',
             '<meta property="og:title" content="Stage Sketch — Share positions and movement in a front view and a plan view">')
    page.sub(
        '<meta property="og:description" content="演出家・演者・制作チーム向け。舞台の立ち位置、動線、'
        '客席からの見え方を正面図と平面図で同時に描けるブラウザツール。">',
        f'<meta property="og:description" content="{EN_OG_DESC}">',
    )
    page.english_card().self_url("/", "/en/")

    # ★体験版へのリンクだけはルートからの絶対パスで書いてある。英語版どうしをつなぐ。
    #   （兄弟ページの beta.html は相対のままで /en/beta.html に解決される）
    page.sub('href="/try.html"', 'href="/en/try.html"', 3)
    page.to_en_paths()

    # 言語の決定。URLで英語と決まっているので、端末の言語や ?lang= で上書きしない。
    page.sub(
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
    if "data-ja" not in page.html or "data-en" not in page.html:
        raise SystemExit("！英語版LP: 本文の日英切替（data-ja / data-en）が消えている")
    return page.done(japanese_head_markers=("舞台スケッチ｜", "演出家・演者"))


def english_beta(html: str) -> str:
    """日本語版の紹介ページ（public-beta.html）から /en/beta.html を作る。"""
    page = EnglishPage(html, "beta")
    page.sub('<html lang="ja">', '<html lang="en">')
    page.sub(
        """<!-- 検索・共有向けの説明とSNSカード（2026-09-05 第3弾）。
     ★このファイルは日本語版（/beta）の正本。英語版（/en/beta）は build_public.py の
       english_beta() が meta だけ英語に差し替えて生成する。英語の文言はそちらを直す。
     ★JSで書き換えない。クローラーはJSを実行しないため、言語ごとに別URLで持つ。 -->""",
        GENERATED_NOTE.format(src="public-beta.html"),
    )
    page.sub("<title>製品版ベータについて — 舞台スケッチ</title>", f"<title>{EN_BETA_TITLE}</title>")
    page.sub(
        '<meta name="description" content="舞台スケッチの製品版ベータについて。体験版との違い、'
        'ベータ期間中は無償であること、お渡しまでの流れとお問い合わせ方法をまとめています。">',
        f'<meta name="description" content="{EN_BETA_DESC}">',
    )
    page.sub('<meta property="og:title" content="製品版ベータについて — 舞台スケッチ">',
             f'<meta property="og:title" content="{EN_BETA_TITLE}">')
    page.sub(
        '<meta property="og:description" content="体験版との違い、ベータ期間中は無償であること、'
        'お渡しまでの流れ。舞台の立ち位置と動線を正面図と平面図で同時に描くツールです。">',
        f'<meta property="og:description" content="{EN_BETA_OG_DESC}">',
    )
    page.english_card().self_url("/beta", "/en/beta").to_en_paths()

    # 言語の決定。/en/ 配下はURLで英語と決まっている。
    page.sub(
        """  var asked = new URLSearchParams(location.search).get("lang");
  var lang = asked === "en" || asked === "ja" ? asked
    : (String(navigator.language || "").toLowerCase().indexOf("ja") === 0 ? "ja" : "en");
  document.documentElement.lang = lang;""",
        """  /* ★このページは /en/beta.html。URLで言語が決まっているので、端末の言語や
     ?lang= で上書きしない。題は最初から英語で書いてある。 */
  var lang = "en";
  document.documentElement.lang = lang;""",
    )
    page.sub('  if (lang === "en") document.title = "About the full beta — Stage Sketch";\n', "")
    if 'id="ja"' not in page.html or 'id="en"' not in page.html:
        raise SystemExit("！英語版beta: 本文の日英の塊（#ja / #en）が消えている")
    return page.done(japanese_head_markers=("製品版ベータについて", "舞台スケッチの製品版"))


def english_try(html: str) -> str:
    """体験版（try.html）から /en/try.html を作る。

    本文は本体（stage-sketch.js）が言語を切り替えるので触らない。meta とパスだけ直し、
    開いた時に英語で始まるように ?lang=en をURLへ足す。
    """
    page = EnglishPage(html, "try")
    page.sub('<html lang="ja">', '<html lang="en">')
    page.sub(
        """<!-- 検索・共有向けの説明とSNSカード（2026-09-05 第3弾）。
     ★JSで書き換えない。クローラーはJSを実行しないので、英語版は別URL /en/try.html
       として build_public.py が生成する。題は本体（stage-public.js）が開いた言語で
       書き換えるが、それは人が見る画面の話で、カードと検索結果はここが正。 -->""",
        GENERATED_NOTE.format(src="try.html"),
    )
    page.sub("<title>舞台スケッチ（体験版）</title>", f"<title>{EN_TRY_TITLE}</title>")
    page.sub(
        '<meta name="description" content="舞台スケッチの体験版。登録不要、ブラウザでそのまま'
        '試せます。舞台の立ち位置と動線を、客席からの正面図と真上の平面図で同時に描けます'
        '（演者3人・セット2つまで）。">',
        f'<meta name="description" content="{EN_TRY_DESC}">',
    )
    page.sub('<meta property="og:title" content="舞台スケッチ（体験版）— 登録不要でそのまま試せます">',
             f'<meta property="og:title" content="{EN_TRY_OG_TITLE}">')
    page.sub(
        '<meta property="og:description" content="舞台の立ち位置と動線を、客席からの正面図と'
        '真上の平面図で同時に描くツール。体験版は登録不要です。">',
        f'<meta property="og:description" content="{EN_TRY_OG_DESC}">',
    )
    page.english_card().self_url("/try", "/en/try").to_en_paths()

    # ★本体は ?lang= を見て開く言語を決める（stage-sketch.js の openLang）。
    #   /en/try.html はURLで英語と決まっているので、本体が読む前にURLへ足しておく。
    #   本体を書き換えずに済ませるため、ここで history.replaceState する。
    page.sub(
        "<script>\n/* 公開体験版には認証が無いので /whoami は存在しない。",
        """<script>
/* ★このページは /en/try.html。本体（stage-sketch.js）は ?lang= を見て開く言語を
   決めるので、本体が読む前にURLへ lang=en を足しておく。足さないと、端末が日本語の
   人には日本語で開いてしまい、英語のURLとして人に渡せない。 */
(function () {
  try {
    var url = new URL(location.href);
    if (url.searchParams.get("lang") !== "en") {
      url.searchParams.set("lang", "en");
      history.replaceState(null, "", url);
    }
  } catch (_) { /* 古い環境では諦める（本体が端末の言語で決める） */ }
})();
</script>
<script>
/* 公開体験版には認証が無いので /whoami は存在しない。""",
    )
    return page.done(japanese_head_markers=("舞台スケッチ（体験版）", "舞台スケッチの体験版"))


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
    #
    # 日本語版3枚（/ ・/try ・/beta）と、それぞれの英語版（/en/ 配下）を書き出す。
    # ★英語版は日本語版から meta だけ差し替えた生成物。本文HTMLは同じで、
    #   表示は各ページの仕組み（data-ja/data-en、#ja/#en、本体のi18n）が切り替える。
    en_dir = DIST / "en"
    en_dir.mkdir(exist_ok=True)
    pages = [
        # (日本語版の中身, 配信名, 英語版を作る関数, 説明)
        ((HERE / "public-lp" / "index.html").read_text(encoding="utf-8"),
         "index.html", english_lp, "LP本体（public-lp/index.html の写し）"),
        (OUT.read_text(encoding="utf-8"), "try.html", english_try, "体験版"),
        ((HERE / "public-beta.html").read_text(encoding="utf-8"),
         "beta.html", english_beta, "製品版ベータの紹介（public-beta.html の写し）"),
    ]
    en_pages = []
    for ja_html, name, to_english, note in pages:
        (DIST / name).write_text(ja_html, encoding="utf-8")
        copied.append(f"{name}（{note}）")
        en_html = to_english(ja_html)
        (en_dir / name).write_text(en_html, encoding="utf-8")
        copied.append(f"en/{name}（英語版・meta英語／本文は共通）")
        en_pages.append(en_html)

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
    # ★2026-09-05: 1200×630 の専用画像（public-lp/og/ から build_og.py で作る。
    #   日本語版と英語版の2枚）。配る全ページから拾うので、名指しの一覧を持たない。
    all_pages = [lp_html, OUT.read_text(encoding="utf-8"),
                 (HERE / "public-beta.html").read_text(encoding="utf-8")] + en_pages
    og_names = sorted({
        name
        for html in all_pages
        for name in re.findall(r'property="og:image" content="[^"]*?/media/([^"/]+)"', html)
    })
    if not og_names:
        raise SystemExit("！og:image が1つも無い（media/ 以下の絶対URLで書く）")
    for name in og_names:
        og_src = media / name
        if not og_src.exists():
            raise SystemExit(
                f"！og:image の画像がない: {og_src}"
                f"（~/.venvs/design-lint/bin/python public-lp/og/build_og.py で作る）"
            )
        shutil.copy2(og_src, DIST / "media" / name)
        copied.append(f"media/{name}（og:image）")
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

    # 見た目に要るアイコン
    for icon in ("icons/stage-sketch-192.png", "icons/stage-sketch-180.png"):
        put(icon)

    return copied


files = collect_dist()
print(f"配信フォルダ public-dist/ を作りました（{len(files)}件）")
for name in files:
    print(f"  - {name}")

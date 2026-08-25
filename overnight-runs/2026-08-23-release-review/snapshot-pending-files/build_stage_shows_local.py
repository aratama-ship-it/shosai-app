#!/usr/bin/env python3
"""個人用ショーの同梱データ（stage-shows.local.js）を、決まったフォルダの走査で作る。

stage-shows.local.js は .gitignore 済み（Cloudflareへだけ配信、公開リポジトリには
入れない）。舞台スケッチの起動時に window.SHOSAI_STAGE_LOCAL_SHOWS を読み、
ショー一覧へ自動で追加する（stage-sketch.js の syncLocalShows）。

一度もアプリ側で開いていないショーだけ、走査元の更新にあわせて自動で
新版へ差し替わる。開いた形跡があれば上書きしない（編集済みの手直しは残る）。

使い方:
    python3 build_stage_shows_local.py

2026-08-20 に「SOURCESへ手でパスを1行ずつ足す方式」をやめ、SCAN_GLOBS の
自動走査に変えた。**新しいショーのJSONを SCAN_GLOBS のフォルダへ置いて、この
スクリプトを再実行するだけでショー一覧へ出る。**リストへの追記は要らない。
stage-shows.local.js は手で編集しない（次回の実行で消える）。

拾う条件: project.id があり project.scenes が配列であること。
同じ project.id のファイルが複数あるときは更新日時がいちばん新しいものを採る
（どれを採ってどれを捨てたかは実行時に表示する）。
"""

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = HERE / "stage-shows.local.js"

# 走査するフォルダ。ROOT からの相対グロブで、前にあるものほど優先して並ぶ。
# exports/ と history/ は同じショーの版違いが大量に溜まる置き場なので入れない
# （projects/ がアプリ側の現在版）。
SCAN_GLOBS = [
    "jjk-show/*.json",
    "show-creation/*.json",
    "show-creation/**/*.json",
    "shosai-app/.stage-sketch-mcp/projects/*.json",
]

# 拾ってほしくない project.id と、その理由。
EXCLUDE_IDS = {
    "proj-msl3llrn-g84o": "1場だけの実験（無題のショー）",
    "vertical-line-v2": "『垂直線』の旧版。vertical-line-v3 を採用",
}

# ★同梱するショー（2026-08-20 決定）。
# ここに書いたものだけが stage-shows.local.js に入り、棚へ自動で並ぶ。
#
# 全部入れられない理由: 棚は localStorage に載っており、WebKit（＝Macアプリの
# WKWebView）の上限は約5MB。UTF-16で数えるので、JSONの文字数×2がその容量になる。
# 16件を入れると6.08MBに達し、上限超過で保存が例外になる。しかも
# stage-sketch.js の syncLocalShows は writeShows の戻り値を見ていないため、
# **エラーも出ないまま棚が増えない**（2026-08-20にMacアプリで実測して判明）。
#
# 同梱から外したショーも SCAN_GLOBS の走査対象からは外していない。全件の在処は
# 実行のたびに INVENTORY へ書き出すので、探し直さずに済む。棚に出したくなったら
# ここへidを足して再実行する（そのぶん容量に気をつけること）。
BUNDLE_IDS = [
    "seam-garden-60m-v1",    # 継ぎ目の庭 — 和とサーカス60分ストーリーショー
    "contours-pitch-v1",     # Contours — 地図にない高さ（ピッチ用）
    "side-quest-sample-v1",  # SIDE QUEST — 本編のないサーカス
    "contours-onering-v1",   # Contours ワンリング版（形式デモ）
]

# 同梱JSONの文字数の目安。見本2本(約217KB)と自作ショーの余地を残すための線引き。
# 超えても書き出しは止めないが、はっきり警告する（黙って通さない）。
BUNDLE_WARN_CHARS = 900 * 1024

# 走査で見つかった全ショーの目録。どこに何があるかをこれ1枚で引けるようにする。
INVENTORY = HERE / "SHOWS_INVENTORY.md"


def collect_paths():
    """SCAN_GLOBS の順を保ったまま、重複パスを除いて集める。"""
    paths = []
    seen = set()
    for pattern in SCAN_GLOBS:
        for path in sorted(ROOT.glob(pattern)):
            resolved = path.resolve()
            if resolved in seen or not path.is_file():
                continue
            seen.add(resolved)
            paths.append(path)
    return paths


def main():
    picked = {}   # project.id -> (path, doc, mtime)
    dropped = []  # 同じidで負けたほう
    excluded = []
    skipped = 0

    for path in collect_paths():
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            skipped += 1
            continue
        if not isinstance(doc, dict):
            skipped += 1
            continue
        project = doc.get("project")
        if not isinstance(project, dict) or not isinstance(project.get("scenes"), list):
            skipped += 1
            continue
        pid = project.get("id")
        if not pid:
            skipped += 1
            continue
        if pid in EXCLUDE_IDS:
            excluded.append((pid, path))
            continue

        mtime = path.stat().st_mtime
        current = picked.get(pid)
        if current is None:
            picked[pid] = (path, doc, mtime)
        elif mtime > current[2]:
            dropped.append((pid, current[0]))
            picked[pid] = (path, doc, mtime)
        else:
            dropped.append((pid, path))

    if not picked:
        raise SystemExit("ショーのJSONが1件も見つかりません。SCAN_GLOBS を確認してください")

    missing = [pid for pid in BUNDLE_IDS if pid not in picked]
    if missing:
        raise SystemExit(
            "BUNDLE_IDS のidが走査で見つかりません: " + ", ".join(missing)
            + "\n（JSONを消した・idを変えた場合は BUNDLE_IDS も直してください）"
        )

    # 同梱は BUNDLE_IDS に書いた順。棚での並びもこの順になる。
    docs = [picked[pid][1] for pid in BUNDLE_IDS]
    body = json.dumps(docs, ensure_ascii=False, indent=2)
    OUT.write_text(
        "/* 個人用ショーの同梱データ（自動生成・.gitignore済み）。\n"
        " * build_stage_shows_local.py が SCAN_GLOBS のフォルダを走査して作る。\n"
        " * 手で編集しない（次にこのスクリプトを実行すると上書きされる）。\n"
        " * ショーを足したいときは走査対象のフォルダへJSONを置いて再実行する。\n"
        " */\n"
        "window.SHOSAI_STAGE_LOCAL_SHOWS = " + body + ";\n",
        encoding="utf-8",
    )

    def describe(pid):
        path, doc, _mtime = picked[pid]
        project = doc.get("project") or {}
        return (
            project.get("title") or "(無題)",
            len(project.get("scenes") or []),
            len(json.dumps(doc, ensure_ascii=False)),
            path.relative_to(ROOT),
        )

    # 目録は同梱の有無にかかわらず全件。「どこにあるか」を引くための紙。
    lines = [
        "# 舞台スケッチ ショー目録（自動生成）",
        "",
        "`build_stage_shows_local.py` が実行のたびに書き出す。手で編集しない。",
        "同梱=○ のショーだけが棚へ自動で並ぶ（容量の都合。理由はスクリプト内の BUNDLE_IDS を参照）。",
        "同梱=− のショーもファイルは下記の場所にあり、「読み込む」から開ける。",
        "",
        "| 同梱 | id | タイトル | 場数 | 容量 | ファイル |",
        "|---|---|---|---|---|---|",
    ]
    for pid in sorted(picked, key=lambda p: (p not in BUNDLE_IDS, p)):
        title, scenes, chars, rel = describe(pid)
        mark = "○" if pid in BUNDLE_IDS else "−"
        lines.append(f"| {mark} | `{pid}` | {title} | {scenes} | {chars // 1024} KB | `{rel}` |")
    lines.append("")
    INVENTORY.write_text("\n".join(lines), encoding="utf-8")

    print(f"同梱 {len(docs)}件を書き出しました: {OUT}")
    print(f"目録 {len(picked)}件を書き出しました: {INVENTORY}\n")

    print("同梱（棚へ自動で並ぶ）:")
    for pid in BUNDLE_IDS:
        title, scenes, chars, rel = describe(pid)
        print(f"  ○ {pid:24} {title}（{scenes}場・{chars // 1024}KB）")
    total_chars = len(body)
    limit_mb = total_chars * 2 / 1048576
    print(f"\n  合計 {total_chars // 1024}KB（棚での容量はUTF-16で約{limit_mb:.2f}MB / 上限およそ5MB）")
    if total_chars > BUNDLE_WARN_CHARS:
        print("  ★警告: 同梱が大きすぎます。棚への保存が黙って失敗する恐れがあります。")
        print("        BUNDLE_IDS を減らしてください。")

    not_bundled = [pid for pid in picked if pid not in BUNDLE_IDS]
    if not_bundled:
        print(f"\n同梱しない（目録には載る・{len(not_bundled)}件）:")
        for pid in sorted(not_bundled):
            title, scenes, chars, rel = describe(pid)
            print(f"  − {pid:24} {title}（{scenes}場・{chars // 1024}KB） <- {rel}")

    if dropped:
        print("\n同じidの重複として不採用（新しいほうを採用）:")
        for pid, path in dropped:
            print(f"  {pid:24} <- {path.relative_to(ROOT)}")
    if excluded:
        print("\nEXCLUDE_IDS により除外:")
        for pid, path in excluded:
            print(f"  {pid:24} {EXCLUDE_IDS[pid]} <- {path.relative_to(ROOT)}")
    if skipped:
        print(f"\nショー形式でないJSON {skipped}件は読み飛ばしました")


if __name__ == "__main__":
    main()

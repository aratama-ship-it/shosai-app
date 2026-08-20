#!/usr/bin/env python3
"""個人用ショーの同梱データ（stage-shows.local.js）を SOURCES のJSONから作る。

stage-shows.local.js は .gitignore 済み（Cloudflareへだけ配信、公開リポジトリには
入れない）。舞台スケッチの起動時に window.SHOSAI_STAGE_LOCAL_SHOWS を読み、
ショー一覧へ自動で追加する（stage-sketch.js の syncLocalShows）。

一度もアプリ側で開いていないショーだけ、SOURCES 側の更新にあわせて自動で
新版へ差し替わる。開いた形跡があれば上書きしない（編集済みの手直しは残る）。

使い方:
    python3 build_stage_shows_local.py

SOURCES を直したら（ファイルを足す・減らす・中身を書き換える）このスクリプトを
再実行するだけでよい。stage-shows.local.js は手で編集しない（次回の実行で消える）。
"""

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = HERE / "stage-shows.local.js"

SOURCES = [
    ROOT / "jjk-show/demo-jjk0.json",
    ROOT / "jjk-show/demo-shibuya.json",
    ROOT / "jjk-show/demo-hyakki.json",
    ROOT / "jjk-show/demo-shimetsu.json",
    ROOT / "show-creation/demo-11works-2026-08-16/sketches/chart-voyage-v3.json",
    ROOT / "show-creation/demo-11works-2026-08-16/sketches/city-24h-v2.json",
    ROOT / "show-creation/demo-11works-2026-08-16/sketches/one-chair-v2.json",
    ROOT / "show-creation/demo-11works-2026-08-16/sketches/falling-practice-v2.json",
    ROOT / "show-creation/demo-11works-2026-08-16/sketches/rulebook-v2.json",
    ROOT / "show-creation/demo-11works-2026-08-16/sketches/vertical-line-v3.json",
    ROOT / "show-creation/demo-11works-2026-08-16/sketches/letters-unanswered-v3.json",
    ROOT / "show-creation/demo-11works-2026-08-16/sketches/standin-solo-v2.json",
    ROOT / "show-creation/継ぎ目の庭_舞台スケッチ_8セクション32シーン_v1.json",
]


def main():
    docs = []
    seen_ids = {}
    for path in SOURCES:
        if not path.exists():
            raise SystemExit(f"見つかりません: {path}")
        doc = json.loads(path.read_text(encoding="utf-8"))
        project = doc.get("project")
        if not isinstance(project, dict) or not isinstance(project.get("scenes"), list):
            raise SystemExit(f"{path}: project.scenes がありません")
        pid = project.get("id")
        if not pid:
            raise SystemExit(f"{path}: project.id がありません")
        if pid in seen_ids:
            raise SystemExit(f"{path}: id '{pid}' が {seen_ids[pid]} と重複しています")
        seen_ids[pid] = path
        docs.append(doc)

    body = json.dumps(docs, ensure_ascii=False, indent=2)
    OUT.write_text(
        "/* 個人用ショーの同梱データ（自動生成・.gitignore済み）。\n"
        " * build_stage_shows_local.py が SOURCES のJSONから作る。手で編集しない\n"
        " * （次にこのスクリプトを実行すると上書きされる）。\n"
        " * 生成元のJSONを直したら、このスクリプトを再実行して作り直すこと。\n"
        " */\n"
        "window.SHOSAI_STAGE_LOCAL_SHOWS = " + body + ";\n",
        encoding="utf-8",
    )
    print(f"{len(docs)}件を書き出しました: {OUT}")


if __name__ == "__main__":
    main()

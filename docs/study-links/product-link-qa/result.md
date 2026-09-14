Stage Sketch Viewer 上部の製品案内リンク — 2026-09-10

上部の言語切替と並べて「舞台スケッチ製品版について」を追加。既存の公開案内 /beta または /en/beta を別タブで開く。本家の書体・色・SVG表現を継承。

- Node: tests/*.test.mjs 877/877成功。
- 構文: stage-study-viewer.js / stage-study-owner.js / stage-sw.js 成功。
- build_stage.py --check: stage.html・study-frame.htmlと正本一致。
- build_public.py --check: public-distと正本一致。
- git diff --check: 成功。
- 実ブラウザ: 日英×320/390/768/844/1440px幅、重なり・横はみ出しなし。44px操作域、SVG、キーボードの2pxフォーカスを確認。
- 日英の公開案内が別タブで表示されること、Refererなし・openerなし、元のViewer URL・端末保存・メモが変わらないことを確認。
- design-lint: 390×844・1440×900、NG0/WARN0/測定不可0、最小コントラスト4.91:1。
- iPhone/iPad実機は未確認。
- 保存・認可方式の変更、Cloudflare設定・migration追加なし。Worker実ランタイムテストは今回再実行していない。
- デプロイ・公開・commit・push・メモ送信は実施していない。
- 開始時の1835ファイル中、今回対象13ファイルのみ変更、1822ファイル不変、欠落0。対象の既存差分も保持。

変更ファイル: study.html / stage-study-viewer.js / stage-study.css / stage-study-owner.js / index.html / build_study.py / stage-sw.js / stage.html（生成）/ study-frame.html（生成）/ tests/study-links.test.mjs / tests/stage-manual-help.test.mjs / tests/stage-session-shelve.test.mjs / design/TOKEN_SHEET_study-links_2026-09-09.md。関連する参照版・キャッシュ版を同期。

[ローカル確認画面](http://127.0.0.1:8802/study?lang=ja#a0ec8f4b764141f11ee0b14b579cd41cfcb18c5ea5e3fa9a)

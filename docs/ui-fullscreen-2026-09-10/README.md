# 全画面表示のUI確認

2026-09-10。上部の「プレゼン」を「全画面」に改称。Fキーで全画面を切り替える。

- 自動テスト: `unit-tests.log`（112件通過）。`build_stage.py --check`でstage.html / study-frame.htmlと正本が一致。
- ブラウザ確認: `browser-check.json`（Chrome、独立した保存領域、Service Workerを無効化）。4言語、タブレット1024×768・768×1024、全画面APIの非対応と拒否を確認。
- キーの抑止: 入力欄4種、IME、反復、修飾キー、設定ダイアログ、機能OFF、非表示、利用不可、ゲスト。
- 選択中の駒: `selected-piece-check.json`。全画面中のDeleteは駒を削除せず、矢印はシーンを切り替え、シーン内容は変わらない。
- スクリーンショット: `desktop-ja.png`、`desktop-ja-fullscreen.png`、`settings-ja.png`と各言語・タブレットのPNG。

検証はローカルのChrome上。Safari・物理タブレットの検証および公開反映は含まない。

確認ページ: http://127.0.0.1:8847/stage.html?lang=ja&verify=fullscreen-20260910

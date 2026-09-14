# 裏方・人物別予定・転換時間：設計資料の確認

2026-09-09。対象はpeople-time-2026-09-09.htmlとPEOPLE_TIME_PLAN_2026-09-09.md。人物予定や所要警告の機能は未実装。

- 本人の担当交代試作への了承と、後の実装要件を記録した。
- Claude Code Fableが提示仕様を読み取り限定レビュー。success、permission_denialsなし。人物の対応、個人予定の入力元、時間基準、担当の空きの前提、余裕0秒の分類をAstraが統合した。Fableは最終HTMLや製品コードを検証していない。
- 台本キュー側と、名前付き担当枠と実在人物の区別を照合。担当枠を一律に人へ変換せず、区間ごとの対応と未対応を残す。共同の保存schemaは未確定。
- ローカルHTTP 200とHTMLのSHA-256一致。資料のローカルリンク3種類もHTTP 200。
- Chromiumの1280×1000 / 390×844で本文の横はみ出しと実行エラーなし。PC・携帯の冒頭と比較図を目視し、締切線の可読性、日付と確認語句の折返しを調整した。フルページ画像も保存。
- design-lintの390×844 / 1440×900: NG 0、WARN 0、測定不可0。最小測定コントラスト5.03:1。
- 比較図は架空の入力例。8+6+4=18秒、枠12秒との差6秒、独立した10秒作業と並行ならmax(18,10)=18秒。設置方法や実所要を測定した値ではない。
- baseline.jsonの製品ファイル11件、およびhandoff-trial-artifact-hashes.jsonの承認済み試作HTML/UI/core 3件はSHA-256一致。今回の更新は設計資料だけで、製品のビルド・公開・保存変更は行っていない。

証拠: people-time-page-checks-2026-09-09.json、people-time-design-lint-2026-09-09/report.md、people-time-{desktop,mobile,diagram}-2026-09-09.png、people-time-claude-review.md、people-time-claude-status.json。

予定の競合判定・時間不足警告・共通人物への移行は将来の受け入れ条件であり、今回の画面確認や既存試作の20+30項目の検証に含まれない。実機・現場の所要や運用は今回確認していない。

確認入口: http://127.0.0.1:8936/people-time-2026-09-09.html

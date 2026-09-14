# システム監査 夜間実装台帳
## Objective
2026-09-09監査の発注を本人指定の段順で実装する。段0不一致で停止する。
## Scope
対象はshosai-app。現時点ではdocs/system-audit-2026-09-09内の報告と証跡だけを書き込む。
## Definition of Done
本人指定の各段の数値条件と最終checkを満たす。未達の際は停止理由と実測を報告する。
## Allowed Actions
ローカル読取・検査・報告。実装と限定コミットは段0一致後のみ。空欄は本人指定の推奨値。
## Prohibited Actions
push、deploy、Cloudflare操作、削除、移動、gc、README差し替え、実機操作、未指定小修正。
## Stop Conditions
段0状態不一致、パッチ不適用、範囲外のテスト失敗、数値条件不達、削除・移動・deployの必要。
## Team
メイン1名で順次確認。サブエージェントなし。他セッションの停止は未確認。
## Verification
草案check、git diffとstatus、既存ファイルSHA-256、最終台帳検査。段0失敗後の製品実装なし。

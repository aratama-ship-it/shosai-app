# 既存GitHub照明テスターへの案B導入結果

公開コミット: 19a6a8eca8b7767071d80400441070189253d5bf
URL: https://aratama-ship-it.github.io/shosai-app/docs/light-rig-design-2026-09-11/prototype/

Pages built。変更6ファイルと変更なしランタイム4ファイルの実配信SHA-256一致。公開の通常入口で案Bもや欄・固定帯/実寸切替を確認。既存ユーザーの保存データを操作せず、検証は隔離ブラウザーの使い捨てデータ。舞台スケッチβ版への導入は行っていない。

- 関連単体47 pass。evidence/unit-tests.tap。
- 新旧描画比較・cue保存/Undo: evidence/results.json。床・壁だけの全5図（選択あり/なし）一致。
- 旧版UI保存から新テスターへの移行、ファイル往復、導入前控えと旧版復帰: evidence/compatibility.json。
- 不正なファイル、描画例外、保存破損、容量不足: evidence/storage.json。
- 平面/側面距離ドラッグ: evidence/interaction.json。
- 操作中の描画精度とpointerup/blur復帰: evidence/quality.json。

初回書込前の控えは shosai.lightDesigns.beforeOptionB.v1（JSON配列）。復旧が必要な場合はこの控えの各要素を.lightdesign.jsonとして読み込める。キー削除や自動ロールバックは行わない。

共有ツリーの選択灯の型の追加は保全。公開はcandidate/の固定3ファイルだけを対応するprototype/パスへ載せ、未公開の別機能は混ぜていない。次回その機能を公開するときは、prototype/に保持した案B導入済み内容を基準にする。

未確定: 固定帯/実寸の最終採否、床壁のみの側面明度統一（現状Q2優先）、リム第2段階。Safariで長時間の操作感は未確認。

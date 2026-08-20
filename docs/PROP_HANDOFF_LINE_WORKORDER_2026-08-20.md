# 発注書：平面図に小道具の受け渡し線を引く 2026-08-20

Claudeが仕様を決め、Codexが実装し、Claudeが検証する。この文書だけで着手できるように書く。
前提: 小道具の見取り（PROPS_PLOT_WORKORDER）実装済み。現在 stage-sketch v262・CACHE v93。

## 背景（本人が承認した提案・2026-08-20）

受け渡し（前のシーンで持っていた人 → このシーンで持っている人）が起きるとき、
**平面図でその2人を線で結ぶ**。転換の立ち位置設計（誰が誰に会いに行くか）に使う。

## 既存の仕組み（ここに乗せる）

- `drawRoutes(target, L, showSelection)`（stage-sketch.js ~6895行）: 平面図の動線描画。
  入り・はけの点線ヘルパー `transit(a, b, color)` の前例がある。
- 位置は `place(pieceU(piece), pieceV(piece), L)`。`pieceU/pieceV` は転換アニメ中の
  `animU/animV` を拾うので、**アニメ中も2人の点に線が付いてくる**。
- 受け渡しの判定は props-plot の既存関数（`propPlotState` ほか）を再利用する。
  判定を二重に書かない。
- 表示スイッチは既存の `state.showRoutesCast`（平面の「演者動線」チェック）に連動。
  新しいスイッチは作らない。

## やること

1. `propHandoffPairs(scene)` を追加: 直前の scene 行と比べ、**両シーンとも held で
   持ち手（holderKey）が違う**小道具について
   `{ prop, fromPiece, toPiece }` を返す。
   - `toPiece` = このシーンで持っている演者の駒（`heldBy` から引く）
   - `fromPiece` = 前のシーンの持ち手を castId でこのシーンの駒に引き直す。
     castId が無い持ち手は originId→id の対応で探し、見つからなければその組は出さない
     （はけた人からの受け渡しは香盤表が伝えるので、線は無理に引かない）。
2. `drawRoutes` の中（入り・はけの後）で、平面図かつ `state.showRoutesCast` のとき
   各組に線を描く:
   - 2点は `place(pieceU(piece), pieceV(piece), L)`（transit と同じ流儀）
   - **小道具の登録色**（`prop.color`）の破線。`setLineDash([3, 5])`、`lineWidth 2`、
     透明度は rgba(color, 0.55) 程度。入り・はけの線（dash [5,6]・2.6px）と見分けが付くこと
   - 受け取る側の端に**小さめの矢じり**（transit の 13px より小さい 9px）
   - 両端とも駒の円に少し食い込まないよう、transit と同様に端を数px空ける
   - 線の中点近くに、`state.showSetNames`（装置名チェック）がONのときだけ
     小道具名を小さく（11px・小道具の色）出す
3. 2人が同じ場所に居るなど線が短すぎるとき（transit の `len < gap * 2` と同じ発想）は描かない。
4. 正面図・3Dには出さない（平面図だけ）。
5. テスト `tests/stage-props-plot.test.mjs` へ追記（新規ファイルでもよい）:
   - `propHandoffPairs` があり、propPlotState を再利用している
   - drawRoutes 内で showRoutesCast に連動して受け渡し線を描いている
6. 版上げ: `stage-sketch.js?v=263`（index.html と stage-sw.js）、
   `CACHE_NAME` → `stage-sketch-pwa-v94`。版ピンのテスト期待値更新。
   `python3 build_stage.py` 再生成。既存テスト全部が通る。
   新しい表示文言は無い（小道具名をそのまま出すだけ）ので i18n 追加は不要のはずだが、
   `stage-i18n-coverage.test.mjs` が落ちないことは確認する。

## 制約（必ず守る）

- ファイルの削除・移動・改名はしない。`*_backup_*` に触らない。
- 既存ファイルは編集前に必ず該当箇所を読む（iCloud共有ワークスペース）。
- 関係ないコードのリファクタ・整形をしない。既存の動線・入りはけ・交差警告を壊さない。
- コメントは既存の流儀（日本語で「なぜ」）に合わせる。

# 発注書 WO-B1: stage-sketch.js の分割（第1段＝体モデル）（2026-09-09・B-2 完了後に着手）

最初に `AGENTS.md`（`claude code files/AGENTS.md`）を読むこと。対象 `shosai-app/stage-sketch.js`（22,728行）。

## 事実（依存マップ `B1_split_dependency_map.md`・2026-09-09 機械抽出）

| 候補 | 行数 | ブロック外のトップレベル識別子への参照 | 所見 |
|---|---|---|---|
| (a) 会場描画 `drawFrontVenue`/`drawPlanVenue`/`drawStage` | 920 | **63** | 描画ヘルパー・`state`・`layout`・`canvas`/`ctx` に広く依存。最初に切ると文脈オブジェクトが肥大する |
| (b) スマホ／iPad作業面 | 464 | 46 | UI組み立て系。`els`・`render`・`persistSoon` 等に依存 |
| (c) 印刷・ピッチ書き出し | 287 | 50 | 既に `SHOSAI_STAGE_PITCH_EXPORT_MODEL` がある |
| **(d) 体モデル** `pieceParts`/`buildRig`/`drawPerformer`/`poseExtent` | 443 | **23** | **最も結合が弱い。** 既に `window.SHOSAI_STAGE_BODY` で FPV へ貸し出している |

監査時の「(a) は結合が低い」という見立ては依存マップで否定された。**第1段は (d)** にする。

## 仕様（第1段・体モデル）

1. 新ファイル `stage-body.js`（IIFE、`"use strict"`）。中身: `poseExtent`、`buildRig`、`pieceParts`、`drawPerformer`、
   これらだけが使う定数（`NECK_RINGS`、`TORSO_RINGS`、`CHAIR_W`、`CHAIR_D` を含む。MakeHuman 実測由来の断面定数は**数値を1つも変えない**。
   正本は `tools/measure_makehuman_body.py`）。
2. 外部から受け取るもの（23個）は、`window.SHOSAI_STAGE_BODY.install(deps)` の形で **stage-sketch.js から注入**する
   （`clamp`/`finite`/`rgba`/`restore`/`cross3`/`norm3`/`drawSolid`/`paintBody`/`torsoOutline`/`performerRig`/`pieceDims`/`pieceSet`/`poseById`/
   `resolveLook`/`scaledPropShape`/`mountKindOf`/`stageModel`/`state`/`H`）。`state` は参照渡し。グローバルを新たに増やさない。
3. `stage-sketch.js` 側は関数本体を削り、`const { poseExtent, buildRig, pieceParts, drawPerformer } = window.SHOSAI_STAGE_BODY.install({...})` に置き換える。
   **既存の `window.SHOSAI_STAGE_BODY` の公開面（FPV が使う `pose`/`sections`/描画ヘルパー）は名前・引数とも維持**する。
4. `stage-body.js` は index.html で `stage-sketch.js` の**直前**に読む（B-2 で生成器ができていれば stage.html／APP_SHELL は自動）。
   `worker.js` の `GUEST_STAGE_ASSETS` と `build_public.py` の判断（体験版にも要る＝外さない）を手で足す。
5. 版上げは編集完了後に一括。

## 受け入れ条件（決定論・描画の同一性）

- 既存テスト全件緑（`stage-first-person`／`stage-prop-holding`／`stage-pose-strip`／`stage-avatar-look` など体モデル依存を含む）。
- **描画の同一性**: `tests/stage-canvas-resolution.test.mjs` の流儀で、分割前後の `stage-sketch.js` に同じショー（`stage-samples/` の見本と
  `.stage-sketch-mcp/projects/seam-garden-60m-v1.json`）を描かせ、`canvas.toDataURL()` のハッシュが**一致**すること。
  一致しない場合は原因を特定して報告（丸め・描画順のずれを許容しない）。
- `tools/check-object-on-performer.mjs`（毎日4:10の走査）が分割後も動くこと。
- 完了報告には「切り出した行数」「注入した依存の数」「同一性ハッシュ」を書く。

## 第2段以降（別発注・今回は着手しない）

(c) 印刷・ピッチ書き出し → (b) スマホ／iPad作業面 → (a) 会場描画。各段で依存マップを取り直す
（`docs/system-audit-2026-09-09/B1_split_dependency_map.md` を作ったスクリプトはこの文書の同フォルダの監査ログにある）。

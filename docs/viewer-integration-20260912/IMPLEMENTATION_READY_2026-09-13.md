# 舞台スケッチ本体「演者用リンク」入口 — 実装直前引き継ぎ

更新: 2026-09-12 JST

## 状態

- ローカルUI確認: 本人確認済み（「よさそう」）
- 本体実装: 未着手
- β版・製品版への公開: 未実施
- 明日の作業: 2026-09-13に本体へ統合し、検証後に公開判断を分ける

この資料は「実装の直前」までを固定する。ローカル確認用のAPI fixture、loader、「入口案」札は製品へ入れない。

## 採用した構造

```text
舞台スケッチ本体の上部操作
├─ 共有                 既存。会議用＋従来の演者事前学習欄
└─ 演者用リンク         新しい明示入口
   └─ 既存の共有モーダルを演者用モードで開く
      └─ 既存 .stage-share-study / #stage-share-study-action
         ├─ 現在のショーからリンクを発行
         ├─ リンクをコピー
         ├─ 閲覧画面を開く
         ├─ 公開内容を更新
         └─ フィードバック・無効化・保存済みリンク
```

新しい発行機構やデータ形式は作らない。すでにある `stage-study-owner.js` とオーナーAPIを、見つけやすい専用入口から再利用する。

## 正本と変更対象

1. `index.html`
   - `#stage-share-open` の直後へ `#stage-viewer-link-open` を追加する。
   - ラベルは日本語「演者用リンク」、英語はJSで「Performer link」。
   - `aria-haspopup="dialog"` と `aria-controls="stage-session-panel"` を付ける。
   - `stage.html` は直接編集しない。
2. `stage-study-owner.js`
   - 新入口のクリックを既存 `#stage-share-open` へ委譲する。
   - 演者用モード中だけ `#stage-session-panel` にクラスを付け、題を「演者用リンク」、区画見出しを「演者用ビューアーのリンク」へ変える。
   - 通常の「共有」から開いた場合は必ず従来表示へ戻す。
   - 言語変更時も現在のモードを保ったまま日英を更新する。
   - `body.stage-session-guest` では入口を出さない。
3. `stage-study.css`
   - 入口に既存Viewerの水色を使う。製品では「入口案」札を入れない。
   - 演者用モード中だけ `.stage-share-panel-hint` と `.stage-share-live` を隠す。
   - `.stage-share-study`、発行・更新・メモ管理の既存寸法は変えない。
   - 案内文は「演者がショーの動きを確認するためのViewerのリンクです。」とし、その直後に閲覧リンク・コピー・Viewerを開く操作を置く。
   - 公開時点・共有範囲・保存上限などの説明は一つの閉じたアコーディオンへまとめ、オーナー管理項目の末尾に置く。
4. `tests/study-links.test.mjs`
   - `index.html` に専用入口があり、既存「共有」の直後であること。
   - 専用入口が既存共有ボタンを呼び、別の発行APIを作っていないこと。
   - 通常共有への復帰、ゲスト時非表示、日英ラベル、44px操作を検査する。
5. 生成・キャッシュ
   - `python3 build_stage.py` で `stage.html` を再生成する。
   - `stage-study-owner.js` と `stage-study.css` のクエリ版を1つ上げ、`index.html` と `stage-sw.js` を一致させる。
   - `stage-sw.js` の `CACHE_NAME` は作業開始時の現在値から1つ上げる。古い計画値を固定で使わない。

## 実装へ移す元

- DOM接続の動作見本: `docs/viewer-integration-20260912/actual-stage-ui.inject.js`
- 入口と専用モードのCSS見本: `docs/viewer-integration-20260912/actual-stage-ui.inject.css`
- API fixture: `docs/viewer-integration-20260912/actual-stage-ui.mock.js`（ローカル専用。製品へ移さない）
- 本体ローダー: `docs/viewer-integration-20260912/actual-stage-ui.html`（ローカル専用。製品へ移さない）
- デザイントークン: `design/TOKEN_SHEET_study-links_2026-09-09.md`

## 2026-09-12時点の基準

共有ワークツリーは多数の変更を含む。明日、以下のSHA-256が1つでも違えば、そのファイルを読み直して挿入位置を組み直す。古い差分を機械的に当てない。

```text
index.html              94e7187ce73359060f070468b1c7a2d29ee24c6bc6844057f3d1e7deacf121f8
stage.html              3f4af41a4bb9220326aadddaa02ed79327cd462a74d1b9543164727c16b439f3
stage-study-owner.js    abdb616bc87ffc9636662d4cb26194cdde609d3cc54c8a8c8af02ae75ca8ad7e
stage-study.css         e586a8241849721040c27f60bbd358cd7f633cd9c9ab7fec47eda6e9bf16ab9f
stage-session.js        ad094c6d7debf3a7fdf5bbf8f51a97934380aec924645bd6c41e2d806fef9559
build_stage.py          c1599b540f83f2029e5923b05d605e7dd57675ebded6f83872da30c1bbc4ea02
tests/study-links.test  43f20d2bc691039c2e131a170da178821343af03cfee2e8492b2d1f3c4dab058
```

基準時点で `python3 build_stage.py --check` は成功し、`stage.html は index.html と揃っています`。

## 明日の検証順

1. 上の基準と `git status --short` を再取得し、外部変更を確認する。
2. トークンシートを読み直し、正本3ファイルとテストだけを編集する。
3. `python3 build_stage.py`、続けて `python3 build_stage.py --check`。
4. `node --check stage-study-owner.js`。
5. `node --test tests/study-links.test.mjs tests/stage-session-resume.test.mjs tests/stage-pwa.test.mjs tests/stage-pwa-offline-warm.test.mjs`。
6. ローカルで通常「共有」と「演者用リンク」を交互に開き、モードが混ざらないことを確認する。
7. 390×844、844×390、768×1024、1440×900で入口・モーダル・44px操作を確認する。
8. オーナーで発行・コピー・Viewerを開く・更新を確認し、ゲストでは入口が無いことを確認する。
9. ここまでをローカル完了とし、β版公開は別の明示判断として止める。

## 完了条件

- 舞台スケッチ本体の右上に「演者用リンク」がある。
- 既存「共有」は壊れず、演者用入口だけを使うと会議用区画が出ない。
- 案内文の直後に閲覧リンクがあり、補足説明がパネル最下部の折りたたみにまとまっている。
- 発行先はStage Sketch Viewerで、舞台スケッチ本体の編集権限を渡さない。
- iPhone縦横・iPad・PCで入口が画面外へ隠れない。
- テスト、生成一致、PWAキャッシュ版一致が通る。
- 公開していない状態を報告で明示できる。

# ワークオーダー: カスタム会場の正面図（近似）— 2026-08-12 夜間仕込み

- 状態: **完了（2026-08-12夜。Codex実装・Claude検証済み）**
- 担当: Claude（夜間仕込みセッション、MBP）。実装はCodexへ委譲し、Claudeが検証する。
- 根拠仕様: `show-creative-ideas/docs/venue/2026-08-08_会場エディタ_方式.md` 4章／venue-v2仕様6章（133行の方針）
- HANDOFF: `show-creative-ideas/docs/venue/HANDOFF_venue.md` 4章の残り2「カスタム会場の正面図」

## 目的

カスタム会場（venue-v2）を選んだとき、正面図が現状「プリセット5席の擬似パースが黙って流用される」状態を、
仕様どおり **「観客領域から代表点を3つ自動で取り、既存 `SEATS` の擬似パース値のうち距離が近いものを流用し、
画面に『近似』と明示する」** に変える。

## 編集対象ファイル（この範囲以外は触らない）

| ファイル | 変更 |
|---|---|
| `stage-venue-lines.js` | 幾何ヘルパのexport追加＋`approxFrontSeats()` 新設 |
| `stage-sketch.js` | `layout()` の席解決フック＋席リストUIの差し替え＋近似バッジ制御 |
| `index.html`（正本） | 近似バッジ要素1つ＋`?v=`上げ → `python3 build_stage.py` で stage.html 再生成 |
| `stage-i18n.js` | 新規文言のTEXT追加 |
| `stage-sw.js` | `?v=`上げ＋`CACHE_NAME` v56→v57 |
| `tests/stage-venue-frontview.test.mjs` | 新規テスト |

**やらないこと**: SEATS 5席の値変更／プリセット5会場の値変更（`venue-baseline.json` ガードあり）／
擬似パースの一般化（venue-v2仕様133行「当面プリセット5席のまま」）／app.js・style.cssの変更。

## 設計（確定済み・変えない）

### 1. 代表点3つの取り方（`stage-venue-lines.js` に `approxFrontSeats(venue, seats)` を新設）

- 入力: venue-v2オブジェクト（`floor.outline`＝メートル座標のポリゴン、`audience[]`＝`{polygon, mode, eyeM}`）と `SHOSAI_VENUES.seats`。
- 各観客領域について、**頂点＋重心**をサンプル点とし、各点から `floor.outline` 境界までの距離を
  既存 `distancePointToPolygonBoundary` で取る。全領域のサンプル点を距離順に並べ、
  **最小（一番近い）／中央値（中間）／最大（一番遠い）** の3点を代表点とする。
- 観客領域が0件なら空配列を返す（呼び出し側で `center` フォールバック）。
- 各代表点→席のマッチング:
  - 第1軸: 距離 d と `SEATS[].eye`（3/8/11/15/18m）の差が最小のもの。ただし `balcony` は除外
    （venue-v2に高さ情報が無いため。`side` は第2軸で決めるので第1軸からも除外）。
  - 第2軸: 代表点のx座標が、`floor.outline` のバウンディングボックス中心から
    **幅の25%以上** 左右に外れていたら `side` を採用。右側の場合は `shift` の符号を反転した
    コピーを返す（`SEATS` 本体は変更しない）。
- 返り値: 最大3件の擬似席 `{ id: "approx-near"|"approx-mid"|"approx-far", label, short, note,
  approx: true, base: <流用元id>, ...流用した擬似パース値 }`。labelは「近い（近似）」「中間（近似）」「遠い（近似）」。
- `closestFrontSegment` と `polygonCentroid` を `window.SHOSAI_VENUE_LINES` へexport追加
  （`approxFrontSeats` も同様にexport）。既存exportは削除しない。

### 2. `stage-sketch.js` の席解決（layout() の正面図分岐、現3463行付近）

- `VENUES.seatById(state.seat)` の直接呼び出しを、custom会場対応の解決関数に置き換える:
  - `venue().custom` かつ `venue().venueV2` があるとき: `SHOSAI_VENUE_LINES.approxFrontSeats()` の結果から
    `state.seat` に一致するidを探す。無ければ**近似席の先頭**（approx-near）、それも無ければ `VENUES.seatById("center")`。
  - 計算は毎フレームやらない。会場idをキーに1件だけメモ化し、会場が変わったら再計算。
- 席リストUI（`renderVenueControls` 内、現13003行付近）: custom会場のときは5席の代わりに近似席（最大3件）を列挙。
  ボタンのラベルに（近似）が含まれるので既存classのままでよい。
- 近似バッジ: `index.html` の正面図キャプション（`stage-front-caption`）の隣に
  `<p class="stage-profile-hint" id="stage-front-approx" hidden></p>` を追加し、
  custom会場かつ正面図表示のとき `hidden=false`・`textContent = tx("客席からの見え方は近似です")`。
  制御は `stage-venue-missing`（現12917行付近）と同じパターン。
- `drawSeatMap` の小図はcustom会場では出さない（`audience === "front"` でも `v.custom` なら非表示。
  プリセット席のplan座標は無意味なため）。

### 3. i18n（`stage-i18n.js` TEXT）

追加キー: 「近い（近似）」「中間（近似）」「遠い（近似）」「客席からの見え方は近似です」
→ "Near (approx.)" / "Middle (approx.)" / "Far (approx.)" / "Front view is an approximation"

### 4. テスト（`tests/stage-venue-frontview.test.mjs` 新規）

機能テスト（`stage-venue-lines.js` をNodeで読み込む既存パターンは `tests/stage-venue-lines.test.mjs` 参照）:
1. 矩形10×8mの部屋・手前1辺に深さ2mの観客帯 → 近似席が1件以上返り、nearの `base` が `front` または `center`
2. 観客帯を部屋の左辺に置く → `side` が選ばれ、`shift` の符号が座標に応じて正しい
3. 観客領域0件 → 空配列
4. 返り値の席が `approx: true` を持ち、流用元 `SEATS` の値と数値が一致する（balcony非選出も確認）
5. `SEATS` 本体が変異していないこと（呼び出し前後で `JSON.stringify` 一致）

構造テスト（文字列検証。`tests/stage-import-workspace.test.mjs` の方式）:
6. `index.html`・`stage.html` に `stage-front-approx` が存在
7. `stage-sketch.js` に approxFrontSeats の参照が存在
8. `stage-i18n.js` に上記4キーが存在

### 5. 版上げ（最後にまとめて。作業時点の現在値を必ず再確認してから）

- 変更したJS全ての `?v=` を `index.html` と `stage-sw.js` の両方で+1
- `CACHE_NAME` を+1（作業開始時点: v56）
- `python3 build_stage.py` で stage.html 再生成
- `node --test "tests/*.test.mjs"` 全パス（作業開始時点: 206件。減っていたら何か壊している）

## 完了条件

1. テスト全パス（206件＋新規分）
2. ブラウザ実測（Claude実施）: カスタム会場を選ぶ→正面図に「近似」バッジ・席リストが近似3席になる／
   プリセット会場では従来どおり5席・バッジ非表示
3. `venue-baseline.json` ガードのテストが通っている（プリセット不変）
4. git commit/pushは**しない**（履歴分岐の未解決問題があるため。本人の確認後）

## 記録

- 開始: 2026-08-12 夕（このセッション）
- Codex実装: 2弾に分割して完了（gpt-5.5。既定モデルgpt-5.6-solはCLI 0.142.3でエラーになるため `-m gpt-5.5` 必須）
- Claude検証: 完了。①テスト218件全パス（新規8件含む）②ブラウザ実測=カスタム会場で近似3席・バッジ表示・
  プリセット復帰で5席・バッジ非表示・右側観客でshift+0.28反転・?lang=enで英語表示・コンソールエラー0
- Claude追加修正: メモ化キーを会場idのみ→id＋観客領域＋床輪郭の内容へ変更（同一idで編集し直したとき
  古い近似が残るバグの予防）／`tests/stage-venue-library.test.mjs` の版ピン留めをv4/v231/CACHE v57へ更新
- 版上げ: lines v4 / sketch v231 / i18n v46 / CACHE v57（index.html・stage.html・stage-sw.jsの3点一致を確認）
- commit/pushは未実施（git履歴分岐の未解決問題のため。本人確認待ち）

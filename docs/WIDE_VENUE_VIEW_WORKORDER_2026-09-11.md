# 発注書：正面図の「引いた絵」 S1〜S3（会場の器・本体に触らない範囲） 2026-09-11

判断の正本（読むこと）: `_reviews/2026-09-11_stagesketch-wide-venue-view/index.html`
（ワークスペース直下の `_reviews/`。W1〜W4は本人承認済み・W5＝本体へいつ触るかは未回答）

## この発注で作るもの・作らないもの

ドーム／アリーナ／野外フェスのように**舞台は小さく会場が大きい**場合の「引いた絵」を、正面図へ足す。
本発注は**本体 `stage-sketch.js` と `index.html` に一切触らない範囲（S1〜S3）**に限る。

- 作る: ①器の幾何（純関数・テスト付き） ②`bowl` 付きの会場プリセット3種と席の導出 ③器の描画モジュール
- 作らない: 本体への接続（S4）、到達性の帯のUI（S5）、版上げ（S6）、実名会場（武道館・東京ドーム）
- **`layout()` の式は変えない。** 導出した席は既存の席と同じ形のオブジェクトを返すので、式を変える必要がない

## 本人が承認済みの設計判断（動かさない）

- **W1** 引きの絵でも演者は実寸のまま小さく描く（120m先＝約16px）。最小サイズ床は作らない。
  見やすさのための拡大は「選択中の駒に細い環を重ねる」別レイヤーで解く
- **W2** 第1弾は汎用3種（アリーナ／ドーム／野外フェス）。寸法は仮とし `confidence: "unverified"` を付け、
  画面にもバッジを出す。実名会場は第2弾で公式図面から
- **W3** 「前に客がいる」遮蔽の既定ONは**平土間・立ち見の席だけ**。段のあるスタンド席は既定OFF
- **W4** 席の切り替えは既存の席チップの並びに足す。各チップに距離バッジ（整数＋m）

## 前提として確かめ済みの事実（再調査不要）

- 正面図の尺は `min(間口が収まる値, 舞台高が収まる値)`。プリセット80通りの実算で決め手は54件が高さ側。
  舞台は画面の42〜175%を占め、**客席までの距離は尺にまったく効いていない**
- `seat.frontW` は絶対値ではなく画面幅に対する倍率。小さくすれば舞台は小さく描ける
- 透視の式 `span = 1 + depth/d` と既存表の一致は −26%〜+97%。**だから既存5席を導出式で置き換えない**
- 既存の見え方が変わっていないかは `node tools/check-front-seat-derivation.mjs --check`（基準80件）で確かめる。
  **S1〜S3の各段の最後に必ず流すこと。** 落ちたら既存の絵を壊している
- カスタム会場の近似席は `nearestSeatByEye` が既存席へ丸める。候補の最大は eye=15m

## S1: 器の幾何（`stage-venue-lines.js` に追加・純関数）

`window.SHOSAI_VENUE_LINES` へ次を足す。DOMに触れない。既存の関数・戻り値は変えない。

```
deriveSeat({ id, label, distanceM, eyeM, offsetM, depthM, heightM, fovDeg, mode })
  → 既存 SEATS と同じ形 { id,label,short,note,eye,plan,floorY,bottomY,backW,frontW,shift,rise,apron,derived:true }
bowlTiers(bowl, { stageWidthM, stageDepthM })
  → [{ id, fromM, toM, floorM, rows:[{ distanceM, floorM, eyeM }], mode }]
occlusionFloorM({ eyeM, aheadM, rowPitchM, distanceM, stageHeightM })
  → { floorM, basis:"eye"|"head" }   前の客で隠れる下端（舞台床から）
riserForConstantC({ cMm, rowPitchM, focusM, startFloorM, rows }) → [蹴上げ(m)]
```

数式（判断HTMLの5章。W=画の幅px、H=720、BASE_H=720）:

- 尺 `pxPerM = W / (2·distanceM·tan(fovDeg/2))`
- 開き `span = 1 + depthM/distanceM` → `frontW = pxPerM·stageWidthM / W`（画面幅に対する倍率へ戻す）
- 床の帯 `focal·eyeM·(1/d − 1/(d+depth))` から `floorY` と `bottomY` を作る
- 俯角の既定 `atan(eyeM/distanceM)`。既存の首振り範囲（見上げ34°・見下ろし16°）を超えないよう丸める
- 遮蔽 `E + (h − E)·(d / p)`。判定は前の人の**目**（h=E−C）、絵の遮蔽は**頭頂**（目より0.10m上）

定数（既定値。呼び出し側から上書き可能にする）:
`着席の目 1.20m（踏面から）／立位の目 1.55m／立位の頭頂 1.65m／頭の直径 0.20m／
列ピッチ 着席0.85m・立ち見0.80m／C値 60・90(既定)・120mm／蹴上げ 0.30〜0.45m・段差上限0.54m／画角 40・60(既定)・自動(上限110°)`

テスト `tests/stage-venue-lines-bowl.test.mjs`（新規）で次を固定する。

1. `deriveSeat` が既存席と同じ鍵をすべて持ち、値が有限であること
2. 距離を2倍にすると `pxPerM` が半分になること（画角一定）
3. 俯角が首振りの範囲に収まること
4. `occlusionFloorM`: 平らな立ち見（E1.55/h1.65/p0.8/d40・舞台高1.6）で**舞台床から約5.0m上**になること
5. 同じ条件で目の高さが1.5m上がると遮蔽が消える（負になる）こと
6. C=90mmのスタンドでは舞台前端が見えること（負になる）こと
7. `riserForConstantC` の蹴上げが単調増加し、上限0.54mを超えないこと

## S2: 会場プリセット3種と席の導出（`stage-venues.js`）

- `VENUES_V2` へ `arena-concert` / `dome-concert` / `festival-field` を追加。既存プリセットの中身は**1文字も変えない**
  （`venue-baseline.json` の先頭5件のハッシュ検証を壊さないこと）
- 各プリセットへ `bowl`（判断HTML 5-3のスキーマ）と `confidence: "unverified"`・`provenance.note` を持たせる
- `window.SHOSAI_VENUES` へ `seatsFor(venue, size)` を追加。器を持たない会場では**既存の `seats` をそのまま返す**。
  器を持つ会場では `bowlTiers` → `deriveSeat` で席を作り、近い順に並べる（例: アリーナ前／アリーナ後／
  スタンド下段／スタンド上段／最上段）。`seats` と `seatById` は互換のため残す
- 席の `note` は「距離○m・目の高さ○m」を含む短文。英語・簡体・繁体の訳鍵も同時に足す
  （用語は `i18n-prep/GLOSSARY.md` に追記してから使う。新しい訳語を勝手に決めない）

## S3: 器の描画（`stage-house-view.js` 新規）

`window.SHOSAI_STAGE_HOUSE_VIEW` として公開（既存の `SHOSAI_STAGE_*` と同じ作法）。**本体からは呼ばれない状態で作る**
（S4で接続する）。検証は同梱のテストと、単体のHTMLで描いた絵で行う。

```
drawBehind(ctx, { L, venue, size, seat, houseMode })   舞台より奥: 空・地平線・スタンドの段・群衆・屋根
drawFront(ctx, { L, venue, size, seat, houseMode })    舞台より手前: 前の客の頭（W3の条件を満たす席だけ）
```

- 色・寸法は判断HTML 6章のトークンシートの値をそのまま使う（勝手に変えない。変えるならシートを先に直す）
- 段の面だけでは段が読めない（実測1.06〜1.17:1）ので、**境界線を必ず引く**
- 群衆は**1フレーム3,000粒まで**。超える段は密度を落として帯で表す。粒は頭0.20mの実寸投影
- 席ごとのばらつきは乱数を使わず、列と席の番号から決まる繰り返し可能な値にする
  （毎フレーム変わると客席が沸き立つ。`stage-first-person.js` の `seatNoise` と同じ考え方）
- 青黒スキンの対応色を `STAGE_COOL_SURFACES` と同じ形の表で持つ（本体の表は触らない）

## 制約（守れないときは止めて報告する）

- **本体 `stage-sketch.js` と `index.html` を編集しない。** 別セッションが同じ木で作業している
- コミットは対象ファイルを**名指しでadd**。`git add -A` は使わない
- 版上げ（`?v=`・CACHE_NAME）は**しない**（S6でまとめて行う）
- 既存テストを書き換えない。`cd tests && node index.mjs` の件数が減っていないこと
- `node tools/check-front-seat-derivation.mjs --check` が通ること
- **寸法の推測が必要になったら止める。** 仮値は「仮」と明示して台帳へ書き、本人の確認へ回す
- 実在会場（武道館・東京ドーム等）の名前・寸法を入れない

## 完了条件

1. `tests/stage-venue-lines-bowl.test.mjs` が上の7件を含めて通る
2. `cd tests && node index.mjs` が全件通り、件数が減っていない
3. `node tools/check-front-seat-derivation.mjs --check` が通る（既存の絵が不変）
4. `stage-house-view.js` が単体で読み込め、器の絵がPNGまたはHTMLで確認できる
5. 変更ファイルの一覧と、仮値にした数値の一覧（根拠と要確認の別）を報告に書く

# 発注書：3Dカメラの舞台袖・客席をリアルにする 2026-08-19

Claudeが仕様を決め、Codexが実装し、Claudeが検証する。この文書だけを読んで着手できるように書く。

## 背景

`shosai-app/` は依存なしの静的Webアプリ。舞台スケッチの一人称／3Dカメラのオーバーレイは
`stage-first-person.js`。2026-08-18にWASDで自由に動き回れる3Dカメラを追加した（commit c999c83）。

本人の要望：
> 3Dカメラの映像だと舞台袖や観客席がないのでそこはリアルにしたい。Apple Vision Proですでに
> できていたことなので、そこから持ってきてもいい。

**現状の問題**を実際にコードで確認した。`drawShell()` は舞台の幅ぴったり（`x=±W/2`）に側壁を
建てている。つまり**舞台の真横（客席から見えない袖）に立つと、そこはもう外壁**で、
袖の空間そのものが存在しない。客席（`drawHouse()`）は段床ではなく**1枚の斜めの床＋点の集まり**で、
客席らしい奥行き・構造（段・手すり・座席の塊）を持たない。

## 参照元：Apple Vision Pro試作

`apps/visionpro/show-staging-planner`（同じiCloud内・別プロジェクト）に、この用途のために
作られた実装がある。**数値をそのままコピーしない**（その試作は舞台16×12m固定のホール専用。
このアプリは劇場サイズが小劇場8×7m〜大劇場18×12m・カスタム60×60mまで変わるため）。
**構造の考え方だけを持ってくる**：

- `app/StageCore/Sources/StageCore/Scene/TheaterShellBuilder.swift`
  舞台の外側に「袖」の床を持ち、袖幕（黒い縦の帯）を舞台端のすぐ内側〜奥へ複数対、
  等間隔で並べて奥へ向かって遠近を作る。プロセニアムの開口の外側にマスク（暗幕）を置き、
  客席側からは袖の奥が見えないようにする。
- `app/StageCore/Sources/StageCore/Scene/AudienceBuilder.swift`
  客席は1枚の斜面ではなく、**列ごとに一段高くなる階段状の塊**（前列が低く、後列に行くほど高い）。
  各列の座面に人の頭・肩を置く。
- `app/StageCore/Sources/StageCore/Model/TheaterPreset.swift`
  上記の実寸の出発点（このアプリでは使わないが、比率の参考にしてよい）。

## 決定事項（2026-08-19・本人の要望を踏まえてClaudeが設計）

1. **静的な見た目だけを作る**。袖に道具や演者の待機列を自動生成したりしない
   （それは既存のセット配置機能でユーザーが自分で置く）。
2. **数値は architecturally もっともらしい固定値**（実在ショーの公式値ではない）でよい。
   舞台サイズ（W・D・CEIL）に応じて比率で決める。
3. **既存の「劇場の箱は仮にプロセニアムで描いています」という前提は変えない**
   （venue.type に関わらずプロセニアムの箱で描く。今の仕様のまま）。
4. **`stage-machinery.js` および `drawPiece()` 内の `Array.isArray(piece.parts)` の分岐には触らない。**
   これは別件（舞台機構）としてこのワークツリーに既に入っている未commitの実装。
   袖・客席の見た目強化とは無関係なので、絶対に上書き・削除しないこと。

## やること

### A. 舞台袖（wings）

`drawShell()` は現在、側壁を `x = ±W/2`（舞台の実際の幅ぴったり）に建てている。
これを「舞台＋両袖」を含む部屋の外壁に広げる。

```
wingWidth(W) = clamp(W * 0.3, 2.4, 4.5)     // 片側の袖の奥行き（m）
roomHalfWidth(W) = W / 2 + wingWidth(W)      // 部屋の外壁までの半幅
```

- `drawShell()` の側壁・天井・床の**横幅**を `W/2` ではなく `roomHalfWidth(W)` にする
  （奥行き・高さの範囲は変えない）。床グリッドの線もこの幅まで引く。
- 舞台の可視域（`toWorld` が返す `x=±W/2` の範囲）自体は変えない。袖は「舞台の外側、
  部屋の壁までの間」に新しくできる空間。
- **袖幕**（黒い縦の帯）を追加する。舞台の実際の端のすぐ内側〜外側にかけて、複数対、
  奥へ向かって等間隔に並べる：

```
legX(W) = W / 2 + 0.4                        // 幕の中心のx位置（実際の舞台端のすぐ外）
legPairs(D) = clamp(round(D / 3), 2, 4)       // 対の数
legZs(D, pairs)[i] = (D/2 - 1.0) - i * ((D - 2.0) / max(1, pairs - 1))
                                              // i=0が客席寄り、iが増えるほど奥（上手同様に下手も同じz）
legWidth = 1.6                                // 幕1枚の見かけの幅（m）
legHeight = min(CEIL - 0.5, CEIL * 0.75)      // 天井にめり込まない高さ
```

  各 `(x, z)` に、`x` を中心に幅 `legWidth` 、`y=0`〜`legHeight` の**単一の縦の板**
  （`fillPoly` で4点。`drawProscenium()` のマスクと同じやり方でよい。箱にしない＝軽い）を、
  `x = +legX(W)` と `x = -legX(W)` の両方に置く。色は黒に近い暗色（既存の `drawProscenium` の
  `"#0e0b08"` などに合わせる）。

  **狙い**: 舞台の真横に立って横を見たとき、袖幕が奥へ向かって等間隔に並ぶことで、
  「袖の奥行き」が見える。客席側から見たとき（`drawProscenium` の開口の外）は今までどおり隠れる。

### B. 客席（house）を段床にする

`drawHouse()` は現在、1枚の傾斜床（塗り面）＋点の集まり。これを、列ごとに高さが増える
**階段状の塊**に作り直す。**`stage-set-model.js` の `step`（階段）と同じ考え方**
（各列の箱は自分の奥行きの位置に、床から自分の高さまで積む。前の列を巻き込まない）。

```
rows = 13                                     // 今と同じ列数
rowDepth = 0.92                               // 1列の奥行き（m）
rowRise = 0.14                                // 1列ごとの上昇（m）
startZ = D / 2 + 1.6                          // 最前列の中心z
seatsPerRow(W) = max(8, floor(W * 1.6 / 0.55)) // 今の式のまま（最低8席にする）
rowWidth(W) = seatsPerRow(W) * 0.55 + 1.0      // 客席ブロックの見かけの幅
```

列 `i`（0が最前列）ごとに：

```
z_i = startZ + rowDepth * i
height_i = rowRise * (i + 1)                  // 後ろの列ほど高い（前の高さを含む一つの箱）
```

`drawBox(ctx, 0, z_i, 0, height_i, rowWidth(W), rowDepth, seatColor)` で1列＝1つの箱として積む。
`seatColor` は既存の客席の暗い色調に合わせた新しい定数でよい（例 `#3a2620` 系。既存の
`"#171210"` 床・`"#2b2118"` 壁と衝突しない範囲で、座席とわかる色にする）。

人（頭・肩の代わりに点でよい。今の実装を踏襲）は、各列の**その列の高さの上**に置く：
今の「なめらかな斜面の y」ではなく、`y = height_i + .35` を使うこと（段の上に立って／座っているように
見せるため）。x・zの並べ方（1席ずつ）、遠いものを薄く・小さくする処理は今のロジックを流用してよい。

### C. バルコニー（任意・無理なら省略）

`CEIL >= 8` かつ `D >= 8` のときだけ、Bの客席のさらに奥・高い位置に**浅いバルコニー**を
足せるなら足す。床（薄い `drawBox`）＋手すり（`line3` の横線1本）＋数列ぶんの頭の点、程度でよい。
**天井にめり込む・複雑になるなら足さない。** 必須なのはA（袖）とB（客席の段床）だけ。

## テスト（`tests/stage-first-person.test.mjs` へ追加）

既存の `_geom` と同じやり方で、以下の純関数を `window.SHOSAI_STAGE_FPV._geom` へ追加して公開し、
テストを書くこと。

- `wingWidthFor(W)` … 上記の式。小さいW・大きいWで min/max にクランプされることを確認
- `wingLegX(W)` … `W/2 + 0.4`
- `wingLegPairs(D)` … `clamp(round(D/3), 2, 4)`。D=3 や D=60 でも範囲内であることを確認
- `wingLegZs(D, pairs)` … 返る配列の長さが `pairs` と一致し、値が単調減少（客席側→奥へ向かう）
- `houseSeatsPerRow(W)` … 既存の式のまま、最低8であることを確認
- `houseRiserRows(W, D)` … `{ z, height }` を13件返し、`z` が単調増加、`height` が
  `rowRise * (index+1)`（＝厳密に単調増加）であることを確認

最低6件のテストケースを足すこと。**現在の基準は548件（`node --test tests/*.mjs`）。
減っていたら壊している。**

## 触ってよい / いけないファイル

- 触ってよい: `stage-first-person.js`（`drawShell`・`drawHouse` とその周辺の新規関数のみ。
  `drawPiece()` 内の機構駒の分岐には触らない）、`tests/stage-first-person.test.mjs`、`index.html`
  （`stage-first-person.js?v=` の版上げのみ）、`stage-sw.js`（`CACHE_NAME` の版上げのみ）
- **触らない**: `stage-machinery.js`、`tests/stage-machinery.test.mjs`、`docs/STAGE_MACHINERY_WORKORDER_2026-08-19.md`、
  `stage-sketch.js`、`stage-set-model.js`、`stage-set-builder.js`、`db.js`、`stage-apparatus-data.js`、
  `*_backup_*.js`、`.stage-sketch-mcp/`、`stage.html`（`build_stage.py` で生成する）
- **削除・移動は一切しない。** 特に `stage-machinery.js` まわりは他作業の途中成果物なので触れない。

## 版上げ

現在の版（このワークツリーの現状。他作業ですでに進んでいる番号なので、ここから+1する）：
`index.html` の `stage-first-person.js?v=5` → `?v=6`。`stage-sw.js` の
`CACHE_NAME = "stage-sketch-pwa-v75"` → `v76`。**それ以外の版番号（`stage-i18n.js`・`stage-sketch.js`
・`stage-machinery.js` 等）はこの作業では変えない**（他作業のものなので触ると衝突する）。

`python3 build_stage.py` を実行して `stage.html` を作り直すこと。

## 完了条件

- `node --test tests/*.mjs` が **548件以上・全通過**
- `python3 build_stage.py` が正常終了
- 版上げ（`stage-first-person.js` と `CACHE_NAME` のみ）が済んでいる
- 演者目線・自由カメラ・既存の駒の見え方が変わっていない（袖と客席の見た目以外は変えない）
- `stage-machinery.js` およびその関連ファイルが一切変更されていない

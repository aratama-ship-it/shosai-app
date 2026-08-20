# 発注書：演者の頭に物が乗るバグの根本修正（サイズ判定） 2026-08-19

Claudeが仕様を決め、Codexが実装し、Claudeが検証する。この文書だけを読んで着手できるように書く。

## 背景

`shosai-app/stage-sketch.js` の `refreshBases`/`supportUnder`（4530行付近〜）は、駒の支えを
「シーンの `pieces` 配列で自分より前にあるもの」から選ぶ。演者の頭の上も支え面として扱う設計
（`何の上にでも物を置けるようにするので、演者の頭の上も上面として扱う` というコメントがpieceTopLocalの直前にある）。

これ自体は意図的な仕様（ハンドバランスやアダージオで、演者の上に小道具や台を乗せる曲技を表現するため）
だが、**台やマットのような、演者よりずっと大きな設置面積を取る什器**を演者より後から配列に足す
（＝あとから動かす、またはJSON生成時にその順で並べる）と、配列順だけの理由で
「演者の頭に什器が乗って浮く」逆転が起きる。2026-08-19に既存データ23箇所で発見・手動修正済み
（メモ: stage-sketch-piece-order-stacking-bug。常設の検出スクリプト
`shosai-app/tools/check-object-on-performer.mjs` あり）。

## 【この文書は2段階構成。両方読んでから着手すること】

- **第1部＝サイズ判定の追加**: 本人承認済み・実装済み（2026-08-19第1便でCodexが実装、
  Claudeが検証済み）。以下に記録として残す。**すでに入っているので再実装しない**
  （`stage-sketch.js` の `supportUnder` を実際に読んで、入っていることを確認してから次へ進む）。
- **第2部＝種類による追加除外**: 第1部を実データに対して実行した結果、サイズ判定だけでは
  「椅子」のような什器のほとんどが直らないことが判明（理由は第2部に記載）。**これから実装する部分**。

---

## 第1部（実装済み・確認のみ）: サイズ判定

`supportUnder` の `if (other.type === "pole") return;` の直後、`const foot = supportFootprint(other);`
の後に、以下が入っているはず（`stage-sketch.js` と `tools/check-object-on-performer.mjs` の両方）:

```js
if (other.type === "performer" && piece.type !== "performer") {
  const selfFoot = supportFootprint(piece);
  const selfArea = selfFoot ? selfFoot.w * selfFoot.d : Infinity;
  if (selfArea > foot.w * foot.d) return;
}
```

入っていなければ、まずこれを先に入れてから第2部へ進む（通常は入っているはず）。

---

## 第2部（新規実装）: 種類による追加除外

### 分かったこと

第1部を実データ（`.stage-sketch-mcp/projects/`・`jjk-show/`・`show-creation/` 配下）に対して実行したところ
**360件**が「演者の上に乗っている」と検出された（内訳: chair 182・trapeze 135・block 29・suitcase 7・
wire 3・wall 2・sphere 1・cane 1）。原因をトレースしたところ、**椅子（登録設置面積 約0.06〜0.22㎡）は
そもそも人の体の設置面積（立位で約0.22㎡、しゃがむ・座る・伏せる姿勢では0.17〜0.49㎡）より
小さいことがほとんど**なので、サイズ判定（第1部）ではしきい値をどれだけ厳しくしても
椅子の大半を除外できない。これは実装ミスではなく、サイズ判定という方針の原理的な限界
（本人に実測値を示して確認済み・2026-08-19）。

**本人の判断（2026-08-19）**: 「椅子のような、演者の支え候補から常に外すべき種類」を、
サイズ判定に**追加する形**で列挙する。

### 対象外にする種類

`chair`（椅子）・`table`（テーブル）・`bench`（ベンチ）・`stool`（スツール）の4種類。
理由: これらは`SET_KINDS`で「座る・寄りかかる」家具として並んでいる同じグループで、
演者が乗る／寄りかかる対象であって、演者の上に来るものではない
（人が椅子に座るのであって、椅子が人の頭に乗ることはない）。

**含めない（このまま放置）もの**:
- `block`（台・箱）・`suitcase`・`sphere`・`cane`・`wall`: サイズが多様（ハンドバランス台のように
  小さいものから、平台のように大きいものまである）。サイズ判定（第1部）に任せる。
  今回の360件でこれらが少数残っているのは、位置札やボードなど登録寸法が小さいカスタム什器のため。
  種類で一律除外すると、正当な小道具バランスの表現を壊す。
- `trapeze`（135件）・`wire`（3件）: **今回は対象外**。これらは本来 `isFlown(piece)` が真になり
  `refreshBases` の早い段階で支え判定そのものをスキップするはずの種類（`FLOWN_ONLY` グループ）。
  実データでここに引っかかっているのは、`piece.flown`（または装置登録の `flown`）が
  正しく立っていない**別の原因の不具合**の可能性が高い。**このバグは調査・修正しない。
  発見事実として本人へ報告済み**（別タスクで扱う）。

### 実装

`stage-sketch.js` の `supportUnder` に、第1部のサイズ判定と**同じ場所**（`if (other.type === "pole") return;`
の直後、`foot` 取得後）へ、サイズ判定より前に以下を追加する:

```js
// 座る・寄りかかる家具は、サイズに関係なく演者の支え候補から常に外す。
// 演者が座る対象であって、演者の上に乗ることはない。
const PERFORMER_UNSUPPORTABLE_TYPES = { chair: true, table: true, bench: true, stool: true };
if (other.type === "performer" && PERFORMER_UNSUPPORTABLE_TYPES[piece.type]) return;
```

（`PERFORMER_UNSUPPORTABLE_TYPES` は関数の外、`supportUnder` の直前などモジュールスコープに
定数として定義してよい。毎回オブジェクトを作り直さない。）

このチェックは、第1部のサイズ判定（`if (other.type === "performer" && piece.type !== "performer") { ... }`)
より**前**に置く（`chair` 等は無条件で除外するため、サイズ計算を経由させる必要がない）。
第1部のサイズ判定コード自体は変更しない（そのまま残す。`chair`等以外の種類はサイズ判定のみで足りる）。

同じ変更を `tools/check-object-on-performer.mjs` の複製ロジック（`const supportUnder = (piece, size, candidates) => {...}`、
120〜145行付近）にも、同じ位置へ追加する。

### テスト

`tests/stage-support-size.test.mjs` に以下のテストを追加する（既存の2テストは変更しない）:

1. `stage-sketch.js` の `supportUnder` 本体に `PERFORMER_UNSUPPORTABLE_TYPES` を含む定数と、
   `other.type === "performer" && PERFORMER_UNSUPPORTABLE_TYPES[piece.type]) return;` のパターンが
   存在すること（正規表現マッチでよい。既存テストと同じ方式）。
2. `tools/check-object-on-performer.mjs` の複製にも同じパターンが存在すること。

### バージョン更新

`index.html` の `stage-sketch.js?v=` と `stage-sw.js` の `CACHE_NAME` を、**現在の値を読んでから+1**する
（第1部ですでに上がっているはずなので、そこからさらに+1）。

### 制約

- 既存ファイルは編集前に必ず読み直す（共有ワークスペース。他セッションが同時に編集中）。
- ファイルの削除・移動はしない。
- `stage-sketch.js`・`tools/check-object-on-performer.mjs`・`tests/stage-support-size.test.mjs`・
  `index.html`・`stage-sw.js` 以外は変更しない。
- `trapeze`・`wire` の `isFlown` 不具合には**手を出さない**（この発注書のスコープ外）。
- `.stage-sketch-mcp/` 配下や `jjk-show/`・`show-creation/` 配下の既存プロジェクトJSONは変更しない。

### 完了条件

- `node --test tests/*.mjs`（`shosai-app/` 直下）が全件通ること。
- `python3 build_stage.py` が成功すること。
- `node tools/check-object-on-performer.mjs .stage-sketch-mcp/projects/*.json ../jjk-show/*.json ../show-creation/*.json ../show-creation/demo-11works-2026-08-16/sketches/*.json` を実行し、
  `chair`・`table`・`bench`・`stool` の行が結果から消えていること（`trapeze`・`wire`・その他の残存は
  想定どおりなので問題ない）。

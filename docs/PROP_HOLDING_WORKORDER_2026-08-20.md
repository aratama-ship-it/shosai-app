# 発注書：演者に物を持たせる（小道具）2026-08-20

Claudeが仕様を決め、Codexが実装し、Claudeが検証する。この文書だけを読んで着手できるように書く。

## 背景と決定事項（2026-08-20・本人が選択）

演者の駒に、手荷物（小道具）を持たせられるようにする。

1. **新しい種類「小道具」（kind: `prop`）を追加する。** 名前と寸法を自由に決めて
   舞台セットとして登録できる（傘・本・ボールなど、既存の種類に無い物のため）。
2. 既存の小物種類（`suitcase`・`diabolo`・`sphere`・`cane`）も持てる。
   **組んだセット（`model`）は今回は対象外。**
3. **操作はインスペクタ主体。** ドラッグで演者に重ねても「持つ」ことはしない
   （置き場所の調整と誤解が衝突するため。頭乗りバグの再発防止の経緯もある）。

## 既存の仕組み（ここに乗せる。作り直さない）

本体は `stage-sketch.js`（約19,000行・IIFE・依存なし静的アプリ）。行番号は2026-08-20時点の目安。

- `PIECE_TYPES`（~907行）… 駒の型。★905行のコメントどおり、**SET_KINDSに足したらここにも足す**。
- `PIECE_METERS`（~936行）／ `PIECE_DIMS`（~957行）… 実寸の目安と既定寸法。
- `SET_KINDS`（~1045行）／ `SET_KIND_ORDER`（~1093行）… セット登録できる種類と一覧の並び。
- `SOLID_TYPES`（~1765行）… 立体の箱として寸法を持ち描画される型（suitcase等がtrue）。
- `normalizePiece`（~2704行）… 駒の読み込み整形。**新しい持ち物の状態値はここに足す。**
- `supportUnder`（~4545行）／ `refreshBases` … 乗り・支えの導出。
- `addSetItem`（~10221行）／ `placeSetPiece` ／ `stashPiece`（~10731行）… セット登録・出し入れ。
- `updateInspector`（~15150行）… 選択に応じた文脈UI。ポール（poleSide L/R）・トラピーズ・
  ティシューの前例があり、**「持つ」も同じ流儀にする。**
- 演者の骨格 `BASE_JOINTS`（~1110行）に手首 `wrL`/`wrR` がある。正面図の描画（~4943行付近）は
  関節を3D→画面へ投影している。
- i18n: 表示名は `tm("setKind", ...)` / `tm("pieceType", ...)` / `tx("...")` を通る。
  **英語辞書は `stage-i18n.js`。** `tests/stage-i18n-coverage.test.mjs` が漏れを検出する。

## A. 新種類「小道具」（prop）

1. `PIECE_TYPES` に `prop: "小道具"`、`SET_KINDS` に `prop: "小道具"` を追加。
   `SET_KIND_ORDER` は `"sphere"` の直後に `"prop"` を挿入。
2. `PIECE_METERS.prop = 0.4`。`PIECE_DIMS.prop = { w: 0.4, d: 0.3, h: 0.4 }`（幅・奥行き・高さは
   セット情報から自由に変えられる。blockと同じ扱い）。
3. `SOLID_TYPES` に `prop: true` を追加（既存の箱描画・寸法編集・平面/正面/3D描画に乗せる。
   小道具のためだけの新しい描画系は書かない）。
4. `normalizeDims` が `prop` を block と同様に扱うことを確認（w/d/h 自由）。
5. `stage-i18n.js` に en を追加：pieceType/setKind の `prop: "Prop"`。
6. 登録すれば `state.project.sets` の一員になり、出し入れ・色・錠・寸法編集が既存のまま効くこと。

## B. 持ち物の状態値（データ）

`normalizePiece` に**駒（持たれる側）の状態値**として追加：

- `heldBy: string|null` … 同じシーン内の持ち手（演者の駒）の `id`。既定 null。
- `holdSide: "L"|"R"` … どちらの手か。既定 `"R"`（`poleSide` と同じ流儀）。

判定は関数 `isHoldable(piece)` にまとめる：
`HOLDABLE_TYPES = { prop, suitcase, diabolo, sphere, cane }` に該当し、
かつ最大寸法（w/d/h/diaの最大）が **1.2m以下**、かつ吊り（`isFlown`）でないこと。

整合性（読み込み時・シーン整形時に一巡で直す）：
- `heldBy` の指す駒が同じシーンに無い、または演者でない → null に戻す。
- 同じ演者の同じ側を2つ以上が指していたら、後の駒の `heldBy` を null に。

シーン複製時：駒のidが配り直される箇所（`originId` を配っている周辺）で、
**old→new のidマップに従って `heldBy` も張り替える**。見つからなければ null。

## C. 持たれている間の挙動

- **位置の同期**：`refreshBases` と同じタイミングの一巡で、持たれている駒の `u/v` を
  持ち手の位置＋手の側へのオフセット（`facing` を踏まえて横へ 0.28m）に毎回引き直す。
  `base` は持ち手の `base + 0.75`（手の高さの見当）にする。3D・平面図はこれで足りる。
- **乗り・支えから除外**：持たれている駒は `supportUnder` の候補（支える側・乗る側とも）から外す。
- **ドラッグ不可**：持たれている駒はクリックで選択はできるが、ドラッグしても動かない
  （pointermove で `heldBy` があれば u/v を触らない）。
- **動線ツールの対象外**。
- **持ち手が舞台から外れたら**（removeSelected 等）：持ち物は `heldBy = null` にして
  **その場に残す**（隠れた状態を作らない。舞台裏まで一緒に連れて行かない）。
- **複製**：持たれている駒を複製したら複製側は `heldBy = null`。
  演者を複製しても持ち物は付いてこない（何もしなくてよいが、確認する）。
- **手放したとき**：いまの u/v のまま置く（手の横に落ちる。自然でよい）。

## D. インスペクタUI（index.html ＋ updateInspector）

ポールの `poleControls` の行を手本に、`index.html` の選択パネルへ2つの行を足す：

1. **演者を選んだとき「持ち物」行**（`stage-hold-controls`）：
   - いま持っている物を小さく列挙（名前＝セット名か種類名）。各項目に「手放す」ボタン。
   - 「持たせる…」の select。候補は
     (a) このシーンの舞台上にある `isHoldable` な駒（誰にも持たれていないもの）、
     (b) 舞台裏の登録済みセットのうち holdable な種類（先頭に「舞台裏：」を付ける。
         選んだら `placeSetPiece` 相当で出してから持たせる）。
   - 空いている手（R優先、Rが埋まっていればL）に持たせる。両手がふさがっていれば
     `announce` で「両手がふさがっています。」と断り、selectを戻す。
2. **holdableな駒を選んだとき「持ち手」行**（`stage-holder-controls`）：
   - 「持ち手」select：先頭「持たせない」＋このシーンの演者一覧（名簿名 or 演者N）。
   - 左右トグル（L/R）。`poleLeft`/`poleRight` と同じ aria-pressed の流儀。
     持たれていない間は行ごと隠す（灰色のまま場所を取らせない）。

`announce` 文言（en は `stage-i18n.js` へ）：
「◯◯を△△に持たせました。」「◯◯を手放しました。」「両手がふさがっています。」

## E. 正面図の描画（手首に付ける）

- 正面図では、持たれている駒を**持ち手の手首（`holdSide` に応じて `wrL`/`wrR`）の画面座標**を
  中心に描く（姿勢・向き・座り等に自動で追従する）。演者より手前に描く。
- 実装の指針：演者を描くときに投影済みの手首座標を控えておき、持ち物の描画パスで使う
  （演者→持ち物の順に描く）。
- 難しければ、C の同期位置＋手の高さで箱を描く形へ落としてよいが、
  **「手に付いている」と読める見た目**は落とさないこと。
- 平面図は C の同期位置に既存の平面描画で出るのでそのままでよい。

## F. テストと仕上げ

1. `tests/stage-prop-holding.test.mjs` を新設。既存の `stage-support-size.test.mjs` と同じ
   **ソースをパターンで検査する流儀**で、少なくとも：
   - `PIECE_TYPES`・`SET_KINDS`・`SET_KIND_ORDER` に prop がある
   - `normalizePiece` が `heldBy`・`holdSide` を持つ
   - `HOLDABLE_TYPES` の定義と `supportUnder` からの除外がある
2. 既存テストを全部通す（`tests/` から `node --test .`。走らせ方は `tests/index.mjs` を確認）。
   特に `stage-i18n-coverage.test.mjs` が落ちないこと。
3. `index.html` の `stage-sketch.js` などの `?v=` を上げる。`stage-sw.js` の `CACHE_NAME` を上げる。
4. `python3 build_stage.py` を実行して `stage.html` を作り直す。

## 追記（2026-08-20・実装後の3D修正。Claudeが直接実施）

Codex実装の検証で、3D（stage-first-person.js の drawPiece）が持ち物を床の高さに描いていた。
原因は2つ：①`prop` が箱描画の種類リストに無く汎用フォールバック任せだった、
②3Dの箱・球・cane・ラベルの高さが `dims.lift` だけで、同期済みの `piece.base` を見ていなかった。
`heldLift = piece.heldBy ? piece.base : 0` を導入し、holdable系の分岐とラベルにだけ足した
（持たれていない駒の描画は従来どおり）。stage-first-person.js は v7、CACHE_NAME は v86。

## 制約（必ず守る）

- **ファイルの削除・移動・改名はしない。** バックアップ（`*_backup_*` ファイル）に触らない。
- 既存ファイルは**編集前に必ず該当箇所を読む**（iCloud共有ワークスペースで他エージェントも触る）。
- 関係ないコードのリファクタ・整形をしない。
- コメントは既存の流儀（日本語で「なぜ」を書く）に合わせる。
- 数値・寸法はこの発注書のものだけを使う。自分で調べて埋めない。

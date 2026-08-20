# 発注書：舞台セットを3Dで組んで保存する（セットビルダー） 2026-08-18

Claudeが仕様を決め、Codexが実装し、Claudeが検証する。この文書だけを読んで着手できるように書く。

## 背景

`shosai-app/` は依存なしの静的Webアプリ。舞台スケッチの本体は `stage-sketch.js`。
現在、舞台に置ける「セット」は `SET_KINDS`（台・テーブル・椅子・壁・球・道具類）で、
**1種類＝1つのプリミティブ**しか持てない。台の上に柱が立ち、その奥に階段がある、といった
**組み合わせた装置を作れない**。

本人（元サーカスアーティスト・ショー制作者）の要望：
> 舞台セットも簡易的でいいのでちゃんと3Dモデルで組んで保存できるようにしたい。

決定事項（2026-08-18・本人が選択）：
- **プリミティブを組み合わせる方式**でまず作る（外部3Dファイル読み込みは将来の追加）
- 保存先は**端末共通ライブラリ＋JSON書き出し**（どのショーからも呼び出せる）

## 既存の仕組み（ここに乗せる。作り直さない）

`stage-sketch.js` には既に「立体を箱の集合として描く」経路がある。**必ずこれを使うこと。**

- `pieceParts(piece)` … 駒を `{ ox, oz, w, d, h, lift, tint }` の**箱の配列**として返す
  （`ox/oz` は駒の中心からの水平オフセット m、`lift` は床からの高さ m、`tint` は明暗 0〜1）
- `drawSolid(target, piece, pos, scale, L)` … その配列を `paintBox()` で描く。
  駒全体の回転は `piece.facing`（度）で既に効いている。正面図・平面図の両方を通る。
- `stage-first-person.js` の `drawPiece()` … 3D一人称／自由カメラ側の描画。

つまり**モデルのデータ形を「箱の配列」に寄せれば、2Dの図はほぼ既存経路で描ける。**

## データ構造

### 端末共通ライブラリ

localStorage キー `shosai-stage-models-v1`。ショーとは別に持つ（どのショーからも使う）。

```
{
  version: 1,
  models: [ Model, ... ]
}

Model = {
  id,            // "model_xxxx"
  name,          // 24文字まで
  note,          // 覚え書き。空でよい
  updatedAt,     // ISO文字列
  parts: [ Part, ... ]   // 最大64個
}

Part = {
  id,
  shape,   // "box" | "panel" | "cylinder" | "sphere" | "step" | "ramp"
  name,    // 省略可。空なら shape の名前を出す
  x, y, z, // m。モデル原点からのオフセット。原点＝床の中心。y=0が床、+yが上、
           //    +zが客席方向（既存 toWorld と同じ向き）
  w, d, h, // m。box/panel/step/ramp
  dia,     // m。cylinder/sphere
  rotY,    // 度。この部品だけの鉛直軸まわりの回転（既定0）
  steps,   // step のときの段数（2〜12、既定3）
  tint,    // 0.5〜1.2。明暗（既定1）
}
```

**色は部品ごとに持たせない。** このアプリは駒1つを1色＋明暗で描く流儀で統一されているので、
モデルも「舞台へ置いたときの駒の色」＋部品ごとの `tint` で表す。ここを崩さないこと。

### 舞台へ置いたときの駒

`PIECE_TYPES` と `SET_KINDS` に `model: "組んだセット"` を足す。
セット登録の項目（`state.project.sets[]` の要素）は `kind: "model"` と `modelId` を持つ。
駒側は既存どおり `setId` でそれを指し、`facing` でモデルごと回る。

**`PIECE_TYPES` を足したら `PIECE_METERS`・`SET_KIND_ORDER` にも足すこと**
（`stage-sketch.js` 728行あたりのコメントに「無い型は演者に落とされる」と書いてある。実際に踏んだ事故）。

## 各 shape をどう箱にするか（`pieceParts` の中で作る）

すべて `{ ox, oz, w, d, h, lift, tint, rotY }` の配列へ落とす。

- `box` … 1個。`ox=x, oz=z, w, d, h, lift=y`
- `panel` … `box` と同じだが、寸法つまみで `d`（厚み）の既定を 0.05m にする。壁・パネル用
- `cylinder` … `w = d = dia` の箱を2個、同じ位置に `rotY` 0度と45度で重ねる。
  八角形に見えるので円柱として読める。安く済み、この絵柄にも合う
- `sphere` … 高さ方向に4段の箱を積む（直径 dia を 0.19/0.35/0.35/0.19 の帯に割り、
  各段の幅を球の断面幅にする）。丸く見えれば十分
- `step` … `steps` 段。段板の奥行きは `d / steps`、各段の高さは `h / steps`。
  客席側（+z）が低い側になる向きで作る
- `ramp` … 段数を `max(6, ceil(h / 0.05))` に固定した `step` と同じ作りで近似する
  （斜面を箱の階段で表す。簡易でよいと本人が明言している）

3D側（`stage-first-person.js` の `drawPiece`）も、同じ箱の配列を受け取って
既存の `drawBox` で描く。**2Dと3Dで別々に形を書かない**（ずれるため）。
そのために、箱の配列を作る関数は `stage-sketch.js` から
`window.SHOSAI_STAGE_MODELS`（新規 `stage-set-model.js`）へ出し、両方から呼ぶこと。

### 新規ファイル `stage-set-model.js`

依存なしのIIFE。`window.SHOSAI_STAGE_MODELS` に次を公開する（すべて純関数）。

- `normalizeModel(raw)` → 壊れた入力を既定値で埋めた `Model` を返す（配列でない・数値でない・
  範囲外はすべて直す。`parts` は最大64で切る）
- `normalizePart(raw)` → `Part`
- `partBoxes(part)` → `[{ ox, oz, w, d, h, lift, tint, rotY }]`（上記の shape 展開）
- `modelBoxes(model)` → 全部品を展開して連結した箱の配列
- `modelExtent(model)` → `{ w, d, h }`。全箱を包む外形（駒の footprint と寸法表示に使う）
- `serializeLibrary(library)` / `parseLibrary(text)` → JSON文字列 ↔ `{version, models}`。
  `parseLibrary` は壊れたJSON・想定外の形なら `null` を返す（例外を投げない）
- `emptyModel(name)` → 部品1個（1m×1m×0.4mの box）だけを持つ新規モデル

## 画面（セットビルダー）

新規 `stage-set-builder.js`。全画面オーバーレイ。`stage-first-person.js` と同じ流儀で
DOMは自前で組み立て、`window.SHOSAI_STAGE_BUILDER = { open, close }` を公開する。

入口：「舞台セット」パネルに `id="stage-model-open"` のボタン「セットを組む」。

画面の構成（3列）：

1. **左＝モデル一覧**（端末共通ライブラリ）
   - 新規／複製／名前変更／削除（削除は確認を出す）
   - 「JSONで書き出す」（全モデル）と「読み込む」（追記。同じidは新しいidを振り直して追記）
2. **中央＝プレビュー**
   - 斜め上から見た1枚の図。左右ドラッグで水平に回り、上下ドラッグで見下ろし角を変える。
     ホイールで寄る／引く。**床に1mのグリッドと、人の輪郭（身長1.65m）を必ず出す**
     （これが無いと大きさが分からない。この道具の要）。
   - 選んでいる部品を明るい輪郭で示す。
3. **右＝選んだ部品のつまみ**
   - 種類（shape）／位置 x・y・z／寸法 w・d・h または dia／`rotY`／`steps`／`tint`
   - 数値はcm表示（既存 `cmText` の流儀。ただし内部はm）
   - 部品の追加・複製・削除・上下移動（重なり順ではなく一覧の並び）

キーボード：Escapeで閉じる。Deleteで選んだ部品を消す。それ以外は今回入れない。

閉じるときにライブラリを保存する。保存は編集のたびにも走らせる（既存の `persistSoon` と同じ考え方）。

## 舞台へ出す

- セット一覧で「組んだセット」を選ぶと、ライブラリのモデルを選ぶ小さな一覧が出る
- 出した駒は既存どおり動かせる・回せる（`facing`）。**寸法つまみは出さない**
  （寸法はモデル側で決まる。ここで伸ばせると、モデルとの関係が壊れる）
- モデルを編集したら、そのモデルを使っている駒の絵が次の描画で変わること

## i18n・版上げ・テスト

- 新しい文言は `stage-i18n.js` へ日英。`tests/stage-i18n-coverage.test.mjs` が落ちないこと
- `index.html` に `stage-set-model.js?v=1` と `stage-set-builder.js?v=1` を足す。
  `stage-sw.js` の `APP_SHELL` にも足す
- 版上げ：`stage-sketch.js` `?v=` +1、`stage-i18n.js` `?v=` +1、
  `stage-sw.js` の `CACHE_NAME` +1、`tests/stage-venue-library.test.mjs` の期待値も合わせる
- **`python3 build_stage.py` を実行して `stage.html` を作り直す**（`stage.html` は生成物。直接編集しない）

### 新規テスト `tests/stage-set-model.test.mjs`

`stage-first-person.test.mjs` と同じ `vm.runInNewContext` の作法で `stage-set-model.js` を読む。

1. `normalizeModel(null)` が例外を投げず、部品0個の正しい形を返す
2. `normalizePart` が範囲外の数値（NaN・負の寸法・rotY=10000）を既定値か範囲内へ直す
3. `partBoxes` … `box` は1個、`step`（steps=3）は3個、`sphere` は4個の箱を返す
4. `step` の各段の高さの合計が `h` に一致し、奥行きの合計が `d` に一致する
5. `modelExtent` が部品の位置オフセットを含めた外形を返す（原点から離れた部品でも正しい）
6. `parseLibrary("{壊れたJSON")` が `null` を返す（例外を投げない）
7. `serializeLibrary` → `parseLibrary` で往復してモデルが等しい
8. `parts` が64個を超える入力は64個に切られる

**現在の基準は 260件（`node --test tests/*.mjs`）。減っていたら壊している。**

## 触ってよい / いけないファイル

- 触ってよい: 新規 `stage-set-model.js`・`stage-set-builder.js`、
  `stage-sketch.js`、`stage-first-person.js`、`stage-i18n.js`、`index.html`、`stage-sw.js`、
  `style.css`、新規 `tests/stage-set-model.test.mjs`、`tests/stage-venue-library.test.mjs`（版番号のみ）
- **触らない**: `db.js`、`stage-apparatus-data.js`、`*_backup_*.js`、`.stage-sketch-mcp/`、
  `stage.html`（`build_stage.py` で生成する）
- **削除・移動は一切しない。**

## 完了条件

- `node --test tests/*.mjs` が **260件以上・全通過**
- `python3 build_stage.py` が正常終了
- 版上げが済んでいる
- 既存の駒（台・テーブル・道具・演者）の見え方が変わっていない

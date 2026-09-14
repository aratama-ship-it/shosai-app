# 発注書：映像面（スクリーン／LED／投影面）を小道具駒の形プリセットとして追加 2026-09-11

状態: **保留（別案件）**。2026-09-11 に本人が「映像面は別案件。ここではダンスフォーメーション制作アプリ→舞台スケッチ導入をやりたい」と訂正。実装に着手しない。再開時は本人の指示を待つ。
（旧状態: 本人承認済み・未着手）Claudeが仕様を決め、Codexが実装し、Claudeが検証する。
この文書だけを読んで着手できるように書く。背景と判断の経緯は
`_reviews/2026-09-11_stagesketch-techplot-countsync/index.html`（3-1・9-4・K1〜K4）。
雛形にした先行発注書: `PROP_SHAPES_WORKORDER_2026-08-20.md`（形プリセット10種。同じ流儀で足す）。

## 0. 目的（何を解決するか）

映像面を「機材」ではなく**見え方の物体**として舞台に置き、**平面図・正面図・3D一人称（FPV）・演者ビューアで、任意の席から
「何が隠れるか／見切れるか／画面に何が出ているか」を見られる**ようにする。
投射距離・明るさ・投影の成立性・信号系統は扱わない（Drafty／Vectorworks の領域。作らない）。

## 1. 決定事項（Claude・本人）

- **新種別は作らない。** 小道具（kind `prop`）の形プリセットに `screen` を1つ足す（K4: 保存項目の追加は可）。
- 位置は既存の正規化座標 `u,v`（面の下辺中央を床へ投影した点）。**寸法はメートル絶対**（`dims`）。会場を替えても
  寸法・高さ・向きは保持し、収まらなくても自動縮小・自動移動しない（既存の prop と同じ）。
- 向きは既存の `facing`（0＝客席向き）。**画像が出るのは facing の正面側だけ**。裏面は暗い板。初期は垂直面のみ。
- 画像は**場面ごとの駒**が持つ（`piece.imageId`）。映すものは場面で変わるのが映像の本質なので、登録（set）側には持たせない。
  場面を複製すれば駒ごと写るので、同じ画像は自然に引き継がれる。
- 画像の保存は**既存の背景写真の仕組みを再利用**する（`project.photos[id]` にデータURL、1枚 1.6MB 上限、長辺 1400px へ縮小。
  stage-sketch.js 4255行付近 `PHOTO_MAX_BYTES`、22361行付近 `PHOTO_MAX_W`）。新しい保存先を作らない。
- 小道具表（PROP_LIST）からは `screen` を除外する（映像面は小道具ではない）。香盤表・共有セッション・書き出しJSONは既存の駒として通す。
- タイムライン・カウント・動画再生は今回の範囲外（別発注）。

## 2. データ

1. `PROP_SHAPES`（stage-sketch.js 1452行付近）の**末尾**に追加。順序は select の並びに使うので末尾固定。
   ```js
   screen: { ja: "映像面", en: "Screen", dims: { w: 4.0, d: 0.05, h: 2.25 }, grip: null, surface: true,
     parts: [ { shape: "panel", y: 0, w: 4.0, d: 0.05, h: 2.25, tint: 0.35 } ] },
   ```
   - 既定 16:9（4.0m×2.25m）。`surface: true` は「正面に画像を貼る面」の印。拡縮規則は既存（登録寸法／基準寸法）。
   - `dimMeta("prop", key)` の下限は `presetMin` で自動的に d=0.05 まで下がる（3958行付近）。上限は既存 DIM_META のまま
     （w の上限が 4m 未満なら、`screen` のときだけ w/h の max を 16 へ広げる。現在値を確認して決める）。
2. `normalizePiece`（3825行付近）に `imageId: typeof piece.imageId === "string" ? piece.imageId : null` を追加。
   `screen` 以外の駒に `imageId` が付いていても保持してよいが、描画は `screen` だけが使う。
3. `project.photos` の掃除（4133〜4142行付近: シーンの `scene.photo.id` を used に集めて未使用を delete）に、
   **全場面の全駒の `piece.imageId`** も used へ加える。ここを忘れると、映像面の画像が保存直後に消える。
4. 高さ（床から下辺）: 既存の `dims.lift` と吊物 `flown` の仕組みで扱う（addSetItem 13598行付近で
   `SOLID_TYPES[kind]` に lift を用意している）。prop が吊物にできない実装なら、`screen` 形のときだけ
   setinfo の吊物チェック（`stage-setinfo-flown-row`）を出す。**新しい高さの項目は作らない。**
5. 書き出し JSON（`version: 4`、693行付近）は項目追加のみで版は上げない。旧JSONの読込は `imageId` 無し＝null で通る。
6. MCP（`mcp-server/src/schemas.js` 95行付近 `dims`）: `propShape` に `"screen"` を許す。`imageId` は**AI編集案からは設定不可**
   （バイナリを扱わない）。既存値の保持だけ。

## 3. 描画

1. `pieceParts()`（7473行付近）の prop 分岐はそのまま（panel は既存で箱に展開される）。**面の正面側**を描くために、
   `scaledPropShape` の結果に `surface` を残し、各ビューが「この駒は画像面を持つ」と分かるようにする。
2. **平面図**: 既存の薄い長方形のまま。加えて**客席側（facing の正面）の辺だけ 2px 太く**描き、どちらに映るかを示す。
3. **正面図（2D）**: 面の矩形の内側に画像を `drawImage`（縦横比を保って収める＝レターボックス。余白は tint 0.35 の暗色）。
   画像が無いときは暗色の板＋駒名。`facing` が 90〜270 のとき（横向き・裏向き）は画像を描かず板だけ。
4. **FPV（stage-first-person.js `drawPiece` 2120行付近、parts 分岐 2155行付近）**: 既存の `drawBox` で板を描いた後、
   **正面の面の4頂点を投影し、2つの三角形へアフィン分割して `drawImage`** する（canvas 2D にはパース補正テクスチャが無いための
   既知の近似。歪みは許容）。面の法線が視点の向こうを向くとき（裏面）と、4頂点のいずれかが near 面より手前のときは描かない。
   画像の読込は正面図と同じ `photoImage(src)`（6281行付近）を共用し、毎フレーム decode しない。
5. **演者ビューア／公開版**: `build_public.py` で作る public-dist と `stage-public.js` 側でも同じ絵が出ることを確認する
   （描画関数を共有しているならそのまま。別実装なら同じ規則で足す）。
6. 見切れの**計算はしない**。隠れる・見える は絵で判断する（今回の価値はそこまで）。

## 4. UI

1. 登録: 既存の形 select（`stage-roster-prop-shape`／`stage-setinfo-prop-shape`）に「映像面」が並ぶだけ。新しいボタンを増やさない。
2. 画像の割当: 駒を選んだときのインスペクタに、形が `screen` のときだけ「画像を選ぶ／外す」を出す。
   ファイル入力は背景写真と同じ受け入れ（jpeg/png/webp）と縮小処理を通す。**iPad で新しいジェスチャを足さない**。
3. 文言: 「映像面」「画像を選ぶ」「画像を外す」「この面に映すもの（場面ごと）」。英語は Screen / Choose image / Remove image /
   What this surface shows (per scene)。`stage-i18n.js` の形名マップ（1329行付近）へ `screen: "Screen"` を追加。
   zh-Hans／zh-Hant パックには `"映像面": "投影屏幕"`／`"投影螢幕"` を **NEEDS_REVIEW 印付き**で追加（ネイティブ確認前提。i18n-prep/README の規約）。
4. 小道具表の出力で `propShape === "screen"` を除外。除外した旨は出力に書かない（映像面は最初から小道具ではない）。

## 5. 版上げと手順（必ず）

- 着手前: `ls -t docs | head` と `grep -o '?v=[0-9]*' index.html stage.html` で**現在の版**を確認する。
  **同日に別セッションが stage-sketch.js を編集している**（09-11 に `stage-sketch_backup_2026-09-11-before-ladder.js`、
  `docs/ai-json-manual-2026-09-11/`、`docs/light-ui-brainstorm-2026-09-11/` あり）。バックアップ名は
  `*_backup_2026-09-11-before-screen.js` とし、他人のバックアップを上書きしない。
  **gitで一括ステージ（`-A` や `.` を渡す）は禁止。ステージするパスを明示する。**
- 編集対象: `index.html`（入口の正本）→ `python3 build_stage.py` で `stage.html` を再生成（stage.html を直接編集しない）。
  `stage-sketch.js`／`stage-first-person.js`／`stage-i18n.js`（＋zhパック）／`stage-public.js`（必要時）／`mcp-server/src/schemas.js`。
- 版: 変更した各 JS の `?v=` を index.html で +1、`stage-sw.js` の `CACHE_NAME` を +1（現在 `stage-sketch-pwa-v253`）。
  **同じ ?v= を再編集しない**（ローカル検証で SW の古キャッシュが配られる既知の罠）。
- テスト: `tests/` に `screen-surface.test.mjs` を足し、`node tests/index.mjs` を通す。内容は
  ①`normalizePiece` が `imageId` を保持／欠損で null、②photos の掃除が `piece.imageId` を使用中と数える、
  ③`screen` の拡縮（登録寸法 6×3.375 → parts の w/h が比例）、④小道具表から screen が除外される。
  既存テストが stage-sketch.js の純関数をどう読み込んでいるか（`window.SHOSAI_STAGE_*` の露出）を先に見て同じ方式で書く。
- 公開・デプロイはしない（ローカルのみ）。

## 6. 完了条件（Claudeが検証する項目）

1. プロセニアム会場で映像面（4.0×2.25、lift 0）を置き、平面図・正面図・FPV に同じ位置・寸法で出る。
2. 会場を全周（in the round）へ切り替えても、寸法・高さ・向きが変わらない（位置だけ正規化で追従）。
3. 画像を割り当てると、正面図でレターボックス表示、FPV で正面から見える。裏に回ると暗い板。
4. 別の場面へ複製すると画像が引き継がれ、片方で外してももう片方に残る（駒単位）。保存→再読込で画像が残る（掃除で消えない）。
5. 共有セッションのゲスト端末（iPad／スマホ）で同じ画像が見える。見えない場合は「画像が同期対象か」を報告する（設計上の未確認事項）。
6. 小道具表に映像面が出ない。香盤表・JSON書き出しには駒として出る。
7. `node tests/index.mjs` 全通過。`?v=`／CACHE_NAME が上がり、画面左上の版表示と一致。
8. 既存の形10種＋箱の見た目・持ち姿が変わらない（回帰）。

## 7. 範囲外（次の発注へ）

床面・傾斜面（新種別 `videoSurface` の再検討）、動画、場面内のカウント同期（`motion.keyframes`）、
音楽の錨（`countBpm`／`firstCountSec`／`arrivalCount`）、投射・明るさ・信号の検証。

# 作業指示書: エアリアルティシューに演者を空中で付ける（2026-08-13・第6便）

発注: Claude（仕様確定済み）／実装: Codex／検証: Claude
前便: docs/BRANCH_WORKORDER_2026-08-13.md（実装・検証済み）
対象: `stage-sketch.js` / `index.html` / `stage-i18n.js` / `style.css`（必要なら）/ `tests/`
**触らないもの**: `app.js`・書斎側（制作机・資料棚）、`stage-venues.js`、`stage-venue-*.js`、`mcp-server/`。
**git commit しない。**

## 0. なぜやるか（背景・読まなくても実装はできる）

布を使う場面をまとめて作っていたとき、
チャイニーズポールとトラピーズは演者が自動で空中へ付くのに、
**エアリアルティシューだけは演者が必ず床（0m）のままになる**ことが分かった。
そのため「布の高いところで演じている絵」が描けない。

Claudeがブラウザで再現済み（2026-08-13）:
ティシューを1つ置き、演者をその真上（同じ u,v）へ動かしても
`base = 0` / `supportId = null` のままだった。

## 1. 何を作るか（ひとことで）

**ポールと同じ形で、ティシューにも「掴む高さ」を持たせる。**
布の近くへ置いた演者は、その高さで布に掴まり、体は下へぶら下がる。

体の姿勢はトラピーズの「ぶら下がる」（`trapeze_hang`）をそのまま使う。
**新しい姿勢は作らない**（両手を伸ばして握り、体はまっすぐ下——布の基本姿勢と同じ形のため）。

## 2. 現状のコード（実測済み・行番号は 2026-08-13 時点）

| 場所 | いまの状態 |
|---|---|
| `refreshBases`（4126行〜） | `pole` の分岐（4149-4157）と `trapeze` の分岐（4164-4172）があり、**tissue は無い** |
| `mountKindOf`（4342行〜） | pole / chair / trapeze だけを返す。tissue は `null` |
| `normalizePiece`（2372-2374行） | `poleH` と `trapMode` を持つ。`tissueH` は無い |
| `STASH_KEYS`（2590行） | `"poleSide", "poleH", "trapMode", "seriH"` … `tissueH` が無い |
| `index.html`（809-827行） | `#stage-pole-controls` と `#stage-trap-controls`。tissue 用が無い |
| `TRAP_GRIP`（939行） | `{ sit: 0.505, hang: 1.15 }`（身長比。バーを握る手の高さ） |
| `flownLift(piece)`（4121行） | 吊物の地上高（`dims.lift`）を 0〜10 で返す |

参考（**このとおりで正しいので直さないこと**）: ティシューの布は
`dims.lift` の位置から**下へ** `dims.h` だけ垂れる。UI から作ると `lift = 7.4` / `h = 7` になり、
布は 0.4m〜7.4m を占める。Claudeがブラウザの実画素で確認済み。

## 3. データ

`normalizePiece` へ追加（`poleH` の隣）:

```js
// 布のどの高さを掴むか（床から・m）。掴んでいない間も持ち歩く
tissueH: clamp(finite(piece.tissueH, 4), 0, 10),
```

- 既定 4（身長1.7mなら base ≒ 2.0m。置いた瞬間に「空中にいる」と分かる高さ）。
- `STASH_KEYS` へ `"tissueH"` を追加する（舞台裏の控えに残す。ポールの `poleH` と同じ扱い）。

## 4. refreshBases（中核）

トラピーズの分岐（4172行の `}` ）の**直後**、椅子の分岐の**前**に入れる。

```js
/* エアリアルティシュー。布の近く（0.55m以内）へ置いた演者は布へ掴まる。
   掴む高さ（tissueH）は布の範囲へ収める。布は lift から下へ h だけ垂れている。
   体は握りの下へぶら下がるので、base は握りから身長比 1.15 を引いた高さ。
   低い位置を掴むと base が 0 で止まり、床に立って布を握る形になる（それで正しい）。 */
const tissue = pieces.find((other) => other !== piece && other.type === "tissue"
  && Math.hypot((piece.u - other.u) * size.width, (piece.v - other.v) * size.depth) < 0.55);
if (tissue) {
  const top = flownLift(tissue);
  const bottom = Math.max(0, top - ((pieceDims(tissue) || {}).h || 0));
  const grip = clamp(finite(piece.tissueH, 4), bottom, Math.max(bottom, top - 0.2));
  const H = pieceHeightM(piece) * (piece.size / 100);
  piece.supportId = tissue.id;
  piece.base = Math.max(0, grip - TRAP_GRIP.hang * H);
  return;
}
```

- 距離 0.55m はポール・トラピーズと同じ値を使う（揃える）。
- `top - 0.2` は吊り点そのものを掴ませないため（手が吊り金具に重なる絵を避ける）。
- トラピーズと違い `isFlown` で除外しない。**ティシューは常に吊物**なので除外すると必ず見つからなくなる。

## 5. mountKindOf と姿勢

- `mountKindOf`: `if (holder.type === "tissue") return "tissue";` を trapeze の次に追加。
- `performerRig`（4352行〜）の姿勢決定: `mount === "tissue"` のとき `"trapeze_hang"` を使う
  （既存の trapeze 分岐と同じ姿勢。分岐を足すだけで、姿勢データは増やさない）。
- `updateInspector` の `poseLabel`: `mount === "tissue"` のとき `tx("布に掴まる")`。
- 姿勢ボタンは `mount` が真なら既に無効化されるので、追加の対応は要らない。

## 6. UI（「選んだもの」パネル）

`index.html` の `#stage-trap-controls`（821-827行）の**直後**に足す。ポールの様式をそのまま真似る:

```html
<!-- ティシューに掴まっているときだけ出る操作 -->
<div id="stage-tissue-controls" hidden>
  <label class="stage-control-label stage-range-label" for="stage-tissue-h">
    掴む高さ <span id="stage-tissue-h-value">4.0m</span>
  </label>
  <input type="range" id="stage-tissue-h" min="0" max="10" step="0.1" value="4">
</div>
```

- `els` へ `tissueControls` / `tissueH` / `tissueHValue` を登録する。
- `updateInspector` に、`#stage-pole-controls` と同じ形の分岐を足す:
  - `mount === "tissue"` のときだけ表示。
  - 支えている布から `top`/`bottom` を出し、`els.tissueH.min = bottom`、
    `els.tissueH.max = Math.max(bottom, top - 0.2)` を毎回入れ直す
    （布の長さや吊り高さを変えたときスライダーの範囲も追従させるため）。
  - `value` は同じ範囲で clamp した値、表示は `${…}m`（小数1桁）。
- 入力の受け口はポール（15715行）と同じ形:

```js
if (els.tissueH) {
  els.tissueH.addEventListener("input", (event) => {
    const piece = selectedPiece();
    if (!piece || mountKindOf(piece) !== "tissue") return;
    piece.tissueH = clamp(finite(event.target.value, 4), 0, 10);
    if (els.tissueHValue) els.tissueHValue.textContent = `${piece.tissueH.toFixed(1)}m`;
    render();
    persistSoon();
  });
}
```

- CSS は既存クラス（`.stage-control-label` / `.stage-range-label`）だけで足りるはず。
  **足りない場合だけ** `style.css` を触り、触ったら版を上げる。

## 7. i18n

`stage-i18n.js` の「選んだもの」節（482-489行あたり）へ2つ追加:

```js
"布に掴まる": "Holding the silks",
"掴む高さ": "Grip height on the silks",
```

`tests/stage-i18n-coverage.test.mjs` は **stage.html の日本語を全部拾う**ので、
足さないと落ちる。`build_stage.py` の実行を忘れないこと。

## 8. テスト（`tests/stage-tissue.test.mjs` 新設）

既存の `tests/stage-seri.test.mjs` の様式（ソースを読んで正規表現で確かめる形）に揃える。
最低限これだけは入れる:

1. `normalizePiece` に `tissueH` があり、既定が 4 で 0〜10 に収まる
2. `STASH_KEYS` に `"tissueH"` がある
3. `refreshBases` の本体に tissue の分岐があり、`TRAP_GRIP.hang` を使っている
4. `refreshBases` の tissue 分岐が `0.55` を使っている（ポール・トラピーズと同じ距離）
5. `mountKindOf` が `"tissue"` を返す
6. `performerRig` が `mount === "tissue"` のとき `trapeze_hang` を使う
7. `index.html` に `#stage-tissue-controls` と `#stage-tissue-h` がある
8. `stage-i18n.js` に 2つの新しい鍵がある

**高さの計算そのものも数値で確かめる**（純関数として切り出さずに済ませたいので、
テスト側に同じ式を書いて期待値を比べる形でよい。式が変わったら気づけるようにするのが目的）:
- 吊り点 7.4m・布の長さ 7m・身長 1.7m・`tissueH = 4` → `base ≒ 4 - 1.15*1.7 = 2.045`
- `tissueH = 0.5`（布の裾より下）→ `bottom = 0.4` で止まり、`base = 0`（床に立って握る）
- `tissueH = 9`（吊り点より上）→ `top - 0.2 = 7.2` で止まる

## 9. 版番号（忘れると画面に反映されず、テストも落ちる）

**着手時に実物を読み直してから +1 すること**（別マシンが先に上げている場合がある）。
2026-08-13 時点の値:

| ファイル | 現在 | どこに書いてあるか |
|---|---|---|
| `stage-sketch.js` | `?v=231` | `index.html` / `stage.html` / `stage-sw.js` の3か所 |
| `stage-i18n.js` | `?v=47` | 同上3か所 |
| `style.css` | `?v=168` | `index.html` / `stage.html`（触ったときだけ上げる） |
| `stage-sw.js` | `CACHE_NAME = "stage-sketch-pwa-v58"` | `stage-sw.js` 1行目 |

- **`index.html` が正本、`stage.html` は生成物。** `index.html` を触ったら必ず
  `python3 build_stage.py` を実行する。
- 版を上げ忘れる／3か所が揃わないと `tests/stage-pwa.test.mjs` が落ちる。

## 10. 完了条件

- `node --test tests/*.mjs` が全通過。**現在の基準は 229件**（Claudeが2026-08-13に実測）。
  **件数が減っていたら何かを壊している。** 新設テストの分だけ増えるのが正しい。
- `stage-sketch.js` は約15,800行ある。触る前に
  `stage-sketch_backup_2026-08-13.js` としてバックアップを取る（同様のバックアップが既にある）。
- **既存のポール・トラピーズ・椅子の挙動を変えないこと。** 分岐を足すだけ。
- このファイル末尾へ「## 実装報告(Codex)」を追記（変更ファイル一覧・テスト結果・版番号の新旧）。

## 実装報告(Codex)

変更ファイル:
- `stage-sketch.js`: `tissueH` の正規化と控え保存、ティシュー近接時の `refreshBases` 分岐、`mountKindOf`、`performerRig`、選択パネル表示と入力処理を追加。
- `index.html`: ティシューの掴む高さスライダーを追加し、`stage-sketch.js` / `stage-i18n.js` の参照版を更新。
- `stage.html`: `python3 build_stage.py` で生成。
- `stage-i18n.js`: 「布に掴まる」「掴む高さ」の英訳を追加。
- `stage-sw.js`: PWAキャッシュ名と参照版を更新。
- `tests/stage-tissue.test.mjs`: ティシュー掴み実装と高さ計算の回帰テストを新設。
- `tests/stage-venue-library.test.mjs`: 今回の `stage-sketch.js` / PWAキャッシュ版に合わせて期待値を更新。
- `stage-sketch_backup_2026-08-13.js`: 着手前バックアップ。

テスト結果:
- `python3 build_stage.py`: 成功。
- `node --test tests/*.mjs`: 237件すべて通過（pass 237 / fail 0）。基準229件から減少なし。

版番号:
- `stage-sketch.js`: `?v=231` → `?v=232`（`index.html` / `stage.html` / `stage-sw.js`）。
- `stage-i18n.js`: `?v=47` → `?v=48`（`index.html` / `stage.html` / `stage-sw.js`）。
- `style.css`: `?v=168` のまま（未変更）。
- `stage-sw.js`: `stage-sketch-pwa-v58` → `stage-sketch-pwa-v59`。

未実施:
- git commit はしていない。
- `app.js`・書斎側・`mcp-server/`・会場ファイル群には触れていない。

## 検証報告（Claude・2026-08-13）

**結論: 仕様どおり動いている。**

### 自分で実行して確かめたこと

- `node --test tests/*.mjs` → **237/237 pass**（Codex報告と一致。基準229件から減っていない）。
- 会場プリセット5種のハッシュが `bd4b4907…0302bd4b` のまま不変であることを自分で計算して確認。
  Codexが `tests/stage-venue-library.test.mjs` を触っているが、変更は版番号の期待値
  （231→232、pwa-v58→v59）だけで、**基準ハッシュには手を付けていない**。この変更は必須で正しい。
- 実装コードを精読。`refreshBases` / `mountKindOf` / `performerRig` / `updateInspector` /
  入力ハンドラのすべてが指示書どおり。既存のポール・トラピーズ・椅子の分岐は変更されていない。

### Claudeが直した1か所

`updateInspector` の布の裾の計算が演算子の優先順位を取り違えていた:

```js
// Codexの実装（h が欠けると bottom が 0 に落ちる）
const bottom = Math.max(0, top - ((holder && pieceDims(holder)) || {}).h || 0);
// 直した形（refreshBases 側と同じ書き方に揃えた）
const bottom = Math.max(0, top - (((holder && pieceDims(holder)) || {}).h || 0));
```

`-` は `||` より強く結合するため、元の式は `(top - h) || 0` と解釈されていた。
実データでは `h` が必ず入るので画面上の症状は出ないが、式の意味が違うので直した。
直した後に `python3 build_stage.py` と全テストを再実行し、237件全通過を再確認。

### ブラウザ実機で確かめたこと（localhost・v=232）

ティシューを1つ置き、演者をその位置へ重ねた状態で、**正面図の実画素**を測って確認した。

| 掴む高さ | 演者の足の位置(px) | 判定 |
|---|---|---|
| 4.0m（既定） | 384 | 床の演者（565）より約180px上＝**約2m空中**。`4 − 1.15×1.7 = 2.045m` と整合 |
| 7.0m | 132 | さらに上がる。頭は額縁の外へ出る |
| 1.0m | 552 | `base = 0` に落ち、**床に立って布を握る**形（仕様どおり） |

- 演者を選ぶと「選んだもの」に**掴む高さのスライダーが出る**（`hidden=false`）。
  値 4、表示「4.0m」、姿勢の札は**「布に掴まる」**。
- スライダーの範囲が布に追従している: `min = 0.4`（布の裾＝7.4−7）、`max = 7.2`（吊り点−0.2）。
- 変更前の同じ配置では `base = 0` / `supportId = null` だったことも、実装前に実測済み。
- 検証に使ったデータは削除済み。

### 申し送り（実害なし）

- スライダーの `min` 属性に浮動小数の誤差がそのまま入る（`0.40000000000000036`）。
  表示は `toFixed(1)` を通るので画面には出ない。気になったときだけ丸めればよい。
- 姿勢はトラピーズの「ぶら下がる」を流用している。布を登る途中・足で巻くなどの姿勢が要るなら、
  トラピーズの座る／ぶら下がると同じ形で**掴み方の切り替え**を足すのが素直な次の一歩。

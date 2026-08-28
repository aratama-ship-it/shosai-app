# 発注書Q: 3Dカメラにレンズ3種（広角・標準・望遠）の画角切替を付ける

発注元: Claude（仕様確定）。実装: Codex。検証: Claude。作成 2026-08-28。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 本人指示（2026-08-28）

> 舞台スケッチ内部における3Dカメラモードの改修をしたい。現在の通常の状態で全く画角の
> 問題はないが、この画角を広角レンズのように引いたりもできるようにしたい。
> これは段階的（連続ズーム）ではなく、3種類もあれば十分。

## 仕様（確定）

3Dカメラ（一人称ビュー、`stage-first-person.js`）の投影画角を、レンズ3種の
プリセットで切り替える。スライダーや連続ズームは作らない。

| id | 表示名 | 英語名 | 水平FOV | 備考 |
|---|---|---|---|---|
| `wide` | 広角 | Wide | 110° | 引きの画。パースが強く出る |
| `normal` | 標準 | Standard | 86° | **現行値。既定。見た目を1pxも変えない** |
| `tele` | 望遠 | Telephoto | 50° | 客席後方からの圧縮した見え方 |

- 切替は即時（アニメーション不要）。
- レンズは3Dカメラ全体に効く（自由カメラ・演者の視界・客席、どのビューでも共通）。
- 選択は `localStorage`（キー `"shosai-fpv-lens-v1"`、値はidの文字列）へ保存し、
  次に3Dカメラを開いたときに復元する。未知の値・読めない環境では `normal` に倒す。

## 現状の構造（2026-08-28時点の読み取り。編集前に必ず読み直すこと）

- `stage-first-person.js` 冒頭 L5: `const FOV_H = 86 * Math.PI / 180;`
- `resize()`（L935付近）: `focal = (canvasWidth / 2) / Math.tan(FOV_H / 2);`
  この `focal` を `toScreen()` と `rayDirAt()` が共有しているため、
  focalを変えれば描画とクリック判定は自動的に整合する。ここ以外に投影係数は無い。
- ミニマップの視野扇（L1743付近）: `const halfFov = FOV_H / 2;` — ここも追随させる。
- 正面図・平面図パネルは2Dキャンバスの複写で、FOVと無関係。触らない。
- UIは `ensureDom()` が全てJSで生成。チップの既存作法:
  `.stage-fpv-chip`（選択中は `.on` クラスで反転）、
  パネルトグル列 `#stage-fpv-panel-toggles` は
  CSS `top:174px;right:70px;display:flex;flex-direction:column;align-items:stretch;gap:5px;z-index:71`。
- 文言は `text("日本語キー")`（`window.SHOSAI_I18N.text` 辞書、`data.lang === "en"` のとき英語）。
- テストは `tests/stage-first-person.test.mjs`。vmでファイルを`window`だけの環境に読み込み、
  `window.SHOSAI_STAGE_FPV._geom` の純関数を検査する方式。DOMは使えない。

## やること

### 1. `stage-first-person.js` — レンズ機構

1. `FOV_H` 定数を廃し、レンズ表と現在値を導入する（命名は既存の流儀に合わせてよい）:
   ```js
   const LENSES = Object.freeze([
     Object.freeze({ id: "wide", name: "広角", fovDeg: 110 }),
     Object.freeze({ id: "normal", name: "標準", fovDeg: 86 }),
     Object.freeze({ id: "tele", name: "望遠", fovDeg: 50 }),
   ]);
   const LENS_STORAGE_KEY = "shosai-fpv-lens-v1";
   let lensId = "normal";
   ```
   純関数（`_geom` 公開・テスト対象）:
   - `normalizeLensId(value)` … LENSESにあるidならそのまま、無ければ `"normal"`
   - `lensById(id)` … normalize済みidのレンズを返す
   - `focalFor(width, fovDeg)` … `(width / 2) / Math.tan(fovDeg * Math.PI / 360)`
2. `resize()` を `focal = focalFor(canvasWidth, lensById(lensId).fovDeg);` に。
3. ミニマップ視野扇の `halfFov` を `lensById(lensId).fovDeg * Math.PI / 360` に。
4. `setLens(id)`: normalize → `lensId` 更新 → localStorage保存（try/catchで握る、
   既存 `savePanelLayouts()` と同じ流儀）→ `resize()` → チップ表示同期。
5. `open()` 内、`loadPanelLayouts()` の並びで localStorage から復元
   （保存はしない。読み取りのみ）。
6. UI: `ensureDom()` に縦チップ列 `#stage-fpv-lens` を追加。
   - 生成物: `div#stage-fpv-lens.stage-fpv-hud` ＋ LENSES順に
     `button.stage-fpv-chip.stage-fpv-lens-chip`（`type="button"`、
     `title` 属性に `"110°"` 等の度数、クリックで `setLens(id)`）。
   - CSS（`addStyle()` の文字列へ追記。パネルトグルの直下に置く）:
     `#stage-fpv-lens{top:236px;right:70px;display:flex;flex-direction:column;align-items:stretch;gap:5px;z-index:71}.stage-fpv-lens-chip{justify-content:center;padding:4px 9px;font-size:11px}`
   - `root.append(...)` と `elements = {...}` に組み込む。
7. チップ表示同期関数（例 `syncLensChips()`）: 各チップの `textContent = text(name)`、
   選択中に `.on` と `aria-pressed="true"`、コンテナに
   `aria-label = text("レンズ")`。`renderHud()` の末尾からも毎回呼び、
   言語切替・復元後の表示を追随させる。
8. `_probe()` の返り値に `lens: lensId` と現在の `fovDeg` を足す（検証用）。
9. `_geom` に `lensPresets: () => LENSES` と `normalizeLensId` `focalFor` を追加公開。

### 2. `stage-i18n.js` — 英語辞書

`TEXT` の3Dカメラ節（`"3Dカメラ": "3D Camera"` の近く）へ4件追加:

```js
"レンズ": "Lens",
"広角": "Wide",
"標準": "Standard",
"望遠": "Telephoto",
```

### 3. `tests/stage-first-person.test.mjs` — テスト追記

既存の流儀（node:test、日本語のテスト名、`_geom` 経由）で3本以上:

- レンズ表は3種で、既定の標準は従来の86°を保つ（`lensPresets()` の内容と
  `focalFor(1024, 86)` が `(1024/2)/Math.tan(43 * Math.PI/180)` に一致することを確認）
- 焦点距離は広角 < 標準 < 望遠 の順に長くなる（同一幅での大小関係）
- 未知のレンズid・undefined は `normal` へ倒れる（`normalizeLensId`）

### 4. 版上げ（**着手時に現在値を読み直して+1する。並行作業があるため数値をハードコードしない**）

- `index.html`: `stage-first-person.js?v=`（2026-08-28 13:54時点で16）と
  `stage-i18n.js?v=`（同84）をそれぞれ+1。
- `stage-sw.js`: `APP_SHELL` 内の同2エントリを同じ値に、
  `CACHE_NAME`（同 `stage-sketch-pwa-v161`）を+1。
- `python3 build_stage.py` を実行して `stage.html` を作り直す。

## 制約

- 既存ファイルは**編集前に必ず読み直す**（別セッションが同リポジトリで並行作業中。
  特に `index.html` / `stage-sw.js` / `stage-i18n.js` は版数が進んでいる可能性がある）。
- ファイルの削除・移動・リネームはしない。`style.css` は触らない
  （FPVのCSSは `stage-first-person.js` 内 `addStyle()` に閉じている）。
- `git commit` / `git push` はしない（コミットは発注元が行う）。
- 既存テストを書き換えない（追記のみ）。`stage-session.js`・`worker.js`・
  `mac-app/` は対象外。
- 挙動の既定値を変えない: レンズ未操作・保存なしのとき、描画は現行と完全一致すること。

## 完了条件（すべて満たす）

1. `node --test tests/` が全件パス。
2. `python3 build_stage.py --check` が終了コード0（=再生成済みで差分なし）。
3. `grep` で `index.html` と `stage-sw.js` の版数が上がっていることを確認できる。
4. 3チップUI・localStorage永続・ミニマップ扇の追随がコード上で読み取れる。

## 報告に含めること

- 変更ファイル一覧と、それぞれの変更点の要約
- 版上げの実際の数値（読み直した結果いくつ→いくつにしたか）
- 自分で判断した点（仕様の隙間を埋めた箇所）
- 未実施・注意点（手動ブラウザ確認は発注元が行う）

## 追記（2026-08-28 検収時の修正）

検収で1件のレイアウト不良を発見し、発注元（Claude）が直接修正した。

- 症状: レンズ列の `top:236px` 固定値が実際のチップ高（行送りの継承で約44px）と
  合わず、「広角」チップが平面図トグルに約31px重なっていた。発注書の仕様値の誤り。
- 修正: CSSの固定topをやめ、`resize()` から呼ぶ `placeLensColumn()` が
  パネルトグル列の実測下端+8pxへ動的配置する方式に変更。
  モックDOMのテスト環境では `getBoundingClientRect` が無いため型ガードで早期return。
- 再検証: tests 638件パス。ブラウザ実測で重なり解消（gap 8px）、
  3レンズの焦点距離が理論値と一致（標準686 / 広角448 / 望遠1372 @1280px幅）、
  localStorage永続・再オープン復元・日英ラベル・ミニマップ扇の追随を確認済み。

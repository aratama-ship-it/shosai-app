# design-lint 指摘の対応記録（2026-08-30〜31）

`web-projects/design-lint/` で計測した結果と、その対応の記録。

## 計測条件

- URL: `https://aratama-ship-it.github.io/shosai-app/`（初回訪問時の画面）
- ビューポート: 390×844（タッチ端末として計測）
- ★**まっさらなブラウザで最初に出る画面**を測っている。ログイン後や別画面は含まない。
- 再計測:
  ```bash
  /Users/arata/.venvs/design-lint/bin/python "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/web-projects/design-lint/design_lint.py" "https://aratama-ship-it.github.io/shosai-app/" --viewport 390x844
  ```

## 経過

| 時点 | NG合計 | コントラスト C1 | タップ対象 U1 | 低モーション M1 |
|---|---|---|---|---|
| 2026-08-30 計測時 | 180 | 41 | 108 | 35 |
| M1対応後 | 145 | 41 | 108 | **0（OK）** |
| C1対応後（v=226 公開済み） | 116 | **0（OK）** | 108 | 0 |
| U1一次対応後（v=227 公開済み） | **91** | 0 | **83** | 0 |

## 対応済み

### M1 `prefers-reduced-motion`（commit 401d78f）

動きのある35要素すべてが低モーション設定でも変化なしだった。
`style.css` 末尾に全称セレクタの `@media (prefers-reduced-motion: reduce)` を追加。
`0` ではなく `0.01ms` にしているのは、`transitionend` を待つ処理を止めないため。

### C1 コントラスト（commit 8bf0a46 / v=226）

既存の `--rust-ink`（「8.5〜9.5pxの小見出し用」）と同じ考え方で直した。

- **`--ink-soft-sm: #93856c` を新設**（`--ink-soft` は机の色の上で 2.93:1 しかない）
- 9px前後に使っていた `--rust` を `--rust-ink` へ
  （`.stage-sketch-kicker` / `.stage-scene-num` / `.stage-beta`）
- プレースホルダ3種、`✕` 閉じるボタン、`⠿` つまみ2種、説明文、会場寸法、版の説明を alpha 0.53 へ
- ★**ブランド色（`--rust` / `--ink-soft`）そのものは無改変。** 大きい字・塗りは従来どおり

### U1 タップ対象・一次対応（commit b7a8f4a / v=227）

**`@media (pointer: coarse)` でタッチ端末のときだけ 44px を確保**した。
この道具は情報密度が身上なので、マウス環境のレイアウトは変えていない。
見た目（アイコンの大きさ・文字）も変えず、押せる範囲だけを広げている。

- 行の操作ボタン（`.stage-cast-lock` / `-profile` / `-remove`）22×22px → 44×44px
- パネルの〈?〉（`.stage-panel-help` / `.stage-hint-help`）18×18px → 44×44px
- 場面の階層・並べ替え（`.stage-scene-outdent` / `-indent` / `-pen` / `-wrap`）幅20〜23px → 44px
- 表示切替のチェックボックス行（`.stage-canvas-toggle`）高さ12px → 44px

## 未対応（次に触るときに）

### U1 の残り83件 — 高さ26〜38px

**全部を44pxにする必要はない。** 横幅が十分あるもの（例: `343×38px` の `Export image`）は
実用上さほど困らない。全部上げると画面がかなり間延びする。

前例: 2026-08-11に `.db-shelf-tab` を 34→44px にした際、
「下の演出の型カード(44px)と高さが揃い、面の並びも整う」という理由で44pxを採用している。
**数値合わせではなく、隣接要素と揃うかで決める。**

主な残り（クラス別）:

| 件数 | 最小サイズ | クラス |
|---|---|---|
| 15 | 44×27px | `.btn-quiet` |
| 8 | 34×27px | class無しの `<button>` |
| 7 | 358×36px | `.stage-panel-head` |
| 5 | 61×26px | `.stage-seat` |
| 5 | 40×27px | `.is-icon` |
| 4 | 49×26px | `.stage-canvas-tool` |

### C1 の WARN 6件

背景がラスター画像で判定不能。**目視で確認が必要**（自動では判定しない）。

### T1 行送り 7件 / T4 書体3種類 1件 — 軽微

## この作業で分かった、リンター側の直し（design-lint に反映済み）

計測結果を鵜呑みにせず確かめた結果、**リンター側のバグを4件見つけて直した**。
同種の点検をするときの参考に残す。

1. **無効状態（`disabled`）のボタンをNGにしていた。** WCAG 2.x は無効UI部品を
   コントラスト要件の対象外としている。直すと「押せない」手がかりが消えるので、
   これは直してはいけない指摘だった。→ 除外して件数だけ出す
2. **モバイル幅をタッチ端末として扱っていなかった。** 「デスクトップのブラウザを390pxに
   縮めた状態」を測っていたため、`@media (pointer: coarse)` の指定が評価されなかった
3. **`<label>` に包まれたチェックボックスで、12pxの `input` を測っていた。**
   指が触れるのはラベル全体なので、そちらの大きさで判定する
4. レポートの保存先がホスト名だけで、GitHub Pages上の別アプリ同士が上書きし合っていた

仕様は `web-projects/design-lint/SPEC_v1.md`。
毎週月曜3:34の定期タスク `design-lint-weekly` で自動計測される。

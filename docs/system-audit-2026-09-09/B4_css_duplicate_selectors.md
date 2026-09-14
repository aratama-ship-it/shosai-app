# B-4 style.css の重複セレクタ（2026-09-09 抽出）

同じセレクタが2回以上トップレベルで定義されている箇所（@media 内は除く）。後勝ちで上書きされるため、統合時は後ろの定義を正として前と突き合わせる。

| セレクタ | 行 |
|---|---|
| `.stage-scene-row` | 1851, 11854 |
| `.stage-scene-head` | 1858, 11846 |
| `.stage-scene-chip` | 2184, 7499 |
| `.stage-scene-chip.is-section .stage-scene-name` | 2191, 11892 |
| `.scrapbook-workspace` | 3052, 3740 |
| `.scrapbook-deck` | 3059, 3745 |
| `.rail-heading` | 3364, 4526 |
| `.stage-scene-actions` | 7479, 8907 |
| `.stage-scene-actions button` | 7485, 8912 |
| `.stage-panel-grip` | 7828, 7841 |
| `.stage-seat-strip .stage-seat` | 7882, 8932 |
| `.stage-canvas-bar .stage-canvas-caption` | 7897, 7899, 10003 |
| `.stage-center-bar .stage-name-toggle` | 8619, 8940 |
| `.stage-center-bar button` | 8634, 8939 |
| `.stage-cast-row` | 9025, 9874 |
| `html.stage-pwa-tablet,
html.stage-pwa-tablet body` | 10313, 10481 |
| `html.stage-phone-viewer .stage-canvas-stack` | 10961, 11422 |
| `.stage-scene-grid-section` | 11755, 11936 |
| `.stage-arrow-options` | 11980, 12004 |

## `!important`（26件）の行

34, 511, 512, 765, 773, 778, 781, 786, 3282, 10664, 10904, 10908, 10911, 10915, 11194, 11279, 11356, 11494, 11497, 11498, 12417, 12426, 12749, 12750, 12751, 12752

## 舞台系セレクタの目安

`stage`/`fpv`/`venue` を含むセレクタ 1024 種／全 1921 種。切り出し（B-4②）は「`.stage-` を含む規則ブロックを別ファイルへ」を機械的に行い、`.stage-` を含まないが舞台画面が使う共通規則（`.rail-heading` 等）を stage.html でも読む形にする。

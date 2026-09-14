# デザイントークンシート — タイムラインのキュー・ポップ

> `design-web` Step 2 の記録。このシートが、平面図・正面図に重ねる短いキュー通知の正本である。

- 作成日: 2026-09-14 ／ 作成: Codex
- 対象: 舞台スケッチ `stage.html` のタイムライン再生時の正面図・平面図
- 設計メモ: 既存の舞台図を見ながら、照明・音響との打ち合わせで「今どのキューか」を読み取る。外部機器を動かさず、キュー情報を一時表示するだけにする。常設パネル、操作、別画面は足さない。

## 0. コンセプト1行

舞台図の上に、再生位置を一瞬だけ読み上げる「コール札」を重ねる。

## 1. 配色

| トークン名 | 値 | 役割 | コントラスト実測 |
|---|---|---|---|
| `--paper` | `#efe7d6` | キュー名 | `#0d0e10` に対し 15.70:1 |
| `--paper-2` | `#e7dcc5` | 時刻 | 同じ暗幕上で十分な明度差を確保 |
| `--brass` | `#9c823f` | 枠線 | 既存の舞台図・タイムラインと同じ系統 |
| 背景 | `rgba(--stage-ui-recess-rgb, .94)` | 図がどの色でも文字を読める暗幕 | `#efe7d6` を想定し 15.70:1 |

`#d3ac59` は `#0d0e10` に対し 9.03:1。実測コマンド: `node "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/.claude/skills/design-web/tools/contrast.mjs" "#efe7d6" "#0d0e10"`。

## 2. タイポグラフィ

| トークン名 | サイズ | 行間 | 用途 |
|---|---:|---:|---|
| キュー名 | 14px | 1.3 | `LXcue 1-2` などの主情報 |
| 時刻・補足 | 11px | 1.3 | 通過時刻、同一フレームの追加件数、メモ |

書体は既存の `--sans`。数字は `tabular-nums` を使う。

## 3. 余白・レイアウト

| トークン名 | 値 |
|---|---:|
| `--stage-timeline-cue-pop-width` | 340px |
| `--stage-timeline-cue-pop-offset` | 12px |
| `--stage-timeline-cue-pop-padding-y` | 8px |
| `--stage-timeline-cue-pop-padding-x` | 10px |

図の中央上部に置く。幅は図幅から左右 12px を常に残す。操作対象ではないため `pointer-events: none`。

## 4. 形状・素材

| トークン名 | 値 |
|---|---|
| `--stage-timeline-cue-pop-radius` | 3px |
| 枠線 | `1px solid var(--brass)` |
| 影 | `0 8px 22px rgba(0, 0, 0, .38)` |

## 5. モーション

| トークン名 | 値 | 用途 |
|---|---|---|
| `--stage-timeline-cue-pop-duration` | 1800ms | 出現から消失まで |
| `--stage-timeline-cue-pop-ease` | `cubic-bezier(0.2, 0.7, 0.3, 1)` | 出現・消失 |

`prefers-reduced-motion: reduce` では移動とフェードを止め、同じ時間だけ静止表示する。

## 6. 実装への反映

`style.css` のルートカスタムプロパティと `.stage-timeline-cue-pop` がこのシートの値を使用する。表示は `stage-timeline.js` が発火する `stage-timeline-cue-passed` を `stage-sketch.js` が受けて行う。キュー、再生位置、音源、外部機器の状態は保存・送信・実行しない。

## 7. 検証記録

- 2026-09-14: 配色コントラストを `contrast.mjs` で実測。本文色は AA を満たす。
- 2026-09-14: 画面上の二つの図へ同じ内容を出し、正面図だけを `aria-live` にして二重読み上げを防ぐ設計とした。
- 未実施: 実ブラウザと物理端末での見え方。公開後に Safari/iPad を含めて確認する。

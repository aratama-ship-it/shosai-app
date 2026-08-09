---
title: "Stage Sketch 光の意図カード 引き継ぎ"
status: "ローカル実装済み・未公開"
updated: "2026-08-09"
target: "Stage Sketch"
---

# Stage Sketch 光の意図カード 引き継ぎ

## 1. 作業場所

Gitルート／作業ディレクトリ:

```text
/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app
```

別セッションは、ワークスペース全体ではなく、必ずこのディレクトリを作業場所として開始する。

```bash
cd "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app"
git rev-parse --show-toplevel
git status --short
```

## 2. 現在の状態

- 光の意図カードはローカル実装済み。
- 公開、デプロイ、push、既存ショー正本の一括変更は未実施。
- 作業開始前から、このGitルートには多数の変更済み・未追跡ファイルがある。他タスクの変更を巻き戻さない。
- ブラウザ版の書き出し形式はversion 4、MCP版はversion 3。`lightingIntent` は双方の任意項目として追加し、版番号自体は上げていない。
- これは演出意図の共有機能であり、照明図、回路図、DMXデータ、施工図、安全承認には使わない。

## 3. 実装済みの範囲

シーンごとに、次の内容を `scene.lightingIntent` として保持する。

- 光によって何を起こしたいか
- 観客にどこを見てほしいか
- 演者・空間・背景をどう見せるか
- 何を合図に、どう変化し、どの速さに感じさせるか
- 任意の雰囲気、参照メモ、実装候補
- `safetyStatus: "not-assessed"` 固定

UIでは次を実装済み。

- シーン説明の下に折りたたみ式カードを表示
- シーン一覧に `LIGHT · ...` の一行要約を表示
- 入力中の文章を失わない即時保存
- 作成・変更・削除のUndo／Redo
- 日本語・英語表示
- PWAキャッシュの版更新

MCPでは次を実装済み。

- `lightingIntentSchema`
- シーン追加・更新時の正規化
- AI編集計画の項目別差分
- 正本を先に変更せず、既存の確認・revision一致・承認フローを維持

## 4. 主なファイル

| ファイル | 役割 |
| --- | --- |
| [`docs/LIGHT_INTENT_CARD_SPEC.md`](LIGHT_INTENT_CARD_SPEC.md) | 完全な仕様、データ構造、受け入れ条件 |
| `stage.html` | 光の意図カードUI |
| `style.css` | カードとシーン一覧要約の見た目 |
| `stage-sketch.js` | 正規化、保存、入力、Undo／Redo、要約 |
| `stage-i18n.js` | 日英文言 |
| `index.html` / `stage-sw.js` | PWA用アセット版・キャッシュ版 |
| `mcp-server/src/schemas.js` | MCP入力スキーマ |
| `mcp-server/src/stage-model.js` | MCP側の正規化と更新 |
| `mcp-server/src/edit-plan.js` | 項目別の変更差分 |
| `mcp-server/src/server.js` | MCPツール入力への接続 |
| `tests/stage-light-intent-card.test.mjs` | ブラウザ側回帰テスト |
| `mcp-server/test/light-intent.test.js` | MCP側回帰テスト |

## 5. 検証済みの内容

2026-08-09のローカル確認結果:

- ブラウザ側: 177件中177件成功
- MCP側: 25件中25件成功
- 構文確認: 対象JavaScriptすべて成功
- 実ブラウザ: 文章入力、選択肢変更、一行要約、Undo、Redo、日英切替を確認
- ブラウザエラー: 0件

再検証コマンド:

```bash
node --test tests/*.test.mjs
```

```bash
cd mcp-server
npm test
```

ローカル確認:

```bash
python3 -m http.server 8941 --bind 127.0.0.1
```

```text
http://127.0.0.1:8941/stage.html?lang=ja
```

## 6. Phase 2「視覚との接続」— ローカル実装済み（2026-08-09）

本人確認のうえ実装した。仕様は [LIGHT_INTENT_PHASE2_WORKORDER.md](LIGHT_INTENT_PHASE2_WORKORDER.md)。

- 正面図バーの `光の意図` トグル、またはカードを開くと、図の上に**作図注記**として重ねが出る。
  照明のシミュレーションではない。沈める表現に黒を使わず斜線ハッチを使うのはこのため。
- 意図値 → 記号の写像は `LIGHT_INTENT_MARKS`。**`unspecified` は必ず何も描かない**
  （「指定なし」は「見せない」ではない）。
- 演者は矩形で囲まず、オフスクリーンのマスク（`intentMaskCanvas`）で体の形どおりに扱う。
- 照合帯は意図と現在の照明駒の数を**並べるだけ**。判定・助言・推薦をしない。
- カードを開くと `.stage-work-area.is-docked` で正面図の左横（380px）へ寄る。1100px未満は縦積み。
- **保存形式は無変更。** `showLightIntent` は画面状態で、書き出しJSONに入らない。
- 書き出し・印刷・プレゼンには重ねを描かない
  （`target !== ctx && target !== planCtx` と `presenting` で抑止）。

検証（2026-08-09、Claudeが自分で実行）: ブラウザ187/187、MCP 33/33、構文OK、実ブラウザ確認済み。

### ★HTMLの正本は index.html。stage.html を直接編集しない

`build_stage.py` は **index.html の `<main id="view-stage">` と窓・ツアー・プレゼン帯を抜き出して
stage.html を生成する**。stage.html は生成物なので、直接編集しても次の生成で消える。

```bash
python3 build_stage.py          # 作り直す
python3 build_stage.py --check  # 揃っているか見る
```

Phase 2 の初回実装ではここを取り違え、カードUI 約150行を stage.html にだけ入れてしまい、
`--check` が「stage.html が古いです」と警告する状態になった（2026-08-09に是正済み）。
**HTMLを触ったら必ず index.html 側を直し、`build_stage.py` を走らせて `--check` を通すこと。**
JS と CSS は両ページ共有なので、この手順は要らない。

### 実機で見つけて直したこと（2026-08-09）

いずれもテストでは出ず、実ブラウザで見て初めて分かった。

1. **選び直しても図が変わらなかった。** `mutateLightingIntent` が `renderScenes()` しか
   呼ばず、キャンバスを描き直していなかった。Phase 1では意図が図に影響しなかったので
   足りていた。`redrawForLightIntent()` を追加。**この機能の要なので、
   ここを壊す変更を入れないこと。**
2. **装置駒が画面で最も明るくなっていた。** どのレイヤーにも属さないため等倍で残り、
   意図と逆へ視線を引いていた。本人確認のうえ、沈むレイヤーがあるときは一緒に沈める。
3. **視線の線が、`reveal` が面（空間・背景）のとき無意味だった。** 重心へ伸びるだけで
   何も言っていない。演者が `reveal` のときだけ線を引き、面のときは文だけを客席側へ置く。
4. **演者の札が1人の頭上に付き、演者名と対になって見えていた。** レイヤー全体の指定なので、
   演者全体の重心の上、名前の帯より上へ移した。
5. **カードを340pxへ寄せると入力欄が141px（1行8文字）になり書けなかった。**
   寄せている間は入力欄を縦積みにし、列幅を380pxにした。
6. **変更した資産の `?v=` が上がっていなかった。** 実際に古いCSSが配信された。
   `style.css` `stage-sketch.js` `stage-i18n.js` と `CACHE_NAME` を更新し、
   これらをピン留めする `tests/stage-venue-library.test.mjs` の期待値も追随させた。
   **この3資産を変えたら必ず3ファイル（index.html / stage.html / stage-sw.js）で版を揃える。**

## 7. 守る境界

- 光の意図から灯体、回路、吊り位置、必要台数を断定しない。
- `safetyStatus` を `approved` 等へ変えない。
- AIが照明駒を無確認で配置しない。
- `scene.note`、既存照明駒、既存プリセットを上書きしない。
- UIから正本を直接AI更新しない。指示 → 差分 → 明示確認 → revision一致 → 適用 → 書き出しの順を守る。
- ユーザーの許可なくpush、deploy、公開をしない。

## 8. 別セッションへ渡す短い指示文

```text
Stage Sketchの「光の意図カード」の続きを進めます。
作業ディレクトリは
/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app
です。

最初に docs/LIGHT_INTENT_CARD_HANDOFF.md と
docs/LIGHT_INTENT_CARD_SPEC.md を全文読み、git statusで既存の変更を確認してください。
他タスクのdirty/untrackedファイルを巻き戻さないでください。

光の意図カードのPhase 1とMCP差分接続はローカル実装・検証済みです。
次はPhase 2の視覚との接続を検討しますが、実装前に画面上の見せ方を提案し、私の確認を取ってください。
公開・push・deployはしないでください。
```

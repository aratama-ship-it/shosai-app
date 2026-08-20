# 小道具・グループ表示 描画エラースキャン

`scan-prop-render.mjs` は、舞台スケッチのショーJSONを実機の Google Chrome で開き、
小道具登録一覧・全シーンの描画・印刷用の小道具香盤表を一括検査する読み取り専用ツールです。
本体アプリや対象JSONは変更しません。

## 実行環境

- Node.js 22
- Google Chrome（Playwrightが配布するChromiumは使いません）
- `playwright-core` を `/Users/arata/.local/share/stage-scan/node_modules` に配置

未導入の場合だけ、次を一度実行します。

```sh
mkdir -p /Users/arata/.local/share/stage-scan
cd /Users/arata/.local/share/stage-scan
npm init -y
npm install playwright-core
```

スキャナは `createRequire("/Users/arata/.local/share/stage-scan/package.json")` からだけ
`playwright-core` を解決します。見つからないときに別の依存へ黙ってフォールバックしません。

## 基本の使い方

```sh
node tools/scan-prop-render.mjs
node tools/scan-prop-render.mjs --wave a --lang en
node tools/scan-prop-render.mjs --matrix
node tools/scan-prop-render.mjs --shows path/to/show.json another/show.json
node tools/scan-prop-render.mjs --out /tmp/prop-scan.md --json /tmp/prop-scan.json
node tools/scan-prop-render.mjs --help
```

主な引数は次のとおりです。

- `--wave a|b|both`: 波A（元データ）、波B（検査用小道具をメモリ上で注入）、または両方。既定は `both`。
- `--lang ja|en`: 表示言語。既定は `ja`。
- `--width 1440x900`: 単独実行時の画面幅。
- `--seed 42`: 波Bの決定的乱数の種。同じショーと種なら同じ配置になります。
- `--matrix`: A/B、ja/en、1440x900・1024x768・390x844の12通り。
- `--shows <path...>`: 対象JSONを明示します。次の `--` で始まる引数の直前までをパスとして扱います。
- `--out <path.md>`: 全組み合わせを1つのMarkdownへまとめます。
- `--json <path.json>`: 機械可読な集約結果も出します。

引数なしでは、次の場所にある直下の `*.json` をパス昇順で読みます。

- `.stage-sketch-mcp/projects/`
- `.stage-sketch-mcp/exports/`
- `../jjk-show/`
- `../show-creation/`
- `../show-creation/demo-11works-2026-08-16/sketches/`

`project.scenes` または直下の `scenes` が配列でないファイル、壊れたJSON、読めないパスは
黙って除外せず、レポートの「対象外」へ理由つきで残します。

## 2つの波

波Aは元データをそのままブラウザへ渡し、小道具が0件の既存ショーを含めて退行を検査します。
`heldBy` の参照切れと同じ手の重複も、正規化前の元データに対して静的に検査します。

波Bは読み込んだプロジェクトのディープコピーへだけ検査用小道具を足します。
形と寸法は実行時の `stage-sketch.js` にある `PROP_SHAPES` を評価して取得するため、
本体へ形が増えた場合も一覧を手修正する必要はありません。全形を全シーンへ置き、可能な
ショーでは右手・左手・床・舞台外・別の演者への受け渡し・次シーンではける状態を作ります。
必要な演者や連続シーンがなく6状態を作れない場合は、無理に演者やシーンを追加せず `B0` として報告します。

注入後のデータは `localStorage` を介してアプリへ渡しますが、ショーごとに新しいブラウザ
コンテキストを作るため持ち越しません。対象JSONへ書き戻すコードはありません。

## 検出するもの

- `A1` 未捕捉例外、`A2` console error、`A3` console warning、`A4` request failed、`A5` ページクラッシュ
- `B1` 小道具・舞台セットの行数、`B2` 小道具グループの表示、`B3` グループ混入、`B4` 無名行、`B5` キャスト行との矛盾
- `C1` 印刷処理による全シーン描画、`C2`〜`C5` 小道具香盤表の有無・行列数・セル値
- `D1` 全シーンの対話切り替え、`D2` 受け渡し行の文字とhidden、`D3` シーン間での小道具行数
- `E1` 元データの参照切れ `heldBy`、`E2` 同じ演者・同じ手の重複

印刷HTMLは、現在の `openPrintPage()` が使う Blob/ObjectURL をページ読み込み前に捕捉し、
実ウィンドウを開かずに `DOMParser` で検査します。保存キー、言語キー、検査対象のDOM idも
`stage-sketch.js` の実物から起動時に読み取ります。

## レポートと終了コード

`--out` を省略すると、組み合わせ別レポートと `report-summary.md` を次へ出します。

```text
overnight-runs/2026-08-20-prop-render-scan/
```

各レポートは、結論、1件1行の一覧、スタックを省略しない詳細、対象外、Chrome・Node・
本体版・キャッシュ版を含みます。1ショーが90秒を超えた場合はタイムアウトとして記録し、
残りのショーへ進みます。

終了コードは `A1/A5` の致命件数と、`A2/B/C/D/TIMEOUT` の描画エラー件数の合計です。
元データ指摘、console warning、通信失敗は終了コードへ加えません。

## 既知の除外・境界

- 画像の見た目の良し悪しや、形の美術的な正しさは判定しません。
- `requestfailed` は記録しますが、描画不変条件の失敗と分けて集計します。
- キャスト登録のない自由な演者駒も、キャスト行数との食い違いとして `B5` に記録します。
- 連続する2シーンと別の演者がないショーでは、受け渡し・はけの全状態を合成できないことがあります。
- Chrome自体をダウンロードせず、端末にある `channel: "chrome"` だけを使います。

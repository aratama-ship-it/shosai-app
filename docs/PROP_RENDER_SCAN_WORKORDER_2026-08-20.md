# 発注書：全ショー一括「小道具・グループ表示」描画エラースキャン 2026-08-20

Claudeが仕様を決め、Codexが実装し、Claudeが検証する。この文書だけで着手できるように書く。
前提: 小道具機能（登録・持たせ・形プリセット10種・一覧の3グループ分け・香盤表）は
2026-08-20に実装済み（stage-sketch v261 / CACHE v92 前後・未commit）。

## 背景と、この道具が必要な理由

小道具機能が入った直後で、**実データによる実描画の検証がまだ無い**。既存テスト（node --test）は
ソース文字列の検査が中心で、ブラウザで実際に描いたときの例外を拾えない。

さらに実測で分かったこと（Claudeが2026-08-20 03:40に全ショーを数えた）:
**現存32ショーの `kind:"prop"` 登録は全て0件・`heldBy` も0件。** 小道具機能より前に作られたため。
したがって「全ショーをそのまま読む」だけでは新コードをほとんど通らない。**2波構成にする。**

- **波A（現状ショー・退行検査）**: 小道具ゼロのショーで、新しく入った小道具コード（グループの
  hidden制御・香盤表・受け渡し行）が既存表示を壊していないこと。
- **波B（小道具注入・本命）**: 各ショーへ**メモリ上だけで**小道具を合成注入し、形10種・持たせ・
  受け渡し・床置き・退場を作ってから同じ検査をする。**元のJSONファイルは絶対に書き換えない。**

## 成果物

1. `tools/scan-prop-render.mjs` … スキャン本体（ESM・Node 22）
2. `tools/scan-prop-render.README.md` … 使い方・検出項目・既知の除外の説明（日本語）
3. `tests/stage-prop-render-scan.test.mjs` … スキャナ内の純関数（小道具合成・不変条件判定）の単体テスト

## 実行環境（この形で固定する。変えない）

- ブラウザは **playwright-core + 実機のGoogle Chrome**。ブラウザのダウンロードはしない。
  `chromium.launch({ channel: "chrome", headless: true })`。
- playwright-core は **iCloudの外** `/Users/arata/.local/share/stage-scan/node_modules` に導入済み。
  スクリプトからは `createRequire` でそこを解決する:
  ```js
  import { createRequire } from "node:module";
  const req = createRequire("/Users/arata/.local/share/stage-scan/package.json");
  const { chromium } = req("playwright-core");
  ```
  解決に失敗したら、導入コマンドを添えて即FAIL終了（黙って別経路に落ちない）。
- ページは **`stage.html`**（舞台スケッチ単独ページ。db.js 15MBを読まない）を、
  スクリプトが立てる静的HTTPサーバ（`node:http`・`127.0.0.1`・空きポート自動）から読む。
  `file://` は localStorage が使えないので不可。サーバのルートは shosai-app ディレクトリ。

## 対象ショーの集め方

既定（引数なし）で次を集め、パス昇順で走る。`--shows <path...>` で明示指定も可。

- `shosai-app/.stage-sketch-mcp/projects/*.json`
- `shosai-app/.stage-sketch-mcp/exports/*.json`
- `../jjk-show/*.json`
- `../show-creation/*.json`
- `../show-creation/demo-11works-2026-08-16/sketches/*.json`

読めた上で `project.scenes`（または直下 `scenes`）が配列のものだけ対象。
それ以外は「対象外」として件数だけ数え、理由とともに一覧に出す（黙って捨てない）。

## ショーの流し込み方

アプリの `loadState()` は `localStorage["shosai-stage-sketch-v1"]` を
`normalizeState(JSON.parse(...))` に通す。よって `addInitScript` で読み込み前に:

```js
localStorage.setItem("shosai-stage-sketch-v1", JSON.stringify({ project }));
localStorage.setItem("shosai-stage-tour-v1", "done");   // 初回ツアーを出さない
```
`project` は `doc.project || doc`。**言語は `--lang ja|en` で切り替える**
（言語キーは stage-sketch.js の `LANG_KEY` を実際に読んで合わせること。値を推測で書かない）。
ショーごとに `browser.newContext()` を作り直す（localStorageを持ち越さない）。

## 波B：小道具の合成注入（メモリ上のみ）

**決定的**にする（`--seed <n>`・既定42。同じ種で同じ結果。`Math.random` を使わない。
小さな線形合同法かxorshiftを自前で持つ）。ショーごとに:

1. `PROP_SHAPES` の**キー一覧は stage-sketch.js から実行時に読み取る**
   （`const PROP_SHAPES = {` から対応する `};` までを取り出して `new Function` で評価する。
   既存 `tools/check-object-on-performer.mjs` の `loadPieceDims` と同じ流儀。
   **形の一覧をこのスクリプトへ写経しない**＝本体に形が増えたら自動で追随する）。
2. 形ごとに1つ、計10〜11個の登録を `project.sets` へ足す:
   `{ id: "scanprop-<shape>", kind: "prop", name: "<形の日本語名>", propShape: <shape>,
      dims: <PROP_SHAPES[shape].dims のコピー>, color: 既存登録と同じ書式 }`
   **既存登録の書式（必須項目）は、そのショーの既存 `sets[0]` を見て合わせる。**
   足りない項目があると `normalizeState` に落とされて検査にならないので、
   注入後に `sets` の prop 件数が期待どおり残っているかを画面側で必ず数える（下の B1）。
3. 各シーンについて、そのシーンの `pieces` にある `type:"performer"` の駒を集め、
   小道具の駒を `pieces` へ足す。**次の6状態が全ショーで最低1回は現れるように配る**:
   - 右手に持たれる（`heldBy: <演者id>`, `holdSide: "R"`）
   - 左手に持たれる（`holdSide: "L"`）
   - 床に置かれる（`heldBy: null`・舞台内の u,v）
   - 舞台外（`onStageArea` が偽になる u,v ＝「出ていない」列を作る）
   - 前シーンから持ち手が交代する（同じ setId が別の演者へ）
   - 前シーンにあって次シーンで消える（はける）
   演者が1人もいないシーンでは「床」「舞台外」だけを使う。
4. 駒idは `scanpiece-<n>` で衝突しない形にする。`setId` は 1 の登録idを指す。
5. **元ファイルへ書き戻す処理を一切書かない**（読み取りは `readFileSync` のみ。
   `writeFile` はレポート出力先にしか使わない）。

## 検出項目

### A. 例外・エラー（描画エラーそのもの）
- A1 `page.on("pageerror")` … 未捕捉例外。**メッセージとスタックを全部残す**
- A2 `page.on("console")` の `error` … 本文を残す
- A3 `console` の `warning` … 別集計（FAILにはしない。件数と本文だけ）
- A4 `page.on("requestfailed")` … URLと理由
- A5 `page.on("crash")` … ページ落ち

### B. グループ表示の不変条件（画面DOMを読んで判定）
- B1 `#stage-prop-list` の行数 === `state.project.sets` の `kind==="prop"` 件数
  （sets件数は画面から取れないので、**注入した期待値**と、`#stage-set-list` + `#stage-prop-list`
  の合計が「light以外の登録数」と一致すること、の二方向で見る）
- B2 小道具0件のとき `#stage-group-props` が hidden、1件以上のとき hidden でない
- B3 `#stage-set-list` に小道具の行が混ざっていない（行のテキストに注入した小道具名が出ない）
- B4 `#stage-prop-list` の各行に空でない名前テキストがある（無名行＝描画崩れ）
- B5 `#stage-group-cast` の演者行数がシーンの演者駒数と矛盾しない（既存グループの巻き添え検査）

### C. 小道具の描画・香盤表
- C1 **全シーン描画**: 「印刷用ページ」ボタン（`#stage-print-btn`）は
  `openPrintPage()` が全シーンを canvas へ描いてからHTMLを組む＝1回で全シーン描画を通せる。
  `window.open` を差し替えて実ウィンドウを開かせず、生成HTMLを回収する
  （`window.open` の戻り値として最低限 `document.write`/`close`/`focus` を持つ偽オブジェクトを返す。
  Blob/ObjectURL 経由なら、そのURLをページ内 `fetch` して本文を取る。
  **実装前に openPrintPage の末尾を読んで、実際の受け渡し方に合わせること**）。
  この間に A1〜A3 が出たら描画エラーとして記録。
- C2 小道具登録があるとき、生成HTMLに `props-plot-table` を含む
- C3 香盤表の列数 = シーン数 + 1、行数 = 小道具登録数
- C4 香盤表の各セルが「空文字」「床…」「持ち手名」のいずれか
  （**空白のみ・`undefined`・`null`・`NaN`・`[object Object]` が現れたらエラー**）
- C5 小道具0件のときは香盤表そのものが生成HTMLに無い

### D. シーンごとの対話描画
- D1 `#stage-scene-list [data-scene-id]` を**全て順に**クリックし、各回 `requestAnimationFrame` 2回
  待ってから A1〜A3 を確認（シーン切り替え時だけ出る例外を拾う）
- D2 `#stage-prop-moves` は「文字が空 ⟺ hidden」であること（片方だけ真は表示崩れ）
- D3 各シーン選択後、`#stage-prop-list` の行数が変わらないこと（登録一覧はシーンに依らない）

### E. 実データの整合（データ側の指摘。コードのバグとは分けて出す）
- E1 `heldBy` が同じシーンに存在しない駒を指している（dangling）
- E2 同じ演者・同じ手を2つ以上の駒が指している
これは注入前の**元データ**に対して静的に見る（波Aの一部）。件数0が期待値。

## 走らせ方（夜間はこれを使う）

```
node tools/scan-prop-render.mjs                       # 既定：波A+波B、ja、1周
node tools/scan-prop-render.mjs --wave a --lang en
node tools/scan-prop-render.mjs --matrix              # 下の全組み合わせを順に回す
node tools/scan-prop-render.mjs --out <path.md> --json <path.json>
```

`--matrix` の組み合わせ（この順で回す）:
- 波: A, B
- 言語: ja, en
- 画面幅: `1440x900`（PC）, `1024x768`（タブレット）, `390x844`（スマホ）
= 12通り × 対象ショー数。1通りごとに進捗を1行 stdout に出す（どこで止まったか分かるように）。

## レポート

`--out` 既定は
`overnight-runs/2026-08-20-prop-render-scan/report-<波>-<言語>-<幅>.md`、
最後に `report-summary.md` を1枚。中身:

1. 見出し（実行時刻・stage-sketch.js の `?v=` 版・CACHE_NAME・対象ショー数・組み合わせ数）
2. **結論を最初の3行に**（例: `致命 0件 / 描画エラー 2件 / データ指摘 5件 / 警告 12件`）
3. 検出の一覧。1件1行で `ショー名 | 組み合わせ | 種別 | 内容（先頭200文字）`
4. 種別ごとの詳細（スタック全文）
5. 対象外にしたファイルと理由
6. 環境メモ（Chrome版・Node版・preflightのWARN）

**終了コード = 致命(A1/A5) + 描画エラー(A2/B/C/D) の件数**（データ指摘E・警告A3は0扱い）。

## 制約（必ず守る）

- **`stage-sketch.js` など本体アプリを一切変更しない。** これは読み取り専用の検査道具。
  本体を直したくなる検出が出ても、直さずレポートに書く（直すのは本人承認のあと）。
- **対象ショーのJSONを書き換えない。** 注入はメモリ上のみ。
- 形の一覧・寸法・グループのDOM idなどを**このスクリプトへ写経しない**。
  写経すると本体改訂で静かにズレる（既存 check-object-on-performer.mjs と同じ設計思想）。
- 1ショーの処理に**上限90秒**のタイムアウトを置き、超えたら「タイムアウト」として記録して次へ進む
  （1本で夜間ラン全体を止めない）。
- パスに空白を含む。**シェル呼び出しは使わず Node の API で扱う**。
- コメントは日本語。既存 `tools/check-object-on-performer.mjs` の文体・粒度に合わせる。
- 既存テストを壊さない（`cd tests && node --test index.mjs` が全通過）。

## 追記（2026-08-20 04:00・Claudeが実機で確認した事実）

発注書を書いたあとに、Claudeが実際に Chrome で `stage.html` を開いて確認した。判定を誤らせるので必ず従うこと。

- **一覧の行は `.stage-cast-row`。`childElementCount` で数えてはいけない。**
  登録が0件のときは代わりに `.stage-cast-empty` のプレースホルダが1つ入る。
  `#stage-prop-list` は小道具0件でも子要素が1つある（＝空の札）。
  B1・B3・D3 の件数は **`querySelectorAll(".stage-cast-row").length`** で数える。
- `#stage-group-props` の `hidden` は小道具0件で `true` になることを実測で確認した（B2の期待どおり）。
- 演者一覧は `#stage-cast-list`、舞台セットは `#stage-set-list`、小道具は `#stage-prop-list`。
  行のツールチップは `dataset.jaTitle` に入る。
- 流し込み経路（`localStorage["shosai-stage-sketch-v1"] = JSON.stringify({project})` ＋
  `localStorage["shosai-stage-tour-v1"] = "done"` を `addInitScript` で先に入れる）は
  `jjk-show/demo-shibuya.json` で実測済み。30シーン・演者12・セット16を正しく復元し、
  読み込み直後のエラーは0件だった。この経路をそのまま使ってよい。

## 追加発注（2026-08-20 04:25・Claudeが実測した穴をふさぐ）

初回の本走（12通り×32ショー）は検出0件だったが、生成された香盤表を実際に読んだところ
**550セル中545が「床」で、持たれている状態が50シーン中2回しかなかった**。
つまり小道具の一番新しいコード（握り位置 grip・手への追従・持ち手の左右）が
ほとんど通っていない。注入の密度を上げる。

### やること

`synthesizeProps` に**持ち密度**の指定を足す（既定は現状のまま＝薄い）。
CLI に `--hold-density low|high`（既定 `low`）を追加し、`--matrix` にも
`high` の組み合わせを足す（波Bのみ。波Aは注入しないので無関係）。

`high` のときの配り方（決定的。`--seed` に従う）:

1. **各シーンで、その場にいる演者の空いている手を全部埋める。**
   演者n人なら最大2n個の小道具が持たれる。登録数（11個）を超える分は床のまま。
   同じ手に2つを割り当てない（本体の `normalizeHolds` に落とされて検査にならない）。
2. 左右は交互（1人目は右→左、2人目は左→右…）にして、`holdSide` の両方を必ず使う。
3. **形プリセットを均等に散らす。** 同じ形ばかりが持たれると grip の検査が偏る。
   シーンindexを起点に11種を巡回させる。
4. 低密度のとき作っていた6状態（床・舞台外・受け渡し・はける）は `high` でも
   最低1回ずつ残す（`propInjectionCoverage` が全て true のままであること）。
5. `propInjectionCoverage` に **`heldCount`（持たれている駒の総数）** を足し、
   `high` では `heldCount` がショーの演者延べ人数の7割以上になることを
   新しい単体テストで確かめる（薄いまま静かに戻るのを防ぐ）。

### 検査の追加

- **C6（新規）**: 香盤表のセルのうち「床」でも空でもないセル（＝持たれている）の割合が、
  `high` のとき **10%未満ならエラー**として報告する。
  「注入したつもりが本体に落とされていた」を静かに見逃さないため。
  `low` のときはこの検査をしない。

### 制約

前と同じ。本体アプリと対象JSONは変更しない。既存テストを壊さない。
`--hold-density low` の既定挙動は**今と1ビットも変えない**（回帰の基準を保つため）。

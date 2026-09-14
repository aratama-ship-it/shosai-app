# P2 v0.2.5 外部AI再試験 台帳（2026-09-11）

目的: 二重判断方式（AIへ渡すマニュアルによる自己点検 + JSON点検ページによる独立判定）が、外部AI 3種 × 課題2種で機能するかを再測定する。

## 範囲

- 対象マニュアル: `docs/ai-json-manual/AI_MANUAL_ja.md` v0.2.5（9,566文字、UTF-8で18,298 bytes）
- 対象アプリ: 舞台スケッチ v0.3.5
- 対象AI: ChatGPT、Claude.ai、Gemini
- 課題: 既存のP2と同じ2題
- 保存先: `docs/ai-json-manual-2026-09-11/p2-runs-v025/`
- 本体、`worker.js`、`mcp-server/`、公開状態、Gitには変更を加えない。

## 条件と手順

1. 各AI・各課題で新規チャットを使い、マニュアル全文と作成依頼を同じ送信に入れた。
2. 課題1は情報不足のため質問票を期待した。質問後は、全AIに意味をそろえて「4人、proscenium / mid、8場面、高リスク装置あり、3 section、各場面に真上1灯」と回答した。
3. 課題2は「質問不要、推奨で進めて」とし、3人、blackbox / small、3場面、椅子2脚、机1つ、高リスク装置なし、sectionなし、各場面に真上1灯を指定した。
4. 初回JSONをCLIで点検した。NGの場合は `buildFixRequest()` が作る修正依頼文を1回だけ同じAIへ返した。
5. 合格版6本を実ブラウザで読み込み、キャンセル保護、読み込み後の構造的意味、全場面選択、書き出し往復、同一project.idの別ショー化を確認した。
6. ブラウザ検査の画像・結果ファイルはリポジトリの `qa/` へ書かず、`/private/tmp/ai-json-v025-qa/` だけに出した。検査器の表示中の `qa/...` は元スクリプト内の固定文言で、実保存先は一時領域である。

AIの表示条件:

- ChatGPT: chatgpt.com、ログインなし。画面上でモデル名を確定できなかったため「既定モデル（名称不明）」として記録。
- Claude.ai: Sonnet 5、思考量 medium。
- Gemini: Flash、ログイン済み。

## 結果

| # | AI | 課題 | 質問票 | 初回checker | 修正 | 実読込 | 意味保持 | 保存先 |
|---|---|---|---|---|---|---|---|---|
| 1 | ChatGPT（既定モデル・名称不明） | 1 | 6問。各問に推奨と理由があり、結果を大きく変える事項に限定されていて妥当 | OK | 0回 | 開けた | 回答どおり（4人、8 scene、3 section、trapeze、各sceneにlight 1） | `p2-runs-v025/chatgpt-1-1.json` |
| 2 | ChatGPT（同上） | 2 | 出さなかった（指定どおり） | OK | 0回 | 開けた | 指定どおり（3人、3 scene、chair 2、table 1、light 1、各sceneにlight 1、sectionなし） | `p2-runs-v025/chatgpt-2-1.json` |
| 3 | Claude.ai（Sonnet 5 / medium） | 1 | 6問。各問に推奨と理由があり妥当。推奨内容は他AIと異なる箇所があったが、回答指定を正しく反映 | OK | 0回 | 開けた | 回答どおり（4人、8 scene、3 section、高リスク3種、各sceneにlight 1） | `p2-runs-v025/claude-1-1.json` |
| 4 | Claude.ai（同上） | 2 | 出さなかった（指定どおり） | OK | 0回 | 開けた | 指定どおり（3人、3 scene、chair 2、table 1、light 1、各sceneにlight 1、sectionなし） | `p2-runs-v025/claude-2-1.json` |
| 5 | Gemini（Flash） | 1 | 6問。各問に推奨と理由があり、結果を大きく変える事項に限定されていて妥当 | **NG 34件**。cast、sets、piecesの全colorを `rgb(r, g, b)` で出力 | 1回。点検器のNG本文をそのまま返してOK | 初回NG版も止まらず開けた。修正版も開けた | 初回は色34箇所が既定色へ黙って変形。修正版は回答どおり（4人、8 scene、3 section、tissue、各sceneにlight 1） | `p2-runs-v025/gemini-1-1.json`（NG）、`gemini-1-2.json`（修正版） |
| 6 | Gemini（同上） | 2 | 出さなかった（指定どおり） | OK | 0回 | 開けた | 指定どおり（3人、3 scene、chair 2、table 1、light 1、各sceneにlight 1、sectionなし） | `p2-runs-v025/gemini-2-1.json` |

集計:

- 初回の「開けた率」: **6/6**。Gemini課題1のNG版も読み込み自体は止まらなかった。
- 初回のchecker合格率: **5/6**。
- 初回の構造的意味保持率: **5/6**。Gemini課題1だけ色が既定値へ変形した。
- checkerの修正依頼を最大1回返した後の合格率: **6/6**。
- 修正後の構造的意味保持率: **6/6**。
- 情報不足課題で質問票が出た率: **3/3**、質問票妥当率: **3/3**。
- 全指定課題で質問を省略した率: **3/3**。

## 二重判断の実測

Gemini課題1は、マニュアルに `#rrggbb` と自己点検項目があっても `rgb(...)` を34箇所に出した。JSON構文は正しく、舞台スケッチも読み込みを拒否しなかったが、ブラウザ実測では演者色が `#a84b26`、セット色が `#8b98a1` などの既定色へ置換された。ページエラーは発生しなかった。

点検器は初回で34件すべてを「図・内容が変わる可能性」として検出した。同じNG本文を1回返した修正版は全色を `#rrggbb` に直した。初回と修正版の構造差分はcolor 34箇所だけで、人数・会場・場面順・題名・note・配置・装置は維持された。

したがって今回も、マニュアルだけでは生成ミスをゼロにできず、点検ページだけでも依頼意図や安全性は判断できない。両方を使う二重判断が実際に役割分担した。

## 検証コマンドと出力要約

合格版6本:

```text
node tools/ai-json-check.mjs \
  docs/ai-json-manual-2026-09-11/p2-runs-v025/chatgpt-1-1.json \
  docs/ai-json-manual-2026-09-11/p2-runs-v025/chatgpt-2-1.json \
  docs/ai-json-manual-2026-09-11/p2-runs-v025/claude-1-1.json \
  docs/ai-json-manual-2026-09-11/p2-runs-v025/claude-2-1.json \
  docs/ai-json-manual-2026-09-11/p2-runs-v025/gemini-1-2.json \
  docs/ai-json-manual-2026-09-11/p2-runs-v025/gemini-2-1.json

6ファイルすべて: OK
```

Gemini課題1の初回版:

```text
node tools/ai-json-check.mjs docs/ai-json-manual-2026-09-11/p2-runs-v025/gemini-1-1.json

NG 34件
全件: colorは前後空白のない文字列#rrggbbで書くこと
```

ブラウザ検査:

```text
合格版6本:
- 読み込みキャンセルで現在のショーが変わらない: 全件OK
- 読み込み後の意味保持: 全件OK
- 全場面を選択: 33/33場面
- 書き出し→再読み込みの往復一致: 全件OK
- 同じproject.idの再読み込みが別ショーになる: 全件OK
- ページエラー: 0

Gemini課題1の初回NG版:
- 読み込み自体: 成功
- 読み込み後の意味保持: NG（rgb(...)から既定色へ置換）
- 全8場面選択・往復一致・別ショー化: OK
- ページエラー: 0
```

## 原文同一性

ブラウザから回収した各回答と保存ファイルを、末尾改行を含むSHA-256で照合した。7ファイルすべて一致:

| ファイル | SHA-256 |
|---|---|
| chatgpt-1-1.json | `01ea4cf28437af6da6551a0111863e0a91fce4b81e94ff651485fb4381ce042b` |
| chatgpt-2-1.json | `ed666d9d4cc94e697720b6b3132e1162d4588c7082e70e00247b89f129835ddb` |
| claude-1-1.json | `618fd882d6149f1f822140abdcb78975ba40c7b9679d6129b0f3fae9cc517298` |
| claude-2-1.json | `836d5796c8521f49b65fe600ecfbab0cc137e58be075131f387b2de54060bf1c` |
| gemini-1-1.json | `bd9ab17076fee611832aa634ee9a470a4f00e220cc8c806b39cb42735b4e3c12` |
| gemini-1-2.json | `dc44208795d1957c2e579833e1147caeee75de3ab9f91c51a19dd1c3d4b58ee3` |
| gemini-2-1.json | `b4339892c8939de271c71ea1b88f56010692a1aed129e9eca0f0ebde2dd8e2a7` |

## 採点外の観察

作業途中にChatGPTへマニュアルだけを送り、作成依頼を同じ送信に含めなかった試行では、ChatGPTが依頼待ちにならずJSON生成を始めた。これは正規の6本には含めない。公開ページの3手順どおり「マニュアルと作りたい内容を同じ送信で渡す」運用では再現していない。

## 限界

- 各AI・各課題1回だけの測定で、モデル更新や再生成によるばらつきは測っていない。
- 「意味保持」はJSON構造と指定条件、正規化前後の値を自動照合した結果。演出の良し悪し、見切れ、自動搭乗後の見え方、現場安全は含まない。
- 全場面の選択と画面取得は自動確認したが、人による正面図・平面図の美的・演出的な目視判定は行っていない。
- 外部AIへの素材送信の秘密保持や、改変されたマニュアルの防止は保証しない。

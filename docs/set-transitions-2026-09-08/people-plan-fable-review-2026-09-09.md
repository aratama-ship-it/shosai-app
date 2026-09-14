# Claude Code Fable review of people-plan r1

Returned after explicit user approval on 2026-09-09. Read-only source review, not browser execution or release approval.

4ファイル（コア・UI・HTML・テスト）とフィクスチャを全文読了しました。以下、依頼の4点構成で返します。なお、私はテストもブラウザも実行していません。すべてコードの静的読解に基づく判断です。

## (1) 結論

**ブロッカーなし。承認です。** この試作は、固定フィクスチャ＋6入力の範囲で「人別の予定と警告の原因」をオーナーが試すのに十分忠実です。チャレンジ項目を順に当たりましたが、機能的な欠陥は見つかりませんでした。

- **人物の同一性**: 割当は confirmed かつ実在 people のみ集計し（core:122）、人単位のペアワイズ重なり検査（core:150–161）は A の「出番（台本）」と裏方作業も同一 person-A として衝突検出します。
- **待機の排他占有**: fixture 全予定が `exclusive` で、待機も衝突対象。長さ0の待機は `[start,end)` により衝突しない（core:154、116 で wait/note のみ長さ0許容）。半開区間の扱いは一貫しています。
- **known/unknown/invalid 伝播**: `resolve` の3状態と、latest/after 経由の理由伝播、さらに「支配していない必須枝」の invalid を行へ伝播する固定点ループ（core:140–147）と窓の `required` 判定（core:169–170）が分離されており、支配枝（criticalIds）と必須枝の区別は正しい。
- **数値結果と未解決担当・衝突の分離**: `hasUncertainty` は shortfall/reserve を除外して判定し（core:180）、UI は比較値を出しつつ「時間比較だけでは成立を判断できない」旨を併記（ui:78–80）。join 未定でも搬出15秒＋余裕0秒＋担当未定警告が両立して出ます。
- **入力無効化・undo**: parseFields はアトミック（1欄でもエラーなら全破棄、ui:20–35）、無効ドラフト中は判定を保留・結果非表示、undo が「無効入力の破棄→直前の有効値へ復帰」として機能（ui:41, 101）。
- **版・読込失敗**: VERSION 三重照合＋SHA-256ピン＋fetch タイムアウトで、失敗時は editor を無効のままフェイルクローズ（ui:90–97、html:37–38）。`$('editor').disabled=false` が start() の最終行なので、途中例外で操作可能になる経路はありません。

## (2) 具体的な指摘（欠陥というより軽微な観察。すべて非ブロッカー）

**コード読解で確認した事実:**

- **表示文言「10〜未定秒（未確定）」**（`people-plan-ui-2026-09-09.mjs:15`）。再現: Q13欄を空欄（または「Q13が未定の例」）→ cue-wait 行の時刻列が `${formatSeconds(start)}〜${formatSeconds(end)}秒` の組み立てにより「10〜未定秒」となる。読めるが「未定秒」は不自然。修正するなら end が null のとき「秒」を付けない分岐だけで足ります。
- **長さ0の待機は図に描画されない**（`people-plan-ui-2026-09-09.mjs:46` の `r.end>r.start` フィルタ）。再現: 初期値で wait-C（8〜8秒）と cue-wait（10〜10秒）。一覧には「待機なし」と出るし「帯のない時間は空きの確定ではありません」の注記もあるので情報欠落ではありませんが、仕様として認識しておくべき挙動です。
- **join=未定でも platform / walk-C は C 担当・「Cが〜」ラベルのまま図に残る**（`people-plan-core-2026-09-09.mjs:26` の置換対象が wait-C/pickup/cue-wait/exit のみ）。再現: 「交代後、Aと組む相手＝未定」→ C の行に「平台」「歩く」が残り、机側だけ未定になる。これは trialNotes「到着条件と所要は元のCの仮値を残しています」で明示された設計判断なので欠陥とはしませんが、オーナーが混乱したらこの注記を指す場所です。なお extra='person-C' と組み合わせても C の walk-C との衝突が正しく C に帰属することは core のロジック上確認できました。

**仮説（実行して確かめていないもの）:**

- **file:// 直開きでは動かない**はず（module import と fetch が CORS で失敗）。その場合も「読み込めませんでした」でフェイルクローズするため安全ですが、オーナーの試用にはローカルHTTPサーバが要ります。
- **FIXTURE_HASH（ui:3）が現在の JSON バイト列と一致するかは未検証**（ハッシュ計算はこのレビューでは実行不可）。不一致でもフェイルクローズなので危険はなく、進行中のブラウザQAで自然に確定します。
- 極小: Q13=0 にすると Q12 と目盛線が同位置に重なる（見た目のみ）。

## (3) 最小の欠落テスト

**`appearanceEndMs: null`（「Aの出番終了」を空欄）の伝播テスト**が丸ごと未カバーです。q13Ms:null、deadlineMs:null、putMs:null は既存テストにありますが、appearance の未定だけない。UIから空欄一つで到達できる状態で、A系列全体（walk-A→carry→put→hold-A→pickup→cue-wait→exit）が unknown 化しつつ platform/walk-C の既知時刻が残ることを固定すべきです。1本で書けます:

```js
test('unknown appearance end keeps C arrival known', () => {
  const r = run({appearanceEndMs: null});
  assert.equal(row(r,'walk-A').state, 'unknown');
  assert.equal(row(r,'platform').end, 6000);
  assert.equal(row(r,'walk-C').end, 8000);
  assert.equal(r.windows[0].shortfall, null);
});
```

次点は「join:'unresolved' + extra:'person-C' で衝突が C にのみ帰属し、pickup 側は未定のまま」の組合せテストですが、上記の方が到達容易性とカバレッジ欠落の大きさで優先です。

## (4) 保留とすべき製品統合要件（現スコープ外、統合前に必要）

- **任意入力のスキーマ検証**: 現在の format/128件上限チェック（core:48）は固定フィクスチャの防波堤であり、任意ファイル読込の検証器ではない。取込機能を作る際に本格化。
- **保存と版管理の実体化**: `planContext.revision` はインクリメントされるだけで消費者がいない。永続化・競合解決は製品側で設計要。
- **実台本・PDFキュー連携**: キューは架空2件固定。反復キューは現在「扱えない」と明示拒否（core:65）で正しいが、製品では実対応が要る。
- **割当・動線の最適化/自動再配置**: 追加作業を後ろへ送らないのは試作の意図的制約。製品で提案機能にするなら別設計。
- **本番GO・公開系の分離維持**: 現状 GO API を一切持たない点はそのまま保つこと。
- **稼働前提の実データ化**: `availabilityAssumptions` は「図示以外に仕事なし」の仮定。実ロスターと接続するまで成立判断には使えない。

以上です。ブロッカーはなく、(2) は文言1件と認識合わせ2件が実質のすべてです。

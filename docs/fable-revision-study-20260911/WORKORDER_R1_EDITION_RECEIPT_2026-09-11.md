# 発注書 R1: 「発行版と受領票」の局所試作（2026-09-11・未着手・本人の採用判断待ち）

最初に `AGENTS.md`（ワークスペース直下 `claude code files/AGENTS.md`）と
`_claude-rules/dev-preferences.md` の方針リストを読むこと。対象は `show-creative-ideas/shosai-app/`。
設計の根拠は同フォルダ `index.html`（§3 所有境界、§4 規則、§7 反証）。**製品コードは変更しない。**

> 状態: 提案。`index.html` の D1〜D3 が本人に採用されるまで着手しない。
> 進行中の設計（companion／本体統合の選択、転換1件の実例照合、製品化レビュー D1〜D3）と競合するため、
> 成果は局所試作に閉じ、本体へ統合しない。

## 転記する方針（dev-preferences から）

- [現場閲覧/状況と役割の同居] 確認欄を置く場合も、実行記録・GO・共有通知とは分離する。
- [現場閲覧/チーフ集約] 部門が共有対象にした書き込みだけを集約し、個人だけのメモは権限のない集約画面へ出さない。
- [現場配布/正本からの導出] 受け手ごとのシートを別データとして保管せず、一つの合図・担当・前後関係から都度導出する。未割当は警告のまま残す。
- [UI/確認操作] ブラウザ標準の confirm／alert を使わない。画面内の確認パネルにする。

## 目的

舞台監督が正本の変更を「発行版」として番号付きで切り出し、関係する担当だけに変更票を届け、
本人の「受領」を版ごとに集め、チーフが「版Nの関係者で未受領は誰か」を読める。
閲覧・実行記録・GO は記録しない。共同編集はしない。

## 書込み範囲

`docs/fable-revision-study-20260911/r1/` を新設し、そこだけに書く。製品コード、schema、`index.html`（製品）、
`stage.html`、MCP、Worker、SW、既存の設計書、台本サンプル、本研究の `index.html`・モデル・fixture は変更しない
（モデルとテストは `r1/` へ**コピー**して使う。コピー元を編集しない）。

## 使うもの

- 意味モデル: `../revision-model-2026-09-11.mjs`（edition／receipt／impact の規則）
- 架空 fixture: `../fixture-lighthouse-2026-09-11.json`（『灯台と三人』。合成データ。製品読込不可）
- 受け入れ試験の土台: `../scenarios-2026-09-11.test.mjs`（18件）
- 既存の受け手ビューの見た目: `docs/project-contract-2026-09-09/workflow-receiver-view-2026-09-09.html`（紙色・左レール・44px を継承）
- 用語: companion workflow v1（cueId／anchor／activity／review）、共通契約 v1（personId／assignment）

## 仕様

### データ（ブラウザ内。製品保存形式ではない）

```json
{
  "kind": "fable-revision-r1-store",
  "version": 1,
  "editions": [
    { "id": "ed-3", "number": 3, "at": "ISO-8601", "issuedBy": "p-s",
      "parentEditionId": "ed-2", "baseSnapshotHash": "sha256:…", "supersedes": [],
      "changes": [ { "id": "ch-3-1", "kind": "script-semantic", "cueIds": ["q7"], "summary": "…",
                     "impact": { "resolved": ["p-l","p-b","p-a"], "unresolved": [], "routeToAll": false } } ] }
  ],
  "receipts": [ { "editionId": "ed-3", "personId": "p-l", "kind": "self", "at": "ISO-8601", "by": null } ],
  "pendingReceipts": [ { "editionId": "ed-3", "personId": "p-l", "at": "ISO-8601" } ]
}
```

- `editions` は追記専用。削除・編集・並替えの操作を UI にもコードにも置かない。
- `changes[].kind` は `revision-model` の `CHANGE_KINDS` に限る。`script-position` は `confirmedSameMeaning: true` が無ければ `script-semantic` として扱う。
- `receipts[].kind` は `self` と `proxy` のみ。`proxy` は `by` 必須。`executed`・`go`・`viewed` を受け付けない。
- `pendingReceipts` はオフライン保留。復帰時に `editionId` 付きのまま `receipts` へ移す。「最新版」へ付け替えない。
- `baseSnapshotHash` は companion 契約と同じ算出（`{kind, version, project, venues}` をキー順固定の JSON にして SHA-256）。試作では fixture の正規化 JSON で代用してよいが、算出方法をコメントに書く。

### 画面（1枚の HTML、役割セレクタで切替。セレクタは確認用で権限の根拠にしない）

1. **舞台監督「発行」**: 変更を1件ずつ追加（種類・対象 ID・要約・「意味同じ」確認）→ 影響対象と未確定理由を表示 → 「版Nとして発行」。発行前に対象人数と未確定件数を表示する。「戻す」は既存の版を選んで戻し版を作る（`supersedes` 付き）。系譜が違う場合は発行ボタンを無効にし理由を表示。
2. **担当者「自分宛」**: 未受領の版を古い順に並べ、各版の変更票（自分に関わる項目だけ、ただし全員宛は全項目）を表示 → 「受領」（44px、画面内確認パネル）。オフライン模擬スイッチで保留に入れ、復帰で送る。
3. **チーフ「受領状況」**: 版ごとに self／proxy／none の一覧、未確定理由の一覧、代理受領の記録（「誰が」必須）。private メモは表示しない。

文言: 「受領」で統一。「反映」「完了」「既読」「GO」を使わない。全員宛の版は「対象未確定」を明示する。

### 保存

ブラウザ内（localStorage または IndexedDB、1 レコード）。保存失敗時は画面の状態を変えず「保存できない」を表示。
外部送信・サーバー保存・他端末同期はしない。

## 受け入れ条件（数値で報告する）

1. `node --test r1/scenarios-*.test.mjs` が 18/18 通過（コピーしたモデルで）。追加した UI 用テストも全件緑。
2. S02／S13: 発行済み版を消す UI 操作が存在しない（DOM に該当ボタン0件）。戻し版が元の版と同じ相手へ届き、`supersedes` で未受領が畳まれる。
3. S07: 保留受領→復帰で、保留中に発行された版が受領済みにならない。
4. S08: 系譜不一致の正本から発行できない（ボタン無効＋理由表示）。
5. S04b／S05／S12: 対象を計算できない変更が0人へ届くことがない（全員＋対象未確定）。計算できた変更は関係者＋チーフの要確認に絞られる。
6. S11／S15: 受領の種類は self／proxy のみ。画面文言に「反映」「完了」「既読」「GO」が0件（grep で確認）。
7. S09／S10: メモ表示は cueId 参照。private はチーフ・代役の画面に0件。
8. 表示: 1440×900 と 390×844 で横あふれなし、操作44px以上、`prefers-reduced-motion` で静止。配色は design-web/tools/contrast.mjs で実測し 4.5:1 以上。
9. 既存ファイル不変: 着手前に `docs/fable-revision-study-20260911/` 直下と製品ルート直下のファイルの SHA-256 を記録し、終了時に一致を確認して `r1/preservation.json` に残す。

## 止まる条件（そこまでの結果を報告して止まる）

- 本人が D1〜D3 を採用していない／条件が変わった（companion か本体統合かが決まり保存位置が変わる等）。
- 規則（§4）と現場実例が食い違う情報を受け取った → 規則を勝手に直さず報告。
- 製品コード・schema・既存設計書の変更が必要になった。
- 受け入れ条件を満たせない。
- 削除・移動・公開・外部送信・別エージェント起動が必要になった。

## やらないこと

自動差分、項目単位の受領、閲覧ログ、実行記録、GO、通知の送信、共同編集、部門メモの共有経路、道具の実体化、
公演回スコープの一時上書き、製品への接続、`git commit`（本人指示があれば対象ファイルを名指しで add。`git add -A` 禁止）。

## 使用モデル・実行

- Codex 委譲時は `-m` でモデルを明示（shosai-app の実績は gpt-5.6-sol＋medium。既定 gpt-6-astra は 400 即死の前歴）。
  `-C` でサブフォルダ起動する場合は AGENTS.md の絶対パスを指示文に書く。
- 事前に `codex --version` を確認。夜間実行なら `preflight` スキルを先に通す。
- 判断が要る箇所（規則の変更、範囲の拡張）は推測で埋めず、台帳に記録して止まる。

## 報告

`r1/REPORT_<日付>.md` に、受け入れ条件ごとの実測値（件数・ハッシュ・差分0）、未達と理由、確認した画面幅、
使ったモデルと所要時間を書く。「できました」だけの報告にしない。

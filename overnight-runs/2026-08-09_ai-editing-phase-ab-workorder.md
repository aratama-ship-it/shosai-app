# 発注書: 舞台スケッチ AI編集 — 段階A（MCP編集計画）＋段階B（読み込み時の差分承認）

作成: 2026-08-09 / 発注者: Claude（仕様確定担当） / 実装: Codex / 検証: Claude
根拠設計: [`docs/AI_EDITING_HANDOFF.md`](../docs/AI_EDITING_HANDOFF.md)
作業ディレクトリ: `shosai-app/`（このMacでは
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`）

## 本人が確定した前提（2026-08-09）

1. 実装範囲は段階A＋B＋C。**この発注書はAとBだけ**を扱う。Cはバックエンドと課金の決定待ち。
2. AIに許す編集は**配置全般**（演者・セット・照明の入替／追加／削除、位置・向き・姿勢・色・
   大きさ・メモ・場面名・背景の変更、場面の追加・挿入）。
3. ブラウザへ反映する単位は**常に新しいショーとして保存**。現在のショーへ直接差分適用はしない。
4. `scene.stashed`（舞台裏の控え）はUIに出さない方針が確定済み。差分表示にも出さないこと。

## 停止条件（推測で埋めない）

次に当たったら実装を止め、`STATE.md` に記録して報告する。勝手に決めない。

- 既存の `stage-model.js` の正規化仕様を変えないと実現できない要求が出たとき
- `stage-sketch.js` の既存の読み込みモーダルの既定動作（別のショーとして開く）を変える必要が出たとき
- 削除系の操作で、履歴に残さず消える経路ができてしまうとき
- テストが落ちる原因が、この発注書の仕様の矛盾に見えるとき

---

# 段階A: MCPに編集計画ツールを追加する

対象: `mcp-server/src/`。既存9ツールの挙動は変更しない。

## A-1. 新しい保存場所

`.stage-sketch-mcp/plans/` を追加する（`ProjectStore` の `init()` で作成）。
編集計画JSONだけを置く。`projects/` の正本は plan 作成時点では**一切変更しない**。

## A-2. ツール1: `stage_sketch_plan_edit`（読み取りのみ）

入力:

| キー | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `projectId` | string | ○ | 既存の `projectIdSchema` を使う |
| `expectedRevision` | int | ○ | `stage_sketch_read_project` で得た値 |
| `request` | string(≤500) | ○ | 本人の日本語指示をそのまま入れる |
| `operations` | array(≤40) | ○ | 下記の操作。AIが指示を構造化した結果 |

操作の種類（`op`）:

1. `replace_scene_asset` — `{ sceneId, from:{assetType,assetName|assetId}, to:{assetType,assetName|assetId}, preservePlacement?:boolean=true }`
   `preservePlacement=true` なら u/v/size/facing/color/route を引き継ぎ、参照だけ差し替える。
2. `replace_asset_across_scenes` — `{ sceneIds:string[]|"all", from, to, preservePlacement? }`
3. `add_placement` — `{ sceneId, placement }`（`placement` は既存 `placementSchema` をそのまま使う）
4. `remove_placement` — `{ sceneId, target:{assetType, assetName|assetId, occurrence?:int} }`
5. `update_placement` — `{ sceneId, target, changes:{u?,v?,size?,color?,facing?,pose?,heightCm?,assetNote?,route?} }`
6. `update_scene_fields` — `{ sceneId, title?, note?, background?, beat?, rehearsal? }`
7. `add_scene` — `{ afterSceneId?:string, scene }`（`scene` は既存 `sceneSchema`）

出力（`plan-edit-result`）:

```json
{
  "kind": "stage-sketch-edit-plan",
  "version": 1,
  "planId": "plan-...",
  "projectId": "show-...",
  "expectedRevision": 12,
  "request": "3場面目の円座を、2場面目で使っている円座に入れ替える",
  "status": "proposed | needs_clarification",
  "operations": [...],
  "diff": [
    {
      "sceneId": "scene-3",
      "sceneTitle": "第3場面 …",
      "before": ["円座A（左寄り・中央）", "演者ミナ（正面向き・立ち）"],
      "after":  ["円座B（左寄り・中央）", "演者ミナ（正面向き・立ち）"],
      "lines": ["円座A → 円座B に置換。位置・向き・大きさは維持。"]
    }
  ],
  "summary": "第3場面の円座Aを円座Bへ置換します。位置・向き・大きさは維持します。",
  "warnings": [],
  "questions": [],
  "requiresConfirmation": true
}
```

必須の振る舞い:

- **ファイルを書き換えない。** 唯一の書き込みは `plans/<planId>.json` への計画保存。
  `projects/`・`exports/`・`revision` は触らない。
- **曖昧なら適用可能な計画を作らない。** `assetName` が0件または2件以上に当たる場合、
  `status:"needs_clarification"`、`questions` に候補（名前・種別・登場場面）を入れ、
  `requiresConfirmation` はそのまま。この計画は `apply` 側で必ず拒否する。
- `expectedRevision` が現在と違えば、その場でエラー（既存 `assertRevision` を使う）。
- 存在しない `sceneId` / `assetId` を含む計画はエラーで返す（計画ファイルも作らない）。
- 適用後の姿を**メモリ上で試作して** `validateDocument` にかけ、エラーが出るなら
  `status` を `needs_clarification` にし、理由を `questions` に入れる。ディスクには書かない。
- 高リスク装置（`HIGH_RISK_KINDS`・`flown`）が絡む変更は `warnings` に出す。
  文言は既存 `validateDocument` と同じ趣旨で、**安全承認をしない**と明記する。
- `diff.before/after` は日本語の短い行にする。IDの羅列を人に読ませない。

## A-3. ツール2: `stage_sketch_apply_edit_plan`

入力: `{ planId, projectId, expectedRevision, confirmed:boolean }`

- `confirmed !== true` なら適用せず、計画の要約と「`confirmed: true` で再実行してください」を返す。
  **AIの通常応答・会話の継続を承認扱いにしない。**
- `status:"needs_clarification"` の計画は常に拒否する。
- `expectedRevision` が計画作成時および現在の正本と一致しない場合は拒否し、読み直しを促す。
- 適用は `ProjectStore.mutate()` を通し、**全操作を1リビジョンの原子的な変更**として保存する。
  操作ごとに revision を上げない。直前版は既存の `archive()` で `history/` に残る。
- 適用後、`plans/<planId>.json` を `status:"applied"`、`appliedRevision`、`appliedAt` 付きで更新する。
- 適用後に **`inspect` と `prepareImport` を自動で連続実行**する（ハンドオフ125行目）。
- 書き出す読み込み用JSONには、段階Bのために次を足す（**`project` の中身は既存形式のまま**）:

```json
{
  "kind": "shosai-stage-sketch",
  "version": 3,
  "project": { ... },
  "editSummary": {
    "planId": "plan-...",
    "request": "…",
    "summary": "…",
    "baseRevision": 12,
    "appliedRevision": 13,
    "diff": [ ...plan_editのdiffと同形式... ],
    "warnings": [ "…" ]
  }
}
```

- 本人の決定3に合わせ、適用時に `project.versionLabel` を「AI編集 r<新revision>」の形へ更新する。
  ブラウザ側は常に新しいショーとして棚に入るため、元のショーは残る。

## A-4. `stage_sketch_read_project` の補助

`plan_edit` を書くために、AIが `assetName` と `sceneId` を引ける必要がある。
現在の出力に不足があれば、**場面ID・場面名・その場面に居る演者/セットの名前と種別**が読める形へ
出力を足す（既存キーは消さない）。足したかどうかを報告に書く。

## A-5. ドキュメント

- `mcp-server/README.md` の「公開しているMCPツール」に2つを追記し、
  「編集の依頼例」節を足す。例文は次を含めること。
  - 「第3場面の円座を、第2場面で使っている円座に入れ替えて。まず差分だけ見せて」
  - 差分を見てから「その計画を適用して」
- `docs/AI_EDITING_HANDOFF.md` の状態行を「段階A実装済み（2026-08-09）」に更新し、
  実装順序Aの各項目にチェックを入れる。**Cの節は変更しない。**

## A-6. テスト（`mcp-server/test/` に追加、`npm test` で通ること）

ハンドオフ「受け入れテスト案」を固定テストにする:

1. 第3場面の円座を第2場面の円座に入れ替える指示で、差分に対象と置換先が出る。
2. 候補が複数ある「円座を入れ替える」は適用せず `needs_clarification` と候補を返す。
3. `confirmed` なしでは `projects/` のJSONが1バイトも変わらない。
4. 古い `expectedRevision` では適用が失敗する。
5. 適用後、直前版が `history/<projectId>/revision-<n>.json` に残る。
6. 存在しない `assetId` を含む計画は拒否される。
7. 高リスク装置を含む変更は適用できても `warnings` が付き、安全承認の文言を出さない。
8. 複数場面にまたがる置換が **1リビジョン**で保存される。

---

# 段階B: 舞台スケッチ側で編集差分を確認してから取り込む

対象: `stage-sketch.js` の `importProject`（11012行付近）と `renderImportSummary`（11066行付近）。
**既存の読み込み動作を壊さない。** `editSummary` を持たないJSONの挙動は現状のままにする。

## B-1. 仕様

1. 読み込んだJSONに `editSummary` があれば、既存の読み込みモーダルの中に
   **「AIの編集内容」節**を追加して表示する。既存の件数比較（場面数・演者・セット・照明）は残す。
2. 表示する項目: `request`（本人が出した指示）、`summary`、場面ごとの `diff.lines`、`warnings`。
   `baseRevision → appliedRevision` も1行で出す。
3. 既定の出口は現状どおり**「別のショーとして開く」**。本人の決定3のとおり、
   ここで現在のショーを上書きする経路は作らない。
4. `warnings` がある場合、承認ボタンの近くに「安全は確認されていない」旨を1行出す。
   既存の安全文言と表現を揃える。
5. スマホ閲覧モード（`phoneViewerActive`）は現状どおりモーダルを挟まない。差分も出さない。
6. `scene.stashed` に関する情報はUIに一切出さない（本人確定済み方針）。

## B-2. 版数とキャッシュ

- `stage-sketch.js` を変えたら `stage.html` の `?v=` を上げる。CSSを触ったらCSSの版も上げる。
  Service Worker（`stage-sw.js`）のキャッシュ版も既存の手順どおり上げる。
- README「状態」節を、AI編集の差分確認ができるようになった旨へ更新する。

## B-3. テスト

`tests/` に `stage-ai-edit-import.test.mjs` を追加し、既存テストと同じ方式で:

1. `editSummary` 付きJSONを読むと、差分行と警告がモーダルの文字列に含まれる。
2. `editSummary` なしのJSONでは、追加した節が出ない（既存挙動が変わらない）。
3. 承認後、元のショーが一覧に残り、読み込んだショーが別エントリとして増える。

---

## 完了条件

- `cd mcp-server && npm test` が全て通る。
- `cd .. && node --test tests/` 相当の既存テスト一式が通る（既存の実行方法に合わせる）。
- 実際に `.stage-sketch-mcp/projects/` の既存下書き（例: `side-quest-sample-v1.json`）に対して
  `plan_edit` → 差分表示 → `apply_edit_plan` を1往復し、`history/` に前版が増えたことを確認する。
- コミットは分ける: ①MCP（段階A）②ブラウザ（段階B）③ドキュメント。
- 報告に「変更ファイル一覧」「テスト出力」「停止条件に当たった箇所」を書く。

## やらないこと

- `localStorage` への直接書き込み
- 削除ツールのMCP公開
- 段階C（アプリ内AIチャット、API呼び出し、バックエンド）
- `db.js`・研究DB・名簿・`show-reference/` への一切の変更
- ファイルの移動・削除（`.stage-sketch-mcp/` 配下の既存JSONを含む）

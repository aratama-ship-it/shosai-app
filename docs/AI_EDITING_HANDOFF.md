# 舞台スケッチ AI編集 — 実装前ハンドオフ

作成日: 2026-08-08  
状態: **段階A実装済み（2026-08-09）**

## 目的

「3場面目の円座を、2場面目で使っている円座に入れ替える」のような自然言語の指示から、
舞台スケッチのショーJSONを安全に編集する。

AIが直接ブラウザ画面や `localStorage` を書き換える方式にはしない。必ず、現在のショーを読み、
変更差分を人が確認し、承認された変更だけを下書きJSONへ保存してから、舞台スケッチへ読み込む。

## 先に決めるべき結論

### 1. 最初の実装先は「Codex／Claude Code + 既存MCP」

すでに `mcp-server/` は Codex と Claude Code の両方から使えるローカルMCPとして存在する。
この経路では、モデルはAIクライアント側、JSONの検証・版管理・書き出しはMCP側が担う。
ブラウザ版へAPIキーを置く必要はない。

```
本人の指示
  ↓
Codex または Claude Code
  ↓ （MCPの読取・編集ツール）
.stage-sketch-mcp/projects/  … 下書きの正本
  ↓ （差分確認・点検・書き出し）
.stage-sketch-mcp/exports/   … 読み込み用JSON
  ↓ （本人が「読み込む」を選ぶ）
舞台スケッチのショー一覧
```

この経路は、現在の契約済みのCodex／Claude Codeをそのまま活かすための第一段階である。
ただし、各製品の契約・利用可能量は各AIクライアントの条件に従う。

### 2. アプリ内チャットは第二段階

舞台スケッチ画面の中へ「AIに指示」欄を置く場合は、ブラウザから直接モデルを呼ばない。
APIキーを静的HTML、JavaScript、`localStorage`、書き出しJSONへ置くことは不可。

その場合に初めて、認証つきバックエンド（例: Workerまたはサーバー）と、OpenAI APIまたはAnthropic APIを
別途用意する。ChatGPT/Codex/Claude.aiの個人向け契約を、公開・PWAアプリの裏側のAPIとして流用する設計にはしない。

## 契約・接続方式の整理

| 方式 | 使う場所 | 今ある契約の扱い | 初期実装に向くか |
| --- | --- | --- | --- |
| Codex + ローカルMCP | Codexアプリ／CLIでショーを編集 | Codex側の利用として扱う。アプリ用APIキー不要 | **はい** |
| Claude Code + ローカルMCP | Claude Codeでショーを編集 | Claude Code側の利用として扱う。アプリ用APIキー不要 | **はい** |
| 舞台スケッチ内のAI欄 + OpenAI API | PWA／Webアプリ | ChatGPTの契約とは別にAPIの認証・請求を管理 | 後段 |
| 舞台スケッチ内のAI欄 + Anthropic API | PWA／Webアプリ | Claude.aiの契約とは別にAPI Consoleの認証・請求を管理 | 後段 |
| ChatGPT／Claude.aiのチャット画面を手で使う | 会話のみ | JSONを貼り付け・書き戻しが必要。自動編集経路ではない | 補助のみ |

OpenAIの公式案内ではChatGPTとAPI Platformは別請求であり、AnthropicもClaude.ai有料プランとAPI Consoleを別製品としている。したがって、アプリ内AIを作る段階で初めて、使う提供元を一つ選び、専用API予算と上限を設定する。

## 編集の共通契約

AIクライアントをCodex、Claude Code、将来のWeb APIのどれに変えても、以下を共通にする。

1. **読む** — 編集対象のショー、対象場面、演者・セットのIDと現在revisionを読む。
2. **解釈する** — 指示を「何を、どこで、どう変えるか」の編集計画にする。不明な名称や複数候補は質問して止まる。
3. **差分を作る** — 変更前後、影響場面、警告を一覧化する。この時点では保存しない。
4. **本人が承認する** — `適用` か `取り消し` を明示的に選ぶ。AIの通常応答や会話継続を承認扱いにしない。
5. **適用する** — 現在revisionが一致する場合だけ下書きへ保存し、直前版を履歴へ残す。
6. **点検する** — 参照切れ・空の場面・高リスク装置の注意を返す。安全承認はしない。
7. **読み込み用JSONを作る** — 舞台スケッチへ渡す前にJSONを準備する。ブラウザ側も読み込み確認を残す。

### 編集計画の最小形式

次の形式は、将来MCPツール・Web API・画面プレビューで共通に使う契約案である。まだ実装しない。

```json
{
  "kind": "stage-sketch-edit-plan",
  "version": 1,
  "projectId": "show-...",
  "expectedRevision": 12,
  "request": "3場面目の円座を、2場面目の円座に入れ替える",
  "status": "proposed",
  "operations": [
    {
      "op": "replace_scene_asset",
      "sceneId": "scene-3",
      "from": { "assetType": "set", "assetId": "set-circle-a" },
      "to": { "assetType": "set", "assetId": "set-circle-b" },
      "preservePlacement": true
    }
  ],
  "summary": "第3場面の円座Aを円座Bへ置換します。位置・向き・大きさは維持します。",
  "warnings": [],
  "requiresConfirmation": true
}
```

`assetId` が特定できない場合、AIは推測して適用しない。候補（例: 「円座A」「円座B」「丸台」）と
対象場面を示して質問する。`expectedRevision` が古い場合も適用しない。

## 操作の範囲

### 初期対象（安全に差分が読める）

- 1場面内の演者・セット・照明の入替、追加、削除
- 複数場面にまたがる同一演者・セットの置換
- 位置、向き、姿勢、色、サイズ、メモ、背景、シーン名の変更
- シーンの追加・挿入と、既存シーンの配置の置換

### 初期対象外

- `localStorage` の直接更新
- 削除の即時実行（まず差分に出し、承認後も履歴を残す）
- リギング、荷重、火気、高所、落下防止、救助、衝突回避の安全判定
- 複数人・複数AIによる競合を無視した上書き
- 研究DB、名簿、外部サービスのデータ更新

## 既存MCPとの対応

| 必要な段階 | 現在 | 次の実装 |
| --- | --- | --- |
| ショー・場面を読む | `stage_sketch_read_project` / `stage_sketch_read_scene` | そのまま使う |
| 新規下書きを作る | `stage_sketch_create_project_draft` | そのまま使う |
| 場面を編集する | `stage_sketch_update_scene` | そのまま使う |
| 2場面の道具を入れ替える | 場面を読み、各場面を個別更新すれば可能 | `stage_sketch_plan_edit` と `stage_sketch_apply_edit_plan` を追加し、差分を一括で扱う |
| 版競合を防ぐ | `expectedRevision` とロック | 編集計画にも必須化 |
| 点検・読み込み準備 | `stage_sketch_inspect_project` / `stage_sketch_prepare_import` | 承認後に自動で連続実行 |
| ブラウザへ反映 | 本人がJSONを選んで読み込む | 当面維持する |

## 実装順序（帰宅後に選ぶ作業）

### A. Codex／Claude Codeの編集計画化（推奨・最初の実装）

1. [x] MCPに `stage_sketch_plan_edit` を追加する。これは正本を書き換えず、編集計画と差分を `plans/` に保存する。
2. [x] MCPに `stage_sketch_apply_edit_plan` を追加する。`planId`、`expectedRevision`、明示的な `confirmed: true` を要求する。
3. [x] 置換・複数場面変更を、個別の `update_scene` 呼び出しではなく一つの原子的な履歴単位として保存する。
4. [x] Codex／Claude Code向けの共通プロンプトを `mcp-server/README.md` へ追加する。
5. [x] 代表的な日本語指示（置換、追加、曖昧な円座、安全注意）を固定テストにする。

完了後は、CodexまたはClaude Codeで「第3場面の円座を第2場面の円座へ入れ替えて。まず差分だけ見せて」と指示できる。

### B. 舞台スケッチ内の「AI編集を受け取る」画面（APIなし）

1. `edit-plan.json` またはMCPが書き出した候補JSONを、舞台スケッチで読み込んで差分表示する。
2. 承認すると新しいショーとして棚へ保存する。
3. この段階ではモデル呼び出しを行わないため、PWA内へ秘密情報を置かない。

### C. アプリ内AIチャット（別途承認後）

1. OpenAI APIまたはAnthropic APIを一つ選ぶ。
2. 認証、利用上限、レート制限、監査ログ、APIキーのサーバー保管を用意する。
3. サーバーはモデルに全JSONを書込み権限として渡さず、編集計画の構造化出力だけを受け取る。
4. サーバーが編集計画を検証し、ブラウザに差分プレビューを返す。
5. 承認後にのみ、サーバーまたはローカルMCPが適用する。

OpenAI APIを選ぶ場合、モデルからアプリ機能へ接続する用途にはFunction Calling、画面用の編集計画だけを返す用途にはStructured Outputsを使う。いずれも厳格なJSON Schemaを使う。

## 受け入れテスト案

- 「第3場面の円座を第2場面の円座に入れ替える」で、対象と置換先を差分に明示する。
- 「円座を入れ替える」だけで候補が複数ある場合、適用せず質問する。
- 承認しない限り `projects/` のJSONが変わらない。
- 古い `expectedRevision` では適用に失敗し、再読込を促す。
- 適用後に前版が `history/` に残る。
- 存在しないassetIdを含む計画は拒否する。
- 高リスク装置を含む変更は、編集できても安全承認を示さない。
- 読み込み後のショーは舞台スケッチの「ショー一覧」に残る。

## 帰宅後に必要な決定

1. 最初に使うAIクライアントを **Codex** と **Claude Code** のどちらにするか（両対応は維持する）。
2. 最初の対象を「セットの入替まで」に絞るか、「演者・照明の変更」まで含めるか。
3. ブラウザへ反映する単位を「常に新しいショーとして保存」にするか、「現在のショーへ差分適用」も許可するか。
4. アプリ内チャットが必要になった時点で、OpenAI APIかAnthropic APIのどちらを使うか、月額上限をいくらにするか。

## 参照

- 既存のローカルMCP: [`mcp-server/README.md`](../mcp-server/README.md)
- OpenAI Function Calling strict mode: <https://developers.openai.com/api/docs/guides/function-calling#strict-mode>
- OpenAI Structured Outputs: <https://developers.openai.com/api/docs/guides/structured-outputs>
- OpenAI ChatGPTとAPIの請求分離: <https://help.openai.com/en/articles/9039756-billing-settings-in-chatgpt-vs-platform>
- Anthropic Claude.aiとAPI Consoleの請求分離: <https://support.anthropic.com/en/articles/9876003-i-subscribe-to-a-paid-claude-ai-plan-why-do-i-have-to-pay-separately-for-api-usage-on-console>
- Claude CodeのMCP: <https://docs.anthropic.com/en/docs/claude-code/cli-usage>

# 舞台スケッチ MCP

CodexとClaude Codeが、舞台スケッチ用のシーン下書きを同じ方法で作るためのローカルMCPサーバーです。

## MCPについて最初に

MCPは「シーンを考えるAI」ではありません。AIクライアントと舞台スケッチの間にある、共通の操作口です。

- シーンを考える: CodexまたはClaude Code
- データを検証し、下書きとして保存する: このMCP
- 最終的に採用し、ブラウザへ読み込む: 本人

したがって、このサーバー自身はOpenAI APIやAnthropic APIを呼びません。APIキーも不要です。
CodexとClaude Codeのどちらで使うかによって、それぞれの契約側の利用量だけが発生します。

## 現在できること

- 舞台スケッチ version 3 形式のショー下書きを作る
- 複数場面をまとめて作る
- 既存場面の間へ中間場面を追加する
- 場面名、メモ、背景、演者・道具・照明の配置を直す
- 自然言語の依頼を構造化した編集計画を作り、日本語の差分を確認してから一括適用する
- CodexとClaude Codeの同時編集による上書きをrevisionとロックで防ぐ
- 各変更前のJSONを履歴へ残す
- 参照切れとサーカス・空中装置の確認警告を点検する
- 本人が舞台スケッチから読み込めるJSONを準備する

現在はブラウザのlocalStorageを直接操作しません。AIが作った案は、本人が「読み込む」を選ぶまで現在のショーへ反映されません。

## 保存場所

初回のツール使用時に、アプリ直下へ次を作ります。

```text
.stage-sketch-mcp/
  projects/   AI作業中の正本
  history/    変更前の版
  exports/    舞台スケッチで読み込むJSON
  locks/      CodexとClaude Codeの同時編集防止
  plans/      確認前・適用済みの編集計画JSON
  SHOWS.md    全ショーの正本・読込JSONへの入口（自動更新）
  shows.json  SHOWS.mdと同内容の機械可読な索引（自動更新）
```

通常は `SHOWS.md` だけを開けば、どのJSONを編集するか／舞台スケッチで
読み込むかを確認できます。`projects/` のJSONが正本です。`exports/` と
`history/` は正本から派生するコピーなので、手で移動・編集しません。

このフォルダはGit対象外で、外部へ送信されません。ただし、AIへ渡した依頼文や場面情報は、
使用中のCodexまたはClaude Codeのサービスへ送られます。

## 初回準備

Node.js 20以上が必要です。このMacでは依存関係を導入済みです。別のMacでiCloudから開いた場合は、
このフォルダで一度だけ実行します。

```bash
npm ci
```

## 接続設定はリポジトリへ入れない

`.mcp.json`（Claude Code用）と `.codex/config.toml`（Codex用）は**追跡していません**。
サーバーの場所を絶対パスで書く必要があり、端末ごとに違ううえ、このリポジトリは公開だからです。
どちらも下の手順で各自の環境に作ります。**このMacでは作成済みです。**

## Codexで使う

`shosai-app/.codex/config.toml` を次の内容で作ります。`cwd` はこの `mcp-server/` の絶対パスに置き換えます。

```toml
[mcp_servers.stage_sketch]
command = "node"
args = ["src/server.js"]
cwd = "（このMacでの mcp-server/ の絶対パス）"
startup_timeout_sec = 20
tool_timeout_sec = 30
```

1. `shosai-app` をCodexのプロジェクトとして開く
2. プロジェクトを信頼する
3. 新しいセッションを開始する
4. 「舞台スケッチMCPの使い方を読んで」と頼む

プロジェクト設定が読み込まれない場合は、`shosai-app` で次を実行しても登録できます。

```bash
codex mcp add stage-sketch -- node "$PWD/mcp-server/src/server.js"
```

## Claude Codeで使う

`shosai-app/.mcp.json` を次の内容で作ります。パスはこの `src/server.js` の絶対パスに置き換えます。

```json
{
  "mcpServers": {
    "stage-sketch": {
      "command": "node",
      "args": ["（このMacでの mcp-server/src/server.js の絶対パス）"],
      "env": {}
    }
  }
}
```

1. ターミナルで `shosai-app` へ移動する
2. `claude` を起動する
3. プロジェクトMCPの利用確認が出たら、内容を確認して承認する
4. `/mcp` または `claude mcp list` で `stage-sketch` を確認する

手動登録する場合は、`shosai-app` で次を実行します。

```bash
claude mcp add --scope local stage-sketch -- node "$PWD/mcp-server/src/server.js"
```

## 最初の依頼例

```text
舞台スケッチMCPのガイドを読んでください。
「ロミオとジュリエットを、小規模なサーカス作品として再構成する」という課題で、
まず8場面の下書きを作ってください。

条件:
- プロセニアム、中規模
- 演者4人
- 大型装置は使わない
- 各場面のメモに、目的・障害・視覚的変化を書く
- 空中・危険性のある案は、安全が確認済みとは扱わず警告として残す
- 作成後に点検し、まだ舞台スケッチへは読み込まない
```

その後:

```text
いまの下書きを読み直してください。
1-1と1-2の間に、ジュリエットが決断をためらう中間場面を2つ追加してください。
revisionの競合がないことを確認し、追加後にもう一度点検してください。
```

採用候補になったら:

```text
点検結果と警告を説明してから、読み込み用JSONを準備してください。
```

返された `importFile` を、舞台スケッチの「保存 > 読み込む」から選びます。

## 編集の依頼例

編集前に `stage_sketch_read_project` で現在のrevision、場面ID、各場面にいる演者・セットの
名前とIDを読みます。そのうえで、まず計画と差分だけを依頼します。

```text
第3場面の円座を、第2場面で使っている円座に入れ替えて。まず差分だけ見せて
```

AIクライアントは `stage_sketch_plan_edit` を使い、元の依頼文と構造化した操作を
`plans/` へ保存します。この時点では `projects/` の正本とrevisionは変わりません。
資産名が曖昧なら候補を確認し、計画を作り直します。

差分、警告、現在revisionを本人が確認したあとに、次のように明示します。

```text
その計画を適用して
```

AIクライアントは通常の会話継続を承認とは扱わず、同じ `planId`・`projectId`・
`expectedRevision` と `confirmed: true` を `stage_sketch_apply_edit_plan` へ渡します。
適用された全操作は1リビジョンにまとまり、直前版が履歴へ残ります。その後、点検と
読み込み用JSONの準備まで自動で行います。

## 公開しているMCPツール

- `stage_sketch_get_guide`
- `stage_sketch_list_projects`
- `stage_sketch_read_project`
- `stage_sketch_read_scene`
- `stage_sketch_create_project_draft`
- `stage_sketch_add_scenes`
- `stage_sketch_update_scene`
- `stage_sketch_plan_edit`
- `stage_sketch_apply_edit_plan`
- `stage_sketch_inspect_project`
- `stage_sketch_prepare_import`

独立した削除ツールと、ブラウザへ自動適用するツールは意図的に公開していません。
配置の削除は、履歴に残る確認済み編集計画の操作としてだけ扱います。

## 開発確認

```bash
npm test
```

テストは、保存形式、場面挿入、古いrevisionの拒否、同時編集の直列化、
編集計画の差分・明示確認・履歴・原子的適用、読み込み用JSON、サーカス装置の警告、
実際のstdio MCP接続を確認します。

## 安全上の境界

舞台スケッチとこのMCPは、演出の思考と配置の比較を補助するものです。
リギング、荷重、落下防止、救助、消防・避難、演者の技能、衝突回避を検証または保証しません。
空中演技、投擲、回転器具、高所、火気などは、資格・経験を持つ担当者と会場の承認を別途必要とします。

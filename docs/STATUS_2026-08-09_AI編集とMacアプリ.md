# 現状整理: AI編集・Macアプリ化（2026-08-09 21時台）

同時進行が増えたため、このセッション（Claude + Codex実装）の到達点を一枚にまとめる。
別マシンのエージェントもこれを起点に読めるよう自己完結で書く。

## いま動くこと（検証済み）

**Macアプリ「制作の書斎.app」の中で、AIに日本語で指示すると、ショーの編集下書きが返る。**

```
「AI指示」パネルに書く（例: もう一人演者を追加してください）
  → 現在のショーがMCPへ書き出される
  → codex exec がMCP経由で編集計画を作る（この時点でショーは不変）
  → 差分が日本語でパネルに出る
  → 「採る」で新しいショーとして棚へ／「捨てる」で消える。元のショーは必ず残る
```

- 曖昧な指示は**既定値で埋めてまず舞台に出す**（本人決定 2026-08-09）。
  質問で止まるのは、既存のどれを指すか取り違えると壊す場合だけ
- 既定値は手動追加と完全に同一（AI_PANEL_SPEC.md に一覧）
- テスト: ブラウザ側 187 / MCP側 33 全パス。アプリ self-test 14項目パス

## 構成（3層）

| 層 | 場所 | 役割 |
| --- | --- | --- |
| MCPサーバー | `mcp-server/` | 編集計画の作成・検証・適用・履歴。plan_edit / apply_edit_plan（今日追加） |
| Macアプリ殻 | `mac-app/` | Swift+WKWebView。`shosai://` でWeb資産を直接読む。ブリッジでcodexを起動 |
| Web本体 | `stage-sketch.js` ほか | 「AI指示」パネル。ブラウザ/iPadではパネル自体が消える |

原則: **コードは1つ、殻が2つ**。アプリはWeb資産を複製せずiCloud上の実体を読む。
機能追加はWeb側に1回書けば両方に入る。

## 今日この線で作ったもの（すべて未コミット、HEAD=210b6b9）

1. **段階A**: MCPに `stage_sketch_plan_edit` / `stage_sketch_apply_edit_plan`。
   差分（日本語行＋座標付きpieces）、confirmed必須、1リビジョン原子適用、履歴保存
2. **段階B**: 読み込みモーダルに editSummary（AIの編集内容）表示
3. **Macアプリ殻**: shosai://配信、メニューバー（⌘Q/⌘C/⌘V/⌘R等）、WKUIDelegate
   （confirm/alert/ファイル選択 — これが無くて無反応バグになっていた）、
   診断モード `--diagnose-ask`、AgentRunner のPATH組み立て
4. **AI指示パネル**: 3状態（待機/実行中/下書き）、質問だけの計画の受け皿、
   AI応答の全文表示、既定値で埋める方針、モデル表示（gpt-5.6-sol / xhigh）
5. **雑修正**: 名簿の合言葉自動解錠（https限定→file:以外）、合言葉の表示切替、
   プレースホルダの呪術廻戦例を差し替え、localStorage移行機能＋手順書

## 未着手（次の候補、優先順）

1. **盤面への下書き重ね描き** — 座標付きpiecesは返っている。あとは描くだけ。
   仕様は AI_PANEL_SPEC.md「盤面への重ね方」節に確定済み
2. **聞き返しへの返答経路** — needs_clarification の質問に答えると続く形
3. **データ移行の実操作** — 手順書 MAC_APP_MIGRATION.md あり。本人操作待ち
4. **commit** — 55ファイル未コミット。別マシン分と混在のため、本人と分けて実施

## 同時進行の注意（重要）

このワークスペースは**別マシンのエージェントも同じファイルを編集している**
（今日確認できた形跡: 光の意図カード、アプリ版番号v0.3.3表示、venue系）。
21時台の時点で全テストは通っているが、**編集前に必ず読み直すこと**。
版番号 `?v=` とSWキャッシュ版は3ファイル一致（index.html / stage.html / stage-sw.js）。
現在: stage-sketch.js?v=221 相当・pwa-v49（変わりやすいので実物を確認）。

## 主要ドキュメント

- [AI_PANEL_SPEC.md](AI_PANEL_SPEC.md) — AI指示パネルの仕様（既定値一覧・重ね描き仕様を含む）
- [MAC_APP_DESIGN.md](MAC_APP_DESIGN.md) — Macアプリ設計（診断モードの使い方を含む）
- [MAC_APP_MIGRATION.md](MAC_APP_MIGRATION.md) — localStorage移行手順
- [AI_EDITING_HANDOFF.md](AI_EDITING_HANDOFF.md) — 元の段階A/B/C設計（A/B実装済み）
- `../overnight-runs/2026-08-09-mac-app-shell/REPORT.md` — 夜間ランの記録

## ビルドと確認

```bash
bash "mac-app/build.sh"                # .app を再生成
"mac-app/build/制作の書斎.app/Contents/MacOS/ShosaiDesk" --self-test
"mac-app/build/制作の書斎.app/Contents/MacOS/ShosaiDesk" --diagnose-ask  # 無反応系の調査
node --test tests/*.test.mjs
cd mcp-server && npm test
```

Web側（JS/HTML/CSS）の変更は、アプリを開いたまま ⌘R で反映される。
Swift側（mac-app/）の変更は、再ビルド＋アプリ再起動が必要。

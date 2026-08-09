# 制作の書斎.app — Macアプリ化 設計書

作成: 2026-08-09 / 決定者: 本人 / 設計: Claude / 実装: Codex
関連: [`AI_EDITING_HANDOFF.md`](AI_EDITING_HANDOFF.md)、[`../mcp-server/README.md`](../mcp-server/README.md)

## 本人が確定した前提（2026-08-09）

1. アプリは**1つ**。名前は `制作の書斎.app`。`index.html` を開き、ヘッダーから舞台スケッチへ行ける。
2. 夜間に作るのは**殻とブリッジまで**。AI欄の見た目（デザイン判断）は含めない。
3. commitもpushもしない。
4. AIクライアントの既定は `codex exec`。設定でコマンドを差し替えられるようにする。

## 目的

「Claude CodeやCodexへ指示 → 舞台スケッチが反応する」を、サーバーを立てずに成立させる。

ブラウザのサンドボックスからは外部プロセスを起動できないため、いまはローカルサーバーが要る。
Macアプリならアプリ自身がその役を担えるので、サーバー・ポート・CORS・認証・起動操作がすべて消える。

```
ブラウザ版（現状）              Macアプリ
──────────────────              ──────────────────
ブラウザ                        WKWebView（中身は同じ index.html）
  ↓ HTTP（要サーバー起動）        ↓ アプリ内のIPC
ローカルサーバー                アプリ本体（Swift）
  ↓ サブプロセス                  ↓ サブプロセス
codex exec → MCP                codex exec → MCP
```

## 最重要の原則: コードは1つ、殻が2つ

**アプリは `stage-sketch.js` などのWeb資産を複製しない。** iCloud上の `shosai-app/` の実体をそのまま読む。

```
shosai-app/（1つだけ存在する）
  ├── ブラウザ・iPad（GitHub Pages / PWA）… AI欄は出ない
  └── 制作の書斎.app（同じファイルを読む窓）… AI欄が出る
```

機能追加はWeb側に1回書けば両方へ入る。**移植作業は発生しない。**

出し分けはJS側の分岐1つで行う。

```js
if (window.stageSketchBridge) { /* Macアプリの中にいるときだけ */ }
```

**禁止: Mac専用のUIをこの分岐の外へ書くこと。** 書いた瞬間にコードが枝分かれし、二重管理が始まる。

## 技術選定

| 方式 | 判定 | 理由 |
| --- | --- | --- |
| **Swift + WKWebView** | **採用** | Xcode 26 / Swift 6.3.3 導入済み（実測）。数MB。追加依存なし |
| Tauri | 不採用 | `cargo` 未導入。ツールチェーン追加が必要 |
| Electron | 不採用 | 200MB超。iCloud同期のワークスペースに重い |

## 資産の読み込み方式: カスタムURLスキーム

`file://` は使わない。`file://` はオリジンを持たないため、localStorageが不安定、`fetch` が塞がれ、
名簿タブが動かない。代わりに `WKURLSchemeHandler` で **`shosai://app/`** を実装し、
ディスク上の `shosai-app/` を配信する。

- 起点: `shosai://app/index.html`
- 実体: `~/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/`
  （パスは `UserDefaults` の `WebRootPath` で上書き可能。既定値は上記の絶対パス）
- **ディレクトリ外への参照を拒否する**（`..` を含むパスの正規化後に、ルート配下でなければ404）
- MIMEは拡張子から決める（html, js, css, json, png, svg, webmanifest, woff2）
- 15MBの `db.js` はディスクから直接読むため、公開版より速い

### この方式で得られること

- 安定したオリジン → localStorage が永続する
- `fetch` が使える → **名簿タブがMacアプリで動く**（`file://` では動かなかった）
- `?v=` のキャッシュ版上げが不要（ディスクを直接読むため）

### 名簿タブについて（実測済み）

`roster.js` は公開URLの `data.enc` を直接取りに行く。そのURLのCORSを実測した。

```
access-control-allow-origin: *
content-length: 3436321
```

全オリジンに開いているため、`shosai://` からのクロスオリジン取得は通る見込みだった。

**2026-08-09、本人が実機で確認し、名簿タブが動作することを確認済み。**
WebKitはカスタムスキームのオリジンからのCORS取得を通す。下記の代替は**不要になった**が、
将来 `data.enc` の配信元のCORS設定が変わった場合に備えて記録として残す。

> 代替（現時点では不要）: Swift側が `data.enc` を取得し、ブリッジ経由でJSへ ArrayBuffer を渡す。
> 復号は従来どおりJS側で行い、**平文をSwift側へ渡さない**。

合言葉の保存キー `scout_pass` はオリジンごとに別なので、**アプリでは初回だけ入れ直しになる**。

### Service Worker

`shosai://` ではSWを登録しない。登録すると古い画面が出る事故が起きる。
`stage-pwa.js` の登録処理に `window.stageSketchBridge` があれば登録しない分岐を入れる。

## ブリッジ契約（JS ↔ Swift）

Swift側は `WKScriptMessageHandlerWithReply` を使い、JS側へ `window.stageSketchBridge` を注入する
（`WKUserScript` を `atDocumentStart` で注入）。

```ts
window.stageSketchBridge = {
  version: "1",                                  // 契約のバージョン
  platform: "macos",

  // AIクライアントを呼ぶ。既定は codex exec。戻り値は実行結果のテキスト。
  runAgent(prompt: string): Promise<{ ok: boolean, output: string, exitCode: number }>,

  // .stage-sketch-mcp/exports/ の一覧
  listEditExports(): Promise<Array<{ name: string, modifiedAt: string, hasEditSummary: boolean }>>,

  // 1件読む。中身は舞台スケッチの読み込みJSONそのもの
  readExport(name: string): Promise<object>,

  // 新しい編集JSONが現れたときに呼ばれる
  onEditAvailable(callback: (entry: { name: string }) => void): void,
}
```

**この夜のうちに配線まで作る。UIからの呼び出しは作らない。**
検証は自己テストモード（後述）から `runAgent` 以外を呼んで行う。

### 安全上の境界

- ブリッジは**任意のシェルコマンドを実行しない**。`runAgent` は設定されたコマンドだけを、
  引数を組み立てて起動する。JSから渡せるのはプロンプト文字列のみ。
- `readExport` / `listEditExports` は `.stage-sketch-mcp/exports/` 配下だけを見る。
  パス正規化後にその外を指すものは拒否する。
- ブリッジはショーを自動で適用しない。**必ず段階Bの読み込み確認画面を経由する。**

## AIクライアントの呼び出し

```
実行ファイル: UserDefaults "AgentCommand"（既定: /Users/arata/.local/node/bin/codex）
引数:        UserDefaults "AgentArgs"（既定: exec --skip-git-repo-check --sandbox workspace-write -C <webRoot>）
PATH:        UserDefaults "AgentPath"（指定時はPATH全体を上書き。未指定時はAgentCommandのディレクトリと標準パスから組み立てる）
末尾:        プロンプト文字列
標準入力:    /dev/null
作業ディレクトリ: webRoot
タイムアウト: 600秒（超えたらプロセスを終了し ok:false を返す）
```

`claude` を後から導入した場合は、この2つの設定値を変えるだけで切り替わる。**殻の作り直しは不要。**

## exports フォルダの監視

`DispatchSource.makeFileSystemObjectSource`（または `FSEventStream`）で
`.stage-sketch-mcp/exports/` を監視する。新しい `.json` を検出したら、`editSummary` を持つ場合だけ
`onEditAvailable` のコールバックをJSへ送る。

- iCloud上のフォルダなので、イベントが来ない環境に備え **30秒間隔のポーリングを併用**する。
- **通知するだけ。自動で読み込まない。**

## データの移行（重要）

localStorageはオリジンごとに独立している。いまのショー・スクラップブック・制作机の記録は
ブラウザ側（`file://` または `https://...github.io`）に入っており、**アプリからは見えない。**

対応:

1. まず `index.html` 側に既存の書き出し／読み込み機能があるかを調査する
   （舞台スケッチには「保存 > 書き出す／読み込む」がある）。
2. 書斎側（スクラップブック・制作机など）に無ければ、**全localStorageを1つのJSONへ書き出し／
   読み込みする機能**を追加する。対象キーは `stage-sketch.js` 187行付近の既存キー一覧を起点に、
   `shosai` / `stage` 接頭辞のキーを走査して決める。
3. 移行手順を `docs/MAC_APP_MIGRATION.md` に書く。**実際の移行操作は本人が行う。**

**この機能はブラウザ版にも入る**（同じコードなので）。アプリ専用にしない。

## 配置と署名

- Xcodeプロジェクトは作らず、`Package.swift` またはビルドスクリプトで `.app` を組み立てる
  （Xcodeプロジェクトファイルは差分が読めず、iCloud同期に向かないため）。
- 置き場所: `shosai-app/mac-app/`
- 成果物: `shosai-app/mac-app/build/制作の書斎.app`（**gitignoreへ追加**）
- 署名なしのローカルビルド。自分のMacで作る限りGatekeeperの警告は出ない。
  他のMacへ配る段階になったら別途検討する。

## 自己テスト（無人で検証できる形）

`.app` に `--self-test` 引数を渡すと、ウィンドウを表示せずに次を行い、結果をJSONで標準出力へ
出して終了する。**朝までの検証はこれで行う。**

1. `shosai://app/index.html` を読み込む
2. `document.title` を取得する
3. `typeof window.stageSketchBridge` を確認する
4. `stageSketchBridge.listEditExports()` を呼び、配列が返ることを確認する
5. `shosai://app/stage.html` を読み込み、同様に確認する
6. ディレクトリ外アクセス（`shosai://app/../../secret`）が404になることを確認する
7. 通常起動用の `WKUIDelegate` 設定が有効で、自己テスト自身は未設定のままであることを確認する

終了コード: 全て成功で0、1つでも失敗で1。

## 診断モード

AI指示の「頼む」を目視せずに再現する診断を常設する。先に `bash mac-app/build.sh` で
アプリを作り、次の実行ファイルへ引数を渡す。どちらもウィンドウは表示せず、診断専用の
非永続localStorageと一時MCPデータ領域を使う。

```bash
mac-app/build/制作の書斎.app/Contents/MacOS/ShosaiDesk --diagnose-ask
mac-app/build/制作の書斎.app/Contents/MacOS/ShosaiDesk --diagnose-ask=accept
```

- `--diagnose-ask`: 通常の非表示診断。`WKUIDelegate` は設定せず、`confirm()` が既定値
  `false` を返す経路を確認する。`snapshots.after3Seconds.stageAskError.textContent` が
  `取り消しました`、`bridgeCalls` に `stageSketchRunAgent` が無ければ意図どおり。
- `--diagnose-ask=accept`: 初回確認だけを診断スクリプトで自動承認する。AIクライアントは
  `/bin/echo` に差し替えるため、実作業はしない。`confirmations[].result` が `true`、
  `bridgeCalls` に `stageSketchRunAgent` があれば、`runAgent` まで到達している。
- 既存の `--diagnose-ask=real` は設定済みの実クライアント情報を読むが、非表示診断なので
  `confirm()` は `false` のまま。実クライアントを自動承認して起動するモードではない。

出力はJSONで、`ok: true` と `checks` の全項目が `true` なら診断成功。`confirmations` は
確認文・戻り値、`snapshots` はクリック直後と3秒後の表示、`bridgeCalls` はSwiftブリッジへ
届いた呼び出し、`exceptions` / `fatalErrors` はJavaScript例外と診断自体の失敗を示す。
終了コードは診断成功で0、失敗で1。

## 完了条件（夜間ぶん）

- `.app` がビルドできる
- `--self-test` が終了コード0
- 既存の `node --test tests/*.test.mjs` と `mcp-server` の `npm test` が引き続き全て通る
- `docs/MAC_APP_MIGRATION.md` がある
- commitしていない

## この夜にやらないこと

- AI欄のUI（デザイン判断のため朝に本人と決める）
- commit・push・公開・配布
- ファイルの削除・移動・改名
- 舞台スケッチ／書斎の既存機能の変更（移行用の書き出し機能の追加を除く）
- 署名・公証・App Store関連

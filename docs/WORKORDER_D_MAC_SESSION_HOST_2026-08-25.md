# 発注書D: Macアプリから共有セッションをホストできるようにする

発注元: Claude（仕様確定）。実装: Codex。検証: Claude。作成 2026-08-25。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 背景（なぜ作るか）

Macアプリ（制作の書斎）は `shosai://app/index.html` のカスタムスキームで
ローカルファイルを読み込む。共有セッションのサーバー（Durable Object）は
`https://shosai-app.juggler-arata.workers.dev` にしかないため、ページからの
`fetch("session/new")` はローカルの存在しないファイルへ向かい **404** になる
（2026-08-25 実機で確認）。本人が会議でホストになるのはMacアプリなので、
アプリからセッションを開始できるようにする。

## アーキテクチャ（確定事項。変えないこと）

**Swiftが「土管」になり、ページと本番サーバーの間を中継する。**

- ページ（stage-session.js）はブリッジがあればブリッジ経由、無ければ従来どおり
  `fetch` / `WebSocket` を直接使う。**ブラウザでの挙動は1バイトも変えない。**
- Swift側は `URLSession` で POST `/session/new`、`URLSessionWebSocketTask` で
  `wss://…/session/<roomId>/ws` を張る。**認証はBasic認証ヘッダ**
  （`Authorization: Basic base64(user:pass)`）。worker.js はBasic認証を意図的に
  受け付け続けており（判定順②）、WebSocketの101応答はクッキー付与をスキップする
  作りが既にある（`withSessionCookie` 冒頭）。**したがってworker.js・session-room.js・
  wrangler.toml はゼロ変更。** CORSヘッダの追加・SameSiteの変更・公開パスの追加は
  **禁止**（fail-closedの境界を広げない）。
- 本番オリジンはSwift側の定数1箇所に置く:
  `https://shosai-app.juggler-arata.workers.dev`

## やること

### D-1. Swift: 認証情報のキーチェーン保存と入力ダイアログ

- 保存先: macOSキーチェーン（`SecItemAdd`/`SecItemCopyMatching`）。
  service `"shosai-app-session"`。ID とパスワードを保存。
- 初回（キーチェーンに無い）: **ネイティブのダイアログ**（`NSAlert` +
  `NSTextField`/`NSSecureTextField`）で「会議用セッションのログイン」として
  ID/パスワードを聞く。**値をページ側へ渡さない・ログに出さない。**
- 検証を兼ねて実際の POST `/session/new` を投げ、200なら保存して続行。
  401なら「お名前かパスワードが違うようです」を出して**保存せず**もう一度聞く
  （キャンセルされたら中止）。
- 保存済みでも、後で401が返ったら（＝パスワード変更後）キーチェーンの値を破棄して
  聞き直す。**この動線は近く予定されているSITE_PASS変更後の再ログインを兼ねる。**

### D-2. Swift: セッション中継（新規 `SessionRelay.swift` を推奨）

ブリッジ（`StageSketchBridge.swift`）に以下のメッセージを足す。
**命名・形・登録方法は既存のメッセージ（`notifyEditAvailable`、
2026-08-25追加の `notifyDownloadDestinationDecision` / `onDownloadDestinationDecision`）に
倣うこと。** P0のオリジン制限（shosai://app のページのみ）を必ず通す。

ページ→ネイティブ（reply付き）:

| メッセージ | 動作 | 返り値 |
|---|---|---|
| `sessionStart` | D-1の資格情報で POST `{PROD}/session/new` | `{ok:true, roomId, hostKey, origin:"https://…workers.dev"}` / `{ok:false, reason:"cancelled"\|"unauthorized"\|"network"\|"http-<status>"}` |
| `sessionConnect` `{roomId, role, name, hostKey}` | wss URLを組み立てて接続（クエリは現行 `sessionSocketUrl()` と同一: role/name/key） | `{ok:true}` / `{ok:false, reason}` |
| `sessionSend` `{text}` | 接続中のソケットへ文字列送信 | `{ok:Bool}` |
| `sessionDisconnect` | ソケットを閉じる | `{ok:true}` |

ネイティブ→ページ（`evaluateJavaScript`、既存の `__stageSketch…` パターンに倣う）:

- `__stageSketchSessionEvent({type:"open"})` / `({type:"message", data:"<text>"})` /
  `({type:"close"})` / `({type:"error"})`
- ページ側の購読口は `bridge.onSessionEvent(callback)`。

**ソケットは同時に1本だけ**でよい（ページの現行実装も1本）。再接続の判断・回数制御は
従来どおりJS側が持つ（切れたらcloseイベントを流すだけでよい）。
受信は `URLSessionWebSocketTask.receive` を再帰的に回し、文字列のみ扱う
（バイナリが来たら無視してよい）。

### D-3. JS: stage-session.js にブリッジ経路を足す

改修点は以下に集約されている。**他の流れ（差分送信・doc適用・UI）は触らない。**

1. `startHostSession()`（616行付近）: `window.stageSketchBridge` に
   `sessionStart` の口があればそれを使う。`{ok:false}` の reason に応じて
   現行と同じ `setStatus` 文言系で理由を出す（`cancelled` は静かに戻すだけでよい）。
2. `connectSocket()`（514行付近）と `sendMessage()` / `socketIsOpen()` /
   `handleSocketClose()`: ソケット操作を小さなアダプタに包む。
   ブリッジがあれば `sessionConnect`/`sessionSend`/`sessionDisconnect` と
   `onSessionEvent` で同じ interface（open/message/close/error）を再現し、
   無ければ従来の `WebSocket` をそのまま使う。
3. 招待URL（現在 `${location.origin}${location.pathname}#session=`）:
   **ブリッジ経由のときは `sessionStart` が返した origin を使い、パスは常に
   `/stage.html`** とする（`${origin}/stage.html#session=${roomId}`）。
   shosai://app のURLを配ってはいけない。ブラウザ時は現行のまま。

### D-4. 触ってはいけないもの

- `worker.js` / `session-room.js` / `wrangler.toml`（サーバーはゼロ変更）
- ブラウザでのセッション動作（ブリッジ不在の分岐は現行コードのまま）
- ブリッジのオリジン制限・認証（P0で入れたもの）
- `stage.html`（生成物）。`index.html` を触ったら報告する

## 共通の制約（必ず守る）

- **既存ファイルは編集前に必ず読み直す。** 他エージェントが同じファイルを触っている前提。
- **ファイルの削除・移動はしない。**
- **版上げ（`?v=`・`CACHE_NAME`）と `build_stage.py` の実行はしない。** 発注元がやる。
- 日本語UI文字列を足したら **`stage-i18n.js` へ英語も登録する**
  （`tests/stage-i18n-coverage.test.mjs` が落ちる）。
- 資格情報・トークンをコード・テスト・ログ・レポートに書かない。
- 既存テストを壊さない。落ちる場合は**そのテストが何を守っていたのかを報告する**。

## 完了条件

1. `node --test tests/` 全通過（現状524件。減っていないこと）。
2. Macアプリがビルドでき（`bash mac-app/build.sh`）、セルフテスト
   （`--self-test`）が全通過すること。
3. 回帰テストを追加。最低限:
   - ブリッジが無いとき、`startHostSession` が従来どおり `fetch("session/new")` を呼ぶ
   - ブリッジがあるとき、`sessionStart` を使い、招待URLが
     `https://…workers.dev/stage.html#session=<roomId>` になる
   - ソケットアダプタ: ブリッジ経路で open→message→close のイベントが
     従来のハンドラへ届く
   - Swiftセルフテスト: 新メッセージが登録され、信頼できないオリジンからは
     拒否されること（既存の `bridge-origin-policy` の形に倣う）
4. 手で確かめる（できる範囲で。ネットワーク・資格情報が要るものは
   「未実施・発注元が実機で検証する」と明記すればよい）:
   - Macアプリで「セッションを開始」→ ダイアログ → 開始できる
   - ブラウザ（ローカル `python3 -m http.server` 等）で従来どおり動く

## 報告に含めること

- 変更したファイルと、各ファイルで何をしたか
- 完了条件それぞれの実行結果（コマンド出力を貼る）
- ブリッジの既存のどの仕組みに倣ったか
- 仕様に書かれておらず自分で判断した点
- **できなかったこと・不確かなことを隠さない。** 発注元が実機で検証する。

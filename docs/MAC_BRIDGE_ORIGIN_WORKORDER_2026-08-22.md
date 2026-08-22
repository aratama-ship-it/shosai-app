# 舞台スケッチ P0-4 層1・層2: 外部遷移の禁止とブリッジのorigin制限 発注書

- 起票日: 2026-08-22
- 起票: Claude（仕様確定）／実装: Codex／検証: Claude
- 設計書: `docs/MAC_BRIDGE_P0_4_DESIGN_2026-08-22.md`（**先に読むこと**）
- 本人判断: 2026-08-22 に「①②を先に実装して切り離す」で取得済み
- **範囲: `mac-app/Sources/` のSwiftのみ。`stage-sketch.js` には一切触らない。**

この発注書は単体で読めるように書いている。

## なぜやるか（1行）

外部サイトへ遷移した時点で、そのページのJavaScriptが `stageSketchBridge.runAgent(任意の文字列)` を
呼べる＝**`codex exec --sandbox workspace-write` を任意プロンプトで起動できる。**

## Claudeが実機で確認済みの前提（そのまま使ってよい）

- **ビルドは通る**: `bash mac-app/build.sh`（`xcrun swiftc`、Swift 6.3.3、CommandLineTools）。
  iCloud上のため**約4分かかる**。失敗ではないので待つこと。
- **セルフテストはヘッドレスで走り、現状13件全通過する**:

```
cd <shosai-app>
ROOT="$(pwd)"
"mac-app/build/制作の書斎.app/Contents/MacOS/ShosaiDesk" --self-test \
  -WebRootPath "$ROOT" -AgentCommand "$(command -v codex)"
```

  JSONを標準出力に出し、全通過で終了コード0。**`-WebRootPath` の指定は必須**
  （`AppConfiguration.defaultWebRootPath` が旧ユーザー名 `/Users/arata/...` を指しているため。
  これは別件。**この発注書では直さない。**）
- `mac-app/build/` は `.gitignore` 済み（19行目）。ビルド成果物はcommit対象にならない。

---

## 層1: `shosai://` 以外のメインフレーム遷移を止める

対象: `mac-app/Sources/WebDownloadCoordinator.swift`

現状は `decidePolicyFor` が**ダウンロード以外すべて `.allow`**。scheme も host も見ていない。

### 1-1. 判定を純粋関数へ切り出す（★テスト可能性のため必須）

`WKNavigationAction` はテストから生成できない。**判定ロジックを、値だけを受け取る
静的関数へ切り出すこと。** `decidePolicyFor` はその薄い呼び出しにする。

```swift
enum WebNavigationDecision: Equatable {
    case allow
    case download
    case cancel                 // 黙って捨てる
    case openExternally(URL)    // 通常ブラウザへ渡す
}

extension WebDownloadCoordinator {
    /// 遷移を許すかどうかを、URLと遷移種別だけで決める。
    /// WKNavigationAction はテストから作れないので、判定はここに閉じる。
    static func decision(
        for url: URL?,
        scheme: String?,
        isMainFrame: Bool,
        isLinkActivated: Bool,
        shouldPerformDownload: Bool
    ) -> WebNavigationDecision {
        if shouldPerformDownload { return .download }
        guard let url else { return .cancel }
        let normalized = (scheme ?? url.scheme ?? "").lowercased()
        if normalized == "shosai" { return .allow }
        if normalized == "about" { return .allow }   // about:blank 等。※下記の注意を読むこと
        // shosai 以外は、この WebView には絶対に載せない。
        // 本人がリンクを押したときだけ、通常のブラウザへ渡す。
        if isMainFrame, isLinkActivated,
           normalized == "http" || normalized == "https" {
            return .openExternally(url)
        }
        return .cancel
    }
}
```

**`about` を許すかどうかは実装時に判断すること。** 許すと `about:blank` に注入された
ブリッジが残る経路が理屈上できる。層2があるので致命ではないが、
**不要なら許さない方がよい。** 現状のアプリが `about:blank` を使っているかを
`grep` で確かめてから決め、**どちらにしたか報告すること。**

### 1-2. `decidePolicyFor` を薄くする

```swift
func webView(_ webView: WKWebView,
             decidePolicyFor navigationAction: WKNavigationAction,
             decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    let url = navigationAction.request.url
    switch Self.decision(
        for: url,
        scheme: url?.scheme,
        isMainFrame: navigationAction.targetFrame?.isMainFrame ?? true,
        isLinkActivated: navigationAction.navigationType == .linkActivated,
        shouldPerformDownload: navigationAction.shouldPerformDownload
    ) {
    case .allow:    decisionHandler(.allow)
    case .download: decisionHandler(.download)
    case .cancel:   decisionHandler(.cancel)
    case .openExternally(let target):
        decisionHandler(.cancel)
        NSWorkspace.shared.open(target)
    }
}
```

`targetFrame` が `nil`（新規ウィンドウを開こうとしている）ときは
`isMainFrame: true` として扱う（上記の既定値）。**新規ウィンドウで外部を開かれるのが
一番危ないので、ここを緩めないこと。**

### 1-3. 注意

- **既存のダウンロード機能を壊さないこと。** `shouldPerformDownload` を最優先で見る現状の
  挙動は維持する（`<a download>` の保存が動かなくなると回帰になる）。
- `SelfTestRunner` と `DiagnoseAskRunner` / `DiagnoseAdoptRunner` は**自前で
  `navigationDelegate` を差し替えている**（それぞれ29行目・88行目・65行目）。
  つまり自己診断中は `WebDownloadCoordinator` を通らない。**それらのRunnerは変更しない。**

---

## 層2: ブリッジをoriginで閉じる（多重防御）

対象: `mac-app/Sources/StageSketchBridge.swift`

### 2-1. 判定を純粋関数へ切り出す

```swift
extension StageSketchBridge {
    /// このフレームからブリッジを使わせてよいか。
    /// securityOrigin.protocol は WebKit が持つ呼び出し元の実オリジンで、
    /// ページ側のJavaScriptからは偽装できない。ここが本当の関所。
    static func isTrustedFrame(isMainFrame: Bool, originProtocol: String) -> Bool {
        isMainFrame && originProtocol.lowercased() == "shosai"
    }
}
```

### 2-2. ハンドラの先頭で必ず弾く

`userContentController(_:didReceive:replyHandler:)` の**いちばん最初**、
`switch message.name` より前に置く。7つのメッセージすべてに一律で効かせること。

```swift
guard Self.isTrustedFrame(
    isMainFrame: message.frameInfo.isMainFrame,
    originProtocol: message.frameInfo.securityOrigin.protocol
) else {
    diagnosticMessageHandler?("\(message.name):rejected-origin")
    replyHandler(nil, "This bridge is only available to the app's own pages.")
    return
}
```

`diagnosticMessageHandler` への通知は、既存の `diagnosticMessageHandler?(message.name)` の
呼び方に合わせること（既存の診断表示を壊さない形にする。**壊すなら通知を足さない方を選ぶ**）。

### 2-3. やってはいけないこと

- **`contentWorld` を `.page` から変えない。** `stage-sketch.js` 自身がページ世界から
  ブリッジを呼ぶので、変えると正規の機能が壊れる。関所はSwift側に置く。
- 注入スクリプト側の `location.protocol` チェックだけで済ませない。
  ページ世界の値なので信用できない。**入れるとしても補助**であり、
  2-2のSwift側チェックは必ず入れること。
- `forMainFrameOnly: true` は現状のまま維持する。

---

## テスト（`SelfTestRunner.swift` へ追加）

既存13件の書き方（`id` / `name` / `ok` / `detail` を持つJSON項目）に**完全に合わせる**こと。
既存項目のidや順序を壊さない。**最低この5件**を足す。

1. **`shosai://` は通る** — `decision(for:...)` が `.allow` を返す。
2. **`https://` のスクリプト遷移は捨てる** — `isLinkActivated: false` で `.cancel`。
3. **`https://` のリンククリックは外部ブラウザへ** — `isLinkActivated: true` で
   `.openExternally`。**`NSWorkspace.shared.open` は呼ばないこと**（テスト中にブラウザが開く）。
   判定関数の戻り値だけを検査する。
4. **`file://` と未知schemeは捨てる** — `.cancel`。
5. **ブリッジのorigin判定** — `isTrustedFrame` が
   `shosai`+mainFrame で `true`、`https` / `file` / `about` / 空文字 / サブフレームで
   **すべて `false`** を返す。

### 可能なら足す（実機に近い検証）

`SelfTestRunner` は既に `WKWebView` を持っている。
**`loadHTMLString(_:baseURL: nil)` で読み込むとオリジンは `shosai` にならない**ので、
そこから `window.stageSketchBridge.listEditExports()` を呼び、
**拒否されること**をネットワーク無しで確認できる可能性がある。

- 書けるなら書く。**層2が実際に効いていることの最も強い証拠になる。**
- 書けない場合（層1で `about` を捨てる設定にしたため読み込み自体が止まる等）は、
  **理由を報告すること。** 無理に書かない。

**通っているように見えて何も検査していないテストを書かないこと。**
各項目で期待値を実際に assert する。

## 完了条件

すべて満たしてから「完了」と報告すること。

- [ ] `bash mac-app/build.sh` が成功（約4分かかる。待つこと）
- [ ] セルフテストが**全通過・終了コード0**（既存13件＋追加分。上記のコマンドで実行）
- [ ] `node --test tests/*.test.mjs` が **440件のまま全通過**（Swift変更なので増減しないはず。
      増減したら何かを触っている）
- [ ] `git diff --check` が成功
- [ ] `git status --short` に、`mac-app/Sources/` 以外の**新たな**変更が無い

## 報告に必ず含めること

- 変更したファイルと行数
- `about` scheme を許したか捨てたか、その根拠（grepで何を確認したか）
- 追加したセルフテストの件数と、各項目が何を検査しているか
- `loadHTMLString` による実機に近い検証を書けたか、書けなかったなら理由
- セルフテストの実行結果（件数と終了コード）
- 判断に迷って別解にした箇所と、その理由
- **commitはしていないこと**

## やらないこと（この作業の境界）

- commit・push・deploy
- **層3**（Nodeと共通のロック、`expectedRevision` の必須化）— 別発注。
  本人判断は「revision不一致なら中止して読み直しを促す」で取得済み。
- **`stage-sketch.js` を触ること**（この作業はSwiftだけで閉じる）
- `AppConfiguration` の旧ユーザー名 `/Users/arata/...` 問題 — 別起票
- `SelfTestRunner` / `DiagnoseAskRunner` / `DiagnoseAdoptRunner` の
  `navigationDelegate` 差し替えを変えること
- `build_db.py` / `db.js` / `build_stage_shows_local.py` /
  `tests/stage-local-shows.test.mjs`（別作業の未commit変更。触らない）

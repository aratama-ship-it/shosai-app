# 舞台スケッチ P0-4: Macブリッジの競合検出とorigin制限 設計書

- 起票日: 2026-08-22
- 設計: Claude（コードを実際に読んで確認した内容のみを書く）
- 元資料: `docs/STAGE_SKETCH_RELEASE_REVIEW_2026-08-22.md` の P0 #4
- 状態: **設計のみ。実装は未着手。本人の判断待ちが3件ある。**

この設計書は単体で読めるように書いている。

---

## 0. 結論を先に

P0-4は元資料では「revision競合検出」が主題で、origin制限は4つ目の箇条書きに添えられている。
**しかしコードを読むと、優先順位は逆である。**

> **`decidePolicyFor` が全ナビゲーションを無条件 `.allow` しており、
> ブリッジは注入先URLを問わない。したがって外部サイトへ遷移した時点で、
> そのページのJavaScriptが `stageSketchBridge.runAgent(任意の文字列)` を呼べる。
> これは `codex exec --sandbox workspace-write` を任意のプロンプトで起動できることを意味する。**

revision競合は「作業が上書きされる（履歴には残る）」問題だが、
こちらは「外部ページがローカルのAIエージェントを操れる」問題である。**先に塞ぐべきはこちら。**

---

## 1. 現状（すべてコードで確認済み）

### 1-1. MCP（Node）側は堅牢

`mcp-server/src/project-store.js`:

- `locks/<projectId>.lock` を `open(lockPath, "wx")`（排他作成）で取る（316〜337行）
- `assertRevision(document, expectedRevision)` で不一致なら例外（290〜296行）
- `mutate(projectId, expectedRevision, operation)` が「ロック取得 → revision照合 → 実行 → revision+1」を束ねる（341行）
- 計画適用時は `plan.expectedRevision` の一致まで検査する（397行）
- 上書き前に `history/revision-N.json` へ退避する（302〜305行）

**つまり必要な規律はNode側に既にある。**

### 1-2. Mac（Swift）側はそれを迂回する

`mac-app/Sources/StageSketchProjectStore.swift` の `writeProject(_:)`:

- **`locks/` を一切参照しない。** Nodeの `mutate` と同時に走れる。
  両者ともファイル書き込み自体は atomic（`.atomic` / `rename`）なので壊れたファイルにはならないが、
  **lost update（片方の書き込みが消える）は起きる。**
- **`expectedRevision` を受け取らない。** 既存の revision を読んで
  無条件に `currentRevision + 1` で書く（74行付近）。
- 退避（`archive`）は行っている。**データは `history/` に残るので永久消失ではない。**
  ただし利用者には何も伝わらないので、気づく手段がない。

パス安全性（シンボリックリンク解決、prefix照合、ファイル名検証）は丁寧に書かれている。ここは問題ない。

### 1-3. 呼び出し側の流れ

`stage-sketch.js` の `requestPlan`（739行付近）:

1. `await bridge.writeProject(document)` … ブラウザの現在状態を丸ごと正本へ書く
2. 戻り値 `{projectId, revision}` を受け取る
3. `promptFactory(projectId, revision, request)` で `expectedRevision: <revision>` を含むプロンプトを組む
4. エージェントを起動し、MCP経由で編集させる

**危ないのは1である。** ブラウザが古い状態を持ったままここに来ると、
MCP側が積み上げた新しいrevisionの内容が、ブラウザ状態で置き換わる。
そのうえ3以降のAI編集は、置き換わった後の状態を土台に進む。

### 1-4. ブリッジの注入とナビゲーション

`mac-app/Sources/StageSketchBridge.swift` `install(in:)`:

```swift
userContentController.addScriptMessageHandler(
    self, contentWorld: .page, name: Self.runAgentMessage)   // 他6つも同様
userContentController.addUserScript(WKUserScript(
    source: Self.injectionScript,
    injectionTime: .atDocumentStart,
    forMainFrameOnly: true,
    in: .page
))
```

- **URLによる絞り込みが無い。** メインフレームに読み込まれた**あらゆる**文書へ
  documentStart で注入される。
- `contentWorld: .page` なので、そのページのJavaScriptから直接呼べる。
- ハンドラ側（`userContentController(_:didReceive:replyHandler:)`）も
  **`message.frameInfo` を一切見ていない。** 呼び出し元のoriginを検査していない。

`mac-app/Sources/WebDownloadCoordinator.swift`（AppDelegate:32 でメインWebViewの navigationDelegate）:

```swift
func webView(_ webView: WKWebView,
             decidePolicyFor navigationAction: WKNavigationAction,
             decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    decisionHandler(navigationAction.shouldPerformDownload ? .download : .allow)
}
```

**ダウンロード以外はすべて `.allow`。** scheme も host も見ていない。
正規の配信は `shosai://`（`ShosaiSchemeHandler`、`WebEnvironment.swift:46`）だが、
`https://` への遷移を止めるものが無い。

### 1-5. 外部ページが得る能力

遷移後のページから `window.stageSketchBridge` 経由で次が呼べる。

| API | できること |
|---|---|
| `runAgent(prompt)` | **`codex exec --skip-git-repo-check --sandbox workspace-write -C <webRoot>` を任意プロンプトで起動** |
| `listEditExports()` / `readExport(name)` | ローカルの書き出しファイルを列挙・読み取り |
| `writeProject(document)` | 正本プロジェクトファイルを書き換え |
| `latestPlan(projectId)` | 計画ファイルを読み取り |

`AgentRunner.run(prompt:)` に確認や検証は無い（同時実行を1本に絞るだけ）。

### 1-6. 現時点の実害の程度（正直に書く）

`AppConfiguration.swift:36-38` は既定値が**旧ユーザー名**を指している。

```swift
static let defaultWebRootPath = "/Users/arata/Library/Mobile Documents/..."
static let defaultAgentCommand = "/Users/arata/.local/node/bin/codex"
```

このMacは `/Users/arataurawa/` なので、`UserDefaults` の `WebRootPath` 等で
上書きしない限り既定値では動かない。**つまり今この瞬間に踏まれる状態とは限らない。**
ただしこれは**安全機構ではなく設定の行き違い**であり、防御として数えてはいけない。

---

## 2. 直し方（3層）

### 層1: 外部へ出さない（最優先・実装は最小）

`WebDownloadCoordinator.decidePolicyFor` を、**`shosai://` 以外のメインフレーム遷移を拒否**する形にする。

- `shosai` scheme … `.allow`
- ダウンロード … 現状どおり `.download`
- それ以外（`http` / `https` / `file` / `about:blank` 以外の何か）…
  `.cancel` したうえで、**利用者の意図したリンクなら `NSWorkspace.shared.open(url)` で
  通常のブラウザへ渡す**（アプリ内に外部サイトを表示しない）。
  - `navigationAction.navigationType == .linkActivated` のときだけ外部ブラウザへ渡す。
    それ以外（スクリプトによる `location` 書き換え、リダイレクト）は**黙って捨てる**。
- サブフレーム（`navigationAction.targetFrame?.isMainFrame == false`）の扱いも決める。
  現状 iframe を使っている箇所があるか要確認。無ければサブフレームも `shosai://` 以外は拒否。

### 層2: ブリッジをoriginで閉じる（多重防御）

層1が破れても（設定ミス、将来の改修、別経路の遷移）能力が漏れないようにする。

`StageSketchBridge.userContentController(_:didReceive:replyHandler:)` の**先頭**で、
`message.frameInfo` を検査して弾く。

```swift
guard message.frameInfo.isMainFrame,
      message.frameInfo.securityOrigin.protocol.lowercased() == "shosai" else {
    replyHandler(nil, "This bridge is only available to the app's own pages.")
    return
}
```

- `securityOrigin.protocol` は WebKit が持つ**呼び出し元フレームの実オリジン**なので、
  ページ側のJavaScriptから偽装できない。ここが本当の関所になる。
- 注入スクリプト側の `location.protocol` チェックは**補助**にしかならない
  （ページ世界の値なので信用しない）。入れるとしても、あくまで
  「外部ページに `window.stageSketchBridge` という存在自体を見せない」ための化粧である。
- `contentWorld` を `.page` から変えることは**できない**。
  `stage-sketch.js` 自身がページ世界で動いており、そこから呼ぶ必要があるため。
  だから関所はSwift側に置くしかない。

### 層3: 書き込みの競合を検出する

#### 3-1. Swiftも同じロックを取る

`StageSketchProjectStore.writeProject` を、Nodeと**同じ** `locks/<projectId>.lock` を
`O_CREAT | O_EXCL` で作ってから読み書きし、終わったら消す形にする。

- ロック取得に失敗したら**待たずにエラーを返す**（`AgentRunner` は既に「1本だけ」を守っており、
  ここで待つと固まるだけ）。エラー文は「別の編集が進行中です。少し待ってからもう一度」。
- Node側の実装（`project-store.js` 316〜337行）を読んで、
  **ファイル名・置き場所・後始末の作法を完全に一致させる**こと。片方だけ変えない。
- 異常終了でロックが残る問題への対処がNode側にあるか確認し、同じ扱いにする。

#### 3-2. `writeProject` に `expectedRevision` を必須化する

ブラウザは「自分が最後に見た revision」を持っていない。**まずそこを作る。**

1. `applyDocumentString` / `prepareProjectImportDocument` などで正本由来の文書を取り込むとき、
   `mcpMeta.revision` をブラウザ側の状態に保持する（`state.project.mcpRevision` 等）。
   **既存ショーには存在しないので、無ければ `null`。**
2. `bridge.writeProject({ document, expectedRevision })` の形に拡張する。
3. Swift側は、正本ファイルが**存在するのに** `expectedRevision` が一致しない場合、
   **書かずに競合として返す**（`{ conflict: true, currentRevision: N }`）。
   - 正本が存在しない（新規）→ 従来どおり作成。
   - `expectedRevision` が `null`（この端末が正本を一度も読んでいない）→ **後述の判断2**。

#### 3-3. 競合したときの見せ方

Swiftから `conflict` が返ったら、`stage-sketch.js` はAI実行へ進まず、利用者に選ばせる。
**ここが本人判断1（下記）。**

---

## 3. 本人の判断が要る点（3件）

### 判断1: revision不一致のときどうするか

| 案 | 内容 | 長所 | 短所 |
|---|---|---|---|
| A. 中止して読み直しを促す | 「正本が新しくなっています。読み込み直してください」で止める | 実装が最小。壊れようがない | 手元の未反映の編集を自分で移す手間が出る |
| B. 選ばせる（元資料の案） | 「正本を取り込む／手元で上書きする／別のショーとして保存する」の3択 | 取りこぼしが無い | UIが要る。3択の意味を誤ると事故る |
| C. 常に別ショーへ分岐 | 競合したら新しい `project.id` で保存し、両方残す | 何も失わない | ショーが増えて棚を圧迫する（容量が既に逼迫） |

**Claudeの推奨: A から始め、必要になってから B。**
理由: 競合は「MCPで編集した後にブラウザから再度AIを回した」ときに起きるもので、
**そもそも頻度が低い。** 上書きされた版は `history/` に残るので、Aで止めれば失われない。
容量が逼迫している以上 C は選びにくい。Bは3択の文言設計を誤ると、
利用者が「手元で上書きする」を安易に選んで元資料の懸念そのものを再現する。

### 判断2: `expectedRevision` が無いとき（既存ショー・初回）どうするか

正本ファイルが既にあるのに、ブラウザ側が revision を持っていない場合。

| 案 | 内容 |
|---|---|
| A. 競合として止める | 安全側。ただし**既存の全ショーで初回だけ必ず止まる**ので、体験が悪い |
| B. 一度だけ通す（現状維持） | 従来どおり書ける。ただし初回の上書きは防げない |
| C. 確認を出して選ばせる | 「この端末はこのショーの正本をまだ読んでいません。上書きしますか？」 |

**Claudeの推奨: C。** Aは既存ショー全部で詰まる。Bだと穴が残る。
Cなら1回確認するだけで、以後はrevisionが乗るので黙って通る。

### 判断3: 外部リンクをどう扱うか（層1）

| 案 | 内容 |
|---|---|
| A. 通常ブラウザで開く | リンクを押したら Safari 等が開く。アプリ内には出さない（**推奨**） |
| B. 何もしない | リンクを無効化する。分かりにくい |

アプリ内に外部サイトを表示する案は、**層2があっても採らない方がよい**と考える。
`runAgent` を持つWebViewに任意のページを載せる設計そのものを残さない方が、
将来の改修で穴が復活しにくい。

---

## 4. 実装の順序（判断が出たあと）

1. **層1**（`decidePolicyFor` のscheme制限＋外部ブラウザ受け渡し）
2. **層2**（`frameInfo.securityOrigin` によるブリッジの関所）
3. **層3-1**（Swiftのロック取得。Node側と作法を一致させる）
4. **層3-2 / 3-3**（`expectedRevision` の保持・受け渡し・競合時の挙動）

1と2は Swift だけで閉じており、ブラウザ側の変更が要らない。**先に出せる。**
3-2以降は `stage-sketch.js` にも手が入り、テストも増える。

## 5. 検証で必ず確認すること

Swift側はNodeテストの枠組みに乗らない。**どう検証するかを実装前に決めること。**

- `mac-app/Sources/SelfTestRunner.swift`（557行）が既にある。**まず中身を読み、
  この4項目を足せるかを判断する。** 足せるならそこへ足す。
- 最低限、次を機械的に確認したい。
  - `shosai://` 以外のメインフレーム遷移が `.cancel` される
  - 外部originのフレームからのブリッジ呼び出しが**すべて**拒否される（7つのメッセージ全部）
  - `expectedRevision` 不一致で `writeProject` が書かずに返る
  - Nodeの `mutate` とSwiftの `writeProject` を同時に走らせても lost update が起きない
- ブラウザ側（`stage-sketch.js`）の変更は既存の `vm.runInNewContext` harness で動作テストできる。

## 6. この設計で扱わないこと

- `AppConfiguration` の旧ユーザー名（`/Users/arata/...`）問題 — **別起票**。
  実害はあるが、これは設定の行き違いであってP0-4の主題ではない。
  ただし**「動かないから安全」と数えてはいけない**ので、ここに記録だけ残す。
- P1の残り7項目
- 実機QA

# 舞台スケッチ P0-4 層3: 共通ロックとrevision競合検出 発注書

- 起票日: 2026-08-22
- 起票: Claude（仕様確定）／実装: Codex／検証: Claude
- 設計書: `docs/MAC_BRIDGE_P0_4_DESIGN_2026-08-22.md`（**先に読むこと**）
- 先行作業: `docs/MAC_BRIDGE_ORIGIN_WORKORDER_2026-08-22.md`（層1・層2）が**完了している前提**
- 本人判断: 2026-08-22 に「revision不一致なら**中止して読み直しを促す**」で取得済み

この発注書は単体で読めるように書いている。

## 何を直すか

`StageSketchProjectStore.writeProject` は、正本が他所で進んでいても**無条件に上書きする**。

- **ロックを取らない。** MCP（Node）側は `locks/<projectId>.lock` を取るが、Swiftは取らない。
  両者が同時に走ると lost update が起きる（ファイル自体は atomic なので壊れはしない）。
- **`expectedRevision` を受け取らない。** 既存revisionを読んで無条件に `+1` する。

MCP側（`mcp-server/src/project-store.js`）には必要な規律が**既にある**。Swiftをそこへ合わせる。

## Claudeが調べて確定させた事実（そのまま使ってよい）

- **ブラウザは今、revisionを一切持っていない。** `stage-sketch.js` に `mcpMeta` は1回も出てこない。
  `writeProject` の戻り値 `{projectId, revision}` はプロンプト生成に使うだけで捨てている。
- **AI編集の入口** は `stage-sketch.js:16591` 付近。ここで
  `{ kind: "shosai-stage-sketch", version: 3, project: projectIoClone(state.project) }` を組み、
  `STAGE_AI_PANEL_MODEL.requestPlan(bridge, currentDocument, ...)`（739行）へ渡す。
  `requestPlan` の中で `await bridge.writeProject(document)` を呼ぶ（744行）。
- **編集結果がブラウザへ戻る経路は既にある。** MCPの `prepareImport` が
  `<title>-<version>-r<revision>.json` を exports へ書き、`ExportMonitor` が検知して
  `notifyEditAvailable` でブラウザへ通知、`readExport(name)` → 読み込み確認モーダル、という流れ。
  **`editSummary` に `baseRevision` / `appliedRevision` が入っている**
  （`stage-sketch.js:494-495` で既に読んでおり、16315行付近で表示している）。
  → **「読み直してください」には実際の導線がある。**
- `makeProjectExportDocument` は `version: 4` を返すが、AI編集は別途 `version: 3` を組んでいる。
  **ここは既に整合している。触らないこと。**
- `normalizeState()` は既知フィールドから状態を組み直す。**未知の最上位キーは落ちる。**
- `snapshot()` は `JSON.stringify(state)` なので、`state` に持たせたものは保存される。

## やること

---

### 3-1. Swiftも同じロックを取る

対象: `mac-app/Sources/StageSketchProjectStore.swift`

`writeProject` の **読み取り〜退避〜書き込みの全体**を、
`locks/<projectId>.lock` の排他保持下で行う。

**Node側の実装（`mcp-server/src/project-store.js` の `withProjectLock`、316〜337行）を
先に読み、作法を完全に一致させること。** 要点:

- ロック置き場は `<dataRoot>/locks/`。ファイル名は `<projectId>.lock`。
- 取得は**排他作成**（Nodeは `open(lockPath, "wx")`。Swiftなら
  `open(path, O_CREAT | O_EXCL | O_WRONLY, 0o644)` 相当）。
- 中身に `<pid> <ISO8601>\n` を書く（Nodeと同じ）。
- **すぐには諦めず、Nodeと同じく最大4秒・50ms間隔で再試行する。**
  （設計書には「待たずにエラー」と書いたが、**Nodeに合わせる方へ変更した。**
  理由: AI実行の開始時に1回呼ぶだけなので4秒待っても体感を損なわず、
  片方だけ待たない実装にすると、正常な同時実行でも不必要に失敗するため。）
- 4秒で取れなければエラーを返す。文言はNode側と揃える:
  「別のCodexまたはClaude Codeがこの下書きを編集中です。数秒後に読み直してください。」
- **必ず後始末する。** 成功・失敗・例外のいずれでも、ハンドルを閉じてファイルを消す
  （Swiftなら `defer`）。Nodeは `finally` で `close` → `unlink`。
- `locks/` ディレクトリが無ければ作る。既存の `ensureDirectory` / `assertSafeDirectory` の
  パス安全検査を通すこと（**`safeJSONFileURL` は `.json` 限定なので `.lock` には使えない。
  `.lock` 用の同等の検査を書くか、既存を一般化すること。どちらにしたか報告する。**）

---

### 3-2. `expectedRevision` を受け取って競合を検出する

#### Swift側

`writeProject` の入力を `{ document, expectedRevision }` にする。
`StageSketchBridge` の注入スクリプト `writeProject(document)` も
`writeProject(document, expectedRevision)` へ拡張する（**引数追加のみ。既存の型検査は残す**）。

判定（ロック保持下で行う）:

| 正本ファイル | `expectedRevision` | 動き |
|---|---|---|
| 無い（新規） | 何でも | 従来どおり作成（revision 1） |
| ある | 現在のrevisionと一致 | 従来どおり書く（revision+1） |
| ある | 不一致 | **書かずに競合を返す** |
| ある | `null` / 未指定 | **書かずに競合を返す**（下記「初回の扱い」） |

競合の返し方は**例外ではなく戻り値**にする。ブラウザが「失敗」と「競合」を区別する必要があるため。

```swift
return [
    "projectId": projectID,
    "conflict": true,
    "currentRevision": currentRevision
]
```

成功時は従来どおり `["projectId": ..., "revision": ...]`（`conflict` キーを付けない）。

#### 初回の扱い（`expectedRevision` が `null`）

既存ショーはどれもrevisionを持っていないので、**このままでは全ショーで初回に必ず競合になる。**
そこで `{ document, expectedRevision: null, allowFirstSync: true }` を受け付ける。

- `allowFirstSync` が `true` のときだけ、`expectedRevision` が `null` でも書いてよい。
- ブラウザは、`null` で競合が返ったら**利用者に一度だけ確認を出し**、
  OKなら `allowFirstSync: true` で再送する。
- **`allowFirstSync` は `expectedRevision` が `null` のときだけ有効。**
  不一致（数値が食い違う）ときは `allowFirstSync` があっても**必ず競合を返す**こと。
  ここを緩めると本作業の意味が無くなる。

#### ブラウザ側

**`mcpRevision` は `state.project` ではなく `state` 直下に持つこと。**
`state.project` に入れると `projectIoClone(state.project)` 経由で正本の `project` に紛れ込み、
MCPの `validateDocument` に弾かれる恐れがある。`makeProjectExportDocument` も
`project` しか見ないので、`state` 直下なら書き出しJSONにも漏れない。

1. `baseState()` に `mcpRevision: null` を足す。
2. `normalizeState()` で `raw.mcpRevision` を引き継ぐ
   （整数かつ1以上のときだけ採用。それ以外は `null`）。**ここを忘れると保存から消える。**
3. `bridge.writeProject(document, state.mcpRevision)` の形で送る（`requestPlan` 内、744行付近）。
4. 戻り値に `conflict === true` があれば、**AI実行へ進まずに中止**する。
   - `currentRevision` が数値で、`state.mcpRevision` も数値だった（＝真の不一致）→
     確認を出さず中止し、次の案内を出す:
     - 日本語: `正本がこの端末より新しくなっています（端末: r{mine} / 正本: r{current}）。AIに渡す前に、最新の編集結果を読み込み直してください。`
     - 英語: `The canonical project is newer than this device (device r{mine}, canonical r{current}). Load the latest edit result before running the AI.`
   - `state.mcpRevision` が `null` だった（＝この端末はまだ正本を読んでいない）→
     **一度だけ確認を出す**:
     - 日本語: `この端末は、このショーの正本をまだ読み込んでいません。いまの内容で正本を置き換えて、AI編集を始めますか？（置き換える前の版は履歴に残ります）`
     - 英語: `This device has not loaded the canonical copy of this show yet. Replace it with what you have now and start the AI edit? The previous version is kept in history.`
     - OKなら `allowFirstSync: true` を付けて**1回だけ**再送する。キャンセルなら中止。
5. `writeProject` が成功したら `state.mcpRevision = Number(written.revision)` を代入し、
   `persistSoon()` で保存されるようにする。
6. AI編集結果を読み込むとき、`editSummary.appliedRevision` が整数なら
   `state.mcpRevision` をその値にする。取り込み確定の箇所（16315行付近で
   `editDetails.appliedRevision` を既に読んでいる）に合わせて入れること。
   **`editSummary` の無い通常のファイル読み込みでは触らない**（正本と無関係なため、
   `null` のままにする。別ショーとして開く経路では特に注意）。

---

## テスト

### Swift（`SelfTestRunner.swift` に追加。既存19件の書式に完全に合わせる）

**最低この4件**。

1. **不一致は書かない** — 正本を作り、`expectedRevision` を1つずらして `writeProject` →
   `conflict: true` と `currentRevision` が返り、**正本ファイルの中身が1バイトも変わっていない**。
2. **一致すれば書ける** — 正しい `expectedRevision` で revision が `+1` される。
3. **`null` は既定で競合、`allowFirstSync` で通る** — かつ
   **不一致 + `allowFirstSync: true` は競合のまま**（★ここを必ず入れる）。
4. **ロックの後始末** — `writeProject` の成功後・失敗後の**どちらでも**
   `locks/<projectId>.lock` が残っていない。

可能なら足す（書けなければ理由を報告）:

5. **同時実行で lost update が起きない** — ロックファイルを先に作っておいて
   `writeProject` を呼び、4秒で競合エラーになること（Nodeを実際に起動する必要はない）。

### ブラウザ（`tests/` に追加。既存の `vm.runInNewContext` harness を使う）

**最低この3件**。

1. `normalizeState` が `mcpRevision` を保持する（整数は残り、文字列や0や負数は `null` になる）。
2. `makeProjectExportDocument` の出力に `mcpRevision` が**含まれない**
   （`state` 直下に置いた狙いが守られていることの確認）。
3. `projectIoClone(state.project)` の結果に `mcpRevision` が**含まれない**。

`requestPlan` の競合分岐まで動作テストできるなら書く。既存の
`tests/stage-session-shelve.test.mjs` が実物のbridgeを差し替えて動かしているので、
同じ手が使えるか検討すること。**書けなければ理由を報告する。**

**通っているように見えて何も検査していないテストを書かないこと。**

## 版番号とキャッシュ

`stage-sketch.js` を変更するので上げる。着手時点の値を `index.html` で確認してから `+1`
（層1・層2の完了時点では `stage-sketch.js?v=286` / CACHE `v131`）。

- `stage-sketch.js?v=<現在値>` → `+1`（`index.html` と **`stage.html` の両方**）
- `stage-sw.js` の `stage-sketch-pwa-v<現在値>` → `+1`
- `tests/stage-venue-library.test.mjs` の版番号照合の期待値も更新する
- **`stage.html` は手で直さず、`index.html` を直してから `python3 build_stage.py` で再生成**し、
  `python3 build_stage.py --check` が通ることを確認する

## 完了条件

- [ ] `bash mac-app/build.sh` が成功（約4分かかる。待つこと）
- [ ] セルフテストが全通過・終了コード0（既存19件＋追加分）:
      `"mac-app/build/制作の書斎.app/Contents/MacOS/ShosaiDesk" --self-test -WebRootPath "$(pwd)" -AgentCommand "$(command -v codex)"`
- [ ] `node --test tests/*.test.mjs` が全通過（現在440件。追加分だけ増えていること）
- [ ] `mcp-server` 側のテストが全通過
- [ ] `python3 build_stage.py --check` が成功
- [ ] `node --check stage-sketch.js` が成功
- [ ] `git diff --check` が成功
- [ ] `git status --short` に、この発注書で触ると書いていないファイルの**新たな**変更が無い

## 報告に必ず含めること

- 変更したファイルと行数
- `.lock` のパス安全検査を、新規に書いたか既存を一般化したか
- 追加したテストの件数と、各項目が何を検査しているか
- **不一致 + `allowFirstSync: true` が競合のままであることを、どのテストで確認したか**
- ロック取得の再試行間隔・上限が、Node側と実際に一致しているか（数値を書く）
- 動作テストを書けなかった項目と、その理由
- 判断に迷って別解にした箇所と、その理由
- **commitはしていないこと**

## やらないこと（この作業の境界）

- commit・push・deploy
- MCP（Node）側の変更 — **Nodeは既に正しい。Swiftをそちらへ合わせる作業である。**
- 競合時に3択を出すこと（本人判断は「中止して読み直しを促す」。UIを増やさない）
- `AppConfiguration` の旧ユーザー名 `/Users/arata/...` 問題 — 別起票
- `makeProjectExportDocument` の `version: 4` を変えること
- P1の残り7項目
- `build_db.py` / `db.js` / `build_stage_shows_local.py` /
  `tests/stage-local-shows.test.mjs`（別作業の未commit変更。触らない）
- `poseExtent` の変更（許可リスト運用の基準。絶対に触らない）

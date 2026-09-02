# 発注書R: リリース前レビューの軽微2件の修正＋版上げ（2026-09-02）

発注 Claude → 実装 Codex → 検証 Claude。根拠は `docs/RELEASE_CHECK_2026-09-02.html` 2-1・2-2。
パスはすべて `shosai-app/` 起点。**指定したファイル以外は触らない。`mcp-server/` は別作業中なので絶対に触らない。**

## 1. スマホ読込後の表示面（stage-sketch.js 約17294行）

現状（`phoneViewerActive` の分岐）:
```js
if (phoneViewerActive) {
  if (next.mcpRevision === null) reserveImportedShowId(next);
  if (!applyLoadedState(next, `「${next.project.title}」を読み込み、ショー一覧へ保存しました。`)) return;
  if (phoneUi) phoneUi.singleView = "front";
  return;
}
```
問題: `applyLoadedState` 内の `render()` が冒頭で `enforcePhoneViews()` を呼び `phoneUi.singleView` を反映するため、
代入が描画の後では横向きスマホの表示面が前のまま残る。

直し方: 代入を `applyLoadedState` の**前**へ戻す。失敗時は元の値へ戻す。
```js
if (phoneViewerActive) {
  if (next.mcpRevision === null) reserveImportedShowId(next);
  const previousSingleView = phoneUi ? phoneUi.singleView : null;
  if (phoneUi) phoneUi.singleView = "front";
  if (!applyLoadedState(next, `「${next.project.title}」を読み込み、ショー一覧へ保存しました。`)) {
    if (phoneUi) phoneUi.singleView = previousSingleView;
    return;
  }
  return;
}
```

## 2. ホストの未応答ドキュメント台帳の後始末（stage-session.js）

`pendingHostDocuments`（Map）は `doc-saved` 受信時にしか消えない。以下の2か所で消す。

- `handleSocketClose(ws)` 内、`hostSendTimer = null;` の直後に `pendingHostDocuments.clear();`
  （再接続時は `sendHostDocument(true)` で全文を送り直すので、古い台帳は不要）
- `handleSocketMessage` の `message.t === "denied"` 分岐で、
  `message.reason === "doc-too-large" || message.reason === "doc-storage-failed"` のとき
  `pendingHostDocuments.clear();`（拒否された文書が「送信済み」扱いで再送を抑止しないように）

## 3. 版上げ（3枚＋テスト。必ず一組で）

- `index.html`: `stage-sketch.js?v=315`→`?v=316`、`stage-session.js?v=13`→`?v=14`
- `stage-sw.js`: 同じ2件の書き換え ＋ `CACHE_NAME = "stage-sketch-pwa-v190"`→`"stage-sketch-pwa-v191"`
- `python3 build_stage.py` を実行して `stage.html` を作り直す（手で編集しない）
- テストの版ピン: `tests/stage-manual-help.test.mjs`（127行付近の `?v=315`、134行付近の `v190`）、
  `tests/stage-session-shelve.test.mjs`（43行付近の `?v=315` と `?v=13`、49行付近の `v190`）を新しい値へ

## 4. 回帰テスト（既存の流儀に合わせる。無理に大きな仕組みを作らない）

- `tests/stage-session-shelve.test.mjs` か `tests/stage-session-polish.test.mjs` の既存のソケット模擬に倣い、
  「ホストが doc を送った後にソケットが close すると台帳が空になる」または
  「denied(doc-storage-failed) の後、同じ内容の doc がもう一度送れる」のどちらか1件を追加。
  既存テストがソースの文字列照合しかしていない場合は、同じ流儀で `pendingHostDocuments.clear()` の存在を
  `handleSocketClose` 内で照合する形でもよい。
- 1.（スマホ表示面）は、既存の `tests/stage-phone-viewer.test.mjs` の流儀でソース順序の照合
  （`phoneUi.singleView = "front"` が `applyLoadedState(next` より前にあること）を1件追加。

## 完了条件

- `cd tests && node index.mjs` が全件 pass（現在699件。追加分を含めて fail 0）
- `python3 build_stage.py --check` が終了コード0
- `git status --short` に出る変更が `index.html stage.html stage-sw.js stage-sketch.js stage-session.js tests/*.mjs docs/WORKORDER_R_*.md` 以外に無い
- commit はしない（Claudeが検証後に行う）

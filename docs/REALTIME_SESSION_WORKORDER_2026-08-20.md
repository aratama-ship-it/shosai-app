# 発注書: リアルタイム共有セッション（ZOOM会議用）B0+B1

- 日付: 2026-08-20
- 発注: Claude（仕様確定済み。設計書 `../REALTIME_SESSION_DESIGN.md`）／実装: Codex／検証: Claude
- **削除・移動・リネームは行わない。既存ファイルは編集前に必ず読み直すこと（iCloud共有ワークスペース）。**
- バックアップ作成済み（Codexは作らなくてよい）:
  `stage-sketch_backup_2026-08-20-before-session.js` / `index_backup_2026-08-20-before-session.html` /
  `worker_backup_2026-08-20-before-session.js` / `wrangler_backup_2026-08-20-before-session.toml` /
  `stage-sw_backup_2026-08-20-before-session.js` / `style_backup_2026-08-20-before-session.css`
- 外部ライブラリ・CDN・SDKは一切使わない（このアプリの既存制約）。素のJSのみ。

## 全体像

ホスト1人＋ゲスト最大19人が同じ舞台スケッチをリアルタイムで見る。
Cloudflare Durable Object（1ルーム=1インスタンス）がWebSocketで中継する。

- ホスト: 全機能。変更のたびプロジェクト全文（doc）を送り、DOが全ゲストへ配る。
- ゲスト: 閲覧＋限定操作のみ。**新規矢印**と**駒（演者・道具）の移動**を差分opとして
  ホストへ送り、ホストが自分の状態へ適用 → 保存 → doc再配信で全員が揃う（ホストが正）。
- 全員: レーザーポインタ（名前・色つきの点）を送り合える。
- セッションは揮発。保存は従来どおりホストのlocalStorage/ファイル。サーバに恒久データなし。

メッセージはすべてJSON文字列。プロトコル:

```
クライアント→サーバ
  {t:"doc",  doc:"<JSON文字列>"}                     ホストのみ。全文スナップショット
  {t:"op",   op:{kind:"piece.move",  sceneId, pieceId, u, v, base}}   ゲスト→ホストへ中継
  {t:"op",   op:{kind:"arrows.add",  sceneId, arrows:[<矢印生オブジェクト>]}}  同上
  {t:"pointer", view:"<文字列>", x:0..1, y:0..1, on:true|false}       全員。他全員へ中継
サーバ→クライアント
  {t:"welcome", clientId, role, color, participants:[{clientId,name,role,color}], doc:<文字列|null>}
  {t:"doc", doc}                                     ゲストへ（ホスト本人には返さない）
  {t:"op", op, from:{clientId,name,color}}           ホストへのみ
  {t:"pointer", view,x,y,on, from:{clientId,name,color}}  送信者以外の全員へ
  {t:"presence", participants:[...]}                 入退室のたび全員へ
  {t:"denied", reason}                               許可外op等
  {t:"full"} / {t:"bad-key"}                         接続拒否の直前に送って閉じる
```

---

## 作業1: サーバ側（wrangler.toml / worker.js / session-room.js 新規）

### 1-1. `wrangler.toml`

既存内容は変えず、末尾に追加:

```toml
[durable_objects]
bindings = [
  { name = "SESSION_ROOM", class_name = "SessionRoom" }
]

[[migrations]]
tag = "v1-session-room"
new_sqlite_classes = ["SessionRoom"]
```

### 1-2. `session-room.js`（新規・ES module）

`export class SessionRoom` を実装。**WebSocket Hibernation API を使う**
（`this.ctx.acceptWebSocket(ws)` + クラスの `webSocketMessage/webSocketClose/webSocketError`
ハンドラ。in-memory Mapで接続管理しない。接続ごとの属性は
`ws.serializeAttachment({clientId, role, name, color})` に持たせる）。

- `fetch(request)` のルーティング（Workerから転送される。パスはWorker側で
  `/session/<roomId>` を剥がして `/new` `/ws` だけ渡す形にしてよい。実装しやすい方で）:
  - `POST /new`: `hostKey`（`crypto.randomUUID()`）を生成し
    `this.ctx.storage.put("hostKey", ...)`。`{ok:true}` を返す
    （roomId自体はWorker側で発行するため、ここでは初期化だけ）。
  - `GET /ws?role=host&key=...&name=...` / `GET /ws?role=guest&name=...`:
    WebSocketアップグレード。
    - role=host は key が storage の hostKey と一致しなければ 403（`{t:"bad-key"}`）。
    - 接続数が20に達していたら `{t:"full"}` を送って閉じる
      （`this.ctx.getWebSockets().length` で数える）。
    - clientId は `crypto.randomUUID()`、色は固定パレット
      `["#d3ac59","#7fb3d5","#c39bd3","#7dcea0","#f1948a","#85c1e9","#f8c471","#a3e4d7"]`
      から参加順に巡回で割り当て。
    - name は50文字に切り詰め、制御文字を除去。
    - 接続後 `{t:"welcome", ...}` を送る。doc は `storage.get("doc")`（無ければnull）。
    - 全員へ `{t:"presence"}`。
- `webSocketMessage(ws, message)`:
  - 文字列以外・8MB超は無視。JSONパース失敗は無視。
  - `t:"doc"`: **roleがhostのときだけ**受理。`storage.put("doc", doc)` し、
    ホスト以外の全接続へ転送。ゲストから来たら `{t:"denied"}`。
  - `t:"op"`: **roleがguestのときだけ**意味を持つ。`op.kind` が
    `"piece.move"` / `"arrows.add"` 以外なら `{t:"denied"}`。
    64KB超は `{t:"denied"}`。妥当なら **ホスト接続へのみ** `from` を付けて転送
    （ホスト不在中は捨ててよい。`{t:"denied", reason:"no-host"}` を返す）。
  - `t:"pointer"`: view/x/y/on を数値・文字列検証し、送信者以外の全員へ `from` 付きで転送。
    storageには書かない。
- `webSocketClose/webSocketError`: 接続が0になったら
  `this.ctx.storage.setAlarm(Date.now() + 10*60*1000)`。
  `alarm()` で接続0のままなら `this.ctx.storage.deleteAll()`。
  新規接続時は `deleteAlarm()`。

### 1-3. `worker.js`

- 先頭で `import { SessionRoom } from "./session-room.js";` し、
  `export { SessionRoom };` を追加（DOクラスはmainモジュールからexport必須）。
- Basic認証チェックを**通過した後**に、`url.pathname` が `/session/` で始まる場合の
  分岐を追加（`env.ASSETS.fetch` より前）:
  - `POST /session/new`: roomId を生成
    （`crypto.getRandomValues` から英数小文字8文字。紛らわしい l/1/o/0 は除く）。
    hostKey を `crypto.randomUUID()` で生成し、DOへ `POST /new` を転送して初期化
    …ではなく、**hostKeyはDO側で生成するため**、正しくは:
    `env.SESSION_ROOM.idFromName(roomId)` → `stub.fetch("https://do/new", {method:"POST"})`
    のレスポンスに hostKey を含めて返させ、Workerは
    `{roomId, hostKey}` をJSONで返す（DOの `/new` レスポンスを
    `{ok:true, hostKey}` に変更して整合させること）。
  - `GET /session/<roomId>/ws`: `idFromName(roomId)` のstubへ、クエリを保ったまま
    `stub.fetch` で転送（Upgradeヘッダごと）。
  - それ以外の `/session/*` は404。
- WebSocketのBasic認証: ブラウザの `new WebSocket()` はAuthorizationヘッダを付けられないが、
  **同一オリジンでBasic認証済みならブラウザが自動で付ける**ので追加対応不要。
  ただし認証ヘッダが無いWS接続が来た場合も既存ロジックどおり401になることを確認。

### 作業1の完了条件

- `node --check session-room.js && node --check worker.js` が通る
  （ESM構文のため `node --input-type=module --check` 相当が必要なら
  `node --experimental-default-type=module` 等は使わず、
  `npx wrangler deploy --dry-run --outdir /tmp/wrangler-dry` で構文検証してよい）。
- `npx wrangler dev --port 8788` がエラーなく起動する（起動確認だけして止めてよい）。

---

## 作業2: クライアント側（stage-sketch.js / stage-session.js 新規 / index.html / style.css / stage-sw.js）

### 2-1. `stage-sketch.js` への追加（**3箇所だけ。他は触らない**）

(a) `persistSoon()`（4346行付近）の `setTimeout` 内、保存試行の後に1行:

```js
try { if (window.SHOSAI_STAGE_SESSION_HOOKS?.onLocalChange) window.SHOSAI_STAGE_SESSION_HOOKS.onLocalChange(); } catch (_) { /* セッション未使用なら何もしない */ }
```

(b) `normalizeArrow()`（3110行付近）の return オブジェクトに1行追加して
ゲスト注釈タグを保持する:

```js
...(raw && raw.guest === true ? { guest: true } : {}),
```

(c) IIFEの末尾（`window.SHOSAI_STAGE_PROJECT_IO` を定義している465行付近と同様の場所）に
セッション用ブリッジを追加。stage-session.js はこのブリッジ**だけ**を使い、
stateやrenderへ直接触らない:

```js
window.SHOSAI_STAGE_SESSION_BRIDGE = Object.freeze({
  exportDocumentString() {
    return JSON.stringify(makeProjectExportDocument(state.project, true));
  },
  applyDocumentString(text) {
    /* 受信docを現在のプロジェクトとして開く。壊れたJSONはfalseを返して何もしない */
    let doc; try { doc = JSON.parse(text); } catch (_) { return false; }
    if (!doc || doc.kind !== "shosai-stage-sketch" || !doc.project) return false;
    const { project } = prepareProjectImportDocument(doc);
    state.project = project;
    selectedId = null;
    renderScenes(); renderVenueControls(); updateInspector(); render();
    persistSoon();
    return true;
  },
  shelveNow() { shelveCurrent(); },
  applyGuestOp(op) {
    /* ホスト側でゲストopを状態へ適用。適用したらtrue */
    if (!op || typeof op !== "object") return false;
    const scene = state.project.scenes.find((s) => s.id === op.sceneId);
    if (!scene) return false;
    if (op.kind === "piece.move") {
      const piece = (scene.pieces || []).find((p) => p.id === op.pieceId);
      if (!piece) return false;
      checkpoint();
      piece.u = clamp(finite(op.u, piece.u), -0.5, 1.5);
      piece.v = clamp(finite(op.v, piece.v), -0.5, 1);
      if (op.base !== undefined) piece.base = Math.max(0, finite(op.base, piece.base || 0));
      render(); persistSoon();
      return true;
    }
    if (op.kind === "arrows.add") {
      if (!Array.isArray(op.arrows) || op.arrows.length === 0 || op.arrows.length > 20) return false;
      checkpoint();
      op.arrows.forEach((raw) => scene.arrows.push(normalizeArrow({ ...raw, guest: true })));
      render(); persistSoon();
      return true;
    }
    return false;
  },
  clearGuestArrows() {
    checkpoint();
    state.project.scenes.forEach((scene) => {
      scene.arrows = (scene.arrows || []).filter((arrow) => arrow.guest !== true);
    });
    render(); persistSoon();
  },
  isEnglish() { return isEn(); },
});
```

※上記スニペット内の `clamp/finite/checkpoint/render/persistSoon/shelveCurrent/
normalizeArrow/renderScenes/renderVenueControls/updateInspector/selectedId/state` は
すべてIIFE内の既存識別子。**実際の識別子名はファイルを読んで確認し、違えば合わせる。**

### 2-2. `stage-session.js`（新規）

他のstage-*.jsと同じ形式（IIFE、strict、外部依存なし）。責務:

- 起動時: `window.SHOSAI_STAGE_SESSION_BRIDGE` が無ければ何もしない。
  `location.hash` が `#session=<roomId>` ならゲスト参加フローを開始。
- **ホストフロー**: セッションパネル（2-3）の「セッションを開始」ボタン →
  `fetch("session/new", {method:"POST"})` → `{roomId, hostKey}` →
  `new WebSocket(wsUrl)`（`location.protocol==="https:"?"wss":"ws"` + 同一ホスト +
  `session/<roomId>/ws?role=host&key=...&name=...`）→
  接続後すぐ `{t:"doc", doc: bridge.exportDocumentString()}` を送る。
  招待URL `location.origin + location.pathname + "#session=" + roomId` を表示し
  「コピー」ボタン（`navigator.clipboard.writeText`、失敗時はテキスト選択にフォールバック）。
  ホスト名はlocalStorage `shosai-session-name` に記憶（既定「ホスト」）。
- **ゲストフロー**: 名前入力の小モーダル（既存の `stage-modal` / `stage-modal-backdrop`
  クラスを流用）→ 参加前に `bridge.shelveNow()` で自分の作業を退避 →
  WS接続（role=guest）→ `welcome.doc` があれば `bridge.applyDocumentString(doc)`。
  以後 `{t:"doc"}` 受信のたび適用。**適用中フラグ**を立て、適用が引き起こす
  persistSoonフックからのop送信を抑止する。
- **ホストの変更配信**: `window.SHOSAI_STAGE_SESSION_HOOKS = { onLocalChange }` を定義。
  ホスト接続中のonLocalChangeは300msデバウンスで `{t:"doc", doc: export...()}` を送る。
  直前に送ったdocと同一文字列なら送らない。
- **ゲストの差分検出**: ゲスト接続中のonLocalChangeでは、最後に受信・適用したdoc
  （パース済みを保持）と現在の `bridge.exportDocumentString()` を比較し:
  - 各シーンで、受信時に無かった `id` の矢印 → `{kind:"arrows.add", sceneId, arrows:[...]}`
  - 各シーンで、`u/v/base` のいずれかが変わった駒 → 駒ごとに
    `{kind:"piece.move", sceneId, pieceId, u, v, base}`
  を送る。送ったopの内容は「送信済み」として記録し、同じ内容を再送しない。
  それ以外の差分は送らない（次のホストdocで上書きされる。仕様どおり）。
- **レーザーポインタ**: 舞台キャンバス要素（トップビューのcanvas。idはindex.htmlを読んで
  特定する）上の `pointermove` を100msスロットルで
  `{t:"pointer", view:"top", x, y, on:true}`（要素境界ボックスで0..1に正規化）。
  `pointerleave` で `on:false`。受信側はキャンバスの親（`position:relative` を保証）に
  絶対配置の点（12px円＋名前ラベル、fromのcolor）を重ねる。3秒更新が無い点は消す。
  ビューが違う参加者のポインタは表示しない（v1はtopビューのみで可）。
- **参加者リスト**: presence受信でパネル内に名前＋役割＋色を列挙。
- **ホストのop受信**: `{t:"op"}` を `bridge.applyGuestOp(op)` へ。falseなら無視。
- **切断・再接続**: `close` イベントで3秒後に自動再接続（最大5回、以後は
  「切断しました。再接続」ボタン）。ホストは再接続後にdocを送り直す。
- **ゲストの制限表示**: ゲスト接続中は `document.body.classList.add("stage-session-guest")`
  し、パネルに常時「ゲスト参加中: 演者・道具の移動と矢印だけが全員へ共有されます。
  他の編集は次の更新で元に戻ります」を表示。
- 文言は日本語でよい（英訳はv2で対応。`bridge.isEnglish()` は将来用に呼び出し口だけ使う）。

### 2-3. `index.html`

- 舞台タブの保存欄（`id="stage-save-status"` を含むブロック。実物を読んで特定）の近くに
  `<details>` で「リアルタイム共有（会議用）」セクションを追加:
  開始ボタン／招待URL表示＋コピー／参加者リスト／状態表示／
  ホスト専用「ゲスト注釈を一括消去」ボタン（`bridge.clearGuestArrows()`）。
  idはすべて `stage-session-` 接頭辞。
- `<script src="stage-session.js?v=1"></script>` を `stage-sketch.js` の**後**に追加。
- `stage-sketch.js` の `?v=265` → `?v=266` に上げる。
- style.cssを変えたら `?v=180` → `?v=181` に上げる。

### 2-4. `style.css`

- セッションパネル・参加者リスト・ポインタ点（`.stage-session-pointer`）の最小限のスタイル。
  既存のパネル/ボタンのクラス（`stage-minor-action` 等）を最大限流用し、新規定義は控えめに。
- `.stage-session-guest` では以下を `display:none` にする（最小限の目隠し。
  本丸の防御はサーバ側whitelist）: シーン追加/削除ボタン、機構パネルの編集列、
  「この部屋を作る」ボタン、保存欄の書き出しボタン群、セッション開始ボタン。
  ※各idはindex.htmlを読んで特定する。見つからないものはスキップして、
  スキップした旨を最後に報告する。

### 2-5. `stage-sw.js`

- `CACHE_NAME` を `stage-sketch-pwa-v99` → `stage-sketch-pwa-v100`。
- `APP_SHELL` に `"./stage-session.js?v=1"` を追加し、
  `"./stage-sketch.js?v=265"` → `?v=266`（style.cssを変えたら `?v=181` も反映）。

### 2-6. ビルド

`python3 build_stage.py` を実行して `stage.html` を再生成する（stage.htmlを手で編集しない）。

### 作業2の完了条件

- `node --check stage-session.js` が通る（stage-sketch.jsは既存どおりブラウザ用。
  構文確認は `node --check stage-sketch.js` が従来から通る形式なので同様に通ること）。
- `python3 build_stage.py` が成功し、`stage.html` に `stage-session.js?v=1` が含まれる。
- `grep -c "SHOSAI_STAGE_SESSION_BRIDGE" stage-sketch.js` が1以上。
- 触ってよいファイルは本発注書に列挙したもののみ。それ以外に差分を作らない。

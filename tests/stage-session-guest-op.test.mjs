// 共有セッションで、他人の矢印の取り込みが「自分の編集」と誤認されないことと、
// 旧キャッシュ由来の piece.move をクライアントが採用しないことを守る（2026-08-25）。
//
// 実機3人で発覚した不具合:
//   ゲストの操作をホストが取り込むとき applyingRemoteDocument を立てていなかった。
//   applyGuestOp は persistSoon() を呼び、その180ms後に onLocalChange() が発火する。
//   結果ホストは他人の操作を自分の編集と誤認し、
//     ①「いま操作中: ホスト」を全員へ配り（ホストは何も触っていないのに）
//     ②全文書を配り直して、まだ動かしている送信元ゲストの位置を巻き戻した。
//   → 「常にホストが操作中となり、自分の操作が反映されずリセットされ続ける」
//
// 直し方の三本柱。どれが欠けても症状が戻る:
//   1. 取り込みはリモート由来として扱う（フラグを立てる）
//   2. サーバがopを送信者以外のゲストへも中継する（配り直しに頼らず伝える）
//   3. 落ち着いてから正本を配り直す（あとから参加する人のために保存も更新する）

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const sessionSource = await readFile(new URL("stage-session.js", root), "utf8");
const roomSource = await readFile(new URL("session-room.js", root), "utf8");

function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const sessionCode = withoutComments(sessionSource);
const roomCode = withoutComments(roomSource);

test("受け取ったopの取り込みはリモート由来として扱う", () => {
  const body = sessionCode.slice(
    sessionCode.indexOf("function applyIncomingOp"),
    sessionCode.indexOf("function applyOpToBaseline"),
  );
  assert.ok(body.length > 0, "applyIncomingOp が定義されていること");
  assert.match(body, /applyingRemoteDocument = true/, "フラグを立てること");
  assert.match(body, /bridge\.applyGuestOp\(op\)/);
  assert.match(body, /releaseRemoteApply\(generation\), 260/, "解放はpersistSoonの180msより後");
  assert.ok(
    body.indexOf("applyingRemoteDocument = true") < body.indexOf("bridge.applyGuestOp"),
    "適用より前にフラグを立てること",
  );
});

test("メッセージ処理から直接applyGuestOpを呼ばない", () => {
  /* ★ここが元の不具合。handleSocketMessage の中で素のまま呼ぶと抑制が掛からない。 */
  const handler = sessionCode.slice(
    sessionCode.indexOf("function handleSocketMessage"),
    sessionCode.indexOf("function scheduleReconnect"),
  );
  assert.ok(handler.length > 0, "handleSocketMessage が見つかること");
  assert.ok(
    !/bridge\.applyGuestOp/.test(handler),
    "受信処理から直接 applyGuestOp を呼ばない（applyIncomingOp を通すこと）",
  );
  assert.match(handler, /applyIncomingOp\(message\.op\)/);
});

test("ホストとゲストは許可された矢印opだけを受け取る", () => {
  const handler = sessionCode.slice(
    sessionCode.indexOf("function handleSocketMessage"),
    sessionCode.indexOf("function scheduleReconnect"),
  );
  assert.match(handler, /message\.t === "op" && role === "host"/);
  assert.match(handler, /message\.t === "op" && role === "guest"/,
    "他のゲストの操作も受け取れること（サーバが中継してくる）");
  assert.match(handler, /isShareableGuestOp\(message\.op\)/,
    "旧キャッシュのpiece.moveを両方の役割で落とすこと");
});

test("ゲストは矢印だけを差分の基準にも当てる", () => {
  /* 基準を据え置くと、次に自分が矢印を描いたとき他人の矢印まで
     「自分の変更」として送り直してしまう。 */
  const handler = sessionCode.slice(
    sessionCode.indexOf("function handleSocketMessage"),
    sessionCode.indexOf("function scheduleReconnect"),
  );
  const guestBranch = handler.slice(handler.indexOf('message.t === "op" && role === "guest"'));
  assert.match(guestBranch, /applyOpToBaseline\(message\.op\)/);

  const baseline = sessionCode.slice(
    sessionCode.indexOf("function applyOpToBaseline"),
    sessionCode.indexOf("const GUEST_SETTLE_RESYNC_MS"),
  );
  assert.match(baseline, /lastReceivedDocument/);
  assert.match(baseline, /arrows\.add/, "矢印の追加も基準へ反映すること");
  assert.doesNotMatch(baseline, /piece\.move/, "駒移動を基準へ取り込まないこと");
});

test("ホストは落ち着いてから正本を配り直す", () => {
  /* 即座に配り直すと送信元の操作を巻き戻す。まったく配らないと
     あとから参加した人が古い舞台を受け取る。だから「落ち着いたら」。 */
  const handler = sessionCode.slice(
    sessionCode.indexOf("function handleSocketMessage"),
    sessionCode.indexOf("function scheduleReconnect"),
  );
  /* opの分岐だけを切り出す。doc の分岐にも role === "guest" が出てくるので、
     素朴にindexOfすると別の場所を拾う（このテスト自身が最初それで落ちた）。 */
  const hostBranch = handler.slice(
    handler.indexOf('message.t === "op" && role === "host"'),
    handler.indexOf('message.t === "op" && role === "guest"'),
  );
  assert.match(hostBranch, /scheduleSettleResync\(\)/);

  const resync = sessionCode.slice(
    sessionCode.indexOf("const GUEST_SETTLE_RESYNC_MS"),
    sessionCode.indexOf("function applyRemoteDocument"),
  );
  assert.match(resync, /GUEST_SETTLE_RESYNC_MS = \d{4}/, "秒単位の待ちであること");
  assert.match(resync, /clearTimeout\(settleResyncTimer\)/, "操作が続く限り待ち直すこと");
  assert.match(resync, /role !== "host"/, "ホストだけが配り直すこと");
});

test("サーバはopを送信者以外のゲストへも中継する", () => {
  const opBranch = roomCode.slice(
    roomCode.indexOf('if (data.t === "op")'),
    roomCode.indexOf('if (data.t === "activity")'),
  );
  assert.ok(opBranch.length > 0, "opの分岐が見つかること");
  assert.match(opBranch, /for \(const host of hosts\) safeSend\(host, payload\)/,
    "ホストへは従来どおり送ること");
  assert.match(opBranch, /socket === ws \|\| !isOpen\(socket\)/, "送信者自身へは返さないこと");
  assert.match(opBranch, /target\.role === "guest"\) safeSend\(socket, payload\)/,
    "他のゲストへも中継すること");
});

test("サーバーの汎用中継は変更せず、opを送れる役割も今までどおりゲストだけ", () => {
  // クライアントで絞っても、旧キャッシュ互換のためサーバーは変更しない
  const opBranch = roomCode.slice(
    roomCode.indexOf('if (data.t === "op")'),
    roomCode.indexOf('if (data.t === "activity")'),
  );
  assert.match(opBranch, /attachment\.role !== "guest"/);
  assert.match(opBranch, /deny\(ws, "guest-only"\)/);
  // 種類とサイズの検査も残っていること
  assert.match(opBranch, /piece\.move.*arrows\.add|arrows\.add.*piece\.move/s);
  assert.match(opBranch, /MAX_OP_BYTES/);
});

test("docを配れるのは今もホストだけ", () => {
  const docBranch = roomCode.slice(
    roomCode.indexOf('if (data.t === "doc")'),
    roomCode.indexOf('if (data.t === "op")'),
  );
  assert.match(docBranch, /attachment\.role !== "host"/);
  assert.match(docBranch, /deny\(ws, "host-only"\)/);
});

test("共有docはDurable Objectの保存上限より前で拒否し、保存確認後だけ配る", () => {
  const docBranch = roomCode.slice(
    roomCode.indexOf('if (data.t === "doc")'),
    roomCode.indexOf('if (data.t === "op")'),
  );
  assert.match(roomCode, /const MAX_DOCUMENT_BYTES = 1800 \* 1024;/);
  assert.match(docBranch, /documentBytes > MAX_DOCUMENT_BYTES/);
  assert.match(docBranch, /deny\(ws, "doc-too-large"\)/);
  assert.match(docBranch, /try \{\s*await this\.ctx\.storage\.put\("doc", data\.doc\);\s*\} catch/);
  assert.match(docBranch, /deny\(ws, "doc-storage-failed"\)/);
  assert.match(docBranch, /t: "doc-saved"/);
  assert.ok(docBranch.indexOf('t: "doc-saved"') < docBranch.indexOf("for (const socket"),
    "保存確認を返してからゲストへ配ること");
});

test("ホストは保存確認が来るまで送信済みとして扱わず、大きすぎるdocを送らない", () => {
  const sender = sessionCode.slice(
    sessionCode.indexOf("function sendHostDocument"),
    sessionCode.indexOf("function scheduleHostDocument"),
  );
  const handler = sessionCode.slice(
    sessionCode.indexOf("function handleSocketMessage"),
    sessionCode.indexOf("function scheduleReconnect"),
  );
  assert.match(sessionCode, /const MAX_SESSION_DOCUMENT_BYTES = 1800 \* 1024;/);
  assert.match(sender, /const documentBytes = utf8ByteLength\(documentText\)/);
  assert.match(sender, /documentBytes > MAX_SESSION_DOCUMENT_BYTES/);
  assert.match(sender, /pendingHostDocuments\.set\(documentId, documentText\)/);
  assert.doesNotMatch(sender, /lastSentDocument = documentText/);
  assert.match(handler, /message\.t === "doc-saved" && role === "host"/);
  assert.match(handler, /lastSentDocument = pendingHostDocuments\.get\(documentId\)/);
});

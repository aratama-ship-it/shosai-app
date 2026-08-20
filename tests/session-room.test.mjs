// 舞台スケッチ セッションDO（session-room.js / worker.js）の通しテスト。
//
// ほかのテストと違い、ローカルの wrangler dev が必要:
//   1. プロジェクトを /tmp 等へ複製（iCloud上で直接devを走らせない）
//   2. npx wrangler dev --port 8788 --persist-to /tmp/wrangler-persist
//      （--persist-to をプロジェクト外にしないと無限リロードでWSが全滅する。
//        詳細は ../REALTIME_SESSION_DESIGN.md「ローカル検証の作法」）
// サーバーが起動していなければSKIPして正常終了する（tests/index.mjs を壊さない）。
const BASE = "http://localhost:8788";

async function serverIsUp() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(BASE + "/session/new", { method: "POST", signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch (_) {
    return false;
  }
}

if (!(await serverIsUp())) {
  console.log("SKIP  session-room: wrangler dev (localhost:8788) が起動していないため飛ばします");
} else {
  const results = [];
  const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); };

  const openWs = (url) => new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const msgs = [];
    ws.addEventListener("message", (e) => { msgs.push(JSON.parse(e.data)); });
    ws.addEventListener("open", () => resolve({ ws, msgs }));
    ws.addEventListener("error", (e) => reject(new Error("ws error " + (e.message || ""))));
  });
  const waitFor = (msgs, pred, ms = 4000) => new Promise((resolve) => {
    const t0 = Date.now();
    const timer = setInterval(() => {
      const hit = msgs.find(pred);
      if (hit || Date.now() - t0 > ms) { clearInterval(timer); resolve(hit || null); }
    }, 50);
  });

  const res = await fetch(BASE + "/session/new", { method: "POST" });
  const { roomId, hostKey } = await res.json();
  check("session/new", !!roomId && !!hostKey, roomId);

  const wsBase = BASE.replace("http", "ws") + `/session/${roomId}/ws`;

  // 1. 間違ったhostKeyは接続失敗（403）
  let badKeyRejected = false;
  try { await openWs(`${wsBase}?role=host&key=wrong&name=x`); } catch { badKeyRejected = true; }
  check("bad hostKey rejected", badKeyRejected);

  // 2. ホスト接続 → welcome
  const host = await openWs(`${wsBase}?role=host&key=${hostKey}&name=%E3%83%9B%E3%82%B9%E3%83%88`);
  const hostWelcome = await waitFor(host.msgs, (m) => m.t === "welcome");
  check("host welcome", !!hostWelcome && hostWelcome.role === "host" && hostWelcome.doc === null);

  // 3. ホストがdoc送信 → ゲスト参加時にwelcome.docで受け取る
  host.ws.send(JSON.stringify({ t: "doc", doc: JSON.stringify({ kind: "shosai-stage-sketch", version: 4, project: { id: "p1" } }) }));
  await new Promise((r) => setTimeout(r, 300));
  const guest = await openWs(`${wsBase}?role=guest&name=%E3%82%B2%E3%82%B9%E3%83%88A`);
  const guestWelcome = await waitFor(guest.msgs, (m) => m.t === "welcome");
  check("guest welcome carries doc", !!guestWelcome && typeof guestWelcome.doc === "string" && guestWelcome.doc.includes("p1"));

  // 4. presence: ホスト側に2人分届く
  const presence = await waitFor(host.msgs, (m) => m.t === "presence" && m.participants.length === 2);
  check("presence 2 participants", !!presence);

  // 5. ホストがdoc更新 → ゲストへ配信、ホスト自身には返らない
  const hostDocCountBefore = host.msgs.filter((m) => m.t === "doc").length;
  host.ws.send(JSON.stringify({ t: "doc", doc: JSON.stringify({ kind: "shosai-stage-sketch", version: 4, project: { id: "p2" } }) }));
  const guestDoc = await waitFor(guest.msgs, (m) => m.t === "doc" && m.doc.includes("p2"));
  check("doc relayed to guest", !!guestDoc);
  check("doc not echoed to host", host.msgs.filter((m) => m.t === "doc").length === hostDocCountBefore);

  // 6. ゲストの許可op → ホストへfrom付きで届く
  guest.ws.send(JSON.stringify({ t: "op", op: { kind: "piece.move", sceneId: "s1", pieceId: "pc1", u: 0.5, v: 0.5, base: 0 } }));
  const opMsg = await waitFor(host.msgs, (m) => m.t === "op");
  check("guest op relayed to host", !!opMsg && opMsg.op.kind === "piece.move" && opMsg.from && opMsg.from.name === "ゲストA");

  // 7. ゲストの許可外op → denied
  guest.ws.send(JSON.stringify({ t: "op", op: { kind: "scene.delete", sceneId: "s1" } }));
  const denied1 = await waitFor(guest.msgs, (m) => m.t === "denied" && m.reason === "invalid-op");
  check("guest invalid op denied", !!denied1);

  // 8. ゲストのdoc送信 → denied（host-only）
  guest.ws.send(JSON.stringify({ t: "doc", doc: "{}" }));
  const denied2 = await waitFor(guest.msgs, (m) => m.t === "denied" && m.reason === "host-only");
  check("guest doc denied", !!denied2);

  // 9. pointer: ゲスト→ホストへ届き、送信者へは返らない
  const guestPointerBefore = guest.msgs.filter((m) => m.t === "pointer").length;
  guest.ws.send(JSON.stringify({ t: "pointer", view: "top", x: 0.3, y: 0.7, on: true }));
  const ptr = await waitFor(host.msgs, (m) => m.t === "pointer");
  check("pointer relayed", !!ptr && ptr.x === 0.3 && !!ptr.from.color);
  check("pointer not echoed", guest.msgs.filter((m) => m.t === "pointer").length === guestPointerBefore);

  // 10. 範囲外pointerは黙って捨てる
  guest.ws.send(JSON.stringify({ t: "pointer", view: "top", x: 5, y: 0.5, on: true }));
  await new Promise((r) => setTimeout(r, 300));
  check("out-of-range pointer dropped", host.msgs.filter((m) => m.t === "pointer").length === 1);

  host.ws.close(); guest.ws.close();
  let pass = 0;
  for (const r of results) { console.log(`${r.ok ? "PASS" : "FAIL"}  session-room: ${r.name} ${r.detail}`); if (r.ok) pass++; }
  console.log(`session-room: ${pass}/${results.length} passed`);
  if (pass !== results.length) process.exitCode = 1;
}

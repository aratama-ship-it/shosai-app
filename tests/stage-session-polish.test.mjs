import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sessionSource = await readFile(new URL("stage-session.js", root), "utf8");
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const styleSource = await readFile(new URL("style.css", root), "utf8");

function noop() {}

function createClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) { names.forEach((name) => values.add(name)); },
    remove(...names) { names.forEach((name) => values.delete(name)); },
    toggle(name, force) {
      if (force === true) values.add(name);
      else if (force === false) values.delete(name);
      else if (values.has(name)) values.delete(name);
      else values.add(name);
      return values.has(name);
    },
    contains(name) { return values.has(name); },
  };
}

function createElement(tagName = "div") {
  const listeners = new Map();
  return {
    tagName: tagName.toUpperCase(),
    className: "",
    classList: createClassList(),
    style: { setProperty: noop },
    dataset: {},
    children: [],
    parentElement: null,
    value: "",
    textContent: "",
    hidden: false,
    disabled: false,
    open: false,
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    async dispatch(type, event = {}) {
      for (const callback of listeners.get(type) || []) await callback(event);
    },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    setAttribute: noop,
    remove: noop,
    focus: noop,
    select: noop,
    setSelectionRange: noop,
    querySelector: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 }),
    get childElementCount() { return this.children.length; },
  };
}

function projectDocument(activeSceneId = "scene-a") {
  return {
    kind: "shosai-stage-sketch",
    version: 3,
    project: {
      id: "session-polish",
      activeSceneId,
      scenes: [
        { id: "scene-a", kind: "scene", pieces: [{ id: "piece-a", u: 0.2, v: 0.3, base: 0 }], arrows: [] },
        { id: "scene-b", kind: "scene", pieces: [{ id: "piece-a", u: 0.7, v: 0.6, base: 0 }], arrows: [] },
      ],
    },
  };
}

function createFixture({ invited = false } = {}) {
  const elements = new Map();
  const elementById = (id) => {
    if (!elements.has(id)) {
      const element = createElement(id.includes("canvas") ? "canvas" : "div");
      if (id === "stage-session-guest-badge") element.hidden = true;
      elements.set(id, element);
    }
    return elements.get(id);
  };
  const body = createElement("body");
  body.classList.add("is-standalone");
  const document = {
    body,
    getElementById: elementById,
    createElement,
    createTextNode: (value) => ({ textContent: String(value) }),
    querySelectorAll: () => [],
  };
  const location = {
    protocol: "http:",
    host: "localhost",
    origin: "http://localhost",
    pathname: "/stage.html",
    hash: invited ? "#session=testroom" : "",
  };
  const stored = new Map();
  const localStorage = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, String(value)),
  };
  let nextTimerId = 1;
  const timers = new Map();
  const setTimeoutStub = (callback, delay = 0) => {
    const id = nextTimerId++;
    timers.set(id, { callback, delay });
    return id;
  };
  const clearTimeoutStub = (id) => timers.delete(id);
  const runTimers = (delay) => {
    for (const [id, entry] of [...timers]) {
      if (entry.delay !== delay) continue;
      timers.delete(id);
      entry.callback();
    }
  };
  const sockets = [];
  class WebSocketStub {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 3;
    constructor(url) {
      this.url = url;
      this.readyState = WebSocketStub.CONNECTING;
      this.listeners = new Map();
      this.sent = [];
      sockets.push(this);
    }
    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(callback);
    }
    send(text) { this.sent.push(text); }
    close() { this.readyState = WebSocketStub.CLOSED; }
    dispatch(type, event = {}) {
      if (type === "open") this.readyState = WebSocketStub.OPEN;
      if (type === "close") this.readyState = WebSocketStub.CLOSED;
      for (const callback of this.listeners.get(type) || []) callback(event);
    }
    message(value) { this.dispatch("message", { data: JSON.stringify(value) }); }
  }

  let currentDocument = projectDocument();
  const calls = { applied: [], replay: 0, finish: 0, guestOps: [], enterGuest: 0 };
  const stageBridge = {
    isEnglish: () => false,
    exportDocumentString: () => JSON.stringify(currentDocument),
    applyDocumentString(text) {
      currentDocument = JSON.parse(text);
      calls.applied.push(currentDocument.project.activeSceneId);
      return true;
    },
    finishSceneTransition() { calls.finish += 1; },
    replaySceneTransition() { calls.replay += 1; },
    enterGuestMode() { calls.enterGuest += 1; },
    applyGuestOp(op) { calls.guestOps.push(op); return true; },
    clearGuestArrows: noop,
    shelveNow: () => true,
  };
  const window = { SHOSAI_STAGE_SESSION_BRIDGE: stageBridge };
  const context = {
    window,
    document,
    location,
    localStorage,
    navigator: { clipboard: null },
    WebSocket: WebSocketStub,
    URL,
    console,
    performance: { now: () => 0 },
    setTimeout: setTimeoutStub,
    clearTimeout: clearTimeoutStub,
    getComputedStyle: () => ({ position: "static" }),
    fetch: async () => ({
      ok: true,
      json: async () => ({ roomId: "hostroom", hostKey: "host-key" }),
    }),
  };
  Object.assign(window, {
    document,
    location,
    localStorage,
    navigator: context.navigator,
    WebSocket: WebSocketStub,
    URL,
    console,
    setTimeout: setTimeoutStub,
    clearTimeout: clearTimeoutStub,
  });
  vm.runInNewContext(sessionSource, context, { filename: "stage-session.js" });

  return {
    window,
    calls,
    elementById,
    sockets,
    runTimers,
    currentDocument: () => currentDocument,
    setCurrentDocument: (value) => { currentDocument = value; },
    async joinGuest() {
      elementById("stage-session-name-input").value = "Guest";
      await elementById("stage-session-name-form").dispatch("submit", { preventDefault: noop });
      return sockets.at(-1);
    },
    async startHost() {
      elementById("stage-session-host-name").value = "Host";
      await elementById("stage-session-start").dispatch("click");
      return sockets.at(-1);
    },
  };
}

test("初回docは即時適用し、2通目以降のシーン変更だけ既存転換入口を呼ぶ", async () => {
  const fixture = createFixture({ invited: true });
  const socket = await fixture.joinGuest();
  socket.dispatch("open");
  socket.message({ t: "welcome", participants: [], doc: JSON.stringify(projectDocument("scene-a")) });
  assert.deepEqual(fixture.calls.applied, ["scene-a"]);
  assert.equal(fixture.calls.replay, 0, "初期同期では転換しない");

  socket.message({ t: "doc", doc: JSON.stringify(projectDocument("scene-b")) });
  assert.deepEqual(fixture.calls.applied, ["scene-a", "scene-b"]);
  assert.equal(fixture.calls.replay, 1, "シーン変更で転換を再生する");

  socket.message({ t: "doc", doc: JSON.stringify(projectDocument("scene-b")) });
  assert.equal(fixture.calls.replay, 1, "同じシーンのdocでは転換しない");
  assert.equal(fixture.calls.finish, 3, "各docの前に進行中の転換を最終状態で打ち切る");
});

test("再接続後の最初のdocも初期同期として転換しない", async () => {
  const fixture = createFixture({ invited: true });
  const firstSocket = await fixture.joinGuest();
  firstSocket.dispatch("open");
  firstSocket.message({ t: "welcome", participants: [], doc: JSON.stringify(projectDocument("scene-a")) });
  fixture.runTimers(260);
  firstSocket.dispatch("close");
  fixture.runTimers(3000);
  const secondSocket = fixture.sockets.at(-1);
  secondSocket.dispatch("open");
  secondSocket.message({ t: "welcome", participants: [], doc: JSON.stringify(projectDocument("scene-b")) });
  assert.equal(fixture.calls.replay, 0);
});

test("ホストは共有docの保存確認を受け取ってから送信済みにする", async () => {
  const fixture = createFixture();
  const socket = await fixture.startHost();
  socket.dispatch("open");
  const sent = socket.sent.map((text) => JSON.parse(text)).find((message) => message.t === "doc");
  assert.ok(sent && Number.isInteger(sent.documentId), "docに確認用の連番を付ける");

  socket.message({ t: "doc-saved", documentId: sent.documentId, bytes: sent.doc.length });
  assert.equal(fixture.elementById("stage-session-status").textContent, "共有内容を保存して配信しました。");
});

test("上限を超える共有docはWebSocketへ送らず、ホストの作業を残したまま知らせる", async () => {
  const fixture = createFixture();
  const socket = await fixture.startHost();
  fixture.setCurrentDocument({
    kind: "shosai-stage-sketch", version: 3,
    project: { id: "too-large", scenes: [], note: "x".repeat(1800 * 1024) },
  });
  socket.dispatch("open");

  assert.equal(socket.sent.length, 0);
  assert.match(fixture.elementById("stage-session-status").textContent, /共有する舞台データが大きすぎます/);
});

test("ゲストは駒の差分を送らず、新しい矢印だけを送る", async () => {
  const fixture = createFixture({ invited: true });
  const socket = await fixture.joinGuest();
  socket.dispatch("open");
  socket.message({ t: "welcome", participants: [], doc: JSON.stringify(projectDocument("scene-a")) });
  fixture.runTimers(260);

  fixture.currentDocument().project.scenes[0].pieces[0].u = 0.95;
  fixture.window.SHOSAI_STAGE_SESSION_HOOKS.onLocalChange();
  let messages = socket.sent.map((text) => JSON.parse(text));
  assert.equal(messages.some((message) => message.op?.kind === "piece.move"), false);

  fixture.currentDocument().project.scenes[0].arrows.push({
    id: "guest-arrow", points: [{ a: 0, b: 0 }, { a: 1, b: 1 }],
  });
  fixture.window.SHOSAI_STAGE_SESSION_HOOKS.onLocalChange();
  messages = socket.sent.map((text) => JSON.parse(text));
  assert.equal(messages.some((message) => message.op?.kind === "arrows.add"), true);
});

test("ホストとゲストは中継されたpiece.moveを無視し、矢印は採用する", async () => {
  const guest = createFixture({ invited: true });
  const guestSocket = await guest.joinGuest();
  guestSocket.dispatch("open");
  guestSocket.message({ t: "welcome", participants: [], doc: JSON.stringify(projectDocument()) });
  guestSocket.message({ t: "op", op: { kind: "piece.move", sceneId: "scene-a", pieceId: "piece-a", u: 1 } });
  guestSocket.message({ t: "op", op: { kind: "arrows.add", sceneId: "scene-a", arrows: [{ id: "a" }] } });
  assert.deepEqual(guest.calls.guestOps.map((op) => op.kind), ["arrows.add"]);

  const host = createFixture();
  const hostSocket = await host.startHost();
  hostSocket.dispatch("open");
  hostSocket.message({ t: "welcome", participants: [] });
  hostSocket.message({ t: "op", op: { kind: "piece.move", sceneId: "scene-a", pieceId: "piece-a", u: 1 } });
  hostSocket.message({ t: "op", op: { kind: "arrows.add", sceneId: "scene-a", arrows: [{ id: "b" }] } });
  assert.deepEqual(host.calls.guestOps.map((op) => op.kind), ["arrows.add"]);
});

test("ゲストバッジはguest役割だけで表示され、駒操作のUIと入力経路を閉じる", async () => {
  assert.match(indexSource, /id="stage-session-guest-badge"[^>]*role="status"[^>]*hidden/);
  assert.match(styleSource, /\[data-stage-tool\]:not\(\[data-stage-tool="arrow"\]\)/);

  const guest = createFixture({ invited: true });
  assert.equal(guest.elementById("stage-session-guest-badge").hidden, true);
  await guest.joinGuest();
  assert.equal(guest.elementById("stage-session-guest-badge").hidden, false);

  const host = createFixture();
  await host.startHost();
  assert.equal(host.elementById("stage-session-guest-badge").hidden, true);

  const pointerHandler = stageSource.slice(
    stageSource.indexOf("  function onPointerDown(event) {"),
    stageSource.indexOf("  function cursorFor(el, event) {"),
  );
  assert.match(pointerHandler, /guestSessionActive\(\).*tool === "arrow".*view === "front"/s);
  const keyHandler = stageSource.slice(
    stageSource.indexOf("  function onKeyDown(event) {"),
    stageSource.indexOf("  let facingWheelDelta"),
  );
  assert.match(keyHandler, /if \(guestSessionActive\(\)\) return;/);
  const bridge = stageSource.slice(stageSource.indexOf("  window.SHOSAI_STAGE_SESSION_BRIDGE"));
  assert.doesNotMatch(bridge, /op\.kind === "piece\.move"/);
  assert.match(bridge, /op\.kind === "arrows\.add"/);
});

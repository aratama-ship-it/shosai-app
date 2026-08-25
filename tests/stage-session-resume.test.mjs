import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sessionSource = await readFile(new URL("stage-session.js", root), "utf8");
const stageSketchSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const styleSource = await readFile(new URL("style.css", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");
const HOST_SESSION_KEY = "shosai-session-host-room";

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

function createFixture({ invited = false, savedHost = null, macBridge = null } = {}) {
  const elements = new Map();
  const elementById = (id) => {
    if (!elements.has(id)) {
      const element = createElement(id.includes("canvas") ? "canvas" : "div");
      if (["stage-session-guest-badge", "stage-session-host-away", "stage-session-resume"].includes(id)) {
        element.hidden = true;
      }
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
    hash: invited ? "#session=guestroom" : "",
  };
  const storage = new Map();
  if (savedHost) storage.set(HOST_SESSION_KEY, JSON.stringify(savedHost));
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
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
  const fetchCalls = [];
  const stageBridge = {
    isEnglish: () => false,
    exportDocumentString: () => JSON.stringify({
      kind: "shosai-stage-sketch",
      version: 3,
      project: { id: "resume-test", scenes: [] },
    }),
    applyDocumentString: () => true,
    applyGuestOp: noop,
    clearGuestArrows: noop,
    enterGuestMode: noop,
    shelveNow: () => true,
  };
  const window = { SHOSAI_STAGE_SESSION_BRIDGE: stageBridge };
  if (macBridge) window.stageSketchBridge = macBridge;
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
    setTimeout: () => 1,
    clearTimeout: noop,
    getComputedStyle: () => ({ position: "static" }),
    fetch: async (...args) => {
      fetchCalls.push(args);
      return {
        ok: true,
        json: async () => ({ roomId: "newroom", hostKey: "new-test-key" }),
      };
    },
  };
  Object.assign(window, {
    document,
    location,
    localStorage,
    navigator: context.navigator,
    WebSocket: WebSocketStub,
    URL,
    console,
    setTimeout: context.setTimeout,
    clearTimeout: context.clearTimeout,
  });
  vm.runInNewContext(sessionSource, context, { filename: "stage-session.js" });

  return {
    elementById,
    fetchCalls,
    sockets,
    storage,
    async startHost() {
      elementById("stage-session-host-name").value = "Host";
      await elementById("stage-session-start").dispatch("click");
      return sockets.at(-1);
    },
    async resumeHost() {
      elementById("stage-session-host-name").value = "Returning Host";
      await elementById("stage-session-resume").dispatch("click");
      return sockets.at(-1);
    },
    async joinGuest() {
      elementById("stage-session-name-input").value = "Guest";
      await elementById("stage-session-name-form").dispatch("submit", { preventDefault: noop });
      return sockets.at(-1);
    },
  };
}

function recentSavedHost(overrides = {}) {
  return {
    roomId: "savedroom",
    hostKey: "saved-test-key",
    origin: "https://saved.example",
    savedAt: Date.now() - 60_000,
    ...overrides,
  };
}

test("新しいホストセッションは復帰に必要な4項目を保存する", async () => {
  const fixture = createFixture({ savedHost: recentSavedHost({ roomId: "previousroom" }) });
  const before = Date.now();
  await fixture.startHost();
  const saved = JSON.parse(fixture.storage.get(HOST_SESSION_KEY));

  assert.deepEqual(Object.keys(saved).sort(), ["hostKey", "origin", "roomId", "savedAt"]);
  assert.equal(saved.roomId, "newroom");
  assert.equal(saved.hostKey, "new-test-key");
  assert.equal(saved.origin, "http://localhost");
  assert.ok(saved.savedAt >= before && saved.savedAt <= Date.now());
});

test("24時間以内の保存だけ再開ボタンを出し、古い保存は消す", () => {
  const recent = createFixture({ savedHost: recentSavedHost() });
  assert.equal(recent.elementById("stage-session-resume").hidden, false);

  const old = createFixture({
    savedHost: recentSavedHost({ savedAt: Date.now() - (24 * 60 * 60 * 1000) - 1 }),
  });
  assert.equal(old.elementById("stage-session-resume").hidden, true);
  assert.equal(old.storage.has(HOST_SESSION_KEY), false);
});

test("再開は新規作成APIを呼ばず保存済みの部屋と鍵で接続する", async () => {
  const fixture = createFixture({ savedHost: recentSavedHost() });
  const socket = await fixture.resumeHost();
  const socketUrl = new URL(socket.url);

  assert.equal(fixture.fetchCalls.length, 0);
  assert.equal(socketUrl.pathname, "/session/savedroom/ws");
  assert.equal(socketUrl.searchParams.get("role"), "host");
  assert.equal(socketUrl.searchParams.get("key"), "saved-test-key");
  assert.equal(
    fixture.elementById("stage-session-url").value,
    "http://localhost/stage.html#session=savedroom",
    "ブラウザ再開時の招待URLは現在のlocation.originを使う",
  );
});

test("Macブリッジでの再開は保存時のoriginから招待URLを復元する", async () => {
  const connects = [];
  const macBridge = {
    sessionConnect: async (options) => { connects.push(options); return { ok: true }; },
    sessionSend: async () => ({ ok: true }),
    sessionDisconnect: async () => ({ ok: true }),
    onSessionEvent: noop,
  };
  const fixture = createFixture({ savedHost: recentSavedHost(), macBridge });
  await fixture.resumeHost();

  assert.equal(fixture.fetchCalls.length, 0);
  assert.equal(
    fixture.elementById("stage-session-url").value,
    "https://saved.example/stage.html#session=savedroom",
  );
  assert.equal(connects.length, 1);
  assert.equal(connects[0].roomId, "savedroom");
  assert.equal(connects[0].role, "host");
  assert.equal(connects[0].hostKey, "saved-test-key");
});

test("再開がbad-keyまたはfullで拒否されたら保存を消して新規開始へ戻す", async () => {
  for (const rejection of ["bad-key", "full"]) {
    const fixture = createFixture({ savedHost: recentSavedHost() });
    const socket = await fixture.resumeHost();
    socket.message({ t: rejection });

    assert.equal(fixture.storage.has(HOST_SESSION_KEY), false, rejection);
    assert.equal(fixture.elementById("stage-session-resume").hidden, true, rejection);
    assert.equal(fixture.elementById("stage-session-start").disabled, false, rejection);
    assert.equal(fixture.elementById("stage-session-reconnect").hidden, true, rejection);
    assert.equal(fixture.elementById("stage-session-panel").open, true, rejection);
    assert.equal(
      fixture.elementById("stage-session-status").textContent,
      "前回のセッションは終了しています。新しく開始してください。",
      rejection,
    );
  }
});

test("ゲストのwelcomeとpresenceでホスト不在帯を出し入れし、ホスト自身には出さない", async () => {
  const guest = createFixture({ invited: true });
  const guestSocket = await guest.joinGuest();
  guestSocket.message({
    t: "welcome",
    participants: [{ clientId: "guest-1", role: "guest", name: "Guest" }],
  });
  assert.equal(guest.elementById("stage-session-host-away").hidden, false);

  guestSocket.message({
    t: "presence",
    participants: [
      { clientId: "host-1", role: "host", name: "Host" },
      { clientId: "guest-1", role: "guest", name: "Guest" },
    ],
  });
  assert.equal(guest.elementById("stage-session-host-away").hidden, true);

  const host = createFixture();
  const hostSocket = await host.startHost();
  hostSocket.message({ t: "welcome", participants: [] });
  assert.equal(host.elementById("stage-session-host-away").hidden, true);
});

test("ホスト不在帯は上部中央・読み上げ通知・操作透過である", () => {
  assert.match(
    indexSource,
    /id="stage-session-host-away"[^>]*role="status"[^>]*aria-live="polite"[^>]*hidden/,
  );
  const block = styleSource.slice(
    styleSource.indexOf(".stage-session-host-away {"),
    styleSource.indexOf(".stage-session-host-away[hidden]"),
  );
  assert.match(block, /position: fixed/);
  assert.match(block, /left: 50%/);
  assert.match(block, /pointer-events: none/);
});

test("ゲスト用CSSは編集・管理パネルを隠し、classを外せば通常表示へ戻る", () => {
  const start = styleSource.indexOf("/* ゲストは見る・指す・矢印を描くための画面だけを残す。");
  const end = styleSource.indexOf("/* ゲストはシーンを切り替えられない", start);
  const block = styleSource.slice(start, end);
  assert.ok(start >= 0 && end > start, "ゲスト表示制限のCSSブロックがあること");

  for (const panel of [
    "project", "music", "cast", "machinery", "rigs", "light", "background", "inspector", "ask",
  ]) {
    assert.match(block, new RegExp(`body\\.stage-session-guest \\.stage-panel\\[data-panel="${panel}"\\]`));
  }
  assert.match(block, /data-panel="save"\] > \.stage-panel-head/);
  for (const saveOnly of ["stage-save-status", "stage-backup-note", "stage-backup-hint", "stage-clear"]) {
    assert.match(block, new RegExp(`body\\.stage-session-guest #${saveOnly}`));
  }
  assert.doesNotMatch(block, /body\.stage-session-guest #stage-session-panel/,
    "共有セッション欄そのものは隠さない");
  assert.match(block, /body\.stage-session-guest \.stage-scene-actions/);
  assert.match(block, /body\.stage-session-guest #stage-undo/);
  assert.match(block, /body\.stage-session-guest \[data-stage-tool\]:not\(\[data-stage-tool="arrow"\]\)/);
  for (const group of ["show", "cast", "look", "inspect"]) {
    assert.match(block, new RegExp(`data-tablet-group="${group}"`));
  }

  const selectorStart = block.indexOf("body.stage-session-guest");
  const selectors = block.slice(selectorStart, block.indexOf("{", selectorStart))
    .split(",").map((value) => value.trim()).filter(Boolean);
  assert.ok(selectors.every((selector) => selector.startsWith("body.stage-session-guest")),
    "display:noneはguest class配下だけに置き、class解除時は通常CSSへ戻す");

  const guestMode = stageSketchSource.slice(
    stageSketchSource.indexOf("    enterGuestMode() {"),
    stageSketchSource.indexOf("    shelveNow()", stageSketchSource.indexOf("    enterGuestMode() {")),
  );
  assert.match(guestMode, /\["show", "cast", "look", "inspect"\]\.includes\(tabletUi\.groupId\)/);
  assert.match(guestMode, /closeTabletDrawer\(\)/, "開いていた編集ドロワーも閉じる");
});

test("追加した日本語UI文字列には英訳がある", () => {
  const context = { window: {} };
  vm.runInNewContext(i18nSource, context, { filename: "stage-i18n.js" });
  const translations = context.window.SHOSAI_I18N.text;
  for (const text of [
    "前回のセッションを再開",
    "前回のセッションは終了しています。新しく開始してください。",
    "ホストの接続が切れています。復帰を待っています…",
  ]) {
    assert.equal(typeof translations[text], "string");
    assert.ok(translations[text].length > 0);
  }
});

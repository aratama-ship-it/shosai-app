import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sessionSource = await readFile(new URL("stage-session.js", root), "utf8");
const relaySource = await readFile(new URL("mac-app/Sources/SessionRelay.swift", root), "utf8");
const bridgeSource = await readFile(new URL("mac-app/Sources/StageSketchBridge.swift", root), "utf8");
const selfTestSource = await readFile(new URL("mac-app/Sources/SelfTestRunner.swift", root), "utf8");

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
  const element = {
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
  };
  Object.defineProperty(element, "childElementCount", {
    get() { return element.children.length; },
  });
  return element;
}

function createFixture({ macBridge = null, sessionResult, fetchImpl }) {
  const elements = new Map();
  const elementById = (id) => {
    if (!elements.has(id)) elements.set(id, createElement(id.includes("canvas") ? "canvas" : "div"));
    return elements.get(id);
  };
  const body = createElement("body");
  body.classList.add("is-standalone");
  const document = {
    body,
    getElementById: elementById,
    createElement,
    createTextNode: (text) => ({ textContent: String(text) }),
    querySelectorAll: () => [],
  };
  const location = {
    protocol: "http:",
    host: "localhost",
    origin: "http://localhost",
    pathname: "/stage.html",
    hash: "",
  };
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  };
  const webSocketURLs = [];
  class WebSocketStub {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 3;
    constructor(url) {
      this.url = url;
      this.readyState = WebSocketStub.CONNECTING;
      this.listeners = new Map();
      webSocketURLs.push(url);
    }
    addEventListener(type, callback) { this.listeners.set(type, callback); }
    send() {}
    close() {}
  }
  const stageBridge = {
    isEnglish: () => false,
    exportDocumentString: () => JSON.stringify({
      kind: "shosai-stage-sketch",
      version: 3,
      project: { id: "bridge-test", scenes: [] },
    }),
    applyDocumentString: () => true,
    applyGuestOp: noop,
    clearGuestArrows: noop,
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
    fetch: fetchImpl || (async () => ({ ok: true, json: async () => sessionResult })),
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
    clearTimeout,
  });
  vm.runInNewContext(sessionSource, context, { filename: "stage-session.js" });
  return { context, elementById, webSocketURLs };
}

test("ブリッジが無いブラウザは従来どおり相対fetchでセッションを始める", async () => {
  const fetchCalls = [];
  const fixture = createFixture({
    sessionResult: { roomId: "browserroom", hostKey: "browser-key", user: "browser-user" },
    fetchImpl: async (...args) => {
      fetchCalls.push(args);
      if (args[0] === "/whoami") {
        return { ok: true, json: async () => ({ user: "browser-user" }) };
      }
      return {
        ok: true,
        json: async () => ({ roomId: "browserroom", hostKey: "browser-key", user: "browser-user" }),
      };
    },
  });
  fixture.elementById("stage-session-host-name").value = "Browser Host";

  await fixture.elementById("stage-session-start").dispatch("click");

  const newSessionCalls = fetchCalls.filter(([url]) => url === "session/new");
  assert.equal(newSessionCalls.length, 1);
  assert.equal(newSessionCalls[0][1].method, "POST");
  assert.equal(fixture.elementById("stage-session-url").value, "http://localhost/stage.html#session=browserroom");
  assert.equal(fixture.webSocketURLs.length, 1);
  assert.match(fixture.webSocketURLs[0], /^ws:\/\/localhost\/session\/browserroom\/ws\?/);
});

test("Macブリッジは本番の招待URLを作り、open→message→closeを既存ハンドラへ渡す", async () => {
  let sessionEvent;
  const connects = [];
  const sentTexts = [];
  const macBridge = {
    sessionStart: async () => ({
      ok: true,
      roomId: "macroom",
      hostKey: "mac-key",
      user: "mac-user",
      origin: "https://stagesketch.pygmix.com",
    }),
    sessionUser: async () => ({ ok: true, user: "mac-user" }),
    sessionConnect: async (options) => { connects.push(options); return { ok: true }; },
    sessionSend: async (text) => { sentTexts.push(text); return { ok: true }; },
    sessionDisconnect: async () => ({ ok: true }),
    onSessionEvent(callback) { sessionEvent = callback; },
  };
  const fixture = createFixture({
    macBridge,
    sessionResult: null,
    fetchImpl: async () => { throw new Error("browser fetch must not run"); },
  });
  fixture.elementById("stage-session-host-name").value = "Mac Host";

  await fixture.elementById("stage-session-start").dispatch("click");

  assert.equal(
    fixture.elementById("stage-session-url").value,
    "https://stagesketch.pygmix.com/stage.html#session=macroom",
  );
  assert.deepEqual(JSON.parse(JSON.stringify(connects)), [{
    roomId: "macroom",
    role: "host",
    name: "Mac Host",
    hostKey: "mac-key",
  }]);
  assert.equal(typeof sessionEvent, "function");
  assert.equal(fixture.webSocketURLs.length, 0);

  sessionEvent({ type: "open" });
  assert.equal(sentTexts.length, 1, "openは既存のホスト全文送信を呼ぶ");
  assert.equal(JSON.parse(sentTexts[0]).t, "doc");

  sessionEvent({ type: "message", data: JSON.stringify({ t: "welcome", participants: [] }) });
  assert.equal(fixture.elementById("stage-session-status").textContent, "ホストとして接続しました。");

  sessionEvent({ type: "close" });
  assert.match(fixture.elementById("stage-session-status").textContent, /^切断しました。3秒後に再接続します/);
});

test("Swift中継は固定オリジン・Keychain・Basic認証とP0オリジン拒否テストを備える", () => {
  /* 2026-08-28に独自ドメインへ移行。ここを変えたら .app の作り直しが要る
     （古い殻は旧URLへ繋ぎ続ける）。 */
  assert.match(relaySource, /static let productionOrigin = "https:\/\/stagesketch\.pygmix\.com"/);
  assert.match(relaySource, /static let service = "shosai-app-session"/);
  assert.match(relaySource, /forHTTPHeaderField: "Authorization"/);
  assert.match(relaySource, /URLSessionWebSocketTask/);
  for (const name of ["sessionStart", "sessionUser", "sessionResumeStatus", "sessionConnect", "sessionSend", "sessionDisconnect"]) {
    assert.match(bridgeSource, new RegExp(`stageSketch${name[0].toUpperCase()}${name.slice(1)}`));
  }
  assert.match(selfTestSource, /sessionHandlersRegistered/);
  assert.match(selfTestSource, /stageSketchBridge\.sessionDisconnect\(\)/);
  assert.match(selfTestSource, /only available to the app's own pages/);
});

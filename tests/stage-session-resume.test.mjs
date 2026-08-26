import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sessionSource = await readFile(new URL("stage-session.js", root), "utf8");
const roomSource = await readFile(new URL("session-room.js", root), "utf8");
const stageSketchSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const stageHtmlSource = await readFile(new URL("stage.html", root), "utf8");
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
  const element = {
    tagName: tagName.toUpperCase(),
    className: "",
    classList: createClassList(),
    style: { setProperty: noop },
    dataset: {},
    children: [],
    parentElement: null,
    parentNode: null,
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
    append(...children) {
      children.forEach((child) => {
        if (child.parentNode && typeof child.parentNode.removeChild === "function") {
          child.parentNode.removeChild(child);
        }
        child.parentNode = this;
        child.parentElement = this;
        this.children.push(child);
      });
    },
    insertBefore(child, reference) {
      if (child.parentNode && typeof child.parentNode.removeChild === "function") {
        child.parentNode.removeChild(child);
      }
      const index = reference == null ? -1 : this.children.indexOf(reference);
      child.parentNode = this;
      child.parentElement = this;
      if (index < 0) this.children.push(child);
      else this.children.splice(index, 0, child);
      return child;
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index < 0) return child;
      this.children.splice(index, 1);
      child.parentNode = null;
      child.parentElement = null;
      return child;
    },
    replaceChildren(...children) {
      this.children.slice().forEach((child) => this.removeChild(child));
      this.append(...children);
    },
    setAttribute: noop,
    remove() {
      if (this.parentNode && typeof this.parentNode.removeChild === "function") {
        this.parentNode.removeChild(this);
      }
    },
    focus: noop,
    select: noop,
    setSelectionRange: noop,
    querySelector: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 }),
    get firstChild() { return this.children[0] || null; },
    get nextSibling() {
      if (!this.parentNode) return null;
      const index = this.parentNode.children.indexOf(this);
      return index >= 0 ? this.parentNode.children[index + 1] || null : null;
    },
    get childElementCount() { return this.children.length; },
  };
  return element;
}

function createFixture({ invited = false, savedHost = null, macBridge = null, rootClass = null } = {}) {
  const elements = new Map();
  const elementById = (id) => {
    if (!elements.has(id)) {
      const element = createElement(id.includes("canvas") ? "canvas" : "div");
      if ([
        "stage-session-guest-badge", "stage-session-host-away", "stage-session-resume",
        "stage-session-refresh",
      ].includes(id)) {
        element.hidden = true;
      }
      elements.set(id, element);
    }
    return elements.get(id);
  };
  const body = createElement("body");
  body.classList.add("is-standalone");
  const documentListeners = new Map();
  /* iPad PWA は html.stage-pwa-tablet、スマホ閲覧機は html.stage-phone-viewer を付ける。
     どちらも左列を display:none にするので、セッション欄を移してはいけない。 */
  const documentElement = createElement("html");
  if (rootClass) documentElement.classList.add(rootClass);
  const document = {
    body,
    documentElement,
    getElementById: elementById,
    createElement,
    createTextNode: (value) => ({ textContent: String(value), parentNode: null, parentElement: null }),
    querySelectorAll: () => [],
    addEventListener(type, callback) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(callback);
    },
    dispatch(type, event) {
      for (const callback of documentListeners.get(type) || []) callback(event);
    },
  };
  const sessionPanelHome = createElement("div");
  const sessionPanelNextSibling = createElement("p");
  sessionPanelHome.append(elementById("stage-session-panel"), sessionPanelNextSibling);
  const leftColumn = elementById("stage-col-left");
  const leftColumnFirstChild = createElement("section");
  leftColumn.append(leftColumnFirstChild);
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
  const timers = new Map();
  let nextTimerId = 1;
  const setTimer = (callback, delay = 0) => {
    const id = nextTimerId;
    nextTimerId += 1;
    timers.set(id, { callback, delay });
    return id;
  };
  const clearTimer = (id) => { timers.delete(id); };
  class WebSocketStub {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 3;
    constructor(url) {
      this.url = url;
      this.readyState = WebSocketStub.CONNECTING;
      this.listeners = new Map();
      this.sent = [];
      this.closeCalls = 0;
      sockets.push(this);
    }
    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(callback);
    }
    send(text) { this.sent.push(text); }
    close() {
      this.closeCalls += 1;
      this.readyState = WebSocketStub.CLOSED;
    }
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
    setTimeout: setTimer,
    clearTimeout: clearTimer,
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
    document,
    elementById,
    fetchCalls,
    documentElement,
    leftColumn,
    leftColumnFirstChild,
    sessionPanelHome,
    sessionPanelNextSibling,
    sockets,
    storage,
    window,
    dispatchDocumentEvent(type, event) {
      document.dispatch(type, event);
    },
    activeTimerDelays() {
      return [...timers.values()].map((timer) => timer.delay);
    },
    runTimer(delay) {
      const entry = [...timers.entries()].find(([, timer]) => timer.delay === delay);
      assert.ok(entry, `${delay}ms のタイマーがあること`);
      const [id, timer] = entry;
      timers.delete(id);
      return timer.callback();
    },
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

test("pingとpongの文字列をサーバーとクライアントで正確に揃える", async () => {
  const constructor = roomSource.slice(
    roomSource.indexOf("  constructor(ctx, env) {"),
    roomSource.indexOf("  async fetch(request)"),
  );
  assert.match(
    constructor,
    /setWebSocketAutoResponse\(new WebSocketRequestResponsePair\('\{"t":"ping"\}', '\{"t":"pong"\}'\)\)/,
  );
  assert.equal((roomSource.match(/setWebSocketAutoResponse/g) || []).length, 1);

  const fixture = createFixture({ invited: true });
  const socket = await fixture.joinGuest();
  socket.dispatch("open");
  fixture.runTimer(25_000);
  assert.equal(socket.sent.at(-1), '{"t":"ping"}');
});

test("keepaliveは25秒ごとにpingし、pongをUIへ出さず、10秒途絶で閉じる", async () => {
  const fixture = createFixture({ invited: true });
  const socket = await fixture.joinGuest();
  socket.dispatch("open");
  assert.ok(fixture.activeTimerDelays().includes(25_000));

  fixture.runTimer(25_000);
  assert.equal(socket.sent.at(-1), '{"t":"ping"}');
  assert.ok(fixture.activeTimerDelays().includes(10_000));
  const statusBeforePong = fixture.elementById("stage-session-status").textContent;
  socket.message({ t: "pong" });
  assert.equal(fixture.activeTimerDelays().includes(10_000), false);
  assert.equal(fixture.elementById("stage-session-status").textContent, statusBeforePong);

  fixture.runTimer(25_000);
  fixture.runTimer(10_000);
  assert.equal(socket.closeCalls, 1);
  assert.equal(fixture.activeTimerDelays().includes(25_000), false);
});

test("切断時はkeepaliveタイマーを止め、既存の3秒再接続へ渡す", async () => {
  const fixture = createFixture({ invited: true });
  const socket = await fixture.joinGuest();
  socket.dispatch("open");
  socket.dispatch("close");

  assert.equal(fixture.activeTimerDelays().includes(25_000), false);
  assert.equal(fixture.activeTimerDelays().includes(10_000), false);
  assert.ok(fixture.activeTimerDelays().includes(3000));
});

test("最新を取り直すはゲストだけに出て、旧ソケットを閉じ、試行回数0で即時接続する", async () => {
  assert.match(indexSource, /id="stage-session-refresh"[^>]*hidden/);
  const guest = createFixture({ invited: true });
  assert.equal(guest.elementById("stage-session-refresh").hidden, true);
  const firstSocket = await guest.joinGuest();
  firstSocket.dispatch("open");
  assert.equal(guest.elementById("stage-session-refresh").hidden, false);

  await guest.elementById("stage-session-refresh").dispatch("click");
  assert.equal(firstSocket.closeCalls, 1);
  assert.equal(guest.sockets.length, 2);
  assert.equal(guest.elementById("stage-session-status").textContent, "接続しています…");

  guest.sockets.at(-1).dispatch("close");
  assert.match(guest.elementById("stage-session-status").textContent, /1\/5/);
  await guest.elementById("stage-session-refresh").dispatch("click");
  assert.equal(guest.sockets.length, 3);
  assert.equal(guest.elementById("stage-session-status").textContent, "接続しています…");

  const host = createFixture();
  await host.startHost();
  assert.equal(host.elementById("stage-session-refresh").hidden, true);
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

test("ゲスト時はセッション欄を左列の先頭へ移し、元の親と次兄弟の位置へ戻せる", async () => {
  const fixture = createFixture({ invited: true });
  const panel = fixture.elementById("stage-session-panel");
  assert.equal(panel.parentNode, fixture.sessionPanelHome);
  assert.equal(panel.nextSibling, fixture.sessionPanelNextSibling);

  await fixture.joinGuest();
  assert.equal(fixture.leftColumn.firstChild, panel);
  assert.equal(panel.open, true);

  assert.equal(fixture.window.SHOSAI_STAGE_SESSION_HOOKS.restoreSessionPanelHome(), true);
  assert.equal(panel.parentNode, fixture.sessionPanelHome);
  assert.equal(panel.nextSibling, fixture.sessionPanelNextSibling);
  assert.equal(fixture.leftColumn.firstChild, fixture.leftColumnFirstChild);
});

/* ★左列は iPad PWA と スマホ閲覧機では display:none（style.css:10251 / :10679）。
   そこへ移すとゲストは接続状態も「最新を取り直す」も失うため、移してはいけない。
   2026-08-26 の検証で見つけた欠落。この判定を外さないこと。 */
for (const rootClass of ["stage-pwa-tablet", "stage-phone-viewer"]) {
  test(`${rootClass} ではセッション欄を左列へ移さない（左列が display:none のため）`, async () => {
    const fixture = createFixture({ invited: true, rootClass });
    const panel = fixture.elementById("stage-session-panel");

    await fixture.joinGuest();

    assert.equal(fixture.document.body.classList.contains("stage-session-guest"), true,
      "ゲスト判定そのものは付く");
    assert.equal(panel.parentNode, fixture.sessionPanelHome,
      "セッション欄は保存パネルの中に残る");
    assert.equal(panel.nextSibling, fixture.sessionPanelNextSibling);
    assert.equal(fixture.leftColumn.firstChild, fixture.leftColumnFirstChild,
      "左列の中身は動かない");
  });
}

test("ゲストの出るもの一覧はクリックとEnter・Spaceを実効的に遮断する", async () => {
  const fixture = createFixture({ invited: true });
  await fixture.joinGuest();

  for (const className of ["stage-kind-swatch", "stage-cast-name", "stage-cast-status"]) {
    const target = {
      closest(selector) { return selector.includes(`.${className}`) ? this : null; },
    };
    for (const [type, key] of [["click", undefined], ["keydown", "Enter"], ["keydown", " "]]) {
      let prevented = false;
      let stopped = false;
      fixture.dispatchDocumentEvent(type, {
        type,
        key,
        target,
        preventDefault() { prevented = true; },
        stopImmediatePropagation() { stopped = true; },
      });
      assert.equal(prevented, true, `${className} の ${type}:${key || "pointer"} をpreventDefaultする`);
      assert.equal(stopped, true, `${className} の ${type}:${key || "pointer"} を後続へ渡さない`);
    }
  }

  const host = createFixture();
  let hostPrevented = false;
  host.dispatchDocumentEvent("click", {
    type: "click",
    target: { closest: () => ({}) },
    preventDefault() { hostPrevented = true; },
    stopImmediatePropagation: noop,
  });
  assert.equal(hostPrevented, false, "ゲストクラスが無い通常画面は遮断しない");
});

test("ゲスト用CSSは編集・管理パネルを隠し、classを外せば通常表示へ戻る", () => {
  const start = styleSource.indexOf("/* ゲストは見る・指す・矢印を描くための画面だけを残す。");
  const end = styleSource.indexOf("/* ゲストはシーンを切り替えられない", start);
  const block = styleSource.slice(start, end);
  assert.ok(start >= 0 && end > start, "ゲスト表示制限のCSSブロックがあること");

  for (const panel of [
    "project", "music", "machinery", "rigs", "light", "background", "inspector", "ask",
  ]) {
    assert.match(block, new RegExp(`body\\.stage-session-guest \\.stage-panel\\[data-panel="${panel}"\\]`));
    for (const html of [indexSource, stageHtmlSource]) {
      assert.match(html, new RegExp(`class="[^"]*stage-panel[^"]*"[^>]*data-panel="${panel}"`));
    }
  }
  assert.doesNotMatch(block, /body\.stage-session-guest \.stage-panel\[data-panel="cast"\]/,
    "出るものパネル自体は隠さない");
  for (const html of [indexSource, stageHtmlSource]) {
    assert.match(html, /class="[^"]*stage-panel[^"]*"[^>]*data-panel="cast"/);
  }
  for (const selector of [
    ".stage-cast-hint", ".stage-cast-add", "#stage-model-open",
    ".stage-cast-lock", ".stage-cast-profile", ".stage-cast-remove",
  ]) {
    assert.match(block, new RegExp(`body\\.stage-session-guest ${selector.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`));
  }
  const rosterHideStart = block.indexOf("body.stage-session-guest .stage-cast-hint");
  const rosterHideBlock = block.slice(rosterHideStart, block.indexOf("}", rosterHideStart));
  assert.doesNotMatch(
    rosterHideBlock,
    /\.stage-kind-swatch|\.stage-kind-input|\.stage-cast-name|\.stage-cast-status/,
    "色・名前・舞台上／舞台裏の情報はdisplay:noneにしない",
  );
  assert.match(block, /body\.stage-session-guest \.stage-kind-input,[\s\S]*?pointer-events: none/);
  assert.match(block, /body\.stage-session-guest \.stage-cast-name,[\s\S]*?pointer-events: none/);
  assert.match(block, /body\.stage-session-guest \.stage-cast-status \{[\s\S]*?border-color: transparent/);
  assert.match(styleSource, /\.stage-cast-status\.is-on \{[\s\S]*?color: var\(--paper\)/);
  assert.match(styleSource, /\.stage-cast-status\.is-off \{ color: rgba\(240, 231, 214, 0\.4\); \}/);
  assert.match(block, /body\.stage-session-guest \.stage-inspector \{\s*display: none/);
  assert.match(
    block,
    /body\.stage-session-guest \.stage-sketch-grid \{[\s\S]*?grid-template-columns: 268px minmax\(420px, 1fr\);[\s\S]*?grid-template-areas: "tools board";/,
  );
  assert.match(
    styleSource,
    /\.stage-sketch-grid \{[\s\S]*?grid-template-columns: 268px minmax\(420px, 1fr\) 268px;[\s\S]*?grid-template-areas: "tools board inspector";/,
    "ゲストクラスが無い通常画面は3列のまま",
  );
  assert.match(block, /data-panel="save"\] > \.stage-panel-head/);
  assert.match(block, /data-panel="save"\] > \.stage-panel-body > :not\(#stage-session-panel\):not\(\.stage-tablet-panel-page\)/);
  assert.match(block, /\.stage-tablet-panel-page > :not\(#stage-session-panel\)/);
  for (const html of [indexSource, stageHtmlSource]) {
    const savePanel = html.slice(
      html.indexOf('<section class="stage-panel stage-save-note" data-panel="save"'),
      html.indexOf('<section class="stage-panel" data-panel="ask"'),
    );
    assert.match(savePanel, /class="stage-panel-body"/);
    assert.match(savePanel, /id="stage-session-panel"/);
  }
  assert.doesNotMatch(block, /body\.stage-session-guest #stage-session-panel/,
    "共有セッション欄そのものは隠さない");
  assert.match(block, /body\.stage-session-guest #stage-present-btn/);
  for (const html of [indexSource, stageHtmlSource]) assert.match(html, /id="stage-present-btn"/);
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
  assert.equal((sessionSource.match(/enterGuestSessionMode\(\);/g) || []).length, 2,
    "ゲストになる2経路は同じ移設関数を使う");
});

test("追加した日本語UI文字列には英訳がある", () => {
  const context = { window: {} };
  vm.runInNewContext(i18nSource, context, { filename: "stage-i18n.js" });
  const translations = context.window.SHOSAI_I18N.text;
  for (const text of [
    "前回のセッションを再開",
    "最新を取り直す",
    "前回のセッションは終了しています。新しく開始してください。",
    "ホストの接続が切れています。復帰を待っています…",
  ]) {
    assert.equal(typeof translations[text], "string");
    assert.ok(translations[text].length > 0);
  }
});

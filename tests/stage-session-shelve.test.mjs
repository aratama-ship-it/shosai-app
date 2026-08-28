import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import worker from "../worker.js";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const sessionSource = await readFile(new URL("stage-session.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const stageHtml = await readFile(new URL("stage.html", root), "utf8");
const serviceWorkerSource = await readFile(new URL("stage-sw.js", root), "utf8");

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `${startMarker} が見つからない`);
  assert.ok(end > start, `${endMarker} が見つからない`);
  return source.slice(start, end);
}

test("shelveCurrent は棚への書き込み結果を呼び出し元へ返す", () => {
  const body = sourceBetween(
    stageSource,
    "  function shelveCurrent() {",
    "  function reserveImportedShowId(next) {",
  );
  assert.match(body, /return writeShows\(shows\);/);
});

test("セッション bridge の shelveNow は shelveCurrent の結果を返す", () => {
  const bridge = sourceBetween(
    stageSource,
    "  window.SHOSAI_STAGE_SESSION_BRIDGE = Object.freeze({",
    "\n  });\n})();",
  );
  assert.match(bridge, /shelveNow\(\) \{ return shelveCurrent\(\); \},/);
});

test("変更した2本のJS版とPWAキャッシュ版を正本・単独版・Service Workerで揃える", () => {
  for (const reference of ["stage-sketch.js?v=311", "stage-session.js?v=10"]) {
    assert.ok(indexSource.includes(reference), `${reference} が index.html にある`);
    assert.ok(stageHtml.includes(reference), `${reference} が stage.html にある`);
    assert.ok(serviceWorkerSource.includes(`./${reference}`), `${reference} が stage-sw.js にある`);
  }
  // 版は上げるたびにここも更新する（2026-08-26: 発注書Hのゲスト画面変更で v144 → v145）
  assert.match(serviceWorkerSource, /const CACHE_NAME = "stage-sketch-pwa-v176";/);
});

test("ゲスト参加は false の退避結果を失敗として扱い、role 変更前に中止する", () => {
  const submit = sourceBetween(
    sessionSource,
    '    form.addEventListener("submit", (event) => {',
    '    input.value = readStoredName("");',
  );
  assert.match(submit, /shelved = bridge\.shelveNow\(\) !== false/);
  assert.match(submit, /if \(!shelved\) \{[\s\S]*?setStatus\([\s\S]*?true\);\s*return;\s*\}/);
  assert.ok(submit.indexOf("return;", submit.indexOf("if (!shelved)")) < submit.indexOf("role = \"guest\""));
});

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

function createCanvasContext() {
  return new Proxy({}, {
    get(target, prop) {
      if (prop === "createLinearGradient" || prop === "createRadialGradient") {
        return () => ({ addColorStop: noop });
      }
      if (prop === "createPattern") return () => ({});
      if (prop === "measureText") return (text) => ({ width: String(text).length * 8 });
      if (prop === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      if (!(prop in target)) target[prop] = noop;
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

function createElementStub(tagName = "div") {
  const listeners = new Map();
  const element = {
    tagName: tagName.toUpperCase(),
    style: { setProperty: noop, removeProperty: noop },
    dataset: {},
    classList: createClassList(),
    children: [],
    parentElement: null,
    width: 1200,
    height: 800,
    clientWidth: 1200,
    clientHeight: 800,
    value: "",
    checked: false,
    hidden: false,
    disabled: false,
    textContent: "",
    innerHTML: "",
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    removeEventListener: noop,
    dispatch(type, event = {}) {
      (listeners.get(type) || []).forEach((listener) => listener(event));
    },
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); return child; },
    prepend(...children) { this.children.unshift(...children); },
    remove() { this.removed = true; },
    replaceChildren(...children) { this.children = children; },
    setAttribute: noop,
    getAttribute: () => null,
    removeAttribute: noop,
    focus: noop,
    blur: noop,
    select: noop,
    setSelectionRange: noop,
    scrollIntoView: noop,
    contains: () => false,
    closest: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 }),
    getContext: () => createCanvasContext(),
    toDataURL: () => "data:image/png;base64,",
  };
  Object.defineProperty(element, "childElementCount", {
    get() { return element.children.length; },
  });
  return element;
}

function createSessionContext() {
  const elements = new Map();
  const elementById = (id) => {
    if (!elements.has(id)) {
      elements.set(id, createElementStub(id.includes("canvas") ? "canvas" : "div"));
    }
    return elements.get(id);
  };
  const values = new Map();
  let quotaThrows = 0;
  const storage = {
    quotaFull: false,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) {
      if (this.quotaFull && key === "shosai-stage-shows-v1") {
        quotaThrows += 1;
        throw new DOMException("storage full", "QuotaExceededError");
      }
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); },
  };
  const location = {
    hostname: "localhost",
    protocol: "http:",
    host: "localhost",
    origin: "http://localhost",
    pathname: "/stage.html",
    search: "",
    hash: "",
    replace: noop,
  };
  const body = createElementStub("body");
  body.classList.add("is-standalone");
  const document = {
    readyState: "complete",
    documentElement: { classList: createClassList() },
    body,
    getElementById: elementById,
    createElement: createElementStub,
    createTextNode: (text) => ({ textContent: String(text) }),
    createTreeWalker: () => ({ nextNode: () => null }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    removeEventListener: noop,
  };
  let webSocketCount = 0;
  class WebSocketStub {
    static OPEN = 1;
    constructor() { webSocketCount += 1; }
  }
  const context = {
    window: {
      SHOSAI_VENUES: {
        get list() {
          return [{
            id: "proscenium",
            label: "プロセニアム",
            short: "プロセ",
            audience: "front",
            frame: true,
            sizes: [{ id: "mid", label: "中劇場", width: 12, depth: 9, height: 8 }],
            note: "",
            source: "",
            outline: [[0, 0], [12, 0], [12, 9], [0, 9]],
            audienceAreas: [],
          }];
        },
        byId(id) { return this.list.find((venue) => venue.id === id) || this.list[0]; },
        sizeById(venue, id) {
          return (venue.sizes || []).find((size) => size.id === id) || venue.sizes[0];
        },
        seats: [{ id: "center", label: "中央", x: 0.5, z: 1.3 }],
        seatById(id) { return this.seats.find((seat) => seat.id === id) || this.seats[0]; },
        sightLimits: [{ m: 20, label: "表情が見える限界", note: "" }],
        outdoorMarks: [],
        v2: { get list() { return []; }, byId: () => null },
        library: { list: () => [], venueV2ById: () => null },
      },
      location,
      screen: { width: 1024, height: 768 },
      matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
      addEventListener: noop,
      removeEventListener: noop,
      localStorage: storage,
      URLSearchParams,
      Blob,
    },
    document,
    navigator: { maxTouchPoints: 0, clipboard: null },
    location,
    localStorage: storage,
    URL,
    URLSearchParams,
    Blob,
    DOMException,
    NodeFilter: { SHOW_TEXT: 4 },
    console,
    setTimeout: () => 1,
    clearTimeout: noop,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: noop,
    ResizeObserver: class { observe() {} disconnect() {} },
    WebSocket: WebSocketStub,
    performance: { now: () => 0 },
    getComputedStyle: () => ({ position: "static" }),
    fetch: async () => new Response(null, { status: 500 }),
  };
  Object.assign(context.window, {
    document,
    navigator: context.navigator,
    console,
    setTimeout: context.setTimeout,
    clearTimeout: context.clearTimeout,
    requestAnimationFrame: context.requestAnimationFrame,
    cancelAnimationFrame: noop,
    ResizeObserver: context.ResizeObserver,
  });
  return {
    context,
    elementById,
    storage,
    body,
    quotaThrows: () => quotaThrows,
    webSocketCount: () => webSocketCount,
  };
}

test("QuotaExceededError で退避できないときはゲスト参加を開始しない", () => {
  const fixture = createSessionContext();
  vm.runInNewContext(stageSource, fixture.context, { filename: "stage-sketch.js" });
  assert.ok(fixture.context.window.SHOSAI_STAGE_SESSION_BRIDGE, "実物のセッション bridge が起動する");

  fixture.storage.quotaFull = true;
  fixture.context.location.hash = "#session=room123";
  vm.runInNewContext(sessionSource, fixture.context, { filename: "stage-session.js" });

  const input = fixture.elementById("stage-session-name-input");
  input.value = "ゲストA";
  fixture.elementById("stage-session-name-form").dispatch("submit", { preventDefault: noop });

  const status = fixture.elementById("stage-session-status");
  assert.equal(
    status.textContent,
    "現在の作業を退避できなかったため、参加を止めました。ショーを書き出すか、使っていないショーを整理してから、もう一度お試しください。",
  );
  assert.equal(status.classList.contains("is-error"), true);
  assert.equal(fixture.quotaThrows(), 1);
  assert.equal(fixture.body.classList.contains("stage-session-guest"), false);
  assert.equal(fixture.webSocketCount(), 0);
});

function workerEnv(secrets = {}) {
  let assetCalls = 0;
  return {
    env: {
      ...secrets,
      ASSETS: {
        fetch: async () => {
          assetCalls += 1;
          return new Response("asset", { status: 200 });
        },
      },
    },
    assetCalls: () => assetCalls,
  };
}

test("Worker は Secret が全未設定の公開URLを503で停止する", async () => {
  const fixture = workerEnv();
  const response = await worker.fetch(new Request("https://example.com/index.html"), fixture.env, {});
  assert.equal(response.status, 503);
  assert.equal(await response.text(), "認証設定が未完了のため停止しています。");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Content-Type"), "text/plain; charset=utf-8");
  assert.equal(fixture.assetCalls(), 0);
});

test("Worker は Secret が全未設定でもローカルホストだけ配信する", async () => {
  for (const url of [
    "http://localhost/index.html",
    "http://127.0.0.1/index.html",
    "http://[::1]/index.html",
    "http://preview.localhost/index.html",
  ]) {
    const fixture = workerEnv();
    const response = await worker.fetch(new Request(url), fixture.env, {});
    assert.equal(response.status, 200, url);
    assert.equal(fixture.assetCalls(), 1, url);
  }
});

test("Worker は片側だけの Secret をローカルでも必ず503にする", async () => {
  for (const secrets of [
    { SITE_USER: "owner" },
    { SITE_USER: "owner", GUEST_USER: "guest", GUEST_PASS: "guest-pass" },
    { SITE_USER: "owner", SITE_PASS: "owner-pass", GUEST_USER: "guest" },
  ]) {
    const fixture = workerEnv(secrets);
    const response = await worker.fetch(new Request("http://localhost/index.html"), fixture.env, {});
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.equal(body, "認証設定が未完了のため停止しています。");
    Object.values(secrets).forEach((secret) => assert.equal(body.includes(secret), false));
    assert.equal(fixture.assetCalls(), 0);
  }
});

test("Worker は完全な一組と正しい Basic 認証を従来どおり受け付ける", async () => {
  for (const [secrets, credential] of [
    [{ SITE_USER: "owner", SITE_PASS: "owner-pass" }, "owner:owner-pass"],
    [{ GUEST_USER: "guest", GUEST_PASS: "guest-pass" }, "guest:guest-pass"],
  ]) {
    const fixture = workerEnv(secrets);
    const request = new Request("https://example.com/index.html", {
      headers: { Authorization: `Basic ${btoa(credential)}` },
    });
    const response = await worker.fetch(request, fixture.env, {});
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "asset");
    assert.equal(fixture.assetCalls(), 1);
  }
});

const freshSource = sourceBetween(
  stageSource,
  "  const STAGE_KEYS = [",
  "  const STORAGE_KEY = \"shosai-stage-sketch-v1\"",
);

function runFresh({ hostname, search = "?fresh", confirmResult = false }) {
  const removed = [];
  const confirmations = [];
  const replacements = [];
  const warnings = [];
  const location = {
    hostname,
    search,
    pathname: "/stage.html",
    replace(value) { replacements.push(value); },
  };
  const context = {
    window: {
      location,
      confirm(message) {
        confirmations.push(message);
        return confirmResult;
      },
    },
    localStorage: { removeItem(key) { removed.push(key); } },
    URLSearchParams,
    console: { warn(message) { warnings.push(message); } },
  };
  const outcome = vm.runInNewContext(
    `(() => {\n${freshSource}\nreturn "continued";\n})()`,
    context,
    { filename: "stage-sketch-fresh.js" },
  );
  return { confirmations, outcome, removed, replacements, warnings };
}

test("公開URLの ?fresh は警告だけを出し、削除せず通常初期化を続ける", () => {
  const result = runFresh({ hostname: "example.com", confirmResult: true });
  assert.equal(result.outcome, "continued");
  assert.deepEqual(result.removed, []);
  assert.deepEqual(result.confirmations, []);
  assert.deepEqual(result.replacements, []);
  assert.deepEqual(result.warnings, ["?fresh はローカル環境でのみ使用できます。"]);
});

test("ローカルの ?fresh は日本語確認を一度出し、キャンセルなら何も消さない", () => {
  const result = runFresh({ hostname: "localhost", confirmResult: false });
  assert.equal(result.outcome, "continued");
  assert.deepEqual(result.confirmations, [
    "この端末に保存した舞台スケッチのショーをすべて消して、初回と同じ状態で開き直します。書き出していないショーは戻せません。続けますか？",
  ]);
  assert.deepEqual(result.removed, []);
  assert.deepEqual(result.replacements, []);
  assert.deepEqual(result.warnings, []);
});

test("ローカルで英語確認を承認したときだけ6キーを消し、URL指定を持ち越す", () => {
  const result = runFresh({
    hostname: "localhost",
    search: "?fresh&lang=en&sample&seam-sample",
    confirmResult: true,
  });
  assert.equal(result.outcome, undefined);
  assert.deepEqual(result.confirmations, [
    "This will delete every stage sketch show saved on this device and reopen as a first-time visit. Shows you have not exported cannot be recovered. Continue?",
  ]);
  assert.deepEqual(result.removed, [
    "shosai-stage-sketch-v1",
    "shosai-stage-shows-v1",
    "shosai-stage-tour-v1",
    "shosai-stage-lang",
    "shosai-stage-venues-v1",
    "shosai-stage-shows-broken-v1",
  ]);
  assert.deepEqual(result.replacements, ["/stage.html?lang=en&sample&seam-sample"]);
  assert.deepEqual(result.warnings, []);
});

test("?fresh の許可ホストは file と localhost 系だけに限る", () => {
  for (const hostname of ["", "localhost", "127.0.0.1", "::1", "[::1]", "preview.localhost"]) {
    const result = runFresh({ hostname, confirmResult: false });
    assert.equal(result.confirmations.length, 1, hostname || "file://");
    assert.equal(result.warnings.length, 0, hostname || "file://");
  }
  for (const hostname of ["example.com", "localhost.example"]) {
    const result = runFresh({ hostname, confirmResult: false });
    assert.equal(result.confirmations.length, 0, hostname);
    assert.equal(result.warnings.length, 1, hostname);
  }
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const SHOWS_KEY = "shosai-stage-shows-v1";
const BROKEN_KEY = "shosai-stage-shows-broken-v1";

function noop() {}

function createClassList() {
  const values = new Set();
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
    set(target, prop, value) { target[prop] = value; return true; },
  });
}

function createElementStub(tagName = "div") {
  const listeners = new Map();
  let html = "";
  const element = {
    tagName: tagName.toUpperCase(),
    style: { setProperty: noop, removeProperty: noop },
    dataset: {},
    classList: createClassList(),
    className: "",
    children: [],
    width: 1200,
    height: 800,
    clientWidth: 1200,
    clientHeight: 800,
    value: "",
    checked: false,
    hidden: false,
    disabled: false,
    textContent: "",
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
    remove: noop,
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
  Object.defineProperty(element, "innerHTML", {
    get() { return html; },
    set(value) {
      html = String(value);
      if (html === "") element.children = [];
    },
  });
  return element;
}

function createFixture(initial = {}, options = {}) {
  const values = new Map(Object.entries(initial));
  const elements = new Map();
  const rafCallbacks = [];
  const confirmations = [];
  const downloads = [];
  const replacements = [];
  const blobsByUrl = new Map();
  let nextBlobUrl = 1;
  const elementById = (id) => {
    if (!elements.has(id)) elements.set(id, createElementStub(id.includes("canvas") ? "canvas" : "div"));
    return elements.get(id);
  };
  const storage = {
    failShowsWrite: false,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) {
      if (this.failShowsWrite && key === SHOWS_KEY) throw new DOMException("full", "QuotaExceededError");
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); },
  };
  const location = {
    hostname: options.hostname ?? "localhost",
    search: options.search ?? "",
    pathname: "/stage.html",
    hash: "",
    replace(value) { replacements.push(value); },
  };
  const urlApi = {
    createObjectURL(blob) {
      const url = `blob:test-${nextBlobUrl}`;
      nextBlobUrl += 1;
      blobsByUrl.set(url, blob);
      return url;
    },
    revokeObjectURL(url) { blobsByUrl.delete(url); },
  };
  const document = {
    readyState: "complete",
    documentElement: { classList: createClassList() },
    body: createElementStub("body"),
    getElementById: elementById,
    createElement(tagName) {
      const element = createElementStub(tagName);
      if (String(tagName).toLowerCase() === "a") {
        element.click = () => downloads.push({
          blob: blobsByUrl.get(element.href),
          filename: element.download,
        });
      }
      return element;
    },
    createTextNode: (text) => ({ textContent: String(text) }),
    createTreeWalker: () => ({ nextNode: () => null }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    removeEventListener: noop,
  };
  const context = {
    window: {
      SHOSAI_VENUES: {
        get list() {
          return [{
            id: "proscenium", label: "プロセニアム", short: "プロセ", audience: "front", frame: true,
            sizes: [{ id: "mid", label: "中劇場", width: 12, depth: 9, height: 8 }],
            note: "", source: "", outline: [[0, 0], [12, 0], [12, 9], [0, 9]], audienceAreas: [],
          }];
        },
        byId(id) { return this.list.find((venue) => venue.id === id) || this.list[0]; },
        sizeById(venue, id) { return venue.sizes.find((size) => size.id === id) || venue.sizes[0]; },
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
      confirm(message) {
        confirmations.push(message);
        return options.confirmResult ?? true;
      },
      alert: noop,
      URLSearchParams,
      Blob,
      URL: urlApi,
    },
    document,
    navigator: { maxTouchPoints: 0, clipboard: null },
    location,
    localStorage: storage,
    URL: urlApi,
    URLSearchParams,
    Blob,
    DOMException,
    NodeFilter: { SHOW_TEXT: 4 },
    console,
    setTimeout: () => 1,
    clearTimeout: noop,
    requestAnimationFrame(callback) { rafCallbacks.push(callback); return rafCallbacks.length; },
    cancelAnimationFrame: noop,
    ResizeObserver: class { observe() {} disconnect() {} },
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
  vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
  return {
    context,
    storage,
    values,
    elementById,
    confirmations,
    downloads,
    replacements,
    shelveNow: () => context.window.SHOSAI_STAGE_SESSION_BRIDGE.shelveNow(),
    flushAnnouncement() { rafCallbacks.at(-1)?.(); },
  };
}

function rebuildButton(fixture) {
  fixture.elementById("stage-shows-open").dispatch("click");
  const warning = fixture.elementById("stage-show-list").children[0];
  assert.equal(warning.className, "stage-show-row is-current");
  assert.equal(warning.children[1].textContent, "ショー一覧を作り直す");
  return { button: warning.children[1], warning };
}

test("壊れた棚は shelveNow で上書きされず false を返す", () => {
  const raw = "{ broken";
  const fixture = createFixture({ [SHOWS_KEY]: raw });
  assert.equal(fixture.shelveNow(), false);
  assert.equal(fixture.values.get(SHOWS_KEY), raw);
});

test("壊れた棚の原文を隔離キーへ退避する", () => {
  const raw = "{ broken";
  const fixture = createFixture({ [SHOWS_KEY]: raw });
  assert.equal(fixture.shelveNow(), false);
  assert.equal(fixture.values.get(BROKEN_KEY), raw);
  assert.equal(fixture.values.get(SHOWS_KEY), raw);
});

test("隔離キーに既存値があれば上書きしない", () => {
  const fixture = createFixture({ [SHOWS_KEY]: "{ broken", [BROKEN_KEY]: "first broken shelf" });
  assert.equal(fixture.shelveNow(), false);
  assert.equal(fixture.values.get(BROKEN_KEY), "first broken shelf");
});

test("キー無し・空文字・空オブジェクトは正常な空として保存できる", () => {
  for (const initial of [{}, { [SHOWS_KEY]: "" }, { [SHOWS_KEY]: "{}" }]) {
    const fixture = createFixture(initial);
    assert.equal(fixture.shelveNow(), true);
    assert.equal(fixture.values.has(BROKEN_KEY), false);
    const shelf = JSON.parse(fixture.values.get(SHOWS_KEY));
    assert.equal(Object.keys(shelf).length, 1);
  }
});

test("配列の棚も壊れ扱いにして原文を保ち、書き込みを止める", () => {
  const raw = '[{"id":"lost-show"}]';
  const fixture = createFixture({ [SHOWS_KEY]: raw });
  assert.equal(fixture.shelveNow(), false);
  assert.equal(fixture.values.get(SHOWS_KEY), raw);
  assert.equal(fixture.values.get(BROKEN_KEY), raw);
});

test("壊れた棚の警告は退避状態で分岐せず、書き出してから消すと案内する", () => {
  const raw = "{ broken";
  const fixture = createFixture({ [SHOWS_KEY]: raw });
  const { warning } = rebuildButton(fixture);
  assert.equal(
    warning.children[0].children[1].textContent,
    "勝手に他のショーを消さないため、壊れた一覧には書き込みません。「ショー一覧を作り直す」を押すと、壊れた元データをファイルへ書き出してから消します。先に、開いているショーもファイルへ書き出しておくと安全です。",
  );
});

test("作り直しは、消す前に壊れた原文をダウンロードへ流す", async () => {
  const raw = '{"shows": broken';
  const fixture = createFixture({ [SHOWS_KEY]: raw });
  rebuildButton(fixture).button.dispatch("click");
  assert.equal(fixture.downloads.length, 1);
  assert.match(fixture.downloads[0].filename, /^舞台スケッチ-壊れたショー一覧-\d{8}-\d{4}\.json$/);
  assert.ok(fixture.downloads[0].blob instanceof Blob);
  assert.equal(await fixture.downloads[0].blob.text(), raw);
});

test("作り直しの確認をキャンセルすると1バイトも消さない", async () => {
  const raw = "{ first broken shelf";
  const backup = "first broken shelf backup";
  const fixture = createFixture(
    { [SHOWS_KEY]: raw, [BROKEN_KEY]: backup },
    { confirmResult: false },
  );
  rebuildButton(fixture).button.dispatch("click");
  await Promise.resolve();
  assert.equal(fixture.downloads.length, 1, "確認前にダウンロードは始まる");
  assert.equal(fixture.values.get(SHOWS_KEY), raw);
  assert.equal(fixture.values.get(BROKEN_KEY), backup);
  assert.equal(fixture.shelveNow(), false, "shelfCorrupt も解除しない");
});

test("作り直しの確認でOKすると両方の壊れた値を消して棚を再構築する", async () => {
  const raw = "{ broken";
  const fixture = createFixture({ [SHOWS_KEY]: raw });
  rebuildButton(fixture).button.dispatch("click");
  await Promise.resolve();
  const rebuilt = JSON.parse(fixture.values.get(SHOWS_KEY));
  assert.equal(Object.keys(rebuilt).length, 1);
  assert.equal(fixture.values.has(BROKEN_KEY), false);
  assert.equal(fixture.shelveNow(), true);
  fixture.flushAnnouncement();
  assert.equal(fixture.elementById("stage-live").textContent, "ショー一覧を作り直しました。");
});

test("作り直し後に再び壊れると、2回目の原文を退避し直す", async () => {
  const first = "{ first broken";
  const second = "{ second broken";
  const fixture = createFixture({ [SHOWS_KEY]: first });
  rebuildButton(fixture).button.dispatch("click");
  await Promise.resolve();
  assert.equal(fixture.values.has(BROKEN_KEY), false, "1回目の退避値は消える");
  fixture.values.set(SHOWS_KEY, second);
  assert.equal(fixture.shelveNow(), false);
  assert.equal(fixture.values.get(SHOWS_KEY), second);
  assert.equal(fixture.values.get(BROKEN_KEY), second);
});

test("?fresh をローカルで承認すると退避キーも実際に消す", () => {
  const fixture = createFixture(
    { [SHOWS_KEY]: "{ broken", [BROKEN_KEY]: "backup" },
    { search: "?fresh", confirmResult: true },
  );
  assert.equal(fixture.confirmations.length, 1);
  assert.equal(fixture.values.has(SHOWS_KEY), false);
  assert.equal(fixture.values.has(BROKEN_KEY), false);
  assert.deepEqual(fixture.replacements, ["/stage.html"]);
});

test("deleteShow は棚へ書けない場合に削除せず、失敗を告知する", () => {
  const fixture = createFixture();
  assert.equal(fixture.shelveNow(), true);
  const shelf = JSON.parse(fixture.values.get(SHOWS_KEY));
  const current = Object.values(shelf)[0];
  const other = structuredClone(current);
  other.state.project.id = "show-other";
  other.state.project.title = "消してはいけないショー";
  shelf[other.state.project.id] = other;
  fixture.values.set(SHOWS_KEY, JSON.stringify(shelf));
  fixture.elementById("stage-shows-open").dispatch("click");
  const row = fixture.elementById("stage-show-list").children
    .find((item) => item.children[0]?.children[0]?.textContent === "消してはいけないショー");
  assert.ok(row, "削除対象の行が実際に描画される");
  fixture.storage.failShowsWrite = true;
  row.children[1].dispatch("click");
  assert.ok(JSON.parse(fixture.values.get(SHOWS_KEY))["show-other"], "書き込み失敗後も対象が残る");
  fixture.flushAnnouncement();
  assert.equal(
    fixture.elementById("stage-live").textContent,
    "ショー一覧を更新できなかったため、消していません。",
  );
});

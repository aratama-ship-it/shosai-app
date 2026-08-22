import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

function noop() {}

function createClassList() {
  return { add: noop, remove: noop, toggle: noop, contains: () => false };
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
  const element = {
    tagName: tagName.toUpperCase(),
    style: { setProperty: noop, removeProperty: noop },
    dataset: {},
    classList: createClassList(),
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
    innerHTML: "",
    addEventListener: noop,
    removeEventListener: noop,
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
    scrollIntoView: noop,
    contains: () => false,
    closest: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 }),
    getContext: () => createCanvasContext(),
    toDataURL: () => "data:image/png;base64,",
  };
  return element;
}

const elements = new Map();
const elementById = (id) => {
  if (!elements.has(id)) elements.set(id, createElementStub(id.includes("canvas") ? "canvas" : "div"));
  return elements.get(id);
};

const storage = new Map();
const locationStub = { hostname: "localhost", search: "", pathname: "/stage.html", hash: "", replace: noop };
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
      sizeById(venue, id) { return (venue.sizes || []).find((size) => size.id === id) || venue.sizes[0]; },
      seats: [{ id: "center", label: "中央", x: 0.5, z: 1.3 }],
      seatById(id) { return this.seats.find((seat) => seat.id === id) || this.seats[0]; },
      sightLimits: [{ m: 20, label: "表情が見える限界", note: "" }],
      outdoorMarks: [],
      v2: { get list() { return []; }, byId: () => null },
      library: { list: () => [], venueV2ById: () => null },
    },
    location: locationStub,
    screen: { width: 1024, height: 768 },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    addEventListener: noop,
    removeEventListener: noop,
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    URLSearchParams,
    Blob,
  },
  document: {
    readyState: "complete",
    documentElement: { classList: createClassList() },
    body: createElementStub("body"),
    getElementById: elementById,
    createElement: createElementStub,
    createTextNode: (text) => ({ textContent: String(text) }),
    createTreeWalker: () => ({ nextNode: () => null }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    removeEventListener: noop,
  },
  navigator: { maxTouchPoints: 0, clipboard: null },
  location: locationStub,
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  URL,
  URLSearchParams,
  Blob,
  NodeFilter: { SHOW_TEXT: 4 },
  console,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: noop,
  ResizeObserver: class { observe() {} disconnect() {} },
};
context.window.document = context.document;
context.window.navigator = context.navigator;
context.window.console = console;
context.window.setTimeout = setTimeout;
context.window.clearTimeout = clearTimeout;
context.window.requestAnimationFrame = context.requestAnimationFrame;
context.window.cancelAnimationFrame = noop;
context.window.ResizeObserver = context.ResizeObserver;
vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
const body = context.window.SHOSAI_STAGE_BODY;

const plain = (value) => JSON.parse(JSON.stringify(value));

test("normalizeLook は設定が無ければ null を返す", () => {
  assert.equal(body.normalizeLook(undefined), null);
  assert.equal(body.normalizeLook(null), null);
  assert.equal(body.normalizeLook("x"), null);
});

test("normalizeLook は有効な look の値を保つ", () => {
  assert.deepEqual(plain(body.normalizeLook({
    skin: "#123abc",
    hair: { style: "short", color: "#2a2320" },
    top: { kind: "tank", color: "#aabbcc", sleeve: "none" },
    bottom: { kind: "shorts", color: "#334455", length: "mini" },
  })), {
    skin: "#123abc",
    hair: { style: "short", color: "#2a2320" },
    top: { kind: "tank", color: "#aabbcc", sleeve: "none" },
    bottom: { kind: "shorts", color: "#334455", length: "mini" },
  });
});

test("normalizeLook は未知の種類 id を保存値として残す", () => {
  const look = body.normalizeLook({
    hair: { style: "kimono_v9" },
    top: { kind: "kimono_v9", sleeve: "wide_v9" },
    bottom: { kind: "hakama_v9", length: "custom_v9" },
  });
  assert.equal(look.hair.style, "kimono_v9");
  assert.equal(look.top.kind, "kimono_v9");
  assert.equal(look.top.sleeve, "wide_v9");
  assert.equal(look.bottom.kind, "hakama_v9");
  assert.equal(look.bottom.length, "custom_v9");
});

test("normalizeLook は半透明色を既定色へ落とす", () => {
  const look = body.normalizeLook({
    skin: "#ffffff80",
    hair: { color: "rgba(0,0,0,.5)" },
    top: { color: "#ffffff80" },
    bottom: { color: "rgba(0,0,0,.5)" },
  });
  assert.equal(look.skin, "#d9b38c");
  assert.equal(look.hair.color, "#2a2320");
  assert.equal(look.top.color, "#a84b26");
  assert.equal(look.bottom.color, "#3a3f4a");
});

test("種類の引き当ては未知 id を既定へ落とし、引数を書き換えない", () => {
  const id = "kimono_v9";
  assert.equal(body.topKindById(id).id, "tshirt");
  assert.equal(id, "kimono_v9");
});

test("resolveLook は cast / plain / custom / 対象外を分ける", () => {
  const castLook = body.normalizeLook({ top: { kind: "tank" } });
  const customLook = body.normalizeLook({ top: { kind: "longtee" } });
  const cast = [{ id: "cast-1", look: castLook }];

  assert.strictEqual(body.resolveLook({ type: "performer", castId: "cast-1" }, cast), castLook);
  assert.equal(body.resolveLook({ type: "performer", lookMode: "plain", castId: "cast-1" }, cast), null);
  assert.strictEqual(body.resolveLook({
    type: "performer",
    lookMode: "custom",
    castId: "cast-1",
    look: customLook,
  }, cast), customLook);
  assert.equal(body.resolveLook({ type: "performer" }, cast), null);
  assert.equal(body.resolveLook({ type: "prop", castId: "cast-1" }, cast), null);
});

test("LENGTHS と SLEEVES は必須キーを持ち、t が昇順", () => {
  [body.LENGTHS, body.SLEEVES].forEach((table) => {
    let last = -Infinity;
    Object.values(table).forEach((item) => {
      assert.equal(typeof item.id, "string");
      assert.equal(typeof item.label, "string");
      assert.equal(typeof item.labelEn, "string");
      assert.equal(typeof item.t, "number");
      assert.ok(item.t >= last);
      last = item.t;
    });
  });
});

test("衣装・髪型の種類は必須キーを持つ", () => {
  Object.values(body.TOP_KINDS).forEach((item) => {
    ["id", "label", "labelEn", "collar", "sleeve", "shells"].forEach((key) => {
      assert.ok(key in item, key);
    });
  });
  Object.values(body.BOTTOM_KINDS).forEach((item) => {
    ["id", "label", "labelEn", "length", "shells"].forEach((key) => {
      assert.ok(key in item, key);
    });
  });
  Object.values(body.HAIR_STYLES).forEach((item) => {
    ["id", "label", "labelEn", "parts"].forEach((key) => {
      assert.ok(key in item, key);
    });
  });
});

test("STASH_KEYS は lookMode と look を控える", () => {
  const stash = stageSource.match(/const STASH_KEYS = \[([\s\S]*?)\];/);
  assert.ok(stash, "STASH_KEYS がある");
  assert.match(stash[1], /"lookMode"/);
  assert.match(stash[1], /"look"/);
});

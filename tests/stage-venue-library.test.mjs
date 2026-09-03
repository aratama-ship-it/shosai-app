import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const venuesSource = await readFile(new URL("stage-venues.js", root), "utf8");
const linesSource = await readFile(new URL("stage-venue-lines.js", root), "utf8");
const sketchSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const editorSource = await readFile(new URL("stage-venue-editor.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");
const stageHtml = await readFile(new URL("stage.html", root), "utf8");
const swSource = await readFile(new URL("stage-sw.js", root), "utf8");

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const venue = (id, label = id, sharing = "ok") => ({
  format: "venue-v2",
  id,
  label,
  basis: "custom",
  scale: { gridM: 1, confidence: "approx" },
  floor: { outline: [[2, 2], [14, 2], [14, 10], [2, 10]], levels: [] },
  ceiling: { heightM: 6, rigging: "none" },
  audience: [],
  fixtures: [],
  access: [],
  provenance: { source: "記憶", confidence: "low", sharing },
});

function loadModels(storage = new MemoryStorage()) {
  const window = {
    localStorage: storage,
    dispatchEvent() {},
    CustomEvent: class CustomEvent {
      constructor(type) { this.type = type; }
    },
  };
  window.window = window;
  const context = vm.createContext({
    window,
    document: { getElementById: () => null },
    console,
  });
  vm.runInContext(venuesSource, context, { filename: "stage-venues.js" });
  vm.runInContext(sketchSource, context, { filename: "stage-sketch.js" });
  return { storage, venues: window.SHOSAI_VENUES, io: window.SHOSAI_STAGE_PROJECT_IO };
}

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.listeners = new Map();
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.value = "";
    this.options = [];
    this.files = [];
    this.tagName = "BUTTON";
    this.children = [];
    this._textContent = "";
  }

  get textContent() { return this._textContent; }
  set textContent(value) {
    this._textContent = String(value);
    if (value === "") this.children = [];
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  dispatchEvent(event) {
    event.target = event.target || this;
    event.currentTarget = this;
    (this.listeners.get(event.type) || []).forEach((listener) => listener(event));
    return true;
  }

  click() { this.dispatchEvent({ type: "click", preventDefault() {} }); }
  setAttribute(name, value) { this[name] = String(value); }
  append(...children) { this.children.push(...children); }
  focus() {}
}

function loadEditor(storage = new MemoryStorage()) {
  const ids = [
    "stage-venue-editor-open", "stage-venue-editor-backdrop", "stage-venue-editor-modal",
    "stage-venue-editor-close", "stage-venue-editor-dims", "stage-venue-editor-status",
    "stage-venue-editor-audience-selection", "stage-venue-editor-audience-mode",
    "stage-venue-editor-audience-mode-text", "stage-venue-editor-audience-remove",
    "stage-venue-editor-object-selection", "stage-venue-editor-object-movable",
    "stage-venue-editor-object-remove", "stage-venue-editor-access-type",
    "stage-venue-editor-probe-tool", "stage-venue-editor-probe-reach",
    "stage-venue-editor-probe-reach-value", "stage-venue-editor-probe-status",
    "stage-venue-editor-name", "stage-venue-editor-source", "stage-venue-editor-confidence",
    "stage-venue-editor-sharing", "stage-venue-editor-save", "stage-venue-editor-save-status",
    "stage-venue-library-export", "stage-venue-library-import", "stage-venue-library-status",
    "stage-venue-import-backdrop", "stage-venue-import-modal", "stage-venue-import-close",
    "stage-venue-import-summary", "stage-venue-import-list", "stage-venue-import-confirm",
    "stage-venue-import-cancel",
    "stage-size-select", "stage-venue-w", "stage-venue-d", "stage-venue-h",
  ];
  const elements = new Map(ids.map((id) => [id, new FakeElement(id)]));
  const canvas = new FakeElement("stage-venue-editor-canvas");
  canvas.tagName = "CANVAS";
  canvas.width = 960;
  canvas.height = 640;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 960, height: 640 });
  canvas.setPointerCapture = () => {};
  const drawFills = [];
  const context2d = new Proxy({
    fill() { drawFills.push(this.fillStyle); },
  }, {
    get(target, property) {
      if (!(property in target)) target[property] = () => {};
      return target[property];
    },
    set(target, property, value) { target[property] = value; return true; },
  });
  canvas.getContext = () => context2d;
  elements.set(canvas.id, canvas);

  elements.get("stage-venue-editor-name").tagName = "INPUT";
  elements.get("stage-venue-editor-name").value = "柱・什器・扉の部屋";
  elements.get("stage-venue-editor-source").value = "記憶";
  elements.get("stage-venue-editor-confidence").value = "low";
  elements.get("stage-venue-editor-sharing").value = "ok";
  elements.get("stage-venue-editor-access-type").value = "entrance";
  elements.get("stage-venue-editor-probe-tool").value = "unspecified";
  elements.get("stage-venue-editor-probe-tool").options = [
    { value: "juggling", disabled: false },
    { value: "diabolo", disabled: false },
    { value: "aerial", disabled: false },
    { value: "unspecified", disabled: false },
  ];
  elements.get("stage-venue-editor-probe-reach").value = "3";
  elements.get("stage-size-select").value = "custom";
  elements.get("stage-size-select").options = [{ value: "custom" }];
  elements.get("stage-venue-library-import").tagName = "INPUT";
  elements.get("stage-venue-import-backdrop").hidden = true;
  elements.get("stage-venue-import-modal").hidden = true;

  const makeButtons = (values, dataKey) => values.map((value) => {
    const button = new FakeElement();
    button.dataset[dataKey] = value;
    return button;
  });
  const selectors = new Map([
    ["[data-venue-editor-shape]", makeButtons(["rectangle", "l-shape", "circle", "trapezoid"], "venueEditorShape")],
    ["[data-venue-editor-mode]", makeButtons(["select", "column", "furniture", "door"], "venueEditorMode")],
    ["[data-venue-editor-furniture-height]", makeButtons(["knee", "waist", "person", "ceiling"], "venueEditorFurnitureHeight")],
    ["[data-venue-editor-ceiling-height]", makeButtons(["3", "4", "6", "8", "10"], "venueEditorCeilingHeight")],
    ["[data-venue-editor-rigging]", makeButtons(["none", "limited", "full"], "venueEditorRigging")],
    ["[data-venue-editor-line-toggle]", makeButtons(["movement", "fall", "blind", "sight"], "venueEditorLineToggle")],
  ]);
  const documentListeners = new Map();
  const document = {
    documentElement: {},
    activeElement: null,
    getElementById: (id) => elements.get(id) || null,
    querySelectorAll: (selector) => selectors.get(selector) || [],
    addEventListener(type, listener) { documentListeners.set(type, listener); },
    createElement: (tagName) => {
      const element = new FakeElement();
      element.tagName = String(tagName).toUpperCase();
      return element;
    },
  };
  class FakeEvent {
    constructor(type) { this.type = type; }
  }
  class FakeCustomEvent extends FakeEvent {
    constructor(type, init = {}) { super(type); this.detail = init.detail; }
  }
  const fileReads = [];
  class FakeFileReader {
    readAsText(file) {
      fileReads.push(file);
      if (file.readError) {
        if (this.onerror) this.onerror();
        return;
      }
      this.result = file.contents;
      if (this.onload) this.onload();
    }
  }
  const window = {
    localStorage: storage,
    dispatchEvent() {},
    CustomEvent: FakeCustomEvent,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) { callback(); },
  };
  window.window = window;
  const vmContext = vm.createContext({
    window,
    document,
    console,
    Event: FakeEvent,
    CustomEvent: FakeCustomEvent,
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    Blob: class Blob {},
    FileReader: FakeFileReader,
    URL,
  });
  vm.runInContext(venuesSource, vmContext, { filename: "stage-venues.js" });
  vm.runInContext(linesSource, vmContext, { filename: "stage-venue-lines.js" });
  vm.runInContext(editorSource, vmContext, { filename: "stage-venue-editor.js" });

  const button = (selector, value, dataKey) =>
    selectors.get(selector).find((item) => item.dataset[dataKey] === value);
  const pointEvent = (type, point, pointerId = 1) => {
    const scale = 36.25;
    return {
      type,
      button: 0,
      pointerId,
      clientX: 45 + (point[0] * scale),
      clientY: 30 + (point[1] * scale),
      preventDefault() {},
    };
  };
  const pointer = (type, point, pointerId = 1) => canvas.dispatchEvent(pointEvent(type, point, pointerId));
  return { window, elements, button, pointer, storage, drawFills, selectors, documentListeners, fileReads };
}

function selectLibraryFile(editor, document, options = {}) {
  const contents = typeof document === "string" ? document : JSON.stringify(document);
  const input = editor.elements.get("stage-venue-library-import");
  input.files = [{ contents, size: options.size ?? contents.length, readError: options.readError }];
  input.dispatchEvent({ type: "change" });
}

test("旧下書きは一度だけ会場ライブラリへ取り込み、旧キーを残す", () => {
  const old = venue("custom-room-1", "旧下書き", "internal-only");
  const storage = new MemoryStorage({ "stage-venue-drafts-v1": JSON.stringify([old]) });
  const first = loadModels(storage);
  assert.equal(first.venues.library.list().length, 1);
  assert.equal(first.venues.library.list()[0].label, "旧下書き");
  assert.equal(storage.getItem("stage-venue-drafts-v1"), JSON.stringify([old]));

  const second = loadModels(storage);
  assert.equal(second.venues.library.list().length, 1, "再起動で旧下書きを重複取り込みしない");
});

test("会場セレクト用一覧は既存10プリセットの後ろにライブラリ会場を並べる", () => {
  const storage = new MemoryStorage({
    "shosai-stage-venues-v1": JSON.stringify([venue("hall-a", "大広間")]),
  });
  const { venues } = loadModels(storage);
  assert.deepEqual(
    Array.from(venues.list, (item) => item.id),
    [
      "proscenium", "thrust", "arena", "outdoor", "blackbox",
      "chapiteau", "circus-theatre", "theatre-tram", "tohu", "cirque-dhiver",
      "hall-a",
    ],
  );
  assert.equal(venues.byId("hall-a").custom, true);
  assert.deepEqual(Array.from(venues.byId("hall-a").outline[0]), [2, 2]);
});

test("SHOSAI_VENUES.listの先頭5プリセットは値も並びも変えない", () => {
  const { venues } = loadModels();
  const firstFive = JSON.stringify(venues.list.slice(0, 5));
  assert.deepEqual(
    Array.from(venues.list.slice(0, 5), (item) => item.id),
    ["proscenium", "thrust", "arena", "outdoor", "blackbox"],
  );
  assert.equal(
    createHash("sha256").update(firstFive).digest("hex"),
    "bd4b49075c112d3faebd32c1b6101cc6d92fc2fc8e059ab2e9741b7f0302bd4b",
  );
});

test("柱・什器・扉・天井とmovableは会場ライブラリを往復する", () => {
  const storage = new MemoryStorage();
  const first = loadModels(storage);
  const complete = venue("fixture-room", "設営確認室");
  complete.ceiling = { heightM: 4, rigging: "none", note: "段階選択" };
  complete.fixtures = [
    { type: "column", at: [7, 6], radiusM: 0.4, heightM: 4, label: "柱", movable: false },
    { type: "furniture", polygon: [[10, 6], [12, 6], [12, 8], [10, 8]], heightM: 1, label: "什器", movable: true },
  ];
  complete.access = [{ type: "entrance", at: [8, 2], widthM: 1.2, label: "扉" }];
  assert.equal(first.venues.library.importVenues([complete]).imported, 1);

  const document = first.venues.library.exportDocument();
  const restoredStorage = new MemoryStorage({
    "shosai-stage-venues-v1": JSON.stringify(document),
  });
  const restored = loadModels(restoredStorage).venues.library.list()[0];
  assert.deepEqual(JSON.parse(JSON.stringify(restored.ceiling)), complete.ceiling);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.fixtures)), complete.fixtures);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.access)), complete.access);
  assert.deepEqual(Array.from(restored.fixtures, (item) => item.movable), [false, true]);
});

test("エディタ操作で柱1本・什器1つ・扉1つと独立した天井条件をvenue-v2保存できる", () => {
  const editor = loadEditor();
  const mode = (value) => editor.button("[data-venue-editor-mode]", value, "venueEditorMode").click();

  mode("column");
  editor.pointer("pointerdown", [9, 7], 1);
  editor.pointer("pointermove", [9.8, 7], 1);
  editor.pointer("pointerup", [9.8, 7], 1);
  const movable = editor.elements.get("stage-venue-editor-object-movable");
  movable.checked = true;
  movable.dispatchEvent({ type: "change" });
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().fixtures[0].movable, true);
  movable.checked = false;
  movable.dispatchEvent({ type: "change" });

  mode("furniture");
  editor.pointer("pointerdown", [10, 6], 2);
  editor.pointer("pointermove", [12, 8], 2);
  editor.pointer("pointerup", [12, 8], 2);
  editor.button("[data-venue-editor-furniture-height]", "person", "venueEditorFurnitureHeight").click();

  mode("door");
  editor.pointer("pointerdown", [12, 4], 3);
  editor.pointer("pointerup", [12, 4], 3);
  editor.elements.get("stage-venue-editor-object-remove").click();
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().access.length, 0, "選択した扉を削除できる");
  editor.pointer("pointerdown", [12, 4], 4);
  editor.pointer("pointerup", [12, 4], 4);

  editor.button("[data-venue-editor-rigging]", "full", "venueEditorRigging").click();
  editor.button("[data-venue-editor-ceiling-height]", "4", "venueEditorCeilingHeight").click();
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().ceiling.rigging, "full", "高さを変えても吊り条件は連動しない");
  editor.button("[data-venue-editor-rigging]", "none", "venueEditorRigging").click();

  const preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal(preview.format, "venue-v2");
  assert.equal(preview.fixtures.filter((item) => item.type === "column").length, 1);
  assert.equal(preview.fixtures.filter((item) => item.type === "furniture").length, 1);
  assert.equal(preview.access.filter((item) => item.type === "entrance").length, 1);
  assert.equal(preview.access[0].widthM, 1.2);
  assert.deepEqual(Array.from(preview.fixtures, (item) => item.movable), [false, true]);
  assert.equal(preview.fixtures.find((item) => item.type === "furniture").heightM, 1.7);
  assert.deepEqual(JSON.parse(JSON.stringify(preview.ceiling)), {
    heightM: 4,
    rigging: "none",
    note: "段階選択の目安。実会場では要確認。",
  });
  assert.equal(editor.elements.get("stage-venue-h").value, "4", "既存の高さ入力欄へ橋渡しする");

  const saved = editor.window.SHOSAI_VENUE_EDITOR.save();
  assert.ok(saved);
  const restored = loadModels(editor.storage).venues.library.venueV2ById(saved.id);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.fixtures)), JSON.parse(JSON.stringify(saved.fixtures)));
  assert.deepEqual(JSON.parse(JSON.stringify(restored.access)), JSON.parse(JSON.stringify(saved.access)));
  assert.deepEqual(JSON.parse(JSON.stringify(restored.ceiling)), JSON.parse(JSON.stringify(saved.ceiling)));
});

test("会場ファイルはプレビュー確認まで書き込まず、確定したときだけ取り込む", () => {
  const storage = new MemoryStorage({
    "shosai-stage-venues-v1": JSON.stringify([venue("kept", "既存会場")]),
  });
  const editor = loadEditor(storage);
  const before = JSON.stringify(editor.window.SHOSAI_VENUES.library.list());
  const incoming = venue("previewed", "確認する会場");
  incoming.ceiling.heightM = 8;
  incoming.provenance.source = "図面";

  selectLibraryFile(editor, { kind: "shosai-stage-venue-library", version: 1, venues: [incoming] });

  assert.equal(editor.elements.get("stage-venue-import-modal").hidden, false);
  assert.equal(JSON.stringify(editor.window.SHOSAI_VENUES.library.list()), before, "確認前に書き込んでいる");
  assert.match(editor.elements.get("stage-venue-import-summary").textContent, /取り込める会場が1件/);
  assert.match(editor.elements.get("stage-venue-import-summary").textContent, /取り込めない会場が0件/);
  const cells = editor.elements.get("stage-venue-import-list").children[0].children
    .map((cell) => cell.textContent);
  assert.deepEqual(cells, ["確認する会場", "12m", "8m", "8m", "図面"]);

  editor.elements.get("stage-venue-import-confirm").click();
  assert.equal(editor.window.SHOSAI_VENUES.library.list().length, 2);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /1件の会場を取り込みました/);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /取り込めなかった会場は0件/);
});

test("やめる・暗幕・Escapeはいずれも会場ライブラリを変えない", () => {
  const editor = loadEditor();
  const before = JSON.stringify(editor.window.SHOSAI_VENUES.library.list());
  const reopen = () => selectLibraryFile(editor, [venue("cancelled", "取り込まない会場")]);

  reopen();
  editor.elements.get("stage-venue-import-cancel").click();
  assert.equal(JSON.stringify(editor.window.SHOSAI_VENUES.library.list()), before);

  reopen();
  editor.elements.get("stage-venue-import-backdrop").click();
  assert.equal(JSON.stringify(editor.window.SHOSAI_VENUES.library.list()), before);

  reopen();
  let prevented = false;
  editor.documentListeners.get("keydown")({
    key: "Escape",
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, true);
  assert.equal(editor.elements.get("stage-venue-import-modal").hidden, true);
  assert.equal(JSON.stringify(editor.window.SHOSAI_VENUES.library.list()), before);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /変更していません/);
});

test("2MB超過・壊れたJSON・壊れたvenue-v2は書き込まず理由と除外件数を出す", () => {
  const editor = loadEditor();
  const library = editor.window.SHOSAI_VENUES.library;

  selectLibraryFile(editor, [], { size: (3 * 1024 * 1024) });
  assert.equal(editor.fileReads.length, 0, "サイズ超過ファイルをFileReaderへ渡している");
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /3\.0MB/);
  assert.equal(library.list().length, 0);

  selectLibraryFile(editor, "{broken-json");
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /JSONを読み込めませんでした/);
  assert.equal(library.list().length, 0);

  const broken = venue("broken", "高さが壊れた会場");
  broken.ceiling.heightM = 0;
  selectLibraryFile(editor, [venue("valid", "取り込める会場"), broken]);
  assert.match(editor.elements.get("stage-venue-import-summary").textContent, /取り込めない会場が1件/);
  assert.equal(library.list().length, 0, "壊れた会場の検査中に書き込んでいる");
  editor.elements.get("stage-venue-import-confirm").click();
  assert.deepEqual(Array.from(library.list(), (item) => item.id), ["valid"]);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /取り込めなかった会場は1件/);
});

test("201件は先頭200件だけ候補にし、切り捨てた1件を確認前後の文言へ出す", () => {
  const editor = loadEditor();
  const incoming = Array.from({ length: 201 }, (_, index) => venue(`venue-${index + 1}`));

  selectLibraryFile(editor, incoming);
  assert.equal(editor.window.SHOSAI_VENUES.library.list().length, 0, "件数超過の確認前に書き込んでいる");
  assert.equal(editor.elements.get("stage-venue-import-list").children.length, 200);
  assert.match(editor.elements.get("stage-venue-import-summary").textContent, /全201件のうち先頭200件/);
  assert.match(editor.elements.get("stage-venue-import-summary").textContent, /残り1件/);

  editor.elements.get("stage-venue-import-confirm").click();
  assert.equal(editor.window.SHOSAI_VENUES.library.list().length, 200);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /201件のうち200件を取り込みました/);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /残り1件/);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /取り込めなかった会場は1件/);
});

test("201件の先頭200件がすべて壊れていても、上限で切り捨てた1件を伝える", () => {
  const editor = loadEditor();
  const incoming = Array.from({ length: 201 }, (_, index) => {
    const broken = venue(`broken-${index + 1}`);
    broken.ceiling.heightM = 0;
    return broken;
  });

  selectLibraryFile(editor, incoming);
  assert.equal(editor.elements.get("stage-venue-import-modal").hidden, true);
  assert.equal(editor.window.SHOSAI_VENUES.library.list().length, 0);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /取り込めない会場が200件/);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /全201件のうち先頭200件を検査しました/);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /残り1件/);
});

test("確認モーダルの静的文言は英語対訳を持つ", () => {
  for (const id of [
    "stage-venue-import-backdrop", "stage-venue-import-modal", "stage-venue-import-summary",
    "stage-venue-import-list", "stage-venue-import-confirm", "stage-venue-import-cancel",
  ]) {
    assert.match(indexSource, new RegExp(`id="${id}"`));
  }
  for (const text of [
    "会場ライブラリの取り込み", "内容を確認してから、取り込む会場を確定してください。",
    "取り込みを確認する会場", "取り込む", "やめる",
  ]) {
    assert.ok(i18nSource.includes(JSON.stringify(text)), `${text} の英語対訳がない`);
  }
});

test("受け入れ会場で4本の線・探り針・赤い観客重なりを即時に更新しvenueへ保存しない", () => {
  const editor = loadEditor();
  const mode = (value) => editor.button("[data-venue-editor-mode]", value, "venueEditorMode").click();
  const lineArea = () => editor.window.SHOSAI_VENUE_EDITOR.getLines().result.movement.areas
    .reduce((sum, area) => sum + (area.width * area.height), 0);

  for (const point of [[12, 4], [18, 8], [12, 12]]) {
    editor.pointer("pointerdown", point);
    editor.pointer("pointerup", point);
  }

  mode("column");
  editor.pointer("pointerdown", [12, 8], 2);
  editor.pointer("pointerup", [12, 8], 2);

  mode("furniture");
  editor.pointer("pointerdown", [14, 7], 3);
  editor.pointer("pointermove", [16, 9], 3);
  editor.pointer("pointerup", [16, 9], 3);
  const movable = editor.elements.get("stage-venue-editor-object-movable");
  movable.checked = false;
  movable.dispatchEvent({ type: "change" });
  const fixedArea = lineArea();
  movable.checked = true;
  movable.dispatchEvent({ type: "change" });
  const expandedArea = lineArea();

  editor.window.SHOSAI_VENUE_EDITOR.setCeilingHeight(4);
  editor.window.SHOSAI_VENUE_EDITOR.setRigging("none");
  editor.window.SHOSAI_VENUE_EDITOR.setProbeTool("juggling");
  editor.window.SHOSAI_VENUE_EDITOR.setProbeReach(4);
  mode("select");
  editor.pointer("pointerdown", [12, 8], 4);
  editor.pointer("pointerup", [12, 10.8], 4);

  const lines = editor.window.SHOSAI_VENUE_EDITOR.getLines();
  assert.ok(lines.result.movement.areas.length > 0);
  assert.ok(expandedArea > fixedArea, "movable:trueで可動範囲が広がっていない");
  assert.equal(lines.result.movement.movableExtensions.length, 1, "可動什器の破線用輪郭がない");
  assert.ok(lines.result.blindSpots.areas.length > 0, "柱の後ろに死角がない");
  assert.equal(lines.result.sightLimits.length, 0, "小部屋なのに20m/35m線がある");
  assert.deepEqual(Array.from(lines.probe.at), [12, 10.8], "pointerup位置で探り針を正確に確定していない");
  assert.equal(lines.result.fall.audienceOverlap, true);
  assert.ok(editor.drawFills.includes("rgba(238,55,48,0.88)"), "観客との重なりを赤く塗っていない");
  assert.match(editor.elements.get("stage-venue-editor-probe-status").textContent, /赤く表示/);

  const savedShape = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal("lines" in savedShape, false);
  assert.equal("probe" in savedShape, false);
  assert.ok(editor.selectors.get("[data-venue-editor-line-toggle]").every((input) => input.checked));
  const aerial = editor.elements.get("stage-venue-editor-probe-tool").options
    .find((option) => option.value === "aerial");
  assert.equal(aerial.disabled, true, "吊り不可でエアリアルが選択可能になっている");
});

test("未知の会場IDは元IDを持つmissing会場になり、プロセニアムへ化けない", () => {
  const { venues } = loadModels();
  const missing = venues.byId("not-on-this-device");
  const mid = venues.byId("proscenium").sizes.find((size) => size.id === "mid");
  assert.equal(missing.id, "not-on-this-device");
  assert.equal(missing.label, "（見つからない会場）");
  assert.equal(missing.missing, true);
  assert.deepEqual(JSON.parse(JSON.stringify(missing.sizes[0])), JSON.parse(JSON.stringify(mid)));
});

test("version 3は会場ライブラリを変更せず従来どおりprojectを読める", () => {
  const { venues, io } = loadModels();
  const before = venues.library.list();
  const result = io.prepareImportDocument({
    kind: "shosai-stage-sketch",
    version: 3,
    project: { venue: "proscenium", scenes: [] },
    venues: [venue("ignored-v3")],
  });
  assert.equal(result.project.venue, "proscenium");
  assert.equal(result.venueImport.imported, 0);
  assert.deepEqual(Array.from(venues.library.list()), Array.from(before));
});

test("自作会場を参照するショーはversion 4で会場を同梱できる", () => {
  const storage = new MemoryStorage({
    "shosai-stage-venues-v1": JSON.stringify([venue("hall-a", "大広間")]),
  });
  const { io } = loadModels(storage);
  const project = { venue: "hall-a", venueSize: "custom", scenes: [] };
  const included = io.exportDocument(project, true);
  assert.equal(included.kind, "shosai-stage-sketch");
  assert.equal(included.version, 4);
  assert.equal(included.project.venue, "hall-a");
  assert.equal(included.venues.length, 1);
  assert.equal(included.venues[0].format, "venue-v2");

  const excluded = io.exportDocument(project, false);
  assert.equal(excluded.version, 4);
  assert.equal(excluded.project.venue, "hall-a");
  assert.deepEqual(Array.from(excluded.venues), []);
});

test("version 4読込で会場IDが重なると連番IDで追加し、ショー参照も向け直す", () => {
  const storage = new MemoryStorage({
    "shosai-stage-venues-v1": JSON.stringify([venue("hall-a", "端末側")]),
  });
  const { venues, io } = loadModels(storage);
  const result = io.prepareImportDocument({
    kind: "shosai-stage-sketch",
    version: 4,
    project: { venue: "hall-a", venueSize: "custom", scenes: [] },
    venues: [venue("hall-a", "ファイル側")],
  });
  assert.equal(result.project.venue, "hall-a-2");
  assert.equal(result.venueImport.idMap["hall-a"], "hall-a-2");
  assert.deepEqual(
    Array.from(venues.library.list(), (item) => item.id),
    ["hall-a", "hall-a-2"],
  );
  assert.equal(venues.library.list()[0].label, "端末側", "同じIDの既存会場を上書きしない");
});

test("保存メタデータ既定値とinternal-onlyの3択確認UIを持つ", () => {
  assert.match(indexSource, /id="stage-venue-editor-source"[\s\S]*?<option value="記憶" selected>/);
  assert.match(indexSource, /id="stage-venue-editor-confidence"[\s\S]*?<option value="low" selected>/);
  assert.match(indexSource, /id="stage-venue-editor-sharing"[\s\S]*?<option value="ok" selected>/);
  assert.match(indexSource, /この会場の資料は外部共有不可の設定です。/);
  assert.match(indexSource, /id="stage-venue-export-include"/);
  assert.match(indexSource, /id="stage-venue-export-without"/);
  assert.match(indexSource, /id="stage-venue-export-stop"/);
  assert.match(editorSource, /library\.importVenues\(\[venue\]\)/);
  assert.match(sketchSource, /venueData\.provenance\.sharing === "internal-only"/);
  assert.match(sketchSource, /この会場データが見つかりません（元のID: \$\{current\.id\}）/);
});

test("柱・什器・扉の追加モードと、独立した天井高・吊りUIを持つ", () => {
  for (const [mode, label] of [["select", "選択"], ["column", "柱"], ["furniture", "什器"], ["door", "扉"]]) {
    assert.match(indexSource, new RegExp(`data-venue-editor-mode="${mode}"[^>]*>${label}<`));
  }
  assert.match(indexSource, /id="stage-venue-editor-object-movable"/);
  assert.match(indexSource, /data-venue-editor-furniture-height="knee"[^>]*>膝 0\.5m</);
  assert.match(indexSource, /data-venue-editor-furniture-height="waist"[^>]*>腰 1\.0m</);
  assert.match(indexSource, /data-venue-editor-furniture-height="person"[^>]*>背丈 1\.7m</);
  assert.match(indexSource, /data-venue-editor-furniture-height="ceiling"[^>]*>天井まで</);
  for (const height of [3, 4, 6, 8, 10]) {
    assert.match(indexSource, new RegExp(`data-venue-editor-ceiling-height="${height}"`));
  }
  for (const rigging of ["none", "limited", "full"]) {
    assert.match(indexSource, new RegExp(`data-venue-editor-rigging="${rigging}"`));
  }
  assert.match(editorSource, /const COLUMN_DEFAULT_RADIUS_M = 0\.4;/);
  assert.match(editorSource, /const ACCESS_DEFAULT_WIDTH_M = 1\.2;/);
  assert.match(editorSource, /\["stage-venue-h", venue\.ceiling\.heightM\]/);
});

test("4本の表示トグルと、保存しない探り針の道具・到達高さUIを持つ", () => {
  for (const [line, label] of [
    ["movement", "可動範囲"], ["fall", "落下範囲"], ["blind", "死角"], ["sight", "見える限界"],
  ]) {
    assert.match(indexSource,
      new RegExp(`data-venue-editor-line-toggle="${line}" checked><span>${label}</span>`));
  }
  for (const tool of ["juggling", "diabolo", "aerial", "unspecified"]) {
    assert.match(indexSource, new RegExp(`<option value="${tool}"`));
  }
  assert.match(indexSource, /id="stage-venue-editor-probe-reach"[^>]*max="6"[^>]*step="0\.5"/);
  assert.match(indexSource, /落下範囲は経験則による目安です。安全性は判定しません。/);
  assert.match(editorSource, /getLines: \(\) => clone/);
  assert.doesNotMatch(editorSource, /venue\.lines\s*=/);
});

test("平面の重ね順は床・可動・可動什器・死角・見える限界・落下・会場実体の順にする", () => {
  const renderBody = editorSource.match(/function render\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  const calls = [
    "drawFloor()",
    "drawMovementLines(linesResult)",
    "drawBlindSpots(linesResult)",
    "drawSightLimits(linesResult)",
    "drawFallRange(linesResult)",
    "drawAudience()",
    "drawRoom()",
    "drawFixtures()",
    "drawAccess()",
  ];
  const positions = calls.map((call) => renderBody.indexOf(call));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(editorSource,
    /function drawMovementLines[\s\S]*?fillWorldRects\(result\.movement\.areas[\s\S]*?movableExtensions\.forEach/,
    "可動範囲の後に可動什器の拡張輪郭を描いていない");
});

/* TOHU（実在会場・第2号）。数値は公式技術仕様書 Devis Technique Tohu（2020-02-10版）。
   ここを直すときは仕様書の該当欄を読み直してからにすること（記憶で書き換えない）。 */
test("TOHUプリセットは公式仕様書の実測値を保つ", () => {
  const { venues } = loadModels();
  const tohu = venues.v2.byId("tohu");
  assert.ok(tohu, "v2一覧にtohuがある");
  assert.equal(tohu.realVenue, true);
  assert.equal(tohu.provenance.confidence, "high");
  assert.equal(tohu.sizes.length, 1);

  const size = tohu.sizes[0];
  assert.equal(size.id, "round-full");
  // 床＝組める円形舞台の最大直径12.8m（仕様書 SCÈNE）
  const xs = size.floor.outline.map((point) => point[0]);
  assert.equal(Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10, 12.8);
  // 床からグリッドまで19.4m（仕様書 63'7''）。全高22.45mはグリッド+3.05m
  assert.equal(size.ceiling.heightM, 19.4);
  assert.equal(size.ceiling.gridM, 19.4);
  assert.equal(size.capacity.seats, 1004);

  // 可動席は11ブロック（仕様書 GRADINS: 5×85 + 6×69 = 839席）
  assert.equal(size.audience.length, 11);
  assert.ok(size.audience.every((area) => area.side === "round"),
    "全周形式（正面図は全周の描画に落ちるので realShape を使わない）");

  // 全周形式は正面図でrealShapeを使わない＝円の輪郭が直交ポリゴン前提の描画に入らない
  assert.match(sketchSource, /const roundHouse = v\.audience === "round";/);
  assert.match(sketchSource, /const realShape = \(v\.realVenue[\s\S]{0,120}&& !roundHouse\)/);
});

/* サーカスの3形式（2026-08-28 追加）。寸法の出所は各プリセットのコメントにある。
   ここを直すときは出典を読み直してからにすること（記憶で書き換えない）。 */
test("サーカスの3形式は出典どおりの寸法を保つ", () => {
  const { venues } = loadModels();

  // シャピトー: 小型はピスト7m・240席・頂点5.5m、大型は伝統の13mリング・1730席・16m
  const tent = venues.v2.byId("chapiteau");
  assert.deepEqual(Array.from(tent.sizes, (size) => size.id), ["touring", "grand-ring"]);
  const pisteOf = (size) => {
    const xs = size.floor.outline.map((point) => point[0]);
    return Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10;
  };
  const [small, big] = Array.from(tent.sizes);
  assert.equal(pisteOf(small), 7);
  assert.equal(small.ceiling.heightM, 5.5);
  assert.equal(small.capacity.seats, 240);
  assert.equal(pisteOf(big), 13, "伝統のリングは13m（Astley以来の国際標準）");
  assert.equal(big.ceiling.heightM, 16);
  assert.equal(big.capacity.seats, 1730);
  tent.sizes.forEach((size) => {
    assert.equal(size.audience.length, 4);
    assert.equal(size.fixtures.length, 0, "マストは外側に立つのでテント内に支柱を置かない");
  });

  // 劇場のサーカス公演: 吊り8m/12m。回転シルクの最低6mを下回らない
  const theatre = venues.v2.byId("circus-theatre");
  assert.deepEqual(Array.from(theatre.sizes, (size) => size.ceiling.heightM), [8, 12]);
  assert.ok(theatre.sizes.every((size) => size.ceiling.heightM >= 6),
    "回転シルクの最低高さ6mを下回らない");
  assert.equal(venues.byId("circus-theatre").audience, "front");

  // シルク・ディヴェール: 正20角形42m・ピスト125m²・外壁16.25m・ドーム27.5m・1600席
  const hiver = venues.v2.byId("cirque-dhiver");
  assert.equal(hiver.realVenue, true);
  const ring = hiver.sizes[0];
  assert.equal(ring.audience.length, 20, "建物と同じ20面で客席を割る");
  assert.equal(ring.floor.outline.length, 20);
  assert.equal(ring.ceiling.heightM, 16.25);
  assert.equal(ring.ceiling.gridM, 27.5);
  assert.equal(ring.capacity.seats, 1600);
  assert.equal(ring.fixtures.length, 0, "内部に柱が1本も無いのが特徴");
  // ピスト直径は公式の面積125m²から導いた値。面積へ戻して一致するか
  const ringXs = ring.floor.outline.map((point) => point[0]);
  const diameter = Math.max(...ringXs) - Math.min(...ringXs);
  assert.ok(Math.abs(Math.PI * (diameter / 2) ** 2 - 125) < 1.5,
    `ピスト直径${diameter}mは公式の125m²と整合する`);

  // 全周形式は正面図で realShape を通らない（円・多角形の輪郭でも壊れない）
  for (const id of ["chapiteau", "cirque-dhiver"]) {
    assert.equal(venues.byId(id).audience, "round", `${id} は全周形式`);
  }
});

test("既存のビッグトップは触っていない（形式の見取り図として据え置き）", () => {
  const { venues } = loadModels();
  const arena = venues.v2.byId("arena");
  assert.deepEqual(Array.from(arena.sizes, (size) => size.id), ["onering", "grand"]);
  assert.equal(arena.sizes[0].ringM, 13, "リング13mはAstley以来の国際標準");
  assert.equal(arena.provenance.source, "preset");
});

test("TOHUの表示文言は日英そろっている", () => {
  const i18nContext = { window: {} };
  vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
  const maps = i18nContext.window.SHOSAI_I18N.maps;
  assert.equal(maps.venue.tohu, "TOHU");
  assert.ok(maps.venueShort.tohu);
  assert.ok(maps.venueNote.tohu && maps.venueNote.tohu.length > 80, "会場の説明が英語にもある");
  assert.ok(maps.size["round-full"], "サイズ名の英訳がある");
  assert.ok(!/[぀-ヿ一-鿿]/.test(maps.venueNote.tohu + maps.size["round-full"]),
    "英語側に日本語が混じっていない");
});

/* 会場の説明はパネルへ textContent で入れる（＝素のまま出る）。
   Markdownの強調やHTMLタグを書くと記号がそのまま画面に出てしまう。
   2026-08-28に実際に「**内部に柱が1本も無い**」が画面へ出たので検査を足した。 */
test("会場の説明に記法が混ざっていない（画面へ素のまま出るため）", () => {
  const { venues } = loadModels();
  const i18nContext = { window: {} };
  vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
  const maps = i18nContext.window.SHOSAI_I18N.maps;

  venues.v2.list.forEach((venue) => {
    for (const [where, text] of [["日本語", venue.note], ["英語", maps.venueNote[venue.id]]]) {
      if (!text) continue;
      assert.ok(!text.includes("**"), `${venue.id} の${where}の説明にMarkdownの強調が残っている`);
      assert.ok(!/<[a-z/]/i.test(text), `${venue.id} の${where}の説明にHTMLタグが残っている`);
    }
  });
});

test("会場プリセットは全部が日英そろっている（追加時の訳し忘れを止める）", () => {
  const { venues } = loadModels();
  const i18nContext = { window: {} };
  vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
  const maps = i18nContext.window.SHOSAI_I18N.maps;
  const kana = /[぀-ヿ一-鿿]/;

  venues.v2.list.forEach((venue) => {
    assert.ok(maps.venue[venue.id], `${venue.id} の会場名に英訳がある`);
    assert.ok(maps.venueShort[venue.id], `${venue.id} の短い呼び名に英訳がある`);
    assert.ok(maps.venueNote[venue.id], `${venue.id} の説明に英訳がある`);
    assert.ok(!kana.test(maps.venue[venue.id] + maps.venueShort[venue.id] + maps.venueNote[venue.id]),
      `${venue.id} の英語に日本語が混じっていない`);
    venue.sizes.forEach((size) => {
      assert.ok(maps.size[size.id], `${venue.id}/${size.id} のサイズ名に英訳がある`);
      assert.ok(!kana.test(maps.size[size.id]), `${venue.id}/${size.id} のサイズ名英訳に日本語がない`);
    });
  });
});

test("会場ライブラリはfresh対象で、変更JSの版とPWAキャッシュ版が揃う", () => {
  assert.match(sketchSource, /const STAGE_KEYS = \[[\s\S]*?"shosai-stage-venues-v1"/);
  for (const [name, version] of [
    ["stage-venues.js", "24"],
    ["stage-venue-lines.js", "4"],
    ["stage-i18n.js", "96"],
    ["stage-set-model.js", "1"],
    ["stage-set-builder.js", "1"],
    ["stage-sketch.js", "317"],
    ["stage-venue-editor.js", "7"],
  ]) {
    const reference = `${name}?v=${version}`;
    assert.ok(indexSource.includes(reference), `${reference} がindex.htmlにある`);
    assert.ok(stageHtml.includes(reference), `${reference} がstage.htmlにある`);
    assert.ok(swSource.includes(`./${reference}`), `${reference} がstage-sw.jsにある`);
  }
  for (const page of [indexSource, stageHtml]) assert.ok(page.includes("style.css?v=228"));
  assert.ok(swSource.includes("./style.css?v=228"));
  assert.ok(stageHtml.includes("stage-machinery.js?v=2"));
  assert.ok(swSource.includes("./stage-machinery.js?v=2"));
  assert.ok(stageHtml.includes("stage-first-person.js?v=24"));
  assert.ok(swSource.includes("./stage-first-person.js?v=24"));
  // 版番号そのものは毎回上がるので固定値にせず、形だけを検査する（stage-export-zip.test.mjsと同じ方針）。
  assert.match(swSource, /const CACHE_NAME = "stage-sketch-pwa-v\d+";/);
});

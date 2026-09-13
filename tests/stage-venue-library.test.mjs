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
const indexSource = await readFile(new URL("stage.html", root), "utf8");
const styleSource = await readFile(new URL("style.css", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");
const stageHtml = await readFile(new URL("stage.html", root), "utf8");
const swSource = await readFile(new URL("stage-sw.js", root), "utf8");

const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + (point[0] * next[1]) - (next[0] * point[1]);
}, 0) / 2);
const polygonsArea = (polygons) => polygons.reduce((sum, polygon) => sum + polygonArea(polygon), 0);

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
    this.reportValidityCalls = 0;
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
  select() {}
  reportValidity() {
    this.reportValidityCalls += 1;
    return Boolean(String(this.value || "").trim());
  }
}

function loadEditor(storage = new MemoryStorage()) {
  const ids = [
    "stage-venue-editor-backdrop", "stage-venue-editor-modal",
    "stage-venue-editor-close", "stage-venue-editor-dims", "stage-venue-editor-status",
    "stage-venue-editor-undo", "stage-venue-editor-redo",
    "stage-venue-editor-zoom-out", "stage-venue-editor-zoom-in",
    "stage-venue-editor-extension-merge",
    "stage-venue-editor-audience-merge", "stage-venue-editor-wing-merge",
    "stage-venue-editor-audience-selection", "stage-venue-editor-audience-full",
    "stage-venue-editor-audience-remove",
    "stage-venue-editor-wing-summary",
    "stage-venue-editor-object-selection", "stage-venue-editor-object-movable",
    "stage-venue-editor-object-remove", "stage-venue-editor-access-type",
    "stage-venue-editor-ceiling-height",
    "stage-venue-editor-probe-tool", "stage-venue-editor-probe-reach",
    "stage-venue-editor-probe-reach-value", "stage-venue-editor-probe-status",
    "stage-venue-editor-name", "stage-venue-editor-source", "stage-venue-editor-confidence",
    "stage-venue-editor-sharing", "stage-venue-editor-save", "stage-venue-editor-apply",
    "stage-venue-editor-save-status",
    "stage-venue-conflict-backdrop", "stage-venue-conflict-modal", "stage-venue-conflict-message",
    "stage-venue-conflict-first", "stage-venue-conflict-second",
    "stage-venue-save-name-backdrop", "stage-venue-save-name-modal", "stage-venue-save-name-form",
    "stage-venue-save-name", "stage-venue-save-name-close", "stage-venue-save-name-cancel",
    "stage-venue-library-export", "stage-venue-library-import", "stage-venue-library-status",
    "stage-venue-import-backdrop", "stage-venue-import-modal", "stage-venue-import-close",
    "stage-venue-import-summary", "stage-venue-import-list", "stage-venue-import-confirm",
    "stage-venue-import-cancel",
    "stage-venue-discard-backdrop", "stage-venue-discard-modal",
    "stage-venue-discard-cancel", "stage-venue-discard-confirm",
  ];
  const elements = new Map(ids.map((id) => [id, new FakeElement(id)]));
  const canvas = new FakeElement("stage-venue-editor-canvas");
  canvas.tagName = "CANVAS";
  canvas.width = 960;
  canvas.height = 640;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 960, height: 640 });
  canvas.setPointerCapture = () => {};
  const drawFills = [];
  const drawText = [];
  const context2d = new Proxy({
    fill() { drawFills.push(this.fillStyle); },
    fillText(value) { drawText.push(String(value)); },
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
  elements.get("stage-venue-save-name").tagName = "INPUT";
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
  elements.get("stage-venue-library-import").tagName = "INPUT";
  elements.get("stage-venue-editor-backdrop").hidden = true;
  elements.get("stage-venue-editor-modal").hidden = true;
  elements.get("stage-venue-conflict-backdrop").hidden = true;
  elements.get("stage-venue-conflict-modal").hidden = true;
  elements.get("stage-venue-save-name-backdrop").hidden = true;
  elements.get("stage-venue-save-name-modal").hidden = true;
  elements.get("stage-venue-import-backdrop").hidden = true;
  elements.get("stage-venue-import-modal").hidden = true;
  elements.get("stage-venue-discard-backdrop").hidden = true;
  elements.get("stage-venue-discard-modal").hidden = true;

  const makeButtons = (values, dataKey) => values.map((value) => {
    const button = new FakeElement();
    button.dataset[dataKey] = value;
    return button;
  });
  const selectors = new Map([
    ["[data-venue-editor-stage-format]", makeButtons(["theatre", "thrust", "in-the-round"], "venueEditorStageFormat")],
    ["[data-venue-editor-shape]", makeButtons(["rectangle", "l-shape", "circle", "freeform"], "venueEditorShape")],
    ["[data-venue-editor-extension-shape]", makeButtons(["rectangle", "circle"], "venueEditorExtensionShape")],
    ["[data-venue-editor-area-mode]", ["audience", "wing"].flatMap((kind) =>
      ["rectangle", "circle"].map((shape) => {
        const button = new FakeElement();
        button.dataset.venueEditorAreaMode = kind;
        button.dataset.venueEditorAreaShape = shape;
        return button;
      }))],
    ["[data-venue-editor-wing]", makeButtons(["left", "right"], "venueEditorWing")],
    ["[data-venue-editor-mode]", makeButtons(["select", "column", "furniture", "door"], "venueEditorMode")],
    ["[data-venue-editor-furniture-height]", makeButtons(["knee", "waist", "person", "ceiling"], "venueEditorFurnitureHeight")],
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
  const windowListeners = new Map();
  const window = {
    localStorage: storage,
    addEventListener(type, listener) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      (windowListeners.get(event.type) || []).forEach((listener) => listener(event));
      return true;
    },
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
  return { window, elements, button, pointer, storage, drawFills, drawText, selectors, documentListeners, fileReads };
}

test("形式一覧の末尾と劇場パネルの劇場セットアップ入口から、従来の寸法入力を出さず会場モーダルを開く", () => {
  assert.match(indexSource,
    /id="stage-venue-custom-open"[^>]*aria-haspopup="dialog"[^>]*aria-controls="stage-venue-editor-modal">劇場セットアップ</);
  assert.match(indexSource, /id="stage-venue-editor-title">劇場セットアップ</);
  for (const id of ["stage-venue-dims", "stage-venue-w", "stage-venue-d", "stage-venue-h", "stage-venue-reset"]) {
    assert.doesNotMatch(indexSource, new RegExp(`id="${id}"`), id);
  }
  assert.match(sketchSource,
    /custom\.value = "__create_custom_venue__";[\s\S]*?custom\.textContent = tx\("カスタム"\);[\s\S]*?venueSelect\.append\(custom\);/);
  assert.match(sketchSource,
    /if \(e\.target\.value === "__create_custom_venue__"\)[\s\S]*?e\.target\.value = state\.project\.venue;[\s\S]*?syncVenueEditorTemplate\(\);[\s\S]*?return;/);
  assert.match(sketchSource,
    /venueCustomOpen\.addEventListener\("click", \(\) => \{[\s\S]*?syncVenueEditorTemplate\(\);[\s\S]*?window\.dispatchEvent\(new Event\("stage-venue-editor-open"\)\)/);
  assert.match(sketchSource,
    /previewVenueEditorTemplate\(e\.target\.value, state\.project\.venueSize\);/);
  assert.match(sketchSource,
    /sizeSelect\.addEventListener\("change", \(e\) => \{\s*previewVenueEditorTemplate\(/);

  const editor = loadEditor();
  assert.equal(editor.elements.get("stage-venue-editor-modal").hidden, true);
  editor.window.dispatchEvent({ type: "stage-venue-editor-open" });
  assert.equal(editor.elements.get("stage-venue-editor-modal").hidden, false);
});

test("未反映の劇場編集は閉じる前に警告し、破棄すると開始時の下書きへ戻す", () => {
  const editor = loadEditor();
  editor.window.dispatchEvent({ type: "stage-venue-editor-open" });
  editor.button(
    "[data-venue-editor-stage-format]", "thrust", "venueEditorStageFormat",
  ).click();

  editor.elements.get("stage-venue-editor-close").click();
  assert.equal(editor.elements.get("stage-venue-editor-modal").hidden, false);
  assert.equal(editor.elements.get("stage-venue-discard-modal").hidden, false);

  editor.elements.get("stage-venue-discard-cancel").click();
  assert.equal(editor.elements.get("stage-venue-discard-modal").hidden, true);
  assert.equal(editor.elements.get("stage-venue-editor-modal").hidden, false);

  editor.elements.get("stage-venue-editor-close").click();
  editor.elements.get("stage-venue-discard-confirm").click();
  assert.equal(editor.elements.get("stage-venue-editor-modal").hidden, true);
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().stageFormat, "theatre");
});

test("ライブラリ保存だけでは反映せず、反映ボタンで初めて選択中の劇場を通知する", () => {
  const editor = loadEditor();
  const applied = [];
  editor.window.addEventListener("stage-venue-saved", (event) => applied.push(event.detail.venue));
  editor.window.dispatchEvent({ type: "stage-venue-editor-open" });

  const saved = editor.window.SHOSAI_VENUE_EDITOR.save();
  assert.ok(saved);
  assert.equal(applied.length, 0);
  assert.equal(editor.elements.get("stage-venue-editor-modal").hidden, false);

  editor.elements.get("stage-venue-editor-apply").click();
  assert.equal(applied.length, 1);
  assert.equal(applied[0].id, saved.id, "編集が変わっていないときは保存済み劇場を再利用する");
  assert.equal(editor.elements.get("stage-venue-editor-modal").hidden, true);

  editor.elements.get("stage-venue-editor-name").value = "";
  editor.window.dispatchEvent({ type: "stage-venue-editor-open" });
  editor.elements.get("stage-venue-editor-apply").click();
  assert.equal(applied.length, 2);
  assert.match(applied[1].label, /(?:（編集）$|^カスタム劇場\d+$)/,
    "任意の劇場名が空でも、現在の形式から自動名を付けて反映する");
});

test("劇場形式プリセットと規模を変えると制作中の床・形式・客席・天井を一緒に入れ替える", () => {
  const editor = loadEditor();
  const apply = (venueId, sizeId) => editor.window.dispatchEvent({
    type: "stage-venue-editor-template",
    detail: { venueId, sizeId },
  });
  const dimensionsOf = (outline) => {
    const xs = outline.map((point) => point[0]);
    const ys = outline.map((point) => point[1]);
    return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  };

  apply("proscenium", "mid");
  let venue = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal(venue.stageFormat, "theatre");
  assert.deepEqual(dimensionsOf(venue.floor.outline), [12, 9]);
  assert.equal(venue.audience.length, 1);
  assert.equal(venue.ceiling.heightM, 8);
  assert.equal(editor.elements.get("stage-venue-editor-confidence").value, "low",
    "プリセットの根拠確度を新しいカスタム会場の確度へ流用しない");

  apply("thrust", "small");
  venue = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal(venue.stageFormat, "thrust");
  assert.deepEqual(dimensionsOf(venue.floor.outline), [9, 8]);
  assert.equal(venue.audience.length, 3);

  editor.elements.get("stage-venue-editor-undo").click();
  venue = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal(venue.stageFormat, "theatre");
  assert.deepEqual(dimensionsOf(venue.floor.outline), [12, 9]);
  editor.elements.get("stage-venue-editor-redo").click();
  venue = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal(venue.stageFormat, "thrust");

  apply("arena", "onering");
  venue = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal(venue.stageFormat, "in-the-round");
  assert.ok(venue.floor.outline.length >= 24);
  assert.equal(venue.audience.length, 32);
  assert.equal(venue.ceiling.heightM, 12);
  assert.equal(
    editor.button("[data-venue-editor-shape]", "circle", "venueEditorShape")["aria-pressed"],
    "true",
  );
});

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

test("会場セレクト用一覧は汎用10形式の後ろに読み込み済み会場を並べる", () => {
  const storage = new MemoryStorage({
    "shosai-stage-venues-v1": JSON.stringify([venue("hall-a", "大広間")]),
  });
  const { venues } = loadModels(storage);
  assert.deepEqual(
    Array.from(venues.list, (item) => item.id),
    [
      "proscenium", "thrust", "arena", "outdoor", "blackbox",
      // 2026-09-12 本人承認により会場3種を追加
      "arena-concert", "dome-concert", "festival-field",
      "chapiteau", "circus-theatre",
      "hall-a",
    ],
  );
  assert.equal(venues.byId("hall-a").custom, true);
  assert.deepEqual(Array.from(venues.byId("hall-a").outline[0]), [2, 2]);
});

test("実在劇場は初期一覧に出さず、読み込んだデータと旧ショーのIDは使える", () => {
  const storage = new MemoryStorage();
  const { venues, io } = loadModels(storage);
  const ids = ["theatre-tram", "tohu", "cirque-dhiver"];
  const original = ids.map((id) => venues.library.venueV2ById(id));
  for (const id of ids) {
    assert.equal(venues.list.some((v) => v.id === id), false);
    assert.equal(venues.v2.list.some((v) => v.id === id), false);
    assert.equal(venues.byId(id).missing, undefined);
  }
  const imported = venues.library.importVenues(original);
  assert.equal(imported.imported, 3);
  const reloaded = loadModels(storage);
  original.forEach((data) => {
    const id = imported.idMap[data.id];
    assert.notEqual(id, data.id, "同梱データのIDを上書きしない");
    assert.ok(reloaded.venues.list.some((v) => v.id === id), "読み込み後と再起動後は選べる");
    assert.ok(reloaded.venues.v2.list.some((v) => v.id === id));
    assert.equal(JSON.stringify(reloaded.venues.v2.byId(id)), JSON.stringify({ ...data, id }));
    const exported = io.exportDocument({ venue: id, venueSize: "custom" });
    assert.equal(exported.venues.length, 1, "ショーの書き出しにも会場データを同梱できる");
    const fresh = loadModels();
    const restored = fresh.io.prepareImportDocument(exported);
    assert.equal(restored.venueImport.imported, 1);
    assert.equal(JSON.stringify(fresh.venues.v2.byId(restored.project.venue).floor), JSON.stringify(data.floor));
  });
});

test("SHOSAI_VENUES.listの先頭5プリセットは値も並びも変えない", () => {
  const { venues } = loadModels();
  const firstFive = JSON.stringify(venues.list.slice(0, 5));
  assert.deepEqual(
    Array.from(venues.list.slice(0, 5), (item) => item.id),
    ["proscenium", "thrust", "arena", "outdoor", "blackbox"],
  );
  /* 値を1バイトでも変えたら気づくための錠。変えるときは本人の指示があったときだけ。
     2026-09-04: 会場の性格を書いた一文（note）を外した（本人指示）。
       bd4b4907… → 7fa7d535… */
  assert.equal(
    createHash("sha256").update(firstFive).digest("hex"),
    "7fa7d535a0b4d3819a805a7792c3120618ff4276981b6c6b62bb02845dd34ca4",
  );
});

test("柱・什器・扉・天井とmovableは会場ライブラリを往復する", () => {
  const storage = new MemoryStorage();
  const first = loadModels(storage);
  const complete = venue("fixture-room", "設営確認室");
  complete.stageFormat = "thrust";
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
  assert.equal(restored.stageFormat, "thrust");
  assert.deepEqual(JSON.parse(JSON.stringify(restored.ceiling)), complete.ceiling);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.fixtures)), complete.fixtures);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.access)), complete.access);
  assert.deepEqual(Array.from(restored.fixtures, (item) => item.movable), [false, true]);
});

test("旧会場データのステージ形式は劇場式として読み込む", () => {
  const { venues } = loadModels(new MemoryStorage({
    "shosai-stage-venues-v1": JSON.stringify([venue("legacy-format", "旧形式")]),
  }));
  assert.equal(venues.library.list()[0].stageFormat, "theatre");
});

test("5番と6番で四角・丸を配置し、重なりを合成して保存する", () => {
  const editor = loadEditor();
  const areaMode = (kind, shape = "rectangle") => editor.selectors
    .get("[data-venue-editor-area-mode]")
    .find((button) => button.dataset.venueEditorAreaMode === kind &&
      button.dataset.venueEditorAreaShape === shape)
    .click();
  const draw = (from, to, pointerId) => {
    editor.pointer("pointerdown", from, pointerId);
    editor.pointer("pointermove", to, pointerId);
    editor.pointer("pointerup", to, pointerId);
  };

  assert.match(indexSource,
    /class="stage-venue-editor-audience-guide"[\s\S]*?data-venue-editor-area-mode="audience"[\s\S]*?id="stage-venue-editor-audience-full"[^>]*>全周に配置[\s\S]*?<\/section>/,
    "全周配置ボタンが5番のボックス内にない");
  assert.match(indexSource, /data-venue-editor-area-mode="wing"/);

  areaMode("audience", "rectangle");
  draw([0, 10], [2, 14], 1);
  areaMode("audience", "circle");
  draw([2.5, 12], [3.5, 12], 2);
  let preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.deepEqual(Array.from(preview.audience[0].polygon, (point) => Array.from(point)),
    [[0, 10], [2, 10], [2, 14], [0, 14]]);
  assert.equal(preview.audience[0].shape, "rectangle");
  assert.equal(preview.audience[1].polygon.length, 24);
  assert.equal(preview.audience[1].shape, "circle");
  assert.equal(preview.audience[0].mode, "audience");
  const audienceMerge = editor.elements.get("stage-venue-editor-audience-merge");
  assert.equal(audienceMerge.disabled, false);
  audienceMerge.click();
  preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.deepEqual(Array.from(preview.audience, (area) => area.merged), [true, true]);

  areaMode("wing", "rectangle");
  draw([1, 4], [4, 9], 3);
  areaMode("wing", "circle");
  draw([4.5, 7], [6, 7], 4);
  preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.deepEqual(Array.from(preview.stageWings[0].polygon, (point) => Array.from(point)),
    [[1, 4], [4, 4], [4, 9], [1, 9]]);
  assert.equal(preview.stageWings[0].shape, "rectangle");
  assert.equal(preview.stageWings[1].polygon.length, 24);
  assert.equal(preview.stageWings[1].shape, "circle");
  assert.equal(preview.stageWings[0].side, "custom");
  assert.ok(editor.drawText.includes("舞台袖"), "図面上に舞台袖の文字表示がない");
  const wingMerge = editor.elements.get("stage-venue-editor-wing-merge");
  assert.equal(wingMerge.disabled, false);
  wingMerge.click();
  preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.deepEqual(Array.from(preview.stageWings, (area) => area.merged), [true, true]);

  const saved = editor.window.SHOSAI_VENUE_EDITOR.save();
  const restored = loadModels(editor.storage).venues.library.venueV2ById(saved.id);
  assert.deepEqual(Array.from(restored.audience, (area) => [area.shape, area.merged]),
    [["rectangle", true], ["circle", true]]);
  assert.deepEqual(Array.from(restored.stageWings, (area) => [area.shape, area.merged]),
    [["rectangle", true], ["circle", true]]);
});

test("ステージ・客席・舞台袖が重なると2択を出し、選ばなかった側だけを切り取る", () => {
  const modalMarkup = indexSource.match(/<div class="stage-modal stage-venue-conflict-modal"[\s\S]*?<\/div>\s*<\/div>/)?.[0] || "";
  assert.match(modalMarkup, /role="alertdialog"/);
  assert.equal((modalMarkup.match(/<button\b/g) || []).length, 2, "重なり警告は優先する2択だけにする");
  assert.doesNotMatch(modalMarkup, /stage-modal-close/);
  assert.match(styleSource, /\.stage-venue-conflict-actions \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(editorSource,
    /const pairs = \[\["stage", "audience"\], \["stage", "wing"\], \["audience", "wing"\]\];/);

  const editor = loadEditor();
  const audienceRectangle = editor.selectors.get("[data-venue-editor-area-mode]")
    .find((button) => button.dataset.venueEditorAreaMode === "audience" &&
      button.dataset.venueEditorAreaShape === "rectangle");
  const draw = (from, to, pointerId) => {
    editor.pointer("pointerdown", from, pointerId);
    editor.pointer("pointermove", to, pointerId);
    editor.pointer("pointerup", to, pointerId);
  };
  const conflictModal = editor.elements.get("stage-venue-conflict-modal");
  const first = editor.elements.get("stage-venue-conflict-first");
  const second = editor.elements.get("stage-venue-conflict-second");

  audienceRectangle.click();
  draw([14, 8], [20, 14], 41);
  assert.equal(conflictModal.hidden, false);
  assert.equal(first.textContent, "ステージを優先");
  assert.equal(second.textContent, "客席を優先");
  first.click();
  let preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal(conflictModal.hidden, true);
  assert.ok(Math.abs(polygonsArea(preview.audience.map((area) => area.polygon)) - 20) < 0.001,
    "ステージと重なる16㎡だけを客席から切り取れていない");
  assert.equal(polygonsArea([preview.floor.outline]), 96);

  editor.elements.get("stage-venue-editor-undo").click();
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().audience.length, 0,
    "警告の選択と切り取りを1回のUndoで戻せない");

  draw([14, 8], [20, 14], 42);
  second.click();
  preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  const stagePieces = [preview.floor.outline]
    .concat(preview.floor.extensions.map((item) => item.polygon));
  assert.equal(conflictModal.hidden, true);
  assert.ok(Math.abs(polygonsArea(stagePieces) - 80) < 0.001,
    "客席と重なる16㎡だけをステージから切り取れていない");
  assert.equal(polygonsArea(preview.audience.map((area) => area.polygon)), 36);
  assert.ok(preview.floor.extensions.every((item) => item.cutout && item.merged),
    "分割されたステージ片を一体面として保存していない");
});

test("客席と舞台袖の重なりも、選択した優先側を残して切り取る", () => {
  const editor = loadEditor();
  const areaMode = (kind) => editor.selectors.get("[data-venue-editor-area-mode]")
    .find((button) => button.dataset.venueEditorAreaMode === kind &&
      button.dataset.venueEditorAreaShape === "rectangle").click();
  const draw = (from, to, pointerId) => {
    editor.pointer("pointerdown", from, pointerId);
    editor.pointer("pointermove", to, pointerId);
    editor.pointer("pointerup", to, pointerId);
  };

  areaMode("audience");
  draw([0, 10], [5, 14], 45);
  areaMode("wing");
  draw([3, 12], [8, 16], 46);
  const first = editor.elements.get("stage-venue-conflict-first");
  const second = editor.elements.get("stage-venue-conflict-second");
  assert.equal(first.textContent, "客席を優先");
  assert.equal(second.textContent, "舞台袖を優先");
  second.click();
  const preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.ok(Math.abs(polygonsArea(preview.audience.map((area) => area.polygon)) - 16) < 0.001);
  assert.equal(polygonsArea(preview.stageWings.map((area) => area.polygon)), 20);
});

test("丸い客席がステージへ重なった場合も、曲線側の重複だけを切り取る", () => {
  const editor = loadEditor();
  editor.selectors.get("[data-venue-editor-area-mode]")
    .find((button) => button.dataset.venueEditorAreaMode === "audience" &&
      button.dataset.venueEditorAreaShape === "circle").click();
  editor.pointer("pointerdown", [18, 8], 47);
  editor.pointer("pointermove", [21, 8], 47);
  editor.pointer("pointerup", [21, 8], 47);
  editor.elements.get("stage-venue-conflict-first").click();

  const preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  const remainingAudienceArea = polygonsArea(preview.audience.map((area) => area.polygon));
  assert.equal(editor.elements.get("stage-venue-conflict-modal").hidden, true);
  assert.ok(remainingAudienceArea > 13.5 && remainingAudienceArea < 14.5,
    `半円相当を残せていない: ${remainingAudienceArea}㎡`);
  assert.equal(preview.floor.outline.length, 4);
});

test("3番で四角と丸の追加ステージを既存舞台へ接続し、同じ床として保存する", () => {
  const editor = loadEditor();
  const extensionMode = (value) => editor.button(
    "[data-venue-editor-extension-shape]", value, "venueEditorExtensionShape",
  ).click();
  const draw = (from, to, pointerId) => {
    editor.pointer("pointerdown", from, pointerId);
    editor.pointer("pointermove", to, pointerId);
    editor.pointer("pointerup", to, pointerId);
  };

  extensionMode("rectangle");
  draw([18, 6], [21, 10], 51);
  let preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal(preview.floor.extensions.length, 1);
  assert.equal(preview.floor.extensions[0].shape, "rectangle");
  assert.deepEqual(Array.from(preview.floor.extensions[0].polygon, (point) => Array.from(point)),
    [[18, 6], [21, 6], [21, 10], [18, 10]]);
  assert.equal(editor.window.SHOSAI_VENUE_LINES.movementStatusAt(preview, [20, 8]).allowed, true,
    "追加した四角が舞台面として扱われていない");

  extensionMode("circle");
  draw([10, 4], [10, 2], 52);
  preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal(preview.floor.extensions.length, 2);
  assert.equal(preview.floor.extensions[1].shape, "circle");
  assert.equal(preview.floor.extensions[1].polygon.length, 24);

  extensionMode("rectangle");
  draw([0, 0], [2, 2], 53);
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().floor.extensions.length, 2,
    "離れた四角を同じ舞台として追加した");

  const undo = editor.elements.get("stage-venue-editor-undo");
  const redo = editor.elements.get("stage-venue-editor-redo");
  undo.click();
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().floor.extensions.length, 1);
  redo.click();
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().floor.extensions.length, 2);

  const saved = editor.window.SHOSAI_VENUE_EDITOR.save();
  const restored = loadModels(editor.storage).venues.library.venueV2ById(saved.id);
  assert.equal(restored.floor.extensions.length, 2);
  assert.deepEqual(Array.from(restored.floor.extensions, (item) => item.shape), ["rectangle", "circle"]);
});

test("追加した四角・丸を接続範囲内で動かし、重なりを合成して戻せる", () => {
  const editor = loadEditor();
  const rectangle = editor.button(
    "[data-venue-editor-extension-shape]", "rectangle", "venueEditorExtensionShape",
  );
  const canvasMove = (from, to, pointerId) => {
    editor.pointer("pointerdown", from, pointerId);
    editor.pointer("pointermove", to, pointerId);
    editor.pointer("pointerup", to, pointerId);
  };
  rectangle.click();
  canvasMove([16, 6], [20, 10], 81);

  const merge = editor.elements.get("stage-venue-editor-extension-merge");
  assert.equal(merge.disabled, false, "重なった追加ステージがあるのに合成できない");

  canvasMove([19, 8], [20, 8], 82);
  let extension = editor.window.SHOSAI_VENUE_EDITOR.getVenue().floor.extensions[0];
  assert.deepEqual(Array.from(extension.polygon, (point) => Array.from(point)),
    [[17, 6], [21, 6], [21, 10], [17, 10]], "追加ステージをドラッグ移動できない");

  canvasMove([20, 8], [26, 8], 83);
  extension = editor.window.SHOSAI_VENUE_EDITOR.getVenue().floor.extensions[0];
  assert.deepEqual(Array.from(extension.polygon, (point) => Array.from(point)),
    [[17, 6], [21, 6], [21, 10], [17, 10]], "接続が切れる位置へ動かしている");

  merge.click();
  extension = editor.window.SHOSAI_VENUE_EDITOR.getVenue().floor.extensions[0];
  assert.equal(extension.merged, true);
  assert.equal(merge.disabled, true, "合成済みの形をもう一度合成できる");

  editor.elements.get("stage-venue-editor-undo").click();
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().floor.extensions[0].merged, undefined);
  editor.elements.get("stage-venue-editor-redo").click();
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().floor.extensions[0].merged, true);

  const beforeMergedMove = JSON.stringify(editor.window.SHOSAI_VENUE_EDITOR.getVenue().floor.extensions[0].polygon);
  canvasMove([20, 8], [19, 8], 84);
  assert.equal(JSON.stringify(editor.window.SHOSAI_VENUE_EDITOR.getVenue().floor.extensions[0].polygon), beforeMergedMove,
    "合成後の一体面から追加形状だけを動かしている");

  const saved = editor.window.SHOSAI_VENUE_EDITOR.save();
  const restored = loadModels(editor.storage).venues.library.venueV2ById(saved.id);
  assert.equal(restored.floor.extensions[0].merged, true, "合成状態が会場ライブラリを往復していない");
});

test("劇場セットアップのボタンとショートカットで編集を戻し、やり直せる", () => {
  const editor = loadEditor();
  const audienceMode = editor.button(
    "[data-venue-editor-area-mode]", "audience", "venueEditorAreaMode",
  );
  const undo = editor.elements.get("stage-venue-editor-undo");
  const redo = editor.elements.get("stage-venue-editor-redo");
  const canvas = editor.elements.get("stage-venue-editor-canvas");
  const keydown = editor.documentListeners.get("keydown");

  assert.equal(undo.disabled, true);
  assert.equal(redo.disabled, true);
  audienceMode.click();
  editor.pointer("pointerdown", [2, 10], 71);
  editor.pointer("pointermove", [5, 14], 71);
  editor.pointer("pointerup", [5, 14], 71);
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().audience.length, 1);
  assert.equal(undo.disabled, false);

  undo.click();
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().audience.length, 0);
  assert.equal(redo.disabled, false);
  redo.click();
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().audience.length, 1);

  editor.window.dispatchEvent({ type: "stage-venue-editor-open" });
  let prevented = 0;
  keydown({
    key: "z", metaKey: true, ctrlKey: false, shiftKey: false, target: canvas,
    preventDefault() { prevented += 1; },
  });
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().audience.length, 0);
  keydown({
    key: "Z", metaKey: true, ctrlKey: false, shiftKey: true, target: canvas,
    preventDefault() { prevented += 1; },
  });
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().audience.length, 1);
  assert.equal(prevented, 2);

  editor.elements.get("stage-venue-editor-zoom-out").click();
  undo.click();
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().audience.length, 0,
    "表示倍率を履歴へ混ぜている");

  const name = editor.elements.get("stage-venue-editor-name");
  keydown({
    key: "z", metaKey: true, ctrlKey: false, shiftKey: false, target: name,
    preventDefault() { prevented += 1; },
  });
  assert.equal(prevented, 2, "文字入力欄の標準Undoを横取りしている");
});

test("360度ステージだけは5番の全周配置から隙間のない客席を作り、区画を選択削除できる", () => {
  const editor = loadEditor();
  const format = (value) => editor.button(
    "[data-venue-editor-stage-format]", value, "venueEditorStageFormat",
  ).click();

  assert.equal(editor.elements.get("stage-venue-editor-audience-full").hidden, true,
    "劇場式で全周配置ボタンが表示されている");
  assert.equal(editor.elements.get("stage-venue-editor-audience-full").disabled, true);
  format("in-the-round");
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().audience.length, 0,
    "全周配置ボタンを押す前に客席を自動配置している");
  assert.equal(editor.elements.get("stage-venue-editor-audience-full").hidden, false,
    "360度ステージで全周配置ボタンが表示されていない");
  assert.equal(editor.elements.get("stage-venue-editor-audience-full").disabled, false);
  editor.elements.get("stage-venue-editor-audience-full").click();
  let preview = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal(preview.audience.length, 4);
  preview.audience.forEach((area, index) => {
    const next = preview.audience[(index + 1) % preview.audience.length];
    assert.deepEqual(Array.from(area.polygon[2]), Array.from(next.polygon[3]),
      `客席の外周が辺${index + 1}と辺${index + 2}の間で割れている`);
  });

  const first = preview.floor.outline[0];
  const second = preview.floor.outline[1];
  const midpoint = [(first[0] + second[0]) / 2, (first[1] + second[1]) / 2];
  editor.pointer("pointerdown", midpoint, 9);
  editor.pointer("pointerup", midpoint, 9);
  editor.elements.get("stage-venue-editor-audience-remove").click();
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getVenue().audience.length, 3,
    "全周客席から選択した1区画を削除できない");
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
  const ceilingHeight = editor.elements.get("stage-venue-editor-ceiling-height");
  ceilingHeight.value = "4";
  ceilingHeight.dispatchEvent({ type: "change" });
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
    note: "数値入力の目安。実劇場では要確認。",
  });
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
  assert.match(editor.elements.get("stage-venue-import-summary").textContent, /取り込める劇場が1件/);
  assert.match(editor.elements.get("stage-venue-import-summary").textContent, /取り込めない劇場が0件/);
  const cells = editor.elements.get("stage-venue-import-list").children[0].children
    .map((cell) => cell.textContent);
  assert.deepEqual(cells, ["確認する会場", "12m", "8m", "8m", "図面"]);

  editor.elements.get("stage-venue-import-confirm").click();
  assert.equal(editor.window.SHOSAI_VENUES.library.list().length, 2);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /1件の劇場を取り込みました/);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /取り込めなかった劇場は0件/);
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
  assert.match(editor.elements.get("stage-venue-import-summary").textContent, /取り込めない劇場が1件/);
  assert.equal(library.list().length, 0, "壊れた会場の検査中に書き込んでいる");
  editor.elements.get("stage-venue-import-confirm").click();
  assert.deepEqual(Array.from(library.list(), (item) => item.id), ["valid"]);
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /取り込めなかった劇場は1件/);
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
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /取り込めなかった劇場は1件/);
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
  assert.match(editor.elements.get("stage-venue-library-status").textContent, /取り込めない劇場が200件/);
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

test("受け入れ会場で可動範囲・死角・見える限界を即時に更新しvenueへ保存しない", () => {
  const editor = loadEditor();
  const mode = (value) => editor.button("[data-venue-editor-mode]", value, "venueEditorMode").click();
  const areaMode = (value) => editor.button("[data-venue-editor-area-mode]", value, "venueEditorAreaMode").click();
  const lineArea = () => editor.window.SHOSAI_VENUE_EDITOR.getLines().result.movement.areas
    .reduce((sum, area) => sum + (area.width * area.height), 0);

  areaMode("audience");
  editor.pointer("pointerdown", [6, 12], 1);
  editor.pointer("pointermove", [18, 15], 1);
  editor.pointer("pointerup", [18, 15], 1);

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

  const lines = editor.window.SHOSAI_VENUE_EDITOR.getLines();
  assert.ok(lines.result.movement.areas.length > 0);
  assert.ok(expandedArea > fixedArea, "movable:trueで可動範囲が広がっていない");
  assert.equal(lines.result.movement.movableExtensions.length, 1, "可動什器の破線用輪郭がない");
  assert.ok(lines.result.blindSpots.areas.length > 0, "柱の後ろに死角がない");
  assert.equal(lines.result.sightLimits.length, 0, "小部屋なのに20m/35m線がある");
  assert.ok(!editor.drawFills.includes("rgba(238,55,48,0.88)"), "削除した落下範囲が描画されている");

  const savedShape = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal("lines" in savedShape, false);
  assert.equal("probe" in savedShape, false);
  assert.ok(editor.selectors.get("[data-venue-editor-line-toggle]").every((input) => input.checked));
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
  assert.match(indexSource, /この劇場の資料は外部共有不可の設定です。/);
  assert.match(indexSource, /id="stage-venue-export-include"/);
  assert.match(indexSource, /id="stage-venue-export-without"/);
  assert.match(indexSource, /id="stage-venue-export-stop"/);
  assert.match(editorSource, /library\.importVenues\(\[venue\]\)/);
  assert.match(sketchSource, /venueData\.provenance\.sharing === "internal-only"/);
  assert.match(sketchSource, /この会場データが見つかりません（元のID: \$\{current\.id\}）/);
});

test("劇場名は常設欄では任意で、ライブラリ保存時の確認だけ必須にする", () => {
  const editorNameInput = indexSource.match(/<input[^>]*id="stage-venue-editor-name"[^>]*>/)?.[0];
  const saveNameInput = indexSource.match(/<input[^>]*id="stage-venue-save-name"[^>]*>/)?.[0];
  assert.ok(editorNameInput);
  assert.ok(saveNameInput);
  assert.doesNotMatch(editorNameInput, /\srequired(?:\s|>)/);
  assert.match(indexSource, /class="stage-field-row stage-venue-editor-name-field"[\s\S]*?<label[^>]*>劇場名<\/label>/);
  assert.match(saveNameInput, /\srequired(?:\s|>)/);
  assert.match(indexSource, /id="stage-venue-save-name-modal"[\s\S]*?id="stage-venue-save-name-form"[\s\S]*?劇場名 <span class="stage-required">必須<\/span>/);
  assert.match(styleSource, /\.stage-venue-editor-name-field \{ grid-column: 1 \/ -1; \}/);
  assert.match(styleSource, /\.stage-venue-save-name-actions \{\n  display: grid;\n  grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(styleSource, /\.stage-venue-editor-actions\.stage-venue-save-name-actions > \.btn-quiet,[\s\S]*?> \.stage-minor-action \{[\s\S]*?height: 44px;[\s\S]*?color: var\(--milk\);[\s\S]*?font-family: var\(--sans\);[\s\S]*?font-size: 14px;/);

  const editor = loadEditor();
  const topName = editor.elements.get("stage-venue-editor-name");
  const saveButton = editor.elements.get("stage-venue-editor-save");
  const modal = editor.elements.get("stage-venue-save-name-modal");
  const input = editor.elements.get("stage-venue-save-name");
  const form = editor.elements.get("stage-venue-save-name-form");
  topName.value = "";

  saveButton.click();
  assert.equal(modal.hidden, false);
  assert.equal(input.value, "");
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getDrafts().length, 0);

  form.dispatchEvent({ type: "submit", preventDefault() {} });
  assert.equal(input.reportValidityCalls, 1);
  assert.equal(modal.hidden, false);
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getDrafts().length, 0);

  input.value = "保存時に付けた会場名";
  form.dispatchEvent({ type: "submit", preventDefault() {} });
  assert.equal(modal.hidden, true);
  assert.equal(topName.value, "保存時に付けた会場名");
  assert.equal(editor.window.SHOSAI_VENUE_EDITOR.getDrafts()[0].label, "保存時に付けた会場名");
});

test("未反映データの確認ボタンは役割が違っても同じ文字規格にする", () => {
  assert.match(indexSource,
    /class="stage-venue-discard-actions"[\s\S]*?class="btn-quiet"[^>]*>編集を続ける<[\s\S]*?class="stage-minor-action"[^>]*>変更を破棄して戻る</);
  assert.match(styleSource,
    /\.stage-venue-discard-actions \{[\s\S]*?--stage-venue-discard-action-font-size: 14px;[\s\S]*?--stage-venue-discard-action-line-height: 1\.4;[\s\S]*?--stage-venue-discard-action-letter-spacing: 0\.15em;/);
  assert.match(styleSource,
    /\.stage-venue-discard-actions > button \{[\s\S]*?font-family: var\(--sans\);[\s\S]*?font-size: var\(--stage-venue-discard-action-font-size\);[\s\S]*?font-weight: 400;[\s\S]*?line-height: var\(--stage-venue-discard-action-line-height\);[\s\S]*?letter-spacing: var\(--stage-venue-discard-action-letter-spacing\);[\s\S]*?text-align: center;/);
});

test("柱・什器・扉の追加・設定UIを表示しない", () => {
  assert.match(indexSource, /<section class="stage-venue-editor-metadata"[\s\S]*?id="stage-venue-editor-name"[\s\S]*?id="stage-venue-editor-source"[\s\S]*?id="stage-venue-editor-confidence"[\s\S]*?id="stage-venue-editor-sharing"/);
  assert.match(styleSource, /\.stage-venue-editor-metadata \{\n  display: grid;\n  grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(styleSource, /\.stage-venue-editor-name-field \{ grid-column: 1 \/ -1; \}/);
  assert.match(indexSource, /<div class="stage-venue-editor-workspace">[\s\S]*?<div class="stage-venue-editor-menu">[\s\S]*?stage-venue-editor-shape[\s\S]*?<div class="stage-venue-editor-panel">[\s\S]*?stage-venue-editor-canvas/);
  assert.match(styleSource, /\.stage-venue-editor-workspace \{\n  display: grid;\n  grid-template-columns: minmax\(320px, 0\.78fr\) minmax\(0, 1\.45fr\);/);
  assert.match(styleSource, /\.stage-venue-editor-menu \{\n  container: stage-venue-editor-menu \/ inline-size;[\s\S]*?overflow-x: hidden;[\s\S]*?overflow-y: auto;/);
  assert.match(styleSource, /@container stage-venue-editor-menu \(max-width: 520px\) \{[\s\S]*?\.stage-venue-editor-shapes \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); \}[\s\S]*?\.stage-venue-editor-height-steps \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}[\s\S]*?\.stage-venue-editor-object-tools \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(styleSource, /\.stage-venue-editor-panel \{ container: stage-venue-editor-panel \/ inline-size; \}/);
  assert.match(styleSource, /@container stage-venue-editor-panel \(max-width: 520px\) \{[\s\S]*?\.stage-venue-editor-area-selection \{ grid-template-columns: minmax\(0, 1fr\); \}[\s\S]*?flex-direction: column;/);
  assert.match(styleSource, /#stage-venue-editor-canvas \{[\s\S]*?height: auto;[\s\S]*?aspect-ratio: 3 \/ 2;[\s\S]*?border:/);
  assert.doesNotMatch(styleSource, /#stage-venue-editor-canvas \{[^}]*max-height:/);
  assert.match(indexSource, /class="stage-venue-editor-canvas-wrap"[\s\S]*?id="stage-venue-editor-canvas"[\s\S]*?class="stage-venue-editor-zoom"[\s\S]*?id="stage-venue-editor-undo"[\s\S]*?id="stage-venue-editor-redo"[\s\S]*?id="stage-venue-editor-zoom-out"[\s\S]*?id="stage-venue-editor-zoom-in"/);
  assert.match(styleSource, /\.stage-venue-editor-zoom \{[\s\S]*?right: 10px;[\s\S]*?bottom: 10px;[\s\S]*?grid-template-columns: repeat\(4, 44px\);/);
  assert.match(styleSource, /\.stage-venue-editor-zoom button \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
  assert.match(indexSource, /<section class="stage-venue-editor-shape"[\s\S]*?stage-venue-editor-shape-step[\s\S]*?stage-venue-editor-shapes[\s\S]*?stage-venue-editor-lead/);
  assert.match(styleSource, /\.stage-venue-editor-format,\n\.stage-venue-editor-shape,\n\.stage-venue-editor-extension,\n\.stage-venue-editor-ceiling,/);
  assert.match(indexSource, /id="stage-venue-editor-format-title">1\. ステージの形式を選択してください</);
  assert.match(indexSource, /id="stage-venue-editor-shape-title">2\. メインの形を選択してください</);
  assert.match(indexSource, /id="stage-venue-editor-extension-title">3\. 追加のステージを選択してください</);
  assert.match(indexSource, /長方形・L字・円・カスタムから選択してください。/);
  for (const shape of ["rectangle", "l-shape", "circle", "freeform"]) {
    assert.match(indexSource, new RegExp(`data-venue-editor-shape="${shape}"[\\s\\S]*?<svg[\\s\\S]*?<span>`));
  }
  assert.doesNotMatch(indexSource, /data-venue-editor-shape="trapezoid"|>台形</);
  assert.doesNotMatch(editorSource, /形を切り替えました。辺・角・(?:観客と、置いていた柱・什器・扉|客席)は初期化しました。/);
  assert.match(styleSource, /\.stage-venue-editor-shapes,\n\.stage-venue-editor-extension-shapes,\n\.stage-venue-editor-area-shapes \{\n  grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(indexSource, /data-venue-editor-extension-shape="rectangle"[\s\S]*?<svg[\s\S]*?<span>四角<\/span>/);
  assert.match(indexSource, /data-venue-editor-extension-shape="circle"[\s\S]*?<svg[\s\S]*?<span>丸<\/span>/);
  assert.match(styleSource, /\.stage-venue-editor-extension-shapes,\n\.stage-venue-editor-area-shapes \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/);
  assert.match(indexSource, /id="stage-venue-editor-extension-merge"[^>]*disabled>重なりを合成<\/button>/);
  for (const kind of ["audience", "wing"]) {
    assert.match(indexSource, new RegExp(`data-venue-editor-area-mode="${kind}" data-venue-editor-area-shape="rectangle"[\\s\\S]*?<span>四角<\\/span>`));
    assert.match(indexSource, new RegExp(`data-venue-editor-area-mode="${kind}" data-venue-editor-area-shape="circle"[\\s\\S]*?<span>丸<\\/span>`));
    assert.match(indexSource, new RegExp(`id="stage-venue-editor-${kind}-merge"[^>]*disabled>重なりを合成<\\/button>`));
  }
  assert.match(indexSource, /追加した四角・丸はドラッグで動かせます。重なる部分は合成できます。/);
  assert.match(i18nSource, /"重なりを合成": "Merge overlaps"/);
  assert.match(i18nSource, /"追加した四角・丸はドラッグで動かせます。重なる部分は合成できます。":/);
  assert.match(indexSource, /id="stage-venue-editor-ceiling-title">4\. 天井の高さを指定してください</);
  assert.match(indexSource, /<div class="stage-venue-editor-menu">[\s\S]*?stage-venue-editor-extension-title[\s\S]*?stage-venue-editor-ceiling-title[\s\S]*?<section class="stage-venue-editor-audience-guide"[^>]*>[\s\S]*?id="stage-venue-editor-audience-title">5\. 客席を配置してください<[\s\S]*?data-venue-editor-area-mode="audience"[\s\S]*?id="stage-venue-editor-audience-full"[^>]*>全周に配置<[\s\S]*?<section class="stage-venue-editor-wings-guide"[^>]*>[\s\S]*?id="stage-venue-editor-wings-title">6\. 舞台袖を配置してください[\s\S]*?data-venue-editor-area-mode="wing"/);
  assert.match(indexSource, /<div class="stage-venue-editor-panel">[\s\S]*?<section class="stage-venue-editor-audience-step"[^>]*aria-labelledby="stage-venue-editor-audience-title"[\s\S]*?id="stage-venue-editor-canvas"[\s\S]*?class="stage-venue-editor-area-selection"/);
  assert.doesNotMatch(indexSource, /<div class="stage-venue-editor-panel">[\s\S]*?id="stage-venue-editor-audience-title">5\. 客席を配置してください/);
  assert.match(indexSource, /緑：ステージ上の可動範囲（1枡ごとの目安）/);
  assert.match(indexSource, /id="stage-venue-editor-wings-title">6\. 舞台袖を配置してください</);
  assert.match(indexSource, /破線：舞台袖/);
  assert.doesNotMatch(indexSource, /data-venue-editor-wing="(?:left|right)"/);
  assert.match(indexSource, /id="stage-venue-editor-audience-full"[^>]*>全周に配置</);
  assert.doesNotMatch(indexSource, /stage-venue-editor-audience-mode|座り（OFFは立ち見）/);
  assert.match(editorSource, /function audienceRuns\(\)[\s\S]*?function audienceRunPolygon\(/);
  assert.match(editorSource, /mode: "audience",\n        eyeM: 1\.2/);
  for (const [value, label] of [["theatre", "劇場式"], ["thrust", "張り出し式"], ["in-the-round", "360度ステージ"]]) {
    assert.match(indexSource, new RegExp(`data-venue-editor-stage-format="${value}"[^>]*>${label}<`));
  }
  assert.match(styleSource, /\.stage-venue-editor-formats \{\n  grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(styleSource, /\.stage-venue-editor-ceiling,\n\.stage-venue-editor-audience-guide,\n\.stage-venue-editor-wings-guide,\n\.stage-venue-editor-audience-step,\n\.stage-venue-editor-lines/);
  assert.ok(
    indexSource.indexOf('stage-venue-editor-format-title') < indexSource.indexOf('stage-venue-editor-shape-title')
      && indexSource.indexOf('stage-venue-editor-shape-title') < indexSource.indexOf('stage-venue-editor-extension-title')
      && indexSource.indexOf('stage-venue-editor-extension-title') < indexSource.indexOf('stage-venue-editor-ceiling-title')
      && indexSource.indexOf('stage-venue-editor-ceiling-title') < indexSource.indexOf('stage-venue-editor-audience-title')
      && indexSource.indexOf('stage-venue-editor-audience-title') < indexSource.indexOf('stage-venue-editor-wings-title')
      && indexSource.indexOf('stage-venue-editor-wings-title') < indexSource.indexOf('stage-venue-editor-panel'),
    "ステージ形式、メイン形状、追加ステージ、天井高、客席、舞台袖、編集パネルの順に表示する",
  );
  assert.doesNotMatch(indexSource, /data-venue-editor-mode=/);
  assert.doesNotMatch(indexSource, /class="stage-venue-editor-object-tools"/);
  assert.doesNotMatch(indexSource, /id="stage-venue-editor-object-(?:selection|movable|remove)"/);
  assert.doesNotMatch(indexSource, /data-venue-editor-furniture-height=/);
  assert.doesNotMatch(indexSource, /id="stage-venue-editor-access-type"/);
  assert.match(indexSource, /<input[^>]*type="number"[^>]*id="stage-venue-editor-ceiling-height"/);
  assert.match(indexSource, /id="stage-venue-editor-ceiling-height"[^>]*min="0\.1"[^>]*max="100"[^>]*step="0\.1"/);
  assert.doesNotMatch(indexSource, /data-venue-editor-ceiling-height=/);
  assert.match(editorSource, /CEILING_MIN_HEIGHT_M = 0\.1/);
  assert.match(editorSource, /CEILING_MAX_HEIGHT_M = 100/);
  for (const rigging of ["none", "limited", "full"]) {
    assert.match(indexSource, new RegExp(`data-venue-editor-rigging="${rigging}"`));
  }
  assert.match(editorSource, /const COLUMN_DEFAULT_RADIUS_M = 0\.4;/);
  assert.match(editorSource, /const ACCESS_DEFAULT_WIDTH_M = 1\.2;/);
  assert.doesNotMatch(editorSource, /bridgeVenue(?:Dims|Height)/);
});

test("グリッドを縮小して固定範囲の外まで舞台を広げても寸法を保存できる", () => {
  const editor = loadEditor();
  const before = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.deepEqual(Array.from(before.floor.outline[0]), [6, 4]);
  assert.ok(editor.drawText.some((value) => value === "1枡 ≒ 1m"), "初期グリッドの1m表記がない");

  editor.elements.get("stage-venue-editor-zoom-out").click();
  editor.elements.get("stage-venue-editor-zoom-out").click();
  const afterZoom = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  assert.equal(JSON.stringify(afterZoom.floor), JSON.stringify(before.floor), "表示倍率で舞台寸法を変えている");
  assert.ok(editor.drawText.some((value) => value === "1枡 ≒ 2m"), "縮小時にグリッド間隔の表示を更新していない");

  const canvas = editor.elements.get("stage-venue-editor-canvas");
  const event = (type, clientX, pointerId = 51) => ({
    type,
    button: 0,
    pointerId,
    clientX,
    clientY: 320,
    preventDefault() {},
  });
  canvas.dispatchEvent(event("pointerdown", 577));
  canvas.dispatchEvent(event("pointermove", 770));
  canvas.dispatchEvent(event("pointerup", 770));

  const expanded = editor.window.SHOSAI_VENUE_EDITOR.getVenue();
  const xs = expanded.floor.outline.map((point) => point[0]);
  assert.ok(Math.max(...xs) > 23.5, "旧グリッド右端の上限が残っている");
  assert.equal(Math.max(...xs) - Math.min(...xs), 24);
  assert.match(editor.elements.get("stage-venue-editor-dims").textContent, /間口 だいたい24m/);
});

test("カスタム会場モーダルは広い画面で表示領域の約80%を使う", () => {
  assert.match(styleSource,
    /\.stage-modal\.stage-venue-editor-modal \{ width: min\(80vw, calc\(100vw - 40px\)\); \}/);
  assert.match(styleSource,
    /\.stage-modal\.stage-venue-editor-modal \{\n    width: calc\(100vw - 16px\);/);
});

test("会場から導く3本の線パネルを隠し、線の計算と保存データは残す", () => {
  assert.match(indexSource, /<section class="stage-venue-editor-lines"/);
  assert.match(styleSource, /\.stage-venue-editor-modal \.stage-venue-editor-lines \{ display: none; \}/);
  assert.match(editorSource, /state\.lines\.visible/);
  for (const compute of ["computeMovement", "computeBlindSpots", "computeSightLimits"]) {
    assert.match(editorSource, new RegExp(`linesEngine\\.${compute}\\(`));
  }
});

test("落下範囲と探り針を表示・操作・描画しない", () => {
  for (const [line, label] of [
    ["movement", "可動範囲"], ["blind", "死角"], ["sight", "見える限界"],
  ]) {
    assert.match(indexSource,
      new RegExp(`data-venue-editor-line-toggle="${line}" checked><span>${label}</span>`));
  }
  assert.doesNotMatch(indexSource, /data-venue-editor-line-toggle="fall"/);
  assert.doesNotMatch(indexSource, /stage-venue-editor-probe/);
  assert.doesNotMatch(indexSource, /落下範囲|探り針/);
  assert.doesNotMatch(editorSource, /function (?:drawFallRange|drawProbe|hitProbe|moveProbe)/);
  assert.doesNotMatch(editorSource, /setProbe(?:Tool|Reach)|applyPerformerCapture/);
  assert.doesNotMatch(editorSource, /落下範囲|探り針/);
  const renderBody = editorSource.match(/function render\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  assert.doesNotMatch(renderBody, /drawFallRange|drawProbe/);
  assert.match(editorSource, /getLines: \(\) => clone/);
  assert.doesNotMatch(editorSource, /venue\.lines\s*=/);
});

test("平面の重ね順は床・可動・可動什器・死角・見える限界・会場実体の順にする", () => {
  const renderBody = editorSource.match(/function render\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  const calls = [
    "drawFloor()",
    "drawMovementLines(linesResult)",
    "drawBlindSpots(linesResult)",
    "drawSightLimits(linesResult)",
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

test("形式プリセットには会場の性格を書いた一文を置かない", () => {
  /* 本人指示 2026-09-04。実在会場の寸法・席数・出典の記述は残す。
     ★同じ枠（#stage-venue-note）を使い回しているので、片方だけ消すとどちらも消えたように見える。
       ここで「形式は無い・実在は有る」を両方おさえる。 */
  const { venues } = loadModels();
  const i18nContext = { window: {} };
  vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
  const maps = i18nContext.window.SHOSAI_I18N.maps;
  const forms = ["proscenium", "thrust", "arena", "outdoor", "blackbox"];

  forms.forEach((id) => {
    const venue = venues.v2.list.find((v) => v.id === id);
    assert.ok(venue, `${id} がある`);
    assert.ok(!venue.note, `${id} に説明の一文が無い`);
    assert.ok(!maps.venueNote[id], `${id} の英訳も無い`);
  });
  // 実在会場は残っている
  ["chapiteau", "tohu", "cirque-dhiver", "theatre-tram", "circus-theatre"].forEach((id) => {
    const venue = venues.v2.byId(id);
    assert.ok(venue && venue.note && venue.note.length > 40, `${id} の記述が残っている`);
    assert.ok(maps.venueNote[id], `${id} の英訳が残っている`);
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
    /* ★形式プリセットは説明の一文を持たない（本人指示 2026-09-04 で外した）。
       説明があるものだけ英訳を要る形にする。 */
    if (venue.note) assert.ok(maps.venueNote[venue.id], `${venue.id} の説明に英訳がある`);
    assert.ok(!kana.test(maps.venue[venue.id] + maps.venueShort[venue.id] + (maps.venueNote[venue.id] || "")),
      `${venue.id} の英語に日本語が混じっていない`);
    venue.sizes.forEach((size) => {
      assert.ok(maps.size[size.id], `${venue.id}/${size.id} のサイズ名に英訳がある`);
      assert.ok(!kana.test(maps.size[size.id]), `${venue.id}/${size.id} のサイズ名英訳に日本語がない`);
    });
  });
});

test("会場ライブラリはfresh対象で、変更JSの版とPWAキャッシュ版が揃う", () => {
  assert.match(sketchSource, /const STAGE_KEYS = \[[\s\S]*?"shosai-stage-venues-v1"/);
  for (const name of [
    "stage-venues.js", "stage-venue-lines.js", "stage-i18n.js", "stage-set-model.js",
    "stage-set-builder.js", "stage-sketch.js", "stage-venue-editor.js", "style.css",
    "stage-machinery.js", "stage-first-person.js",
  ]) {
    const reference = indexSource.match(new RegExp(name.replaceAll(".", "\\.") + "\\?v=\\d+"))?.[0];
    assert.ok(reference, `${name} がindex.htmlにある`);
    assert.ok(stageHtml.includes(reference), `${reference} がstage.htmlにある`);
    assert.ok(swSource.includes(`./${reference}`), `${reference} がstage-sw.jsにある`);
  }
  // 版番号そのものは毎回上がるので固定値にせず、形だけを検査する（stage-export-zip.test.mjsと同じ方針）。
  assert.match(swSource, /const CACHE_NAME = "stage-sketch-pwa-v\d+";/);
});

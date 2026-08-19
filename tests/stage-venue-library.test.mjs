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
    this.textContent = "";
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
    createElement: () => new FakeElement(),
  };
  class FakeEvent {
    constructor(type) { this.type = type; }
  }
  class FakeCustomEvent extends FakeEvent {
    constructor(type, init = {}) { super(type); this.detail = init.detail; }
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
  return { window, elements, button, pointer, storage, drawFills, selectors };
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

test("会場セレクト用一覧は既存5プリセットの後ろにライブラリ会場を並べる", () => {
  const storage = new MemoryStorage({
    "shosai-stage-venues-v1": JSON.stringify([venue("hall-a", "大広間")]),
  });
  const { venues } = loadModels(storage);
  assert.deepEqual(
    Array.from(venues.list, (item) => item.id),
    ["proscenium", "thrust", "arena", "outdoor", "blackbox", "hall-a"],
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

test("会場ライブラリはfresh対象で、変更JSの版とPWAキャッシュ版が揃う", () => {
  assert.match(sketchSource, /const STAGE_KEYS = \[[\s\S]*?"shosai-stage-venues-v1"/);
  for (const [name, version] of [
    ["stage-venues.js", "16"],
    ["stage-venue-lines.js", "4"],
    ["stage-i18n.js", "60"],
    ["stage-set-model.js", "1"],
    ["stage-set-builder.js", "1"],
    ["stage-sketch.js", "254"],
    ["stage-venue-editor.js", "6"],
  ]) {
    const reference = `${name}?v=${version}`;
    assert.ok(indexSource.includes(reference), `${reference} がindex.htmlにある`);
    assert.ok(stageHtml.includes(reference), `${reference} がstage.htmlにある`);
    assert.ok(swSource.includes(`./${reference}`), `${reference} がstage-sw.jsにある`);
  }
  for (const page of [indexSource, stageHtml]) assert.ok(page.includes("style.css?v=180"));
  assert.ok(swSource.includes("./style.css?v=180"));
  assert.ok(stageHtml.includes("stage-machinery.js?v=2"));
  assert.ok(swSource.includes("./stage-machinery.js?v=2"));
  assert.ok(stageHtml.includes("stage-first-person.js?v=6"));
  assert.ok(swSource.includes("./stage-first-person.js?v=6"));
  // 版番号そのものは毎回上がるので固定値にせず、形だけを検査する（stage-export-zip.test.mjsと同じ方針）。
  assert.match(swSource, /const CACHE_NAME = "stage-sketch-pwa-v\d+";/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");

class MemoryStorage {
  constructor(entries = {}) {
    this.map = new Map(Object.entries(entries));
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
}

function loadDeskApi(storage = new MemoryStorage()) {
  const document = {
    readyState: "loading",
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const window = { SHOSAI_STORAGE_MIGRATION: true };
  const context = {
    window,
    document,
    localStorage: storage,
    FormData,
    Date,
    Math,
  };
  vm.runInNewContext(appSource, context, { filename: "app.js" });
  return window.SHOSAI_DESK_PROJECTS_API;
}

test("placed 旧形式はエントリ配列へ normalize される", () => {
  const api = loadDeskApi();
  const project = api.normalizeDeskProject({
    id: "proj-legacy-placed",
    title: "問い",
    question: { current: "問い" },
    createdAt: "2026-08-12T00:00:00.000Z",
    placed: ["show-a", 9, "ref-old"],
  });

  assert.deepEqual(JSON.parse(JSON.stringify(project.placed)), [
    { id: "show-a", role: "near", note: "", at: "2026-08-12T00:00:00.000Z" },
    { id: "ref-old", role: "near", note: "", at: "2026-08-12T00:00:00.000Z" },
  ]);
});

test("role note at 付き placed は保存から読込まで保たれる", () => {
  const storage = new MemoryStorage();
  const api = loadDeskApi(storage);
  const project = api.normalizeDeskProject({
    id: "proj-placed-meta",
    title: "問い",
    question: { current: "問い" },
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  });

  api.state.project = { kind: "new", data: project };
  api.state.placed = new Set(["show-a"]);
  api.state.placedMeta = new Map([
    ["show-a", { role: "contrast", note: "逆方向を見る", at: "2026-08-12T01:00:00.000Z" }],
  ]);
  api.syncCurrentDeskProject();

  const saved = JSON.parse(storage.getItem(api.DESK_PROJECTS_STORAGE_KEY));
  assert.deepEqual(JSON.parse(JSON.stringify(saved.projects[0].placed)), [
    { id: "show-a", role: "contrast", note: "逆方向を見る", at: "2026-08-12T01:00:00.000Z" },
  ]);
  const loaded = api.loadDeskProjects();
  assert.deepEqual(JSON.parse(JSON.stringify(loaded[0].placed)), [
    { id: "show-a", role: "contrast", note: "逆方向を見る", at: "2026-08-12T01:00:00.000Z" },
  ]);
});

test("searchShelfWorks は AND 検索・配列一致・一致数から年順の並びを満たす", () => {
  const api = loadDeskApi();
  const works = [
    {
      id: "old",
      title: "Desk Echo",
      company: "Memory Alpha",
      year: 2019,
      genre: "circus",
      summary: "paper table",
      themes: ["memory"],
      tone: ["quiet"],
    },
    {
      id: "new",
      title: "Desk Light",
      company: "Beta",
      year: 2024,
      genre: "theatre",
      summary: "table",
      themes: ["memory", "light"],
      tone: ["quiet"],
      signature_scenes: ["desk under light"],
    },
    {
      id: "few-hits",
      title: "Desk",
      company: "Gamma",
      year: 2026,
      genre: "dance",
      summary: "memory",
    },
  ];

  assert.deepEqual(JSON.parse(JSON.stringify(api.searchShelfWorks(works, "").map((row) => row.work.id))), []);
  assert.deepEqual(JSON.parse(JSON.stringify(api.searchShelfWorks(works, "desk memory").map((row) => row.work.id))), ["new", "old", "few-hits"]);
  assert.deepEqual(JSON.parse(JSON.stringify(api.searchShelfWorks(works, "quiet light").map((row) => row.work.id))), ["new"]);
});

test("confidenceLabel は high medium low その他を日本語へ変換する", () => {
  const api = loadDeskApi();
  assert.equal(api.confidenceLabel("high_official_description_with_scene_detail_unverified"), "高");
  assert.equal(api.confidenceLabel("medium_secondary_source"), "中");
  assert.equal(api.confidenceLabel("low_inferred"), "低");
  assert.equal(api.confidenceLabel("unknown"), "不明");
  assert.equal(api.confidenceLabel(null), "不明");
});

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const migration = require("../storage-migration.js");
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");

class MemoryStorage {
  constructor(entries = {}) {
    this.map = new Map(Object.entries(entries));
  }
  get length() {
    return this.map.size;
  }
  key(index) {
    return Array.from(this.map.keys())[index] || null;
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
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

test("normalizeDeskProject は壊れたJSON・型違い・欠損フィールドを防御する", () => {
  const badStorage = new MemoryStorage({ "shosai-desk-projects-v1": "{" });
  assert.deepEqual(JSON.parse(JSON.stringify(loadDeskApi(badStorage).loadDeskProjects())), []);

  const api = loadDeskApi();
  assert.equal(api.normalizeDeskProject(null), null);
  const project = api.normalizeDeskProject({
    id: 123,
    title: 456,
    question: { current: 789, previous: 123 },
    sceneLineHistory: [{ text: "旧文", at: 123 }, { text: 1 }],
    constraints: [{ label: "  固い制約  ", hard: true }, { label: 99 }],
    scene: { audience: "", relations: [["違う", ""]], removed: "" },
    transformation: { fromLabel: "", rows: [["違う", ""]] },
    placed: ["ref-a", 42],
    decisions: { vA: { verdict: "採用", reason: 77 }, bad: null },
  });

  assert.match(project.id, /^proj-\d+-[a-z0-9]+$/);
  assert.equal(project.question.current, "無題の問い");
  assert.equal(project.question.previous, null);
  assert.deepEqual(JSON.parse(JSON.stringify(project.sceneLineHistory)), [{ text: "旧文", at: project.sceneLineHistory[0].at }]);
  assert.deepEqual(JSON.parse(JSON.stringify(project.constraints)), [{ label: "固い制約", hard: true }]);
  assert.equal(project.scene, null);
  assert.equal(project.transformation, null);
  assert.deepEqual(JSON.parse(JSON.stringify(project.placed)), [{
    id: "ref-a",
    role: "near",
    note: "",
    at: project.createdAt,
  }]);
  assert.deepEqual(JSON.parse(JSON.stringify(project.decisions)), { vA: { verdict: "採用", reason: "" } });
});

test("制作机プロジェクトは保存から読込まで placed と decisions を保つ", () => {
  const storage = new MemoryStorage();
  const api = loadDeskApi(storage);
  const project = api.normalizeDeskProject({
    id: "proj-test",
    title: "問い",
    subtitle: "新しい問い",
    question: { current: "問いを試す" },
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  });

  api.state.project = { kind: "new", data: project };
  api.state.placed = new Set(["ref-a", "ref-b"]);
  api.state.placedMeta = new Map([
    ["ref-a", { role: "near", note: "", at: "2026-08-12T00:00:00.000Z" }],
    ["ref-b", { role: "near", note: "", at: "2026-08-12T00:00:00.000Z" }],
  ]);
  api.state.decisions = { vA: { verdict: "保留", reason: "角度を見る" } };
  api.syncCurrentDeskProject();

  const saved = JSON.parse(storage.getItem(api.DESK_PROJECTS_STORAGE_KEY));
  assert.deepEqual(JSON.parse(JSON.stringify(saved.projects[0].placed)), [
    { id: "ref-a", role: "near", note: "", at: "2026-08-12T00:00:00.000Z" },
    { id: "ref-b", role: "near", note: "", at: "2026-08-12T00:00:00.000Z" },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.projects[0].decisions)), { vA: { verdict: "保留", reason: "角度を見る" } });

  const loaded = api.loadDeskProjects();
  assert.deepEqual(JSON.parse(JSON.stringify(loaded[0].placed)), [
    { id: "ref-a", role: "near", note: "", at: "2026-08-12T00:00:00.000Z" },
    { id: "ref-b", role: "near", note: "", at: "2026-08-12T00:00:00.000Z" },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(loaded[0].decisions)), { vA: { verdict: "保留", reason: "角度を見る" } });
});

test("問い編集では current が previous へ移り、場面の旧文は履歴に残る", () => {
  const api = loadDeskApi();
  const project = api.normalizeDeskProject({
    id: "proj-edit",
    title: "問い",
    question: { current: "最初の問い" },
    sceneLine: "古い一行",
  });

  api.applySheetValues(project, {
    sceneLine: "新しい一行",
    questionCurrent: "次の問い",
    constraints: [{ label: "机だけ", hard: true }],
  });

  assert.equal(project.question.previous, "最初の問い");
  assert.equal(project.question.current, "次の問い");
  assert.equal(project.sceneLine, "新しい一行");
  assert.equal(project.sceneLineHistory[0].text, "古い一行");
  assert.deepEqual(JSON.parse(JSON.stringify(project.constraints)), [{ label: "机だけ", hard: true }]);
});

test("全空の scene と transformation は null になる", () => {
  const api = loadDeskApi();
  const project = api.normalizeDeskProject({
    id: "proj-empty",
    title: "問い",
    question: { current: "問い" },
    scene: { audience: "残る" },
    transformation: { fromLabel: "残る" },
  });

  api.applySheetValues(project, {
    questionCurrent: "問い",
    relations: api.SCENE_RELATION_LABELS.map((label) => [label, ""]),
    transformRows: api.TRANSFORM_ROW_LABELS.map((label) => [label, ""]),
  });

  assert.equal(project.scene, null);
  assert.equal(project.transformation, null);
});

test("storage-migration は制作机プロジェクトの保存キーを管理対象に含める", () => {
  assert.equal(migration.isManagedKey("shosai-desk-projects-v1"), true);
});

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

test("directions / visualMeta は型違い・欠損・旧レコードを防御する", () => {
  const api = loadDeskApi();
  assert.deepEqual(JSON.parse(JSON.stringify(api.normalizeDirections(null))), {
    A: { label: "", intent: "" },
    B: { label: "", intent: "" },
    C: { label: "", intent: "" },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(api.normalizeVisualMeta(null))), {
    A: null,
    B: null,
    C: null,
  });

  const project = api.normalizeDeskProject({
    id: "proj-abc",
    title: "問い",
    question: { current: "問い" },
    directions: {
      A: { label: "  人物中心  ", intent: 99 },
      B: null,
      D: { label: "使わない", intent: "使わない" },
    },
    visualMeta: {
      A: {
        importedAt: "2026-08-13T00:00:00.000Z",
        kind: "external",
        method: 10,
        prompt: "原文",
        firstImpression: { text: "ざらつく", at: "2026-08-13T00:01:00.000Z" },
        revealed: true,
      },
      B: { kind: "bad", firstImpression: [] },
      C: "bad",
    },
  });

  assert.deepEqual(JSON.parse(JSON.stringify(project.directions)), {
    A: { label: "  人物中心  ", intent: "" },
    B: { label: "", intent: "" },
    C: { label: "", intent: "" },
  });
  assert.equal(project.visualMeta.A.kind, "external");
  assert.equal(project.visualMeta.A.method, "");
  assert.equal(project.visualMeta.A.prompt, "原文");
  assert.deepEqual(JSON.parse(JSON.stringify(project.visualMeta.A.firstImpression)), {
    text: "ざらつく",
    at: "2026-08-13T00:01:00.000Z",
  });
  assert.equal(project.visualMeta.A.revealed, true);
  assert.equal(project.visualMeta.B.kind, "ai");
  assert.equal(project.visualMeta.B.firstImpression, null);
  assert.equal(project.visualMeta.C, null);
});

test("visualPromptText は本人の原文を言い換えず機械結合する", () => {
  const api = loadDeskApi();
  const project = api.normalizeDeskProject({
    id: "proj-prompt",
    title: "問い",
    question: { current: "問い" },
    sceneLine: "薄い机の向こうで、二人が息を止める。",
    directions: {
      A: {
        label: "人物と物の関係を中心にする",
        intent: "糸の張りで距離が変わる瞬間だけを見せる。",
      },
    },
    brief: {
      subject: "呼吸の待機",
      viewpoint: "",
      people: "二人、机を挟む",
      objects: "黒い机と紙束",
      background: "",
      color: "鈍い赤を一点だけ",
      light: "机上だけ細い光",
      material: "",
      era: "",
      moment: "片方の手がまだ触れない瞬間",
      lettering: "",
      avoid: "研究室らしい白衣",
    },
  });

  const text = api.visualPromptText(project, "A");
  assert.match(text, /薄い机の向こうで、二人が息を止める。/);
  assert.match(text, /方向: 人物と物の関係を中心にする — 糸の張りで距離が変わる瞬間だけを見せる。/);
  assert.match(text, /主題: 呼吸の待機/);
  assert.match(text, /人物数と距離: 二人、机を挟む/);
  assert.match(text, /主要な物: 黒い机と紙束/);
  assert.match(text, /色: 鈍い赤を一点だけ/);
  assert.match(text, /光: 机上だけ細い光/);
  assert.match(text, /動きの瞬間: 片方の手がまだ触れない瞬間/);
  assert.match(text, /実在作品の意匠・キャラクター・象徴を再現しない。/);
  assert.match(text, /研究室らしい白衣/);
  assert.doesNotMatch(text, /視点と構図:/);
  assert.doesNotMatch(text, /背景:/);
  assert.ok(text.includes("糸の張りで距離が変わる瞬間だけを見せる。"));
});

test("revealed / firstImpression は記入あり・空の両方で開示できる", () => {
  const api = loadDeskApi();
  const project = api.normalizeDeskProject({
    id: "proj-reveal",
    title: "問い",
    question: { current: "問い" },
    visualMeta: {
      A: { importedAt: "2026-08-13T00:00:00.000Z", kind: "ai", revealed: false },
      B: { importedAt: "2026-08-13T00:00:00.000Z", kind: "self", revealed: false },
    },
  });

  api.revealVisualSlot(project, "A", "身体が先に引かれる感じ");
  api.revealVisualSlot(project, "B", "");
  assert.equal(project.visualMeta.A.revealed, true);
  assert.equal(project.visualMeta.A.firstImpression.text, "身体が先に引かれる感じ");
  assert.equal(project.visualMeta.B.revealed, true);
  assert.equal(project.visualMeta.B.firstImpression, null);
});

test("decisions の A/B/C キーは保存から読込まで保たれる", () => {
  const storage = new MemoryStorage();
  const api = loadDeskApi(storage);
  const project = api.normalizeDeskProject({
    id: "proj-decisions",
    title: "問い",
    question: { current: "問い" },
    createdAt: "2026-08-13T00:00:00.000Z",
    updatedAt: "2026-08-13T00:00:00.000Z",
  });

  api.state.project = { kind: "new", data: project };
  api.state.placed = new Set();
  api.state.placedMeta = new Map();
  api.state.decisions = {
    A: { verdict: "採用", reason: "距離が良い" },
    B: { verdict: "保留", reason: "" },
    C: { verdict: "不採用", reason: "説明的" },
  };
  api.syncCurrentDeskProject();

  const loaded = api.loadDeskProjects();
  assert.deepEqual(JSON.parse(JSON.stringify(loaded[0].decisions)), {
    A: { verdict: "採用", reason: "距離が良い" },
    B: { verdict: "保留", reason: "" },
    C: { verdict: "不採用", reason: "説明的" },
  });
});

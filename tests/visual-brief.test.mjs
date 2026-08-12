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

test("normalizeBrief は型違い・欠損・全空を防御する", () => {
  const api = loadDeskApi();
  assert.equal(api.normalizeBrief(null), null);
  assert.equal(api.normalizeBrief([]), null);
  assert.equal(api.normalizeBrief({ subject: "  ", people: "" }), null);

  const brief = api.normalizeBrief({
    subject: 123,
    people: "二人、机を挟む",
    unknown: "使わない",
  });
  assert.equal(brief.subject, "");
  assert.equal(brief.people, "二人、机を挟む");
  assert.equal(brief.objects, "");
  assert.equal(Object.keys(brief).length, api.BRIEF_FIELD_LABELS.length);
});

test("brief ありプロジェクトは保存から読込まで保たれる", () => {
  const storage = new MemoryStorage();
  const api = loadDeskApi(storage);
  const project = api.normalizeDeskProject({
    id: "proj-brief",
    title: "問い",
    question: { current: "問い" },
    brief: {
      subject: "呼び出し",
      viewpoint: "俯瞰",
      lettering: "なし",
    },
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  });

  api.state.project = { kind: "new", data: project };
  api.state.placed = new Set();
  api.state.decisions = {};
  api.syncCurrentDeskProject();

  const loaded = api.loadDeskProjects();
  assert.equal(loaded[0].brief.subject, "呼び出し");
  assert.equal(loaded[0].brief.viewpoint, "俯瞰");
  assert.equal(loaded[0].brief.lettering, "なし");
});

test("briefDraftFromStudy は本人の記述を原文のまま所定項目へ写す", () => {
  const api = loadDeskApi();
  const project = api.normalizeDeskProject({
    id: "proj-study",
    title: "問い",
    question: { current: "問い" },
    scene: {
      relations: [
        ["人物", "演者二人が遠く向き合う"],
        ["物", "黒い机と紙束"],
        ["光", "机上だけ細い光"],
        ["音", "紙が擦れる音"],
        ["背景", "奥に低い棚"],
      ],
      removed: "説明字幕",
    },
    transformation: {
      rows: [
        ["元の構造", ""],
        ["残す機能", ""],
        ["変更する条件", ""],
        ["避ける表面", "研究室らしい白衣"],
        ["生まれた案", ""],
      ],
    },
  });

  const draft = api.briefDraftFromStudy(project);
  assert.equal(draft.people, "演者二人が遠く向き合う");
  assert.equal(draft.objects, "黒い机と紙束");
  assert.equal(draft.light, "机上だけ細い光");
  assert.equal(draft.background, "奥に低い棚");
  assert.equal(draft.avoid, "説明字幕／研究室らしい白衣");
  assert.equal(draft.subject, "");
  assert.equal(draft.viewpoint, "");
  assert.equal(draft.color, "");
});

test("briefDraftFromStudy は scene と transformation が null でも壊れない", () => {
  const api = loadDeskApi();
  const draft = api.briefDraftFromStudy({ scene: null, transformation: null });
  assert.equal(draft.people, "");
  assert.equal(draft.objects, "");
  assert.equal(draft.light, "");
  assert.equal(draft.background, "");
  assert.equal(draft.avoid, "");
});

test("旧形式の保存データは brief キーなしでも読める", () => {
  const storage = new MemoryStorage({
    "shosai-desk-projects-v1": JSON.stringify({
      version: 1,
      projects: [{
        id: "proj-old",
        title: "旧問い",
        question: { current: "旧形式を読む" },
      }],
    }),
  });
  const api = loadDeskApi(storage);
  const loaded = api.loadDeskProjects();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].brief, null);
  assert.equal(loaded[0].question.current, "旧形式を読む");
});

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

function sampleParent(api) {
  return api.normalizeDeskProject({
    id: "proj-parent",
    title: "案A",
    subtitle: "新しい問い",
    question: { previous: "前の問い", current: "今の問い" },
    sceneLine: "机の向こうで手が止まる。",
    sceneLineHistory: [{ text: "古い一行", at: "2026-08-12T00:00:00.000Z" }],
    constraints: [{ label: "机だけ", hard: true }],
    scene: {
      audience: "触れそうで触れない緊張を見る",
      entry: "手が紙束へ伸びる",
      exit: "糸が切れる",
      relations: [
        ["人物", "二人"],
        ["物", "机と紙束"],
        ["光", "机上だけ"],
        ["音", "息"],
        ["背景", "暗い壁"],
      ],
      removed: "説明的な台詞",
      undecided: "終わり方",
      next: "距離を詰める",
    },
    transformation: {
      fromLabel: "綱引き",
      rows: [
        ["元の構造", "引く"],
        ["残す機能", "緊張"],
        ["変更する条件", "机上"],
        ["避ける表面", "競技"],
        ["生まれた案", "触れない引力"],
      ],
    },
    brief: {
      subject: "呼吸の待機",
      viewpoint: "机の高さ",
      people: "二人",
      objects: "黒い机",
      light: "細い光",
      avoid: "白衣",
    },
    directions: {
      A: { label: "身体", intent: "引かれる" },
      B: { label: "光", intent: "切る" },
      C: { label: "視点", intent: "観客の発見" },
    },
    visualMeta: {
      A: {
        importedAt: "2026-08-13T00:00:00.000Z",
        kind: "ai",
        method: "model",
        prompt: "prompt",
        firstImpression: { text: "ざらつく", at: "2026-08-13T00:01:00.000Z" },
        revealed: true,
      },
    },
    placed: [{ id: "ref-a", role: "contrast", note: "距離", at: "2026-08-12T00:00:00.000Z" }],
    decisions: { A: { verdict: "採用", reason: "距離が良い" } },
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:30:00.000Z",
  });
}

test("branchOrigin は型違い・欠損・旧レコードを null に正規化する", () => {
  const api = loadDeskApi();
  assert.equal(api.normalizeDeskProject({ title: "旧", question: { current: "旧" } }).branchOrigin, null);
  assert.equal(api.normalizeDeskProject({
    title: "型違い",
    question: { current: "型違い" },
    branchOrigin: "bad",
  }).branchOrigin, null);
  assert.equal(api.normalizeDeskProject({
    title: "欠損",
    question: { current: "欠損" },
    branchOrigin: { parentId: "proj-parent", branchReason: "理由" },
  }).branchOrigin, null);
});

test("buildBranchProject は親を不変に保ち、枝へ制作状態と派生情報を深いコピーする", () => {
  const api = loadDeskApi();
  const parent = sampleParent(api);
  const before = JSON.parse(JSON.stringify(parent));

  const branch = api.buildBranchProject(parent, "身体性を強めるため");

  assert.match(branch.id, /^proj-\d+-[a-z0-9]+$/);
  assert.notEqual(branch.id, parent.id);
  assert.equal(branch.createdAt, branch.updatedAt);
  assert.deepEqual(JSON.parse(JSON.stringify(parent)), before);

  assert.deepEqual(JSON.parse(JSON.stringify(branch.scene)), JSON.parse(JSON.stringify(parent.scene)));
  assert.deepEqual(JSON.parse(JSON.stringify(branch.brief)), JSON.parse(JSON.stringify(parent.brief)));
  assert.deepEqual(JSON.parse(JSON.stringify(branch.directions)), JSON.parse(JSON.stringify(parent.directions)));
  assert.deepEqual(JSON.parse(JSON.stringify(branch.decisions)), JSON.parse(JSON.stringify(parent.decisions)));
  assert.deepEqual(JSON.parse(JSON.stringify(branch.placed)), JSON.parse(JSON.stringify(parent.placed)));
  assert.deepEqual(JSON.parse(JSON.stringify(branch.visualMeta)), JSON.parse(JSON.stringify(parent.visualMeta)));
  assert.deepEqual(JSON.parse(JSON.stringify(branch.sceneLineHistory)), JSON.parse(JSON.stringify(parent.sceneLineHistory)));

  assert.equal(branch.branchOrigin.parentId, parent.id);
  assert.equal(branch.branchOrigin.parentTitle, parent.title);
  assert.equal(branch.branchOrigin.branchReason, "身体性を強めるため");
  assert.equal(branch.branchOrigin.branchedAt, branch.createdAt);
  assert.deepEqual(JSON.parse(JSON.stringify(branch.branchOrigin.parentSnapshot)), JSON.parse(JSON.stringify(parent)));

  branch.scene.relations[0][1] = "一人";
  branch.brief.subject = "変更";
  branch.directions.A.label = "変更";
  branch.decisions.A.reason = "変更";
  branch.placed[0].note = "変更";
  branch.sceneLineHistory[0].text = "変更";

  assert.equal(parent.scene.relations[0][1], "二人");
  assert.equal(branch.branchOrigin.parentSnapshot.scene.relations[0][1], "二人");
  assert.equal(parent.brief.subject, "呼吸の待機");
  assert.equal(branch.branchOrigin.parentSnapshot.brief.subject, "呼吸の待機");
  assert.equal(parent.directions.A.label, "身体");
  assert.equal(branch.branchOrigin.parentSnapshot.directions.A.label, "身体");
  assert.equal(parent.decisions.A.reason, "距離が良い");
  assert.equal(branch.branchOrigin.parentSnapshot.decisions.A.reason, "距離が良い");
  assert.equal(parent.placed[0].note, "距離");
  assert.equal(branch.branchOrigin.parentSnapshot.placed[0].note, "距離");
  assert.equal(parent.sceneLineHistory[0].text, "古い一行");
  assert.equal(branch.branchOrigin.parentSnapshot.sceneLineHistory[0].text, "古い一行");
});

test("branchOrigin は保存から読込まで保たれる", () => {
  const storage = new MemoryStorage();
  const api = loadDeskApi(storage);
  const parent = sampleParent(api);
  const branch = api.buildBranchProject(parent, "身体性を強めるため");

  api.state.project = { kind: "new", data: branch };
  api.state.placed = new Set(branch.placed.map((item) => item.id));
  api.state.placedMeta = new Map(branch.placed.map((item) => [item.id, item]));
  api.state.decisions = { ...branch.decisions };
  api.syncCurrentDeskProject();

  const loaded = api.loadDeskProjects()[0];
  assert.equal(loaded.branchOrigin.parentId, "proj-parent");
  assert.equal(loaded.branchOrigin.parentTitle, "案A");
  assert.equal(loaded.branchOrigin.branchReason, "身体性を強めるため");
  assert.deepEqual(
    JSON.parse(JSON.stringify(loaded.branchOrigin.parentSnapshot)),
    JSON.parse(JSON.stringify(parent)),
  );
});

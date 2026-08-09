import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");

function loadPanelModel() {
  const bridge = {
    runAgent: async () => ({ ok: true, output: "", exitCode: 0 }),
    stopAgent: async () => false,
    agentInfo: async () => ({}),
    writeProject: async () => ({ projectId: "show-a", revision: 1 }),
    latestPlan: async () => null,
    listEditExports: async () => [],
    readExport: async () => ({}),
  };
  const window = { stageSketchBridge: bridge };
  const document = {
    querySelectorAll() { return []; },
    getElementById() { return null; },
  };
  vm.runInContext(stageSource, vm.createContext({ window, document }));
  return window.SHOSAI_STAGE_AI_PANEL_MODEL;
}

function rawPlan() {
  return {
    kind: "stage-sketch-edit-plan",
    version: 1,
    planId: "plan-draft-1",
    projectId: "show-a",
    expectedRevision: 2,
    status: "proposed",
    summary: "配置を下書きします。",
    warnings: [],
    questions: [],
    diff: [
      {
        sceneId: "scene-a",
        sceneTitle: "場面A",
        lines: ["ミナを移動。"],
        pieces: [{
          change: "move",
          assetType: "performer",
          label: "ミナ",
          kind: null,
          from: { u: 0.2, v: 0.4, size: 100, facing: 0, color: "#a84b26" },
          to: { u: 0.7, v: 0.5, size: 100, facing: 45, color: "#a84b26" },
        }],
      },
      {
        sceneId: "scene-b",
        sceneTitle: "場面B",
        lines: ["場面名だけ変更。"],
        pieces: [],
      },
      {
        sceneId: "scene-c",
        sceneTitle: "場面C",
        lines: [],
        pieces: [{
          change: "add",
          assetType: "set",
          label: "円座",
          kind: "block",
          from: null,
          to: { u: 0.5, v: 0.6, size: 100, facing: 0, color: "#77865f" },
        }],
      },
    ],
  };
}

test("下書きは同じショーかつ同じ場面でpiecesがある場合だけ表示対象になる", () => {
  const model = loadPanelModel();
  const plan = model.normalizePlan(rawPlan());

  assert.equal(plan.diff.length, 3);
  assert.equal(model.overlayDiff(plan, "show-a", "scene-a").pieces[0].change, "move");
  assert.equal(model.overlayDiff(plan, "show-a", "scene-c").pieces[0].change, "add");
  assert.equal(model.overlayDiff(plan, "show-a", "scene-b"), null, "piecesが空なら重ねない");
  assert.equal(model.overlayDiff(plan, "show-a", "scene-x"), null, "別場面には重ねない");
  assert.equal(model.overlayDiff(plan, "show-b", "scene-a"), null, "別ショーには重ねない");
});

test("下書き状態を失えば場面に一致していても表示対象は消える", () => {
  const model = loadPanelModel();
  let plan = model.normalizePlan(rawPlan());
  assert.ok(model.overlayDiff(plan, "show-a", "scene-a"));

  plan = null;
  assert.equal(model.overlayDiff(plan, "show-a", "scene-a"), null);
});

test("破棄・Esc・採用完了・別ショー切替は下書き状態を消し、場面切替は再描画する", () => {
  assert.match(stageSource, /function discardStageAskPlan\(\) \{[\s\S]*?resetStageAskDraft\([\s\S]*?render\(\)/);
  assert.match(stageSource, /event\.key !== "Escape"[\s\S]*?discardStageAskPlan\(\)/);
  assert.match(stageSource, /function adoptStageAskPlan\([\s\S]*?resetStageAskDraft\(\{ clearInput: true \}\)[\s\S]*?applyLoadedState/);
  assert.match(stageSource, /function applyLoadedState\([\s\S]*?resetStageAskDraft\(\{ clearInput: true, invalidate: true \}\)/);
  assert.match(stageSource, /function openScene\([\s\S]*?state\.project\.activeSceneId = id;[\s\S]*?render\(\)/);
});

test("下書きは通常駒の共通描画経路を0.45で使い、当たり判定の配列へ足さない", () => {
  assert.match(stageSource, /const draw = \(piece\) => drawStagePiece\(target, piece, L, leanAt\)/);
  assert.match(stageSource, /function drawStageAskOverlay\([\s\S]*?target\.globalAlpha = 0\.45;[\s\S]*?drawStagePiece\(target, draft, L, leanAt\)/);
  assert.match(stageSource, /target\.strokeStyle = "#9c823f";[\s\S]*?target\.setLineDash\(\[3, 3\]\)/);
  assert.match(stageSource, /function hitTest\([\s\S]*?sc\(\)\.pieces/);
  assert.doesNotMatch(stageSource, /sc\(\)\.pieces\.push\(draft\)/);
  assert.match(i18nSource, /"下書き — まだ保存していません": "Draft — not saved yet"/);
});

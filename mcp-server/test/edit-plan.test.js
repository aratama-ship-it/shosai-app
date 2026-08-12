import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ProjectStore } from "../src/project-store.js";
import { planEditSchema } from "../src/schemas.js";
import { GUIDE } from "../src/stage-model.js";

async function temporaryStore() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "stage-sketch-edit-plan-test-"));
  const store = new ProjectStore(directory);
  await store.init();
  return store;
}

async function createSwapShow(projectId = "swap-show") {
  const store = await temporaryStore();
  const document = await store.create({
    projectId,
    title: "円座の入替テスト",
    scenes: [
      {
        id: "scene-1",
        title: "第1場面 導入",
        placements: [
          { assetType: "performer", assetName: "ミナ", u: 0.2, v: 0.7 },
        ],
      },
      {
        id: "scene-2",
        title: "第2場面 円座B",
        placements: [
          { assetType: "set", assetName: "円座B", kind: "block", u: 0.6, v: 0.5 },
        ],
      },
      {
        id: "scene-3",
        title: "第3場面 円座A",
        placements: [
          {
            assetType: "set",
            assetName: "円座A",
            kind: "block",
            u: 0.25,
            v: 0.55,
            size: 120,
            facing: 45,
            color: "#123456",
            route: { u: 0.4, v: 0.6 },
          },
          { assetType: "performer", assetName: "ミナ", u: 0.7, v: 0.65 },
        ],
      },
    ],
  });
  return { store, document };
}

function replacementOperation(document, overrides = {}) {
  const from = document.project.sets.find((item) => item.name === "円座A");
  const to = document.project.sets.find((item) => item.name === "円座B");
  return {
    op: "replace_scene_asset",
    sceneId: "scene-3",
    from: { assetType: "set", assetId: from.id },
    to: { assetType: "set", assetId: to.id },
    preservePlacement: true,
    ...overrides,
  };
}

async function planSwap(store, document) {
  return store.planEdit({
    projectId: document.project.id,
    expectedRevision: 1,
    request: "第3場面の円座を、第2場面で使っている円座に入れ替える",
    operations: [replacementOperation(document)],
  });
}

function placementState(piece) {
  return {
    u: piece.u,
    v: piece.v,
    size: piece.size,
    facing: piece.facing,
    color: piece.color,
  };
}

test("shows the third-scene source and second-scene replacement in a Japanese diff", async () => {
  const { store, document } = await createSwapShow();
  const projectFile = store.projectPath("swap-show");
  const before = await readFile(projectFile);
  const plan = await planSwap(store, document);

  const after = await readFile(projectFile);
  assert.equal(Buffer.compare(before, after), 0);
  assert.deepEqual(await readdir(store.exportsDir), []);
  assert.deepEqual(await readdir(store.plansDir), [`${plan.planId}.json`]);
  assert.equal(plan.status, "proposed");
  assert.equal(plan.requiresConfirmation, true);
  assert.equal(plan.diff.length, 1);
  assert.equal(plan.diff[0].sceneId, "scene-3");
  assert.match(plan.diff[0].before.join("\n"), /円座A/);
  assert.match(plan.diff[0].after.join("\n"), /円座B/);
  assert.match(plan.diff[0].lines.join("\n"), /円座A → 円座B/);
  assert.doesNotMatch(plan.diff[0].lines.join("\n"), /set-/);
  const beforePiece = document.project.scenes.find((scene) => scene.id === "scene-3").pieces[0];
  assert.deepEqual(plan.diff[0].pieces, [{
    change: "replace",
    assetType: "set",
    label: "円座B",
    kind: "block",
    from: placementState(beforePiece),
    to: placementState(beforePiece),
  }]);
});

test("returns only the moved performer as a structured move piece", async () => {
  const { store, document } = await createSwapShow("move-piece-show");
  const mina = document.project.cast.find((item) => item.name === "ミナ");
  const beforePiece = document.project.scenes.find((scene) => scene.id === "scene-3")
    .pieces.find((piece) => piece.castId === mina.id);
  const plan = await store.planEdit({
    projectId: "move-piece-show",
    expectedRevision: 1,
    request: "第3場面のミナを移動する",
    operations: [{
      op: "update_placement",
      sceneId: "scene-3",
      target: { assetType: "performer", assetId: mina.id },
      changes: { u: 0.15, v: 0.25 },
    }],
  });

  assert.deepEqual(plan.diff[0].pieces, [{
    change: "move",
    assetType: "performer",
    label: "ミナ",
    kind: null,
    from: placementState(beforePiece),
    to: { ...placementState(beforePiece), u: 0.15, v: 0.25 },
  }]);
});

test("returns an asset-note-only change as a structured update piece", async () => {
  const { store, document } = await createSwapShow("update-piece-show");
  const circleA = document.project.sets.find((item) => item.name === "円座A");
  const beforePiece = document.project.scenes.find((scene) => scene.id === "scene-3")
    .pieces.find((piece) => piece.setId === circleA.id);
  const plan = await store.planEdit({
    projectId: "update-piece-show",
    expectedRevision: 1,
    request: "円座Aのメモを更新する",
    operations: [{
      op: "update_placement",
      sceneId: "scene-3",
      target: { assetType: "set", assetId: circleA.id },
      changes: { assetNote: "転換時に確認" },
    }],
  });

  assert.deepEqual(plan.diff[0].pieces, [{
    change: "update",
    assetType: "set",
    label: "円座A",
    kind: "block",
    from: placementState(beforePiece),
    to: placementState(beforePiece),
  }]);
});

test("returns every normalized placement as add pieces for an added scene", async () => {
  const { store } = await createSwapShow("add-piece-show");
  const plan = await store.planEdit({
    projectId: "add-piece-show",
    expectedRevision: 1,
    request: "二つの駒がある場面を追加する",
    operations: [{
      op: "add_scene",
      afterSceneId: "scene-3",
      scene: {
        id: "scene-added",
        title: "追加場面",
        placements: [
          {
            assetType: "performer",
            assetName: "ソラ",
            u: 0.1,
            v: 0.2,
            size: 110,
            facing: 270,
            color: "#ABCDEF",
          },
          {
            assetType: "set",
            assetName: "追加台",
            kind: "table",
            u: 0.8,
            v: 0.6,
            size: 130,
            facing: 90,
            color: "#FEDCBA",
          },
        ],
      },
    }],
  });

  assert.deepEqual(plan.diff[0].pieces, [
    {
      change: "add",
      assetType: "performer",
      label: "ソラ",
      kind: null,
      from: null,
      to: { u: 0.1, v: 0.2, size: 110, facing: 270, color: "#abcdef" },
    },
    {
      change: "add",
      assetType: "set",
      label: "追加台",
      kind: "table",
      from: null,
      to: { u: 0.8, v: 0.6, size: 130, facing: 90, color: "#fedcba" },
    },
  ]);
});

test("returns only the removed performer as a structured remove piece", async () => {
  const { store, document } = await createSwapShow("remove-piece-show");
  const mina = document.project.cast.find((item) => item.name === "ミナ");
  const beforePiece = document.project.scenes.find((scene) => scene.id === "scene-3")
    .pieces.find((piece) => piece.castId === mina.id);
  const plan = await store.planEdit({
    projectId: "remove-piece-show",
    expectedRevision: 1,
    request: "第3場面のミナを削除する",
    operations: [{
      op: "remove_placement",
      sceneId: "scene-3",
      target: { assetType: "performer", assetId: mina.id },
    }],
  });

  assert.deepEqual(plan.diff[0].pieces, [{
    change: "remove",
    assetType: "performer",
    label: "ミナ",
    kind: null,
    from: placementState(beforePiece),
    to: null,
  }]);
});

test("minimal performer instruction becomes a proposed operation with manual-add defaults", async () => {
  const store = await temporaryStore();
  await store.create({
    projectId: "minimal-performer-show",
    title: "最小指示",
    scenes: [{ id: "scene-1", title: "場面 1" }],
  });

  const plan = await store.planEdit({
    projectId: "minimal-performer-show",
    expectedRevision: 1,
    request: "演者を1人追加して",
    operations: [{
      op: "add_placement",
      sceneId: "scene-1",
      placement: { assetType: "performer" },
    }],
  });

  assert.equal(plan.status, "proposed");
  assert.deepEqual(plan.questions, []);
  assert.deepEqual(plan.operations[0].placement, {
    assetType: "performer",
    assetName: "演者1",
    language: "ja",
    u: 0.32,
    v: 0.6,
    size: 100,
    color: "#a84b26",
    facing: 0,
    pose: "stand",
    heightCm: 165,
  });
  assert.equal(plan.diff[0].pieces[0].label, "演者1");

  await store.applyEditPlan({
    planId: plan.planId,
    projectId: "minimal-performer-show",
    expectedRevision: 1,
    confirmed: true,
  });
  const current = await store.read("minimal-performer-show");
  assert.equal(current.project.cast[0].heightCm, 165);
  assert.equal(current.project.scenes[0].pieces[0].pose, "stand");
});

test("unnamed English sets use manual naming, placement, color, and dimensions", async () => {
  const store = await temporaryStore();
  await store.create({
    projectId: "minimal-set-show",
    title: "Set defaults",
    scenes: [{ id: "scene-1", title: "Scene 1" }],
  });

  const plan = await store.planEdit({
    projectId: "minimal-set-show",
    expectedRevision: 1,
    request: "Add one set",
    operations: [{
      op: "add_placement",
      sceneId: "scene-1",
      placement: { assetType: "set", language: "en" },
    }],
  });

  assert.equal(plan.status, "proposed");
  assert.deepEqual(plan.operations[0].placement, {
    assetType: "set",
    language: "en",
    assetName: "Platform 1",
    kind: "block",
    u: 0.28,
    v: 0.5,
    size: 100,
    color: "#77865f",
    facing: 0,
    dims: { w: 2.04, d: 0.66, h: 1.2, lift: 0 },
    flown: false,
    wires: 2,
    framed: false,
    lightKind: "hang",
  });
});

test("light additions use the selected manual light kind defaults", async () => {
  const store = await temporaryStore();
  await store.create({
    projectId: "minimal-light-show",
    title: "照明既定値",
    scenes: [{ id: "scene-1", title: "場面 1" }],
  });

  const plan = await store.planEdit({
    projectId: "minimal-light-show",
    expectedRevision: 1,
    request: "SSを1灯追加して",
    operations: [{
      op: "add_placement",
      sceneId: "scene-1",
      placement: { assetType: "set", kind: "light", lightKind: "ss" },
    }],
  });

  assert.equal(plan.operations[0].placement.assetName, "照明1");
  assert.equal(plan.operations[0].placement.color, "#d3ac59");
  assert.deepEqual(plan.operations[0].placement.dims, { dia: 2.6 });

  await store.applyEditPlan({
    planId: plan.planId,
    projectId: "minimal-light-show",
    expectedRevision: 1,
    confirmed: true,
  });
  const current = await store.read("minimal-light-show");
  assert.deepEqual(current.project.scenes[0].pieces[0].beam, {
    u: -0.06,
    v: 0.5,
    h: 1.7,
    toH: 1.3,
  });
});

test("auto names skip names already used across both cast and sets", async () => {
  const store = await temporaryStore();
  await store.create({
    projectId: "auto-name-show",
    title: "自動名",
    scenes: [{
      id: "scene-1",
      title: "場面 1",
      placements: [
        { assetType: "performer", assetName: "演者1", u: 0.2, v: 0.6 },
        { assetType: "set", assetName: "演者2", kind: "block", u: 0.8, v: 0.5 },
      ],
    }],
  });

  const plan = await store.planEdit({
    projectId: "auto-name-show",
    expectedRevision: 1,
    request: "演者を1人追加して",
    operations: [{
      op: "add_placement",
      sceneId: "scene-1",
      placement: { assetType: "performer" },
    }],
  });

  assert.equal(plan.operations[0].placement.assetName, "演者3");
  assert.ok(Math.abs(plan.operations[0].placement.u - 0.41) < 1e-12);
  assert.ok(Math.abs(plan.operations[0].placement.v - 0.67) < 1e-12);
});

test("keeps an ambiguous asset name in needs_clarification with human candidates", async () => {
  const store = await temporaryStore();
  const document = await store.create({
    projectId: "ambiguous-show",
    title: "曖昧候補",
    scenes: [
      {
        id: "scene-1",
        title: "平たい円座",
        placements: [{ assetType: "set", assetName: "円座", kind: "block", u: 0.3, v: 0.5 }],
      },
      {
        id: "scene-2",
        title: "丸い円座",
        placements: [{ assetType: "set", assetName: "円座", kind: "sphere", u: 0.5, v: 0.5 }],
      },
      {
        id: "scene-3",
        title: "置換先",
        placements: [{ assetType: "set", assetName: "別の台", kind: "table", u: 0.6, v: 0.5 }],
      },
    ],
  });
  const replacement = document.project.sets.find((item) => item.name === "別の台");
  const plan = await store.planEdit({
    projectId: "ambiguous-show",
    expectedRevision: 1,
    request: "円座を入れ替える",
    operations: [{
      op: "replace_scene_asset",
      sceneId: "scene-1",
      from: { assetType: "set", assetName: "円座" },
      to: { assetType: "set", assetId: replacement.id },
    }],
  });

  assert.equal(plan.status, "needs_clarification");
  assert.match(plan.questions.join("\n"), /円座.*2件/);
  assert.match(plan.questions.join("\n"), /セット\(block\).*平たい円座/);
  assert.match(plan.questions.join("\n"), /セット\(sphere\).*丸い円座/);
  await assert.rejects(
    store.applyEditPlan({
      planId: plan.planId,
      projectId: "ambiguous-show",
      expectedRevision: 1,
      confirmed: true,
    }),
    /確認が必要な編集計画/,
  );

  const plansBeforeMissingName = await readdir(store.plansDir);
  await assert.rejects(
    store.planEdit({
      projectId: "ambiguous-show",
      expectedRevision: 1,
      request: "存在しない円座を入れ替える",
      operations: [{
        op: "replace_scene_asset",
        sceneId: "scene-1",
        from: { assetType: "set", assetName: "円座C" },
        to: { assetType: "set", assetId: replacement.id },
      }],
    }),
    /円座C.*既存のセットに見つかりません/,
  );
  assert.deepEqual(await readdir(store.plansDir), plansBeforeMissingName);
});

test("rejects a questions-only plan because missing values must use defaults", async () => {
  const { store } = await createSwapShow("questions-only-show");
  await assert.rejects(
    store.planEdit({
      projectId: "questions-only-show",
      expectedRevision: 1,
      request: "演者を増やして 一人",
      operations: [],
      questions: ["追加する演者の名前・場面・位置・姿勢を教えてください。"],
    }),
    /operationsを1件以上.*既定値/,
  );
  assert.deepEqual(await readdir(store.plansDir), []);
});

test("rejects a plan when operations and questions are both empty", async () => {
  const { store } = await createSwapShow("empty-plan-show");
  await assert.rejects(
    store.planEdit({
      projectId: "empty-plan-show",
      expectedRevision: 1,
      request: "何もしない",
      operations: [],
      questions: [],
    }),
    /operationsを1件以上.*既定値/,
  );
  assert.deepEqual(await readdir(store.plansDir), []);
});

test("combines supplied and MCP-detected questions without duplicates", async () => {
  const store = await temporaryStore();
  const document = await store.create({
    projectId: "combined-questions-show",
    title: "質問統合",
    scenes: [
      {
        id: "scene-1",
        title: "平たい円座",
        placements: [{ assetType: "set", assetName: "円座", kind: "block", u: 0.3, v: 0.5 }],
      },
      {
        id: "scene-2",
        title: "丸い円座",
        placements: [{ assetType: "set", assetName: "円座", kind: "sphere", u: 0.5, v: 0.5 }],
      },
      {
        id: "scene-3",
        title: "置換先",
        placements: [{ assetType: "set", assetName: "別の台", kind: "table", u: 0.6, v: 0.5 }],
      },
    ],
  });
  const replacement = document.project.sets.find((item) => item.name === "別の台");
  const detectedQuestion = "置換対象「円座」は2件に一致しました。名前を特定してください。" +
    "候補: 円座 / セット(block) / 登場場面: 平たい円座 / 円座 / セット(sphere) / 登場場面: 丸い円座";
  const plan = await store.planEdit({
    projectId: "combined-questions-show",
    expectedRevision: 1,
    request: "円座を入れ替える",
    operations: [{
      op: "replace_scene_asset",
      sceneId: "scene-1",
      from: { assetType: "set", assetName: "円座" },
      to: { assetType: "set", assetId: replacement.id },
    }],
    questions: ["どの円座を指していますか。", detectedQuestion, detectedQuestion],
  });

  assert.equal(plan.status, "needs_clarification");
  assert.deepEqual(plan.questions, ["どの円座を指していますか。", detectedQuestion]);
});

test("questions accepts at most ten strings of 800 characters", () => {
  const base = {
    projectId: "question-schema-show",
    expectedRevision: 1,
    request: "質問する",
    operations: [{
      op: "add_placement",
      sceneId: "scene-1",
      placement: { assetType: "performer" },
    }],
  };
  const parse = (questions) => {
    const values = {};
    for (const [key, schema] of Object.entries(planEditSchema)) {
      const result = schema.safeParse({ ...base, questions }[key]);
      if (!result.success) return false;
      values[key] = result.data;
    }
    return values;
  };

  assert.ok(parse(["あ".repeat(800)]));
  assert.equal(parse(["あ".repeat(801)]), false);
  assert.equal(parse(Array.from({ length: 11 }, (_, index) => `質問${index}`)), false);
});

test("GUIDEのadd_placement例は現在のplan_editスキーマで有効", () => {
  const parsed = {};
  for (const [key, schema] of Object.entries(planEditSchema)) {
    const result = schema.safeParse(GUIDE.planEditExample[key]);
    assert.equal(result.success, true, `${key}がplan_editスキーマに一致する`);
    parsed[key] = result.data;
  }
  assert.equal(parsed.operations[0].op, "add_placement");
  assert.equal(parsed.operations[0].sceneId, "scene-1");
});

test("does not change the canonical project without confirmed true", async () => {
  const { store, document } = await createSwapShow("confirmation-show");
  const plan = await planSwap(store, document);
  const projectFile = store.projectPath("confirmation-show");
  const before = await readFile(projectFile);

  const result = await store.applyEditPlan({
    planId: plan.planId,
    projectId: "confirmation-show",
    expectedRevision: 1,
  });

  const after = await readFile(projectFile);
  assert.equal(Buffer.compare(before, after), 0);
  assert.equal(result.applied, false);
  assert.match(result.nextStep, /confirmed: true/);
});

test("rejects applying a plan after the canonical revision has changed", async () => {
  const { store, document } = await createSwapShow("stale-plan-show");
  const plan = await planSwap(store, document);
  await store.updateScene({
    projectId: "stale-plan-show",
    expectedRevision: 1,
    sceneId: "scene-1",
    title: "別の変更",
  });

  await assert.rejects(
    store.applyEditPlan({
      planId: plan.planId,
      projectId: "stale-plan-show",
      expectedRevision: 1,
      confirmed: true,
    }),
    /revisionが一致しません/,
  );
});

test("archives the prior revision and exports editSummary after applying", async () => {
  const { store, document } = await createSwapShow("history-show");
  const plan = await planSwap(store, document);
  const result = await store.applyEditPlan({
    planId: plan.planId,
    projectId: "history-show",
    expectedRevision: 1,
    confirmed: true,
  });

  assert.equal(result.applied, true);
  assert.equal(result.project.revision, 2);
  const current = await store.read("history-show");
  assert.equal(current.project.versionLabel, "AI編集 r2");
  const archived = JSON.parse(await readFile(
    path.join(store.historyDir, "history-show", "revision-1.json"),
    "utf8",
  ));
  assert.equal(archived.mcpMeta.revision, 1);
  const savedPlan = await store.readPlan(plan.planId);
  assert.equal(savedPlan.status, "applied");
  assert.equal(savedPlan.appliedRevision, 2);
  assert.ok(savedPlan.appliedAt);
  const exported = JSON.parse(await readFile(result.preparedImport.importFile, "utf8"));
  assert.equal(exported.editSummary.planId, plan.planId);
  assert.equal(exported.editSummary.baseRevision, 1);
  assert.equal(exported.editSummary.appliedRevision, 2);
  assert.deepEqual(exported.editSummary.diff, plan.diff);
  assert.equal(exported.editSummary.diff[0].pieces[0].change, "replace");
  assert.equal(exported.project.versionLabel, "AI編集 r2");
});

test("rejects a missing assetId without saving a plan", async () => {
  const { store } = await createSwapShow("missing-asset-show");
  await assert.rejects(
    store.planEdit({
      projectId: "missing-asset-show",
      expectedRevision: 1,
      request: "存在しない道具へ入れ替える",
      operations: [{
        op: "replace_scene_asset",
        sceneId: "scene-3",
        from: { assetType: "set", assetId: "set-does-not-exist" },
        to: { assetType: "set", assetName: "円座B" },
      }],
    }),
    /assetId set-does-not-exist.*見つかりません/,
  );
  assert.deepEqual(await readdir(store.plansDir), []);
});

test("warns without claiming safety approval when a high-risk apparatus is involved", async () => {
  const store = await temporaryStore();
  const document = await store.create({
    projectId: "high-risk-show",
    title: "高リスク装置",
    scenes: [
      {
        id: "scene-1",
        title: "空中",
        placements: [{
          assetType: "set", assetName: "トラピーズ", kind: "trapeze",
          u: 0.5, v: 0.4, flown: true,
        }],
      },
      {
        id: "scene-2",
        title: "床上",
        placements: [{ assetType: "set", assetName: "台", kind: "block", u: 0.5, v: 0.6 }],
      },
    ],
  });
  const trapeze = document.project.sets.find((item) => item.name === "トラピーズ");
  const block = document.project.sets.find((item) => item.name === "台");
  const plan = await store.planEdit({
    projectId: "high-risk-show",
    expectedRevision: 1,
    request: "床上の台をトラピーズへ入れ替える",
    operations: [{
      op: "replace_scene_asset",
      sceneId: "scene-2",
      from: { assetType: "set", assetId: block.id },
      to: { assetType: "set", assetId: trapeze.id },
    }],
  });

  assert.match(plan.warnings.join("\n"), /専門家確認/);
  assert.match(plan.warnings.join("\n"), /安全を承認しません/);
  assert.doesNotMatch(plan.warnings.join("\n"), /安全(確認|承認)済み/);
  const applied = await store.applyEditPlan({
    planId: plan.planId,
    projectId: "high-risk-show",
    expectedRevision: 1,
    confirmed: true,
  });
  assert.equal(applied.project.revision, 2);
});

test("applies a replacement across scenes as one revision", async () => {
  const { store, document } = await createSwapShow("across-scenes-show");
  const circleA = document.project.sets.find((item) => item.name === "円座A");
  const circleB = document.project.sets.find((item) => item.name === "円座B");
  await store.updateScene({
    projectId: "across-scenes-show",
    expectedRevision: 1,
    sceneId: "scene-1",
    placementMode: "append",
    placements: [{ assetType: "set", assetName: "円座A", kind: "block", u: 0.4, v: 0.5 }],
  });
  const current = await store.read("across-scenes-show");
  const plan = await store.planEdit({
    projectId: "across-scenes-show",
    expectedRevision: 2,
    request: "円座Aを全場面で円座Bへ入れ替える",
    operations: [{
      op: "replace_asset_across_scenes",
      sceneIds: "all",
      from: { assetType: "set", assetId: circleA.id },
      to: { assetType: "set", assetId: circleB.id },
    }],
  });
  const applied = await store.applyEditPlan({
    planId: plan.planId,
    projectId: "across-scenes-show",
    expectedRevision: 2,
    confirmed: true,
  });

  assert.equal(current.mcpMeta.revision, 2);
  assert.equal(applied.project.revision, 3);
  const reread = await store.read("across-scenes-show");
  const affected = reread.project.scenes.filter((scene) => ["scene-1", "scene-3"].includes(scene.id));
  assert.equal(affected.length, 2);
  assert.ok(affected.every((scene) => scene.pieces.some((piece) => piece.setId === circleB.id)));
  assert.ok(affected.every((scene) => scene.pieces.every((piece) => piece.setId !== circleA.id)));
});

test("supports the remaining placement, scene-field, and add-scene operations", async () => {
  const { store, document } = await createSwapShow("operation-show");
  const circleA = document.project.sets.find((item) => item.name === "円座A");
  const mina = document.project.cast.find((item) => item.name === "ミナ");
  const plan = await store.planEdit({
    projectId: "operation-show",
    expectedRevision: 1,
    request: "配置を加除修正し、場面名と新しい場面を追加する",
    operations: [
      {
        op: "add_placement",
        sceneId: "scene-1",
        placement: { assetType: "performer", assetName: "ソラ", u: 0.8, v: 0.7 },
      },
      {
        op: "remove_placement",
        sceneId: "scene-3",
        target: { assetType: "performer", assetId: mina.id },
      },
      {
        op: "update_placement",
        sceneId: "scene-3",
        target: { assetType: "set", assetId: circleA.id },
        changes: { u: 0.9, assetNote: "右側へ移す" },
      },
      {
        op: "update_scene_fields",
        sceneId: "scene-2",
        title: "第2場面 更新済み",
        beat: { role: "対比", energy: 3 },
      },
      {
        op: "add_scene",
        afterSceneId: "scene-3",
        scene: { title: "第4場面 余韻" },
      },
    ],
  });
  assert.equal(plan.status, "proposed");
  assert.equal(plan.diff.length, 4);
  assert.deepEqual(plan.diff.find((item) => item.sceneId === "scene-2").pieces, []);

  await store.applyEditPlan({
    planId: plan.planId,
    projectId: "operation-show",
    expectedRevision: 1,
    confirmed: true,
  });
  const current = await store.read("operation-show");
  assert.equal(current.mcpMeta.revision, 2);
  assert.ok(current.project.cast.some((item) => item.name === "ソラ"));
  assert.equal(current.project.scenes.find((scene) => scene.id === "scene-3").pieces
    .some((piece) => piece.castId === mina.id), false);
  assert.equal(current.project.scenes.find((scene) => scene.id === "scene-3").pieces
    .find((piece) => piece.setId === circleA.id).u, 0.9);
  assert.equal(current.project.sets.find((item) => item.id === circleA.id).note, "右側へ移す");
  assert.equal(current.project.scenes.find((scene) => scene.id === "scene-2").title, "第2場面 更新済み");
  assert.ok(current.project.scenes.some((scene) => scene.title === "第4場面 余韻"));
});

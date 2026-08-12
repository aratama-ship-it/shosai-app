import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ProjectStore } from "../src/project-store.js";
import { normalizeLightingIntent } from "../src/stage-model.js";

async function temporaryStore() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "stage-sketch-light-intent-test-"));
  const store = new ProjectStore(directory);
  await store.init();
  return store;
}

const intent = {
  objective: "暗闇の中に最初からいたことへ気づかせる",
  audienceFocus: "顔ではなく身体の輪郭",
  layers: {
    performer: { intent: "silhouette", note: "表情は読ませない" },
    space: { intent: "reveal", note: "足元から奥へ細い通路" },
    background: { intent: "conceal", note: "具体物を沈める" },
  },
  transition: {
    triggerType: "action",
    triggerNote: "演者が中央で止まった瞬間",
    change: "fade-in",
    tempo: "breathe",
  },
  implementationNote: "逆光を候補に比較する。未承認。",
  safetyStatus: "not-assessed",
};

test("MCPのversion 3文書でも光の意図を正規化して保持する", async () => {
  const store = await temporaryStore();
  const document = await store.create({
    projectId: "light-intent-show",
    title: "光の意図テスト",
    scenes: [{ id: "scene-1", title: "輪郭", lightingIntent: intent }],
  });

  assert.equal(document.version, 3);
  assert.equal(document.project.scenes[0].lightingIntent.objective, intent.objective);
  assert.equal(document.project.scenes[0].lightingIntent.layers.performer.intent, "silhouette");
  assert.equal(document.project.scenes[0].lightingIntent.safetyStatus, "not-assessed");
});

test("安全状態をapprovedへ偽装できず、空のカードはnullになる", () => {
  assert.throws(
    () => normalizeLightingIntent({ objective: "見せる", safetyStatus: "approved" }),
    /not-assessed/,
  );
  assert.equal(normalizeLightingIntent({}), null);
});

test("AI編集計画は正本を変えず、光の意図を項目単位の差分で示して承認後だけ適用する", async () => {
  const store = await temporaryStore();
  await store.create({
    projectId: "light-plan-show",
    title: "光の差分テスト",
    scenes: [{ id: "scene-1", title: "輪郭", lightingIntent: intent }],
  });
  const plan = await store.planEdit({
    projectId: "light-plan-show",
    expectedRevision: 1,
    request: "観客の視線を足元へ変える",
    operations: [{
      op: "update_scene_fields",
      sceneId: "scene-1",
      lightingIntent: { ...intent, audienceFocus: "足元の狭い範囲" },
    }],
  });

  const beforeApply = await store.read("light-plan-show");
  assert.equal(beforeApply.mcpMeta.revision, 1);
  assert.equal(beforeApply.project.scenes[0].lightingIntent.audienceFocus, intent.audienceFocus);
  assert.match(plan.diff[0].lines.join("\n"), /光の意図・観客の視線/);
  assert.match(plan.diff[0].lines.join("\n"), /足元の狭い範囲/);
  assert.equal(plan.requiresConfirmation, true);

  const applied = await store.applyEditPlan({
    planId: plan.planId,
    projectId: "light-plan-show",
    expectedRevision: 1,
    confirmed: true,
  });
  assert.equal(applied.project.revision, 2);
  const reread = await store.read("light-plan-show");
  assert.equal(reread.project.scenes[0].lightingIntent.audienceFocus, "足元の狭い範囲");
  assert.equal(reread.project.scenes[0].lightingIntent.safetyStatus, "not-assessed");
});

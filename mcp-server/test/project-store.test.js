import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ProjectStore } from "../src/project-store.js";

async function temporaryStore() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "stage-sketch-mcp-test-"));
  const store = new ProjectStore(directory);
  await store.init();
  return store;
}

const initialScenes = [
  {
    title: "1-1 出会い",
    note: "二人が互いの存在に気づく。",
    rehearsal: {
      holdDurationSeconds: 2,
      transitionToNextSeconds: 3.2,
    },
    placements: [
      { assetType: "performer", assetName: "A", u: 0.25, v: 0.7, pose: "stand" },
      { assetType: "performer", assetName: "B", u: 0.75, v: 0.7, pose: "stand" },
      { assetType: "set", assetName: "台", kind: "block", u: 0.5, v: 0.55 },
    ],
  },
];

test("creates an import-compatible version 3 draft", async () => {
  const store = await temporaryStore();
  const document = await store.create({
    projectId: "test-show",
    title: "テストショー",
    sourcePrompt: "出会いを一場面にする",
    rehearsal: {
      version: 1,
      primaryMode: "ordered",
      soundtrack: "bundled-demo",
    },
    scenes: initialScenes,
  });

  assert.equal(document.kind, "shosai-stage-sketch");
  assert.equal(document.version, 3);
  assert.equal(document.mcpMeta.revision, 1);
  assert.equal(document.project.scenes.length, 1);
  assert.deepEqual(document.project.rehearsal, {
    version: 1,
    primaryMode: "ordered",
    soundtrack: "bundled-demo",
  });
  assert.deepEqual(document.project.scenes[0].rehearsal, {
    holdDurationSeconds: 2,
    transitionToNextSeconds: 3.2,
  });
  assert.equal(document.project.cast.length, 2);
  assert.equal(document.project.sets.length, 1);
  assert.equal(document.project.scenes[0].pieces[0].castId, document.project.cast[0].id);
});

test("inserts intermediate scenes and rejects stale revisions", async () => {
  const store = await temporaryStore();
  const document = await store.create({
    projectId: "revision-show",
    title: "版テスト",
    scenes: initialScenes,
  });
  const firstScene = document.project.scenes[0];

  const changed = await store.addScenes({
    projectId: "revision-show",
    expectedRevision: 1,
    afterSceneId: firstScene.id,
    scenes: [{
      title: "1-1.5 ためらい",
      note: "接近する前に一度止まる。",
      rehearsal: {
        holdDurationSeconds: 1.5,
        transitionToNextSeconds: 2.4,
      },
      placements: [
        { assetType: "performer", assetName: "A", u: 0.4, v: 0.65, pose: "walk" },
      ],
    }],
  });

  assert.equal(changed.project.revision, 2);
  const reread = await store.read("revision-show");
  assert.deepEqual(
    reread.project.scenes.map((scene) => scene.title),
    ["1-1 出会い", "1-1.5 ためらい"],
  );
  assert.deepEqual(reread.project.scenes[1].rehearsal, {
    holdDurationSeconds: 1.5,
    transitionToNextSeconds: 2.4,
  });

  await assert.rejects(
    store.addScenes({
      projectId: "revision-show",
      expectedRevision: 1,
      scenes: [{ title: "古い版からの追加" }],
    }),
    /revisionが一致しません/,
  );
});

test("serializes simultaneous Codex and Claude Code edits", async () => {
  const storeA = await temporaryStore();
  const storeB = new ProjectStore(storeA.dataRoot);
  await storeA.create({
    projectId: "shared-show",
    title: "同時編集",
    scenes: initialScenes,
  });

  const results = await Promise.allSettled([
    storeA.addScenes({
      projectId: "shared-show",
      expectedRevision: 1,
      scenes: [{ title: "Codex案" }],
    }),
    storeB.addScenes({
      projectId: "shared-show",
      expectedRevision: 1,
      scenes: [{ title: "Claude案" }],
    }),
  ]);

  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(results.filter((item) => item.status === "rejected").length, 1);
  assert.match(
    results.find((item) => item.status === "rejected").reason.message,
    /revisionが一致しません/,
  );
  assert.equal((await storeA.read("shared-show")).mcpMeta.revision, 2);
});

test("prepares a clean file for the browser and keeps MCP metadata private", async () => {
  const store = await temporaryStore();
  await store.create({
    projectId: "export-show",
    title: "書き出しテスト",
    scenes: initialScenes,
  });

  const prepared = await store.prepareImport("export-show", 1);
  const output = JSON.parse(await readFile(prepared.importFile, "utf8"));
  assert.equal(output.kind, "shosai-stage-sketch");
  assert.equal(output.version, 3);
  assert.equal("mcpMeta" in output, false);
  assert.equal(output.project.title, "書き出しテスト");
  assert.deepEqual(output.project.scenes[0].rehearsal, {
    holdDurationSeconds: 2,
    transitionToNextSeconds: 3.2,
  });
});

test("emits a human safety warning for circus and flown apparatus", async () => {
  const store = await temporaryStore();
  await store.create({
    projectId: "circus-show",
    title: "空中演技",
    scenes: [{
      title: "飛翔",
      placements: [
        {
          assetType: "set",
          assetName: "トラピーズ",
          kind: "trapeze",
          u: 0.5,
          v: 0.5,
          flown: true,
        },
      ],
    }],
  });

  const inspection = await store.inspect("circus-show");
  assert.equal(inspection.valid, true);
  assert.match(inspection.warnings.join("\n"), /専門家確認/);
  assert.match(inspection.warnings.join("\n"), /安全を承認しません/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectFile = new URL(
  "../.stage-sketch-mcp/projects/seam-garden-60m-v1.json",
  import.meta.url,
);
const exportFile = new URL(
  "../.stage-sketch-mcp/exports/継ぎ目の庭_—_和とサーカス60分ストーリーショー-舞台スケッチ_v1-r1.json",
  import.meta.url,
);
const projectDocument = JSON.parse(await readFile(projectFile, "utf8"));
const importDocument = JSON.parse(await readFile(exportFile, "utf8"));
const project = importDocument.project;
const sections = project.scenes.filter((scene) => scene.kind === "section");
const scenes = project.scenes.filter((scene) => scene.kind === "scene");

test("読み込み用JSONは舞台スケッチversion 3として独立して開ける", () => {
  assert.equal(importDocument.kind, "shosai-stage-sketch");
  assert.equal(importDocument.version, 3);
  assert.equal(project.id, "seam-garden-60m-v1");
  assert.equal(project.title, "継ぎ目の庭 — 和とサーカス60分ストーリーショー");
  assert.equal(project.activeSceneId, "seam-scene-1-1");
  assert.equal(projectDocument.project.id, project.id);
});

test("JSONは8セクション／各4シーン／32シーン／3600秒を保つ", () => {
  assert.equal(sections.length, 8);
  assert.equal(scenes.length, 32);
  assert.equal(project.scenes.length, 40);
  assert.equal(scenes.reduce(
    (sum, scene) => sum + scene.rehearsal.holdDurationSeconds
      + scene.rehearsal.transitionToNextSeconds,
    0,
  ), 3600);
  sections.forEach((section) => assert.equal(section.depth, 0));
  scenes.forEach((scene) => assert.equal(scene.depth, 1));
  assert.deepEqual(
    sections.map((section) => project.scenes
      .slice(project.scenes.indexOf(section) + 1, project.scenes.indexOf(section) + 5)
      .filter((scene) => scene.kind === "scene").length),
    [4, 4, 4, 4, 4, 4, 4, 4],
  );
});

test("JSONは4人、装置・照明、ビート、動線、安全メモを含む", () => {
  assert.deepEqual(project.cast.map((member) => member.name), ["保管人", "手A", "手B", "こぼれ"]);
  assert.equal(project.sets.length, 15);
  assert.ok(project.sets.some((item) => item.kind === "light"));
  assert.ok(project.sets.some((item) => item.kind === "wall"));
  assert.ok(scenes.every((scene) => scene.beat.energy >= 1 && scene.beat.energy <= 5));
  assert.ok(scenes.some((scene) => scene.pieces.some((piece) => piece.route)));
  assert.match(scenes.find((scene) => scene.id === "seam-scene-6-3").note, /要検証/);
  assert.match(scenes.find((scene) => scene.id === "seam-scene-7-3").note, /要検証/);
});

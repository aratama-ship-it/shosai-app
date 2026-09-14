import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const [html, script, style] = await Promise.all([
  readFile(new URL("stage.html", root), "utf8"),
  readFile(new URL("stage-sketch.js", root), "utf8"),
  readFile(new URL("style.css", root), "utf8"),
]);

test("next-scene modal offers blank and selective inheritance", () => {
  for (const id of [
    "stage-scene-create-modal",
    "stage-scene-create-blank",
    "stage-scene-create-inherit",
    "stage-scene-create-move-routes",
    "stage-scene-create-select-all",
    "stage-scene-create-clear",
    "stage-scene-create-list",
    "stage-scene-create-submit",
    "stage-scene-delete-modal",
    "stage-scene-delete-message",
    "stage-scene-delete-check",
    "stage-scene-delete-submit",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /次のシーンをつくる方法を選んでください。/);
  assert.match(html, /まっさらなシーン/);
  assert.match(html, /現在のシーンから引き継ぐ/);
  assert.match(html, /id="stage-scene-create-move-routes" checked/);
  assert.match(html, /動線があるものは次のシーンで行き先へ移動/);
  assert.match(html, /すべて選択を外す/);
  assert.match(script, /apply\.textContent = tx\("次のシーンをつくる"\)/);
  assert.match(script, /nextRow\.append\(apply, remove\)/);
  assert.match(script, /remove\.addEventListener\("click", \(\) => openSceneDelete\(scene, remove\)\)/);
  assert.match(script, /function openSceneDelete\(targetScene, returnFocus = null\)/);
  assert.match(script, /sceneDeleteSubmit\.disabled = !els\.sceneDeleteCheck\.checked/);
  assert.match(script, /closeSceneDelete\(false\);\s*deleteScene\(target\);/s);
  assert.match(script, /function deleteScene\(targetScene = null\)/);
  const deleteBlock = script.slice(script.indexOf("  function deleteScene("), script.indexOf("\n\n  // バージョン複製"));
  assert.doesNotMatch(deleteBlock, /window\.confirm\(/);
});

test("scene creation controls keep the next-scene and delete buttons the same height", () => {
  assert.match(style, /\.stage-modal\.stage-scene-create-modal\s*\{[^}]*width:\s*min\(720px,/s);
  assert.match(style, /\.stage-modal\.stage-scene-delete-modal\s*\{[^}]*width:\s*min\(440px,/s);
  assert.match(style, /\.stage-scene-next-row\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 44px/s);
  assert.match(style, /\.stage-scene-next-row\s*\{[^}]*--stage-scene-next-row-action-height:\s*31px;/s);
  assert.match(style, /\.stage-panel \.stage-scene-next-row \.stage-scene-apply\s*\{[^}]*height:\s*var\(--stage-scene-next-row-action-height\);[^}]*min-height:\s*var\(--stage-scene-next-row-action-height\);/s);
  assert.match(style, /\.stage-panel \.stage-scene-next-row \.stage-scene-row-delete\s*\{[^}]*height:\s*var\(--stage-scene-next-row-action-height\);[^}]*min-height:\s*var\(--stage-scene-next-row-action-height\);[^}]*align-self:\s*center;/s);
  assert.match(style, /\.stage-panel \.stage-scene-next-row \.stage-scene-row-delete\s*\{[^}]*border-color:\s*var\(--danger\)[^}]*color:\s*var\(--danger\)/s);
  assert.match(style, /\.stage-scene-create-list\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(style, /\.stage-scene-create-list\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(style, /\.stage-scene-create-route-option\s*\{[^}]*min-height:\s*44px/s);
  assert.match(style, /\.stage-scene-delete-check\s*\{[^}]*min-height:\s*44px;[^}]*border:\s*1px solid rgba\(var\(--danger-rgb\), 0\.55\);/s);
  assert.match(style, /#stage-scene-delete-submit\s*\{[^}]*border-color:\s*var\(--danger\);[^}]*color:\s*var\(--danger\);/s);
  assert.match(style, /@media \(max-width: 600px\)[\s\S]*\.stage-scene-create-list\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test("inheritance is the default and categories use icon cards", () => {
  assert.match(script, /setSceneCreateMode\(hasPieces \? "inherit" : "blank"\)/);
  assert.match(script, /if \(els\.sceneCreateMoveRoutes\) els\.sceneCreateMoveRoutes\.checked = true/);
  assert.match(script, /const initialChoice = hasPieces \? els\.sceneCreateInherit : els\.sceneCreateBlank/);
  assert.match(script, /\["performer", "set", "prop", "light"\]\.forEach/);
  for (const label of ["すべての演者", "すべての舞台セット", "すべての小道具", "すべての照明"]) {
    assert.match(script, new RegExp(`tx\\("${label}"\\)`));
  }
  assert.match(script, /function sceneCreateGroupIcon\(group\)/);
  assert.match(script, /heading\.append\(groupInput, sceneCreateGroupIcon\(group\), title, total\)/);
  assert.match(script, /row\.append\(input, sceneCreateGroupIcon\(group\), words\)/);
});

test("selective inheritance clones only chosen items and completes their routes", () => {
  const start = script.indexOf("  function inheritedScenePieces(");
  const end = script.indexOf("\n\n  function buildNextScene", start);
  assert.ok(start >= 0 && end > start, "inheritedScenePieces source must be extractable");
  const helper = script.slice(start, end).replace(/^  /gm, "");
  const sourcePieces = [
    { id: "performer-a", type: "performer", u: 0.2, v: 0.3,
      route: { u: 0, v: -0.25, bu: 0.1, bv: 0.1 } },
    { id: "prop-held", type: "prop", u: 0.2, v: 0.3, heldBy: "performer-a",
      route: { u: 0.9, v: 0.9 } },
    { id: "set-keep", type: "block", u: 0.6, v: 0.7, route: null },
    { id: "set-drop", type: "wall", u: 0.8, v: 0.4, route: null },
  ];
  let id = 0;
  const context = {
    sourcePieces,
    selectedIds: new Set(["performer-a", "prop-held", "set-keep"]),
    idFactory: () => `copy-${++id}`,
    result: null,
  };
  vm.runInNewContext(`${helper}\nresult = inheritedScenePieces(sourcePieces, selectedIds, idFactory);`, context);
  const result = JSON.parse(JSON.stringify(context.result));

  assert.equal(result.length, 3);
  assert.deepEqual(result.map((piece) => piece.id), ["copy-1", "copy-2", "copy-3"]);
  assert.deepEqual(result.map((piece) => piece.originId), ["performer-a", "prop-held", "set-keep"]);
  assert.equal(result.some((piece) => piece.originId === "set-drop"), false);
  assert.equal(result[0].u, 0, "a route endpoint at zero must not fall back to the centre");
  assert.equal(result[0].v, -0.25);
  assert.equal(result[0].route, null);
  assert.equal(result[1].heldBy, "copy-1", "held relationship follows the copied performer");
  assert.equal(result[1].u, 0.2, "a held prop does not move independently along a route");
  assert.equal(result[1].route, null);
  assert.equal(sourcePieces[0].id, "performer-a");
  assert.deepEqual(sourcePieces[0].route, { u: 0, v: -0.25, bu: 0.1, bv: 0.1 });
});

test("held relationship is cleared when its holder is not inherited", () => {
  const start = script.indexOf("  function inheritedScenePieces(");
  const end = script.indexOf("\n\n  function buildNextScene", start);
  const helper = script.slice(start, end).replace(/^  /gm, "");
  const context = {
    sourcePieces: [{ id: "prop", type: "prop", heldBy: "performer", route: null }],
    selectedIds: new Set(["prop"]),
    idFactory: () => "copy-prop",
    result: null,
  };
  vm.runInNewContext(`${helper}\nresult = inheritedScenePieces(sourcePieces, selectedIds, idFactory);`, context);
  assert.equal(context.result[0].heldBy, null);
});

test("route movement can be disabled while inherited routes are still completed", () => {
  const start = script.indexOf("  function inheritedScenePieces(");
  const end = script.indexOf("\n\n  function buildNextScene", start);
  const helper = script.slice(start, end).replace(/^  /gm, "");
  const sourcePieces = [{
    id: "performer-a",
    type: "performer",
    u: 0.2,
    v: 0.3,
    route: { u: 0.9, v: 0.8, bu: 0.5, bv: 0.4 },
  }];
  const context = {
    sourcePieces,
    selectedIds: new Set(["performer-a"]),
    idFactory: () => "copy-a",
    result: null,
  };
  vm.runInNewContext(
    `${helper}\nresult = inheritedScenePieces(sourcePieces, selectedIds, idFactory, false);`,
    context,
  );
  const result = JSON.parse(JSON.stringify(context.result));

  assert.equal(result[0].u, 0.2);
  assert.equal(result[0].v, 0.3);
  assert.equal(result[0].route, null);
  assert.deepEqual(sourcePieces[0].route, { u: 0.9, v: 0.8, bu: 0.5, bv: 0.4 });
});

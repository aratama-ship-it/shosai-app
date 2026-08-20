import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  analyzeOriginalHolds,
  checkGroupSnapshot,
  combinationsFor,
  createDeterministicRandom,
  inspectPlotMatrix,
  loadDomIds,
  loadOnStageArea,
  loadPropShapes,
  parseArgs,
  propInjectionCoverage,
  synthesizeProps,
} from "../tools/scan-prop-render.mjs";

const stageSource = readFileSync(new URL("../stage-sketch.js", import.meta.url), "utf8");

function sampleProject() {
  const cast = [
    { id: "cast-a", name: "A", color: "#aa4422", heightCm: 165 },
    { id: "cast-b", name: "B", color: "#2266aa", heightCm: 170 },
  ];
  return {
    id: "scan-test-show",
    title: "検査用ショー",
    cast,
    sets: [{ id: "set-1", kind: "block", name: "台", color: "#778899", dims: { w: 1, d: 1, h: 1 }, note: "雛形" }],
    activeSceneId: "scene-1",
    scenes: [
      { id: "scene-1", kind: "scene", title: "一", pieces: [
        { id: "performer-a-1", type: "performer", castId: "cast-a", u: 0.4, v: 0.5 },
        { id: "performer-b-1", type: "performer", castId: "cast-b", u: 0.6, v: 0.5 },
      ] },
      { id: "scene-2", kind: "scene", title: "二", pieces: [
        { id: "performer-a-2", type: "performer", castId: "cast-a", u: 0.4, v: 0.5 },
        { id: "performer-b-2", type: "performer", castId: "cast-b", u: 0.6, v: 0.5 },
      ] },
    ],
  };
}

test("本体から小道具形・DOM参照・舞台内判定を読み取れる", () => {
  const shapes = loadPropShapes(stageSource);
  assert.ok(Object.keys(shapes).length >= 10);
  Object.values(shapes).forEach((shape) => {
    assert.equal(typeof shape.ja, "string");
    assert.equal(typeof shape.dims, "object");
  });
  const ids = loadDomIds(stageSource);
  assert.deepEqual(Object.keys(ids).sort(), [
    "castList", "groupCast", "groupProps", "printBtn", "propList", "propMoves", "sceneList", "setList",
  ]);
  assert.equal(Object.values(ids).every((id) => typeof id === "string" && id.length > 0), true);
  const onStageArea = loadOnStageArea(stageSource);
  assert.equal(onStageArea(0.5, 0.5), true);
  assert.equal(onStageArea(-0.45, -0.45), false);
});

test("決定的乱数は同じ種で同じ列、別の種で別の列を返す", () => {
  const a = createDeterministicRandom(42);
  const b = createDeterministicRandom(42);
  const c = createDeterministicRandom(43);
  const aa = Array.from({ length: 8 }, () => a());
  assert.deepEqual(aa, Array.from({ length: 8 }, () => b()));
  assert.notDeepEqual(aa, Array.from({ length: 8 }, () => c()));
});

test("小道具合成は元データを変えず、全形と6状態を決定的に作る", () => {
  const original = sampleProject();
  const before = structuredClone(original);
  const shapes = loadPropShapes(stageSource);
  const onStageArea = loadOnStageArea(stageSource);
  const first = synthesizeProps(original, shapes, 42, onStageArea);
  const second = synthesizeProps(original, shapes, 42, onStageArea);
  assert.deepEqual(original, before);
  assert.deepEqual(first.project, second.project);
  assert.equal(first.registrations.length, Object.keys(shapes).length);
  assert.equal(first.registrations.every((item) => item.kind === "prop" && item.id.startsWith("scanprop-")), true);
  assert.equal(first.registrations.every((item) => item.dims !== shapes[item.propShape].dims), true);
  assert.equal(first.project.scenes.every((scene) => first.registrations.every((item) =>
    scene.id === "scene-2" && item.id === first.registrations[4]?.id
      ? true : scene.pieces.some((piece) => piece.setId === item.id))), true);
  assert.deepEqual(first.coverage, {
    right: true, left: true, floor: true, offstage: true, handoff: true, disappears: true, heldCount: 3,
  });
  assert.deepEqual(propInjectionCoverage(first.project, first.registrations, onStageArea), first.coverage);
});

test("high は全形を巡回して空いた手を埋め、持ち数を演者延べ人数の7割以上にする", () => {
  const original = sampleProject();
  const shapes = loadPropShapes(stageSource);
  const onStageArea = loadOnStageArea(stageSource);
  const implicitLow = synthesizeProps(original, shapes, 42, onStageArea);
  const explicitLow = synthesizeProps(original, shapes, 42, onStageArea, "low");
  const high = synthesizeProps(original, shapes, 42, onStageArea, "high");
  assert.deepEqual(explicitLow, implicitLow);
  assert.deepEqual(high, synthesizeProps(original, shapes, 42, onStageArea, "high"));

  const injectedIds = new Set(high.registrations.map((item) => item.id));
  const performerVisits = high.project.scenes.reduce((count, scene) => count
    + scene.pieces.filter((piece) => piece.type === "performer").length, 0);
  const heldByShape = new Map(high.registrations.map((item) => [item.id, 0]));
  high.project.scenes.forEach((scene) => {
    const held = scene.pieces.filter((piece) => injectedIds.has(piece.setId) && piece.heldBy);
    assert.equal(held.length, 4);
    assert.equal(new Set(held.map((piece) => `${piece.heldBy}:${piece.holdSide}`)).size, held.length);
    held.forEach((piece) => heldByShape.set(piece.setId, heldByShape.get(piece.setId) + 1));
  });
  assert.ok(high.coverage.heldCount >= performerVisits * 0.7);
  assert.equal(high.coverage.heldCount, 8);
  assert.equal(high.coverage.right, true);
  assert.equal(high.coverage.left, true);
  assert.equal(high.coverage.floor, true);
  assert.equal(high.coverage.offstage, true);
  assert.equal(high.coverage.handoff, true);
  assert.equal(high.coverage.disappears, true);
  assert.ok(Math.max(...heldByShape.values()) - Math.min(...heldByShape.values()) <= 2);
});

test("演者のいないシーンでは注入小道具を持たせない", () => {
  const project = { id: "empty-cast", cast: [], sets: [], scenes: [{ id: "s1", kind: "scene", pieces: [] }] };
  const result = synthesizeProps(project, loadPropShapes(stageSource), 7, loadOnStageArea(stageSource));
  const injectedIds = new Set(result.registrations.map((item) => item.id));
  const pieces = result.project.scenes[0].pieces.filter((piece) => injectedIds.has(piece.setId));
  assert.ok(pieces.length > 0);
  assert.equal(pieces.every((piece) => piece.heldBy === null), true);
  assert.equal(result.coverage.floor, true);
  assert.equal(result.coverage.offstage, true);
});

test("元データのheldBy参照切れと同じ手の重複を分けて検出する", () => {
  const project = {
    scenes: [{ id: "s1", kind: "scene", pieces: [
      { id: "p1", type: "performer" },
      { id: "prop-1", type: "prop", heldBy: "missing", holdSide: "R" },
      { id: "prop-2", type: "prop", heldBy: "p1", holdSide: "L" },
      { id: "prop-3", type: "prop", heldBy: "p1", holdSide: "L" },
    ] }],
  };
  assert.deepEqual(analyzeOriginalHolds(project).map((item) => item.code), ["E1", "E2"]);
});

test("グループ表示と香盤表の純関数が不変条件違反を返す", () => {
  const groupFailures = checkGroupSnapshot({
    propRows: 1, setRows: 2, castRows: 0, propsHidden: true,
    setText: "箱", setNames: ["箱"], blankPropRows: 1, scenePerformerCount: 1,
  }, { props: 2, nonLightSets: 3, injectedNames: ["箱"], nonPropNames: [] });
  assert.deepEqual(groupFailures.map((item) => item.code), ["B1", "B2", "B3", "B4", "B5"]);

  const plotFailures = inspectPlotMatrix({
    present: true, columns: 2, rows: 1, cells: ["   ", "undefined"],
  }, { props: 2, scenes: 2 });
  assert.deepEqual(plotFailures.map((item) => item.code), ["C3", "C3", "C4"]);
  assert.deepEqual(inspectPlotMatrix({ present: false, columns: 0, rows: 0, cells: [] }, { props: 0, scenes: 3 }), []);
  const sparseHigh = inspectPlotMatrix({
    present: true, columns: 11, rows: 1, cells: ["A", "床", "床", "床", "床", "床", "床", "床", "床", "床", "床"],
  }, { props: 1, scenes: 10, holderNames: ["A"], holdDensity: "high" });
  assert.deepEqual(sparseHigh.map((item) => item.code), ["C6"]);
  assert.deepEqual(inspectPlotMatrix({
    present: true, columns: 11, rows: 1, cells: ["A", "B", "床", "床", "床", "床", "床", "床", "床", "床"],
  }, { props: 1, scenes: 10, holderNames: ["A", "B"], holdDensity: "high" }), []);
});

test("CLI引数は既定・matrix・明示ショーを解釈する", () => {
  assert.deepEqual(parseArgs([]), {
    wave: "both", lang: "ja", seed: 42, holdDensity: "low", viewport: { width: 1440, height: 900 }, matrix: false, shows: [],
  });
  const parsed = parseArgs(["--matrix", "--seed", "9", "--hold-density", "high", "--shows", "a b.json", "c.json", "--json", "out.json"]);
  assert.equal(parsed.matrix, true);
  assert.equal(parsed.seed, 9);
  assert.equal(parsed.holdDensity, "high");
  assert.equal(parsed.shows.length, 2);
  assert.equal(parsed.json.endsWith("out.json"), true);
  assert.throws(() => parseArgs(["--lang", "fr"]), /ja\|en/);
  assert.throws(() => parseArgs(["--hold-density", "dense"]), /low\|high/);
  const matrix = combinationsFor(parseArgs(["--matrix"]));
  assert.equal(matrix.length, 18);
  assert.equal(matrix.filter((combo) => combo.holdDensity === "high").length, 6);
  assert.equal(matrix.filter((combo) => combo.holdDensity === "high").every((combo) => combo.wave === "b"), true);
});

test("スキャナ本体に本体由来のDOM idを固定文字列で複製していない", () => {
  const scanner = readFileSync(new URL("../tools/scan-prop-render.mjs", import.meta.url), "utf8");
  Object.values(loadDomIds(stageSource)).forEach((id) => assert.equal(scanner.includes(`\"${id}\"`), false));
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("stage-venue-lines.js", root), "utf8");

function loadLines() {
  const window = {};
  window.window = window;
  vm.runInContext(source, vm.createContext({ window, console }), { filename: "stage-venue-lines.js" });
  return window.SHOSAI_VENUE_LINES;
}

const rectangle = [[0, 0], [12, 0], [12, 8], [0, 8]];

function venue(overrides = {}) {
  return {
    format: "venue-v2",
    floor: { outline: rectangle, levels: [] },
    ceiling: { heightM: 4, rigging: "none" },
    audience: [],
    fixtures: [],
    access: [],
    ...overrides,
  };
}

test("lines層は仕様どおりの余白・係数・最低半径だけを定数に持つ", () => {
  const lines = loadLines();
  assert.deepEqual(JSON.parse(JSON.stringify(lines.constants.clearance)), {
    wallM: 0.5,
    fixedFixtureM: 0.5,
    audienceM: 1,
    levelEdgeM: 0.3,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(lines.constants.fallRules)), {
    juggling: { factor: 0.6, minimumM: 1.5 },
    diabolo: { factor: 0.8, minimumM: 2 },
    aerial: { fixedM: 3 },
    unspecified: { factor: 0.5, minimumM: 1 },
  });
});

test("可動範囲は壁0.5m・固定物0.5m・観客1.0m・段差縁0.3mを引く", () => {
  const lines = loadLines();
  const room = venue({
    floor: {
      outline: rectangle,
      levels: [{ polygon: [[2, 2], [4, 2], [4, 3], [2, 3]], riseM: 0.3 }],
    },
    audience: [{ id: "front", polygon: [[0, 8], [12, 8], [12, 10], [0, 10]] }],
    fixtures: [{ type: "column", at: [6, 4], radiusM: 0.4, movable: false }],
  });
  assert.ok(lines.movementStatusAt(room, [0.49, 4]).reasons.includes("wall"));
  assert.equal(lines.movementStatusAt(room, [0.5, 4]).allowed, true);
  assert.ok(lines.movementStatusAt(room, [6.89, 4]).reasons.includes("fixed-fixture"));
  assert.equal(lines.movementStatusAt(room, [6.9, 4]).allowed, true);
  assert.ok(lines.movementStatusAt(room, [8, 7.01]).reasons.includes("audience"));
  assert.equal(lines.movementStatusAt(room, [8, 7]).allowed, true);
  assert.ok(lines.movementStatusAt(room, [3, 1.71]).reasons.includes("level-edge"));
  assert.equal(lines.movementStatusAt(room, [3, 1.7]).allowed, true);
});

test("movable:trueの什器は可動範囲から引かず、拡張範囲用の別輪郭にする", () => {
  const lines = loadLines();
  const room = venue({
    fixtures: [{
      type: "furniture",
      polygon: [[8, 3], [9, 3], [9, 4], [8, 4]],
      movable: true,
    }],
  });
  assert.equal(lines.movementStatusAt(room, [8.5, 3.5]).allowed, true);
  const movement = lines.computeMovement(room);
  assert.equal(movement.movableExtensions.length, 1);
  assert.equal(movement.movableExtensions[0].clearanceM, 0.5);
});

test("落下半径は到達高さを天井で止め、係数・最低半径と吊り不可を守る", () => {
  const lines = loadLines();
  const room = venue();
  const juggling = lines.computeFall(room, { at: [6, 4], tool: "juggling", reachHeightM: 9 });
  assert.equal(juggling.reachHeightM, 4);
  assert.equal(juggling.radiusM, 2.4);
  assert.equal(lines.computeFall(room, { at: [6, 4], tool: "juggling", reachHeightM: 1 }).radiusM, 1.5);
  assert.equal(lines.computeFall(room, { at: [6, 4], tool: "diabolo", reachHeightM: 1 }).radiusM, 2);
  assert.equal(lines.computeFall(room, { at: [6, 4], tool: "unspecified", reachHeightM: 1 }).radiusM, 1);

  const unavailable = lines.computeFall(room, { at: [6, 4], tool: "aerial", reachHeightM: 4 });
  assert.equal(unavailable.aerialUnavailable, true);
  assert.equal(unavailable.tool, "unspecified");
  const aerial = lines.computeFall(venue({ ceiling: { heightM: 4, rigging: "full" } }),
    { at: [6, 4], tool: "aerial", reachHeightM: 4 });
  assert.equal(aerial.aerialUnavailable, false);
  assert.equal(aerial.radiusM, 3);
});

test("探り針を観客際へ寄せると落下範囲と観客の重なりを返す", () => {
  const lines = loadLines();
  const room = venue({
    audience: [{ id: "front", polygon: [[0, 8], [12, 8], [12, 10], [0, 10]] }],
  });
  const near = lines.computeFall(room, { at: [6, 6.8], tool: "juggling", reachHeightM: 4 });
  assert.equal(near.audienceOverlap, true);
  assert.deepEqual(Array.from(near.overlapAudienceIds), ["front"]);
  assert.equal(near.overlapPolygons.length, 1);
  const far = lines.computeFall(room, { at: [6, 3], tool: "unspecified", reachHeightM: 2 });
  assert.equal(far.audienceOverlap, false);
});

test("固定柱の後ろを観客代表点からの単純遮蔽で死角にする", () => {
  const lines = loadLines();
  const room = venue({
    audience: [{ id: "front", polygon: [[4, 8], [8, 8], [8, 10], [4, 10]] }],
    fixtures: [{ type: "column", at: [6, 5], radiusM: 0.4, movable: false }],
  });
  const blind = lines.computeBlindSpots(room);
  assert.equal(blind.observers.length, 1);
  assert.ok(blind.areas.some((area) => area.kind === "all" && area.y < 5), "柱の奥に濃い影がない");

  const movableRoom = venue({
    audience: room.audience,
    fixtures: [{ type: "column", at: [6, 5], radiusM: 0.4, movable: true }],
  });
  assert.equal(lines.computeBlindSpots(movableRoom).areas.length, 0, "可動物で死角を作らない");
});

test("複数観客の死角は全員から見えない濃色と一部だけの薄色の2段階に限る", () => {
  const lines = loadLines();
  const room = venue({
    audience: [
      { id: "a1", polygon: [[3, 8], [5, 8], [5, 10], [3, 10]] },
      { id: "a2", polygon: [[7, 8], [9, 8], [9, 10], [7, 10]] },
    ],
    fixtures: [{ type: "column", at: [6, 5], radiusM: 0.8, movable: false }],
  });
  const kinds = new Set(lines.computeBlindSpots(room).areas.map((area) => area.kind));
  assert.ok(kinds.has("all"));
  assert.ok(kinds.has("partial"));
  assert.deepEqual([...kinds].sort(), ["all", "partial"]);
});

test("20m・35mの見える限界は小部屋では描かず、大部屋の床内だけに出す", () => {
  const lines = loadLines();
  const limits = [{ m: 20, label: "表情" }, { m: 35, label: "身体" }];
  const small = venue({
    audience: [{ polygon: [[0, 8], [12, 8], [12, 10], [0, 10]] }],
  });
  assert.equal(lines.computeSightLimits(small, limits).length, 0);

  const tallOutline = [[0, 0], [12, 0], [12, 50], [0, 50]];
  const large = venue({
    floor: { outline: tallOutline, levels: [] },
    audience: [{ polygon: [[0, 50], [12, 50], [12, 54], [0, 54]] }],
  });
  const visible = lines.computeSightLimits(large, limits);
  assert.deepEqual(Array.from(visible, (line) => line.m), [20, 35]);
  visible.flatMap((line) => line.segments).flat().forEach((point) => {
    assert.equal(lines.pointInPolygon(point, tallOutline), true, "室外の等距離線を返した");
  });
});

test("受け入れ会場で4本を導出してもvenueへlinesやprobeを書き込まない", () => {
  const lines = loadLines();
  const room = venue({
    audience: [
      { id: "front", polygon: [[0, 8], [12, 8], [12, 10], [0, 10]] },
      { id: "left", polygon: [[-2, 0], [0, 0], [0, 8], [-2, 8]] },
      { id: "right", polygon: [[12, 0], [14, 0], [14, 8], [12, 8]] },
    ],
    fixtures: [
      { type: "column", at: [6, 4], radiusM: 0.4, movable: false },
      { type: "furniture", polygon: [[8, 3], [9, 3], [9, 4], [8, 4]], movable: true },
    ],
  });
  const before = JSON.stringify(room);
  const result = lines.compute(room, { at: [6, 6.8], tool: "juggling", reachHeightM: 4 },
    [{ m: 20, label: "表情" }, { m: 35, label: "身体" }]);
  assert.ok(result.movement.areas.length > 0);
  assert.equal(result.movement.movableExtensions.length, 1);
  assert.equal(result.fall.audienceOverlap, true);
  assert.ok(result.blindSpots.areas.length > 0);
  assert.equal(result.sightLimits.length, 0);
  assert.equal(JSON.stringify(room), before);
  assert.equal("lines" in room, false);
  assert.equal("probe" in room, false);
});

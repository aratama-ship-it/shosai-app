import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("stage-venue-lines.js", root), "utf8");
const venuesSource = await readFile(new URL("stage-venues.js", root), "utf8");

function loadLines() {
  const window = {};
  window.window = window;
  vm.runInContext(source, vm.createContext({ window, console }), { filename: "stage-venue-lines.js" });
  return window.SHOSAI_VENUE_LINES;
}

function loadVenues() {
  const window = {
    SHOSAI_VENUE_LINES: loadLines(),
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  };
  window.window = window;
  vm.runInContext(venuesSource, vm.createContext({ window, console }), { filename: "stage-venues.js" });
  return window.SHOSAI_VENUES;
}

const seatInput = {
  id: "upper-last",
  label: "最上段",
  distanceM: 120,
  eyeM: 19.2,
  offsetM: 0,
  depthM: 12,
  heightM: 1.6,
  stageWidthM: 18,
  fovDeg: 60,
  mode: "seated",
};

test("deriveSeatは既存席と同じ必須鍵を持ち、数値が有限である", () => {
  const seat = loadLines().deriveSeat(seatInput);
  ["id", "label", "short", "note", "eye", "plan", "floorY", "bottomY", "backW",
    "frontW", "shift", "rise", "apron", "derived"].forEach((key) => {
    assert.ok(Object.hasOwn(seat, key), `${key} がない`);
  });
  ["eye", "floorY", "bottomY", "backW", "frontW", "shift", "rise", "apron"]
    .forEach((key) => assert.ok(Number.isFinite(seat[key]), `${key} が有限でない`));
  assert.equal(seat.derived, true);
});

test("距離を2倍にすると画角一定のpxPerM相当値が半分になる", () => {
  const lines = loadLines();
  const near = lines.deriveSeat({ ...seatInput, distanceM: 60 });
  const far = lines.deriveSeat({ ...seatInput, distanceM: 120 });
  assert.ok(Math.abs(far.frontW - (near.frontW / 2)) < 1e-12);
});

test("deriveSeatの既定俯角は既存の首振り範囲に収まる", () => {
  const lines = loadLines();
  const standard = lines.deriveSeat(seatInput);
  assert.ok(Math.abs(standard.rise - (-seatInput.eyeM / seatInput.distanceM)) < 1e-12);
  const seat = lines.deriveSeat({ ...seatInput, eyeM: 100, distanceM: 1 });
  const angleDeg = Math.atan(Math.abs(seat.rise)) * 180 / Math.PI;
  assert.ok(angleDeg <= lines.constants.bowl.tiltDownMaxDeg + 1e-12);
});

test("平らな立ち見では前の頭が舞台床から約5mまで隠す", () => {
  const result = loadLines().occlusionFloorM({
    eyeM: 1.55, aheadM: 1.65, rowPitchM: 0.8, distanceM: 40, stageHeightM: 1.6,
  });
  assert.ok(Math.abs(result.floorM - 4.95) < 1e-12);
  assert.equal(result.basis, "head");
});

test("同じ立ち見条件で目が1.5m上がると遮蔽下端は舞台床より下になる", () => {
  const result = loadLines().occlusionFloorM({
    eyeM: 3.05, aheadM: 1.65, rowPitchM: 0.8, distanceM: 40, stageHeightM: 1.6,
  });
  assert.ok(result.floorM < 0);
});

test("C=90mmのスタンドでは舞台前端が見える", () => {
  const result = loadLines().occlusionFloorM({
    eyeM: 2.4, aheadM: 2.31, rowPitchM: 0.85, distanceM: 60, stageHeightM: 1.6,
  });
  assert.ok(result.floorM < 0);
  assert.equal(result.basis, "eye");
});

test("riserForConstantCの蹴上げは単調非減少で段差上限0.54mを超えない", () => {
  const risers = loadLines().riserForConstantC({
    cMm: 90, rowPitchM: 0.85, focusM: 55, startFloorM: 1.2, rows: 28,
  });
  assert.equal(risers.length, 28);
  risers.forEach((riser, index) => {
    assert.ok(riser <= 0.54);
    if (index) assert.ok(riser >= risers[index - 1]);
  });
});

test("汎用3会場はbowl・unverified・根拠注記を持つ", () => {
  const venues = loadVenues();
  ["arena-concert", "dome-concert", "festival-field"].forEach((id) => {
    const venue = venues.v2.byId(id);
    assert.ok(venue && venue.bowl, `${id} のbowlがない`);
    assert.equal(venue.confidence, "unverified");
    assert.equal(venue.bowl.confidence, "unverified");
    assert.match(venue.provenance.note, /仮値.*図面未照合/);
    assert.match(venue.bowl.provenance.note, /仮値.*図面未照合/);
  });
});

test("seatsForは器なし会場で既存SEATSをそのまま返す", () => {
  const venues = loadVenues();
  assert.equal(venues.seatsFor(venues.byId("proscenium"), null), venues.seats);
});

test("seatsForは器から近い順の5席を導き、立ち見だけを識別できる", () => {
  const venues = loadVenues();
  const venue = venues.byId("dome-concert");
  const seats = venues.seatsFor(venue, venue.sizes[0]);
  assert.equal(seats.length, 5);
  assert.deepEqual(Array.from(seats, (seat) => seat.label),
    ["アリーナ前", "アリーナ後", "スタンド下段", "スタンド上段", "最上段"]);
  seats.forEach((seat, index) => {
    assert.equal(seat.derived, true);
    assert.match(seat.note, /\d+m・目の高さ\d+\.\d+m/);
    if (index) assert.ok(seat.eye >= seats[index - 1].eye);
  });
  assert.equal(seats[0].plan.mode, "standing");
  assert.equal(seats[1].plan.mode, "standing");
  seats.slice(2).forEach((seat) => assert.equal(seat.plan.mode, "seated"));
});

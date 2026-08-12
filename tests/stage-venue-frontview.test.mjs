import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const linesSource = await readFile(new URL("stage-venue-lines.js", root), "utf8");
const venuesSource = await readFile(new URL("stage-venues.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const stageSource = await readFile(new URL("stage.html", root), "utf8");
const sketchSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");

function loadLines() {
  const window = {};
  window.window = window;
  vm.runInContext(linesSource, vm.createContext({ window, console }), { filename: "stage-venue-lines.js" });
  return window.SHOSAI_VENUE_LINES;
}

function loadSeats() {
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  const window = { localStorage };
  window.window = window;
  vm.runInContext(venuesSource, vm.createContext({ window, console, localStorage }), {
    filename: "stage-venues.js",
  });
  return window.SHOSAI_VENUES.seats;
}

const outline = [[0, 0], [10, 0], [10, 8], [0, 8]];

function venue(audience) {
  return {
    format: "venue-v2",
    floor: { outline, levels: [] },
    ceiling: { heightM: 4, rigging: "none" },
    audience,
    fixtures: [],
    access: [],
  };
}

test("手前の観客帯から近似席を返し、nearはfrontまたはcenterを流用する", () => {
  const lines = loadLines();
  const seats = loadSeats();
  const result = lines.approxFrontSeats(venue([
    { polygon: [[0, 8], [10, 8], [10, 10], [0, 10]], mode: "seated", eyeM: 1.2 },
  ]), seats);
  assert.ok(result.length >= 1);
  assert.equal(result[0].id, "approx-near");
  assert.ok(["front", "center"].includes(result[0].base));
});

test("左右の観客帯はsideを選び、右側だけshiftの符号を反転する", () => {
  const lines = loadLines();
  const seats = loadSeats();
  const side = seats.find((seat) => seat.id === "side");
  const left = lines.approxFrontSeats(venue([
    { polygon: [[-2, 0], [0, 0], [0, 8], [-2, 8]], mode: "seated", eyeM: 1.2 },
  ]), seats);
  const right = lines.approxFrontSeats(venue([
    { polygon: [[10, 0], [12, 0], [12, 8], [10, 8]], mode: "seated", eyeM: 1.2 },
  ]), seats);
  assert.equal(left[0].base, "side");
  assert.equal(Math.sign(left[0].shift), Math.sign(side.shift));
  assert.equal(right[0].base, "side");
  assert.equal(right[0].shift, -side.shift);
});

test("観客領域が0件なら空配列を返す", () => {
  const lines = loadLines();
  assert.deepEqual(Array.from(lines.approxFrontSeats(venue([]), loadSeats())), []);
});

test("返り値はapproxを持ち、balcony以外の流用元SEATSの数値と一致する", () => {
  const lines = loadLines();
  const seats = loadSeats();
  const result = lines.approxFrontSeats(venue([
    { polygon: [[0, 8], [10, 8], [10, 10], [0, 10]], mode: "seated", eyeM: 1.2 },
  ]), seats);
  result.forEach((seat) => {
    const base = seats.find((item) => item.id === seat.base);
    assert.equal(seat.approx, true);
    assert.notEqual(seat.base, "balcony");
    ["eye", "floorY", "bottomY", "backW", "frontW", "shift", "rise", "apron", "tilt"].forEach((key) => {
      if (typeof base[key] === "number") assert.equal(seat[key], base[key]);
    });
  });
});

test("approxFrontSeatsはSEATS本体を変異させない", () => {
  const lines = loadLines();
  const seats = loadSeats();
  const before = JSON.stringify(seats);
  lines.approxFrontSeats(venue([
    { polygon: [[10, 0], [12, 0], [12, 8], [10, 8]], mode: "seated", eyeM: 1.2 },
  ]), seats);
  assert.equal(JSON.stringify(seats), before);
});

test("正面図の近似バッジ要素が正本と生成HTMLに存在する", () => {
  assert.match(indexSource, /id="stage-front-approx"/);
  assert.match(stageSource, /id="stage-front-approx"/);
});

test("stage-sketch.jsは近似正面席を参照する", () => {
  assert.match(sketchSource, /approxFrontSeats/);
});

test("stage-i18n.jsに近似正面席と近似バッジの訳が存在する", () => {
  [
    "近い（近似）",
    "中間（近似）",
    "遠い（近似）",
    "客席からの見え方は近似です",
    "approx-near",
    "approx-mid",
    "approx-far",
    "Front view is an approximation",
  ].forEach((key) => assert.match(i18nSource, new RegExp(key)));
});

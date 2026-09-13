import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const houseSource = await readFile(new URL("stage-house-view.js", root), "utf8");
const linesSource = await readFile(new URL("stage-venue-lines.js", root), "utf8");
const venuesSource = await readFile(new URL("stage-venues.js", root), "utf8");

function fakeContext(width = 1280, height = 720) {
  const calls = [];
  const ctx = {
    canvas: { width, height },
    calls,
    save: () => calls.push(["save"]),
    restore: () => calls.push(["restore"]),
    fillRect: (...args) => calls.push(["fillRect", ctx.fillStyle, ...args]),
    beginPath: () => calls.push(["beginPath"]),
    moveTo: (...args) => calls.push(["moveTo", ...args]),
    lineTo: (...args) => calls.push(["lineTo", ...args]),
    quadraticCurveTo: (...args) => calls.push(["quadraticCurveTo", ...args]),
    arc: (...args) => calls.push(["arc", ...args]),
    fill: () => calls.push(["fill", ctx.fillStyle]),
    stroke: () => calls.push(["stroke", ctx.strokeStyle]),
    createLinearGradient: (...args) => {
      const stops = [];
      calls.push(["gradient", ...args, stops]);
      return { addColorStop: (...stop) => stops.push(stop) };
    },
  };
  return ctx;
}

function loadAll() {
  const window = { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
  window.window = window;
  const context = vm.createContext({ window, console });
  vm.runInContext(linesSource, context, { filename: "stage-venue-lines.js" });
  vm.runInContext(venuesSource, context, { filename: "stage-venues.js" });
  vm.runInContext(houseSource, context, { filename: "stage-house-view.js" });
  return window;
}

function layoutFor(venue, seat, width = 1280) {
  const size = venue.sizes[0];
  const pxPerM = seat.frontW * width / size.width;
  return {
    floorY: seat.floorY,
    bottomY: seat.bottomY,
    centerX: width / 2,
    frontW: seat.frontW * width,
    backW: seat.backW * width,
    pxPerM,
    seat,
    size,
  };
}

function venueWithRows(venue, { fromM, toM = fromM, floorM = 0, rowPitchM = 0.8 }) {
  return {
    ...venue,
    bowl: {
      ...venue.bowl,
      tiers: [{ id: "probe", fromM, toM, floorM, mode: "standing", rowPitchM }],
    },
  };
}

function crowdArcs(window, venue, seat, width = 1280) {
  const ctx = fakeContext(width, width * 9 / 16);
  const result = window.SHOSAI_STAGE_HOUSE_VIEW.drawBehind(ctx, {
    L: layoutFor(venue, seat, width), venue, size: venue.sizes[0], seat, houseMode: "full",
  });
  return { result, arcs: ctx.calls.filter((call) => call[0] === "arc") };
}

test("stage-house-view.jsは依存なしで単体読込できる", () => {
  const window = {};
  window.window = window;
  vm.runInContext(houseSource, vm.createContext({ window, console }), { filename: "stage-house-view.js" });
  assert.equal(typeof window.SHOSAI_STAGE_HOUSE_VIEW.drawBehind, "function");
  assert.equal(typeof window.SHOSAI_STAGE_HOUSE_VIEW.drawFront, "function");
});

test("器の色と寸法はトークンシートの値を保つ", () => {
  const tokens = loadAll().SHOSAI_STAGE_HOUSE_VIEW.tokens;
  assert.deepEqual(JSON.parse(JSON.stringify(tokens)), {
    lowerTier: "#171412", upperTier: "#131110", farTier: "#0f0d0c",
    tierBoundary: "rgba(239,231,214,0.10)", crowdNear: "rgba(239,231,214,0.16)",
    crowdFar: "rgba(239,231,214,0.12)", emptySeat: "rgba(239,231,214,0.06)",
    foregroundHead: "#0a0908", foregroundHeadOutline: "rgba(0,0,0,0.5)",
    skyTop: "#1c2630", skyHorizon: "#2a3038", roofTruss: "rgba(156,130,63,0.28)",
    roofTrussAux: "rgba(156,130,63,0.16)", aisle: "rgba(0,0,0,0.45)",
    expressionReach: "rgba(211,172,89,0.55)", movementReach: "rgba(168,65,45,0.50)",
    label: "rgba(239,231,214,0.5)", headDiameterM: 0.2, standingEyeM: 1.55,
    standingHeadM: 1.65, standingRowPitchM: 0.8, crowdMinViewerDistanceM: 5,
    crowdMaxDiameterViewportRatio: 1 / 32, maxParticles: 12000, sideClearanceM: 4,
    aisleWidthM: 1.2, arenaBlocksAcross: 5, arenaBlocksDeep: 3,
    domeArcCount: 7, domeRadialCount: 16, trussBeamCount: 8,
    tiltUpMaxDeg: 34, tiltDownMaxDeg: 16,
  });
});

test("汎用会場の客席回り込み既定はアリーナ・ドームthree、野外front", () => {
  const window = loadAll();
  assert.equal(window.SHOSAI_VENUES.byId("arena-concert").bowl.wrap, "three");
  assert.equal(window.SHOSAI_VENUES.byId("dome-concert").bowl.wrap, "three");
  assert.equal(window.SHOSAI_VENUES.byId("festival-field").bowl.wrap, "front");
});

test("threeだけが正面帯の外側に左右の群衆を描く", () => {
  const window = loadAll();
  const original = window.SHOSAI_VENUES.byId("dome-concert");
  const seat = window.SHOSAI_VENUES.seatsFor(original, original.sizes[0]).at(-1);
  const probe = venueWithRows(original, { fromM: 6, toM: 55 });
  const front = crowdArcs(window, { ...probe, bowl: { ...probe.bowl, wrap: "front" } }, seat).arcs;
  const three = crowdArcs(window, { ...probe, bowl: { ...probe.bowl, wrap: "three" } }, seat).arcs;
  const outside = (arc) => arc[1] < 320 || arc[1] > 960;
  assert.equal(front.filter(outside).length, 0);
  assert.ok(three.some(outside), "左右領域に群衆粒がない");
});

test("左右スタンドの粒は舞台側ほど小さい", () => {
  const window = loadAll();
  const original = window.SHOSAI_VENUES.byId("dome-concert");
  const seat = window.SHOSAI_VENUES.seatsFor(original, original.sizes[0]).at(-1);
  const probe = venueWithRows(original, { fromM: 6, toM: 6 });
  const arcs = crowdArcs(window, { ...probe, bowl: { ...probe.bowl, wrap: "three" } }, seat).arcs;
  const leadingLeftSide = [];
  for (const arc of arcs) {
    if (arc[1] >= 640) break;
    leadingLeftSide.push(arc);
  }
  assert.ok(leadingLeftSide.length > 2);
  assert.ok(leadingLeftSide[0][3] * 2 < leadingLeftSide.at(-1)[3] * 2,
    "舞台側（見る席から遠い）の粒が小さくなっていない");
});

test("roundは舞台の向こう側にも群衆を描く", () => {
  const window = loadAll();
  const original = window.SHOSAI_VENUES.byId("dome-concert");
  const seat = window.SHOSAI_VENUES.seatsFor(original, original.sizes[0]).at(-1);
  const probe = venueWithRows(original, { fromM: 6, toM: 6 });
  const three = crowdArcs(window, { ...probe, bowl: { ...probe.bowl, wrap: "three" } }, seat);
  const round = crowdArcs(window, { ...probe, bowl: { ...probe.bowl, wrap: "round" } }, seat);
  assert.ok(round.result.desiredParticles > three.result.desiredParticles);
  assert.ok(round.arcs[0][3] < three.arcs[0][3],
    "viewerDistanceM=席距離+列距離の向こう側粒になっていない");
});

test("ドーム天井は弧7本と放射16本、野外はリブ0本", () => {
  const window = loadAll();
  const dome = window.SHOSAI_VENUES.byId("dome-concert");
  const domeSeat = window.SHOSAI_VENUES.seatsFor(dome, dome.sizes[0]).at(-1);
  const domeCtx = fakeContext();
  window.SHOSAI_STAGE_HOUSE_VIEW.drawBehind(domeCtx, {
    L: layoutFor(dome, domeSeat), venue: dome, size: dome.sizes[0], seat: domeSeat, houseMode: "full",
  });
  assert.equal(domeCtx.calls.filter((call) => call[0] === "quadraticCurveTo").length, 7);
  assert.equal(domeCtx.calls.filter((call) => call[0] === "stroke" &&
    call[1] === "rgba(156,130,63,0.16)").length, 16);
  const arena = window.SHOSAI_VENUES.byId("arena-concert");
  const arenaSeat = window.SHOSAI_VENUES.seatsFor(arena, arena.sizes[0]).at(-1);
  const arenaCtx = fakeContext();
  window.SHOSAI_STAGE_HOUSE_VIEW.drawBehind(arenaCtx, {
    L: layoutFor(arena, arenaSeat), venue: arena, size: arena.sizes[0], seat: arenaSeat,
    houseMode: "full",
  });
  assert.equal(arenaCtx.calls.filter((call) => call[0] === "stroke" &&
    ["rgba(156,130,63,0.28)", "rgba(156,130,63,0.16)"].includes(call[1])).length, 8);
  const field = window.SHOSAI_VENUES.byId("festival-field");
  const fieldSeat = window.SHOSAI_VENUES.seatsFor(field, field.sizes[0]).at(-1);
  const fieldCtx = fakeContext();
  window.SHOSAI_STAGE_HOUSE_VIEW.drawBehind(fieldCtx, {
    L: layoutFor(field, fieldSeat), venue: field, size: field.sizes[0], seat: fieldSeat, houseMode: "full",
  });
  assert.equal(fieldCtx.calls.filter((call) => call[0] === "stroke" &&
    ["rgba(156,130,63,0.28)", "rgba(156,130,63,0.16)"].includes(call[1])).length, 0);
});

function filledPaths(ctx, color) {
  const paths = [];
  let points = [];
  ctx.calls.forEach((call) => {
    if (call[0] === "beginPath") points = [];
    if (call[0] === "moveTo" || call[0] === "lineTo") points.push(call.slice(1));
    if (call[0] === "fill" && call[1] === color) paths.push(points.slice());
  });
  return paths;
}

test("正面客席は5×3ブロックの通路で割れ、縦通路は奥ほど細い", () => {
  const window = loadAll();
  const original = window.SHOSAI_VENUES.byId("arena-concert");
  const seat = window.SHOSAI_VENUES.seatsFor(original, original.sizes[0])[1];
  const venue = venueWithRows(original, { fromM: 6, toM: 10 });
  const ctx = fakeContext();
  window.SHOSAI_STAGE_HOUSE_VIEW.drawBehind(ctx, {
    L: layoutFor(original, seat), venue, size: original.sizes[0], seat, houseMode: "full",
  });
  const paths = filledPaths(ctx, "rgba(0,0,0,0.45)");
  const rowCount = Math.floor((10 - 6) / 0.8) + 1;
  const longitudinalCount = (5 - 1) * (rowCount - 1);
  assert.equal(paths.length, longitudinalCount + (3 - 1));
  const edgeWidth = (path) => Math.abs(path[1][0] - path[0][0]);
  assert.ok(edgeWidth(paths[0]) < edgeWidth(paths[longitudinalCount - 1]));
});

test("高い席ほど水平線が上がり、俯角は16度以内", () => {
  const window = loadAll();
  const venue = window.SHOSAI_VENUES.byId("dome-concert");
  const seats = window.SHOSAI_VENUES.seatsFor(venue, venue.sizes[0]);
  const low = crowdArcs(window, venue, seats[2]).result;
  const high = crowdArcs(window, venue, seats.at(-1)).result;
  assert.ok(high.horizonY < low.horizonY);
  assert.ok(high.declinationDeg > low.declinationDeg);
  assert.ok(high.declinationDeg <= 16);
});

test("drawBehindは上限超過時も帯を描かず、群衆を12000粒以内で決定的に描く", () => {
  const window = loadAll();
  const venue = window.SHOSAI_VENUES.byId("dome-concert");
  const denseVenue = {
    ...venue,
    sizes: [{ ...venue.sizes[0], width: 180 }],
  };
  const seat = window.SHOSAI_VENUES.seatsFor(venue, venue.sizes[0]).at(-1);
  const L = layoutFor(denseVenue, seat);
  const first = fakeContext();
  const second = fakeContext();
  const a = window.SHOSAI_STAGE_HOUSE_VIEW.drawBehind(first, {
    L, venue: denseVenue, size: denseVenue.sizes[0], seat, houseMode: "full",
  });
  const b = window.SHOSAI_STAGE_HOUSE_VIEW.drawBehind(second, {
    L, venue: denseVenue, size: denseVenue.sizes[0], seat, houseMode: "full",
  });
  assert.ok(a.drawn);
  assert.ok(a.desiredParticles > 12000, "粒の間引きが必要な条件になっていない");
  assert.ok(a.particles <= 12000);  // 2026-09-12 本人選択(A)により3000から変更
  assert.equal(first.calls.filter((call) => call[0] === "arc").length, a.particles);
  assert.equal(first.calls.filter((call) => call[0] === "fillRect" &&
    ["rgba(239,231,214,0.16)", "rgba(239,231,214,0.12)"].includes(call[1])).length, 0,
  "群衆色の横帯が描かれている");
  assert.ok(first.calls.some((call) => call[0] === "stroke" && call[1] === "rgba(239,231,214,0.10)"));
  assert.deepEqual(first.calls, second.calls);
  assert.deepEqual(a, b);
});

test("drawFrontは平土間・立ち見だけで前景の頭を描く", () => {
  const window = loadAll();
  const venue = window.SHOSAI_VENUES.byId("dome-concert");
  const seats = window.SHOSAI_VENUES.seatsFor(venue, venue.sizes[0]);
  const standing = seats[1];
  const seated = seats[2];
  const frontCtx = fakeContext();
  const front = window.SHOSAI_STAGE_HOUSE_VIEW.drawFront(frontCtx, {
    L: layoutFor(venue, standing), venue, size: venue.sizes[0], seat: standing, houseMode: "full",
  });
  assert.equal(front.drawn, true);
  assert.ok(front.heads > 0);
  assert.ok(frontCtx.calls.some((call) => call[0] === "fill" && call[1] === "#0a0908"));
  const seatedCtx = fakeContext();
  assert.equal(window.SHOSAI_STAGE_HOUSE_VIEW.drawFront(seatedCtx, {
    L: layoutFor(venue, seated), venue, size: venue.sizes[0], seat: seated, houseMode: "full",
  }).drawn, false);
  assert.equal(seatedCtx.calls.length, 0);
  const raisedStanding = { ...seated, plan: { ...seated.plan, mode: "standing" } };
  assert.equal(window.SHOSAI_STAGE_HOUSE_VIEW.drawFront(fakeContext(), {
    L: layoutFor(venue, raisedStanding), venue, size: venue.sizes[0],
    seat: raisedStanding, houseMode: "full",
  }).drawn, false);
});

test("視点の0.8m前の列は群衆として描かれない", () => {
  const window = loadAll();
  const original = window.SHOSAI_VENUES.byId("dome-concert");
  const seat = window.SHOSAI_VENUES.seatsFor(original, original.sizes[0])[0];
  const venue = venueWithRows(original, { fromM: seat.eye - 0.8 });
  const { result, arcs } = crowdArcs(window, venue, seat);
  // 2026-09-12 本人選択(a)により変更
  assert.equal(result.desiredParticles, 0);
  assert.equal(result.particles, 0);
  assert.equal(arcs.length, 0);
});

test("最上段から舞台前端6mの列を見る粒は直径5px未満になる", () => {
  const window = loadAll();
  const original = window.SHOSAI_VENUES.byId("dome-concert");
  const venue = venueWithRows(original, { fromM: 6 });
  const seat = window.SHOSAI_VENUES.seatsFor(original, original.sizes[0]).at(-1);
  const { arcs } = crowdArcs(window, venue, seat);
  assert.ok(arcs.length > 0);
  assert.ok(arcs.every((arc) => arc[3] * 2 < 5));
});

test("自分と同じ位置および後ろの客席列は群衆として描かれない", () => {
  const window = loadAll();
  const original = window.SHOSAI_VENUES.byId("dome-concert");
  const seat = window.SHOSAI_VENUES.seatsFor(original, original.sizes[0])[0];
  const venue = venueWithRows(original, { fromM: seat.eye - 0.8, toM: seat.eye + 0.8 });
  const { result, arcs } = crowdArcs(window, venue, seat);
  // 2026-09-12 本人選択(a)により変更
  assert.equal(result.desiredParticles, 0);
  assert.equal(result.particles, arcs.length);
  assert.equal(result.particles, 0);
  assert.equal(arcs.length, 0);
});

test("前景の頭は席が変わっても0.8m前の実寸投影を保つ", () => {
  const window = loadAll();
  const venue = window.SHOSAI_VENUES.byId("dome-concert");
  const seats = window.SHOSAI_VENUES.seatsFor(venue, venue.sizes[0]);
  const diameters = [seats[0], seats[1]].map((seat) =>
    window.SHOSAI_STAGE_HOUSE_VIEW.drawFront(fakeContext(), {
      L: layoutFor(venue, seat), venue, size: venue.sizes[0], seat, houseMode: "full",
    }).headDiameterPx);
  assert.ok(diameters.every(Number.isFinite));
  assert.ok(Math.abs(diameters[0] - diameters[1]) < 1e-9);
});

test("最前列では前景の頭を描かず、その後ろの席では描く", () => {
  const window = loadAll();
  const venue = window.SHOSAI_VENUES.byId("dome-concert");
  const seats = window.SHOSAI_VENUES.seatsFor(venue, venue.sizes[0]);
  const frontCtx = fakeContext();
  const front = window.SHOSAI_STAGE_HOUSE_VIEW.drawFront(frontCtx, {
    L: layoutFor(venue, seats[0]), venue, size: venue.sizes[0], seat: seats[0], houseMode: "full",
  });
  const behindCtx = fakeContext();
  const behind = window.SHOSAI_STAGE_HOUSE_VIEW.drawFront(behindCtx, {
    L: layoutFor(venue, seats[1]), venue, size: venue.sizes[0], seat: seats[1], houseMode: "full",
  });
  assert.equal(front.heads, 0);
  assert.equal(frontCtx.calls.filter((call) => call[0] === "arc").length, 0);
  assert.ok(behind.heads > 0);
  assert.ok(behindCtx.calls.some((call) => call[0] === "arc"));
  assert.equal(Math.round(behind.headDiameterPx), 277);
});

test("段席の群衆粒は640pxと1280pxでキャンバス幅の1/32を超えない", () => {
  const window = loadAll();
  const venue = window.SHOSAI_VENUES.byId("dome-concert");
  const seats = window.SHOSAI_VENUES.seatsFor(venue, venue.sizes[0]);
  ["dome-concert-lower-middle", "dome-concert-upper-top"].forEach((seatId) => {
    const seat = seats.find((candidate) => candidate.id === seatId);
    assert.ok(seat, `${seatId} がない`);
    [640, 1280].forEach((width) => {
      const { arcs } = crowdArcs(window, venue, seat, width);
      assert.ok(arcs.length > 0, `${seatId}/${width}px に群衆粒がない`);
      assert.ok(arcs.every((arc) => arc[3] * 2 <= width / 32),
        `${seatId}/${width}px に上限超過の群衆粒がある`);
    });
  });
});

test("5m未満の群衆を外しても段の面と境界線は描く", () => {
  const window = loadAll();
  const original = window.SHOSAI_VENUES.byId("dome-concert");
  const seat = window.SHOSAI_VENUES.seatsFor(original, original.sizes[0])[0];
  const venue = venueWithRows(original, { fromM: seat.eye - 4.2, toM: seat.eye - 1.0 });
  const ctx = fakeContext();
  const result = window.SHOSAI_STAGE_HOUSE_VIEW.drawBehind(ctx, {
    L: layoutFor(original, seat), venue, size: original.sizes[0], seat, houseMode: "full",
  });
  assert.equal(result.particles, 0);
  assert.equal(ctx.calls.filter((call) => call[0] === "arc").length, 0);
  assert.ok(ctx.calls.some((call) => call[0] === "fill" &&
    ["#171412", "#131110", "#0f0d0c"].includes(call[1])), "段の面が描かれていない");
  assert.ok(ctx.calls.some((call) => call[0] === "stroke" &&
    call[1] === "rgba(239,231,214,0.10)"), "段の境界線が描かれていない");
});

function tierBoundarySegments(ctx) {
  const segments = [];
  let start = null;
  let end = null;
  ctx.calls.forEach((call) => {
    if (call[0] === "beginPath") { start = null; end = null; }
    if (call[0] === "moveTo") start = call.slice(1);
    if (call[0] === "lineTo" && start) end = call.slice(1);
    if (call[0] === "stroke" && call[1] === "rgba(239,231,214,0.10)" && start && end &&
      Math.abs(start[1] - end[1]) < 1e-9) {
      segments.push({ y: start[1], width: end[0] - start[0] });
    }
  });
  return segments;
}

function perspectiveSegments(window) {
  const original = window.SHOSAI_VENUES.byId("dome-concert");
  const venue = venueWithRows(original, { fromM: 6, toM: 10 });
  const seat = window.SHOSAI_VENUES.seatsFor(original, original.sizes[0])[1];
  const ctx = fakeContext();
  window.SHOSAI_STAGE_HOUSE_VIEW.drawBehind(ctx, {
    L: layoutFor(original, seat), venue, size: original.sizes[0], seat, houseMode: "full",
  });
  return tierBoundarySegments(ctx);
}

test("列の床線は遠い列ほど水平線に近い", () => {
  const segments = perspectiveSegments(loadAll());
  assert.ok(segments.length > 2);
  for (let index = 1; index < segments.length; index += 1) {
    assert.ok(segments[index - 1].y < segments[index].y);
  }
});

test("列の描画幅は遠い列ほど狭い", () => {
  const segments = perspectiveSegments(loadAll());
  assert.ok(segments.length > 2);
  for (let index = 1; index < segments.length; index += 1) {
    assert.ok(segments[index - 1].width < segments[index].width);
  }
});

test("同じ列でも見る席が遠いほど頭の直径が小さい", () => {
  const window = loadAll();
  const original = window.SHOSAI_VENUES.byId("dome-concert");
  const venue = venueWithRows(original, { fromM: 6 });
  const seats = window.SHOSAI_VENUES.seatsFor(original, original.sizes[0]);
  const diameters = [seats[2], seats.at(-1)].map((seat) => {
    const { arcs } = crowdArcs(window, venue, seat);
    assert.ok(arcs.length > 0);
    return arcs[0][3] * 2;
  });
  assert.ok(diameters[0] > diameters[1]);
});

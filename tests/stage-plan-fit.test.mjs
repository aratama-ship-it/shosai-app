import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const startMarker = "/* @planFit:start */";
const endMarker = "/* @planFit:end */";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker);

assert.ok(start >= 0, `${startMarker} が必要です`);
assert.ok(end > start, `${endMarker} が必要です`);

const planFitSource = source.slice(start + startMarker.length, end);
const planFit = new Function(`${planFitSource}\nreturn planFit;`)();
const W = 1280;
const H = 720;
const wingM = 2.5;
const EPSILON = 1e-9;

function assertNear(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= EPSILON,
    `${label}: ${actual} は ${expected} と一致する`);
}

function fit(audience, width = 12, depth = 9, height = H) {
  return planFit({ W, H: height, audience, width, depth, wingM });
}

function assertPositive(result, label) {
  assert.ok(result.stage.w > 0, `${label}: 舞台幅が正`);
  assert.ok(result.stage.h > 0, `${label}: 舞台奥行きが正`);
}

function assertWingsFit(result, audience, label) {
  const { stage, pxPerM } = result;
  const wingPx = wingM * pxPerM;
  if (audience === "three") {
    assert.ok(stage.y - wingPx >= -EPSILON, `${label}: 奥の袖が画面内`);
    assert.ok(stage.x >= 96 - EPSILON, `${label}: 左客席が96px以上`);
    assert.ok(W - (stage.x + stage.w) >= 96 - EPSILON, `${label}: 右客席が96px以上`);
  } else {
    assert.ok(stage.x - wingPx >= -EPSILON, `${label}: 左袖が画面内`);
    assert.ok(stage.x + stage.w + wingPx <= W + EPSILON, `${label}: 右袖が画面内`);
  }
}

function assertLowerAudienceFits(result, audience, label, height = H) {
  if (audience === "none") return;
  assert.ok(height - (result.stage.y + result.stage.h) >= 96 - EPSILON,
    `${label}: 下の客席と文字が入る`);
}

function assertRoundFits(result, label) {
  const { stage } = result;
  const centerX = stage.x + stage.w / 2;
  const centerY = stage.y + stage.h / 2;
  const outsideRadius = Math.max(stage.w, stage.h) / 2 + 95 + 28;
  assert.ok(outsideRadius <= centerX + EPSILON, `${label}: 左の全周円が画面内`);
  assert.ok(outsideRadius <= W - centerX + EPSILON, `${label}: 右の全周円が画面内`);
  assert.ok(outsideRadius <= centerY + EPSILON, `${label}: 上の全周円が画面内`);
  assert.ok(outsideRadius <= H - centerY + EPSILON, `${label}: 下の全周円が画面内`);
}

test("front・none・custom想定では左右の袖が画面に収まる", () => {
  for (const audience of ["front", "none", ""]) {
    const result = fit(audience);
    assertPositive(result, audience || "custom");
    assertWingsFit(result, audience, audience || "custom");
    assertLowerAudienceFits(result, audience, audience || "custom");
  }
});

test("threeでは奥の袖と三方の客席が画面に収まる", () => {
  const result = fit("three");
  assertPositive(result, "three");
  assertWingsFit(result, "three", "three");
  assertLowerAudienceFits(result, "three", "three");
});

test("roundでは最外周の円と文字が画面に収まる", () => {
  const result = fit("round");
  assertPositive(result, "round");
  assertRoundFits(result, "round");
  assertLowerAudienceFits(result, "round", "round");
});

test("12m×9m frontは旧計算より1.1倍以上大きい", () => {
  const result = fit("front");
  const oldPad = 104;
  const ratio = 9 / 12;
  const availableWidth = W - oldPad * 2;
  const availableHeight = H - oldPad * 2;
  const oldWidth = Math.min(availableWidth, availableHeight / ratio);
  assert.ok(result.stage.w >= oldWidth * 1.1,
    `新しい幅 ${result.stage.w} は旧幅 ${oldWidth} の1.1倍以上`);
});

test("12m×9m frontはH=960で袖と96pxの客席帯を保ち、H=720の結果を変えない", () => {
  const desktop = fit("front");
  assert.deepEqual(desktop, {
    stage: { x: 256, y: 24, w: 768, h: 576 },
    pxPerM: 64,
  });

  const phonePortrait = fit("front", 12, 9, 960);
  assertPositive(phonePortrait, "front H=960");
  assertNear(phonePortrait.stage.x, 205.1764705882353, "front H=960: x");
  assertNear(phonePortrait.stage.y, 105.88235294117646, "front H=960: y");
  assertNear(phonePortrait.stage.w, 869.6470588235294, "front H=960: 舞台幅");
  assertNear(phonePortrait.stage.h, 652.2352941176471, "front H=960: 舞台奥行き");
  assertNear(phonePortrait.pxPerM, 72.47058823529412, "front H=960: pxPerM");
  assertWingsFit(phonePortrait, "front", "front H=960");
  assertLowerAudienceFits(phonePortrait, "front", "front H=960", 960);
  assert.ok(960 - (phonePortrait.stage.y + phonePortrait.stage.h) >= 96 - EPSILON,
    "front H=960: 客席の帯を96px以上残す");
});

test("極端な会場寸法でも各形式の必要物が画面に収まる", () => {
  const dimensions = [[50, 2], [2, 50], [1, 1]];
  for (const [width, depth] of dimensions) {
    for (const audience of ["front", "none", "", "three", "round"]) {
      const label = `${audience || "custom"} ${width}m×${depth}m`;
      const result = fit(audience, width, depth);
      assertPositive(result, label);
      if (audience === "round") assertRoundFits(result, label);
      else assertWingsFit(result, audience, label);
      assertLowerAudienceFits(result, audience, label);
    }
  }
});

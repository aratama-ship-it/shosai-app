import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

function functionBody(name, nextName) {
  const start = stageSource.indexOf(`function ${name}`);
  const end = nextName ? stageSource.indexOf(`function ${nextName}`, start) : stageSource.length;
  assert.ok(start >= 0, `${name} がある`);
  assert.ok(end > start, `${name} の終端がある`);
  return stageSource.slice(start, end);
}

test("せりの縁またぎ検出は上がっているせりだけを対象にする", () => {
  const body = functionBody("seriStraddlers", "flownLift");
  assert.match(body, /p\.type === "seri"[\s\S]*clamp\(finite\(p\.seriH, 0\), 0, 4\) > 0\.02/);
});

test("せりに完全に乗っている駒は縁またぎとして警告しない", () => {
  const body = functionBody("seriStraddlers", "flownLift");
  assert.match(body, /const overlaps = [^;]+;/);
  assert.match(body, /const fullyInside = [^;]+;/);
  assert.match(body, /if \(overlaps && !fullyInside\) found\.push/);
});

test("せりの縁またぎ警告は赤い破線で描く", () => {
  const body = functionBody("drawStage", "drawSceneCaption");
  assert.match(body, /strokeStyle = "rgba\(192,57,43,0\.9\)"/);
  assert.match(body, /setLineDash\(\[5, 4\]\)[\s\S]*setLineDash\(\[\]\)/);
});

test("せり上がりスライダーは上げた瞬間に縁またぎをアナウンスする", () => {
  const start = stageSource.indexOf("if (els.pieceSeri)");
  const end = stageSource.indexOf("if (els.showFlown)", start);
  assert.ok(start >= 0 && end > start, "せり上がりスライダーのハンドラがある");
  const handler = stageSource.slice(start, end);
  assert.match(handler, /previous <= 0\.02 && value > 0\.02/);
  assert.match(handler, /seriStraddlers\(sc\(\)\.pieces, venueSize\(\)\)/);
  assert.match(handler, /announce\(`せりの縁をまたぐものがあります:/);
});

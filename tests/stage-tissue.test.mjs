import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");

function functionBody(name, nextName) {
  const start = stageSource.indexOf(`function ${name}`);
  const end = nextName ? stageSource.indexOf(`function ${nextName}`, start) : stageSource.length;
  assert.ok(start >= 0, `${name} がある`);
  assert.ok(end > start, `${name} の終端がある`);
  return stageSource.slice(start, end);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

test("normalizePiece はティシューの掴む高さを0〜10mで持つ", () => {
  const body = functionBody("normalizePiece", "pieceDims");
  assert.match(body, /tissueH:\s*clamp\(finite\(piece\.tissueH, 4\), 0, 10\)/);
});

test("舞台裏の控えにティシューの掴む高さを残す", () => {
  const stash = stageSource.match(/const STASH_KEYS = \[([\s\S]*?)\];/);
  assert.ok(stash, "STASH_KEYS がある");
  assert.match(stash[1], /"tissueH"/);
});

test("refreshBases はティシューの近くでTRAP_GRIP.hangを使って掴ませる", () => {
  const body = functionBody("refreshBases", "bringToTop");
  assert.match(body, /other\.type === "tissue"/);
  assert.match(body, /< 0\.55/);
  assert.match(body, /piece\.base = Math\.max\(0, grip - TRAP_GRIP\.hang \* H\)/);
});

test("mountKindOf はティシューを返す", () => {
  const body = functionBody("mountKindOf", "performerRig");
  assert.match(body, /holder\.type === "tissue"\) return "tissue"/);
});

test("performerRig はティシュー上でトラピーズのぶら下がり姿勢を使う", () => {
  const body = functionBody("performerRig", "paintBody");
  assert.match(body, /mount === "tissue"[\s\S]*\? "trapeze_hang"/);
});

test("選んだものパネルにティシューの掴む高さUIがある", () => {
  assert.match(indexSource, /id="stage-tissue-controls"/);
  assert.match(indexSource, /id="stage-tissue-h"/);
});

test("ティシューUIの日本語に英訳がある", () => {
  assert.match(i18nSource, /"布に掴まる": "Holding the silks"/);
  assert.match(i18nSource, /"掴む高さ": "Grip height on the silks"/);
});

test("ティシューの掴む高さから演者のbaseを計算する", () => {
  const top = 7.4;
  const clothHeight = 7;
  const bottom = Math.max(0, top - clothHeight);
  const maxGrip = Math.max(bottom, top - 0.2);
  const height = 1.7;
  const baseFor = (tissueH) => Math.max(0, clamp(tissueH, bottom, maxGrip) - 1.15 * height);

  assert.equal(bottom, 0.40000000000000036);
  assert.ok(Math.abs(baseFor(4) - 2.045) < 0.000001);
  assert.equal(baseFor(0.5), 0);
  assert.ok(Math.abs(clamp(9, bottom, maxGrip) - 7.2) < 0.000001);
});

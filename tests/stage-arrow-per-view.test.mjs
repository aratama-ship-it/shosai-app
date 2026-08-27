import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("stage-sketch.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");

function between(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} が見つかること`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `${endMarker} が見つかること`);
  return source.slice(start, end);
}

const normalizeArrowSource = between("  function normalizeArrow(raw) {", "\n  function normalizeCueSeconds(");
const normalizeArrow = new Function(
  "clamp",
  "finite",
  "validColor",
  "rid",
  `${normalizeArrowSource}\nreturn normalizeArrow;`,
)(
  (value, min, max) => Math.min(max, Math.max(min, value)),
  (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback),
  (value, fallback) => (typeof value === "string" ? value : fallback),
  () => "arrow-test",
);

test("normalizeArrowはviewのない既存矢印を正面図へ所属させる", () => {
  const arrow = normalizeArrow({ plane: "air", points: [] });
  assert.equal(arrow.view, "front");
  assert.equal(arrow.plane, "air");
});

test("normalizeArrowは平面図の空中指定を床へ倒す", () => {
  const arrow = normalizeArrow({
    view: "plan",
    plane: "air",
    points: [{ a: 0.25, b: 8 }],
  });
  assert.equal(arrow.view, "plan");
  assert.equal(arrow.plane, "floor");
  assert.equal(arrow.points[0].b, 1, "平面図ではbも床の奥行き0..1として正規化する");
});

test("drawArrowsは本体と画面上の下書きを描いた図だけへ出す", () => {
  const body = between("  function drawArrows(target, L) {", "\n  function pointToSegmentDistance(");
  assert.match(body, /const wantView = L\.plan \? "plan" : "front";/);
  assert.match(body, /arrow\.view === wantView/);
  assert.match(body, /target === ctx \|\| target === planCtx/);
  assert.match(body, /arrowDraft\.view === wantView/);
  assert.doesNotMatch(body, /target === ctx && !L\.plan && arrowDraft/);
});

test("arrowAtは同じ図の矢印だけを添字を保ったまま調べる", () => {
  const body = between("  function arrowAt(point, L, view) {", "\n  function drawRoutes(");
  assert.match(body, /if \(arrows\[index\]\.view !== view\) continue;/);
  assert.match(body, /best = index/);
});

test("正面図を閉じても矢印道具を保ち、図の切替時は下書きを破棄する", () => {
  const body = between("  function setViewShown(which, shown) {", "\n  function syncSeatMapToggle(");
  assert.match(body, /tool !== "select" && tool !== "arrow"/);
  assert.match(body, /if \(arrowDraft\) \{[\s\S]*?arrowDraft = null;[\s\S]*?pointerAction = null;/);
});

test("矢印道具とポインタ処理に正面図限定ゲートを残さない", () => {
  const setToolBody = between("  function setTool(nextTool) {", "\n  const heldItemName");
  assert.doesNotMatch(setToolBody, /矢印は正面図で描きます/);
  assert.doesNotMatch(source, /tool === "arrow" && view === "front"/);
  assert.match(source, /if \(guestSessionActive\(\) && tool !== "arrow"\) return;/);
  assert.match(source, /arrowDraft = \{[\s\S]*?view,[\s\S]*?plane: view === "plan" \? "floor" : arrowPlanePref\(\)/);
});

test("arrowScreenPointsから平面図の空中矢印を潰す旧分岐を削除する", () => {
  const body = between("  function arrowScreenPoints(arrow, L) {", "\n  function drawArrowHead(");
  assert.doesNotMatch(body, /L\.plan && arrow\.plane === "air"/);
});

test("空中ボタンは正面図が閉じたとき無効になり理由を英語でも示せる", () => {
  const body = between("  function syncArrowOptions() {", "\n  function setTool(");
  assert.match(body, /const disabled = !state\.showFront;/);
  assert.match(body, /els\.arrowPlaneAir\.disabled = disabled;/);
  assert.match(body, /setAttribute\("aria-disabled", String\(disabled\)\)/);
  assert.match(body, /tx\("空中の矢印は正面図で描きます"\)/);
  assert.match(indexSource, /id="stage-arrow-plane-air"[^>]*aria-disabled="false"/);
  assert.match(i18nSource, /"空中の矢印は正面図で描きます": "Airborne arrows are drawn in the front view\."/);
});

test("旧方針のコメントと正面図限定の道具説明を残さない", () => {
  assert.doesNotMatch(source, /正面・平面の両方へ出す/);
  assert.match(source, /描いた図にだけ出す（本人指示 2026-08-27）/);
  assert.match(source, /正面図または平面図をなぞると矢印になります/);
});

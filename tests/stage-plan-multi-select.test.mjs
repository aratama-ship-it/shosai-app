import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "stage-sketch.js"), "utf8");
const html = fs.readFileSync(path.join(root, "stage.html"), "utf8");

function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} が見つからない`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let at = open; at < source.length; at += 1) {
    if (source[at] === "{") depth += 1;
    if (source[at] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, at + 1);
  }
  throw new Error(`${name} の終端が見つからない`);
}

function lineupFixture(selected) {
  const messages = [];
  let checkpoints = 0;
  let renders = 0;
  let persists = 0;
  const deps = {
    selectedPieces: () => selected,
    selectedPerformerPieces: () => (
      selected.length && selected.every((piece) => piece.type === "performer") ? selected : []
    ),
    isLocked: (piece) => Boolean(piece.locked),
    isFlown: () => false,
    onStageArea: (u, v) => u >= 0 && u <= 1 && v >= 0 && v <= 1,
    state: { showFlown: true },
    checkpoint: () => { checkpoints += 1; },
    announce: (message) => messages.push(message),
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    render: () => { renders += 1; },
    persistSoon: () => { persists += 1; },
  };
  const lineup = new Function("deps", `with (deps) { return (${functionSource("lineupPerformers")}); }`)(deps);
  return { lineup, messages, counts: () => ({ checkpoints, renders, persists }) };
}

function groupedDrag(entries, anchorId, targetU, targetV, bounds) {
  const move = new Function(`return (${functionSource("groupedDragPositions")});`)();
  return move(entries, anchorId, targetU, targetV, bounds);
}

function poseFixture(selected) {
  const messages = [];
  let checkpoints = 0;
  let renders = 0;
  let persists = 0;
  let inspectorUpdates = 0;
  const deps = {
    selectedPieces: () => selected,
    mountKindOf: (piece) => piece.mount || null,
    checkpoint: () => { checkpoints += 1; },
    updateInspector: () => { inspectorUpdates += 1; },
    render: () => { renders += 1; },
    persistSoon: () => { persists += 1; },
    announce: (message) => messages.push(message),
    poseName: (pose) => pose.label,
    sx: (japanese) => japanese,
  };
  const applyPose = new Function("deps", `with (deps) {
    ${functionSource("selectedPerformerPieces")}
    return (${functionSource("applyPoseToSelection")});
  }`)(deps);
  return {
    applyPose,
    messages,
    counts: () => ({ checkpoints, inspectorUpdates, renders, persists }),
  };
}

function selectedTitle(piece, pieces, owner = null) {
  const deps = {
    lockOwner: () => owner,
    sc: () => ({ pieces }),
    pieceTypeName: (type) => ({ performer: "演者", chair: "椅子" })[type] || type,
  };
  return new Function("deps", `with (deps) { return (${functionSource("selectedPieceTitle")}); }`)(deps)(piece);
}

test("平面図の複数選択案内は常設せず、実際に複数選択したときだけ状態を出す", () => {
  assert.match(html, /id="stage-multi-select-status"[^>]*aria-live="polite"[^>]*hidden><\/span>/);
  assert.match(html, /id="stage-arrange-select"[^>]*aria-label="選択したものだけ整列"[^>]*disabled/);
  assert.match(html, /id="stage-arrange-options"[^>]*role="menu"/);
  assert.doesNotMatch(html, /<select[^>]*id="stage-arrange-select"/);
  assert.match(source, /view === "plan" && event\.shiftKey && hit/);
  assert.match(source, /kind: "marquee"/);
  assert.match(source, /event\.altKey && zoomOf\("plan"\)\.z > 1\.001/);
  assert.match(source, /els\.arrangeSelect\.disabled = !enabled \|\| count < 2/);
  assert.match(source, /els\.multiSelectStatus\.hidden = !enabled \|\| count < 2/);
  assert.match(source, /count > 1[\s\S]*?`\$\{count\}件選択中`[\s\S]*?: ""/);
  assert.match(source, /function toggleArrangeMenu\(\)/);
});

test("複数選択は正面図にも全員分を表示し、選んだものパネルへ一括範囲を示す", () => {
  assert.match(html, /id="stage-selection-scope"[^>]*aria-live="polite"[^>]*hidden/);
  assert.match(source, /const selected = selectedPieces\(\);\s*selected\.forEach\(\(piece\) => drawSelection/);
  assert.doesNotMatch(source, /const selected = L\.plan \? selectedPieces\(\) : \[selectedPiece\(\)\]/);
  assert.match(source, /\? sx\(`\$\{pieces\.length\}人の演者`/);
  assert.match(source, /els\.selectionScope\.hidden = !multi/);
});

test("単体選択した演者は、選んだものパネルに通し番号ではなく登録名を出す", () => {
  const yuki = { id: "performer-6", type: "performer", castId: "cast-yuki" };
  const pieces = [
    { id: "performer-1", type: "performer" },
    yuki,
  ];
  assert.equal(selectedTitle(yuki, pieces, { id: "cast-yuki", name: "ユキ" }), "ユキ");
  assert.equal(selectedTitle({ id: "chair-1", type: "chair", name: "白い椅子" }, pieces), "白い椅子");
  assert.equal(selectedTitle(pieces[0], pieces), "演者 1");
  assert.match(source, /els\.selectedName\.textContent = selectedPieceTitle\(piece\)/);
});

test("選択済みの一人をドラッグすると相対位置を保って全員が動く", () => {
  const entries = [
    { id: "a", u: 0.2, v: 0.3 },
    { id: "b", u: 0.5, v: 0.55 },
    { id: "c", u: 0.75, v: 0.8 },
  ];
  const moved = groupedDrag(entries, "b", 0.65, 0.4, { uMin: 0, uMax: 1, vMin: 0, vMax: 1 });
  assert.deepEqual(moved, [
    { id: "a", u: 0.35, v: 0.15 },
    { id: "b", u: 0.65, v: 0.4 },
    { id: "c", u: 0.9, v: 0.65 },
  ]);

  const stoppedAtEdge = groupedDrag(entries, "b", 0.95, 0.9, { uMin: 0, uMax: 1, vMin: 0, vMax: 1 });
  assert.deepEqual(stoppedAtEdge, [
    { id: "a", u: 0.45, v: 0.5 },
    { id: "b", u: 0.75, v: 0.75 },
    { id: "c", u: 1, v: 1 },
  ]);
  assert.match(source, /const keepGroup = hit && normalizeSelectedIds\(\)\.size > 1/);
  assert.match(source, /groupStart: keepGroup \? selectedPieces\(\)\.map/);
});

test("姿勢は複数の演者へ一度の履歴でまとめて反映する", () => {
  const performers = [
    { id: "a", type: "performer", pose: "stand" },
    { id: "b", type: "performer", pose: "kneel" },
    { id: "c", type: "performer", pose: "sit" },
  ];
  const fixture = poseFixture(performers);
  assert.equal(fixture.applyPose({ id: "sit", label: "座る" }), 2);
  assert.deepEqual(performers.map((piece) => piece.pose), ["sit", "sit", "sit"]);
  assert.deepEqual(fixture.counts(), { checkpoints: 1, inspectorUpdates: 1, renders: 1, persists: 1 });
  assert.deepEqual(fixture.messages, ["3人の姿勢を「座る」にしました。"]);

  assert.equal(fixture.applyPose({ id: "sit", label: "座る" }), 0);
  assert.deepEqual(fixture.counts(), { checkpoints: 1, inspectorUpdates: 1, renders: 1, persists: 1 });
});

test("向きは複数選択した演者全員へ反映し、混在選択へ部分適用しない", () => {
  const facingSelection = functionSource("selectedFacingPieces");
  assert.match(facingSelection, /if \(pieces\.length > 1\) return selectedPerformerPieces\(\)/);

  const inputStart = source.indexOf('els.pieceFacing.addEventListener("input"');
  const inputEnd = source.indexOf("if (els.facingLock)", inputStart);
  const inputBody = source.slice(inputStart, inputEnd);
  assert.match(inputBody, /const pieces = selectedFacingPieces\(\)/);
  assert.match(inputBody, /pieces\.forEach\(\(piece\) => \{ piece\.facing = facing; \}\)/);

  const wheel = functionSource("onFacingWheel");
  assert.match(wheel, /const facingPieces = selectedFacingPieces\(\)/);
  assert.match(wheel, /facingPieces\.forEach\(\(item\) =>/);
});

test("器具上の演者または演者以外を含む選択へ姿勢を一括適用しない", () => {
  const mounted = [{ id: "a", type: "performer", pose: "stand", mount: "chair" }];
  const mountedFixture = poseFixture(mounted);
  assert.equal(mountedFixture.applyPose({ id: "sit", label: "座る" }), 0);
  assert.equal(mounted[0].pose, "stand");
  assert.deepEqual(mountedFixture.counts(), { checkpoints: 0, inspectorUpdates: 0, renders: 0, persists: 0 });

  const mixed = [{ id: "a", type: "performer", pose: "stand" }, { id: "box", type: "block" }];
  const mixedFixture = poseFixture(mixed);
  assert.equal(mixedFixture.applyPose({ id: "sit", label: "座る" }), 0);
  assert.equal(mixed[0].pose, "stand");
});

test("整列は選択した演者・舞台セット・小道具だけを動かす", () => {
  const performer = { id: "performer", type: "performer", u: 0.25, v: 0.3 };
  const setPiece = { id: "set", type: "platform", u: 0.5, v: 0.5 };
  const prop = { id: "prop", type: "sphere", u: 0.75, v: 0.7 };
  const notSelected = { id: "other", type: "performer", u: 0.4, v: 0.9 };
  const fixture = lineupFixture([performer, setPiece, prop]);

  fixture.lineup("row");

  assert.deepEqual([performer.u, setPiece.u, prop.u], [0.15, 0.5, 0.85]);
  assert.ok([performer.v, setPiece.v, prop.v].every((v) => Math.abs(v - 0.5) < 1e-9));
  assert.deepEqual([notSelected.u, notSelected.v], [0.4, 0.9]);
  assert.deepEqual(fixture.counts(), { checkpoints: 1, renders: 1, persists: 1 });
  assert.deepEqual(fixture.messages, ["選択したものを等間隔の横1列に並べました。"]);
});

test("選択が2件未満なら整列せず履歴も増やさない", () => {
  const fixture = lineupFixture([{ id: "one", type: "performer", u: 0.5, v: 0.5 }]);
  fixture.lineup("circle");
  assert.deepEqual(fixture.counts(), { checkpoints: 0, renders: 0, persists: 0 });
  assert.deepEqual(fixture.messages, ["整列するものを2つ以上選択してください。"]);
});

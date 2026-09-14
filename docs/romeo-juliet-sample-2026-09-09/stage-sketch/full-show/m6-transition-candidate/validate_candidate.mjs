import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { validateDocument } from "../../../../../mcp-server/src/stage-model.js";

const here = new URL("./", import.meta.url);
const read = (name) => JSON.parse(fs.readFileSync(new URL(name, here), "utf8"));
const bytes = (name) => fs.readFileSync(new URL(name, here));
const sha = (value) => createHash("sha256").update(value).digest("hex");

const source = read("../romeo-juliet-full-show.stage-sketch.json");
const input = read("ai-input.json");
const proposal = read("ai-proposal.json");
const approval = read("owner-approval-2026-09-12.json");
const candidate = read("romeo-juliet-m6-transition-candidate.stage-sketch.json");
const manifest = read("candidate-manifest.json");
const page = fs.readFileSync(new URL("index.html", here), "utf8");

assert.equal(sha(bytes("../romeo-juliet-full-show.stage-sketch.json")), input.source.nativeSha256);
assert.equal(sha(bytes("../romeo-juliet-full-show.stage-sketch.json")), manifest.sourceNativeSha256);
assert.equal(sha(bytes("romeo-juliet-m6-transition-candidate.stage-sketch.json")), manifest.candidateSha256);
assert.equal(proposal.status, "ai_proposal_not_adopted");
assert.equal(approval.status, "owner_approved_for_sample");
assert.deepEqual(approval.decisions.map(item => [item.id, item.choice]), [["M6-C1", "A"], ["M6-C2", "A"], ["M6-C3", "A"]]);
assert.equal(sha(bytes("owner-approval-2026-09-12.json")), manifest.ownerApprovalSha256);
assert.equal(manifest.status, "owner_approved_sample_candidate");
assert.deepEqual(manifest.approvedChoices, { "M6-C1": "A", "M6-C2": "A", "M6-C3": "A" });

const result = validateDocument(candidate);
assert.equal(result.valid, true, result.errors.join("\n"));
assert.equal(candidate.kind, "shosai-stage-sketch");
assert.equal(candidate.version, 3);
assert.equal(candidate.project.id, "romeo-juliet-m6-transition-candidate");
assert.match(candidate.project.title, /サンプル採用/);

assert.equal(source.project.scenes.length, 31);
assert.equal(candidate.project.scenes.length, 34);
assert.equal(candidate.project.scenes.filter(scene => scene.kind === "section").length, 3);
assert.equal(candidate.project.scenes.filter(scene => scene.kind === "scene").length, 31);
assert.deepEqual(candidate.project.cast.map(item => item.id), source.project.cast.map(item => item.id));
assert.deepEqual(candidate.project.sets.map(item => item.id), source.project.sets.map(item => item.id));
assert.equal(new Set(candidate.project.scenes.map(scene => scene.id)).size, 34);

const scene = id => candidate.project.scenes.find(item => item.id === id);
const from = scene("rj-frame-rj-cond-01-b-02");
const to = scene("rj-frame-rj-cond-01-c-01");
const inserted = proposal.frames.map(frame => scene(frame.id));
const order = candidate.project.scenes.map(item => item.id);
assert.deepEqual(
  order.slice(order.indexOf(from.id), order.indexOf(to.id) + 1),
  [from.id, ...proposal.frames.map(frame => frame.id), to.id],
);

const people = item => item.pieces.filter(piece => piece.type === "performer");
const role = (item, id) => people(item).find(piece => piece.originId === id);
const setPiece = (item, id) => item.pieces.find(piece => piece.setId === id);
const maskCount = item => item.pieces.filter(piece => piece.holdMode === "face").length;

for (const item of [from, ...inserted, to]) {
  assert.equal(people(item).length, 10, item.id);
  assert.equal(new Set(people(item).map(piece => piece.castId)).size, 10, item.id);
  assert.equal(new Set(item.pieces.map(piece => piece.id)).size, item.pieces.length, item.id);
  for (const piece of item.pieces) {
    assert.ok(Number.isFinite(piece.u) && piece.u >= 0 && piece.u <= 1, item.id + "/" + piece.id + "/u");
    assert.ok(Number.isFinite(piece.v) && piece.v >= 0 && piece.v <= 1, item.id + "/" + piece.id + "/v");
    if (piece.heldBy) {
      assert.ok(item.pieces.some(holder => holder.id === piece.heldBy && holder.type === "performer"));
      assert.equal(piece.u, item.pieces.find(holder => holder.id === piece.heldBy).u);
      assert.equal(piece.v, item.pieces.find(holder => holder.id === piece.heldBy).v);
    }
  }
}

for (const carrier of proposal.carrierRoles) {
  assert.deepEqual(
    { u: role(from, carrier).u, v: role(from, carrier).v },
    proposal.preBlackoutPositions[carrier],
  );
  assert.deepEqual(
    { u: role(to, carrier).u, v: role(to, carrier).v },
    proposal.barStaffPositions[carrier],
  );
}

assert.deepEqual(inserted.map(maskCount), [4, 8, 10]);
assert.equal(maskCount(to), 10);
assert.equal(setPiece(inserted[0], "rj-set-bar"), undefined);
assert.ok(setPiece(inserted[1], "rj-set-bar"));
assert.ok(setPiece(inserted[2], "rj-set-bar"));
assert.ok(setPiece(to, "rj-set-bar"));
assert.ok(setPiece(inserted[1], "rj-set-bar").route);
assert.deepEqual(
  { u: setPiece(inserted[2], "rj-set-bar").u, v: setPiece(inserted[2], "rj-set-bar").v },
  { u: 0.5, v: 0.12 },
);
assert.ok(setPiece(inserted[1], "rj-set-bar-shelf").route);

for (const item of [from, ...inserted]) {
  assert.deepEqual(
    item.rehearsal,
    { holdDurationSeconds: null, transitionToNextSeconds: null },
    item.id,
  );
}
assert.equal(inserted[0].blackout, true);
assert.equal(inserted[1].blackout, false);
assert.equal(inserted[2].blackout, false);
assert.equal(to.blackout, false);
assert.equal(manifest.unknownsPreserved, 5);
assert.equal(manifest.productChanges, 0);
assert.equal(manifest.sourceSampleChanges, 0);
assert.equal(manifest.realCaseEvidence, 0);

assert.match(page, /M6-C1/);
assert.match(page, /M6-C2/);
assert.match(page, /M6-C3/);
assert.match(page, /本人確定：15件/);
assert.match(page, /正式記録は3項目ともA/);
assert.equal((page.match(/class="decision" data-decision=/g) || []).length, 3);
assert.ok(page.includes(manifest.candidateSha256));
assert.ok(!page.includes("__REVIEW_DATA__"));
assert.ok(!page.includes("__CANDIDATE_SHA__"));

const report = {
  status: "pass",
  nativeSchemaValid: true,
  sourceSha256: manifest.sourceNativeSha256,
  candidateSha256: manifest.candidateSha256,
  ownerApprovalSha256: manifest.ownerApprovalSha256,
  approvalStatus: approval.status,
  approvedChoices: manifest.approvedChoices,
  sections: 3,
  sourceScenes: 28,
  candidateScenes: 31,
  insertedTechnicalFrames: 3,
  cast: 10,
  sets: 13,
  maskProgression: [4, 8, 10, 10],
  barProgression: [0, 1, 1, 1],
  carrierRoles: proposal.carrierRoles,
  nullTimingFrames: 4,
  decisionGroups: 3,
  unknownsPreserved: 5,
  productChanges: 0,
  sourceSampleChanges: 0,
  realCaseEvidence: 0,
  warnings: result.warnings,
};
fs.mkdirSync(new URL("qa/", here), { recursive: true });
fs.writeFileSync(new URL("qa/data-checks.json", here), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));

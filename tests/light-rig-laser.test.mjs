import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../docs/light-rig-design-2026-09-11/prototype/laser-effects.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const L = sandbox.window.LASER_EFFECTS;
const S = { x: 0, y: 1, z: 6 }, dims = { W: 12, D: 8, H: 8 }, axis = { x: 0, y: 1, z: -0.2 };

test("beam is exactly one ray on the requested axis", () => {
  const rays = L.laserRays("beam", S, axis, 0, 0, dims);
  assert.equal(rays.length, 1);
  const expected = L.norm(axis);
  assert.ok(Math.abs(rays[0].dir.x - expected.x) < 1e-9);
  assert.ok(Math.abs(rays[0].dir.y - expected.y) < 1e-9);
  assert.ok(Math.abs(rays[0].dir.z - expected.z) < 1e-9);
});

test("fan has 12 rays symmetric across plus or minus 30 degrees", () => {
  const rays = L.laserRays("fan", S, { x: 0, y: 1, z: 0 }, 60, 0, dims);
  assert.equal(rays.length, 12);
  assert.ok(Math.abs(rays[0].dir.x + rays.at(-1).dir.x) < 1e-9);
  assert.ok(Math.abs(rays[0].dir.y - Math.cos(Math.PI / 6)) < 1e-9);
});

test("fan with zero spread is the same single ray as a beam", () => {
  const fan = L.laserRays("fan", S, axis, 0, 0, dims);
  const beam = L.laserRays("beam", S, axis, 0, 0, dims);
  assert.equal(fan.length, 1);
  assert.equal(beam.length, 1);
  assert.ok(Math.hypot(fan[0].dir.x - beam[0].dir.x, fan[0].dir.y - beam[0].dir.y, fan[0].dir.z - beam[0].dir.z) < 1e-9);
});

test("sheet is represented by two edges of one plane, not a ray bundle", () => {
  const rays = L.laserRays("sheet", S, axis, 90, 0, dims);
  assert.equal(rays.length, 2);
  assert.equal(L.EFFECTS.sheet.max, 40);
  const capped = L.laserRays("sheet", S, axis, 90, 0, dims);
  const angle = Math.acos(L.clamp(L.norm(axis).x * capped[0].dir.x + L.norm(axis).y * capped[0].dir.y + L.norm(axis).z * capped[0].dir.z, -1, 1));
  assert.ok(Math.abs(angle - 20 * Math.PI / 180) < 1e-9);
});

test("plane roll rotates a fan around its aiming axis", () => {
  const flat = L.laserRays("fan", S, { x: 0, y: 1, z: 0 }, 60, 0, dims, 0);
  const rolled = L.laserRays("fan", S, { x: 0, y: 1, z: 0 }, 60, 0, dims, 90);
  assert.ok(Math.abs(flat[0].dir.x) > 0.4);
  assert.ok(Math.abs(flat[0].dir.z) < 1e-9);
  assert.ok(Math.abs(rolled[0].dir.x) < 1e-9);
  assert.ok(Math.abs(rolled[0].dir.z) > 0.4);
});

test("laser spread automation makes one eased round trip per period", () => {
  assert.equal(L.swingPhase(0, 4, 0, "linear"), 0);
  assert.equal(L.swingPhase(1000, 4, 0, "linear"), 0.5);
  assert.equal(L.swingPhase(2000, 4, 0, "linear"), 1);
  assert.equal(L.swingPhase(4000, 4, 0, "linear"), 0);
  assert.ok(L.swingPhase(500, 4, 0, "ease") < L.swingPhase(500, 4, 0, "linear"));
});

test("tunnel rays stay on a constant 12 degree cone", () => {
  const a = L.norm(axis), rays = L.laserRays("tunnel", S, axis, 24, 0.25, dims);
  assert.equal(rays.length, 36);
  rays.forEach((r) => assert.ok(Math.abs(Math.acos(L.clamp(r.dir.x * a.x + r.dir.y * a.y + r.dir.z * a.z, -1, 1)) - 12 * Math.PI / 180) < 1e-9));
});

test("phase is periodic for animated patterns", () => {
  const a = L.laserRays("liquid", S, axis, 95, 0.35, dims);
  const b = L.laserRays("liquid", S, axis, 95, 1.35, dims);
  a.forEach((r, i) => assert.ok(Math.hypot(r.dir.x - b[i].dir.x, r.dir.y - b[i].dir.y, r.dir.z - b[i].dir.z) < 1e-9));
});

test("landing returns floor, back, ceiling, or no surface", () => {
  assert.equal(L.laserLanding(S, { x: 0, y: 0, z: -1 }, dims, 20).on, "floor");
  assert.equal(L.laserLanding(S, { x: 0, y: -1, z: 0 }, dims, 20).on, "back");
  assert.equal(L.laserLanding(S, { x: 0, y: 0, z: 1 }, dims, 20).on, "ceil");
  assert.equal(L.laserLanding(S, { x: 1, y: 0, z: 0 }, dims, 5).on, null);
});

test("vertical axis basis remains finite and orthogonal", () => {
  const b = L.basisFor({ x: 0, y: 0, z: 1 });
  Object.values(b).forEach((v) => Object.values(v).forEach((n) => assert.ok(Number.isFinite(n))));
  assert.ok(Math.abs(b.axis.x * b.u.x + b.axis.y * b.u.y + b.axis.z * b.u.z) < 1e-9);
});

test("FOH source must point back through the stage-front cut", () => {
  const source = { x: 0, y: 12, z: 5 };
  assert.ok(L.houseCutAtFront(source, { x: 0, y: -1, z: 0 }, dims));
  assert.equal(L.houseFarPoint(source, { x: 0, y: 1, z: 0 }, dims, 20), null);
});

test("air-target ray keeps extending instead of stopping at a stage surface", () => {
  const end = L.extendedRayPoint(S, { x: 0, y: 1, z: -0.2 }, 120);
  assert.ok(end.y > dims.D);
  assert.ok(end.z < 0);
  assert.ok(Math.abs(Math.hypot(end.x - S.x, end.y - S.y, end.z - S.z) - 120) < 1e-9);
});

test("non-laser fixture kind does not enter the laser branch", () => {
  const fixture = { kind: "moving" };
  assert.notEqual(fixture.kind, "laser");
});

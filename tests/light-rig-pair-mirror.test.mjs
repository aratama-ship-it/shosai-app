import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

/* 照明デザイン試作の2灯照射位置左右反転。配置位置でなく照射先・軌道を検証する。 */
const source = await readFile(new URL("../docs/light-rig-design-2026-09-11/prototype/rig-engine.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "rig-engine.js" });
const E = context.window.RIG_ENGINE;
const plain = (v) => JSON.parse(JSON.stringify(v));
const near = (a, b, tolerance = 1e-6) => Math.abs(a - b) <= tolerance;
const dims = { W: 12, D: 8, H: 8 };
const cue = { groups: [] };
const light = (path, extra = {}) => E.newLightCue({ on: true, surface: "air", path, speed: "normal", ...extra });

test("左右反転は同じ照射面・同じ軌道種類の2灯だけに使える", () => {
  assert.equal(E.mirrorAimCompatible(light({ kind: "still", a: E.newPoint() }), light({ kind: "still", a: E.newPoint() })), true);
  assert.equal(E.mirrorAimCompatible(light({ kind: "line", a: E.newPoint(), b: E.newPoint() }), light({ kind: "line", a: E.newPoint(), b: E.newPoint() })), true);
  assert.equal(E.mirrorAimCompatible(light({ kind: "circle", c: E.newPoint() }), light({ kind: "circle", c: E.newPoint() })), true);
  assert.equal(E.mirrorAimCompatible(light({ kind: "eight", c: E.newPoint() }), light({ kind: "eight", c: E.newPoint() })), true);
  assert.equal(E.mirrorAimCompatible(light({ kind: "still", a: E.newPoint() }), { ...light({ kind: "still", a: E.newPoint() }), surface: "floor" }), false);
  assert.equal(E.mirrorAimCompatible(light({ kind: "line", a: E.newPoint(), b: E.newPoint() }), light({ kind: "still", a: E.newPoint() })), false);
  assert.equal(E.mirrorAimCompatible(light(null), light(null)), false);
});

test("停止中の照射先と往復軌道の両端を舞台中央で鏡映し、灯体設定を保つ", () => {
  const sourceLight = light({ kind: "line", a: E.newPoint({ u: 0.2, v: 0.15, hM: 1.1 }), b: E.newPoint({ u: 0.4, v: 0.75, hM: 5.4 }), start: "b", easing: "linear" }, { color: "#ff0000", level: 82, periodSec: 2.4 });
  const partner = light({ kind: "line", a: E.newPoint(), b: E.newPoint(), easing: "ease" }, { color: "#0000ff", level: 31, on: true, periodSec: 2.4 });
  const beforeSource = plain(sourceLight), beforePartner = plain(partner);
  const mirrored = E.mirrorAimPath(sourceLight, partner);
  assert.deepEqual(plain(mirrored.path.a), { u: 0.8, v: 0.15, hM: 1.1 });
  assert.deepEqual(plain(mirrored.path.b), { u: 0.6, v: 0.75, hM: 5.4 });
  assert.deepEqual(plain([mirrored.color, mirrored.level, mirrored.on, mirrored.periodSec]), ["#0000ff", 31, true, 2.4]);
  assert.deepEqual(plain(sourceLight), beforeSource, "基準灯は変更しない");
  assert.deepEqual(plain(partner), beforePartner, "相手灯の入力も破壊しない");
  for (const time of [0, 450, 1200, 1950, 2700]) {
    const a = E.targetAt(sourceLight, cue, "a", time, dims);
    const b = E.targetAt(mirrored, cue, "b", time, dims);
    assert.ok(near(b.x, -a.x) && near(b.y, a.y) && near(b.z, a.z), `往復の ${time}ms`);
  }
});

test("停止点・円・8の字は軌道面ごとに照射軌跡を幾何学的に鏡映する", () => {
  const still = light({ kind: "still", a: E.newPoint({ u: 0.18, v: 0.62, hM: 2.7 }) });
  const stillMirror = E.mirrorAimPath(still, light(still.path));
  const a0 = E.targetAt(still, cue, "a", 0, dims), b0 = E.targetAt(stillMirror, cue, "b", 0, dims);
  assert.ok(near(b0.x, -a0.x) && near(b0.y, a0.y) && near(b0.z, a0.z));

  for (const kind of ["circle", "eight"]) {
    for (const plane of ["horizontal", "frontVertical", "sideVertical"]) {
      for (const dir of ["cw", "ccw"]) {
        const path = { kind, c: E.newPoint({ u: 0.29, v: 0.48, hM: 3.7 }), r: 1.6, r2: 0.9, tilt: 27, plane, dir, start: 0.13 };
        const aLight = light(path, { periodSec: 3.2 });
        const bLight = E.mirrorAimPath(aLight, light({ ...path, c: E.newPoint() }, { periodSec: 3.2 }));
        for (const time of [0, 320, 840, 1730, 2940]) {
          const a = E.targetAt(aLight, cue, "a", time, dims);
          const b = E.targetAt(bLight, cue, "b", time, dims);
          assert.ok(near(b.x, -a.x) && near(b.y, a.y) && near(b.z, a.z), `${kind}/${plane}/${dir} ${time}ms: ${JSON.stringify({ a, b })}`);
        }
      }
    }
  }
});

test("互換でない灯は相手の狙いを変えない", () => {
  const sourceLight = light({ kind: "still", a: E.newPoint({ u: 0.2 }) });
  const partner = { ...light({ kind: "line", a: E.newPoint({ u: 0.4 }), b: E.newPoint({ u: 0.6 }) }), level: 43 };
  assert.deepEqual(plain(E.mirrorAimPath(sourceLight, partner)), plain(partner));
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const ctx = { window: {} };
vm.runInNewContext(await readFile(new URL('../docs/light-rig-design-2026-09-11/prototype/stage-figure.js', import.meta.url), 'utf8'), ctx);
const F = ctx.window.STAGE_FIGURE;
const P = { x: 0, y: 4, z: 1.5 }, V = { x: 0, y: 1, z: 0 };
const beam = (S, over = {}) => ({ S, T: P, level: 1, deg: 30, color: '#ffffff', ...over });
const front = beam({ x: 0, y: 9, z: 1.5 });
const back = beam({ x: 0, y: 0, z: 1.5 });
const sample = (beams, normal = V, point = P) => [...F.bodyLightSample(point, normal, beams, '#d8cdb6')];
const sum = (a) => a.reduce((x, y) => x + y, 0);

test('前明かりと逆光の同時点灯で、見えている前面を黒く上書きしない', () => {
  assert.deepEqual(sample([back]), [12, 11, 10]);
  assert.ok(sum(sample([front])) > 400);
  assert.deepEqual(sample([front, back]), sample([front]));
  assert.deepEqual(sample([back, front]), sample([front]));
});
test('横からの光はその側を照らす。反対側へ回ったビューでは照らされた面が変わる', () => {
  const side = beam({ x: 5, y: 4, z: 1.5 });
  const near = { x: 0.9, y: Math.sqrt(0.19), z: 0 };
  assert.ok(sum(sample([side], near)) > 400);
  assert.deepEqual(sample([side], { ...near, x: -0.9 }), [12, 11, 10]);
  assert.ok(sum(sample([side], { x: 1, y: 0, z: 0 })) > 400);
  assert.deepEqual(sample([side], { x: -1, y: 0, z: 0 }), [12, 11, 10]);
  assert.ok(sum(sample([side], near, { ...P, y: 4.03 })) > 300, '腕が少し前へ出ても横光を消さない');
});
test('前に灯があるだけでは照らさない: 外れた狙い・頭上通過・光源の後方', () => {
  assert.deepEqual(sample([{ ...front, T: { x: 8, y: 4, z: 1.5 } }]), [12, 11, 10]);
  assert.deepEqual(sample([beam({ x: 0, y: 9, z: 5 }, { T: { x: 0, y: 4, z: 5 }, deg: 8 })]), [12, 11, 10]);
  assert.deepEqual(sample([{ ...front, T: { x: 0, y: 12, z: 1.5 } }]), [12, 11, 10]);
});
test('狙い点は空中の終端ではない。光軸を延長した先の身体も照らす', () => {
  assert.ok(sum(sample([{ ...front, T: { x: 0, y: 7, z: 1.5 } }])) > 400);
});
test('消灯・強さ0・ストロボの消灯位相は暗く、弱い前明かりは段階的に明るくなる', () => {
  assert.deepEqual(sample([]), [12, 11, 10]);
  assert.deepEqual(sample([{ ...front, level: 0 }, back]), [12, 11, 10]);
  const values = [0, 0.01, 0.1, 0.5, 1].map(level => sum(sample([{ ...front, level }, back])));
  for (let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1]);
});
test('照明色を反映し、入力の照明・人物設定は変更しない', () => {
  const beams = [{ ...front, color: '#ff0000' }], before = JSON.stringify(beams);
  const rgb = sample(beams);
  assert.ok(rgb[0] > 150); assert.equal(rgb[1], 11); assert.equal(rgb[2], 10);
  assert.equal(JSON.stringify(beams), before);
});
test('カッターで遮った前明かりは、逆光の影絵を解除しない', () => {
  const cut = { n: { x: 1, y: 0, z: 0 }, f: 0.9, soft: 0.02 };
  const p = { ...P, x: 0.5 };
  assert.ok(sum(sample([front], V, p)) > 300);
  assert.deepEqual(sample([{ ...front, doors: [cut] }, back], V, p), [12, 11, 10]);
});
test('光源と狙い点が一致してもNaNを描画色へ渡さない', () => {
  assert.deepEqual(sample([{ ...front, T: front.S }]), [12, 11, 10]);
});

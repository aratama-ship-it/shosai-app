import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const context = {
  window: {},
  document: { getElementById: () => null },
};
vm.runInNewContext(source, context, { filename: "stage-sketch.js" });
const model = context.window.SHOSAI_STAGE_BEAT_TEMPLATE_MODEL;

const plain = (value) => JSON.parse(JSON.stringify(value));

test("D2の10種を持ち、#2だけを推測せず保留する", () => {
  const templates = plain(model.templates);
  assert.equal(templates.length, 10);
  assert.deepEqual(templates.map((item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(templates.filter((item) => item.available === false).length, 1);
  assert.equal(templates[1].id, "two-part-variety");
  assert.equal(templates[1].roles, null);
  assert.equal(templates[1].energy, null);
  assert.match(templates[1].roleText, /休憩/);
  assert.match(templates[1].curveText, /｜休憩｜/);
  assert.deepEqual(plain(model.rowsForTemplate("two-part-variety")), []);
});

test("実装可能な9種は役割数・エネルギー数・生成シーン数が一致し、配置が空である", () => {
  model.templates.filter((template) => template.available !== false).forEach((template) => {
    const rows = plain(model.rowsForTemplate(template.id));
    assert.equal(template.roles.length, template.energy.length, template.name);
    assert.equal(rows.length, template.roles.length, template.name);
    rows.forEach((row, index) => {
      assert.equal(row.kind, "scene");
      assert.equal(row.title, template.roles[index]);
      assert.deepEqual(row.beat, {
        role: template.roles[index],
        energy: template.energy[index],
      });
      assert.deepEqual(row.pieces, []);
    });
  });
});

test("beatはJSON往復で保持され、sectionでは常にnullになる", () => {
  const exported = JSON.stringify({
    kind: "shosai-stage-sketch",
    version: 3,
    project: {
      scenes: [
        { kind: "scene", beat: { role: "中央反転", energy: 4 }, pieces: [] },
        { kind: "section", beat: { role: "休憩", energy: 2 }, pieces: [] },
      ],
    },
  });
  const imported = JSON.parse(exported);
  assert.deepEqual(plain(model.normalizeSceneBeat("scene", imported.project.scenes[0].beat)), {
    role: "中央反転",
    energy: 4,
  });
  assert.equal(model.normalizeSceneBeat("section", imported.project.scenes[1].beat), null);
  assert.deepEqual(imported.project.scenes[0].pieces, []);
});

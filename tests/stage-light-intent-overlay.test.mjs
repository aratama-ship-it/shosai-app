import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const stageHtml = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../style.css", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");

const context = {
  window: {},
  document: {
    getElementById: () => null,
    createElement: () => ({ getContext: () => ({}), width: 0, height: 0 }),
  },
};
vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
const overlay = context.window.SHOSAI_STAGE_LIGHT_INTENT_OVERLAY;
const plain = (value) => JSON.parse(JSON.stringify(value));

test("指定なしは何も描かず、7つの値を決められた作図記号へ写す", () => {
  assert.equal(overlay.mark("unspecified"), null);
  assert.equal(overlay.mark("unknown"), null);
  assert.deepEqual(plain(overlay.mark("reveal")), {
    fill: null, dim: "others", outline: null, tag: "reveal",
  });
  assert.deepEqual(plain(overlay.mark("soften")), {
    fill: "rgba(9,8,7,0.35)", dim: null, outline: null, tag: "soften",
  });
  assert.equal(overlay.mark("conceal").hatch, true);
  assert.deepEqual(plain(overlay.mark("silhouette").outline), { w: 2, dash: null });
  assert.deepEqual(plain(overlay.mark("separate").outline), { w: 3.5, dash: null });
  assert.deepEqual(plain(overlay.mark("transform").outline), { w: 2, dash: [6, 5] });
});

test("空の意図は計画を作らない", () => {
  assert.equal(overlay.plan(null), null);
  assert.equal(overlay.plan({}), null);
});

test("演者silhouetteだけなら明示レイヤー1件で、revealの副作用はない", () => {
  const plan = plain(overlay.plan({
    layers: { performer: { intent: "silhouette" } },
  }));
  assert.equal(plan.layers.length, 1);
  assert.equal(plan.layers[0].key, "performer");
  assert.deepEqual(plan.revealed, []);
  assert.deepEqual(plan.dimmed, []);
});

test("演者revealは背景と空間だけを沈める", () => {
  const plan = plain(overlay.plan({
    layers: {
      performer: { intent: "reveal" },
      background: { intent: "conceal" },
    },
  }));
  assert.deepEqual(plan.revealed, ["performer"]);
  assert.ok(plan.dimmed.includes("background"));
  assert.ok(plan.dimmed.includes("space"));
  assert.ok(!plan.dimmed.includes("performer"));
});

test("重ね計画のレイヤー順は常に背景、空間、演者になる", () => {
  const plan = plain(overlay.plan({
    layers: {
      performer: { intent: "reveal" },
      space: { intent: "soften" },
      background: { intent: "conceal" },
    },
  }));
  assert.deepEqual(plan.layers.map((entry) => entry.key), ["background", "space", "performer"]);
});

test("DOM、ドックCSS、描画ガード、日英文言が接続されている", () => {
  assert.match(stageHtml, /id="stage-front-light-intent"/);
  assert.match(stageHtml, /id="stage-work-area"/);
  assert.match(stageHtml, /id="stage-light-intent-compare"/);
  const sceneBar = stageHtml.slice(
    stageHtml.indexOf('id="stage-scene-bar"'),
    stageHtml.indexOf('id="stage-work-area"'),
  );
  assert.doesNotMatch(sceneBar, /class="stage-light-intent"/);
  assert.match(styleSource, /\.stage-work-area\s*\{/);
  assert.match(styleSource, /\.stage-work-area\.is-docked\s*\{/);
  assert.match(stageSource, /target !== ctx && target !== planCtx/);
  assert.match(stageSource, /if \(presenting\) return/);

  const i18nContext = { window: {} };
  vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
  const text = i18nContext.window.SHOSAI_I18N.text;
  [
    "光の意図",
    "光の意図を、図の上に作図の印として重ねる",
    "いまの照明",
    "配置案を試す…",
    "照らし合わせは人が行います。",
    "指定なし",
  ].forEach((key) => assert.equal(typeof text[key], "string", key));
});

test("画面状態showLightIntentを書き出しJSONへ含めない", () => {
  const exportBuilder = stageSource.slice(
    stageSource.indexOf("const makeProjectExportDocument"),
    stageSource.indexOf("const prepareProjectImportDocument"),
  );
  assert.match(exportBuilder, /kind: "shosai-stage-sketch"/);
  assert.doesNotMatch(exportBuilder, /showLightIntent/);
});

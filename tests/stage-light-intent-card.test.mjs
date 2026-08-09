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
  document: { getElementById: () => null },
};
vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
const model = context.window.SHOSAI_STAGE_LIGHT_INTENT_MODEL;
const projectIo = context.window.SHOSAI_STAGE_PROJECT_IO;
const plain = (value) => JSON.parse(JSON.stringify(value));

test("光の意図を演者・空間・背景と変化へ正規化し、安全状態を固定する", () => {
  const normalized = plain(model.normalize({
    version: 99,
    objective: "  暗闇の中に最初からいたことへ気づかせる。  ",
    audienceFocus: "身体の輪郭",
    layers: {
      performer: { intent: "silhouette", note: "顔は読ませない" },
      space: { intent: "reveal", note: "細い奥行き" },
      background: { intent: "conceal", note: "具体物を沈める" },
    },
    transition: {
      triggerType: "action",
      triggerNote: "演者が止まった瞬間",
      change: "fade-in",
      tempo: "breathe",
    },
    safetyStatus: "approved",
  }));

  assert.equal(normalized.version, 1);
  assert.equal(normalized.objective, "暗闇の中に最初からいたことへ気づかせる。");
  assert.equal(normalized.layers.performer.intent, "silhouette");
  assert.equal(normalized.layers.space.intent, "reveal");
  assert.equal(normalized.layers.background.intent, "conceal");
  assert.equal(normalized.transition.triggerType, "action");
  assert.equal(normalized.transition.tempo, "breathe");
  assert.equal(normalized.safetyStatus, "not-assessed");
});

test("中身のないカードは保存せず、短い要約は生成AIを使わず組み立てる", () => {
  assert.equal(model.normalize({}), null);
  assert.equal(model.summary(null, false), "光の意図はまだありません");
  assert.match(model.summary({
    objective: "人物の輪郭だけを暗闇から浮かせる",
    transition: { triggerNote: "演者が止まった瞬間" },
  }, false), /人物の輪郭だけを暗闇から浮かせる/);
});

test("ブラウザ版version 4の書き出しでもlightingIntentを保持する", () => {
  const project = {
    id: "light-show",
    venue: "proscenium",
    scenes: [{
      id: "scene-1",
      kind: "scene",
      title: "輪郭",
      lightingIntent: model.normalize({ objective: "輪郭を見せる" }),
    }],
  };
  const exported = plain(projectIo.exportDocument(project));
  assert.equal(exported.version, 4);
  assert.equal(exported.project.scenes[0].lightingIntent.objective, "輪郭を見せる");
});

test("シーンの正規化、新規シーン、履歴に光の意図が接続されている", () => {
  assert.match(stageSource, /lightingIntent: normalizeLightingIntent\(kind, raw\.lightingIntent\)/);
  assert.match(stageSource, /lightingIntent: null,/);
  const fn = stageSource.slice(stageSource.indexOf("function mutateLightingIntent"));
  const body = fn.slice(0, fn.indexOf("\n  }\n"));
  assert.ok(body.indexOf("checkpoint()") < body.indexOf("scene.lightingIntent = next"));
  assert.match(stageSource, /scene\.lightingIntent = null;[\s\S]*一つ戻すで復元できます/);
});

test("文章入力は選択肢の再描画前にstateへ保持し、入力開始前を一度だけ履歴へ残す", () => {
  const start = stageSource.indexOf("const lightIntentTextSessions = new WeakMap()");
  const end = stageSource.indexOf("const bindLightIntentSelect", start);
  const body = stageSource.slice(start, end);
  assert.match(body, /element\.addEventListener\("input"/);
  assert.ok(body.indexOf("recordBefore(session.before)") < body.indexOf("scene.lightingIntent = next"));
  assert.match(body, /if \(!session\.changed\)/);
});

test("カードはシーン説明と舞台面の間にあり、必須4項目と削除操作を持つ", () => {
  const workArea = stageHtml.slice(
    stageHtml.indexOf('id="stage-work-area"'),
    stageHtml.indexOf('id="stage-canvas-stack"'),
  );
  assert.match(workArea, /id="stage-light-intent"/);
  assert.match(workArea, /id="stage-light-objective"/);
  assert.match(workArea, /id="stage-light-audience-focus"/);
  assert.match(workArea, /id="stage-light-layer-performer-intent"/);
  assert.match(workArea, /id="stage-light-layer-space-intent"/);
  assert.match(workArea, /id="stage-light-layer-background-intent"/);
  assert.match(workArea, /id="stage-light-trigger-type"/);
  assert.match(workArea, /id="stage-light-intent-clear"/);
  assert.match(styleSource, /\.stage-light-intent-body[\s\S]*border-left: 2px solid/);
  assert.match(styleSource, /\.stage-scene-light-summary::before/);
});

test("光の意図カードの主要文言は日英を持つ", () => {
  const i18nContext = { window: {} };
  vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
  const text = i18nContext.window.SHOSAI_I18N.text;
  assert.equal(text["光の意図"], "Lighting intention");
  assert.equal(text["何を起こしたい？"], "What should happen?");
  assert.equal(text["観客はどこを見る？"], "Where should the audience look?");
  assert.equal(text["人・背景・空間をどう見せる？"], "How should performer, backdrop and space read?");
  assert.equal(text["いつ、どう変わる？"], "When and how should it change?");
});

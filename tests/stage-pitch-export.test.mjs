import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const promptSource = await readFile(new URL("../stage-prompt-i18n.js", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const swSource = await readFile(new URL("../stage-sw.js", import.meta.url), "utf8");

const context = {
  window: {},
  document: { getElementById: () => null },
};
vm.runInNewContext(promptSource, context, { filename: "stage-prompt-i18n.js" });
vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
const model = context.window.SHOSAI_STAGE_PITCH_EXPORT_MODEL;
const promptI18n = context.window.SHOSAI_PROMPT_I18N;

const mapContext = { window: {} };
vm.runInNewContext(i18nSource, mapContext, { filename: "stage-i18n.js" });
const MAPS = mapContext.window.SHOSAI_I18N.maps;

const plain = (value) => JSON.parse(JSON.stringify(value));
const baseOptions = {
  i18n: promptI18n,
  style: "theatre",
  cast: [{ id: "cast-1", name: "演者A" }],
  sets: [
    { id: "set-1", name: "赤い椅子", kind: "chair" },
    { id: "light-1", name: "灯りA", kind: "light", lightKind: "ss" },
  ],
  venue: { id: "proscenium", label: "劇場A", width: 12, depth: 9, height: 8 },
  scene: {
    id: "scene-1",
    title: "輪郭",
    pieces: [
      { id: "p1", type: "performer", castId: "cast-1", u: 0.2, v: 0.8, base: 2.4, pose: "reach" },
      { id: "p2", type: "chair", setId: "set-1", u: 0.5, v: 0.5 },
      { id: "p3", type: "light", setId: "light-1", u: 0.8, v: 0.2, color: "#d3ac59" },
    ],
    lightingIntent: {
      objective: "暗闇の中に最初からいたことへ気づかせる",
      audienceFocus: "",
      layers: {
        performer: { intent: "silhouette", note: "顔は読ませない" },
        background: { intent: "unspecified", note: "この補足も出さない" },
        space: { intent: "reveal", note: "奥行きを残す" },
      },
      mood: "",
    },
  },
};

test("seedFromとmulberry32は同じ入力から同じ数列を返す", () => {
  const seed = model.seedFrom("scene-1theatre2");
  assert.equal(seed, model.seedFrom("scene-1theatre2"));
  const first = model.mulberry32(seed);
  const second = model.mulberry32(seed);
  assert.deepEqual(
    [first(), first(), first(), first()],
    [second(), second(), second(), second()],
  );
  assert.notEqual(seed, model.seedFrom("scene-1theatre3"));
});

test("5言語の生成条件は空行を作らず、本人の原文を改変しない", () => {
  promptI18n.langs.forEach(({ code }) => {
    const text = model.buildPrompt({ ...baseOptions, lang: code });
    assert.ok(text.includes("「暗闇の中に最初からいたことへ気づかせる」"), code);
    assert.ok(text.includes("「顔は読ませない」"), code);
    assert.ok(text.includes("「奥行きを残す」"), code);
    assert.ok(!text.includes("この補足も出さない"), code);
    assert.ok(!text.includes("「」"), code);
    assert.ok(!text.includes("undefined"), code);
    assert.ok(!text.includes("null"), code);
    assert.ok(text.includes("+2.4m"), code);
  });
});

test("lightingIntentが無い場面は例外にならず光と本人の言葉の節を落とす", () => {
  promptI18n.langs.forEach(({ code }) => {
    const scene = { ...baseOptions.scene, lightingIntent: null };
    const text = model.buildPrompt({ ...baseOptions, scene, lang: code });
    const head = promptI18n.head[code];
    assert.ok(!text.includes(`【${head.light}】`), code);
    assert.ok(!text.includes(`【${head.ownWords}】`), code);
  });
});

test("renderだけが参照画像の一行を末尾へ足す", () => {
  promptI18n.langs.forEach(({ code }) => {
    ["theatre", "paper", "poster"].forEach((style) => {
      assert.ok(!model.buildPrompt({ ...baseOptions, lang: code, style }).includes(promptI18n.head[code].refNote));
    });
    assert.ok(model.buildPrompt({ ...baseOptions, lang: code, style: "render" })
      .endsWith(promptI18n.head[code].refNote));
  });
});

test("画風パラメータは4キーを持ち、未知のキーはtheatreへ落ちる", () => {
  const theatre = plain(model.styleParams("theatre"));
  ["theatre", "paper", "poster", "render"].forEach((style) => {
    assert.equal(typeof model.styleParams(style).beamHaze, "number", style);
    assert.equal(typeof model.styleParams(style).grain, "number", style);
  });
  assert.deepEqual(plain(model.styleParams("unknown")), theatre);
});

test("生成条件の全語彙表は5言語で同じid集合を持つ", () => {
  const langs = promptI18n.langs.map((item) => item.code);
  const tables = ["head", "style", "side", "depth", "venue", "pose", "piece",
    "lightKind", "lightNote", "intent"];
  tables.forEach((table) => {
    const expected = Object.keys(promptI18n[table][langs[0]]).sort();
    langs.forEach((lang) => assert.deepEqual(Object.keys(promptI18n[table][lang]).sort(), expected,
      `${table}.${lang}`));
  });
  langs.forEach((lang) => {
    assert.deepEqual(Object.keys(promptI18n.pose[lang]).sort(), Object.keys(MAPS.pose).sort(), `pose.${lang}`);
    assert.deepEqual(Object.keys(promptI18n.piece[lang]).sort(), Object.keys(MAPS.pieceType).sort(), `piece.${lang}`);
  });
});

test("位置語彙へ左右反転を招く舞台用語が混ざっていない", () => {
  const forbidden = /stage right|stage left|下手|上手|jardin|cour/i;
  promptI18n.langs.forEach(({ code }) => {
    Object.values(promptI18n.side[code]).forEach((value) => assert.doesNotMatch(value, forbidden, `${code}: ${value}`));
    Object.values(promptI18n.depth[code]).forEach((value) => assert.doesNotMatch(value, forbidden, `${code}: ${value}`));
  });
});

test("ピッチ用UI・読み込み順・オフライン登録・作図注記ガードが揃う", () => {
  assert.match(indexSource, /data-export-purpose="pitch"/);
  assert.match(indexSource, /id="stage-pitch-langs"/);
  assert.ok(indexSource.indexOf("stage-i18n.js?v=60") < indexSource.indexOf("stage-prompt-i18n.js?v=1"));
  assert.ok(indexSource.indexOf("stage-prompt-i18n.js?v=1") < indexSource.indexOf("stage-sketch.js?v="));
  assert.ok(swSource.includes("./stage-prompt-i18n.js?v=1"));
  assert.match(stageSource, /if \(!pitchStyle && \(state\.showNames/);
  assert.match(stageSource, /if \(!pitchStyle\) \{\s*drawArrows/);
  assert.match(stageSource, /if \(!pitchStyle && L\.plan && anyRoutesShown/);
  assert.match(stageSource, /if \(!pitchStyle && state\.showSeatMap/);
  const grainSource = stageSource.slice(
    stageSource.indexOf("function applyPitchGrain"),
    stageSource.indexOf("function applyPitchPaper"),
  );
  assert.doesNotMatch(grainSource, /Math\.random\(\)/);
  assert.match(grainSource, /mulberry32\(seed\)/);
});

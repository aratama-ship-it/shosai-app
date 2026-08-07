import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const bundleSource = await readFile(new URL("../stage-apparatus-data.js", import.meta.url), "utf8");
const draftNames = [
  "stage_apparatus_10_2026-08-04.json",
  ...Array.from({ length: 9 }, (_, index) => `stage_apparatus_10_wave${index + 2}_2026-08-04.json`),
  "stage_apparatus_supplemental_2026-08-04.json",
  ...Array.from({ length: 60 }, (_, index) => `stage_apparatus_10_wave${index + 11}_2026-08-04.json`),
  ...(await readdir(new URL("../../show-reference/data/drafts/", import.meta.url)))
    .filter((name) => {
      const match = name.match(/^stage_apparatus_10_wave(\d+)_2026-08-\d\d\.json$/);
      return match && Number(match[1]) >= 71 && Number(match[1]) <= 85;
    })
    .sort((a, b) => Number(a.match(/wave(\d+)/)[1]) - Number(b.match(/wave(\d+)/)[1])),
];
const drafts = await Promise.all(draftNames.map(async (name) => JSON.parse(await readFile(
  new URL(`../../show-reference/data/drafts/${name}`, import.meta.url),
  "utf8",
))));

const context = { window: {} };
vm.runInNewContext(bundleSource, context, { filename: "stage-apparatus-data.js" });
const library = context.window.STAGE_APPARATUS_LIBRARY;

test("舞台技術カードは追補と収録済みの検証便を同一順序で束ねる", () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(library.cards)),
    drafts.flatMap((draft) => draft.cards),
  );
  assert.equal(library.cards.length, drafts.flatMap((draft) => draft.cards).length);
  assert.equal(new Set(library.cards.map((card) => card.id)).size, library.cards.length);
  assert.deepEqual(
    JSON.parse(JSON.stringify(library.research_batches.map((batch) => batch.source))),
    draftNames,
  );
});

test("第2・第3期は非デジタル、第4期は依存度を区別し、第5期300件を束ねる", () => {
  const additions = library.cards.slice(101, 301);
  assert.equal(additions.length, 200);
  additions.forEach((card) => assert.equal(card.digital_dependency, "none", card.id));
  assert.equal(new Set(additions.map((card) => card.family)).size, 20);
  const thirdWave = library.cards.slice(201, 301);
  assert.equal(thirdWave.length, 100);
  assert.equal(new Set(thirdWave.map((card) => card.family)).size, 10);
  const fourthWave = library.cards.slice(301, 401);
  assert.equal(fourthWave.length, 100);
  assert.equal(new Set(fourthWave.map((card) => card.family)).size, 10);
  assert.deepEqual(
    [...new Set(fourthWave.map((card) => card.digital_dependency))].sort(),
    ["electrical_not_digital", "low", "none", "vendor_confidential"].sort(),
  );
  const fifthWave = library.cards.slice(401, 701);
  assert.equal(fifthWave.length, 300);
  assert.equal(new Set(fifthWave.map((card) => card.family)).size, 30);
  fifthWave.forEach((card) => assert.equal(card.digital_dependency, "none", card.id));
  const sixthWave = library.cards.slice(701);
  assert.ok(sixthWave.length >= 40);
  sixthWave.forEach((card) => {
    assert.equal(card.evidence_grade, "primary_case_or_technical_source", card.id);
    assert.ok(card.verified_claims.length, card.id);
    assert.ok(card.inferred_design_extensions.length, card.id);
    assert.ok(card.risk_class.length, card.id);
    assert.equal(card.examples[0].source_specificity, "direct", card.id);
  });
  assert.match(appSource, /デジタル依存なし/);
  assert.match(appSource, /非デジタル/);
});

test("全カードに検索・予算・安全・出典に必要な項目がある", () => {
  const required = [
    "name_ja", "family", "planning_scale", "creative_capability", "mechanism",
    "minimum_viable_version", "budget_jpy_inferred", "venue_requirements",
    "crew_roles", "failure_modes", "examples",
  ];
  for (const card of library.cards) {
    required.forEach((key) => assert.ok(card[key] && Object.keys(card[key]).length !== 0, `${card.id}: ${key}`));
    card.examples.forEach((example) => assert.match(example.source, /^https:\/\//));
  }
  assert.deepEqual(
    [...new Set(library.cards.map((card) => card.planning_scale))].sort(),
    ["億円以上", "数千万円", "数百万円"].sort(),
  );
});

test("専門職と予算区分は画面表示用の日本語ラベルを持つ", () => {
  const roleCodes = new Set(library.cards.flatMap((card) => card.crew_roles));
  const budgetCodes = new Set(library.cards.flatMap((card) => Object.keys(card.budget_jpy_inferred)));
  roleCodes.forEach((code) => assert.match(appSource, new RegExp(`\\b${code}:`), `role: ${code}`));
  budgetCodes.forEach((code) => assert.match(appSource, new RegExp(`\\b${code}:`), `budget: ${code}`));
});

test("書斎に舞台技術タブ、検索、二つの絞り込み、詳細領域がある", () => {
  assert.match(html, /href="#apparatus" data-nav="apparatus">舞台技術<\/a>/);
  ["view-apparatus", "apparatus-search", "apparatus-family", "apparatus-scale", "apparatus-list", "apparatus-detail"]
    .forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));
  assert.ok(html.indexOf("stage-apparatus-data.js") < html.indexOf("app.js"));
});

test("舞台技術の詳細URLと検索・系統・予算規模の状態を扱う", () => {
  assert.match(appSource, /h\.startsWith\("#apparatus\/"\)/);
  assert.match(appSource, /apparatusState = \{ query: "", family: "", scale: "", selected: null \}/);
  assert.match(appSource, /card\.family !== apparatusState\.family/);
  assert.match(appSource, /card\.planning_scale !== apparatusState\.scale/);
  assert.match(appSource, /JSON\.stringify\(card\)\.toLowerCase\(\)\.includes\(query\)/);
  assert.match(appSource, /initApparatus\(\)/);
});

test("舞台技術カードを出典付きの種火としてスクラップブックと制作机へ渡せる", () => {
  assert.match(appSource, /function apparatusIdeaSeed\(card, mode, context\)/);
  assert.match(appSource, /id="apparatus-idea-context"/);
  assert.match(appSource, /id="apparatus-idea-mode"/);
  assert.match(appSource, /id="apparatus-to-scrapbook"/);
  assert.match(appSource, /id="apparatus-start-project"/);
  assert.match(appSource, /apparatusSources: \[card\.id\]/);
  assert.match(appSource, /参照した舞台技術/);
  assert.match(appSource, /apparatusSources: Array\.isArray\(item\.apparatusSources\)/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const classifierSource = await readFile(new URL("../shelf-classification.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(classifierSource, context, { filename: "shelf-classification.js" });
const shelves = context.window.SHOSAI_SHELVES;

test("映像演出は確定カテゴリーまたは完全一致のmedia_typeだけを入口にする", () => {
  const works = [
    { id: "mv", category: "その他・未分類", media_type: "music_video" },
    { id: "film", category: "映画・映像", media_type: "film" },
    { id: "brand", category: "その他・未分類", media_type: "brand_film" },
    { id: "near-miss", category: "その他・未分類", media_type: "documentary_film_installation" },
  ];
  assert.deepEqual(
    JSON.parse(JSON.stringify(shelves.worksForShelf(works, "screen").map((work) => work.id))),
    ["mv", "film", "brand"],
  );
  assert.equal(shelves.isStagingWork(works[0]), false);
  assert.equal(shelves.isStagingWork(works[1]), false);
  assert.equal(shelves.isStagingWork(works[2]), false);
  assert.equal(shelves.isScreenWork(works[3]), false);
});

test("ステージングは舞台系media_typeまたはカテゴリーを含め、曖昧な展示は全体に残す", () => {
  const works = [
    { id: "stage-work", category: "その他・未分類", media_type: "stage_work" },
    { id: "live", category: "その他・未分類", media_type: "live_concert" },
    { id: "event", category: "その他・未分類", media_type: "commissioned_event" },
    { id: "traditional", category: "その他・未分類", media_type: "traditional_performance" },
    { id: "play", category: "演劇", media_type: "unknown" },
    { id: "exhibition", category: "展示・インスタレーション", media_type: "exhibition" },
  ];
  assert.deepEqual(
    JSON.parse(JSON.stringify(shelves.worksForShelf(works, "staging").map((work) => work.id))),
    ["stage-work", "live", "event", "traditional", "play"],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(shelves.worksForShelf(works, "all").map((work) => work.id))),
    works.map((work) => work.id),
  );
});

test("将来のhybridは明示的に両入口へ置け、入口判定は正本オブジェクトを変更しない", () => {
  const hybrid = { id: "hybrid", category: "映画・映像", media_type: "film", shelf_memberships: ["staging"] };
  const before = JSON.stringify(hybrid);
  assert.deepEqual(JSON.parse(JSON.stringify(shelves.shelfIdsForWork(hybrid))), ["all", "screen", "staging"]);
  shelves.worksForShelf([hybrid], "screen");
  shelves.worksForShelf([hybrid], "staging");
  assert.equal(JSON.stringify(hybrid), before);
});

test("資料棚はキーボード操作できる三つの入口を持ち、入口ごとにジャンルを組み直す", () => {
  ["all", "screen", "staging"].forEach((id) => {
    assert.match(html, new RegExp(`data-db-shelf="${id}" role="radio"`));
  });
  assert.match(html, /role="radiogroup" aria-label="資料棚の入口を選ぶ"/);
  assert.match(html, /id="db-shelf-description" class="db-shelf-description" aria-live="polite"/);
  assert.ok(html.indexOf("shelf-classification.js") < html.indexOf("app.js"));
  assert.match(appSource, /function updateDbTypeOptions\(\)/);
  assert.match(appSource, /function setDbShelf\(shelfId\)/);
  assert.match(appSource, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/);
  assert.match(appSource, /dbFilter\(\{ lens: lens\.id \}\)/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [deskHtml, stageHtml, deskJs, stageExtract, buildStage, buildStudy, deskManifest] =
  await Promise.all([
    "index.html",
    "stage.html",
    "app.js",
    "stage_extract.py",
    "build_stage.py",
    "build_study.py",
    "shosai-app.webmanifest",
  ].map((name) => readFile(new URL(name, root), "utf8")));

test("制作の書斎は舞台スケッチの画面・導線・実行コードを含まない", () => {
  for (const marker of [
    'id="view-stage"',
    'data-nav="stage"',
    'href="#stage"',
    'stage-sketch.js?v=',
    'stage-session.js?v=',
    'stage-study-owner.js?v=',
  ]) {
    assert.doesNotMatch(deskHtml, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(deskJs, /"stage"/);
  assert.match(deskJs, /const h = location\.hash \|\| "#db";/);
});

test("舞台スケッチは独立HTMLだけで起動し、書斎の実行コードを読まない", () => {
  assert.match(stageHtml, /<body class="is-standalone">/);
  assert.match(stageHtml, /id="view-stage"/);
  assert.match(stageHtml, /stage-sketch\.js\?v=\d+/);
  assert.match(stageHtml, /stage-pwa\.js\?v=\d+/);
  for (const marker of ["db.js?v=", "data.js?v=", "app.js?v=", "roster.js?v="]) {
    assert.ok(!stageHtml.includes(marker), marker);
  }
});

test("生成方向は書斎から舞台ではなく、舞台正本から隔離Viewerだけへ向く", () => {
  assert.match(stageExtract, /SRC = HERE \/ "stage\.html"/);
  assert.doesNotMatch(stageExtract, /SRC = HERE \/ "index\.html"/);
  assert.match(buildStudy, /from canonical stage\.html/);
  assert.match(buildStage, /舞台スケッチのHTMLは ``stage\.html`` を直接編集/);
  assert.doesNotMatch(buildStage, /OUT\.write_text|STAGE\.write_text/);
});

test("制作の書斎は専用アイコンを使う", () => {
  assert.match(deskHtml, /icons\/shosai-app-180\.png/);
  assert.match(deskHtml, /icons\/shosai-app-192\.png/);
  assert.doesNotMatch(deskHtml, /icons\/stage-sketch/);
  const manifest = JSON.parse(deskManifest);
  assert.ok(manifest.icons.every((icon) => icon.src.includes("shosai-app-")));
});

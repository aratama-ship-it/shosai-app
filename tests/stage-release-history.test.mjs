import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../style.css", import.meta.url), "utf8");
const releaseSummary = JSON.parse(await readFile(
  new URL("../docs/release-v0.3.6-2026-09-12/release-summary.json", import.meta.url),
  "utf8",
));

test("上部から公開済みのアップデート履歴を開ける", () => {
  assert.equal(releaseSummary.release, "v0.3.6");
  assert.match(html, /id="stage-release-open" aria-haspopup="dialog" aria-controls="stage-release-modal" aria-label="アップデート履歴" title="アップデート履歴"><svg/);
  assert.match(html, /id="stage-release-modal" role="dialog" aria-modal="true"/);
  assert.match(html, /<h3 id="stage-release-v036-title">v0\.3\.6<\/h3>/);
  assert.match(html, /<time datetime="2026-09-12">2026-09-12<\/time>/);
  assert.match(html, /<h3 id="stage-release-v035-title">v0\.3\.5<\/h3>/);
  assert.match(html, /<time datetime="2026-09-10">2026-09-10<\/time>/);
  assert.match(stageSource, /els\.releaseOpen\.addEventListener\("click", openReleaseHistory\)/);
  assert.match(stageSource, /els\.releaseClose\.addEventListener\("click", closeReleaseHistory\)/);
  assert.match(stageSource, /els\.releaseBackdrop\.addEventListener\("click", closeReleaseHistory\)/);
  assert.match(stageSource, /event\.key === "Escape" && els\.releaseModal[\s\S]*?closeReleaseHistory\(\)/);
  assert.match(stageSource, /const RELEASE_HISTORY_CURRENT = "v0\.3\.6-2026-09-12"/);
  assert.match(stageSource, /classList\.toggle\("has-unread", unread\)/);
  assert.match(stageSource, /function markReleaseHistorySeen\(\)[\s\S]*?localStorage\.setItem\(RELEASE_HISTORY_SEEN_KEY, RELEASE_HISTORY_CURRENT\)/);
  assert.match(stageSource, /function openReleaseHistory\(\) \{\s*markReleaseHistorySeen\(\)/);
  assert.match(styleSource, /\.stage-release-open\.has-unread::after \{ display: block; animation: stage-release-notice/);
});

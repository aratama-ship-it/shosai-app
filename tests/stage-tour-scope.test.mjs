import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

test("チュートリアルは舞台スケッチの表示中だけ自動起動する", () => {
  assert.match(stageSource, /document\.body\.classList\.contains\("is-standalone"\)/);
  assert.match(stageSource, /location\.hash === "#stage" && stageView && !stageView\.hidden/);
  assert.match(stageSource, /if \(!stageTourContextActive\(\)\) \{\s*if \(tourAt >= 0\) hideTour\(\);/);
  assert.match(
    stageSource,
    /window\.addEventListener\("hashchange", \(\) => setTimeout\(syncStageTourContext, 0\)\)/,
  );
  assert.match(stageSource, /document\.addEventListener\("DOMContentLoaded", syncStageTourContext\)/);
  assert.doesNotMatch(
    stageSource,
    /if \(!seenTour \|\| openArgs\.has\("tour"\)\) setTimeout\(\(\) => showTour\(0\), 700\)/,
  );
});

test("手動の使い方ボタンは残す", () => {
  assert.match(stageSource, /els\.tourStart\.addEventListener\("click", \(\) => showTour\(0\)\)/);
});

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

test("設定内の使い方ボタンは設定を閉じてから案内を始める", () => {
  assert.match(
    stageSource,
    /els\.tourStart\.addEventListener\("click", \(\) => \{\s*closePrefs\(\);\s*showTour\(0\);/,
  );
});

test("操作完了後もチュートリアルは自動で次へ進まない", () => {
  const watchTourSource = stageSource.slice(
    stageSource.indexOf("function watchTour()"),
    stageSource.indexOf("function showTour(index)"),
  );

  assert.match(watchTourSource, /els\.tourCard\.classList\.add\("is-done"\)/);
  assert.doesNotMatch(watchTourSource, /showTour\(tourAt \+ 1\)/);
  assert.match(
    stageSource,
    /els\.tourNext\.addEventListener\("click", \(\) => \{[\s\S]*?showTour\(tourAt \+ 1\);/,
  );
});

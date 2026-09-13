import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

function loadLightingReset() {
  const start = source.indexOf("function lightingDataCounts");
  const end = source.indexOf("\n\n  let lightingVenueWarningProjectId", start);
  assert.ok(start >= 0 && end > start, "劇場依存の照明データ処理が見つかる");
  const sandbox = {};
  vm.runInNewContext(`${source.slice(start, end)}\nthis.lightingDataCounts = lightingDataCounts; this.hasVenueDependentLighting = hasVenueDependentLighting; this.clearVenueDependentLighting = clearVenueDependentLighting;`, sandbox);
  return sandbox;
}

test("劇場変更前の照明検出は登録・配置・意図・光の動き・位置控え・ライトキューを数える", () => {
  const { lightingDataCounts, hasVenueDependentLighting } = loadLightingReset();
  const project = {
    sets: [{ id: "light-a", kind: "light" }, { id: "table-a", kind: "table" }],
    scenes: [{
      pieces: [{ id: "piece-light", type: "light", setId: "light-a" }, { id: "piece-table", type: "table", setId: "table-a" }],
      lightingIntent: { mood: "warm" }, lightMotion: { lights: {} }, stashed: { "light-a": { u: 0.4 } },
    }],
    cues: [{ id: "cue-light", kind: "timeline", cueType: "light" }, { id: "cue-music", kind: "timeline", cueType: "music" }],
  };
  const counts = lightingDataCounts(project);
  assert.equal(counts.registrations, 1);
  assert.equal(counts.placements, 1);
  assert.equal(counts.intents, 1);
  assert.equal(counts.motions, 1);
  assert.equal(counts.stashes, 1);
  assert.equal(counts.cues, 1);
  assert.equal(hasVenueDependentLighting(project), true);
});

test("劇場を変える新版から照明だけを消し、演者・舞台セット・小道具は残す", () => {
  const { clearVenueDependentLighting } = loadLightingReset();
  const project = {
    sets: [{ id: "light-a", kind: "light" }, { id: "table-a", kind: "table" }, { id: "prop-a", kind: "prop" }],
    scenes: [{
      pieces: [
        { id: "piece-light", type: "light", setId: "light-a" },
        { id: "piece-performer", type: "performer", castId: "cast-a" },
        { id: "piece-table", type: "table", setId: "table-a" },
        { id: "piece-prop", type: "prop", setId: "prop-a" },
      ],
      lightingIntent: { mood: "warm" }, lightMotion: { lights: {} },
      stashed: { "light-a": { u: 0.4 }, "table-a": { u: 0.5 } },
    }],
    cues: [{ id: "cue-light", kind: "timeline", cueType: "light" }, { id: "cue-music", kind: "timeline", cueType: "music" }],
  };
  clearVenueDependentLighting(project);
  assert.deepEqual(project.sets.map((item) => item.id), ["table-a", "prop-a"]);
  assert.deepEqual(project.scenes[0].pieces.map((piece) => piece.id), ["piece-performer", "piece-table", "piece-prop"]);
  assert.equal(project.scenes[0].lightingIntent, null);
  assert.equal(project.scenes[0].lightMotion, null);
  assert.deepEqual(project.scenes[0].stashed, { "table-a": { u: 0.5 } });
  assert.deepEqual(project.cues.map((cue) => cue.id), ["cue-music"]);
});

test("劇場変更は照明がある場合だけ版分岐へ進み、照明を組む前にも警告する", () => {
  assert.match(source, /function branchForVenueLightingChange\(id\)[\s\S]*?copy\.parentVersionId = p\.id;[\s\S]*?copy\.versionLabel = nextVersion;[\s\S]*?clearVenueDependentLighting\(copy\);[\s\S]*?applyLoadedState\(next,/);
  assert.match(source, /function setVenue\(id\)[\s\S]*?hasVenueDependentLighting\(state\.project\)[\s\S]*?branchForVenueLightingChange\(id\);/);
  assert.match(source, /function confirmLightingVenueDependency\(\)[\s\S]*?劇場を変えると、新しいバージョンを作成し/);
  assert.match(source, /function openLightPresetModal[\s\S]*?confirmLightingVenueDependency\(\)/);
  assert.match(source, /const addLight = \(\) => \{[\s\S]*?confirmLightingVenueDependency\(\)/);
});

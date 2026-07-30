import assert from "node:assert/strict";
import test from "node:test";
import exporter from "../stage-rehearsal-export.js";

const { RehearsalExportError, convertStageSketchProject } = exporter;

function projectFixture(overrides = {}) {
  const project = {
    id: "show-1",
    title: "稽古テスト",
    versionLabel: "v1",
    venue: "proscenium",
    venueSize: "mid",
    venueDims: null,
    rehearsal: { version: 1, primaryMode: "ordered", soundtrack: null },
    cast: [
      { id: "cast-a", name: "A", color: "#a84b26", heightCm: 165 },
      { id: "cast-b", name: "B", color: "#77865f", heightCm: 170 },
    ],
    sets: [],
    rigs: [],
    scenes: [
      {
        id: "scene-1",
        kind: "scene",
        title: "シーン 1",
        rehearsal: { holdDurationSeconds: 2, transitionToNextSeconds: 3.2 },
        pieces: [
          { id: "piece-a1", type: "performer", castId: "cast-a", u: 0, v: 0.5, facing: 0 },
        ],
      },
    ],
  };
  return { ...project, ...overrides };
}

test("上手・下手・奥・前の4点をVision Pro座標へ変換する", () => {
  const project = projectFixture();
  project.scenes[0].pieces = [
    { type: "performer", castId: "cast-a", u: 0, v: 0.5, facing: 0 },
    { type: "performer", castId: "cast-b", u: 1, v: 0.5, facing: 0 },
  ];
  project.scenes.push({
    id: "scene-2",
    kind: "scene",
    title: "前後",
    rehearsal: { holdDurationSeconds: 1, transitionToNextSeconds: 1 },
    pieces: [
      { type: "performer", castId: "cast-a", u: 0.5, v: 0, facing: 0 },
      { type: "performer", castId: "cast-b", u: 0.5, v: 1, facing: 0 },
    ],
  });
  const { formations } = convertStageSketchProject(project).document;
  assert.deepEqual(formations[0].placements.map((p) => p.positionMeters), [
    { x: 6, y: 0, z: 0 },
    { x: -6, y: 0, z: 0 },
  ]);
  assert.deepEqual(formations[1].placements.map((p) => p.positionMeters), [
    { x: 0, y: 0, z: 4.5 },
    { x: 0, y: 0, z: -4.5 },
  ]);
});

test("facingを同じyawDegreesとして渡す", () => {
  const project = projectFixture();
  project.scenes[0].pieces[0].facing = 270;
  const placement = convertStageSketchProject(project).document.formations[0].placements[0];
  assert.equal(placement.yawDegrees, 270);
});

test("sectionを飛ばしsceneだけを元の順でキューにする", () => {
  const project = projectFixture();
  project.scenes.unshift({ id: "section-1", kind: "section", title: "第一部", pieces: [] });
  project.scenes.push({
    id: "scene-2",
    kind: "scene",
    title: "シーン 2",
    rehearsal: { holdDurationSeconds: 1, transitionToNextSeconds: 1 },
    pieces: [{ type: "performer", castId: "cast-b", u: 0.5, v: 0.5, facing: 90 }],
  });
  const { cues } = convertStageSketchProject(project).document;
  assert.deepEqual(cues.map((cue) => cue.name), ["シーン 1", "シーン 2"]);
  assert.deepEqual(cues.map((cue) => cue.orderKey), ["000100", "000200"]);
});

test("cast・formation・cueのIDは入力IDから決定的に作る", () => {
  const project = projectFixture();
  const first = convertStageSketchProject(project).document;
  const second = convertStageSketchProject(project).document;
  assert.deepEqual(first, second);
  assert.equal(first.performers[0].id, "cast-a");
  assert.equal(first.formations[0].id, "formation-scene-1");
  assert.equal(first.cues[0].id, "cue-scene-1");
  assert.equal(first.cues[0].formationID, "formation-scene-1");
});

test("各シーンにはその場にいる人物だけを含める", () => {
  const project = projectFixture();
  project.scenes.push({
    id: "scene-2",
    kind: "scene",
    title: "Bだけ",
    rehearsal: { holdDurationSeconds: 1, transitionToNextSeconds: 1 },
    pieces: [{ type: "performer", castId: "cast-b", u: 0.5, v: 0.5, facing: 0 }],
  });
  const { formations } = convertStageSketchProject(project).document;
  assert.deepEqual(formations[0].placements.map((p) => p.performerID), ["cast-a"]);
  assert.deepEqual(formations[1].placements.map((p) => p.performerID), ["cast-b"]);
});

test("同じシーンで同じcastを2回配置すると拒否する", () => {
  const project = projectFixture();
  project.scenes[0].pieces.push({
    type: "performer", castId: "cast-a", u: 0.7, v: 0.7, facing: 0,
  });
  assert.throws(
    () => convertStageSketchProject(project),
    (error) => error instanceof RehearsalExportError
      && error.issues.some((item) => item.code === "duplicate_cast_placement"),
  );
});

test("不正数値と0以下の舞台寸法を拒否する", () => {
  const project = projectFixture({ venueDims: { width: 0, depth: -2 } });
  project.scenes[0].pieces[0].u = Number.NaN;
  assert.throws(
    () => convertStageSketchProject(project),
    (error) => error.issues.some((item) => item.code === "invalid_stage_dimensions")
      && error.issues.some((item) => item.code === "invalid_placement"),
  );
});

test("proscenium以外は既定で拒否し、明示許可時だけ警告付きで変換する", () => {
  const project = projectFixture({ venue: "thrust", venueSize: "mid" });
  assert.throws(
    () => convertStageSketchProject(project),
    (error) => error.issues.some((item) => item.code === "unsupported_venue"),
  );
  const result = convertStageSketchProject(project, { allowUnsupportedVenue: true });
  assert.ok(result.warnings.some((item) => item.code === "unsupported_venue"));
  assert.equal(result.document.stage.depthMeters, 11);
  assert.equal(result.document.environment.presetName, "preShowFullHouse");
});

test("滞在時間は同じcue、移動時間は到着先cueへ1シーンずらす", () => {
  const project = projectFixture();
  project.scenes.push({
    id: "scene-2",
    kind: "scene",
    title: "シーン 2",
    rehearsal: { holdDurationSeconds: 4.5, transitionToNextSeconds: 6 },
    pieces: [{ type: "performer", castId: "cast-a", u: 0.5, v: 0.5, facing: 0 }],
  });
  const { cues } = convertStageSketchProject(project).document;
  assert.equal(cues[0].holdDurationSeconds, 2);
  assert.equal(cues[0].transitionDurationSeconds, 0);
  assert.equal(cues[1].holdDurationSeconds, 4.5);
  assert.equal(cues[1].transitionDurationSeconds, 3.2);
});

test("変換前後で入力projectを変更しない", () => {
  const project = projectFixture();
  const before = structuredClone(project);
  convertStageSketchProject(project);
  assert.deepEqual(project, before);
});

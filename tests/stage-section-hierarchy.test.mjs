import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

function loadMigration() {
  const start = source.indexOf("function wrapUnsectionedSceneRuns");
  const end = source.indexOf("\n  function addMissingSceneInsideSection", start);
  assert.ok(start >= 0 && end > start, "ルートシーン移行の関数が見つかる");
  const sandbox = {};
  vm.runInNewContext(`${source.slice(start, end)}\nthis.migrate = wrapUnsectionedSceneRuns;`, sandbox);
  return sandbox.migrate;
}

function sectionFactory() {
  let count = 0;
  return () => ({ id: `migrated-section-${++count}`, kind: "section", depth: 0, title: `セクション ${count}` });
}

function loadShelfMigration(shelf) {
  const predicatesStart = source.indexOf("function hasUnsectionedSceneRows");
  const predicatesEnd = source.indexOf("\n\n  /* ---------- ショーの棚 ----------", predicatesStart);
  const migrationStart = source.indexOf("function migrateStoredShowShelf");
  const migrationEnd = source.indexOf("\n\n  // いまのショーを棚へ書き戻す", migrationStart);
  assert.ok(predicatesStart >= 0 && predicatesEnd > predicatesStart, "棚移行の判定が見つかる");
  assert.ok(migrationStart >= 0 && migrationEnd > migrationStart, "棚移行の関数が見つかる");
  const store = new Map([["shows", JSON.stringify(shelf)]]);
  let writes = 0;
  const sandbox = {
    SHOWS_KEY: "shows",
    finite: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback,
    localStorage: {
      getItem: (key) => store.has(key) ? store.get(key) : null,
      setItem: (key, value) => store.set(key, value),
    },
    readShows: () => JSON.parse(store.get("shows")),
    normalizeState: (state) => ({
      ...state,
      project: {
        ...state.project,
        scenes: [{ id: "section-updated", kind: "section", depth: 0 }, ...state.project.scenes.map((row) => ({
          ...row,
          depth: row.kind === "scene" ? Number(row.depth || 0) + 1 : row.depth,
        }))],
      },
    }),
    writeShows: (next) => {
      writes += 1;
      store.set("shows", JSON.stringify(next));
      return true;
    },
  };
  vm.runInNewContext(`${source.slice(predicatesStart, predicatesEnd)}\n${source.slice(migrationStart, migrationEnd)}\nthis.migrateShelf = migrateStoredShowShelf;`, sandbox);
  return { migrate: sandbox.migrateShelf, store, get writes() { return writes; } };
}

test("セクションなしの既存シーンは一つの既定セクションへまとめ、IDと順序を保つ", () => {
  const migrate = loadMigration();
  const rows = [
    { id: "scene-a", kind: "scene", depth: 0, note: "最初", pieces: [{ id: "piece-a" }] },
    { id: "scene-b", kind: "scene", depth: 0, note: "次", audioTrackId: "track-b" },
  ];
  assert.equal(migrate(rows, sectionFactory()), true);
  assert.deepEqual(rows.map((row) => row.id), ["migrated-section-1", "scene-a", "scene-b"]);
  assert.deepEqual(rows.map((row) => row.depth), [0, 1, 1]);
  assert.equal(rows[1].pieces[0].id, "piece-a");
  assert.equal(rows[2].audioTrackId, "track-b");
  assert.equal(rows.filter((row) => row.kind === "scene" && row.depth === 0).length, 0);
});

test("既存セクションの中身を保ち、外に残った連続シーンだけを別セクションへ包む", () => {
  const migrate = loadMigration();
  const rows = [
    { id: "section-a", kind: "section", depth: 0 },
    { id: "scene-a", kind: "scene", depth: 1 },
    { id: "scene-b", kind: "scene", depth: 0 },
    { id: "scene-b-note", kind: "scene", depth: 1 },
    { id: "section-c", kind: "section", depth: 0 },
    { id: "scene-c", kind: "scene", depth: 1 },
  ];
  assert.equal(migrate(rows, sectionFactory()), true);
  assert.deepEqual(rows.map((row) => row.id), [
    "section-a", "scene-a", "migrated-section-1", "scene-b", "scene-b-note", "section-c", "scene-c",
  ]);
  assert.deepEqual(rows.map((row) => row.depth), [0, 1, 0, 1, 2, 0, 1]);
  assert.equal(rows.filter((row) => row.kind === "scene" && row.depth === 0).length, 0);
});

test("すでに全シーンがセクション配下なら移行は何も変えない", () => {
  const migrate = loadMigration();
  const rows = [
    { id: "section-a", kind: "section", depth: 0 },
    { id: "scene-a", kind: "scene", depth: 1 },
  ];
  assert.equal(migrate(rows, sectionFactory()), false);
  assert.deepEqual(rows.map((row) => row.id), ["section-a", "scene-a"]);
  assert.deepEqual(rows.map((row) => row.depth), [0, 1]);
});

test("現在シーンの通し表記は親セクションを含む階層番号である", () => {
  const start = source.indexOf("function sceneNumberMap");
  const end = source.indexOf("\n  // 「後からまとめる」", start);
  assert.ok(start >= 0 && end > start, "階層番号の関数が見つかる");
  const sandbox = {};
  vm.runInNewContext(`${source.slice(start, end)}\nthis.numberMap = sceneNumberMap;`, sandbox);
  const rows = [
    { id: "section-1", kind: "section", depth: 0 },
    { id: "scene-1", kind: "scene", depth: 1 },
    { id: "scene-2", kind: "scene", depth: 1 },
    { id: "section-2", kind: "section", depth: 0 },
    { id: "scene-3", kind: "scene", depth: 1 },
  ];
  const numbers = sandbox.numberMap(rows);
  assert.equal(numbers.get("scene-1"), "1-1");
  assert.equal(numbers.get("scene-2"), "1-2");
  assert.equal(numbers.get("scene-3"), "2-1");
  const labelsStart = source.indexOf("function sceneNavigationTitle");
  const labelsEnd = source.indexOf("\n  function enforcePhoneViews", labelsStart);
  assert.ok(labelsStart >= 0 && labelsEnd > labelsStart, "現在シーン表示の関数が見つかる");
  const labeler = {
    state: { project: { scenes: rows } },
    sceneNumberMap: sandbox.numberMap,
  };
  vm.runInNewContext(`${source.slice(labelsStart, labelsEnd)}\nthis.label = sceneCurrentLabel;`, labeler);
  assert.equal(labeler.label({ id: "scene-1", title: "1 背面の展示" }, 0), "1-1 背面の展示");
  assert.equal(labeler.label({ id: "scene-3", title: "2-1 正面の展示" }, 2), "2-1 正面の展示");
  assert.match(source, /function sceneCurrentLabel\(scene, index\)[\s\S]*?sceneNumberMap\(state\.project\.scenes\)[\s\S]*?sceneNavigationTitle\(scene\)/);
  assert.match(source, /els\.sceneNow\.textContent = scene \? sceneCurrentLabel\(scene, index\) : ""/);
  assert.match(source, /phoneUi\.sceneCurrent\.textContent = sceneCurrentLabel\(scene, index\)/);
  assert.match(source, /tabletUi\.sceneCurrent\.textContent = sceneCurrentLabel\(scene, index\)/);
});

test("ショー一覧の旧形式も、棚全体の控えを取ってから一括移行する", () => {
  const shelf = {
    old: { savedAt: "2026-09-14", state: { project: { id: "old", scenes: [{ id: "scene-a", kind: "scene", depth: 0 }] } } },
    nested: { savedAt: "2026-09-14", state: { project: { id: "nested", scenes: [{ id: "section-a", kind: "section", depth: 0 }, { id: "scene-b", kind: "scene", depth: 1 }] } } },
  };
  const loaded = loadShelfMigration(shelf);
  const result = loaded.migrate();
  assert.equal(result.migrated, 1);
  assert.equal(result.safe, true);
  assert.equal(loaded.writes, 1);
  assert.equal(loaded.store.get("shows-pre-section-hierarchy-v1"), JSON.stringify(shelf));
  const updated = JSON.parse(loaded.store.get("shows"));
  assert.deepEqual(updated.old.state.project.scenes.map((row) => row.id), ["section-updated", "scene-a"]);
  assert.deepEqual(updated.nested.state.project.scenes.map((row) => row.id), ["section-a", "scene-b"]);
});

test("新規作成・読込・ドラッグ・階層変更がセクション必須の入口を通る", () => {
  assert.match(source, /function initialSceneRows\(withExample\)[\s\S]*?newScene\(sectionTitle\(1\), false, "section", 0\)[\s\S]*?newScene\(sceneTitle\(1\), withExample, "scene", 1\)/);
  assert.match(source, /wrapUnsectionedSceneRuns\(scenes,[\s\S]*?newScene\(sectionTitle\(\+\+generatedSectionCount\), false, "section", 0\)/);
  assert.match(source, /scene\.kind === "scene" \? scene\.depth > 1 : scene\.depth > 0/);
  assert.match(source, /const minDepth = sceneDrag\.kind === "scene" \? 1 : 0;/);
  assert.match(source, /sectionMigrationSource: needsSectionMigration \? saved : null/);
  assert.match(source, /pre-section-hierarchy-v1:\$\{state\.project\.id\}/);
  assert.match(source, /function migrateStoredShowShelf\(\)[\s\S]*?SHOWS_KEY\}-pre-section-hierarchy-v1/);
  assert.match(source, /const shelfMigration = migrateStoredShowShelf\(\);/);
});

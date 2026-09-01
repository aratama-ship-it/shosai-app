import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");

function loadProjectIO() {
  const window = {
    SHOSAI_VENUES: {
      library: {
        isPreset: () => true,
        venueV2ById: () => null,
      },
    },
  };
  window.window = window;
  vm.runInNewContext(stageSource, {
    window,
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
    },
    console,
  }, { filename: "stage-sketch.js" });
  return window.SHOSAI_STAGE_PROJECT_IO;
}

test("normalizeStateがmcpRevisionを正の整数だけ保持する", () => {
  const io = loadProjectIO();
  assert.equal(io.normalizeMcpRevision(1), 1);
  assert.equal(io.normalizeMcpRevision(42), 42);
  for (const value of ["2", 0, -1, 1.5, null, undefined]) {
    assert.equal(io.normalizeMcpRevision(value), null, String(value));
  }
  assert.match(stageSource, /mcpRevision: normalizeMcpRevision\(raw\.mcpRevision\)/);
});

test("makeProjectExportDocumentはstate直下のmcpRevisionを書き出さない", () => {
  const io = loadProjectIO();
  const state = {
    mcpRevision: 8,
    project: { id: "show-1", title: "Show", scenes: [] },
  };
  const exported = io.exportDocument(state.project, false);
  assert.equal(exported.version, 4);
  assert.equal(Object.hasOwn(exported, "mcpRevision"), false);
  assert.equal(Object.hasOwn(exported.project, "mcpRevision"), false);
});

test("projectIoClone(state.project)はmcpRevisionを正本projectへ混ぜない", () => {
  const io = loadProjectIO();
  const state = {
    mcpRevision: 9,
    project: { id: "show-2", title: "Show", scenes: [] },
  };
  const cloned = io.cloneProject(state.project);
  assert.equal(JSON.stringify(cloned), JSON.stringify(state.project));
  assert.equal(Object.hasOwn(cloned, "mcpRevision"), false);
});

test("AI編集結果だけappliedRevisionを保持し、通常読込と別ショー化ではnullにする", () => {
  assert.match(stageSource, /const appliedRevision = Number\.isInteger\(editSummary\?\.appliedRevision\)[\s\S]*?mcpRevision: appliedRevision,/);
  assert.match(stageSource, /if \(next\.mcpRevision === null\) reserveImportedShowId\(next\);/);
  assert.match(stageSource, /candidate\.project\.id = rid\("show"\);\s*candidate\.mcpRevision = null;/);
});

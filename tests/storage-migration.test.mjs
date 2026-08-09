import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import migration from "../storage-migration.js";

const migrationSource = await readFile(new URL("../storage-migration.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");

class MemoryStorage {
  constructor(entries = {}) {
    this.entries = new Map(Object.entries(entries));
  }

  get length() { return this.entries.size; }

  key(index) { return [...this.entries.keys()][index] ?? null; }

  getItem(key) { return this.entries.has(key) ? this.entries.get(key) : null; }

  setItem(key, value) { this.entries.set(String(key), String(value)); }

  removeItem(key) { this.entries.delete(key); }
}

test("書き出したshosai / stageの端末データを読み込むと内容が一致する", () => {
  const source = new MemoryStorage({
    "shosai-stage-shows-v1": '{"show-a":{"title":"夜の庭"}}',
    "shosai-scrapbook-pages-v1": '{"pages":[{"id":"page-1"}]}',
    "stage-venue-drafts-v1": '[{"id":"venue-1"}]',
    scout_pass: "移行してはいけない合言葉",
    "other-app-setting": "対象外",
  });
  const document = migration.createDocument(source, "2026-08-09T03:30:00.000Z");

  assert.equal(document.kind, "shosai-local-storage-backup");
  assert.equal(document.version, 1);
  assert.deepEqual(Object.keys(document.entries), [
    "shosai-scrapbook-pages-v1",
    "shosai-stage-shows-v1",
    "stage-venue-drafts-v1",
  ]);
  assert.equal(document.entries.scout_pass, undefined);

  const destination = new MemoryStorage({
    "shosai-stage-shows-v1": '{"show-old":{}}',
    "other-app-setting": "残す",
  });
  const parsed = migration.parseDocument(JSON.stringify(document));
  const plan = migration.planRestore(parsed, destination);
  assert.deepEqual(
    { restoreCount: plan.restoreCount, overwriteCount: plan.overwriteCount, addCount: plan.addCount },
    { restoreCount: 3, overwriteCount: 1, addCount: 2 },
  );

  migration.restoreDocument(parsed, destination);
  Object.entries(document.entries).forEach(([key, value]) => {
    assert.equal(destination.getItem(key), value, `${key} の内容が一致する`);
  });
  assert.equal(destination.getItem("other-app-setting"), "残す", "対象外データは消さない");
});

test("壊れたJSONと形式の違うJSONを読み込み前に拒否する", () => {
  assert.throws(
    () => migration.parseDocument('{"kind":"shosai-local-storage-backup",'),
    /JSONとして読み取れません/,
  );
  assert.throws(
    () => migration.parseDocument(JSON.stringify({
      kind: "shosai-local-storage-backup",
      version: 99,
      entries: {},
    })),
    /versionが違います/,
  );
  assert.throws(
    () => migration.parseDocument(JSON.stringify({
      kind: "shosai-local-storage-backup",
      version: 1,
      entries: { scout_pass: "含めない" },
    })),
    /移行対象外の保存キー/,
  );
});

test("移行UIはブラウザとMacで同じコードを読み込み、Mac専用ブリッジへ分岐しない", () => {
  assert.match(appSource, /migrationScript\.src = "storage-migration\.js\?v=1"/);
  assert.match(migrationSource, /btn-storage-migration-export/);
  assert.match(migrationSource, /btn-storage-migration-import/);
  assert.doesNotMatch(migrationSource, /stageSketchBridge/);
});

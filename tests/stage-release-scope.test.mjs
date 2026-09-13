import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
const wrangler = await readFile(new URL("../wrangler.toml", import.meta.url), "utf8");

test("2026-09-12便は未選択の入口を閉じ、保存済みデータ互換を残す", () => {
  assert.match(source, /lightMotion: RELEASE_SCOPE_ID !== "beta-20260912"/);
  assert.match(source, /formationSync: RELEASE_SCOPE_ID !== "beta-20260912"/);
  assert.match(source, /propMask: RELEASE_SCOPE_ID !== "beta-20260912"/);
  assert.match(source, /els\.lightMotionOpen\.hidden = !RELEASE_FEATURES\.lightMotion/);
  assert.match(source, /RELEASE_FEATURES\.formationSync && isCursor/);
  assert.match(source, /RELEASE_FEATURES\.propMask \|\| key !== "mask" \|\| selected === "mask"/);
  assert.match(css, /html\[data-release-scope="beta-20260912"\] \.stage-light-motion-open/);
});

test("β設定は選択スコープを有効にし、利用状況計測を止める", () => {
  assert.match(wrangler, /STAGE_RELEASE_SCOPE = "beta-20260912"/);
  assert.match(wrangler, /STAGE_USAGE_ENABLED = "false"/);
});

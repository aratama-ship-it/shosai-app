import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../style.css", import.meta.url), "utf8");

test("平面図の拡大・縮小ボタンは44pxの正方形を保つ", () => {
  assert.match(css, /\.stage-zoom-fab button \{[\s\S]*?width: 44px;[\s\S]*?min-width: 44px;[\s\S]*?height: 44px;[\s\S]*?min-height: 44px;[\s\S]*?aspect-ratio: 1;[\s\S]*?padding: 0;/);
});

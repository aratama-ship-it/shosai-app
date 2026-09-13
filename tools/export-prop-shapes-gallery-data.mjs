// PROP_SHAPES / PROP_SHAPE_GROUPS を stage-sketch.js から抽出し、ギャラリーHTML埋め込み用のJSONを作る。
// テスト(tests/stage-prop-shapes.test.mjs)と同じ抽出手法（vmで該当ブロックだけ評価）。
// 使い方: node tools/export-prop-shapes-gallery-data.mjs > /tmp/prop-shapes-gallery-data.json
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync(new URL("../stage-sketch.js", import.meta.url), "utf8");

function slice(startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error(`not found: ${startMarker}`);
  const end = src.indexOf(endMarker, start);
  if (end < 0) throw new Error(`end not found after ${startMarker}: ${endMarker}`);
  return src.slice(start, end);
}

// PROP_SHAPES本体はboxAt/ringLoop（PROP_SHAPESの直前に置かれたヘルパー）を内部で使うため、
// その宣言も一緒に取り出して評価する（tools/scan-prop-render.mjs と同じ理由）。
const shapesBlock = slice("const boxAt =", "const PROP_SHAPE_ORDER");
const groupsBlock = slice("const PROP_SHAPE_GROUPS = [", "\n  ];") + "\n  ];";

const ctx = {};
vm.runInNewContext(
  `${shapesBlock}\n${groupsBlock}\nthis.shapes = PROP_SHAPES;\nthis.groups = PROP_SHAPE_GROUPS;`,
  ctx
);

const order = Object.keys(ctx.shapes);
const grouped = new Set(ctx.groups.flatMap((g) => g.ids));
const rest = order.filter((id) => !grouped.has(id));
const groups = ctx.groups.concat(rest.length ? [{ ja: "その他の形", ids: rest }] : []);

const out = {
  generatedAt: new Date().toISOString(),
  source: "stage-sketch.js (PROP_SHAPES / PROP_SHAPE_GROUPS)",
  order,
  shapes: ctx.shapes,
  groups,
};
process.stdout.write(JSON.stringify(out));

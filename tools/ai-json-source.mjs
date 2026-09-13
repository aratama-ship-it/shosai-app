/* Trusted repository source only. Never execute a supplied show or MD here. */
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { getAiJsonRules } from "./ai-json-check-core.mjs";

export function readAppEnums(root) {
  return extractAppEnums(readFileSync(path.join(root, "stage-sketch.js"), "utf8"), readFileSync(path.join(root, "stage-venues.js"), "utf8"));
}

export function extractAppEnums(stage, venuesSource) {
  function block(start, end) {
    const a = stage.indexOf(start), b = stage.indexOf(end, a);
    if (a < 0 || b < 0 || stage.indexOf(start, a + start.length) !== -1) throw new Error("アプリ定義の抽出位置が不明です: " + start);
    return stage.slice(a, b + end.length);
  }
  const run = code => vm.runInNewContext(code, {}, { timeout: 1000 });
  const POSES = Array.from(run(block("const BASE_JOINTS = {", "\n  })();") + "\nPOSES.map(p => p.id)"));
  const keys = name => Array.from(run(block("const " + name + " = {", "\n  };") + "\nObject.keys(" + name + ")"));
  const PIECE_TYPES = keys("PIECE_TYPES"), SET_KINDS = keys("SET_KINDS"), LIGHT_KINDS = keys("LIGHT_KINDS");
  // Evaluate the trusted preset module in an isolated, storage-free realm.
  // This handles single quotes, numeric IDs, and generated sizes without regex loss.
  const context = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } };
  vm.runInNewContext(venuesSource, context, { timeout: 1000 });
  const presets = context.window.SHOSAI_VENUES?.v2?.list;
  if (!Array.isArray(presets)) throw new Error("会場定義を抽出できません");
  const VENUE_SIZES = {};
  const rules = getAiJsonRules();
  for (const [id, required] of Object.entries(rules.venueSizes)) {
    const matching = presets.filter(v => v.id === id);
    if (matching.length !== 1 || !Array.isArray(matching[0].sizes)) throw new Error("会場定義が不明です: " + id);
    const sizes = Array.from(matching[0].sizes, s => s.id);
    if (!required.every(s => sizes.includes(s)) || new Set(sizes).size !== sizes.length) throw new Error("会場規模が生成仕様と一致しません: " + id);
    VENUE_SIZES[id] = sizes;
  }
  for (const list of [POSES, PIECE_TYPES, SET_KINDS, LIGHT_KINDS]) {
    if (!list.length || list.some(x => typeof x !== "string") || new Set(list).size !== list.length) throw new Error("enumの抽出結果が不正です");
  }
  if (!rules.types.every(t => PIECE_TYPES.includes(t)) || !rules.types.filter(t => t !== "performer").every(t => SET_KINDS.includes(t))) throw new Error("アプリから生成対象の種類が無くなっています");
  return { POSES, PIECE_TYPES, SET_KINDS, LIGHT_KINDS, VENUE_SIZES };
}

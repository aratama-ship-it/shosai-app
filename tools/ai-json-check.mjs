#!/usr/bin/env node
/** Same text/parser/validator boundary as the browser, including resource limits. */
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkJsonText, getAiJsonRules } from "./ai-json-check-core.mjs";
import { readAppEnums } from "./ai-json-source.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2), json = args.includes("--json"), files = args.filter(x => x !== "--json");
if (!files.length) { console.error("使い方: node tools/ai-json-check.mjs [--json] file.json..."); process.exit(2); }
let enums;
try { enums = readAppEnums(root); }
catch (error) { console.error("点検不能: " + error.message); process.exit(2); }
const results = files.map(file => {
  let checked;
  try {
    if (statSync(file).size > getAiJsonRules().maxBytes) checked = { status: "uncheckable", complete: false, errors: [{ path: "$", message: "入力が上限2097152 bytesを超えています。" }] };
    else checked = checkJsonText(readFileSync(file, "utf8"), enums);
  } catch (_) { checked = { status: "uncheckable", complete: false, errors: [{ path: "$", message: "ファイルを読み取れませんでした。" }] }; }
  // Preserve the established errors:string[] wire shape; status is additive.
  return { file, status: checked.status, complete: checked.complete, errors: checked.errors.map(e => e.path + ": " + e.message) };
});
if (json) console.log(JSON.stringify({ enums, results }, null, 2));
else results.forEach(r => { console.log(r.file + ": " + (r.status === "ok" ? "OK" : r.status === "uncheckable" ? "点検不能" : "NG " + r.errors.length + "件")); r.errors.forEach(e => console.log("  - " + e)); });
process.exitCode = results.some(r => r.status !== "ok") ? 1 : 0;

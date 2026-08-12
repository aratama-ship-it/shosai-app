import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const japanesePattern = /[\u3040-\u30ff\u3400-\u9fff]/;
const htmlSource = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");
const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

const i18nContext = { window: {} };
vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
const TEXT = i18nContext.window.SHOSAI_I18N.text;
const SAY = Array.from(i18nContext.window.SHOSAI_I18N.say);

function normalizeText(value) {
  return value.trim().replace(/\s+/g, " ");
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripIgnoredHtml(source) {
  return source
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function extractAnnounceArguments(source) {
  const args = [];
  let index = 0;
  while ((index = source.indexOf("announce(", index)) !== -1) {
    let cursor = index + "announce(".length;
    let depth = 1;
    let quote = "";
    let escaped = false;
    let templateDepth = 0;
    const start = cursor;
    for (; cursor < source.length; cursor += 1) {
      const char = source[cursor];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (quote === "`" && char === "$" && source[cursor + 1] === "{") {
          templateDepth += 1;
          cursor += 1;
        } else if (quote === "`" && templateDepth && char === "}") {
          templateDepth -= 1;
        } else if (char === quote && (!templateDepth || quote !== "`")) {
          quote = "";
        }
        continue;
      }
      if (char === "\"" || char === "'" || char === "`") {
        quote = char;
      } else if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
        if (!depth) break;
      }
    }
    args.push(source.slice(start, cursor).trim());
    index = cursor + 1;
  }
  return args;
}

function readQuotedLiteral(source, start) {
  const quote = source[start];
  let cursor = start + 1;
  let escaped = false;
  for (; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === quote) {
      return { raw: source.slice(start, cursor + 1), end: cursor + 1 };
    }
  }
  return null;
}

function parseLiteral(raw) {
  return vm.runInNewContext(raw);
}

function templateChoices(expr) {
  const quoted = [...expr.matchAll(/"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'/g)]
    .map((match) => parseLiteral(match[0]));
  if (expr.includes("?") && expr.includes(":") && quoted.length >= 2) {
    return quoted.slice(0, 2);
  }
  if (expr.trim() === "word") {
    return ["動線", "演者の動線", "照明の動線", "装置の動線"];
  }
  return ["名前X", "3"];
}

function expandTemplate(raw) {
  const body = raw.slice(1, -1);
  let parts = [""];
  let cursor = 0;
  while (cursor < body.length) {
    const exprStart = body.indexOf("${", cursor);
    if (exprStart === -1) {
      parts = parts.map((part) => part + body.slice(cursor));
      break;
    }
    parts = parts.map((part) => part + body.slice(cursor, exprStart));
    let depth = 1;
    let inner = exprStart + 2;
    let quote = "";
    let escaped = false;
    for (; inner < body.length; inner += 1) {
      const char = body[inner];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          quote = "";
        }
      } else if (char === "\"" || char === "'") {
        quote = char;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (!depth) break;
      }
    }
    const choices = templateChoices(body.slice(exprStart + 2, inner));
    parts = parts.flatMap((part) => choices.map((choice) => part + choice));
    cursor = inner + 1;
  }
  return parts;
}

function announceSamples(arg) {
  if (arg.includes("isEn()")) return [];
  if (/^["']/.test(arg)) return [parseLiteral(arg)];
  if (arg.startsWith("`")) return expandTemplate(arg);

  const samples = [];
  for (let i = 0; i < arg.length; i += 1) {
    if (!["\"", "'", "`"].includes(arg[i])) continue;
    const literal = readQuotedLiteral(arg, i);
    if (!literal) continue;
    if (arg[i] === "`") {
      samples.push(...expandTemplate(literal.raw));
    } else {
      const value = parseLiteral(literal.raw);
      if (japanesePattern.test(value)) samples.push(value);
    }
    i = literal.end - 1;
  }
  return samples.filter((sample) => japanesePattern.test(sample));
}

function sayMatches(sample) {
  return SAY.some(([pattern]) => pattern.test(sample));
}

function sampleForPattern(pattern) {
  return pattern.source
    .replace(/^\^/, "")
    .replace(/\$$/, "")
    .replace(/\\d\+/g, "3")
    .replace(/\[\\d\.\]\+/g, "3")
    .replace(/\(\.\+\)/g, "名前X")
    .replace(/\(\\d\+\)/g, "3")
    .replace(/\(\[\\d\.\]\+\)/g, "3")
    .replace(/\\([()[\]{}.*+?^$|])/g, "$1");
}

test("stage.htmlの日本語テキストノードはTEXTに登録されている", () => {
  const allowlist = new Set([
    "2.0秒",
    "考えています 0秒",
    "天井まで だいたい+3.0m",
    "間口 だいたい12m ・ 奥行 だいたい8m",
  ]);
  const nodes = stripIgnoredHtml(htmlSource)
    .split(/<[^>]*>/)
    .map((value) => normalizeText(decodeHtml(value)))
    .filter((value) => value && japanesePattern.test(value) && !allowlist.has(value));

  assert.deepEqual(nodes.filter((value) => !TEXT[value]), []);
});

test("stage.htmlの日本語属性値はTEXTに登録されている", () => {
  const allowlist = new Set(["日本語 / English"]);
  const values = [...htmlSource.matchAll(/\b(?:placeholder|title|aria-label)=("([^"]*)"|'([^']*)')/g)]
    .map((match) => normalizeText(decodeHtml(match[2] ?? match[3])))
    .filter((value) => value && japanesePattern.test(value) && !allowlist.has(value));

  assert.deepEqual(values.filter((value) => !TEXT[value]), []);
});

test("stage-sketch.jsのannounce文字列はSAYに登録されている", () => {
  const missing = extractAnnounceArguments(stageSource)
    .map((arg) => ({ arg, samples: announceSamples(arg) }))
    .filter(({ samples }) => samples.length && !samples.some(sayMatches))
    .map(({ arg, samples }) => `${arg}: ${samples.join(" / ")}`);

  assert.deepEqual(missing, []);
});

test("SAYに重複パターンと先行パターンによる遮蔽がない", () => {
  const sources = SAY.map(([pattern]) => pattern.source);
  const duplicates = sources.filter((source, index) => sources.indexOf(source) !== index);
  assert.deepEqual(duplicates, []);

  const shadowed = [];
  SAY.forEach(([pattern], index) => {
    const sample = sampleForPattern(pattern);
    const blocker = SAY.findIndex(([earlier], earlierIndex) => earlierIndex < index && earlier.test(sample));
    if (blocker !== -1) {
      shadowed.push(`${pattern} is shadowed by ${SAY[blocker][0]} for ${sample}`);
    }
  });
  assert.deepEqual(shadowed, []);
});

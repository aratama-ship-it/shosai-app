#!/usr/bin/env node
/* 正面図の席の「尺」を棚卸しして、透視の式と突き合わせる道具。
 *
 * なぜ要るか（2026-09-11）:
 *   正面図の尺は layout() の中で「間口が収まる値」と「舞台の高さが収まる値」の小さい方として
 *   決まる。この決め方だと、客席がどれだけ遠くても舞台は画面の7〜9割を占め、
 *   会場の大きさが絵に出ない。ドーム・アリーナ・野外フェスの「引いた絵」を足すにあたり、
 *   (1) いまの席が実際に何度のレンズ相当なのか、(2) 透視の式で既存の表を再現できるのか、
 *   を数字で確かめるために作った。結論は「再現しきれないので既存席は置き換えない」。
 *   経緯と結論: _reviews/2026-09-11_stagesketch-wide-venue-view/index.html
 *
 * 使い方:
 *   node tools/check-front-seat-derivation.mjs           # 一覧を出す
 *   node tools/check-front-seat-derivation.mjs --check    # 基準と比べ、ずれていたら終了コード1
 *   node tools/check-front-seat-derivation.mjs --write    # 基準を作り直す（意図して絵を変えたときだけ）
 *
 * --check が落ちたときの意味: 既存の席の見え方が変わった。意図した変更なら --write で基準を更新し、
 * 変更の理由をコミットに書く。意図していないなら、SEATS か layout() の式を戻す。
 */
import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const BASELINE = new URL("front-seat-derivation-baseline.json", new URL("tools/", root));

/* 画の大きさは index.html の canvas に合わせる（1280×720）。
   BASE_H は stage-sketch.js の定数と同じ。 */
const W = 1280;
const H = 720;
const BASE_H = 720;

/* layout() の式をここに写している。写しである以上、本体が変わったら気づけなければ意味がない。
   本体の3行が字面ごと残っていることを先に確かめる。 */
const FORMULA_LINES = [
  "const byWidth = (W * seat.frontW) / size.width;",
  "const byHeight = headroom / ((size.height || 8) / span);",
  "const pxPerM = Math.min(byWidth, byHeight);",
];

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

async function loadVenues() {
  const source = await readFile(new URL("stage-venues.js", root), "utf8");
  const window = {
    localStorage: new MemoryStorage(),
    dispatchEvent() {},
    CustomEvent: class { constructor(type) { this.type = type; } },
  };
  window.window = window;
  const context = vm.createContext({ window, document: { getElementById: () => null }, console });
  vm.runInContext(source, context, { filename: "stage-venues.js" });
  return window.SHOSAI_VENUES;
}

async function checkFormula() {
  const sketch = await readFile(new URL("stage-sketch.js", root), "utf8");
  const missing = FORMULA_LINES.filter((line) => !sketch.includes(line));
  if (missing.length) {
    console.error("layout() の尺の式が変わっている。この道具の写しを直してから使うこと:");
    missing.forEach((line) => console.error(`  見つからない: ${line}`));
    process.exit(2);
  }
}

const round = (value, digits = 1) => Number(value.toFixed(digits));

function measure(seat, size) {
  const span = seat.frontW / seat.backW;              // 手前は奥の何倍に見えるか（表の値）
  const floorY = seat.floorY * (H / BASE_H);
  const headroom = Math.max(24, floorY - 22);
  const byWidth = (W * seat.frontW) / size.width;
  const byHeight = headroom / ((size.height || 8) / span);
  const pxPerM = Math.min(byWidth, byHeight);
  const stageWidthPx = pxPerM * size.width;
  // 逆算した水平画角。pxPerM = W / (2·d·tan(θ/2)) を θ について解く
  const fovDeg = 2 * Math.atan(W / (2 * (seat.eye || 1) * pxPerM)) * 180 / Math.PI;
  // 透視の定義から出る開き。奥行きが効くので、会場ごとに変わる
  const spanFromDepth = 1 + (size.depth || 0) / (seat.eye || 1);
  return {
    seat: seat.id,
    pxPerM: round(pxPerM),
    stageWidthPct: round(stageWidthPx / W * 100, 0),
    limitedBy: byWidth <= byHeight ? "width" : "height",
    fovDeg: round(fovDeg, 0),
    spanTable: round(span, 2),
    spanFromDepth: round(spanFromDepth, 2),
    diffPct: round((spanFromDepth / span - 1) * 100, 0),
  };
}

function collect(venues) {
  const rows = [];
  venues.list.forEach((venue) => {
    if (venue.custom) return;
    venue.sizes.forEach((size) => {
      venues.seats.forEach((seat) => {
        rows.push({ venue: venue.id, size: size.id, ...measure(seat, size) });
      });
    });
  });
  return rows;
}

function printTable(rows) {
  const head = ["venue", "size", "seat", "px/m", "舞台幅%", "決め手", "画角°", "span表", "span式", "差%"];
  const body = rows.map((r) => [r.venue, r.size, r.seat, r.pxPerM, r.stageWidthPct,
    r.limitedBy === "width" ? "間口" : "高さ", r.fovDeg, r.spanTable, r.spanFromDepth,
    `${r.diffPct > 0 ? "+" : ""}${r.diffPct}`]);
  const widths = head.map((_, column) =>
    Math.max(head[column].length, ...body.map((line) => String(line[column]).length)));
  const line = (cells) => cells.map((cell, column) =>
    String(cell).padStart(column < 3 ? 0 : widths[column]).padEnd(widths[column])).join("  ");
  console.log(line(head));
  body.forEach((cells) => console.log(line(cells)));
  const fov = rows.map((r) => r.fovDeg);
  const diffs = rows.map((r) => r.diffPct);
  console.log("");
  console.log(`席×会場 ${rows.length}件 / 逆算した画角 ${Math.min(...fov)}〜${Math.max(...fov)}°`);
  console.log(`舞台が画面に占める幅 ${Math.min(...rows.map((r) => r.stageWidthPct))}〜${Math.max(...rows.map((r) => r.stageWidthPct))}%`);
  console.log(`span（表 vs 透視の式）の差 ${Math.min(...diffs)}%〜${Math.max(...diffs)}% ＝ 式で表を置き換えられない`);
}

const venues = await loadVenues();
await checkFormula();
const rows = collect(venues);
const mode = process.argv[2];

if (mode === "--write") {
  await writeFile(BASELINE, `${JSON.stringify({ generated: "manual", W, H, rows }, null, 2)}\n`, "utf8");
  console.log(`基準を書き出した: tools/front-seat-derivation-baseline.json（${rows.length}件）`);
} else if (mode === "--check") {
  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE, "utf8"));
  } catch (_) {
    console.error("基準が無い。先に --write で作ること");
    process.exit(2);
  }
  const key = (row) => `${row.venue}/${row.size}/${row.seat}`;
  const before = new Map(baseline.rows.map((row) => [key(row), row]));
  const drift = [];
  rows.forEach((row) => {
    const old = before.get(key(row));
    if (!old) { drift.push(`${key(row)}: 新しい席・会場（基準に無い）`); return; }
    ["pxPerM", "stageWidthPct", "fovDeg", "spanTable"].forEach((field) => {
      if (old[field] !== row[field]) drift.push(`${key(row)}: ${field} ${old[field]} → ${row[field]}`);
    });
    before.delete(key(row));
  });
  before.forEach((_, id) => drift.push(`${id}: 基準にあった席・会場が消えた`));
  if (drift.length) {
    console.error(`既存の正面図の見え方が変わっている（${drift.length}件）:`);
    drift.slice(0, 40).forEach((item) => console.error(`  ${item}`));
    if (drift.length > 40) console.error(`  …ほか${drift.length - 40}件`);
    process.exit(1);
  }
  console.log(`既存の正面図の見え方は基準どおり（${rows.length}件）`);
} else {
  printTable(rows);
}

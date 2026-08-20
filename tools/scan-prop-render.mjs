#!/usr/bin/env node
/* 舞台スケッチの全ショーを実ブラウザへ流し、小道具まわりの描画退行を探す。
 *
 * 波Aは元データをそのまま読み、波Bは読み込んだコピーへだけ検査用小道具を足す。
 * 形・保存キー・画面のidは stage-sketch.js から都度読み、ここへ複製しない。
 * 元JSONへは書き戻さず、書き込みは指定されたレポートだけに限る。
 */
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TOOLS_DIR, "..");
const STAGE_SKETCH_JS = path.join(APP_ROOT, "stage-sketch.js");
const STAGE_HTML = path.join(APP_ROOT, "stage.html");
const STAGE_SW = path.join(APP_ROOT, "stage-sw.js");
const DEFAULT_REPORT_DIR = path.join(APP_ROOT, "overnight-runs", "2026-08-20-prop-render-scan");
const SHOW_TIMEOUT_MS = 90_000;
const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
const MATRIX_VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];

const HELP = `全ショー一括「小道具・グループ表示」描画エラースキャン

使い方:
  node tools/scan-prop-render.mjs [options]

引数:
  --wave a|b|both      実行する波。既定は both（波Aの元データ + 波Bの注入）
  --lang ja|en         表示言語。既定は ja
  --width <幅x高さ>    画面幅。既定は 1440x900
  --seed <整数>        波Bの決定的乱数の種。既定は 42
  --hold-density low|high
                       波Bで手へ持たせる密度。既定の low は従来どおり
  --matrix             従来の12通り + 波B highの6通りを順番に実行
  --shows <path...>    対象JSONを明示。次の --option の直前までをパスとして読む
  --out <path.md>      Markdownレポートを1ファイルへまとめて出力
  --json <path.json>   同じ結果をJSONでも出力
  --help, -h           この説明を表示

既定の出力先:
  overnight-runs/2026-08-20-prop-render-scan/report-<波>-<言語>-<幅>.md
  overnight-runs/2026-08-20-prop-render-scan/report-summary.md
`;

function clone(value) {
  return structuredClone(value);
}

// 数値の種から毎回同じ列を返す。ブラウザやNodeの乱数には依存しない。
function createDeterministicRandom(seed = 42) {
  let state = Number(seed) >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function hashText(text) {
  let hash = 2166136261;
  for (const ch of String(text)) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function extractObjectDeclaration(source, name) {
  const anchor = `const ${name} =`;
  const start = source.indexOf(anchor);
  if (start === -1) throw new Error(`${name} の宣言が stage-sketch.js に見つかりません。`);
  const open = source.indexOf("{", start + anchor.length);
  if (open === -1) throw new Error(`${name} の開始括弧が見つかりません。`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const ch = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (ch === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth += 1;
    if (ch !== "}") continue;
    depth -= 1;
    if (depth !== 0) continue;
    return source.slice(start, index + 1);
  }
  throw new Error(`${name} の終了括弧が見つかりません。`);
}

function loadPropShapes(stageSource) {
  const block = extractObjectDeclaration(stageSource, "PROP_SHAPES");
  // eslint-disable-next-line no-new-func
  return new Function(`${block}; return PROP_SHAPES;`)();
}

function loadStringConstant(stageSource, name) {
  const pattern = new RegExp(`const\\s+${name}\\s*=\\s*(["'])(.*?)\\1\\s*;`);
  const match = stageSource.match(pattern);
  if (!match) throw new Error(`${name} の文字列定数が stage-sketch.js に見つかりません。`);
  return match[2];
}

/* 一覧の「行」を数えるためのクラス名。本体が空のときに置くプレースホルダ
 * （stage-cast-empty）まで数えると、小道具0件のショーで全件が誤検出になる。
 * ★2026-08-20にClaudeが実機で踏んだ罠。クラス名を写経せず、本体に実在することを
 *   ここで確かめてから使う（本体で名前が変わったら黙って数え違えるのではなく落とす）。 */
function loadRowClasses(stageSource) {
  const rowClass = "stage-cast-row";
  const emptyClass = "stage-cast-empty";
  for (const name of [rowClass, emptyClass]) {
    if (!stageSource.includes(`"${name}"`) && !stageSource.includes(`\`${name}`)) {
      throw new Error(`一覧の行クラス ${name} が stage-sketch.js に見つかりません。本体の改訂に追随してください。`);
    }
  }
  return { rowClass, emptyClass };
}

function loadDomIds(stageSource) {
  const properties = [
    "groupCast", "groupProps", "castList", "setList", "propList", "sceneList", "propMoves", "printBtn",
  ];
  const ids = {};
  for (const property of properties) {
    const pattern = new RegExp(`${property}\\s*:\\s*document\\.getElementById\\(["']([^"']+)["']\\)`);
    const match = stageSource.match(pattern);
    if (!match) throw new Error(`DOM参照 els.${property} が stage-sketch.js に見つかりません。`);
    ids[property] = match[1];
  }
  return ids;
}

function loadOnStageArea(stageSource) {
  const anchor = "const onStageArea =";
  const start = stageSource.indexOf(anchor);
  const end = start === -1 ? -1 : stageSource.indexOf(";", start + anchor.length);
  if (start === -1 || end === -1) throw new Error("onStageArea が stage-sketch.js に見つかりません。");
  const expression = stageSource.slice(start + anchor.length, end).trim();
  // eslint-disable-next-line no-new-func
  return new Function(`return (${expression});`)();
}

function loadRuntimeContract() {
  const stageSource = readFileSync(STAGE_SKETCH_JS, "utf8");
  const htmlSource = readFileSync(STAGE_HTML, "utf8");
  const swSource = readFileSync(STAGE_SW, "utf8");
  const version = htmlSource.match(/stage-sketch\.js\?v=([^"']+)/)?.[1] || "不明";
  const cacheName = swSource.match(/const\s+CACHE_NAME\s*=\s*["']([^"']+)/)?.[1] || "不明";
  return {
    propShapes: loadPropShapes(stageSource),
    domIds: loadDomIds(stageSource),
    rowClasses: loadRowClasses(stageSource),
    onStageArea: loadOnStageArea(stageSource),
    storageKey: loadStringConstant(stageSource, "STORAGE_KEY"),
    langKey: loadStringConstant(stageSource, "LANG_KEY"),
    tourKey: loadStringConstant(stageSource, "TOUR_KEY"),
    version,
    cacheName,
  };
}

function performerKey(piece) {
  return piece && (piece.castId || piece.originId || piece.id);
}

function sceneRows(project) {
  return (project.scenes || []).filter((scene) => scene && scene.kind !== "section");
}

function uniqueId(base, used) {
  let value = base;
  let suffix = 2;
  while (used.has(value)) { value = `${base}-${suffix}`; suffix += 1; }
  used.add(value);
  return value;
}

function normalizedColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#6f88a8";
}

/* 小道具はコピーへだけ足す。全形を全シーンへ置いたうえで、持つ・床・袖・
 * 受け渡し・はけを重ねるので、印刷一回で全形の描画を通せる。 */
function synthesizeProps(project, propShapes, seed = 42, onStageArea = () => true, holdDensity = "low") {
  const output = clone(project || {});
  output.sets = Array.isArray(output.sets) ? output.sets : [];
  output.scenes = Array.isArray(output.scenes) ? output.scenes : [];
  const rng = createDeterministicRandom((Number(seed) ^ hashText(output.id || output.title || "show")) >>> 0);
  const template = output.sets.find((item) => item && typeof item === "object") || {};
  const usedSetIds = new Set(output.sets.map((item) => item && item.id).filter(Boolean));
  const registrations = Object.entries(propShapes || {}).map(([shape, preset]) => {
    const item = clone(template);
    item.id = uniqueId(`scanprop-${shape}`, usedSetIds);
    item.kind = "prop";
    /* ★雛形は「そのショーの登録の書式に合わせる」ためだけに借りている。
     * 吊り物（tissue・wire など flown:true）を雛形にすると、複製した小道具まで
     * 吊り物になり、本体の isHoldable が「吊り物は持てない」と正しく判断して
     * heldBy を全部落とす。2026-08-20にこれで4ショーの持ちセルが0%になり、
     * C6検査が捕まえた。小道具として当たり前の状態へ必ず戻す。 */
    item.flown = false;
    item.locked = false;
    item.name = String((preset && preset.ja) || shape);
    item.propShape = shape;
    item.dims = clone((preset && preset.dims) || {});
    item.color = normalizedColor(template.color);
    output.sets.push(item);
    return item;
  });

  const rows = sceneRows(output);
  const usedPieceIds = new Set(output.scenes.flatMap((scene) => (scene.pieces || []).map((piece) => piece && piece.id)).filter(Boolean));
  let pieceNumber = 1;
  const nextPieceId = () => {
    while (usedPieceIds.has(`scanpiece-${pieceNumber}`)) pieceNumber += 1;
    const id = `scanpiece-${pieceNumber}`;
    usedPieceIds.add(id);
    pieceNumber += 1;
    return id;
  };
  const byScene = new Map();
  rows.forEach((scene, sceneIndex) => {
    scene.pieces = Array.isArray(scene.pieces) ? scene.pieces : [];
    const injected = new Map();
    registrations.forEach((item, propIndex) => {
      const u = 0.12 + rng() * 0.76;
      const v = 0.12 + rng() * 0.76;
      const piece = {
        id: nextPieceId(), type: "prop", setId: item.id, propShape: item.propShape,
        u, v, size: 100, color: item.color, name: "", heldBy: null, holdSide: "R",
      };
      // 演者のいない場面でも床と袖の両方を必ず描く。
      if (!(scene.pieces || []).some((candidate) => candidate.type === "performer")
        && (propIndex + sceneIndex) % 2 === 1) {
        piece.u = -0.45;
        piece.v = -0.45;
      }
      scene.pieces.push(piece);
      injected.set(item.id, piece);
    });
    byScene.set(scene, injected);
  });

  if (rows.length && registrations.length) {
    const first = rows[0];
    const map = byScene.get(first);
    const floor = map.get(registrations[Math.min(2, registrations.length - 1)].id);
    floor.heldBy = null;
    floor.u = 0.35;
    floor.v = 0.55;
    const outside = map.get(registrations[Math.min(3, registrations.length - 1)].id);
    outside.heldBy = null;
    outside.u = -0.45;
    outside.v = -0.45;
  }

  // 隣り合う場面に別の演者がいる所を探し、同じ小道具を右手から受け渡す。
  let handoffPair = null;
  for (let index = 0; index < rows.length - 1 && !handoffPair; index += 1) {
    const beforePeople = (rows[index].pieces || []).filter((piece) => piece.type === "performer");
    const afterPeople = (rows[index + 1].pieces || []).filter((piece) => piece.type === "performer");
    for (const before of beforePeople) {
      const after = afterPeople.find((candidate) => performerKey(candidate) !== performerKey(before));
      if (after) { handoffPair = { beforeScene: rows[index], afterScene: rows[index + 1], before, after }; break; }
    }
  }
  if (handoffPair && registrations.length) {
    const item = registrations[0];
    Object.assign(byScene.get(handoffPair.beforeScene).get(item.id), {
      heldBy: handoffPair.before.id, holdSide: "R",
    });
    Object.assign(byScene.get(handoffPair.afterScene).get(item.id), {
      heldBy: handoffPair.after.id, holdSide: "R",
    });
  } else if (registrations.length) {
    const holderScene = rows.find((scene) => (scene.pieces || []).some((piece) => piece.type === "performer"));
    const holder = holderScene && (holderScene.pieces || []).find((piece) => piece.type === "performer");
    if (holder) Object.assign(byScene.get(holderScene).get(registrations[0].id), { heldBy: holder.id, holdSide: "R" });
  }

  // 左手は空いている演者の場面を選ぶ。右手と同じ人でも別スロットなのでよい。
  if (registrations.length > 1) {
    const holderScene = handoffPair?.beforeScene || rows.find((scene) =>
      (scene.pieces || []).some((piece) => piece.type === "performer"));
    const holder = holderScene && (holderScene.pieces || []).find((piece) => piece.type === "performer");
    if (holder) Object.assign(byScene.get(holderScene).get(registrations[1].id), { heldBy: holder.id, holdSide: "L" });
  }

  // 一つは前場面にだけ残し、次場面から取り除いて「はける」を作る。
  if (rows.length > 1 && registrations.length) {
    const item = registrations[Math.min(4, registrations.length - 1)];
    const disappearAt = handoffPair ? rows.indexOf(handoffPair.beforeScene) : 0;
    const nextScene = rows[disappearAt + 1];
    if (nextScene) {
      const removed = byScene.get(nextScene).get(item.id);
      nextScene.pieces = nextScene.pieces.filter((piece) => piece !== removed);
      byScene.get(nextScene).delete(item.id);
    }
  }

  if (holdDensity === "high") densifyPropHolds(output, registrations);

  return {
    project: output,
    registrations,
    coverage: propInjectionCoverage(output, registrations, onStageArea),
  };
}

/* low の注入結果を基準に、high のときだけ空いている手へ追加で持たせる。
 * 床・袖を置く余裕が大きい場面から各1個を予約し、形は場面番号を起点に巡回する。 */
function densifyPropHolds(project, registrations) {
  const rows = sceneRows(project || {});
  const ids = new Set((registrations || []).map((item) => item.id));
  const registrationIndex = new Map((registrations || []).map((item, index) => [item.id, index]));
  const injectedPieces = (scene) => (scene.pieces || []).filter((piece) => ids.has(piece.setId));
  const performers = (scene) => (scene.pieces || []).filter((piece) => piece.type === "performer");
  const occupiedByOriginal = (scene) => new Set((scene.pieces || [])
    .filter((piece) => !ids.has(piece.setId) && piece.heldBy)
    .map((piece) => `${piece.heldBy}:${piece.holdSide === "L" ? "L" : "R"}`));

  rows.forEach((scene) => injectedPieces(scene).forEach((piece) => { piece.heldBy = null; }));

  const reserveCandidates = rows.flatMap((scene, sceneIndex) => {
    const originals = occupiedByOriginal(scene);
    const emptyHands = performers(scene).reduce((count, performer) => count
      + ["R", "L"].filter((side) => !originals.has(`${performer.id}:${side}`)).length, 0);
    const pieces = injectedPieces(scene)
      .filter((piece) => registrationIndex.get(piece.setId) !== 0)
      .sort((a, b) => {
        const aIndex = (registrationIndex.get(a.setId) - sceneIndex + registrations.length) % registrations.length;
        const bIndex = (registrationIndex.get(b.setId) - sceneIndex + registrations.length) % registrations.length;
        return bIndex - aIndex;
      });
    const spare = Math.max(0, pieces.length - emptyHands);
    return pieces.map((piece, pieceIndex) => ({ scene, sceneIndex, piece, spare: pieceIndex < spare }));
  }).sort((a, b) => Number(b.spare) - Number(a.spare) || a.sceneIndex - b.sceneIndex);
  const reserved = new Set(reserveCandidates.slice(0, 2).map((item) => item.piece));
  const [floorReserve, offstageReserve] = reserveCandidates.slice(0, 2);
  if (floorReserve) Object.assign(floorReserve.piece, { heldBy: null, u: 0.35, v: 0.55 });
  if (offstageReserve) Object.assign(offstageReserve.piece, { heldBy: null, u: -0.45, v: -0.45 });

  rows.forEach((scene, sceneIndex) => {
    const occupied = occupiedByOriginal(scene);
    const slots = [];
    performers(scene).forEach((performer, performerIndex) => {
      const sides = performerIndex % 2 === 0 ? ["R", "L"] : ["L", "R"];
      sides.forEach((side) => {
        if (!occupied.has(`${performer.id}:${side}`)) slots.push({ performer, side });
      });
    });
    const piecesBySet = new Map(injectedPieces(scene).map((piece) => [piece.setId, piece]));
    const ordered = Array.from({ length: registrations.length }, (_, offset) =>
      registrations[(sceneIndex + offset) % registrations.length])
      .map((item) => piecesBySet.get(item.id))
      .filter((piece) => piece && !reserved.has(piece));
    slots.slice(0, ordered.length).forEach((slot, index) => {
      Object.assign(ordered[index], { heldBy: slot.performer.id, holdSide: slot.side });
    });
  });

  // 同じ登録を隣り合う場面の別演者へ移し、密度を落とさず受け渡しを残す。
  const handoffItem = registrations[0];
  if (!handoffItem) return;
  for (let index = 0; index < rows.length - 1; index += 1) {
    const beforeScene = rows[index];
    const afterScene = rows[index + 1];
    const beforePeople = performers(beforeScene);
    const afterPeople = performers(afterScene);
    const before = beforePeople.find((person) => afterPeople.some((candidate) => performerKey(candidate) !== performerKey(person)));
    const after = before && afterPeople.find((candidate) => performerKey(candidate) !== performerKey(before));
    if (!before || !after) continue;
    const beforePiece = injectedPieces(beforeScene).find((piece) => piece.setId === handoffItem.id);
    const afterPiece = injectedPieces(afterScene).find((piece) => piece.setId === handoffItem.id);
    if (!beforePiece || !afterPiece) continue;
    moveInjectedPropToHolder(beforeScene, beforePiece, before, ids, beforePeople.indexOf(before));
    moveInjectedPropToHolder(afterScene, afterPiece, after, ids, afterPeople.indexOf(after));
    return;
  }
}

// 指定の演者へ移す際は、同じ手にいた注入小道具と場所を交換して持ち数を保つ。
function moveInjectedPropToHolder(scene, target, holder, injectedIds, performerIndex) {
  const pieces = scene.pieces || [];
  const previous = target.heldBy ? { heldBy: target.heldBy, holdSide: target.holdSide === "L" ? "L" : "R" } : null;
  const originalSlots = new Set(pieces.filter((piece) => !injectedIds.has(piece.setId) && piece.heldBy)
    .map((piece) => `${piece.heldBy}:${piece.holdSide === "L" ? "L" : "R"}`));
  const sides = performerIndex % 2 === 0 ? ["R", "L"] : ["L", "R"];
  const side = sides.find((candidate) => !originalSlots.has(`${holder.id}:${candidate}`));
  if (!side) return false;
  const occupant = pieces.find((piece) => piece !== target && injectedIds.has(piece.setId)
    && piece.heldBy === holder.id && (piece.holdSide === "L" ? "L" : "R") === side);
  Object.assign(target, { heldBy: holder.id, holdSide: side });
  if (occupant && previous) Object.assign(occupant, previous);
  else if (occupant) occupant.heldBy = null;
  return true;
}

function propInjectionCoverage(project, registrations, onStageArea = () => true) {
  const ids = new Set((registrations || []).map((item) => item.id));
  const rows = sceneRows(project || {});
  const coverage = { right: false, left: false, floor: false, offstage: false, handoff: false, disappears: false, heldCount: 0 };
  rows.forEach((scene) => {
    const pieces = scene.pieces || [];
    pieces.filter((piece) => ids.has(piece.setId)).forEach((piece) => {
      if (piece.heldBy && piece.holdSide === "R") coverage.right = true;
      if (piece.heldBy && piece.holdSide === "L") coverage.left = true;
      if (piece.heldBy) coverage.heldCount += 1;
      if (!piece.heldBy && onStageArea(piece.u, piece.v)) coverage.floor = true;
      if (!piece.heldBy && !onStageArea(piece.u, piece.v)) coverage.offstage = true;
    });
  });
  for (let index = 0; index < rows.length - 1; index += 1) {
    const before = rows[index].pieces || [];
    const after = rows[index + 1].pieces || [];
    for (const id of ids) {
      const a = before.find((piece) => piece.setId === id);
      const b = after.find((piece) => piece.setId === id);
      if (a && !b) coverage.disappears = true;
      if (!a?.heldBy || !b?.heldBy) continue;
      const holderA = before.find((piece) => piece.id === a.heldBy && piece.type === "performer");
      const holderB = after.find((piece) => piece.id === b.heldBy && piece.type === "performer");
      if (holderA && holderB && performerKey(holderA) !== performerKey(holderB)) coverage.handoff = true;
    }
  }
  return coverage;
}

// 元データだけを見る。normalizeState が直す前に、不整合を検出して分けて報告する。
function analyzeOriginalHolds(project) {
  const findings = [];
  sceneRows(project || {}).forEach((scene) => {
    const pieces = Array.isArray(scene.pieces) ? scene.pieces : [];
    const byId = new Map(pieces.map((piece) => [piece.id, piece]));
    const slots = new Map();
    pieces.forEach((piece) => {
      if (!piece.heldBy) return;
      const holder = byId.get(piece.heldBy);
      if (!holder || holder.type !== "performer") {
        findings.push({ code: "E1", sceneId: scene.id || "", detail: `${piece.id || "(idなし)"} の heldBy=${piece.heldBy} は同じシーンの演者を指していません。` });
        return;
      }
      const side = piece.holdSide === "L" ? "L" : "R";
      const slot = `${piece.heldBy}:${side}`;
      if (slots.has(slot)) {
        findings.push({ code: "E2", sceneId: scene.id || "", detail: `${piece.heldBy} の${side}手を ${slots.get(slot)} と ${piece.id || "(idなし)"} が同時に指しています。` });
      } else {
        slots.set(slot, piece.id || "(idなし)");
      }
    });
  });
  return findings;
}

function checkGroupSnapshot(snapshot, expected) {
  const failures = [];
  if (snapshot.propRows !== expected.props) failures.push({ code: "B1", detail: `小道具行 ${snapshot.propRows} / 期待 ${expected.props}` });
  if (snapshot.setRows + snapshot.propRows !== expected.nonLightSets) {
    failures.push({ code: "B1", detail: `セット+小道具行 ${snapshot.setRows + snapshot.propRows} / light以外の登録 ${expected.nonLightSets}` });
  }
  if (snapshot.propsHidden !== (expected.props === 0)) failures.push({ code: "B2", detail: `小道具グループ hidden=${snapshot.propsHidden} / 小道具 ${expected.props}件` });
  const existingSetNames = new Set(expected.nonPropNames || []);
  const leaked = expected.injectedNames.filter((name) => name && !existingSetNames.has(name)
    && (snapshot.setNames || []).includes(name));
  if (leaked.length) failures.push({ code: "B3", detail: `舞台セット欄へ小道具名が混入: ${leaked.join("、")}` });
  if (snapshot.blankPropRows > 0) failures.push({ code: "B4", detail: `名前が空の小道具行 ${snapshot.blankPropRows}件` });
  if (snapshot.scenePerformerCount > snapshot.castRows) failures.push({ code: "B5", detail: `シーンの演者駒 ${snapshot.scenePerformerCount}人 / キャスト行 ${snapshot.castRows}行` });
  return failures;
}

function inspectPlotMatrix(snapshot, expected) {
  const failures = [];
  if (expected.props === 0) {
    if (snapshot.present) failures.push({ code: "C5", detail: "小道具0件なのに香盤表が生成されました。" });
    return failures;
  }
  if (!snapshot.present) return [{ code: "C2", detail: "小道具登録があるのに香盤表が生成されませんでした。" }];
  if (snapshot.columns !== expected.scenes + 1) failures.push({ code: "C3", detail: `香盤表の列 ${snapshot.columns} / 期待 ${expected.scenes + 1}` });
  if (snapshot.rows !== expected.props) failures.push({ code: "C3", detail: `香盤表の行 ${snapshot.rows} / 期待 ${expected.props}` });
  const holderNames = new Set(expected.holderNames || []);
  const invalid = snapshot.cells.filter((value) => {
    const text = String(value);
    if (text === "") return false;
    if (!text.trim()) return true;
    if (/undefined|null|NaN|\[object Object\]/.test(text)) return true;
    if (/^(床|floor)/.test(text)) return false;
    return holderNames.size > 0 && !holderNames.has(text);
  });
  if (invalid.length) failures.push({ code: "C4", detail: `香盤表に不正なセル: ${invalid.slice(0, 5).join(" / ")}` });
  if (expected.holdDensity === "high") {
    const held = snapshot.cells.filter((value) => {
      const text = String(value).trim();
      return text && !/^(床|floor)/i.test(text);
    }).length;
    const ratio = snapshot.cells.length ? held / snapshot.cells.length : 0;
    if (ratio < 0.1) failures.push({ code: "C6", detail: `high の持たれているセル ${held}/${snapshot.cells.length}（${(ratio * 100).toFixed(1)}%）` });
  }
  return failures;
}

function parseViewport(value) {
  const match = String(value || "").match(/^(\d+)x(\d+)$/);
  if (!match) throw new Error(`画面幅は 1440x900 の形で指定してください: ${value}`);
  const viewport = { width: Number(match[1]), height: Number(match[2]) };
  if (viewport.width < 240 || viewport.height < 240) throw new Error(`画面幅が小さすぎます: ${value}`);
  return viewport;
}

function requireValue(argv, index, option) {
  if (!argv[index + 1] || argv[index + 1].startsWith("--")) throw new Error(`${option} に値が必要です。`);
  return argv[index + 1];
}

function parseArgs(argv) {
  const options = { wave: "both", lang: "ja", seed: 42, holdDensity: "low", viewport: DEFAULT_VIEWPORT, matrix: false, shows: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") { options.help = true; continue; }
    if (arg === "--matrix") { options.matrix = true; continue; }
    if (arg === "--wave") {
      options.wave = requireValue(argv, index, arg).toLowerCase(); index += 1;
      if (!new Set(["a", "b", "both"]).has(options.wave)) throw new Error(`--wave は a|b|both: ${options.wave}`);
      continue;
    }
    if (arg === "--lang") {
      options.lang = requireValue(argv, index, arg).toLowerCase(); index += 1;
      if (!new Set(["ja", "en"]).has(options.lang)) throw new Error(`--lang は ja|en: ${options.lang}`);
      continue;
    }
    if (arg === "--seed") {
      options.seed = Number(requireValue(argv, index, arg)); index += 1;
      if (!Number.isInteger(options.seed)) throw new Error("--seed は整数で指定してください。");
      continue;
    }
    if (arg === "--hold-density") {
      options.holdDensity = requireValue(argv, index, arg).toLowerCase(); index += 1;
      if (!new Set(["low", "high"]).has(options.holdDensity)) throw new Error(`--hold-density は low|high: ${options.holdDensity}`);
      continue;
    }
    if (arg === "--width") { options.viewport = parseViewport(requireValue(argv, index, arg)); index += 1; continue; }
    if (arg === "--out") { options.out = path.resolve(requireValue(argv, index, arg)); index += 1; continue; }
    if (arg === "--json") { options.json = path.resolve(requireValue(argv, index, arg)); index += 1; continue; }
    if (arg === "--shows") {
      index += 1;
      while (index < argv.length && !argv[index].startsWith("--")) { options.shows.push(path.resolve(argv[index])); index += 1; }
      index -= 1;
      if (!options.shows.length) throw new Error("--shows の後に1つ以上のパスが必要です。");
      continue;
    }
    throw new Error(`未知の引数です: ${arg}`);
  }
  return options;
}

function defaultShowDirectories() {
  const parent = path.dirname(APP_ROOT);
  return [
    path.join(APP_ROOT, ".stage-sketch-mcp", "projects"),
    path.join(APP_ROOT, ".stage-sketch-mcp", "exports"),
    path.join(parent, "jjk-show"),
    path.join(parent, "show-creation"),
    path.join(parent, "show-creation", "demo-11works-2026-08-16", "sketches"),
  ];
}

function jsonFilesIn(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name));
}

function collectShowFiles(explicitPaths = []) {
  const paths = [];
  const exclusions = [];
  const inputs = explicitPaths.length ? explicitPaths : defaultShowDirectories();
  for (const input of inputs) {
    try {
      const info = statSync(input);
      if (info.isDirectory()) paths.push(...jsonFilesIn(input));
      else if (info.isFile() && input.endsWith(".json")) paths.push(input);
      else exclusions.push({ file: input, reason: "JSONファイルでもディレクトリでもありません。" });
    } catch (error) {
      exclusions.push({ file: input, reason: `読めません: ${error.message}` });
    }
  }
  const unique = [...new Set(paths.map((file) => path.resolve(file)))].sort((a, b) => a.localeCompare(b, "en"));
  const shows = [];
  for (const file of unique) {
    try {
      const doc = JSON.parse(readFileSync(file, "utf8"));
      const project = doc && (doc.project || doc);
      if (!project || !Array.isArray(project.scenes)) {
        exclusions.push({ file, reason: "project.scenes（または直下scenes）が配列ではありません。" });
        continue;
      }
      shows.push({ file, project });
    } catch (error) {
      exclusions.push({ file, reason: `JSONを読めません: ${error.message}` });
    }
  }
  return { shows, exclusions };
}

function combinationsFor(options) {
  if (options.matrix) {
    const list = [];
    for (const wave of ["a", "b"]) for (const lang of ["ja", "en"]) {
      for (const viewport of MATRIX_VIEWPORTS) list.push({ wave, lang, viewport, holdDensity: "low" });
    }
    for (const lang of ["ja", "en"]) for (const viewport of MATRIX_VIEWPORTS) {
      list.push({ wave: "b", lang, viewport, holdDensity: "high" });
    }
    return list;
  }
  const waves = options.wave === "both" ? ["a", "b"] : [options.wave];
  return waves.map((wave) => ({
    wave, lang: options.lang, viewport: options.viewport,
    holdDensity: wave === "b" ? options.holdDensity : "low",
  }));
}

function comboLabel(combo) {
  const density = combo.wave === "b" && combo.holdDensity === "high" ? "-high" : "";
  return `${combo.wave.toUpperCase()}-${combo.lang}-${combo.viewport.width}x${combo.viewport.height}${density}`;
}

function loadPlaywright() {
  try {
    const req = createRequire("/Users/arata/.local/share/stage-scan/package.json");
    return req("playwright-core");
  } catch (error) {
    throw new Error(`playwright-core を固定場所から解決できません: ${error.message}\n導入: cd /Users/arata/.local/share/stage-scan && npm install playwright-core`);
  }
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" })[ext] || "application/octet-stream";
}

async function startStaticServer() {
  const server = createServer((request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      const file = path.resolve(APP_ROOT, relative || "stage.html");
      if (file !== APP_ROOT && !file.startsWith(`${APP_ROOT}${path.sep}`)) {
        response.writeHead(403); response.end("forbidden"); return;
      }
      const info = statSync(file);
      if (!info.isFile()) { response.writeHead(404); response.end("not found"); return; }
      const body = readFileSync(file);
      response.writeHead(200, { "content-type": contentType(file), "cache-control": "no-store" });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch (_) {
      response.writeHead(404); response.end("not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

function issueFor(show, combo, code, category, detail, stack = "") {
  return { show: path.basename(show.file), file: show.file, combination: comboLabel(combo), code, category, detail: String(detail), stack: String(stack || "") };
}

function expectedFor(project, injectedNames = [], holdDensity = "low") {
  const sets = Array.isArray(project.sets) ? project.sets : [];
  const holders = new Set(["演者", "Performer"]);
  (project.cast || []).forEach((member) => {
    if (member && typeof member.name === "string" && member.name.trim()) holders.add(member.name.slice(0, 8));
  });
  sceneRows(project).forEach((scene) => (scene.pieces || []).forEach((piece) => {
    if (piece.type === "performer" && typeof piece.name === "string" && piece.name.trim()) holders.add(piece.name.slice(0, 8));
  }));
  return {
    props: sets.filter((item) => item && item.kind === "prop").length,
    nonLightSets: sets.filter((item) => item && item.kind !== "light").length,
    injectedNames,
    nonPropNames: sets.filter((item) => item && item.kind !== "light" && item.kind !== "prop")
      .map((item) => String(item.name || "")),
    holderNames: [...holders],
    scenes: sceneRows(project).length,
    holdDensity,
  };
}

function scenePerformerCount(project, sceneId) {
  const scene = sceneRows(project).find((item) => item.id === sceneId);
  return (scene?.pieces || []).filter((piece) => piece.type === "performer").length;
}

async function scanInContext(context, show, combo, project, injectedNames, contract, origin) {
  const page = await context.newPage();
  const issues = [];
  page.on("pageerror", (error) => issues.push(issueFor(show, combo, "A1", "fatal", error.message, error.stack)));
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(issueFor(show, combo, "A2", "render", message.text()));
    if (message.type() === "warning") issues.push(issueFor(show, combo, "A3", "warning", message.text()));
  });
  page.on("requestfailed", (request) => issues.push(issueFor(show, combo, "A4", "network", `${request.url()} | ${request.failure()?.errorText || "理由不明"}`)));
  page.on("crash", () => issues.push(issueFor(show, combo, "A5", "fatal", "ページがクラッシュしました。")));

  await page.addInitScript(({ projectValue, storageKey, tourKey, langKey, lang }) => {
    localStorage.setItem(storageKey, JSON.stringify({ project: projectValue }));
    localStorage.setItem(tourKey, "done");
    localStorage.setItem(langKey, lang);
    window.__stageScanPrintHtml = null;
    window.__stageScanPrintPromise = null;
    const realCreateObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      if (blob && blob.type === "text/html" && typeof blob.text === "function") {
        window.__stageScanPrintPromise = blob.text().then((html) => {
          window.__stageScanPrintHtml = html;
          return html;
        });
        return "about:blank#stage-prop-render-scan";
      }
      return realCreateObjectURL(blob);
    };
    window.open = () => ({
      document: { write() {}, close() {} },
      close() {},
      focus() {},
    });
  }, { projectValue: project, storageKey: contract.storageKey, tourKey: contract.tourKey, langKey: contract.langKey, lang: combo.lang });

  await page.goto(`${origin}/stage.html`, { waitUntil: "load" });
  const expected = expectedFor(project, injectedNames, combo.holdDensity);
  const activeSceneId = project.activeSceneId && sceneRows(project).some((scene) => scene.id === project.activeSceneId)
    ? project.activeSceneId : sceneRows(project)[0]?.id;
  const initial = await page.evaluate(({ ids, rowClass }) => {
    const rows = (id) => [...(document.getElementById(id)?.querySelectorAll(`.${rowClass}`) || [])];
    const propRows = rows(ids.propList);
    const setRows = rows(ids.setList);
    return {
      propRows: propRows.length,
      setRows: setRows.length,
      castRows: rows(ids.castList).length,
      propsHidden: Boolean(document.getElementById(ids.groupProps)?.hidden),
      setText: document.getElementById(ids.setList)?.textContent || "",
      setNames: setRows.map((row) => row.querySelector(".stage-cast-name")?.textContent?.trim() || ""),
      blankPropRows: propRows.filter((row) => !(row.querySelector(".stage-cast-name")?.textContent || "").trim()).length,
    };
  }, { ids: contract.domIds, rowClass: contract.rowClasses.rowClass });
  initial.scenePerformerCount = scenePerformerCount(project, activeSceneId);
  checkGroupSnapshot(initial, expected).forEach((failure) => issues.push(issueFor(show, combo, failure.code, "render", failure.detail)));

  try {
    const plot = await page.evaluate(async ({ printId }) => {
      const button = document.getElementById(printId);
      if (!button) throw new Error("印刷ボタンがありません。");
      button.click();
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("印刷HTMLの回収が15秒でタイムアウトしました。")), 15_000));
      const html = await Promise.race([window.__stageScanPrintPromise || Promise.resolve(window.__stageScanPrintHtml), timeout]);
      if (typeof html !== "string") throw new Error("Blob/ObjectURL から印刷HTMLを回収できませんでした。");
      const doc = new DOMParser().parseFromString(html, "text/html");
      const table = doc.querySelector("table.props-plot-table");
      return {
        present: Boolean(table),
        columns: table ? table.querySelectorAll("thead tr:first-child > *").length : 0,
        rows: table ? table.querySelectorAll("tbody > tr").length : 0,
        cells: table ? [...table.querySelectorAll("tbody > tr > td")].map((cell) => cell.textContent) : [],
        htmlLength: html.length,
      };
    }, { printId: contract.domIds.printBtn });
    inspectPlotMatrix(plot, expected).forEach((failure) => issues.push(issueFor(show, combo, failure.code, "render", failure.detail)));
  } catch (error) {
    // 印刷だけが失敗しても、同じショーの対話描画は続けて別の退行を拾う。
    issues.push(issueFor(show, combo, "C1", "render", error.message, error.stack));
  }

  for (const scene of sceneRows(project)) {
    const clicked = await page.evaluate(({ listId, sceneId }) => {
      const list = document.getElementById(listId);
      const row = [...(list?.querySelectorAll("[data-scene-id]") || [])].find((item) => item.dataset.sceneId === sceneId);
      const button = row && row.querySelector("button");
      if (!button) return false;
      button.click();
      return true;
    }, { listId: contract.domIds.sceneList, sceneId: scene.id });
    if (!clicked) {
      issues.push(issueFor(show, combo, "D1", "render", `シーン ${scene.id || "(idなし)"} の行をクリックできません。`));
      continue;
    }
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const snapshot = await page.evaluate(({ ids, rowClass }) => {
      const props = document.getElementById(ids.propList);
      const moves = document.getElementById(ids.propMoves);
      const cast = document.getElementById(ids.castList);
      return {
        propRows: props ? props.querySelectorAll(`.${rowClass}`).length : 0,
        castRows: cast ? cast.querySelectorAll(`.${rowClass}`).length : 0,
        movesEmpty: !(moves?.textContent || "").trim(),
        movesHidden: Boolean(moves?.hidden),
      };
    }, { ids: contract.domIds, rowClass: contract.rowClasses.rowClass });
    if (snapshot.movesEmpty !== snapshot.movesHidden) issues.push(issueFor(show, combo, "D2", "render", `シーン ${scene.id}: 受け渡し行の空文字=${snapshot.movesEmpty} / hidden=${snapshot.movesHidden}`));
    if (snapshot.propRows !== expected.props) issues.push(issueFor(show, combo, "D3", "render", `シーン ${scene.id}: 小道具行 ${snapshot.propRows} / 期待 ${expected.props}`));
    const performerCount = scenePerformerCount(project, scene.id);
    if (performerCount > snapshot.castRows) issues.push(issueFor(show, combo, "B5", "render", `シーン ${scene.id}: 演者駒 ${performerCount}人 / キャスト行 ${snapshot.castRows}行`));
  }
  return issues;
}

async function scanOneShow(browser, show, combo, project, injectedNames, contract, origin) {
  let context;
  let timer;
  try {
    return await Promise.race([
      (async () => {
        context = await browser.newContext({ viewport: combo.viewport });
        return scanInContext(context, show, combo, project, injectedNames, contract, origin);
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("1ショー90秒の上限を超えました。")), SHOW_TIMEOUT_MS); }),
    ]);
  } finally {
    clearTimeout(timer);
    if (context) await context.close().catch(() => {});
  }
}

function categoryCounts(issues) {
  return {
    fatal: issues.filter((item) => item.category === "fatal").length,
    render: issues.filter((item) => item.category === "render").length,
    data: issues.filter((item) => item.category === "data").length,
    warning: issues.filter((item) => item.category === "warning").length,
    network: issues.filter((item) => item.category === "network").length,
  };
}

function oneLine(value, limit = 200) {
  return String(value).replace(/\s+/g, " ").trim().slice(0, limit);
}

function markdownReport({ issues, exclusions, meta, combinations }) {
  const counts = categoryCounts(issues);
  const lines = [
    `致命 ${counts.fatal}件 / 描画エラー ${counts.render}件`,
    `データ指摘 ${counts.data}件 / 警告 ${counts.warning}件`,
    `通信失敗 ${counts.network}件 / 対象外 ${exclusions.length}件`,
    "",
    "# 小道具・グループ表示 描画エラースキャン",
    "",
    `- 実行時刻: ${meta.startedAt}`,
    `- stage-sketch.js: ?v=${meta.stageVersion}`,
    `- CACHE_NAME: ${meta.cacheName}`,
    `- 対象ショー: ${meta.showCount}件`,
    `- 組み合わせ: ${combinations.length}通り（${combinations.map(comboLabel).join(" / ")}）`,
    "",
    "## 検出一覧",
    "",
  ];
  if (!issues.length) lines.push("検出はありません。", "");
  issues.forEach((item) => lines.push(`- ${item.show} | ${item.combination} | ${item.code} ${item.category} | ${oneLine(item.detail)}`));
  lines.push("", "## 詳細", "");
  if (!issues.length) lines.push("詳細はありません。", "");
  issues.forEach((item, index) => {
    lines.push(`### ${index + 1}. ${item.code} — ${item.show} — ${item.combination}`, "", item.detail);
    if (item.stack) lines.push("", "```text", item.stack, "```");
    lines.push("");
  });
  lines.push("## 対象外", "");
  if (!exclusions.length) lines.push("対象外はありません。", "");
  exclusions.forEach((item) => lines.push(`- ${item.file} — ${item.reason}`));
  lines.push("", "## 環境メモ", "", `- Chrome: ${meta.chromeVersion}`, `- Node: ${meta.nodeVersion}`);
  lines.push("");
  return lines.join("\n");
}

async function writeReportFile(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

async function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); }
  catch (error) { console.error(`ERROR: ${error.message}\n\n${HELP}`); process.exitCode = 2; return; }
  if (options.help) { console.log(HELP); return; }

  let contract;
  try { contract = loadRuntimeContract(); }
  catch (error) { console.error(`ERROR preflight: ${error.message}`); process.exitCode = 2; return; }
  const { shows, exclusions } = collectShowFiles(options.shows);
  if (!shows.length) { console.error("ERROR: 対象ショーが0件です。対象外一覧を確認してください。"); exclusions.forEach((item) => console.error(`- ${item.file}: ${item.reason}`)); process.exitCode = 2; return; }
  const combinations = combinationsFor(options);
  const issues = [];
  if (combinations.some((combo) => combo.wave === "a")) {
    shows.forEach((show) => analyzeOriginalHolds(show.project).forEach((finding) => {
      issues.push({ ...finding, show: path.basename(show.file), file: show.file, combination: "元データ", category: "data" });
    }));
  }

  let browser;
  let serverInfo;
  let chromeVersion = "不明";
  const startedAt = new Date().toISOString();
  try {
    const { chromium } = loadPlaywright();
    browser = await chromium.launch({ channel: "chrome", headless: true });
    chromeVersion = browser.version();
    serverInfo = await startStaticServer();
    for (let comboIndex = 0; comboIndex < combinations.length; comboIndex += 1) {
      const combo = combinations[comboIndex];
      const comboCoverage = { right: false, left: false, floor: false, offstage: false, handoff: false, disappears: false, heldCount: 0 };
      const densityLabel = combo.wave === "b" && combo.holdDensity === "high" ? " 持ち密度high" : "";
      console.log(`[${comboIndex + 1}/${combinations.length}] 波${combo.wave.toUpperCase()} ${combo.lang} ${combo.viewport.width}x${combo.viewport.height}${densityLabel} — ${shows.length}ショー`);
      for (let showIndex = 0; showIndex < shows.length; showIndex += 1) {
        const show = shows[showIndex];
        let project = clone(show.project);
        let injectedNames = [];
        if (combo.wave === "b") {
          const injected = synthesizeProps(project, contract.propShapes, options.seed, contract.onStageArea, combo.holdDensity);
          project = injected.project;
          injectedNames = injected.registrations.map((item) => item.name);
          Object.entries(injected.coverage).forEach(([key, value]) => {
            if (key === "heldCount") comboCoverage.heldCount += value;
            else comboCoverage[key] ||= value;
          });
        }
        try {
          issues.push(...await scanOneShow(browser, show, combo, project, injectedNames, contract, serverInfo.origin));
        } catch (error) {
          issues.push(issueFor(show, combo, error.message.includes("90秒") ? "TIMEOUT" : "SCAN", "render", error.message, error.stack));
        }
      }
      if (combo.wave === "b") {
        const missing = Object.entries(comboCoverage).filter(([key, value]) => key !== "heldCount" && !value).map(([key]) => key);
        if (missing.length) issues.push(issueFor({ file: "(全ショー)" }, combo, "B0", "render", `対象全体で注入した6状態を作れませんでした: ${missing.join(", ")}`));
      }
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 2;
    return;
  } finally {
    if (serverInfo) await new Promise((resolve) => serverInfo.server.close(resolve));
    if (browser) await browser.close().catch(() => {});
  }

  const meta = {
    startedAt,
    stageVersion: contract.version,
    cacheName: contract.cacheName,
    showCount: shows.length,
    chromeVersion,
    nodeVersion: process.version,
  };
  if (options.out) {
    await writeReportFile(options.out, markdownReport({ issues, exclusions, meta, combinations }));
  } else {
    for (const combo of combinations) {
      const selected = issues.filter((item) => item.combination === comboLabel(combo)
        || (item.combination === "元データ" && combo.wave === "a"));
      const density = combo.wave === "b" && combo.holdDensity === "high" ? "-high" : "";
      const file = path.join(DEFAULT_REPORT_DIR, `report-${combo.wave}-${combo.lang}-${combo.viewport.width}x${combo.viewport.height}${density}.md`);
      await writeReportFile(file, markdownReport({ issues: selected, exclusions, meta, combinations: [combo] }));
    }
    await writeReportFile(path.join(DEFAULT_REPORT_DIR, "report-summary.md"), markdownReport({ issues, exclusions, meta, combinations }));
  }
  if (options.json) {
    await writeReportFile(options.json, `${JSON.stringify({ meta, combinations, exclusions, issues }, null, 2)}\n`);
  }
  const counts = categoryCounts(issues);
  console.log(`完了: 致命${counts.fatal} / 描画エラー${counts.render} / データ指摘${counts.data} / 警告${counts.warning}`);
  process.exitCode = counts.fatal + counts.render;
}

const isMain = (() => {
  try { return fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || ""); }
  catch (_) { return false; }
})();
if (isMain) {
  main().catch((error) => {
    console.error(`ERROR: ${error.stack || error.message}`);
    process.exitCode = 2;
  });
}

export {
  analyzeOriginalHolds,
  checkGroupSnapshot,
  combinationsFor,
  collectShowFiles,
  createDeterministicRandom,
  extractObjectDeclaration,
  inspectPlotMatrix,
  loadDomIds,
  loadOnStageArea,
  loadPropShapes,
  parseArgs,
  propInjectionCoverage,
  synthesizeProps,
};

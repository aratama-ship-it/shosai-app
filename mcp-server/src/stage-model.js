import { randomUUID } from "node:crypto";

export const VENUES = [
  "proscenium",
  "thrust",
  "arena",
  "endstage",
  "blackbox",
];

export const VENUE_SIZES = ["small", "mid", "large"];

export const SET_KINDS = [
  "block", "table", "chair", "bench", "stool", "wall", "sphere",
  "trapeze", "cyrwheel", "pole", "teeter", "tissue", "wire",
  "suitcase", "trampoline", "cane", "car", "light",
];

export const POSES = [
  "stand", "walk", "reach", "open", "sit", "crouch", "kneel",
  "handstand", "lie_back", "lie_front", "lie_side",
];

export const HIGH_RISK_KINDS = new Set([
  "trapeze", "cyrwheel", "pole", "teeter", "tissue", "wire", "trampoline",
]);

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;
const DEFAULT_COLORS = [
  "#a84b26", "#77865f", "#54718a", "#9a6d3a", "#765b83", "#3f7b70",
];

function fail(message) {
  throw new Error(message);
}

export function assertId(value, label = "id") {
  if (typeof value !== "string" || !ID_RE.test(value)) {
    fail(`${label}は英数字で始まる96文字以内のIDにしてください。`);
  }
  return value;
}

export function makeId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function stringValue(value, label, max, required = false) {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) fail(`${label}は必須です。`);
  if (text.length > max) fail(`${label}は${max}文字以内にしてください。`);
  return text;
}

function numberValue(value, label, min, max, fallback) {
  const number = value === undefined || value === null ? fallback : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    fail(`${label}は${min}〜${max}の数値にしてください。`);
  }
  return number;
}

function colorValue(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !COLOR_RE.test(value)) {
    fail(`色は #RRGGBB 形式にしてください: ${String(value)}`);
  }
  return value.toLowerCase();
}

function enumValue(value, values, label, fallback) {
  const selected = value === undefined || value === null ? fallback : value;
  if (!values.includes(selected)) {
    fail(`${label}は ${values.join(", ")} のいずれかにしてください。`);
  }
  return selected;
}

function normalizeProjectRehearsal(raw) {
  const rehearsal = raw && typeof raw === "object" ? raw : {};
  return {
    version: 1,
    primaryMode: enumValue(
      rehearsal.primaryMode,
      ["ordered"],
      "rehearsal.primaryMode",
      "ordered",
    ),
    soundtrack: rehearsal.soundtrack === "bundled-demo" ? "bundled-demo" : null,
  };
}

function normalizeSceneRehearsal(raw, label) {
  const rehearsal = raw && typeof raw === "object" ? raw : {};
  return {
    holdDurationSeconds: rehearsal.holdDurationSeconds === undefined
      || rehearsal.holdDurationSeconds === null
      ? null
      : numberValue(
          rehearsal.holdDurationSeconds,
          `${label}.rehearsal.holdDurationSeconds`,
          0,
          86400,
          null,
        ),
    transitionToNextSeconds: rehearsal.transitionToNextSeconds === undefined
      || rehearsal.transitionToNextSeconds === null
      ? null
      : numberValue(
          rehearsal.transitionToNextSeconds,
          `${label}.rehearsal.transitionToNextSeconds`,
          0,
          86400,
          null,
        ),
  };
}

function normalizeSceneBeat(raw, label) {
  const beat = raw && typeof raw === "object" ? raw : {};
  const energy = beat.energy === undefined || beat.energy === null
    ? null : Number(beat.energy);
  if (energy !== null && (!Number.isInteger(energy) || energy < 1 || energy > 5)) {
    fail(`${label}.beat.energyは1〜5の整数またはnullにしてください。`);
  }
  return {
    role: stringValue(beat.role, `${label}.beat.role`, 160),
    energy,
  };
}

function uniqueNameId(list, prefix, name) {
  const existing = list.find((item) => item.name === name);
  return existing?.id || makeId(prefix);
}

function normalizeRoute(route) {
  if (!route) return null;
  return {
    u: numberValue(route.u, "route.u", 0, 1, 0.5),
    v: numberValue(route.v, "route.v", 0, 1, 0.5),
    bu: numberValue(route.bu, "route.bu", -0.2, 1.2, 0.5),
    bv: numberValue(route.bv, "route.bv", -0.2, 1.2, 0.5),
  };
}

function ensureCast(project, placement, index) {
  const name = stringValue(placement.assetName, `placements[${index}].assetName`, 24, true);
  let member = project.cast.find((item) => item.name === name);
  if (!member) {
    member = {
      id: uniqueNameId(project.cast, "cast", name),
      name,
      color: colorValue(placement.color, DEFAULT_COLORS[project.cast.length % DEFAULT_COLORS.length]),
      heightCm: numberValue(placement.heightCm, "heightCm", 120, 210, 165),
      note: stringValue(placement.assetNote, "assetNote", 200),
      locked: false,
    };
    project.cast.push(member);
  }
  return member;
}

function defaultDims(kind, placement) {
  const explicit = placement.dims && typeof placement.dims === "object" ? placement.dims : {};
  const presets = {
    block: { w: 1.2, d: 1.2, h: 0.6 },
    table: { w: 1.5, d: 0.8, h: 0.75 },
    chair: { w: 0.5, d: 0.5, h: 0.9 },
    bench: { w: 1.6, d: 0.55, h: 0.55 },
    stool: { w: 0.45, d: 0.45, h: 0.75 },
    wall: { w: 3, d: 0.3, h: 2.4 },
    sphere: { dia: 1, lift: 0 },
    trapeze: { w: 1.2, h: 1.2, lift: 3.5 },
    cyrwheel: { dia: 1.8, lift: 0 },
    pole: { dia: 0.12, h: 4, lift: 0 },
    teeter: { w: 3, d: 0.5, h: 0.6 },
    tissue: { w: 0.3, h: 5, lift: 3.5 },
    wire: { w: 5, h: 1.2, lift: 0 },
    suitcase: { w: 0.7, d: 0.25, h: 0.5 },
    trampoline: { w: 3, d: 2, h: 0.8 },
    cane: { w: 0.6, h: 1, lift: 0 },
    car: { w: 4.2, d: 1.8, h: 1.5 },
    light: { dia: 3, h: 6, toH: 0 },
  };
  const base = presets[kind] || {};
  const out = {};
  for (const [key, fallback] of Object.entries(base)) {
    const raw = explicit[key] === undefined ? fallback : explicit[key];
    out[key] = numberValue(raw, `dims.${key}`, 0, 60, fallback);
  }
  return out;
}

function ensureSet(project, placement, index) {
  const name = stringValue(placement.assetName, `placements[${index}].assetName`, 24, true);
  const kind = enumValue(placement.kind, SET_KINDS, "kind", "block");
  let item = project.sets.find((candidate) => candidate.name === name && candidate.kind === kind);
  if (!item) {
    item = {
      id: makeId("set"),
      kind,
      name,
      color: colorValue(placement.color, kind === "light" ? "#f0d58a" : "#8b98a1"),
      dims: defaultDims(kind, placement),
      note: stringValue(placement.assetNote, "assetNote", 200),
      locked: false,
      flown: Boolean(placement.flown || kind === "trapeze" || kind === "tissue"),
      wires: Number(placement.wires) === 1 ? 1 : 2,
      framed: Boolean(placement.framed),
      lightKind: kind === "light"
        ? enumValue(placement.lightKind, ["hang", "ss", "front", "floor"], "lightKind", "hang")
        : "hang",
    };
    project.sets.push(item);
  }
  return item;
}

function normalizePlacement(project, placement, index) {
  if (!placement || typeof placement !== "object") {
    fail(`placements[${index}]がオブジェクトではありません。`);
  }
  const assetType = enumValue(
    placement.assetType,
    ["performer", "set"],
    `placements[${index}].assetType`,
    "performer",
  );
  const asset = assetType === "performer"
    ? ensureCast(project, placement, index)
    : ensureSet(project, placement, index);
  const type = assetType === "performer" ? "performer" : asset.kind;
  return {
    id: makeId("piece"),
    type,
    u: numberValue(placement.u, "u", 0, 1, 0.5),
    v: numberValue(placement.v, "v", 0, 1, 0.6),
    size: numberValue(placement.size, "size", 55, 180, 100),
    color: colorValue(placement.color, asset.color),
    name: asset.name,
    castId: assetType === "performer" ? asset.id : null,
    setId: assetType === "set" ? asset.id : null,
    originId: typeof placement.originId === "string" ? placement.originId : null,
    facing: numberValue(placement.facing, "facing", 0, 359, 0),
    dims: assetType === "set" ? asset.dims : null,
    pose: assetType === "performer"
      ? enumValue(placement.pose, POSES, "pose", "stand")
      : "stand",
    route: normalizeRoute(placement.route),
    base: 0,
    supportId: null,
    beam: null,
    locked: false,
  };
}

export function normalizeSceneInput(project, raw, index = 0) {
  if (!raw || typeof raw !== "object") fail(`scenes[${index}]がオブジェクトではありません。`);
  const placements = Array.isArray(raw.placements) ? raw.placements : [];
  if (placements.length > 80) fail("一場面の配置は80個までです。");
  const kind = raw.kind === "section" ? "section" : "scene";
  return {
    id: typeof raw.id === "string" ? assertId(raw.id, "scene.id") : makeId("scene"),
    kind,
    depth: numberValue(raw.depth, "depth", 0, 4, 0),
    title: stringValue(raw.title, `scenes[${index}].title`, 80, true),
    studyBeatId: raw.studyBeatId
      ? stringValue(raw.studyBeatId, "studyBeatId", 64, true)
      : null,
    note: stringValue(raw.note, `scenes[${index}].note`, 2000),
    background: colorValue(raw.background, "#40362d"),
    notes: [],
    pieces: raw.kind === "section"
      ? []
      : placements.map((placement, placementIndex) =>
          normalizePlacement(project, placement, placementIndex)),
    strokes: [],
    beat: kind === "scene" ? normalizeSceneBeat(raw.beat, `scenes[${index}]`) : null,
    rehearsal: kind === "scene"
      ? normalizeSceneRehearsal(raw.rehearsal, `scenes[${index}]`)
      : null,
  };
}

export function createProjectDocument(input) {
  const now = new Date().toISOString();
  const project = {
    id: input.projectId ? assertId(input.projectId, "projectId") : makeId("proj"),
    title: stringValue(input.title, "title", 60, true),
    versionLabel: stringValue(input.versionLabel || "AI下書き v1", "versionLabel", 32, true),
    parentVersionId: null,
    branchReason: stringValue(input.branchReason || "", "branchReason", 300),
    createdAt: now,
    sceneStudyId: null,
    sceneStudySourceVersion: null,
    venue: enumValue(input.venue, VENUES, "venue", "proscenium"),
    venueSize: enumValue(input.venueSize, VENUE_SIZES, "venueSize", "mid"),
    venueDims: null,
    rehearsal: normalizeProjectRehearsal(input.rehearsal),
    cast: [],
    sets: [],
    rigs: [],
    scenes: [],
    activeSceneId: null,
  };
  const scenes = Array.isArray(input.scenes) ? input.scenes : [];
  if (scenes.length > 60) fail("一つのプロジェクトは60場面までです。");
  project.scenes = scenes.map((scene, index) => normalizeSceneInput(project, scene, index));
  if (!project.scenes.some((scene) => scene.kind === "scene")) {
    project.scenes.push(normalizeSceneInput(project, { title: "場面 1" }, project.scenes.length));
  }
  project.activeSceneId = project.scenes.find((scene) => scene.kind === "scene").id;
  return {
    kind: "shosai-stage-sketch",
    version: 3,
    mcpMeta: {
      status: "draft",
      revision: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: "stage-sketch-mcp",
      sourcePrompt: stringValue(input.sourcePrompt || "", "sourcePrompt", 4000),
    },
    project,
  };
}

export function summarizeDocument(document) {
  const project = document.project;
  return {
    projectId: project.id,
    title: project.title,
    versionLabel: project.versionLabel,
    revision: document.mcpMeta?.revision || 1,
    status: document.mcpMeta?.status || "draft",
    venue: project.venue,
    venueSize: project.venueSize,
    sceneCount: project.scenes.filter((scene) => scene.kind === "scene").length,
    sectionCount: project.scenes.filter((scene) => scene.kind === "section").length,
    castCount: project.cast.length,
    setCount: project.sets.length,
    updatedAt: document.mcpMeta?.updatedAt || project.createdAt,
  };
}

export function validateDocument(document) {
  const errors = [];
  const warnings = [];
  const project = document?.project;
  if (!document || document.kind !== "shosai-stage-sketch" || document.version !== 3) {
    errors.push("舞台スケッチ version 3 のJSONではありません。");
  }
  if (!project || !Array.isArray(project.scenes)) {
    errors.push("project.scenesがありません。");
    return { valid: false, errors, warnings };
  }
  const castIds = new Set((project.cast || []).map((item) => item.id));
  const setIds = new Set((project.sets || []).map((item) => item.id));
  const highRisk = new Set();
  for (const scene of project.scenes) {
    if (scene.kind !== "scene") continue;
    for (const piece of scene.pieces || []) {
      if (piece.castId && !castIds.has(piece.castId)) {
        errors.push(`${scene.title}: 演者参照 ${piece.castId} が名簿にありません。`);
      }
      if (piece.setId && !setIds.has(piece.setId)) {
        errors.push(`${scene.title}: セット参照 ${piece.setId} が舞台セットにありません。`);
      }
      if (HIGH_RISK_KINDS.has(piece.type)) highRisk.add(piece.type);
      if (piece.route) {
        warnings.push(`${scene.title}: 動線は演出検討用で、衝突しないことを保証しません。`);
      }
    }
  }
  for (const item of project.sets || []) {
    if (HIGH_RISK_KINDS.has(item.kind) || item.flown) highRisk.add(item.kind);
  }
  if (highRisk.size) {
    warnings.push(
      `専門家確認が必要な候補を含みます: ${[...highRisk].join(", ")}。` +
      "MCPとAIはリギング、荷重、落下防止、救助手順、演者の安全を承認しません。",
    );
  }
  if (!project.scenes.some((scene) => scene.kind === "scene")) {
    errors.push("実際の場面が一つもありません。");
  }
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}

export function appendScenes(document, input) {
  const project = document.project;
  const incoming = input.scenes || [];
  if (!incoming.length) fail("追加するscenesを1件以上指定してください。");
  if (project.scenes.length + incoming.length > 60) fail("一つのプロジェクトは60場面までです。");
  const normalized = incoming.map((scene, index) => normalizeSceneInput(project, scene, index));
  let insertAt = project.scenes.length;
  if (input.afterSceneId) {
    const index = project.scenes.findIndex((scene) => scene.id === input.afterSceneId);
    if (index < 0) fail(`afterSceneId ${input.afterSceneId} が見つかりません。`);
    insertAt = index + 1;
  }
  project.scenes.splice(insertAt, 0, ...normalized);
  if (!project.activeSceneId) {
    project.activeSceneId = normalized.find((scene) => scene.kind === "scene")?.id || null;
  }
  return normalized.map((scene) => ({ id: scene.id, title: scene.title, kind: scene.kind }));
}

export function updateScene(document, input) {
  const project = document.project;
  const scene = project.scenes.find((item) => item.id === input.sceneId);
  if (!scene) fail(`sceneId ${input.sceneId} が見つかりません。`);
  if (input.title !== undefined) scene.title = stringValue(input.title, "title", 80, true);
  if (input.note !== undefined) scene.note = stringValue(input.note, "note", 2000);
  if (input.background !== undefined) scene.background = colorValue(input.background, scene.background);
  if (input.depth !== undefined) scene.depth = numberValue(input.depth, "depth", 0, 4, scene.depth);
  if (input.studyBeatId !== undefined) {
    scene.studyBeatId = input.studyBeatId
      ? stringValue(input.studyBeatId, "studyBeatId", 64, true)
      : null;
  }
  if (input.beat !== undefined) {
    if (scene.kind === "section") fail("セクションにはビートを設定できません。");
    scene.beat = normalizeSceneBeat(input.beat, "scene");
  }
  if (input.rehearsal !== undefined) {
    if (scene.kind === "section") fail("セクションには稽古時間を設定できません。");
    scene.rehearsal = normalizeSceneRehearsal(input.rehearsal, "scene");
  }
  if (input.placements !== undefined) {
    if (scene.kind === "section") fail("セクションには配置を追加できません。");
    if (!Array.isArray(input.placements) || input.placements.length > 80) {
      fail("placementsは80件以内の配列にしてください。");
    }
    const next = input.placements.map((placement, index) =>
      normalizePlacement(project, placement, index));
    scene.pieces = input.placementMode === "append" ? [...scene.pieces, ...next] : next;
    if (scene.pieces.length > 80) fail("一場面の配置は80個までです。");
  }
  return { id: scene.id, title: scene.title, pieceCount: scene.pieces.length };
}

export const GUIDE = {
  role: "このMCPはAIモデルではなく、Codex/Claude Codeが舞台スケッチJSONを操作する共通の道具です。",
  workflow: [
    "stage_sketch_create_project_draftでAI案を下書きにする",
    "stage_sketch_read_projectとstage_sketch_inspect_projectで人間が内容を確認する",
    "必要ならstage_sketch_add_scenesまたはstage_sketch_update_sceneで修正する",
    "stage_sketch_prepare_importで読み込み用JSONを作る",
    "本人が舞台スケッチの「読み込む」から選び、初めてブラウザ内のショーへ反映する",
  ],
  coordinates: {
    u: "0=画像の左、1=画像の右（客席から見た左右）",
    v: "0=舞台奥、1=舞台前",
    warning: "上手・下手は話者で混乱しやすいため、MCP入力では画像の左/右とu値を優先する。",
  },
  boundaries: [
    "研究DBは読み書きしない。",
    "ブラウザのlocalStorageへ直接書き込まない。",
    "削除ツールを公開しない。",
    "以前の版をhistoryへ残し、expectedRevisionで同時編集の上書きを防ぐ。",
    "動線・空中・サーカス装置は演出上の仮説であり、安全性を保証しない。",
  ],
  venues: VENUES,
  venueSizes: VENUE_SIZES,
  setKinds: SET_KINDS,
  poses: POSES,
};

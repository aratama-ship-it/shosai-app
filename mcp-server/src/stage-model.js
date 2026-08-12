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
  "suitcase", "trampoline", "cane", "car", "seri", "light",
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
export const PIECE_PALETTE = [
  "#a84b26", "#efe7d6", "#77865f", "#8b98a1", "#d3ac59", "#6d6657",
];

const SET_KIND_NAMES = {
  ja: {
    block: "台・箱", table: "テーブル", chair: "椅子", bench: "ベンチ",
    stool: "スツール", wall: "壁", sphere: "球", trapeze: "トラピーズ",
    cyrwheel: "シルホイール", pole: "チャイニーズポール", teeter: "ティーターボード",
    tissue: "エアリアルティシュー", wire: "綱渡り", suitcase: "スーツケース",
    trampoline: "トランポリン", cane: "ハンドバランス用cane", car: "車",
    seri: "せり", light: "照明",
  },
  en: {
    block: "Platform / box", table: "Table", chair: "Chair", bench: "Bench",
    stool: "Stool", wall: "Wall", sphere: "Sphere", trapeze: "Trapeze",
    cyrwheel: "Cyr wheel", pole: "Chinese pole", teeter: "Teeterboard",
    tissue: "Aerial silks", wire: "Tightwire", suitcase: "Suitcase",
    trampoline: "Trampoline", cane: "Handbalancing canes", car: "Car",
    seri: "Stage lift", light: "Light",
  },
};

const MANUAL_DIMS = {
  block: { w: 2.04, d: 0.66, h: 1.2 },
  table: { w: 1.6, d: 0.8, h: 0.72 },
  chair: { h: 0.9 },
  bench: { w: 1.8, d: 0.4, h: 0.45 },
  stool: { w: 0.36, d: 0.36, h: 0.62 },
  wall: { w: 3, d: 0.3, h: 2.5 },
  sphere: { dia: 1.2, lift: 0 },
  trapeze: { w: 0.7, d: 0.06, h: 0.06 },
  cyrwheel: { dia: 1.9 },
  pole: { w: 0.05, d: 0.05, h: 6 },
  teeter: { w: 3.6, d: 0.45, h: 0.75 },
  tissue: { w: 0.3, d: 0.06, h: 7 },
  wire: { w: 6, d: 0.06, h: 1.2 },
  suitcase: { w: 0.62, d: 0.24, h: 0.44 },
  trampoline: { w: 3.05, d: 1.7, h: 0.95 },
  cane: { w: 0.5, d: 0.3, h: 0.75 },
  car: { w: 4.3, d: 1.8, h: 1.45 },
  seri: { w: 2.7, d: 1.8 },
  light: { dia: 4 },
};

const SOLID_KINDS = new Set([
  "block", "table", "chair", "bench", "stool", "wall", "trapeze", "cyrwheel",
  "pole", "teeter", "tissue", "wire", "suitcase", "trampoline", "cane", "car", "seri",
]);

const LIGHT_DEFAULTS = {
  hang: { dia: 4, h: 6, toH: 0 },
  ss: { dia: 2.6, h: 1.7, toH: 1.3 },
  front: { dia: 3.4, h: 8, toH: 1.5 },
  floor: { dia: 3, h: 0.18, toH: 1.6 },
};

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

const LIGHTING_LAYER_VALUES = [
  "unspecified", "reveal", "soften", "conceal", "silhouette", "separate", "transform",
];
const LIGHTING_TRIGGER_VALUES = [
  "unknown", "scene-start", "action", "line", "music", "time", "manual",
];
const LIGHTING_CHANGE_VALUES = [
  "unknown", "hold", "fade-in", "fade-out", "snap", "crossfade", "blackout",
];
const LIGHTING_TEMPO_VALUES = [
  "unspecified", "instant", "quick", "breathe", "slow", "hold",
];

export function normalizeLightingIntent(raw, label = "lightingIntent") {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) fail(`${label}はオブジェクトにしてください。`);
  if (raw.safetyStatus !== undefined && raw.safetyStatus !== "not-assessed") {
    fail(`${label}.safetyStatusはnot-assessedのみ指定できます。`);
  }
  const layerInput = raw.layers && typeof raw.layers === "object" && !Array.isArray(raw.layers)
    ? raw.layers : {};
  const layer = (key) => {
    const source = layerInput[key] && typeof layerInput[key] === "object"
      && !Array.isArray(layerInput[key]) ? layerInput[key] : {};
    return {
      intent: enumValue(source.intent, LIGHTING_LAYER_VALUES, `${label}.layers.${key}.intent`, "unspecified"),
      note: stringValue(source.note, `${label}.layers.${key}.note`, 160),
    };
  };
  const transitionInput = raw.transition && typeof raw.transition === "object"
    && !Array.isArray(raw.transition) ? raw.transition : {};
  const sourceRefs = Array.isArray(raw.sourceRefs) ? raw.sourceRefs.map((source, index) => {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      fail(`${label}.sourceRefs[${index}]はオブジェクトにしてください。`);
    }
    return {
      kind: enumValue(source.kind, ["book", "research", "user"], `${label}.sourceRefs[${index}].kind`, "research"),
      label: stringValue(source.label, `${label}.sourceRefs[${index}].label`, 120, true),
      locator: stringValue(source.locator, `${label}.sourceRefs[${index}].locator`, 200),
    };
  }) : [];
  if (sourceRefs.length > 8) fail(`${label}.sourceRefsは8件以内にしてください。`);
  const next = {
    version: 1,
    objective: stringValue(raw.objective, `${label}.objective`, 160),
    audienceFocus: stringValue(raw.audienceFocus, `${label}.audienceFocus`, 160),
    layers: {
      performer: layer("performer"),
      background: layer("background"),
      space: layer("space"),
    },
    transition: {
      triggerType: enumValue(
        transitionInput.triggerType,
        LIGHTING_TRIGGER_VALUES,
        `${label}.transition.triggerType`,
        "unknown",
      ),
      triggerNote: stringValue(transitionInput.triggerNote, `${label}.transition.triggerNote`, 160),
      change: enumValue(
        transitionInput.change,
        LIGHTING_CHANGE_VALUES,
        `${label}.transition.change`,
        "unknown",
      ),
      tempo: enumValue(
        transitionInput.tempo,
        LIGHTING_TEMPO_VALUES,
        `${label}.transition.tempo`,
        "unspecified",
      ),
    },
    mood: stringValue(raw.mood, `${label}.mood`, 80),
    referenceNote: stringValue(raw.referenceNote, `${label}.referenceNote`, 200),
    implementationNote: stringValue(raw.implementationNote, `${label}.implementationNote`, 300),
    safetyStatus: "not-assessed",
    sourceRefs,
  };
  const layerContent = Object.values(next.layers).some((item) => (
    item.intent !== "unspecified" || Boolean(item.note)
  ));
  const transitionContent = next.transition.triggerType !== "unknown"
    || next.transition.change !== "unknown"
    || next.transition.tempo !== "unspecified"
    || Boolean(next.transition.triggerNote);
  const textContent = Boolean(next.objective || next.audienceFocus || next.mood
    || next.referenceNote || next.implementationNote || next.sourceRefs.length);
  return layerContent || transitionContent || textContent ? next : null;
}

function uniqueNameId(list, prefix, name) {
  const existing = list.find((item) => item.name === name);
  return existing?.id || makeId(prefix);
}

function nextPieceColor(index) {
  return PIECE_PALETTE[((index % PIECE_PALETTE.length) + PIECE_PALETTE.length)
    % PIECE_PALETTE.length];
}

function autoPlacementName(project, assetType, kind, language) {
  const selectedLanguage = language === "en" ? "en" : "ja";
  const base = assetType === "performer"
    ? (selectedLanguage === "en" ? "Performer" : "演者")
    : SET_KIND_NAMES[selectedLanguage][kind];
  const head = String(base).split(/[・/]/)[0].trim() || base;
  const used = new Set([
    ...(project.cast || []).map((item) => item.name),
    ...(project.sets || []).map((item) => item.name),
  ]);
  const join = (number) => selectedLanguage === "en"
    ? `${head} ${number}`
    : `${head}${number}`;
  let number = 1;
  while (used.has(join(number))) number += 1;
  return join(number);
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
      color: colorValue(placement.color, nextPieceColor(project.cast.length)),
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
  const base = MANUAL_DIMS[kind] || {};
  const out = {};
  for (const [key, fallback] of Object.entries(base)) {
    const raw = explicit[key] === undefined ? fallback : explicit[key];
    out[key] = numberValue(raw, `dims.${key}`, 0, 60, fallback);
  }
  if (SOLID_KINDS.has(kind) && kind !== "seri" && out.lift === undefined) {
    out.lift = numberValue(explicit.lift, "dims.lift", 0, 60, 0);
  }
  if (kind === "light") {
    const lightKind = enumValue(
      placement.lightKind,
      ["hang", "ss", "front", "floor"],
      "lightKind",
      "hang",
    );
    out.dia = numberValue(explicit.dia, "dims.dia", 0, 60, LIGHT_DEFAULTS[lightKind].dia);
  }
  if (kind === "trapeze" && explicit.lift === undefined) out.lift = 2.6;
  if (kind === "tissue" && explicit.lift === undefined) out.lift = 7.4;
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
      color: colorValue(
        placement.color,
        kind === "light" ? "#d3ac59" : nextPieceColor(project.sets.length + 2),
      ),
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

export function placementWithDefaults(project, scene, placement, index = 0) {
  if (!placement || typeof placement !== "object") {
    fail(`placements[${index}]がオブジェクトではありません。`);
  }
  const assetType = enumValue(
    placement.assetType,
    ["performer", "set"],
    `placements[${index}].assetType`,
    "performer",
  );
  const language = enumValue(placement.language, ["ja", "en"], "language", "ja");
  const kind = assetType === "set"
    ? enumValue(placement.kind, SET_KINDS, "kind", "block")
    : undefined;
  const explicitName = stringValue(
    placement.assetName,
    `placements[${index}].assetName`,
    24,
  );
  const assetName = explicitName || autoPlacementName(project, assetType, kind, language);
  const existing = assetType === "performer"
    ? project.cast.find((item) => item.name === assetName)
    : project.sets.find((item) => item.name === assetName && item.kind === kind);
  const pieces = Array.isArray(scene?.pieces) ? scene.pieces : [];
  const count = pieces.filter((piece) => assetType === "performer"
    ? piece.type === "performer"
    : piece.type !== "performer").length;
  const fallbackColor = existing?.color || (assetType === "performer"
    ? nextPieceColor(project.cast.length)
    : kind === "light" ? "#d3ac59" : nextPieceColor(project.sets.length + 2));
  const normalized = {
    ...placement,
    assetType,
    assetName,
    language,
    u: numberValue(
      placement.u,
      "u",
      0,
      1,
      assetType === "performer"
        ? clamp(0.5 + ((count % 5) - 2) * 0.09, 0.06, 0.94)
        : clamp(0.5 + ((count % 5) - 2) * 0.11, 0.06, 0.94),
    ),
    v: numberValue(
      placement.v,
      "v",
      0,
      1,
      assetType === "performer"
        ? clamp(0.6 + (count % 3) * 0.07, 0.05, 0.95)
        : clamp(0.5 + (count % 3) * 0.09, 0.05, 0.95),
    ),
    size: numberValue(placement.size, "size", 55, 180, 100),
    color: colorValue(placement.color, fallbackColor),
    facing: numberValue(placement.facing, "facing", 0, 359, 0),
  };
  if (assetType === "performer") {
    normalized.pose = enumValue(placement.pose, POSES, "pose", "stand");
    normalized.heightCm = numberValue(placement.heightCm, "heightCm", 120, 210, 165);
  } else {
    normalized.kind = kind;
    normalized.dims = defaultDims(kind, placement);
    normalized.flown = Boolean(placement.flown || kind === "trapeze" || kind === "tissue");
    normalized.wires = Number(placement.wires) === 1 ? 1 : 2;
    normalized.framed = Boolean(placement.framed);
    normalized.lightKind = kind === "light"
      ? enumValue(placement.lightKind, ["hang", "ss", "front", "floor"], "lightKind", "hang")
      : "hang";
  }
  return normalized;
}

function normalizePlacement(project, scene, placement, index) {
  const normalized = placementWithDefaults(project, scene, placement, index);
  const assetType = normalized.assetType;
  const asset = assetType === "performer"
    ? ensureCast(project, normalized, index)
    : ensureSet(project, normalized, index);
  const type = assetType === "performer" ? "performer" : asset.kind;
  let beam = null;
  if (type === "light") {
    const spec = LIGHT_DEFAULTS[asset.lightKind];
    const sourceU = asset.lightKind === "ss"
      ? (normalized.u <= 0.5 ? -0.06 : 1.06)
      : normalized.u;
    const sourceV = asset.lightKind === "front"
      ? 1.35
      : asset.lightKind === "floor" ? 1 : normalized.v;
    beam = { u: sourceU, v: sourceV, h: spec.h, toH: spec.toH };
  }
  return {
    id: makeId("piece"),
    type,
    u: normalized.u,
    v: normalized.v,
    size: normalized.size,
    color: normalized.color,
    name: asset.name,
    castId: assetType === "performer" ? asset.id : null,
    setId: assetType === "set" ? asset.id : null,
    originId: typeof placement.originId === "string" ? placement.originId : null,
    facing: normalized.facing,
    dims: assetType === "set" ? asset.dims : null,
    pose: assetType === "performer"
      ? normalized.pose
      : "stand",
    route: normalizeRoute(normalized.route),
    base: 0,
    supportId: null,
    beam,
    locked: false,
  };
}

function normalizePlacements(project, scene, placements) {
  const next = [];
  for (let index = 0; index < placements.length; index += 1) {
    const workingScene = { pieces: [...(scene?.pieces || []), ...next] };
    next.push(normalizePlacement(project, workingScene, placements[index], index));
  }
  return next;
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
    pieces: raw.kind === "section" ? [] : normalizePlacements(project, null, placements),
    strokes: [],
    beat: kind === "scene" ? normalizeSceneBeat(raw.beat, `scenes[${index}]`) : null,
    rehearsal: kind === "scene"
      ? normalizeSceneRehearsal(raw.rehearsal, `scenes[${index}]`)
      : null,
    lightingIntent: kind === "scene"
      ? normalizeLightingIntent(raw.lightingIntent, `scenes[${index}].lightingIntent`)
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
  if (input.lightingIntent !== undefined) {
    if (scene.kind === "section") fail("セクションには光の意図を設定できません。");
    scene.lightingIntent = normalizeLightingIntent(input.lightingIntent, "scene.lightingIntent");
  }
  if (input.placements !== undefined) {
    if (scene.kind === "section") fail("セクションには配置を追加できません。");
    if (!Array.isArray(input.placements) || input.placements.length > 80) {
      fail("placementsは80件以内の配列にしてください。");
    }
    const baseScene = input.placementMode === "append" ? scene : null;
    const next = normalizePlacements(project, baseScene, input.placements);
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
  planEditExample: {
    projectId: "sample-show",
    expectedRevision: 1,
    request: "第1場面に演者を1人追加する",
    operations: [{
      op: "add_placement",
      sceneId: "scene-1",
      placement: {
        assetType: "performer",
        assetName: "演者1",
        language: "ja",
        u: 0.5,
        v: 0.6,
        size: 100,
        color: "#a84b26",
        facing: 0,
        pose: "stand",
        heightCm: 165,
      },
    }],
  },
  defaults: {
    policy: "指示にない値は手動追加と同じ既定値で埋めて配置する。情報不足だけでは質問しない。既存資産が同名で複数あり、取り違えると既存配置を壊す場合だけ質問する。",
    naming: {
      ja: "演者1、演者2のように種類名と数字を詰め、castとsetsを通じて重複しない最小番号を使う。",
      en: "Performer 1, Performer 2のように種類名と数字の間を空け、castとsetsを通じて重複しない最小番号を使う。placement.language=enで英語名にする。",
      set: "セットは種類名を基に同じ規則で命名する。kind省略時はblock（台1 / Platform 1）。",
    },
    performer: {
      position: "その場面のperformer数をcountとして u=clamp(0.5+((count%5)-2)*0.09,0.06,0.94), v=clamp(0.6+(count%3)*0.07,0.05,0.95)",
      size: 100,
      heightCm: 165,
      pose: "stand",
      facing: 0,
      color: "nextPieceColor(cast.length)",
    },
    set: {
      position: "その場面のperformer以外の数をcountとして u=clamp(0.5+((count%5)-2)*0.11,0.06,0.94), v=clamp(0.5+(count%3)*0.09,0.05,0.95)",
      size: 100,
      facing: 0,
      color: "lightは#d3ac59。それ以外はnextPieceColor(sets.length+2)。寸法・吊物・照明ビームも手動追加と同じ種類別既定値。",
    },
    palette: PIECE_PALETTE,
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

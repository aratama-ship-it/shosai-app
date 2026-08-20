import {
  HIGH_RISK_KINDS,
  appendScenes,
  makeId,
  placementWithDefaults,
  updateScene,
  validateDocument,
} from "./stage-model.js";

function clone(value) {
  return structuredClone(value);
}

function assetTypeLabel(assetType) {
  return assetType === "performer" ? "演者" : "セット";
}

function assetsFor(project, assetType) {
  return assetType === "performer" ? project.cast : project.sets;
}

function assetIdForPiece(piece, assetType) {
  return assetType === "performer" ? piece.castId : piece.setId;
}

function assetScenes(project, assetType, assetId) {
  return project.scenes
    .filter((scene) => scene.kind === "scene"
      && scene.pieces.some((piece) => assetIdForPiece(piece, assetType) === assetId))
    .map((scene) => scene.title);
}

function candidateText(project, assetType, asset) {
  const kind = assetType === "performer" ? "演者" : `セット(${asset.kind})`;
  const scenes = assetScenes(project, assetType, asset.id);
  return `${asset.name} / ${kind} / 登場場面: ${scenes.join("、") || "なし"}`;
}

function resolutionFor(resolutions, reference, matches) {
  const resolution = resolutions.find((item) => item
    && item.assetType === reference.assetType
    && item.assetName === reference.assetName
    && matches.some((asset) => asset.id === item.assetId));
  return resolution || null;
}

function pushClarification(project, reference, questions, clarifications, label, matches) {
  const candidates = matches
    .map((asset) => candidateText(project, reference.assetType, asset));
  const text = `${label}「${reference.assetName}」は${matches.length}件に一致しました。` +
    `名前を特定してください。候補: ${candidates.join(" / ") || "候補なし"}`;
  questions.push(text);
  clarifications.push({
    id: `clarify-${clarifications.length + 1}`,
    assetType: reference.assetType,
    assetName: reference.assetName,
    text,
    options: matches.map((asset, index) => ({
      assetId: asset.id,
      label: candidates[index],
    })),
  });
}

function resolveAsset(project, reference, questions, clarifications, resolutions, label) {
  const assets = assetsFor(project, reference.assetType);
  if (reference.assetId) {
    const asset = assets.find((item) => item.id === reference.assetId);
    if (!asset) {
      throw new Error(
        `${label}のassetId ${reference.assetId} が${assetTypeLabel(reference.assetType)}に見つかりません。`,
      );
    }
    return asset;
  }

  const matches = assets.filter((item) => item.name === reference.assetName);
  if (matches.length === 1) return matches[0];

  if (!matches.length) {
    throw new Error(
      `${label}「${reference.assetName}」は既存の${assetTypeLabel(reference.assetType)}に見つかりません。`,
    );
  }

  const resolution = resolutionFor(resolutions, reference, matches);
  if (resolution) return matches.find((asset) => asset.id === resolution.assetId);

  pushClarification(project, reference, questions, clarifications, label, matches);
  return null;
}

function sceneOrThrow(project, sceneId) {
  const scene = project.scenes.find((item) => item.id === sceneId);
  if (!scene) throw new Error(`sceneId ${sceneId} が見つかりません。`);
  return scene;
}

function positionLabel(value, low, high) {
  if (value < 0.34) return low;
  if (value > 0.66) return high;
  return "中央";
}

const POSE_LABELS = {
  stand: "立ち",
  walk: "歩行",
  reach: "手を伸ばす",
  open: "開く",
  sit: "座る",
  crouch: "しゃがむ",
  kneel: "膝立ち",
  handstand: "倒立",
  lie_back: "仰向け",
  lie_front: "うつ伏せ",
  lie_side: "横向き",
};

const PLACEMENT_FIELD_LABELS = {
  u: "左右位置",
  v: "奥行位置",
  size: "大きさ",
  color: "色",
  facing: "向き",
  pose: "姿勢",
  heightCm: "身長",
  assetNote: "資産メモ",
  route: "動線",
};

const SCENE_FIELD_LABELS = {
  title: "場面名",
  note: "メモ",
  background: "背景",
  beat: "ビート",
  rehearsal: "稽古時間",
  lightingIntent: "光の意図",
};

function shortText(value, max = 80) {
  const text = String(value || "").replaceAll("\n", " ");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function pieceText(piece) {
  const type = piece.castId ? "演者" : piece.type === "light" ? "照明" : "セット";
  const horizontal = positionLabel(piece.u, "左寄り", "右寄り");
  const depth = positionLabel(piece.v, "奥", "前");
  const detail = piece.castId
    ? `${horizontal}・${depth}、${piece.facing}度、${POSE_LABELS[piece.pose] || "姿勢未設定"}`
    : `${horizontal}・${depth}`;
  return `${type}「${piece.name}」（${detail}）`;
}

function sceneSnapshot(scene) {
  if (!scene) return ["（場面なし）"];
  const rows = [`場面名: ${scene.title}`];
  if (scene.note) rows.push(`メモ: ${shortText(scene.note)}`);
  if (scene.lightingIntent) {
    const light = scene.lightingIntent;
    if (light.objective) rows.push(`光の目的: ${shortText(light.objective)}`);
    if (light.audienceFocus) rows.push(`光の観客視線: ${shortText(light.audienceFocus)}`);
    for (const [key, label] of [["performer", "演者"], ["space", "空間"], ["background", "背景"]]) {
      const layer = light.layers?.[key];
      if (layer && (layer.intent !== "unspecified" || layer.note)) {
        rows.push(`光の${label}: ${layer.intent || "unspecified"}${layer.note ? ` — ${shortText(layer.note)}` : ""}`);
      }
    }
    const transition = light.transition;
    if (transition && (transition.triggerType !== "unknown" || transition.change !== "unknown"
      || transition.tempo !== "unspecified" || transition.triggerNote)) {
      rows.push(`光の変化: ${transition.triggerType || "unknown"} / ${transition.change || "unknown"}`
        + ` / ${transition.tempo || "unspecified"}${transition.triggerNote ? ` — ${shortText(transition.triggerNote)}` : ""}`);
    }
    if (light.mood) rows.push(`光の質感: ${shortText(light.mood)}`);
    if (light.referenceNote) rows.push(`光の参照: ${shortText(light.referenceNote)}`);
    if (light.implementationNote) rows.push(`光の実装候補（未承認）: ${shortText(light.implementationNote)}`);
    rows.push("光の安全状態: not-assessed");
  }
  rows.push(`背景: ${scene.background}`);
  for (const piece of scene.pieces || []) rows.push(pieceText(piece));
  if (!(scene.pieces || []).length) rows.push("配置なし");
  return rows;
}

function lightingIntentDiffLines(before, after) {
  if (!before && !after) return [];
  if (before && !after) return ["光の意図を削除。前版は履歴に残します。"];
  if (!before && after) return ["光の意図を追加。安全状態はnot-assessedです。"];
  const lines = [];
  const compare = (label, from, to) => {
    const rawLeft = String(from || "（未設定）");
    const rawRight = String(to || "（未設定）");
    if (rawLeft !== rawRight) {
      const left = shortText(rawLeft, 60);
      const right = shortText(rawRight, 60);
      lines.push(`光の意図・${label}: ${left} → ${right}`);
    }
  };
  compare("目的", before.objective, after.objective);
  compare("観客の視線", before.audienceFocus, after.audienceFocus);
  for (const [key, label] of [["performer", "演者"], ["space", "空間"], ["background", "背景"]]) {
    const from = before.layers?.[key] || {};
    const to = after.layers?.[key] || {};
    compare(label, `${from.intent || "unspecified"}${from.note ? ` — ${from.note}` : ""}`,
      `${to.intent || "unspecified"}${to.note ? ` — ${to.note}` : ""}`);
  }
  const transitionText = (intent) => {
    const value = intent.transition || {};
    return `${value.triggerType || "unknown"} / ${value.change || "unknown"} / ${value.tempo || "unspecified"}`
      + `${value.triggerNote ? ` — ${value.triggerNote}` : ""}`;
  };
  compare("変化", transitionText(before), transitionText(after));
  compare("雰囲気", before.mood, after.mood);
  compare("参照", before.referenceNote, after.referenceNote);
  compare("実装候補（未承認）", before.implementationNote, after.implementationNote);
  const beforeRefs = JSON.stringify(before.sourceRefs || []);
  const afterRefs = JSON.stringify(after.sourceRefs || []);
  if (beforeRefs !== afterRefs) lines.push("光の意図・参照元を更新。");
  return lines;
}

function createContext(document) {
  return {
    document,
    beforeByScene: new Map(),
    affectedSceneIds: [],
    linesByScene: new Map(),
    forcedUpdatePieceIds: new Set(),
    questions: [],
    clarifications: [],
    resolutions: [],
    riskKinds: new Set(),
  };
}

function touchScene(context, scene, before = scene) {
  if (!context.beforeByScene.has(scene.id)) {
    context.beforeByScene.set(scene.id, before ? clone(before) : null);
    context.affectedSceneIds.push(scene.id);
    context.linesByScene.set(scene.id, []);
  }
}

function addLine(context, sceneId, line) {
  context.linesByScene.get(sceneId).push(line);
}

function recordRisk(context, asset) {
  if (asset?.kind && (HIGH_RISK_KINDS.has(asset.kind) || asset.flown)) {
    context.riskKinds.add(asset.kind);
  }
}

function riskWarning(riskKinds) {
  if (!riskKinds.size) return null;
  return `専門家確認が必要な候補を含みます: ${[...riskKinds].join(", ")}。` +
    "MCPとAIはリギング、荷重、落下防止、救助手順、演者の安全を承認しません。";
}

function selectedPieces(scene, assetType, assetId, occurrence) {
  const matches = [];
  for (let index = 0; index < scene.pieces.length; index += 1) {
    if (assetIdForPiece(scene.pieces[index], assetType) === assetId) matches.push(index);
  }
  if (!matches.length) return [];
  if (occurrence === undefined) return matches;
  return matches[occurrence - 1] === undefined ? [] : [matches[occurrence - 1]];
}

function assertSelected(scene, reference, indices) {
  if (indices.length) return;
  const occurrence = reference.occurrence ? `（${reference.occurrence}件目）` : "";
  throw new Error(`${scene.title}: 対象${occurrence}が場面内に見つかりません。`);
}

function replacedPiece(piece, assetType, asset, preservePlacement) {
  const references = assetType === "performer"
    ? { type: "performer", castId: asset.id, setId: null, dims: null }
    : { type: asset.kind, castId: null, setId: asset.id, dims: clone(asset.dims) };
  if (preservePlacement !== false) {
    return {
      ...piece,
      ...references,
      name: asset.name,
      pose: assetType === "performer" ? piece.pose : "stand",
    };
  }
  return {
    ...piece,
    ...references,
    name: asset.name,
    u: 0.5,
    v: 0.6,
    size: 100,
    color: asset.color,
    facing: 0,
    pose: "stand",
    route: null,
  };
}

function replaceInScene(context, scene, fromAsset, toAsset, operation) {
  const indices = selectedPieces(scene, operation.from.assetType, fromAsset.id);
  assertSelected(scene, operation.from, indices);
  touchScene(context, scene);
  for (const index of indices) {
    scene.pieces[index] = replacedPiece(
      scene.pieces[index],
      operation.to.assetType,
      toAsset,
      operation.preservePlacement,
    );
  }
  recordRisk(context, fromAsset);
  recordRisk(context, toAsset);
  const count = indices.length > 1 ? `${indices.length}件を` : "";
  const placement = operation.preservePlacement === false
    ? "配置は既定値へ戻します。"
    : "位置・向き・大きさ・色・動線は維持します。";
  addLine(context, scene.id, `${fromAsset.name} → ${toAsset.name} に${count}置換。${placement}`);
}

function normalizeOperations(operations) {
  return operations.map((operation) => {
    const normalized = clone(operation);
    if (normalized.op === "add_scene" && !normalized.scene.id) {
      normalized.scene.id = makeId("scene");
    }
    if ((normalized.op === "replace_scene_asset"
      || normalized.op === "replace_asset_across_scenes")
      && normalized.preservePlacement === undefined) {
      normalized.preservePlacement = true;
    }
    return normalized;
  });
}

function normalizedOperationPlacement(project, piece, original = {}) {
  const assetType = piece.castId ? "performer" : "set";
  const asset = assetsFor(project, assetType)
    .find((item) => item.id === assetIdForPiece(piece, assetType));
  const normalized = {
    ...original,
    assetType,
    assetName: asset.name,
    language: original.language === "en" ? "en" : "ja",
    u: piece.u,
    v: piece.v,
    size: piece.size,
    color: piece.color,
    facing: piece.facing,
  };
  if (assetType === "performer") {
    normalized.pose = piece.pose;
    normalized.heightCm = asset.heightCm;
  } else {
    normalized.kind = asset.kind;
    normalized.dims = clone(asset.dims);
    normalized.flown = asset.flown;
    normalized.wires = asset.wires;
    normalized.framed = asset.framed;
    normalized.lightKind = asset.lightKind;
  }
  return normalized;
}

function applyOperation(context, operation) {
  const { project } = context.document;
  if (operation.op === "replace_scene_asset") {
    const scene = sceneOrThrow(project, operation.sceneId);
    const fromAsset = resolveAsset(
      project, operation.from, context.questions, context.clarifications, context.resolutions, "置換対象",
    );
    const toAsset = resolveAsset(
      project, operation.to, context.questions, context.clarifications, context.resolutions, "置換先",
    );
    if (fromAsset && toAsset) replaceInScene(context, scene, fromAsset, toAsset, operation);
    return;
  }

  if (operation.op === "replace_asset_across_scenes") {
    const scenes = operation.sceneIds === "all"
      ? project.scenes.filter((scene) => scene.kind === "scene")
      : operation.sceneIds.map((sceneId) => sceneOrThrow(project, sceneId));
    const fromAsset = resolveAsset(
      project, operation.from, context.questions, context.clarifications, context.resolutions, "置換対象",
    );
    const toAsset = resolveAsset(
      project, operation.to, context.questions, context.clarifications, context.resolutions, "置換先",
    );
    if (!fromAsset || !toAsset) return;
    let replacementCount = 0;
    for (const scene of scenes) {
      const indices = selectedPieces(scene, operation.from.assetType, fromAsset.id);
      if (!indices.length) continue;
      replaceInScene(context, scene, fromAsset, toAsset, operation);
      replacementCount += indices.length;
    }
    if (!replacementCount) {
      throw new Error("指定した場面に置換対象が見つかりません。");
    }
    return;
  }

  if (operation.op === "add_placement") {
    const scene = sceneOrThrow(project, operation.sceneId);
    touchScene(context, scene);
    operation.placement = placementWithDefaults(project, scene, operation.placement);
    updateScene(context.document, {
      sceneId: scene.id,
      placementMode: "append",
      placements: [operation.placement],
    });
    const added = scene.pieces.at(-1);
    const assetType = added.castId ? "performer" : "set";
    const asset = assetsFor(project, assetType)
      .find((item) => item.id === assetIdForPiece(added, assetType));
    recordRisk(context, asset);
    addLine(context, scene.id, `${pieceText(added)}を追加。`);
    return;
  }

  if (operation.op === "remove_placement") {
    const scene = sceneOrThrow(project, operation.sceneId);
    const asset = resolveAsset(
      project, operation.target, context.questions, context.clarifications, context.resolutions, "削除対象",
    );
    if (!asset) return;
    const indices = selectedPieces(
      scene,
      operation.target.assetType,
      asset.id,
      operation.target.occurrence,
    );
    assertSelected(scene, operation.target, indices);
    touchScene(context, scene);
    for (const index of [...indices].reverse()) scene.pieces.splice(index, 1);
    recordRisk(context, asset);
    addLine(context, scene.id, `${asset.name}の配置を${indices.length}件削除。前版は履歴に残します。`);
    return;
  }

  if (operation.op === "update_placement") {
    const scene = sceneOrThrow(project, operation.sceneId);
    const asset = resolveAsset(
      project, operation.target, context.questions, context.clarifications, context.resolutions, "更新対象",
    );
    if (!asset) return;
    const indices = selectedPieces(
      scene,
      operation.target.assetType,
      asset.id,
      operation.target.occurrence,
    );
    assertSelected(scene, operation.target, indices);
    if (operation.target.assetType === "set"
      && (operation.changes.pose !== undefined || operation.changes.heightCm !== undefined)) {
      throw new Error("セットの配置にはposeまたはheightCmを指定できません。");
    }
    touchScene(context, scene);
    const pieceKeys = ["u", "v", "size", "color", "facing", "pose"];
    for (const index of indices) {
      const piece = scene.pieces[index];
      for (const key of pieceKeys) {
        if (operation.changes[key] !== undefined) piece[key] = operation.changes[key];
      }
      if (operation.changes.color) piece.color = operation.changes.color.toLowerCase();
      if (operation.changes.route !== undefined) {
        piece.route = {
          u: operation.changes.route.u,
          v: operation.changes.route.v,
          bu: operation.changes.route.bu ?? 0.5,
          bv: operation.changes.route.bv ?? 0.5,
        };
      }
    }
    if (operation.changes.heightCm !== undefined) asset.heightCm = operation.changes.heightCm;
    if (operation.changes.assetNote !== undefined) asset.note = operation.changes.assetNote.trim();
    if (operation.changes.heightCm !== undefined || operation.changes.assetNote !== undefined) {
      for (const index of indices) context.forcedUpdatePieceIds.add(scene.pieces[index].id);
    }
    recordRisk(context, asset);
    const fields = Object.keys(operation.changes)
      .map((key) => PLACEMENT_FIELD_LABELS[key] || key)
      .join("・") || "指定項目";
    addLine(context, scene.id, `${asset.name}の${fields}を更新。`);
    return;
  }

  if (operation.op === "update_scene_fields") {
    const scene = sceneOrThrow(project, operation.sceneId);
    touchScene(context, scene);
    const beforeLightingIntent = clone(scene.lightingIntent || null);
    updateScene(context.document, operation);
    if (operation.lightingIntent !== undefined) {
      lightingIntentDiffLines(beforeLightingIntent, scene.lightingIntent)
        .forEach((line) => addLine(context, scene.id, line));
    }
    const fields = ["title", "note", "background", "beat", "rehearsal", "lightingIntent"]
      .filter((key) => operation[key] !== undefined)
      .map((key) => SCENE_FIELD_LABELS[key])
      .join("・") || "指定項目";
    if (operation.lightingIntent === undefined || fields !== "光の意図") {
      addLine(context, scene.id, `場面の${fields}を更新。`);
    }
    return;
  }

  if (operation.op === "add_scene") {
    if (operation.afterSceneId) sceneOrThrow(project, operation.afterSceneId);
    appendScenes(context.document, {
      afterSceneId: operation.afterSceneId,
      scenes: [operation.scene],
    });
    const scene = sceneOrThrow(project, operation.scene.id);
    operation.scene.placements = scene.pieces.map((piece, index) =>
      normalizedOperationPlacement(project, piece, operation.scene.placements?.[index]));
    touchScene(context, scene, null);
    for (const piece of scene.pieces) {
      const assetType = piece.castId ? "performer" : "set";
      const asset = assetsFor(project, assetType)
        .find((item) => item.id === assetIdForPiece(piece, assetType));
      recordRisk(context, asset);
    }
    addLine(context, scene.id, `新しい場面「${scene.title}」を追加。`);
    return;
  }

  throw new Error(`未対応の編集操作です: ${String(operation.op)}`);
}

function pieceAssetType(piece) {
  return piece.castId ? "performer" : "set";
}

function piecePlacement(piece) {
  return {
    u: piece.u,
    v: piece.v,
    size: piece.size,
    facing: piece.facing,
    color: piece.color,
  };
}

function sameAsset(before, after) {
  return before.castId === after.castId && before.setId === after.setId;
}

function sameValue(before, after, key) {
  return before[key] === after[key];
}

function hasPlacementUpdate(before, after) {
  return !sameValue(before, after, "size")
    || !sameValue(before, after, "facing")
    || !sameValue(before, after, "color")
    || !sameValue(before, after, "pose")
    || JSON.stringify(before.route) !== JSON.stringify(after.route);
}

function pieceChange(change, before, after) {
  const visible = after || before;
  const assetType = pieceAssetType(visible);
  return {
    change,
    assetType,
    label: visible.name,
    kind: assetType === "set" ? visible.type : null,
    from: before ? piecePlacement(before) : null,
    to: after ? piecePlacement(after) : null,
  };
}

function buildPieceDiff(context, before, after) {
  if (!before) {
    return (after?.pieces || []).map((piece) => pieceChange("add", null, piece));
  }

  const afterById = new Map((after?.pieces || []).map((piece) => [piece.id, piece]));
  const pieces = [];
  for (const beforePiece of before.pieces || []) {
    const afterPiece = afterById.get(beforePiece.id);
    if (!afterPiece) {
      pieces.push(pieceChange("remove", beforePiece, null));
      continue;
    }
    afterById.delete(beforePiece.id);
    if (!sameAsset(beforePiece, afterPiece)) {
      pieces.push(pieceChange("replace", beforePiece, afterPiece));
    } else if (!sameValue(beforePiece, afterPiece, "u")
      || !sameValue(beforePiece, afterPiece, "v")) {
      pieces.push(pieceChange("move", beforePiece, afterPiece));
    } else if (hasPlacementUpdate(beforePiece, afterPiece)
      || context.forcedUpdatePieceIds.has(beforePiece.id)) {
      pieces.push(pieceChange("update", beforePiece, afterPiece));
    }
  }
  for (const afterPiece of afterById.values()) {
    pieces.push(pieceChange("add", null, afterPiece));
  }
  return pieces;
}

function buildDiff(context) {
  return context.affectedSceneIds.map((sceneId) => {
    const after = context.document.project.scenes.find((scene) => scene.id === sceneId);
    const before = context.beforeByScene.get(sceneId);
    return {
      sceneId,
      sceneTitle: after?.title || before?.title || "（名称未設定）",
      before: sceneSnapshot(before),
      after: sceneSnapshot(after),
      lines: context.linesByScene.get(sceneId),
      pieces: buildPieceDiff(context, before, after),
    };
  });
}

function executeOperations(document, operations, resolutions = []) {
  const context = createContext(document);
  context.resolutions = resolutions;
  for (const operation of operations) applyOperation(context, operation);
  return context;
}

export function createEditPlan(document, input) {
  const operations = normalizeOperations(input.operations || []);
  const resolutions = Array.isArray(input.resolutions) ? input.resolutions : [];
  const suppliedQuestions = [...new Set((input.questions || [])
    .map((question) => String(question).trim())
    .filter(Boolean))];
  if (!operations.length) {
    throw new Error(
      "operationsを1件以上指定してください。情報不足は舞台スケッチの既定値で埋め、質問だけでは停止しません。",
    );
  }
  const preview = clone(document);
  const context = executeOperations(preview, operations, resolutions);
  const check = validateDocument(preview);
  if (!check.valid) {
    context.questions.push(`適用後のJSONを検証できません: ${check.errors.join(" / ")}`);
  }
  const warning = riskWarning(context.riskKinds);
  const warnings = [...new Set([
    ...check.warnings,
    ...(warning ? [warning] : []),
  ])];
  const detectedQuestions = context.questions
    .map((question) => String(question).trim())
    .filter(Boolean);
  const questions = detectedQuestions.length
    ? [...new Set([...suppliedQuestions, ...detectedQuestions])]
    : [];
  const diff = buildDiff(context);
  const status = questions.length ? "needs_clarification" : "proposed";
  const lines = diff.flatMap((item) => item.lines);
  const summary = status === "proposed"
    ? (lines.join(" ") || "変更のない編集計画です。")
    : `編集計画を確定できません。${questions[0]}`;
  return {
    kind: "stage-sketch-edit-plan",
    version: 1,
    planId: makeId("plan"),
    projectId: input.projectId,
    expectedRevision: input.expectedRevision,
    request: input.request,
    status,
    operations,
    diff,
    summary,
    warnings,
    questions,
    clarifications: context.clarifications,
    requiresConfirmation: true,
  };
}

export function applyEditOperations(document, operations) {
  const context = executeOperations(document, clone(operations));
  if (context.questions.length) {
    throw new Error(`編集計画を特定できません: ${context.questions.join(" / ")}`);
  }
  return buildDiff(context);
}

export function sceneAssetSummary(project, scene) {
  return (scene.pieces || []).map((piece) => ({
    assetType: piece.castId ? "performer" : "set",
    assetId: piece.castId || piece.setId,
    assetName: piece.name,
    kind: piece.castId ? "performer" : piece.type,
  }));
}

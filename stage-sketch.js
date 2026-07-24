/* 舞台スケッチ — 2Dの構図・色・距離感を試すためのローカル制作道具。
   技術図面や3D舞台設計とは分離し、状態はこのブラウザ内だけに保存する。 */

(function () {
  "use strict";

  const canvas = document.getElementById("stage-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const paintCanvas = document.createElement("canvas");
  paintCanvas.width = canvas.width;
  paintCanvas.height = canvas.height;
  const paintCtx = paintCanvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  const FLOOR_Y = 510;
  const BACKDROP = { x: 70, y: 48, w: 1140, h: FLOOR_Y - 48 };
  const STORAGE_KEY = "shosai-stage-sketch-v1";
  const HISTORY_LIMIT = 36;
  const PIECE_TYPES = {
    performer: "人物コマ",
    block: "台・物",
    ring: "円形の物",
    light: "光の位置",
  };
  const TOOL_HINTS = {
    select: "コマを選び、ステージ上で動かします。",
    paint: "奥の背景面を指やマウスで塗ります。",
    erase: "背景に描いた線だけを消します。",
  };

  const els = {
    undo: document.getElementById("stage-undo"),
    redo: document.getElementById("stage-redo"),
    export: document.getElementById("stage-export"),
    toolHint: document.getElementById("stage-tool-hint"),
    newColor: document.getElementById("stage-new-color"),
    background: document.getElementById("stage-bg-color"),
    paintColor: document.getElementById("stage-paint-color"),
    brushSize: document.getElementById("stage-brush-size"),
    brushValue: document.getElementById("stage-brush-value"),
    clearPaint: document.getElementById("stage-clear-paint"),
    selectionEmpty: document.getElementById("stage-selection-empty"),
    selectionControls: document.getElementById("stage-selection-controls"),
    selectedName: document.getElementById("stage-selected-name"),
    selectedColor: document.getElementById("stage-selected-color"),
    pieceSize: document.getElementById("stage-piece-size"),
    sizeValue: document.getElementById("stage-size-value"),
    sendBack: document.getElementById("stage-send-back"),
    bringFront: document.getElementById("stage-bring-front"),
    duplicate: document.getElementById("stage-duplicate"),
    delete: document.getElementById("stage-delete"),
    clear: document.getElementById("stage-clear"),
    saveStatus: document.getElementById("stage-save-status"),
    live: document.getElementById("stage-live"),
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const validColor = (value, fallback) =>
    typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  let idCounter = 0;
  function nextId() {
    idCounter += 1;
    return `stage-piece-${Date.now().toString(36)}-${idCounter.toString(36)}`;
  }

  function baseState(withExample) {
    return {
      version: 1,
      background: "#40362d",
      pieceColor: "#a84b26",
      paintColor: "#efe7d6",
      brushSize: 42,
      pieces: withExample
        ? [
            { id: "stage-sample-performer-1", type: "performer", x: 472, y: 610, size: 105, color: "#a84b26" },
            { id: "stage-sample-performer-2", type: "performer", x: 802, y: 584, size: 92, color: "#77865f" },
            { id: "stage-sample-block-1", type: "block", x: 638, y: 630, size: 88, color: "#efe7d6" },
          ]
        : [],
      strokes: [],
    };
  }

  function normalizePiece(piece, index) {
    const type = PIECE_TYPES[piece && piece.type] ? piece.type : "performer";
    return {
      id: typeof piece.id === "string" ? piece.id : `stage-restored-${index}`,
      type,
      x: clamp(finite(piece.x, W / 2), 88, W - 88),
      y: clamp(finite(piece.y, 590), FLOOR_Y + 24, H - 35),
      size: clamp(finite(piece.size, 100), 55, 180),
      color: validColor(piece.color, "#a84b26"),
    };
  }

  function normalizeStroke(stroke) {
    const points = Array.isArray(stroke && stroke.points)
      ? stroke.points
          .filter((point) => Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)))
          .slice(-1800)
          .map((point) => ({
            x: clamp(Number(point.x), BACKDROP.x, BACKDROP.x + BACKDROP.w),
            y: clamp(Number(point.y), BACKDROP.y, BACKDROP.y + BACKDROP.h),
          }))
      : [];
    return {
      color: validColor(stroke && stroke.color, "#efe7d6"),
      width: clamp(finite(stroke && stroke.width, 42), 12, 120),
      erase: Boolean(stroke && stroke.erase),
      points,
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return baseState(true);
    const fallback = baseState(false);
    return {
      version: 1,
      background: validColor(raw.background, fallback.background),
      pieceColor: validColor(raw.pieceColor, fallback.pieceColor),
      paintColor: validColor(raw.paintColor, fallback.paintColor),
      brushSize: clamp(finite(raw.brushSize, fallback.brushSize), 12, 120),
      pieces: Array.isArray(raw.pieces) ? raw.pieces.slice(-80).map(normalizePiece) : [],
      strokes: Array.isArray(raw.strokes)
        ? raw.strokes.slice(-240).map(normalizeStroke).filter((stroke) => stroke.points.length)
        : [],
    };
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { value: normalizeState(JSON.parse(saved)), restored: true };
    } catch (_) {
      // 保存領域が使えなくても、舞台スケッチ自体はそのまま利用できる。
    }
    return { value: baseState(true), restored: false };
  }

  const loaded = loadState();
  let state = loaded.value;
  let tool = "select";
  let selectedId = null;
  let pointerAction = null;
  let history = [];
  let future = [];
  let saveTimer = null;
  let controlBefore = null;

  function snapshot() {
    return JSON.stringify(state);
  }

  function recordBefore(value) {
    if (!value) return;
    if (history[history.length - 1] !== value) history.push(value);
    if (history.length > HISTORY_LIMIT) history.shift();
    future = [];
    updateHistoryButtons();
  }

  function checkpoint() {
    recordBefore(snapshot());
  }

  function restore(value) {
    state = normalizeState(JSON.parse(value));
    if (!state.pieces.some((piece) => piece.id === selectedId)) selectedId = null;
    syncInputs();
    updateInspector();
    render();
    persistSoon();
  }

  function undo() {
    if (!history.length) return;
    future.push(snapshot());
    restore(history.pop());
    updateHistoryButtons();
    announce("一つ前の状態へ戻しました。");
  }

  function redo() {
    if (!future.length) return;
    history.push(snapshot());
    restore(future.pop());
    updateHistoryButtons();
    announce("やり直しました。");
  }

  function updateHistoryButtons() {
    els.undo.disabled = history.length === 0;
    els.redo.disabled = future.length === 0;
  }

  function persistSoon() {
    clearTimeout(saveTimer);
    els.saveStatus.textContent = "変更を保存しています…";
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, snapshot());
        els.saveStatus.textContent = "この端末のブラウザ内へ保存しました。";
      } catch (_) {
        els.saveStatus.textContent = "この端末へ保存できませんでした。画像を書き出して残してください。";
      }
    }, 180);
  }

  function announce(message) {
    els.live.textContent = "";
    requestAnimationFrame(() => {
      els.live.textContent = message;
    });
  }

  function rgba(hex, alpha) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
  }

  function depthScale(piece) {
    const depth = clamp((piece.y - FLOOR_Y) / (H - FLOOR_Y), 0, 1);
    return (piece.size / 100) * (0.72 + depth * 0.38);
  }

  function buildPaintLayer() {
    paintCtx.clearRect(0, 0, W, H);
    paintCtx.save();
    paintCtx.beginPath();
    paintCtx.rect(BACKDROP.x, BACKDROP.y, BACKDROP.w, BACKDROP.h);
    paintCtx.clip();
    paintCtx.lineCap = "round";
    paintCtx.lineJoin = "round";

    state.strokes.forEach((stroke) => {
      if (!stroke.points.length) return;
      paintCtx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      paintCtx.strokeStyle = stroke.color;
      paintCtx.fillStyle = stroke.color;
      paintCtx.lineWidth = stroke.width;
      paintCtx.beginPath();
      if (stroke.points.length === 1) {
        paintCtx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
        paintCtx.fill();
        return;
      }
      paintCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i += 1) {
        paintCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      paintCtx.stroke();
    });
    paintCtx.restore();
    paintCtx.globalCompositeOperation = "source-over";
  }

  function drawPerformer(target, piece) {
    const scale = depthScale(piece);
    target.save();
    target.translate(piece.x, piece.y);
    target.scale(scale, scale);

    target.fillStyle = "rgba(0,0,0,0.28)";
    target.beginPath();
    target.ellipse(0, 7, 55, 14, 0, 0, Math.PI * 2);
    target.fill();

    target.fillStyle = piece.color;
    target.strokeStyle = rgba(piece.color, 0.35);
    target.lineWidth = 2;
    target.beginPath();
    target.arc(0, -112, 22, 0, Math.PI * 2);
    target.fill();
    target.stroke();

    target.beginPath();
    target.moveTo(-11, -88);
    target.bezierCurveTo(-40, -75, -43, -52, -28, -31);
    target.lineTo(-52, -2);
    target.quadraticCurveTo(0, 12, 52, -2);
    target.lineTo(28, -31);
    target.bezierCurveTo(43, -52, 40, -75, 11, -88);
    target.closePath();
    target.fill();
    target.stroke();
    target.restore();
  }

  function drawBlock(target, piece) {
    const scale = depthScale(piece);
    const width = 112 * scale;
    const height = 66 * scale;
    const depth = 18 * scale;
    target.save();
    target.fillStyle = "rgba(0,0,0,0.3)";
    target.beginPath();
    target.ellipse(piece.x, piece.y + 7, width * 0.58, 12 * scale, 0, 0, Math.PI * 2);
    target.fill();
    target.fillStyle = piece.color;
    target.strokeStyle = rgba(piece.color, 0.28);
    target.lineWidth = 2;
    target.fillRect(piece.x - width / 2, piece.y - height, width, height);
    target.strokeRect(piece.x - width / 2, piece.y - height, width, height);
    target.fillStyle = rgba(piece.color, 0.74);
    target.beginPath();
    target.moveTo(piece.x - width / 2, piece.y - height);
    target.lineTo(piece.x - width / 2 + depth, piece.y - height - depth);
    target.lineTo(piece.x + width / 2 + depth, piece.y - height - depth);
    target.lineTo(piece.x + width / 2, piece.y - height);
    target.closePath();
    target.fill();
    target.restore();
  }

  function drawRing(target, piece) {
    const scale = depthScale(piece);
    const radius = 52 * scale;
    target.save();
    target.fillStyle = "rgba(0,0,0,0.28)";
    target.beginPath();
    target.ellipse(piece.x, piece.y + 5, radius * 1.12, 10 * scale, 0, 0, Math.PI * 2);
    target.fill();
    target.strokeStyle = piece.color;
    target.lineWidth = Math.max(7, 11 * scale);
    target.beginPath();
    target.arc(piece.x, piece.y - radius - 7 * scale, radius, 0, Math.PI * 2);
    target.stroke();
    target.strokeStyle = rgba(piece.color, 0.62);
    target.lineWidth = Math.max(2, 3 * scale);
    target.beginPath();
    target.moveTo(piece.x, piece.y - 8 * scale);
    target.lineTo(piece.x, piece.y);
    target.stroke();
    target.restore();
  }

  function drawLight(target, piece) {
    const scale = depthScale(piece);
    const spread = 138 * scale;
    const topWidth = 28 * scale;
    const gradient = target.createLinearGradient(0, BACKDROP.y, 0, piece.y);
    gradient.addColorStop(0, rgba(piece.color, 0.08));
    gradient.addColorStop(0.72, rgba(piece.color, 0.14));
    gradient.addColorStop(1, rgba(piece.color, 0.28));
    target.save();
    target.globalCompositeOperation = "screen";
    target.fillStyle = gradient;
    target.beginPath();
    target.moveTo(piece.x - topWidth, BACKDROP.y);
    target.lineTo(piece.x + topWidth, BACKDROP.y);
    target.lineTo(piece.x + spread, piece.y);
    target.lineTo(piece.x - spread, piece.y);
    target.closePath();
    target.fill();
    const pool = target.createRadialGradient(piece.x, piece.y, 0, piece.x, piece.y, spread);
    pool.addColorStop(0, rgba(piece.color, 0.33));
    pool.addColorStop(1, rgba(piece.color, 0));
    target.fillStyle = pool;
    target.beginPath();
    target.ellipse(piece.x, piece.y, spread, 32 * scale, 0, 0, Math.PI * 2);
    target.fill();
    target.globalCompositeOperation = "source-over";
    target.restore();
  }

  function selectionBounds(piece) {
    const scale = depthScale(piece);
    if (piece.type === "light") {
      return { x: piece.x - 78 * scale, y: piece.y - 35 * scale, w: 156 * scale, h: 70 * scale };
    }
    if (piece.type === "block") {
      return { x: piece.x - 66 * scale, y: piece.y - 92 * scale, w: 132 * scale, h: 103 * scale };
    }
    if (piece.type === "ring") {
      return { x: piece.x - 66 * scale, y: piece.y - 128 * scale, w: 132 * scale, h: 139 * scale };
    }
    return { x: piece.x - 60 * scale, y: piece.y - 143 * scale, w: 120 * scale, h: 154 * scale };
  }

  function drawSelection(target, piece) {
    const bounds = selectionBounds(piece);
    target.save();
    target.strokeStyle = "#d3ac59";
    target.lineWidth = 2;
    target.setLineDash([8, 7]);
    target.strokeRect(bounds.x - 7, bounds.y - 7, bounds.w + 14, bounds.h + 14);
    target.setLineDash([]);
    target.fillStyle = "#d3ac59";
    [
      [bounds.x - 7, bounds.y - 7],
      [bounds.x + bounds.w + 7, bounds.y - 7],
      [bounds.x - 7, bounds.y + bounds.h + 7],
      [bounds.x + bounds.w + 7, bounds.y + bounds.h + 7],
    ].forEach(([x, y]) => target.fillRect(x - 3, y - 3, 6, 6));
    target.restore();
  }

  function drawStage(target, showSelection) {
    buildPaintLayer();
    target.save();
    target.clearRect(0, 0, W, H);
    target.fillStyle = "#0d0c0b";
    target.fillRect(0, 0, W, H);

    target.fillStyle = state.background;
    target.fillRect(BACKDROP.x, BACKDROP.y, BACKDROP.w, BACKDROP.h);
    target.drawImage(paintCanvas, 0, 0);

    const wallShade = target.createLinearGradient(BACKDROP.x, 0, BACKDROP.x + BACKDROP.w, 0);
    wallShade.addColorStop(0, "rgba(0,0,0,0.18)");
    wallShade.addColorStop(0.18, "rgba(0,0,0,0)");
    wallShade.addColorStop(0.82, "rgba(0,0,0,0)");
    wallShade.addColorStop(1, "rgba(0,0,0,0.18)");
    target.fillStyle = wallShade;
    target.fillRect(BACKDROP.x, BACKDROP.y, BACKDROP.w, BACKDROP.h);

    target.fillStyle = "#211b17";
    target.beginPath();
    target.moveTo(BACKDROP.x, FLOOR_Y);
    target.lineTo(BACKDROP.x + BACKDROP.w, FLOOR_Y);
    target.lineTo(W, H);
    target.lineTo(0, H);
    target.closePath();
    target.fill();

    target.strokeStyle = "rgba(239,231,214,0.09)";
    target.lineWidth = 1;
    for (let x = 80; x <= 1200; x += 112) {
      target.beginPath();
      target.moveTo(W / 2, FLOOR_Y);
      target.lineTo(x, H);
      target.stroke();
    }
    [0.22, 0.48, 0.75].forEach((ratio) => {
      const y = FLOOR_Y + (H - FLOOR_Y) * ratio;
      target.beginPath();
      target.moveTo(0, y);
      target.lineTo(W, y);
      target.stroke();
    });

    target.fillStyle = "#11100f";
    target.fillRect(0, 0, W, BACKDROP.y);
    target.fillRect(0, 0, BACKDROP.x, H);
    target.fillRect(BACKDROP.x + BACKDROP.w, 0, W - BACKDROP.x - BACKDROP.w, H);
    target.strokeStyle = "rgba(156,130,63,0.42)";
    target.lineWidth = 2;
    target.strokeRect(BACKDROP.x, BACKDROP.y, BACKDROP.w, BACKDROP.h);
    target.strokeStyle = "rgba(239,231,214,0.18)";
    target.beginPath();
    target.moveTo(BACKDROP.x, FLOOR_Y);
    target.lineTo(BACKDROP.x + BACKDROP.w, FLOOR_Y);
    target.stroke();

    state.pieces.filter((piece) => piece.type === "light").forEach((piece) => drawLight(target, piece));
    state.pieces.filter((piece) => piece.type !== "light").forEach((piece) => {
      if (piece.type === "performer") drawPerformer(target, piece);
      if (piece.type === "block") drawBlock(target, piece);
      if (piece.type === "ring") drawRing(target, piece);
    });

    if (showSelection) {
      const selected = state.pieces.find((piece) => piece.id === selectedId);
      if (selected) drawSelection(target, selected);
    }

    const edgeShade = target.createRadialGradient(W / 2, H * 0.55, 180, W / 2, H * 0.55, W * 0.72);
    edgeShade.addColorStop(0.64, "rgba(0,0,0,0)");
    edgeShade.addColorStop(1, "rgba(0,0,0,0.3)");
    target.fillStyle = edgeShade;
    target.fillRect(0, 0, W, H);
    target.restore();
  }

  function render() {
    drawStage(ctx, true);
    const counts = Object.keys(PIECE_TYPES)
      .map((type) => `${PIECE_TYPES[type]}${state.pieces.filter((piece) => piece.type === type).length}`)
      .join("、");
    canvas.setAttribute("aria-label", `正面から見た舞台。${counts}。背景の線${state.strokes.length}本。`);
  }

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (W / rect.width),
      y: (event.clientY - rect.top) * (H / rect.height),
    };
  }

  function onBackdrop(point) {
    return point.x >= BACKDROP.x && point.x <= BACKDROP.x + BACKDROP.w &&
      point.y >= BACKDROP.y && point.y <= BACKDROP.y + BACKDROP.h;
  }

  function hitTest(point) {
    for (let i = state.pieces.length - 1; i >= 0; i -= 1) {
      const piece = state.pieces[i];
      const bounds = selectionBounds(piece);
      if (point.x >= bounds.x && point.x <= bounds.x + bounds.w &&
          point.y >= bounds.y && point.y <= bounds.y + bounds.h) return piece;
    }
    return null;
  }

  function selectedPiece() {
    return state.pieces.find((piece) => piece.id === selectedId) || null;
  }

  function setTool(nextTool) {
    tool = nextTool;
    canvas.dataset.tool = tool;
    document.querySelectorAll("[data-stage-tool]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.stageTool === tool));
    });
    els.toolHint.textContent = TOOL_HINTS[tool];
    announce(`${document.querySelector(`[data-stage-tool="${tool}"]`).textContent}を選びました。`);
  }

  function updateInspector() {
    const piece = selectedPiece();
    els.selectionEmpty.hidden = Boolean(piece);
    els.selectionControls.hidden = !piece;
    if (!piece) return;
    const sameType = state.pieces.filter((candidate) => candidate.type === piece.type);
    const number = sameType.indexOf(piece) + 1;
    els.selectedName.textContent = `${PIECE_TYPES[piece.type]} ${number}`;
    els.selectedColor.value = piece.color;
    els.pieceSize.value = String(piece.size);
    els.sizeValue.textContent = String(piece.size);
  }

  function syncInputs() {
    els.newColor.value = state.pieceColor;
    els.background.value = state.background;
    els.paintColor.value = state.paintColor;
    els.brushSize.value = String(state.brushSize);
    els.brushValue.textContent = String(state.brushSize);
  }

  function addPiece(type) {
    checkpoint();
    const count = state.pieces.length;
    const piece = {
      id: nextId(),
      type,
      x: clamp(W / 2 + ((count % 5) - 2) * 62, 120, W - 120),
      y: clamp(568 + (count % 3) * 27, FLOOR_Y + 30, H - 44),
      size: type === "light" ? 115 : 100,
      color: state.pieceColor,
    };
    state.pieces.push(piece);
    selectedId = piece.id;
    setTool("select");
    updateInspector();
    render();
    persistSoon();
    announce(`${PIECE_TYPES[type]}を舞台へ置きました。`);
    canvas.focus();
  }

  function removeSelected() {
    const piece = selectedPiece();
    if (!piece) return;
    checkpoint();
    state.pieces = state.pieces.filter((candidate) => candidate.id !== piece.id);
    selectedId = null;
    updateInspector();
    render();
    persistSoon();
    announce(`${PIECE_TYPES[piece.type]}を舞台から外しました。`);
  }

  function duplicateSelected() {
    const piece = selectedPiece();
    if (!piece) return;
    checkpoint();
    const copy = {
      ...piece,
      id: nextId(),
      x: clamp(piece.x + 58, 88, W - 88),
      y: clamp(piece.y + 18, FLOOR_Y + 24, H - 35),
    };
    state.pieces.push(copy);
    selectedId = copy.id;
    updateInspector();
    render();
    persistSoon();
    announce(`${PIECE_TYPES[piece.type]}を複製しました。`);
  }

  function moveLayer(direction) {
    const index = state.pieces.findIndex((piece) => piece.id === selectedId);
    if (index < 0) return;
    const nextIndex = clamp(index + direction, 0, state.pieces.length - 1);
    if (index === nextIndex) return;
    checkpoint();
    const [piece] = state.pieces.splice(index, 1);
    state.pieces.splice(nextIndex, 0, piece);
    render();
    persistSoon();
    announce(direction > 0 ? "コマを一つ前へ出しました。" : "コマを一つ後ろへ送りました。");
  }

  function finishPointer(event) {
    if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    const changed = pointerAction.kind === "stroke" || pointerAction.moved;
    pointerAction = null;
    canvas.dataset.dragging = "false";
    if (changed) persistSoon();
  }

  canvas.addEventListener("pointerdown", (event) => {
    const point = pointFromEvent(event);
    canvas.focus();

    if (tool === "select") {
      const hit = hitTest(point);
      selectedId = hit ? hit.id : null;
      updateInspector();
      render();
      if (!hit) return;
      canvas.setPointerCapture(event.pointerId);
      canvas.dataset.dragging = "true";
      pointerAction = {
        kind: "drag",
        pointerId: event.pointerId,
        id: hit.id,
        offsetX: point.x - hit.x,
        offsetY: point.y - hit.y,
        before: snapshot(),
        moved: false,
      };
      return;
    }

    if (!onBackdrop(point)) {
      announce("背景の枠内から塗り始めてください。");
      return;
    }
    checkpoint();
    const stroke = {
      color: state.paintColor,
      width: state.brushSize,
      erase: tool === "erase",
      points: [point],
    };
    state.strokes.push(stroke);
    canvas.setPointerCapture(event.pointerId);
    pointerAction = { kind: "stroke", pointerId: event.pointerId, stroke, moved: true };
    render();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    if (pointerAction.kind === "drag") {
      const piece = state.pieces.find((candidate) => candidate.id === pointerAction.id);
      if (!piece) return;
      if (!pointerAction.moved) {
        recordBefore(pointerAction.before);
        pointerAction.moved = true;
      }
      piece.x = clamp(point.x - pointerAction.offsetX, 88, W - 88);
      piece.y = clamp(point.y - pointerAction.offsetY, FLOOR_Y + 24, H - 35);
      render();
      return;
    }

    const bounded = {
      x: clamp(point.x, BACKDROP.x, BACKDROP.x + BACKDROP.w),
      y: clamp(point.y, BACKDROP.y, BACKDROP.y + BACKDROP.h),
    };
    const points = pointerAction.stroke.points;
    const previous = points[points.length - 1];
    if (Math.hypot(bounded.x - previous.x, bounded.y - previous.y) >= 3) {
      points.push(bounded);
      render();
    }
  });

  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);

  canvas.addEventListener("keydown", (event) => {
    const piece = selectedPiece();
    if (!piece) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeSelected();
      return;
    }
    const moves = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (!moves[event.key]) return;
    event.preventDefault();
    checkpoint();
    const amount = event.shiftKey ? 24 : 8;
    piece.x = clamp(piece.x + moves[event.key][0] * amount, 88, W - 88);
    piece.y = clamp(piece.y + moves[event.key][1] * amount, FLOOR_Y + 24, H - 35);
    render();
    persistSoon();
  });

  document.querySelectorAll("[data-stage-tool]").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.stageTool));
  });

  document.querySelectorAll("[data-stage-add]").forEach((button) => {
    button.addEventListener("click", () => addPiece(button.dataset.stageAdd));
  });

  document.querySelectorAll("[data-stage-piece-color]").forEach((button) => {
    button.addEventListener("click", () => {
      state.pieceColor = button.dataset.stagePieceColor;
      els.newColor.value = state.pieceColor;
      persistSoon();
    });
  });

  document.querySelectorAll("[data-stage-bg]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.background === button.dataset.stageBg) return;
      checkpoint();
      state.background = button.dataset.stageBg;
      els.background.value = state.background;
      render();
      persistSoon();
    });
  });

  document.querySelectorAll("[data-stage-paint-color]").forEach((button) => {
    button.addEventListener("click", () => {
      state.paintColor = button.dataset.stagePaintColor;
      els.paintColor.value = state.paintColor;
      persistSoon();
    });
  });

  els.newColor.addEventListener("input", (event) => {
    state.pieceColor = event.target.value;
    persistSoon();
  });

  els.paintColor.addEventListener("input", (event) => {
    state.paintColor = event.target.value;
    persistSoon();
  });

  els.brushSize.addEventListener("input", (event) => {
    state.brushSize = Number(event.target.value);
    els.brushValue.textContent = event.target.value;
    persistSoon();
  });

  function beginControlEdit() {
    if (controlBefore === null) controlBefore = snapshot();
  }

  function finishControlEdit() {
    if (controlBefore !== null && controlBefore !== snapshot()) recordBefore(controlBefore);
    controlBefore = null;
    persistSoon();
  }

  [els.background, els.selectedColor, els.pieceSize].forEach((control) => {
    control.addEventListener("pointerdown", beginControlEdit);
    control.addEventListener("focus", beginControlEdit);
    control.addEventListener("change", finishControlEdit);
    control.addEventListener("blur", () => {
      if (controlBefore !== null) finishControlEdit();
    });
  });

  els.background.addEventListener("input", (event) => {
    state.background = event.target.value;
    render();
  });

  els.selectedColor.addEventListener("input", (event) => {
    const piece = selectedPiece();
    if (!piece) return;
    piece.color = event.target.value;
    render();
  });

  els.pieceSize.addEventListener("input", (event) => {
    const piece = selectedPiece();
    if (!piece) return;
    piece.size = Number(event.target.value);
    els.sizeValue.textContent = event.target.value;
    render();
  });

  els.clearPaint.addEventListener("click", () => {
    if (!state.strokes.length) {
      announce("消す背景の塗りはありません。");
      return;
    }
    checkpoint();
    state.strokes = [];
    render();
    persistSoon();
    announce("背景の塗りを消しました。");
  });

  els.sendBack.addEventListener("click", () => moveLayer(-1));
  els.bringFront.addEventListener("click", () => moveLayer(1));
  els.duplicate.addEventListener("click", duplicateSelected);
  els.delete.addEventListener("click", removeSelected);
  els.undo.addEventListener("click", undo);
  els.redo.addEventListener("click", redo);

  els.clear.addEventListener("click", () => {
    if (!window.confirm("コマと背景の塗りをすべて消し、舞台を空にしますか？")) return;
    checkpoint();
    state = baseState(false);
    selectedId = null;
    syncInputs();
    updateInspector();
    render();
    persistSoon();
    announce("舞台を空にしました。");
  });

  els.export.addEventListener("click", () => {
    const output = document.createElement("canvas");
    output.width = W;
    output.height = H;
    drawStage(output.getContext("2d", { alpha: false }), false);
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
    ].join("");
    els.export.href = output.toDataURL("image/png");
    els.export.download = `stage-sketch-${stamp}.png`;
    announce("舞台スケッチをPNG画像として書き出しました。");
  });

  syncInputs();
  setTool("select");
  updateInspector();
  updateHistoryButtons();
  render();
  els.saveStatus.textContent = loaded.restored
    ? "この端末に保存した前回のスケッチを開きました。"
    : "変更はこの端末のブラウザ内へ自動保存します。";
})();

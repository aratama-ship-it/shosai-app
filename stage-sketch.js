/* 舞台スケッチ — 2Dの構図・色・距離感を試すためのローカル制作道具。
   技術図面や3D舞台設計とは分離し、状態はこのブラウザ内だけに保存する。

   劇場形式（プロセニアム／スラスト／ビッグトップ／屋外／ブラックボックス）を
   切り替えられる。形式ごとに客席の位置が変わり、それが構図の条件になる。

   座標は正規化して持つ（u: 左右 0-1、v: 奥行き 0-1）。形式や規模を変えても
   コマの配置が保たれ、同じ配置を別の劇場で見直せるようにするため。

   規模は「舞台を画面いっぱいに描き、人の大きさを舞台に対する比率で決める」形で
   表す。18mの舞台では人が小さく見える。寸法そのものは編集させない（設計計画書 8.5節）。 */

(function () {
  "use strict";

  const canvas = document.getElementById("stage-canvas");
  if (!canvas) return;
  const VENUES = window.SHOSAI_VENUES;
  if (!VENUES) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const paintCanvas = document.createElement("canvas");
  paintCanvas.width = canvas.width;
  paintCanvas.height = canvas.height;
  const paintCtx = paintCanvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  const STORAGE_KEY = "shosai-stage-sketch-v1";
  const HISTORY_LIMIT = 36;
  const PIECE_TYPES = {
    performer: "人物コマ",
    block: "台・物",
    ring: "円形の物",
    light: "光の位置",
  };
  // 実寸の目安（m）。人を基準に置くと、舞台の規模が見た目に出る
  const PIECE_METERS = {
    performer: 1.7,
    block: 1.2,
    ring: 1.2,
    light: 2.5,
  };
  const TOOL_HINTS = {
    select: "コマを選び、舞台の上で動かします。",
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
    venueList: document.getElementById("stage-venue-list"),
    sizeList: document.getElementById("stage-size-list"),
    venueNote: document.getElementById("stage-venue-note"),
    venueScale: document.getElementById("stage-venue-scale"),
    viewButtons: document.querySelectorAll("[data-stage-view]"),
    depthLabelBack: document.getElementById("stage-depth-back"),
    depthLabelFront: document.getElementById("stage-depth-front"),
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const validColor = (value, fallback) =>
    typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const finite = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

  let idCounter = 0;
  function nextId() {
    idCounter += 1;
    return `stage-piece-${Date.now().toString(36)}-${idCounter.toString(36)}`;
  }

  function baseState(withExample) {
    return {
      version: 2,
      venue: "proscenium",
      venueSize: "mid",
      view: "front",
      background: "#40362d",
      pieceColor: "#a84b26",
      paintColor: "#efe7d6",
      brushSize: 42,
      pieces: withExample
        ? [
            { id: "stage-sample-performer-1", type: "performer", u: 0.36, v: 0.62, size: 105, color: "#a84b26" },
            { id: "stage-sample-performer-2", type: "performer", u: 0.66, v: 0.48, size: 92, color: "#77865f" },
            { id: "stage-sample-block-1", type: "block", u: 0.51, v: 0.7, size: 88, color: "#efe7d6" },
          ]
        : [],
      strokes: [],
    };
  }

  // v1（画面ピクセル座標）で保存されたものを、正規化座標へ引き上げる
  const V1 = { floorY: 510, backdrop: { x: 70, y: 48, w: 1140, h: 462 } };

  function migratePiece(piece) {
    const x = finite(piece.x, W / 2);
    const y = finite(piece.y, 590);
    return {
      u: clamp((x - 88) / (W - 176), 0, 1),
      v: clamp((y - (V1.floorY + 24)) / (H - 35 - (V1.floorY + 24)), 0, 1),
    };
  }

  function normalizePiece(piece, index) {
    const type = PIECE_TYPES[piece && piece.type] ? piece.type : "performer";
    const legacy = piece && piece.u === undefined && piece.x !== undefined ? migratePiece(piece) : null;
    return {
      id: typeof piece.id === "string" ? piece.id : `stage-restored-${index}`,
      type,
      u: clamp(finite(legacy ? legacy.u : piece.u, 0.5), 0, 1),
      v: clamp(finite(legacy ? legacy.v : piece.v, 0.6), 0, 1),
      size: clamp(finite(piece.size, 100), 55, 180),
      color: validColor(piece.color, "#a84b26"),
    };
  }

  function normalizeStroke(stroke) {
    const legacy = stroke && Array.isArray(stroke.points) && stroke.points.length
      && stroke.points[0] && stroke.points[0].u === undefined;
    const points = Array.isArray(stroke && stroke.points)
      ? stroke.points
          .map((p) => {
            if (!legacy) return { u: finite(p.u, 0.5), v: finite(p.v, 0.5) };
            return {
              u: (finite(p.x, 0) - V1.backdrop.x) / V1.backdrop.w,
              v: (finite(p.y, 0) - V1.backdrop.y) / V1.backdrop.h,
            };
          })
          .filter((p) => Number.isFinite(p.u) && Number.isFinite(p.v))
          .slice(-1800)
          .map((p) => ({ u: clamp(p.u, 0, 1), v: clamp(p.v, 0, 1) }))
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
    const venue = VENUES.byId(typeof raw.venue === "string" ? raw.venue : fallback.venue);
    const size = VENUES.sizeById(venue, typeof raw.venueSize === "string" ? raw.venueSize : "");
    return {
      version: 2,
      venue: venue.id,
      venueSize: size.id,
      view: raw.view === "plan" ? "plan" : "front",
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

  const venue = () => VENUES.byId(state.venue);
  const venueSize = () => VENUES.sizeById(venue(), state.venueSize);

  /* ---------- レイアウト ----------
     舞台は常に画面いっぱいに描く。実寸の違いは「人の小ささ」として出る。 */

  function layout() {
    const v = venue();
    const size = venueSize();
    const plan = state.view === "plan";

    if (plan) {
      // 平面図: 上が奥、下が客席側。舞台の縦横比を保って収める
      const pad = 96;
      const availW = W - pad * 2;
      const availH = H - pad * 2;
      const ratio = size.depth / size.width;
      let sw = availW;
      let sh = sw * ratio;
      if (sh > availH) { sh = availH; sw = sh / ratio; }
      // 客席のある形式は舞台を少し上へ寄せ、下に客席の余地を残す
      const shift = v.audience === "none" ? 0 : (v.audience === "round" ? 0 : -28);
      return {
        plan: true, venue: v, size,
        stage: { x: (W - sw) / 2, y: (H - sh) / 2 + shift, w: sw, h: sh },
        pxPerM: sw / size.width,
      };
    }

    // 正面図: 奥のラインと手前のラインの間で擬似パースを作る
    const backY = 150;
    const floorY = 470;
    const bottomY = H - 46;
    const backW = W * 0.62;
    const frontW = W * 0.94;
    return {
      plan: false, venue: v, size,
      backY, floorY, bottomY, backW, frontW,
      centerX: W / 2,
      // 最前列の実寸幅を基準に、1mあたりのpxを出す
      pxPerM: frontW / size.width,
    };
  }

  // 正規化座標 → 画面座標。奥行き v で幅とスケールが変わる
  function place(u, v, L) {
    if (L.plan) {
      return {
        x: L.stage.x + u * L.stage.w,
        y: L.stage.y + (1 - v) * L.stage.h,  // v=1(手前) が下
        scale: 1,
      };
    }
    const y = L.floorY + v * (L.bottomY - L.floorY);
    const halfW = (L.backW + v * (L.frontW - L.backW)) / 2;
    return {
      x: L.centerX + (u - 0.5) * halfW * 2,
      y,
      scale: (L.backW + v * (L.frontW - L.backW)) / L.frontW,
    };
  }

  function fromScreen(x, y, L) {
    if (L.plan) {
      return {
        u: clamp((x - L.stage.x) / L.stage.w, 0, 1),
        v: clamp(1 - (y - L.stage.y) / L.stage.h, 0, 1),
      };
    }
    const v = clamp((y - L.floorY) / (L.bottomY - L.floorY), 0, 1);
    const halfW = (L.backW + v * (L.frontW - L.backW)) / 2;
    return { u: clamp((x - L.centerX) / (halfW * 2) + 0.5, 0, 1), v };
  }

  // コマの実寸（m）から画面上の高さを出す。size は基準に対する倍率
  function pieceScale(piece, pos, L) {
    const meters = PIECE_METERS[piece.type] * (piece.size / 100);
    const px = meters * L.pxPerM * (L.plan ? 1 : pos.scale);
    // 元の描画は「人物=約155px」で描かれているので、それに合わせる
    return px / (piece.type === "performer" ? 155 : piece.type === "block" ? 84 : piece.type === "ring" ? 118 : 170);
  }

  function snapshot() { return JSON.stringify(state); }

  function recordBefore(value) {
    if (!value) return;
    if (history[history.length - 1] !== value) history.push(value);
    if (history.length > HISTORY_LIMIT) history.shift();
    future = [];
    updateHistoryButtons();
  }

  function checkpoint() { recordBefore(snapshot()); }

  function restore(value) {
    state = normalizeState(JSON.parse(value));
    if (!state.pieces.some((piece) => piece.id === selectedId)) selectedId = null;
    syncInputs();
    renderVenueControls();
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
    requestAnimationFrame(() => { els.live.textContent = message; });
  }

  function rgba(hex, alpha) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
  }

  /* ---------- 背景の塗り ---------- */

  function backdropRect(L) {
    if (L.plan) return null;
    const halfBack = L.backW / 2;
    return { x: L.centerX - halfBack, y: L.backY, w: L.backW, h: L.floorY - L.backY };
  }

  function buildPaintLayer(L) {
    paintCtx.clearRect(0, 0, W, H);
    const rect = backdropRect(L);
    if (!rect) return;
    paintCtx.save();
    paintCtx.beginPath();
    paintCtx.rect(rect.x, rect.y, rect.w, rect.h);
    paintCtx.clip();
    paintCtx.lineCap = "round";
    paintCtx.lineJoin = "round";

    state.strokes.forEach((stroke) => {
      if (!stroke.points.length) return;
      const pt = (p) => ({ x: rect.x + p.u * rect.w, y: rect.y + p.v * rect.h });
      paintCtx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      paintCtx.strokeStyle = stroke.color;
      paintCtx.fillStyle = stroke.color;
      paintCtx.lineWidth = stroke.width;
      paintCtx.beginPath();
      const first = pt(stroke.points[0]);
      if (stroke.points.length === 1) {
        paintCtx.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2);
        paintCtx.fill();
        return;
      }
      paintCtx.moveTo(first.x, first.y);
      for (let i = 1; i < stroke.points.length; i += 1) {
        const p = pt(stroke.points[i]);
        paintCtx.lineTo(p.x, p.y);
      }
      paintCtx.stroke();
    });
    paintCtx.restore();
    paintCtx.globalCompositeOperation = "source-over";
  }

  /* ---------- コマの描画 ---------- */

  function drawPerformer(target, piece, pos, scale) {
    target.save();
    target.translate(pos.x, pos.y);
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

  function drawBlock(target, piece, pos, scale) {
    const width = 112 * scale;
    const height = 66 * scale;
    const depth = 18 * scale;
    target.save();
    target.fillStyle = "rgba(0,0,0,0.3)";
    target.beginPath();
    target.ellipse(pos.x, pos.y + 7, width * 0.58, 12 * scale, 0, 0, Math.PI * 2);
    target.fill();
    target.fillStyle = piece.color;
    target.strokeStyle = rgba(piece.color, 0.28);
    target.lineWidth = 2;
    target.fillRect(pos.x - width / 2, pos.y - height, width, height);
    target.strokeRect(pos.x - width / 2, pos.y - height, width, height);
    target.fillStyle = rgba(piece.color, 0.74);
    target.beginPath();
    target.moveTo(pos.x - width / 2, pos.y - height);
    target.lineTo(pos.x - width / 2 + depth, pos.y - height - depth);
    target.lineTo(pos.x + width / 2 + depth, pos.y - height - depth);
    target.lineTo(pos.x + width / 2, pos.y - height);
    target.closePath();
    target.fill();
    target.restore();
  }

  function drawRing(target, piece, pos, scale) {
    const radius = 52 * scale;
    target.save();
    target.fillStyle = "rgba(0,0,0,0.28)";
    target.beginPath();
    target.ellipse(pos.x, pos.y + 5, radius * 1.12, 10 * scale, 0, 0, Math.PI * 2);
    target.fill();
    target.strokeStyle = piece.color;
    target.lineWidth = Math.max(5, 11 * scale);
    target.beginPath();
    target.arc(pos.x, pos.y - radius - 7 * scale, radius, 0, Math.PI * 2);
    target.stroke();
    target.strokeStyle = rgba(piece.color, 0.62);
    target.lineWidth = Math.max(2, 3 * scale);
    target.beginPath();
    target.moveTo(pos.x, pos.y - 8 * scale);
    target.lineTo(pos.x, pos.y);
    target.stroke();
    target.restore();
  }

  function drawLight(target, piece, pos, scale, L) {
    const spread = 138 * scale;
    const topWidth = 28 * scale;
    const topY = L.plan ? pos.y - spread : L.backY;
    if (L.plan) {
      // 平面では光は「床に落ちる円」として見える
      target.save();
      const pool = target.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, spread);
      pool.addColorStop(0, rgba(piece.color, 0.34));
      pool.addColorStop(1, rgba(piece.color, 0));
      target.fillStyle = pool;
      target.beginPath();
      target.arc(pos.x, pos.y, spread, 0, Math.PI * 2);
      target.fill();
      target.restore();
      return;
    }
    const gradient = target.createLinearGradient(0, topY, 0, pos.y);
    gradient.addColorStop(0, rgba(piece.color, 0.08));
    gradient.addColorStop(0.72, rgba(piece.color, 0.14));
    gradient.addColorStop(1, rgba(piece.color, 0.28));
    target.save();
    target.globalCompositeOperation = "screen";
    target.fillStyle = gradient;
    target.beginPath();
    target.moveTo(pos.x - topWidth, topY);
    target.lineTo(pos.x + topWidth, topY);
    target.lineTo(pos.x + spread, pos.y);
    target.lineTo(pos.x - spread, pos.y);
    target.closePath();
    target.fill();
    const pool = target.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, spread);
    pool.addColorStop(0, rgba(piece.color, 0.33));
    pool.addColorStop(1, rgba(piece.color, 0));
    target.fillStyle = pool;
    target.beginPath();
    target.ellipse(pos.x, pos.y, spread, 32 * scale, 0, 0, Math.PI * 2);
    target.fill();
    target.globalCompositeOperation = "source-over";
    target.restore();
  }

  // 平面図でのコマ。上から見るので、輪郭と向きだけを示す
  function drawPlanPiece(target, piece, pos, scale) {
    const r = Math.max(6, 26 * scale);
    target.save();
    if (piece.type === "performer") {
      target.fillStyle = piece.color;
      target.beginPath();
      target.arc(pos.x, pos.y, r * 0.62, 0, Math.PI * 2);
      target.fill();
      target.strokeStyle = "rgba(0,0,0,0.35)";
      target.lineWidth = 1.5;
      target.stroke();
    } else if (piece.type === "block") {
      target.fillStyle = piece.color;
      target.fillRect(pos.x - r, pos.y - r * 0.6, r * 2, r * 1.2);
      target.strokeStyle = "rgba(0,0,0,0.3)";
      target.lineWidth = 1.5;
      target.strokeRect(pos.x - r, pos.y - r * 0.6, r * 2, r * 1.2);
    } else if (piece.type === "ring") {
      target.strokeStyle = piece.color;
      target.lineWidth = Math.max(3, r * 0.3);
      target.beginPath();
      target.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      target.stroke();
    }
    target.restore();
  }

  function selectionBounds(piece, L) {
    const pos = place(piece.u, piece.v, L);
    const scale = pieceScale(piece, pos, L);
    if (L.plan) {
      const r = Math.max(10, 30 * scale);
      return { x: pos.x - r, y: pos.y - r, w: r * 2, h: r * 2 };
    }
    if (piece.type === "light") return { x: pos.x - 78 * scale, y: pos.y - 35 * scale, w: 156 * scale, h: 70 * scale };
    if (piece.type === "block") return { x: pos.x - 66 * scale, y: pos.y - 92 * scale, w: 132 * scale, h: 103 * scale };
    if (piece.type === "ring") return { x: pos.x - 66 * scale, y: pos.y - 128 * scale, w: 132 * scale, h: 139 * scale };
    return { x: pos.x - 60 * scale, y: pos.y - 143 * scale, w: 120 * scale, h: 154 * scale };
  }

  function drawSelection(target, piece, L) {
    const b = selectionBounds(piece, L);
    target.save();
    target.strokeStyle = "#d3ac59";
    target.lineWidth = 2;
    target.setLineDash([8, 7]);
    target.strokeRect(b.x - 7, b.y - 7, b.w + 14, b.h + 14);
    target.setLineDash([]);
    target.fillStyle = "#d3ac59";
    [[b.x - 7, b.y - 7], [b.x + b.w + 7, b.y - 7], [b.x - 7, b.y + b.h + 7], [b.x + b.w + 7, b.y + b.h + 7]]
      .forEach(([x, y]) => target.fillRect(x - 3, y - 3, 6, 6));
    target.restore();
  }

  function label(target, text, x, y, align) {
    target.save();
    target.fillStyle = "rgba(239,231,214,0.5)";
    target.font = "13px 'Hiragino Kaku Gothic ProN', sans-serif";
    target.textAlign = align || "center";
    target.textBaseline = "middle";
    target.fillText(text, x, y);
    target.restore();
  }

  /* ---------- 舞台そのものの描画（形式ごと） ---------- */

  function drawFrontVenue(target, L) {
    const v = L.venue;
    const rect = backdropRect(L);

    // 奥の面（背景）
    target.fillStyle = state.background;
    target.fillRect(rect.x, rect.y, rect.w, rect.h);
    target.drawImage(paintCanvas, 0, 0);

    const wallShade = target.createLinearGradient(rect.x, 0, rect.x + rect.w, 0);
    wallShade.addColorStop(0, "rgba(0,0,0,0.18)");
    wallShade.addColorStop(0.18, "rgba(0,0,0,0)");
    wallShade.addColorStop(0.82, "rgba(0,0,0,0)");
    wallShade.addColorStop(1, "rgba(0,0,0,0.18)");
    target.fillStyle = wallShade;
    target.fillRect(rect.x, rect.y, rect.w, rect.h);

    // 屋外は奥が空になる
    if (v.audience === "none") {
      const sky = target.createLinearGradient(0, rect.y, 0, L.floorY);
      sky.addColorStop(0, "rgba(28,38,48,0.85)");
      sky.addColorStop(1, "rgba(28,38,48,0)");
      target.fillStyle = sky;
      target.fillRect(rect.x, rect.y, rect.w, rect.h);
    }

    // ビッグトップは奥にも客席の段が見える（全周だから）
    if (v.audience === "round") {
      target.save();
      target.fillStyle = "rgba(20,17,14,0.72)";
      target.fillRect(rect.x, rect.y + rect.h * 0.44, rect.w, rect.h * 0.56);
      target.strokeStyle = "rgba(239,231,214,0.13)";
      target.lineWidth = 1;
      for (let i = 1; i <= 6; i += 1) {
        const y = rect.y + rect.h * 0.44 + (rect.h * 0.56 / 6) * i;
        target.beginPath();
        target.moveTo(rect.x, y);
        target.lineTo(rect.x + rect.w, y);
        target.stroke();
      }
      label(target, "向こう側の客席", L.centerX, rect.y + rect.h * 0.62);
      // テントの傾斜
      target.strokeStyle = "rgba(156,130,63,0.34)";
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(rect.x - 40, rect.y + 34);
      target.lineTo(L.centerX, rect.y - 74);
      target.lineTo(rect.x + rect.w + 40, rect.y + 34);
      target.stroke();
      target.restore();
    }

    // スラストは左右にも客席がある
    if (v.audience === "three") {
      target.save();
      target.fillStyle = "rgba(20,17,14,0.55)";
      target.fillRect(0, L.floorY - 30, rect.x - 4, H - L.floorY + 30);
      target.fillRect(rect.x + rect.w + 4, L.floorY - 30, W - rect.x - rect.w, H - L.floorY + 30);
      label(target, "客席", rect.x / 2, L.floorY + 90);
      label(target, "客席", rect.x + rect.w + (W - rect.x - rect.w) / 2, L.floorY + 90);
      target.restore();
    }

    // 床（台形）
    target.fillStyle = "#211b17";
    target.beginPath();
    target.moveTo(L.centerX - L.backW / 2, L.floorY);
    target.lineTo(L.centerX + L.backW / 2, L.floorY);
    target.lineTo(L.centerX + L.frontW / 2, L.bottomY);
    target.lineTo(L.centerX - L.frontW / 2, L.bottomY);
    target.closePath();
    target.fill();

    // 奥行きの目盛り
    target.strokeStyle = "rgba(239,231,214,0.09)";
    target.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach((ratio) => {
      const a = place(0, ratio, L);
      const b = place(1, ratio, L);
      target.beginPath();
      target.moveTo(a.x, a.y);
      target.lineTo(b.x, b.y);
      target.stroke();
    });
    [0.2, 0.4, 0.6, 0.8].forEach((u) => {
      const a = place(u, 0, L);
      const b = place(u, 1, L);
      target.beginPath();
      target.moveTo(a.x, a.y);
      target.lineTo(b.x, b.y);
      target.stroke();
    });

    // ビッグトップのリング（床に描かれた円）
    if (L.size.ring) {
      const ringW = L.size.ring * L.pxPerM;
      target.save();
      target.strokeStyle = "rgba(168,75,38,0.5)";
      target.lineWidth = 3;
      target.beginPath();
      target.ellipse(L.centerX, L.floorY + (L.bottomY - L.floorY) * 0.55, ringW / 2, ringW / 9, 0, 0, Math.PI * 2);
      target.stroke();
      label(target, `リング 直径${L.size.ring}m`, L.centerX, L.bottomY - 16);
      target.restore();
    }

    // 画面の外側を塗り、額縁を描く
    target.fillStyle = "#11100f";
    target.fillRect(0, 0, W, rect.y);
    if (v.frame) {
      // 額縁は舞台面の上と左右まで。床（エプロン側）は隠さない。
      // ここを床まで下ろすと、手前へ出したコマが枠の外に消えてしまう。
      target.fillRect(0, 0, rect.x, L.floorY);
      target.fillRect(rect.x + rect.w, 0, W - rect.x - rect.w, L.floorY);
      target.strokeStyle = "rgba(156,130,63,0.42)";
      target.lineWidth = 3;
      target.strokeRect(rect.x, rect.y, rect.w, L.floorY - rect.y);
    } else {
      target.strokeStyle = "rgba(156,130,63,0.2)";
      target.lineWidth = 1;
      target.strokeRect(rect.x, rect.y, rect.w, L.floorY - rect.y);
    }

    // 屋外は前端の外側に柵がある。正面図では奥行きを描けないので、境界の線1本と
    // 注記にとどめる。柵と音響卓の距離関係は平面図で見る。
    if (v.audience === "none") {
      target.save();
      target.strokeStyle = "rgba(168,75,38,0.4)";
      target.setLineDash([6, 6]);
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(0, L.bottomY + 8);
      target.lineTo(W, L.bottomY + 8);
      target.stroke();
      target.setLineDash([]);
      label(target, "この先は柵と観客エリア（客席という囲いは無い）", L.centerX, H - 20);
      target.restore();
    }

    target.strokeStyle = "rgba(239,231,214,0.18)";
    target.lineWidth = 1;
    target.beginPath();
    target.moveTo(L.centerX - L.backW / 2, L.floorY);
    target.lineTo(L.centerX + L.backW / 2, L.floorY);
    target.stroke();
  }

  function drawPlanVenue(target, L) {
    const v = L.venue;
    const s = L.stage;

    target.fillStyle = "#141210";
    target.fillRect(0, 0, W, H);

    // 客席
    target.save();
    target.fillStyle = "rgba(32,27,22,0.9)";
    if (v.audience === "front") {
      target.fillRect(s.x - 40, s.y + s.h + 14, s.w + 80, H - (s.y + s.h) - 30);
      label(target, "客席", W / 2, s.y + s.h + 58);
    } else if (v.audience === "three") {
      target.fillRect(s.x - 96, s.y + s.h * 0.25, 78, s.h * 0.75 + 60);
      target.fillRect(s.x + s.w + 18, s.y + s.h * 0.25, 78, s.h * 0.75 + 60);
      target.fillRect(s.x - 40, s.y + s.h + 14, s.w + 80, 76);
      label(target, "客席", W / 2, s.y + s.h + 52);
      label(target, "客席", s.x - 57, s.y + s.h * 0.6);
      label(target, "客席", s.x + s.w + 57, s.y + s.h * 0.6);
    } else if (v.audience === "round") {
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      const outer = Math.max(s.w, s.h) / 2 + 96;
      target.strokeStyle = "rgba(239,231,214,0.12)";
      target.lineWidth = 1;
      for (let i = 1; i <= 5; i += 1) {
        target.beginPath();
        target.arc(cx, cy, Math.max(s.w, s.h) / 2 + i * 19, 0, Math.PI * 2);
        target.stroke();
      }
      label(target, "客席が全周を囲む", cx, cy + outer + 4);
    }
    target.restore();

    // 舞台面
    target.save();
    if (v.audience === "round") {
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      const r = Math.min(s.w, s.h) / 2;
      target.fillStyle = "#241d18";
      target.beginPath();
      target.arc(cx, cy, r, 0, Math.PI * 2);
      target.fill();
      if (L.size.ring) {
        target.strokeStyle = "rgba(168,75,38,0.55)";
        target.lineWidth = 3;
        target.beginPath();
        target.arc(cx, cy, (L.size.ring * L.pxPerM) / 2, 0, Math.PI * 2);
        target.stroke();
        label(target, `リング 直径${L.size.ring}m`, cx, cy + (L.size.ring * L.pxPerM) / 2 + 18);
      }
    } else {
      target.fillStyle = "#241d18";
      target.fillRect(s.x, s.y, s.w, s.h);
      target.strokeStyle = "rgba(156,130,63,0.4)";
      target.lineWidth = 2;
      target.strokeRect(s.x, s.y, s.w, s.h);
    }
    target.restore();

    // 舞台のグリッド（1mごと。細かすぎるときは間引く）
    const step = L.size.width > 14 ? 2 : 1;
    target.save();
    target.strokeStyle = "rgba(239,231,214,0.07)";
    target.lineWidth = 1;
    for (let m = step; m < L.size.width; m += step) {
      const x = s.x + (m / L.size.width) * s.w;
      target.beginPath();
      target.moveTo(x, s.y);
      target.lineTo(x, s.y + s.h);
      target.stroke();
    }
    for (let m = step; m < L.size.depth; m += step) {
      const y = s.y + (m / L.size.depth) * s.h;
      target.beginPath();
      target.moveTo(s.x, y);
      target.lineTo(s.x + s.w, y);
      target.stroke();
    }
    target.restore();

    // 寸法の目安
    label(target, `間口 ${L.size.width}m`, s.x + s.w / 2, s.y - 22);
    label(target, `奥行 ${L.size.depth}m`, s.x - 46, s.y + s.h / 2);

    // 屋外は柵とFOHの距離
    if (v.audience === "none") {
      target.save();
      VENUES.outdoorMarks.forEach((mark) => {
        const y = s.y + s.h + (H - s.y - s.h) * mark.ratio;
        target.strokeStyle = "rgba(168,75,38,0.4)";
        target.setLineDash([7, 6]);
        target.lineWidth = 2;
        target.beginPath();
        target.moveTo(s.x - 60, y);
        target.lineTo(s.x + s.w + 60, y);
        target.stroke();
        target.setLineDash([]);
        label(target, mark.label, s.x + s.w / 2, y - 13);
      });
      target.restore();
    }

    // 客席は「どちらを向いているか」を示すためのもので、実距離では描いていない
    // （20m先まで実寸で描くと舞台が小さくなりすぎ、コマを置けなくなる）。
    // 距離の目安は言葉で添える。
    if (v.audience !== "none") {
      const limit = VENUES.sightLimits[0];
      label(target, `客席の広がりは方向を示すもので、実際の距離ではありません（${limit.m}mで${limit.label}）`,
        W / 2, H - 18);
    }
  }

  function drawStage(target, showSelection) {
    const L = layout();
    buildPaintLayer(L);
    target.save();
    target.clearRect(0, 0, W, H);
    target.fillStyle = "#0d0c0b";
    target.fillRect(0, 0, W, H);

    if (L.plan) drawPlanVenue(target, L);
    else drawFrontVenue(target, L);

    // コマ。光は先に（奥に）描く
    const draw = (piece) => {
      const pos = place(piece.u, piece.v, L);
      const scale = pieceScale(piece, pos, L);
      if (piece.type === "light") return drawLight(target, piece, pos, scale, L);
      if (L.plan) return drawPlanPiece(target, piece, pos, scale);
      if (piece.type === "performer") return drawPerformer(target, piece, pos, scale);
      if (piece.type === "block") return drawBlock(target, piece, pos, scale);
      if (piece.type === "ring") return drawRing(target, piece, pos, scale);
    };
    state.pieces.filter((p) => p.type === "light").forEach(draw);
    // 正面図では奥のコマから描く（重なりが自然になる）
    const solid = state.pieces.filter((p) => p.type !== "light");
    (L.plan ? solid : solid.slice().sort((a, b) => a.v - b.v)).forEach(draw);

    if (showSelection) {
      const selected = state.pieces.find((piece) => piece.id === selectedId);
      if (selected) drawSelection(target, selected, L);
    }

    if (!L.plan) {
      const edgeShade = target.createRadialGradient(W / 2, H * 0.55, 180, W / 2, H * 0.55, W * 0.72);
      edgeShade.addColorStop(0.64, "rgba(0,0,0,0)");
      edgeShade.addColorStop(1, "rgba(0,0,0,0.3)");
      target.fillStyle = edgeShade;
      target.fillRect(0, 0, W, H);
    }
    target.restore();
  }

  function render() {
    drawStage(ctx, true);
    const v = venue();
    const size = venueSize();
    const counts = Object.keys(PIECE_TYPES)
      .map((type) => `${PIECE_TYPES[type]}${state.pieces.filter((piece) => piece.type === type).length}`)
      .join("、");
    canvas.setAttribute(
      "aria-label",
      `${v.label}（${size.label}）を${state.view === "plan" ? "上から見た平面図" : "客席から見た正面図"}。${counts}。背景の線${state.strokes.length}本。`);
    if (els.depthLabelBack) els.depthLabelBack.textContent = state.view === "plan" ? "奥（背面）" : "奥・背景";
    if (els.depthLabelFront) els.depthLabelFront.textContent = state.view === "plan" ? "手前（客席側）" : "手前・客席側";
  }

  /* ---------- 劇場のUI ---------- */

  function renderVenueControls() {
    const current = venue();
    const size = venueSize();

    if (els.venueList) {
      els.venueList.innerHTML = "";
      VENUES.list.forEach((v) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stage-venue";
        button.setAttribute("aria-pressed", String(v.id === current.id));
        const name = document.createElement("span");
        name.className = "stage-venue-name";
        name.textContent = v.label;
        const sub = document.createElement("span");
        sub.className = "stage-venue-sub";
        sub.textContent = v.short;
        button.append(name, sub);
        button.addEventListener("click", () => setVenue(v.id));
        els.venueList.append(button);
      });
    }

    if (els.sizeList) {
      els.sizeList.innerHTML = "";
      current.sizes.forEach((s) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stage-size";
        button.setAttribute("aria-pressed", String(s.id === size.id));
        button.textContent = s.label;
        button.addEventListener("click", () => setVenueSize(s.id));
        els.sizeList.append(button);
      });
    }

    if (els.venueNote) els.venueNote.textContent = current.note;
    if (els.venueScale) {
      const bits = [`間口 ${size.width}m`, `奥行 ${size.depth}m`];
      if (size.height) bits.push(`高さ ${size.height}m`);
      if (size.ring) bits.push(`リング ${size.ring}m`);
      if (size.seats) bits.push(`客席 約${size.seats}席`);
      if (size.crowd) bits.push(`観客 〜${size.crowd.toLocaleString()}人`);
      els.venueScale.textContent = bits.join(" ・ ") + `（${current.source}）`;
    }

    els.viewButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.stageView === state.view));
    });
  }

  function setVenue(id) {
    if (state.venue === id) return;
    checkpoint();
    state.venue = id;
    state.venueSize = VENUES.sizeById(VENUES.byId(id), state.venueSize).id;
    renderVenueControls();
    render();
    persistSoon();
    announce(`${venue().label}へ切り替えました。コマの配置はそのまま残ります。`);
  }

  function setVenueSize(id) {
    if (state.venueSize === id) return;
    checkpoint();
    state.venueSize = id;
    renderVenueControls();
    render();
    persistSoon();
    announce(`規模を${venueSize().label}にしました。`);
  }

  function setView(next) {
    if (state.view === next) return;
    state.view = next;
    selectedId = null;
    renderVenueControls();
    updateInspector();
    render();
    persistSoon();
    announce(next === "plan" ? "上から見た平面図へ切り替えました。" : "客席から見た正面図へ切り替えました。");
  }

  /* ---------- 操作 ---------- */

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (W / rect.width),
      y: (event.clientY - rect.top) * (H / rect.height),
    };
  }

  function onBackdrop(point, L) {
    const rect = backdropRect(L);
    if (!rect) return false;
    return point.x >= rect.x && point.x <= rect.x + rect.w &&
      point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function hitTest(point, L) {
    for (let i = state.pieces.length - 1; i >= 0; i -= 1) {
      const piece = state.pieces[i];
      const b = selectionBounds(piece, L);
      if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) return piece;
    }
    return null;
  }

  function selectedPiece() {
    return state.pieces.find((piece) => piece.id === selectedId) || null;
  }

  function setTool(nextTool) {
    if (state.view === "plan" && nextTool !== "select") {
      announce("背景の塗りは正面図で行います。");
      return;
    }
    tool = nextTool;
    canvas.dataset.tool = tool;
    document.querySelectorAll("[data-stage-tool]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.stageTool === tool));
    });
    els.toolHint.textContent = TOOL_HINTS[tool];
  }

  function updateInspector() {
    const piece = selectedPiece();
    els.selectionEmpty.hidden = Boolean(piece);
    els.selectionControls.hidden = !piece;
    if (!piece) return;
    const sameType = state.pieces.filter((candidate) => candidate.type === piece.type);
    els.selectedName.textContent = `${PIECE_TYPES[piece.type]} ${sameType.indexOf(piece) + 1}`;
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
      u: clamp(0.5 + ((count % 5) - 2) * 0.07, 0.06, 0.94),
      v: clamp(0.55 + (count % 3) * 0.08, 0.05, 0.95),
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
    const copy = { ...piece, id: nextId(), u: clamp(piece.u + 0.06, 0, 1), v: clamp(piece.v + 0.04, 0, 1) };
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
    const L = layout();
    const point = pointFromEvent(event);
    canvas.focus();

    if (tool === "select") {
      const hit = hitTest(point, L);
      selectedId = hit ? hit.id : null;
      updateInspector();
      render();
      if (!hit) return;
      const pos = place(hit.u, hit.v, L);
      canvas.setPointerCapture(event.pointerId);
      canvas.dataset.dragging = "true";
      pointerAction = {
        kind: "drag", pointerId: event.pointerId, id: hit.id,
        offsetX: point.x - pos.x, offsetY: point.y - pos.y,
        before: snapshot(), moved: false,
      };
      return;
    }

    if (!onBackdrop(point, L)) {
      announce("背景の枠内から塗り始めてください。");
      return;
    }
    const rect = backdropRect(L);
    checkpoint();
    const stroke = {
      color: state.paintColor,
      width: state.brushSize,
      erase: tool === "erase",
      points: [{ u: (point.x - rect.x) / rect.w, v: (point.y - rect.y) / rect.h }],
    };
    state.strokes.push(stroke);
    canvas.setPointerCapture(event.pointerId);
    pointerAction = { kind: "stroke", pointerId: event.pointerId, stroke, moved: true };
    render();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
    const L = layout();
    const point = pointFromEvent(event);

    if (pointerAction.kind === "drag") {
      const piece = state.pieces.find((candidate) => candidate.id === pointerAction.id);
      if (!piece) return;
      if (!pointerAction.moved) {
        recordBefore(pointerAction.before);
        pointerAction.moved = true;
      }
      const next = fromScreen(point.x - pointerAction.offsetX, point.y - pointerAction.offsetY, L);
      piece.u = next.u;
      piece.v = next.v;
      render();
      return;
    }

    const rect = backdropRect(L);
    if (!rect) return;
    const bounded = {
      u: clamp((point.x - rect.x) / rect.w, 0, 1),
      v: clamp((point.y - rect.y) / rect.h, 0, 1),
    };
    const points = pointerAction.stroke.points;
    const previous = points[points.length - 1];
    if (Math.hypot((bounded.u - previous.u) * rect.w, (bounded.v - previous.v) * rect.h) >= 3) {
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
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!moves[event.key]) return;
    event.preventDefault();
    checkpoint();
    const amount = event.shiftKey ? 0.05 : 0.016;
    piece.u = clamp(piece.u + moves[event.key][0] * amount, 0, 1);
    // 上キーは「奥へ」。正面図でも平面図でも同じ向きになるようにする
    piece.v = clamp(piece.v - moves[event.key][1] * amount, 0, 1);
    render();
    persistSoon();
  });

  document.querySelectorAll("[data-stage-tool]").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.stageTool));
  });
  document.querySelectorAll("[data-stage-add]").forEach((button) => {
    button.addEventListener("click", () => addPiece(button.dataset.stageAdd));
  });
  els.viewButtons.forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.stageView));
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
    const keep = { venue: state.venue, venueSize: state.venueSize, view: state.view };
    state = Object.assign(baseState(false), keep);
    selectedId = null;
    syncInputs();
    renderVenueControls();
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
      String(now.getDate()).padStart(2, "0"), "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
    ].join("");
    els.export.href = output.toDataURL("image/png");
    els.export.download = `stage-${state.venue}-${state.view}-${stamp}.png`;
    announce("舞台スケッチをPNG画像として書き出しました。");
  });

  syncInputs();
  renderVenueControls();
  setTool("select");
  updateInspector();
  updateHistoryButtons();
  render();
  els.saveStatus.textContent = loaded.restored
    ? "この端末に保存した前回のスケッチを開きました。"
    : "変更はこの端末のブラウザ内へ自動保存します。";
})();

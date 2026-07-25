/* 舞台スケッチ — 2Dの構図・色・距離感を試すためのローカル制作道具。
   技術図面や3D舞台設計とは分離し、状態はこのブラウザ内だけに保存する。

   劇場形式（プロセニアム／スラスト／ビッグトップ／屋外／ブラックボックス）を
   切り替えられる。形式ごとに客席の位置が変わり、それが構図の条件になる。

   座標は正規化して持つ（u: 左右 0-1、v: 奥行き 0-1）。形式や規模を変えても
   配置が保たれ、同じ配置を別の劇場で見直せるようにするため。

   規模は「舞台を画面いっぱいに描き、人の大きさを舞台に対する比率で決める」形で
   表す。18mの舞台では人が小さく見える。寸法そのものは編集させない（設計計画書 8.5節）。 */

(function () {
  "use strict";

  const canvas = document.getElementById("stage-canvas");
  if (!canvas) return;
  const VENUES = window.SHOSAI_VENUES;
  if (!VENUES) return;

  const planCanvas = document.getElementById("stage-plan-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const planCtx = planCanvas ? planCanvas.getContext("2d", { alpha: false }) : null;
  // どちらのキャンバスがどの視点かを引く
  const viewOf = (el) => (el === planCanvas ? "plan" : "front");
  const paintCanvas = document.createElement("canvas");
  paintCanvas.width = canvas.width;
  paintCanvas.height = canvas.height;
  const paintCtx = paintCanvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  const STORAGE_KEY = "shosai-stage-sketch-v1";
  const HISTORY_LIMIT = 36;
  const PIECE_TYPES = {
    performer: "人物",
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
    select: "人物や物を選び、舞台の上で動かします。",
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
    venueSelect: document.getElementById("stage-venue-select"),
    sizeSelect: document.getElementById("stage-size-select"),
    showFront: document.getElementById("stage-show-front"),
    showPlan: document.getElementById("stage-show-plan"),
    frontCell: document.getElementById("stage-front-cell"),
    planCell: document.getElementById("stage-plan-cell"),
    canvasStack: document.getElementById("stage-canvas-stack"),
    frontCaption: document.getElementById("stage-front-caption"),
    venueNote: document.getElementById("stage-venue-note"),
    venueScale: document.getElementById("stage-venue-scale"),
    bgSection: document.getElementById("stage-bg-section"),
    seatSection: document.getElementById("stage-seat-section"),
    seatList: document.getElementById("stage-seat-list"),
    seatNote: document.getElementById("stage-seat-note"),
    compare: document.getElementById("stage-compare"),
    projectTitle: document.getElementById("stage-project-title"),
    versionLabel: document.getElementById("stage-version-label"),
    versionCopy: document.getElementById("stage-version-copy"),
    versionNote: document.getElementById("stage-version-note"),
    exportJson: document.getElementById("stage-export-json"),
    importJson: document.getElementById("stage-import-json"),
    sceneList: document.getElementById("stage-scene-list"),
    sceneAdd: document.getElementById("stage-scene-add"),
    sceneDup: document.getElementById("stage-scene-dup"),
    sceneLeft: document.getElementById("stage-scene-left"),
    sceneRight: document.getElementById("stage-scene-right"),
    sceneDel: document.getElementById("stage-scene-del"),
    sceneTitle: document.getElementById("stage-scene-title"),
    sceneNote: document.getElementById("stage-scene-note"),
    pieceName: document.getElementById("stage-piece-name"),
    castList: document.getElementById("stage-cast-list"),
    castName: document.getElementById("stage-cast-name"),
    castAdd: document.getElementById("stage-cast-add"),
    frontInner: document.getElementById("stage-front-inner"),
    planInner: document.getElementById("stage-plan-inner"),
    showNames: document.getElementById("stage-show-names"),
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

  const nowIso = () => new Date().toISOString();
  const rid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

  function newScene(title, withExample) {
    return {
      id: rid("scene"),
      title: title || "場面 1",
      note: "",
      background: "#40362d",
      pieces: withExample
        ? [
            { id: "stage-sample-performer-1", type: "performer", u: 0.36, v: 0.62, size: 105, color: "#a84b26", name: "演者A" },
            { id: "stage-sample-performer-2", type: "performer", u: 0.66, v: 0.48, size: 92, color: "#77865f", name: "演者B" },
            { id: "stage-sample-block-1", type: "block", u: 0.51, v: 0.7, size: 88, color: "#efe7d6", name: "台" },
          ]
        : [],
      strokes: [],
    };
  }

  function baseState(withExample) {
    const scene = newScene("場面 1", withExample);
    return {
      version: 3,
      // ショー一つ分。劇場はショー単位で共通に持つ
      project: {
        id: rid("proj"),
        title: "無題のショー",
        versionLabel: "v1",
        parentVersionId: null,
        branchReason: "",
        createdAt: nowIso(),
        venue: "proscenium",
        venueSize: "mid",
        // このショーに出る人。場面ごとの在／不在は pieces 側で決まる
        cast: [],
        scenes: [scene],
        activeSceneId: scene.id,
      },
      // 画面の状態。プロジェクトの内容ではないので、共有や書き出しには含めない
      showFront: true,
      showPlan: false,
      showNames: true,
      seat: "center",
      // パネルの置き場所と開閉。中央は絵の順序だけを持つ
      layout: defaultLayout(),
      pieceColor: "#a84b26",
      paintColor: "#efe7d6",
      brushSize: 42,
    };
  }

  /* ---------- パネルの配置 ----------
     どの道具をどちら側へ置くかは人によって違う。列を移せるようにし、
     使わないものは畳めるようにする。中央は絵だけで、上下の入れ替えのみ。 */
  const PANELS = ["project", "venue", "cast", "tools", "pieces", "background", "scenes", "inspector", "save"];

  function defaultLayout() {
    return {
      // 場面は絵のすぐ右に置く（順番を見ながら描くため）
      cols: {
        project: "left", venue: "left", cast: "left", tools: "left", pieces: "left", background: "left",
        scenes: "right", inspector: "right", save: "right",
      },
      order: {
        project: 0, venue: 1, cast: 2, tools: 3, pieces: 4, background: 5,
        scenes: 0, inspector: 1, save: 2,
      },
      collapsed: {},
      centerOrder: ["front", "plan"],
    };
  }

  function normalizeLayout(raw) {
    const base = defaultLayout();
    if (!raw || typeof raw !== "object") return base;
    const cols = {};
    const order = {};
    const collapsed = {};
    PANELS.forEach((id) => {
      const c = raw.cols && raw.cols[id];
      cols[id] = c === "left" || c === "right" ? c : base.cols[id];
      const o = raw.order && Number(raw.order[id]);
      order[id] = Number.isFinite(o) ? o : base.order[id];
      collapsed[id] = Boolean(raw.collapsed && raw.collapsed[id]);
    });
    const co = Array.isArray(raw.centerOrder) ? raw.centerOrder.filter((x) => x === "front" || x === "plan") : [];
    const centerOrder = co.length === 2 ? co : base.centerOrder;
    return { cols, order, collapsed, centerOrder };
  }

  // 舞台に出す名前。登録した人物なら名簿から引き、そうでなければ個別の名前
  function pieceLabel(piece) {
    if (piece.castId) {
      const member = state.project.cast.find((c) => c.id === piece.castId);
      if (member) return member.name;
    }
    return piece.name || "";
  }

  // いま開いている場面
  function sc() {
    const p = state.project;
    return p.scenes.find((x) => x.id === p.activeSceneId) || p.scenes[0];
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
      name: typeof piece.name === "string" ? piece.name.slice(0, 24) : "",
      castId: typeof piece.castId === "string" ? piece.castId : null,
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

  function normalizeScene(raw, index) {
    const fallbackBg = "#40362d";
    return {
      id: typeof raw.id === "string" ? raw.id : rid("scene"),
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title : `場面 ${index + 1}`,
      note: typeof raw.note === "string" ? raw.note : "",
      background: validColor(raw.background, fallbackBg),
      pieces: Array.isArray(raw.pieces) ? raw.pieces.slice(-80).map(normalizePiece) : [],
      strokes: Array.isArray(raw.strokes)
        ? raw.strokes.slice(-240).map(normalizeStroke).filter((stroke) => stroke.points.length)
        : [],
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return baseState(true);
    const fallback = baseState(false);

    // v2以前は「1枚のスケッチ」だった。1場面のプロジェクトとして引き上げる
    const legacyFlat = !raw.project && (Array.isArray(raw.pieces) || raw.version === 2 || raw.version === 1);
    const rawProject = legacyFlat
      ? {
          title: "無題のショー",
          venue: raw.venue, venueSize: raw.venueSize,
          scenes: [{ title: "場面 1", background: raw.background, pieces: raw.pieces, strokes: raw.strokes }],
        }
      : (raw.project && typeof raw.project === "object" ? raw.project : fallback.project);

    const venue = VENUES.byId(typeof rawProject.venue === "string" ? rawProject.venue : fallback.project.venue);
    const size = VENUES.sizeById(venue, typeof rawProject.venueSize === "string" ? rawProject.venueSize : "");
    let scenes = Array.isArray(rawProject.scenes) ? rawProject.scenes.slice(0, 60).map(normalizeScene) : [];
    if (!scenes.length) scenes = [newScene("場面 1", false)];
    const activeId = scenes.some((x) => x.id === rawProject.activeSceneId)
      ? rawProject.activeSceneId : scenes[0].id;

    return {
      version: 3,
      project: {
        id: typeof rawProject.id === "string" ? rawProject.id : rid("proj"),
        title: typeof rawProject.title === "string" && rawProject.title.trim() ? rawProject.title : "無題のショー",
        versionLabel: typeof rawProject.versionLabel === "string" && rawProject.versionLabel.trim()
          ? rawProject.versionLabel : "v1",
        parentVersionId: typeof rawProject.parentVersionId === "string" ? rawProject.parentVersionId : null,
        branchReason: typeof rawProject.branchReason === "string" ? rawProject.branchReason : "",
        createdAt: typeof rawProject.createdAt === "string" ? rawProject.createdAt : nowIso(),
        venue: venue.id,
        venueSize: size.id,
        cast: Array.isArray(rawProject.cast)
          ? rawProject.cast.slice(0, 60).map((c, i) => ({
              id: typeof c.id === "string" ? c.id : rid("cast"),
              name: typeof c.name === "string" && c.name.trim() ? c.name.slice(0, 24) : `人物 ${i + 1}`,
              color: validColor(c.color, "#a84b26"),
            }))
          : [],
        scenes,
        activeSceneId: activeId,
      },
      showFront: raw.showFront === undefined ? raw.view !== "plan" : Boolean(raw.showFront),
      showPlan: raw.showPlan === undefined ? raw.view === "plan" : Boolean(raw.showPlan),
      showNames: raw.showNames === undefined ? true : Boolean(raw.showNames),
      layout: normalizeLayout(raw.layout),
      seat: VENUES.seatById(typeof raw.seat === "string" ? raw.seat : "").id,
      pieceColor: validColor(raw.pieceColor, fallback.pieceColor),
      paintColor: validColor(raw.paintColor, fallback.paintColor),
      brushSize: clamp(finite(raw.brushSize, fallback.brushSize), 12, 120),
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

  const venue = () => VENUES.byId(state.project.venue);
  const venueSize = () => VENUES.sizeById(venue(), state.project.venueSize);

  /* ---------- レイアウト ----------
     舞台は常に画面いっぱいに描く。実寸の違いは「人の小ささ」として出る。 */

  function layout(view) {
    const v = venue();
    const size = venueSize();
    const plan = view === "plan";

    if (plan) {
      // 平面図: 上が奥、下が客席側。舞台の縦横比を保って収める。
      // 全周形式は客席が四方に要るので、舞台の取り分を減らす。
      const pad = v.audience === "round" ? 176 : 104;
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

    // 正面図: 奥のラインと手前のラインの間で擬似パースを作る。
    // 客席の位置（席）によって、床の厚み・幅の開き・消失点の左右が変わる。
    const seat = VENUES.seatById(state.seat);
    return {
      plan: false, venue: v, size, seat,
      backY: seat.backY,
      floorY: seat.floorY,
      bottomY: seat.bottomY,
      backW: W * seat.backW,
      frontW: W * seat.frontW,
      shift: (seat.shift || 0) * W * 0.5,
      centerX: W / 2,
      // 最前列の実寸幅を基準に、1mあたりのpxを出す
      pxPerM: (W * seat.frontW) / size.width,
    };
  }

  // 正規化座標 → 画面座標。奥行き v で幅とスケールが変わる。
  // v=0 が最奥、v=1 が最前。正面図でも平面図でも「画面の下ほど手前」で揃える。
  function place(u, v, L) {
    if (L.plan) {
      return {
        x: L.stage.x + u * L.stage.w,
        y: L.stage.y + v * L.stage.h,
        scale: 1,
        stretch: 1,
      };
    }
    const y = L.floorY + v * (L.bottomY - L.floorY);
    const halfW = (L.backW + v * (L.frontW - L.backW)) / 2;
    // 横の席では、奥ほど横へ流れる。手前は席の正面なのでずれない
    const slide = (L.shift || 0) * (1 - v);
    const rise = (L.seat && L.seat.rise) || 0;
    return {
      x: L.centerX + slide + (u - 0.5) * halfW * 2,
      y,
      scale: (L.backW + v * (L.frontW - L.backW)) / L.frontW,
      // 煽りも見下ろしも、近いものほど強く効く。正で縦に伸び、負で縦に詰まる
      stretch: 1 + rise * v,
    };
  }

  function fromScreen(x, y, L) {
    if (L.plan) {
      return {
        u: clamp((x - L.stage.x) / L.stage.w, 0, 1),
        v: clamp((y - L.stage.y) / L.stage.h, 0, 1),
      };
    }
    const v = clamp((y - L.floorY) / (L.bottomY - L.floorY), 0, 1);
    const halfW = (L.backW + v * (L.frontW - L.backW)) / 2;
    const slide = (L.shift || 0) * (1 - v);
    return { u: clamp((x - L.centerX - slide) / (halfW * 2) + 0.5, 0, 1), v };
  }

  // 実寸（m）から画面上の高さを出す。size は基準に対する倍率
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
    if (!sc().pieces.some((piece) => piece.id === selectedId)) selectedId = null;
    syncInputs();
    applyLayout();
    renderScenes();
    renderCast();
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

  // 舞台の奥に当たる領域。背景を描くにも客席を描くにも使う
  function backAreaRect(L) {
    if (L.plan) return null;
    const halfBack = L.backW / 2;
    // 奥は消失点と一緒に動く（横の席からは奥も斜めに見える）
    return { x: L.centerX + (L.shift || 0) - halfBack, y: L.backY, w: L.backW, h: L.floorY - L.backY };
  }

  // 筆で塗れる背景の壁。全周形式（ビッグトップ）は奥も客席なので壁が無い
  function backdropRect(L) {
    if (L.plan || L.venue.audience === "round") return null;
    return backAreaRect(L);
  }

  // リングの楕円。舞台面に描かれた円なので、床の台形の中に収まる
  function ringEllipse(L) {
    if (!L.size.ring) return null;
    const vRing = 0.5;
    const center = place(0.5, vRing, L);
    const widthAtRing = L.backW + vRing * (L.frontW - L.backW);
    return {
      x: center.x, y: center.y,
      rx: (L.size.ring / L.size.width) * widthAtRing / 2,
      ry: (L.size.ring / L.size.depth) * (L.bottomY - L.floorY) / 2,
    };
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

    sc().strokes.forEach((stroke) => {
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

  /* ---------- 人物と物の描画 ---------- */

  function drawPerformer(target, piece, pos, scale) {
    target.save();
    target.translate(pos.x, pos.y);
    target.scale(scale, scale * (pos.stretch || 1));
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
    const stretch = pos.stretch || 1;
    const width = 112 * scale;
    const height = 66 * scale * stretch;
    const depth = 18 * scale * stretch;
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
    const stretch = pos.stretch || 1;
    const radius = 52 * scale;
    target.save();
    target.fillStyle = "rgba(0,0,0,0.28)";
    target.beginPath();
    target.ellipse(pos.x, pos.y + 5, radius * 1.12, 10 * scale, 0, 0, Math.PI * 2);
    target.fill();
    target.strokeStyle = piece.color;
    target.lineWidth = Math.max(5, 11 * scale);
    target.beginPath();
    target.ellipse(pos.x, pos.y - (radius + 7 * scale) * stretch, radius, radius * stretch, 0, 0, Math.PI * 2);
    target.stroke();
    target.strokeStyle = rgba(piece.color, 0.62);
    target.lineWidth = Math.max(2, 3 * scale);
    target.beginPath();
    target.moveTo(pos.x, pos.y - 8 * scale * stretch);
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

  // 平面図。上から見るので、輪郭と向きだけを示す
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
    const st = pos.stretch || 1;
    if (piece.type === "light") return { x: pos.x - 78 * scale, y: pos.y - 35 * scale, w: 156 * scale, h: 70 * scale };
    if (piece.type === "block") return { x: pos.x - 66 * scale, y: pos.y - 92 * scale * st, w: 132 * scale, h: 103 * scale * st };
    if (piece.type === "ring") return { x: pos.x - 66 * scale, y: pos.y - 128 * scale * st, w: 132 * scale, h: 139 * scale * st };
    return { x: pos.x - 60 * scale, y: pos.y - 143 * scale * st, w: 120 * scale, h: 154 * scale * st };
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
    const back = backAreaRect(L);
    const wall = backdropRect(L);          // 塗れる背景の壁。全周形式には無い
    const ring = ringEllipse(L);
    const roundHouse = v.audience === "round";

    // ---- 奥 ----
    if (wall) {
      target.fillStyle = sc().background;
      target.fillRect(wall.x, wall.y, wall.w, wall.h);
      target.drawImage(paintCanvas, 0, 0);

      const wallShade = target.createLinearGradient(wall.x, 0, wall.x + wall.w, 0);
      wallShade.addColorStop(0, "rgba(0,0,0,0.18)");
      wallShade.addColorStop(0.18, "rgba(0,0,0,0)");
      wallShade.addColorStop(0.82, "rgba(0,0,0,0)");
      wallShade.addColorStop(1, "rgba(0,0,0,0.18)");
      target.fillStyle = wallShade;
      target.fillRect(wall.x, wall.y, wall.w, wall.h);

      // 屋外は奥が空になる
      if (v.audience === "none") {
        const sky = target.createLinearGradient(0, wall.y, 0, L.floorY);
        sky.addColorStop(0, "rgba(28,38,48,0.85)");
        sky.addColorStop(1, "rgba(28,38,48,0)");
        target.fillStyle = sky;
        target.fillRect(wall.x, wall.y, wall.w, wall.h);
      }
    }

    // 全周形式は奥も客席。背景の壁を持たないので、客席の段だけを描く
    if (roundHouse) {
      target.save();
      target.fillStyle = "rgba(18,15,13,0.95)";
      target.fillRect(0, back.y, W, L.floorY - back.y);
      target.strokeStyle = "rgba(239,231,214,0.1)";
      target.lineWidth = 1;
      const rows = 7;
      for (let i = 1; i <= rows; i += 1) {
        const t = i / rows;
        const y = back.y + (L.floorY - back.y) * t;
        // 奥の段ほど幅が狭い（すり鉢状に見せる）
        const inset = (1 - t) * W * 0.16;
        target.beginPath();
        target.moveTo(inset, y);
        target.lineTo(W - inset, y);
        target.stroke();
      }
      label(target, "向こう側の客席", L.centerX, back.y + (L.floorY - back.y) * 0.34);
      // テントの傾斜
      target.strokeStyle = "rgba(156,130,63,0.3)";
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(back.x - 60, back.y + 40);
      target.lineTo(L.centerX, back.y - 80);
      target.lineTo(back.x + back.w + 60, back.y + 40);
      target.stroke();
      target.restore();
    }

    // スラストは左右にも客席がある
    if (v.audience === "three") {
      target.save();
      target.fillStyle = "rgba(20,17,14,0.55)";
      target.fillRect(0, L.floorY - 30, back.x - 4, H - L.floorY + 30);
      target.fillRect(back.x + back.w + 4, L.floorY - 30, W - back.x - back.w, H - L.floorY + 30);
      label(target, "客席", back.x / 2, L.floorY + 90);
      label(target, "客席", back.x + back.w + (W - back.x - back.w) / 2, L.floorY + 90);
      target.restore();
    }

    // ---- 床 ----
    // 全周形式の舞台面はリングの内側だけ。その外は客席なので床を敷かない。
    const floorPath = () => {
      target.beginPath();
      if (roundHouse && ring) {
        target.ellipse(ring.x, ring.y, ring.rx, ring.ry, 0, 0, Math.PI * 2);
      } else {
        const shiftBack = L.shift || 0;
        target.moveTo(L.centerX + shiftBack - L.backW / 2, L.floorY);
        target.lineTo(L.centerX + shiftBack + L.backW / 2, L.floorY);
        target.lineTo(L.centerX + L.frontW / 2, L.bottomY);
        target.lineTo(L.centerX - L.frontW / 2, L.bottomY);
        target.closePath();
      }
    };

    target.save();
    target.fillStyle = "#211b17";
    floorPath();
    target.fill();

    // 床の目盛りは床の内側にだけ引く
    floorPath();
    target.clip();
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
    target.restore();

    // リングの縁
    if (ring) {
      target.save();
      target.strokeStyle = "rgba(168,75,38,0.55)";
      target.lineWidth = 3;
      target.beginPath();
      target.ellipse(ring.x, ring.y, ring.rx, ring.ry, 0, 0, Math.PI * 2);
      target.stroke();
      label(target, `リング 直径${L.size.ring}m`, ring.x, Math.min(ring.y + ring.ry + 17, H - 12));
      target.restore();
    }

    // ---- 枠 ----
    target.fillStyle = "#11100f";
    target.fillRect(0, 0, W, back.y);
    if (v.frame) {
      // 額縁は舞台面の上と左右まで。床（エプロン側）は隠さない。
      target.fillRect(0, 0, back.x, L.floorY);
      target.fillRect(back.x + back.w, 0, W - back.x - back.w, L.floorY);
      target.strokeStyle = "rgba(156,130,63,0.42)";
      target.lineWidth = 3;
      target.strokeRect(back.x, back.y, back.w, L.floorY - back.y);
    } else if (!roundHouse) {
      target.strokeStyle = "rgba(156,130,63,0.2)";
      target.lineWidth = 1;
      target.strokeRect(back.x, back.y, back.w, L.floorY - back.y);
    }

    // 屋外は前端の外側に柵がある。奥行きを描けないので境界の線1本と注記にとどめる。
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

    // 舞台面の奥のライン。全周形式はリングが境界なので引かない
    if (!roundHouse) {
      target.strokeStyle = "rgba(239,231,214,0.18)";
      target.lineWidth = 1;
      target.beginPath();
      target.moveTo(L.centerX + (L.shift || 0) - L.backW / 2, L.floorY);
      target.lineTo(L.centerX + (L.shift || 0) + L.backW / 2, L.floorY);
      target.stroke();
    }
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
      const base = Math.max(s.w, s.h) / 2;
      target.strokeStyle = "rgba(239,231,214,0.12)";
      target.lineWidth = 1;
      for (let i = 1; i <= 5; i += 1) {
        target.beginPath();
        target.arc(cx, cy, base + i * 19, 0, Math.PI * 2);
        target.stroke();
      }
      label(target, "客席が全周を囲む", cx, Math.min(cy + base + 5 * 19 + 16, H - 44));
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
    // （20m先まで実寸で描くと舞台が小さくなりすぎ、置けなくなる）。
    // 距離の目安は言葉で添える。
    if (v.audience !== "none") {
      const limit = VENUES.sightLimits[0];
      label(target, `客席の広がりは方向の目安です（${limit.m}mで${limit.label}）`, W / 2, H - 16);
    }
  }

  function drawStage(target, showSelection, view) {
    const L = layout(view);
    buildPaintLayer(L);
    target.save();
    target.clearRect(0, 0, W, H);
    target.fillStyle = "#0d0c0b";
    target.fillRect(0, 0, W, H);

    if (L.plan) drawPlanVenue(target, L);
    else drawFrontVenue(target, L);

    // 人物と物。光は先に（奥に）描く
    const draw = (piece) => {
      const pos = place(piece.u, piece.v, L);
      const scale = pieceScale(piece, pos, L);
      if (piece.type === "light") return drawLight(target, piece, pos, scale, L);
      if (L.plan) return drawPlanPiece(target, piece, pos, scale);
      if (piece.type === "performer") return drawPerformer(target, piece, pos, scale);
      if (piece.type === "block") return drawBlock(target, piece, pos, scale);
      if (piece.type === "ring") return drawRing(target, piece, pos, scale);
    };
    sc().pieces.filter((p) => p.type === "light").forEach(draw);
    // 正面図では奥から描く（重なりが自然になる）
    const solid = sc().pieces.filter((p) => p.type !== "light");
    (L.plan ? solid : solid.slice().sort((a, b) => a.v - b.v)).forEach(draw);

    // 名前。頭上（平面では点の脇）に小さく置く
    if (state.showNames) {
      sc().pieces.forEach((piece) => {
        const labelText = pieceLabel(piece);
        if (!labelText) return;
        const pos = place(piece.u, piece.v, L);
        const scale = pieceScale(piece, pos, L);
        const b = selectionBounds(piece, L);
        const x = L.plan ? pos.x : pos.x;
        const y = L.plan ? b.y - 9 : b.y - 10;
        target.save();
        target.font = `${Math.max(10, Math.round(13 * (L.plan ? 1 : Math.min(1.4, scale))))}px 'Hiragino Kaku Gothic ProN', sans-serif`;
        target.textAlign = "center";
        target.textBaseline = "bottom";
        const w = target.measureText(labelText).width;
        target.fillStyle = "rgba(13,12,11,0.66)";
        target.fillRect(x - w / 2 - 6, y - 15, w + 12, 18);
        target.fillStyle = "rgba(239,231,214,0.9)";
        target.fillText(labelText, x, y);
        target.restore();
      });
    }

    if (showSelection) {
      const selected = sc().pieces.find((piece) => piece.id === selectedId);
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
    const v = venue();
    const size = venueSize();
    const counts = Object.keys(PIECE_TYPES)
      .map((type) => `${PIECE_TYPES[type]}${sc().pieces.filter((piece) => piece.type === type).length}`)
      .join("、");

    // 閉じてもバーは残す。ここから開き直せるので「見る向き」の項目は要らない
    if (els.frontInner) els.frontInner.hidden = !state.showFront;
    if (els.planInner) els.planInner.hidden = !state.showPlan;
    if (els.frontCell) els.frontCell.classList.toggle("is-closed", !state.showFront);
    if (els.planCell) els.planCell.classList.toggle("is-closed", !state.showPlan);
    document.querySelectorAll("[data-toggle-view]").forEach((b) => {
      const open = b.dataset.toggleView === "front" ? state.showFront : state.showPlan;
      b.textContent = open ? "✕" : "＋";
      b.setAttribute("aria-label", `${b.dataset.toggleView === "front" ? "正面" : "平面"}の絵を${open ? "閉じる" : "開く"}`);
    });

    if (state.showFront) {
      drawStage(ctx, true, "front");
      canvas.setAttribute("aria-label",
        `${v.label}（${size.label}）を${VENUES.seatById(state.seat).label}から見た正面図。${counts}。背景の線${sc().strokes.length}本。`);
    }
    if (state.showPlan && planCtx) {
      drawStage(planCtx, true, "plan");
      planCanvas.setAttribute("aria-label",
        `${v.label}（${size.label}）を上から見た平面図。${counts}。`);
    }
    if (els.frontCaption) {
      els.frontCaption.textContent = `正面 — ${VENUES.seatById(state.seat).label}`;
    }
  }

  /* ---------- 劇場のUI ---------- */

  /* ---------- パネルの組み立てと並べ替え ---------- */

  const colEls = {
    left: document.getElementById("stage-col-left"),
    right: document.getElementById("stage-col-right"),
    center: document.getElementById("stage-col-center"),
  };
  let dragging = null;

  function panelEl(id) {
    return document.querySelector(`[data-panel="${id}"]`);
  }

  // 各パネルの頭にタイトル・畳むボタン・つまみを付ける（初回だけ）
  function buildPanelHeads() {
    PANELS.forEach((id) => {
      const el = panelEl(id);
      if (!el || el.querySelector(".stage-panel-head")) return;
      const head = document.createElement("button");
      head.type = "button";
      head.className = "stage-panel-head";
      head.dataset.panelHead = id;
      head.setAttribute("aria-expanded", "true");

      const grip = document.createElement("span");
      grip.className = "stage-panel-grip";
      grip.textContent = "⠿";
      grip.setAttribute("aria-hidden", "true");

      const title = document.createElement("span");
      title.className = "stage-panel-title";
      title.textContent = el.dataset.title || id;

      const mark = document.createElement("span");
      mark.className = "stage-panel-mark";
      mark.setAttribute("aria-hidden", "true");

      head.append(grip, title, mark);
      head.addEventListener("click", () => togglePanel(id));
      el.prepend(head);

      // つまみからドラッグする。パネル全体を掴むと中の操作ができなくなる
      el.draggable = false;
      grip.draggable = true;
      grip.addEventListener("dragstart", (e) => {
        dragging = id;
        el.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
      });
      grip.addEventListener("dragend", () => {
        dragging = null;
        el.classList.remove("is-dragging");
        document.querySelectorAll(".stage-col").forEach((c) => c.classList.remove("is-over"));
      });
    });
  }

  function togglePanel(id) {
    state.layout.collapsed[id] = !state.layout.collapsed[id];
    applyLayout();
    persistSoon();
  }

  // 状態に従って、パネルを列へ並べ直す
  function applyLayout() {
    const L = state.layout;
    ["left", "right"].forEach((col) => {
      const ids = PANELS.filter((id) => L.cols[id] === col).sort((a, b) => L.order[a] - L.order[b]);
      ids.forEach((id) => {
        const el = panelEl(id);
        if (el && colEls[col]) colEls[col].append(el);
      });
    });
    PANELS.forEach((id) => {
      const el = panelEl(id);
      if (!el) return;
      const collapsed = Boolean(L.collapsed[id]);
      el.classList.toggle("is-collapsed", collapsed);
      const head = el.querySelector(".stage-panel-head");
      if (head) head.setAttribute("aria-expanded", String(!collapsed));
      const body = el.querySelector(".stage-panel-body");
      if (body) body.hidden = collapsed;
    });
    // 中央は絵の順序だけ
    const stack = els.canvasStack;
    if (stack) {
      L.centerOrder.forEach((which) => {
        const cell = which === "front" ? els.frontCell : els.planCell;
        if (cell) stack.append(cell);
      });
    }
  }

  function setupDropZones() {
    Object.entries(colEls).forEach(([col, el]) => {
      if (!el || col === "center") return;
      el.addEventListener("dragover", (e) => {
        if (!dragging) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        el.classList.add("is-over");
      });
      el.addEventListener("dragleave", () => el.classList.remove("is-over"));
      el.addEventListener("drop", (e) => {
        if (!dragging) return;
        e.preventDefault();
        el.classList.remove("is-over");
        const id = dragging;
        // 落とした位置から、その列での順番を決める
        const siblings = PANELS
          .filter((x) => x !== id && state.layout.cols[x] === col)
          .map((x) => ({ id: x, el: panelEl(x) }))
          .filter((x) => x.el);
        let index = siblings.length;
        for (let i = 0; i < siblings.length; i += 1) {
          const r = siblings[i].el.getBoundingClientRect();
          if (e.clientY < r.top + r.height / 2) { index = i; break; }
        }
        state.layout.cols[id] = col;
        const reordered = siblings.map((x) => x.id);
        reordered.splice(index, 0, id);
        reordered.forEach((x, i) => { state.layout.order[x] = i; });
        applyLayout();
        persistSoon();
        announce(`${panelEl(id).dataset.title}を${col === "left" ? "左" : "右"}の列へ移しました。`);
      });
    });

    // 中央の絵は上下の入れ替えだけ
    [els.frontCell, els.planCell].filter(Boolean).forEach((cell) => {
      cell.addEventListener("dragover", (e) => {
        if (!dragging) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "none";
      });
    });
  }

  function swapCenter() {
    state.layout.centerOrder = state.layout.centerOrder.slice().reverse();
    applyLayout();
    persistSoon();
    announce(`${state.layout.centerOrder[0] === "front" ? "正面" : "平面"}を上にしました。`);
  }

  /* ---------- 登場人物 ----------
     ショーに出る人を名簿で持ち、場面ごとに舞台の上か裏かが決まる。
     名簿で名前を直すと、その人が出ている全場面の表示が変わる。 */

  function castOnStage(castId) {
    return sc().pieces.some((piece) => piece.castId === castId);
  }

  function renderCast() {
    if (!els.castList) return;
    const cast = state.project.cast;
    els.castList.innerHTML = "";
    if (!cast.length) {
      const empty = document.createElement("p");
      empty.className = "stage-cast-empty";
      empty.textContent = "まだ誰も登録していません。名前を入れて追加してください。";
      els.castList.append(empty);
      return;
    }
    cast.forEach((member) => {
      const row = document.createElement("div");
      row.className = "stage-cast-row";

      const swatch = document.createElement("input");
      swatch.type = "color";
      swatch.className = "stage-cast-color";
      swatch.value = member.color;
      swatch.setAttribute("aria-label", `${member.name}の色`);
      swatch.addEventListener("input", () => {
        member.color = swatch.value;
        // 舞台に出ている分にも色を反映する
        state.project.scenes.forEach((scene) => {
          scene.pieces.forEach((piece) => {
            if (piece.castId === member.id) piece.color = member.color;
          });
        });
        render();
        persistSoon();
      });

      const name = document.createElement("input");
      name.type = "text";
      name.className = "stage-cast-name-input";
      name.value = member.name;
      name.maxLength = 24;
      name.setAttribute("aria-label", "人物の名前");
      name.addEventListener("input", () => {
        member.name = name.value.slice(0, 24);
        render();
        persistSoon();
      });

      const onStage = castOnStage(member.id);
      const status = document.createElement("button");
      status.type = "button";
      status.className = `stage-cast-status ${onStage ? "is-on" : "is-off"}`;
      status.textContent = onStage ? "舞台上" : "舞台裏";
      status.title = onStage ? "押すと舞台から引っ込めます" : "押すとこの場面の舞台へ出します";
      status.addEventListener("click", () => toggleCastOnStage(member.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "stage-cast-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", `${member.name}を名簿から外す`);
      remove.addEventListener("click", () => removeCastMember(member.id));

      row.append(swatch, name, status, remove);
      els.castList.append(row);
    });
  }

  function addCastMember() {
    const raw = (els.castName && els.castName.value || "").trim();
    if (!raw) {
      announce("名前を入れてから追加してください。");
      if (els.castName) els.castName.focus();
      return;
    }
    checkpoint();
    state.project.cast.push({ id: rid("cast"), name: raw.slice(0, 24), color: state.pieceColor });
    if (els.castName) els.castName.value = "";
    renderCast();
    persistSoon();
    announce(`${raw}を名簿へ加えました。舞台裏の状態です。`);
  }

  function toggleCastOnStage(castId) {
    checkpoint();
    const scene = sc();
    const existing = scene.pieces.find((piece) => piece.castId === castId);
    const member = state.project.cast.find((c) => c.id === castId);
    if (existing) {
      scene.pieces = scene.pieces.filter((piece) => piece.id !== existing.id);
      if (selectedId === existing.id) selectedId = null;
      announce(`${member ? member.name : "この人"}を舞台から引っ込めました。`);
    } else {
      const count = scene.pieces.filter((p) => p.type === "performer").length;
      const piece = {
        id: nextId(), type: "performer", castId,
        u: clamp(0.5 + ((count % 5) - 2) * 0.09, 0.06, 0.94),
        v: clamp(0.6 + (count % 3) * 0.07, 0.05, 0.95),
        size: 100, color: member ? member.color : state.pieceColor, name: "",
      };
      scene.pieces.push(piece);
      selectedId = piece.id;
      announce(`${member ? member.name : "この人"}を舞台へ出しました。`);
    }
    renderCast();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
  }

  function removeCastMember(castId) {
    const member = state.project.cast.find((c) => c.id === castId);
    if (!member) return;
    const scenesWith = state.project.scenes.filter((scene) =>
      scene.pieces.some((piece) => piece.castId === castId)).length;
    const warning = scenesWith
      ? `「${member.name}」を名簿から外します。${scenesWith}つの場面から、この人も消えます。`
      : `「${member.name}」を名簿から外します。`;
    if (!window.confirm(warning)) return;
    checkpoint();
    state.project.cast = state.project.cast.filter((c) => c.id !== castId);
    state.project.scenes.forEach((scene) => {
      scene.pieces = scene.pieces.filter((piece) => piece.castId !== castId);
    });
    selectedId = null;
    renderCast();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    announce(`${member.name}を名簿から外しました。`);
  }

  /* ---------- 場面とプロジェクト ---------- */

  function renderScenes() {
    const p = state.project;
    if (els.sceneList) {
      els.sceneList.innerHTML = "";
      p.scenes.forEach((scene, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stage-scene-chip";
        button.setAttribute("aria-pressed", String(scene.id === p.activeSceneId));
        const num = document.createElement("span");
        num.className = "stage-scene-num";
        num.textContent = String(i + 1).padStart(2, "0");
        const name = document.createElement("span");
        name.className = "stage-scene-name";
        name.textContent = scene.title;
        const count = document.createElement("span");
        count.className = "stage-scene-count";
        count.textContent = `${scene.pieces.length}`;
        button.append(num, name, count);
        button.addEventListener("click", () => openScene(scene.id));
        els.sceneList.append(button);
      });
    }
    const cur = sc();
    if (els.sceneTitle && document.activeElement !== els.sceneTitle) els.sceneTitle.value = cur.title;
    if (els.sceneNote && document.activeElement !== els.sceneNote) els.sceneNote.value = cur.note;
    if (els.projectTitle && document.activeElement !== els.projectTitle) els.projectTitle.value = p.title;
    if (els.versionLabel && document.activeElement !== els.versionLabel) els.versionLabel.value = p.versionLabel;
    if (els.versionNote) {
      els.versionNote.textContent = p.parentVersionId
        ? `${p.branchReason || "別バージョンとして複製"}（元の版から派生）`
        : "このショーの最初の版です。";
    }
    if (els.sceneDel) els.sceneDel.disabled = p.scenes.length <= 1;
    const idx = p.scenes.findIndex((x) => x.id === p.activeSceneId);
    if (els.sceneLeft) els.sceneLeft.disabled = idx <= 0;
    if (els.sceneRight) els.sceneRight.disabled = idx < 0 || idx >= p.scenes.length - 1;
  }

  function openScene(id) {
    if (state.project.activeSceneId === id) return;
    state.project.activeSceneId = id;
    selectedId = null;
    renderScenes();
    renderCast();
    updateInspector();
    render();
    persistSoon();
    announce(`${sc().title}を開きました。`);
  }

  function addScene() {
    checkpoint();
    const p = state.project;
    const scene = newScene(`場面 ${p.scenes.length + 1}`, false);
    // 劇場は変えず、いまの背景色だけ引き継ぐ
    scene.background = sc().background;
    p.scenes.push(scene);
    p.activeSceneId = scene.id;
    selectedId = null;
    renderScenes();
    renderCast();
    updateInspector();
    render();
    persistSoon();
    announce(`${scene.title}を足しました。`);
  }

  function duplicateScene() {
    checkpoint();
    const p = state.project;
    const cur = sc();
    const copy = JSON.parse(JSON.stringify(cur));
    copy.id = rid("scene");
    copy.title = `${cur.title} の複製`;
    copy.pieces = copy.pieces.map((piece) => ({ ...piece, id: nextId() }));
    p.scenes.splice(p.scenes.indexOf(cur) + 1, 0, copy);
    p.activeSceneId = copy.id;
    selectedId = null;
    renderScenes();
    renderCast();
    updateInspector();
    render();
    persistSoon();
    announce(`${cur.title}を複製しました。前の場面から少しずつ動かすときに使えます。`);
  }

  function moveScene(direction) {
    const p = state.project;
    const i = p.scenes.findIndex((x) => x.id === p.activeSceneId);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= p.scenes.length) return;
    checkpoint();
    const [scene] = p.scenes.splice(i, 1);
    p.scenes.splice(j, 0, scene);
    renderScenes();
    persistSoon();
    announce(`${scene.title}を${direction < 0 ? "前" : "後"}へ動かしました。`);
  }

  function deleteScene() {
    const p = state.project;
    if (p.scenes.length <= 1) return;
    const cur = sc();
    if (!window.confirm(`「${cur.title}」を削除します。この場面に置いたものと塗りは戻せません。`)) return;
    checkpoint();
    const i = p.scenes.indexOf(cur);
    p.scenes.splice(i, 1);
    p.activeSceneId = p.scenes[Math.min(i, p.scenes.length - 1)].id;
    selectedId = null;
    renderScenes();
    renderCast();
    updateInspector();
    render();
    persistSoon();
    announce(`${cur.title}を削除しました。`);
  }

  // バージョン複製: いまのプロジェクトを丸ごと写し、別の版として続ける。
  // 設計計画書6.5節の派生（親ID＋一行の理由）に合わせ、完全な版管理は作らない。
  function duplicateVersion() {
    const reason = window.prompt(
      "別バージョンとして複製します。何を変えるための版か、一行で残してください。",
      "");
    if (reason === null) return;
    checkpoint();
    const p = state.project;
    const copy = JSON.parse(JSON.stringify(p));
    copy.id = rid("proj");
    copy.parentVersionId = p.id;
    copy.branchReason = reason.trim();
    copy.createdAt = nowIso();
    copy.versionLabel = nextVersionLabel(p.versionLabel);
    copy.scenes = copy.scenes.map((scene) => ({
      ...scene,
      id: rid("scene"),
      pieces: scene.pieces.map((piece) => ({ ...piece, id: nextId() })),
    }));
    copy.activeSceneId = copy.scenes[0].id;
    state.project = copy;
    selectedId = null;
    renderScenes();
    renderVenueControls();
    updateInspector();
    render();
    persistSoon();
    announce(`${copy.versionLabel}として複製しました。元の版は書き出したファイルの中に残ります。`);
  }

  // v1 → v2 のように末尾の数を繰り上げる。数が無ければ「 の改訂」を足す
  function nextVersionLabel(label) {
    const m = String(label || "").match(/^(.*?)(\d+)$/);
    if (m) return `${m[1]}${Number(m[2]) + 1}`;
    return `${label || "v1"} の改訂`;
  }

  function exportProject() {
    const data = JSON.stringify({ kind: "shosai-stage-sketch", version: 3, project: state.project }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const safe = (state.project.title || "show").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);
    link.download = `${safe}-${state.project.versionLabel}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    announce("このショーをファイルへ書き出しました。チームへ渡せます。");
  }

  function importProject(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed = null;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (_) {
        announce("読み込めませんでした。書き出したJSONファイルを選んでください。");
        return;
      }
      const incoming = parsed && parsed.project ? parsed : { project: parsed };
      if (!incoming.project || !Array.isArray(incoming.project.scenes)) {
        announce("このファイルには場面が入っていません。");
        return;
      }
      if (!window.confirm("いま開いているショーを、読み込んだ内容で置き換えます。よろしいですか？")) return;
      checkpoint();
      const next = normalizeState({ project: incoming.project, seat: state.seat,
        showFront: state.showFront, showPlan: state.showPlan, showNames: state.showNames });
      state = next;
      selectedId = null;
      syncInputs();
      renderScenes();
      renderVenueControls();
      updateInspector();
      render();
      persistSoon();
      announce(`${state.project.title}（${state.project.versionLabel}）を読み込みました。`);
    };
    reader.readAsText(file);
  }

  function renderVenueControls() {
    const current = venue();
    const size = venueSize();

    if (els.venueSelect && !els.venueSelect.options.length) {
      VENUES.list.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = `${v.label}（${v.short}）`;
        els.venueSelect.append(opt);
      });
    }
    if (els.venueSelect) els.venueSelect.value = current.id;

    if (els.sizeSelect) {
      els.sizeSelect.innerHTML = "";
      current.sizes.forEach((s2) => {
        const opt = document.createElement("option");
        opt.value = s2.id;
        const bits = s2.ring ? `リング${s2.ring}m` : `${s2.width}×${s2.depth}m`;
        opt.textContent = `${s2.label} — ${bits}`;
        els.sizeSelect.append(opt);
      });
      els.sizeSelect.value = size.id;
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

    // 背景の壁が無い形式では、塗りの道具立てを畳む
    const hasWall = current.audience !== "round";
    if (els.bgSection) els.bgSection.hidden = !hasWall;
    document.querySelectorAll('[data-stage-tool="paint"], [data-stage-tool="erase"]').forEach((b) => {
      b.disabled = !hasWall;
      b.title = hasWall ? "" : `${current.label}には背景の壁がありません`;
    });

    // 席は正面図を出しているときだけ意味を持つ
    const seat = VENUES.seatById(state.seat);
    if (els.seatSection) els.seatSection.hidden = !state.showFront;
    if (els.seatList) {
      els.seatList.innerHTML = "";
      VENUES.seats.forEach((s2) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stage-seat";
        button.setAttribute("aria-pressed", String(s2.id === seat.id));
        button.textContent = s2.label;
        button.addEventListener("click", () => setSeat(s2.id));
        els.seatList.append(button);
      });
    }
    if (els.seatNote) els.seatNote.textContent = seat.note;
  }

  function setSeat(id) {
    if (state.seat === id) return;
    state.seat = id;
    renderVenueControls();
    render();
    persistSoon();
    announce(`${VENUES.seatById(id).label}から見た絵に切り替えました。配置は変わりません。`);
  }

  // 正面と平面はそれぞれ独立に開閉する。ただし両方閉じることはできない
  function setViewShown(which, shown) {
    const other = which === "front" ? "showPlan" : "showFront";
    const key = which === "front" ? "showFront" : "showPlan";
    if (!shown && !state[other]) {
      renderVenueControls();
      announce("どちらか一方は開いたままにします。");
      return;
    }
    state[key] = shown;
    if (!state.showFront && tool !== "select") setTool("select");
    selectedId = null;
    renderVenueControls();
    updateInspector();
    render();
    persistSoon();
    announce(shown
      ? `${which === "front" ? "正面" : "平面"}を開きました。`
      : `${which === "front" ? "正面" : "平面"}を閉じました。`);
  }

  function setVenue(id) {
    if (state.project.venue === id) return;
    checkpoint();
    state.project.venue = id;
    state.project.venueSize = VENUES.sizeById(VENUES.byId(id), state.project.venueSize).id;
    if (venue().audience === "round" && tool !== "select") setTool("select");
    renderVenueControls();
    render();
    persistSoon();
    announce(`${venue().label}へ切り替えました。配置はそのまま残ります。`);
  }

  function setVenueSize(id) {
    if (state.project.venueSize === id) return;
    checkpoint();
    state.project.venueSize = id;
    renderVenueControls();
    render();
    persistSoon();
    announce(`規模を${venueSize().label}にしました。`);
  }


  /* ---------- 操作 ---------- */

  function pointFromEvent(event) {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
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
    for (let i = sc().pieces.length - 1; i >= 0; i -= 1) {
      const piece = sc().pieces[i];
      const b = selectionBounds(piece, L);
      if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) return piece;
    }
    return null;
  }

  function selectedPiece() {
    return sc().pieces.find((piece) => piece.id === selectedId) || null;
  }

  function setTool(nextTool) {
    if (!state.showFront && nextTool !== "select") {
      announce("背景の塗りは正面図で行います。正面を開いてください。");
      return;
    }
    // 全周形式には塗れる背景の壁が無い（奥も客席）
    if (venue().audience === "round" && nextTool !== "select") {
      announce(`${venue().label}には背景の壁がありません。奥も客席です。`);
      return;
    }
    tool = nextTool;
    canvas.dataset.tool = tool;
    if (planCanvas) planCanvas.dataset.tool = "select";  // 平面は動かす専用
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
    const sameType = sc().pieces.filter((candidate) => candidate.type === piece.type);
    els.selectedName.textContent = `${PIECE_TYPES[piece.type]} ${sameType.indexOf(piece) + 1}`;
    els.selectedColor.value = piece.color;
    els.pieceSize.value = String(piece.size);
    els.sizeValue.textContent = String(piece.size);
    if (els.pieceName && document.activeElement !== els.pieceName) {
      const member = piece.castId ? state.project.cast.find((c) => c.id === piece.castId) : null;
      els.pieceName.value = member ? member.name : (piece.name || "");
      els.pieceName.disabled = Boolean(member);
      els.pieceName.placeholder = member ? "名前は人物パネルで直します" : "例: 演台、ディアボロ";
    }
  }

  function syncInputs() {
    els.newColor.value = state.pieceColor;
    els.background.value = sc().background;
    els.paintColor.value = state.paintColor;
    els.brushSize.value = String(state.brushSize);
    els.brushValue.textContent = String(state.brushSize);
    if (els.showNames) els.showNames.checked = state.showNames;
  }

  function addPiece(type) {
    checkpoint();
    const count = sc().pieces.length;
    const piece = {
      id: nextId(),
      type,
      u: clamp(0.5 + ((count % 5) - 2) * 0.07, 0.06, 0.94),
      v: clamp(0.55 + (count % 3) * 0.08, 0.05, 0.95),
      size: type === "light" ? 115 : 100,
      color: state.pieceColor,
      name: "",
    };
    sc().pieces.push(piece);
    selectedId = piece.id;
    setTool("select");
    updateInspector();
    renderScenes();
    render();
    persistSoon();
    announce(`${PIECE_TYPES[type]}を舞台へ置きました。`);
    canvas.focus();
  }

  function removeSelected() {
    const piece = selectedPiece();
    if (!piece) return;
    checkpoint();
    sc().pieces = sc().pieces.filter((candidate) => candidate.id !== piece.id);
    selectedId = null;
    updateInspector();
    renderScenes();
    renderCast();
    render();
    persistSoon();
    announce(`${PIECE_TYPES[piece.type]}を舞台から外しました。`);
  }

  function duplicateSelected() {
    const piece = selectedPiece();
    if (!piece) return;
    checkpoint();
    const copy = { ...piece, id: nextId(), u: clamp(piece.u + 0.06, 0, 1), v: clamp(piece.v + 0.04, 0, 1) };
    sc().pieces.push(copy);
    selectedId = copy.id;
    updateInspector();
    renderScenes();
    render();
    persistSoon();
    announce(`${PIECE_TYPES[piece.type]}を複製しました。`);
  }

  function moveLayer(direction) {
    const index = sc().pieces.findIndex((piece) => piece.id === selectedId);
    if (index < 0) return;
    const nextIndex = clamp(index + direction, 0, sc().pieces.length - 1);
    if (index === nextIndex) return;
    checkpoint();
    const [piece] = sc().pieces.splice(index, 1);
    sc().pieces.splice(nextIndex, 0, piece);
    render();
    persistSoon();
    announce(direction > 0 ? "一つ前へ出しました。" : "一つ後ろへ送りました。");
  }

  function finishPointer(event) {
    if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
    const el = pointerAction.el || canvas;
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    const changed = pointerAction.kind === "stroke" || pointerAction.moved;
    pointerAction = null;
    el.dataset.dragging = "false";
    if (changed) persistSoon();
  }

  function onPointerDown(event) {
    const el = event.currentTarget;
    const view = viewOf(el);
    const L = layout(view);
    const point = pointFromEvent(event);
    el.focus();

    if (tool === "select") {
      const hit = hitTest(point, L);
      selectedId = hit ? hit.id : null;
      updateInspector();
      render();
      if (!hit) return;
      const pos = place(hit.u, hit.v, L);
      el.setPointerCapture(event.pointerId);
      el.dataset.dragging = "true";
      pointerAction = {
        kind: "drag", pointerId: event.pointerId, id: hit.id, el, view,
        offsetX: point.x - pos.x, offsetY: point.y - pos.y,
        before: snapshot(), moved: false,
      };
      return;
    }

    // 背景の塗りは正面図だけ（平面図に背景面は無い）
    if (view === "plan") {
      announce("背景の塗りは正面図で行います。");
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
    sc().strokes.push(stroke);
    el.setPointerCapture(event.pointerId);
    pointerAction = { kind: "stroke", pointerId: event.pointerId, stroke, el, view, moved: true };
    render();
  }

  function onPointerMove(event) {
    if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
    const L = layout(pointerAction.view);
    const point = pointFromEvent(event);

    if (pointerAction.kind === "drag") {
      const piece = sc().pieces.find((candidate) => candidate.id === pointerAction.id);
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
  }

  function onKeyDown(event) {
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
    // 上キーで画面の上＝奥へ。正面図でも平面図でも同じ向きになる
    piece.v = clamp(piece.v + moves[event.key][1] * amount, 0, 1);
    render();
    persistSoon();
  }

  [canvas, planCanvas].filter(Boolean).forEach((el) => {
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", finishPointer);
    el.addEventListener("pointercancel", finishPointer);
    el.addEventListener("keydown", onKeyDown);
  });

  document.querySelectorAll("[data-stage-tool]").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.stageTool));
  });
  document.querySelectorAll("[data-stage-add]").forEach((button) => {
    button.addEventListener("click", () => addPiece(button.dataset.stageAdd));
  });
  if (els.showFront) {
    els.showFront.addEventListener("change", (e) => setViewShown("front", e.target.checked));
  }
  if (els.showPlan) {
    els.showPlan.addEventListener("change", (e) => setViewShown("plan", e.target.checked));
  }
  if (els.venueSelect) {
    els.venueSelect.addEventListener("change", (e) => setVenue(e.target.value));
  }
  document.querySelectorAll("[data-toggle-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const which = button.dataset.toggleView;
      const open = which === "front" ? state.showFront : state.showPlan;
      setViewShown(which, !open);
    });
  });
  const swapBtn = document.getElementById("stage-swap-center");
  if (swapBtn) swapBtn.addEventListener("click", swapCenter);

  if (els.showNames) {
    els.showNames.addEventListener("change", (e) => {
      state.showNames = e.target.checked;
      render();
      persistSoon();
      announce(e.target.checked ? "コマの名前を出しました。" : "コマの名前を隠しました。");
    });
  }
  if (els.pieceName) {
    els.pieceName.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece) return;
      if (piece.castId) return;  // 名簿の人は人物パネルで直す
      piece.name = e.target.value.slice(0, 24);
      render();
      persistSoon();
    });
  }
  if (els.castAdd) els.castAdd.addEventListener("click", addCastMember);
  if (els.castName) {
    els.castName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addCastMember(); }
    });
  }
  if (els.sceneAdd) els.sceneAdd.addEventListener("click", addScene);
  if (els.sceneDup) els.sceneDup.addEventListener("click", duplicateScene);
  if (els.sceneLeft) els.sceneLeft.addEventListener("click", () => moveScene(-1));
  if (els.sceneRight) els.sceneRight.addEventListener("click", () => moveScene(1));
  if (els.sceneDel) els.sceneDel.addEventListener("click", deleteScene);
  if (els.sceneTitle) {
    els.sceneTitle.addEventListener("input", (e) => {
      sc().title = e.target.value.slice(0, 40);
      renderScenes();
      persistSoon();
    });
  }
  if (els.sceneNote) {
    els.sceneNote.addEventListener("input", (e) => {
      sc().note = e.target.value.slice(0, 120);
      persistSoon();
    });
  }
  if (els.projectTitle) {
    els.projectTitle.addEventListener("input", (e) => {
      state.project.title = e.target.value.slice(0, 60);
      persistSoon();
    });
  }
  if (els.versionLabel) {
    els.versionLabel.addEventListener("input", (e) => {
      state.project.versionLabel = e.target.value.slice(0, 16);
      persistSoon();
    });
  }
  if (els.versionCopy) els.versionCopy.addEventListener("click", duplicateVersion);
  if (els.exportJson) els.exportJson.addEventListener("click", exportProject);
  if (els.importJson) {
    els.importJson.addEventListener("change", (e) => {
      importProject(e.target.files && e.target.files[0]);
      e.target.value = "";
    });
  }
  if (els.sizeSelect) {
    els.sizeSelect.addEventListener("change", (e) => setVenueSize(e.target.value));
  }

  document.querySelectorAll("[data-stage-piece-color]").forEach((button) => {
    button.addEventListener("click", () => {
      state.pieceColor = button.dataset.stagePieceColor;
      els.newColor.value = state.pieceColor;
      persistSoon();
    });
  });

  document.querySelectorAll("[data-stage-bg]").forEach((button) => {
    button.addEventListener("click", () => {
      if (sc().background === button.dataset.stageBg) return;
      checkpoint();
      sc().background = button.dataset.stageBg;
      els.background.value = sc().background;
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
    sc().background = event.target.value;
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
    if (!sc().strokes.length) {
      announce("消す背景の塗りはありません。");
      return;
    }
    checkpoint();
    sc().strokes = [];
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
    if (!window.confirm(`「${sc().title}」に置いたものと背景の塗りをすべて消しますか？（他の場面はそのままです）`)) return;
    checkpoint();
    const cur = sc();
    cur.pieces = [];
    cur.strokes = [];
    selectedId = null;
    syncInputs();
    renderScenes();
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
    drawStage(output.getContext("2d", { alpha: false }), false, state.showFront ? "front" : "plan");
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"), "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
    ].join("");
    els.export.href = output.toDataURL("image/png");
    els.export.download = state.showFront
      ? `stage-${state.project.venue}-${state.seat}-${stamp}.png`
      : `stage-${state.project.venue}-plan-${stamp}.png`;
    announce("舞台スケッチをPNG画像として書き出しました。");
  });

  // 同じ配置を4つの席から見た絵を、1枚に並べて書き出す。
  // 席を変えて描き直すだけなので、状態は一時的に借りて必ず戻す。
  if (els.compare) {
    els.compare.addEventListener("click", () => {
      if (!state.showFront) {
        announce("席の比較は正面図で行います。正面を開いてください。");
        return;
      }
      const original = state.seat;
      const cols = 2;
      const rows = Math.ceil(VENUES.seats.length / cols);
      const out = document.createElement("canvas");
      out.width = W * cols;
      out.height = H * rows;
      const g = out.getContext("2d", { alpha: false });
      g.fillStyle = "#0d0c0b";
      g.fillRect(0, 0, out.width, out.height);

      const tile = document.createElement("canvas");
      tile.width = W;
      tile.height = H;
      const tileCtx = tile.getContext("2d", { alpha: false });

      try {
        VENUES.seats.forEach((seat, i) => {
          state.seat = seat.id;
          drawStage(tileCtx, false, "front");
          const x = (i % cols) * W;
          const y = Math.floor(i / cols) * H;
          g.drawImage(tile, x, y);
          g.save();
          g.fillStyle = "rgba(13,12,11,0.72)";
          g.fillRect(x + 22, y + 20, 268, 52);
          g.fillStyle = "rgba(239,231,214,0.85)";
          g.font = "26px 'Hiragino Mincho ProN', serif";
          g.textBaseline = "middle";
          g.fillText(seat.label, x + 40, y + 47);
          g.strokeStyle = "rgba(156,130,63,0.3)";
          g.lineWidth = 2;
          g.strokeRect(x + 1, y + 1, W - 2, H - 2);
          g.restore();
        });
      } finally {
        state.seat = original;
        render();
      }

      const now = new Date();
      const stamp = [
        now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"), "-",
        String(now.getHours()).padStart(2, "0"), String(now.getMinutes()).padStart(2, "0"),
      ].join("");
      const link = document.createElement("a");
      link.href = out.toDataURL("image/png");
      link.download = `stage-${state.project.venue}-seats-${stamp}.png`;
      link.click();
      announce("4つの席から見た絵を1枚に並べて書き出しました。");
    });
  }

  buildPanelHeads();
  setupDropZones();
  applyLayout();
  syncInputs();
  renderScenes();
  renderCast();
  renderVenueControls();
  setTool("select");
  updateInspector();
  updateHistoryButtons();
  render();
  els.saveStatus.textContent = loaded.restored
    ? "この端末に保存した前回のスケッチを開きました。"
    : "変更はこの端末のブラウザ内へ自動保存します。";
})();

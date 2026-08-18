(function () {
  "use strict";

  const NEAR = 0.12;
  const FOV_H = 86 * Math.PI / 180;
  const DEFAULT_HEIGHT_CM = 170;
  const PANEL_STORAGE_KEY = "shosai-fpv-panels-v1";
  const PANEL_TITLE_HEIGHT = 26;
  const PANEL_KEYS = ["front", "plan"];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function panelContentHeight(width, sourceWidth = 16, sourceHeight = 9) {
    const safeWidth = Math.max(1, finite(width, 280));
    const safeSourceWidth = Math.max(1, finite(sourceWidth, 16));
    const safeSourceHeight = Math.max(1, finite(sourceHeight, 9));
    return safeWidth * safeSourceHeight / safeSourceWidth;
  }

  function panelWidthLimits(viewportWidth) {
    const max = Math.max(1, Math.min(720, Math.max(1, finite(viewportWidth, 1024)) * .6));
    return { min: Math.min(160, max), max };
  }

  function clampPanelLayout(layout, viewportWidth, viewportHeight, sourceWidth = 16, sourceHeight = 9) {
    const widthLimit = panelWidthLimits(viewportWidth);
    const width = clamp(finite(layout && layout.width, 280), widthLimit.min, widthLimit.max);
    const totalHeight = PANEL_TITLE_HEIGHT + panelContentHeight(width, sourceWidth, sourceHeight);
    return {
      x: clamp(finite(layout && layout.x, 0), 0, Math.max(0, finite(viewportWidth, 1024) - width)),
      y: clamp(finite(layout && layout.y, 0), 0, Math.max(0, finite(viewportHeight, 768) - totalHeight)),
      width,
      visible: layout && typeof layout.visible === "boolean" ? layout.visible : true,
    };
  }

  function defaultPanelLayouts(viewportWidth = 1024, viewportHeight = 768) {
    const widthLimit = panelWidthLimits(viewportWidth);
    const width = clamp(280, widthLimit.min, widthLimit.max);
    const totalHeight = PANEL_TITLE_HEIGHT + panelContentHeight(width);
    return {
      front: clampPanelLayout({
        x: viewportWidth - 70 - 176 - 12 - width,
        y: 16,
        width,
        visible: true,
      }, viewportWidth, viewportHeight),
      plan: clampPanelLayout({
        x: viewportWidth - 16 - width,
        y: viewportHeight - 70 - totalHeight,
        width,
        visible: true,
      }, viewportWidth, viewportHeight),
    };
  }

  function serializePanels(layouts) {
    return JSON.stringify({ front: layouts.front, plan: layouts.plan });
  }

  function restorePanels(serialized, viewportWidth = 1024, viewportHeight = 768) {
    const defaults = defaultPanelLayouts(viewportWidth, viewportHeight);
    if (!serialized) return defaults;
    try {
      const raw = JSON.parse(serialized);
      if (!raw || typeof raw !== "object") return defaults;
      for (const key of PANEL_KEYS) {
        const item = raw[key];
        if (!item || !Number.isFinite(item.x) || !Number.isFinite(item.y)
          || !Number.isFinite(item.width) || typeof item.visible !== "boolean") return defaults;
      }
      return {
        front: clampPanelLayout(raw.front, viewportWidth, viewportHeight),
        plan: clampPanelLayout(raw.plan, viewportWidth, viewportHeight),
      };
    } catch (_) {
      return defaults;
    }
  }

  function setPanelVisible(layouts, key, visible, panel, chip) {
    if (!layouts || !layouts[key]) return false;
    layouts[key].visible = Boolean(visible);
    if (panel) panel.hidden = !layouts[key].visible;
    if (chip && chip.classList) chip.classList.toggle("on", layouts[key].visible);
    if (chip && chip.setAttribute) chip.setAttribute("aria-pressed", String(layouts[key].visible));
    return layouts[key].visible;
  }

  function toWorld(u, v, width, depth, y = 0) {
    return { x: (u - 0.5) * width, y, z: (v - 0.5) * depth };
  }

  function yawForward(degrees) {
    const yaw = finite(degrees, 0) * Math.PI / 180;
    return { x: -Math.sin(yaw), y: 0, z: Math.cos(yaw) };
  }

  function rightOf(forwardOrYaw) {
    const forward = typeof forwardOrYaw === "number" ? yawForward(forwardOrYaw) : forwardOrYaw;
    return { x: -forward.z, y: 0, z: forward.x };
  }

  function moveFree(pos, forwardVector, rightVector, keys, dtSeconds, speed) {
    const origin = {
      x: finite(pos && pos.x, 0),
      y: finite(pos && pos.y, 0),
      z: finite(pos && pos.z, 0),
    };
    const dt = Math.max(0, finite(dtSeconds, 0));
    const metersPerSecond = Math.max(0, finite(speed, 0));
    if (!dt || !metersPerSecond) return origin;
    const normalizeHorizontal = (vector, fallback) => {
      const x = finite(vector && vector.x, fallback.x);
      const z = finite(vector && vector.z, fallback.z);
      const length = Math.hypot(x, z);
      return length > 0 ? { x: x / length, y: 0, z: z / length } : fallback;
    };
    const flatForward = normalizeHorizontal(forwardVector, { x: 0, y: 0, z: 1 });
    const flatRight = normalizeHorizontal(rightVector, rightOf(flatForward));
    const controls = keys || {};
    const forwardAmount = (controls.forward ? 1 : 0) - (controls.back ? 1 : 0);
    const rightAmount = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    const upAmount = (controls.up ? 1 : 0) - (controls.down ? 1 : 0);
    let dx = flatForward.x * forwardAmount + flatRight.x * rightAmount;
    let dy = upAmount;
    let dz = flatForward.z * forwardAmount + flatRight.z * rightAmount;
    const length = Math.hypot(dx, dy, dz);
    if (!length) return origin;
    const distance = metersPerSecond * dt / length;
    dx *= distance;
    dy *= distance;
    dz *= distance;
    return { x: origin.x + dx, y: origin.y + dy, z: origin.z + dz };
  }

  /* フレーム間隔の上限（秒）。タブを裏へ回した直後やカクついた直後は
     rAFの時刻が大きく跳ぶ。そのまま速度に掛けると、1フレームで舞台の端まで
     カメラがワープする（実際に踏んだ）。上限を切って「その分は進まない」に倒す。 */
  const MAX_FRAME_SECONDS = .1;

  function frameDelta(previous, now) {
    if (previous === null || previous === undefined) return 0;
    const elapsed = (finite(now, 0) - finite(previous, 0)) / 1000;
    if (!(elapsed > 0)) return 0;
    return Math.min(MAX_FRAME_SECONDS, elapsed);
  }

  function clampFree(pos, width, depth, ceiling) {
    const stageWidth = Math.max(0, finite(width, 12));
    const stageDepth = Math.max(0, finite(depth, 9));
    const stageCeiling = Math.max(0, finite(ceiling, 8));
    return {
      x: clamp(finite(pos && pos.x, 0), -(stageWidth / 2 + 12), stageWidth / 2 + 12),
      y: clamp(finite(pos && pos.y, 1.35), .2, stageCeiling + 6),
      z: clamp(finite(pos && pos.z, 0), -(stageDepth / 2 + 8), stageDepth / 2 + 22),
    };
  }

  function freePresets(width, depth, ceiling) {
    const stageWidth = Math.max(0, finite(width, 12));
    const stageDepth = Math.max(0, finite(depth, 9));
    const stageCeiling = Math.max(0, finite(ceiling, 8));
    return [
      { id: "audience-center", name: "客席中央", x: 0, y: 1.35, z: stageDepth / 2 + 9, yaw: 180, pitch: -2 },
      { id: "front-row", name: "最前列", x: 0, y: 1.2, z: stageDepth / 2 + 1.2, yaw: 180, pitch: 2 },
      { id: "stage-right-wing", name: "上手袖", x: stageWidth / 2 + 1.5, y: 1.6, z: 0, yaw: 90, pitch: 0 },
      { id: "stage-left-wing", name: "下手袖", x: -(stageWidth / 2 + 1.5), y: 1.6, z: 0, yaw: -90, pitch: 0 },
      { id: "overhead", name: "真上", x: 0, y: stageCeiling + 4, z: 0, yaw: 180, pitch: -88 },
      { id: "upstage", name: "舞台奥", x: 0, y: 1.6, z: -(stageDepth / 2 + 1), yaw: 0, pitch: 0 },
    ];
  }

  function clipPolyNear(points, near = NEAR) {
    if (!Array.isArray(points) || !points.length) return [];
    if (points.length === 2) {
      let a = points[0];
      let b = points[1];
      if (a.z <= near && b.z <= near) return [];
      if (a.z <= near || b.z <= near) {
        const ratio = (near - a.z) / (b.z - a.z);
        const middle = {
          x: a.x + (b.x - a.x) * ratio,
          y: a.y + (b.y - a.y) * ratio,
          z: near,
        };
        if (a.z <= near) a = middle; else b = middle;
      }
      return [a, b];
    }
    const output = [];
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      const aInside = a.z > near;
      const bInside = b.z > near;
      if (aInside) output.push(a);
      if (aInside !== bInside) {
        const ratio = (near - a.z) / (b.z - a.z);
        output.push({
          x: a.x + (b.x - a.x) * ratio,
          y: a.y + (b.y - a.y) * ratio,
          z: near,
        });
      }
    }
    return output;
  }

  function supportOf(piece, pieces) {
    return piece && piece.supportId && Array.isArray(pieces)
      ? pieces.find((candidate) => candidate.id === piece.supportId) || null
      : null;
  }

  function mountedPose(piece, pieces) {
    const support = supportOf(piece, pieces);
    if (piece && piece.base > 0 && support && support.type === "tissue") return "hang";
    if (support && support.type === "trapeze") {
      return piece.trapMode === "hang" && piece.base > 0 ? "hang" : "sitBar";
    }
    return piece && piece.pose || "stand";
  }

  function eyeHeight(piece, heightM, pieces) {
    const pose = mountedPose(piece, pieces);
    let relative = 0.93;
    if (pose === "sit" || pose === "kneel") relative = 0.68;
    else if (pose === "crouch") relative = 0.55;
    else if (pose === "lie_back") relative = 0.25;
    else if (pose === "handstand") relative = 0.3;
    else if (pose === "hang") relative = 0.85;
    return finite(piece && piece.base, 0) + finite(heightM, 0) * relative;
  }

  const state = {
    opened: false,
    bridge: null,
    view: { type: "audience", key: null, name: "" },
    free: null,
    yaw: 180,
    pitch: -2,
    targetYaw: 180,
    targetPitch: -2,
  };
  let elements = null;
  let rafId = 0;
  let toastTimer = 0;
  let sceneTimer = 0;
  let pendingScene = null;
  let drag = null;
  let panelDrag = null;
  let panelLayouts = null;
  const panelAspect = { front: { width: 16, height: 9 }, plan: { width: 16, height: 9 } };
  let hintDismissed = false;
  let lastFrameTime = null;
  const pressed = new Set();
  let data = null;
  let W = 12;
  let D = 9;
  let CEIL = 8;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let pixelRatio = 1;
  let focal = 1;
  let camera = { x: 0, y: 1.35, z: 10.7, me: null };
  let forward = yawForward(180);
  let right = rightOf(forward);
  let up = { x: 0, y: 1, z: 0 };
  const labels = [];

  function text(key) {
    const dictionary = window.SHOSAI_I18N && window.SHOSAI_I18N.text;
    return data && data.lang === "en" && dictionary && dictionary[key] || key;
  }

  function createElement(tag, id, className) {
    const node = document.createElement(tag);
    if (id) node.id = id;
    if (className) node.className = className;
    return node;
  }

  function addStyle() {
    if (document.getElementById && document.getElementById("stage-fpv-style")) return;
    const style = createElement("style", "stage-fpv-style");
    style.textContent = `
#stage-fpv-overlay[hidden]{display:none!important}#stage-fpv-overlay{position:fixed;inset:0;z-index:70;background:#0d0a08;color:#e8e2d4;font-family:"Hiragino Sans","Hiragino Kaku Gothic ProN",sans-serif;overflow:hidden}
#stage-fpv-view{position:absolute;inset:0;width:100%;height:100%;cursor:grab;touch-action:none}#stage-fpv-view.dragging{cursor:grabbing}.stage-fpv-hud{position:absolute;color:#e8e2d4;user-select:none;-webkit-user-select:none}
#stage-fpv-title{top:18px;left:20px;pointer-events:none}#stage-fpv-title .show{font-size:11px;letter-spacing:.12em;opacity:.55;margin-bottom:6px}#stage-fpv-title .act{font-size:11px;opacity:.6;margin-bottom:2px}#stage-fpv-title .scene{font-size:19px;font-weight:600;letter-spacing:.04em}#stage-fpv-title .approx{font-size:10.5px;opacity:.48;margin-top:5px}
#stage-fpv-minimap{top:16px;right:70px;background:rgba(16,12,9,.72);border:1px solid rgba(232,226,212,.14);border-radius:4px}
#stage-fpv-whose{left:20px;bottom:102px;font-size:12.5px;opacity:.85;pointer-events:none}#stage-fpv-whose b{font-weight:600}#stage-fpv-whose .m{opacity:.6;margin-left:.6em}
#stage-fpv-cast{left:20px;bottom:58px;right:220px;display:flex;flex-wrap:wrap;gap:6px}.stage-fpv-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px 5px 8px;border-radius:3px;background:rgba(22,16,11,.86);border:1px solid rgba(232,226,212,.16);color:#e8e2d4;font-size:12px;cursor:pointer;font-family:inherit}.stage-fpv-chip:hover{border-color:rgba(232,226,212,.45)}.stage-fpv-chip.on{background:#e8e2d4;color:#14100c;border-color:#e8e2d4}.stage-fpv-chip .dot{width:8px;height:8px;border-radius:50%;flex:none}
#stage-fpv-presets{left:20px;bottom:18px;right:220px;display:flex;flex-wrap:wrap;gap:5px}.stage-fpv-preset{padding:4px 8px;font-size:11px;background:rgba(22,16,11,.72)}
#stage-fpv-panel-toggles{top:174px;right:70px;display:flex;flex-direction:column;align-items:stretch;gap:5px;z-index:71}.stage-fpv-panel-toggle{justify-content:center;padding:4px 9px;font-size:11px}
.stage-fpv-panel{position:absolute;z-index:71;box-sizing:border-box;overflow:hidden;border:1px solid rgba(232,226,212,.16);border-radius:3px;background:var(--chip,rgba(22,16,11,.94));box-shadow:0 8px 24px rgba(0,0,0,.28);color:#e8e2d4;touch-action:none;user-select:none;-webkit-user-select:none}.stage-fpv-panel[hidden]{display:none!important}.stage-fpv-panel-bar{height:26px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 5px 0 9px;font-size:11px;letter-spacing:.04em;cursor:grab}.stage-fpv-panel-bar:active{cursor:grabbing}.stage-fpv-panel-hide{width:24px;height:22px;padding:0;border:0;background:transparent;color:#e8e2d4;font:16px/20px inherit;cursor:pointer}.stage-fpv-panel canvas{display:block;width:100%;background:#16100b;pointer-events:auto}.stage-fpv-panel-resize{position:absolute;right:0;bottom:0;width:14px;height:14px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 0 45%,rgba(232,226,212,.55) 46% 55%,transparent 56% 65%,rgba(232,226,212,.55) 66% 75%,transparent 76%);touch-action:none}
#stage-fpv-nav{right:16px;bottom:18px;display:flex;align-items:center;gap:8px}#stage-fpv-nav button{background:rgba(22,16,11,.86);color:#e8e2d4;border:1px solid rgba(232,226,212,.2);border-radius:3px;font-size:13px;padding:7px 12px;cursor:pointer;font-family:inherit}#stage-fpv-nav button:hover{border-color:rgba(232,226,212,.5)}#stage-fpv-count{font-size:11.5px;opacity:.6;min-width:52px;text-align:center}
#stage-fpv-hint{left:50%;bottom:88px;transform:translateX(-50%);font-size:12.5px;background:rgba(22,16,11,.86);padding:7px 14px;border-radius:3px;opacity:.9;transition:opacity .8s;pointer-events:none;border:1px solid rgba(232,226,212,.14)}#stage-fpv-hint.gone{opacity:0}
#stage-fpv-toast{left:50%;top:70px;transform:translateX(-50%);font-size:12.5px;background:rgba(22,16,11,.86);padding:7px 14px;border-radius:3px;opacity:0;transition:opacity .4s;pointer-events:none;border:1px solid rgba(232,226,212,.2)}#stage-fpv-toast.show{opacity:1}
#stage-fpv-fade{position:absolute;inset:0;background:#0d0a08;opacity:0;pointer-events:none;transition:opacity .16s}#stage-fpv-fade.on{opacity:1}#stage-fpv-close{position:absolute;top:14px;right:14px;width:44px;height:44px;padding:0;border:1px solid rgba(255,255,255,.32);border-radius:50%;background:rgba(0,0,0,.45);color:#fff;font-size:20px;line-height:42px;text-align:center;z-index:72;cursor:pointer;-webkit-tap-highlight-color:transparent}
`;
    (document.head || document.documentElement || document.body).appendChild(style);
  }

  function ensureDom() {
    if (elements) return elements;
    addStyle();
    const root = createElement("div", "stage-fpv-overlay");
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    const canvas = createElement("canvas", "stage-fpv-view");
    const fade = createElement("div", "stage-fpv-fade");
    const title = createElement("div", "stage-fpv-title", "stage-fpv-hud");
    const show = createElement("div", "", "show");
    const act = createElement("div", "", "act");
    const scene = createElement("div", "", "scene");
    const approx = createElement("div", "", "approx");
    title.append(show, act, scene, approx);
    const minimap = createElement("canvas", "stage-fpv-minimap", "stage-fpv-hud");
    minimap.width = 176;
    minimap.height = 150;
    const whose = createElement("div", "stage-fpv-whose", "stage-fpv-hud");
    const cast = createElement("div", "stage-fpv-cast", "stage-fpv-hud");
    const presets = createElement("div", "stage-fpv-presets", "stage-fpv-hud");
    const nav = createElement("div", "stage-fpv-nav", "stage-fpv-hud");
    const previous = createElement("button", "stage-fpv-prev");
    previous.type = "button";
    const count = createElement("span", "stage-fpv-count");
    const next = createElement("button", "stage-fpv-next");
    next.type = "button";
    nav.append(previous, count, next);
    const hint = createElement("div", "stage-fpv-hint", "stage-fpv-hud");
    const toast = createElement("div", "stage-fpv-toast", "stage-fpv-hud");
    const panelToggles = createElement("div", "stage-fpv-panel-toggles", "stage-fpv-hud");
    const panels = {};
    PANEL_KEYS.forEach((key) => {
      const panel = createElement("section", `stage-fpv-panel-${key}`, "stage-fpv-panel");
      const bar = createElement("div", "", "stage-fpv-panel-bar");
      const panelTitle = createElement("span");
      const hide = createElement("button", "", "stage-fpv-panel-hide");
      hide.type = "button";
      hide.textContent = "−";
      const copy = createElement("canvas", `stage-fpv-panel-${key}-canvas`);
      const handle = createElement("div", "", "stage-fpv-panel-resize");
      handle.setAttribute("aria-hidden", "true");
      const toggle = createElement("button", `stage-fpv-panel-${key}-toggle`, "stage-fpv-chip stage-fpv-panel-toggle");
      toggle.type = "button";
      bar.append(panelTitle, hide);
      panel.append(bar, copy, handle);
      panelToggles.appendChild(toggle);
      panels[key] = { panel, bar, title: panelTitle, hide, canvas: copy, handle, toggle };
      hide.addEventListener("pointerdown", stopPanelPointer);
      hide.addEventListener("click", (event) => {
        stopPanelPointer(event);
        syncPanelVisibility(key, false);
      });
      toggle.addEventListener("pointerdown", stopPanelPointer);
      toggle.addEventListener("click", (event) => {
        stopPanelPointer(event);
        syncPanelVisibility(key, !panelLayouts[key].visible);
      });
      bar.addEventListener("pointerdown", (event) => {
        if (event.target === hide) { stopPanelPointer(event); return; }
        beginPanelDrag(key, "move", event);
      });
      panel.addEventListener("pointerdown", (event) => {
        if (event.target === panel) beginPanelDrag(key, "move", event);
        else stopPanelPointer(event);
      });
      handle.addEventListener("pointerdown", (event) => beginPanelDrag(key, "resize", event));
      panel.addEventListener("pointermove", movePanelDrag);
      panel.addEventListener("pointerup", endPanelDrag);
      panel.addEventListener("pointercancel", endPanelDrag);
    });
    const closeButton = createElement("button", "stage-fpv-close");
    closeButton.type = "button";
    closeButton.textContent = "✕";
    root.append(canvas, fade, title, minimap, panelToggles, panels.front.panel, panels.plan.panel,
      whose, cast, presets, nav, hint, toast, closeButton);
    document.body.appendChild(root);
    elements = { root, canvas, fade, show, act, scene, approx, minimap, whose, cast, presets,
      previous, count, next, hint, toast, closeButton, panelToggles, panels };
    closeButton.addEventListener("click", close);
    previous.addEventListener("click", () => queueScene(-1));
    next.addEventListener("click", () => queueScene(1));
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    window.addEventListener("resize", resize);
    return elements;
  }

  function identity(piece) {
    return piece && (piece.castId || piece.originId || piece.id) || null;
  }

  function performers(pieces) {
    return (pieces || []).filter((piece) => piece.type === "performer");
  }

  function currentPerformer(pieces) {
    if (state.view.type !== "performer") return null;
    return performers(pieces).find((piece) => identity(piece) === state.view.key) || null;
  }

  function readCurrent() {
    const value = state.bridge && state.bridge.read ? state.bridge.read() : null;
    data = value || { pieces: [], venue: {}, sceneIndex: 0, sceneCount: 0, lang: "ja" };
    data.pieces = Array.isArray(data.pieces) ? data.pieces : [];
    W = finite(data.venue && data.venue.width, 12);
    D = finite(data.venue && data.venue.depth, 9);
    CEIL = finite(data.venue && data.venue.height, 8);
    return data;
  }

  function heightOf(piece) {
    return state.bridge && state.bridge.heightMOf ? finite(state.bridge.heightMOf(piece), 0) : 0;
  }

  function labelOf(piece) {
    return state.bridge && state.bridge.labelOf ? state.bridge.labelOf(piece) : piece && piece.name || "";
  }

  function stopPanelPointer(event) {
    if (event && event.stopPropagation) event.stopPropagation();
  }

  function panelViewport() {
    return {
      width: window.innerWidth || elements && elements.root.clientWidth || 1024,
      height: window.innerHeight || elements && elements.root.clientHeight || 768,
    };
  }

  function savePanelLayouts() {
    if (!panelLayouts) return;
    try { window.localStorage.setItem(PANEL_STORAGE_KEY, serializePanels(panelLayouts)); } catch (_) { /* unavailable */ }
  }

  function loadPanelLayouts() {
    const viewport = panelViewport();
    let serialized = null;
    try { serialized = window.localStorage.getItem(PANEL_STORAGE_KEY); } catch (_) { /* unavailable */ }
    panelLayouts = restorePanels(serialized, viewport.width, viewport.height);
  }

  function applyPanelLayout(key) {
    if (!elements || !panelLayouts || !panelLayouts[key]) return;
    const viewport = panelViewport();
    const aspect = panelAspect[key];
    panelLayouts[key] = clampPanelLayout(panelLayouts[key], viewport.width, viewport.height,
      aspect.width, aspect.height);
    const layout = panelLayouts[key];
    const panel = elements.panels[key];
    const contentHeight = panelContentHeight(layout.width, aspect.width, aspect.height);
    panel.panel.style.left = `${layout.x}px`;
    panel.panel.style.top = `${layout.y}px`;
    panel.panel.style.width = `${layout.width}px`;
    panel.canvas.style.height = `${contentHeight}px`;
    setPanelVisible(panelLayouts, key, layout.visible, panel.panel, panel.toggle);
  }

  function applyPanelLayouts() {
    PANEL_KEYS.forEach(applyPanelLayout);
  }

  function syncPanelVisibility(key, visible, save = true) {
    if (!elements || !panelLayouts || !panelLayouts[key]) return;
    const panel = elements.panels[key];
    setPanelVisible(panelLayouts, key, visible, panel.panel, panel.toggle);
    if (save) savePanelLayouts();
  }

  function beginPanelDrag(key, mode, event) {
    stopPanelPointer(event);
    if (!panelLayouts || !panelLayouts[key]) return;
    if (event && event.preventDefault) event.preventDefault();
    const layout = panelLayouts[key];
    panelDrag = {
      key,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: layout.x,
      y: layout.y,
      width: layout.width,
    };
    const panel = elements.panels[key].panel;
    if (panel.setPointerCapture) panel.setPointerCapture(event.pointerId);
  }

  function movePanelDrag(event) {
    stopPanelPointer(event);
    if (!panelDrag || event.pointerId !== panelDrag.pointerId) return;
    if (event && event.preventDefault) event.preventDefault();
    const layout = panelLayouts[panelDrag.key];
    const dx = event.clientX - panelDrag.startX;
    const dy = event.clientY - panelDrag.startY;
    if (panelDrag.mode === "resize") layout.width = panelDrag.width + dx;
    else {
      layout.x = panelDrag.x + dx;
      layout.y = panelDrag.y + dy;
    }
    applyPanelLayout(panelDrag.key);
  }

  function endPanelDrag(event) {
    stopPanelPointer(event);
    if (!panelDrag || event && event.pointerId !== undefined && event.pointerId !== panelDrag.pointerId) return;
    panelDrag = null;
    savePanelLayouts();
  }

  function drawPanelCopy(key) {
    if (!elements || !panelLayouts || !panelLayouts[key].visible) return;
    const getter = key === "front" ? state.bridge && state.bridge.getFrontCanvas
      : state.bridge && state.bridge.getPlanCanvas;
    if (typeof getter !== "function") return;
    let source = null;
    try { source = getter(); } catch (_) { return; }
    const sourceWidth = finite(source && source.width, 0);
    const sourceHeight = finite(source && source.height, 0);
    if (!source || sourceWidth <= 0 || sourceHeight <= 0) return;
    panelAspect[key] = { width: sourceWidth, height: sourceHeight };
    applyPanelLayout(key);
    const target = elements.panels[key].canvas;
    const cssWidth = panelLayouts[key].width;
    const cssHeight = panelContentHeight(cssWidth, sourceWidth, sourceHeight);
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const targetWidth = Math.max(1, Math.round(cssWidth * ratio));
    const targetHeight = Math.max(1, Math.round(cssHeight * ratio));
    if (target.width !== targetWidth) target.width = targetWidth;
    if (target.height !== targetHeight) target.height = targetHeight;
    const targetContext = target.getContext("2d");
    if (!targetContext) return;
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const x = (targetWidth - drawWidth) / 2;
    const y = (targetHeight - drawHeight) / 2;
    targetContext.fillStyle = "#16100b";
    targetContext.fillRect(0, 0, targetWidth, targetHeight);
    targetContext.drawImage(source, 0, 0, sourceWidth, sourceHeight, x, y, drawWidth, drawHeight);
  }

  function drawPanelCopies() {
    PANEL_KEYS.forEach(drawPanelCopy);
  }

  function cameraPose() {
    if (state.view.type === "free" && state.free) {
      return { x: state.free.x, y: state.free.y, z: state.free.z, me: null };
    }
    const me = currentPerformer(data.pieces);
    if (me) {
      const point = toWorld(finite(me.u, 0.5), finite(me.v, 0.5), W, D);
      return { x: point.x, y: eyeHeight(me, heightOf(me), data.pieces), z: point.z, me };
    }
    return { x: 0, y: 1.35, z: D / 2 + 6.2, me: null };
  }

  function resetAngles() {
    if (state.view.type === "free" && state.free) {
      state.targetYaw = finite(state.free.yaw, 180);
      state.targetPitch = finite(state.free.pitch, -2);
    } else {
      const me = currentPerformer(data.pieces);
      if (me) {
        state.targetYaw = finite(me.facing, 0);
        state.targetPitch = 0;
      } else {
        state.targetYaw = 180;
        state.targetPitch = -2;
      }
    }
    state.yaw = state.targetYaw;
    state.pitch = state.targetPitch;
  }

  function enterFree() {
    if (state.view.type === "free") return;
    if (!state.free) {
      const pose = cameraPose();
      state.free = {
        x: pose.x,
        y: pose.y,
        z: pose.z,
        yaw: state.yaw,
        pitch: state.pitch,
      };
    }
    state.view = { type: "free", key: null, name: "" };
    resetAngles();
    renderHud();
  }

  function leaveFree(nextView) {
    if (state.view.type === "free" && state.free) {
      state.free.yaw = state.targetYaw;
      state.free.pitch = state.targetPitch;
      pressed.clear();
    }
    state.view = nextView;
    resetAngles();
    renderHud();
  }

  function applyFreePreset(id) {
    const preset = freePresets(W, D, CEIL).find((candidate) => candidate.id === id);
    if (!preset) return;
    state.free = { x: preset.x, y: preset.y, z: preset.z, yaw: preset.yaw, pitch: preset.pitch };
    state.view = { type: "free", key: null, name: "" };
    resetAngles();
    renderHud();
  }

  function showToast(message) {
    if (!elements) return;
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements && elements.toast.classList.remove("show"), 2600);
  }

  function validateView(reset) {
    const me = currentPerformer(data.pieces);
    if (state.view.type === "performer" && !me) {
      if (state.view.name) showToast(`${state.view.name}${text("はこの場面にいません — 客席から見ています")}`);
      state.view = { type: "audience", key: null, name: "" };
    }
    if (reset) resetAngles();
    renderHud();
  }

  function makeChip(label, color, active, onClick) {
    const chip = createElement("button", "", `stage-fpv-chip${active ? " on" : ""}`);
    chip.type = "button";
    const dot = createElement("span", "", "dot");
    dot.style.background = color;
    const name = createElement("span");
    name.textContent = label;
    chip.append(dot, name);
    chip.addEventListener("click", onClick);
    return chip;
  }

  function renderHud() {
    if (!elements || !data) return;
    elements.show.textContent = data.showTitle || "";
    elements.act.textContent = data.actTitle || "";
    elements.scene.textContent = data.sceneTitle || "";
    elements.approx.textContent = data.venue && data.venue.type && data.venue.type !== "proscenium"
      ? text("劇場の箱は仮にプロセニアムで描いています") : "";
    elements.count.textContent = `${finite(data.sceneIndex, 0) + 1} / ${finite(data.sceneCount, 0)}`;
    elements.previous.textContent = `◀ ${text("前の場面")}`;
    elements.next.textContent = `${text("次の場面")} ▶`;
    elements.hint.textContent = state.view.type === "free"
      ? text("W/A/S/D 移動・E/Q 上下・Shift 速く・ドラッグ 見回し・R 戻す")
      : text("ドラッグで見回す");
    elements.hint.classList.toggle("gone", hintDismissed);
    elements.closeButton.setAttribute("aria-label", text("視界を閉じる"));
    PANEL_KEYS.forEach((key) => {
      const label = text(key === "front" ? "正面図" : "平面図");
      elements.panels[key].title.textContent = label;
      elements.panels[key].toggle.textContent = label;
      elements.panels[key].hide.setAttribute("aria-label", text("この図を隠す"));
    });
    const me = currentPerformer(data.pieces);
    elements.whose.textContent = "";
    const bold = createElement("b");
    const metrics = createElement("span", "", "m");
    if (state.view.type === "free" && state.free) {
      bold.textContent = text("自由カメラ");
      metrics.textContent = freePositionText();
    } else if (me) {
      const name = labelOf(me);
      const height = heightOf(me);
      const statureCm = Math.round(height / (finite(me.size, 100) / 100) * 100);
      bold.textContent = `${name}${text("の視界")}`;
      const base = finite(me.base, 0);
      const air = base > 0 ? `${data.lang === "en" ? " · " : "・"}${text("空中")} ${base.toFixed(1)}m` : "";
      metrics.textContent = data.lang === "en"
        ? `${text("身長")} ${statureCm}cm · ${text("目の高さ")} ${eyeHeight(me, height, data.pieces).toFixed(1)}m${air}`
        : `${text("身長")} ${statureCm}cm・${text("目の高さ")} ${eyeHeight(me, height, data.pieces).toFixed(1)}m${air}`;
    } else {
      bold.textContent = text("客席");
      metrics.textContent = text("1階中央・5列目");
    }
    elements.whose.append(bold, metrics);
    elements.whoseMetrics = metrics;
    elements.cast.textContent = "";
    elements.cast.appendChild(makeChip(text("自由カメラ"), "#7f9bb0", state.view.type === "free", enterFree));
    const seen = new Set();
    performers(data.pieces).forEach((piece) => {
      const key = identity(piece);
      if (!key || seen.has(key)) return;
      seen.add(key);
      const label = labelOf(piece);
      elements.cast.appendChild(makeChip(label, piece.color || "#c9c2b4",
        state.view.type === "performer" && state.view.key === key, () => {
          leaveFree({ type: "performer", key, name: label });
        }));
    });
    elements.cast.appendChild(makeChip(text("客席"), "#8d7a5f", state.view.type === "audience", () => {
      leaveFree({ type: "audience", key: null, name: "" });
    }));
    elements.presets.textContent = "";
    freePresets(W, D, CEIL).forEach((preset) => {
      const button = createElement("button", "", "stage-fpv-chip stage-fpv-preset");
      button.type = "button";
      button.textContent = text(preset.name);
      button.addEventListener("click", () => applyFreePreset(preset.id));
      elements.presets.appendChild(button);
    });
  }

  function formatSigned(value) {
    const rounded = Math.abs(value) < .05 ? 0 : value;
    return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
  }

  function freePositionText() {
    if (!state.free) return "";
    const separators = data && data.lang === "en" ? " / " : " ／ ";
    return [
      `${text("前後")} ${formatSigned(state.free.z)}m`,
      `${text("左右")} ${formatSigned(state.free.x)}m`,
      `${text("高さ")} ${state.free.y.toFixed(2)}m`,
    ].join(separators);
  }

  function resize() {
    if (!elements) return;
    pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    canvasWidth = window.innerWidth || elements.root.clientWidth || 1024;
    canvasHeight = window.innerHeight || elements.root.clientHeight || 768;
    elements.canvas.width = canvasWidth * pixelRatio;
    elements.canvas.height = canvasHeight * pixelRatio;
    focal = (canvasWidth / 2) / Math.tan(FOV_H / 2);
    if (panelLayouts) applyPanelLayouts();
  }

  function setBasis() {
    const pitchRadians = state.pitch * Math.PI / 180;
    const flat = yawForward(state.yaw);
    forward = { x: flat.x * Math.cos(pitchRadians), y: Math.sin(pitchRadians), z: flat.z * Math.cos(pitchRadians) };
    right = rightOf(flat);
    up = {
      x: right.y * forward.z - right.z * forward.y,
      y: right.z * forward.x - right.x * forward.z,
      z: right.x * forward.y - right.y * forward.x,
    };
  }

  function toCamera(point) {
    const dx = point.x - camera.x;
    const dy = point.y - camera.y;
    const dz = point.z - camera.z;
    return {
      x: dx * right.x + dy * right.y + dz * right.z,
      y: dx * up.x + dy * up.y + dz * up.z,
      z: dx * forward.x + dy * forward.y + dz * forward.z,
    };
  }

  function toScreen(point) {
    return { x: canvasWidth / 2 + point.x * focal / point.z, y: canvasHeight / 2 - point.y * focal / point.z };
  }

  function fillPoly(ctx, worldPoints, fill, stroke, lineWidth) {
    const clipped = clipPolyNear(worldPoints.map(toCamera));
    if (clipped.length < 3) return;
    ctx.beginPath();
    clipped.forEach((point, index) => {
      const screen = toScreen(point);
      if (index) ctx.lineTo(screen.x, screen.y); else ctx.moveTo(screen.x, screen.y);
    });
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
  }

  function line3(ctx, a, b, color, width) {
    const clipped = clipPolyNear([toCamera(a), toCamera(b)]);
    if (clipped.length !== 2) return;
    const start = toScreen(clipped[0]);
    const end = toScreen(clipped[1]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.stroke();
  }

  function shade(hex, factor) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || "")) return hex || "#8d8272";
    const value = parseInt(hex.slice(1), 16);
    const red = clamp(Math.round((value >> 16 & 255) * factor), 0, 255);
    const green = clamp(Math.round((value >> 8 & 255) * factor), 0, 255);
    const blue = clamp(Math.round((value & 255) * factor), 0, 255);
    return `rgb(${red},${green},${blue})`;
  }

  function circlePoints(cx, y, cz, radius, count = 20) {
    return Array.from({ length: count }, (_, index) => {
      const angle = index / count * Math.PI * 2;
      return { x: cx + Math.cos(angle) * radius, y, z: cz + Math.sin(angle) * radius };
    });
  }

  function drawBox(ctx, cx, cz, y0, y1, width, depth, color, rotY = 0) {
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const rad = finite(rotY, 0) * Math.PI / 180;
    const cos = Math.cos(rad); const sin = Math.sin(rad);
    const corner = (x, z) => ({ x: cx + x * cos - z * sin, z: cz + x * sin + z * cos });
    const corners = [corner(-halfWidth, -halfDepth), corner(halfWidth, -halfDepth),
      corner(halfWidth, halfDepth), corner(-halfWidth, halfDepth)];
    const faces = [];
    for (let index = 0; index < 4; index += 1) {
      const a = corners[index];
      const b = corners[(index + 1) % 4];
      faces.push({
        depth: toCamera({ x: (a.x + b.x) / 2, y: (y0 + y1) / 2, z: (a.z + b.z) / 2 }).z,
        points: [{ x: a.x, y: y0, z: a.z }, { x: b.x, y: y0, z: b.z },
          { x: b.x, y: y1, z: b.z }, { x: a.x, y: y1, z: a.z }],
        fill: shade(color, index % 2 ? 0.72 : 0.9),
      });
    }
    faces.push({ depth: toCamera({ x: cx, y: y1, z: cz }).z,
      points: corners.map((point) => ({ x: point.x, y: y1, z: point.z })), fill: shade(color, 1) });
    faces.sort((a, b) => b.depth - a.depth)
      .forEach((face) => fillPoly(ctx, face.points, face.fill, "rgba(16,12,9,.35)", 1));
  }

  function queueLabel(world, label, strong) {
    const point = toCamera(world);
    if (!label || point.z <= NEAR || point.z > 26) return;
    const screen = toScreen(point);
    labels.push({ x: screen.x, y: screen.y, label, strong, depth: point.z });
  }

  function drawLabels(ctx) {
    ctx.font = '11px "Hiragino Sans",sans-serif';
    labels.sort((a, b) => b.depth - a.depth).forEach((label) => {
      const alpha = label.strong ? 0.95 : clamp(1.4 - label.depth / 18, 0.25, 0.8);
      const width = ctx.measureText(label.label).width + 12;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(20,15,10,.88)";
      ctx.fillRect(label.x - width / 2, label.y - 24, width, 17);
      ctx.fillStyle = "#e8e2d4";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label.label, label.x, label.y - 15.5);
      ctx.globalAlpha = 1;
    });
    labels.length = 0;
  }

  function drawPerformer(ctx, piece) {
    const height = heightOf(piece);
    const foot = toWorld(piece.u, piece.v, W, D, finite(piece.base, 0));
    const cameraFoot = toCamera(foot);
    if (cameraFoot.z <= NEAR) return null;
    const scale = focal / cameraFoot.z;
    const screen = toScreen(cameraFoot);
    const color = piece.color || "#c9c2b4";
    const pose = mountedPose(piece, data.pieces);
    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.scale(scale, -scale);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const segment = (x1, y1, x2, y2, width) => {
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1 * height, y1 * height);
      ctx.lineTo(x2 * height, y2 * height);
      ctx.stroke();
    };
    const head = (x, y, radius) => { ctx.beginPath(); ctx.arc(x * height, y * height, radius * height, 0, 7); ctx.fill(); };
    const limb = 0.13;
    const arm = 0.11;
    if (pose === "hang") {
      head(0, .86, .075); segment(0, .78, 0, .42, .17);
      segment(-.03, .76, -.05, 1.13, arm); segment(.03, .76, .05, 1.13, arm);
      segment(-.02, .42, -.05, .02, limb); segment(.02, .42, .06, .06, limb);
    } else if (pose === "sitBar") {
      head(0, .62, .075); segment(0, .54, 0, .3, .17);
      segment(-.03, .5, -.06, .72, arm); segment(.03, .5, .06, .72, arm);
      segment(0, .3, .16, .28, limb); segment(.16, .28, .14, 0, limb);
    } else if (pose === "reach") {
      head(0, .93, .075); segment(0, .85, 0, .5, .17);
      segment(-.04, .82, -.12, 1.22, arm); segment(.04, .82, .12, 1.22, arm);
      segment(-.02, .5, -.07, 0, limb); segment(.02, .5, .07, 0, limb);
    } else if (pose === "walk") {
      head(0, .93, .075); segment(0, .85, 0, .5, .17);
      segment(-.04, .8, -.14, .5, arm); segment(.04, .8, .13, .62, arm);
      segment(-.02, .5, -.16, 0, limb); segment(.02, .5, .13, 0, limb);
    } else if (pose === "sit") {
      head(0, .7, .075); segment(0, .62, 0, .38, .17);
      segment(-.04, .58, -.1, .4, arm); segment(.04, .58, .1, .4, arm);
      segment(0, .38, .17, .36, limb); segment(.17, .36, .16, 0, limb);
    } else if (pose === "kneel") {
      head(0, .76, .075); segment(0, .68, 0, .36, .17);
      segment(-.04, .64, -.09, .42, arm); segment(.04, .64, .09, .42, arm);
      segment(0, .36, -.06, .05, limb); segment(0, .36, .15, .3, limb); segment(.15, .3, .15, 0, limb);
    } else if (pose === "crouch") {
      head(.02, .58, .075); segment(0, .5, -.02, .3, .17);
      segment(0, .47, .14, .32, arm); segment(0, .47, -.13, .34, arm);
      segment(-.02, .3, -.14, .16, limb); segment(-.14, .16, -.08, 0, limb);
      segment(-.02, .3, .1, .14, limb); segment(.1, .14, .06, 0, limb);
    } else if (pose === "handstand") {
      head(0, .14, .075); segment(0, .24, 0, .6, .17);
      segment(-.04, .28, -.1, 0, arm); segment(.04, .28, .1, 0, arm);
      segment(0, .6, -.07, 1, limb); segment(0, .6, .1, .96, limb);
    } else if (pose === "lie_back") {
      head(-.36, .09, .075); segment(-.28, .1, .1, .12, .17);
      segment(.1, .12, .4, .08, limb); segment(-.2, .12, -.05, .2, arm);
    } else {
      head(0, .93, .075); segment(0, .85, 0, .5, .17);
      segment(-.05, .82, -.14, .44, arm); segment(.05, .82, .14, .44, arm);
      segment(-.02, .5, -.07, 0, limb); segment(.02, .5, .07, 0, limb);
    }
    ctx.restore();
    if (finite(piece.base, 0) === 0 && pose !== "hang") {
      fillPoly(ctx, circlePoints(foot.x, .01, foot.z, .26), "rgba(0,0,0,.28)");
    }
    const top = pose === "hang" ? finite(piece.base, 0) + height * .95
      : pose === "lie_back" ? finite(piece.base, 0) + .3
      : finite(piece.base, 0) + height * (pose === "sit" ? .78 : pose === "crouch" ? .66
        : pose === "kneel" ? .84 : pose === "sitBar" ? .7 : 1.01);
    return { x: foot.x, y: top, z: foot.z };
  }

  function drawRoute(ctx, piece, strong) {
    const route = piece.route;
    if (!route) return;
    const controlU = finite(route.bu, (piece.u + route.u) / 2);
    const controlV = finite(route.bv, (piece.v + route.v) / 2);
    const points = [];
    for (let index = 0; index <= 22; index += 1) {
      const t = index / 22;
      const inverse = 1 - t;
      points.push(toWorld(inverse * inverse * piece.u + 2 * inverse * t * controlU + t * t * route.u,
        inverse * inverse * piece.v + 2 * inverse * t * controlV + t * t * route.v, W, D, .02));
    }
    const color = strong ? piece.color || "#e8e2d4" : "rgba(232,226,212,.24)";
    ctx.save();
    ctx.setLineDash([8, 7]);
    for (let index = 0; index < points.length - 1; index += 1) {
      line3(ctx, points[index], points[index + 1], color, strong ? 2.4 : 1.2);
    }
    ctx.setLineDash([]);
    const before = toCamera(points[points.length - 2]);
    const end = toCamera(points[points.length - 1]);
    if (before.z > NEAR && end.z > NEAR) {
      const a = toScreen(before);
      const b = toScreen(end);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const size = clamp(140 / end.z, 5, 16);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - size * Math.cos(angle - .42), b.y - size * Math.sin(angle - .42));
      ctx.lineTo(b.x - size * Math.cos(angle + .42), b.y - size * Math.sin(angle + .42));
      ctx.closePath();
      ctx.fillStyle = strong ? piece.color || "#e8e2d4" : "rgba(232,226,212,.3)";
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHouse(ctx) {
    const rows = 13;
    const rowGap = .88;
    const rake = .24;
    const startZ = D / 2 + 2;
    fillPoly(ctx, [{ x: -W * 1.4, y: -1.05, z: D / 2 }, { x: W * 1.4, y: -1.05, z: D / 2 },
      { x: W * 1.4, y: -1.05 + rows * rake, z: startZ + rows * rowGap + 2 },
      { x: -W * 1.4, y: -1.05 + rows * rake, z: startZ + rows * rowGap + 2 }], "#171210");
    const perRow = Math.floor(W * 1.6 / .55);
    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const z = startZ + rowIndex * rowGap;
      const y = -1 + rowIndex * rake;
      for (let seat = 0; seat < perRow; seat += 1) {
        const x = (seat - (perRow - 1) / 2) * .55;
        if (Math.abs(x) < .55) continue;
        const point = toCamera({ x, y: y + .35, z });
        if (point.z <= NEAR || point.z > 40) continue;
        const screen = toScreen(point);
        const radius = clamp(.16 * focal / point.z, .5, 4);
        ctx.beginPath(); ctx.arc(screen.x, screen.y, radius, 0, 7);
        ctx.fillStyle = `rgba(84,68,53,${clamp(.42 - point.z * .012, .08, .4)})`; ctx.fill();
      }
    }
  }

  function drawShell(ctx) {
    const halfWidth = W / 2;
    const halfDepth = D / 2;
    fillPoly(ctx, [{ x: -halfWidth, y: 0, z: -halfDepth }, { x: halfWidth, y: 0, z: -halfDepth },
      { x: halfWidth, y: CEIL, z: -halfDepth }, { x: -halfWidth, y: CEIL, z: -halfDepth }], "#2b2118");
    fillPoly(ctx, [{ x: -halfWidth, y: 0, z: -halfDepth }, { x: -halfWidth, y: 0, z: halfDepth },
      { x: -halfWidth, y: CEIL, z: halfDepth }, { x: -halfWidth, y: CEIL, z: -halfDepth }], "#211912");
    fillPoly(ctx, [{ x: halfWidth, y: 0, z: -halfDepth }, { x: halfWidth, y: 0, z: halfDepth },
      { x: halfWidth, y: CEIL, z: halfDepth }, { x: halfWidth, y: CEIL, z: -halfDepth }], "#211912");
    fillPoly(ctx, [{ x: -halfWidth, y: CEIL, z: -halfDepth }, { x: halfWidth, y: CEIL, z: -halfDepth },
      { x: halfWidth, y: CEIL, z: halfDepth }, { x: -halfWidth, y: CEIL, z: halfDepth }], "#15100c");
    fillPoly(ctx, [{ x: -halfWidth, y: 0, z: -halfDepth }, { x: halfWidth, y: 0, z: -halfDepth },
      { x: halfWidth, y: 0, z: halfDepth }, { x: -halfWidth, y: 0, z: halfDepth }], "#262019");
    [[.62, .05], [.4, .05]].forEach(([factor, alpha]) => {
      fillPoly(ctx, circlePoints(0, .008, -D * .05, Math.min(W, D) * factor, 30), `rgba(242,231,205,${alpha})`);
    });
    for (let x = Math.ceil(-halfWidth); x <= halfWidth; x += 1) {
      line3(ctx, { x, y: 0, z: -halfDepth }, { x, y: 0, z: halfDepth }, "rgba(232,226,212,.09)", 1);
    }
    for (let z = Math.ceil(-halfDepth); z <= halfDepth; z += 1) {
      line3(ctx, { x: -halfWidth, y: 0, z }, { x: halfWidth, y: 0, z }, "rgba(232,226,212,.09)", 1);
    }
    line3(ctx, { x: -halfWidth, y: 0, z: halfDepth }, { x: halfWidth, y: 0, z: halfDepth }, "rgba(232,226,212,.28)", 2);
    fillPoly(ctx, [{ x: -halfWidth, y: -1.05, z: halfDepth }, { x: halfWidth, y: -1.05, z: halfDepth },
      { x: halfWidth, y: 0, z: halfDepth }, { x: -halfWidth, y: 0, z: halfDepth }], "#241c15");
  }

  function drawProscenium(ctx) {
    const halfWidth = W / 2;
    const z = D / 2 + .02;
    const openHeight = Math.min(CEIL - .8, CEIL);
    const color = "#0e0b08";
    fillPoly(ctx, [{ x: -halfWidth - 6, y: -1.1, z }, { x: -halfWidth + .35, y: -1.1, z },
      { x: -halfWidth + .35, y: CEIL + 4, z }, { x: -halfWidth - 6, y: CEIL + 4, z }], color);
    fillPoly(ctx, [{ x: halfWidth - .35, y: -1.1, z }, { x: halfWidth + 6, y: -1.1, z },
      { x: halfWidth + 6, y: CEIL + 4, z }, { x: halfWidth - .35, y: CEIL + 4, z }], color);
    fillPoly(ctx, [{ x: -halfWidth - 6, y: openHeight, z }, { x: halfWidth + 6, y: openHeight, z },
      { x: halfWidth + 6, y: CEIL + 4, z }, { x: -halfWidth - 6, y: CEIL + 4, z }], color);
  }

  function drawPiece(ctx, piece) {
    const dims = piece.dims || {};
    const point = toWorld(piece.u, piece.v, W, D);
    const x = point.x;
    const z = point.z;
    const color = piece.color || "#8d8272";
    if (piece.type === "model" && piece.model && window.SHOSAI_STAGE_MODELS) {
      const facing = finite(piece.facing, 0);
      const angle = facing * Math.PI / 180;
      const cos = Math.cos(angle); const sin = Math.sin(angle);
      window.SHOSAI_STAGE_MODELS.modelBoxes(piece.model).forEach((box) => {
        const offsetX = box.ox * cos - box.oz * sin;
        const offsetZ = box.ox * sin + box.oz * cos;
        drawBox(ctx, x + offsetX, z + offsetZ, box.lift, box.lift + box.h,
          box.w, box.d, shade(color, box.tint), facing + box.rotY);
      });
    } else if (["wall", "block", "suitcase", "trampoline", "teeter"].includes(piece.type)) {
      const y0 = finite(dims.lift, 0);
      drawBox(ctx, x, z, y0, y0 + (dims.h || 1), dims.w || 1, dims.d || .4, color);
    } else if (piece.type === "table") {
      const height = dims.h || .9; const width = dims.w || 1.6; const depth = dims.d || .8;
      const halfWidth = width / 2 - .06; const halfDepth = depth / 2 - .06;
      [[-halfWidth, -halfDepth], [halfWidth, -halfDepth], [halfWidth, halfDepth], [-halfWidth, halfDepth]]
        .forEach(([offsetX, offsetZ]) => line3(ctx, { x: x + offsetX, y: 0, z: z + offsetZ },
          { x: x + offsetX, y: height - .05, z: z + offsetZ }, shade(color, .7), 2.5));
      drawBox(ctx, x, z, height - .06, height, width, depth, color);
    } else if (piece.type === "chair") {
      const height = dims.h || .9; const width = dims.w || .5; const depth = dims.d || .5;
      drawBox(ctx, x, z, .42, .48, width, depth, color);
      drawBox(ctx, x, z - depth / 2 + .04, .48, height, width, .07, shade(color, .85));
    } else if (piece.type === "sphere") {
      const radius = (dims.dia || .3) / 2;
      const cameraPoint = toCamera({ x, y: finite(dims.lift, 0) + radius, z });
      if (cameraPoint.z > NEAR) {
        const screen = toScreen(cameraPoint); const projected = radius * focal / cameraPoint.z;
        const gradient = ctx.createRadialGradient(screen.x - projected * .3, screen.y - projected * .3,
          projected * .1, screen.x, screen.y, projected);
        gradient.addColorStop(0, shade(color, 1.05)); gradient.addColorStop(1, shade(color, .6));
        ctx.beginPath(); ctx.arc(screen.x, screen.y, projected, 0, 7); ctx.fillStyle = gradient; ctx.fill();
      }
    } else if (piece.type === "pole") {
      const height = dims.h || 6;
      const width = Math.max(2, .1 * focal / Math.max(1, toCamera({ x, y: 1.5, z }).z));
      line3(ctx, { x, y: 0, z }, { x, y: height, z }, shade(color, .9), width);
      line3(ctx, { x: x - .02, y: 0, z }, { x: x - .02, y: height, z }, shade(color, .6), 1.5);
    } else if (piece.type === "wire") {
      const height = dims.h || 1.5; const width = dims.w || 6;
      line3(ctx, { x: x - width / 2, y: 0, z }, { x: x - width / 2, y: height, z }, "#6b625a", 2);
      line3(ctx, { x: x + width / 2, y: 0, z }, { x: x + width / 2, y: height, z }, "#6b625a", 2);
      line3(ctx, { x: x - width / 2, y: height, z }, { x: x + width / 2, y: height, z }, shade(color, 1), 2);
    } else if (piece.type === "tissue") {
      const lift = finite(dims.lift, 7); const length = dims.h || 6; const width = dims.w || .34;
      const bottom = Math.max(0, lift - length);
      line3(ctx, { x, y: CEIL, z }, { x, y: lift, z }, "rgba(160,150,135,.5)", 1);
      [-width / 4, width / 4].forEach((offset, ribbon) => {
        const points = Array.from({ length: 11 }, (_, index) => {
          const ratio = index / 10;
          return { x: x + offset + Math.sin(ratio * Math.PI) * .1 * (ribbon ? 1 : -1),
            y: lift - ratio * (lift - bottom), z };
        });
        for (let index = 0; index < points.length - 1; index += 1) {
          line3(ctx, points[index], points[index + 1], shade(color, .95),
            Math.max(2.5, width / 2 * focal / Math.max(1.4, toCamera(points[index]).z)));
        }
      });
    } else if (piece.type === "trapeze") {
      const lift = finite(dims.lift, 5); const width = dims.w || 1.2;
      line3(ctx, { x: x - width / 2, y: CEIL, z }, { x: x - width / 2, y: lift, z }, "rgba(180,170,150,.65)", 1.5);
      line3(ctx, { x: x + width / 2, y: CEIL, z }, { x: x + width / 2, y: lift, z }, "rgba(180,170,150,.65)", 1.5);
      line3(ctx, { x: x - width / 2, y: lift, z }, { x: x + width / 2, y: lift, z }, shade(color, 1), 3);
    } else if (piece.type === "cyrwheel") {
      const radius = (dims.dia || 1.8) / 2;
      const cameraPoint = toCamera({ x, y: radius, z });
      if (cameraPoint.z > NEAR) {
        const screen = toScreen(cameraPoint); const projected = radius * focal / cameraPoint.z;
        ctx.beginPath(); ctx.arc(screen.x, screen.y, projected, 0, 7);
        ctx.strokeStyle = shade(color, 1); ctx.lineWidth = Math.max(2, projected * .06); ctx.stroke();
      }
    } else if (piece.type === "cane") {
      const height = dims.h || 1;
      line3(ctx, { x: x - .15, y: 0, z }, { x: x - .15, y: height, z }, shade(color, .9), 2.5);
      line3(ctx, { x: x + .15, y: 0, z: z + .05 }, { x: x + .15, y: height, z: z + .05 }, shade(color, .9), 2.5);
    } else if (piece.type !== "light" && dims.w && dims.h) {
      const y0 = finite(dims.lift, 0);
      drawBox(ctx, x, z, y0, y0 + dims.h, dims.w, dims.d || .4, color);
    }
    if (piece.type !== "performer" && piece.type !== "light") {
      const top = piece.type === "tissue" || piece.type === "trapeze" ? finite(dims.lift, 5) + .25
        : finite(dims.lift, 0) + (dims.h || 1) + .3;
      if (toCamera({ x, y: top, z }).z < 13) queueLabel({ x, y: top, z }, labelOf(piece), false);
    }
  }

  function drawLightPools(ctx, pieces) {
    pieces.filter((piece) => piece.type === "light").forEach((piece) => {
      const dims = piece.dims || {};
      const point = toWorld(piece.u, piece.v, W, D);
      const radius = (dims.dia || 3) / 2;
      fillPoly(ctx, circlePoints(point.x, .015, point.z, radius, 26), "rgba(242,233,205,.10)", "rgba(242,233,205,.10)");
      const hangY = dims.h || CEIL - 1;
      fillPoly(ctx, [{ x: point.x - .12, y: hangY, z: point.z }, { x: point.x + .12, y: hangY, z: point.z },
        { x: point.x + radius, y: 0, z: point.z }, { x: point.x - radius, y: 0, z: point.z }], "rgba(242,233,205,.05)");
    });
  }

  function drawMinimap() {
    const canvas = elements.minimap;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.width; const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    const padding = 14; const availableHeight = height - padding * 2 - 16;
    const minX = Math.min(-W / 2, camera.x - 1);
    const maxX = Math.max(W / 2, camera.x + 1);
    const minZ = Math.min(-D / 2, camera.z - 1);
    const maxZ = Math.max(D / 2, camera.z + 1);
    const mapWidth = Math.max(1, maxX - minX);
    const mapDepth = Math.max(1, maxZ - minZ);
    const scale = Math.min((width - padding * 2) / mapWidth, availableHeight / mapDepth);
    const offsetX = padding + (width - padding * 2 - mapWidth * scale) / 2;
    const offsetY = padding + (availableHeight - mapDepth * scale) / 2 + 4;
    const mapX = (x) => offsetX + (x - minX) * scale;
    const mapY = (z) => offsetY + (z - minZ) * scale;
    ctx.fillStyle = "rgba(30,24,19,.9)";
    ctx.fillRect(mapX(-W / 2), mapY(-D / 2), W * scale, D * scale);
    ctx.strokeStyle = "rgba(232,226,212,.3)";
    ctx.strokeRect(mapX(-W / 2), mapY(-D / 2), W * scale, D * scale);
    ctx.fillStyle = "rgba(232,226,212,.4)"; ctx.font = "8.5px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(text("客席"), mapX(0), mapY(D / 2) + 11);
    data.pieces.filter((piece) => piece.type !== "light").forEach((piece) => {
      const point = toWorld(piece.u, piece.v, W, D);
      const x = mapX(point.x); const y = mapY(point.z);
      if (piece.type === "performer") {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fillStyle = piece.color || "#ccc"; ctx.fill();
      } else {
        const dims = piece.dims || {};
        const pieceWidth = Math.max(3, (dims.w || .6) * scale);
        const pieceDepth = Math.max(3, (dims.d || dims.dia || .6) * scale);
        ctx.fillStyle = "rgba(160,148,130,.5)";
        ctx.fillRect(x - pieceWidth / 2, y - pieceDepth / 2, pieceWidth, pieceDepth);
      }
    });
    const x = mapX(camera.x); const y = mapY(camera.z);
    const direction = yawForward(state.yaw); const halfFov = FOV_H / 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    [-halfFov, halfFov].forEach((angle) => {
      const cosine = Math.cos(angle); const sine = Math.sin(angle);
      ctx.lineTo(x + (direction.x * cosine - direction.z * sine) * 26,
        y + (direction.x * sine + direction.z * cosine) * 26);
    });
    ctx.closePath(); ctx.fillStyle = state.view.type === "free"
      ? "rgba(127,155,176,.22)" : "rgba(232,226,212,.13)"; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 4, 0, 7);
    ctx.fillStyle = state.view.type === "free" ? "#7f9bb0" : "#e8e2d4"; ctx.fill();
    ctx.strokeStyle = "#14100c"; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function movementKeys() {
    return {
      forward: pressed.has("KeyW"),
      back: pressed.has("KeyS"),
      left: pressed.has("KeyA"),
      right: pressed.has("KeyD"),
      up: pressed.has("KeyE"),
      down: pressed.has("KeyQ"),
    };
  }

  function moveFreeFrame(dtSeconds) {
    if (state.view.type !== "free" || !state.free) return;
    const flatForward = yawForward(state.yaw);
    const speed = pressed.has("ShiftLeft") || pressed.has("ShiftRight") ? 7.2 : 2.4;
    const moved = moveFree(state.free, flatForward, rightOf(flatForward), movementKeys(), dtSeconds, speed);
    const bounded = clampFree(moved, W, D, CEIL);
    state.free.x = bounded.x;
    state.free.y = bounded.y;
    state.free.z = bounded.z;
    state.free.yaw = state.targetYaw;
    state.free.pitch = state.targetPitch;
    if (elements.whoseMetrics) elements.whoseMetrics.textContent = freePositionText();
  }

  function renderFrame(dtSeconds = 0) {
    const ctx = elements.canvas.getContext("2d");
    if (!ctx) return;
    state.yaw += (state.targetYaw - state.yaw) * .24;
    state.pitch += (state.targetPitch - state.pitch) * .24;
    readCurrent();
    moveFreeFrame(dtSeconds);
    camera = cameraPose();
    setBasis();
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.fillStyle = "#0d0a08"; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    const inHouse = camera.z > D / 2;
    drawHouse(ctx);
    if (!inHouse) drawProscenium(ctx);
    drawShell(ctx);
    drawLightPools(ctx, data.pieces);
    data.pieces.filter((piece) => piece.type === "performer" && piece.route)
      .forEach((piece) => drawRoute(ctx, piece, camera.me === piece));
    data.pieces.filter((piece) => piece.type !== "light")
      .map((piece) => ({ piece, depth: toCamera(toWorld(piece.u, piece.v, W, D, 1)).z }))
      .sort((a, b) => b.depth - a.depth)
      .forEach(({ piece }) => {
        if (piece === camera.me) return;
        if (piece.type === "performer") {
          const top = drawPerformer(ctx, piece);
          if (top) queueLabel({ x: top.x, y: top.y + .28, z: top.z }, labelOf(piece), true);
        } else drawPiece(ctx, piece);
      });
    if (inHouse) drawProscenium(ctx);
    drawLabels(ctx);
    const vignette = ctx.createRadialGradient(canvasWidth / 2, canvasHeight / 2, Math.min(canvasWidth, canvasHeight) * .42,
      canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) * .72);
    vignette.addColorStop(0, "rgba(0,0,0,0)"); vignette.addColorStop(1, "rgba(8,6,4,.5)");
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    drawMinimap();
    drawPanelCopies();
  }

  function frame(timestamp) {
    if (!state.opened) return;
    const now = finite(timestamp, 0);
    const dtSeconds = frameDelta(lastFrameTime, now);
    lastFrameTime = now;
    renderFrame(dtSeconds);
    rafId = window.requestAnimationFrame(frame);
  }

  function runPendingScene() {
    sceneTimer = 0;
    if (!state.opened || pendingScene === null) return;
    const now = readCurrent();
    const current = finite(now.sceneIndex, 0);
    if (current !== pendingScene && state.bridge && state.bridge.stepScene) {
      state.bridge.stepScene(pendingScene > current ? 1 : -1);
      if (state.bridge.requestRedraw) state.bridge.requestRedraw();
    }
    const after = readCurrent();
    validateView(false);
    if (finite(after.sceneIndex, 0) !== pendingScene) {
      sceneTimer = setTimeout(runPendingScene, 140);
    } else {
      pendingScene = null;
      elements.fade.classList.remove("on");
    }
  }

  function queueScene(direction) {
    if (!state.opened) return;
    const current = readCurrent();
    const count = finite(current.sceneCount, 0);
    if (!count) return;
    const from = pendingScene === null ? finite(current.sceneIndex, 0) : pendingScene;
    const target = clamp(from + direction, 0, count - 1);
    if (target === from) return;
    pendingScene = target;
    elements.fade.classList.add("on");
    if (!sceneTimer) sceneTimer = setTimeout(runPendingScene, 140);
  }

  function onPointerDown(event) {
    drag = { x: event.clientX, y: event.clientY };
    elements.canvas.classList.add("dragging");
    if (elements.canvas.setPointerCapture) elements.canvas.setPointerCapture(event.pointerId);
    hintDismissed = true;
    elements.hint.classList.add("gone");
  }

  function onPointerMove(event) {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag = { x: event.clientX, y: event.clientY };
    state.targetYaw -= dx * .22;
    state.targetPitch = clamp(state.targetPitch + dy * .18,
      state.view.type === "free" ? -89 : -58, state.view.type === "free" ? 89 : 62);
    if (state.view.type === "free" && state.free) {
      state.free.yaw = state.targetYaw;
      state.free.pitch = state.targetPitch;
    }
  }

  function endPointer() {
    drag = null;
    if (elements) elements.canvas.classList.remove("dragging");
  }

  function consumeKey(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
  }

  function dismissHint() {
    hintDismissed = true;
    if (elements) elements.hint.classList.add("gone");
  }

  function onKeyDown(event) {
    if (!state.opened || event.isComposing) return;
    const code = event.code || event.key;
    if (code === "Escape") {
      consumeKey(event);
      close();
      return;
    }
    if (code === "ArrowLeft") {
      consumeKey(event);
      queueScene(-1);
      return;
    }
    if (code === "ArrowRight") {
      consumeKey(event);
      queueScene(1);
      return;
    }
    if (state.view.type !== "free" || event.metaKey || event.ctrlKey || event.altKey) return;
    const movementCodes = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "KeyE", "KeyQ", "ShiftLeft", "ShiftRight"]);
    if (code === "KeyR") {
      consumeKey(event);
      dismissHint();
      if (!event.repeat) applyFreePreset("audience-center");
      return;
    }
    if (!movementCodes.has(code)) return;
    pressed.add(code);
    consumeKey(event);
    dismissHint();
  }

  function onKeyUp(event) {
    const code = event.code || event.key;
    if (!pressed.has(code)) return;
    pressed.delete(code);
    if (state.opened && state.view.type === "free" && !event.isComposing) consumeKey(event);
  }

  function onBlur() {
    pressed.clear();
    lastFrameTime = null;
  }

  function open(bridge) {
    if (!bridge || typeof bridge.read !== "function") return false;
    ensureDom();
    if (state.opened) close(false);
    state.bridge = bridge;
    readCurrent();
    loadPanelLayouts();
    const initial = data.pieces.find((piece) => piece.id === bridge.initialPieceId && piece.type === "performer");
    state.free = null;
    if (bridge.initialView === "free") {
      const preset = freePresets(W, D, CEIL)[0];
      state.free = { x: preset.x, y: preset.y, z: preset.z, yaw: preset.yaw, pitch: preset.pitch };
      state.view = { type: "free", key: null, name: "" };
    } else if (initial) state.view = { type: "performer", key: identity(initial), name: labelOf(initial) };
    else state.view = { type: "audience", key: null, name: "" };
    state.opened = true;
    hintDismissed = false;
    pressed.clear();
    lastFrameTime = null;
    pendingScene = null;
    elements.root.hidden = false;
    elements.root.setAttribute("aria-hidden", "false");
    resize();
    if (state.bridge.requestRedraw) state.bridge.requestRedraw();
    validateView(true);
    applyPanelLayouts();
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    rafId = window.requestAnimationFrame(frame);
    return true;
  }

  function close(notify = true) {
    if (!elements || !state.opened) return;
    state.opened = false;
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
    clearTimeout(sceneTimer);
    clearTimeout(toastTimer);
    sceneTimer = 0;
    pendingScene = null;
    drag = null;
    panelDrag = null;
    pressed.clear();
    lastFrameTime = null;
    savePanelLayouts();
    elements.toast.classList.remove("show");
    elements.toast.textContent = "";
    elements.root.hidden = true;
    elements.root.setAttribute("aria-hidden", "true");
    elements.fade.classList.remove("on");
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("blur", onBlur);
    const onClose = state.bridge && state.bridge.onClose;
    state.bridge = null;
    state.free = null;
    if (notify && typeof onClose === "function") onClose();
  }

  window.SHOSAI_STAGE_FPV = Object.freeze({
    open,
    close,
    _geom: Object.freeze({ toWorld, yawForward, rightOf, clipPolyNear, eyeHeight,
      moveFree, clampFree, freePresets, frameDelta }),
    _panels: Object.freeze({
      clampLayout: clampPanelLayout,
      contentHeight: panelContentHeight,
      defaults: defaultPanelLayouts,
      serialize: serializePanels,
      restore: restorePanels,
      setVisible: setPanelVisible,
    }),
  });
})();

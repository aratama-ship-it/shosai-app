(function () {
  "use strict";

  const NEAR = 0.12;
  const FOV_H = 86 * Math.PI / 180;
  const DEFAULT_HEIGHT_CM = 170;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

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
  let hintDismissed = false;
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
#stage-fpv-whose{left:20px;bottom:64px;font-size:12.5px;opacity:.85;pointer-events:none}#stage-fpv-whose b{font-weight:600}#stage-fpv-whose .m{opacity:.6;margin-left:.6em}
#stage-fpv-cast{left:20px;bottom:20px;right:220px;display:flex;flex-wrap:wrap;gap:6px}.stage-fpv-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px 5px 8px;border-radius:3px;background:rgba(22,16,11,.86);border:1px solid rgba(232,226,212,.16);color:#e8e2d4;font-size:12px;cursor:pointer;font-family:inherit}.stage-fpv-chip:hover{border-color:rgba(232,226,212,.45)}.stage-fpv-chip.on{background:#e8e2d4;color:#14100c;border-color:#e8e2d4}.stage-fpv-chip .dot{width:8px;height:8px;border-radius:50%;flex:none}
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
    const nav = createElement("div", "stage-fpv-nav", "stage-fpv-hud");
    const previous = createElement("button", "stage-fpv-prev");
    previous.type = "button";
    const count = createElement("span", "stage-fpv-count");
    const next = createElement("button", "stage-fpv-next");
    next.type = "button";
    nav.append(previous, count, next);
    const hint = createElement("div", "stage-fpv-hint", "stage-fpv-hud");
    const toast = createElement("div", "stage-fpv-toast", "stage-fpv-hud");
    const closeButton = createElement("button", "stage-fpv-close");
    closeButton.type = "button";
    closeButton.textContent = "✕";
    root.append(canvas, fade, title, minimap, whose, cast, nav, hint, toast, closeButton);
    document.body.appendChild(root);
    elements = { root, canvas, fade, show, act, scene, approx, minimap, whose, cast,
      previous, count, next, hint, toast, closeButton };
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

  function cameraPose() {
    const me = currentPerformer(data.pieces);
    if (me) {
      const point = toWorld(finite(me.u, 0.5), finite(me.v, 0.5), W, D);
      return { x: point.x, y: eyeHeight(me, heightOf(me), data.pieces), z: point.z, me };
    }
    return { x: 0, y: 1.35, z: D / 2 + 6.2, me: null };
  }

  function resetAngles() {
    const me = currentPerformer(data.pieces);
    if (me) {
      state.targetYaw = finite(me.facing, 0);
      state.targetPitch = 0;
    } else {
      state.targetYaw = 180;
      state.targetPitch = -2;
    }
    state.yaw = state.targetYaw;
    state.pitch = state.targetPitch;
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
    elements.hint.textContent = text("ドラッグで見回す");
    elements.hint.classList.toggle("gone", hintDismissed);
    elements.closeButton.setAttribute("aria-label", text("視界を閉じる"));
    const me = currentPerformer(data.pieces);
    elements.whose.textContent = "";
    const bold = createElement("b");
    const metrics = createElement("span", "", "m");
    if (me) {
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
    elements.cast.textContent = "";
    const seen = new Set();
    performers(data.pieces).forEach((piece) => {
      const key = identity(piece);
      if (!key || seen.has(key)) return;
      seen.add(key);
      const label = labelOf(piece);
      elements.cast.appendChild(makeChip(label, piece.color || "#c9c2b4",
        state.view.type === "performer" && state.view.key === key, () => {
          state.view = { type: "performer", key, name: label };
          resetAngles();
          renderHud();
        }));
    });
    elements.cast.appendChild(makeChip(text("客席"), "#8d7a5f", state.view.type === "audience", () => {
      state.view = { type: "audience", key: null, name: "" };
      resetAngles();
      renderHud();
    }));
  }

  function resize() {
    if (!elements) return;
    pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    canvasWidth = window.innerWidth || elements.root.clientWidth || 1024;
    canvasHeight = window.innerHeight || elements.root.clientHeight || 768;
    elements.canvas.width = canvasWidth * pixelRatio;
    elements.canvas.height = canvasHeight * pixelRatio;
    focal = (canvasWidth / 2) / Math.tan(FOV_H / 2);
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

  function drawBox(ctx, cx, cz, y0, y1, width, depth, color) {
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const corners = [
      { x: cx - halfWidth, z: cz - halfDepth }, { x: cx + halfWidth, z: cz - halfDepth },
      { x: cx + halfWidth, z: cz + halfDepth }, { x: cx - halfWidth, z: cz + halfDepth },
    ];
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
    if (["wall", "block", "suitcase", "trampoline", "teeter"].includes(piece.type)) {
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
    const scale = Math.min((width - padding * 2) / W, availableHeight / D);
    const originX = width / 2; const originY = padding + (availableHeight - D * scale) / 2 + 4;
    const mapX = (x) => originX + x * scale;
    const mapY = (z) => originY + (z + D / 2) * scale;
    ctx.fillStyle = "rgba(30,24,19,.9)";
    ctx.fillRect(mapX(-W / 2), originY, W * scale, D * scale);
    ctx.strokeStyle = "rgba(232,226,212,.3)";
    ctx.strokeRect(mapX(-W / 2), originY, W * scale, D * scale);
    ctx.fillStyle = "rgba(232,226,212,.4)"; ctx.font = "8.5px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(text("客席"), originX, originY + D * scale + 11);
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
    ctx.closePath(); ctx.fillStyle = "rgba(232,226,212,.13)"; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fillStyle = "#e8e2d4"; ctx.fill();
    ctx.strokeStyle = "#14100c"; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function renderFrame() {
    const ctx = elements.canvas.getContext("2d");
    if (!ctx) return;
    state.yaw += (state.targetYaw - state.yaw) * .24;
    state.pitch += (state.targetPitch - state.pitch) * .24;
    readCurrent();
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
  }

  function frame() {
    if (!state.opened) return;
    renderFrame();
    rafId = window.requestAnimationFrame(frame);
  }

  function runPendingScene() {
    sceneTimer = 0;
    if (!state.opened || pendingScene === null) return;
    const now = readCurrent();
    const current = finite(now.sceneIndex, 0);
    if (current !== pendingScene && state.bridge && state.bridge.stepScene) {
      state.bridge.stepScene(pendingScene > current ? 1 : -1);
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
    state.targetPitch = clamp(state.targetPitch + dy * .18, -58, 62);
  }

  function endPointer() {
    drag = null;
    if (elements) elements.canvas.classList.remove("dragging");
  }

  function onKeyDown(event) {
    if (!state.opened) return;
    if (event.key === "Escape") close();
    else if (event.key === "ArrowLeft") queueScene(-1);
    else if (event.key === "ArrowRight") queueScene(1);
    else return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
  }

  function open(bridge) {
    if (!bridge || typeof bridge.read !== "function") return false;
    ensureDom();
    if (state.opened) close(false);
    state.bridge = bridge;
    readCurrent();
    const initial = data.pieces.find((piece) => piece.id === bridge.initialPieceId && piece.type === "performer");
    if (initial) state.view = { type: "performer", key: identity(initial), name: labelOf(initial) };
    else state.view = { type: "audience", key: null, name: "" };
    state.opened = true;
    hintDismissed = false;
    pendingScene = null;
    elements.root.hidden = false;
    elements.root.setAttribute("aria-hidden", "false");
    resize();
    validateView(true);
    window.addEventListener("keydown", onKeyDown, true);
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
    elements.toast.classList.remove("show");
    elements.toast.textContent = "";
    elements.root.hidden = true;
    elements.root.setAttribute("aria-hidden", "true");
    elements.fade.classList.remove("on");
    window.removeEventListener("keydown", onKeyDown, true);
    const onClose = state.bridge && state.bridge.onClose;
    state.bridge = null;
    if (notify && typeof onClose === "function") onClose();
  }

  window.SHOSAI_STAGE_FPV = Object.freeze({
    open,
    close,
    _geom: Object.freeze({ toWorld, yawForward, rightOf, clipPolyNear, eyeHeight }),
  });
})();

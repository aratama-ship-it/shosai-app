/* 舞台スケッチ — 会場エディタ（方式仕様 7章）
 *
 * 近い形を選び、辺と角で floor.outline を合わせる。
 * 壁沿いの audience[] は辺のタップと深さドラッグで作る。
 * 柱・什器・扉を置き、天井の高さと吊り条件を段階で選ぶ。
 * venue から導く4本の lines と、一時的な探り針を同じ平面へ重ねる。
 * 斜め壁・自由ポリゴン・3D・正面図への反映は、この版には入れない。
 */
(function () {
  "use strict";

  const WORLD = { minX: 0, maxX: 24, minY: 0, maxY: 16 };
  const CANVAS_PADDING = 30;
  const LONG_PRESS_MS = 620;
  const MOVE_START_M = 0.14;
  const HANDLE_HIT_PX = 13;
  const EDGE_HIT_PX = 18;
  const MIN_SEGMENT_M = 0.65;
  const AUDIENCE_MIN_DEPTH_M = 0.75;
  const AUDIENCE_MAX_DEPTH_M = 3.5;
  const COLUMN_DEFAULT_RADIUS_M = 0.4;
  const COLUMN_MIN_RADIUS_M = 0.2;
  const COLUMN_MAX_RADIUS_M = 2;
  const FURNITURE_MIN_SIDE_M = 0.4;
  const ACCESS_DEFAULT_WIDTH_M = 1.2;
  const FURNITURE_HEIGHTS = Object.freeze({
    knee: 0.5,
    waist: 1,
    person: 1.7,
  });

  const $ = (id) => document.getElementById(id);
  const els = {
    open: $("stage-venue-editor-open"),
    backdrop: $("stage-venue-editor-backdrop"),
    modal: $("stage-venue-editor-modal"),
    close: $("stage-venue-editor-close"),
    canvas: $("stage-venue-editor-canvas"),
    dims: $("stage-venue-editor-dims"),
    status: $("stage-venue-editor-status"),
    audienceSelection: $("stage-venue-editor-audience-selection"),
    audienceMode: $("stage-venue-editor-audience-mode"),
    audienceModeText: $("stage-venue-editor-audience-mode-text"),
    audienceRemove: $("stage-venue-editor-audience-remove"),
    objectSelection: $("stage-venue-editor-object-selection"),
    objectMovable: $("stage-venue-editor-object-movable"),
    objectRemove: $("stage-venue-editor-object-remove"),
    accessType: $("stage-venue-editor-access-type"),
    probeTool: $("stage-venue-editor-probe-tool"),
    probeReach: $("stage-venue-editor-probe-reach"),
    probeReachValue: $("stage-venue-editor-probe-reach-value"),
    probeCaptureOpen: $("stage-venue-editor-probe-capture-open"),
    probeCaptureInput: $("stage-venue-editor-probe-capture-input"),
    probeCaptureSource: $("stage-venue-editor-probe-capture-source"),
    probeHeadroom: $("stage-venue-editor-probe-headroom"),
    probeStatus: $("stage-venue-editor-probe-status"),
    name: $("stage-venue-editor-name"),
    source: $("stage-venue-editor-source"),
    confidence: $("stage-venue-editor-confidence"),
    sharing: $("stage-venue-editor-sharing"),
    save: $("stage-venue-editor-save"),
    saveStatus: $("stage-venue-editor-save-status"),
    libraryExport: $("stage-venue-library-export"),
    libraryImport: $("stage-venue-library-import"),
    libraryStatus: $("stage-venue-library-status"),
  };

  if (!els.open || !els.modal || !els.canvas) return;
  const library = window.SHOSAI_VENUES && window.SHOSAI_VENUES.library;
  const linesEngine = window.SHOSAI_VENUE_LINES;
  if (!library || !linesEngine) return;

  const ctx = els.canvas.getContext("2d");
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const roundM = (value) => Math.round(value * 10) / 10;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dot = (a, b) => (a[0] * b[0]) + (a[1] * b[1]);
  const cross = (a, b, c) =>
    ((b[0] - a[0]) * (c[1] - b[1])) - ((b[1] - a[1]) * (c[0] - b[0]));

  function circleOutline() {
    const center = [12, 8];
    const radius = 5;
    const segments = 24;
    return Array.from({ length: segments }, (_, index) => {
      const angle = (Math.PI * 2 * index) / segments;
      return [
        roundM(center[0] + (Math.cos(angle) * radius)),
        roundM(center[1] + (Math.sin(angle) * radius)),
      ];
    });
  }

  function pointsForShape(shape) {
    if (shape === "l-shape") {
      return [[6, 4], [18, 4], [18, 9], [13, 9], [13, 12], [6, 12]];
    }
    if (shape === "circle") return circleOutline();
    if (shape === "trapezoid") return [[8, 4], [17, 4], [19, 12], [5, 12]];
    return [[6, 4], [18, 4], [18, 12], [6, 12]];
  }

  const state = {
    shape: "rectangle",
    points: pointsForShape("rectangle"),
    audience: [],
    fixtures: [],
    access: [],
    ceiling: { heightM: 6, rigging: "none" },
    mode: "select",
    nextFurnitureHeight: "waist",
    nextAccessType: "entrance",
    selectedElement: null,
    selectedAudienceId: null,
    hoverCorner: -1,
    hoverEdge: -1,
    hoverAudienceId: null,
    bandSerial: 1,
    elementSerial: 1,
    lines: {
      probe: { at: [12, 8], tool: "unspecified", reachHeightM: 3 },
      measurement: null,
      visible: { movement: true, fall: true, blind: true, sight: true },
    },
  };

  let activePointer = null;
  let longPressTimer = null;
  let returnFocus = null;
  let linesCache = { venueSignature: "", probeSignature: "", result: null };

  function polygonArea(points) {
    return points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + (point[0] * next[1]) - (next[0] * point[1]);
    }, 0) / 2;
  }

  function pointOnSegment(point, a, b) {
    const tolerance = 0.0001;
    return point[0] >= Math.min(a[0], b[0]) - tolerance &&
      point[0] <= Math.max(a[0], b[0]) + tolerance &&
      point[1] >= Math.min(a[1], b[1]) - tolerance &&
      point[1] <= Math.max(a[1], b[1]) + tolerance &&
      Math.abs(cross(a, point, b)) < tolerance;
  }

  function segmentsIntersect(a, b, c, d) {
    const abC = cross(a, b, c);
    const abD = cross(a, b, d);
    const cdA = cross(c, d, a);
    const cdB = cross(c, d, b);
    if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) &&
        ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return true;
    if (Math.abs(abC) < 0.0001 && pointOnSegment(c, a, b)) return true;
    if (Math.abs(abD) < 0.0001 && pointOnSegment(d, a, b)) return true;
    if (Math.abs(cdA) < 0.0001 && pointOnSegment(a, c, d)) return true;
    if (Math.abs(cdB) < 0.0001 && pointOnSegment(b, c, d)) return true;
    return false;
  }

  function validOutline(points) {
    if (!Array.isArray(points) || points.length < 3 || Math.abs(polygonArea(points)) < 3) return false;
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const next = points[(index + 1) % points.length];
      if (point[0] < WORLD.minX + 0.5 || point[0] > WORLD.maxX - 0.5 ||
          point[1] < WORLD.minY + 0.5 || point[1] > WORLD.maxY - 0.5 ||
          distance(point, next) < MIN_SEGMENT_M) return false;
    }
    for (let first = 0; first < points.length; first += 1) {
      const firstNext = (first + 1) % points.length;
      for (let second = first + 1; second < points.length; second += 1) {
        const secondNext = (second + 1) % points.length;
        if (first === second || firstNext === second || secondNext === first) continue;
        if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) {
          return false;
        }
      }
    }
    return true;
  }

  function dimensions(points = state.points) {
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    return {
      width: roundM(Math.max(...xs) - Math.min(...xs)),
      depth: roundM(Math.max(...ys) - Math.min(...ys)),
    };
  }

  function approxM(value) {
    return Math.max(1, Math.round(value));
  }

  function looseSnap(value) {
    const integer = Math.round(value);
    if (Math.abs(value - integer) <= 0.22) return integer;
    return roundM(value);
  }

  function snappedPoint(point) {
    return [
      clamp(looseSnap(point[0]), WORLD.minX + 0.5, WORLD.maxX - 0.5),
      clamp(looseSnap(point[1]), WORLD.minY + 0.5, WORLD.maxY - 0.5),
    ];
  }

  function axisOf(a, b) {
    const dx = Math.abs(b[0] - a[0]);
    const dy = Math.abs(b[1] - a[1]);
    if (dy < 0.05 && dx > MIN_SEGMENT_M) return "horizontal";
    if (dx < 0.05 && dy > MIN_SEGMENT_M) return "vertical";
    return "diagonal";
  }

  function view() {
    const worldW = WORLD.maxX - WORLD.minX;
    const worldH = WORLD.maxY - WORLD.minY;
    const scale = Math.min(
      (els.canvas.width - (CANVAS_PADDING * 2)) / worldW,
      (els.canvas.height - (CANVAS_PADDING * 2)) / worldH,
    );
    const drawnW = worldW * scale;
    const drawnH = worldH * scale;
    return {
      scale,
      offsetX: (els.canvas.width - drawnW) / 2,
      offsetY: (els.canvas.height - drawnH) / 2,
    };
  }

  function toCanvas(point) {
    const layout = view();
    return [
      layout.offsetX + ((point[0] - WORLD.minX) * layout.scale),
      layout.offsetY + ((point[1] - WORLD.minY) * layout.scale),
    ];
  }

  function fromEvent(event) {
    const rect = els.canvas.getBoundingClientRect();
    const layout = view();
    const canvasX = (event.clientX - rect.left) * (els.canvas.width / rect.width);
    const canvasY = (event.clientY - rect.top) * (els.canvas.height / rect.height);
    return [
      WORLD.minX + ((canvasX - layout.offsetX) / layout.scale),
      WORLD.minY + ((canvasY - layout.offsetY) / layout.scale),
    ];
  }

  function outwardNormal(edgeIndex, points = state.points) {
    const a = points[edgeIndex];
    const b = points[(edgeIndex + 1) % points.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.max(0.0001, Math.hypot(dx, dy));
    const direction = polygonArea(points) >= 0 ? 1 : -1;
    return [(dy / length) * direction, (-dx / length) * direction];
  }

  function audiencePolygon(band) {
    const edgeIndex = band.edgeIndex;
    const a = state.points[edgeIndex];
    const b = state.points[(edgeIndex + 1) % state.points.length];
    if (!a || !b) return [];
    const normal = outwardNormal(edgeIndex);
    const farA = [a[0] + (normal[0] * band.depthM), a[1] + (normal[1] * band.depthM)];
    const farB = [b[0] + (normal[0] * band.depthM), b[1] + (normal[1] * band.depthM)];
    return [a, b, farB, farA].map((point) => [roundM(point[0]), roundM(point[1])]);
  }

  function audienceHandle(band) {
    const a = state.points[band.edgeIndex];
    const b = state.points[(band.edgeIndex + 1) % state.points.length];
    const middle = midpoint(a, b);
    const normal = outwardNormal(band.edgeIndex);
    return [middle[0] + (normal[0] * band.depthM), middle[1] + (normal[1] * band.depthM)];
  }

  function bandForEdge(edgeIndex) {
    return state.audience.find((band) => band.edgeIndex === edgeIndex) || null;
  }

  function selectedBand() {
    return state.audience.find((band) => band.id === state.selectedAudienceId) || null;
  }

  function distanceToSegment(point, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSquared = (dx * dx) + (dy * dy);
    if (!lengthSquared) return distance(point, a);
    const amount = clamp((((point[0] - a[0]) * dx) + ((point[1] - a[1]) * dy)) / lengthSquared, 0, 1);
    return distance(point, [a[0] + (dx * amount), a[1] + (dy * amount)]);
  }

  function segmentProjection(point, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSquared = (dx * dx) + (dy * dy);
    const amount = lengthSquared
      ? clamp((((point[0] - a[0]) * dx) + ((point[1] - a[1]) * dy)) / lengthSquared, 0, 1)
      : 0;
    return {
      amount,
      point: [roundM(a[0] + (dx * amount)), roundM(a[1] + (dy * amount))],
    };
  }

  function pointInPolygon(point, polygon) {
    if (polygon.some((corner, index) =>
      pointOnSegment(point, corner, polygon[(index + 1) % polygon.length]))) return true;
    let inside = false;
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      const a = polygon[current];
      const b = polygon[previous];
      const crosses = ((a[1] > point[1]) !== (b[1] > point[1])) &&
        point[0] < (((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1])) + a[0];
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function rectangleFromPoints(a, b) {
    const minX = Math.min(a[0], b[0]);
    const maxX = Math.max(a[0], b[0]);
    const minY = Math.min(a[1], b[1]);
    const maxY = Math.max(a[1], b[1]);
    return [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]]
      .map((point) => point.map(roundM));
  }

  function validFurniturePolygon(polygon) {
    const dims = dimensions(polygon);
    return dims.width >= FURNITURE_MIN_SIDE_M && dims.depth >= FURNITURE_MIN_SIDE_M &&
      polygon.every((point) => pointInPolygon(point, state.points));
  }

  function accessAt(item) {
    const a = state.points[item.edgeIndex];
    const b = state.points[(item.edgeIndex + 1) % state.points.length];
    if (!a || !b) return item.at || [0, 0];
    return [
      roundM(a[0] + ((b[0] - a[0]) * item.edgeAmount)),
      roundM(a[1] + ((b[1] - a[1]) * item.edgeAmount)),
    ];
  }

  function furnitureHeightM(item) {
    return item.heightLevel === "ceiling"
      ? state.ceiling.heightM
      : (FURNITURE_HEIGHTS[item.heightLevel] || 1);
  }

  function selectedFixture() {
    if (!state.selectedElement || state.selectedElement.kind !== "fixture") return null;
    return state.fixtures.find((item) => item.id === state.selectedElement.id) || null;
  }

  function selectedAccess() {
    if (!state.selectedElement || state.selectedElement.kind !== "access") return null;
    return state.access.find((item) => item.id === state.selectedElement.id) || null;
  }

  function hitElement(point) {
    const accessThreshold = HANDLE_HIT_PX / view().scale;
    for (let index = state.access.length - 1; index >= 0; index -= 1) {
      if (distance(point, accessAt(state.access[index])) <= accessThreshold) {
        return { kind: "access", id: state.access[index].id };
      }
    }
    for (let index = state.fixtures.length - 1; index >= 0; index -= 1) {
      const item = state.fixtures[index];
      if (item.type === "column" && distance(point, item.at) <= item.radiusM + accessThreshold) {
        return { kind: "fixture", id: item.id };
      }
      if (item.type === "furniture" && pointInPolygon(point, item.polygon)) {
        return { kind: "fixture", id: item.id };
      }
    }
    return null;
  }

  function hitCorner(point) {
    const threshold = HANDLE_HIT_PX / view().scale;
    let hit = -1;
    let nearest = threshold;
    state.points.forEach((corner, index) => {
      const value = distance(point, corner);
      if (value <= nearest) {
        hit = index;
        nearest = value;
      }
    });
    return hit;
  }

  function hitEdge(point) {
    const threshold = EDGE_HIT_PX / view().scale;
    let hit = -1;
    let nearest = threshold;
    state.points.forEach((a, index) => {
      const b = state.points[(index + 1) % state.points.length];
      const value = distanceToSegment(point, a, b);
      if (value <= nearest) {
        hit = index;
        nearest = value;
      }
    });
    return hit;
  }

  function hitAudienceHandle(point) {
    const threshold = HANDLE_HIT_PX / view().scale;
    let match = null;
    let nearest = threshold;
    state.audience.forEach((band) => {
      const value = distance(point, audienceHandle(band));
      if (value <= nearest) {
        match = band;
        nearest = value;
      }
    });
    return match;
  }

  function lineVenue() {
    return buildVenue("custom-room-preview", "作成中の会場", {
      source: "記憶",
      confidence: "low",
      sharing: "internal-only",
    });
  }

  function currentLines() {
    const venue = lineVenue();
    const venueSignature = JSON.stringify({
      floor: venue.floor,
      ceiling: venue.ceiling,
      audience: venue.audience,
      fixtures: venue.fixtures,
    });
    const probeSignature = JSON.stringify(state.lines.probe);
    if (venueSignature !== linesCache.venueSignature || !linesCache.result) {
      linesCache = {
        venueSignature,
        probeSignature,
        result: linesEngine.compute(venue, state.lines.probe,
          (window.SHOSAI_VENUES && window.SHOSAI_VENUES.sightLimits) || []),
      };
    } else if (probeSignature !== linesCache.probeSignature) {
      const probe = linesEngine.normalizeProbe(venue, state.lines.probe);
      linesCache = {
        venueSignature,
        probeSignature,
        result: {
          ...linesCache.result,
          probe,
          fall: linesEngine.computeFall(venue, probe),
        },
      };
    }
    return linesCache.result;
  }

  function hitProbe(point) {
    const probe = currentLines().probe;
    return distance(point, probe.at) <= HANDLE_HIT_PX / view().scale;
  }

  function cssColor(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function drawGrid() {
    const layout = view();
    ctx.save();
    ctx.fillStyle = cssColor("--desk", "#191512");
    ctx.fillRect(0, 0, els.canvas.width, els.canvas.height);
    for (let x = WORLD.minX; x <= WORLD.maxX; x += 1) {
      const from = toCanvas([x, WORLD.minY]);
      const to = toCanvas([x, WORLD.maxY]);
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = x % 5 === 0 ? "rgba(211,172,89,0.20)" : "rgba(240,231,214,0.08)";
      ctx.lineWidth = x % 5 === 0 ? 1.25 : 1;
      ctx.stroke();
    }
    for (let y = WORLD.minY; y <= WORLD.maxY; y += 1) {
      const from = toCanvas([WORLD.minX, y]);
      const to = toCanvas([WORLD.maxX, y]);
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = y % 5 === 0 ? "rgba(211,172,89,0.20)" : "rgba(240,231,214,0.08)";
      ctx.lineWidth = y % 5 === 0 ? 1.25 : 1;
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(240,231,214,0.42)";
    ctx.font = "12px sans-serif";
    ctx.fillText("1枡 ≒ 1m", layout.offsetX + 8, layout.offsetY + 18);
    ctx.restore();
  }

  function pathPolygon(points) {
    points.forEach((point, index) => {
      const canvasPoint = toCanvas(point);
      if (index === 0) ctx.moveTo(canvasPoint[0], canvasPoint[1]);
      else ctx.lineTo(canvasPoint[0], canvasPoint[1]);
    });
    ctx.closePath();
  }

  function drawFloor() {
    ctx.save();
    ctx.beginPath();
    pathPolygon(state.points);
    ctx.fillStyle = "rgba(240,231,214,0.08)";
    ctx.fill();
    ctx.restore();
  }

  function fillWorldRects(rects, color) {
    if (!rects.length) return;
    ctx.save();
    ctx.beginPath();
    rects.forEach((rect) => {
      const from = toCanvas([rect.x, rect.y]);
      const to = toCanvas([rect.x + rect.width, rect.y + rect.height]);
      ctx.rect(from[0], from[1], to[0] - from[0], to[1] - from[1]);
    });
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawMovementLines(result) {
    if (!state.lines.visible.movement) return;
    fillWorldRects(result.movement.areas, "rgba(73,177,145,0.20)");
    result.movement.movableExtensions.forEach((shape) => {
      ctx.save();
      ctx.beginPath();
      if (shape.kind === "circle") {
        const at = toCanvas(shape.at);
        ctx.arc(at[0], at[1], (shape.radiusM + shape.clearanceM) * view().scale, 0, Math.PI * 2);
      } else {
        pathPolygon(shape.polygon);
      }
      ctx.fillStyle = "rgba(83,183,214,0.13)";
      ctx.fill();
      ctx.strokeStyle = "rgba(102,207,235,0.92)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawBlindSpots(result) {
    if (!state.lines.visible.blind) return;
    fillWorldRects(result.blindSpots.areas.filter((area) => area.kind === "partial"),
      "rgba(7,6,5,0.22)");
    fillWorldRects(result.blindSpots.areas.filter((area) => area.kind === "all"),
      "rgba(7,6,5,0.52)");
  }

  function drawSightLimits(result) {
    if (!state.lines.visible.sight) return;
    result.sightLimits.forEach((line, index) => {
      ctx.save();
      ctx.beginPath();
      line.segments.forEach((segment) => {
        const from = toCanvas(segment[0]);
        const to = toCanvas(segment[1]);
        ctx.moveTo(from[0], from[1]);
        ctx.lineTo(to[0], to[1]);
      });
      ctx.strokeStyle = index === 0 ? "rgba(211,172,89,0.92)" : "rgba(189,179,164,0.82)";
      ctx.lineWidth = 2;
      ctx.setLineDash(index === 0 ? [9, 5] : [3, 5]);
      ctx.stroke();
      const first = line.segments[0] && toCanvas(line.segments[0][0]);
      if (first) {
        ctx.fillStyle = index === 0 ? cssColor("--brass", "#d3ac59") : cssColor("--milk", "#f0e7d6");
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(`${line.m}m ${line.label}`, first[0] + 5, first[1] - 4);
      }
      ctx.restore();
    });
  }

  function drawFallRange(result) {
    if (!state.lines.visible.fall) return;
    const fall = result.fall;
    const center = toCanvas(fall.center);
    const radiusPx = fall.radiusM * view().scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(center[0], center[1], radiusPx, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(211,172,89,0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(238,195,93,0.96)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    fall.overlapPolygons.forEach((polygon) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(center[0], center[1], radiusPx, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      pathPolygon(polygon);
      ctx.fillStyle = "rgba(238,55,48,0.88)";
      ctx.fill();
      ctx.restore();
    });

    ctx.save();
    ctx.fillStyle = fall.audienceOverlap ? "#ff6b61" : cssColor("--brass", "#d3ac59");
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`落下範囲（目安） 半径${fall.radiusM.toFixed(1)}m`, center[0], center[1] - radiusPx - 5);
    ctx.restore();
  }

  function drawProbe(result) {
    const at = toCanvas(result.probe.at);
    ctx.save();
    ctx.beginPath();
    ctx.arc(at[0], at[1], 9, 0, Math.PI * 2);
    ctx.fillStyle = cssColor("--desk", "#191512");
    ctx.fill();
    ctx.strokeStyle = cssColor("--brass", "#d3ac59");
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(at[0] - 4, at[1]);
    ctx.lineTo(at[0] + 4, at[1]);
    ctx.moveTo(at[0], at[1] - 4);
    ctx.lineTo(at[0], at[1] + 4);
    ctx.strokeStyle = cssColor("--milk", "#f0e7d6");
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = cssColor("--milk", "#f0e7d6");
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("探り針", at[0] + 13, at[1]);
    ctx.restore();
  }

  function drawAudience() {
    state.audience.forEach((band) => {
      const polygon = audiencePolygon(band);
      if (!polygon.length) return;
      ctx.save();
      ctx.beginPath();
      pathPolygon(polygon);
      ctx.fillStyle = band.id === state.selectedAudienceId
        ? "rgba(168,75,38,0.38)" : "rgba(168,75,38,0.25)";
      ctx.fill();
      ctx.strokeStyle = band.id === state.selectedAudienceId
        ? cssColor("--brass", "#d3ac59") : cssColor("--rust", "#a84b26");
      ctx.lineWidth = band.id === state.selectedAudienceId ? 3 : 2;
      ctx.stroke();

      const handle = toCanvas(audienceHandle(band));
      ctx.beginPath();
      ctx.arc(handle[0], handle[1], band.id === state.selectedAudienceId ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = cssColor("--desk-2", "#241e19");
      ctx.fill();
      ctx.strokeStyle = cssColor("--brass", "#d3ac59");
      ctx.lineWidth = 2;
      ctx.stroke();

      const wall = state.points[band.edgeIndex];
      const wallNext = state.points[(band.edgeIndex + 1) % state.points.length];
      const labelAt = toCanvas(midpoint(audienceHandle(band), midpoint(wall, wallNext)));
      ctx.fillStyle = cssColor("--milk", "#f0e7d6");
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(band.mode === "seated" ? "座" : "立", labelAt[0], labelAt[1]);
      ctx.restore();
    });
  }

  function drawRoom() {
    ctx.save();
    ctx.beginPath();
    pathPolygon(state.points);
    ctx.strokeStyle = cssColor("--milk-dim", "#bdb3a4");
    ctx.lineWidth = 3;
    ctx.stroke();

    state.points.forEach((point, index) => {
      const next = state.points[(index + 1) % state.points.length];
      const a = toCanvas(point);
      const b = toCanvas(next);
      const band = bandForEdge(index);
      const active = index === state.hoverEdge || (activePointer && activePointer.kind === "edge" && activePointer.index === index);
      if (active || band) {
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = active ? cssColor("--brass", "#d3ac59") : cssColor("--rust", "#a84b26");
        ctx.lineWidth = active ? 7 : 5;
        ctx.stroke();
      }

      if (state.points.length <= 8 || active) {
        const normal = outwardNormal(index);
        const middle = midpoint(point, next);
        const labelPoint = toCanvas([middle[0] - (normal[0] * 0.38), middle[1] - (normal[1] * 0.38)]);
        ctx.fillStyle = cssColor("--milk", "#f0e7d6");
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`約${approxM(distance(point, next))}m`, labelPoint[0], labelPoint[1]);
      }
    });

    state.points.forEach((point, index) => {
      const at = toCanvas(point);
      const active = index === state.hoverCorner ||
        (activePointer && activePointer.kind === "corner" && activePointer.index === index);
      ctx.beginPath();
      ctx.arc(at[0], at[1], active ? 7 : (state.points.length > 12 ? 3.5 : 5), 0, Math.PI * 2);
      ctx.fillStyle = active ? cssColor("--brass", "#d3ac59") : cssColor("--milk", "#f0e7d6");
      ctx.fill();
      ctx.strokeStyle = cssColor("--desk", "#191512");
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawFixtures() {
    state.fixtures.forEach((item) => {
      const selected = state.selectedElement && state.selectedElement.kind === "fixture" &&
        state.selectedElement.id === item.id;
      ctx.save();
      ctx.beginPath();
      if (item.type === "column") {
        const at = toCanvas(item.at);
        ctx.arc(at[0], at[1], item.radiusM * view().scale, 0, Math.PI * 2);
      } else {
        pathPolygon(item.polygon);
      }
      ctx.fillStyle = item.type === "column"
        ? "rgba(189,179,164,0.42)" : "rgba(211,172,89,0.24)";
      ctx.fill();
      ctx.strokeStyle = selected ? cssColor("--brass", "#d3ac59") : cssColor("--milk-dim", "#bdb3a4");
      ctx.lineWidth = selected ? 4 : 2;
      ctx.stroke();

      const center = item.type === "column"
        ? item.at
        : midpoint(item.polygon[0], item.polygon[2]);
      const labelAt = toCanvas(center);
      ctx.fillStyle = cssColor("--milk", "#f0e7d6");
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = item.type === "column"
        ? `柱 ${item.movable ? "可動" : "固定"}`
        : `什器 ${furnitureHeightM(item)}m`;
      ctx.fillText(label, labelAt[0], labelAt[1]);
      ctx.restore();
    });
  }

  function drawAccess() {
    state.access.forEach((item) => {
      const selected = state.selectedElement && state.selectedElement.kind === "access" &&
        state.selectedElement.id === item.id;
      const a = state.points[item.edgeIndex];
      const b = state.points[(item.edgeIndex + 1) % state.points.length];
      if (!a || !b) return;
      const at = accessAt(item);
      const length = Math.max(0.0001, distance(a, b));
      const tangent = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
      const half = item.widthM / 2;
      const from = toCanvas([at[0] - (tangent[0] * half), at[1] - (tangent[1] * half)]);
      const to = toCanvas([at[0] + (tangent[0] * half), at[1] + (tangent[1] * half)]);
      const labelAt = toCanvas(at);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = cssColor("--desk", "#191512");
      ctx.lineWidth = selected ? 12 : 10;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = selected ? cssColor("--brass", "#d3ac59") : cssColor("--rust", "#a84b26");
      ctx.lineWidth = selected ? 5 : 3;
      ctx.stroke();
      ctx.fillStyle = cssColor("--milk", "#f0e7d6");
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(item.type === "load-in" ? "搬入口" : "扉", labelAt[0], labelAt[1] - 7);
      ctx.restore();
    });
  }

  function drawPlacementPreview() {
    if (!activePointer || activePointer.kind !== "furniture-new" || !activePointer.preview) return;
    ctx.save();
    ctx.beginPath();
    pathPolygon(activePointer.preview);
    ctx.fillStyle = activePointer.valid ? "rgba(211,172,89,0.18)" : "rgba(168,75,38,0.22)";
    ctx.fill();
    ctx.strokeStyle = activePointer.valid ? cssColor("--brass", "#d3ac59") : cssColor("--rust", "#a84b26");
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.restore();
  }

  function renderControls(linesResult) {
    document.querySelectorAll("[data-venue-editor-shape]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.venueEditorShape === state.shape));
    });
    document.querySelectorAll("[data-venue-editor-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.venueEditorMode === state.mode));
    });
    const dims = dimensions();
    els.dims.textContent = `間口 だいたい${approxM(dims.width)}m ・ 奥行 だいたい${approxM(dims.depth)}m`;
    const band = selectedBand();
    els.audienceMode.disabled = !band;
    els.audienceRemove.disabled = !band;
    els.audienceMode.checked = Boolean(band && band.mode === "seated");
    els.audienceSelection.textContent = band
      ? `辺 ${band.edgeIndex + 1} の観客 ・ 深さ だいたい${approxM(band.depthM)}m`
      : (state.audience.length
        ? `観客の帯 ${state.audience.length}本（外側の丸をタップして選択）`
        : "観客の帯はまだありません");

    const fixture = selectedFixture();
    const access = selectedAccess();
    if (els.objectSelection) {
      els.objectSelection.textContent = fixture
        ? (fixture.type === "column" ? "柱を選択中" : "什器を選択中")
        : (access ? (access.type === "load-in" ? "搬入口を選択中" : "扉を選択中") : "柱・什器・扉は選択されていません");
    }
    if (els.objectMovable) {
      els.objectMovable.disabled = !fixture;
      els.objectMovable.checked = Boolean(fixture && fixture.movable);
    }
    if (els.objectRemove) els.objectRemove.disabled = !fixture && !access;

    const furnitureLevel = fixture && fixture.type === "furniture"
      ? fixture.heightLevel : state.nextFurnitureHeight;
    document.querySelectorAll("[data-venue-editor-furniture-height]").forEach((button) => {
      const enabled = state.mode === "furniture" || Boolean(fixture && fixture.type === "furniture");
      button.disabled = !enabled;
      button.setAttribute("aria-pressed", String(button.dataset.venueEditorFurnitureHeight === furnitureLevel));
    });
    if (els.accessType) {
      els.accessType.disabled = state.mode !== "door" && !access;
      els.accessType.value = access ? access.type : state.nextAccessType;
    }
    document.querySelectorAll("[data-venue-editor-ceiling-height]").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.venueEditorCeilingHeight) === state.ceiling.heightM));
    });
    document.querySelectorAll("[data-venue-editor-rigging]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.venueEditorRigging === state.ceiling.rigging));
    });
    document.querySelectorAll("[data-venue-editor-line-toggle]").forEach((input) => {
      input.checked = state.lines.visible[input.dataset.venueEditorLineToggle] !== false;
    });
    if (els.probeTool) {
      const aerial = Array.from(els.probeTool.options || []).find((option) => option.value === "aerial");
      if (aerial) aerial.disabled = state.ceiling.rigging === "none";
      els.probeTool.value = linesResult.probe.tool;
    }
    if (els.probeReach) {
      els.probeReach.max = String(state.ceiling.heightM);
      els.probeReach.value = String(linesResult.probe.reachHeightM);
    }
    if (els.probeReachValue) els.probeReachValue.textContent = `${linesResult.probe.reachHeightM.toFixed(1)}m`;
    if (els.probeCaptureSource) {
      els.probeCaptureSource.hidden = !state.lines.measurement;
      els.probeCaptureSource.textContent = state.lines.measurement
        ? `実測: ${state.lines.measurement.performer}（目安）` : "";
    }
    if (els.probeHeadroom) {
      const headroom = Math.round(linesResult.fall.headroomM * 2) / 2;
      const amount = `${headroom < 0 ? "−" : "+"}${Math.abs(headroom).toFixed(1)}m`;
      els.probeHeadroom.textContent = `天井まで だいたい${amount}${headroom < 0 ? "（天井高を超える見込み）" : ""}`;
    }
    if (els.probeStatus) {
      els.probeStatus.textContent = linesResult.fall.audienceOverlap
        ? "落下範囲（目安）が観客と重なる部分を赤く表示しています。"
        : "落下範囲は経験則による目安です。安全性は判定しません。";
      if (els.probeStatus.classList) {
        els.probeStatus.classList.toggle("is-overlap", linesResult.fall.audienceOverlap);
      }
    }
  }

  function render() {
    const linesResult = currentLines();
    drawGrid();
    drawFloor();
    drawMovementLines(linesResult);
    drawBlindSpots(linesResult);
    drawSightLimits(linesResult);
    drawFallRange(linesResult);
    drawAudience();
    drawRoom();
    drawFixtures();
    drawAccess();
    drawProbe(linesResult);
    drawPlacementPreview();
    renderControls(linesResult);
  }

  function setStatus(message) {
    els.status.textContent = message;
  }

  function setShape(shape) {
    state.shape = shape;
    state.points = pointsForShape(shape);
    state.audience = [];
    state.fixtures = [];
    state.access = [];
    state.selectedElement = null;
    state.selectedAudienceId = null;
    state.hoverCorner = -1;
    state.hoverEdge = -1;
    state.hoverAudienceId = null;
    state.bandSerial = 1;
    state.elementSerial = 1;
    els.saveStatus.textContent = "";
    setStatus("形を切り替えました。辺・角・観客と、置いていた柱・什器・扉は初期化しました。");
    render();
  }

  function toggleAudience(edgeIndex) {
    state.selectedElement = null;
    const existing = bandForEdge(edgeIndex);
    if (existing) {
      state.audience = state.audience.filter((band) => band.id !== existing.id);
      if (state.selectedAudienceId === existing.id) state.selectedAudienceId = null;
      setStatus(`辺 ${edgeIndex + 1} の観客の帯を外しました。`);
    } else {
      const band = {
        id: `audience-band-${state.bandSerial}`,
        edgeIndex,
        depthM: 2,
        mode: "standing",
      };
      state.bandSerial += 1;
      state.audience.push(band);
      state.selectedAudienceId = band.id;
      setStatus("立ち見の観客を置きました。外側の丸をドラッグすると帯の深さが変わります。");
    }
    render();
  }

  function removeSelectedAudience() {
    const band = selectedBand();
    if (!band) return;
    state.audience = state.audience.filter((item) => item.id !== band.id);
    state.selectedAudienceId = null;
    setStatus(`辺 ${band.edgeIndex + 1} の観客の帯を外しました。`);
    render();
  }

  function notchCorner(index) {
    if (state.points.length >= 16) {
      setStatus("円の細かな点には欠き取りを作りません。矩形・L字・台形で使えます。");
      return false;
    }
    const count = state.points.length;
    const previous = state.points[(index - 1 + count) % count];
    const corner = state.points[index];
    const next = state.points[(index + 1) % count];
    const turn = cross(previous, corner, next);
    const direction = polygonArea(state.points) >= 0 ? 1 : -1;
    if ((turn * direction) <= 0.01) {
      setStatus("凹んだ角には、もう一段の欠き取りを作りません。");
      return false;
    }
    const previousLength = distance(corner, previous);
    const nextLength = distance(corner, next);
    const size = Math.min(3, Math.max(1.25, Math.min(previousLength, nextLength) * 0.28));
    const towardPrevious = [(previous[0] - corner[0]) / previousLength, (previous[1] - corner[1]) / previousLength];
    const towardNext = [(next[0] - corner[0]) / nextLength, (next[1] - corner[1]) / nextLength];
    const first = [corner[0] + (towardPrevious[0] * size), corner[1] + (towardPrevious[1] * size)];
    const third = [corner[0] + (towardNext[0] * size), corner[1] + (towardNext[1] * size)];
    const middle = [first[0] + (towardNext[0] * size), first[1] + (towardNext[1] * size)];
    const candidate = state.points.slice(0, index)
      .concat([first, middle, third].map((point) => point.map(roundM)))
      .concat(state.points.slice(index + 1));
    if (!validOutline(candidate)) {
      setStatus("この角では部屋の線が交差するため、欠き取れませんでした。");
      return false;
    }
    state.points = candidate;
    state.audience = [];
    state.access = [];
    if (state.selectedElement && state.selectedElement.kind === "access") state.selectedElement = null;
    state.selectedAudienceId = null;
    state.shape = "l-shape";
    setStatus("角を欠き取りました。辺の数が変わったため、観客の帯と扉はいったん外しています。");
    render();
    return true;
  }

  function setMode(mode) {
    if (!["select", "column", "furniture", "door"].includes(mode)) return;
    state.mode = mode;
    state.selectedAudienceId = null;
    const messages = {
      select: "選択モードです。辺・角・観客を調整し、置いたものをタップして選べます。",
      column: "柱モードです。部屋の中をタップして置き、そのままドラッグすると太さが変わります。",
      furniture: "什器モードです。部屋の中で矩形をドラッグしてください。",
      door: "扉モードです。扉または搬入口を選び、部屋の辺をタップしてください。",
    };
    setStatus(messages[mode]);
    render();
  }

  function selectElement(target) {
    state.selectedElement = target;
    state.selectedAudienceId = null;
    const fixture = selectedFixture();
    const access = selectedAccess();
    if (fixture) {
      setStatus(fixture.type === "column"
        ? "柱を選びました。動かせる／動かせないを切り替えるか、削除できます。"
        : "什器を選びました。高さと動かせる／動かせないを切り替えるか、削除できます。");
    } else if (access) {
      setStatus(access.type === "load-in"
        ? "搬入口を選びました。種類の切替または削除ができます。"
        : "扉を選びました。種類の切替または削除ができます。");
    }
  }

  function removeSelectedElement() {
    const fixture = selectedFixture();
    const access = selectedAccess();
    if (fixture) {
      state.fixtures = state.fixtures.filter((item) => item.id !== fixture.id);
      setStatus(fixture.type === "column" ? "柱を削除しました。" : "什器を削除しました。");
    } else if (access) {
      state.access = state.access.filter((item) => item.id !== access.id);
      setStatus(access.type === "load-in" ? "搬入口を削除しました。" : "扉を削除しました。");
    } else {
      return;
    }
    state.selectedElement = null;
    render();
  }

  function beginColumn(pointerId, point) {
    if (!pointInPolygon(point, state.points)) {
      setStatus("柱は部屋の内側に置いてください。");
      return false;
    }
    const item = {
      id: `fixture-${state.elementSerial}`,
      type: "column",
      at: snappedPoint(point),
      radiusM: COLUMN_DEFAULT_RADIUS_M,
      movable: false,
    };
    state.elementSerial += 1;
    state.fixtures.push(item);
    selectElement({ kind: "fixture", id: item.id });
    activePointer = {
      pointerId,
      kind: "column-new",
      id: item.id,
      start: point,
      moved: false,
    };
    setStatus("柱を置きました。そのままドラッグすると太さが変わります（既定0.4m）。");
    render();
    return true;
  }

  function beginFurniture(pointerId, point) {
    if (!pointInPolygon(point, state.points)) {
      setStatus("什器は部屋の内側から描き始めてください。");
      return false;
    }
    const start = snappedPoint(point);
    activePointer = {
      pointerId,
      kind: "furniture-new",
      start,
      preview: rectangleFromPoints(start, start),
      valid: false,
      moved: false,
    };
    state.selectedAudienceId = null;
    setStatus("ドラッグして什器の矩形を描きます。");
    render();
    return true;
  }

  function beginAccess(pointerId, point, edgeIndex) {
    if (edgeIndex < 0) {
      setStatus("扉・搬入口は部屋の辺の上をタップして置きます。");
      return false;
    }
    const a = state.points[edgeIndex];
    const b = state.points[(edgeIndex + 1) % state.points.length];
    const projection = segmentProjection(point, a, b);
    const item = {
      id: `access-${state.elementSerial}`,
      type: state.nextAccessType,
      at: projection.point,
      edgeIndex,
      edgeAmount: projection.amount,
      widthM: ACCESS_DEFAULT_WIDTH_M,
    };
    state.elementSerial += 1;
    state.access.push(item);
    selectElement({ kind: "access", id: item.id });
    activePointer = {
      pointerId,
      kind: "access-new",
      id: item.id,
      moved: false,
    };
    setStatus(`${item.type === "load-in" ? "搬入口" : "扉"}を置きました（幅 1.2m）。`);
    render();
    return true;
  }

  function beginPointer(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    const point = fromEvent(event);
    const audience = hitAudienceHandle(point);
    const corner = hitCorner(point);
    const edge = hitEdge(point);
    els.canvas.setPointerCapture(event.pointerId);

    if (state.mode === "column") {
      beginColumn(event.pointerId, point);
      return;
    }
    if (state.mode === "furniture") {
      beginFurniture(event.pointerId, point);
      return;
    }
    if (state.mode === "door") {
      beginAccess(event.pointerId, point, edge);
      return;
    }

    if (hitProbe(point)) {
      state.selectedElement = null;
      state.selectedAudienceId = null;
      activePointer = {
        pointerId: event.pointerId,
        kind: "probe",
        start: point,
        originalAt: currentLines().probe.at.slice(),
        moved: false,
      };
      setStatus("探り針をドラッグして、落下範囲と観客の重なりを確かめます。");
      render();
      return;
    }

    const element = hitElement(point);
    if (element) {
      selectElement(element);
      activePointer = {
        pointerId: event.pointerId,
        kind: "element-select",
        id: element.id,
        start: point,
        moved: false,
      };
      render();
      return;
    }

    if (audience) {
      state.selectedElement = null;
      state.selectedAudienceId = audience.id;
      activePointer = {
        pointerId: event.pointerId,
        kind: "audience",
        id: audience.id,
        start: point,
        originalDepth: audience.depthM,
        moved: false,
      };
      setStatus("外側の丸をドラッグして、観客の帯の深さを合わせます。");
      render();
      return;
    }

    if (corner >= 0) {
      state.selectedElement = null;
      activePointer = {
        pointerId: event.pointerId,
        kind: "corner",
        index: corner,
        start: point,
        originalPoints: clone(state.points),
        moved: false,
        longPressed: false,
      };
      longPressTimer = window.setTimeout(() => {
        if (!activePointer || activePointer.kind !== "corner" || activePointer.moved) return;
        activePointer.longPressed = notchCorner(activePointer.index);
      }, LONG_PRESS_MS);
      setStatus("角をドラッグすると2辺が動きます。そのまま長押しすると欠き取ります。");
      render();
      return;
    }

    if (edge >= 0) {
      state.selectedElement = null;
      activePointer = {
        pointerId: event.pointerId,
        kind: "edge",
        index: edge,
        start: point,
        originalPoints: clone(state.points),
        moved: false,
      };
      setStatus("辺は外向き・内向きの一方向へ動きます。動かさず離すと観客の帯を置きます。");
      render();
      return;
    }

    state.selectedElement = null;
    state.selectedAudienceId = null;
    setStatus("何も選択していません。柱・什器・扉は追加モードから置けます。");
    render();
  }

  function moveCorner(pointer, point) {
    const movement = [point[0] - pointer.start[0], point[1] - pointer.start[1]];
    const original = pointer.originalPoints;
    const index = pointer.index;
    const count = original.length;
    const previousIndex = (index - 1 + count) % count;
    const nextIndex = (index + 1) % count;
    const target = snappedPoint([
      original[index][0] + movement[0],
      original[index][1] + movement[1],
    ]);
    const candidate = clone(original);
    candidate[index] = target;
    const previousAxis = axisOf(original[previousIndex], original[index]);
    const nextAxis = axisOf(original[index], original[nextIndex]);
    if (previousAxis === "horizontal") candidate[previousIndex][1] = target[1];
    if (previousAxis === "vertical") candidate[previousIndex][0] = target[0];
    if (nextAxis === "horizontal") candidate[nextIndex][1] = target[1];
    if (nextAxis === "vertical") candidate[nextIndex][0] = target[0];
    if (!validOutline(candidate)) {
      setStatus("線が交差するか、辺が短くなりすぎるため、ここより先へは動かせません。");
      return;
    }
    state.points = candidate;
    const dims = dimensions(candidate);
    setStatus(`角を移動中 ・ 間口 だいたい${approxM(dims.width)}m ・ 奥行 だいたい${approxM(dims.depth)}m`);
  }

  function moveEdge(pointer, point) {
    const original = pointer.originalPoints;
    const index = pointer.index;
    const nextIndex = (index + 1) % original.length;
    const axis = axisOf(original[index], original[nextIndex]);
    const normal = outwardNormal(index, original);
    const rawDelta = dot([point[0] - pointer.start[0], point[1] - pointer.start[1]], normal);
    const candidate = clone(original);
    if (axis === "horizontal") {
      const targetY = looseSnap(original[index][1] + (normal[1] * rawDelta));
      const deltaY = targetY - original[index][1];
      candidate[index][1] += deltaY;
      candidate[nextIndex][1] += deltaY;
    } else if (axis === "vertical") {
      const targetX = looseSnap(original[index][0] + (normal[0] * rawDelta));
      const deltaX = targetX - original[index][0];
      candidate[index][0] += deltaX;
      candidate[nextIndex][0] += deltaX;
    } else {
      const delta = roundM(rawDelta);
      candidate[index][0] = roundM(original[index][0] + (normal[0] * delta));
      candidate[index][1] = roundM(original[index][1] + (normal[1] * delta));
      candidate[nextIndex][0] = roundM(original[nextIndex][0] + (normal[0] * delta));
      candidate[nextIndex][1] = roundM(original[nextIndex][1] + (normal[1] * delta));
    }
    if (!validOutline(candidate)) {
      setStatus("線が交差するか、辺が短くなりすぎるため、ここより先へは動かせません。");
      return;
    }
    state.points = candidate;
    const length = distance(candidate[index], candidate[nextIndex]);
    const dims = dimensions(candidate);
    setStatus(`辺 だいたい${approxM(length)}m ・ 間口 だいたい${approxM(dims.width)}m ・ 奥行 だいたい${approxM(dims.depth)}m`);
  }

  function moveAudience(pointer, point) {
    const band = state.audience.find((item) => item.id === pointer.id);
    if (!band) return;
    const a = state.points[band.edgeIndex];
    const b = state.points[(band.edgeIndex + 1) % state.points.length];
    const middle = midpoint(a, b);
    const normal = outwardNormal(band.edgeIndex);
    const projected = dot([point[0] - middle[0], point[1] - middle[1]], normal);
    band.depthM = clamp(Math.round(projected * 4) / 4, AUDIENCE_MIN_DEPTH_M, AUDIENCE_MAX_DEPTH_M);
    setStatus(`観客の帯の深さ だいたい${approxM(band.depthM)}m`);
  }

  function moveColumn(pointer, point) {
    const item = state.fixtures.find((fixture) => fixture.id === pointer.id);
    if (!item) return;
    item.radiusM = clamp(roundM(distance(item.at, point)), COLUMN_MIN_RADIUS_M, COLUMN_MAX_RADIUS_M);
    setStatus(`柱の太さ だいたい${item.radiusM}m`);
  }

  function moveFurniture(pointer, point) {
    const target = snappedPoint(point);
    pointer.preview = rectangleFromPoints(pointer.start, target);
    pointer.valid = validFurniturePolygon(pointer.preview);
    const dims = dimensions(pointer.preview);
    setStatus(pointer.valid
      ? `什器 ${dims.width}m × ${dims.depth}m を描いています。`
      : "什器は幅・奥行とも0.4m以上で、部屋の内側に収めてください。");
  }

  function moveProbe(point) {
    if (!pointInPolygon(point, state.points)) {
      setStatus("探り針は部屋の床の内側へ置いてください。");
      return;
    }
    state.lines.probe.at = point.map(roundM);
    setStatus("探り針を移動中です。落下範囲は目安で、観客と重なる部分だけ赤く表示します。");
  }

  function movePointer(event) {
    const point = fromEvent(event);
    if (!activePointer) {
      if (state.mode !== "select") {
        state.hoverAudienceId = null;
        state.hoverCorner = -1;
        state.hoverEdge = state.mode === "door" ? hitEdge(point) : -1;
        els.canvas.style.cursor = "crosshair";
        render();
        return;
      }
      const probe = hitProbe(point);
      const element = hitElement(point);
      const audience = hitAudienceHandle(point);
      state.hoverAudienceId = audience ? audience.id : null;
      state.hoverCorner = probe || element || audience ? -1 : hitCorner(point);
      state.hoverEdge = probe || element || audience || state.hoverCorner >= 0 ? -1 : hitEdge(point);
      els.canvas.style.cursor = probe ? "move" : (element ? "pointer" : (audience
        ? "ns-resize" : (state.hoverCorner >= 0 ? "move" : (state.hoverEdge >= 0 ? "grab" : "default"))));
      render();
      return;
    }
    if (event.pointerId !== activePointer.pointerId || activePointer.longPressed) return;
    event.preventDefault();
    const moved = distance(point, activePointer.start) >= MOVE_START_M;
    if (moved && !activePointer.moved) {
      activePointer.moved = true;
      if (longPressTimer) window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (!activePointer.moved) return;
    if (activePointer.kind === "corner") moveCorner(activePointer, point);
    if (activePointer.kind === "edge") moveEdge(activePointer, point);
    if (activePointer.kind === "audience") moveAudience(activePointer, point);
    if (activePointer.kind === "column-new") moveColumn(activePointer, point);
    if (activePointer.kind === "furniture-new") moveFurniture(activePointer, point);
    if (activePointer.kind === "probe") moveProbe(point);
    render();
  }

  function finishPointer(event, cancelled) {
    if (!activePointer || event.pointerId !== activePointer.pointerId) return;
    if (longPressTimer) window.clearTimeout(longPressTimer);
    longPressTimer = null;
    const finished = activePointer;
    if (!cancelled && !finished.longPressed) {
      const releasePoint = fromEvent(event);
      const movedAtRelease = Array.isArray(finished.start) && finished.start.length === 2 &&
        distance(releasePoint, finished.start) >= MOVE_START_M;
      if (movedAtRelease || finished.moved) {
        if (movedAtRelease) finished.moved = true;
        if (finished.kind === "corner") moveCorner(finished, releasePoint);
        if (finished.kind === "edge") moveEdge(finished, releasePoint);
        if (finished.kind === "audience") moveAudience(finished, releasePoint);
        if (finished.kind === "column-new") moveColumn(finished, releasePoint);
        if (finished.kind === "furniture-new") moveFurniture(finished, releasePoint);
        if (finished.kind === "probe") moveProbe(releasePoint);
      }
    }
    activePointer = null;
    if (cancelled && finished.originalPoints) state.points = finished.originalPoints;
    if (cancelled && finished.kind === "probe") state.lines.probe.at = finished.originalAt;
    if (cancelled && finished.kind === "column-new") {
      state.fixtures = state.fixtures.filter((item) => item.id !== finished.id);
      state.selectedElement = null;
    }
    if (cancelled && finished.kind === "access-new") {
      state.access = state.access.filter((item) => item.id !== finished.id);
      state.selectedElement = null;
    }
    if (!cancelled && finished.kind === "furniture-new" && finished.moved && finished.valid) {
      const item = {
        id: `fixture-${state.elementSerial}`,
        type: "furniture",
        polygon: clone(finished.preview),
        heightLevel: state.nextFurnitureHeight,
        movable: true,
      };
      state.elementSerial += 1;
      state.fixtures.push(item);
      selectElement({ kind: "fixture", id: item.id });
      setStatus("什器を置きました。高さと動かせる／動かせないを切り替えられます。");
    } else if (!cancelled && finished.kind === "furniture-new") {
      setStatus("什器はドラッグで矩形を描いてください。今回は追加していません。");
    } else if (!cancelled && finished.kind === "column-new") {
      const item = state.fixtures.find((fixture) => fixture.id === finished.id);
      if (item) setStatus(`柱を置きました（太さ ${item.radiusM}m・${item.movable ? "可動" : "固定"}）。`);
    } else if (!cancelled && finished.kind === "edge" && !finished.moved) toggleAudience(finished.index);
    else if (!cancelled && finished.kind === "corner" && !finished.moved && !finished.longPressed) {
      setStatus("角を動かすにはドラッグ、欠き取るにはそのまま長押しします。");
    } else if (!cancelled && finished.kind === "audience" && !finished.moved) {
      state.selectedAudienceId = finished.id;
      setStatus("この観客の帯を選びました。立ち見／座りを切り替えられます。");
    } else if (!cancelled && finished.kind === "probe") {
      setStatus("探り針を置きました。落下範囲は目安で、観客と重なる部分だけ赤く表示します。");
    }
    state.hoverCorner = -1;
    state.hoverEdge = -1;
    state.hoverAudienceId = null;
    els.canvas.style.cursor = state.mode === "select" ? "default" : "crosshair";
    render();
  }

  function audienceOutput() {
    return state.audience
      .slice()
      .sort((a, b) => a.edgeIndex - b.edgeIndex)
      .map((band, index) => ({
        id: `a${index + 1}`,
        polygon: audiencePolygon(band),
        mode: band.mode,
        eyeM: band.mode === "seated" ? 1.2 : 1.6,
      }));
  }

  function fixtureOutput() {
    return state.fixtures.map((item) => {
      if (item.type === "column") {
        return {
          type: "column",
          at: item.at.map(roundM),
          radiusM: roundM(item.radiusM),
          heightM: state.ceiling.heightM,
          label: "柱",
          movable: Boolean(item.movable),
        };
      }
      return {
        type: "furniture",
        polygon: item.polygon.map((point) => point.map(roundM)),
        heightM: furnitureHeightM(item),
        label: "什器",
        movable: Boolean(item.movable),
      };
    });
  }

  function accessOutput() {
    return state.access.map((item) => ({
      type: item.type,
      at: accessAt(item),
      widthM: roundM(item.widthM),
      label: item.type === "load-in" ? "搬入口" : "扉",
    }));
  }

  function buildVenue(id, label, provenance) {
    return {
      format: "venue-v2",
      id,
      label,
      basis: "custom",
      scale: { gridM: 1, confidence: "approx" },
      floor: {
        outline: state.points.map((point) => [roundM(point[0]), roundM(point[1])]),
        levels: [],
      },
      ceiling: {
        heightM: state.ceiling.heightM,
        rigging: state.ceiling.rigging,
        note: "段階選択の目安。実会場では要確認。",
      },
      audience: audienceOutput(),
      fixtures: fixtureOutput(),
      access: accessOutput(),
      provenance,
    };
  }

  function nextVenueNumber(venues) {
    return venues.reduce((maximum, venue) => {
      const match = venue && typeof venue.id === "string" ? venue.id.match(/^custom-room-(\d+)$/) : null;
      return match ? Math.max(maximum, Number(match[1])) : maximum;
    }, 0) + 1;
  }

  function bridgeVenueDims(venue) {
    const dims = dimensions(venue.floor.outline);
    const sizeSelect = $("stage-size-select");
    if (sizeSelect && Array.from(sizeSelect.options).some((option) => option.value === "custom")) {
      sizeSelect.value = "custom";
      sizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
    [["stage-venue-w", dims.width], ["stage-venue-d", dims.depth],
      ["stage-venue-h", venue.ceiling.heightM]].forEach(([id, value]) => {
      const input = $(id);
      if (!input) return;
      input.value = String(roundM(value));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function bridgeVenueHeight(heightM) {
    const sizeSelect = $("stage-size-select");
    if (sizeSelect && Array.from(sizeSelect.options).some((option) => option.value === "custom") &&
        sizeSelect.value !== "custom") {
      sizeSelect.value = "custom";
      sizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const input = $("stage-venue-h");
    if (!input) return;
    input.value = String(heightM);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function saveDraft() {
    if (!validOutline(state.points)) {
      els.saveStatus.textContent = "線が交差しているため保存できません。";
      return null;
    }
    const label = els.name ? els.name.value.trim() : "";
    if (!label) {
      els.saveStatus.textContent = "会場名を入力してください。";
      if (els.name) els.name.focus();
      return null;
    }
    const stored = library.list();
    const number = nextVenueNumber(stored);
    const venue = buildVenue(`custom-room-${number}`, label.slice(0, 100), {
      source: els.source ? els.source.value : "記憶",
      confidence: els.confidence ? els.confidence.value : "low",
      sharing: els.sharing ? els.sharing.value : "ok",
    });
    const imported = library.importVenues([venue]);
    if (!imported.imported) {
      els.saveStatus.textContent = "この端末の会場ライブラリへ保存できませんでした。";
      return null;
    }
    const saved = imported.venues[0];
    window.dispatchEvent(new CustomEvent("stage-venue-saved", { detail: { venue: clone(saved) } }));
    bridgeVenueDims(saved);
    els.saveStatus.textContent = `「${saved.label}」を会場ライブラリへ保存し、目安寸法を反映しました。`;
    return clone(saved);
  }

  function downloadLibrary() {
    try {
      const data = JSON.stringify(library.exportDocument(), null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "shosai-stage-venues.json";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      if (els.libraryStatus) els.libraryStatus.textContent = "会場ライブラリを書き出しました。";
    } catch (error) {
      console.error("venue library export: 書き出せませんでした", error);
      if (els.libraryStatus) els.libraryStatus.textContent = "会場ライブラリを書き出せませんでした。もう一度お試しください。";
    }
  }

  function importLibrary(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (_) {
        if (els.libraryStatus) els.libraryStatus.textContent = "会場ライブラリのJSONを読み込めませんでした。";
        return;
      }
      const venues = Array.isArray(parsed) ? parsed
        : (parsed && parsed.kind === "shosai-stage-venue-library" && parsed.version === 1
          ? parsed.venues : null);
      if (!Array.isArray(venues)) {
        if (els.libraryStatus) els.libraryStatus.textContent = "会場ライブラリの形式ではありません。";
        return;
      }
      const result = library.importVenues(venues);
      if (els.libraryStatus) {
        els.libraryStatus.textContent = result.imported
          ? `${result.imported}件の会場を取り込みました。IDが重なる会場は別IDで追加しています。`
          : "取り込めるvenue-v2会場がありませんでした。";
      }
    };
    reader.readAsText(file);
  }

  function setFurnitureHeight(level) {
    if (![...Object.keys(FURNITURE_HEIGHTS), "ceiling"].includes(level)) return;
    state.nextFurnitureHeight = level;
    const fixture = selectedFixture();
    if (fixture && fixture.type === "furniture") {
      fixture.heightLevel = level;
      setStatus(`什器の高さを${level === "ceiling" ? "天井まで" : `${FURNITURE_HEIGHTS[level]}m`}にしました。`);
    } else {
      setStatus(`次に置く什器の高さは${level === "ceiling" ? "天井まで" : `${FURNITURE_HEIGHTS[level]}m`}です。`);
    }
    render();
  }

  function setAccessType(type) {
    if (!["entrance", "load-in"].includes(type)) return;
    state.nextAccessType = type;
    const access = selectedAccess();
    if (access) access.type = type;
    setStatus(type === "load-in" ? "搬入口として置きます。" : "扉として置きます。");
    render();
  }

  function setCeilingHeight(heightM) {
    const value = Number(heightM);
    if (![3, 4, 6, 8, 10].includes(value)) return;
    state.ceiling.heightM = value;
    state.lines.probe.reachHeightM = Math.min(state.lines.probe.reachHeightM, value);
    bridgeVenueHeight(value);
    setStatus(value === 10 ? "天井を「それ以上」（10m相当）にしました。" : `天井を約${value}mにしました。`);
    render();
  }

  function setRigging(rigging) {
    if (!["none", "limited", "full"].includes(rigging)) return;
    state.ceiling.rigging = rigging;
    if (rigging === "none" && state.lines.probe.tool === "aerial") {
      state.lines.probe.tool = "unspecified";
    }
    const labels = { none: "吊れない", limited: "一部可", full: "吊れる" };
    setStatus(`吊り条件を「${labels[rigging]}」にしました。天井高とは独立して保存します。`);
    render();
  }

  function setProbeTool(tool) {
    if (!["juggling", "diabolo", "aerial", "unspecified"].includes(tool)) return;
    if (tool === "aerial" && state.ceiling.rigging === "none") {
      state.lines.probe.tool = "unspecified";
      setStatus("吊れない会場ではエアリアルを選べません。道具は「指定なし」のままです。");
      render();
      return;
    }
    state.lines.probe.tool = tool;
    setStatus("探り針の道具を切り替えました。落下範囲は目安です。");
    render();
  }

  function setProbeReach(heightM) {
    const value = Number(heightM);
    if (!Number.isFinite(value)) return;
    state.lines.probe.reachHeightM = clamp(value, 0.5, state.ceiling.heightM);
    setStatus(`探り針の到達高さを${state.lines.probe.reachHeightM.toFixed(1)}mにしました（天井高が上限）。`);
    render();
  }

  function applyPerformerCapture(raw) {
    if (!raw || raw.format !== "performer-capture-v0") {
      setStatus("実測データの形式が違うため読み込めませんでした。");
      return false;
    }
    const performer = typeof raw.performer === "string" ? raw.performer.trim() : "";
    const tool = typeof raw.tool === "string" ? raw.tool : "";
    const reachHeightM = Number(raw.reachHeightM);
    if (!performer || !["juggling", "diabolo", "aerial", "unspecified"].includes(tool) ||
        !Number.isFinite(reachHeightM) || reachHeightM < 0) {
      setStatus("実測データに演者・道具・到達高さの有効な値がありません。");
      return false;
    }
    state.lines.probe.tool = tool;
    state.lines.probe.reachHeightM = reachHeightM;
    state.lines.measurement = { performer: performer.slice(0, 100) };
    setStatus(`${performer.slice(0, 100)}の実測データを探り針へ読み込みました。`);
    render();
    return true;
  }

  function importPerformerCapture(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result || ""));
      } catch (_) {
        setStatus("実測データのJSONを読めませんでした。");
        return;
      }
      applyPerformerCapture(parsed);
    };
    reader.onerror = () => setStatus("実測データのファイルを読めませんでした。");
    reader.readAsText(file);
  }

  function clearProbeMeasurement() {
    state.lines.measurement = null;
  }

  function openEditor() {
    returnFocus = document.activeElement;
    els.backdrop.hidden = false;
    els.modal.hidden = false;
    els.saveStatus.textContent = "";
    render();
    window.requestAnimationFrame(() => els.canvas.focus());
  }

  function closeEditor() {
    els.backdrop.hidden = true;
    els.modal.hidden = true;
    if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus();
    returnFocus = null;
  }

  document.querySelectorAll("[data-venue-editor-shape]").forEach((button) => {
    button.addEventListener("click", () => setShape(button.dataset.venueEditorShape));
  });
  document.querySelectorAll("[data-venue-editor-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.venueEditorMode));
  });
  document.querySelectorAll("[data-venue-editor-furniture-height]").forEach((button) => {
    button.addEventListener("click", () => setFurnitureHeight(button.dataset.venueEditorFurnitureHeight));
  });
  document.querySelectorAll("[data-venue-editor-ceiling-height]").forEach((button) => {
    button.addEventListener("click", () => setCeilingHeight(button.dataset.venueEditorCeilingHeight));
  });
  document.querySelectorAll("[data-venue-editor-rigging]").forEach((button) => {
    button.addEventListener("click", () => setRigging(button.dataset.venueEditorRigging));
  });
  document.querySelectorAll("[data-venue-editor-line-toggle]").forEach((input) => {
    input.addEventListener("change", () => {
      const name = input.dataset.venueEditorLineToggle;
      if (!(name in state.lines.visible)) return;
      state.lines.visible[name] = input.checked;
      render();
    });
  });
  els.open.addEventListener("click", openEditor);
  els.close.addEventListener("click", closeEditor);
  els.backdrop.addEventListener("click", closeEditor);
  els.save.addEventListener("click", saveDraft);
  if (els.libraryExport) els.libraryExport.addEventListener("click", downloadLibrary);
  if (els.libraryImport) {
    els.libraryImport.addEventListener("change", (event) => {
      importLibrary(event.target.files && event.target.files[0]);
      event.target.value = "";
    });
  }
  els.audienceRemove.addEventListener("click", removeSelectedAudience);
  if (els.objectRemove) els.objectRemove.addEventListener("click", removeSelectedElement);
  if (els.objectMovable) {
    els.objectMovable.addEventListener("change", () => {
      const fixture = selectedFixture();
      if (!fixture) return;
      fixture.movable = els.objectMovable.checked;
      setStatus(`${fixture.type === "column" ? "柱" : "什器"}を${fixture.movable ? "動かせる" : "動かせない"}設定にしました。`);
      render();
    });
  }
  if (els.accessType) {
    els.accessType.addEventListener("change", () => setAccessType(els.accessType.value));
  }
  if (els.probeTool) {
    els.probeTool.addEventListener("change", () => setProbeTool(els.probeTool.value));
  }
  if (els.probeReach) {
    els.probeReach.addEventListener("input", () => {
      clearProbeMeasurement();
      setProbeReach(els.probeReach.value);
    });
    els.probeReach.addEventListener("change", () => {
      clearProbeMeasurement();
      setProbeReach(els.probeReach.value);
    });
  }
  if (els.probeCaptureOpen && els.probeCaptureInput) {
    els.probeCaptureOpen.addEventListener("click", () => els.probeCaptureInput.click());
    els.probeCaptureInput.addEventListener("change", (event) => {
      importPerformerCapture(event.target.files && event.target.files[0]);
      event.target.value = "";
    });
  }
  els.audienceMode.addEventListener("change", () => {
    const band = selectedBand();
    if (!band) return;
    band.mode = els.audienceMode.checked ? "seated" : "standing";
    setStatus(band.mode === "seated" ? "座りの観客にしました。" : "立ち見の観客にしました。");
    render();
  });
  els.canvas.addEventListener("pointerdown", beginPointer);
  els.canvas.addEventListener("pointermove", movePointer);
  els.canvas.addEventListener("pointerup", (event) => finishPointer(event, false));
  els.canvas.addEventListener("pointercancel", (event) => finishPointer(event, true));
  els.canvas.addEventListener("pointerleave", () => {
    if (activePointer) return;
    state.hoverCorner = -1;
    state.hoverEdge = -1;
    state.hoverAudienceId = null;
    render();
  });
  els.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.modal.hidden) closeEditor();
    if ((event.key === "Delete" || event.key === "Backspace") && !els.modal.hidden &&
        state.selectedElement && !["INPUT", "TEXTAREA", "SELECT"].includes(event.target && event.target.tagName)) {
      event.preventDefault();
      removeSelectedElement();
    }
  });

  window.SHOSAI_VENUE_EDITOR = Object.freeze({
    storageKey: library.storageKey,
    open: openEditor,
    close: closeEditor,
    save: saveDraft,
    setMode,
    setCeilingHeight,
    setRigging,
    setProbeTool,
    setProbeReach,
    applyPerformerCapture,
    getVenue: () => clone(buildVenue("custom-room-preview", "作成中の会場", {
      source: els.source ? els.source.value : "記憶",
      confidence: els.confidence ? els.confidence.value : "low",
      sharing: els.sharing ? els.sharing.value : "ok",
    })),
    getDrafts: () => clone(library.list()),
    getLines: () => clone({
      probe: currentLines().probe,
      measurement: state.lines.measurement,
      visible: state.lines.visible,
      result: currentLines(),
    }),
  });

  render();
})();

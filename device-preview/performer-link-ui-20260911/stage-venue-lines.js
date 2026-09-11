/* 舞台スケッチ — 会場から毎回導く lines 層
 *
 * venue-v2 は会場の事実だけを保存する。このファイルは、その venue と一時的な
 * 探り針から「可動範囲・落下範囲・死角・見える限界」の4本を計算する。
 * 計算結果と probe は venue へ書き戻さない。
 */
(function () {
  "use strict";

  const CLEARANCE = Object.freeze({
    wallM: 0.5,
    fixedFixtureM: 0.5,
    audienceM: 1,
    levelEdgeM: 0.3,
  });
  const FALL_RULES = Object.freeze({
    juggling: Object.freeze({ factor: 0.6, minimumM: 1.5 }),
    diabolo: Object.freeze({ factor: 0.8, minimumM: 2 }),
    aerial: Object.freeze({ fixedM: 3 }),
    unspecified: Object.freeze({ factor: 0.5, minimumM: 1 }),
  });
  const GRID_M = 0.2;
  const EPSILON = 0.000001;

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const validPoint = (point) => Array.isArray(point) && point.length === 2 &&
    point.every((value) => typeof value === "number" && Number.isFinite(value));

  function cross(a, b, c) {
    return ((b[0] - a[0]) * (c[1] - a[1])) - ((b[1] - a[1]) * (c[0] - a[0]));
  }

  function pointOnSegment(point, a, b) {
    return point[0] >= Math.min(a[0], b[0]) - EPSILON &&
      point[0] <= Math.max(a[0], b[0]) + EPSILON &&
      point[1] >= Math.min(a[1], b[1]) - EPSILON &&
      point[1] <= Math.max(a[1], b[1]) + EPSILON &&
      Math.abs(cross(a, b, point)) <= EPSILON;
  }

  function pointInPolygon(point, polygon) {
    if (!validPoint(point) || !Array.isArray(polygon) || polygon.length < 3) return false;
    if (polygon.some((corner, index) =>
      pointOnSegment(point, corner, polygon[(index + 1) % polygon.length]))) return true;
    let inside = false;
    for (let current = 0, previous = polygon.length - 1;
      current < polygon.length; previous = current, current += 1) {
      const a = polygon[current];
      const b = polygon[previous];
      const crosses = ((a[1] > point[1]) !== (b[1] > point[1])) &&
        point[0] < (((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1])) + a[0];
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function distancePointToSegment(point, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSquared = (dx * dx) + (dy * dy);
    if (lengthSquared <= EPSILON) return distance(point, a);
    const amount = clamp(
      (((point[0] - a[0]) * dx) + ((point[1] - a[1]) * dy)) / lengthSquared,
      0,
      1,
    );
    return distance(point, [a[0] + (dx * amount), a[1] + (dy * amount)]);
  }

  function distancePointToPolygonBoundary(point, polygon) {
    if (!Array.isArray(polygon) || polygon.length < 2) return Infinity;
    return polygon.reduce((nearest, corner, index) => Math.min(
      nearest,
      distancePointToSegment(point, corner, polygon[(index + 1) % polygon.length]),
    ), Infinity);
  }

  function distancePointToPolygon(point, polygon) {
    return pointInPolygon(point, polygon) ? 0 : distancePointToPolygonBoundary(point, polygon);
  }

  function polygonBounds(polygon) {
    const xs = polygon.map((point) => point[0]);
    const ys = polygon.map((point) => point[1]);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }

  function polygonCentroid(polygon) {
    let twiceArea = 0;
    let x = 0;
    let y = 0;
    polygon.forEach((point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      const amount = (point[0] * next[1]) - (next[0] * point[1]);
      twiceArea += amount;
      x += (point[0] + next[0]) * amount;
      y += (point[1] + next[1]) * amount;
    });
    if (Math.abs(twiceArea) <= EPSILON) {
      return polygon.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0])
        .map((value) => value / polygon.length);
    }
    return [x / (3 * twiceArea), y / (3 * twiceArea)];
  }

  function nearestSeatByEye(distanceM, seats) {
    return seats
      .filter((seat) => seat && seat.id !== "balcony" && seat.id !== "side")
      .reduce((nearest, seat) => {
        if (!nearest) return seat;
        return Math.abs(Number(seat.eye) - distanceM) < Math.abs(Number(nearest.eye) - distanceM)
          ? seat
          : nearest;
      }, null);
  }

  function approxSeatFromBase(id, label, base) {
    if (!base) return null;
    return {
      ...base,
      id,
      label,
      short: label,
      note: base.note || "",
      approx: true,
      base: base.id,
    };
  }

  function approxFrontSeats(rawVenue, rawSeats) {
    const venue = normalizedVenue(rawVenue);
    const seats = Array.isArray(rawSeats) ? rawSeats : [];
    if (!venue.audience.length || venue.floor.outline.length < 3 || !seats.length) return [];

    const bounds = polygonBounds(venue.floor.outline);
    const width = bounds.maxX - bounds.minX;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const sideSeat = seats.find((seat) => seat && seat.id === "side");
    const samples = venue.audience
      .flatMap((area) => {
        const areaCenter = polygonCentroid(area.polygon);
        return area.polygon.concat([areaCenter]).map((point) => ({ point, areaCenter }));
      })
      .filter((sample) => validPoint(sample.point) && validPoint(sample.areaCenter))
      .map((sample) => ({
        ...sample,
        distanceM: distancePointToPolygonBoundary(sample.point, venue.floor.outline),
      }))
      .sort((a, b) => a.distanceM - b.distanceM);
    if (!samples.length) return [];

    const indexes = Array.from(new Set([0, Math.floor(samples.length / 2), samples.length - 1]));
    const labels = [
      { id: "approx-near", label: "近い（近似）" },
      { id: "approx-mid", label: "中間（近似）" },
      { id: "approx-far", label: "遠い（近似）" },
    ];
    return indexes.map((index, order) => {
      const sample = samples[index];
      const sideOffset = width > EPSILON ? sample.areaCenter[0] - centerX : 0;
      let base = nearestSeatByEye(sample.distanceM, seats);
      if (sideSeat && Math.abs(sideOffset) >= width * 0.25) {
        base = sideSeat;
      }
      const seat = approxSeatFromBase(labels[order].id, labels[order].label, base);
      if (seat && base && base.id === "side" && sideOffset > 0) {
        seat.shift = -Number(base.shift || 0);
      }
      return seat;
    }).filter(Boolean);
  }

  function normalizedVenue(raw) {
    const outline = raw && raw.floor && Array.isArray(raw.floor.outline)
      ? raw.floor.outline.filter(validPoint) : [];
    return {
      floor: {
        outline,
        levels: raw && raw.floor && Array.isArray(raw.floor.levels)
          ? raw.floor.levels.filter((level) => level && Array.isArray(level.polygon) &&
            level.polygon.length >= 3 && level.polygon.every(validPoint))
          : [],
      },
      ceiling: {
        heightM: Math.max(0, Number(raw && raw.ceiling && raw.ceiling.heightM) || 0),
        rigging: raw && raw.ceiling && ["none", "limited", "full"].includes(raw.ceiling.rigging)
          ? raw.ceiling.rigging : "none",
      },
      audience: raw && Array.isArray(raw.audience)
        ? raw.audience.filter((area) => area && Array.isArray(area.polygon) &&
          area.polygon.length >= 3 && area.polygon.every(validPoint))
        : [],
      fixtures: raw && Array.isArray(raw.fixtures) ? raw.fixtures.filter(Boolean) : [],
    };
  }

  function fixtureShape(fixture) {
    if (fixture && validPoint(fixture.at) && Number(fixture.radiusM) >= 0) {
      return { kind: "circle", at: fixture.at.slice(), radiusM: Number(fixture.radiusM) };
    }
    if (fixture && Array.isArray(fixture.polygon) && fixture.polygon.length >= 3 &&
        fixture.polygon.every(validPoint)) {
      return { kind: "polygon", polygon: fixture.polygon.map((point) => point.slice()) };
    }
    return null;
  }

  function distancePointToShape(point, shape) {
    if (!shape) return Infinity;
    if (shape.kind === "circle") return Math.max(0, distance(point, shape.at) - shape.radiusM);
    return distancePointToPolygon(point, shape.polygon);
  }

  function movementStatusForVenue(venue, point) {
    const outline = venue.floor.outline;
    const reasons = [];
    if (outline.length < 3 || !pointInPolygon(point, outline)) reasons.push("outside-floor");
    if (outline.length >= 3 && distancePointToPolygonBoundary(point, outline) < CLEARANCE.wallM - EPSILON) {
      reasons.push("wall");
    }
    venue.fixtures.forEach((fixture) => {
      if (fixture.movable !== false) return;
      const shape = fixtureShape(fixture);
      if (shape && distancePointToShape(point, shape) < CLEARANCE.fixedFixtureM - EPSILON) {
        reasons.push("fixed-fixture");
      }
    });
    venue.audience.forEach((area) => {
      if (distancePointToPolygon(point, area.polygon) < CLEARANCE.audienceM - EPSILON) {
        reasons.push("audience");
      }
    });
    venue.floor.levels.forEach((level) => {
      if (distancePointToPolygonBoundary(point, level.polygon) < CLEARANCE.levelEdgeM - EPSILON) {
        reasons.push("level-edge");
      }
    });
    return { allowed: reasons.length === 0, reasons: Array.from(new Set(reasons)) };
  }

  function movementStatusAt(rawVenue, point) {
    return movementStatusForVenue(normalizedVenue(rawVenue), point);
  }

  function maskRuns(outline, classify) {
    if (!Array.isArray(outline) || outline.length < 3) return [];
    const bounds = polygonBounds(outline);
    const columns = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / GRID_M));
    const rows = Math.max(1, Math.ceil((bounds.maxY - bounds.minY) / GRID_M));
    const result = [];
    for (let row = 0; row < rows; row += 1) {
      const y = bounds.minY + (row * GRID_M);
      let runKind = null;
      let runStart = 0;
      for (let column = 0; column <= columns; column += 1) {
        const x = bounds.minX + (column * GRID_M);
        const kind = column < columns
          ? classify([x + (GRID_M / 2), y + (GRID_M / 2)])
          : null;
        if (kind === runKind) continue;
        if (runKind) {
          result.push({
            x: bounds.minX + (runStart * GRID_M),
            y,
            width: (column - runStart) * GRID_M,
            height: GRID_M,
            kind: runKind,
          });
        }
        runKind = kind;
        runStart = column;
      }
    }
    return result;
  }

  function computeMovement(rawVenue) {
    const venue = normalizedVenue(rawVenue);
    const areas = maskRuns(venue.floor.outline, (point) =>
      movementStatusForVenue(venue, point).allowed ? "movable" : null);
    const movableExtensions = venue.fixtures
      .filter((fixture) => fixture.movable === true)
      .map((fixture) => fixtureShape(fixture))
      .filter(Boolean)
      .map((shape) => ({ ...shape, clearanceM: CLEARANCE.fixedFixtureM }));
    return { areas, movableExtensions };
  }

  function normalizeProbe(rawVenue, rawProbe) {
    const venue = normalizedVenue(rawVenue);
    const outline = venue.floor.outline;
    const fallback = outline.length >= 3 ? polygonCentroid(outline) : [0, 0];
    const requestedAt = rawProbe && validPoint(rawProbe.at) ? rawProbe.at.slice() : fallback;
    const at = outline.length >= 3 && pointInPolygon(requestedAt, outline) ? requestedAt : fallback;
    const requestedTool = rawProbe && FALL_RULES[rawProbe.tool] ? rawProbe.tool : "unspecified";
    const aerialUnavailable = requestedTool === "aerial" && venue.ceiling.rigging === "none";
    const tool = aerialUnavailable ? "unspecified" : requestedTool;
    // 正規化済みprobeを再正規化しても要求値が失われないよう requestedReachHeightM を優先する
    const requestedRaw = Number(rawProbe && rawProbe.requestedReachHeightM);
    const requestedHeight = Number.isFinite(requestedRaw)
      ? requestedRaw : Number(rawProbe && rawProbe.reachHeightM);
    const height = Number.isFinite(requestedHeight) ? Math.max(0, requestedHeight) : 3;
    return {
      at,
      tool,
      requestedReachHeightM: height,
      reachHeightM: Math.min(height, venue.ceiling.heightM),
      headroomM: venue.ceiling.heightM - height,
      aerialUnavailable,
    };
  }

  function fallRadiusM(tool, reachHeightM) {
    const rule = FALL_RULES[tool] || FALL_RULES.unspecified;
    if (typeof rule.fixedM === "number") return rule.fixedM;
    return Math.max(rule.minimumM, rule.factor * reachHeightM);
  }

  function circleIntersectsPolygon(center, radiusM, polygon) {
    if (pointInPolygon(center, polygon)) return true;
    if (polygon.some((point) => distance(center, point) <= radiusM + EPSILON)) return true;
    return polygon.some((point, index) =>
      distancePointToSegment(center, point, polygon[(index + 1) % polygon.length]) <= radiusM + EPSILON);
  }

  function computeFall(rawVenue, rawProbe) {
    const venue = normalizedVenue(rawVenue);
    const probe = normalizeProbe(venue, rawProbe);
    const radiusM = fallRadiusM(probe.tool, probe.reachHeightM);
    const overlaps = venue.audience.filter((area) =>
      circleIntersectsPolygon(probe.at, radiusM, area.polygon));
    return {
      center: probe.at.slice(),
      radiusM,
      tool: probe.tool,
      requestedReachHeightM: probe.requestedReachHeightM,
      reachHeightM: probe.reachHeightM,
      headroomM: probe.headroomM,
      aerialUnavailable: probe.aerialUnavailable,
      audienceOverlap: overlaps.length > 0,
      overlapAudienceIds: overlaps.map((area, index) => area.id || `audience-${index + 1}`),
      overlapPolygons: overlaps.map((area) => area.polygon.map((point) => point.slice())),
    };
  }

  function segmentsProperlyIntersect(a, b, c, d) {
    const abC = cross(a, b, c);
    const abD = cross(a, b, d);
    const cdA = cross(c, d, a);
    const cdB = cross(c, d, b);
    if (((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON)) &&
        ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))) return true;
    if (Math.abs(abC) <= EPSILON && pointOnSegment(c, a, b)) return true;
    if (Math.abs(abD) <= EPSILON && pointOnSegment(d, a, b)) return true;
    if (Math.abs(cdA) <= EPSILON && pointOnSegment(a, c, d)) return true;
    if (Math.abs(cdB) <= EPSILON && pointOnSegment(b, c, d)) return true;
    return false;
  }

  function segmentBlockedByCircle(observer, target, shape) {
    const dx = target[0] - observer[0];
    const dy = target[1] - observer[1];
    const lengthSquared = (dx * dx) + (dy * dy);
    if (lengthSquared <= EPSILON) return false;
    const amount = (((shape.at[0] - observer[0]) * dx) + ((shape.at[1] - observer[1]) * dy)) /
      lengthSquared;
    if (amount <= EPSILON || amount >= 1 - EPSILON) return false;
    const nearest = [observer[0] + (dx * amount), observer[1] + (dy * amount)];
    return distance(nearest, shape.at) <= shape.radiusM + EPSILON;
  }

  function segmentBlockedByPolygon(observer, target, shape) {
    if (pointInPolygon(target, shape.polygon)) return false;
    return shape.polygon.some((point, index) =>
      segmentsProperlyIntersect(observer, target, point, shape.polygon[(index + 1) % shape.polygon.length]));
  }

  function sightBlocked(observer, target, fixedShapes) {
    return fixedShapes.some((shape) => shape.kind === "circle"
      ? segmentBlockedByCircle(observer, target, shape)
      : segmentBlockedByPolygon(observer, target, shape));
  }

  function computeBlindSpots(rawVenue) {
    const venue = normalizedVenue(rawVenue);
    const observers = venue.audience.map((area) => polygonCentroid(area.polygon));
    const fixedShapes = venue.fixtures
      .filter((fixture) => fixture.movable === false)
      .map(fixtureShape)
      .filter(Boolean);
    if (!observers.length || !fixedShapes.length) return { observers, areas: [] };
    const areas = maskRuns(venue.floor.outline, (point) => {
      if (!pointInPolygon(point, venue.floor.outline) ||
          fixedShapes.some((shape) => distancePointToShape(point, shape) <= EPSILON)) return null;
      const hidden = observers.reduce((count, observer) =>
        count + (sightBlocked(observer, point, fixedShapes) ? 1 : 0), 0);
      if (!hidden) return null;
      return hidden === observers.length ? "all" : "partial";
    });
    return { observers, areas };
  }

  function closestFrontSegment(audiencePolygon, floorOutline) {
    let nearest = null;
    audiencePolygon.forEach((point, index) => {
      const next = audiencePolygon[(index + 1) % audiencePolygon.length];
      const middle = [(point[0] + next[0]) / 2, (point[1] + next[1]) / 2];
      const value = distancePointToPolygonBoundary(middle, floorOutline);
      if (!nearest || value < nearest.distanceM - EPSILON) {
        nearest = { from: point.slice(), to: next.slice(), distanceM: value };
      }
    });
    return nearest;
  }

  function distanceToFrontRows(point, rows) {
    return rows.reduce((nearest, row) =>
      Math.min(nearest, distancePointToSegment(point, row.from, row.to)), Infinity);
  }

  function interpolateContour(a, b, valueA, valueB) {
    const denominator = valueA - valueB;
    const amount = Math.abs(denominator) <= EPSILON ? 0.5 : clamp(valueA / denominator, 0, 1);
    return [a[0] + ((b[0] - a[0]) * amount), a[1] + ((b[1] - a[1]) * amount)];
  }

  function contourSegments(outline, rows, limitM) {
    if (!rows.length || outline.length < 3) return [];
    const bounds = polygonBounds(outline);
    const columns = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / GRID_M));
    const rowCount = Math.max(1, Math.ceil((bounds.maxY - bounds.minY) / GRID_M));
    const segments = [];
    for (let row = 0; row < rowCount; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = bounds.minX + (column * GRID_M);
        const y = bounds.minY + (row * GRID_M);
        const corners = [[x, y], [x + GRID_M, y], [x + GRID_M, y + GRID_M], [x, y + GRID_M]];
        const values = corners.map((point) => distanceToFrontRows(point, rows) - limitM);
        const crossings = [];
        [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([first, second]) => {
          if ((values[first] <= 0 && values[second] > 0) ||
              (values[first] > 0 && values[second] <= 0)) {
            crossings.push(interpolateContour(corners[first], corners[second], values[first], values[second]));
          }
        });
        if (crossings.length === 2) {
          const middle = [(crossings[0][0] + crossings[1][0]) / 2,
            (crossings[0][1] + crossings[1][1]) / 2];
          if (pointInPolygon(middle, outline)) segments.push(crossings);
        } else if (crossings.length === 4) {
          [[crossings[0], crossings[1]], [crossings[2], crossings[3]]].forEach((segment) => {
            const middle = [(segment[0][0] + segment[1][0]) / 2,
              (segment[0][1] + segment[1][1]) / 2];
            if (pointInPolygon(middle, outline)) segments.push(segment);
          });
        }
      }
    }
    return segments;
  }

  function computeSightLimits(rawVenue, rawLimits) {
    const venue = normalizedVenue(rawVenue);
    const rows = venue.audience
      .map((area) => closestFrontSegment(area.polygon, venue.floor.outline))
      .filter(Boolean);
    const limits = Array.isArray(rawLimits) ? rawLimits : [];
    return limits
      .filter((limit) => limit && Number(limit.m) > 0)
      .map((limit) => ({
        m: Number(limit.m),
        label: String(limit.label || `${limit.m}m`),
        note: String(limit.note || ""),
        segments: contourSegments(venue.floor.outline, rows, Number(limit.m)),
      }))
      .filter((limit) => limit.segments.length > 0);
  }

  function compute(rawVenue, rawProbe, sightLimits) {
    const venue = normalizedVenue(rawVenue);
    const probe = normalizeProbe(venue, rawProbe);
    return {
      probe,
      movement: computeMovement(venue),
      fall: computeFall(venue, probe),
      blindSpots: computeBlindSpots(venue),
      sightLimits: computeSightLimits(venue, sightLimits),
    };
  }

  window.SHOSAI_VENUE_LINES = Object.freeze({
    constants: Object.freeze({ clearance: CLEARANCE, fallRules: FALL_RULES, gridM: GRID_M }),
    pointInPolygon,
    movementStatusAt,
    fallRadiusM,
    closestFrontSegment,
    polygonCentroid,
    approxFrontSeats,
    normalizeProbe,
    computeMovement,
    computeFall,
    computeBlindSpots,
    computeSightLimits,
    compute,
  });
})();

/* レーザー演出の純粋な幾何とCanvas描画。通常照明の光束・光だまりとは分離する。 */
(function (root) {
  "use strict";
  const finite = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, finite(v, a)));
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
  const mul = (a, n) => ({ x: a.x * n, y: a.y * n, z: a.z * n });
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const norm = (a) => { const n = Math.hypot(a.x, a.y, a.z); return n > 1e-9 ? mul(a, 1 / n) : { x: 0, y: 1, z: 0 }; };
  const axisBetween = (S, T) => norm({ x: T.x - S.x, y: T.y - S.y, z: T.z - S.z });
  const basisFor = (axis) => {
    const a = norm(axis), ref = Math.abs(a.z) < 0.95 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
    const u = norm(cross(ref, a)), v = norm(cross(a, u));
    return { axis: a, u, v };
  };
  const EFFECTS = Object.freeze({
    beam: { name: "ビーム", rays: 1, span: 0 },
    fan: { name: "ファン", rays: 12, span: 60 },
    sheet: { name: "シート", rays: 40, span: 90, fill: true },
    tunnel: { name: "トンネル", rays: 36, span: 24, ring: true },
    liquid: { name: "リキッドスカイ", rays: 48, span: 95, fill: true, liquid: true },
    audience: { name: "客席スキャン（案）", rays: 10, span: 50, audience: true },
  });
  const COLORS = Object.freeze(["#38e04a", "#ff2a6d", "#2ad3ff", "#ffe14a", "#f2f2f2"]);
  const rotateFan = (b, ang) => norm(add(mul(b.axis, Math.cos(ang)), mul(b.u, Math.sin(ang))));
  function laserRays(effect, S, axis, spanDeg, phase, dims) {
    const spec = EFFECTS[effect] || EFFECTS.beam, b = basisFor(axis), span = clamp(spanDeg, effect === "tunnel" ? 6 : 0, effect === "tunnel" ? 60 : 120) * Math.PI / 180;
    if (effect === "beam") return [{ origin: S, dir: b.axis }];
    if (spec.ring) {
      const radius = span / 2;
      return Array.from({ length: spec.rays }, (_, i) => {
        const a = Math.PI * 2 * (i / spec.rays + finite(phase, 0));
        return { origin: S, dir: norm(add(mul(b.axis, Math.cos(radius)), add(mul(b.u, Math.sin(radius) * Math.cos(a)), mul(b.v, Math.sin(radius) * Math.sin(a))))) };
      });
    }
    return Array.from({ length: spec.rays }, (_, i) => {
      const t = spec.rays === 1 ? 0 : i / (spec.rays - 1) - 0.5;
      let ang = t * span;
      if (spec.liquid) ang += Math.sin((i / Math.max(1, spec.rays - 1) + finite(phase, 0)) * Math.PI * 4) * span * 0.055;
      return { origin: S, dir: rotateFan(b, ang) };
    });
  }
  function laserLanding(S, dir, dims, reach = 24) {
    const d = norm(dir), hits = [];
    const addHit = (t, on) => { if (t > 1e-6 && t <= reach) hits.push({ t, on }); };
    if (d.z < -1e-9) addHit((0 - S.z) / d.z, "floor");
    if (d.z > 1e-9) addHit((dims.H - S.z) / d.z, "ceil");
    if (d.y < -1e-9) addHit((0 - S.y) / d.y, "back");
    const hit = hits.sort((a, b) => a.t - b.t)[0];
    const t = hit ? hit.t : reach;
    return { point: add(S, mul(d, t)), on: hit ? hit.on : null, distance: t };
  }
  function houseCutAtFront(S, dir, dims) {
    const d = norm(dir);
    if (!(S.y > dims.D)) return { ...S };
    if (d.y >= -1e-9) return null;
    const t = (dims.D - S.y) / d.y;
    return t >= 0 ? add(S, mul(d, t)) : null;
  }
  function houseFarPoint(S, dir, dims, reach = 24) {
    if (S.y > dims.D && !houseCutAtFront(S, dir, dims)) return null;
    return add(S, mul(norm(dir), reach));
  }
  const rgba = (hex, a) => {
    const v = String(hex || COLORS[0]).replace("#", ""), n = parseInt(v.length === 3 ? v.split("").map((x) => x + x).join("") : v, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a, 0, 1)})`;
  };
  function drawProjected(ctx, P, rays, color, level, vis, options = {}) {
    const alphaScale = finite(options.alphaScale, 1), a = clamp(level, 0, 1) * clamp(vis, 0, 100) / 100 * alphaScale;
    if (!(a > 0)) return;
    const lines = rays.filter((ray) => ray && ray.origin && ray.end).map((ray) => ({ a: P(ray.origin), b: P(ray.end) })).filter((q) => q.a && q.b && Number.isFinite(q.a.X + q.a.Y + q.b.X + q.b.Y));
    if (!lines.length) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    if (options.fill && lines.length > 1) {
      ctx.fillStyle = rgba(color, 0.16 * a); ctx.beginPath(); ctx.moveTo(lines[0].a.X, lines[0].a.Y);
      lines.forEach((q) => ctx.lineTo(q.b.X, q.b.Y)); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = rgba(color, 0.10 * a); ctx.lineWidth = 9; ctx.lineCap = "round";
    lines.forEach((q) => { ctx.beginPath(); ctx.moveTo(q.a.X, q.a.Y); ctx.lineTo(q.b.X, q.b.Y); ctx.stroke(); });
    ctx.strokeStyle = rgba(color, 0.85 * a); ctx.lineWidth = 1.6;
    lines.forEach((q) => { ctx.beginPath(); ctx.moveTo(q.a.X, q.a.Y); ctx.lineTo(q.b.X, q.b.Y); ctx.stroke(); });
    ctx.restore();
  }
  function compile(effect, S, axis, spanDeg, phase, dims, reach) {
    const spec = EFFECTS[effect] || EFFECTS.beam;
    return laserRays(effect, S, axis, spanDeg == null ? spec.span : spanDeg, phase, dims).map((ray) => {
      const landing = laserLanding(S, ray.dir, dims, reach);
      return { ...ray, ...landing, end: landing.point };
    });
  }
  root.LASER_EFFECTS = { EFFECTS, COLORS, finite, clamp, norm, axisBetween, basisFor, laserRays, laserLanding, houseCutAtFront, houseFarPoint, compile, drawProjected };
})(window);

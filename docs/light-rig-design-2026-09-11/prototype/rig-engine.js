/* 「照明を組む」試作 — 幾何と時間の純関数（DOM・描画を持たない）
 *
 * 設計の根拠:
 *   ../codex-round1.answer.md（第1ラウンド）… 灯体はショー共通(rig)／点灯・動きはシーンごと(cue)。
 *     一灯の軌道が基本。扇・交差・順にには「組」の構成。「向かい合わせ」は軌道の鏡映。
 *   ../codex-round3.answer.md（第3ラウンド・2026-09-11）… 狙い点は「面ごとに座標の意味を変える」
 *     のをやめ、常に3D点 {u,v,hM} として持つ（ETC Augment3dのXYZ Programmingと同じ考え方）。
 *     円には軌道面（水平／正面に垂直／側面に垂直）を持たせ、空中芸の縦円・斜め軌道に対応する。
 *
 * 座標の契約（本体 stage-sketch.js と同じ）:
 *   u: 左右 0..1（0=下手側、1=上手側）／ v: 奥行き 0..1（0=最奥、1=最前＝客席側）
 *   世界座標: x=(u-0.5)*W [m], y=v*D [m], z=高さ [m]
 *   狙い点は Point3 = {u, v, hM}（hM=床からの高さm）。UIの「当てる場所」は制約であり、
 *   データ上は floor/back/air のどれでも同じ Point3 を使う（floor: hM=0固定 ／ back: v=0固定 ／ air: 自由）。
 *
 * 機材の型番・回路・DMX・照度は持たない（案を照明担当者へ渡すための道具）。
 */
(function (root) {
  "use strict";

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const finite = (v, f) => (Number.isFinite(Number(v)) ? Number(v) : f);

  /* ---------- 既定 ---------- */
  const DEFAULT_DIMS = Object.freeze({ W: 12, D: 8, H: 8 });
  const FLOOR_FIXTURE_Z = 0.3;   // 床置きの光源の高さ。実測ではなく描画上の仮定
  const SIDE_OFFSET_M = 0.4;     // 横（ブーム）の光源は舞台端の少し外
  const SPEED_PERIOD_MS = Object.freeze({ slow: 6000, normal: 3000, fast: 1500 });
  const PLANE_VALUES = Object.freeze(["horizontal", "frontVertical", "sideVertical"]);

  /* ---------- rig（ショー共通） ---------- */
  const newTruss = (id, v, h, label) => ({ id, v: clamp(finite(v, 0.2), 0, 1), h: clamp(finite(h, 6), 2, 14), label: label || "" });

  // mount: {type:"truss", trussId, u} | {type:"floor", u, v} | {type:"side", side:"kamite"|"shimote", v, h}
  /* kind: "moving"＝ムービング（動きを付けられる）／"fixed"＝固定（向きは仕込みで決まる）。
     既定はムービング。fixed の灯には往復・円を付けさせない（2026-09-11 本人要望）。 */
  const newFixture = (id, no, mount, name, kind, beamDeg) => ({
    id, no, name: name || "", mount,
    kind: kind === "fixed" ? "fixed" : "moving",
    // 光の広がり（度）。ムービングのズーム範囲は実機で 7°〜50°（PLUTO600 PROFILE MK2）。
    // 固定灯はランプ／レンズで決まり、ショー中は変えられない（PARは玉を替えるしかない）。
    beamDeg: clamp(finite(beamDeg, kind === "fixed" ? 24 : 15), 4, 70),
  });
  const isMoving = (fixture) => (fixture && fixture.kind) !== "fixed";
  /* いま実際に出ている広がり。ムービングだけ、このシーンのズーム（light.beamDeg）で上書きできる。
     固定灯は仕込みの値（fixture.beamDeg）のまま。 */
  const beamDegOf = (fixture, light) => {
    const base = clamp(finite(fixture && fixture.beamDeg, 18), 4, 70);
    if (!isMoving(fixture) || !light || light.beamDeg == null) return base;
    return clamp(finite(light.beamDeg, base), 4, 70);
  };
  /* 光は狙った点で止まらない。そこを過ぎた光は床か奥の壁まで進み、どちらにも当たらなければ
     図の外へ抜けていく（本体 stage-sketch.js の beamLanding と同じ考え方）。
     床(z=0)と奥の壁(y=0)だけが遮る面。袖と客席側は開いている。
     返り値の on は "floor" / "back" / null（何にも当たらず抜ける）。 */
  const beamLanding = (S, T, dims) => {
    const dx = T.x - S.x, dy = T.y - S.y, dz = T.z - S.z;
    let best = Infinity, on = null;
    const hit = (t, kind) => { if (t > 1e-4 && t < best) { best = t; on = kind; } };
    if (dz < -1e-6) hit((0 - S.z) / dz, "floor");
    if (dy < -1e-6) hit((0 - S.y) / dy, "back");
    const len = Math.hypot(dx, dy, dz) || 1;
    const t = on ? best : (Math.hypot(dims.W, dims.D, dims.H) * 1.6) / len;
    return { x: S.x + dx * t, y: S.y + dy * t, z: S.z + dz * t, on, t };
  };

  // 照射先での光の輪の半径(m)。距離×tan(広がり/2)
  const spotRadiusM = (S, T, deg) => {
    const d = Math.hypot(T.x - S.x, T.y - S.y, T.z - S.z);
    return Math.max(0.12, d * Math.tan(clamp(finite(deg, 18), 4, 70) * Math.PI / 360));
  };

  const trussById = (rig, id) => (rig.trusses || []).find((t) => t.id === id) || null;

  // 奥から何段目（1始まり）。表示専用。保存はしない
  const trussRow = (rig, trussId) => {
    const sorted = [...(rig.trusses || [])].sort((a, b) => a.v - b.v);
    const i = sorted.findIndex((t) => t.id === trussId);
    return i < 0 ? null : i + 1;
  };

  // 灯体の世界座標（光源）
  const fixtureWorld = (fixture, rig, dims = DEFAULT_DIMS) => {
    const m = fixture.mount || {};
    if (m.type === "truss") {
      const t = trussById(rig, m.trussId);
      if (!t) return null;
      return { x: (clamp(finite(m.u, 0.5), 0, 1) - 0.5) * dims.W, y: t.v * dims.D, z: t.h };
    }
    if (m.type === "floor") {
      return { x: (clamp(finite(m.u, 0.5), 0, 1) - 0.5) * dims.W, y: clamp(finite(m.v, 0.5), 0, 1) * dims.D, z: FLOOR_FIXTURE_Z };
    }
    if (m.type === "side") {
      const sign = m.side === "shimote" ? -1 : 1; // 下手=左=負、上手=右=正
      return { x: sign * (dims.W / 2 + SIDE_OFFSET_M), y: clamp(finite(m.v, 0.5), 0, 1) * dims.D, z: clamp(finite(m.h, 2), 0.3, 14) };
    }
    /* 前明かり（シーリング／フロントサイド）。客席の上にあるので舞台より手前（y > D）。
       ahead = 舞台の手前端からの距離(m)。高さは客席天井なので舞台のHを超えてよい。 */
    if (m.type === "front") {
      return { x: (clamp(finite(m.u, 0.5), 0, 1) - 0.5) * dims.W, y: dims.D + clamp(finite(m.ahead, 5), 0.5, 20), z: clamp(finite(m.h, 7), 1, 20) };
    }
    return null;
  };

  /* ---------- cue（シーンごと） ----------
   * Point3 = { u: 0..1, v: 0..1, hM: 床からの高さm }
   * cue.lights[fixtureId] = {
   *   on: true|false|null(未設定), color: "#rrggbb",
   *   level: 0..100,                   // 強さ（調光）。0は消灯と同じ扱い（2026-09-13 本人決定）。
   *                                    // 目盛りそのものはリニア。見える明るさへの効き方（カーブ）は
   *                                    // アプリ全体で1つの設定として app.js 側が持つ。
   *   surface: "floor"|"back"|"air",   // UI上の制約プリセット（データの座標変換には使わない）
   *   path:
   *       {kind:"still", a:Point3}
   *     | {kind:"line", a:Point3, b:Point3, start:"a"|"b"}                       // 高さも別々に持てる＝斜め往復
   *     | {kind:"circle", c:Point3, r:number(m), plane:"horizontal"|"frontVertical"|"sideVertical", dir:"cw"|"ccw", start:0..1}
   *   speed: "slow"|"normal"|"fast", groupId: string|null
   * }
   * cue.groups = [{ id, members:[fixtureId...](順序あり), relation:"together"|"mirror"|"sequential", delayMs }]
   */
  const newPoint = (over = {}) => ({ u: 0.5, v: 0.5, hM: 0, ...over });

  const newLightCue = (over = {}) => ({
    on: true, level: 100, color: "#f2ead6", surface: "floor",
    path: { kind: "still", a: newPoint() },
    speed: "normal", groupId: null, ...over,
  });

  // 「当てる場所」を切り替えたとき、Point3へ制約を適用する（floor: hM=0／back: v=0／air: 自由）
  const constrainPointToSurface = (p, surface, dims) => {
    const q = { u: clamp(finite(p && p.u, 0.5), 0, 1), v: clamp(finite(p && p.v, 0.5), 0, 1), hM: clamp(finite(p && p.hM, 0), 0, dims.H) };
    if (surface === "floor") q.hM = 0;
    else if (surface === "back") { q.v = 0; if (q.hM <= 0) q.hM = clamp(dims.H * 0.5, 0.5, dims.H); }
    else if (surface === "air" && q.hM <= 0) q.hM = clamp(4, 0.5, dims.H);
    return q;
  };

  /* 1往復（1周）の時間。任意の秒数 periodSec を持っていればそれが優先。
     持っていなければ従来どおり speed の3段（2026-09-12 本人要望で秒数指定を追加）。 */
  const periodMs = (light) => {
    const sec = light && light.periodSec;
    if (Number.isFinite(Number(sec)) && Number(sec) > 0) return clamp(Number(sec), 0.2, 120) * 1000;
    return SPEED_PERIOD_MS[light && light.speed] || SPEED_PERIOD_MS.normal;
  };

  const tri = (t) => { const m = ((t % 1) + 1) % 1; return m < 0.5 ? m * 2 : 2 - m * 2; };
  const saw = (t) => ((t % 1) + 1) % 1;

  /* 組の効果を位相へ反映する。
   *   together … 全員同じ位相／sequential … メンバー順にdelayMsずつ遅らせる
   *   mirror   … 先頭以外は軌道を鏡映（line: 端を入れ替え／circle: 回転を反転・中心は保持）
   */
  const groupEffect = (cue, fixtureId) => {
    const g = (cue.groups || []).find((x) => x.members.includes(fixtureId));
    if (!g) return { phaseShiftMs: 0, mirror: false };
    const idx = g.members.indexOf(fixtureId);
    if (g.relation === "sequential") return { phaseShiftMs: -idx * finite(g.delayMs, 400), mirror: false };
    if (g.relation === "mirror") return { phaseShiftMs: 0, mirror: idx % 2 === 1 };
    return { phaseShiftMs: 0, mirror: false };
  };

  // Point3 → 世界座標（この一本だけで床・奥壁・空中すべてを扱う。2026-09-11 第3ラウンドで統一）
  const pointWorld = (p, dims) => ({
    x: (clamp(finite(p && p.u, 0.5), 0, 1) - 0.5) * dims.W,
    y: clamp(finite(p && p.v, 0.5), 0, 1) * dims.D,
    z: clamp(finite(p && p.hM, 0), 0, dims.H),
  });

  // 軌道面ごとの円周上オフセット（世界座標のdx,dy,dz）
  /* 円・8の字は「その面の中の2軸」で作る。r＝1軸目、r2＝2軸目（省くと真円）、tilt＝面の中での傾き（度）。
     軸の向きは面ごとに決まる: 水平＝1軸目が左右・2軸目が奥行き／客席側から見た縦＝左右・高さ／
     舞台横から見た縦＝奥行き・高さ。2026-09-11 本人要望で楕円・傾き・8の字を追加。 */
  const planeVec = (plane, a, b, tiltDeg) => {
    const th = (finite(tiltDeg, 0) * Math.PI) / 180;
    if (th) { const c = Math.cos(th), sn = Math.sin(th); const a2 = a * c - b * sn; b = a * sn + b * c; a = a2; }
    if (plane === "frontVertical") return { dx: a, dy: 0, dz: b };   // 客席側から見た縦
    if (plane === "sideVertical") return { dx: 0, dy: a, dz: b };    // 舞台横から見た縦
    return { dx: a, dy: b, dz: 0 };                                  // 水平（既定）
  };
  const circleOffset = (plane, ang, r, r2, tiltDeg) =>
    planeVec(plane, Math.cos(ang) * r, Math.sin(ang) * (r2 == null ? r : r2), tiltDeg);
  /* 8の字（ジェロノのレムニスケート）。1軸目が sin、2軸目が sin(2θ)。
     θが一周する間に2軸目が2往復するので、横長の∞を描く。 */
  const eightOffset = (plane, ang, r, r2, tiltDeg) =>
    planeVec(plane, Math.sin(ang) * r, Math.sin(ang * 2) * (r2 == null ? r : r2), tiltDeg);

  /* 時刻 tMs における光の当たる先（世界座標）。未設定・消灯は null。 */
  const targetAt = (light, cue, fixtureId, tMs, dims = DEFAULT_DIMS) => {
    if (!light || light.on !== true) return null;
    const path = light.path || { kind: "still", a: newPoint() };
    const { phaseShiftMs, mirror } = groupEffect(cue, fixtureId);
    const T = periodMs(light);
    /* 一灯ずつの遅らせ（オフセット秒）。組の順番送りとは別に持てるので、
       組にしていない灯どうしでも波をずらせる（2026-09-12 本人要望）。 */
    const offsetMs = clamp(finite(light.offsetSec, 0), -60, 60) * 1000;
    const t = (tMs + phaseShiftMs - offsetMs) / T;
    if (path.kind === "line") {
      /* 往復の運び方（2026-09-11 本人要望）。
         "linear"＝端で急に折り返す機械的な動き。卓のフェードをそのまま当てた感じ。
         "ease"（既定）＝端で減速して止まり、また加速する。ムービングのヨークは
         止まる前に減速するので、実物はこちらに近い。式は cos の半周期（ease-in-out）。 */
      let p = tri(t);
      if ((path.easing || "ease") === "ease") p = 0.5 - Math.cos(p * Math.PI) / 2;
      if (path.start === "b") p = 1 - p;
      if (mirror) p = 1 - p;
      const a = pointWorld(path.a, dims), b = pointWorld(path.b, dims);
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, z: a.z + (b.z - a.z) * p, phase: p };
    }
    if (path.kind === "circle" || path.kind === "eight") {
      const c = pointWorld(path.c, dims);
      const lim = Math.max(dims.W, dims.D, dims.H);
      const r = clamp(finite(path.r, 1.5), 0.2, lim);
      const r2 = path.r2 == null ? r : clamp(finite(path.r2, r), 0.2, lim);
      let ang = saw(t + finite(path.start, 0)) * Math.PI * 2;
      if (path.dir === "ccw") ang = -ang;
      if (mirror) ang = Math.PI - ang;
      const o = (path.kind === "eight" ? eightOffset : circleOffset)(path.plane, ang, r, r2, path.tilt);
      return { x: c.x + o.dx, y: clamp(c.y + o.dy, 0, dims.D), z: clamp(c.z + o.dz, 0, dims.H), phase: saw(t) };
    }
    return { ...pointWorld(path.a, dims), phase: 0 };
  };

  /* 軌道の目安（破線用）。時刻に依存しない。 */
  const pathGuide = (light, dims = DEFAULT_DIMS) => {
    if (!light) return null;
    const path = light.path;
    if (!path || path.kind === "still") return null;
    if (path.kind === "line") return { kind: "line", a: pointWorld(path.a, dims), b: pointWorld(path.b, dims) };
    /* 円・8の字の下書きは、傾きも8の字も一度に扱えるよう「世界座標の点の並び」で返す。
       図の側は面を見て、線でつなぐだけでよくなる。 */
    if (path.kind === "circle" || path.kind === "eight") {
      const c = pointWorld(path.c, dims);
      const r = clamp(finite(path.r, 1.5), 0.2, 20);
      const r2 = path.r2 == null ? r : clamp(finite(path.r2, r), 0.2, 20);
      const off = path.kind === "eight" ? eightOffset : circleOffset;
      const N = 64, pts = [];
      for (let i = 0; i <= N; i++) {
        const o = off(path.plane, (i / N) * Math.PI * 2, r, r2, path.tilt);
        pts.push({ x: c.x + o.dx, y: c.y + o.dy, z: c.z + o.dz });
      }
      return { kind: "loop", shape: path.kind, c, r, r2, tilt: finite(path.tilt, 0), plane: path.plane || "horizontal", pts };
    }
    return null;
  };

  /* ---------- 投影 ----------
   * plan: 上から。x→右、y(奥行き)→下／ front: 客席から。x→右、z→上
   * side: 舞台中央からその側（下手/上手）を見る。横軸＝奥行き、縦軸＝高さ
   */
  const makePlanProjector = (dims, box) => {
    const sx = box.w / dims.W, sy = box.h / dims.D;
    return (p) => ({ X: box.x + (p.x + dims.W / 2) * sx, Y: box.y + p.y * sy });
  };
  const makeFrontProjector = (dims, box) => {
    const sx = box.w / dims.W, sz = box.h / dims.H;
    return (p) => ({ X: box.x + (p.x + dims.W / 2) * sx, Y: box.y + box.h - p.z * sz });
  };
  const makeSideProjector = (dims, box, side) => {
    const sz = box.h / dims.H;
    return (p) => {
      const t = p.y / dims.D;
      const X = box.x + (side === "shimote" ? (1 - t) : t) * box.w;
      return { X, Y: box.y + box.h - p.z * sz };
    };
  };
  const sideToVH = (dims, box, side, X, Y) => {
    const t = clamp((X - box.x) / box.w, 0, 1);
    return { v: side === "shimote" ? 1 - t : t, h: clamp((box.y + box.h - Y) / box.h * dims.H, 0, dims.H) };
  };
  // 逆投影（平面図・正面図のクリック→u,v／u,高さ）
  const planToUV = (dims, box, X, Y) => ({ u: clamp((X - box.x) / box.w, 0, 1), v: clamp((Y - box.y) / box.h, 0, 1) });
  const frontToUH = (dims, box, X, Y) => ({ u: clamp((X - box.x) / box.w, 0, 1), h: clamp((box.y + box.h - Y) / box.h * dims.H, 0, dims.H) });

  /* ---------- 説明文（照明さんへ渡す一行） ---------- */

  /* ---------- 正面図の3D（擬似パース） ----------
     舞台スケッチ本体（stage-sketch.js の place / perMetre / stagePoint）と同じ式。
     席ごとの数値（floorY/bottomY/backW/frontW/rise）は stage-venues.js の値をそのまま使う。
     本体は720pxの絵を基準に作ってあるので、枠の高さで比例させる（本体の k = H/BASE_H と同じ）。
     首振り（tilt）と横席のずれ（shift）は試作では使わないので入れていない。 */
  const FRONT_BASE_H = 720;
  const FRONT_SEATS = {
    center: { id: "center", label: "1階 中央", floorY: 478, bottomY: 598, backW: 0.5, frontW: 0.94, rise: 0.06 },
    rear: { id: "rear", label: "1階 後方", floorY: 470, bottomY: 674, backW: 0.62, frontW: 0.94, rise: 0 },
    front: { id: "front", label: "1階 前方", floorY: 490, bottomY: 532, backW: 0.45, frontW: 1.75, rise: 0.15 },
  };
  const frontPerspSetup = (dims, box, seatId) => {
    const seat = FRONT_SEATS[seatId] || FRONT_SEATS.center;
    const k = box.h / FRONT_BASE_H;
    const floorY = box.y + seat.floorY * k;
    const bottomY = box.y + seat.bottomY * k;
    const span = seat.frontW / seat.backW;                 // 手前は奥の何倍に見えるか
    const headroom = Math.max(24, floorY - box.y - 22);    // 奥の壁の上に残す余白
    const pxPerM = Math.min((box.w * seat.frontW) / dims.W, headroom / ((dims.H || 8) / span));
    const frontW = pxPerM * dims.W;
    return { seat, floorY, bottomY, pxPerM, frontW, backW: frontW / span, centerX: box.x + box.w / 2, span };
  };
  // world {x,y,z} → 画面。scale は「その奥行きでの縮み」。灯体の印の大きさにも使える
  const makeFrontPerspProjector = (dims, box, seatId) => {
    const L = frontPerspSetup(dims, box, seatId);
    return (p) => {
      const u = p.x / dims.W + 0.5, v = finite(p.y, 0) / dims.D;
      const rawY = L.floorY + v * (L.bottomY - L.floorY);
      const halfW = (L.backW + v * (L.frontW - L.backW)) / 2;
      const scale = (L.backW + v * (L.frontW - L.backW)) / L.frontW;
      const stretch = 1 + L.seat.rise * v;
      return { X: L.centerX + (u - 0.5) * halfW * 2, Y: rawY - finite(p.z, 0) * L.pxPerM * scale * stretch, scale };
    };
  };
  /* 画面 → 左右uと高さh。奥行き v は分からないので呼び手が渡す（動かしている点の v をそのまま使う）。
     本体の fromScreen と同じ考え方で、v を決めてから逆算する。 */
  const frontPerspToUH = (dims, box, seatId, X, Y, v) => {
    const L = frontPerspSetup(dims, box, seatId);
    const vv = clamp(finite(v, 0.5), 0, 1);
    const rawY = L.floorY + vv * (L.bottomY - L.floorY);
    const halfW = (L.backW + vv * (L.frontW - L.backW)) / 2;
    const scale = (L.backW + vv * (L.frontW - L.backW)) / L.frontW;
    const stretch = 1 + L.seat.rise * vv;
    return {
      u: clamp((X - L.centerX) / (halfW * 2) + 0.5, 0, 1),
      h: clamp((rawY - Y) / (L.pxPerM * scale * stretch), 0, dims.H),
    };
  };

  const describeMount = (fixture, rig) => {
    const m = fixture.mount || {};
    const lr = (u) => (u < 0.4 ? "下手寄り" : u > 0.6 ? "上手寄り" : "中央");
    if (m.type === "truss") {
      const t = trussById(rig, m.trussId);
      const row = trussRow(rig, m.trussId);
      return t ? `吊り・奥から${row}列目のバトン（高さ約${Math.round(t.h)}m）・${lr(m.u)}` : "吊り（バトン不明）";
    }
    if (m.type === "floor") return `転がし・${lr(m.u)}・${m.v < 0.4 ? "奥" : m.v > 0.6 ? "手前" : "中ほど"}`;
    if (m.type === "front") return `前明かり・${lr(m.u)}・舞台前から約${Math.round(finite(m.ahead, 5))}m・高さ約${Math.round(finite(m.h, 7))}m`;
    if (m.type === "side") return `SS・${m.side === "shimote" ? "下手" : "上手"}の袖（高さ約${Math.round(m.h)}m）・${m.v < 0.4 ? "奥寄り" : m.v > 0.6 ? "手前寄り" : "中ほど"}`;
    return "取り付け未設定";
  };

  const posWord = (p) => `${p.u < 0.4 ? "下手" : p.u > 0.6 ? "上手" : "中央"}・奥から${(p.v * 100).toFixed(0)}%${p.hM > 0.05 ? `・高さ約${p.hM.toFixed(1)}m` : ""}`;
  const PLANE_LABEL = { horizontal: "水平の円", frontVertical: "客席側から見た縦の円", sideVertical: "舞台横から見た縦の円" };

  /* 強さ（調光）。未設定の灯は 100 とみなす＝これまでの「点いていれば全開」と同じ見え方になる。
     0 は消灯と同じ扱い（2026-09-13 本人決定。フェードを扱えるように点灯/消灯の2択から連続値へ）。 */
  const levelOf = (light) => clamp(finite(light && light.level, 100), 0, 100);
  /* 実際に光っているか。on が true でも強さ0なら光らない＝図にも出さない。 */
  const isLit = (light) => Boolean(light) && light.on === true && levelOf(light) > 0;

  const describeCue = (light) => {
    if (!light || light.on === null || light.on === undefined) return "未設定";
    if (light.on === false) return "消灯";
    const lv = levelOf(light);
    if (lv <= 0) return "消灯（強さ0%）";
    const strength = lv >= 100 ? "" : `強さ${Math.round(lv)}%で`;
    const face = light.surface === "back" ? "奥壁" : light.surface === "air" ? "空中" : "床";
    const sp = { slow: "ゆっくり", normal: "普通の速さ", fast: "速く" }[light.speed] || "普通の速さ";
    const path = light.path || {};
    if (path.kind === "line") {
      const diag = Math.abs((path.a.hM || 0) - (path.b.hM || 0)) > 0.15 ? "（斜めの軌道）" : "";
      return `${strength}${face}の${posWord(path.a)}〜${posWord(path.b)}を往復${diag}（${sp}）。${path.start === "b" ? posWord(path.b) : posWord(path.a)}から開始`;
    }
    if (path.kind === "circle") return `${strength}${face}の${posWord(path.c)}を中心に半径約${Math.round(path.r * 10) / 10}mで${PLANE_LABEL[path.plane] || "水平の円"}・${path.dir === "ccw" ? "反時計回り" : "時計回り"}（${sp}）`;
    return `${strength}${face}の${posWord(path.a || newPoint())}を静止で当てる`;
  };

  /* 下手⇄上手のコピー（配置のみ。2026-09-11 本人回答＝初回は配置だけでよい）。
     トラス・床は u→1−u、横は side を反転。奥行き・高さ・トラス所属はそのまま。 */
  /* ---------- 幕・ホリゾント（2026-09-13 本人要望で移植） ----------
     出典: stage-machinery.js:40-53 machineryParts() の curtain 分岐（そのまま移植）と、
     stage-sketch.js:16850 curtainKindName() の語彙。5種のうち、この試作では実際に
     「前幕」「ホリゾント幕」の2枚だけを下敷きの見本として置く（残り3種もデータ形は同じなので、
     あとで足すだけでよい）。
     開閉(open, 0〜100)の扱いは本体と同じ:
       ・前幕／中割り幕／袖幕＝左右2枚が中央から閉じる。全開でも束ねた最小幅が残る。
       ・振り落とし／ホリゾント＝1枚。開く＝上へ消える（lift が上がる）。 */
  const CURTAIN_KIND_LABEL = Object.freeze({
    front: "前幕・引き割り", traveler: "中割り幕", drop: "振り落とし・上下する幕",
    leg: "袖幕", cyc: "ホリゾント幕",
  });
  const CURTAIN_KINDS = Object.freeze(["front", "traveler", "leg", "drop", "cyc"]);
  const curtainKindLabel = (kind) => CURTAIN_KIND_LABEL[kind] || kind;
  /* 幕の板（1〜2枚）を返す。ox=幕の中心からの左右オフセット(m)・w=その板の幅(m)・
     h=高さ(m)・lift=床からその板の下端までの高さ(m)。dims={w,h,lift} はメートル実寸で渡す
     （出典: stage-machinery.js:40-53 の curtain 分岐、変数名も合わせた）。 */
  const curtainParts = (piece, dims) => {
    if (!piece || !dims) return [];
    const open = clamp(finite(piece.open, 0), 0, 100) / 100;
    const lift = finite(dims.lift, 0);
    if (piece.curtainKind === "drop" || piece.curtainKind === "cyc") {
      return [{ ox: 0, w: dims.w, h: dims.h, lift: lift + dims.h * open }];
    }
    const gathered = dims.w * 0.08;
    const panelWidth = Math.max(gathered, dims.w * (1 - open) / 2);
    const offset = (dims.w - panelWidth) / 2;
    return [-1, 1].map((side) => ({ ox: side * offset, w: panelWidth, h: dims.h, lift }));
  };

  const mirrorMount = (mount) => {
    const m = JSON.parse(JSON.stringify(mount || {}));
    if (m.type === "truss" || m.type === "floor" || m.type === "front") m.u = 1 - clamp(finite(m.u, 0.5), 0, 1);
    else if (m.type === "side") m.side = m.side === "shimote" ? "kamite" : "shimote";
    return m;
  };

  root.RIG_ENGINE = Object.freeze({
    DEFAULT_DIMS, FLOOR_FIXTURE_Z, SIDE_OFFSET_M, SPEED_PERIOD_MS, PLANE_VALUES, PLANE_LABEL,
    clamp, finite,
    newTruss, newFixture, isMoving, beamDegOf, spotRadiusM, beamLanding, trussById, trussRow, fixtureWorld,
    newPoint, newLightCue, levelOf, isLit, constrainPointToSurface, periodMs, groupEffect,
    pointWorld, planeVec, circleOffset, eightOffset, targetAt, pathGuide, mirrorMount,
    FRONT_SEATS, frontPerspSetup, makeFrontPerspProjector, frontPerspToUH,
    makePlanProjector, makeFrontProjector, makeSideProjector, planToUV, frontToUH, sideToVH,
    describeMount, describeCue,
    CURTAIN_KINDS, curtainKindLabel, curtainParts,
  });
})(typeof window !== "undefined" ? window : globalThis);

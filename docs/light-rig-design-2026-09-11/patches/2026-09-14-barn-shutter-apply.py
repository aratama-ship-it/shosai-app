#!/usr/bin/env python3
"""バーンドア／カッター（2026-09-14）のパッチを prototype/ の rig-engine.js と app.js へ当て直す。
同じフォルダを別セッションが同時編集していて、01:34 に一度まるごと origin/main の内容へ戻された（実害）。
そのときのために「アンカー文字列ベース」で再適用できるようにしてある。既に当たっていれば何もしない。
使い方: python3 patches/2026-09-14-barn-shutter-apply.py  （prototype/ の1つ上で実行）
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "..", "prototype")

def patch(path, pairs):
    s = open(path, encoding="utf-8").read()
    if "frameDoors" in s and "shutterPresetSeg" in s if path.endswith("app.js") else ("doorCutInEllipse" in s):
        print(f"{os.path.basename(path)}: 既に当たっています"); return
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, (path, c, old[:80])
        s = s.replace(old, new)
    open(path, "w", encoding="utf-8").write(s)
    print(f"{os.path.basename(path)}: {len(pairs)} か所を当てました")

# ---------------- rig-engine.js ----------------
ENGINE_ADD = r'''  /* ---------- バーンドア／カッター（2026-09-14 本人要望） ----------
     バーンドア: 固定灯だけの装備。四方（床・空中なら 奥・手前・下手・上手／奥の壁・客席なら 上・下・下手・上手）
       から光の縁を切る。fixture.barn = { back, front, left, right } 各 0〜1（0＝開いている、1＝中心まで閉める）。
       仕込みで決める値なので全シーン共通（fixture.beamDeg と同じ層）。ムービングには付けない（本人指定）。
     カッター: 光を四角にする。light.shutter = { on, w, h }。このシーンの値（ゴボと同じ層）。
       w/h は「光の輪に内接する正方形の辺」を1とした比。1.4（≒√2）まで上げるとその向きは輪の外まで開き、
       もう一方だけが効いた「帯」になる。細かい調整はしない（本人指定「四角形、異なるサイズの四角形」）。
     どちらも「切る線」の集まりに直してから描く: 世界座標の向き n（外向き）と、中心からの距離（光の半径＝1）。
     縁の柔らかさ soft も半径に対する比。バーンドアは柔らかく、カッターは硬い。 */
  const BARN_KEYS = Object.freeze(["back", "front", "left", "right"]);
  const BARN_SOFT = 0.22, SHUTTER_SOFT = 0.04;
  const SHUTTER_MIN = 0.1, SHUTTER_MAX = 1.4;
  const SHUTTER_PRESETS = Object.freeze([
    { id: "square", name: "正方形", w: 1, h: 1 },
    { id: "wide", name: "横長", w: 1.4, h: 0.5 },
    { id: "tall", name: "縦長", w: 0.5, h: 1.4 },
    { id: "small", name: "小さめ", w: 0.6, h: 0.6 },
  ]);
  const newShutter = (over = {}) => ({ on: true, w: 1, h: 1, ...over });
  const barnOf = (fixture) => {
    const b = (fixture && fixture.barn) || {}; const o = {};
    BARN_KEYS.forEach((k) => { o[k] = clamp(finite(b[k], 0), 0, 1); });
    return o;
  };
  const barnActive = (fixture) => Boolean(fixture) && !isMoving(fixture) && BARN_KEYS.some((k) => barnOf(fixture)[k] > 0);
  const shutterActive = (light) => Boolean(light && light.shutter && light.shutter.on);
  /* 切る線（世界座標）。vert = "y"（床・空中: 奥⇄手前が y 軸、奥＝−y）／"z"（奥の壁・客席: 上⇄下が z 軸、上＝+z）。
     返り値 [{ key, n:{x,y,z}, f, soft }]。f は中心までを1とした閉め具合。 */
  const frameDoors = (fixture, light, vert) => {
    const out = [];
    const up = vert === "z" ? { x: 0, y: 0, z: 1 } : { x: 0, y: -1, z: 0 };
    const axis = { back: up, front: { x: -up.x, y: -up.y, z: -up.z }, left: { x: -1, y: 0, z: 0 }, right: { x: 1, y: 0, z: 0 } };
    if (barnActive(fixture)) {
      const b = barnOf(fixture);
      BARN_KEYS.forEach((k) => { if (b[k] > 0) out.push({ key: k, n: axis[k], f: b[k], soft: BARN_SOFT }); });
    }
    if (shutterActive(light)) {
      const s = light.shutter;
      const fw = 1 - clamp(finite(s.w, 1), SHUTTER_MIN, SHUTTER_MAX + 0.1) / Math.SQRT2;
      const fh = 1 - clamp(finite(s.h, 1), SHUTTER_MIN, SHUTTER_MAX + 0.1) / Math.SQRT2;
      if (fw > 0) { out.push({ key: "left", n: axis.left, f: fw, soft: SHUTTER_SOFT }); out.push({ key: "right", n: axis.right, f: fw, soft: SHUTTER_SOFT }); }
      if (fh > 0) { out.push({ key: "back", n: axis.back, f: fh, soft: SHUTTER_SOFT }); out.push({ key: "front", n: axis.front, f: fh, soft: SHUTTER_SOFT }); }
    }
    return out;
  };
  /* 面の上の楕円（spotEllipse の ea, eb）の座標系で見た切る線。単位円＝光の輪。
     世界座標の点 = c + x·ea + y·eb なので、向き n に沿った座標は x·(ea·n) + y·(eb·n)。
     楕円の n 方向の半径は √((ea·n)²+(eb·n)²) だから、そこを1にそろえると
     「p·m > d の側を切る」（m = ((ea·n),(eb·n))/半径、d = 1−f）という単位円の上の直線になる。
     n が面に垂直（床の上で z 軸など）なら半径0で線が引けない＝その面では切らない（null）。 */
  const doorCutInEllipse = (door, ea, eb) => {
    const n = door.n;
    const A = ea.x * n.x + ea.y * n.y + ea.z * n.z, B = eb.x * n.x + eb.y * n.y + eb.z * n.z;
    const e = Math.hypot(A, B);
    if (!(e > 1e-9)) return null;
    return { mx: A / e, my: B / e, d: 1 - clamp(finite(door.f, 0), 0, 1), soft: finite(door.soft, SHUTTER_SOFT) };
  };

'''
patch(os.path.join(P, "rig-engine.js"), [
    ("  const trussById = (rig, id) =>", ENGINE_ADD + "  const trussById = (rig, id) =>"),
    ("    CURTAIN_KINDS, curtainKindLabel, curtainParts,\n  });",
     "    CURTAIN_KINDS, curtainKindLabel, curtainParts,\n    BARN_KEYS, SHUTTER_PRESETS, SHUTTER_MIN, SHUTTER_MAX, newShutter, barnOf, barnActive, shutterActive, frameDoors, doorCutInEllipse,\n  });"),
])

# ---------------- app.js ----------------
APP = [
("  const beamOf = (f) => { const l = lightOf(f.id); return E.beamDegAt(f, l, phaseOf(f, l)); };",
"""  const beamOf = (f) => { const l = lightOf(f.id); return E.beamDegAt(f, l, phaseOf(f, l)); };
  /* バーンドア／カッター（2026-09-14）。drawBeam へ渡す「切る線」の元。
     barn は固定灯の仕込み（fixture.barn）、shutter はこのシーンの値（light.shutter）。
     axis は奥⇄手前の軸の既定: 床・空中は y、奥の壁・客席は z。drawBeam 側で実際の着地面が分かれば上書きする。 */
  const frameOf = (f, l) => (E.barnActive(f) || E.shutterActive(l)) ? { f, l, axis: (l && (l.surface === "back" || l.surface === "house")) ? "z" : "y" } : null;"""),
("    return { cx: c.X, cy: c.Y, ax, ay, bx, by, fall: E.spotFalloff(world.S, el, surf, 8) };",
 "    return { cx: c.X, cy: c.Y, ax, ay, bx, by, ea: el.ea, eb: el.eb, fall: E.spotFalloff(world.S, el, surf, 8) };"),
("  function drawBeam(ctx, from, to, world, color, deg, dim, pxPerM, squash, asLine, noPool, lv, gobo, surf, proj) {",
 "  function drawBeam(ctx, from, to, world, color, deg, dim, pxPerM, squash, asLine, noPool, lv, gobo, surf, proj, frame) {"),
("    const ret = () => ({ r: rPx, toX: pool.cx, toY: pool.cy, landX: to.X, landY: to.Y, halfW, ry, lying, asLine, noPool, pool });",
 "    const ret = () => ({ r: rPx, toX: pool.cx, toY: pool.cy, landX: to.X, landY: to.Y, halfW, ry, lying, asLine, noPool, pool, corners, cuts });"),
("    const nx = (-by / blen) * halfW, ny = (bx / blen) * halfW;\n    ctx.save();\n    ctx.globalCompositeOperation = \"screen\";",
"""    const nx = (-by / blen) * halfW, ny = (bx / blen) * halfW;
    /* バーンドア／カッター（2026-09-14 本人要望）。「切る線」を2つの形へ写す:
       ①着地の光だまり: 楕円の座標系（単位円）での半平面（E.doorCutInEllipse）→ 一時キャンバスで destination-out。
         楕円が出せない図（潰れている・面が無い）は画面での向きで代用する。
       ②光の帯（三角）: 帯の両端の角を、その向きの切る線がどれだけ効くか（画面での余弦）のぶん内へ寄せる。
         帯の濃淡（縁の柔らかさ・ゴボの筋）は切る前の幅のまま置き、形だけ切る——筋の位置が光だまりとずれないように。
       単位円の1は光の輪×BEAM_SOFT なので、距離と柔らかさは BEAM_SOFT で割って合わせる。 */
    const cuts = [], T = world.T;
    let cutP = 0, cutM = 0;
    const corners = { p: { X: to.X + nx, Y: to.Y + ny }, m: { X: to.X - nx, Y: to.Y - ny } };
    if (frame && T) {
      const vert = surf === "back" ? "z" : surf === "floor" ? "y" : frame.axis;
      const doors = E.frameDoors(frame.f, frame.l, vert);
      const screenDir = (n) => {
        if (!proj) return null;
        const a = proj(T), b = proj({ x: T.x + n.x * 0.5, y: T.y + n.y * 0.5, z: T.z + n.z * 0.5 });
        if (!a || !b) return null;
        const dx = b.X - a.X, dy = b.Y - a.Y, L = Math.hypot(dx, dy);
        return L > 1e-6 ? { x: dx / L, y: dy / L } : null;
      };
      doors.forEach((dr) => {
        const sd = screenDir(dr.n);
        let c = ell ? E.doorCutInEllipse(dr, ell.ea, ell.eb) : null;
        if (!c && !ell && sd) c = { mx: sd.x, my: sd.y, d: 1 - dr.f, soft: dr.soft };
        if (c) cuts.push({ mx: c.mx, my: c.my, d: c.d / BEAM_SOFT, soft: c.soft / BEAM_SOFT });
        if (sd && !asLine && halfW > 0) {
          const cosv = (sd.x * nx + sd.y * ny) / halfW;
          if (cosv > 0.05) cutP = Math.max(cutP, dr.f * cosv); else if (cosv < -0.05) cutM = Math.max(cutM, dr.f * -cosv);
        }
      });
      corners.p = { X: to.X + nx * (1 - cutP), Y: to.Y + ny * (1 - cutP) };
      corners.m = { X: to.X - nx * (1 - cutM), Y: to.Y - ny * (1 - cutM) };
    }
    ctx.save();
    ctx.globalCompositeOperation = "screen";"""),
("""      if (lying) {
        ctx.lineTo(to.X + halfW, to.Y);
        ctx.ellipse(to.X, to.Y, halfW, ry, 0, 0, Math.PI);   // 円の下半分をなぞって左端へ回り込む
      } else {
        ctx.lineTo(to.X + nx, to.Y + ny);
        ctx.lineTo(to.X - nx, to.Y - ny);
      }""",
"""      if (lying) {
        /* 円の下半分をなぞって左端へ回り込む。角は切る線で内へ寄っていることがある（corners）ので、
           右の角から始めて、両角の中点を中心にした半円で左の角へ戻る。 */
        const L = corners.p.X < corners.m.X ? corners.p : corners.m, Rr = L === corners.p ? corners.m : corners.p;
        ctx.lineTo(Rr.X, Rr.Y);
        ctx.ellipse((L.X + Rr.X) / 2, to.Y, Math.max(1, (Rr.X - L.X) / 2), ry, 0, 0, Math.PI);
      } else {
        ctx.lineTo(corners.p.X, corners.p.Y);
        ctx.lineTo(corners.m.X, corners.m.Y);
      }"""),
("    if (!mask && !fall) {\n      ctx.fillStyle = stops(ctx.createRadialGradient(0, 0, 0, 0, 0, R));",
 "    if (!mask && !fall && !cuts.length) {\n      ctx.fillStyle = stops(ctx.createRadialGradient(0, 0, 0, 0, 0, R));"),
("""      if (mask) {
        tc.globalCompositeOperation = "destination-in";    // 模様の形で光を切り抜く（tmpの中だけの話）
        tc.drawImage(mask.canvas, 0, 0);
        tc.globalCompositeOperation = "source-over";
      }""",
"""      if (mask) {
        tc.globalCompositeOperation = "destination-in";    // 模様の形で光を切り抜く（tmpの中だけの話）
        tc.drawImage(mask.canvas, 0, 0);
        tc.globalCompositeOperation = "source-over";
      }
      if (cuts.length) {
        /* バーンドア／カッターの切る線。単位円の座標 p で mx·p.x+my·p.y > d の側を消す。
           一時キャンバスは中心が (s2/2, s2/2)・半径 maskR＝単位1 なので、線の向きへ回してから
           x = d·maskR より外を消す。縁は soft·maskR の幅で線形に消す（バーンドアは柔らかく、カッターは硬い）。 */
        tc.globalCompositeOperation = "destination-out";
        cuts.forEach((c) => {
          tc.save(); tc.translate(s2 / 2, s2 / 2); tc.rotate(Math.atan2(c.my, c.mx));
          const x0 = c.d * maskR, sw = Math.max(0.5, c.soft * maskR);
          const g2 = tc.createLinearGradient(x0 - sw, 0, x0 + sw, 0);
          g2.addColorStop(0, "rgba(0,0,0,0)"); g2.addColorStop(1, "rgba(0,0,0,1)");
          tc.fillStyle = g2; tc.fillRect(x0 - sw, -s2, s2 * 2 + sw, s2 * 2);
          tc.restore();
        });
        tc.globalCompositeOperation = "source-over";
      }"""),
("""      } else if (sp.lying) {
        mctx.moveTo(sp.fromX, sp.fromY);
        mctx.lineTo(sp.landX + sp.halfW, sp.landY);
        mctx.ellipse(sp.landX, sp.landY, sp.halfW, sp.ry, 0, 0, Math.PI);
      } else {
        const dx = sp.landX - sp.fromX, dy = sp.landY - sp.fromY, len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * sp.halfW, ny = (dx / len) * sp.halfW;
        mctx.moveTo(sp.fromX, sp.fromY);
        mctx.lineTo(sp.landX + nx, sp.landY + ny);
        mctx.lineTo(sp.landX - nx, sp.landY - ny);
      }""",
"""      } else if (sp.lying) {
        mctx.moveTo(sp.fromX, sp.fromY);
        if (sp.corners) {
          // バーンドア／カッターで角が内へ寄っているときは drawBeam と同じ角・同じ半円で抜く
          const cp = sp.corners, L = cp.p.X < cp.m.X ? cp.p : cp.m, Rr = L === cp.p ? cp.m : cp.p;
          mctx.lineTo(Rr.X, Rr.Y);
          mctx.ellipse((L.X + Rr.X) / 2, sp.landY, Math.max(1, (Rr.X - L.X) / 2), sp.ry, 0, 0, Math.PI);
        } else {
          mctx.lineTo(sp.landX + sp.halfW, sp.landY);
          mctx.ellipse(sp.landX, sp.landY, sp.halfW, sp.ry, 0, 0, Math.PI);
        }
      } else if (sp.corners) {
        mctx.moveTo(sp.fromX, sp.fromY);
        mctx.lineTo(sp.corners.p.X, sp.corners.p.Y);
        mctx.lineTo(sp.corners.m.X, sp.corners.m.Y);
      } else {
        const dx = sp.landX - sp.fromX, dy = sp.landY - sp.fromY, len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * sp.halfW, ny = (dx / len) * sp.halfW;
        mctx.moveTo(sp.fromX, sp.fromY);
        mctx.lineTo(sp.landX + nx, sp.landY + ny);
        mctx.lineTo(sp.landX - nx, sp.landY - ny);
      }"""),
("""      mctx.transform(sp.pool.ax, sp.pool.ay, sp.pool.bx, sp.pool.by, sp.pool.cx, sp.pool.cy);
      const grad = mctx.createRadialGradient(0, 0, 0, 0, 0, 1);""",
"""      mctx.transform(sp.pool.ax, sp.pool.ay, sp.pool.bx, sp.pool.by, sp.pool.cx, sp.pool.cy);
      /* バーンドア／カッターの切る線は、光と同じ単位円の座標で clip する（線ごとに半平面を重ねる＝交わり）。
         柔らかい縁までは真似ない（穴なので硬くてよい）。 */
      (sp.cuts || []).forEach((c) => {
        mctx.save(); mctx.rotate(Math.atan2(c.my, c.mx));
        mctx.beginPath(); mctx.rect(-4, -4, 4 + c.d, 8);
        mctx.restore(); mctx.clip();
      });
      const grad = mctx.createRadialGradient(0, 0, 0, 0, 0, 1);"""),
('squashFor("plan", l.surface), true, false, lv, l, l.surface === "floor" ? "floor" : null, P); litSpots.push',
 'squashFor("plan", l.surface), true, false, lv, l, l.surface === "floor" ? "floor" : null, P, frameOf(f, l)); litSpots.push'),
('[1, 1], false, true, lv, l, null, P);', '[1, 1], false, true, lv, l, null, P, frameOf(f, l));'),
('squashFor("front", be.surface || "air"), false, !be.surface, lv, l, be.surface, P);',
 'squashFor("front", be.surface || "air"), false, !be.surface, lv, l, be.surface, P, frameOf(f, l));'),
('squashFor("side", be.surface || "air"), false, !be.surface, lv, l, be.surface, P);',
 'squashFor("side", be.surface || "air"), false, !be.surface, lv, l, be.surface, P, frameOf(f, l));'),
('sq, false, !be.surface, lv, l, be.surface, P);', 'sq, false, !be.surface, lv, l, be.surface, P, frameOf(f, l));'),
('      const nf = E.newFixture(uid("f"), state.nextNo++, m, "", f.kind, f.beamDeg); state.rig.fixtures.push(nf); made.push(nf.id);',
 '      const nf = E.newFixture(uid("f"), state.nextNo++, m, "", f.kind, f.beamDeg);\n      if (f.barn) nf.barn = { ...f.barn };   // バーンドアも仕込みの一部なので引き継ぐ（2026-09-14）\n      state.rig.fixtures.push(nf); made.push(nf.id);'),
('      const nf = E.newFixture(uid("f"), state.nextNo++, E.mirrorMount(f.mount), f.name ? `${f.name}（反対側）` : "", f.kind, f.beamDeg);\n      state.rig.fixtures.push(nf); made.push(nf.id);',
 '      const nf = E.newFixture(uid("f"), state.nextNo++, E.mirrorMount(f.mount), f.name ? `${f.name}（反対側）` : "", f.kind, f.beamDeg);\n      // バーンドアは下手⇄上手を入れ替えて写す（反対側から見れば左右が逆になる。2026-09-14）\n      if (f.barn) { const b = E.barnOf(f); nf.barn = { back: b.back, front: b.front, left: b.right, right: b.left }; }\n      state.rig.fixtures.push(nf); made.push(nf.id);'),
("  /* ぼけの刻み。実際に使うのは0〜30までで",
"""  /* バーンドア／カッターの向きの呼び名（2026-09-14）。床・空中は奥⇄手前、奥の壁・客席は上⇄下。
     まとめて変更では面が混ざるので両方を並記する。 */
  const frameAxisLabels = (surface) => (surface === "back" || surface === "house") ? { w: "幅", h: "高さ" } : { w: "幅", h: "奥行き" };
  const barnLabels = (surface) => (surface === "back" || surface === "house") ? { back: "上", front: "下", left: "下手側", right: "上手側" } : { back: "奥側", front: "手前側", left: "下手側", right: "上手側" };
  const BARN_BULK_LABEL = { back: "奥側・上", front: "手前側・下", left: "下手側", right: "上手側" };
  const numShutter = { min: 10, max: 140, step: 5, to: (v) => v * 100, from: (n) => n / 100, title: "光の輪に内接する正方形を100とした%" };
  const shutterText = (v) => `${Math.round(v * 100)}%（${v < 0.35 ? "細い" : v < 0.8 ? "小さめ" : v <= 1.001 ? "いっぱい" : "輪の外まで"}）`;
  const barnText = (v) => (v < 3 ? "開いている" : v >= 98 ? "中心まで" : `${Math.round(v)}%`);
  const shutterPresetSeg = (cur, onPick) => seg(E.SHUTTER_PRESETS.map((p2) => [p2.id, p2.name]), cur, (id) => { const p2 = E.SHUTTER_PRESETS.find((q) => q.id === id); if (p2) onPick(p2); });
  const shutterPresetId = (sh) => { const hit = sh && E.SHUTTER_PRESETS.find((p2) => Math.abs(p2.w - sh.w) < 0.01 && Math.abs(p2.h - sh.h) < 0.01); return hit ? hit.id : ""; };
  /* ぼけの刻み。実際に使うのは0〜30までで"""),
("      /* ⑤ 位置（ムービングのみ）。スイッチは<b>位置だけ</b>を入り切りする——",
"""      /* ⑤' カッター（四角に切る）／バーンドア（四方から切る）（2026-09-14 本人要望）。
         カッター＝光を四角にする。固定・ムービングの両方で、このシーンの値（ゴボと同じ層）。
         幅・奥行き（奥の壁・客席なら幅・高さ）の2つと形の見本だけ。細かい調整はしない（本人指定）。
         バーンドア＝固定灯だけの装備で、仕込みの値（fixture.barn）＝全シーン共通。四方の閉め具合だけを持つ。
         見出しは「カッター」だけ（「カッター（四角に切る）」だとスイッチが折り返した。1440窓・パネル305pxで実測）。 */
      if (f.mount.type !== "cyc") {
        const b = box(null);
        const sh = E.shutterActive(l) ? l.shutter : null;
        const head = el("div", "pboxhead"); head.append(el("p", "kicker", "カッター"));
        head.append(switchBtn(Boolean(sh), sh ? "光を四角に切っています。押すと丸に戻します（形は覚えておきます）" : "押すと光を四角に切ります（幅と奥行きを決められます）", () => {
          const l2 = lightOf(fid);
          if (E.shutterActive(l2)) { l2.shutter = { ...l2.shutter, on: false }; commit("カッターを外しました"); }
          else { l2.shutter = E.newShutter(l2.shutter ? { ...l2.shutter, on: true } : {}); commit("カッターで四角に切りました"); }
        }, "四角に切る"));
        b.append(head);
        if (sh) {
          const AX = frameAxisLabels(l.surface);
          b.append(field("形", shutterPresetSeg(shutterPresetId(sh), (p2) => { l.shutter = { ...l.shutter, w: p2.w, h: p2.h }; commit(); }), true));
          b.append(field(AX.w, range(E.SHUTTER_MIN, E.SHUTTER_MAX, 0.05, E.clamp(E.finite(sh.w, 1), E.SHUTTER_MIN, E.SHUTTER_MAX), shutterText, (v) => { l.shutter.w = v; draw(); }, () => commit(), numShutter), true));
          b.append(field(AX.h, range(E.SHUTTER_MIN, E.SHUTTER_MAX, 0.05, E.clamp(E.finite(sh.h, 1), E.SHUTTER_MIN, E.SHUTTER_MAX), shutterText, (v) => { l.shutter.h = v; draw(); }, () => commit(), numShutter), true));
        }
      }
      if (!mover && f.mount.type !== "cyc") {
        const b = box("バーンドア（四方から切る）");
        const bd = E.barnOf(f), LB = barnLabels(l.surface);
        E.BARN_KEYS.forEach((k) => {
          b.append(field(LB[k], range(0, 100, 5, Math.round(bd[k] * 100), barnText, (v) => { f.barn = { ...E.barnOf(f), [k]: v / 100 }; draw(); }, () => commit()), true));
        });
        if (E.barnActive(f)) b.append(btn("全部開く", () => { delete f.barn; commit(`${label(fid)}のバーンドアを開きました`); }, "small quiet"));
      }

      /* ⑤ 位置（ムービングのみ）。スイッチは<b>位置だけ</b>を入り切りする——"""),
("    /* ⑤ 位置（ムービングを選んでいるときだけ）。単灯と同じで、ここは<b>位置だけ</b>を入り切りする。",
"""    // ⑤' カッター（選んだ全灯）／バーンドア（固定灯だけ）（2026-09-14）
    {
      const b = sub(null);
      const ons = lit.map((fid) => E.shutterActive(lightOf(fid)));
      const allOn = ons.length > 0 && ons.every(Boolean), anyOn = ons.some(Boolean);
      const head = el("div", "pboxhead"); head.append(el("p", "kicker", "カッター"));
      head.append(switchBtn(allOn, allOn ? "押すと全灯のカッターを外します" : anyOn ? "一部だけ切っています。押すと全灯そろえて切ります" : "押すと全灯を四角に切ります", () => {
        if (allOn) { bulkEach(ids, (f, l) => { if (l.shutter) l.shutter = { ...l.shutter, on: false }; }); commit(`${ids.length}灯のカッターを外しました`); }
        else { bulkEach(ids, (f, l) => { l.shutter = E.newShutter(l.shutter ? { ...l.shutter, on: true } : {}); }); commit(`${ids.length}灯を四角に切りました`); }
      }, "四角に切る"));
      b.append(head);
      if (anyOn) {
        const on = lit.filter((fid) => E.shutterActive(lightOf(fid)));
        const ws = new Set(on.map((fid) => Math.round(lightOf(fid).shutter.w * 100))), hs = new Set(on.map((fid) => Math.round(lightOf(fid).shutter.h * 100)));
        const sameW = ws.size <= 1, sameH = hs.size <= 1;
        const curId = (sameW && sameH) ? shutterPresetId({ w: [...ws][0] / 100, h: [...hs][0] / 100 }) : "";
        b.append(field("形", shutterPresetSeg(curId, (p2) => { bulkEach(on, (f, l) => { l.shutter = { ...l.shutter, w: p2.w, h: p2.h }; }); commit(`${on.length}灯のカッターの形をそろえました`); }), true));
        b.append(field(sameW ? "幅" : "幅（バラバラ）", range(E.SHUTTER_MIN, E.SHUTTER_MAX, 0.05, sameW ? [...ws][0] / 100 : 1, shutterText,
          (v) => { bulkEach(on, (f, l) => { l.shutter.w = v; }); draw(); }, () => commit(`${on.length}灯のカッターの幅を変えました`), numShutter), true));
        b.append(field(sameH ? "奥行き・高さ" : "奥行き・高さ（バラバラ）", range(E.SHUTTER_MIN, E.SHUTTER_MAX, 0.05, sameH ? [...hs][0] / 100 : 1, shutterText,
          (v) => { bulkEach(on, (f, l) => { l.shutter.h = v; }); draw(); }, () => commit(`${on.length}灯のカッターの奥行きを変えました`), numShutter), true));
      }
    }
    {
      const fixed = ids.map(fixtureById).filter((f) => f && !E.isMoving(f) && f.mount.type !== "cyc");
      if (fixed.length) {
        const b = sub(`バーンドア（固定灯${fixed.length}灯）`);
        E.BARN_KEYS.forEach((k) => {
          const vals = new Set(fixed.map((f) => Math.round(E.barnOf(f)[k] * 100)));
          const same = vals.size <= 1, now = same ? [...vals][0] : 0;
          b.append(field(same ? BARN_BULK_LABEL[k] : `${BARN_BULK_LABEL[k]}（バラバラ）`, range(0, 100, 5, now, barnText,
            (v) => { fixed.forEach((f) => { f.barn = { ...E.barnOf(f), [k]: v / 100 }; }); draw(); }, () => commit(`${fixed.length}灯のバーンドアを変えました`)), true));
        });
        if (fixed.some((f) => E.barnActive(f))) b.append(btn("全部開く", () => { fixed.forEach((f) => { delete f.barn; }); commit(`${fixed.length}灯のバーンドアを開きました`); }, "small quiet"));
      }
    }

    /* ⑤ 位置（ムービングを選んでいるときだけ）。単灯と同じで、ここは<b>位置だけ</b>を入り切りする。"""),
('        lxq: "登録した明かりの控え。番号は section-no-seq、cue はそのときの灯の設定一式",',
 '        lxq: "登録した明かりの控え。番号は section-no-seq、cue はそのときの灯の設定一式",\n        barn: "固定灯のバーンドア（仕込み） { back, front, left, right } 各0〜1。0=開いている、1=中心まで閉める。床・空中は back=奥側/front=手前側、奥の壁・客席は back=上/front=下",\n        shutter: "カッター（シーンごと） { on, w, h }。w/h は光の輪に内接する正方形の辺を1とした比（0.1〜1.4）。1.4でその向きは輪の外まで開く",'),
]
patch(os.path.join(P, "app.js"), APP)

# ---------------- stage 2: Codex レビュー（2026-09-14）で直した3点。stage 1 が当たった後に当てる（冪等） ----------------
FIX = [('    const cuts = [], T = world.T;\n    let cutP = 0, cutM = 0;\n    const corners = { p: { X: to.X + nx, Y: to.Y + ny }, m: { X: to.X - nx, Y: to.Y - ny } };\n    if (frame && T) {', '    const cuts = [], T = world.T;\n    let cutP = 0, cutM = 0;\n    /* 帯の裾の向き。潰れた図（lying）では裾は水平（to.X±halfW, to.Y）で、半楕円もそこから始まる——\n       帯に垂直な (nx,ny) を裾にすると半楕円と角が離れて余分な線が出る（Codex レビュー 2026-09-14 で発見・修正）。 */\n    const bnx = lying ? halfW : nx, bny = lying ? 0 : ny;\n    const corners = { p: { X: to.X + bnx, Y: to.Y + bny }, m: { X: to.X - bnx, Y: to.Y - bny } };\n    if (frame && T) {'), ('      doors.forEach((dr) => {\n        const sd = screenDir(dr.n);\n        let c = ell ? E.doorCutInEllipse(dr, ell.ea, ell.eb) : null;\n        if (!c && !ell && sd) c = { mx: sd.x, my: sd.y, d: 1 - dr.f, soft: dr.soft };\n        if (c) cuts.push({ mx: c.mx, my: c.my, d: c.d / BEAM_SOFT, soft: c.soft / BEAM_SOFT });\n        if (sd && !asLine && halfW > 0) {\n          const cosv = (sd.x * nx + sd.y * ny) / halfW;\n          if (cosv > 0.05) cutP = Math.max(cutP, dr.f * cosv); else if (cosv < -0.05) cutM = Math.max(cutM, dr.f * -cosv);\n        }\n      });\n      corners.p = { X: to.X + nx * (1 - cutP), Y: to.Y + ny * (1 - cutP) };\n      corners.m = { X: to.X - nx * (1 - cutM), Y: to.Y - ny * (1 - cutM) };\n    }', '      doors.forEach((dr) => {\n        let c = ell ? E.doorCutInEllipse(dr, ell.ea, ell.eb) : null;\n        if (!c && !ell) { const sd = screenDir(dr.n); if (sd) c = { mx: sd.x, my: sd.y, d: 1 - dr.f, soft: dr.soft }; }\n        if (c) cuts.push({ mx: c.mx, my: c.my, d: c.d / BEAM_SOFT, soft: c.soft / BEAM_SOFT, f: dr.f });\n      });\n      /* 帯の角をどちら側へ寄せるかは、光だまりの切る線を<b>画面に写した法線</b>で決める。\n         単位円→画面の行列 M（pool の ax,ay / bx,by）に対し、線の法線は M⁻ᵀ·m。\n         世界座標の向きをそのまま投影すると、遠近の強い正面図3Dで符号が逆になる場合があった（Codex レビュー 2026-09-14）。 */\n      if (!asLine) {\n        const det = pool.ax * pool.by - pool.bx * pool.ay, bl = Math.hypot(bnx, bny);\n        if (Math.abs(det) > 1e-9 && bl > 1e-9) cuts.forEach((c) => {\n          const sx = (pool.by * c.mx - pool.ay * c.my) / det, sy = (-pool.bx * c.mx + pool.ax * c.my) / det;\n          const L = Math.hypot(sx, sy); if (!(L > 1e-9)) return;\n          const cosv = (sx * bnx + sy * bny) / (L * bl);\n          if (cosv > 0.05) cutP = Math.max(cutP, c.f * cosv); else if (cosv < -0.05) cutM = Math.max(cutM, c.f * -cosv);\n        });\n      }\n      corners.p = { X: to.X + bnx * (1 - cutP), Y: to.Y + bny * (1 - cutP) };\n      corners.m = { X: to.X - bnx * (1 - cutM), Y: to.Y - bny * (1 - cutM) };\n    }'), ('squashFor("plan", l.surface), true, false, lv, l); litSpots.push', 'squashFor("plan", l.surface), true, false, lv, l, null, P, frameOf(f, l)); litSpots.push')]
def patch2(path):
    s = open(path, encoding="utf-8").read()
    if "M⁻ᵀ·m" in s: print("app.js: stage 2 は既に当たっています"); return
    for old, new in FIX:
        c = s.count(old); assert c == 1, (path, c, old[:80]); s = s.replace(old, new)
    open(path, "w", encoding="utf-8").write(s); print("app.js: stage 2 を当てました")
patch2(os.path.join(P, "app.js"))

# ---------------- stage 3（2026-09-14 本人修正: 形の見本を廃止・回転 rot を追加・バーンドアは 2×2 で数字だけ） ----------------
# stage 3 はアンカー差分にしていない。stage 1+2 を当てた状態から stage 3 へ進めるには、origin/main の
# 「照明試作: カッターに回転／バーンドア 2×2」コミット以降の prototype/ 3ファイルを正としてそのまま使うこと。
# （このスクリプトの役目は「一括で消えたときに stage 1+2 まで戻す」まで。）
print("done")

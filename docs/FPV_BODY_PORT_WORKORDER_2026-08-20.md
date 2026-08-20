# 発注書: 3Dカメラ（FPV）の演者に本編の肉付けモデルを移植する

- 日付: 2026-08-20
- 発注: Claude（仕様確定済み）／実装: Codex／検証: Claude
- 対象ファイル: `stage-sketch.js` と `stage-first-person.js` の2つだけ。他は触らない。
- バックアップ済み: `stage-sketch_backup_2026-08-20-before-fpv-body.js` /
  `stage-first-person_backup_2026-08-20-before-fpv-body.js`（作成済み。Codexは作らなくてよい）
- **削除・移動・リネームは行わない。編集前に対象ファイルを読み直すこと（iCloud共有ワークスペース）。**

## 背景（なぜ）

3Dカメラモード（stage-first-person.js）の演者は、頭=円・胴と手足=固定太さの線の棒人間
（現 `drawPerformer`、898行付近）。本編（stage-sketch.js）は MakeHuman 実測の体モデル
（3D関節 `POSES` ＋胴断面 `TORSO_RINGS`/`NECK_RINGS` ＋手足テーパー `LIMB_TAPER`）で描いており、
FPVだけ肉付けが粗い。本編の体モデルは関節が最初から3Dなので、FPVの透視投影に通せば
任意カメラ角度から正しく見える。これを移植する。

## 座標系の対応（重要・ここを間違えると鏡像や前後逆になる）

- 本編の体座標: x=客席から見た画面の左右／y=上（y=0が床、単位は身長H）／z=本人の正面向き。
  向き `piece.facing`（度）は鉛直軸まわり。本編 `buildRig` の投影式:
  `画面横 = jx·cosθ + jz·sinθ`、`奥行き(客席へ向く軸) = -jx·sinθ + jz·cosθ`。
- FPVワールド: `toWorld(u,v,W,D,y)` → x=(u-0.5)·W、z=(v-0.5)·D。**+z が客席側**
  （客席は z > D/2 にある）。客席既定カメラは yaw=180 で forward=(0,0,-1)、
  カメラ right=(+1,0,0)＝ワールド+xが画面右。
- したがって体→ワールドは本編と同じ回転式でそのまま合う:
  ```
  worldX = foot.x + (jx·cosθ + jz·sinθ) · H
  worldY = foot.y + jy · H
  worldZ = foot.z + (-jx·sinθ + jz·cosθ) · H
  ```
  （foot = toWorld(piece.u, piece.v, W, D, base)、base = finite(piece.base, 0)、
  H = heightOf(piece) メートル、θ = finite(piece.facing, 0)·π/180）

## 作業1: stage-sketch.js — 体モデルの貸し出し窓口を追加

`paintProps` / `paintWheel` の定義の後（5260行付近）に追加。**既存関数の変更は
`mountKindOf` の1箇所だけ**（下記のとおり中身を委譲に置き換える。挙動は不変）。

```js
/* 何に乗っているか（pieces配列を引数で受ける版。FPVと共用） */
function mountKindFrom(piece, pieces) {
  if (!piece || piece.type !== "performer" || !piece.supportId) return null;
  const holder = (pieces || []).find((other) => other.id === piece.supportId);
  if (!holder) return null;
  if (holder.type === "pole") return "pole";
  if (holder.type === "chair") return "chair";
  if (holder.type === "trapeze") return "trapeze";
  if (holder.type === "tissue") return "tissue";
  return null;
}
```

既存 `mountKindOf(piece)`（5047行付近）の中身を `return mountKindFrom(piece, sc().pieces);`
の1行に置き換える（ロジック重複を消す）。

次に、`performerRig`（5058行付近）の姿勢選択ロジックと同一の判定を関数に切り出して公開する:

```js
/* FPV用: 駒がいまどの姿勢IDで描かれるべきか（performerRig と同じ優先順位） */
function resolvePoseId(piece, pieces) {
  const mount = mountKindFrom(piece, pieces);
  return piece.animPose ? piece.animPose
    : mount === "pole" ? (piece.poleSide === "L" ? "poleflag_l" : "poleflag_r")
    : mount === "trapeze" ? (piece.trapMode === "hang" ? "trapeze_hang" : "trapeze_sit")
    : mount === "tissue" ? "trapeze_hang"
    : mount === "chair" ? "sit"
    : (piece.pose || "stand");
}

/* 3Dカメラ（stage-first-person.js）へ体モデルを貸し出す窓口。
 * FPVは読み込み順で先に評価されるため、FPV側は描画時に遅延参照する。 */
window.SHOSAI_STAGE_BODY = Object.freeze({
  poseById, resolvePoseId,
  TORSO_RINGS, NECK_RINGS, LIMB_TAPER, LIMB_MIDS, LIMBS,
  HAND_LEN, HAND_R, FOOT_R, HEEL_BACK, PROP_TONES,
  norm3, cross3, limbNodes, lerpPt,
  taperedChain, smoothClosedPath, torsoOutline, mixToward,
});
```

※ これらの識別子はすべて同一IIFE内に既存（TORSO_RINGS 1889 / NECK_RINGS 1914 /
LIMB_TAPER 1927 / LIMB_MIDS 1936 / LIMBS 1832 / HAND_LEN 1937 / HAND_R 1938 / FOOT_R 1939 /
HEEL_BACK 1940 / PROP_TONES 5201 / norm3 1714 / cross3 1718 / limbNodes 1807 / lerpPt 1803 /
taperedChain 1773 / smoothClosedPath 1729 / torsoOutline 1751 / mixToward 1820 / poseById 1680）。
`window` が無い環境は考えなくてよい（このファイルはブラウザ専用）。

## 作業2: stage-first-person.js — drawPerformer を肉付け版に置き換え

1. 現在の `drawPerformer`（898行付近）を **まるごと `drawPerformerSimple` に改名**して残す
   （窓口が無いときのフォールバック。unitテストが window 単体で本モジュールを評価するため必須）。
2. 新しい `drawPerformer(ctx, piece)` を追加:

```js
function drawPerformer(ctx, piece) {
  const body = window.SHOSAI_STAGE_BODY;
  if (!body) return drawPerformerSimple(ctx, piece);
  const H = heightOf(piece);
  if (!(H > 0)) return null;
  const base = finite(piece.base, 0);
  const foot = toWorld(piece.u, piece.v, W, D, base);
  if (toCamera(foot).z <= NEAR) return null;
  const pose = body.poseById(body.resolvePoseId(piece, data.pieces));
  const joints = pose.joints;
  const yaw = finite(piece.facing, 0) * Math.PI / 180;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  let topY = -Infinity;
  let tooClose = false;
  /* 体座標→ワールド→カメラ→画面。z は「大きいほど手前」（本編の慣例に合わせ、
     カメラ距離の符号を反転して身長で割る）。s はその点での px/身長単位。 */
  const project = (jx, jy, jz) => {
    const world = {
      x: foot.x + (jx * cos + jz * sin) * H,
      y: foot.y + jy * H,
      z: foot.z + (-jx * sin + jz * cos) * H,
    };
    const cam = toCamera(world);
    if (cam.z <= NEAR) { tooClose = true; return { x: 0, y: 0, z: 0, s: 1 }; }
    const screen = toScreen(cam);
    if (world.y > topY) topY = world.y;
    return { x: screen.x, y: screen.y, z: -cam.z / H, s: focal / cam.z * H };
  };
  const P = {};
  Object.keys(joints).forEach((k) => { P[k] = project(joints[k][0], joints[k][1], joints[k][2]); });
  if (tooClose) return null;

  /* 胴・首の断面リング。本編 buildRig（stage-sketch.js 4947-4988行）と同じ計算。 */
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const shMid = mid(joints.shL, joints.shR);
  const hipMid = mid(joints.hipL, joints.hipR);
  const axis = body.norm3([hipMid[0] - shMid[0], hipMid[1] - shMid[1], hipMid[2] - shMid[2]]);
  const w0 = pose.wide;
  const dot = w0[0] * axis[0] + w0[1] * axis[1] + w0[2] * axis[2];
  let wide = body.norm3([w0[0] - axis[0] * dot, w0[1] - axis[1] * dot, w0[2] - axis[2] * dot]);
  if (!isFinite(wide[0])) wide = [0, 0, 1];
  const deep = body.norm3(body.cross3(axis, wide));
  const ringAt = (c, ring) => {
    const o = project(c[0], c[1], c[2]);
    const w = project(c[0] + wide[0] * ring.halfX, c[1] + wide[1] * ring.halfX, c[2] + wide[2] * ring.halfX);
    const d = project(c[0] + deep[0] * ring.rz, c[1] + deep[1] * ring.rz, c[2] + deep[2] * ring.rz);
    return { o, wx: w.x - o.x, wy: w.y - o.y, dx: d.x - o.x, dy: d.y - o.y };
  };
  const headJ = joints.head;
  const neckRings = body.NECK_RINGS.slice().reverse().map((ring) => ringAt([
    shMid[0] + (headJ[0] - shMid[0]) * ring.s,
    shMid[1] + (headJ[1] - shMid[1]) * ring.s,
    shMid[2] + (headJ[2] - shMid[2]) * ring.s,
  ], ring));
  const bow = finite(pose.bow, 0);
  const rings = neckRings.concat(body.TORSO_RINGS.map((ring) => {
    const t = ring.t;
    const arc = bow ? Math.sin(Math.PI * clamp(t, 0, 1)) * bow : 0;
    return ringAt([
      shMid[0] + (hipMid[0] - shMid[0]) * t - deep[0] * arc,
      shMid[1] + (hipMid[1] - shMid[1]) * t - deep[1] * arc,
      shMid[2] + (hipMid[2] - shMid[2]) * t - deep[2] * arc,
    ], ring);
  }));
  if (tooClose) return null;

  /* 道具（シルホイール・姿勢付属の小道具）も同じ変換に通す */
  let wheel = null;
  if (pose.wheel) {
    wheel = [];
    for (let i = 0; i <= 48; i += 1) {
      const a = (i / 48) * Math.PI * 2;
      wheel.push(project(Math.cos(a) * pose.wheel.r, pose.wheel.cy + Math.sin(a) * pose.wheel.r, 0));
    }
  }
  let props = null;
  if (pose.props && pose.props.length) {
    props = pose.props.map((prop) => {
      const out = { kind: prop.kind, r: prop.r || 0, w: prop.w || 0.02, tone: prop.tone || "gear" };
      if (prop.kind === "line") {
        out.a = project(prop.a[0], prop.a[1], prop.a[2]);
        out.b = project(prop.b[0], prop.b[1], prop.b[2]);
      } else {
        out.c = project(prop.c[0], prop.c[1], prop.c[2]);
        if (prop.kind === "ring") {
          out.pts = [];
          for (let i = 0; i <= 28; i += 1) {
            const a = (i / 28) * Math.PI * 2;
            out.pts.push(prop.plane === "xz"
              ? project(prop.c[0] + Math.cos(a) * prop.r, prop.c[1], prop.c[2] + Math.sin(a) * prop.r)
              : project(prop.c[0] + Math.cos(a) * prop.r, prop.c[1] + Math.sin(a) * prop.r, prop.c[2]));
          }
        }
      }
      return out;
    });
  }
  if (tooClose) return null;

  /* 影。空中（base>0）でなければ、足元へ床の円（従来と同じ描き方） */
  if (base === 0) {
    fillPoly(ctx, circlePoints(foot.x, .01, foot.z, .26), "rgba(0,0,0,.28)");
  }

  paintBody3d(ctx, body, P, rings, wheel, props, piece.color || "#c9c2b4");
  return { x: foot.x, y: topY + 0.04 * H, z: foot.z };
}
```

3. `paintBody3d` を追加。本編 `paintBody`（stage-sketch.js 5107-5197行）の透視投影版:

```js
/* 本編 paintBody の透視投影版。各節の px 換算はその節の s を使う
 * （遠近で手前の腕が太く、奥の腕が細くなる）。 */
function paintBody3d(ctx, body, P, rings, wheel, props, color) {
  ctx.save();
  if (wheel) paintWheel3d(ctx, wheel, P, "far");
  const parts = body.LIMBS.map((limb) => ({
    kind: "limb", limb,
    z: limb.pts.reduce((t, k) => t + P[k].z, 0) / limb.pts.length,
  }));
  const torsoZ = (P.shL.z + P.shR.z + P.hipL.z + P.hipR.z) / 4;
  parts.push({ kind: "torso", z: torsoZ });
  parts.push({ kind: "head", z: P.head.z + 0.002 });
  parts.sort((a, b) => a.z - b.z);
  parts.forEach((part) => {
    if (part.kind === "limb") {
      /* 奥の手足を沈ませる判定は、本編の絶対値ではなく胴との相対で取る
         （こちらの z はカメラ距離由来で原点が体に無いため） */
      const far = part.z < torsoZ - 0.02;
      ctx.fillStyle = far ? body.mixToward(color, 0.26) : color;
      const taper = body.LIMB_TAPER[part.limb.kind];
      const nodes = body.limbNodes(part.limb.pts.map((k) => P[k]), part.limb.kind);
      body.taperedChain(ctx, nodes, taper.map((r, i) => Math.max(0.8, r * (nodes[i].s || nodes[0].s))));
      const from = P[part.limb.tip[0]];
      const to = P[part.limb.tip[1]];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      if (part.limb.kind === "arm") {
        const tip = { x: to.x + (dx / len) * body.HAND_LEN * to.s, y: to.y + (dy / len) * body.HAND_LEN * to.s };
        body.taperedChain(ctx, [to, body.lerpPt(to, tip, 0.55), tip],
          [Math.max(0.8, body.HAND_R * to.s), Math.max(0.8, body.HAND_R * 1.05 * to.s), Math.max(0.6, body.HAND_R * 0.62 * to.s)]);
      } else {
        const heel = { x: from.x - (dx / len) * body.HEEL_BACK * from.s, y: from.y - (dy / len) * body.HEEL_BACK * from.s * 0.35 };
        body.taperedChain(ctx, [heel, from, to],
          [Math.max(0.8, body.FOOT_R * 0.9 * from.s), Math.max(0.8, body.FOOT_R * from.s), Math.max(0.6, body.FOOT_R * 0.62 * to.s)]);
      }
      return;
    }
    if (part.kind === "torso") {
      ctx.fillStyle = color;
      body.smoothClosedPath(ctx, body.torsoOutline(rings));
      ctx.fill();
      return;
    }
    const nx = P.head.x - P.neck.x;
    const ny = P.head.y - P.neck.y;
    const len = Math.hypot(nx, ny);
    const angle = len > 0.4 ? Math.atan2(ny, nx) : -Math.PI / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(P.head.x, P.head.y,
      Math.max(1.2, 0.065 * P.head.s), Math.max(1.1, 0.048 * P.head.s), angle, 0, Math.PI * 2);
    ctx.fill();
  });
  if (wheel) paintWheel3d(ctx, wheel, P, "near");
  if (props) paintProps3d(ctx, props);
  ctx.restore();
}

/* 本編 paintWheel の透視投影版。近い・遠いは胴の z との相対で分ける */
function paintWheel3d(ctx, pts, P, side) {
  const torsoZ = (P.shL.z + P.shR.z + P.hipL.z + P.hipR.z) / 4;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1.4, 0.022 * P.head.s);
  ctx.strokeStyle = side === "far" ? "rgba(198,204,210,0.42)" : "rgba(222,228,234,0.86)";
  ctx.beginPath();
  let drawing = false;
  pts.forEach((p) => {
    const here = side === "far" ? p.z < torsoZ : p.z >= torsoZ;
    if (!here) { drawing = false; return; }
    if (!drawing) { ctx.moveTo(p.x, p.y); drawing = true; } else { ctx.lineTo(p.x, p.y); }
  });
  ctx.stroke();
  ctx.restore();
}

/* 本編 paintProps の透視投影版。色は本編 PROP_TONES を借りる */
function paintProps3d(ctx, props) {
  const body = window.SHOSAI_STAGE_BODY;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  props.forEach((prop) => {
    const tone = body.PROP_TONES[prop.tone] || body.PROP_TONES.gear;
    if (prop.kind === "line") {
      ctx.strokeStyle = tone;
      ctx.lineWidth = Math.max(1.2, prop.w * ((prop.a.s + prop.b.s) / 2));
      ctx.beginPath();
      ctx.moveTo(prop.a.x, prop.a.y);
      ctx.lineTo(prop.b.x, prop.b.y);
      ctx.stroke();
      return;
    }
    if (prop.kind === "ring") {
      ctx.strokeStyle = tone;
      ctx.lineWidth = Math.max(1.2, prop.w * prop.c.s);
      ctx.beginPath();
      prop.pts.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
      ctx.stroke();
      return;
    }
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.arc(prop.c.x, prop.c.y, Math.max(1.5, prop.r * prop.c.s), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}
```

### stage-first-person.js 側の注意

- `drawPerformerSimple`（旧drawPerformer）は**中身を一切変えない**。目の描画は新版では
  頭の楕円のみで良い（目は省略。小さすぎて3Dカメラでは読めないため）。
- 呼び出し側（renderFrame 1315行付近の `drawPerformer(ctx, piece)`）は変更不要。
  戻り値の形（`{x,y,z}` またはヌル）は維持している。
- FPV独自の `mountedPose` / 旧posename（"hang"等）は `drawPerformerSimple` と
  `eyeHeight` が使い続けるので**消さない**。
- `clamp` / `finite` / `fillPoly` / `circlePoints` / `toCamera` / `toScreen` / `focal` は
  FPV内に既存。そのまま使う。

## 作業3: 版上げ（PWAキャッシュ）

- `index.html`: `stage-first-person.js?v=9` → `?v=10`、`stage-sketch.js?v=264` → `?v=265`
- `stage-sw.js`: 同じ2つの `?v=` を同様に上げ、`CACHE_NAME` を `stage-sketch-pwa-v96` → `v97`
- `stage.html` は生成物なので**直接編集しない**（発注元が `build_stage.py` を実行する）

## 完了条件

1. `node --check stage-sketch.js` と `node --check stage-first-person.js` が通る。
2. `node --test tests/stage-first-person.test.mjs` が全件通る（フォールバックがあるため
   window 単体評価でも壊れない）。
3. ブラウザで3Dカメラを開くと、演者が棒人間ではなく本編と同じ肉付き
   （肩・くびれ・腰の胴、テーパーの付いた手足、首）で描かれる。
   向き（facing）を変えると体もその向きに回る。（この項は発注元が検証する）

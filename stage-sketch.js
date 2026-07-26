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
    performer: "演者",
    block: "台・箱",
    table: "テーブル",
    chair: "椅子",
    sphere: "球",
    light: "光",
  };
  // 実寸の目安（m）。人を基準に置くと、舞台の規模が見た目に出る
  const PIECE_METERS = {
    performer: 1.65,
    block: 1.2,
    table: 0.72,
    chair: 0.9,
    sphere: 1.2,
    light: 2.5,
  };
  // 台・テーブル・椅子・球・光は実寸（m）で持つ。人だけが身長で決まるのに対し、
  // セットは幅・奥行き・高さがそれぞれ意味を持つので、一つの倍率では表せない。
  const PIECE_DIMS = {
    block: { w: 2.04, d: 0.66, h: 1.2 },   // 平台1枚ぶんの見当
    table: { w: 1.6, d: 0.8, h: 0.72 },    // 一般的なダイニングテーブル
    chair: { h: 0.9 },                     // 背もたれの上端まで。幅と奥行きはここから決まる
    sphere: { dia: 1.2, lift: 0 },         // 直径と、床からの高さ
    light: { dia: 4 },                     // 床に落ちる明かりの差し渡し
  };
  /* 寸法つまみの仕様。項目は種類ごとに違うので、画面はここから組み立てる。
   * HTMLへ固定で並べると、種類を足すたびに二箇所直すことになる。 */
  const DIM_META = {
    w: { label: "幅", min: 0.2, max: 12, step: 0.01 },
    d: { label: "奥行き", min: 0.2, max: 12, step: 0.01 },
    h: { label: "高さ", min: 0.1, max: 8, step: 0.01 },
    dia: { label: "直径", min: 0.3, max: 20, step: 0.01 },
    lift: { label: "床からの高さ", min: 0, max: 10, step: 0.01 },
  };
  /* 表示はcm。内部はmのまま。
   * 家具や人の寸法は「1.6m」より「160cm」のほうが体に入る。
   * 劇場の間口は m のままにする（そちらは m で語る寸法なので）。 */
  const cmText = (m) => `${Math.round(m * 100)}cm`;
  // 種類によって言い方を変えたいものだけ上書きする
  const DIM_LABELS = {
    chair: { h: "大きさ（背もたれの上端まで）" },
    light: { dia: "明かりの差し渡し" },
  };
  function dimLabel(kind, key) {
    return (DIM_LABELS[kind] && DIM_LABELS[kind][key]) || DIM_META[key].label;
  }
  // 椅子は大きさ一つで決まる。幅と奥行きはそこから割り出す
  /* 舞台セットに登録できる形。光もここに含める。登録・出し入れ・寸法の
   * 仕組みが同じなので同じ入れ物に置き、一覧だけ「光」パネルへ分けて出す。 */
  const SET_KINDS = { block: "台・箱", table: "テーブル", chair: "椅子", sphere: "球", light: "光" };
  const SET_KIND_ORDER = ["block", "table", "chair", "sphere"];
  /* ---------- 演者の骨格と姿勢 ----------
   * 関節を3次元（x=左右／y=上下／z=本人の正面向き）で持ち、向きの角度だけ
   * 鉛直軸まわりに回して画面へ落とす。こうすると、向きの変化・座る・逆立ちが
   * すべて同じ仕組みで扱える。2次元の絵を姿勢ごとに描き分けると、
   * 横を向いたときに破綻する。
   *
   * 単位は身長H。y=0 が床、y=1 が立ったときの頭のてっぺん。
   * x は「客席から見て正面を向いたときの画面の左右」。z は本人が向いている側。
   * 姿勢はこちらで用意したものだけを使う（利用者が形をいじるものではない）。
   */
  const BASE_JOINTS = {
    head: [0, 0.935, 0], neck: [0, 0.855, 0],
    shL: [-0.115, 0.82, 0], shR: [0.115, 0.82, 0],
    elL: [-0.135, 0.63, 0.015], elR: [0.135, 0.63, 0.015],
    wrL: [-0.145, 0.45, 0.03], wrR: [0.145, 0.45, 0.03],
    hipL: [-0.055, 0.52, 0], hipR: [0.055, 0.52, 0],
    knL: [-0.06, 0.28, 0.012], knR: [0.06, 0.28, 0.012],
    anL: [-0.058, 0.04, 0], anR: [0.058, 0.04, 0],
    toL: [-0.058, 0.012, 0.075], toR: [0.058, 0.012, 0.075],
  };
  /* wide … 胴の断面の「幅」がどちらを向くか（体の座標）。既定は左右。
   *        横向きに寝ると肩の並びが縦になるので、そこだけ上下にする。
   * face … 顔がどちらを向くか。うつ伏せと仰向けを見分けるのに使う。 */
  const makePose = (id, label, over, extra) => Object.assign(
    { id, label, joints: Object.assign({}, BASE_JOINTS, over), wide: [1, 0, 0], face: [0, 0, 1] },
    extra || {});

  const POSES = [
    makePose("stand", "立つ", {}),
    makePose("walk", "歩く", {
      knR: [0.062, 0.30, 0.14], anR: [0.06, 0.05, 0.25], toR: [0.06, 0.015, 0.33],
      knL: [-0.06, 0.27, -0.10], anL: [-0.058, 0.055, -0.21], toL: [-0.058, 0.02, -0.14],
      elR: [0.132, 0.64, -0.10], wrR: [0.13, 0.47, -0.19],
      elL: [-0.132, 0.64, 0.11], wrL: [-0.13, 0.47, 0.20],
    }),
    makePose("reach", "両手を上げる", {
      elL: [-0.15, 0.99, 0.01], wrL: [-0.155, 1.15, 0.01],
      elR: [0.15, 0.99, 0.01], wrR: [0.155, 1.15, 0.01],
    }),
    makePose("open", "両手を広げる", {
      elL: [-0.24, 0.83, 0.01], wrL: [-0.36, 0.84, 0.01],
      elR: [0.24, 0.83, 0.01], wrR: [0.36, 0.84, 0.01],
    }),
    // 椅子の座面（およそ0.27H＝身長165cmで45cm）に腰を置く
    makePose("sit", "座る", {
      head: [0, 0.70, 0.02], neck: [0, 0.62, 0.01],
      shL: [-0.115, 0.585, 0], shR: [0.115, 0.585, 0],
      elL: [-0.128, 0.41, 0.02], elR: [0.128, 0.41, 0.02],
      wrL: [-0.125, 0.28, 0.10], wrR: [0.125, 0.28, 0.10],
      hipL: [-0.058, 0.285, -0.02], hipR: [0.058, 0.285, -0.02],
      knL: [-0.065, 0.285, 0.26], knR: [0.065, 0.285, 0.26],
      anL: [-0.06, 0.045, 0.28], anR: [0.06, 0.045, 0.28],
      toL: [-0.06, 0.012, 0.36], toR: [0.06, 0.012, 0.36],
    }),
    makePose("crouch", "しゃがむ", {
      head: [0, 0.655, 0.03], neck: [0, 0.575, 0.02],
      shL: [-0.115, 0.545, 0.015], shR: [0.115, 0.545, 0.015],
      elL: [-0.13, 0.40, 0.11], elR: [0.13, 0.40, 0.11],
      wrL: [-0.12, 0.30, 0.24], wrR: [0.12, 0.30, 0.24],
      hipL: [-0.058, 0.235, -0.08], hipR: [0.058, 0.235, -0.08],
      knL: [-0.075, 0.245, 0.17], knR: [0.075, 0.245, 0.17],
      anL: [-0.062, 0.04, 0.02], anR: [0.062, 0.04, 0.02],
      toL: [-0.062, 0.012, 0.10], toR: [0.062, 0.012, 0.10],
    }),
    makePose("kneel", "片膝立ち", {
      head: [0, 0.79, 0.01], neck: [0, 0.71, 0],
      shL: [-0.115, 0.675, 0], shR: [0.115, 0.675, 0],
      elL: [-0.132, 0.49, 0.02], elR: [0.132, 0.49, 0.02],
      wrL: [-0.13, 0.32, 0.04], wrR: [0.13, 0.32, 0.04],
      hipL: [-0.058, 0.375, -0.02], hipR: [0.058, 0.375, -0.02],
      // 左脚を前へ立て、右脚は膝を床へ
      knL: [-0.07, 0.345, 0.21], anL: [-0.065, 0.045, 0.23], toL: [-0.065, 0.012, 0.31],
      knR: [0.062, 0.045, -0.12], anR: [0.06, 0.055, -0.31], toR: [0.06, 0.03, -0.38],
    }),
    /* 逆立ち。手が床、頭は肩より下へ入る。
     * 高さは立ったときより高い（首と頭の代わりに腕が入るため、実測でおよそ1.15倍）。 */
    makePose("handstand", "逆立ち", {
      wrL: [-0.145, 0.02, 0.06], wrR: [0.145, 0.02, 0.06],
      elL: [-0.128, 0.21, 0.03], elR: [0.128, 0.21, 0.03],
      shL: [-0.115, 0.40, -0.01], shR: [0.115, 0.40, -0.01],
      neck: [0, 0.44, 0.01], head: [0, 0.36, 0.06],
      hipL: [-0.055, 0.70, -0.02], hipR: [0.055, 0.70, -0.02],
      knL: [-0.07, 0.94, 0.01], knR: [0.052, 0.945, -0.04],
      anL: [-0.078, 1.18, 0.03], anR: [0.046, 1.19, -0.06],
      toL: [-0.08, 1.25, 0.06], toR: [0.044, 1.26, -0.09],
    }),
    /* 寝姿。本人の正面（z+）が頭側なので、向きを真横にすると寝姿がはっきり読める。
     * うつ伏せ・仰向け・横向きは、腕と脚の置き方と顔の向きで見分ける。 */
    makePose("lie", "うつ伏せ", {
      head: [0, 0.09, 0.50], neck: [0, 0.078, 0.42],
      shL: [-0.115, 0.07, 0.36], shR: [0.115, 0.07, 0.36],
      elL: [-0.20, 0.06, 0.35], elR: [0.20, 0.06, 0.35],
      wrL: [-0.185, 0.06, 0.49], wrR: [0.185, 0.06, 0.49],
      hipL: [-0.058, 0.07, 0.06], hipR: [0.058, 0.07, 0.06],
      knL: [-0.06, 0.07, -0.22], knR: [0.06, 0.07, -0.22],
      anL: [-0.058, 0.06, -0.48], anR: [0.058, 0.06, -0.48],
      toL: [-0.058, 0.03, -0.55], toR: [0.058, 0.03, -0.55],
    }, { face: [0, -1, 0.35] }),
    makePose("supine", "仰向け", {
      head: [0, 0.075, 0.50], neck: [0, 0.07, 0.42],
      shL: [-0.115, 0.07, 0.36], shR: [0.115, 0.07, 0.36],
      elL: [-0.145, 0.06, 0.21], elR: [0.145, 0.06, 0.21],
      wrL: [-0.14, 0.055, 0.05], wrR: [0.14, 0.055, 0.05],
      hipL: [-0.058, 0.07, 0.06], hipR: [0.058, 0.07, 0.06],
      knL: [-0.06, 0.095, -0.21], knR: [0.06, 0.095, -0.21],
      anL: [-0.058, 0.06, -0.47], anR: [0.058, 0.06, -0.47],
      toL: [-0.058, 0.11, -0.52], toR: [0.058, 0.11, -0.52],
    }, { face: [0, 1, 0.35] }),
    // 横向きは肩が縦に重なる。胴の断面の幅も上下向きにする
    makePose("sidelie", "横向き", {
      head: [0, 0.115, 0.47], neck: [0, 0.105, 0.39],
      shL: [0.012, 0.175, 0.34], shR: [-0.012, 0.055, 0.34],
      elL: [0.02, 0.14, 0.19], elR: [-0.005, 0.045, 0.21],
      wrL: [0.02, 0.10, 0.06], wrR: [-0.005, 0.04, 0.08],
      hipL: [0.012, 0.145, 0.04], hipR: [-0.012, 0.055, 0.04],
      knL: [0.022, 0.13, -0.19], knR: [-0.004, 0.055, -0.18],
      anL: [0.022, 0.075, -0.41], anR: [-0.004, 0.045, -0.40],
      toL: [0.022, 0.05, -0.48], toR: [-0.004, 0.04, -0.47],
    }, { wide: [0, 1, 0], face: [0, 0.25, 1] }),
  ];
  const poseById = (id) => POSES.find((p) => p.id === id) || POSES[0];

  /* その姿勢が身長Hに対して占める範囲。手足の太さぶんも見込む。
   * 平面図の footprint と、選んだときの枠の大きさに使う。
   * 寝ている演者は床を長く占めるので、立っているときと同じ丸では表せない。 */
  const poseExtent = (() => {
    const cache = {};
    return (id) => {
      if (cache[id]) return cache[id];
      const j = poseById(id).joints;
      const pad = 0.05;   // 手足の太さと胴の厚みぶん
      let x0 = Infinity; let x1 = -Infinity; let y1 = -Infinity; let z0 = Infinity; let z1 = -Infinity;
      Object.keys(j).forEach((k) => {
        x0 = Math.min(x0, j[k][0]); x1 = Math.max(x1, j[k][0]);
        y1 = Math.max(y1, j[k][1]);
        z0 = Math.min(z0, j[k][2]); z1 = Math.max(z1, j[k][2]);
      });
      cache[id] = {
        halfX: Math.max(0.07, (x1 - x0) / 2 + pad),
        halfZ: Math.max(0.07, (z1 - z0) / 2 + pad),
        cx: (x0 + x1) / 2, cz: (z0 + z1) / 2,
        top: y1 + 0.05,
      };
      return cache[id];
    };
  })();

  const norm3 = (v) => {
    const n = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / n, v[1] / n, v[2] / n];
  };
  const cross3 = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];

  // 多角形の角を丸めて閉じる。辺の中点を通る二次曲線にすると、
  // 頂点が丸まって、体のような柔らかい輪郭になる
  function softClosedPath(target, pts) {
    if (pts.length < 3) return;
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const first = mid(pts[pts.length - 1], pts[0]);
    target.beginPath();
    target.moveTo(first.x, first.y);
    for (let i = 0; i < pts.length; i += 1) {
      const cur = pts[i];
      const nxt = pts[(i + 1) % pts.length];
      const m = mid(cur, nxt);
      target.quadraticCurveTo(cur.x, cur.y, m.x, m.y);
    }
    target.closePath();
  }

  // 付け根から先へ細くなる手足。節ごとに台形を置き、関節を丸で埋める
  function taperedChain(target, pts, radii) {
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      const ra = radii[i];
      const rb = radii[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      target.beginPath();
      target.moveTo(a.x + nx * ra, a.y + ny * ra);
      target.lineTo(b.x + nx * rb, b.y + ny * rb);
      target.lineTo(b.x - nx * rb, b.y - ny * rb);
      target.lineTo(a.x - nx * ra, a.y - ny * ra);
      target.closePath();
      target.fill();
    }
    pts.forEach((q, i) => {
      target.beginPath();
      target.arc(q.x, q.y, radii[i], 0, Math.PI * 2);
      target.fill();
    });
  }

  // 色を地の暗さへ寄せる。奥の手足を沈ませるのに使う（重ね塗りで濃くならないよう、
  // 半透明ではなく色そのものを混ぜる）
  function mixToward(hex, t) {
    const c = hex.replace("#", "");
    const n = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
    const r = Math.round(((n >> 16) & 255) * (1 - t) + 13 * t);
    const g = Math.round(((n >> 8) & 255) * (1 - t) + 12 * t);
    const b = Math.round((n & 255) * (1 - t) + 11 * t);
    return `rgb(${r},${g},${b})`;
  }

  /* 点の集まりの外周。胴は箱なので、8点を投影した外側をなぞれば
   * どの向きでも正しい輪郭になる（単調鎖法）。 */
  function convexHull(points) {
    const pts = points.slice().sort((a, b) => (a.x - b.x) || (a.y - b.y));
    if (pts.length < 3) return pts;
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const build = (list) => {
      const out = [];
      list.forEach((p) => {
        while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
        out.push(p);
      });
      out.pop();
      return out;
    };
    return build(pts).concat(build(pts.slice().reverse()));
  }

  // 体の部位。太さは身長に対する割合。奥にあるものから塗るために z も見る
  const LIMBS = [
    { pts: ["hipL", "knL", "anL", "toL"], kind: "leg" },
    { pts: ["hipR", "knR", "anR", "toR"], kind: "leg" },
    { pts: ["shL", "elL", "wrL"], kind: "arm" },
    { pts: ["shR", "elR", "wrR"], kind: "arm" },
  ];

  // 首を振れる角度。見上げる側を大きく取る（吊り物や空中の演目はそこにある）
  const TILT_UP = 34;
  const TILT_DOWN = 16;
  const SOLID_TYPES = { block: true, table: true, chair: true };
  const CHAIR_W = 0.5;
  const CHAIR_D = 0.55;
  // その駒が床でどれだけの面積を取るか（m）。平面図と当たり判定で使う
  function pieceFootprint(piece) {
    const d = pieceDims(piece);
    if (!d) return null;
    if (piece.type === "chair") return { w: d.h * CHAIR_W, d: d.h * CHAIR_D };
    if (d.dia !== undefined) return { w: d.dia, d: d.dia };
    return { w: d.w, d: d.d };
  }
  const DEFAULT_HEIGHT_CM = 165;
  // 名簿や舞台セットへ加えたときの色。順に配って、色でも見分けられるようにする
  const PIECE_PALETTE = ["#a84b26", "#efe7d6", "#77865f", "#8b98a1", "#d3ac59", "#6d6657"];
  function nextPieceColor(index) {
    return PIECE_PALETTE[((index % PIECE_PALETTE.length) + PIECE_PALETTE.length) % PIECE_PALETTE.length];
  }
  // 肩幅は身長のおよそ1/4。向きが変わると見かけの幅がこの間で動く
  const SHOULDER_RATIO = 0.25;
  // 体の厚み（前後）は肩幅のおよそ0.68倍。真横を向いたときの見かけの幅になる
  const BODY_DEPTH_RATIO = 0.68;
  /* 胴の断面。肩・くびれ・腰の3段で持つ。すべて身長に対する割合。
   * halfX=左右の半幅、rz=前後の半分の厚み。実測（身長165cm）でいうと
   * 肩幅0.38m・胴の厚み0.19m・腰幅0.32mあたり。
   * 肩と腰だけの2段だと台形になって、上半身が四角く見える。 */
  const TORSO_RINGS = [
    { t: 0, halfX: 0.115, rz: 0.056 },
    { t: 0.46, halfX: 0.081, rz: 0.044 },
    { t: 1, halfX: 0.097, rz: 0.05 },
  ];
  // 手足の半径。付け根から先へ細くなる
  const LIMB_TAPER = {
    leg: [0.052, 0.038, 0.026, 0.019],   // 腿の付け根 → 膝 → 足首 → つま先
    arm: [0.034, 0.026, 0.018],          // 肩 → 肘 → 手首
  };
  const TOOL_HINTS = {
    select: "演者や物を選び、舞台の上で動かします。",
    paint: "奥の背景面を指やマウスで塗ります。",
    erase: "背景に描いた線だけを消します。",
  };

  const els = {
    undo: document.getElementById("stage-undo"),
    redo: document.getElementById("stage-redo"),
    export: document.getElementById("stage-export"),
    toolHint: document.getElementById("stage-tool-hint"),
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
    sizeRow: document.getElementById("stage-size-row"),
    dims: document.getElementById("stage-dims"),
    dimsFromSet: document.getElementById("stage-dims-from-set"),
    openSetInfo: document.getElementById("stage-open-setinfo"),
    sizeValue: document.getElementById("stage-size-value"),
    sizeLabel: document.querySelector('label[for="stage-piece-size"]'),
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
    venueScale: document.getElementById("stage-venue-scale"),
    bgSection: document.getElementById("stage-bg-section"),
    seatSection: document.getElementById("stage-seat-section"),
    seatList: document.getElementById("stage-seat-list"),
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
    pieceFacing: document.getElementById("stage-piece-facing"),
    piecePose: document.getElementById("stage-piece-pose"),
    poseLabel: document.getElementById("stage-pose-label"),
    poseModal: document.getElementById("stage-pose"),
    poseBackdrop: document.getElementById("stage-pose-backdrop"),
    poseClose: document.getElementById("stage-pose-close"),
    poseGrid: document.getElementById("stage-pose-grid"),
    facingValue: document.getElementById("stage-facing-value"),
    profile: document.getElementById("stage-profile"),
    profileBackdrop: document.getElementById("stage-profile-backdrop"),
    profileClose: document.getElementById("stage-profile-close"),
    profileName: document.getElementById("stage-profile-name"),
    profileHeight: document.getElementById("stage-profile-height"),
    profileHeightValue: document.getElementById("stage-profile-height-value"),
    profileColor: document.getElementById("stage-profile-color"),
    profileNote: document.getElementById("stage-profile-note"),
    castName: document.getElementById("stage-cast-name"),
    castAdd: document.getElementById("stage-cast-add"),
    setList: document.getElementById("stage-set-list"),
    lightList: document.getElementById("stage-light-list"),
    rigList: document.getElementById("stage-rig-list"),
    rigName: document.getElementById("stage-rig-name"),
    rigSave: document.getElementById("stage-rig-save"),
    sceneAddRig: document.getElementById("stage-scene-add-rig"),
    sceneSection: document.getElementById("stage-scene-section"),
    sceneOut: document.getElementById("stage-scene-out"),
    sceneIn: document.getElementById("stage-scene-in"),
    lightName: document.getElementById("stage-light-name"),
    lightAdd: document.getElementById("stage-light-add"),
    setName: document.getElementById("stage-set-name"),
    setKind: document.getElementById("stage-set-kind"),
    setAdd: document.getElementById("stage-set-add"),
    setInfo: document.getElementById("stage-setinfo"),
    setInfoBackdrop: document.getElementById("stage-setinfo-backdrop"),
    setInfoClose: document.getElementById("stage-setinfo-close"),
    setInfoTitle: document.getElementById("stage-setinfo-title"),
    setInfoName: document.getElementById("stage-setinfo-name"),
    setInfoDims: document.getElementById("stage-setinfo-dims"),
    setInfoColor: document.getElementById("stage-setinfo-color"),
    setInfoNote: document.getElementById("stage-setinfo-note"),
    frontInner: document.getElementById("stage-front-inner"),
    planInner: document.getElementById("stage-plan-inner"),
    showNames: document.getElementById("stage-show-names"),
    showSeatMap: document.getElementById("stage-show-seatmap"),
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

  /* 場面の並びは「順番＋字下げ」で持つ。親のidを持たせるより、前後の入れ替えと
   * 入れ子の付け外しが素直に書ける（箇条書きと同じ考え方）。
   * 親は「自分より前にある、自分より浅い最初の行」。
   * kind:"section" は入れ物だけで、絵は持たない。 */
  const MAX_DEPTH = 4;

  function newScene(title, withExample, kind, depth) {
    return {
      id: rid(kind === "section" ? "sect" : "scene"),
      kind: kind === "section" ? "section" : "scene",
      depth: clamp(finite(depth, 0), 0, MAX_DEPTH),
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
        // このショーで使う台や道具。寸法はここが正本で、置いた分はこれを参照する
        sets: [],
        // 舞台装置の並びを、名前をつけて残したもの。場面をまたいで使い回す
        rigs: [],
        scenes: [scene],
        activeSceneId: scene.id,
      },
      // 画面の状態。プロジェクトの内容ではないので、共有や書き出しには含めない
      showFront: true,
      showPlan: true,
      showNames: true,
      // 正面図の隅に「客席のどこから見ているか」の小図を出すか
      showSeatMap: true,
      // 舞台が一度に入らない席での見回し（-1〜1）。左右と上下
      frontPan: 0,
      frontPanY: 0,
      // 畳んだセクション（idごと）。場面の入れ子を折りたたむのに使う
      closedSections: {},
      // 並べ替えや追加の起点になる行。セクションも起点になれる
      cursorRowId: null,
      seat: "center",
      // パネルの置き場所と開閉。中央は絵の順序だけを持つ
      layout: defaultLayout(),
      // 名簿にも舞台セットにも属さない駒を置いたときの色
      pieceColor: "#a84b26",
      paintColor: "#efe7d6",
      brushSize: 42,
    };
  }

  /* ---------- パネルの配置 ----------
     どの道具をどちら側へ置くかは人によって違う。列を移せるようにし、
     使わないものは畳めるようにする。中央は絵だけで、上下の入れ替えのみ。 */
  const PANELS = ["project", "venue", "cast", "sets", "rigs", "light", "background", "scenes", "inspector", "save"];

  function defaultLayout() {
    return {
      // 場面は絵のすぐ右に置く（順番を見ながら描くため）
      cols: {
        project: "left", venue: "left", cast: "left", sets: "left", rigs: "left",
        light: "left", background: "left",
        scenes: "right", inspector: "right", save: "right",
      },
      order: {
        project: 0, venue: 1, cast: 2, sets: 3, rigs: 4, light: 5, background: 6,
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

  // 向きを言葉にする。角度そのものより、どちらを向いているかが読みたい
  function facingLabel(deg) {
    const d = ((Number(deg) || 0) % 360 + 360) % 360;
    if (d < 23 || d >= 338) return "客席";
    if (d < 68) return "客席・上手寄り";
    if (d < 113) return "上手";
    if (d < 158) return "奥・上手寄り";
    if (d < 203) return "奥（背中）";
    if (d < 248) return "奥・下手寄り";
    if (d < 293) return "下手";
    return "客席・下手寄り";
  }

  // その演者の身長（m）。名簿に登録があればそれを使う。
  // 身長は演者の持ちもので、同じ舞台でも人によって見え方が変わる。
  function pieceHeightM(piece) {
    if (piece.type !== "performer") return PIECE_METERS[piece.type];
    const member = piece.castId ? state.project.cast.find((c) => c.id === piece.castId) : null;
    const cm = member && Number(member.heightCm) ? Number(member.heightCm) : DEFAULT_HEIGHT_CM;
    return cm / 100;
  }

  // 舞台に出す名前。登録した演者なら名簿から引き、そうでなければ個別の名前
  // 頭上に出す名前。名簿・舞台セットに登録したものは、そちらの名前を引く
  function pieceLabel(piece) {
    if (piece.castId) {
      const member = state.project.cast.find((c) => c.id === piece.castId);
      if (member) return member.name;
    }
    const registered = pieceSet(piece);
    if (registered) return registered.name;
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
    // 「円形の物」は輪なのか円盤なのか読めなかったので球に置き換えた。古い保存を読み替える
    const raw = piece && piece.type === "ring" ? "sphere" : piece && piece.type;
    const type = PIECE_TYPES[raw] ? raw : "performer";
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
      setId: typeof piece.setId === "string" ? piece.setId : null,
      // 体の向き（度）。0=客席を向く、90=上手を向く、180=背中
      facing: clamp(finite(piece.facing, 0), 0, 359),
      dims: normalizeDims(type, piece),
      // 姿勢。用意したものの中から選ぶ（形そのものは編集させない）
      pose: POSES.some((p) => p.id === piece.pose) ? piece.pose : "stand",
      // 床からの高さ(m)と、支えている駒。どちらも置き場所から毎回引き直す派生値
      base: clamp(finite(piece.base, 0), 0, 40),
      supportId: null,
    };
  }

  // 台と球の実寸。dims を持たない古い保存は、size（倍率）から見た目が
  // 変わらないように割り戻す。それ以外の種類は寸法を持たない。
  function normalizeDims(type, piece) {
    const base = PIECE_DIMS[type];
    if (!base) return null;
    const old = piece && piece.dims ? piece.dims : null;
    const k = clamp(finite(piece && piece.size, 100), 55, 180) / 100;
    const out = {};
    Object.keys(base).forEach((key) => {
      const meta = DIM_META[key];
      const fallback = key === "lift" ? base[key] : base[key] * k;
      out[key] = clamp(finite(old ? old[key] : fallback, base[key]), meta.min, meta.max);
    });
    return out;
  }

  // 寸法の正本。舞台セットに登録したものは、そちらを引く。
  // 登録側を直せば、置いてある全ての場面の見え方が同時に変わる。
  /* 寸法つまみを組み立てる。項目は種類ごとに違うので、HTMLへ固定で並べず
   * ここから作る。dims オブジェクトへ直に書き込むので、
   * 「駒そのもの」でも「舞台セットの正本」でも同じ関数で使える。 */
  function buildDimControls(host, prefix, kind, dims, onChange) {
    if (!host) return;
    host.innerHTML = "";
    if (!dims) return;
    Object.keys(dims).forEach((key) => {
      const meta = DIM_META[key];
      if (!meta) return;
      const label = document.createElement("label");
      label.className = "stage-control-label stage-range-label";
      label.htmlFor = `${prefix}-${key}`;
      const name = document.createElement("span");
      name.textContent = dimLabel(kind, key);
      const value = document.createElement("span");
      value.textContent = cmText(dims[key]);
      label.append(name, value);

      const input = document.createElement("input");
      input.type = "range";
      input.id = `${prefix}-${key}`;
      input.min = String(meta.min);
      input.max = String(meta.max);
      input.step = String(meta.step);
      input.value = String(dims[key]);
      input.addEventListener("input", () => {
        dims[key] = clamp(Number(input.value), meta.min, meta.max);
        value.textContent = cmText(dims[key]);
        onChange();
      });
      host.append(label, input);
    });
  }

  function pieceDims(piece) {
    const registered = pieceSet(piece);
    if (registered) return registered.dims;
    return (piece && piece.dims) || PIECE_DIMS[piece && piece.type] || null;
  }

  function pieceSet(piece) {
    if (!piece || !piece.setId || !state.project) return null;
    return (state.project.sets || []).find((t) => t.id === piece.setId) || null;
  }

  // その奥行きでの「実寸1mあたりの画素」。横と縦で尺が違う（正面図のみ）
  function perMetre(pos, L) {
    if (L.plan) return { x: L.pxPerM, y: L.pxPerM };
    return { x: L.pxPerM * pos.scale, y: L.pxPerMv * pos.scale * (pos.stretch || 1) };
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
      kind: raw.kind === "section" ? "section" : "scene",
      depth: clamp(finite(raw.depth, 0), 0, MAX_DEPTH),
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
    // 字下げは「前の行より2段以上深い」ことがないように詰める
    let prevDepth = -1;
    scenes.forEach((scene) => {
      scene.depth = Math.min(scene.depth, prevDepth + 1);
      prevDepth = scene.depth;
    });
    if (!scenes.some((x) => x.kind === "scene")) scenes.push(newScene("場面 1", false));
    const wanted = scenes.find((x) => x.id === rawProject.activeSceneId && x.kind === "scene");
    const activeId = wanted ? wanted.id : scenes.find((x) => x.kind === "scene").id;

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
              name: typeof c.name === "string" && c.name.trim() ? c.name.slice(0, 24) : `演者 ${i + 1}`,
              color: validColor(c.color, "#a84b26"),
              heightCm: clamp(finite(c.heightCm, DEFAULT_HEIGHT_CM), 120, 210),
              note: typeof c.note === "string" ? c.note.slice(0, 200) : "",
            }))
          : [],
        sets: Array.isArray(rawProject.sets)
          ? rawProject.sets.slice(0, 60).map((t, i) => {
              const kind = SET_KINDS[t && t.kind] ? t.kind : (t && t.kind === "ring" ? "sphere" : "block");
              return {
                id: typeof t.id === "string" ? t.id : rid("set"),
                kind,
                name: typeof t.name === "string" && t.name.trim() ? t.name.slice(0, 24) : `セット ${i + 1}`,
                color: validColor(t.color, "#8b98a1"),
                dims: normalizeDims(kind, t),
                note: typeof t.note === "string" ? t.note.slice(0, 200) : "",
              };
            })
          : [],
        rigs: Array.isArray(rawProject.rigs)
          ? rawProject.rigs.slice(0, 40).map((r, i) => ({
              id: typeof r.id === "string" ? r.id : rid("rig"),
              name: typeof r.name === "string" && r.name.trim() ? r.name.slice(0, 24) : `装置の型 ${i + 1}`,
              pieces: Array.isArray(r.pieces)
                ? r.pieces.slice(0, 120).map((piece, k) => normalizePiece(piece, k))
                : [],
            }))
          : [],
        scenes,
        activeSceneId: activeId,
      },
      showFront: raw.showFront === undefined ? true : Boolean(raw.showFront),
      showPlan: raw.showPlan === undefined ? true : Boolean(raw.showPlan),
      showNames: raw.showNames === undefined ? true : Boolean(raw.showNames),
      showSeatMap: raw.showSeatMap === undefined ? true : Boolean(raw.showSeatMap),
      frontPan: clamp(finite(raw.frontPan, 0), -1, 1),
      frontPanY: clamp(finite(raw.frontPanY, 0), -1, 1),
      closedSections: (raw.closedSections && typeof raw.closedSections === "object" && !Array.isArray(raw.closedSections))
        ? raw.closedSections : {},
      cursorRowId: typeof raw.cursorRowId === "string" ? raw.cursorRowId : null,
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

    /* 尺は縦と横で同じにする。
     * 床の1m枡、演者の身長、セットの実寸が同じものさしで測られていないと、
     * 寸法を持たせた意味がない（幅1m×高さ2.4mの塔が正方形に見える）。
     * 以前は横を間口から、縦を奥の壁の高さから別々に取っていたため、
     * 同じ1mが2.5倍ずれていた。
     *
     * 尺は「間口が画面に収まる値」と「舞台の高さが収まる値」の小さい方。
     * seat.backW / seat.frontW は絶対値ではなく、手前と奥の倍率差として使う。
     */
    const span = seat.frontW / seat.backW;              // 手前は奥の何倍に見えるか
    const headroom = Math.max(24, seat.floorY - 22);     // 奥の壁の上に残す余白
    const byWidth = (W * seat.frontW) / size.width;
    const byHeight = headroom / ((size.height || 8) / span);
    const pxPerM = Math.min(byWidth, byHeight);
    const frontW = pxPerM * size.width;

    /* 舞台が一度に画面へ入らない席では、掴んで視線を動かせるようにする。
     *
     * 左右は像をずらす（客席の中で少し身体をずらす感じ）。
     * 上下は「その場で首を上げ下げする」。像を平行移動させるのではなく、
     * 目の位置は変えずに視線の角度だけ変える。見上げれば足元が詰まって
     * 頭上が伸びる——これは平行移動では出ない。
     *
     * やり方は、いったん水平に見たときの画面をこしらえてから、
     * それをピンホールの式で傾け直す。目の高さ（＝床の線）を原点に取り、
     *   t  = (y - 目の高さ) / 焦点距離
     *   y' = 目の高さ + 焦点距離 ×(t·cosφ + sinφ) / (cosφ − t·sinφ)
     * 焦点距離は「舞台までの距離 × 1mあたりの画素」。席が近いほど
     * 焦点距離が長くなり、同じ角度でも見え方が大きく動く。 */
    const panRange = Math.max(0, (frontW - W) / 2);
    const height = size.height || 8;
    const horizon = seat.floorY;
    const focal = Math.max(120, (seat.eye || 10) * pxPerM);
    const panY = clamp(state.frontPanY || 0, -1, 1);
    const phi = (panY > 0 ? panY * TILT_UP : panY * TILT_DOWN) * Math.PI / 180;
    const cs = Math.cos(phi);
    const sn = Math.sin(phi);

    const tilt = (y) => {
      if (!phi) return y;
      const t = (y - horizon) / focal;
      const den = cs - t * sn;
      // 地平線の向こうへ回り込んだ点は、画面の外へ飛ばす
      if (den <= 0.02) return sn > 0 ? -1e5 : 1e5;
      return horizon + (focal * (t * cs + sn)) / den;
    };
    const untilt = (y) => {
      if (!phi) return y;
      const u = (y - horizon) / focal;
      const den = cs + u * sn;
      if (Math.abs(den) < 1e-4) return y;
      return horizon + (focal * (u * cs - sn)) / den;
    };

    return {
      plan: false, venue: v, size, seat,
      // 傾けた後の位置。舞台の枠や床の帯はこれを見る
      backY: tilt(seat.floorY - (height * pxPerM) / span),
      floorY: tilt(seat.floorY),
      bottomY: tilt(seat.bottomY),
      apronBottom: tilt(seat.bottomY + (seat.apron || 0)),
      // 傾ける前の位置。駒はここから実寸で積み上げてから傾ける
      rawFloorY: seat.floorY,
      rawBottomY: seat.bottomY,
      tilt,
      untilt,
      backW: frontW / span,
      frontW,
      shift: (seat.shift || 0) * W * 0.5,
      centerX: W / 2 + clamp(state.frontPan || 0, -1, 1) * panRange,
      panRange,
      panRangeY: 1,
      pxPerM,
      pxPerMv: pxPerM,   // 縦横で同じ。名前は呼び出し側の互換のために残す
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
    // 首振りは最後にかける。実寸を積み上げるのは「傾ける前」の座標の上で行う
    const rawY = L.rawFloorY + v * (L.rawBottomY - L.rawFloorY);
    const halfW = (L.backW + v * (L.frontW - L.backW)) / 2;
    // 横の席では、奥ほど横へ流れる。手前は席の正面なのでずれない
    const slide = (L.shift || 0) * (1 - v);
    const rise = (L.seat && L.seat.rise) || 0;
    return {
      x: L.centerX + slide + (u - 0.5) * halfW * 2,
      y: L.tilt(rawY),
      rawY,
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
    const raw = L.untilt(y);
    const v = clamp((raw - L.rawFloorY) / (L.rawBottomY - L.rawFloorY), 0, 1);
    const halfW = (L.backW + v * (L.frontW - L.backW)) / 2;
    const slide = (L.shift || 0) * (1 - v);
    return { u: clamp((x - L.centerX - slide) / (halfW * 2) + 0.5, 0, 1), v };
  }

  // 実寸（m）から画面上の高さを出す。size は基準に対する倍率
  function pieceScale(piece, pos, L) {
    const meters = pieceHeightM(piece) * (piece.size / 100);
    // 尺は縦横で同じ。床の1m枡と同じものさしで測る
    const px = meters * L.pxPerM * (L.plan ? 1 : pos.scale);
    // 元の描画は「人物=約155px」で描かれているので、それに合わせる
    return px / (piece.type === "performer" ? 155 : piece.type === "block" ? 84 : piece.type === "sphere" ? 118 : 170);
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
    renderSets();
    renderLights();
    renderRigs();
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

  /* ---------- 演者と物の描画 ---------- */

  /* ---------- 物の上に乗る ----------
     台やテーブルの上へ置いたものは、その上面の高さから立ち上がる。
     床からの高さ（base, m）は置き場所から決まる派生値なので、状態として
     持ち回さず、描く前に毎回引き直す。 */

  /* その駒の「上面」の高さ（自分の足元から、m）。
   * 何の上にでも物を置けるようにするので、演者の頭の上も上面として扱う。 */
  function pieceTopLocal(piece) {
    if (piece.type === "light") return 0;
    if (piece.type === "performer") {
      return poseExtent(piece.pose).top * pieceHeightM(piece) * (piece.size / 100);
    }
    const d = pieceDims(piece);
    if (!d) return 0;
    if (piece.type === "chair") return d.h * 0.5;      // 座面
    if (piece.type === "sphere") return d.lift + d.dia;
    return d.h;
  }

  // 床でどれだけの面積を取るか（m）。中心のずれも返す（寝ている演者などで効く）
  function supportFootprint(piece) {
    if (piece.type === "light") return null;
    if (piece.type === "performer") {
      const H = pieceHeightM(piece) * (piece.size / 100);
      const ext = poseExtent(piece.pose);
      return { w: ext.halfX * 2 * H, d: ext.halfZ * 2 * H, cx: ext.cx * H, cz: ext.cz * H };
    }
    const foot = pieceFootprint(piece);
    return foot ? { w: foot.w, d: foot.d, cx: 0, cz: 0 } : null;
  }

  /* (u,v) の真下にあるもののうち、いちばん高い上面。
   * 候補は「自分より先に並んでいるもの」だけ。互いを支えにすると高さが
   * 際限なく積み上がるので、並び順で循環を断つ。
   * 動かしている駒は並びの最後へ回すので、必ず重なった相手の上に乗る。 */
  function supportUnder(piece, size, candidates) {
    let top = 0;
    let holder = null;
    candidates.forEach((other) => {
      if (other === piece) return;
      const foot = supportFootprint(other);
      if (!foot) return;
      const rad = ((other.facing || 0) * Math.PI) / 180;
      const dw = (piece.u - other.u) * size.width;
      const dd = -(piece.v - other.v) * size.depth;   // 奥へ行くほど v は小さい
      const lx = dw * Math.cos(rad) + dd * Math.sin(rad) - foot.cx;
      const ly = -dw * Math.sin(rad) + dd * Math.cos(rad) - foot.cz;
      if (Math.abs(lx) > foot.w / 2 || Math.abs(ly) > foot.d / 2) return;
      const t = (other.base || 0) + pieceTopLocal(other);
      if (t > top) { top = t; holder = other.id; }
    });
    return { top, holder };
  }

  // 全部の駒の床からの高さを引き直す。先に並んでいるものから順に決めるので一巡で足りる
  function refreshBases(size) {
    const pieces = sc().pieces;
    pieces.forEach((piece, i) => {
      if (piece.type === "light") { piece.base = 0; piece.supportId = null; return; }
      const found = supportUnder(piece, size, pieces.slice(0, i));
      piece.base = found.top;
      piece.supportId = found.holder;
    });
  }

  /* 動かし始めた駒を並びのいちばん後ろへ回す。重なった相手の上に乗るため。
   * ただし、その駒に乗っているものは一緒に連れていく。
   * 連れていかないと、下の台をずらしただけで台が上の演者へ乗ってしまう。 */
  function bringToTop(piece) {
    const arr = sc().pieces;
    const carried = new Set([piece.id]);
    const load = [];
    arr.forEach((p) => {
      if (p === piece) return;
      if (p.supportId && carried.has(p.supportId)) { carried.add(p.id); load.push(p); }
    });
    const rest = arr.filter((p) => p !== piece && !carried.has(p.id));
    sc().pieces = rest.concat([piece], load);
  }

  // 駒の足元の画面位置。台に乗っていればその分だけ持ち上げる
  function placePiece(piece, L) {
    const pos = place(piece.u, piece.v, L);
    const base = piece.base || 0;
    if (!base || L.plan) return pos;
    const rawY = pos.rawY - base * perMetre(pos, L).y;
    return Object.assign({}, pos, { rawY, y: L.tilt(rawY) });
  }

  /* 演者の関節を、画面の座標へ落とす。
   * 向きの角度だけ鉛直軸まわりに回してから、正射影で潰す。
   *   画面横 = x·cosθ + z·sinθ
   *   奥行き = -x·sinθ + z·cosθ （大きいほど客席に近い。重なりの順に使う）
   * θ=0 で客席を向く。 */
  /* 骨格を画面の座標へ落とす。姿勢・向き・尺・原点を渡せば、舞台の絵でも
   * 見本の絵でも同じ手順で組める。
   *   画面横 = x·cosθ + z·sinθ
   *   奥行き = -x·sinθ + z·cosθ （大きいほど手前。重なりの順に使う）
   * zDrop は「手前へ出た部位ほど少し下に来る」ぶん。舞台では床と同じ傾きを使う。 */
  function buildRig(poseId, originX, originY, ux, uy, yaw, zDrop, tilt) {
    const bend = tilt || ((y) => y);
    const pose = poseById(poseId);
    const joints = pose.joints;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const project = (jx, jy, jz) => {
      const wz = -jx * sin + jz * cos;
      // 実寸ぶんを積み上げてから傾ける。順を逆にすると、見上げても人の丈が変わらない
      return { x: originX + (jx * cos + jz * sin) * ux, y: bend(originY - jy * uy + wz * zDrop), z: wz };
    };
    const P = {};
    Object.keys(joints).forEach((k) => { P[k] = project(joints[k][0], joints[k][1], joints[k][2]); });

    /* 胴の厚み。肩・くびれ・腰の3段の断面を体の軸に沿って積み、その角を全部
     * 投影して外側をなぞる。断面の面は体の軸に直交させるので、寝ている姿勢では
     * 厚みが上下方向に出る。幅がどちらを向くかは姿勢が持つ（横向きは上下）。 */
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const shMid = mid(joints.shL, joints.shR);
    const hipMid = mid(joints.hipL, joints.hipR);
    const axis = norm3([hipMid[0] - shMid[0], hipMid[1] - shMid[1], hipMid[2] - shMid[2]]);
    const w0 = pose.wide;
    const dot = w0[0] * axis[0] + w0[1] * axis[1] + w0[2] * axis[2];
    let wide = norm3([w0[0] - axis[0] * dot, w0[1] - axis[1] * dot, w0[2] - axis[2] * dot]);
    if (!isFinite(wide[0])) wide = [0, 0, 1];
    const deep = norm3(cross3(axis, wide));

    const box = [];
    TORSO_RINGS.forEach((ring) => {
      const c = [
        shMid[0] + (hipMid[0] - shMid[0]) * ring.t,
        shMid[1] + (hipMid[1] - shMid[1]) * ring.t,
        shMid[2] + (hipMid[2] - shMid[2]) * ring.t,
      ];
      [-1, 1].forEach((sw) => [-1, 1].forEach((sd) => {
        box.push(project(
          c[0] + wide[0] * ring.halfX * sw + deep[0] * ring.rz * sd,
          c[1] + wide[1] * ring.halfX * sw + deep[1] * ring.rz * sd,
          c[2] + wide[2] * ring.halfX * sw + deep[2] * ring.rz * sd));
      }));
    });

    // 顔の印を出す先。頭から顔の向きへ少しだけ進んだところ
    const f = pose.face;
    const head = joints.head;
    const faceAt = project(head[0] + f[0] * 0.05, head[1] + f[1] * 0.05, head[2] + f[2] * 0.05);
    return { P, box, ux, uy, faceAt, facing: f };
  }

  function performerRig(piece, pos, L) {
    const H = pieceHeightM(piece) * (piece.size / 100);
    const per = perMetre(pos, L);
    const zDrop = L.plan ? 0 : ((L.bottomY - L.floorY) / (L.size.depth || 9)) * H;
    const rig = buildRig(piece.pose, pos.x, pos.rawY === undefined ? pos.y : pos.rawY,
      H * per.x, H * per.y, ((piece.facing || 0) * Math.PI) / 180, zDrop, L.plan ? null : L.tilt);
    rig.per = per;
    rig.H = H;
    return rig;
  }

  /* 骨格から体を塗る。手足は付け根から先へ細くなる線、胴は肩・くびれ・腰の
   * 断面を積んだ立体の外周。奥にあるものから塗り、奥の手足は色を沈ませる。
   * 舞台の絵でも姿勢の見本でも、ここを通す。 */
  function paintBody(target, rig, color) {
    const P = rig.P;
    const ux = rig.ux;
    const uy = rig.uy;

    const parts = LIMBS.map((limb) => ({
      kind: "limb", limb,
      z: limb.pts.reduce((t, k) => t + P[k].z, 0) / limb.pts.length,
    }));
    parts.push({ kind: "torso", z: (P.shL.z + P.shR.z + P.hipL.z + P.hipR.z) / 4 });
    parts.push({ kind: "head", z: P.head.z + 0.002 });
    parts.sort((a, b) => a.z - b.z);

    parts.forEach((part) => {
      if (part.kind === "limb") {
        const far = part.z < -0.02;
        target.fillStyle = far ? mixToward(color, 0.26) : color;
        const taper = LIMB_TAPER[part.limb.kind];
        taperedChain(target, part.limb.pts.map((k) => P[k]), taper.map((r) => Math.max(0.8, r * ux)));
        return;
      }
      if (part.kind === "torso") {
        target.fillStyle = color;
        taperedChain(target,
          [{ x: (P.shL.x + P.shR.x) / 2, y: (P.shL.y + P.shR.y) / 2 }, P.neck],
          [Math.max(0.8, 0.036 * ux), Math.max(0.8, 0.03 * ux)]);
        softClosedPath(target, convexHull(rig.box));
        target.fill();
        return;
      }
      target.fillStyle = color;
      target.strokeStyle = rgba(color, 0.35);
      target.lineWidth = Math.max(0.6, uy / 110);
      target.beginPath();
      target.ellipse(P.head.x, P.head.y, Math.max(1.2, 0.05 * ux), Math.max(1.2, 0.066 * uy), 0, 0, Math.PI * 2);
      target.fill();
      target.stroke();
      // 顔の印。顔がこちら側を向いているときだけ出す
      if (rig.faceAt.z >= P.head.z - 0.002 && 0.05 * ux > 3) {
        target.fillStyle = rgba("#0d0c0b", 0.5);
        target.beginPath();
        target.arc(rig.faceAt.x, rig.faceAt.y, Math.max(1, 0.012 * ux), 0, Math.PI * 2);
        target.fill();
      }
    });
  }

  // 正面から見た演者
  function drawPerformer(target, piece, pos, scale, L) {
    const rig = performerRig(piece, pos, L);
    const P = rig.P;
    target.save();

    // 影。いちばん低い関節の真下へ落とす
    let low = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    Object.keys(P).forEach((k) => {
      low = Math.max(low, P[k].y);
      minX = Math.min(minX, P[k].x);
      maxX = Math.max(maxX, P[k].x);
    });
    target.fillStyle = "rgba(0,0,0,0.26)";
    target.beginPath();
    target.ellipse((minX + maxX) / 2, low + 0.012 * rig.uy,
      Math.max(3, (maxX - minX) / 2 + 0.03 * rig.ux), Math.max(1.2, 0.022 * rig.uy), 0, 0, Math.PI * 2);
    target.fill();

    paintBody(target, rig, piece.color);
    target.restore();
  }


  /* 舞台の床の上のある一点を、画面のどこに置くかを実寸で引く。
   * 駒の中心 (u,v) から、間口方向へ dw メートル、奥方向へ dd メートル
   * ずれた床の点を返す。place() をそのまま通すので、床の1m枡と必ず一致する。
   * 以前は固定の斜めベクトル一本で奥行きを表していたため、舞台の左右どちらに
   * 置いても同じ角度に倒れてしまい、平面図と食い違っていた。 */
  function floorPoint(piece, dw, dd, L) {
    const u = piece.u + dw / L.size.width;
    const v = piece.v - dd / L.size.depth;      // 奥へ行くほど v は小さい
    const p = place(u, v, L);
    // 台の上に乗っていれば、四隅ごとその高さから立ち上げる
    const base = piece.base || 0;
    if (!base || L.plan) return p;
    const rawY = p.rawY - base * perMetre(p, L).y;
    return Object.assign({}, p, { rawY, y: L.tilt(rawY) });
  }

  /* 直方体の部品をひとつ塗る。部品の中心は駒の中心から (ox, oz) メートルずれ、
   * 床から lift メートル浮いた位置に、幅 w・奥行き d・高さ h で立つ。
   * 四隅は place() で床の点として引くので、床の1m枡と遠近が一致する。 */
  function paintBox(target, piece, L, part) {
    const rad = ((piece.facing || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const at = (ux, uy) => {
      const lx = part.ox + ux;
      const ly = part.oz + uy;
      const dw = lx * cos - ly * sin;
      const dd = lx * sin + ly * cos;
      const p = floorPoint(piece, dw, dd, L);
      const per = perMetre(p, L);
      const bend = L.plan ? ((y) => y) : L.tilt;
      const raw = p.rawY === undefined ? p.y : p.rawY;
      return {
        x: p.x,
        y: bend(raw - part.lift * per.y),
        top: bend(raw - (part.lift + part.h) * per.y),
        depth: dd,
      };
    };
    const hw = part.w / 2;
    const hd = part.d / 2;
    const base = [at(-hw, -hd), at(hw, -hd), at(hw, hd), at(-hw, hd)];
    const top = base.map((c) => ({ x: c.x, y: c.top }));
    const tint = part.tint === undefined ? 1 : part.tint;

    target.strokeStyle = rgba(piece.color, 0.28 * tint);
    target.lineWidth = 1.5;

    /* 側面のうち、客席へ顔を向けている面だけを塗る。
     * 面 i→j の外向き法線は、辺ベクトル e に対して (e.y, -e.x)。
     * その y 成分が負（＝客席側を向く）なら見えている。 */
    const faces = [];
    for (let i = 0; i < 4; i += 1) {
      const j = (i + 1) % 4;
      const ex = base[j].x - base[i].x;
      const ey = base[j].depth - base[i].depth;
      const len = Math.hypot(ex, ey) || 1;
      const lit = ex / len;                       // 1=真正面、0=真横、負=裏
      if (lit <= 0.001) continue;
      faces.push({ i, j, lit, mid: (base[i].depth + base[j].depth) / 2 });
    }
    faces.sort((a, b) => b.mid - a.mid);          // 奥の面から先に塗る

    faces.forEach((f) => {
      target.fillStyle = rgba(piece.color, (0.46 + f.lit * 0.54) * tint);
      target.beginPath();
      target.moveTo(base[f.i].x, base[f.i].y);
      target.lineTo(base[f.j].x, base[f.j].y);
      target.lineTo(top[f.j].x, top[f.j].y);
      target.lineTo(top[f.i].x, top[f.i].y);
      target.closePath();
      target.fill();
      target.stroke();
    });

    // 天面
    target.fillStyle = rgba(piece.color, 0.78 * tint);
    target.beginPath();
    top.forEach((c, i) => (i ? target.lineTo(c.x, c.y) : target.moveTo(c.x, c.y)));
    target.closePath();
    target.fill();
    target.stroke();
  }

  /* 台・テーブル・椅子は、直方体の部品の組み合わせとして持つ。
   * 部品はそれぞれ実寸なので、天板の厚みや脚の太さも寸法に連動して変わる。 */
  function pieceParts(piece) {
    const d = pieceDims(piece);
    if (!d) return null;
    if (piece.type === "block") {
      return [{ ox: 0, oz: 0, w: d.w, d: d.d, h: d.h, lift: 0, tint: 1 }];
    }
    if (piece.type === "table") {
      const top = clamp(d.h * 0.09, 0.03, 0.08);              // 天板の厚み
      const leg = clamp(Math.min(d.w, d.d) * 0.07, 0.04, 0.1); // 脚の太さ
      const inset = leg * 1.2;
      const parts = [];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => parts.push({
        ox: sx * (d.w / 2 - inset - leg / 2),
        oz: sy * (d.d / 2 - inset - leg / 2),
        w: leg, d: leg, h: Math.max(0.05, d.h - top), lift: 0, tint: 0.7,
      }));
      parts.push({ ox: 0, oz: 0, w: d.w, d: d.d, h: top, lift: Math.max(0, d.h - top), tint: 1 });
      return parts;
    }
    if (piece.type === "chair") {
      const H = d.h;                       // 背もたれの上端まで
      const w = H * CHAIR_W;
      const dp = H * CHAIR_D;
      const seatH = H * 0.5;               // 座面の高さ
      const slab = clamp(H * 0.055, 0.025, 0.06);
      const leg = clamp(H * 0.05, 0.022, 0.055);
      const parts = [];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => parts.push({
        ox: sx * (w / 2 - leg / 2), oz: sy * (dp / 2 - leg / 2),
        w: leg, d: leg, h: Math.max(0.05, seatH - slab), lift: 0, tint: 0.66,
      }));
      // 座面
      parts.push({ ox: 0, oz: 0, w, d: dp, h: slab, lift: Math.max(0, seatH - slab), tint: 0.95 });
      // 背もたれ。facing=0 で客席を向くので、背は奥側（oz が正）へ置く
      parts.push({ ox: 0, oz: dp / 2 - slab / 2, w, d: slab, h: Math.max(0.05, H - seatH), lift: seatH, tint: 0.84 });
      return parts;
    }
    return null;
  }

  /* 正面図の右上に、客席のどこから見ているかを小さな平面で出す。
   * 正面の絵だけでは「どこから見た絵か」が字でしか分からないので、図で示す。
   * 額縁のある劇場（客席が正面だけ）でのみ意味を持つので、そこに限る。 */
  function drawSeatMap(target, L) {
    const seat = L.seat;
    if (!seat || !seat.plan) return;
    const pad = 22;
    const w = 214;
    const h = 152;
    const x = W - w - pad;
    const y = pad;

    target.save();
    // 下の絵が透けないよう、いったん敷く
    target.fillStyle = "rgba(9,8,7,0.82)";
    target.fillRect(x, y, w, h);
    target.strokeStyle = "rgba(156,130,63,0.34)";
    target.lineWidth = 1;
    target.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    const inX = x + 14;
    const inW = w - 28;
    const stageH = 30;
    const stageY = y + 14;
    const houseY = stageY + stageH + 8;
    const balconyH = 26;
    const houseH = h - (houseY - y) - balconyH - 20;

    // 舞台
    target.fillStyle = "rgba(168,75,38,0.3)";
    target.fillRect(inX, stageY, inW, stageH);
    target.strokeStyle = "rgba(168,75,38,0.55)";
    target.strokeRect(inX + 0.5, stageY + 0.5, inW - 1, stageH - 1);
    target.fillStyle = "rgba(239,231,214,0.62)";
    target.font = "11px 'Hiragino Kaku Gothic ProN', sans-serif";
    target.textAlign = "center";
    target.textBaseline = "middle";
    target.fillText("舞台", inX + inW / 2, stageY + stageH / 2);

    // 1階席と2階席
    target.fillStyle = "rgba(239,231,214,0.06)";
    target.fillRect(inX, houseY, inW, houseH);
    target.strokeStyle = "rgba(239,231,214,0.16)";
    target.strokeRect(inX + 0.5, houseY + 0.5, inW - 1, houseH - 1);
    const balconyY = houseY + houseH + 6;
    target.fillStyle = "rgba(239,231,214,0.04)";
    target.fillRect(inX, balconyY, inW, balconyH);
    target.strokeRect(inX + 0.5, balconyY + 0.5, inW - 1, balconyH - 1);
    target.fillStyle = "rgba(239,231,214,0.3)";
    target.font = "9.5px 'Hiragino Kaku Gothic ProN', sans-serif";
    target.fillText("2階", inX + inW / 2, balconyY + balconyH / 2);

    // 見ている位置
    const onBalcony = seat.plan.tier === "balcony";
    const px = inX + seat.plan.x * inW;
    const py = onBalcony
      ? balconyY + balconyH / 2
      : houseY + seat.plan.y * houseH;

    // 視線。舞台の中心へ向かう三角で、どちらを向いているかを出す。
    // 見回している席では、振ったぶんだけ狙いをずらす
    const aim = L.panRange > 0 ? -clamp(state.frontPan || 0, -1, 1) : 0;
    const tx = inX + inW * (0.5 + aim * 0.42);
    const ty = stageY + stageH / 2;
    const ang = Math.atan2(ty - py, tx - px);
    const spread = 0.34;
    const reach = Math.hypot(tx - px, ty - py);
    const cone = target.createLinearGradient(px, py, tx, ty);
    cone.addColorStop(0, "rgba(211,172,89,0.3)");
    cone.addColorStop(1, "rgba(211,172,89,0.02)");
    target.fillStyle = cone;
    target.beginPath();
    target.moveTo(px, py);
    target.lineTo(px + Math.cos(ang - spread) * reach, py + Math.sin(ang - spread) * reach);
    target.lineTo(px + Math.cos(ang + spread) * reach, py + Math.sin(ang + spread) * reach);
    target.closePath();
    target.fill();

    target.fillStyle = "#d3ac59";
    target.beginPath();
    target.arc(px, py, 4.5, 0, Math.PI * 2);
    target.fill();

    // 席の名前
    target.fillStyle = "rgba(239,231,214,0.72)";
    target.font = "10.5px 'Hiragino Kaku Gothic ProN', sans-serif";
    target.textBaseline = "top";
    target.fillText(seat.label, x + w / 2, balconyY + balconyH + 5);
    target.restore();
  }

  // 台・テーブル・椅子。部品を奥から順に塗る
  function drawSolid(target, piece, pos, scale, L) {
    const parts = pieceParts(piece);
    if (!parts) return;
    target.save();

    // 影は床の占有面積そのまま
    const foot = pieceFootprint(piece);
    if (foot) {
      const rad = ((piece.facing || 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      target.fillStyle = "rgba(0,0,0,0.3)";
      target.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], i) => {
        const lx = (sx * foot.w) / 2;
        const ly = (sy * foot.d) / 2;
        const p = floorPoint(piece, lx * cos - ly * sin, lx * sin + ly * cos, L);
        if (i) target.lineTo(p.x, p.y + 3); else target.moveTo(p.x, p.y + 3);
      });
      target.closePath();
      target.fill();
    }

    parts.forEach((part) => paintBox(target, piece, L, part));
    target.restore();
  }

  // 球。直径と、床からの高さを実寸（m）で持つ。
  // 床から離れている場合は、どれだけ浮いているかを破線の目安で示す。
  function drawSphere(target, piece, pos, scale, L) {
    const dim = pieceDims(piece);
    const per = perMetre(pos, L);
    const bend = L.plan ? ((y) => y) : L.tilt;
    const raw = pos.rawY === undefined ? pos.y : pos.rawY;
    const rx = Math.max(4, (dim.dia / 2) * per.x);
    const ry = Math.max(4, (dim.dia / 2) * per.y);
    // 中心の高さを傾ける前に決めてから傾ける。上下の半径は傾け後の差から取る
    const cy = bend(raw - dim.lift * per.y - ry);
    const ryTilt = Math.max(3, Math.abs(bend(raw - dim.lift * per.y) - cy));

    target.save();
    target.fillStyle = "rgba(0,0,0,0.3)";
    target.beginPath();
    target.ellipse(pos.x, pos.y + 5, rx * 1.02, Math.max(3, ry * 0.22), 0, 0, Math.PI * 2);
    target.fill();

    if (dim.lift > 0.05) {
      target.strokeStyle = rgba(piece.color, 0.34);
      target.lineWidth = 1.5;
      target.setLineDash([5, 5]);
      target.beginPath();
      target.moveTo(pos.x, pos.y);
      target.lineTo(pos.x, cy + ryTilt);
      target.stroke();
      target.setLineDash([]);
    }

    // 丸みは陰影で出す。左上から光が当たっているものとして、右下へ落とす
    const shade = target.createRadialGradient(
      pos.x - rx * 0.36, cy - ryTilt * 0.4, Math.max(1, rx * 0.08),
      pos.x, cy, Math.max(rx, ryTilt));
    shade.addColorStop(0, rgba(piece.color, 1));
    shade.addColorStop(0.55, rgba(piece.color, 0.88));
    shade.addColorStop(1, rgba(piece.color, 0.42));
    target.fillStyle = shade;
    target.strokeStyle = rgba(piece.color, 0.3);
    target.lineWidth = 1.5;
    target.beginPath();
    target.ellipse(pos.x, cy, rx, ryTilt, 0, 0, Math.PI * 2);
    target.fill();
    target.stroke();
    target.restore();
  }

  function drawLight(target, piece, pos, scale, L) {
    // 明かりの差し渡しを実寸（m）で持つ。床の1m枡で広さを読めるようにするため
    const dim = pieceDims(piece);
    const per = perMetre(pos, L);
    const spread = Math.max(6, ((dim && dim.dia) || 4) / 2 * per.x);
    const topWidth = Math.max(3, spread * 0.2);
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

  // 平面図。上から見るので、肩幅と向きが読めるように描く。
  // 実寸で描く: 肩幅は身長のおよそ1/4、厚みはその半分ほど。
  function drawPlanPiece(target, piece, pos, scale, L) {
    target.save();
    if (piece.type === "performer") {
      // 姿勢ごとの実際の占有範囲で描く。寝ていれば床を長く取る
      const H = pieceHeightM(piece) * (piece.size / 100);
      const ext = poseExtent(piece.pose);
      const halfW = Math.max(4, ext.halfX * H * L.pxPerM);
      const halfD = Math.max(4, ext.halfZ * H * L.pxPerM);
      const rad = ((piece.facing || 0) * Math.PI) / 180;
      target.translate(pos.x, pos.y);
      /* 0度＝客席（画面の下）を向く。
       * 平面は「上が奥・下が客席」なので、正面図と同じ回り方にするには符号が逆になる。
       * rotate(+θ) にすると、向き90°の演者が正面図では右を向くのに
       * 平面図の三角は左を指す。 */
      target.rotate(-rad);
      target.translate(ext.cx * H * L.pxPerM, ext.cz * H * L.pxPerM);
      target.fillStyle = piece.color;
      target.strokeStyle = "rgba(0,0,0,0.4)";
      target.lineWidth = 1.4;
      target.beginPath();
      target.ellipse(0, 0, halfW, halfD, 0, 0, Math.PI * 2);
      target.fill();
      target.stroke();
      // 向きの印。体の前側へ出す
      target.fillStyle = "rgba(13,12,11,0.55)";
      target.beginPath();
      target.moveTo(-halfW * 0.3, halfD * 0.4);
      target.lineTo(halfW * 0.3, halfD * 0.4);
      target.lineTo(0, halfD * 1.35);
      target.closePath();
      target.fill();
    } else if (SOLID_TYPES[piece.type]) {
      // 真上から見るので、幅と奥行きがそのまま床の占有面積になる。向きも効く
      const foot = pieceFootprint(piece);
      const w = Math.max(5, foot.w * L.pxPerM);
      const d = Math.max(5, foot.d * L.pxPerM);
      target.translate(pos.x, pos.y);
      target.rotate(-((piece.facing || 0) * Math.PI) / 180);   // 演者と同じ回り方にそろえる
      target.fillStyle = piece.color;
      target.fillRect(-w / 2, -d / 2, w, d);
      target.strokeStyle = "rgba(0,0,0,0.3)";
      target.lineWidth = 1.5;
      target.strokeRect(-w / 2, -d / 2, w, d);
      // 椅子は背もたれの側を濃くして、座る向きを分かるようにする。背は正面の反対側
      if (piece.type === "chair") {
        target.fillStyle = "rgba(13,12,11,0.4)";
        target.fillRect(-w / 2, -d / 2, w, d * 0.2);
      }
      // どちらが正面かの印
      target.fillStyle = "rgba(13,12,11,0.45)";
      target.beginPath();
      target.moveTo(-w * 0.13, d / 2);
      target.lineTo(w * 0.13, d / 2);
      target.lineTo(0, d / 2 + Math.min(w, d) * 0.32);
      target.closePath();
      target.fill();
    } else if (piece.type === "sphere") {
      const dim = pieceDims(piece);
      const r = Math.max(5, (dim.dia / 2) * L.pxPerM);
      target.fillStyle = rgba(piece.color, 0.9);
      target.strokeStyle = "rgba(0,0,0,0.3)";
      target.lineWidth = 1.5;
      target.beginPath();
      target.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      target.fill();
      target.stroke();
      // 浮いている球は、床に落ちる位置だけを点線で示す
      if (dim.lift > 0.05) {
        target.strokeStyle = rgba(piece.color, 0.4);
        target.lineWidth = 1;
        target.setLineDash([4, 4]);
        target.beginPath();
        target.arc(pos.x, pos.y, r * 1.28, 0, Math.PI * 2);
        target.stroke();
        target.setLineDash([]);
      }
    }
    target.restore();
  }

  function selectionBounds(piece, L) {
    const pos = placePiece(piece, L);
    const scale = pieceScale(piece, pos, L);
    const dim = pieceDims(piece);
    if (L.plan) {
      if (SOLID_TYPES[piece.type]) {
        const rad = ((piece.facing || 0) * Math.PI) / 180;
        const foot = pieceFootprint(piece);
        const w = foot.w * L.pxPerM;
        const d = foot.d * L.pxPerM;
        const ex = (Math.abs(w * Math.cos(rad)) + Math.abs(d * Math.sin(rad))) / 2;
        const ey = (Math.abs(w * Math.sin(rad)) + Math.abs(d * Math.cos(rad))) / 2;
        return { x: pos.x - ex, y: pos.y - ey, w: Math.max(12, ex * 2), h: Math.max(12, ey * 2) };
      }
      if (piece.type === "sphere") {
        const r = Math.max(10, (dim.dia / 2) * L.pxPerM);
        return { x: pos.x - r, y: pos.y - r, w: r * 2, h: r * 2 };
      }
      if (piece.type === "performer") {
        const H = pieceHeightM(piece) * (piece.size / 100);
        const ext = poseExtent(piece.pose);
        const rad = ((piece.facing || 0) * Math.PI) / 180;
        const c = Math.abs(Math.cos(rad));
        const sn = Math.abs(Math.sin(rad));
        const ex = Math.max(10, (ext.halfX * c + ext.halfZ * sn) * H * L.pxPerM);
        const ey = Math.max(10, (ext.halfX * sn + ext.halfZ * c) * H * L.pxPerM);
        return { x: pos.x - ex, y: pos.y - ey, w: ex * 2, h: ey * 2 };
      }
      const r = Math.max(10, (((dim && dim.dia) || 2) / 2) * L.pxPerM);
      return { x: pos.x - r, y: pos.y - r, w: r * 2, h: r * 2 };
    }
    const st = pos.stretch || 1;
    const per = perMetre(pos, L);
    if (piece.type === "light") {
      const r = Math.max(10, (((dim && dim.dia) || 4) / 2) * per.x);
      return { x: pos.x - r, y: pos.y - r * 0.32, w: r * 2, h: r * 0.64 };
    }
    if (SOLID_TYPES[piece.type]) {
      // 描画と同じ手順で四隅を引き、その外接矩形を枠にする
      const foot = pieceFootprint(piece);
      const height = dim.h;
      const rad = ((piece.facing || 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const xs = [];
      const ys = [];
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        const ux = (sx * foot.w) / 2;
        const uy = (sy * foot.d) / 2;
        const p = floorPoint(piece, ux * cos - uy * sin, ux * sin + uy * cos, L);
        xs.push(p.x);
        ys.push(p.y, p.y - height * perMetre(p, L).y);
      });
      const x0 = Math.min(...xs);
      const y0 = Math.min(...ys);
      return { x: x0, y: y0, w: Math.max(14, Math.max(...xs) - x0), h: Math.max(14, Math.max(...ys) - y0) };
    }
    if (piece.type === "sphere") {
      const rx = Math.max(7, (dim.dia / 2) * per.x);
      const ry = Math.max(7, (dim.dia / 2) * per.y);
      const top = pos.y - dim.lift * per.y - ry * 2;
      return { x: pos.x - rx, y: top, w: rx * 2, h: pos.y - top };
    }
    // 演者。描画と同じ手順で関節を投影し、その外接に手足の太さを足す
    const rig = performerRig(piece, pos, L);
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    Object.keys(rig.P).forEach((k) => {
      x0 = Math.min(x0, rig.P[k].x); x1 = Math.max(x1, rig.P[k].x);
      y0 = Math.min(y0, rig.P[k].y); y1 = Math.max(y1, rig.P[k].y);
    });
    const padX = 0.04 * rig.ux;
    const padY = 0.04 * rig.uy;
    return { x: x0 - padX, y: y0 - padY, w: Math.max(12, x1 - x0 + padX * 2), h: Math.max(12, y1 - y0 + padY * 2) };
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
    // fresh=false のときは今のパスへ足すだけにする（切り抜きの内側として使うため）。
    // ここで beginPath を呼ぶと、外枠ごと捨てて領域が反転してしまう。
    const floorPath = (fresh = true) => {
      if (fresh) target.beginPath();
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

    // 床の目盛りは実寸1mごと。平面図と同じ刻みにして、二つの図で同じ枡を数えられるようにする。
    // 広い舞台では線が混むので2mごとに間引く（平面図と同じ判断）。
    floorPath();
    target.clip();
    target.strokeStyle = "rgba(239,231,214,0.09)";
    target.lineWidth = 1;
    const stepW = L.size.width > 14 ? 2 : 1;
    const stepD = L.size.depth > 14 ? 2 : 1;
    for (let m = stepD; m < L.size.depth; m += stepD) {   // 奥行きの線（横に走る）
      const v = m / L.size.depth;
      const a = place(0, v, L);
      const b = place(1, v, L);
      target.beginPath();
      target.moveTo(a.x, a.y);
      target.lineTo(b.x, b.y);
      target.stroke();
    }
    for (let m = stepW; m < L.size.width; m += stepW) {   // 間口の線（奥へ走る）
      const u = m / L.size.width;
      const a = place(u, 0, L);
      const b = place(u, 1, L);
      target.beginPath();
      target.moveTo(a.x, a.y);
      target.lineTo(b.x, b.y);
      target.stroke();
    }
    target.restore();

    // ---- 舞台の立ち上がりとピット ----
    // 目線が床と同じ高さの席では、床が線に潰れるぶん、視界の下半分を
    // 舞台の立ち上がり（エプロンの前面）とその下の暗がりが占める。
    // ここを描かないと「床の上に人が並んだ絵」になり、見上げている感じが出ない。
    const apron = (L.seat && L.seat.apron) || 0;
    if (apron > 0 && !roundHouse) {
      const faceBottom = Math.min(H, L.apronBottom);
      const face = target.createLinearGradient(0, L.bottomY, 0, faceBottom);
      face.addColorStop(0, "#1b1512");
      face.addColorStop(1, "#0c0908");
      target.fillStyle = face;
      target.fillRect(0, L.bottomY, W, faceBottom - L.bottomY);
      target.strokeStyle = "rgba(239,231,214,0.18)";
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(0, L.bottomY);
      target.lineTo(W, L.bottomY);
      target.stroke();
      if (faceBottom < H - 2) {
        target.fillStyle = "#070606";
        target.fillRect(0, faceBottom, W, H - faceBottom);
      }
      label(target, "舞台の立ち上がり", 96, Math.min(faceBottom - 16, H - 14));
    }

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
    // 近い席では奥の面が画面の上へ抜ける（back.y が負）。その場合は天を塗らない。
    target.fillStyle = "#11100f";
    if (back.y > 0) target.fillRect(0, 0, W, back.y);
    if (v.frame) {
      /* 額縁はいちばん手前（v=1）の面にある。奥の壁の幅で描いていたころは、
       * 横の席にすると床が額縁の外へはみ出して、絵として破綻していた。
       * 手前の間口いっぱいに開いた枠として描く。横にずれる席でも、
       * 額縁だけは動かない（動くのは奥の壁と床の奥側）。 */
      const archX = L.centerX - L.frontW / 2;
      const archW = L.frontW;
      target.fillRect(0, 0, Math.max(0, archX), L.bottomY);
      const rightX = archX + archW;
      if (rightX < W) target.fillRect(rightX, 0, W - rightX, L.bottomY);
      // 額縁の輪郭は、額縁そのものが画面に収まっているときだけ引く。
      // 最前列のように額縁の外まで入り込んだ席では、引いても画面の外になる。
      if (archX > 2) {
        target.strokeStyle = "rgba(156,130,63,0.42)";
        target.lineWidth = 3;
        const frameTop = Math.max(back.y, -4);
        target.strokeRect(archX, frameTop, archW, L.bottomY - frameTop);
      }
    } else if (!roundHouse) {
      target.strokeStyle = "rgba(156,130,63,0.2)";
      target.lineWidth = 1;
      target.strokeRect(back.x, back.y, back.w, L.floorY - back.y);
    }

    // 袖は額縁より後に描く。額縁の塗りは奥の壁の幅で引いてあるため、
    // 先に描くと間口の外にある袖幕がそのまま覆われて見えなくなる。
    // ---- 舞台袖 ----
    // 袖は舞台の外側の空間。袖幕（レッグ）は間口の縁から外へ向かって垂れ、
    // その陰に舞台裏を隠す。内側の縁が間口の縁（u=0 と u=1）にそろうので、
    // 舞台の上に置いた演者が袖幕に食われることはない。
    // 幕は宙から吊るもので、天はボーダー幕に隠れて見えない。高さを奥行きごとに
    // 測って途中で切ると、床から生えた柱に見えてしまう。
    if (v.frame) {
      // 舞台の床にも背景の幕にも一切かからないようにする。
      // 画面全体から床の台形と奥の幕を抜いた残り＝袖の空間、が描画範囲になる。
      target.save();
      target.beginPath();
      target.rect(0, 0, W, H);
      floorPath(false);
      target.rect(back.x, back.y, back.w, L.floorY - back.y);
      target.clip("evenodd");

      const legTop = Math.min(back.y, L.floorY) - 2;
      const wingU = 2.2 / L.size.width;      // 袖幕1枚の見かけの幅は約2.2m

      // 袖の空間。作業灯がわずかに回る程度の明るさで、外へ行くほど闇に沈む
      [-1, 1].forEach((side) => {
        const edge = side < 0 ? 0 : W;
        const space = target.createLinearGradient(L.centerX, 0, edge, 0);
        space.addColorStop(0, "rgba(62,52,42,0.95)");
        space.addColorStop(0.55, "rgba(26,22,18,0.95)");
        space.addColorStop(1, "rgba(10,9,8,0.95)");
        target.fillStyle = space;
        target.fillRect(Math.min(L.centerX, edge), legTop, Math.abs(edge - L.centerX), L.bottomY - legTop);
      });

      // 袖幕。奥の対から順に重ね、手前の対が奥の対を隠していく。
      // 残った内側の縁が階段状に並び、それが袖の奥行きになる。
      for (let i = 0; i < 3; i += 1) {
        const vAt = 0.1 + i * 0.32;          // i=0 が最も奥
        const floorAt = place(0, vAt, L).y;  // その奥行きでの裾
        const shade = 0.72 + i * 0.14;       // 手前の対ほど濃い（奥は暗がりに霞む）

        [-1, 1].forEach((side) => {
          const inner = place(side < 0 ? 0 : 1, vAt, L).x;              // 間口の縁
          const outer = place(side < 0 ? -wingU : 1 + wingU, vAt, L).x; // その外側

          const cloth = target.createLinearGradient(outer, 0, inner, 0);
          cloth.addColorStop(0, `rgba(11,10,9,${0.97 * shade})`);
          cloth.addColorStop(0.7, `rgba(16,14,12,${0.95 * shade})`);
          cloth.addColorStop(1, `rgba(31,26,22,${0.93 * shade})`);
          target.fillStyle = cloth;
          target.fillRect(Math.min(outer, inner), legTop, Math.abs(inner - outer), floorAt - legTop);

          // 布の縦じわ
          target.strokeStyle = `rgba(0,0,0,${0.3 * shade})`;
          target.lineWidth = 1;
          for (let f = 1; f < 4; f += 1) {
            const x = outer + (inner - outer) * (f / 4);
            target.beginPath();
            target.moveTo(x, legTop);
            target.lineTo(x, floorAt);
            target.stroke();
          }

          // 内側の縁。舞台の明かりを拾って光るので、ここだけが袖の輪郭になる
          target.strokeStyle = `rgba(196,172,132,${0.16 + i * 0.06})`;
          target.lineWidth = 2;
          target.beginPath();
          target.moveTo(inner, legTop);
          target.lineTo(inner, floorAt);
          target.stroke();

          // 裾。床との接地を見せる
          target.strokeStyle = `rgba(0,0,0,${0.55 * shade})`;
          target.lineWidth = 1;
          target.beginPath();
          target.moveTo(Math.min(outer, inner), floorAt);
          target.lineTo(Math.max(outer, inner), floorAt);
          target.stroke();
        });
      }
      target.restore();
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
    refreshBases(L.size);
    buildPaintLayer(L);
    target.save();
    target.clearRect(0, 0, W, H);
    target.fillStyle = "#0d0c0b";
    target.fillRect(0, 0, W, H);

    if (L.plan) drawPlanVenue(target, L);
    else drawFrontVenue(target, L);

    // 煽りの席では、垂直だったはずの線が画面の上へ向かって集まる（三点透視）。
    // 見上げていることが絵として伝わるのは、人を大きく描くからではなく、この傾きによる。
    // 画面の中心から離れた演者ほど、頭が内側へ倒れる。
    const leanAt = (pos) => {
      const tilt = (L.seat && L.seat.tilt) || 0;
      if (!tilt || L.plan) return 0;
      return tilt * ((pos.x - L.centerX) / (W / 2));
    };

    // 演者と物。光は先に（奥に）描く
    const draw = (piece) => {
      const pos = placePiece(piece, L);
      const scale = pieceScale(piece, pos, L);
      const lean = leanAt(pos);
      if (lean) {
        target.save();
        target.translate(pos.x, pos.y);
        target.transform(1, 0, lean, 1, 0, 0);   // 足元を軸に、上へ行くほど内側へ
        target.translate(-pos.x, -pos.y);
      }
      if (piece.type === "light") drawLight(target, piece, pos, scale, L);
      else if (L.plan) drawPlanPiece(target, piece, pos, scale, L);
      else if (piece.type === "performer") drawPerformer(target, piece, pos, scale, L);
      else if (SOLID_TYPES[piece.type]) drawSolid(target, piece, pos, scale, L);
      else if (piece.type === "sphere") drawSphere(target, piece, pos, scale, L);
      if (lean) target.restore();
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
        const pos = placePiece(piece, L);
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
      // 見る位置の小図。客席が正面だけの劇場でしか意味を持たない
      if (state.showSeatMap && L.venue.audience === "front") drawSeatMap(target, L);
    }
    target.restore();
  }

  function render() {
    const v = venue();
    const size = venueSize();
    const counts = Object.keys(PIECE_TYPES)
      .map((type) => `${PIECE_TYPES[type]}${sc().pieces.filter((piece) => piece.type === type).length}`)
      .join("、");

    // 閉じてもバーは残す。ここから開き直せるので「見る向き」の項目は要らない。
    // セル自体は隠さない（隠すとバーごと消え、開き直す入口が無くなる）
    if (els.frontCell) els.frontCell.hidden = false;
    if (els.planCell) els.planCell.hidden = false;
    if (els.frontInner) els.frontInner.hidden = !state.showFront;
    if (els.planInner) els.planInner.hidden = !state.showPlan;
    if (els.frontCell) els.frontCell.classList.toggle("is-closed", !state.showFront);
    if (els.planCell) els.planCell.classList.toggle("is-closed", !state.showPlan);
    document.querySelectorAll("[data-toggle-view]").forEach((b) => {
      const open = b.dataset.toggleView === "front" ? state.showFront : state.showPlan;
      // 開閉であることが記号で分かるように三角にする（✕だと消去に見える）
      b.textContent = open ? "▾" : "▸";
      b.setAttribute("aria-expanded", String(open));
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
      const L = layout("front");
      const pannable = L.panRange > 0 || L.panRangeY > 0;
      els.frontCaption.textContent = `正面 — ${VENUES.seatById(state.seat).label}`
        + (pannable ? "（何もない所を掴むと視線を振れます）" : "");
      canvas.dataset.pannable = pannable ? "true" : "false";
    }
  }

  /* ---------- 劇場のUI ---------- */

  /* ---------- パネルの組み立てと並べ替え ---------- */

  const colEls = {
    left: document.getElementById("stage-col-left"),
    right: document.getElementById("stage-col-right"),
    center: document.getElementById("stage-col-center"),
  };

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
      head.addEventListener("click", (e) => {
        // 掴んで動かした直後は、指を離した勢いで畳まないようにする
        if (justDragged) { e.preventDefault(); return; }
        togglePanel(id);
      });
      el.prepend(head);

      // つまみからドラッグする。パネル全体を掴むと中の操作ができなくなる。
      // HTML5のドラッグはタッチで動かないので、ポインタイベントで自前に持つ。
      el.draggable = false;
      grip.draggable = false;
      grip.addEventListener("pointerdown", (e) => startGrip(e, id, el));
    });
  }

  /* ---------- パネルの並べ替え ----------
     iPhoneのアイコン移動と同じ手触りにする。掴んだパネルは指について動き、
     残りはその場で滑って隙間を空ける。掴んだ跡には同じ高さの空き（hole）を
     差し込み、それを動かすことで他のパネルが動く。
     動きは FLIP で出す——並べ替える前の位置を控え、並べ替えた後に
     「元の位置へ戻す transform」を当ててから外すと、差分だけが滑って見える。 */

  let drag = null;
  let justDragged = false;

  function flipMove(mutate, skip) {
    const items = [...document.querySelectorAll("[data-panel], .stage-panel-hole")]
      .filter((el) => el !== skip);
    const before = new Map(items.map((el) => [el, el.getBoundingClientRect()]));
    mutate();
    items.forEach((el) => {
      const b = before.get(el);
      const a = el.getBoundingClientRect();
      const dx = b.left - a.left;
      const dy = b.top - a.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform 170ms cubic-bezier(0.2, 0.7, 0.3, 1)";
        el.style.transform = "";
      });
    });
  }

  function clearFlip(el) {
    const done = (e) => {
      if (e.propertyName !== "transform") return;
      el.style.transition = "";
      el.style.transform = "";
      el.removeEventListener("transitionend", done);
    };
    el.addEventListener("transitionend", done);
  }

  function startGrip(e, id, el) {
    if (e.button !== undefined && e.button > 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    const move = (ev) => {
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        active = true;
        beginDrag(id, el, ev);
      }
      ev.preventDefault();
      moveDrag(ev);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (active) endDrag();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function beginDrag(id, el, ev) {
    const rect = el.getBoundingClientRect();
    const hole = document.createElement("div");
    hole.className = "stage-panel-hole";
    hole.style.height = `${rect.height}px`;
    el.parentElement.insertBefore(hole, el);

    drag = { id, el, hole, dx: ev.clientX - rect.left, dy: ev.clientY - rect.top };
    el.classList.add("is-dragging");
    el.style.transition = "";
    el.style.transform = "";
    el.style.width = `${rect.width}px`;
    el.style.position = "fixed";
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.zIndex = "600";
    el.style.pointerEvents = "none";
    document.body.classList.add("is-panel-dragging");
  }

  // 指の位置がどちらの列にあるか。列から離れすぎていたら動かさない
  function columnAt(x) {
    let best = null;
    let near = Infinity;
    ["left", "right"].forEach((col) => {
      const host = colEls[col];
      if (!host) return;
      const r = host.getBoundingClientRect();
      const d = x < r.left ? r.left - x : (x > r.right ? x - r.right : 0);
      if (d < near) { near = d; best = col; }
    });
    return near > 240 ? null : best;
  }

  // その列で、いまの高さならどのパネルの前へ入るか
  function insertionRef(host, y) {
    const kids = [...host.children].filter((el) =>
      el.dataset && el.dataset.panel && el !== drag.el);
    for (let i = 0; i < kids.length; i += 1) {
      const r = kids[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return kids[i];
    }
    return null;
  }

  function moveDrag(ev) {
    if (!drag) return;
    drag.el.style.left = `${ev.clientX - drag.dx}px`;
    drag.el.style.top = `${ev.clientY - drag.dy}px`;
    const col = columnAt(ev.clientX);
    if (!col || !colEls[col]) return;
    const host = colEls[col];
    const ref = insertionRef(host, ev.clientY);
    if (drag.hole.parentElement === host && drag.hole.nextElementSibling === ref) return;
    flipMove(() => host.insertBefore(drag.hole, ref), drag.el);
  }

  function endDrag() {
    if (!drag) return;
    const { el, hole, id } = drag;
    const from = el.getBoundingClientRect();
    hole.parentElement.insertBefore(el, hole);
    hole.remove();

    el.classList.remove("is-dragging");
    ["position", "left", "top", "width", "zIndex", "pointerEvents"].forEach((k) => {
      el.style[k] = "";
    });
    document.body.classList.remove("is-panel-dragging");

    // 指を離した場所から、収まる場所へ滑らせる
    const to = el.getBoundingClientRect();
    el.style.transition = "none";
    el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
    requestAnimationFrame(() => {
      el.style.transition = "transform 170ms cubic-bezier(0.2, 0.7, 0.3, 1)";
      el.style.transform = "";
    });
    clearFlip(el);

    const col = el.parentElement === colEls.right ? "right" : "left";
    drag = null;
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 60);
    commitLayoutFromDom();
    announce(`${el.dataset.title || id}を${col === "left" ? "左" : "右"}の列へ移しました。`);
  }

  // 並びの正本は画面。動かし終えたら、そのまま状態へ書き戻す
  function commitLayoutFromDom() {
    ["left", "right"].forEach((col) => {
      const host = colEls[col];
      if (!host) return;
      [...host.children]
        .filter((el) => el.dataset && el.dataset.panel)
        .forEach((el, i) => {
          state.layout.cols[el.dataset.panel] = col;
          state.layout.order[el.dataset.panel] = i;
        });
    });
    persistSoon();
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

  function swapCenter() {
    state.layout.centerOrder = state.layout.centerOrder.slice().reverse();
    applyLayout();
    persistSoon();
    announce(`${state.layout.centerOrder[0] === "front" ? "正面" : "平面"}を上にしました。`);
  }

  /* ---------- 登場人物 ----------
     ショーに出る演者を名簿で持ち、場面ごとに舞台の上か裏かが決まる。
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
      name.setAttribute("aria-label", "演者の名前");
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

      const profile = document.createElement("button");
      profile.type = "button";
      profile.className = "stage-cast-profile";
      profile.textContent = "…";
      profile.title = `${member.name}のプロフィール（身長など）`;
      profile.setAttribute("aria-label", `${member.name}のプロフィールを開く`);
      profile.addEventListener("click", () => openProfile(member.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "stage-cast-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", `${member.name}を名簿から外す`);
      remove.addEventListener("click", () => removeCastMember(member.id));

      row.append(swatch, name, status, profile, remove);
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
    state.project.cast.push({
      id: rid("cast"), name: raw.slice(0, 24), color: nextPieceColor(state.project.cast.length),
      heightCm: DEFAULT_HEIGHT_CM, note: "",
    });
    if (els.castName) els.castName.value = "";
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
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
    renderSets();
    renderLights();
    renderRigs();
    renderLights();
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
    renderSets();
    renderLights();
    renderRigs();
    renderLights();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    announce(`${member.name}を名簿から外しました。`);
  }

  /* ---------- 舞台セット ---------- */


  function setOnStage(setId) {
    return sc().pieces.some((piece) => piece.setId === setId);
  }

  // 一覧に出す寸法の要約。数字を見て「あの平台だ」と分かる程度に短く
  function setDimLabel(item) {
    const d = item.dims;
    if (item.kind === "sphere") {
      return d.lift > 0.05 ? `⌀${cmText(d.dia)} ／ 床上${cmText(d.lift)}` : `⌀${cmText(d.dia)}`;
    }
    if (item.kind === "light") return `⌀${cmText(d.dia)}`;
    if (item.kind === "chair") return `高さ${cmText(d.h)}`;
    return `${Math.round(d.w * 100)}×${Math.round(d.d * 100)}×${Math.round(d.h * 100)}cm`;
  }

  function renderSets() {
    renderSetList(els.setList, (item) => item.kind !== "light",
      "まだ何も登録していません。名前と形を選んで追加してください。");
  }

  function renderLights() {
    renderSetList(els.lightList, (item) => item.kind === "light",
      "まだ登録していません。名前を入れて追加してください。");
  }

  function renderSetList(host, keep, emptyText) {
    if (!host) return;
    const sets = (state.project.sets || []).filter(keep);
    host.innerHTML = "";
    if (!sets.length) {
      const empty = document.createElement("p");
      empty.className = "stage-cast-empty";
      empty.textContent = emptyText;
      host.append(empty);
      return;
    }
    sets.forEach((item) => {
      const row = document.createElement("div");
      row.className = "stage-cast-row";

      const swatch = document.createElement("input");
      swatch.type = "color";
      swatch.className = "stage-cast-color";
      swatch.value = item.color;
      swatch.setAttribute("aria-label", `${item.name}の色`);
      swatch.addEventListener("input", () => {
        item.color = swatch.value;
        state.project.scenes.forEach((scene) => {
          scene.pieces.forEach((piece) => {
            if (piece.setId === item.id) piece.color = item.color;
          });
        });
        render();
        persistSoon();
      });

      const name = document.createElement("input");
      name.type = "text";
      name.className = "stage-cast-name-input";
      name.value = item.name;
      name.maxLength = 24;
      name.setAttribute("aria-label", "舞台セットの名前");
      name.addEventListener("input", () => {
        item.name = name.value.slice(0, 24);
        render();
        persistSoon();
      });

      const dims = document.createElement("span");
      dims.className = "stage-set-dims";
      dims.textContent = setDimLabel(item);
      dims.title = `${SET_KINDS[item.kind]}／${setDimLabel(item)}`;

      const onStage = setOnStage(item.id);
      const status = document.createElement("button");
      status.type = "button";
      status.className = `stage-cast-status ${onStage ? "is-on" : "is-off"}`;
      status.textContent = onStage ? "舞台上" : "舞台裏";
      status.title = onStage ? "押すと舞台から下げます" : "押すとこの場面の舞台へ出します";
      status.addEventListener("click", () => toggleSetOnStage(item.id));

      const detail = document.createElement("button");
      detail.type = "button";
      detail.className = "stage-cast-profile";
      detail.textContent = "…";
      detail.title = `${item.name}の寸法`;
      detail.setAttribute("aria-label", `${item.name}の寸法を開く`);
      detail.addEventListener("click", () => openSetInfo(item.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "stage-cast-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", `${item.name}を舞台セットから外す`);
      remove.addEventListener("click", () => removeSetItem(item.id));

      // 1段目に色と名前、2段目に寸法と操作を置く。名前が切れないようにするため
      const head = document.createElement("div");
      head.className = "stage-set-head";
      head.append(swatch, name);
      const foot = document.createElement("div");
      foot.className = "stage-set-foot";
      foot.append(dims, status, detail, remove);
      row.className = "stage-set-row";
      row.append(head, foot);
      host.append(row);
    });
  }

  function addSetItem(kind, nameInput) {
    const raw = (nameInput && nameInput.value || "").trim();
    if (!raw) {
      announce("名前を入れてから追加してください。");
      if (nameInput) nameInput.focus();
      return;
    }
    checkpoint();
    state.project.sets.push({
      id: rid("set"), kind, name: raw.slice(0, 24),
      color: kind === "light" ? "#d3ac59" : nextPieceColor(state.project.sets.length + 2),
      dims: normalizeDims(kind, {}), note: "",
    });
    if (nameInput) nameInput.value = "";
    renderSets();
    renderLights();
    persistSoon();
    announce(`${raw}を${kind === "light" ? "光" : "舞台セット"}へ加えました。舞台裏の状態です。`);
  }

  function toggleSetOnStage(setId) {
    checkpoint();
    const scene = sc();
    const existing = scene.pieces.find((piece) => piece.setId === setId);
    const item = (state.project.sets || []).find((t) => t.id === setId);
    if (existing) {
      scene.pieces = scene.pieces.filter((piece) => piece.id !== existing.id);
      if (selectedId === existing.id) selectedId = null;
      announce(`${item ? item.name : "これ"}を舞台から下げました。`);
    } else {
      const count = scene.pieces.filter((p) => p.type !== "performer" && p.type !== "light").length;
      const piece = {
        id: nextId(), type: item ? item.kind : "block", setId,
        u: clamp(0.5 + ((count % 5) - 2) * 0.11, 0.06, 0.94),
        v: clamp(0.5 + (count % 3) * 0.09, 0.05, 0.95),
        size: 100, color: item ? item.color : state.pieceColor, name: "", facing: 0,
      };
      scene.pieces.push(piece);
      selectedId = piece.id;
      announce(`${item ? item.name : "これ"}を舞台へ出しました。`);
    }
    renderSets();
    renderLights();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
  }

  function removeSetItem(setId) {
    const item = (state.project.sets || []).find((t) => t.id === setId);
    if (!item) return;
    const scenesWith = state.project.scenes.filter((scene) =>
      scene.pieces.some((piece) => piece.setId === setId)).length;
    const warning = scenesWith
      ? `「${item.name}」を舞台セットから外します。${scenesWith}つの場面から、これも消えます。`
      : `「${item.name}」を舞台セットから外します。`;
    if (!window.confirm(warning)) return;
    checkpoint();
    state.project.sets = state.project.sets.filter((t) => t.id !== setId);
    state.project.scenes.forEach((scene) => {
      scene.pieces = scene.pieces.filter((piece) => piece.setId !== setId);
    });
    selectedId = null;
    renderSets();
    renderLights();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    announce(`${item.name}を舞台セットから外しました。`);
  }

  /* ---------- 姿勢を選ぶ ----------
     名前だけでは「片膝立ち」と「しゃがむ」の違いが伝わらないので、
     実際の形を小さく描いて並べる。舞台の絵と同じ骨格・同じ塗りを通すので、
     見本と本番がずれない。 */

  function drawPosePreview(canvas, poseId, color) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const yaw = Math.PI * 0.24;          // 斜め前から。前後と左右の両方が読める

    // まず等倍で組んで、外に出る範囲を測る
    const probe = buildRig(poseId, 0, 0, 1, 1, yaw, 0, null);
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    const scan = (q) => {
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x);
      y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    };
    Object.keys(probe.P).forEach((k) => scan(probe.P[k]));
    probe.box.forEach(scan);

    const pad = 14;
    const bw = Math.max(0.001, x1 - x0);
    const bh = Math.max(0.001, y1 - y0);
    const s = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
    const ox = pad - x0 * s + ((w - pad * 2) - bw * s) / 2;
    const oy = pad - y0 * s + ((h - pad * 2) - bh * s) / 2;
    paintBody(ctx, buildRig(poseId, ox, oy, s, s, yaw, 0, null), color);
  }

  function openPoseModal() {
    const piece = selectedPiece();
    if (!piece || piece.type !== "performer" || !els.poseModal) return;
    const grid = els.poseGrid;
    grid.innerHTML = "";
    POSES.forEach((pose) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = `stage-pose-tile${pose.id === piece.pose ? " is-on" : ""}`;
      tile.setAttribute("aria-pressed", String(pose.id === piece.pose));
      const canvas = document.createElement("canvas");
      canvas.width = 132;
      canvas.height = 148;
      const label = document.createElement("span");
      label.textContent = pose.label;
      tile.append(canvas, label);
      grid.append(tile);
      drawPosePreview(canvas, pose.id, piece.color);
      tile.addEventListener("click", () => {
        checkpoint();
        piece.pose = pose.id;
        closePoseModal();
        updateInspector();
        render();
        persistSoon();
        announce(`姿勢を「${pose.label}」にしました。`);
      });
    });
    els.poseModal.hidden = false;
    els.poseBackdrop.hidden = false;
  }

  function closePoseModal() {
    if (els.poseModal) els.poseModal.hidden = true;
    if (els.poseBackdrop) els.poseBackdrop.hidden = true;
  }

  /* ---------- 装置の型 ----------
     舞台装置の並びに名前をつけて残し、別の場面で呼び出す。
     残すのは演者以外。演者は場面ごとに出入りするものなので、装置と一緒に
     持ち回すと「前の場面の人がそのまま立っている」ことになる。 */

  const isRigPiece = (piece) => piece.type !== "performer";

  // 型に入れる／型から出すときの写し。id は必ず作り直す（同じ場面に二重で置けるように）
  function copyPiece(piece) {
    const clone = JSON.parse(JSON.stringify(piece));
    clone.id = nextId();
    clone.base = 0;
    clone.supportId = null;
    return clone;
  }

  function renderRigs() {
    if (!els.rigList) return;
    const rigs = state.project.rigs || [];
    els.rigList.innerHTML = "";
    if (!rigs.length) {
      const empty = document.createElement("p");
      empty.className = "stage-cast-empty";
      empty.textContent = "まだ残していません。並べ終えたら名前をつけて残してください。";
      els.rigList.append(empty);
      return;
    }
    rigs.forEach((rig) => {
      const row = document.createElement("div");
      row.className = "stage-set-row";

      const head = document.createElement("div");
      head.className = "stage-set-head stage-rig-head";
      const name = document.createElement("input");
      name.type = "text";
      name.className = "stage-cast-name-input";
      name.value = rig.name;
      name.maxLength = 24;
      name.setAttribute("aria-label", "装置の型の名前");
      name.addEventListener("input", () => {
        rig.name = name.value.slice(0, 24);
        persistSoon();
      });
      head.append(name);

      const foot = document.createElement("div");
      foot.className = "stage-set-foot stage-rig-foot";
      const count = document.createElement("span");
      count.className = "stage-set-dims";
      count.textContent = `${rig.pieces.length}点`;

      const swap = document.createElement("button");
      swap.type = "button";
      swap.className = "stage-cast-status is-off";
      swap.textContent = "置き換え";
      swap.title = "いまの場面の装置を、この型にそっくり入れ替えます";
      swap.addEventListener("click", () => applyRig(rig.id, "replace"));

      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "stage-cast-status is-off";
      plus.textContent = "足す";
      plus.title = "いまの場面へ、この型の装置を足します";
      plus.addEventListener("click", () => applyRig(rig.id, "add"));

      const update = document.createElement("button");
      update.type = "button";
      update.className = "stage-cast-profile";
      update.textContent = "↺";
      update.title = "いまの並びで、この型を上書きします";
      update.setAttribute("aria-label", `${rig.name}をいまの並びで上書き`);
      update.addEventListener("click", () => overwriteRig(rig.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "stage-cast-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", `${rig.name}を消す`);
      remove.addEventListener("click", () => removeRig(rig.id));

      foot.append(count, swap, plus, update, remove);
      row.append(head, foot);
      els.rigList.append(row);
    });
  }

  function currentRigPieces() {
    return sc().pieces.filter(isRigPiece);
  }

  function saveRig() {
    const raw = (els.rigName && els.rigName.value || "").trim();
    if (!raw) {
      announce("名前を入れてから残してください。");
      if (els.rigName) els.rigName.focus();
      return;
    }
    const pieces = currentRigPieces();
    if (!pieces.length) {
      announce("舞台に装置がありません。");
      return;
    }
    checkpoint();
    state.project.rigs.push({ id: rid("rig"), name: raw.slice(0, 24), pieces: pieces.map(copyPiece) });
    if (els.rigName) els.rigName.value = "";
    renderRigs();
    persistSoon();
    announce(`${raw}として${pieces.length}点を残しました。`);
  }

  function overwriteRig(rigId) {
    const rig = (state.project.rigs || []).find((r) => r.id === rigId);
    if (!rig) return;
    const pieces = currentRigPieces();
    if (!window.confirm(`「${rig.name}」を、いまの並び（${pieces.length}点）で上書きしますか。`)) return;
    checkpoint();
    rig.pieces = pieces.map(copyPiece);
    renderRigs();
    persistSoon();
    announce(`${rig.name}を上書きしました。`);
  }

  function applyRig(rigId, mode) {
    const rig = (state.project.rigs || []).find((r) => r.id === rigId);
    if (!rig) return;
    checkpoint();
    const scene = sc();
    if (mode === "replace") scene.pieces = scene.pieces.filter((piece) => !isRigPiece(piece));
    rig.pieces.forEach((piece) => scene.pieces.push(copyPiece(piece)));
    selectedId = null;
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    announce(`${rig.name}の${rig.pieces.length}点を${mode === "replace" ? "置き換えました" : "足しました"}。`);
  }

  function removeRig(rigId) {
    const rig = (state.project.rigs || []).find((r) => r.id === rigId);
    if (!rig) return;
    if (!window.confirm(`「${rig.name}」を消します。置いてある装置はそのままです。`)) return;
    checkpoint();
    state.project.rigs = state.project.rigs.filter((r) => r.id !== rigId);
    renderRigs();
    persistSoon();
    announce(`${rig.name}を消しました。`);
  }

  /* ---------- 舞台セットの寸法（モーダル） ---------- */

  let setInfoId = null;

  function currentSetItem() {
    return setInfoId ? (state.project.sets || []).find((t) => t.id === setInfoId) : null;
  }

  function openSetInfo(setId) {
    const item = (state.project.sets || []).find((t) => t.id === setId);
    if (!item || !els.setInfo) return;
    setInfoId = setId;
    els.setInfoTitle.textContent = `${item.name}（${SET_KINDS[item.kind]}）`;
    els.setInfoName.value = item.name;
    els.setInfoColor.value = item.color;
    els.setInfoNote.value = item.note || "";
    buildDimControls(els.setInfoDims, "stage-setinfo", item.kind, item.dims, () => {
      renderSets();
      renderLights();
      render();
      persistSoon();
    });
    els.setInfo.hidden = false;
    els.setInfoBackdrop.hidden = false;
    els.setInfoName.focus();
  }

  function closeSetInfo() {
    setInfoId = null;
    if (els.setInfo) els.setInfo.hidden = true;
    if (els.setInfoBackdrop) els.setInfoBackdrop.hidden = true;
  }

  /* ---------- 演者プロフィール ---------- */

  let profileId = null;

  function openProfile(castId) {
    const member = state.project.cast.find((c) => c.id === castId);
    if (!member || !els.profile) return;
    profileId = castId;
    els.profileName.value = member.name;
    els.profileHeight.value = String(member.heightCm || DEFAULT_HEIGHT_CM);
    els.profileHeightValue.textContent = String(member.heightCm || DEFAULT_HEIGHT_CM);
    els.profileColor.value = member.color;
    els.profileNote.value = member.note || "";
    els.profile.hidden = false;
    els.profileBackdrop.hidden = false;
    els.profileName.focus();
  }

  function closeProfile() {
    profileId = null;
    if (els.profile) els.profile.hidden = true;
    if (els.profileBackdrop) els.profileBackdrop.hidden = true;
  }

  function profileMember() {
    return profileId ? state.project.cast.find((c) => c.id === profileId) : null;
  }

  // 身長が変わると、その演者が出ている場面すべてで見え方が変わる
  function applyProfileChange(fn) {
    const member = profileMember();
    if (!member) return;
    fn(member);
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    render();
    persistSoon();
  }

  if (els.profileClose) els.profileClose.addEventListener("click", closeProfile);
  if (els.profileBackdrop) els.profileBackdrop.addEventListener("click", closeProfile);
  if (els.profileName) {
    els.profileName.addEventListener("input", (e) =>
      applyProfileChange((m) => { m.name = e.target.value.slice(0, 24); }));
  }
  if (els.profileHeight) {
    els.profileHeight.addEventListener("input", (e) => {
      els.profileHeightValue.textContent = e.target.value;
      applyProfileChange((m) => { m.heightCm = clamp(Number(e.target.value), 120, 210); });
    });
  }
  if (els.profileColor) {
    els.profileColor.addEventListener("input", (e) => {
      applyProfileChange((m) => {
        m.color = e.target.value;
        state.project.scenes.forEach((scene) => {
          scene.pieces.forEach((piece) => {
            if (piece.castId === m.id) piece.color = m.color;
          });
        });
      });
    });
  }
  if (els.profileNote) {
    els.profileNote.addEventListener("input", (e) =>
      applyProfileChange((m) => { m.note = e.target.value.slice(0, 200); }));
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && profileId) closeProfile();
  });

  /* ---------- 場面とプロジェクト ---------- */

  /* 並べ替え・追加・削除の起点になる行。セクションを押したときは、
   * 絵を持たないので「開く」ことはできないが、操作の起点にはなる。 */
  function cursorIndex() {
    const list = state.project.scenes;
    const byCursor = list.findIndex((x) => x.id === state.cursorRowId);
    if (byCursor >= 0) return byCursor;
    return list.findIndex((x) => x.id === state.project.activeSceneId);
  }

  // その行に属する子（自分より深い行が続くあいだ）
  function sceneChildren(index) {
    const list = state.project.scenes;
    const base = list[index].depth;
    let end = index + 1;
    while (end < list.length && list[end].depth > base) end += 1;
    return list.slice(index + 1, end);
  }

  // 畳んだセクションの中にいるか
  function sceneHidden(index) {
    const list = state.project.scenes;
    for (let i = index - 1; i >= 0; i -= 1) {
      if (list[i].depth < list[index].depth) {
        if (list[i].kind === "section" && state.closedSections[list[i].id]) return true;
        if (sceneHidden(i)) return true;
        return false;
      }
    }
    return false;
  }

  function renderScenes() {
    const p = state.project;
    if (els.sceneList) {
      els.sceneList.innerHTML = "";
      let sceneNo = 0;
      p.scenes.forEach((scene, i) => {
        if (scene.kind === "scene") sceneNo += 1;
        if (sceneHidden(i)) return;
        const row = document.createElement("div");
        row.className = "stage-scene-row";
        row.style.paddingLeft = `${scene.depth * 14}px`;

        const button = document.createElement("button");
        button.type = "button";
        button.className = `stage-scene-chip${scene.kind === "section" ? " is-section" : ""}`;
        const isCursor = scene.id === (state.cursorRowId || p.activeSceneId);
        button.setAttribute("aria-pressed", String(isCursor));
        if (scene.kind === "scene" && scene.id === p.activeSceneId) button.classList.add("is-open");

        const num = document.createElement("span");
        num.className = "stage-scene-num";
        if (scene.kind === "section") {
          const shut = Boolean(state.closedSections[scene.id]);
          num.textContent = shut ? "▸" : "▾";
          button.setAttribute("aria-expanded", String(!shut));
        } else {
          num.textContent = String(sceneNo).padStart(2, "0");
        }

        const name = document.createElement("span");
        name.className = "stage-scene-name";
        name.textContent = scene.title;

        const count = document.createElement("span");
        count.className = "stage-scene-count";
        count.textContent = scene.kind === "section"
          ? `${sceneChildren(i).filter((x) => x.kind === "scene").length}`
          : `${scene.pieces.length}`;

        button.append(num, name, count);
        button.addEventListener("click", () => {
          if (scene.kind === "section") {
            // 絵は持たないので開けない。押したら開閉して、操作の起点にする
            if (state.cursorRowId === scene.id) {
              state.closedSections[scene.id] = !state.closedSections[scene.id];
            }
            state.cursorRowId = scene.id;
            renderScenes();
            persistSoon();
            return;
          }
          openScene(scene.id);
        });
        row.append(button);
        els.sceneList.append(row);
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
    const idx = cursorIndex();
    if (els.sceneDel) els.sceneDel.disabled = p.scenes.filter((x) => x.kind === "scene").length <= 1;
    if (els.sceneLeft) els.sceneLeft.disabled = idx <= 0;
    if (els.sceneRight) {
      const block = idx < 0 ? 0 : 1 + sceneChildren(idx).length;
      els.sceneRight.disabled = idx < 0 || idx + block >= p.scenes.length;
    }
    if (els.sceneOut) els.sceneOut.disabled = idx < 0 || p.scenes[idx].depth <= 0;
    if (els.sceneIn) {
      els.sceneIn.disabled = idx <= 0 || p.scenes[idx].depth > p.scenes[idx - 1].depth;
    }
  }

  /* 字下げを変える。連れている子も同じだけ動かす。
   * 前の行より2段以上深くはできない（宙に浮いた入れ子になるため）。 */
  function indentScene(step) {
    const p = state.project;
    const i = cursorIndex();
    if (i < 0) return;
    const scene = p.scenes[i];
    const next = scene.depth + step;
    if (next < 0 || next > MAX_DEPTH) return;
    // 前の行より2段以上は深くできない。宙に浮いた入れ子になるため
    if (step > 0 && (i === 0 || next > p.scenes[i - 1].depth + 1)) return;
    checkpoint();
    const kids = sceneChildren(i);
    scene.depth = next;
    kids.forEach((kid) => { kid.depth = clamp(kid.depth + step, 0, MAX_DEPTH); });
    renderScenes();
    persistSoon();
    announce(`${scene.title}を${step > 0 ? "一段内側" : "一段外側"}へ動かしました。`);
  }

  // 前後へ動かす。セクションは中身ごと、同じ深さの隣と入れ替える
  function openScene(id) {
    state.cursorRowId = id;
    if (state.project.activeSceneId === id) { renderScenes(); return; }
    state.project.activeSceneId = id;
    selectedId = null;
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    updateInspector();
    render();
    persistSoon();
    announce(`${sc().title}を開きました。`);
  }

  function addScene(carryRig) {
    checkpoint();
    const p = state.project;
    const carried = carryRig ? currentRigPieces().map(copyPiece) : [];
    const i = cursorIndex();
    // セクションを起点にしたときは、その中身として一段内側へ入れる
    const depth = i >= 0 ? p.scenes[i].depth + (p.scenes[i].kind === "section" ? 1 : 0) : 0;
    const count = p.scenes.filter((x) => x.kind === "scene").length;
    const scene = newScene(`場面 ${count + 1}`, false, "scene", depth);
    scene.background = sc().background;      // 劇場は変えず、いまの背景色だけ引き継ぐ
    carried.forEach((piece) => scene.pieces.push(piece));
    // いまの行（とその中身）のすぐ後ろへ入れる
    const at = i >= 0 ? i + 1 + sceneChildren(i).length : p.scenes.length;
    p.scenes.splice(at, 0, scene);
    p.activeSceneId = scene.id;
    state.cursorRowId = scene.id;
    selectedId = null;
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    updateInspector();
    render();
    persistSoon();
    announce(`${scene.title}を足しました。`);
  }

  /* セクションを足す。いまの行のすぐ後ろへ、同じ深さで入れる。
   * 入れ物だけなので絵は持たず、押すと開閉する。 */
  function addSection() {
    checkpoint();
    const p = state.project;
    const i = cursorIndex();
    const depth = i >= 0 ? p.scenes[i].depth : 0;
    const count = p.scenes.filter((x) => x.kind === "section").length;
    const section = newScene(`セクション ${count + 1}`, false, "section", depth);
    const at = i >= 0 ? i + 1 + sceneChildren(i).length : p.scenes.length;
    p.scenes.splice(at, 0, section);
    state.cursorRowId = section.id;
    renderScenes();
    persistSoon();
    announce(`${section.title}を足しました。下の場面を一段内側へ入れると、中身になります。`);
  }

  // セクションを起点にしたときは、中身ごと複製する
  function duplicateScene() {
    const p = state.project;
    const i = cursorIndex();
    if (i < 0) return;
    checkpoint();
    const cur = p.scenes[i];
    const block = [cur].concat(sceneChildren(i));
    const copies = block.map((row) => {
      const copy = JSON.parse(JSON.stringify(row));
      copy.id = rid(row.kind === "section" ? "sect" : "scene");
      copy.pieces = (copy.pieces || []).map((piece) => ({ ...piece, id: nextId() }));
      return copy;
    });
    copies[0].title = `${cur.title} の複製`;
    p.scenes.splice(i + block.length, 0, ...copies);
    const firstScene = copies.find((x) => x.kind === "scene");
    if (firstScene) p.activeSceneId = firstScene.id;
    state.cursorRowId = copies[0].id;
    selectedId = null;
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    updateInspector();
    render();
    persistSoon();
    announce(`${cur.title}を複製しました。前の場面から少しずつ動かすときに使えます。`);
  }

  function moveScene(direction) {
    const p = state.project;
    const i = cursorIndex();
    if (i < 0) return;
    const block = 1 + sceneChildren(i).length;
    const target = direction < 0
      ? (() => { for (let k = i - 1; k >= 0; k -= 1) if (p.scenes[k].depth <= p.scenes[i].depth) return k; return -1; })()
      : i + block;
    if (target < 0 || target > p.scenes.length) return;
    checkpoint();
    const moving = p.scenes.splice(i, block);
    const at = direction < 0 ? target : target - block + (1 + sceneChildren(target - block).length);
    p.scenes.splice(Math.max(0, Math.min(p.scenes.length, at)), 0, ...moving);
    renderScenes();
    persistSoon();
    announce(`${moving[0].title}を${direction < 0 ? "前" : "後"}へ動かしました。`);
  }


  // セクションを消すときは、中に入れた場面ごと消える
  function deleteScene() {
    const p = state.project;
    const i = cursorIndex();
    if (i < 0) return;
    const cur = p.scenes[i];
    const kids = sceneChildren(i);
    const kidScenes = kids.filter((x) => x.kind === "scene").length;
    if (p.scenes.filter((x) => x.kind === "scene").length - 1 - kidScenes < 1) return;
    const warn = kids.length
      ? `「${cur.title}」を、中に入れた${kids.length}件ごと削除します。置いたものと塗りは戻せません。`
      : `「${cur.title}」を削除します。この場面に置いたものと塗りは戻せません。`;
    if (!window.confirm(warn)) return;
    checkpoint();
    p.scenes.splice(i, 1 + kids.length);
    const nextScene = p.scenes.slice(i).find((x) => x.kind === "scene")
      || p.scenes.slice(0, i).reverse().find((x) => x.kind === "scene");
    p.activeSceneId = nextScene.id;
    state.cursorRowId = nextScene.id;
    selectedId = null;
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
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
        showFront: state.showFront, showPlan: state.showPlan, showNames: state.showNames,
        showSeatMap: state.showSeatMap, frontPan: state.frontPan, frontPanY: state.frontPanY,
        closedSections: state.closedSections, cursorRowId: state.cursorRowId });
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

    if (els.venueScale) {
      const bits = [`間口 ${size.width}m`, `奥行 ${size.depth}m`];
      if (size.height) bits.push(`高さ ${size.height}m`);
      if (size.ring) bits.push(`リング ${size.ring}m`);
      if (size.seats) bits.push(`客席 約${size.seats}席`);
      if (size.crowd) bits.push(`観客 〜${size.crowd.toLocaleString()}人`);
      els.venueScale.textContent = bits.join(" ・ ") + `（${current.source}）`;
    }

    // 見る位置の小図は、客席が正面だけの劇場でしか意味を持たない
    if (els.showSeatMap) {
      const box = els.showSeatMap.closest("label");
      if (box) box.hidden = current.audience !== "front";
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
    // 演者にしか出ないつまみなので、割合ではなく実際の身長で見せる
    els.sizeValue.textContent = cmText(pieceHeightM(piece) * (piece.size / 100));
    if (els.sizeLabel) els.sizeLabel.firstChild.nodeValue = "身長 ";
    // 台と球は実寸で持つので、倍率のつまみは出さない。
    // 舞台セットに登録したものは、寸法の正本がそちらにあるので個別に触らせない
    syncDimControls(piece);
    if (els.piecePose) {
      const isPerformer = piece.type === "performer";
      if (els.poseLabel) els.poseLabel.textContent = poseById(piece.pose).label;
      els.piecePose.disabled = !isPerformer;
      els.piecePose.hidden = !isPerformer;
      const row = els.piecePose.previousElementSibling;
      if (row) row.hidden = !isPerformer;
    }
    if (els.pieceFacing) {
      // 向きは演者と台に効く。球は回しても見た目が変わらない
      const isPerformer = piece.type === "performer" || Boolean(SOLID_TYPES[piece.type]);
      // フェーダーは中央が客席向き。保存は0〜359なので、180を超える分は負へ折り返す
      const deg = ((Number(piece.facing) || 0) % 360 + 360) % 360;
      els.pieceFacing.value = String(deg > 180 ? deg - 360 : deg);
      els.pieceFacing.disabled = !isPerformer;
      if (els.facingValue) {
        els.facingValue.textContent = isPerformer ? facingLabel(piece.facing) : "―";
      }
    }
    if (els.pieceName && document.activeElement !== els.pieceName) {
      const member = piece.castId ? state.project.cast.find((c) => c.id === piece.castId) : null;
      const registered = pieceSet(piece);
      const owner = member || registered;
      els.pieceName.value = owner ? owner.name : (piece.name || "");
      els.pieceName.disabled = Boolean(owner);
      els.pieceName.placeholder = member ? "名前は演者パネルで直します"
        : registered ? "名前は登録した一覧で直します" : "例: 演台、ディアボロ";
    }
  }

  function syncInputs() {
    els.background.value = sc().background;
    els.paintColor.value = state.paintColor;
    els.brushSize.value = String(state.brushSize);
    els.brushValue.textContent = String(state.brushSize);
    if (els.showNames) els.showNames.checked = state.showNames;
    if (els.showSeatMap) els.showSeatMap.checked = state.showSeatMap;
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
    renderSets();
    renderLights();
    renderRigs();
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
    try { if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId); } catch (_) { /* 同上 */ }
    const changed = pointerAction.kind === "stroke" || pointerAction.kind === "pan" || pointerAction.moved;
    pointerAction = null;
    el.dataset.dragging = "false";
    if (changed) persistSoon();
  }

  // 掴みの捕捉。取り損ねても操作は続けられるので、例外で止めない
  function capture(el, pointerId) {
    try { el.setPointerCapture(pointerId); } catch (_) { /* 取れなくても支障はない */ }
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
      if (!hit) {
        // 舞台が一度に入らない席では、何もない所を掴むと視線を左右に振れる
        if (view === "front" && (L.panRange > 0 || L.panRangeY > 0)) {
          capture(el, event.pointerId);
          el.dataset.dragging = "true";
          pointerAction = {
            kind: "pan", pointerId: event.pointerId, el, view,
            startX: point.x, startY: point.y,
            startPan: state.frontPan || 0, startPanY: state.frontPanY || 0,
            range: L.panRange,
          };
        }
        return;
      }
      const pos = placePiece(hit, L);
      capture(el, event.pointerId);
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
    capture(el, event.pointerId);
    pointerAction = { kind: "stroke", pointerId: event.pointerId, stroke, el, view, moved: true };
    render();
  }

  function onPointerMove(event) {
    if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
    const L = layout(pointerAction.view);
    const point = pointFromEvent(event);

    if (pointerAction.kind === "pan") {
      // 掴んだ絵がついてくる向き。右へ引けば舞台の下手側が、下へ引けば上の方が見えてくる
      if (pointerAction.range > 0) {
        const moved = (point.x - pointerAction.startX) / pointerAction.range;
        state.frontPan = clamp(pointerAction.startPan + moved, -1, 1);
      }
      // 上下は首の角度。画面の高さいっぱいの引きで、振れる角度いっぱいになる
      const dy = point.y - pointerAction.startY;
      state.frontPanY = clamp(pointerAction.startPanY + dy / (H * 0.55), -1, 1);
      render();
      return;
    }

    if (pointerAction.kind === "drag") {
      const piece = sc().pieces.find((candidate) => candidate.id === pointerAction.id);
      if (!piece) return;
      if (!pointerAction.moved) {
        recordBefore(pointerAction.before);
        pointerAction.moved = true;
        bringToTop(piece);   // 動かしたものが、重なった相手の上に乗る
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
    bringToTop(piece);   // 動かしたものが、重なった相手の上に乗る
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
  // 演者・台・光はすべて、それぞれの一覧から舞台へ出し入れする
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
      announce(e.target.checked ? "名前を出しました。" : "名前を隠しました。");
    });
  }
  if (els.showSeatMap) {
    els.showSeatMap.addEventListener("change", (e) => {
      state.showSeatMap = e.target.checked;
      render();
      persistSoon();
      announce(e.target.checked ? "見る位置の図を出しました。" : "見る位置の図を隠しました。");
    });
  }
  if (els.piecePose) els.piecePose.addEventListener("click", openPoseModal);
  if (els.poseClose) els.poseClose.addEventListener("click", closePoseModal);
  if (els.poseBackdrop) els.poseBackdrop.addEventListener("click", closePoseModal);
  if (els.pieceFacing) {
    els.pieceFacing.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || (piece.type !== "performer" && !SOLID_TYPES[piece.type])) return;
      piece.facing = ((Number(e.target.value) % 360) + 360) % 360;   // フェーダーは-180〜180
      if (els.facingValue) els.facingValue.textContent = facingLabel(piece.facing);
      render();
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
  const addSelectedSet = () => addSetItem(
    SET_KINDS[els.setKind && els.setKind.value] ? els.setKind.value : "block", els.setName);
  if (els.setAdd) els.setAdd.addEventListener("click", addSelectedSet);
  if (els.setName) {
    els.setName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addSelectedSet(); }
    });
  }
  if (els.lightAdd) els.lightAdd.addEventListener("click", () => addSetItem("light", els.lightName));
  if (els.lightName) {
    els.lightName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addSetItem("light", els.lightName); }
    });
  }
  if (els.openSetInfo) {
    els.openSetInfo.addEventListener("click", () => {
      const registered = pieceSet(selectedPiece());
      if (registered) openSetInfo(registered.id);
    });
  }
  if (els.setInfoClose) els.setInfoClose.addEventListener("click", closeSetInfo);
  if (els.setInfoBackdrop) els.setInfoBackdrop.addEventListener("click", closeSetInfo);
  if (els.setInfoName) {
    els.setInfoName.addEventListener("input", (e) => {
      const item = currentSetItem();
      if (!item) return;
      item.name = e.target.value.slice(0, 24);
      renderSets();
      renderLights();
      render();
      persistSoon();
    });
  }
  if (els.setInfoColor) {
    els.setInfoColor.addEventListener("input", (e) => {
      const item = currentSetItem();
      if (!item) return;
      item.color = e.target.value;
      state.project.scenes.forEach((scene) => {
        scene.pieces.forEach((piece) => {
          if (piece.setId === item.id) piece.color = item.color;
        });
      });
      renderSets();
      renderLights();
      render();
      persistSoon();
    });
  }
  if (els.setInfoNote) {
    els.setInfoNote.addEventListener("input", (e) => {
      const item = currentSetItem();
      if (item) { item.note = e.target.value.slice(0, 200); persistSoon(); }
    });
  }
  if (els.castAdd) els.castAdd.addEventListener("click", addCastMember);
  if (els.castName) {
    els.castName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addCastMember(); }
    });
  }
  if (els.sceneAdd) els.sceneAdd.addEventListener("click", () => addScene(false));
  if (els.sceneAddRig) els.sceneAddRig.addEventListener("click", () => addScene(true));
  if (els.sceneSection) els.sceneSection.addEventListener("click", addSection);
  if (els.sceneOut) els.sceneOut.addEventListener("click", () => indentScene(-1));
  if (els.sceneIn) els.sceneIn.addEventListener("click", () => indentScene(1));
  if (els.rigSave) els.rigSave.addEventListener("click", saveRig);
  if (els.rigName) {
    els.rigName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); saveRig(); }
    });
  }
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

  [els.background, els.selectedColor, els.pieceSize, els.pieceFacing].filter(Boolean).forEach((control) => {
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
  function syncDimControls(piece) {
    const type = piece && piece.type;
    const registered = pieceSet(piece);
    const own = piece && piece.dims;
    // 実寸を持つものは倍率のつまみを出さない。
    // 登録済みのものは、寸法の正本が舞台セット側にあるので個別に触らせない
    if (els.sizeRow) els.sizeRow.hidden = Boolean(own) || Boolean(registered);
    if (els.dimsFromSet) {
      els.dimsFromSet.hidden = !registered;
      if (registered) {
        els.dimsFromSet.textContent = `寸法は「${registered.name}」で決まっています（${setDimLabel(registered)}）。`;
      }
    }
    // 舞台の上で選んだところから、登録側の寸法へ直接入れるようにする
    if (els.openSetInfo) els.openSetInfo.hidden = !registered;
    if (registered || !own) {
      if (els.dims) els.dims.innerHTML = "";
      return;
    }
    buildDimControls(els.dims, "stage-dim", type, own, () => {
      render();
      persistSoon();
    });
  }

  els.pieceSize.addEventListener("input", (event) => {
    const piece = selectedPiece();
    if (!piece) return;
    piece.size = Number(event.target.value);
    els.sizeValue.textContent = cmText(pieceHeightM(piece) * (piece.size / 100));
    render();
    persistSoon();
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

  buildPanelHeads();
  applyLayout();
  syncInputs();
  renderScenes();
  renderCast();
  renderSets();
  renderLights();
  renderRigs();
  renderVenueControls();
  setTool("select");
  updateInspector();
  updateHistoryButtons();
  render();
  els.saveStatus.textContent = loaded.restored
    ? "この端末に保存した前回のスケッチを開きました。"
    : "変更はこの端末のブラウザ内へ自動保存します。";
})();

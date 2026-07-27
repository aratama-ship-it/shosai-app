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
  const SCENE_STUDIES = Array.isArray(window.SHOSAI_SCENE_STUDIES)
    ? window.SHOSAI_SCENE_STUDIES
    : [];

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
  /* ---------- 初期化（テスト用） ----------
     ?fresh を付けて開くと、舞台スケッチの持ちものだけ消して開き直す。
     初めて来た人とまったく同じ状態（案内も自動で出る）を作れるので、
     チュートリアルの通し確認や、人に見せる前の仕切り直しに使う。
     ★消すのは舞台スケッチの4つだけ。他の画面のものは触らない。
     ?tour を付けると、消さずに案内だけ出す。 */
  const STAGE_KEYS = [
    "shosai-stage-sketch-v1", "shosai-stage-shows-v1",
    "shosai-stage-tour-v1", "shosai-stage-lang",
  ];
  const openArgs = new URLSearchParams(window.location.search);
  if (openArgs.has("fresh")) {
    STAGE_KEYS.forEach((key) => {
      try { localStorage.removeItem(key); } catch (_) { /* 消せなくても続ける */ }
    });
    // ?fresh を落としたところへ入り直す（読み直すたびに消えるのを避ける）
    window.location.replace(window.location.pathname);
    return;
  }

  const STORAGE_KEY = "shosai-stage-sketch-v1";          // いま開いているショー
  const SHOWS_KEY = "shosai-stage-shows-v1";              // 端末に置いた全ショー
  const HISTORY_LIMIT = 36;
  /* 舞台に置ける駒の型。★舞台セットの種類（SET_KINDS）を足したら、
   * ここにも足すこと。無い型は「演者」に落とされる（実際に踏んだ）。 */
  const PIECE_TYPES = {
    performer: "演者",
    block: "台・箱",
    table: "テーブル",
    chair: "椅子",
    bench: "ベンチ",
    stool: "スツール",
    wall: "壁",
    trapeze: "トラピーズ",
    cyrwheel: "シルホイール",
    pole: "チャイニーズポール",
    teeter: "ティーターボード",
    tissue: "エアリアルティシュー",
    wire: "綱渡り",
    suitcase: "スーツケース",
    trampoline: "トランポリン",
    cane: "ハンドバランス用cane",
    car: "車",
    sphere: "球",
    light: "照明",
  };
  // 実寸の目安（m）。人を基準に置くと、舞台の規模が見た目に出る
  const PIECE_METERS = {
    performer: 1.65,
    block: 1.2,
    table: 0.72,
    chair: 0.9,
    bench: 0.45,
    stool: 0.62,
    wall: 2.5,
    trapeze: 0.06, cyrwheel: 1.9, pole: 6, teeter: 0.75, tissue: 7,
    wire: 1.2, suitcase: 0.44, trampoline: 0.95, cane: 0.75, car: 1.45,
    sphere: 1.2,
    light: 2.5,
  };
  // 台・テーブル・椅子・球・光は実寸（m）で持つ。人だけが身長で決まるのに対し、
  // セットは幅・奥行き・高さがそれぞれ意味を持つので、一つの倍率では表せない。
  const PIECE_DIMS = {
    block: { w: 2.04, d: 0.66, h: 1.2 },   // 平台1枚ぶんの見当
    table: { w: 1.6, d: 0.8, h: 0.72 },    // 一般的なダイニングテーブル
    chair: { h: 0.9 },                     // 背もたれの上端まで。幅と奥行きはここから決まる
    bench: { w: 1.8, d: 0.4, h: 0.45 },    // 横長のベンチ。座面までの高さ
    stool: { w: 0.36, d: 0.36, h: 0.62 },  // スツール。座面までの高さ
    /* サーカスの道具。寸法は実物のおよその値。
     * トラピーズは吊りバーの幅、ティシューは布の長さ、綱は張る長さ。 */
    trapeze: { w: 0.7, d: 0.06, h: 0.06 },
    cyrwheel: { dia: 1.9 },
    pole: { w: 0.06, d: 0.06, h: 6 },
    teeter: { w: 3.6, d: 0.45, h: 0.75 },
    tissue: { w: 0.3, d: 0.06, h: 7 },
    wire: { w: 6, d: 0.06, h: 1.2 },
    suitcase: { w: 0.62, d: 0.24, h: 0.44 },
    trampoline: { w: 3.05, d: 1.7, h: 0.95 },
    cane: { w: 0.5, d: 0.3, h: 0.75 },
    car: { w: 4.3, d: 1.8, h: 1.45 },
    // 壁は厚みを固定で持つ（舞台の壁は建て込みの板なので、厚みは決まっている）
    wall: { w: 3, d: 0.3, h: 2.5 },
    sphere: { dia: 1.2, lift: 0 },         // 直径と、床からの高さ
    light: { dia: 4 },                     // 床に落ちる明かりの円の直径
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
    wall: { w: "幅", h: "高さ" },
    bench: { h: "座面までの高さ" },
    stool: { h: "座面までの高さ" },
    trapeze: { w: "バーの幅" },
    pole: { h: "ポールの高さ" },
    teeter: { w: "板の長さ", h: "支点の高さ" },
    tissue: { h: "布の長さ", w: "布の間隔" },
    wire: { w: "張る長さ", h: "綱の高さ" },
    trampoline: { h: "ベッドの高さ" },
    cane: { w: "左右の間隔", h: "cane の高さ" },
    light: { dia: "直径（床に落ちる円の広さ）" },
  };
  function dimLabel(kind, key) {
    if (isEn()) {
      return tm("dimBy", `${kind}.${key}`, null) || tm("dim", key, DIM_META[key].label);
    }
    return (DIM_LABELS[kind] && DIM_LABELS[kind][key]) || DIM_META[key].label;
  }

  // 姿勢・道具・駒・明かりの名前。言語を見て選ぶ
  const poseName = (pose) => (pose ? tm("pose", pose.id, pose.label) : "");
  const setKindName = (kind) => tm("setKind", kind, SET_KINDS[kind] || kind);
  const pieceTypeName = (type) => tm("pieceType", type, PIECE_TYPES[type] || type);
  const lightKindName = (key) => tm("lightKind", key, LIGHT_KINDS[key].label);
  const lightKindNote = (key) => tm("lightNote", key, LIGHT_KINDS[key].note);
  const venueName = (v) => tm("venue", v.id, v.label);
  const venueShortName = (v) => tm("venueShort", v.id, v.short);
  const venueNoteText = (v) => tm("venueNote", v.id, v.note);
  const sizeName = (z) => tm("size", z.id, z.label);
  const seatName = (seat) => tm("seat", seat.id, seat.label);
  const seatShortName = (seat) => tm("seatShort", seat.id, seat.short);
  const seatNoteText = (seat) => tm("seatNote", seat.id, seat.note);
  // 椅子は大きさ一つで決まる。幅と奥行きはそこから割り出す
  /* 舞台セットに登録できる形。光もここに含める。登録・出し入れ・寸法の
   * 仕組みが同じなので同じ入れ物に置き、一覧だけ「光」パネルへ分けて出す。 */
  const SET_KINDS = {
    block: "台・箱", table: "テーブル", chair: "椅子", bench: "ベンチ", stool: "スツール",
    wall: "壁", sphere: "球",
    trapeze: "トラピーズ", cyrwheel: "シルホイール", pole: "チャイニーズポール",
    teeter: "ティーターボード", tissue: "エアリアルティシュー", wire: "綱渡り",
    suitcase: "スーツケース", trampoline: "トランポリン", cane: "ハンドバランス用cane",
    car: "車",
    light: "照明",
  };
  // 吊物にしかならない道具。床に置く形を持たない
  const FLOWN_ONLY = { trapeze: true, tissue: true };
  const WALL_THICKNESS = 0.3;   // 壁の厚み（m）。触らせず固定で持つ
  /* 明かりの種類。仕込む場所と当てる高さが種類ごとに決まっているので、
   * 舞台へ出したときの既定値をここに持つ（出したあとは自由に動かせる）。
   *   hang  … 吊り。バトンから真下へ落とす
   *   ss    … サイドスポット。袖のスタンドから、舞台を横切って体へ
   *   front … 前明かり。客席の上から、顔の高さへ
   *   floor … 転がし。床置きで、下から体へ
   * dia は床（または当たる高さ）での照明の直径。 */
  const LIGHT_KINDS = {
    hang: {
      label: "吊り", note: "バトンから真下へ",
      dia: 4, h: 6, toH: 0,
      source: (u, v) => ({ u, v }),
    },
    ss: {
      label: "SS（横から）", note: "袖のスタンドから舞台を横切って",
      dia: 2.6, h: 1.7, toH: 1.3,
      // 近い側の袖から。反対側から当てたいときは左右のつまみで振る
      source: (u, v) => ({ u: u <= 0.5 ? -0.06 : 1.06, v }),
    },
    front: {
      label: "前明かり", note: "客席の上から顔へ",
      dia: 3.4, h: 8, toH: 1.5,
      source: (u) => ({ u, v: 1.35 }),
    },
    floor: {
      label: "転がし", note: "床置きから下向きに体へ",
      dia: 3, h: 0.18, toH: 1.6,
      // 舞台のツラ（手前の端）に置く。奥に置くときは奥行きのつまみで送る
      source: (u) => ({ u, v: 1 }),
    },
  };
  const LIGHT_KIND_ORDER = ["hang", "ss", "front", "floor"];
  const lightKindOf = (item) => (item && LIGHT_KINDS[item.lightKind] ? item.lightKind : "hang");
  const SET_KIND_ORDER = [
    "block", "table", "chair", "bench", "stool", "wall", "sphere",
    "trapeze", "cyrwheel", "pole", "teeter", "tissue", "wire",
    "suitcase", "trampoline", "cane", "car",
  ];
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
    /* 側方宙返り（サイドフリップ）。体の左右の面で回るので、
     * 脚は前後ではなく左右へ開く。頭が下、腰が上を通る瞬間を採る。 */
    makePose("sideflip", "側方宙返り", {
      head: [-0.34, 0.30, 0], neck: [-0.28, 0.38, 0],
      shL: [-0.22, 0.46, -0.10], shR: [-0.20, 0.44, 0.10],
      elL: [-0.34, 0.30, -0.16], elR: [-0.32, 0.28, 0.16],
      wrL: [-0.44, 0.14, -0.20], wrR: [-0.42, 0.12, 0.20],
      hipL: [0.02, 0.66, -0.055], hipR: [0.03, 0.65, 0.055],
      knL: [0.26, 0.60, -0.10], anL: [0.46, 0.52, -0.12], toL: [0.53, 0.49, -0.12],
      knR: [0.24, 0.78, 0.10], anR: [0.44, 0.86, 0.12], toR: [0.51, 0.89, 0.12],
    }, { face: [0, -0.4, 0.9] }),
    makePose("run", "走る", {
      // 歩くより深く。前の膝を高く上げ、体をやや前へ倒す
      knR: [0.07, 0.44, 0.26], anR: [0.075, 0.24, 0.16], toR: [0.075, 0.20, 0.26],
      knL: [-0.07, 0.24, -0.20], anL: [-0.075, 0.06, -0.38], toL: [-0.075, 0.02, -0.46],
      hipL: [-0.055, 0.52, 0.02], hipR: [0.055, 0.52, 0.02],
      shL: [-0.115, 0.81, 0.05], shR: [0.115, 0.81, 0.05],
      elL: [-0.15, 0.66, 0.20], wrL: [-0.13, 0.74, 0.36],
      elR: [0.15, 0.64, -0.14], wrR: [0.13, 0.56, -0.30],
      neck: [0, 0.85, 0.06], head: [0, 0.93, 0.10],
    }),
    /* バク転の途中。腰が頂点にあり、手はまだ床に着いていない。
     * 背中側へ反っているので、胸は上を向く。 */
    makePose("backflip", "バク転", {
      wrL: [-0.13, 0.10, -0.46], wrR: [0.13, 0.10, -0.46],
      elL: [-0.14, 0.34, -0.40], elR: [0.14, 0.34, -0.40],
      shL: [-0.115, 0.58, -0.28], shR: [0.115, 0.58, -0.28],
      neck: [0, 0.50, -0.34], head: [0, 0.40, -0.40],
      hipL: [-0.055, 0.86, 0.04], hipR: [0.055, 0.86, 0.04],
      knL: [-0.08, 0.96, 0.34], knR: [0.08, 0.98, 0.30],
      anL: [-0.085, 0.86, 0.62], anR: [0.085, 0.90, 0.58],
      toL: [-0.085, 0.82, 0.70], toR: [0.085, 0.86, 0.66],
    }, { face: [0, 0.7, -0.7], sideView: true }),
    makePose("hat", "帽子をかぶる", {
      // 立ち姿で、片手をつばへ添える
      elR: [0.17, 0.64, 0.06], wrR: [0.12, 0.82, 0.14],
      elL: [-0.13, 0.63, 0.015], wrL: [-0.14, 0.45, 0.03],
    }, { props: [
      { kind: "ring", c: [0, 0.985, 0], r: 0.15, w: 0.03, tone: "dark", plane: "xz" },
      { kind: "dot", c: [0, 1.01, 0], r: 0.075, tone: "dark" },
    ] }),
    /* ---------- 芸と音楽の姿勢 ----------
     * 道具を持つものは、姿勢が小道具を一緒に持つ（人だけでは何をしているか読めない）。
     * 道具の位置は手や足の関節に合わせてあるので、向きを変えても手から離れない。 */
    makePose("sing", "歌う（マイク）", {
      // 片手をマイクへ、もう片方は開く
      elR: [0.16, 0.62, 0.08], wrR: [0.10, 0.79, 0.12],
      elL: [-0.19, 0.60, -0.02], wrL: [-0.24, 0.44, 0.02],
      head: [0, 0.945, 0.02],
    }, { props: [
      { kind: "line", a: [0.10, 0.79, 0.12], b: [0.055, 0.90, 0.10], w: 0.022, tone: "gear" },
      { kind: "dot", c: [0.05, 0.915, 0.10], r: 0.028, tone: "dark" },
    ] }),
    makePose("juggle", "ジャグリング", {
      // 両手を胸の前へ開き、玉が弧を描いて上がっている
      elL: [-0.20, 0.60, 0.10], elR: [0.20, 0.60, 0.10],
      wrL: [-0.20, 0.72, 0.20], wrR: [0.20, 0.72, 0.20],
    }, { props: [
      { kind: "dot", c: [-0.20, 0.80, 0.20], r: 0.035, tone: "ball" },
      { kind: "dot", c: [0, 1.16, 0.16], r: 0.035, tone: "ball" },
      { kind: "dot", c: [0.20, 0.80, 0.20], r: 0.035, tone: "ball" },
    ] }),
    makePose("guitar", "ギターを弾く", {
      // 左手は棹の上、右手は胴の前
      elL: [-0.22, 0.63, 0.10], wrL: [-0.30, 0.72, 0.14],
      elR: [0.17, 0.60, 0.14], wrR: [0.06, 0.60, 0.20],
    }, { props: [
      { kind: "line", a: [-0.34, 0.75, 0.15], b: [0.06, 0.58, 0.19], w: 0.028, tone: "wood" },
      { kind: "dot", c: [0.10, 0.565, 0.20], r: 0.11, tone: "wood" },
    ] }),
    makePose("trumpet", "トランペットを吹く", {
      // 両手を口元へ。ラッパは斜め上へ向く
      elL: [-0.19, 0.63, 0.10], wrL: [-0.10, 0.76, 0.16],
      elR: [0.19, 0.63, 0.10], wrR: [0.03, 0.76, 0.20],
    }, { props: [
      { kind: "line", a: [-0.02, 0.855, 0.10], b: [0.09, 0.90, 0.30], w: 0.03, tone: "gear" },
      { kind: "dot", c: [0.11, 0.91, 0.33], r: 0.06, tone: "gear" },
    ] }),
    /* 踊り。形の違いが読めることを第一にする（腕の高さ・脚の開き・体の傾きを
     * それぞれ変える）。細かな流派の再現ではなく、絵として見分けがつくこと。 */
    makePose("dance1", "踊る・両手を斜め上へ", {
      elL: [-0.24, 0.90, 0.02], wrL: [-0.34, 1.06, 0.04],
      elR: [0.24, 0.90, 0.02], wrR: [0.34, 1.06, 0.04],
      knL: [-0.10, 0.27, 0.05], anL: [-0.13, 0.04, 0.06],
      knR: [0.10, 0.27, 0.05], anR: [0.13, 0.04, 0.06],
    }),
    makePose("dance2", "踊る・踏み込む", {
      // 前へ大きく踏み込み、後ろ手を引く
      hipL: [-0.055, 0.50, 0.02], hipR: [0.055, 0.50, 0.02],
      knR: [0.09, 0.30, 0.26], anR: [0.10, 0.05, 0.42], toR: [0.10, 0.02, 0.50],
      knL: [-0.08, 0.28, -0.16], anL: [-0.08, 0.05, -0.30], toL: [-0.08, 0.02, -0.36],
      elR: [0.20, 0.66, 0.20], wrR: [0.24, 0.80, 0.34],
      elL: [-0.18, 0.60, -0.16], wrL: [-0.22, 0.48, -0.30],
    }),
    makePose("dance3", "踊る・腰を落として開く", {
      hipL: [-0.07, 0.44, 0], hipR: [0.07, 0.44, 0],
      knL: [-0.22, 0.25, 0.06], anL: [-0.30, 0.04, 0.04],
      knR: [0.22, 0.25, 0.06], anR: [0.30, 0.04, 0.04],
      shL: [-0.115, 0.75, 0], shR: [0.115, 0.75, 0],
      elL: [-0.26, 0.66, 0.06], wrL: [-0.34, 0.56, 0.12],
      elR: [0.26, 0.66, 0.06], wrR: [0.34, 0.56, 0.12],
      neck: [0, 0.79, 0], head: [0, 0.87, 0.01],
    }),
    makePose("dance4", "踊る・跳ぶ", {
      // 床から離れ、脚を左右へ開く
      hipL: [-0.055, 0.66, 0], hipR: [0.055, 0.66, 0],
      knL: [-0.24, 0.50, 0.04], anL: [-0.38, 0.36, 0.02], toL: [-0.44, 0.31, 0.04],
      knR: [0.24, 0.50, 0.04], anR: [0.38, 0.36, 0.02], toR: [0.44, 0.31, 0.04],
      shL: [-0.115, 0.96, 0], shR: [0.115, 0.96, 0],
      elL: [-0.24, 1.06, 0.02], wrL: [-0.30, 1.20, 0.04],
      elR: [0.24, 1.06, 0.02], wrR: [0.30, 1.20, 0.04],
      neck: [0, 1.00, 0], head: [0, 1.08, 0.01],
    }),
    makePose("dance5", "踊る・体をひねる", {
      // 上半身をひねり、腕を胸の前で交差させる
      shL: [-0.10, 0.82, 0.06], shR: [0.12, 0.81, -0.06],
      elL: [-0.10, 0.66, 0.18], wrL: [0.10, 0.62, 0.14],
      elR: [0.20, 0.66, 0.04], wrR: [0.02, 0.70, 0.16],
      hipL: [-0.06, 0.51, -0.02], hipR: [0.05, 0.52, 0.02],
      knL: [-0.08, 0.28, 0.06], anL: [-0.09, 0.04, 0.02],
      knR: [0.07, 0.28, -0.04], anR: [0.08, 0.05, -0.10], toR: [0.08, 0.02, -0.17],
      neck: [0, 0.86, 0.02], head: [0, 0.94, 0.06],
    }),
    /* ウィンドミル。背中と肩で床を受け、脚を大きく開いて回る。
     * 体はほぼ水平で、腰が浮いている瞬間を採る。 */
    makePose("windmill", "ウィンドミル", {
      head: [-0.16, 0.13, 0.18], neck: [-0.10, 0.16, 0.12],
      shL: [-0.06, 0.20, 0.02], shR: [-0.02, 0.14, -0.10],
      elL: [-0.10, 0.06, 0.16], wrL: [-0.14, 0.03, 0.28],
      elR: [0.10, 0.10, -0.16], wrR: [0.18, 0.05, -0.24],
      hipL: [0.10, 0.30, 0.04], hipR: [0.14, 0.26, -0.06],
      knL: [0.28, 0.46, 0.20], anL: [0.40, 0.62, 0.34], toL: [0.44, 0.68, 0.40],
      knR: [0.30, 0.34, -0.22], anR: [0.42, 0.24, -0.40], toR: [0.46, 0.20, -0.47],
    }, { wide: [0, 1, 0], face: [0, 0.2, 0.9], sideView: true }),
    makePose("skate", "ローラースケート", {
      // 滑る姿勢。膝を軽く曲げ、体をやや前へ倒す
      hipL: [-0.055, 0.50, 0.02], hipR: [0.055, 0.50, 0.02],
      knL: [-0.07, 0.28, 0.10], anL: [-0.075, 0.075, 0.12],
      knR: [0.07, 0.28, -0.02], anR: [0.075, 0.075, 0.00],
      shL: [-0.115, 0.80, 0.06], shR: [0.115, 0.80, 0.06],
      elL: [-0.18, 0.64, 0.14], wrL: [-0.20, 0.52, 0.24],
      elR: [0.18, 0.64, 0.14], wrR: [0.20, 0.52, 0.24],
      neck: [0, 0.84, 0.06], head: [0, 0.92, 0.09],
    }, { props: [
      { kind: "line", a: [-0.075, 0.035, 0.05], b: [-0.075, 0.035, 0.19], w: 0.035, tone: "dark" },
      { kind: "line", a: [0.075, 0.035, -0.07], b: [0.075, 0.035, 0.07], w: 0.035, tone: "dark" },
    ] }),
    makePose("unicycle", "一輪車", {
      // サドルに座り、脚はペダルへ。腕は左右へ開いて釣り合いを取る
      hipL: [-0.055, 0.66, 0], hipR: [0.055, 0.66, 0],
      knL: [-0.10, 0.50, 0.22], anL: [-0.10, 0.34, 0.10], toL: [-0.10, 0.31, 0.18],
      knR: [0.10, 0.46, 0.14], anR: [0.10, 0.30, -0.06], toR: [0.10, 0.27, 0.02],
      shL: [-0.115, 0.96, 0], shR: [0.115, 0.96, 0],
      elL: [-0.26, 0.94, 0.02], wrL: [-0.40, 0.98, 0.04],
      elR: [0.26, 0.94, 0.02], wrR: [0.40, 0.98, 0.04],
      neck: [0, 1.00, 0], head: [0, 1.08, 0.01],
    }, { props: [
      { kind: "line", a: [0, 0.62, 0], b: [0, 0.30, 0], w: 0.03, tone: "gear" },
      { kind: "ring", c: [0, 0.30, 0], r: 0.30, w: 0.035, tone: "dark" },
      { kind: "dot", c: [0, 0.30, 0], r: 0.03, tone: "gear" },
    ] }),
    makePose("skateboard", "スケートボード", {
      // 板の上に横向きで乗る。膝を曲げ、腕で釣り合いを取る
      hipL: [-0.055, 0.50, -0.06], hipR: [0.055, 0.50, 0.06],
      knL: [-0.09, 0.28, -0.14], anL: [-0.09, 0.10, -0.20], toL: [-0.09, 0.07, -0.27],
      knR: [0.09, 0.28, 0.14], anR: [0.09, 0.10, 0.20], toR: [0.09, 0.07, 0.27],
      elL: [-0.22, 0.66, -0.06], wrL: [-0.30, 0.74, -0.14],
      elR: [0.22, 0.66, 0.10], wrR: [0.30, 0.74, 0.18],
      neck: [0, 0.86, 0.02], head: [0, 0.94, 0.04],
    }, { props: [
      { kind: "line", a: [0, 0.05, -0.36], b: [0, 0.05, 0.36], w: 0.05, tone: "dark" },
      { kind: "dot", c: [0, 0.025, -0.24], r: 0.028, tone: "gear" },
      { kind: "dot", c: [0, 0.025, 0.24], r: 0.028, tone: "gear" },
    ] }),
    makePose("bicycle", "自転車", {
      // 前傾してハンドルを握る。脚はペダルの上下へ
      hipL: [-0.055, 0.62, -0.10], hipR: [0.055, 0.62, -0.10],
      knL: [-0.09, 0.44, 0.14], anL: [-0.09, 0.26, 0.06], toL: [-0.09, 0.23, 0.14],
      knR: [0.09, 0.40, 0.04], anR: [0.09, 0.22, -0.10], toR: [0.09, 0.19, -0.02],
      shL: [-0.11, 0.86, 0.06], shR: [0.11, 0.86, 0.06],
      elL: [-0.16, 0.80, 0.24], wrL: [-0.18, 0.78, 0.40],
      elR: [0.16, 0.80, 0.24], wrR: [0.18, 0.78, 0.40],
      neck: [0, 0.90, 0.10], head: [0, 0.96, 0.16],
    }, { props: [
      { kind: "ring", c: [0, 0.33, 0.50], r: 0.33, w: 0.03, tone: "dark" },
      { kind: "ring", c: [0, 0.33, -0.52], r: 0.33, w: 0.03, tone: "dark" },
      { kind: "line", a: [0, 0.33, -0.52], b: [0, 0.62, -0.12], w: 0.025, tone: "gear" },
      { kind: "line", a: [0, 0.62, -0.12], b: [0, 0.30, 0.04], w: 0.025, tone: "gear" },
      { kind: "line", a: [0, 0.30, 0.04], b: [0, 0.33, 0.50], w: 0.025, tone: "gear" },
      { kind: "line", a: [0, 0.62, -0.12], b: [0, 0.78, 0.40], w: 0.025, tone: "gear" },
      { kind: "line", a: [-0.20, 0.78, 0.40], b: [0.20, 0.78, 0.40], w: 0.025, tone: "gear" },
    ] }),
    /* シルホイール。輪の中に人が入り、両手両足で輪をとらえて回る道具。
     * 動力は人力だけで、輪と接しているのは両手と両足の四点。
     * 輪の直径は演者の身長＋十数cm（身長165cmで1.85m前後）が実物の目安。
     * ここでは身長の1.12倍とし、輪は床に接する（中心が半径の高さに来る）。
     * 手足はきっちり輪の上に置く（四点とも中心から半径ぴったりの位置）。 */
    makePose("cyr", "シルホイール", {
      head: [0, 0.945, 0], neck: [0, 0.86, 0],
      shL: [-0.115, 0.82, 0], shR: [0.115, 0.82, 0],
      elL: [-0.29, 0.83, 0], elR: [0.29, 0.83, 0],
      wrL: [-0.459, 0.881, 0], wrR: [0.459, 0.881, 0],     // 輪の上（斜め上）
      hipL: [-0.055, 0.52, 0], hipR: [0.055, 0.52, 0],
      knL: [-0.22, 0.33, 0], knR: [0.22, 0.33, 0],
      anL: [-0.36, 0.131, 0], anR: [0.36, 0.131, 0],       // 輪の上（斜め下）
      // つま先は輪から外へ出さず、輪に沿わせる（足の裏で輪をとらえている）
      toL: [-0.306, 0.086, 0.03], toR: [0.306, 0.086, 0.03],
    }, { wheel: { r: 0.56, cy: 0.56 } }),
    /* 抱え込み宙返り。空中で身体をひとつの塊に丸めた形。背中が床側、膝が天井側。
     * ★首は「丸める側」へ曲げる。肩より下へ出すと顎が上がった格好になり、
     *   宙返りではなく仰向けで浮いた人になる。頭は肩の上、膝の側へ。
     * ★膝はおよそ直角（本人指定）。踵を尻まで引くほど畳むと、
     *   絵として脚が消えて塊が読めなくなる。腿と脛は同じ長さで持つ。
     * 腕は脛を抱える。y の原点は床のままなので、塊ごと1m前後の高さへ浮かせる。 */
    makePose("tuck", "抱え込み宙返り", {
      // 胴は塊の下側を通す（腰＝後ろ、肩＝前でほぼ水平）
      hipL: [-0.055, 0.86, -0.13], hipR: [0.055, 0.86, -0.13],
      shL: [-0.105, 0.88, 0.13], shR: [0.105, 0.88, 0.13],
      // 首から上は前ではなく上へ折る。前へ伸ばすと背骨と一本の棒になる
      neck: [0, 0.945, 0.185],
      head: [0, 1.025, 0.185],
      /* 腿は腰から胸の側（顎の下）へ抱え込み、脛はそこで折り返して
       * 踵を尻の上へ持っていく。★膝の折り目（膝の裏）は身体の側を向く。
       * 脛を胸の前へ回すと、膝が逆へ曲がって見える。 */
      knL: [-0.085, 1.013, 0.068], knR: [0.085, 1.013, 0.068],
      anL: [-0.08, 1.108, -0.163], anR: [0.08, 1.108, -0.163],
      toL: [-0.078, 1.131, -0.218], toR: [0.078, 1.131, -0.218],
      // 腕は脛を抱える。肘は身体の外へ張り出す
      elL: [-0.215, 0.885, 0.17], elR: [0.215, 0.885, 0.17],
      wrL: [-0.10, 1.005, 0.015], wrR: [0.10, 1.005, 0.015],
    }, { face: [0, 0.5, 0.85], sideView: true }),
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
      const pose = poseById(id);
      const j = pose.joints;
      const pad = 0.05;   // 手足の太さと胴の厚みぶん
      let x0 = Infinity; let x1 = -Infinity; let y1 = -Infinity; let z0 = Infinity; let z1 = -Infinity;
      Object.keys(j).forEach((k) => {
        x0 = Math.min(x0, j[k][0]); x1 = Math.max(x1, j[k][0]);
        y1 = Math.max(y1, j[k][1]);
        z0 = Math.min(z0, j[k][2]); z1 = Math.max(z1, j[k][2]);
      });
      // 道具を持つ姿勢は、道具の外側までが占める範囲になる（輪は人より大きい）
      if (pose.wheel) {
        x0 = Math.min(x0, -pose.wheel.r); x1 = Math.max(x1, pose.wheel.r);
        y1 = Math.max(y1, pose.wheel.cy + pose.wheel.r);
      }
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
  const SOLID_TYPES = {
    block: true, table: true, chair: true, bench: true, stool: true, wall: true,
    trapeze: true, cyrwheel: true, pole: true, teeter: true, tissue: true, wire: true,
    suitcase: true, trampoline: true, cane: true, car: true,
  };
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
    route: "平面図で演者や物、明かりを掴み、離した所が行き先になります。真ん中の丸を引くと動線が曲がります。",
    note: "何もない所を押すとメモを貼れます。貼ったメモは掴んで動かせます。",
    light: "照明だけを動かします。丸い印が灯体、明るい輪が当たる場所です。",
  };

  const els = {
    undo: document.getElementById("stage-undo"),
    redo: document.getElementById("stage-redo"),
    export: document.getElementById("stage-export"),
    lang: document.getElementById("stage-lang"),
    tour: document.getElementById("stage-tour"),
    tourRing: document.getElementById("stage-tour-ring"),
    tourShadePath: document.getElementById("stage-tour-shade-path"),
    tourCard: document.getElementById("stage-tour-card"),
    tourStep: document.getElementById("stage-tour-step"),
    tourTitle: document.getElementById("stage-tour-title"),
    tourBody: document.getElementById("stage-tour-body"),
    tourPrev: document.getElementById("stage-tour-prev"),
    tourNext: document.getElementById("stage-tour-next"),
    tourClose: document.getElementById("stage-tour-close"),
    tourStart: document.getElementById("stage-tour-start"),
    feedback: document.getElementById("stage-feedback"),
    exportModal: document.getElementById("stage-export-modal"),
    exportBackdrop: document.getElementById("stage-export-backdrop"),
    exportClose: document.getElementById("stage-export-close"),
    exportRun: document.getElementById("stage-export-run"),
    exportNote: document.getElementById("stage-export-note"),
    toolHint: document.getElementById("stage-tool-hint"),
    toolHelp: document.getElementById("stage-tool-help"),
    background: document.getElementById("stage-bg-color"),
    paintColor: document.getElementById("stage-paint-color"),
    brushSize: document.getElementById("stage-brush-size"),
    brushValue: document.getElementById("stage-brush-value"),
    clearPaint: document.getElementById("stage-clear-paint"),
    selectionEmpty: document.getElementById("stage-selection-empty"),
    selectionControls: document.getElementById("stage-selection-controls"),
    selectedName: document.getElementById("stage-selected-name"),
    dimsFromSet: document.getElementById("stage-dims-from-set"),
    openSetInfo: document.getElementById("stage-open-setinfo"),
    routeClear: document.getElementById("stage-route-clear"),
    pieceLock: document.getElementById("stage-piece-lock"),
    facingControls: document.getElementById("stage-facing-controls"),
    planRoute: document.getElementById("stage-plan-route"),
    planNote: document.getElementById("stage-plan-note"),
    frontNote: document.getElementById("stage-front-note"),
    frontZoom: document.getElementById("stage-front-zoom"),
    planZoom: document.getElementById("stage-plan-zoom"),
    rename: document.getElementById("stage-rename"),
    renameBackdrop: document.getElementById("stage-rename-backdrop"),
    renameInput: document.getElementById("stage-rename-input"),
    renameOk: document.getElementById("stage-rename-ok"),
    renameClose: document.getElementById("stage-rename-close"),
    renameTitle: document.getElementById("stage-rename-title"),
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
    venueW: document.getElementById("stage-venue-w"),
    venueD: document.getElementById("stage-venue-d"),
    venueH: document.getElementById("stage-venue-h"),
    venueWLabel: document.getElementById("stage-venue-w-label"),
    venueDCell: document.getElementById("stage-venue-d-cell"),
    venueReset: document.getElementById("stage-venue-reset"),
    bgSection: document.getElementById("stage-bg-section"),
    seatSection: document.getElementById("stage-seat-section"),
    seatList: document.getElementById("stage-seat-list"),
    projectTitle: document.getElementById("stage-project-title"),
    versionLabel: document.getElementById("stage-version-label"),
    versionCopy: document.getElementById("stage-version-copy"),
    versionNote: document.getElementById("stage-version-note"),
    exportJson: document.getElementById("stage-export-json"),
    importJson: document.getElementById("stage-import-json"),
    studyBody: document.getElementById("stage-study-body"),
    sceneList: document.getElementById("stage-scene-list"),
    sceneResize: document.getElementById("stage-scene-resize"),
    sceneAdd: document.getElementById("stage-scene-add"),
    sceneDup: document.getElementById("stage-scene-dup"),
    sceneDel: document.getElementById("stage-scene-del"),
    scenePrev: document.getElementById("stage-scene-prev"),
    sceneNext: document.getElementById("stage-scene-next"),
    animScenes: document.getElementById("stage-anim-scenes"),
    animMs: document.getElementById("stage-anim-ms"),
    animMsValue: document.getElementById("stage-anim-ms-value"),
    castList: document.getElementById("stage-cast-list"),
    pieceFacing: document.getElementById("stage-piece-facing"),
    piecePose: document.getElementById("stage-piece-pose"),
    poseLabel: document.getElementById("stage-pose-label"),
    poseModal: document.getElementById("stage-pose"),
    poseBackdrop: document.getElementById("stage-pose-backdrop"),
    poseClose: document.getElementById("stage-pose-close"),
    poseGrid: document.getElementById("stage-pose-grid"),
    showsOpen: document.getElementById("stage-shows-open"),
    showNew: document.getElementById("stage-show-new"),
    showsModal: document.getElementById("stage-shows"),
    showsBackdrop: document.getElementById("stage-shows-backdrop"),
    showsClose: document.getElementById("stage-shows-close"),
    showList: document.getElementById("stage-show-list"),
    facingValue: document.getElementById("stage-facing-value"),
    profile: document.getElementById("stage-profile"),
    profileBackdrop: document.getElementById("stage-profile-backdrop"),
    profileClose: document.getElementById("stage-profile-close"),
    profileName: document.getElementById("stage-profile-name"),
    profileHeight: document.getElementById("stage-profile-height"),
    profileHeightValue: document.getElementById("stage-profile-height-value"),
    profileColor: document.getElementById("stage-profile-color"),
    profileNote: document.getElementById("stage-profile-note"),
    rosterName: document.getElementById("stage-roster-name"),
    rosterKind: document.getElementById("stage-roster-kind"),
    rosterKindLabel: document.getElementById("stage-roster-kind-label"),
    kindModal: document.getElementById("stage-kind"),
    kindBackdrop: document.getElementById("stage-kind-backdrop"),
    kindClose: document.getElementById("stage-kind-close"),
    kindGrid: document.getElementById("stage-kind-grid"),
    rosterAdd: document.getElementById("stage-roster-add"),
    rosterEmpty: document.getElementById("stage-roster-empty"),
    groupCast: document.getElementById("stage-group-cast"),
    groupSets: document.getElementById("stage-group-sets"),
    lightName: document.getElementById("stage-light-name"),
    lightAdd: document.getElementById("stage-light-add"),
    lightKind: document.getElementById("stage-light-kind"),
    beamControls: document.getElementById("stage-beam-controls"),
    beamDia: document.getElementById("stage-beam-dia"),
    beamDiaValue: document.getElementById("stage-beam-dia-value"),
    beamU: document.getElementById("stage-beam-u"),
    beamUValue: document.getElementById("stage-beam-u-value"),
    beamV: document.getElementById("stage-beam-v"),
    beamVValue: document.getElementById("stage-beam-v-value"),
    beamFrom: document.getElementById("stage-beam-from"),
    beamFromValue: document.getElementById("stage-beam-from-value"),
    beamTo: document.getElementById("stage-beam-to"),
    beamToValue: document.getElementById("stage-beam-to-value"),
    beamReset: document.getElementById("stage-beam-reset"),
    setList: document.getElementById("stage-set-list"),
    lightList: document.getElementById("stage-light-list"),
    rigList: document.getElementById("stage-rig-list"),
    rigName: document.getElementById("stage-rig-name"),
    rigSave: document.getElementById("stage-rig-save"),
    sceneAddRig: document.getElementById("stage-scene-add-rig"),
    sceneSection: document.getElementById("stage-scene-section"),
    setInfo: document.getElementById("stage-setinfo"),
    setInfoBackdrop: document.getElementById("stage-setinfo-backdrop"),
    setInfoClose: document.getElementById("stage-setinfo-close"),
    setInfoTitle: document.getElementById("stage-setinfo-title"),
    setInfoName: document.getElementById("stage-setinfo-name"),
    setInfoDims: document.getElementById("stage-setinfo-dims"),
    setInfoColor: document.getElementById("stage-setinfo-color"),
    setInfoNote: document.getElementById("stage-setinfo-note"),
    setInfoKind: document.getElementById("stage-setinfo-kind"),
    setInfoFlown: document.getElementById("stage-setinfo-flown"),
    setInfoFlownRow: document.getElementById("stage-setinfo-flown-row"),
    setInfoFlownNote: document.getElementById("stage-setinfo-flown-note"),
    setInfoWires: document.getElementById("stage-setinfo-wires"),
    setInfoFramed: document.getElementById("stage-setinfo-framed"),
    setInfoFramedRow: document.getElementById("stage-setinfo-framed-row"),
    setInfoWiresRow: document.getElementById("stage-setinfo-wires-row"),
    liftControls: document.getElementById("stage-lift-controls"),
    pieceLift: document.getElementById("stage-piece-lift"),
    pieceLiftValue: document.getElementById("stage-piece-lift-value"),
    showFlown: document.getElementById("stage-show-flown"),
    setInfoKindRow: document.getElementById("stage-setinfo-lightkind"),
    frontInner: document.getElementById("stage-front-inner"),
    planInner: document.getElementById("stage-plan-inner"),
    showNames: document.getElementById("stage-show-names"),
    showSetNames: document.getElementById("stage-show-set-names"),
    showSeatMap: document.getElementById("stage-show-seatmap"),
    seatMapToggle: document.getElementById("stage-seatmap-toggle"),
    depthLabelBack: document.getElementById("stage-depth-back"),
    depthLabelFront: document.getElementById("stage-depth-front"),
  };

  const LANG_KEY = "shosai-stage-lang";

  /* ---------- 拡大（二本指） ----------
     絵そのものを拡大する。舞台の作りは変えず、見ている窓だけを動かす。
     描くときは canvas へ一枚の変換をかけ、掴むときはその逆をかける。
     ここを別々に持つと、指の下と駒がずれる。
     覚えておく必要のない一時の状態なので、保存はしない。 */
  const zoomState = {
    front: { z: 1, ox: 0, oy: 0 },
    plan: { z: 1, ox: 0, oy: 0 },
  };
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 5;

  const zoomOf = (view) => zoomState[view === "plan" ? "plan" : "front"];

  // 拡大しても、絵の外側が見えないように寄せ幅を丸める
  function clampZoom(zs) {
    zs.z = clamp(zs.z, ZOOM_MIN, ZOOM_MAX);
    const maxX = W - W / zs.z;
    const maxY = H - H / zs.z;
    zs.ox = clamp(zs.ox, 0, Math.max(0, maxX));
    zs.oy = clamp(zs.oy, 0, Math.max(0, maxY));
  }

  /* ---------- 言語 ----------
     日本語が正本。英語は stage-i18n.js の対訳から引く。
     画面に固定で置いてある文言は、切り替えのときだけ文字を差し替える
     （静的な文言は書き換わらないので、これで足りる）。
     中で組み立てる名前（姿勢・道具・劇場・席）は、作るたびに言語を見て選ぶ。 */
  const I18N = window.SHOSAI_I18N || { text: {}, maps: {} };
  let lang = "ja";
  const isEn = () => lang === "en";
  // 固定文言。日本語そのものを鍵にする
  const tx = (ja) => (isEn() && I18N.text[ja]) || ja;
  // 組み立てる名前。id を鍵にする
  const tm = (group, id, ja) => (isEn() && I18N.maps[group] && I18N.maps[group][id]) || ja;

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
      notes: [],
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
      // 名前は演者と舞台装置で別々に出し入れする
      showSetNames: true,
      // 正面図の隅に「客席のどこから見ているか」の小図を出すか
      showSeatMap: true,
      // 平面図で吊物（宙に吊ってあるもの）まで出すか
      showFlown: false,
      // 場面が変わるとき、動線に沿って動かして見せるか。秒数も持つ
      animateScenes: true,
      sceneAnimMs: 620,
      // 舞台が一度に入らない席での見回し（-1〜1）。左右と上下
      frontPan: 0,
      frontPanY: 0,
      // 畳んだセクション（idごと）。場面の入れ子を折りたたむのに使う
      closedSections: {},
      // 並べ替えや追加の起点になる行。セクションも起点になれる
      cursorRowId: null,
      // 場面の欄の高さ(px)。引いて変えたら覚えておく
      sceneListHeight: 320,
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
  /* 演者・舞台セット・光は「出るもの」一枚にまとめた（cast）。
   * 登録・出し入れ・寸法の仕組みが同じものを三つに割ると、目が三度行き来する。 */
  const PANELS = ["project", "venue", "cast", "rigs", "light", "background", "study", "scenes", "inspector", "save"];

  function defaultLayout() {
    return {
      // 場面は絵のすぐ右に置く（順番を見ながら描くため）
      cols: {
        project: "left", venue: "left", cast: "left", rigs: "left", light: "left", background: "left",
        study: "right", scenes: "right", inspector: "right", save: "right",
      },
      order: {
        project: 0, venue: 1, cast: 2, rigs: 3, light: 4, background: 5,
        study: -1, scenes: 0, inspector: 1, save: 2,
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
    const ja = ["客席", "客席・上手寄り", "上手", "奥・上手寄り", "奥（背中）", "奥・下手寄り", "下手", "客席・下手寄り"];
    const en = ["house", "house / stage left", "stage left", "upstage / stage left",
      "upstage (back)", "upstage / stage right", "stage right", "house / stage right"];
    const words = isEn() ? en : ja;
    if (d < 23 || d >= 338) return words[0];
    if (d < 68) return words[1];
    if (d < 113) return words[2];
    if (d < 158) return words[3];
    if (d < 203) return words[4];
    if (d < 248) return words[5];
    if (d < 293) return words[6];
    return words[7];
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

  const BEAM_DEFAULT_H = 6;      // 灯体の高さ(m)。中劇場のバトンのおよその高さ
  const BEAM_MAX_H = 18;

  function normalizeBeam(raw, piece) {
    const baseU = clamp(finite(piece && piece.u, 0.5), 0, 1);
    const baseV = clamp(finite(piece && piece.v, 0.6), 0, 1);
    const src = raw && typeof raw === "object" ? raw : {};
    return {
      // 灯体の平面位置。既定は落とす場所の真上（＝直下型）
      u: clamp(finite(src.u, baseU), -0.3, 1.3),
      v: clamp(finite(src.v, baseV), -0.3, 1.3),
      h: clamp(finite(src.h, BEAM_DEFAULT_H), 0, BEAM_MAX_H),
      // 当たる高さ。0で床。下から上への明かりは、ここを上げて灯体を下げる
      toH: clamp(finite(src.toH, 0), 0, BEAM_MAX_H),
    };
  }

  const VENUE_LIMITS = { width: [3, 60], depth: [3, 60], height: [2, 40] };

  function normalizeVenueDims(raw, size) {
    if (!raw || typeof raw !== "object") return null;
    const out = {};
    Object.keys(VENUE_LIMITS).forEach((key) => {
      if (raw[key] === undefined || raw[key] === null) return;
      const lim = VENUE_LIMITS[key];
      const value = clamp(finite(raw[key], size[key] || lim[0]), lim[0], lim[1]);
      out[key] = Math.round(value * 10) / 10;
    });
    return Object.keys(out).length ? out : null;
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
      /* 写したもとの駒の札。場面を写すと札は配り直されるので、
       * 登録の無い駒（最初から置いてある例など）は、これが無いと
       * 前の場面の自分と結び付けられない（転換で動かせない）。 */
      originId: typeof piece.originId === "string" ? piece.originId : null,
      // 体の向き（度）。0=客席を向く、90=上手を向く、180=背中
      facing: clamp(finite(piece.facing, 0), 0, 359),
      dims: normalizeDims(type, piece),
      // 姿勢。用意したものの中から選ぶ（形そのものは編集させない）
      pose: POSES.some((p) => p.id === piece.pose) ? piece.pose : "stand",
      /* 動線。この場面のあいだに、その駒がどこへ動くか。
       * 始点は駒そのものなので持たない（駒を動かせば矢印もついてくる）。
       * u,v が行き先、bu,bv が曲がり具合の control 点。真ん中に置けば直線になる。 */
      route: normalizeRoute(piece && piece.route),
      // 床からの高さ(m)と、支えている駒。どちらも置き場所から毎回引き直す派生値
      base: clamp(finite(piece.base, 0), 0, 40),
      supportId: null,
      /* 明かりの当て方。どこから出て、どこへ落ちるか。
       * 落ちる場所は駒そのもの（u,v）。ここには灯体の側だけを持つ。
       * 真上から落とす明かりが既定だが、斜めも、下から上へも同じ形で書ける。 */
      beam: normalizeBeam(piece && piece.beam, piece),
      /* 錠。掛けているあいだは掴んでも動かない。
       * 登録のあるもの（演者・セット・光）は登録側で持つので、ここは
       * 登録を持たない駒（最初から置いてある例など）のための控え。 */
      locked: Boolean(piece && piece.locked),
    };
  }

  // 台と球の実寸。dims を持たない古い保存は、size（倍率）から見た目が
  // 変わらないように割り戻す。それ以外の種類は寸法を持たない。
  /* 付箋。舞台の絵の上へ貼る覚え書き。
   * 貼る場所はその絵の上の一点で、掴んで動かす。
   * pieceId は前の版で駒に紐づけて貼れたときの名残。いま作るものは持たないが、
   * すでに貼ってあるものは駒についてまわる（勝手に置き場所を変えない）。
   * 場所は 1280×720 の絵の中の画素で持つ（絵の大きさは変わらないので素直）。 */
  function normalizeNote(raw) {
    if (!raw || typeof raw !== "object") return null;
    const text = typeof raw.text === "string" ? raw.text.slice(0, 200) : "";
    return {
      id: typeof raw.id === "string" ? raw.id : rid("note"),
      view: raw.view === "plan" ? "plan" : "front",
      x: clamp(finite(raw.x, 100), -200, 1480),
      y: clamp(finite(raw.y, 100), -200, 920),
      pieceId: typeof raw.pieceId === "string" ? raw.pieceId : null,
      text,
    };
  }

  function normalizeRoute(raw) {
    if (!raw || typeof raw !== "object") return null;
    const u = clamp(finite(raw.u, 0.5), 0, 1);
    const v = clamp(finite(raw.v, 0.5), 0, 1);
    return {
      u, v,
      bu: clamp(finite(raw.bu, 0.5), -0.2, 1.2),
      bv: clamp(finite(raw.bv, 0.5), -0.2, 1.2),
    };
  }

  function normalizeDims(type, piece) {
    const base = PIECE_DIMS[type];
    if (!base) return null;
    const fixed = type === "wall" ? { d: WALL_THICKNESS } : null;
    const old = piece && piece.dims ? piece.dims : null;
    const k = clamp(finite(piece && piece.size, 100), 55, 180) / 100;
    const out = {};
    Object.keys(base).forEach((key) => {
      const meta = DIM_META[key];
      const fallback = key === "lift" ? base[key] : base[key] * k;
      out[key] = clamp(finite(old ? old[key] : fallback, base[key]), meta.min, meta.max);
    });
    if (fixed) Object.assign(out, fixed);
    return out;
  }

  // 寸法の正本。舞台セットに登録したものは、そちらを引く。
  // 登録側を直せば、置いてある全ての場面の見え方が同時に変わる。
  /* 寸法つまみを組み立てる。項目は種類ごとに違うので、HTMLへ固定で並べず
   * ここから作る。dims オブジェクトへ直に書き込むので、
   * 「駒そのもの」でも「舞台セットの正本」でも同じ関数で使える。 */
  function buildDimControls(host, prefix, kind, dims, onChange, flown) {
    if (!host) return;
    host.innerHTML = "";
    if (!dims) return;
    Object.keys(dims).forEach((key) => {
      const meta = DIM_META[key];
      if (!meta) return;
      // 壁の厚みは固定。触らせないので、つまみも出さない
      if (kind === "wall" && key === "d") return;
      // 地上高は、吊っているものと浮いている球にだけ意味がある
      if (key === "lift" && SOLID_TYPES[kind] && !flown) return;
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
      studyBeatId: typeof raw.studyBeatId === "string" ? raw.studyBeatId : null,
      note: typeof raw.note === "string" ? raw.note : "",
      background: validColor(raw.background, fallbackBg),
      pieces: Array.isArray(raw.pieces) ? raw.pieces.slice(-80).map(normalizePiece) : [],
      notes: Array.isArray(raw.notes) ? raw.notes.slice(0, 60).map(normalizeNote).filter(Boolean) : [],
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
        sceneStudyId: typeof rawProject.sceneStudyId === "string" ? rawProject.sceneStudyId : null,
        sceneStudySourceVersion: typeof rawProject.sceneStudySourceVersion === "string"
          ? rawProject.sceneStudySourceVersion : null,
        venue: venue.id,
        venueSize: size.id,
        /* 規模の実寸。選んだ規模の値を土台に、ここで上書きした分だけ差し替える。
         * 実際の劇場は「中劇場」で括れない（間口12.4m・高さ7.2mのような値になる）。 */
        venueDims: normalizeVenueDims(rawProject.venueDims, size),
        cast: Array.isArray(rawProject.cast)
          ? rawProject.cast.slice(0, 60).map((c, i) => ({
              id: typeof c.id === "string" ? c.id : rid("cast"),
              name: typeof c.name === "string" && c.name.trim() ? c.name.slice(0, 24) : `演者 ${i + 1}`,
              color: validColor(c.color, "#a84b26"),
              heightCm: clamp(finite(c.heightCm, DEFAULT_HEIGHT_CM), 120, 210),
              note: typeof c.note === "string" ? c.note.slice(0, 200) : "",
              locked: Boolean(c.locked),
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
                dims: (() => {
                  const d = normalizeDims(kind, t);
                  // 吊物にできる形は、地上高の置き場を必ず持つ
                  if (d && SOLID_TYPES[kind] && d.lift === undefined) {
                    d.lift = clamp(finite(t && t.dims && t.dims.lift, 0), 0, 10);
                  }
                  return d;
                })(),
                note: typeof t.note === "string" ? t.note.slice(0, 200) : "",
                locked: Boolean(t.locked),
                /* 吊物。天井からワイヤーで吊り下がっているもの。
                 * 何かの上に乗ることも、何かを乗せることもない。
                 * 代わりに地上高（dims.lift）で高さを決める。 */
                flown: Boolean(t.flown),
                // 吊りのワイヤーの本数。1本なら中央から、2本なら両端から
                wires: t && Number(t.wires) === 1 ? 1 : 2,
                // 壁を枠にする（穴の空いた壁＝フレーム）
                framed: Boolean(t.framed),
                lightKind: kind === "light" && LIGHT_KINDS[t && t.lightKind] ? t.lightKind : "hang",
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
      showSetNames: raw.showSetNames === undefined ? true : Boolean(raw.showSetNames),
      showSeatMap: raw.showSeatMap === undefined ? true : Boolean(raw.showSeatMap),
      showFlown: Boolean(raw.showFlown),
      animateScenes: raw.animateScenes === undefined ? true : Boolean(raw.animateScenes),
      sceneAnimMs: clamp(finite(raw.sceneAnimMs, 620), 200, 3000),
      frontPan: clamp(finite(raw.frontPan, 0), -1, 1),
      frontPanY: clamp(finite(raw.frontPanY, 0), -1, 1),
      closedSections: (raw.closedSections && typeof raw.closedSections === "object" && !Array.isArray(raw.closedSections))
        ? raw.closedSections : {},
      cursorRowId: typeof raw.cursorRowId === "string" ? raw.cursorRowId : null,
      sceneListHeight: clamp(finite(raw.sceneListHeight, 320), 120, 1200),
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

  /* ---------- ショーの棚 ----------
     ショーは端末の中に何本でも置ける。いま開いているものは STORAGE_KEY に、
     全ての控えは SHOWS_KEY に「id → 中身」で持つ。開き直すときは控えから戻す。
     保存は自動。ファイルへ出したいときは従来どおり「書き出す」。 */

  function readShows() {
    try {
      const raw = JSON.parse(localStorage.getItem(SHOWS_KEY) || "{}");
      return (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
    } catch (_) {
      return {};
    }
  }

  function writeShows(shows) {
    try { localStorage.setItem(SHOWS_KEY, JSON.stringify(shows)); } catch (_) { /* 入りきらないときは諦める */ }
  }

  // いまのショーを棚へ書き戻す。保存のたびに呼ぶので、一覧は常に最新になる
  function shelveCurrent() {
    const shows = readShows();
    shows[state.project.id] = {
      savedAt: nowIso(),
      state: JSON.parse(snapshot()),
    };
    writeShows(shows);
  }

  function showSummary(entry) {
    const pj = entry && entry.state && entry.state.project;
    if (!pj) return null;
    return {
      id: pj.id,
      title: pj.title || "無題のショー",
      version: pj.versionLabel || "v1",
      scenes: (pj.scenes || []).filter((x) => x.kind !== "section").length,
      savedAt: entry.savedAt || "",
    };
  }

  const loaded = loadState();
  let state = loaded.value;
  let tool = "select";
  let selectedId = null;
  let selectedNoteId = null;
  let pointerAction = null;
  let history = [];
  let future = [];
  let saveTimer = null;
  let controlBefore = null;

  /* ---------- 固定 SceneStudy ----------
   * 知識ベース全体とは接続しない。同梱した固定データだけを読み、
   * 8ビートを通常の「場面」へ変換する。配置は初期仮説で、以後は
   * 他のショーと同じく端末内で編集・保存される。 */

  const studyById = (id) => SCENE_STUDIES.find((item) => item.id === id) || null;
  const currentStudy = () => studyById(state.project.sceneStudyId);

  function studyNode(tag, className, textValue) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue !== undefined) node.textContent = textValue;
    return node;
  }

  function studyDetail(summaryText, className) {
    const details = studyNode("details", className || "stage-study-detail");
    const summary = studyNode("summary", "", summaryText);
    const body = studyNode("div", "stage-study-detail-body");
    details.append(summary, body);
    return { details, body };
  }

  function appendStudyList(host, heading, items) {
    host.append(studyNode("p", "stage-study-minihead", heading));
    const list = studyNode("ul", "stage-study-list");
    items.forEach((item) => list.append(studyNode("li", "", item)));
    host.append(list);
  }

  function renderSceneStudy() {
    if (!els.studyBody) return;
    els.studyBody.innerHTML = "";
    const available = SCENE_STUDIES[0];
    if (!available) {
      els.studyBody.append(studyNode("p", "stage-study-empty",
        isEn() ? "No fixed SceneStudy is bundled." : "同梱された固定SceneStudyはありません。"));
      return;
    }

    const study = currentStudy();
    if (!study) {
      els.studyBody.append(
        studyNode("p", "stage-study-status",
          isEn()
            ? `FIXED STUDY / ${available.scope.targetDurationSeconds}s / ${available.scope.performers} performer`
            : `固定スタディ / ${available.scope.targetDurationSeconds}秒 / ${available.scope.performers}人`),
        studyNode("h3", "stage-study-title", available.title),
        studyNode("p", "stage-study-input", available.fixedInput)
      );
      const button = studyNode("button", "stage-study-open",
        isEn() ? "Open the 8 beats as another show" : "8ビートを別ショーとして開く");
      button.type = "button";
      button.addEventListener("click", () => openFixedSceneStudy(available));
      els.studyBody.append(button);
      els.studyBody.append(studyNode("p", "stage-study-save-note",
        isEn()
          ? "Your current show stays in All shows. The study opens separately and saves only in this browser."
          : "現在のショーは一覧に残します。固定案は別ショーで開き、配置変更はこのブラウザ内だけに保存します。"));

      const source = studyDetail(isEn() ? "What is fixed?" : "何が固定されているか");
      appendStudyList(source.body,
        isEn() ? "FROM THE EXISTING PLAN" : "既存計画から",
        available.factsFromExistingPlan);
      source.body.append(studyNode("p", "stage-study-source",
        isEn() ? `Bundled from: ${available.sourceJson}` : `同梱元: ${available.sourceJson}`));
      els.studyBody.append(source.details);
      return;
    }

    const activeScene = sc();
    const activeBeat = study.beats.find((beat) => beat.id === activeScene.studyBeatId) || null;
    const scenesByBeat = new Map(
      state.project.scenes
        .filter((scene) => scene.kind === "scene" && scene.studyBeatId)
        .map((scene) => [scene.studyBeatId, scene])
    );

    els.studyBody.append(
      studyNode("p", "stage-study-status",
        isEn()
          ? `FIXED STUDY / ${study.scope.targetDurationSeconds}s / PLACEMENT DRAFT`
          : `固定案 / ${study.scope.targetDurationSeconds}秒 / 配置は初期仮説`),
      studyNode("h3", "stage-study-title", study.title)
    );

    const rail = studyNode("div", "stage-study-rail");
    rail.setAttribute("role", "group");
    rail.setAttribute("aria-label", isEn() ? "Switch study beat" : "スタディのビートを切り替える");
    study.beats.forEach((beat) => {
      const scene = scenesByBeat.get(beat.id);
      const button = studyNode("button", "stage-study-beat-button", beat.id);
      button.type = "button";
      button.disabled = !scene;
      button.title = `${beat.label} / ${beat.durationSeconds}${isEn() ? "s" : "秒"}`;
      button.setAttribute("aria-pressed", String(Boolean(activeBeat && activeBeat.id === beat.id)));
      if (scene) button.addEventListener("click", () => openScene(scene.id));
      rail.append(button);
    });
    els.studyBody.append(rail);

    if (!activeBeat) {
      els.studyBody.append(studyNode("p", "stage-study-empty",
        isEn()
          ? "This scene is outside the fixed 8 beats. Choose a beat above to return."
          : "この場面は固定8ビートの外です。上の番号を押すとスタディへ戻れます。"));
    } else {
      const heading = studyNode("div", "stage-study-beat-head");
      const number = studyNode("span", "stage-study-beat-number",
        `${activeBeat.id} / ${study.beats.length}　${activeBeat.durationSeconds}${isEn() ? "s" : "秒"}`);
      heading.append(number, studyNode("h4", "", activeBeat.label));
      els.studyBody.append(heading);

      [
        [isEn() ? "ACTION" : "行為", activeBeat.action],
        [isEn() ? "VISIBLE RULE" : "観客に見える規則", activeBeat.visibleRule],
        [isEn() ? "CHANGE" : "このビートで変わること", activeBeat.change],
      ].forEach(([label, value]) => {
        const field = studyNode("div", "stage-study-field");
        field.append(studyNode("span", "", label), studyNode("p", "", value));
        els.studyBody.append(field);
      });

      const cards = studyDetail(
        isEn()
          ? `Direction cards (${activeBeat.appliedCardIds.length})`
          : `適用した演出カード（${activeBeat.appliedCardIds.length}件）`
      );
      const cardList = studyNode("ul", "stage-study-card-list");
      activeBeat.appliedCardIds.forEach((id) => {
        const item = studyNode("li", "", study.cardTitles[id] || id);
        item.title = id;
        cardList.append(item);
      });
      cards.body.append(cardList);
      els.studyBody.append(cards.details);
    }

    const boundary = studyDetail(isEn() ? "Facts, interpretation, open choices" : "事実・解釈・未決定");
    appendStudyList(boundary.body,
      isEn() ? "FROM THE EXISTING PLAN" : "既存計画から",
      study.factsFromExistingPlan);
    appendStudyList(boundary.body,
      isEn() ? "CREATIVE INTERPRETATION" : "今回の制作解釈",
      [
        `目的: ${study.creativeInterpretation.objective}`,
        `障害: ${study.creativeInterpretation.obstacle}`,
        `葛藤: ${study.creativeInterpretation.conflict}`,
      ]);
    appendStudyList(boundary.body,
      isEn() ? "OPEN" : "本人確認待ち",
      study.unknownsForUserReview);
    els.studyBody.append(boundary.details);

    els.studyBody.append(studyNode("p", "stage-study-save-note",
      isEn()
        ? "Switch beats to compare positions. Every beat is a separate scene; edits auto-save only in this browser."
        : "番号を切り替えて配置差を見ます。各ビートは別場面で、変更はこのブラウザ内へ自動保存されます。"));
  }

  function openFixedSceneStudy(study) {
    if (!study || !Array.isArray(study.beats) || !study.beats.length) return;
    shelveCurrent();

    const fresh = baseState(false);
    const researcherId = `study-${study.id}-researcher`;
    const tableId = `study-${study.id}-table`;
    const noteId = `study-${study.id}-note`;
    const diaboloId = `study-${study.id}-diabolo`;
    const poses = {
      "4-1": "stand", "4-2": "stand", "4-3": "reach", "4-4": "open",
      "4-5": "reach", "4-6": "open", "4-7": "stand", "4-8": "walk",
    };

    fresh.project.title = "時をほどく研究室：未来サンプル";
    fresh.project.versionLabel = "Study A";
    fresh.project.sceneStudyId = study.id;
    fresh.project.sceneStudySourceVersion = study.schemaVersion;
    fresh.project.cast = [
      {
        id: researcherId,
        name: "研究者",
        color: "#a84b26",
        heightCm: DEFAULT_HEIGHT_CM,
        note: "固定SceneStudyの1人版。配置と姿勢は稽古前の初期仮説。",
        locked: false,
      },
    ];
    fresh.project.sets = [
      {
        id: tableId, kind: "table", name: "実験机", color: "#766a59",
        dims: { w: 1.4, d: 0.7, h: 0.72 }, note: "", locked: false,
        flown: false, wires: 2, framed: false,
      },
      {
        id: noteId, kind: "block", name: "ノート（位置札）", color: "#efe7d6",
        dims: { w: 0.3, d: 0.22, h: 0.05 }, note: "実物形状ではなく位置を比較する札。", locked: false,
        flown: false, wires: 2, framed: false,
      },
      {
        id: diaboloId, kind: "sphere", name: "ディアボロ（位置札）", color: "#77865f",
        dims: { dia: 0.3, lift: 0 }, note: "実物形状ではなく位置を比較する札。", locked: false,
        flown: false, wires: 2, framed: false,
      },
    ];
    fresh.project.scenes = study.beats.map((beat) => {
      const placement = beat.placement;
      const scene = newScene(beat.label, false);
      scene.studyBeatId = beat.id;
      scene.note = `${beat.action}\n変化: ${beat.change}`.slice(0, 200);
      scene.pieces = [
        {
          id: nextId(), type: "performer", castId: researcherId,
          u: placement.performer[0], v: placement.performer[1],
          facing: placement.performer[2], pose: poses[beat.id] || "stand",
          size: 100, color: "#a84b26", name: "",
        },
        {
          id: nextId(), type: "table", setId: tableId,
          u: placement.table[0], v: placement.table[1],
          facing: 0, size: 100, color: "#766a59", name: "",
        },
        {
          id: nextId(), type: "block", setId: noteId,
          u: placement.note[0], v: placement.note[1],
          facing: 0, size: 100, color: "#efe7d6", name: "",
        },
        {
          id: nextId(), type: "sphere", setId: diaboloId,
          u: placement.diabolo[0], v: placement.diabolo[1],
          facing: 0, size: 100, color: "#77865f", name: "",
        },
      ];
      return scene;
    });
    fresh.project.activeSceneId = fresh.project.scenes[0].id;
    fresh.layout = state.layout;
    applyLoadedState(normalizeState(fresh),
      "固定SceneStudyを別ショーとして開きました。8ビートの配置は自由に直せます。");
  }

  const venue = () => VENUES.byId(state.project.venue);
  /* 実効の寸法。選んだ規模に、手で入れた実寸を重ねたもの。
   * 円形（リング）は間口・奥行きと同じ値を持たせる（真円なので一つの数で決まる）。 */
  const venueSize = () => {
    const base = VENUES.sizeById(venue(), state.project.venueSize);
    const over = state.project.venueDims;
    if (!over) return base;
    const merged = Object.assign({}, base, over);
    if (base.ring !== undefined) merged.ring = merged.width;
    return merged;
  };

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
    detachOrphanNotes();
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
        shelveCurrent();
        els.saveStatus.textContent = `「${state.project.title}」を保存しました。`;
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
  /* 吊物か。天井からワイヤーで吊り下がっているものは、
   * 何かの上に乗ることも、何かを乗せることもない。高さは地上高で決まる。 */
  function isFlown(piece) {
    if (!piece || !SOLID_TYPES[piece.type]) return false;
    const owner = pieceSet(piece);
    return Boolean(owner ? owner.flown : piece.flown);
  }

  function flownLift(piece) {
    const dims = pieceDims(piece);
    return clamp(finite(dims && dims.lift, 0), 0, 10);
  }

  function refreshBases(size) {
    const pieces = sc().pieces;
    pieces.forEach((piece, i) => {
      if (piece.type === "light") { piece.base = 0; piece.supportId = null; return; }
      if (isFlown(piece)) { piece.base = flownLift(piece); piece.supportId = null; return; }
      // 吊っているものの上には乗れない（宙に浮いた板の上に立たせない）
      const candidates = pieces.slice(0, i).filter((p) => !isFlown(p));
      const found = supportUnder(piece, size, candidates);
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
  /* 描くときの居場所。転換の途中は途中の値を返す。
   * ★絵を描くところは全部ここを通す。駒の u/v を直に読むと、
   *   その経路だけ転換で瞬間移動する（実際に正面図の台がそうなっていた）。 */
  const pieceU = (piece) => (piece && piece.animU !== undefined ? piece.animU : piece.u);
  const pieceV = (piece) => (piece && piece.animV !== undefined ? piece.animV : piece.v);

  function placePiece(piece, L) {
    const pos = place(pieceU(piece), pieceV(piece), L);
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

    /* 小道具。関節と同じ変換に通すので、向きを変えれば道具も一緒に回る。
     *   line … 2点を結ぶ棒（マイク、ギターの棹、自転車の骨組み）
     *   ring … 体の正面の面に立つ輪（車輪、フープ）
     *   dot  … 玉（ジャグリングの玉、車輪の芯）
     * 位置は関節と同じ体の座標（x=左右／y=上下／z=正面向き）。 */
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
            const steps = 28;
            out.pts = [];
            for (let i = 0; i <= steps; i += 1) {
              const a = (i / steps) * Math.PI * 2;
              // 既定は体の正面の面に立つ輪。plane:"xz" は床と平行な輪（帽子のつばなど）
              out.pts.push(prop.plane === "xz"
                ? project(prop.c[0] + Math.cos(a) * prop.r, prop.c[1], prop.c[2] + Math.sin(a) * prop.r)
                : project(prop.c[0] + Math.cos(a) * prop.r, prop.c[1] + Math.sin(a) * prop.r, prop.c[2]));
            }
          }
        }
        return out;
      });
    }

    /* 道具の輪。体の正面の面（z=0）に立つ円なので、向きを変えると
     * 楕円につぶれ、真横からは一本の線になる。関節と同じ変換に通す。 */
    let wheel = null;
    if (pose.wheel) {
      const steps = 48;
      wheel = [];
      for (let i = 0; i <= steps; i += 1) {
        const a = (i / steps) * Math.PI * 2;
        wheel.push(project(Math.cos(a) * pose.wheel.r, pose.wheel.cy + Math.sin(a) * pose.wheel.r, 0));
      }
    }

    // 顔の印を出す先。頭から顔の向きへ少しだけ進んだところ
    const f = pose.face;
    const head = joints.head;
    const faceAt = project(head[0] + f[0] * 0.05, head[1] + f[1] * 0.05, head[2] + f[2] * 0.05);
    return { P, box, ux, uy, faceAt, facing: f, wheel, props };
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

    /* 道具の輪は体より先に、輪の向こう側だけ塗る。手前側は体のあとに塗る。
     * 一本の線で一度に塗ると、人が輪の手前にいるのか奥にいるのか読めない。 */
    if (rig.wheel) paintWheel(target, rig, "far");

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
      /* 頭は首から頭への向きに沿った楕円。立っているときだけ縦長にしていたので、
       * 寝たり抱え込んだりすると形が崩れていた。長い方は顎から頭頂、
       * 短い方は耳から耳。首と頭がほぼ重なる姿勢では、そのまま立てておく。 */
      const nx = P.head.x - P.neck.x;
      const ny = P.head.y - P.neck.y;
      const len = Math.hypot(nx, ny);
      const angle = len > 0.4 ? Math.atan2(ny, nx) : -Math.PI / 2;
      target.fillStyle = color;
      target.strokeStyle = rgba(color, 0.35);
      target.lineWidth = Math.max(0.6, uy / 110);
      target.beginPath();
      target.ellipse(P.head.x, P.head.y,
        Math.max(1.2, 0.066 * ux), Math.max(1.2, 0.05 * ux), angle, 0, Math.PI * 2);
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

    if (rig.wheel) paintWheel(target, rig, "near");
    if (rig.props) paintProps(target, rig);
  }

  /* 小道具。人の色ではなく道具の色で描く（人と持ち物を見分けるため）。
   * 玉だけは投げているものなので、少し明るく置く。 */
  const PROP_TONES = {
    gear: "rgba(214,220,226,0.85)",     // 金属・器具
    wood: "rgba(196,158,104,0.9)",      // 木・ギター
    ball: "rgba(233,220,180,0.95)",     // 投げている玉
    dark: "rgba(38,34,30,0.85)",        // タイヤ・板
  };

  function paintProps(target, rig) {
    const ux = rig.ux;
    target.save();
    target.lineCap = "round";
    target.lineJoin = "round";
    rig.props.forEach((prop) => {
      const tone = PROP_TONES[prop.tone] || PROP_TONES.gear;
      if (prop.kind === "line") {
        target.strokeStyle = tone;
        target.lineWidth = Math.max(1.2, prop.w * ux);
        target.beginPath();
        target.moveTo(prop.a.x, prop.a.y);
        target.lineTo(prop.b.x, prop.b.y);
        target.stroke();
        return;
      }
      if (prop.kind === "ring") {
        target.strokeStyle = tone;
        target.lineWidth = Math.max(1.2, prop.w * ux);
        target.beginPath();
        prop.pts.forEach((p, i) => { if (i) target.lineTo(p.x, p.y); else target.moveTo(p.x, p.y); });
        target.stroke();
        return;
      }
      target.fillStyle = tone;
      target.beginPath();
      target.arc(prop.c.x, prop.c.y, Math.max(1.5, prop.r * ux), 0, Math.PI * 2);
      target.fill();
    });
    target.restore();
  }

  /* 輪（シルホイール）。金属の輪なので人の色ではなく鈍い銀で描く。
   * 演者と同じ色にすると、人と道具の区別がつかなくなる。 */
  function paintWheel(target, rig, side) {
    const pts = rig.wheel;
    const width = Math.max(1.4, 0.022 * rig.ux);
    target.save();
    target.lineCap = "round";
    target.lineJoin = "round";
    target.lineWidth = width;
    target.strokeStyle = side === "far" ? "rgba(198,204,210,0.42)" : "rgba(222,228,234,0.86)";
    target.beginPath();
    let drawing = false;
    pts.forEach((p) => {
      const here = side === "far" ? p.z < 0 : p.z >= 0;
      if (!here) { drawing = false; return; }
      if (!drawing) { target.moveTo(p.x, p.y); drawing = true; } else { target.lineTo(p.x, p.y); }
    });
    target.stroke();
    target.restore();
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
    const u = pieceU(piece) + dw / L.size.width;
    const v = pieceV(piece) - dd / L.size.depth;      // 奥へ行くほど v は小さい
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
    if (piece.type === "wall") {
      const owner = pieceSet(piece);
      /* フレーム＝穴の空いた壁。上下と左右の4本の枠で作る。
       * 中を人がくぐれる大きさにしたいので、枠は幅・高さの2割ほどに収める。 */
      if (owner && owner.framed) {
        const b = clamp(Math.min(d.w, d.h) * 0.16, 0.08, 0.5);
        const inner = Math.max(0.1, d.h - b * 2);
        return [
          { ox: 0, oz: 0, w: d.w, d: d.d, h: b, lift: 0, tint: 0.9 },
          { ox: 0, oz: 0, w: d.w, d: d.d, h: b, lift: Math.max(0, d.h - b), tint: 1 },
          { ox: -(d.w - b) / 2, oz: 0, w: b, d: d.d, h: inner, lift: b, tint: 0.95 },
          { ox: (d.w - b) / 2, oz: 0, w: b, d: d.d, h: inner, lift: b, tint: 0.95 },
        ];
      }
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
    /* ---------- サーカスの道具 ---------- */
    if (piece.type === "trapeze") {
      // バー一本。吊りのロープは吊物の描画（drawSolid）が引く
      return [{ kind: "line", a: [-d.w / 2, 0.03, 0], b: [d.w / 2, 0.03, 0], w: 0.05, tone: "gear" }];
    }
    if (piece.type === "tissue") {
      // 二本の布。天井から下がって床の手前で終わる
      const drop = d.h;
      return [
        { kind: "line", a: [-d.w / 2, 0.02, 0], b: [-d.w / 2, drop, 0], w: 0.14, tone: "cloth" },
        { kind: "line", a: [d.w / 2, 0.02, 0], b: [d.w / 2, drop, 0], w: 0.14, tone: "cloth" },
      ];
    }
    if (piece.type === "cyrwheel") {
      // 床に立った輪。転がる道具なので、床に触れる位置に置く
      const r = d.dia / 2;
      return [{ kind: "ring", c: [0, r, 0], r, w: 0.05, tone: "gear" }];
    }
    if (piece.type === "pole") {
      // 床から立つ一本のポール。足元だけ台座を持つ
      return [
        { ox: 0, oz: 0, w: d.w * 4, d: d.d * 4, h: 0.06, lift: 0, tint: 0.8 },
        { kind: "line", a: [0, 0.05, 0], b: [0, d.h, 0], w: d.w, tone: "gear" },
      ];
    }
    if (piece.type === "teeter") {
      // 支点の三角と、その上でかしいだ板
      const fw = Math.max(0.3, d.w * 0.12);
      return [
        { ox: 0, oz: 0, w: fw, d: d.d, h: d.h * 0.8, lift: 0, tint: 0.7 },
        { kind: "line", a: [-d.w / 2, 0.04, 0], b: [d.w / 2, d.h, 0], w: 0.09, tone: "wood" },
      ];
    }
    if (piece.type === "wire") {
      // 綱と、両端の支柱
      return [
        { kind: "line", a: [-d.w / 2, d.h, 0], b: [d.w / 2, d.h, 0], w: 0.035, tone: "gear" },
        { kind: "line", a: [-d.w / 2, 0, 0], b: [-d.w / 2, d.h, 0], w: 0.06, tone: "dark" },
        { kind: "line", a: [d.w / 2, 0, 0], b: [d.w / 2, d.h, 0], w: 0.06, tone: "dark" },
      ];
    }
    if (piece.type === "suitcase") {
      // 箱と、上の取っ手
      return [
        { ox: 0, oz: 0, w: d.w, d: d.d, h: d.h, lift: 0, tint: 1 },
        { kind: "line", a: [-d.w * 0.16, d.h + 0.09, 0], b: [d.w * 0.16, d.h + 0.09, 0], w: 0.035, tone: "dark" },
        { kind: "line", a: [-d.w * 0.16, d.h, 0], b: [-d.w * 0.16, d.h + 0.09, 0], w: 0.03, tone: "dark" },
        { kind: "line", a: [d.w * 0.16, d.h, 0], b: [d.w * 0.16, d.h + 0.09, 0], w: 0.03, tone: "dark" },
      ];
    }
    if (piece.type === "trampoline") {
      // 枠・ベッド・脚
      const legH = Math.max(0.1, d.h - 0.1);
      const parts = [];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => parts.push({
        ox: sx * (d.w / 2 - 0.12), oz: sy * (d.d / 2 - 0.12),
        w: 0.1, d: 0.1, h: legH, lift: 0, tint: 0.65,
      }));
      parts.push({ ox: 0, oz: 0, w: d.w, d: d.d, h: 0.1, lift: legH, tint: 1 });
      return parts;
    }
    if (piece.type === "cane") {
      // 二本の cane。それぞれ台座の上に立つ
      const parts = [];
      [-1, 1].forEach((sx) => {
        parts.push({ ox: sx * d.w / 2, oz: 0, w: 0.16, d: 0.16, h: 0.05, lift: 0, tint: 0.7 });
        parts.push({ kind: "line", a: [sx * d.w / 2, 0.04, 0], b: [sx * d.w / 2, d.h, 0], w: 0.05, tone: "gear" });
        parts.push({ kind: "line", a: [sx * d.w / 2 - 0.06, d.h, 0], b: [sx * d.w / 2 + 0.06, d.h, 0], w: 0.05, tone: "gear" });
      });
      return parts;
    }
    if (piece.type === "car") {
      // 車体と客室、両側の車輪
      const bodyH = d.h * 0.52;
      const wheelR = Math.min(d.h * 0.24, 0.36);
      const parts = [
        { ox: 0, oz: 0, w: d.w, d: d.d, h: bodyH, lift: wheelR * 0.6, tint: 1 },
        { ox: 0, oz: -d.w * 0.04, w: d.w * 0.52, d: d.d * 0.92, h: d.h - bodyH - wheelR * 0.6, lift: bodyH + wheelR * 0.6, tint: 0.8 },
      ];
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => parts.push({
        kind: "ring", c: [sx * (d.w / 2 - wheelR * 1.1), wheelR, sz * (d.d / 2 - 0.02)],
        r: wheelR, w: 0.12, tone: "dark",
      })));
      return parts;
    }
    if (piece.type === "stool") {
      // 丸い座面と3本の脚。椅子より小さく、背もたれを持たない
      const top = clamp(d.h * 0.09, 0.025, 0.06);
      const leg = clamp(d.w * 0.14, 0.03, 0.06);
      const parts = [];
      [[0, -1], [-0.87, 0.5], [0.87, 0.5]].forEach(([sx, sy]) => parts.push({
        ox: sx * (d.w / 2 - leg), oz: sy * (d.d / 2 - leg),
        w: leg, d: leg, h: Math.max(0.05, d.h - top), lift: 0, tint: 0.7,
      }));
      parts.push({ ox: 0, oz: 0, w: d.w, d: d.d, h: top, lift: Math.max(0, d.h - top), tint: 1 });
      return parts;
    }
    if (piece.type === "bench") {
      // 横長の座面と、両端に寄せた脚。背もたれは持たない
      const top = clamp(d.h * 0.14, 0.03, 0.07);
      const leg = clamp(Math.min(d.w, d.d) * 0.12, 0.04, 0.09);
      const parts = [];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => parts.push({
        ox: sx * (d.w / 2 - leg * 1.6),
        oz: sy * (d.d / 2 - leg * 0.9),
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
    target.fillText(seatName(seat), x + w / 2, balconyY + balconyH + 5);
    target.restore();
  }

  // 台・テーブル・椅子。部品を奥から順に塗る
  function drawSolid(target, piece, pos, scale, L) {
    const parts = pieceParts(piece);
    if (!parts) return;
    const flown = isFlown(piece);
    target.save();

    /* 吊物はワイヤーで天井から下がっている。上へ伸びる2本の線で吊りを示す。
     * 影は落とさない（床に触れていないので、接地の影は嘘になる）。 */
    if (flown && !L.plan) {
      const dim = pieceDims(piece);
      const centre = floorPoint(piece, 0, 0, L);
      const per = perMetre(centre, L);
      const topY = L.tilt(centre.rawY - (dim.h || 0) * per.y);
      const halfW = Math.max(6, ((dim.w || 1) / 2) * per.x * 0.62);
      const owner = pieceSet(piece);
      const wires = owner && Number(owner.wires) === 1 ? 1 : 2;
      target.strokeStyle = "rgba(226,232,238,0.5)";
      target.lineWidth = 1;
      (wires === 1 ? [0] : [-halfW, halfW]).forEach((dx) => {
        target.beginPath();
        target.moveTo(centre.x + dx, topY);
        target.lineTo(centre.x + dx * 0.55, Math.max(0, L.backY - 6));
        target.stroke();
      });
    }

    // 影は床の占有面積そのまま。吊物には落とさない
    const foot = flown ? null : pieceFootprint(piece);
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

    parts.forEach((part) => {
      if (part.kind === "line" || part.kind === "ring") paintRigging(target, piece, L, part);
      else paintBox(target, piece, L, part);
    });
    target.restore();
  }

  /* 駒の座標（左右lx・高さly・奥行きlz、メートル）を画面へ落とす。
   * 箱の四隅と同じ道（floorPoint）を通るので、床の1m枡と遠近が一致する。 */
  function riggingPoint(piece, lx, ly, lz, L) {
    const rad = ((piece.facing || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const p = floorPoint(piece, lx * cos - lz * sin, lx * sin + lz * cos, L);
    if (L.plan) return { x: p.x, y: p.y };
    return { x: p.x, y: L.tilt(p.rawY - ly * perMetre(p, L).y) };
  }

  /* 綱・ロープ・輪など、箱では表せない部品。
   * 舞台の道具は板とパイプと布と綱でできているので、箱だけでは足りない。 */
  function paintRigging(target, piece, L, part) {
    const per = perMetre(floorPoint(piece, 0, 0, L), L);
    const width = Math.max(1, (part.w || 0.04) * per.x);
    const tone = part.tone === "wood" ? "rgba(196,158,104,0.95)"
      : part.tone === "cloth" ? rgba(piece.color, 0.85)
      : part.tone === "dark" ? "rgba(38,34,30,0.9)"
      : "rgba(214,220,226,0.9)";
    target.save();
    target.lineCap = part.kind === "ring" ? "butt" : "round";
    target.lineJoin = "round";
    target.strokeStyle = tone;
    target.lineWidth = width;
    target.beginPath();
    if (part.kind === "line") {
      const a = riggingPoint(piece, part.a[0], part.a[1], part.a[2], L);
      const b = riggingPoint(piece, part.b[0], part.b[1], part.b[2], L);
      target.moveTo(a.x, a.y);
      target.lineTo(b.x, b.y);
    } else {
      const steps = 32;
      for (let i = 0; i <= steps; i += 1) {
        const t = (i / steps) * Math.PI * 2;
        // 既定は正面に立つ輪。plane:"xz" なら床と平行に寝た輪
        const q = part.plane === "xz"
          ? riggingPoint(piece, part.c[0] + Math.cos(t) * part.r, part.c[1], part.c[2] + Math.sin(t) * part.r, L)
          : riggingPoint(piece, part.c[0] + Math.cos(t) * part.r, part.c[1] + Math.sin(t) * part.r, part.c[2], L);
        if (i) target.lineTo(q.x, q.y); else target.moveTo(q.x, q.y);
      }
    }
    target.stroke();
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

  /* 明かりの灯体の位置を画面へ落とす。平面ならその点、正面なら床から h だけ持ち上げる。 */
  function beamSource(piece, L) {
    const b = piece.beam || normalizeBeam(null, piece);
    // 転換の途中は灯体も一緒に動かす。当たる場所だけ動くと光が伸び縮みして見える
    const p = place(
      piece.animBeamU === undefined ? b.u : piece.animBeamU,
      piece.animBeamV === undefined ? b.v : piece.animBeamV, L);
    if (L.plan) return { x: p.x, y: p.y };
    const per = perMetre(p, L);
    const rawY = p.rawY - b.h * per.y;
    return { x: p.x, y: L.tilt(rawY) };
  }

  // 明かりが当たる点。床とは限らない（下から上への明かりでは宙にある）
  function beamTarget(piece, pos, L) {
    const b = piece.beam || normalizeBeam(null, piece);
    if (L.plan || !b.toH) return { x: pos.x, y: pos.y };
    const per = perMetre(pos, L);
    return { x: pos.x, y: L.tilt(pos.rawY - b.toH * per.y) };
  }

  function drawLight(target, piece, pos, scale, L) {
    // 照明の円の直径を実寸（m）で持つ。床の1m枡で広さを読めるようにするため
    const dim = pieceDims(piece);
    const per = perMetre(pos, L);
    const spread = Math.max(6, ((dim && dim.dia) || 4) / 2 * per.x);
    const src = beamSource(piece, L);
    const hit = beamTarget(piece, pos, L);
    const lit = tool === "light";
    const picked = piece.id === selectedId;

    if (L.plan) {
      // 平面では、落ちる円と、どこから出ているかの線で読む
      target.save();
      const pool = target.createRadialGradient(hit.x, hit.y, 0, hit.x, hit.y, spread);
      pool.addColorStop(0, rgba(piece.color, 0.34));
      pool.addColorStop(1, rgba(piece.color, 0));
      target.fillStyle = pool;
      target.beginPath();
      target.arc(hit.x, hit.y, spread, 0, Math.PI * 2);
      target.fill();
      // 灯体が真上にないときだけ、出どころを見せる（真上なら線が点になる）
      const off = Math.hypot(src.x - hit.x, src.y - hit.y) > 6;
      if (off || lit || picked) {
        target.strokeStyle = rgba(piece.color, lit || picked ? 0.7 : 0.34);
        target.lineWidth = 1.2;
        target.setLineDash([5, 5]);
        target.beginPath();
        target.moveTo(src.x, src.y);
        target.lineTo(hit.x, hit.y);
        target.stroke();
        target.setLineDash([]);
        drawFixture(target, src, piece, lit || picked);
      }
      target.restore();
      return;
    }

    /* 正面では、灯体から当たる場所へ広がる帯として描く。
     * ★帯の裾は「光の進む向きと直角」ではなく、床に落ちた円の左右の端へ着ける。
     *   直角に取ると、斜めから差し込むほど裾が床の下へ潜り込み、
     *   光が床を突き抜けたり、逆に床まで届いていないように見える。 */
    /* 灯体は点として扱い、そこから床の円の左右の端へ広がる三角で描く。
     * ★灯体側にも幅を持たせて四角で描くと、光源側の左右と床側の左右が
     *   逆に繋がる角度があり、面が捻れて✗の形になっていた。
     *   点から広がる三角なら、どの角度でも捻れようがない。 */
    /* ★帯と床の円を、一つの輪郭として塗る。
     * 別々に塗ると、帯の裾の水平な線が円を上下に切ってしまい、
     * 「半円が二つ繋がっている」ように見えていた（上半分だけ帯が重なるため）。
     * 帯の裾を円の下半分の弧でつなぎ、帯は着地の手前で薄れさせる。 */
    const ry = Math.max(3, 32 * scale);
    const gradient = target.createLinearGradient(src.x, src.y, hit.x, hit.y);
    gradient.addColorStop(0, rgba(piece.color, 0.09));
    gradient.addColorStop(0.72, rgba(piece.color, 0.14));
    gradient.addColorStop(1, rgba(piece.color, 0.06));
    target.save();
    target.globalCompositeOperation = "screen";
    target.fillStyle = gradient;
    target.beginPath();
    target.moveTo(src.x, src.y);
    target.lineTo(hit.x + spread, hit.y);
    // 円の下半分をなぞって左端へ回り込む。ここで輪郭が一続きになる
    target.ellipse(hit.x, hit.y, spread, ry, 0, 0, Math.PI);
    target.closePath();
    target.fill();
    // 明るいのは床に落ちた円そのもの。帯はそこへ吸い込まれる
    const pool = target.createRadialGradient(hit.x, hit.y, 0, hit.x, hit.y, spread);
    pool.addColorStop(0, rgba(piece.color, 0.34));
    pool.addColorStop(0.55, rgba(piece.color, 0.16));
    pool.addColorStop(1, rgba(piece.color, 0));
    target.fillStyle = pool;
    target.beginPath();
    target.ellipse(hit.x, hit.y, spread, ry, 0, 0, Math.PI * 2);
    target.fill();
    target.globalCompositeOperation = "source-over";
    if (lit || picked) drawFixture(target, src, piece, true);
    target.restore();
  }

  // 灯体そのもの。光を動かすときだけ出す小さな印
  function drawFixture(target, at, piece, strong) {
    target.save();
    target.fillStyle = rgba(piece.color, strong ? 0.9 : 0.45);
    target.strokeStyle = "rgba(13,12,11,0.65)";
    target.lineWidth = 1;
    target.beginPath();
    target.arc(at.x, at.y, 7, 0, Math.PI * 2);
    target.fill();
    target.stroke();
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

  /* 動線。始点（駒）から行き先へ、二次曲線で引いて先に矢を付ける。
   * 曲がり具合は真ん中の control 点ひとつで決まる。直線から始めて、
   * 掴んで曲げれば回り込みになる——舞台で人が動く道はたいてい弧を描く。 */
  function routePoints(piece, L) {
    const at = place(pieceU(piece), pieceV(piece), L);
    const to = place(piece.route.u, piece.route.v, L);
    const ctrl = place(piece.route.bu, piece.route.bv, L);
    /* 演者の足元からいきなり線を出すと、駒と矢印がくっついて読みにくい。
     * 出だしの向きへ少しだけ離してから引き始める。 */
    const gap = 13;
    const dx = ctrl.x - at.x;
    const dy = ctrl.y - at.y;
    const len = Math.hypot(dx, dy);
    const from = len > gap * 1.6
      ? { x: at.x + (dx / len) * gap, y: at.y + (dy / len) * gap }
      : at;
    return { from, to, ctrl, at };
  }

  // 二次曲線の上の点。矢の向きを出すのに使う
  function quadAt(a, c, b, t) {
    const k = 1 - t;
    return {
      x: k * k * a.x + 2 * k * t * c.x + t * t * b.x,
      y: k * k * a.y + 2 * k * t * c.y + t * t * b.y,
    };
  }

  function drawRoutes(target, L, showSelection) {
    sc().pieces.forEach((piece) => {
      if (!piece.route) return;
      const { from, to, ctrl } = routePoints(piece, L);
      const picked = showSelection && piece.id === selectedId;
      target.save();
      target.strokeStyle = rgba(piece.color, picked ? 0.95 : 0.62);
      target.lineWidth = picked ? 4 : 3.2;
      target.lineCap = "round";
      target.setLineDash(picked ? [] : [9, 6]);
      target.beginPath();
      target.moveTo(from.x, from.y);
      target.quadraticCurveTo(ctrl.x, ctrl.y, to.x, to.y);
      target.stroke();
      target.setLineDash([]);

      // 矢。終点の少し手前の向きで向きを決める
      const near = quadAt(from, ctrl, to, 0.94);
      const ang = Math.atan2(to.y - near.y, to.x - near.x);
      const head = picked ? 17 : 15;
      target.fillStyle = rgba(piece.color, picked ? 0.95 : 0.66);
      target.beginPath();
      target.moveTo(to.x, to.y);
      target.lineTo(to.x - Math.cos(ang - 0.42) * head, to.y - Math.sin(ang - 0.42) * head);
      target.lineTo(to.x - Math.cos(ang + 0.42) * head, to.y - Math.sin(ang + 0.42) * head);
      target.closePath();
      target.fill();

      // 選んでいるあいだは、曲げる取っ手と行き先の取っ手を出す
      if (picked) {
        const mid = quadAt(from, ctrl, to, 0.5);
        [[mid, 6.5, "曲げる"], [to, 5.5, "行き先"]].forEach(([pt, r]) => {
          target.fillStyle = "#0d0c0b";
          target.strokeStyle = "#d3ac59";
          target.lineWidth = 2;
          target.beginPath();
          target.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          target.fill();
          target.stroke();
        });
      }
      target.restore();
    });
  }

  // 動線の取っ手に当たっているか。曲げる取っ手を優先する
  function routeHandleAt(point, piece, L) {
    if (!piece || !piece.route || !L.plan) return null;
    const { from, to, ctrl } = routePoints(piece, L);
    const mid = quadAt(from, ctrl, to, 0.5);
    if (Math.hypot(point.x - mid.x, point.y - mid.y) <= 11) return "bend";
    if (Math.hypot(point.x - to.x, point.y - to.y) <= 11) return "end";
    return null;
  }

  /* ---------- 付箋 ---------- */

  const NOTE_W = 188;
  const NOTE_PAD = 11;
  const NOTE_LINE = 22;
  /* 付箋の字。絵の上に小さく置くものだが、13pxでは読むのに近寄る必要があった。
   * ★行の高さも一緒に上げること。字だけ上げると行が重なる。
   * 書き込み窓（.stage-note-editor textarea）も同じ大きさに揃えてある。 */
  const NOTE_FONT = "15px 'Hiragino Kaku Gothic ProN', sans-serif";

  // 紐づけた駒があれば、その駒の位置を足して置き場所を出す
  /* 付箋の置き場所。数でない値が一度でも入ると絵から消えて二度と掴めなくなるので、
   * ここで必ず数に均す（画面が組まれる前に押されたときなどに起きる）。 */
  function notePos(note, L) {
    note.x = finite(note.x, 100);
    note.y = finite(note.y, 100);
    if (!note.pieceId) return { x: note.x, y: note.y };
    const piece = sc().pieces.find((p) => p.id === note.pieceId);
    if (!piece) return { x: note.x, y: note.y };
    const pos = placePiece(piece, L);
    return { x: pos.x + note.x, y: pos.y + note.y };
  }

  // 幅で折り返した行。書いた改行も活かす
  function noteLines(target, text) {
    const out = [];
    const limit = NOTE_W - NOTE_PAD * 2;
    String(text || "").split("\n").forEach((paragraph) => {
      if (!paragraph) { out.push(""); return; }
      let line = "";
      for (const ch of paragraph) {
        const next = line + ch;
        if (target.measureText(next).width > limit && line) { out.push(line); line = ch; }
        else line = next;
      }
      out.push(line);
    });
    return out.slice(0, 8);
  }

  function noteBox(target, note, L) {
    target.font = NOTE_FONT;
    const lines = noteLines(target, note.text || "メモ");
    const pos = notePos(note, L);
    return {
      x: pos.x, y: pos.y, w: NOTE_W,
      h: NOTE_PAD * 2 + Math.max(1, lines.length) * NOTE_LINE,
      lines,
    };
  }

  function drawNotes(target, L, view, showSelection) {
    const notes = (sc().notes || []).filter((note) => note.view === view);
    notes.forEach((note) => {
      const box = noteBox(target, note, L);
      const picked = showSelection && note.id === selectedNoteId;
      target.save();
      // 紐づけた駒とは細い線でつなぐ。どれについての覚え書きかが読めるように
      if (note.pieceId) {
        const piece = sc().pieces.find((p) => p.id === note.pieceId);
        if (piece) {
          const at = placePiece(piece, L);
          target.strokeStyle = "rgba(211,172,89,0.32)";
          target.lineWidth = 1;
          target.setLineDash([4, 4]);
          target.beginPath();
          target.moveTo(at.x, at.y);
          target.lineTo(box.x + box.w / 2, box.y + box.h / 2);
          target.stroke();
          target.setLineDash([]);
        }
      }
      /* 付箋は覚え書きであって、絵の主役ではない。
       * 明るい紙色だと舞台より先に目へ入るので、道具立てと同じ暗い面に置き、
       * 選んでいるときだけ縁を起こす。 */
      target.fillStyle = picked ? "rgba(38,34,30,0.95)" : "rgba(28,25,22,0.88)";
      target.strokeStyle = picked ? "rgba(211,172,89,0.9)" : "rgba(211,172,89,0.4)";
      target.lineWidth = picked ? 1.6 : 1;
      target.beginPath();
      target.rect(box.x, box.y, box.w, box.h);
      target.fill();
      target.stroke();
      // 上辺に細い線を一本だけ。付箋の向きが分かればよい
      target.fillStyle = "rgba(211,172,89,0.32)";
      target.fillRect(box.x, box.y, box.w, 2);

      target.fillStyle = "rgba(240,231,214,0.86)";
      target.font = NOTE_FONT;
      target.textAlign = "left";
      target.textBaseline = "top";
      box.lines.forEach((line, i) => {
        target.fillText(line, box.x + NOTE_PAD, box.y + NOTE_PAD + i * NOTE_LINE);
      });
      target.restore();
    });
  }

  function noteAt(point, L, view) {
    const notes = (sc().notes || []).filter((note) => note.view === view);
    for (let i = notes.length - 1; i >= 0; i -= 1) {
      const box = noteBox(ctx, notes[i], L);
      if (point.x >= box.x && point.x <= box.x + box.w
        && point.y >= box.y && point.y <= box.y + box.h) return notes[i];
    }
    return null;
  }

  /* メモの中身を書く小窓。絵の上の付箋と同じ場所へ重ねて出すので、
   * 「どの付箋を書いているか」を探さなくて済む。書いた端から絵にも反映する。 */
  let noteEditor = null;

  function closeNoteEditor() {
    if (!noteEditor) return;
    noteEditor.remove();
    noteEditor = null;
  }

  function removeNote(id) {
    checkpoint();
    sc().notes = (sc().notes || []).filter((note) => note.id !== id);
    if (selectedNoteId === id) selectedNoteId = null;
    closeNoteEditor();
    render();
    persistSoon();
  }

  function openNoteEditor(note, view) {
    closeNoteEditor();
    const host = view === "plan" ? planCanvas : canvas;
    if (!host || !host.parentElement) return;
    const box = noteBox(ctx, note, layout(view));
    const wrap = document.createElement("div");
    wrap.className = "stage-note-editor";
    wrap.style.left = `${(box.x / W) * 100}%`;
    wrap.style.top = `${(box.y / H) * 100}%`;
    wrap.style.width = `${(NOTE_W / W) * 100}%`;

    const area = document.createElement("textarea");
    area.rows = 3;
    area.value = note.text || "";
    area.placeholder = "覚え書き";
    area.addEventListener("input", () => {
      note.text = area.value.slice(0, 200);
      render();
      persistSoon();
    });
    area.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); closeNoteEditor(); host.focus(); }
    });

    const bar = document.createElement("div");
    bar.className = "stage-note-editor-bar";
    const drop = document.createElement("button");
    drop.type = "button";
    drop.className = "btn-quiet";
    drop.textContent = "はがす";
    drop.addEventListener("click", () => removeNote(note.id));
    const done = document.createElement("button");
    done.type = "button";
    done.className = "btn-quiet";
    done.textContent = "閉じる";
    done.addEventListener("click", () => { closeNoteEditor(); host.focus(); });
    bar.append(drop, done);

    wrap.append(area, bar);
    host.parentElement.appendChild(wrap);
    noteEditor = wrap;
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
  }

  function drawSelection(target, piece, L) {
    const b = selectionBounds(piece, L);
    const locked = isLocked(piece);
    target.save();
    // 錠が掛かっているものは掴んでも動かない。掴む前に分かるよう、枠の色でも示す
    target.strokeStyle = locked ? "rgba(211,172,89,0.5)" : "#d3ac59";
    target.lineWidth = 2;
    target.setLineDash(locked ? [3, 6] : [8, 7]);
    target.strokeRect(b.x - 7, b.y - 7, b.w + 14, b.h + 14);
    target.setLineDash([]);
    if (locked) {
      target.font = "15px 'Hiragino Kaku Gothic ProN', sans-serif";
      target.textAlign = "left";
      target.textBaseline = "bottom";
      target.fillText("🔒", b.x - 6, b.y - 11);
    } else {
      target.fillStyle = "#d3ac59";
      [[b.x - 7, b.y - 7], [b.x + b.w + 7, b.y - 7], [b.x - 7, b.y + b.h + 7], [b.x + b.w + 7, b.y + b.h + 7]]
        .forEach(([x, y]) => target.fillRect(x - 3, y - 3, 6, 6));
    }
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
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.clearRect(0, 0, W, H);
    target.fillStyle = "#0d0c0b";
    target.fillRect(0, 0, W, H);
    // 二本指で拡大しているぶんを、ここで一度だけかける
    const zs = zoomOf(view);
    if (zs.z !== 1 || zs.ox || zs.oy) {
      target.setTransform(zs.z, 0, 0, zs.z, -zs.ox * zs.z, -zs.oy * zs.z);
    }

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
    /* 平面図は「床に何がどう置いてあるか」の図なので、宙に吊ってあるものは
     * 既定では出さない。要るときだけ出せるように入り切りを持つ。 */
    const shown = sc().pieces.filter((p) => !(L.plan && !state.showFlown && isFlown(p)));
    // 正面図では奥から描く（重なりが自然になる）
    const solid = shown.filter((p) => p.type !== "light");
    (L.plan ? solid : solid.slice().sort((a, b) => a.v - b.v)).forEach(draw);

    // 名前。頭上（平面では点の脇）に小さく置く。演者と装置は別々に出し入れする
    if (state.showNames || state.showSetNames) {
      shown.forEach((piece) => {
        const wanted = piece.type === "performer" ? state.showNames : state.showSetNames;
        if (!wanted) return;
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

    // 動線は平面図だけ。上から見た床の上の道筋なので、正面図には出しようがない
    if (L.plan) drawRoutes(target, L, showSelection);
    drawNotes(target, L, view, showSelection);

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
      els.frontCaption.textContent = `${tx("正面")} — ${seatName(VENUES.seatById(state.seat))}`
        + (pannable ? (isEn() ? " (drag an empty spot to look around)" : "（何もない所を掴むと視線を振れます）") : "");
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

      /* 説明文は畳んでおき、「?」を押したときだけ出す。
       * 道具の数が多く、説明が常に見えていると、道具そのものが下へ押し出される。
       * 初めて触るときだけ要る文章なので、要るときに引き出せればよい。 */
      // 説明として畳むもの。状態を伝える文（保存の様子など）は畳まない
      const hints = [...el.querySelectorAll(".stage-cast-hint, .stage-selection-empty")];
      if (hints.length) {
        hints.forEach((hint) => { hint.hidden = true; });
        const help = document.createElement("button");
        help.type = "button";
        help.className = "stage-panel-help";
        help.textContent = "?";
        help.setAttribute("aria-pressed", "false");
        help.setAttribute("aria-label", `${el.dataset.title || id}の説明を出す`);
        help.title = "この項目の説明";
        help.addEventListener("click", (e) => {
          e.stopPropagation();
          const show = hints[0].hidden;
          hints.forEach((hint) => { hint.hidden = !show; });
          help.setAttribute("aria-pressed", String(show));
        });
        el.append(help);
      }

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
    syncRosterGroups();
    if (!els.castList) return;
    const cast = state.project.cast;
    els.castList.innerHTML = "";
    if (!cast.length) {
      const empty = document.createElement("p");
      empty.className = "stage-cast-empty";
      empty.textContent = isEn()
        ? "No one registered yet. Enter a name and add them."
        : "まだ誰も登録していません。名前を入れて追加してください。";
      els.castList.append(empty);
      return;
    }
    cast.forEach((member) => {
      const row = document.createElement("div");
      row.className = "stage-cast-row";

      const swatch = kindSwatch(member, "performer", member.name, (value) => {
        member.color = value;
        // 舞台に出ている分にも色を反映する
        state.project.scenes.forEach((scene) => {
          scene.pieces.forEach((piece) => {
            if (piece.castId === member.id) piece.color = member.color;
          });
        });
        render();
        persistSoon();
      });

      const name = nameButton(member.name,
        () => pickOnStage((piece) => piece.castId === member.id, member.name),
        () => openProfile(member.id));

      const onStage = castOnStage(member.id);
      const status = document.createElement("button");
      status.type = "button";
      status.className = `stage-cast-status ${onStage ? "is-on" : "is-off"}`;
      status.textContent = onStage ? tm("misc", "onStage", "舞台上") : tm("misc", "offStage", "舞台裏");
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

      row.append(swatch, name, status, lockButton(member, member.name), profile, remove);
      els.castList.append(row);
    });
  }

  /* 一覧の錠。掛けているあいだ、そのものは舞台の上で掴んでも動かない。
   * 「置き場所は決まったので、もう触りたくない」ときに使う。 */
  /* 種類の絵と色を一つにまとめた見本。押すと色を選べる。
   * 色だけの四角と種類名の文字を別々に並べると、狭い列で二段になってしまう。
   * 絵は輪郭ではなく塗りで持つ（小さいので線だと潰れる）。 */
  const KIND_ICONS = {
    performer: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
      + '<circle cx="8" cy="3.5" r="2.4"/>'
      + '<path d="M8 6.5c2 0 3.1 1.2 3.3 3l.5 4.4H9.8l-.3-3.1h-.3l-.3 3.1H6.8l-.3-3.1h-.3l-.3 3.1H4.2l.5-4.4c.2-1.8 1.3-3 3.3-3z"/></svg>',
    light: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
      + '<path d="M5.6 1.5h4.8l1 3.1H4.6z"/>'
      + '<path d="M4.8 5.6h6.4L13.5 14.3H2.5z" opacity=".45"/></svg>',
    object: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
      + '<path d="M8 1.6 14.3 4.9 8 8.2 1.7 4.9z" opacity=".55"/>'
      + '<path d="M1.7 6 7.4 9v5.4L1.7 11.4zM14.3 6v5.4L8.6 14.4V9z"/></svg>',
  };

  function kindSwatch(item, kind, label, onPick) {
    const wrap = document.createElement("label");
    wrap.className = "stage-kind-swatch";
    wrap.title = `${label}の色を変える`;
    wrap.style.color = item.color;
    const glyph = document.createElement("span");
    glyph.className = "stage-kind-glyph";
    glyph.innerHTML = KIND_ICONS[kind] || KIND_ICONS.object;
    const input = document.createElement("input");
    input.type = "color";
    input.className = "stage-kind-input";
    input.value = item.color;
    input.setAttribute("aria-label", `${label}の色`);
    input.addEventListener("input", () => {
      wrap.style.color = input.value;
      onPick(input.value);
    });
    wrap.append(glyph, input);
    return wrap;
  }

  /* 一覧の名前。押すと舞台の上のそれを選び、二度押しで詳しい窓を開く。
   * 以前は名前が入力欄で、選ぶつもりで押すと文字を打つ構えになっていた。
   * 名前を直すのは詳しい窓（プロフィール／寸法）の中でできる。 */
  function nameButton(label, onPick, onOpen) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-cast-name";
    button.textContent = label;
    button.title = "押すと舞台の上で選びます。二度押しで詳しい窓が開きます";
    button.addEventListener("click", onPick);
    button.addEventListener("dblclick", (e) => { e.preventDefault(); onOpen(); });
    return button;
  }

  /* 一覧から舞台の上のものを選ぶ。舞台裏なら選べないので、その旨だけ伝える。 */
  function pickOnStage(findPiece, name, light) {
    const piece = sc().pieces.find(findPiece);
    if (!piece) {
      announce(light
        ? `${name}はこの場面ではOFFです。「OFF」を押すと点きます。`
        : `${name}はいま舞台裏です。「舞台裏」を押すと舞台へ出ます。`);
      return;
    }
    selectedId = piece.id;
    selectedNoteId = null;
    // 照明は照明の道具、それ以外は動かす道具でないと掴めない
    const want = piece.type === "light" ? "light" : "select";
    if ((tool === "light") !== (want === "light")) setTool(want);
    updateInspector();
    render();
    announce(`${name}を選びました。`);
  }

  function lockButton(item, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-cast-lock";
    button.textContent = item.locked ? "🔒" : "🔓";
    button.setAttribute("aria-pressed", String(Boolean(item.locked)));
    button.title = item.locked
      ? `${label}の錠を外す（動かせるようになります）`
      : `${label}に錠を掛ける（動かなくなります）`;
    button.setAttribute("aria-label", button.title);
    button.addEventListener("click", () => {
      checkpoint();
      item.locked = !item.locked;
      renderCast();
      renderSets();
      renderLights();
      updateInspector();
      render();
      persistSoon();
      announce(`${label}${item.locked ? "に錠を掛けました。" : "の錠を外しました。"}`);
    });
    return button;
  }

  /* 名前を入れずに〈追加〉したときの名。「演者3」のように種類＋番号にする。
   * 番号は空いている一番小さいものを採るので、消して足し直しても被らない。
   * 名前は思いついてから付ければよく、そこで手を止めさせないため。
   * 「台・箱」のような並びの名は先頭だけ使う（「台・箱1」は読みにくい）。 */
  function autoName(base) {
    const head = String(base).split(/[・/]/)[0].trim() || base;
    const used = new Set();
    (state.project.cast || []).forEach((c) => used.add(c.name));
    (state.project.sets || []).forEach((s) => used.add(s.name));
    let n = 1;
    while (used.has(head + n)) n += 1;
    return head + n;
  }

  function addCastMember(nameInput) {
    const input = nameInput || els.rosterName;
    const raw = (input && input.value || "").trim() || autoName(pieceTypeName("performer"));
    checkpoint();
    const member = {
      id: rid("cast"), name: raw.slice(0, 24), color: nextPieceColor(state.project.cast.length),
      heightCm: DEFAULT_HEIGHT_CM, note: "", locked: false,
    };
    state.project.cast.push(member);
    // 登録したものは、そのままこの場面の舞台へ出す（出すのが普通で、裏に置くのが例外）
    placeCastPiece(member);
    if (input) input.value = "";
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    /* ★絵と場面の欄も描き直す。ここを忘れると、データには入っているのに
     * 舞台に出てこない（札は「舞台上」なのに姿がない、という食い違いになる）。 */
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    announce(`${raw}を名簿へ加え、この場面の舞台へ出しました。`);
  }

  // 演者をこの場面の舞台へ置く。登録した直後にも、あとから出すときにも通す
  function placeCastPiece(member) {
    const scene = sc();
    const count = scene.pieces.filter((p) => p.type === "performer").length;
    // 正規化を通す。手で作ると、あとから足した持ち物（明かりの当て方など）が抜ける
    const piece = normalizePiece({
      id: nextId(), type: "performer", castId: member.id,
      u: clamp(0.5 + ((count % 5) - 2) * 0.09, 0.06, 0.94),
      v: clamp(0.6 + (count % 3) * 0.07, 0.05, 0.95),
      size: 100, color: member.color || state.pieceColor, name: "",
    }, 0);
    scene.pieces.push(piece);
    selectedId = piece.id;
    return piece;
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
    } else if (member) {
      placeCastPiece(member);
      announce(`${member.name}を舞台へ出しました。`);
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
      isEn() ? "Nothing registered yet. Enter a name, pick a kind, and add it."
        : "まだ何も登録していません。名前と形を選んで追加してください。");
    syncRosterGroups();
  }

  /* 照明の一覧は種類ごとに枠を分ける。吊りとSSと前明かりと転がしは、
   * 仕込む場所も役目も別物なので、ひと続きに並べると読み分けられない。 */
  function renderLights() {
    const host = els.lightList;
    if (!host) return;
    host.innerHTML = "";
    const lights = (state.project.sets || []).filter((item) => item.kind === "light");
    if (!lights.length) {
      const empty = document.createElement("p");
      empty.className = "stage-cast-empty";
      empty.textContent = isEn()
        ? "No lights yet. Pick a type, enter a name, and add it."
        : "まだ登録していません。種類を選び、名前を入れて追加してください。";
      host.append(empty);
      syncRosterGroups();
      return;
    }
    LIGHT_KIND_ORDER.forEach((key) => {
      if (!lights.some((item) => lightKindOf(item) === key)) return;
      const head = document.createElement("p");
      head.className = "stage-roster-head";
      head.textContent = lightKindName(key);
      head.title = lightKindNote(key);
      const box = document.createElement("div");
      box.className = "stage-cast-list";
      host.append(head, box);
      renderSetList(box, (item) => item.kind === "light" && lightKindOf(item) === key, "");
    });
    syncRosterGroups();
  }

  /* 一枚にまとめた以上、空の見出しが三つ並ぶのは邪魔になる。
   * 中身のある組だけ出し、全部空のときだけ一行の案内を出す。 */
  function syncRosterGroups() {
    const sets = state.project.sets || [];
    const counts = {
      cast: (state.project.cast || []).length,
      sets: sets.filter((item) => item.kind !== "light").length,
    };
    if (els.groupCast) els.groupCast.hidden = counts.cast === 0;
    if (els.groupSets) els.groupSets.hidden = counts.sets === 0;
    if (els.rosterEmpty) els.rosterEmpty.hidden = counts.cast + counts.sets > 0;
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

      const swatch = kindSwatch(item, item.kind === "light" ? "light" : "object", item.name, (value) => {
        item.color = value;
        state.project.scenes.forEach((scene) => {
          scene.pieces.forEach((piece) => {
            if (piece.setId === item.id) piece.color = item.color;
          });
        });
        render();
        persistSoon();
      });

      const name = nameButton(item.name,
        () => pickOnStage((piece) => piece.setId === item.id, item.name, light),
        () => openSetInfo(item.id));

      /* 寸法は行に出さず、行の title と「…」の窓へ回す。
       * 狭い列で名前と寸法を並べると、どちらも数文字で切れて読めなくなる。 */
      const summary = item.kind === "light"
        ? `${lightKindName(lightKindOf(item))}（${lightKindNote(lightKindOf(item))}）／${setDimLabel(item)}`
        : `${setKindName(item.kind)}／${setDimLabel(item)}`;

      const onStage = setOnStage(item.id);
      const light = item.kind === "light";
      const status = document.createElement("button");
      status.type = "button";
      status.className = `stage-cast-status ${onStage ? "is-on" : "is-off"}`;
      status.textContent = onStageWord(item, onStage);
      status.title = light
        ? (onStage ? "押すとこの場面では消します" : "押すとこの場面で点けます")
        : (onStage ? "押すと舞台から下げます" : "押すとこの場面の舞台へ出します");
      status.addEventListener("click", () => toggleSetOnStage(item.id));

      const detail = document.createElement("button");
      detail.type = "button";
      detail.className = "stage-cast-profile";
      detail.textContent = "…";
      const what = item.kind === "light" ? "直径" : "寸法";
      detail.title = `${item.name}の${what}を変える（いまは ${setDimLabel(item)}）`;
      detail.setAttribute("aria-label", `${item.name}の${what}を開く`);
      detail.addEventListener("click", () => openSetInfo(item.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "stage-cast-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", `${item.name}を舞台セットから外す`);
      remove.addEventListener("click", () => removeSetItem(item.id));

      /* 一段にまとめる。名前の右へ寸法を小さく置き、名前が長ければそちらを詰める。
       * 段を分けると、十数個並べたときに一覧が縦に伸びて見渡せなくなる。 */
      row.className = "stage-cast-row";
      row.title = summary;
      row.append(swatch, name, status, lockButton(item, item.name), detail, remove);
      host.append(row);
    });
  }

  function addSetItem(kind, nameInput, lightKind) {
    const raw = (nameInput && nameInput.value || "").trim() || autoName(setKindName(kind));
    checkpoint();
    const lk = kind === "light" && LIGHT_KINDS[lightKind] ? lightKind : "hang";
    const dims = normalizeDims(kind, {});
    // 吊物にしたときのために、地上高の場所を作っておく（既定は床）
    if (SOLID_TYPES[kind] && dims && dims.lift === undefined) dims.lift = 0;
    if (kind === "light") dims.dia = LIGHT_KINDS[lk].dia;
    const flownOnly = Boolean(FLOWN_ONLY[kind]);
    if (flownOnly && dims) dims.lift = kind === "tissue" ? 7.4 : 2.6;
    const item = {
      id: rid("set"), kind, name: raw.slice(0, 24),
      color: kind === "light" ? "#d3ac59" : nextPieceColor(state.project.sets.length + 2),
      dims, note: "", locked: false, flown: flownOnly, wires: 2, framed: false, lightKind: lk,
    };
    state.project.sets.push(item);
    placeSetPiece(item);
    if (nameInput) nameInput.value = "";
    renderSets();
    renderLights();
    // 同上。登録しただけで絵が変わらないと、置いたことが伝わらない
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    announce(kind === "light"
      ? `${raw}を${lightKindName(lk)}へ加えてONにしました。`
      : `${raw}を舞台セットへ加え、この場面の舞台へ出しました。`);
  }

  // 舞台セット・明かりをこの場面へ置く。登録した直後にも、あとから出すときにも通す
  function placeSetPiece(item) {
    const scene = sc();
    /* 置き場所を少しずつずらすための数。明かりも数に入れる。
     * 外していたので、明かりを二つ出すと同じ場所に重なって出ていた。 */
    const count = scene.pieces.filter((p) => p.type !== "performer").length;
    const piece = normalizePiece({
      id: nextId(), type: item.kind, setId: item.id,
      u: clamp(0.5 + ((count % 5) - 2) * 0.11, 0.06, 0.94),
      v: clamp(0.5 + (count % 3) * 0.09, 0.05, 0.95),
      size: 100, color: item.color || state.pieceColor, name: "", facing: 0,
    }, 0);
    // 明かりは種類ごとの仕込み位置から始める。出したあとは自由に動かせる
    if (piece.type === "light") {
      const spec = LIGHT_KINDS[lightKindOf(item)];
      const src = spec.source(piece.u, piece.v);
      piece.beam = normalizeBeam({ u: src.u, v: src.v, h: spec.h, toH: spec.toH }, piece);
    }
    scene.pieces.push(piece);
    selectedId = piece.id;
    return piece;
  }

  // 明かりは「舞台の上か裏か」ではなく、点いているか消えているかで言う
  const onStageWord = (item, on) => (item && item.kind === "light"
    ? (on ? "ON" : "OFF")
    : (on ? tm("misc", "onStage", "舞台上") : tm("misc", "offStage", "舞台裏")));

  function toggleSetOnStage(setId) {
    checkpoint();
    const scene = sc();
    const existing = scene.pieces.find((piece) => piece.setId === setId);
    const item = (state.project.sets || []).find((t) => t.id === setId);
    const light = item && item.kind === "light";
    if (existing) {
      scene.pieces = scene.pieces.filter((piece) => piece.id !== existing.id);
      if (selectedId === existing.id) selectedId = null;
      announce(light
        ? `${item.name}をOFFにしました。`
        : `${item ? item.name : "これ"}を舞台から下げました。`);
    } else if (item) {
      placeSetPiece(item);
      announce(light ? `${item.name}をONにしました。` : `${item.name}を舞台へ出しました。`);
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

  /* ---------- ショーの新規・切り替え ---------- */

  function applyLoadedState(next, message) {
    state = next;
    selectedId = null;
    history.length = 0;
    future.length = 0;
    renderVenueControls();
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    syncInputs();
    applyLayout();
    updateInspector();
    updateHistoryButtons();
    render();
    persistSoon();
    announce(message);
  }

  function newShow() {
    if (!window.confirm("新しいショーを作ります。いま開いているショーは一覧に残ります。")) return;
    shelveCurrent();
    const fresh = baseState(false);
    fresh.project.title = "無題のショー";
    fresh.layout = state.layout;                 // 道具の並びは持ち越す
    applyLoadedState(normalizeState(fresh), "新しいショーを作りました。");
    closeShows();
    renderShows();
  }

  function openShow(id) {
    const shows = readShows();
    const entry = shows[id];
    if (!entry) return;
    if (id === state.project.id) { closeShows(); return; }
    shelveCurrent();
    const next = normalizeState(entry.state);
    next.layout = state.layout;
    applyLoadedState(next, `${next.project.title}を開きました。`);
    closeShows();
  }

  function deleteShow(id) {
    const shows = readShows();
    const info = showSummary(shows[id]);
    if (!info) return;
    if (id === state.project.id) {
      window.alert("いま開いているショーは消せません。別のショーへ切り替えてから消してください。");
      return;
    }
    if (!window.confirm(`「${info.title}」を端末から消します。戻せません。`)) return;
    delete shows[id];
    writeShows(shows);
    renderShows();
    announce(`${info.title}を消しました。`);
  }

  function renderShows() {
    if (!els.showList) return;
    const shows = readShows();
    shelveCurrent();                              // いまのショーも必ず一覧へ出す
    const rows = Object.keys(readShows())
      .map((id) => showSummary(readShows()[id]))
      .filter(Boolean)
      .sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
    els.showList.innerHTML = "";
    rows.forEach((info) => {
      const row = document.createElement("div");
      row.className = `stage-show-row${info.id === state.project.id ? " is-current" : ""}`;

      const open = document.createElement("button");
      open.type = "button";
      open.className = "stage-show-open";
      const title = document.createElement("span");
      title.className = "stage-show-title";
      title.textContent = info.title;
      const meta = document.createElement("span");
      meta.className = "stage-show-meta";
      const when = info.savedAt ? info.savedAt.slice(0, 10).replace(/-/g, "/") : "";
      meta.textContent = `${info.version}・${info.scenes}場面${when ? `・${when}` : ""}`
        + (info.id === state.project.id ? "・開いています" : "");
      open.append(title, meta);
      open.addEventListener("click", () => openShow(info.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "stage-cast-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", `${info.title}を消す`);
      remove.disabled = info.id === state.project.id;
      remove.addEventListener("click", () => deleteShow(info.id));

      row.append(open, remove);
      els.showList.append(row);
    });
  }

  function openShows() {
    if (!els.showsModal) return;
    renderShows();
    els.showsModal.hidden = false;
    els.showsBackdrop.hidden = false;
  }

  function closeShows() {
    if (els.showsModal) els.showsModal.hidden = true;
    if (els.showsBackdrop) els.showsBackdrop.hidden = true;
  }

  /* ---------- 姿勢を選ぶ ----------
     名前だけでは「片膝立ち」と「しゃがむ」の違いが伝わらないので、
     実際の形を小さく描いて並べる。舞台の絵と同じ骨格・同じ塗りを通すので、
     見本と本番がずれない。 */

  /* 種類の見本。真横から見た形（高さと幅）だけを描く。
   * 舞台の絵と同じ部品（pieceParts）から起こすので、
   * 一覧の絵と実際に置かれる物が食い違わない。 */
  function drawKindPreview(canvas, kind, color) {
    const ctx2 = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx2.clearRect(0, 0, w, h);
    if (kind === "performer") {
      // 人だけは骨格を持っているので、立ち姿をそのまま使う
      drawPosePreview(canvas, "stand", color);
      return;
    }
    if (kind === "light") {
      ctx2.save();
      ctx2.strokeStyle = color;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(w * 0.5, h * 0.16);
      ctx2.lineTo(w * 0.22, h * 0.8);
      ctx2.lineTo(w * 0.78, h * 0.8);
      ctx2.closePath();
      ctx2.globalAlpha = 0.35;
      ctx2.fillStyle = color;
      ctx2.fill();
      ctx2.globalAlpha = 1;
      ctx2.stroke();
      ctx2.restore();
      return;
    }
    const dims = normalizeDims(kind, {});
    if (kind === "sphere") {
      // 球は部品を持たない（円ひとつで決まる）ので、ここで描く
      const r = Math.min(w, h) * 0.32;
      ctx2.save();
      ctx2.fillStyle = color;
      ctx2.beginPath();
      ctx2.arc(w / 2, h * 0.62, r, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
      return;
    }
    const parts = pieceParts({ type: kind, dims, facing: 0 });
    if (!parts) return;
    // 幅と高さの範囲を測る
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    const scan = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
    parts.forEach((part) => {
      if (part.kind === "line") { scan(part.a[0], part.a[1]); scan(part.b[0], part.b[1]); return; }
      if (part.kind === "ring") { scan(part.c[0] - part.r, part.c[1] - part.r); scan(part.c[0] + part.r, part.c[1] + part.r); return; }
      scan(part.ox - part.w / 2, part.lift); scan(part.ox + part.w / 2, part.lift + part.h);
    });
    const pad = 14;
    const bw = Math.max(0.01, x1 - x0);
    const bh = Math.max(0.01, y1 - y0);
    const k = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
    const ox = (w - bw * k) / 2 - x0 * k;
    const oy = h - pad - (0 - y0) * k;          // 床（y=0）を下端に置く
    const px = (x) => ox + x * k;
    const py = (y) => oy - y * k;

    ctx2.save();
    ctx2.lineCap = "round";
    ctx2.lineJoin = "round";
    parts.forEach((part) => {
      if (part.kind === "line") {
        ctx2.strokeStyle = part.tone === "cloth" ? color : "rgba(214,220,226,0.9)";
        ctx2.lineWidth = Math.max(1.5, (part.w || 0.04) * k);
        ctx2.beginPath();
        ctx2.moveTo(px(part.a[0]), py(part.a[1]));
        ctx2.lineTo(px(part.b[0]), py(part.b[1]));
        ctx2.stroke();
        return;
      }
      if (part.kind === "ring") {
        ctx2.strokeStyle = part.tone === "dark" ? "rgba(60,54,48,0.95)" : "rgba(214,220,226,0.9)";
        ctx2.lineWidth = Math.max(1.5, (part.w || 0.04) * k);
        ctx2.beginPath();
        ctx2.arc(px(part.c[0]), py(part.c[1]), part.r * k, 0, Math.PI * 2);
        ctx2.stroke();
        return;
      }
      ctx2.fillStyle = part.tint >= 1 ? color : mixToward(color, 1 - (part.tint || 1));
      ctx2.fillRect(px(part.ox - part.w / 2), py(part.lift + part.h),
        Math.max(1.5, part.w * k), Math.max(1.5, part.h * k));
    });
    ctx2.restore();
  }

  function drawPosePreview(canvas, poseId, color) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    /* 見る角度は姿勢で変える。斜め前から見ると前後と左右の両方が読めるが、
     * 宙返りや寝姿のように「横から見る形」は、斜めから見ると
     * 手前と奥が重なって塊にしか見えない。そういう姿勢は真横から見せる。 */
    const pose = poseById(poseId);
    const yaw = pose && pose.sideView ? Math.PI * 0.5 : Math.PI * 0.24;

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

  const ROSTER_KINDS = ["performer"].concat(SET_KIND_ORDER);
  let rosterKind = "performer";

  function openKindModal() {
    if (!els.kindModal) return;
    const grid = els.kindGrid;
    grid.innerHTML = "";
    ROSTER_KINDS.forEach((kind) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = `stage-pose-tile${kind === rosterKind ? " is-on" : ""}`;
      const canvas = document.createElement("canvas");
      canvas.width = 132;
      canvas.height = 132;
      const label = document.createElement("span");
      label.textContent = kind === "performer" ? tx("演者") : setKindName(kind);
      tile.append(canvas, label);
      tile.addEventListener("click", () => {
        rosterKind = kind;
        if (els.rosterKindLabel) els.rosterKindLabel.textContent = label.textContent;
        closeKindModal();
        if (els.rosterName) els.rosterName.focus();
      });
      grid.append(tile);
      drawKindPreview(canvas, kind, kind === "performer" ? "#a84b26" : "#8b98a1");
    });
    els.kindModal.hidden = false;
    els.kindBackdrop.hidden = false;
  }

  function closeKindModal() {
    if (!els.kindModal) return;
    els.kindModal.hidden = true;
    els.kindBackdrop.hidden = true;
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
      label.textContent = poseName(pose);
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
      empty.textContent = isEn()
        ? "Nothing saved yet. Lay out the set, then save it under a name."
        : "まだ残していません。並べ終えたら名前をつけて残してください。";
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
    els.setInfoTitle.textContent = `${item.name}（${setKindName(item.kind)}）`;
    els.setInfoName.value = item.name;
    els.setInfoColor.value = item.color;
    if (els.setInfoKindRow) {
      els.setInfoKindRow.hidden = item.kind !== "light";
      if (item.kind === "light" && els.setInfoKind) els.setInfoKind.value = lightKindOf(item);
    }
    if (els.setInfoFlownRow) {
      // 吊れるのは形のあるもの（台・テーブル・椅子・壁）だけ
      const canFly = Boolean(SOLID_TYPES[item.kind]);
      const onlyFlown = Boolean(FLOWN_ONLY[item.kind]);
      els.setInfoFlownRow.hidden = !canFly;
      if (els.setInfoFlown) {
        // 吊物にしかならない道具は、床置きへ戻せない
        els.setInfoFlown.disabled = onlyFlown;
        els.setInfoFlownRow.title = onlyFlown ? "この道具は吊物にしかなりません" : "";
      }
      if (els.setInfoFlownNote) els.setInfoFlownNote.hidden = !canFly || !item.flown;
      if (els.setInfoFlown) els.setInfoFlown.checked = Boolean(item.flown);
      if (els.setInfoFramedRow) {
        els.setInfoFramedRow.hidden = item.kind !== "wall";
        if (els.setInfoFramed) els.setInfoFramed.checked = Boolean(item.framed);
      }
      if (els.setInfoWiresRow) els.setInfoWiresRow.hidden = !canFly || !item.flown;
      if (els.setInfoWires) els.setInfoWires.value = String(Number(item.wires) === 1 ? 1 : 2);
    }
    els.setInfoNote.value = item.note || "";
    buildDimControls(els.setInfoDims, "stage-setinfo", item.kind, item.dims, () => {
      renderSets();
      renderLights();
      render();
      persistSoon();
    }, Boolean(item.flown));
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
      /* 番号は入れ子に沿って振る。セクションの中の場面は「4-1」のようになる。
       * 深さごとの数え札を持ち、浅い所へ戻ったら深い側は捨てる。 */
      const counters = [];
      p.scenes.forEach((scene, i) => {
        counters[scene.depth] = (counters[scene.depth] || 0) + 1;
        counters.length = scene.depth + 1;
        const numberText = counters.join("-");
        if (sceneHidden(i)) return;
        const isCursor = scene.id === (state.cursorRowId || p.activeSceneId);
        const isOpen = scene.kind === "scene" && scene.id === p.activeSceneId;

        const row = document.createElement("div");
        row.className = `stage-scene-row${isOpen ? " is-open" : ""}`;
        row.dataset.sceneId = scene.id;
        row.style.marginLeft = `${scene.depth * 14}px`;

        const head = document.createElement("div");
        head.className = "stage-scene-head";

        // 掴んで動かす取っ手。行そのものを掴むと中の編集ができなくなる
        const grip = document.createElement("span");
        grip.className = "stage-scene-grip";
        grip.textContent = "⠿";
        grip.setAttribute("aria-hidden", "true");
        grip.addEventListener("pointerdown", (e) => startSceneDrag(e, scene.id, row));

        const button = document.createElement("button");
        button.type = "button";
        button.className = `stage-scene-chip${scene.kind === "section" ? " is-section" : ""}${isOpen ? " is-open" : ""}`;
        button.setAttribute("aria-pressed", String(isCursor));

        const num = document.createElement("span");
        num.className = "stage-scene-num";
        if (scene.kind === "section") {
          const shut = Boolean(state.closedSections[scene.id]);
          num.textContent = `${shut ? "▸" : "▾"} ${numberText}`;
          button.setAttribute("aria-expanded", String(!shut));
        } else {
          num.textContent = scene.studyBeatId || numberText;
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
        /* 名前を直す入口は鉛筆。行そのものを入力欄にすると、
         * 掴んで並べ替える手つきと取り合いになる（実際に効かなくなっていた）。 */
        button.title = scene.kind === "section" ? "押すと開閉します" : "押すと開きます";
        button.addEventListener("dblclick", (e) => {
          e.preventDefault();
          openRename(scene);
        });
        button.addEventListener("click", () => {
          if (scene.kind === "section") {
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
        head.append(grip, button);
        // 鉛筆は選んでいる行にだけ。全行に出すと並びが読みにくくなる
        if (isCursor) {
          const pen = document.createElement("button");
          pen.type = "button";
          pen.className = "stage-scene-pen";
          pen.textContent = "✎";
          pen.title = "名前を変える";
          pen.setAttribute("aria-label", `${scene.title} の名前を変える`);
          pen.addEventListener("click", (e) => { e.stopPropagation(); openRename(scene); });
          head.append(pen);
        }
        row.append(head);

        /* 開いている場面だけ、名前とメモをその場で開く。
         * 閉じている行は名前だけ。並びを見渡すときに邪魔にならない。 */
        if (isOpen && scene.kind === "scene") {
          const body = document.createElement("div");
          body.className = "stage-scene-body";
          const note = document.createElement("textarea");
          note.className = "stage-text-input";
          note.rows = 2;
          note.maxLength = 200;
          note.value = scene.note || "";
          note.placeholder = tm("misc", "sceneNoteHint", "この場面のメモ（何が起きるか）");
          note.setAttribute("aria-label", "場面のメモ");
          note.addEventListener("input", () => {
            scene.note = note.value.slice(0, 200);
            persistSoon();
          });
          const apply = document.createElement("button");
          apply.type = "button";
          apply.className = "btn-quiet stage-scene-apply";
          apply.textContent = tm("misc", "applyRoute", "動線の先へ動かした場面を作る");
          apply.title = "この場面を写し、動線を引いた演者を行き先へ移した場面を次に作ります";
          apply.disabled = !(scene.pieces || []).some((piece) => piece.route);
          apply.addEventListener("click", () => applyRoutes(scene));
          body.append(note, apply);
          row.append(body);
        }
        els.sceneList.append(row);
      });
    }
    if (els.projectTitle && document.activeElement !== els.projectTitle) els.projectTitle.value = p.title;
    if (els.versionLabel && document.activeElement !== els.versionLabel) els.versionLabel.value = p.versionLabel;
    if (els.versionNote) {
      els.versionNote.textContent = p.parentVersionId
        ? (isEn() ? `${p.branchReason || "Duplicated as another version"} (derived from an earlier version)`
          : `${p.branchReason || "別バージョンとして複製"}（元の版から派生）`)
        : (isEn() ? "The first version of this show." : "このショーの最初の版です。");
    }
    const idx = cursorIndex();
    if (els.sceneDel) els.sceneDel.disabled = p.scenes.filter((x) => x.kind === "scene").length <= 1;
    renderSceneStudy();
    /* 並べ替えと入れ子は、掴んで動かす方に一本化した。
     * 矢印のボタンは同じことを二通りに増やすだけなので置かない。 */
  }

  /* 行の名前をその場で書き換える。
   * 入力欄はボタンの外へ出す。ボタンの中へ入れると、押した先がボタンに
   * 吸われて文字を打てない（実際それで動かなかった）。 */
  /* 名前を変える小窓。場面にもセクションにも同じものを使う。 */
  let renameTarget = null;

  function openRename(scene) {
    if (!scene || !els.rename) return;
    renameTarget = scene;
    els.renameTitle.textContent = scene.kind === "section" ? "セクションの名前" : "場面の名前";
    els.renameInput.value = scene.title;
    els.rename.hidden = false;
    els.renameBackdrop.hidden = false;
    els.renameInput.focus();
    els.renameInput.select();
  }

  function closeRename() {
    renameTarget = null;
    if (!els.rename) return;
    els.rename.hidden = true;
    els.renameBackdrop.hidden = true;
  }

  function commitRename() {
    if (!renameTarget) return;
    const next = els.renameInput.value.trim().slice(0, 40);
    if (next && next !== renameTarget.title) {
      checkpoint();
      renameTarget.title = next;
      renderScenes();
      persistSoon();
    }
    closeRename();
  }

  if (els.renameOk) els.renameOk.addEventListener("click", commitRename);
  if (els.renameClose) els.renameClose.addEventListener("click", closeRename);
  if (els.renameBackdrop) els.renameBackdrop.addEventListener("click", closeRename);
  if (els.renameInput) {
    els.renameInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); commitRename(); }
      if (e.key === "Escape") { e.preventDefault(); closeRename(); }
    });
  }

  /* ---------- 場面を掴んで並べ替える ----------
     写真の道具でレイヤーを入れ替えるのと同じ手つき。掴んだ行は指について動き、
     残りは滑って隙間を空ける。落とす場所は「どの行の間か」と「どの深さか」の
     二つで決まる。横へ引くと深さが変わり、セクションの中へ入る。 */

  let sceneDrag = null;

  function startSceneDrag(e, id, row) {
    if (e.button !== undefined && e.button > 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    const move = (ev) => {
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        active = true;
        beginSceneDrag(id, row, ev);
      }
      ev.preventDefault();
      moveSceneDrag(ev);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (active) endSceneDrag();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function beginSceneDrag(id, row, ev) {
    const list = state.project.scenes;
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return;
    const rect = row.getBoundingClientRect();
    const hole = document.createElement("div");
    hole.className = "stage-scene-hole";
    hole.style.height = `${rect.height}px`;
    row.parentElement.insertBefore(hole, row);
    sceneDrag = {
      id, row, hole, index: i,
      block: 1 + sceneChildren(i).length,
      baseDepth: list[i].depth,
      dx: ev.clientX - rect.left,
      dy: ev.clientY - rect.top,
      startX: ev.clientX,
      before: snapshot(),
    };
    row.classList.add("is-dragging");
    row.style.width = `${rect.width}px`;
    row.style.position = "fixed";
    row.style.left = `${rect.left}px`;
    row.style.top = `${rect.top}px`;
    row.style.zIndex = "600";
    row.style.pointerEvents = "none";
    document.body.classList.add("is-panel-dragging");
  }

  function moveSceneDrag(ev) {
    if (!sceneDrag) return;
    const row = sceneDrag.row;
    row.style.left = `${ev.clientX - sceneDrag.dx}px`;
    row.style.top = `${ev.clientY - sceneDrag.dy}px`;

    const host = els.sceneList;
    if (!host) return;
    const kids = [...host.children].filter((el) => el !== row);
    let ref = null;
    for (let k = 0; k < kids.length; k += 1) {
      if (kids[k] === sceneDrag.hole) continue;
      const r = kids[k].getBoundingClientRect();
      if (ev.clientY < r.top + r.height / 2) { ref = kids[k]; break; }
    }
    if (sceneDrag.hole.nextElementSibling !== ref) {
      flipMove(() => host.insertBefore(sceneDrag.hole, ref), row);
    }
    // 横へ引いた量で深さを決める。セクションの中へ入れるための操作
    const step = Math.round((ev.clientX - sceneDrag.startX) / 22);
    const want = clamp(sceneDrag.baseDepth + step, 0, MAX_DEPTH);
    if (want !== sceneDrag.depth) {
      sceneDrag.depth = want;
      sceneDrag.hole.style.marginLeft = `${want * 14}px`;
    }
  }

  function endSceneDrag() {
    if (!sceneDrag) return;
    const { row, hole, id, block } = sceneDrag;
    const host = els.sceneList;
    // 落とした場所が、並びの何番目に当たるか
    // 掴んでいる行そのものは並びの数に入れない（浮いているだけで場所は取っていない）
    const order = [...host.children].filter((el) => (el.dataset.sceneId && el !== row) || el === hole);
    const at = order.indexOf(hole);
    hole.remove();
    row.classList.remove("is-dragging");
    ["position", "left", "top", "width", "zIndex", "pointerEvents"].forEach((k) => { row.style[k] = ""; });
    document.body.classList.remove("is-panel-dragging");

    const list = state.project.scenes;
    const from = list.findIndex((x) => x.id === id);
    if (from >= 0 && at >= 0) {
      recordBefore(sceneDrag.before);
      const moving = list.splice(from, block);
      // 見えている行の並びから、実際の差し込み位置を割り出す
      let target = list.length;
      let seen = 0;
      for (let k = 0; k < list.length; k += 1) {
        if (sceneHiddenIn(list, k)) continue;
        if (seen === at) { target = k; break; }
        seen += 1;
      }
      const diff = clamp(sceneDrag.depth === undefined ? sceneDrag.baseDepth : sceneDrag.depth, 0, MAX_DEPTH)
        - moving[0].depth;
      moving.forEach((m) => { m.depth = clamp(m.depth + diff, 0, MAX_DEPTH); });
      list.splice(target, 0, ...moving);
      // 前の行より2段以上深くならないよう詰める
      let prev = -1;
      list.forEach((sceneRow) => { sceneRow.depth = Math.min(sceneRow.depth, prev + 1); prev = sceneRow.depth; });
      state.cursorRowId = id;
    }
    sceneDrag = null;
    renderScenes();
    persistSoon();
  }

  // 与えられた配列の上で「畳んだセクションの中か」を見る
  function sceneHiddenIn(list, index) {
    for (let i = index - 1; i >= 0; i -= 1) {
      if (list[i].depth < list[index].depth) {
        if (list[i].kind === "section" && state.closedSections[list[i].id]) return true;
        return sceneHiddenIn(list, i);
      }
    }
    return false;
  }

  /* ---------- 場面転換の動き ----------
     前の場面で同じものが居た場所から、次の場面の場所へ動かして見せる。
     前の場面で動線を引いてあれば、その曲線に沿って動く（引いた線のとおりに動く）。
     保存されるのは行き先の値だけ。途中の位置は animU/animV に持ち、
     終わったら消す（途中で保存されても、絵の途中の位置は残らない）。 */
  let sceneAnim = null;

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // 前の場面の同じもの。登録があればその札で、無ければ駒の札で照合する
  function twinOf(piece, pieces) {
    if (piece.castId) return pieces.find((p) => p.castId === piece.castId) || null;
    if (piece.setId) return pieces.find((p) => p.setId === piece.setId) || null;
    const mine = piece.originId || piece.id;
    return pieces.find((p) => (p.originId || p.id) === mine) || null;
  }

  function stopSceneAnim() {
    if (!sceneAnim) return;
    cancelAnimationFrame(sceneAnim.raf);
    sceneAnim.pieces.forEach((entry) => {
      delete entry.piece.animU;
      delete entry.piece.animV;
      delete entry.piece.animBeamU;
      delete entry.piece.animBeamV;
    });
    sceneAnim = null;
  }

  /* 動かすのは「次へ進むとき」だけ。前の場面へ戻るのは、作っている途中に
   * 見比べる動きなので、そのたびに動かれると邪魔になる（本人の指定）。 */
  function beginSceneAnim(fromScene) {
    stopSceneAnim();
    if (!state.animateScenes || !fromScene) return;
    const rows = state.project.scenes.filter((row) => row.kind === "scene");
    const wasAt = rows.findIndex((row) => row.id === fromScene.id);
    const nowAt = rows.findIndex((row) => row.id === state.project.activeSceneId);
    if (wasAt < 0 || nowAt < 0 || nowAt <= wasAt) return;
    const pieces = [];
    sc().pieces.forEach((piece) => {
      const twin = twinOf(piece, fromScene.pieces || []);
      if (!twin) return;
      const sameSpot = Math.abs(twin.u - piece.u) < 0.004 && Math.abs(twin.v - piece.v) < 0.004;
      const sameBeam = !(piece.type === "light" && piece.beam && twin.beam)
        || (Math.abs(twin.beam.u - piece.beam.u) < 0.004 && Math.abs(twin.beam.v - piece.beam.v) < 0.004);
      if (sameSpot && sameBeam) return;
      /* 動線があれば、その二次曲線をたどる。行き先が動線の終点と違っていても、
       * 曲がり方だけ借りて向かう（曲線の形は残しつつ、着地は次の場面の場所）。 */
      const route = twin.route;
      pieces.push({
        piece,
        from: { u: twin.u, v: twin.v },
        ctrl: route ? { u: route.bu, v: route.bv } : null,
        to: { u: piece.u, v: piece.v },
        // 明かりは灯体の側も動かす（当たる場所だけ動くと光が伸び縮みして見える）
        beam: piece.type === "light" && piece.beam && twin.beam
          ? { from: { u: twin.beam.u, v: twin.beam.v }, to: { u: piece.beam.u, v: piece.beam.v } }
          : null,
      });
    });
    if (!pieces.length) return;
    const span = clamp(finite(state.sceneAnimMs, 620), 200, 3000);
    const start = performance.now();
    const step = (now) => {
      const t = clamp((now - start) / span, 0, 1);
      const e = easeInOut(t);
      pieces.forEach((entry) => {
        if (entry.ctrl) {
          const k = 1 - e;
          entry.piece.animU = k * k * entry.from.u + 2 * k * e * entry.ctrl.u + e * e * entry.to.u;
          entry.piece.animV = k * k * entry.from.v + 2 * k * e * entry.ctrl.v + e * e * entry.to.v;
        } else {
          entry.piece.animU = entry.from.u + (entry.to.u - entry.from.u) * e;
          entry.piece.animV = entry.from.v + (entry.to.v - entry.from.v) * e;
        }
        if (entry.beam) {
          entry.piece.animBeamU = entry.beam.from.u + (entry.beam.to.u - entry.beam.from.u) * e;
          entry.piece.animBeamV = entry.beam.from.v + (entry.beam.to.v - entry.beam.from.v) * e;
        }
      });
      render();
      if (t < 1) { sceneAnim.raf = requestAnimationFrame(step); return; }
      stopSceneAnim();
      render();
    };
    sceneAnim = { pieces, raf: requestAnimationFrame(step) };
  }

  // 場面を前後へ送る。上下キーの割り当て先でもある
  function stepScene(dir) {
    const rows = state.project.scenes.filter((row) => row.kind === "scene");
    if (rows.length < 2) { announce("場面がひとつしかありません。"); return; }
    const at = rows.findIndex((row) => row.id === state.project.activeSceneId);
    const next = rows[clamp((at < 0 ? 0 : at) + dir, 0, rows.length - 1)];
    if (!next || next.id === state.project.activeSceneId) {
      announce(dir > 0 ? "最後の場面です。" : "最初の場面です。");
      return;
    }
    openScene(next.id);
  }

  function openScene(id) {
    closeNoteEditor();
    selectedNoteId = null;
    state.cursorRowId = id;
    if (state.project.activeSceneId === id) { renderScenes(); return; }
    const before = sc();
    state.project.activeSceneId = id;
    selectedId = null;
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    updateInspector();
    render();
    beginSceneAnim(before);
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
  /* 場面をまるごと写す。駒には新しい札を配り、
   * 付箋が指している駒の札も新しい方へ付け替える（付け替えないと写した瞬間に紐が切れる）。 */
  function cloneScene(row) {
    const copy = JSON.parse(JSON.stringify(row));
    copy.id = rid(row.kind === "section" ? "sect" : "scene");
    const swap = new Map();
    copy.pieces = (copy.pieces || []).map((piece) => {
      const id = nextId();
      swap.set(piece.id, id);
      return { ...piece, id, originId: piece.originId || piece.id };
    });
    copy.notes = (copy.notes || []).map((note) => ({
      ...note,
      id: rid("note"),
      pieceId: note.pieceId ? (swap.get(note.pieceId) || null) : null,
    }));
    return copy;
  }

  /* 動線の先へ演者を動かした場面を、この場面の次に作る。
   * 「引いた線のとおりに動いた後」を確かめるのが動線を引く目的なので、
   * 手で置き直させない。写した先では動線は消える（もう済んだ動きなので）。 */
  function applyRoutes(scene) {
    const p = state.project;
    const i = p.scenes.indexOf(scene);
    if (i < 0) return;
    if (!(scene.pieces || []).some((piece) => piece.route)) {
      announce("この場面には動線がありません。平面図で行き先を引いてください。");
      return;
    }
    checkpoint();
    const copy = cloneScene(scene);
    copy.title = `${scene.title} の続き`;
    copy.note = "";
    let moved = 0;
    copy.pieces.forEach((piece) => {
      if (!piece.route) return;
      /* 動かすのは駒の居場所だけ。明かりの場合、これは「当てる先」であって
       * 灯体（beam.u/v）ではない。灯体はその場に残り、光が振られる。 */
      piece.u = clamp(piece.route.u, 0, 1);
      piece.v = clamp(piece.route.v, 0, 1);
      piece.route = null;
      moved += 1;
    });
    p.scenes.splice(i + 1, 0, copy);
    p.activeSceneId = copy.id;
    state.cursorRowId = copy.id;
    selectedId = null;
    selectedNoteId = null;
    closeNoteEditor();
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    updateInspector();
    render();
    persistSoon();
    announce(`${moved}名（点）を動線の先へ動かした場面を作りました。`);
  }

  function duplicateScene() {
    const p = state.project;
    const i = cursorIndex();
    if (i < 0) return;
    checkpoint();
    const cur = p.scenes[i];
    const block = [cur].concat(sceneChildren(i));
    const copies = block.map((row) => cloneScene(row));
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
        showSetNames: state.showSetNames,
        showSeatMap: state.showSeatMap, frontPan: state.frontPan, frontPanY: state.frontPanY,
        closedSections: state.closedSections, cursorRowId: state.cursorRowId,
        sceneListHeight: state.sceneListHeight });
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

    /* 形式の選択肢は毎回組み直す。一度だけ作る作りだと、
     * 言語を変えても中の名前が日本語のまま残る。 */
    if (els.venueSelect) {
      els.venueSelect.innerHTML = "";
      VENUES.list.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = isEn() ? `${venueName(v)} (${venueShortName(v)})` : `${venueName(v)}（${venueShortName(v)}）`;
        els.venueSelect.append(opt);
      });
    }
    if (els.venueSelect) els.venueSelect.value = current.id;

    if (els.sizeSelect) {
      els.sizeSelect.innerHTML = "";
      current.sizes.forEach((s2) => {
        const opt = document.createElement("option");
        opt.value = s2.id;
        const bits = current.audience === "round"
          ? (isEn() ? `⌀${s2.width}m` : `直径${s2.width}m`)
          : `${s2.width}×${s2.depth}m`;
        opt.textContent = `${sizeName(s2)} — ${bits}`;
        els.sizeSelect.append(opt);
      });
      /* 決め打ちの規模と同じ並びに「カスタム」を置く。
       * 実寸を手で入れることは、規模を選ぶことと同じ層の決めごとなので、
       * 別の欄へ追い出さない。 */
      const custom = document.createElement("option");
      custom.value = "custom";
      const dims = state.project.venueDims;
      const bits = dims
        ? (current.audience === "round"
          ? (isEn() ? `⌀${size.width}m` : `直径${size.width}m`)
          : `${size.width}×${size.depth}m`)
        : (isEn() ? "enter sizes" : "寸法を入れる");
      custom.textContent = `${isEn() ? "Custom" : "カスタム"} — ${bits}`;
      els.sizeSelect.append(custom);
      els.sizeSelect.value = state.project.venueDims ? "custom" : size.id;
    }

    /* 実寸の欄。円形は一つの数（直径）で決まるので、奥行きの欄は畳む。 */
    if (els.venueW) {
      const custom = Boolean(state.project.venueDims);
      [els.venueW, els.venueD, els.venueH].forEach((input) => {
        if (input) input.disabled = !custom;
      });
      const round = current.audience === "round";
      if (els.venueWLabel) {
        els.venueWLabel.textContent = round
          ? (isEn() ? "Diameter" : "直径")
          : (isEn() ? "Width" : "間口");
      }
      if (els.venueDCell) els.venueDCell.hidden = round;
      const put = (input, value) => {
        if (input && document.activeElement !== input) input.value = String(value);
      };
      put(els.venueW, size.width);
      put(els.venueD, size.depth);
      put(els.venueH, size.height || 6);
      if (els.venueReset) els.venueReset.hidden = !state.project.venueDims;
    }

    if (els.venueScale) {
      const en = isEn();
      const bits = current.audience === "round"
        ? [`${en ? "Diameter" : "直径"} ${size.width}m`]
        : [`${en ? "Width" : "間口"} ${size.width}m`, `${en ? "Depth" : "奥行"} ${size.depth}m`];
      if (size.height) bits.push(`${en ? "Height" : "高さ"} ${size.height}m`);
      if (size.seats) bits.push(en ? `about ${size.seats} seats` : `客席 約${size.seats}席`);
      if (size.crowd) bits.push(en ? `up to ${size.crowd.toLocaleString()} people` : `観客 〜${size.crowd.toLocaleString()}人`);
      els.venueScale.textContent = bits.join(" ・ ") + (en ? "" : `（${current.source}）`);
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
        button.textContent = seatName(s2);
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

  /* 見る位置の小図は、客席が正面だけの劇場でしか描かれない。
   * 描かれない劇場で入り切りだけ残ると、押しても何も起きない札になる。 */
  function syncSeatMapToggle() {
    if (!els.seatMapToggle) return;
    els.seatMapToggle.hidden = venue().audience !== "front";
  }

  function setVenue(id) {
    if (state.project.venue === id) return;
    checkpoint();
    state.project.venue = id;
    state.project.venueSize = VENUES.sizeById(VENUES.byId(id), state.project.venueSize).id;
    state.project.venueDims = null;
    if (venue().audience === "round" && tool !== "select") setTool("select");
    renderVenueControls();
    syncSeatMapToggle();
    render();
    persistSoon();
    announce(`${venue().label}へ切り替えました。配置はそのまま残ります。`);
  }

  function setVenueSize(id) {
    if (id === "custom") {
      // いまの見た目のまま手入力へ移る。数字が飛ばないように、いまの値を写す
      if (state.project.venueDims) return;
      checkpoint();
      const now = venueSize();
      state.project.venueDims = normalizeVenueDims(
        { width: now.width, depth: now.depth, height: now.height }, now);
      renderVenueControls();
      render();
      persistSoon();
      announce(isEn() ? "Custom sizes. Enter the numbers." : "カスタムにしました。寸法を入れてください。");
      return;
    }
    if (state.project.venueSize === id && !state.project.venueDims) return;
    checkpoint();
    state.project.venueSize = id;
    // 規模を選び直したら、手で入れた実寸は捨てる（選んだ規模の値が出るべき）
    state.project.venueDims = null;
    renderVenueControls();
    render();
    persistSoon();
    announce(`規模を${venueSize().label}にしました。`);
  }


  /* ---------- 操作 ---------- */

  function pointFromEvent(event) {
    const el = event.currentTarget || event.target;
    const rect = el.getBoundingClientRect();
    const zs = zoomOf(viewOf(el));
    // 画面の点 → 絵の中の点。拡大しているぶんを戻す
    return {
      x: (event.clientX - rect.left) * (W / rect.width) / zs.z + zs.ox,
      y: (event.clientY - rect.top) * (H / rect.height) / zs.z + zs.oy,
    };
  }

  function onBackdrop(point, L) {
    const rect = backdropRect(L);
    if (!rect) return false;
    return point.x >= rect.x && point.x <= rect.x + rect.w &&
      point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  /* 拾えるものは道具で変わる。明かりは物と重なって置くのが普通なので、
   * 同じ手つきで両方を掴めるようにすると、狙ったほうが取れない。
   * 「動かす」では物だけ、「照明を動かす」では照明だけを拾う。 */
  function hitTest(point, L) {
    const wantLight = tool === "light";
    /* 動線は明かりにも引ける。灯体はその場に残したまま、
     * 当てる先だけが動く（追い掛ける明かり）。 */
    const anyKind = tool === "route";
    for (let i = sc().pieces.length - 1; i >= 0; i -= 1) {
      const piece = sc().pieces[i];
      if (!anyKind && (piece.type === "light") !== wantLight) continue;
      // 平面図で隠している吊物は掴めない（見えないものを掴むことになるため）
      if (L.plan && !state.showFlown && isFlown(piece)) continue;
      const b = selectionBounds(piece, L);
      if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) return piece;
    }
    return null;
  }

  // 灯体の印を掴んだか。当たる場所より先に見る（重なることがあるため）
  function fixtureAt(point, L) {
    const lights = sc().pieces.filter((piece) => piece.type === "light");
    for (let i = lights.length - 1; i >= 0; i -= 1) {
      const at = beamSource(lights[i], L);
      if (Math.hypot(point.x - at.x, point.y - at.y) <= 13) return lights[i];
    }
    return null;
  }

  /* 紐づけていた駒が消えたメモは、消さずにその場へ置き直す。
   * 覚え書きを勝手に捨てない。ただし持ち主が居ないので、絵の内側へ寄せておく */
  function detachOrphanNotes() {
    // 場面は state.project.scenes にある。ここを取り違えると restore() が
    // 途中で落ち、「戻す」が黙って効かなくなる（実際にそうなっていた）
    (state.project.scenes || []).forEach((scene) => {
      (scene.notes || []).forEach((note) => {
        if (!note.pieceId) return;
        if ((scene.pieces || []).some((piece) => piece.id === note.pieceId)) return;
        note.pieceId = null;
        note.x = clamp(note.x, 20, W - NOTE_W - 20);
        note.y = clamp(note.y, 20, H - 80);
      });
    });
  }

  /* 光源の左右・奥行きを言葉にする。0〜1の割合のままでは場所が読めないので、
   * 舞台の実寸に直して「中央から◯m」「奥から◯m」で言う。 */
  function sideText(u) {
    const width = venueSize().width || 12;
    const off = (u - 0.5) * width;
    if (Math.abs(off) < 0.15) return tm("misc", "centre", "中央");
    if (isEn()) return `${Math.abs(off).toFixed(1)} m ${off > 0 ? "stage left" : "stage right"}`;
    return `${off > 0 ? "上手" : "下手"}へ${Math.abs(off).toFixed(1)}m`;
  }

  function depthText(v) {
    const depth = venueSize().depth || 9;
    return isEn() ? `${(v * depth).toFixed(1)} m from upstage` : `奥から${(v * depth).toFixed(1)}m`;
  }

  function selectedNote() {
    return (sc().notes || []).find((note) => note.id === selectedNoteId) || null;
  }

  /* 錠は「そのもの」に掛ける。登録があれば登録側、無ければ駒そのものに持つ。
   * 二か所に別々の錠を置くと、どちらで外すのか分からなくなる。 */
  // announce で名指しするときの呼び名。登録名があればそれを使う
  function pieceLabel(piece) {
    const owner = lockOwner(piece);
    if (owner && owner.name) return owner.name;
    if (piece && piece.name) return piece.name;
    return piece ? pieceTypeName(piece.type) : "これ";
  }

  function lockOwner(piece) {
    if (!piece) return null;
    if (piece.castId) {
      return (state.project.cast || []).find((c) => c.id === piece.castId) || null;
    }
    if (piece.setId) {
      return (state.project.sets || []).find((t) => t.id === piece.setId) || null;
    }
    return null;
  }

  function isLocked(piece) {
    const owner = lockOwner(piece);
    return Boolean(owner ? owner.locked : (piece && piece.locked));
  }

  function setLocked(piece, value) {
    const owner = lockOwner(piece);
    if (owner) owner.locked = value; else if (piece) piece.locked = value;
  }

  function selectedPiece() {
    return sc().pieces.find((piece) => piece.id === selectedId) || null;
  }

  function setTool(nextTool) {
    const painting = nextTool === "paint" || nextTool === "erase";
    if (!state.showFront && painting) {
      announce("背景の塗りは正面図で行います。正面を開いてください。");
      return;
    }
    // 全周形式には塗れる背景の壁が無い（奥も客席）
    if (venue().audience === "round" && painting) {
      announce(`${venue().label}には背景の壁がありません。奥も客席です。`);
      return;
    }
    if (nextTool === "route" && !state.showPlan) {
      announce("動線は平面図で引きます。平面を開いてください。");
      return;
    }
    tool = nextTool;
    canvas.dataset.tool = tool;
    // 平面図で使うのは「動かす」と「動線」だけ
    if (planCanvas) {
      planCanvas.dataset.tool = tool === "route" || tool === "note" || tool === "light" ? tool : "select";
    }
    document.querySelectorAll("[data-stage-tool]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.stageTool === tool));
    });
    els.toolHint.textContent = tm("tool", tool, TOOL_HINTS[tool]);
    if (els.planRoute) els.planRoute.setAttribute("aria-pressed", String(tool === "route"));
    [els.planNote, els.frontNote].forEach((button) => {
      if (button) button.setAttribute("aria-pressed", String(tool === "note"));
    });
  }

  function updateInspector() {
    const piece = selectedPiece();
    /* 「何も選んでいないときの案内」は説明文なので「?」の側で出し入れする。
     * ここで勝手に出すと、畳んだはずの文が選ぶたびに戻ってくる。 */
    els.selectionControls.hidden = !piece;
    if (!piece) return;
    const sameType = sc().pieces.filter((candidate) => candidate.type === piece.type);
    els.selectedName.textContent = `${pieceTypeName(piece.type)} ${sameType.indexOf(piece) + 1}`;
    syncDimControls(piece);
    if (els.piecePose) {
      const isPerformer = piece.type === "performer";
      if (els.poseLabel) els.poseLabel.textContent = poseName(poseById(piece.pose));
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
      // 効かないつまみは出さない。明かりや球を選ぶたび、灰色の「向き」が場所を取る
      if (els.facingControls) els.facingControls.hidden = !isPerformer;
      if (els.facingValue) {
        els.facingValue.textContent = isPerformer ? facingLabel(piece.facing) : "―";
      }
    }
  }

  function syncInputs() {
    if (els.sceneList && state.sceneListHeight) {
      els.sceneList.style.height = `${state.sceneListHeight}px`;
    }
    els.background.value = sc().background;
    els.paintColor.value = state.paintColor;
    els.brushSize.value = String(state.brushSize);
    els.brushValue.textContent = String(state.brushSize);
    if (els.showNames) els.showNames.checked = state.showNames;
    if (els.showSetNames) els.showSetNames.checked = state.showSetNames;
    if (els.showSeatMap) els.showSeatMap.checked = state.showSeatMap;
    if (els.showFlown) els.showFlown.checked = state.showFlown;
    if (els.animScenes) els.animScenes.checked = state.animateScenes;
    if (els.animMs) {
      if (document.activeElement !== els.animMs) els.animMs.value = String(state.sceneAnimMs / 1000);
      els.animMs.disabled = !state.animateScenes;
      if (els.animMsValue) els.animMsValue.textContent = `${(state.sceneAnimMs / 1000).toFixed(1)}秒`;
    }
    syncSeatMapToggle();
  }

  function addPiece(type) {
    checkpoint();
    const count = sc().pieces.length;
    const piece = normalizePiece({
      id: nextId(),
      type,
      u: clamp(0.5 + ((count % 5) - 2) * 0.07, 0.06, 0.94),
      v: clamp(0.55 + (count % 3) * 0.08, 0.05, 0.95),
      size: type === "light" ? 115 : 100,
      color: state.pieceColor,
      name: "",
    }, 0);
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
    announce(piece.type === "light"
      ? `${pieceLabel(piece)}をOFFにしました。`
      : `${PIECE_TYPES[piece.type]}を舞台から外しました。`);
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

  /* 重なりの上下を手で入れ替える仕組みは置かない。
   * 動かしている駒が、重なった相手の上に乗る（bringToTop）で決まるため。 */

  function finishPointer(event) {
    if (touches.has(event.pointerId)) {
      touches.delete(event.pointerId);
      if (pinch && touches.size < 2) pinch = null;
    }
    if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
    const el = pointerAction.el || canvas;
    try { if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId); } catch (_) { /* 同上 */ }
    const changed = pointerAction.kind === "stroke" || pointerAction.kind === "pan"
      || pointerAction.kind === "route" || pointerAction.moved;
    const tapped = pointerAction.kind === "note"
      && (pointerAction.fresh || !pointerAction.moved)
      ? { id: pointerAction.id, view: pointerAction.view } : null;
    const drewRoute = pointerAction.kind === "route";
    // 動線は一本引けば用が済む。引いたらそのまま動かす手に戻す
    const backToSelect = Boolean(pointerAction.fromRouteTool);
    pointerAction = null;
    el.dataset.dragging = "false";
    if (changed) persistSoon();
    // 動線を引き終えたら、場面の欄の「動線の先へ動かした場面を作る」が押せるようになる
    if (drewRoute) renderScenes();
    if (backToSelect) setTool("select");
    // 掴んだだけで離した＝書き直したい、と読む
    if (tapped) {
      const note = (sc().notes || []).find((candidate) => candidate.id === tapped.id);
      if (note) openNoteEditor(note, tapped.view);
    }
  }

  // 掴みの捕捉。取り損ねても操作は続けられるので、例外で止めない
  function capture(el, pointerId) {
    try { el.setPointerCapture(pointerId); } catch (_) { /* 取れなくても支障はない */ }
  }

  // メモを掴む。道具が「動かす」でも「メモ」でも同じ手つきで動かせる
  function grabNote(note, point, L, el, event, fresh) {
    const base = notePos(note, L);
    selectedId = null;
    selectedNoteId = note.id;
    capture(el, event.pointerId);
    el.dataset.dragging = "true";
    pointerAction = {
      kind: "note", pointerId: event.pointerId, id: note.id, el, view: viewOf(el),
      offsetX: point.x - base.x, offsetY: point.y - base.y,
      before: snapshot(), moved: Boolean(fresh), fresh: Boolean(fresh),
    };
    updateInspector();
    render();
  }

  /* ---------- 二本指 ----------
     二本置かれたら、その間の距離で拡大率、真ん中の動きで寄せ幅を決める。
     一本目の操作（駒を掴んでいるなど）は取り消してから始める。 */
  const touches = new Map();   // pointerId → { view, x, y }
  let pinch = null;

  function pinchPair(view) {
    const list = [...touches.values()].filter((t) => t.view === view);
    return list.length >= 2 ? list.slice(0, 2) : null;
  }

  function beginPinch(view) {
    const pair = pinchPair(view);
    if (!pair) return;
    const zs = zoomOf(view);
    pinch = {
      view,
      dist: Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) || 1,
      cx: (pair[0].x + pair[1].x) / 2,
      cy: (pair[0].y + pair[1].y) / 2,
      z: zs.z, ox: zs.ox, oy: zs.oy,
    };
    // 駒を掴んでいたら手を離す（二本目が置かれた時点で、拡大の操作へ移る）
    if (pointerAction) {
      pointerAction.el.dataset.dragging = "false";
      pointerAction = null;
    }
  }

  function movePinch(view) {
    if (!pinch || pinch.view !== view) return;
    const pair = pinchPair(view);
    if (!pair) return;
    const zs = zoomOf(view);
    const dist = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) || 1;
    const cx = (pair[0].x + pair[1].x) / 2;
    const cy = (pair[0].y + pair[1].y) / 2;
    const next = clamp(pinch.z * (dist / pinch.dist), ZOOM_MIN, ZOOM_MAX);
    /* 指の真ん中に来ている絵の点を、動かさずに保つ。
     * 保たないと、拡げるたびに絵が指から逃げていく。 */
    const worldX = pinch.ox + pinch.cx / pinch.z;
    const worldY = pinch.oy + pinch.cy / pinch.z;
    zs.z = next;
    zs.ox = worldX - cx / next;
    zs.oy = worldY - cy / next;
    clampZoom(zs);
    render();
    syncZoomButtons();
  }

  function resetZoom(view) {
    const zs = zoomOf(view);
    zs.z = 1; zs.ox = 0; zs.oy = 0;
    render();
    syncZoomButtons();
  }

  function syncZoomButtons() {
    [["front", els.frontZoom], ["plan", els.planZoom]].forEach(([view, button]) => {
      if (!button) return;
      const zs = zoomOf(view);
      const on = zs.z > 1.01;
      button.hidden = !on;
      button.textContent = `${zs.z.toFixed(1)}× ⟲`;
    });
  }

  function onPointerDown(event) {
    closeNoteEditor();
    const el = event.currentTarget;
    const view = viewOf(el);
    if (event.pointerType === "touch") {
      const rect = el.getBoundingClientRect();
      touches.set(event.pointerId, {
        view,
        x: (event.clientX - rect.left) * (W / rect.width),
        y: (event.clientY - rect.top) * (H / rect.height),
      });
      if (touches.size >= 2) { beginPinch(view); return; }
    }
    const L = layout(view);
    const point = pointFromEvent(event);
    el.focus();

    /* メモ。何もない所を押すと、そこに付箋が生まれてすぐ書ける。
     * すでに貼ってある付箋を押したときは、作らずにそれを掴んで動かす。 */
    if (tool === "note") {
      const existing = noteAt(point, L, view);
      if (existing) { grabNote(existing, point, L, el, event, false); return; }
      checkpoint();
      const note = normalizeNote({
        view,
        x: clamp(point.x + 16, 8, W - NOTE_W - 8),
        y: clamp(point.y - 34, 8, H - 60),
        text: "",
      });
      sc().notes.push(note);
      grabNote(note, point, L, el, event, true);
      persistSoon();
      return;
    }

    /* 動線を引く。平面図で駒を掴んで、離した所が行き先になる。
     * 曲がり具合は真ん中に置いて直線から始める。あとから掴んで曲げられる。 */
    if (tool === "route") {
      if (view !== "plan") {
        announce("動線は平面図で引きます。");
        return;
      }
      const hit = hitTest(point, L);
      if (!hit) { announce("動かしたい演者・物・明かりを掴んでください。"); return; }
      selectedId = hit.id;
      checkpoint();
      hit.route = { u: hit.u, v: hit.v, bu: hit.u, bv: hit.v };
      capture(el, event.pointerId);
      el.dataset.dragging = "true";
      pointerAction = {
        kind: "route", pointerId: event.pointerId, id: hit.id, el, view,
        moved: true, handle: "end", fromRouteTool: true,
      };
      updateInspector();
      render();
      return;
    }

    /* 明かりを動かす。灯体の印を掴めば出どころが、明るい輪を掴めば当たる場所が動く。
     * 二つを別々に動かせないと、斜めの明かりも、下から上への明かりも作れない。 */
    if (tool === "light") {
      const fixture = fixtureAt(point, L);
      if (fixture) {
        selectedId = fixture.id;
        selectedNoteId = null;
        capture(el, event.pointerId);
        el.dataset.dragging = "true";
        pointerAction = {
          kind: "beam", pointerId: event.pointerId, id: fixture.id, el, view,
          before: snapshot(), moved: false,
        };
        updateInspector();
        render();
        return;
      }
      const hit = hitTest(point, L);
      selectedId = hit ? hit.id : null;
      selectedNoteId = null;
      updateInspector();
      render();
      if (!hit) return;
      if (isLocked(hit)) {
        announce(`${pieceLabel(hit)}には錠が掛かっています。`);
        return;
      }
      const at = beamTarget(hit, placePiece(hit, L), L);
      capture(el, event.pointerId);
      el.dataset.dragging = "true";
      /* 真上から落としている明かりは、灯体と当たる場所が同じ真上・真下にある。
       * この状態で当たる場所だけ動かすと、掴むたびに勝手に斜めになる。
       * 真下に落ちているあいだは、灯体も一緒に連れて動かす。 */
      const b = hit.beam;
      const linked = Math.abs(b.u - hit.u) < 0.005 && Math.abs(b.v - hit.v) < 0.005;
      pointerAction = {
        kind: "drag", pointerId: event.pointerId, id: hit.id, el, view,
        offsetX: point.x - at.x, offsetY: point.y - at.y,
        before: snapshot(), moved: false, linked,
      };
      return;
    }

    if (tool === "select") {
      // メモは絵の一番上に乗っているので、駒より先に拾う
      const note = noteAt(point, L, view);
      if (note) { grabNote(note, point, L, el, event, false); return; }
      selectedNoteId = null;
      // 選んでいる駒の動線の取っ手は、駒そのものより先に拾う
      const current = selectedPiece();
      const handle = view === "plan" ? routeHandleAt(point, current, L) : null;
      if (handle) {
        checkpoint();
        capture(el, event.pointerId);
        el.dataset.dragging = "true";
        pointerAction = { kind: "route", pointerId: event.pointerId, id: current.id, el, view, moved: true, handle };
        return;
      }
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
      // 錠が掛かっているものは選べるが動かない。外す口は一覧と「選んだもの」にある
      if (isLocked(hit)) {
        announce(`${pieceLabel(hit)}には錠が掛かっています。動かすには錠を外してください。`);
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

  /* 手の形で「掴める」を伝える。写真の道具と同じ作法。
   * 触っているものを毎回当てて決めるので、駒の上と何もない所で形が変わる。 */
  function cursorFor(el, event) {
    if (pointerAction) return "grabbing";
    if (tool === "paint") return "crosshair";
    if (tool === "erase") return "cell";
    const view = viewOf(el);
    const L = layout(view);
    const point = pointFromEvent(event);
    if (tool === "note") return noteAt(point, L, view) ? "grab" : "copy";
    if (tool === "route") return hitTest(point, L) ? "crosshair" : "default";
    if (tool === "light") {
      if (fixtureAt(point, L)) return "grab";
      return hitTest(point, L) ? "grab" : "default";
    }
    // 動かす道具。メモ→動線の取っ手→駒→（何もなければ）視線を振る
    if (noteAt(point, L, view)) return "grab";
    const current = selectedPiece();
    if (view === "plan" && routeHandleAt(point, current, L)) return "grab";
    const hit = hitTest(point, L);
    if (hit) return isLocked(hit) ? "not-allowed" : "grab";
    if (view === "front" && (L.panRange > 0 || L.panRangeY > 0)) return "grab";
    return "default";
  }

  function onHover(event) {
    if (event.pointerType === "touch") return;
    const el = event.currentTarget;
    let next = "default";
    try { next = cursorFor(el, event); } catch (_) { next = "default"; }
    if (el.dataset.cursor !== next) {
      el.dataset.cursor = next;
      el.style.cursor = next;
    }
  }

  function onPointerMove(event) {
    if (event.pointerType === "touch" && touches.has(event.pointerId)) {
      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      touches.set(event.pointerId, {
        view: viewOf(el),
        x: (event.clientX - rect.left) * (W / rect.width),
        y: (event.clientY - rect.top) * (H / rect.height),
      });
      if (pinch) { movePinch(viewOf(el)); return; }
    }
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

    if (pointerAction.kind === "route") {
      const piece = sc().pieces.find((candidate) => candidate.id === pointerAction.id);
      if (!piece || !piece.route) return;
      const next = fromScreen(point.x, point.y, L);
      if (pointerAction.handle === "end") {
        // 行き先を動かすあいだは、曲がり具合を真ん中に保って直線のままにする
        const straight = piece.route.bu === (piece.u + piece.route.u) / 2
          && piece.route.bv === (piece.v + piece.route.v) / 2;
        piece.route.u = next.u;
        piece.route.v = next.v;
        if (straight || pointerAction.fresh !== false) {
          piece.route.bu = (piece.u + next.u) / 2;
          piece.route.bv = (piece.v + next.v) / 2;
        }
      } else {
        /* 掴んだ所が曲線の真ん中を通るように control 点を置く。
         * 二次曲線の t=0.5 は control 点そのものではなく、
         * 始点・control・終点の平均に寄るので、その分を戻す。 */
        piece.route.bu = clamp(2 * next.u - (piece.u + piece.route.u) / 2, -0.2, 1.2);
        piece.route.bv = clamp(2 * next.v - (piece.v + piece.route.v) / 2, -0.2, 1.2);
      }
      render();
      return;
    }

    if (pointerAction.kind === "note") {
      const note = (sc().notes || []).find((candidate) => candidate.id === pointerAction.id);
      if (!note) return;
      if (!pointerAction.moved) {
        recordBefore(pointerAction.before);
        pointerAction.moved = true;
      }
      const x = finite(point.x - pointerAction.offsetX, note.x);
      const y = finite(point.y - pointerAction.offsetY, note.y);
      if (note.pieceId) {
        const piece = sc().pieces.find((candidate) => candidate.id === note.pieceId);
        const at = piece ? placePiece(piece, L) : { x: 0, y: 0 };
        note.x = x - at.x;
        note.y = y - at.y;
      } else {
        note.x = clamp(x, -60, W - 40);
        note.y = clamp(y, -20, H - 30);
      }
      render();
      return;
    }

    if (pointerAction.kind === "beam") {
      const piece = sc().pieces.find((candidate) => candidate.id === pointerAction.id);
      if (!piece) return;
      if (!pointerAction.moved) {
        recordBefore(pointerAction.before);
        pointerAction.moved = true;
      }
      /* 灯体は宙にあるので、画面の点をそのまま床の座標に読み替えると
       * 高さのぶんだけ奥へずれる。持ち上げたぶんを戻してから読む。 */
      const b = piece.beam;
      let x = point.x;
      let y = point.y;
      if (!L.plan) {
        const guide = place(b.u, b.v, L);
        y = L.tilt(L.untilt(point.y) + b.h * perMetre(guide, L).y);
      }
      const next = fromScreen(x, y, L);
      b.u = next.u;
      b.v = next.v;
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
      let px = point.x - pointerAction.offsetX;
      let py = point.y - pointerAction.offsetY;
      if (piece.type === "light" && !L.plan && piece.beam && piece.beam.toH) {
        // 宙で受けている明かりは、その高さのぶんを戻してから床の座標に読む
        const guide = placePiece(piece, L);
        py = L.tilt(L.untilt(py) + piece.beam.toH * perMetre(guide, L).y);
      }
      const next = fromScreen(px, py, L);
      piece.u = next.u;
      piece.v = next.v;
      // 真下に落ちている明かりは、灯体もついてくる
      if (pointerAction.linked && piece.type === "light" && piece.beam) {
        piece.beam.u = next.u;
        piece.beam.v = next.v;
      }
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
    const note = selectedNote();
    if (note && (event.key === "Delete" || event.key === "Backspace")) {
      event.preventDefault();
      removeNote(note.id);
      return;
    }
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
    if (isLocked(piece)) {
      announce(`${pieceLabel(piece)}には錠が掛かっています。`);
      return;
    }
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
    el.addEventListener("pointermove", onHover);
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
  /* 実寸の手入力。選んだ規模を土台に、触った値だけ上書きする。
   * 尺は全部ここから引かれるので、変えた瞬間に人も道具も一緒に縮む。 */
  [["venueW", "width"], ["venueD", "depth"], ["venueH", "height"]].forEach(([key, field]) => {
    const input = els[key];
    if (!input) return;
    const apply = () => {
      const size = VENUES.sizeById(venue(), state.project.venueSize);
      const lim = VENUE_LIMITS[field];
      const value = Math.round(clamp(finite(input.value, size[field] || lim[0]), lim[0], lim[1]) * 10) / 10;
      const next = Object.assign({}, state.project.venueDims || {});
      next[field] = value;
      state.project.venueDims = normalizeVenueDims(next, size);
      input.value = String(value);
      renderVenueControls();
      render();
      persistSoon();
    };
    input.addEventListener("change", () => { checkpoint(); apply(); });
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    });
  });
  if (els.venueReset) {
    els.venueReset.addEventListener("click", () => {
      if (!state.project.venueDims) return;
      checkpoint();
      state.project.venueDims = null;
      renderVenueControls();
      render();
      persistSoon();
      announce(`${venueSize().label}の寸法に戻しました。`);
    });
  }

  if (els.venueSelect) {
    els.venueSelect.addEventListener("change", (e) => setVenue(e.target.value));
  }
  document.querySelectorAll("[data-toggle-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const which = button.dataset.toggleView;
      const open = which === "front" ? state.showFront : state.showPlan;
      setViewShown(which, !open);
      syncViewSwitch();
    });
  });
  /* 道具の説明も畳んでおき、「?」で出す。中央のバーは道具そのものが並ぶ場所なので、
   * 説明が居座ると道具の列が押し出される（項目の説明と同じ扱いにそろえる）。 */
  if (els.toolHelp) {
    els.toolHelp.addEventListener("click", () => {
      const texts = [els.toolHint, ...document.querySelectorAll(".stage-canvas-help")].filter(Boolean);
      const show = texts[0].hidden;
      texts.forEach((el) => { el.hidden = !show; });
      els.toolHelp.setAttribute("aria-pressed", String(show));
    });
  }

  if (els.frontZoom) els.frontZoom.addEventListener("click", () => resetZoom("front"));
  if (els.planZoom) els.planZoom.addEventListener("click", () => resetZoom("plan"));

  /* 正面と平面の出し分け。狭い画面では二つ並べると絵が小さくなるので、
   * タップで一枚ずつ見られるようにする。 */
  document.querySelectorAll("[data-show-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const which = button.dataset.showView;
      if (which === "both") { state.showFront = true; state.showPlan = true; }
      else { state.showFront = which === "front"; state.showPlan = which === "plan"; }
      applyLayout();
      syncViewSwitch();
      render();
      persistSoon();
    });
  });

  function syncViewSwitch() {
    document.querySelectorAll("[data-show-view]").forEach((button) => {
      const which = button.dataset.showView;
      const on = which === "both"
        ? (state.showFront && state.showPlan)
        : (which === "front" ? state.showFront && !state.showPlan : state.showPlan && !state.showFront);
      button.setAttribute("aria-pressed", String(on));
    });
  }

  const swapBtn = document.getElementById("stage-swap-center");
  if (swapBtn) swapBtn.addEventListener("click", swapCenter);

  if (els.showNames) {
    els.showNames.addEventListener("change", (e) => {
      state.showNames = e.target.checked;
      render();
      persistSoon();
      announce(e.target.checked ? "演者名を出しました。" : "演者名を隠しました。");
    });
  }
  if (els.showSetNames) {
    els.showSetNames.addEventListener("change", (e) => {
      state.showSetNames = e.target.checked;
      render();
      persistSoon();
      announce(e.target.checked ? "装置名を出しました。" : "装置名を隠しました。");
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
  if (els.showsOpen) els.showsOpen.addEventListener("click", openShows);
  if (els.showNew) els.showNew.addEventListener("click", newShow);
  if (els.showsClose) els.showsClose.addEventListener("click", closeShows);
  if (els.showsBackdrop) els.showsBackdrop.addEventListener("click", closeShows);
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
  /* 追加の口は一つ。種類だけ選ばせる。演者と物と光で入り口を分けると、
   * 「これはどこから足すのか」を毎回思い出すことになる。 */
  const addFromRoster = () => {
    if (rosterKind === "performer") { addCastMember(els.rosterName); return; }
    if (rosterKind === "light") { addSetItem("light", els.rosterName, "hang"); return; }
    addSetItem(SET_KINDS[rosterKind] ? rosterKind : "block", els.rosterName);
  };
  if (els.rosterKind) els.rosterKind.addEventListener("click", openKindModal);
  if (els.kindClose) els.kindClose.addEventListener("click", closeKindModal);
  if (els.kindBackdrop) els.kindBackdrop.addEventListener("click", closeKindModal);
  if (els.rosterAdd) els.rosterAdd.addEventListener("click", addFromRoster);
  const addLight = () => addSetItem("light", els.lightName, els.lightKind && els.lightKind.value);
  if (els.lightAdd) els.lightAdd.addEventListener("click", addLight);
  if (els.lightName) {
    els.lightName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addLight(); }
    });
  }
  if (els.rosterName) {
    els.rosterName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addFromRoster(); }
    });
  }
  // 平面図のバーからも動線の入り切りができる。平面を見ながら手を伸ばす距離を短くする
  if (els.planRoute) {
    els.planRoute.addEventListener("click", () => setTool(tool === "route" ? "select" : "route"));
  }
  // メモは正面にも平面にも貼れるので、入り切りは両方の絵の上に置く
  [els.planNote, els.frontNote].forEach((button) => {
    if (button) button.addEventListener("click", () => setTool(tool === "note" ? "select" : "note"));
  });
  /* 照明の直径。登録した明かりそのものの寸法なので、置いてある全ての場面に効く
   * （「…」の窓と同じ値を、選んだ場所からも触れるようにしたもの）。 */
  if (els.beamDia) {
    els.beamDia.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      const dia = clamp(finite(e.target.value, 4), 0.3, 20);
      const owner = pieceSet(piece);
      if (owner) owner.dims.dia = dia; else piece.dims = Object.assign({}, piece.dims, { dia });
      if (els.beamDiaValue) els.beamDiaValue.textContent = cmText(dia);
      renderLights();
      render();
      persistSoon();
    });
    els.beamDia.addEventListener("pointerdown", checkpoint);
  }

  /* 光源の左右と奥行き。斜め上から中央へ差し込む明かりは、
   * 灯体を上手奥・下手奥へ振り分けて作る。正面図では差し込む角度が変わる。 */
  [["beamU", "u", "beamUValue", sideText], ["beamV", "v", "beamVValue", depthText]].forEach(
    ([key, field, labelKey, toText]) => {
      const input = els[key];
      if (!input) return;
      input.addEventListener("input", (e) => {
        const piece = selectedPiece();
        if (!piece || piece.type !== "light") return;
        piece.beam[field] = clamp(finite(e.target.value, 0.5), -0.3, 1.3);
        if (els[labelKey]) els[labelKey].textContent = toText(piece.beam[field]);
        render();
        persistSoon();
      });
      input.addEventListener("pointerdown", checkpoint);
    });

  /* 明かりの高さ。灯体を下げて当たる高さを上げれば、下から上への明かりになる。 */
  if (els.beamFrom) {
    els.beamFrom.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      piece.beam.h = clamp(finite(e.target.value, BEAM_DEFAULT_H), 0, BEAM_MAX_H);
      els.beamFromValue.textContent = `${piece.beam.h.toFixed(1)}m`;
      render();
      persistSoon();
    });
    els.beamFrom.addEventListener("pointerdown", checkpoint);
  }
  if (els.beamTo) {
    els.beamTo.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      piece.beam.toH = clamp(finite(e.target.value, 0), 0, BEAM_MAX_H);
      els.beamToValue.textContent = piece.beam.toH < 0.05 ? "床" : `${piece.beam.toH.toFixed(1)}m`;
      render();
      persistSoon();
    });
    els.beamTo.addEventListener("pointerdown", checkpoint);
  }
  if (els.beamReset) {
    els.beamReset.addEventListener("click", () => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      checkpoint();
      piece.beam.u = piece.u;
      piece.beam.v = piece.v;
      piece.beam.toH = 0;
      piece.beam.h = BEAM_DEFAULT_H;
      updateInspector();
      render();
      persistSoon();
      announce("真上から床へ落とす明かりに戻しました。");
    });
  }
  if (els.pieceLock) {
    els.pieceLock.addEventListener("click", () => {
      const piece = selectedPiece();
      if (!piece) return;
      checkpoint();
      const next = !isLocked(piece);
      setLocked(piece, next);
      renderCast();
      renderSets();
      renderLights();
      updateInspector();
      render();
      persistSoon();
      announce(`${pieceLabel(piece)}${next ? "に錠を掛けました。" : "の錠を外しました。"}`);
    });
  }
  if (els.routeClear) {
    els.routeClear.addEventListener("click", () => {
      const piece = selectedPiece();
      if (!piece || !piece.route) return;
      checkpoint();
      piece.route = null;
      updateInspector();
      renderScenes();
      render();
      persistSoon();
      announce("動線を消しました。");
    });
  }
  if (els.openSetInfo) {
    els.openSetInfo.addEventListener("click", () => {
      const piece = selectedPiece();
      const registered = pieceSet(piece);
      if (registered) { openSetInfo(registered.id); return; }
      if (piece && piece.castId) openProfile(piece.castId);
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
  if (els.setInfoKind) {
    els.setInfoKind.addEventListener("change", (e) => {
      const item = currentSetItem();
      if (!item || item.kind !== "light") return;
      checkpoint();
      item.lightKind = LIGHT_KINDS[e.target.value] ? e.target.value : "hang";
      renderLights();
      persistSoon();
      announce(`${item.name}を${LIGHT_KINDS[item.lightKind].label}にしました。`);
    });
  }
  if (els.setInfoFlown) {
    els.setInfoFlown.addEventListener("change", (e) => {
      const item = currentSetItem();
      if (!item || !SOLID_TYPES[item.kind]) return;
      checkpoint();
      item.flown = e.target.checked;
      if (item.flown && !(item.dims.lift > 0)) item.dims.lift = 2.5;   // まずは頭より上へ
      openSetInfo(item.id);   // 地上高のつまみを出し直す
      renderSets();
      render();
      persistSoon();
      announce(`${item.name}を${item.flown ? "吊物にしました" : "床置きに戻しました"}。`);
    });
  }
  if (els.setInfoFramed) {
    els.setInfoFramed.addEventListener("change", (e) => {
      const item = currentSetItem();
      if (!item || item.kind !== "wall") return;
      checkpoint();
      item.framed = e.target.checked;
      render();
      persistSoon();
      announce(`${item.name}を${item.framed ? "フレーム（穴の空いた壁）" : "壁"}にしました。`);
    });
  }
  if (els.setInfoWires) {
    els.setInfoWires.addEventListener("change", (e) => {
      const item = currentSetItem();
      if (!item) return;
      checkpoint();
      item.wires = Number(e.target.value) === 1 ? 1 : 2;
      render();
      persistSoon();
    });
  }
  /* 地上高は「選んだもの」からも触れる。吊り位置は場面の中で動くものなので、
   * 一覧の窓を開き直さずに合わせられた方がよい（値は登録側に効く）。 */
  if (els.pieceLift) {
    els.pieceLift.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || !isFlown(piece)) return;
      const value = clamp(finite(e.target.value, 2.5), 0, 10);
      const owner = pieceSet(piece);
      const dims = owner ? owner.dims : piece.dims;
      if (dims) dims.lift = value;
      if (els.pieceLiftValue) els.pieceLiftValue.textContent = cmText(value);
      renderSets();
      render();
      persistSoon();
    });
    els.pieceLift.addEventListener("pointerdown", checkpoint);
  }
  if (els.showFlown) {
    els.showFlown.addEventListener("change", (e) => {
      state.showFlown = e.target.checked;
      render();
      persistSoon();
      announce(state.showFlown ? "平面にも吊物を出します。" : "平面では吊物を隠します。");
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
  if (els.scenePrev) els.scenePrev.addEventListener("click", () => stepScene(-1));
  if (els.sceneNext) els.sceneNext.addEventListener("click", () => stepScene(1));
  if (els.animScenes) {
    els.animScenes.addEventListener("change", (e) => {
      state.animateScenes = e.target.checked;
      if (!state.animateScenes) { stopSceneAnim(); render(); }
      if (els.animMs) els.animMs.disabled = !state.animateScenes;
      persistSoon();
      announce(state.animateScenes ? "場面転換を動かします。" : "場面転換は動かしません。");
    });
  }

  if (els.animMs) {
    els.animMs.addEventListener("input", (e) => {
      state.sceneAnimMs = clamp(finite(e.target.value, 0.62) * 1000, 200, 3000);
      if (els.animMsValue) els.animMsValue.textContent = `${(state.sceneAnimMs / 1000).toFixed(1)}秒`;
      persistSoon();
    });
  }

  /* 上下キーで場面を送る。ただし
   *  ・文字を打っている最中は触らない
   *  ・絵の上で駒を選んでいるときは、駒の微調整が先（そちらが既に受け取っている）
   * の二つは守る。 */
  document.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const view = document.getElementById("view-stage");
    if (!view || view.hidden) return;
    if (isTyping(event.target)) return;
    event.preventDefault();
    stepScene(event.key === "ArrowDown" ? 1 : -1);
  });

  if (els.sceneAdd) els.sceneAdd.addEventListener("click", () => addScene(false));
  if (els.sceneAddRig) els.sceneAddRig.addEventListener("click", () => addScene(true));
  /* 場面の欄の高さ。下の取っ手を引いて変える。
     ブラウザ既定の掴み手は地の色に沈んで見えないので、自前で持つ。 */
  if (els.sceneResize && els.sceneList) {
    els.sceneResize.addEventListener("pointerdown", (e) => {
      const startY = e.clientY;
      const startH = els.sceneList.getBoundingClientRect().height;
      const move = (ev) => {
        ev.preventDefault();
        const next = clamp(startH + (ev.clientY - startY), 120, window.innerHeight * 0.8);
        els.sceneList.style.height = `${Math.round(next)}px`;
        state.sceneListHeight = Math.round(next);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        persistSoon();
      };
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
    });
  }

  if (els.sceneSection) els.sceneSection.addEventListener("click", addSection);
  if (els.rigSave) els.rigSave.addEventListener("click", saveRig);
  if (els.rigName) {
    els.rigName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); saveRig(); }
    });
  }
  if (els.sceneDup) els.sceneDup.addEventListener("click", duplicateScene);
  if (els.sceneDel) els.sceneDel.addEventListener("click", deleteScene);
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

  [els.background, els.pieceFacing].filter(Boolean).forEach((control) => {
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
  /* 選んだものの欄は「ショーの中で動くもの」だけを持つ。
   * 名前・色・寸法・身長はショーを通して変わらないので、
   * 演者／舞台セット／照明の一覧側で決める。ここからはそこへ飛べるようにする。 */
  function syncDimControls(piece) {
    const registered = pieceSet(piece);
    const member = piece && piece.castId
      ? state.project.cast.find((c) => c.id === piece.castId) : null;
    const owner = registered || member;
    if (els.dimsFromSet) {
      els.dimsFromSet.hidden = !owner;
      if (owner) {
        els.dimsFromSet.textContent = registered
          ? `名前・色・寸法は「${registered.name}」で決めます（${setDimLabel(registered)}）。`
          : `名前・色・身長は「${member.name}」で決めます（${member.heightCm}cm）。`;
      }
    }
    if (els.liftControls) {
      const flown = Boolean(piece && isFlown(piece));
      els.liftControls.hidden = !flown;
      if (flown) {
        const lift = flownLift(piece);
        if (document.activeElement !== els.pieceLift) els.pieceLift.value = String(lift);
        if (els.pieceLiftValue) els.pieceLiftValue.textContent = cmText(lift);
      }
    }
    if (els.beamControls) {
      const isLight = Boolean(piece && piece.type === "light");
      els.beamControls.hidden = !isLight;
      if (isLight) {
        const b = piece.beam || (piece.beam = normalizeBeam(null, piece));
        const dim = pieceDims(piece);
        if (els.beamDia && document.activeElement !== els.beamDia) {
          els.beamDia.value = String((dim && dim.dia) || 4);
        }
        if (els.beamDiaValue) els.beamDiaValue.textContent = cmText((dim && dim.dia) || 4);
        if (document.activeElement !== els.beamU) els.beamU.value = String(b.u);
        if (document.activeElement !== els.beamV) els.beamV.value = String(b.v);
        if (els.beamUValue) els.beamUValue.textContent = sideText(b.u);
        if (els.beamVValue) els.beamVValue.textContent = depthText(b.v);
        if (document.activeElement !== els.beamFrom) els.beamFrom.value = String(b.h);
        if (document.activeElement !== els.beamTo) els.beamTo.value = String(b.toH);
        els.beamFromValue.textContent = `${b.h.toFixed(1)}m`;
        els.beamToValue.textContent = b.toH < 0.05 ? tm("misc", "floor", "床") : `${b.toH.toFixed(1)}m`;
      }
    }
    if (els.delete) {
      // 明かりを舞台から外すのは「消す」こと。道具立てを片づける話ではない
      const light = Boolean(piece && piece.type === "light");
      els.delete.textContent = light ? "TURN OFF" : tx("舞台から外す");
      els.delete.title = light ? "この場面ではこの明かりを消します" : "";
    }
    if (els.routeClear) els.routeClear.hidden = !(piece && piece.route);
    /* 照明の直径。登録した明かりそのものの寸法なので、置いてある全ての場面に効く
   * （「…」の窓と同じ値を、選んだ場所からも触れるようにしたもの）。 */
  if (els.beamDia) {
    els.beamDia.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      const dia = clamp(finite(e.target.value, 4), 0.3, 20);
      const owner = pieceSet(piece);
      if (owner) owner.dims.dia = dia; else piece.dims = Object.assign({}, piece.dims, { dia });
      if (els.beamDiaValue) els.beamDiaValue.textContent = cmText(dia);
      renderLights();
      render();
      persistSoon();
    });
    els.beamDia.addEventListener("pointerdown", checkpoint);
  }

  /* 光源の左右と奥行き。斜め上から中央へ差し込む明かりは、
   * 灯体を上手奥・下手奥へ振り分けて作る。正面図では差し込む角度が変わる。 */
  [["beamU", "u", "beamUValue", sideText], ["beamV", "v", "beamVValue", depthText]].forEach(
    ([key, field, labelKey, toText]) => {
      const input = els[key];
      if (!input) return;
      input.addEventListener("input", (e) => {
        const piece = selectedPiece();
        if (!piece || piece.type !== "light") return;
        piece.beam[field] = clamp(finite(e.target.value, 0.5), -0.3, 1.3);
        if (els[labelKey]) els[labelKey].textContent = toText(piece.beam[field]);
        render();
        persistSoon();
      });
      input.addEventListener("pointerdown", checkpoint);
    });

  /* 明かりの高さ。灯体を下げて当たる高さを上げれば、下から上への明かりになる。 */
  if (els.beamFrom) {
    els.beamFrom.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      piece.beam.h = clamp(finite(e.target.value, BEAM_DEFAULT_H), 0, BEAM_MAX_H);
      els.beamFromValue.textContent = `${piece.beam.h.toFixed(1)}m`;
      render();
      persistSoon();
    });
    els.beamFrom.addEventListener("pointerdown", checkpoint);
  }
  if (els.beamTo) {
    els.beamTo.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      piece.beam.toH = clamp(finite(e.target.value, 0), 0, BEAM_MAX_H);
      els.beamToValue.textContent = piece.beam.toH < 0.05 ? "床" : `${piece.beam.toH.toFixed(1)}m`;
      render();
      persistSoon();
    });
    els.beamTo.addEventListener("pointerdown", checkpoint);
  }
  if (els.beamReset) {
    els.beamReset.addEventListener("click", () => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      checkpoint();
      piece.beam.u = piece.u;
      piece.beam.v = piece.v;
      piece.beam.toH = 0;
      piece.beam.h = BEAM_DEFAULT_H;
      updateInspector();
      render();
      persistSoon();
      announce("真上から床へ落とす明かりに戻しました。");
    });
  }
  if (els.pieceLock) {
      const locked = isLocked(piece);
      /* 錠は鍵の絵だけ。並ぶボタンが全部同じ長さの文字だと、目が滑って読めない。
       * 何ができるかは、押す前に触れたとき（title）と読み上げで伝える。 */
      els.pieceLock.setAttribute("aria-pressed", String(locked));
      els.pieceLock.textContent = locked ? "🔒" : "🔓";
      const lockWord = locked ? "錠を外す" : "動かないようにする";
      els.pieceLock.setAttribute("aria-label", lockWord);
      els.pieceLock.title = owner
        ? `${lockWord}（「${owner.name}」の錠。掛けているあいだ、どの場面でも動きません）`
        : `${lockWord}（掛けているあいだ、掴んでも動きません）`;
    }
    if (els.openSetInfo) {
      els.openSetInfo.hidden = !owner;
      els.openSetInfo.textContent = registered ? tm("misc", "dims", "寸法") : tm("misc", "profile", "身長");
      els.openSetInfo.title = registered
        ? `「${registered.name}」の寸法を開く`
        : (member ? `「${member.name}」のプロフィールを開く` : "");
    }
  }



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

  els.duplicate.addEventListener("click", duplicateSelected);
  els.delete.addEventListener("click", removeSelected);
  /* 画面に固定で置いてある文言を、まとめて差し替える。
   * 対訳表は日本語そのものを鍵にしているので、元の日本語を各要素へ覚えさせておき、
   * 日本語へ戻すときはそれを書き戻す（訳し戻しの表を持たずに済む）。 */
  function applyLang() {
    /* 文字そのものを差し替える。要素ではなく文字の節（テキストノード）を回すので、
     * 「向き <span>客席</span>」のように中に別の要素を抱えた札も拾える。
     * 元の日本語は節に覚えさせておき、戻すときはそれを書き戻す。 */
    const swapText = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        if (node.parentNode && node.parentNode.closest("[data-no-i18n]")) return;
        const raw = node.__ja === undefined ? node.nodeValue : node.__ja;
        // HTMLの改行や字下げで空白が入るので、鍵を引くときは詰めてから照らす
        const key = raw.trim().replace(/\s+/g, " ");
        if (!key || !I18N.text[key]) return;
        if (node.__ja === undefined) node.__ja = raw;
        node.nodeValue = isEn() ? I18N.text[key] : raw;
      });
    };
    const swapAttr = (root, attr, store) => {
      root.querySelectorAll(`[${attr}]`).forEach((el) => {
        if (!el.dataset[store]) {
          const now = el.getAttribute(attr);
          if (!now || !now.trim()) return;
          el.dataset[store] = now;
        }
        const ja = el.dataset[store];
        el.setAttribute(attr, isEn() ? (I18N.text[ja.trim()] || ja) : ja);
      });
    };
    const roots = [document.getElementById("view-stage"), ...document.querySelectorAll(".stage-modal")]
      .filter(Boolean);
    roots.forEach((root) => {
      swapText(root);
      swapAttr(root, "placeholder", "jaPh");
      swapAttr(root, "title", "jaTitle");
      swapAttr(root, "aria-label", "jaAria");
    });
    if (els.lang) {
      els.lang.textContent = isEn() ? "日本語" : "EN";
      els.lang.setAttribute("aria-pressed", String(isEn()));
    }
    document.documentElement.lang = isEn() ? "en" : "ja";
  }

  // 言語を変えると、中で組み立てている名前も作り直す必要がある
  function setLang(next) {
    lang = next === "en" ? "en" : "ja";
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* 保存できなくても動く */ }
    applyLang();
    renderVenueControls();
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    updateInspector();
    setTool(tool);
    render();
  }

  if (els.lang) {
    els.lang.addEventListener("click", () => setLang(isEn() ? "ja" : "en"));
  }

  /* ---------- 使い方の案内 ----------
     読ませるのではなく、7つの場所を順に見せて「何ができるか」を掴んでもらう。
     操作は強制しない（次へはいつでも押せる）。初めて開いたときだけ自動で出し、
     あとは上の「使い方」からいつでも呼べる。
     ★勝手にデータを作らない。いま置いてあるものの上で説明する。 */
  /* ★テスターの感想の送り先。Googleフォームのアドレスをここへ入れる。
   * 空のあいだは、押しても開かず、その旨だけ伝える（黙って何も起きないより良い）。 */
  const FEEDBACK_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc-ibjOBVL5HbPC9xpjmcD-TTK3VoCmVJiGA6ouCZvGR9rW4Q/viewform";

  const TOUR_KEY = "shosai-stage-tour-v1";

  /* 手を動かしてもらう案内。読ませるより、実際に一場面を作ってもらう。
   * 各段は「やること」を一つだけ持ち、できたら自分で次へ進む。
   * できたかどうかは done() で見る（押した瞬間を捕まえるのではなく、
   * 結果を見に行く。どの入口から操作しても拾えるようにするため）。
   * 次へはいつでも押せるので、詰まっても止まらない。 */
  const tourMark = {};
  const lightCount = () => (state.project.sets || []).filter((x) => x.kind === "light").length;
  const posSum = () => sc().pieces.reduce((t, p) => t + p.u * 1000 + p.v, 0);

  const TOUR = [
    {
      at: "#stage-canvas-stack",
      begin: () => { tourMark.pos = posSum(); },
      done: () => Math.abs(posSum() - tourMark.pos) > 0.5,
      ja: ["まず動かしてみる", "上が客席から見た絵、下が真上から見た図で、同じ舞台です。正面図の演者を掴んで、どこかへ動かしてください。平面図でも一緒に動きます。"],
      en: ["Move something first", "The top is what the house sees; the bottom is the same stage from above. Drag a performer in the front view — it moves in the plan too."],
    },
    {
      at: '[data-panel="cast"]',
      begin: () => { tourMark.cast = (state.project.cast || []).length; },
      done: () => (state.project.cast || []).length > tourMark.cast,
      ja: ["人を足す", "「出るもの」に名前を入れて〈追加〉を押してください。登録するとそのまま舞台に出ます。"],
      en: ["Add a person", "Type a name in Cast & set and press Add. Registering puts them on stage right away."],
    },
    {
      at: "#stage-piece-pose",
      begin: () => { tourMark.pose = sc().pieces.filter((p) => p.type === "performer" && p.pose !== "stand").length; },
      done: () => sc().pieces.filter((p) => p.type === "performer" && p.pose !== "stand").length > tourMark.pose,
      ja: ["姿勢を変える", "いま足した人が選ばれています。〈姿勢〉を押して、30種類から一つ選んでください（宙返り、シルホイール、一輪車など）。"],
      en: ["Change the pose", "The person you just added is selected. Press Pose and pick one of 30 (somersault, Cyr wheel, unicycle and more)."],
    },
    {
      at: "#stage-plan-route",
      lit: "#stage-plan-cell",  // 動線は平面図にしか引けない
      begin: () => { tourMark.route = sc().pieces.filter((p) => p.route).length; },
      done: () => sc().pieces.filter((p) => p.route).length > tourMark.route,
      ja: ["動線を引く", "平面図の〈動線を描く〉を押し、動かしたい人を掴んで、行き先で離してください。矢印が出ます。"],
      en: ["Draw a route", "Press Draw route above the plan, grab the person you want to move, and let go at the destination. An arrow appears."],
    },
    {
      at: '[data-panel="scenes"]',
      begin: () => { tourMark.scenes = state.project.scenes.length; },
      done: () => state.project.scenes.length > tourMark.scenes,
      ja: ["次の場面を作る", "場面の欄の〈動線の先へ動かした場面を作る〉を押してください。動線の先へ動いた状態が、次の場面として作られます。"],
      en: ["Make the next scene", "Press “Make a scene at the end of the routes”. The state after the move becomes the next scene."],
    },
    {
      at: ".stage-scene-move",
      begin: () => { tourMark.scene = state.project.activeSceneId; },
      done: () => state.project.activeSceneId !== tourMark.scene,
      ja: ["転換を見る", "〈◀ 前の場面〉で戻り、〈次の場面 ▶〉で進んでください（↑↓キーでも動きます）。進むときだけ、動線に沿って動いて見えます。"],
      en: ["Watch the change", "Go back with ◀ Previous and forward with Next ▶ (the ↑↓ keys work too). Moving forward plays the travel along the routes."],
    },
    {
      at: '[data-panel="light"]',
      begin: () => { tourMark.light = lightCount(); },
      done: () => lightCount() > tourMark.light,
      ja: ["照明を足す", "「照明」に名前を入れて〈追加〉。吊り・SS・前明かり・転がしの4種類から選べます。道具を〈照明を動かす〉に替えると、灯体と当たる場所を別々に掴めます。"],
      en: ["Add a light", "Enter a name under Lights and press Add. Four types: overhead, side, front, footlight. Switch the tool to Move lights to drag the fixture and the pool separately."],
    },
    {
      at: "#stage-front-note",
      lit: "#stage-front-cell",  // 案内しているのは正面の〈メモを貼る〉
      begin: () => { tourMark.notes = (sc().notes || []).length; },
      done: () => (sc().notes || []).length > tourMark.notes,
      ja: ["メモを貼る", "〈メモを貼る〉を押して、絵の何もない所を押してください。付箋が出て、その場で書けます。演者の脇でも、床の上でも。書き出した画像にも残ります。"],
      en: ["Pin a note", "Press Add note, then press an empty spot on the picture. A sticky note appears and you can type right there. It stays in the exported image."],
    },
    {
      at: "#stage-export",
      ja: ["持ち出す", "〈画像を書き出す〉で、正面・平面・全場面を画像にできます。作ったものはこの端末のブラウザにだけ保存されます。以上です、あとは自由に。"],
      en: ["Take it with you", "Export image saves the front view, the plan, or every scene. Your work lives only in this browser. That's it — go ahead."],
    },
  ];

  let tourAt = -1;
  let tourTimer = null;


  function tourTarget(step) {
    const el = document.querySelector(step.at);
    return el && el.offsetParent !== null ? el : null;
  }

  /* 穴どうしの重なりを先に取り除く。★塗り方（nonzero も evenodd も）では
   * 重なった所が塗り戻されて、かえって暗くなる。実際「まず動かしてみる」の段で、
   * 枠と絵の面が丸ごと重なって中央が暗くなった。
   * 後から足す矩形を、すでに決まった矩形で削って、重ならない形に分ける。 */
  function rectMinus(r, cut) {
    const l = Math.max(r.left, cut.left);
    const t = Math.max(r.top, cut.top);
    const rr = Math.min(r.right, cut.right);
    const b = Math.min(r.bottom, cut.bottom);
    if (rr <= l || b <= t) return [r];
    const out = [];
    if (r.top < t) out.push({ left: r.left, top: r.top, right: r.right, bottom: t });
    if (b < r.bottom) out.push({ left: r.left, top: b, right: r.right, bottom: r.bottom });
    if (r.left < l) out.push({ left: r.left, top: t, right: l, bottom: b });
    if (rr < r.right) out.push({ left: rr, top: t, right: r.right, bottom: b });
    return out;
  }

  function mergeHoles(rects) {
    const out = [];
    rects.forEach((r) => {
      let parts = [r];
      out.forEach((done) => { parts = parts.reduce((all, p) => all.concat(rectMinus(p, done)), []); });
      parts.forEach((p) => { if (p.right > p.left && p.bottom > p.top) out.push(p); });
    });
    return out;
  }

  /* 暗幕にあける穴。外枠は時計回り、穴は反時計回りに描く。
   * 同じ向きで描くと穴にならない。 */
  function shadePath(holes) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const clipped = holes.map((r) => ({
      left: Math.max(0, r.left),
      top: Math.max(0, r.top),
      right: Math.min(w, r.right),
      bottom: Math.min(h, r.bottom),
    })).filter((r) => r.right > r.left && r.bottom > r.top);
    let d = `M0 0 H${w} V${h} H0 Z`;
    mergeHoles(clipped).forEach((r) => {
      d += ` M${r.left} ${r.top} V${r.bottom} H${r.right} V${r.top} Z`;
    });
    return d;
  }

  function padRect(el, pad) {
    const r = el.getBoundingClientRect();
    return { left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad };
  }

  function placeTour() {
    if (tourAt < 0 || !els.tourRing) return;
    const target = tourTarget(TOUR[tourAt]);
    const holes = [];
    if (target) {
      const r = padRect(target, 6);
      els.tourRing.hidden = false;
      els.tourRing.style.left = `${r.left}px`;
      els.tourRing.style.top = `${r.top}px`;
      els.tourRing.style.width = `${r.right - r.left}px`;
      els.tourRing.style.height = `${r.bottom - r.top}px`;
      holes.push(r);
    } else {
      els.tourRing.hidden = true;
    }
    /* 手を動かす面も明るいままにする。案内の多くは「欄のボタンを押して、
     * そのあと絵の上で手を動かす」形なので、絵が暗いと肝心の所が見えない。
     * ★ただし明るくするのは、その段で本当に触る面だけ。動線は平面図にしか
     * 引けないので、正面図まで明るくすると触れる所を見誤る。 */
    const lit = document.querySelector(TOUR[tourAt].lit || "#stage-canvas-stack");
    if (lit && lit.offsetParent !== null) holes.push(padRect(lit, 4));
    if (els.tourShadePath) els.tourShadePath.setAttribute("d", shadePath(holes));
  }

  function watchTour() {
    clearInterval(tourTimer);
    const step = TOUR[tourAt];
    if (!step || !step.done) return;
    tourTimer = setInterval(() => {
      if (tourAt < 0 || !step.done()) return;
      clearInterval(tourTimer);
      // できた合図を一息置いてから次へ。押した手応えを消さないため
      els.tourCard.classList.add("is-done");
      setTimeout(() => {
        els.tourCard.classList.remove("is-done");
        if (tourAt >= 0) showTour(tourAt + 1);
      }, 620);
    }, 320);
  }

  function showTour(index) {
    if (!els.tour) return;
    tourAt = clamp(index, 0, TOUR.length - 1);
    const step = TOUR[tourAt];
    if (step.begin) step.begin();
    const words = isEn() ? step.en : step.ja;
    els.tour.hidden = false;
    els.tourStep.textContent = `${tourAt + 1} / ${TOUR.length}`;
    els.tourTitle.textContent = words[0];
    els.tourBody.textContent = words[1];
    els.tourPrev.disabled = tourAt === 0;
    els.tourNext.textContent = tourAt === TOUR.length - 1
      ? (isEn() ? "Done" : "はじめる")
      : (isEn() ? "Next" : "次へ");
    els.tourClose.textContent = isEn() ? "Close" : "閉じる";
    els.tourPrev.textContent = isEn() ? "Back" : "戻る";
    const target = tourTarget(step);
    if (target) target.scrollIntoView({ block: "center", behavior: "smooth" });
    // 巻き終わるのを待ってから枠を当てる
    setTimeout(placeTour, 260);
    placeTour();
    watchTour();
  }

  function endTour() {
    if (!els.tour) return;
    clearInterval(tourTimer);
    els.tour.hidden = true;
    tourAt = -1;
    try { localStorage.setItem(TOUR_KEY, "done"); } catch (_) { /* 覚えられなくても動く */ }
  }

  if (els.feedback) {
    els.feedback.addEventListener("click", () => {
      if (FEEDBACK_URL) { window.open(FEEDBACK_URL, "_blank", "noopener"); return; }
      const words = isEn()
        ? "The feedback form is not set up yet. Please tell the maker directly for now."
        : "感想の送り先（フォーム）はまだ用意できていません。いまは直接お知らせください。";
      els.saveStatus.textContent = words;
      announce(words);
    });
  }
  if (els.tourStart) els.tourStart.addEventListener("click", () => showTour(0));
  if (els.tourClose) els.tourClose.addEventListener("click", endTour);
  if (els.tourPrev) els.tourPrev.addEventListener("click", () => showTour(tourAt - 1));
  if (els.tourNext) {
    els.tourNext.addEventListener("click", () => {
      if (tourAt >= TOUR.length - 1) { endTour(); return; }
      showTour(tourAt + 1);
    });
  }
  window.addEventListener("resize", placeTour);
  window.addEventListener("scroll", placeTour, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (tourAt < 0) return;
    if (event.key === "Escape") { event.preventDefault(); endTour(); }
  });

  els.undo.addEventListener("click", undo);
  els.redo.addEventListener("click", redo);

  /* ⌘Z で戻す、⇧⌘Z でやり直す（WindowsではCtrl）。
   * 絵を描く道具なので、手が離れないことが効く。ただし
   *  ・舞台スケッチを開いていないときは何もしない（他のタブの邪魔をしない）
   *  ・名前やメモを打っている最中は、ブラウザ本来の文字の取り消しに任せる
   * の二つは必ず守る。取り違えると、打っている文章ではなく舞台の配置が消える。 */
  function isTyping(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "z" && event.key !== "Z") return;
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const view = document.getElementById("view-stage");
    if (!view || view.hidden) return;
    if (isTyping(event.target)) return;
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
  });

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

  /* ---------- 画像の書き出し ----------
     正面と平面のどちらを、どの範囲の場面ぶん出すかを選んでから書き出す。
     複数になるときは1枚ずつ続けて落とす（束ねる形式を持たない代わりに、
     名前へ場面の番号と絵の種類を入れて並び順が分かるようにする）。 */

  let exportView = "front";
  let exportScope = "current";

  function exportTargets() {
    const p = state.project;
    const i = p.scenes.findIndex((x) => x.id === p.activeSceneId);
    if (exportScope === "all") return p.scenes.filter((x) => x.kind === "scene");
    if (exportScope === "section") {
      // いまの場面が入っているいちばん内側のセクションと、その中身
      for (let k = i - 1; k >= 0; k -= 1) {
        if (p.scenes[k].depth < p.scenes[i].depth) {
          if (p.scenes[k].kind === "section") {
            return sceneChildren(k).filter((x) => x.kind === "scene");
          }
          break;
        }
      }
      return [p.scenes[i]];
    }
    return [p.scenes[i]];
  }

  function exportViews() {
    return exportView === "both" ? ["front", "plan"] : [exportView];
  }

  function updateExportNote() {
    document.querySelectorAll("[data-export-view]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.exportView === exportView));
    });
    document.querySelectorAll("[data-export-scope]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.exportScope === exportScope));
    });
    if (!els.exportNote) return;
    const scenes = exportTargets().length;
    const views = exportViews().length;
    const total = scenes * views;
    els.exportNote.textContent = total > 1
      ? `${scenes}場面 × ${views === 2 ? "正面と平面" : "1枚"} ＝ 合計${total}枚を続けて落とします。`
      : "1枚を落とします。";
  }

  function stampNow() {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"), "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
    ].join("");
  }

  const safeName = (text) => String(text || "").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 24) || "scene";

  function runExport() {
    const scenes = exportTargets();
    const views = exportViews();
    if (!scenes.length) { announce("書き出す場面がありません。"); return; }
    const keepScene = state.project.activeSceneId;
    const keepSelected = selectedId;
    const stamp = stampNow();
    const jobs = [];
    scenes.forEach((scene, index) => {
      views.forEach((view) => jobs.push({ scene, view, index }));
    });

    selectedId = null;
    jobs.forEach((job, k) => {
      // 場面を切り替えて描く。描き終えたら元の場面へ戻す
      state.project.activeSceneId = job.scene.id;
      const output = document.createElement("canvas");
      output.width = W;
      output.height = H;
      /* 書き出しは等倍。手元で拡大して見ていても、渡すのは絵の全体。 */
      const zs = zoomOf(job.view);
      const keep = { z: zs.z, ox: zs.ox, oy: zs.oy };
      zs.z = 1; zs.ox = 0; zs.oy = 0;
      drawStage(output.getContext("2d", { alpha: false }), false, job.view);
      Object.assign(zs, keep);
      const link = document.createElement("a");
      link.href = output.toDataURL("image/png");
      const no = String(job.index + 1).padStart(2, "0");
      link.download = `${safeName(state.project.title)}-${no}_${safeName(job.scene.title)}`
        + `-${job.view === "front" ? VENUES.seatById(state.seat).short : "平面"}-${stamp}.png`;
      // 続けて落とすと弾く browser があるので、少しずつ間を置く
      setTimeout(() => { link.click(); }, k * 220);
    });

    setTimeout(() => {
      state.project.activeSceneId = keepScene;
      selectedId = keepSelected;
      renderScenes();
      updateInspector();
      render();
    }, jobs.length * 220 + 60);

    closeExport();
    announce(`${jobs.length}枚を書き出しました。`);
  }

  function openExport() {
    if (!els.exportModal) return;
    if (!state.showFront && exportView !== "plan") exportView = "plan";
    if (!state.showPlan && exportView === "plan") exportView = "front";
    updateExportNote();
    els.exportModal.hidden = false;
    els.exportBackdrop.hidden = false;
  }

  function closeExport() {
    if (els.exportModal) els.exportModal.hidden = true;
    if (els.exportBackdrop) els.exportBackdrop.hidden = true;
  }

  els.export.addEventListener("click", openExport);
  if (els.exportClose) els.exportClose.addEventListener("click", closeExport);
  if (els.exportBackdrop) els.exportBackdrop.addEventListener("click", closeExport);
  if (els.exportRun) els.exportRun.addEventListener("click", runExport);
  document.querySelectorAll("[data-export-view]").forEach((b) => {
    b.addEventListener("click", () => { exportView = b.dataset.exportView; updateExportNote(); });
  });
  document.querySelectorAll("[data-export-scope]").forEach((b) => {
    b.addEventListener("click", () => { exportScope = b.dataset.exportScope; updateExportNote(); });
  });

  buildPanelHeads();
  syncViewSwitch();
  // 前に選んだ言語で開く。パネルの見出しを作ったあとに当てる
  try { lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "ja"; } catch (_) { lang = "ja"; }
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
  applyLang();

  /* 初めて開いた人には、こちらから声をかける。
   * 一度でも見た（または閉じた）ら、次からは上の「使い方」からだけ。 */
  let seenTour = true;
  try { seenTour = localStorage.getItem(TOUR_KEY) === "done"; } catch (_) { seenTour = true; }
  if (!seenTour || openArgs.has("tour")) setTimeout(() => showTour(0), 700);
})();

/* 舞台スケッチ — 劇場形式のプリセット
 *
 * 寸法は「実在の規格」を根拠つきで持つ。ただしユーザーには数値を編集させない
 * （設計計画書 8.5節: 舞台スケッチは寸法を持たない構図スケッチであり、施工図ではない）。
 * 数値は「間口12m相当」「ここは客席から18m」のような目安の表示にだけ使う。
 * 責任の伴う判断（搬入、安全距離、荷重）へは使わせない。
 *
 * audience: 客席がどこにあるか。これが形式を分ける一番の軸になる。
 *   front … 正面だけ（プロセニアム、エンドステージ）
 *   three … 三方（スラスト）
 *   round … 全周（アリーナ、ビッグトップ）
 *   none  … 客席という囲いが無い（屋外。代わりに柵とFOHの距離で決まる）
 */
(function () {
  "use strict";

  const VENUES = [
    {
      id: "proscenium",
      label: "プロセニアム",
      short: "額縁舞台",
      note: "客席は正面の一方向。額縁が舞台と客席を分け、背景と大道具が効く。",
      audience: "front",
      frame: true,
      sizes: [
        { id: "small", label: "小劇場", width: 8, depth: 7, height: 6, seats: 200 },
        { id: "mid", label: "中劇場", width: 12, depth: 9, height: 8, seats: 800 },
        { id: "large", label: "大劇場", width: 18, depth: 12, height: 12, seats: 1800 },
      ],
      source: "劇場形式の分類は Theatres Trust による",
    },
    {
      id: "thrust",
      label: "スラスト",
      short: "張り出し舞台",
      note: "舞台が客席へ突き出し、三方を客席が囲む。背中を必ず誰かに見せる。",
      audience: "three",
      frame: false,
      sizes: [
        { id: "small", label: "小規模", width: 9, depth: 8, height: 6, seats: 300 },
        { id: "mid", label: "中規模", width: 12, depth: 11, height: 8, seats: 700 },
      ],
      source: "劇場形式の分類は Theatres Trust による",
    },
    {
      id: "arena",
      label: "ビッグトップ",
      short: "円形・全周",
      note: "客席が全周を囲む。正面が無いので、どの角度からも成立させる必要がある。",
      audience: "round",
      frame: false,
      sizes: [
        // リング直径13m（42フィート）は1768年 Philip Astley 以来の国際標準
        { id: "onering", label: "ワンリング", ring: 13, width: 13, depth: 13, height: 12, seats: 800 },
        { id: "grand", label: "グランドシャピトー", ring: 13, width: 20, depth: 20, height: 25, seats: 2500 },
      ],
      source: "リング直径13mは1768年 Philip Astley 以来の国際標準",
    },
    {
      id: "outdoor",
      label: "屋外ステージ",
      short: "仮設・野外",
      note: "客席という囲いが無い。前端の柵と音響卓までの距離が、そのまま空間の尺になる。",
      audience: "none",
      frame: false,
      sizes: [
        { id: "sl100", label: "小型 7×6m", width: 7, depth: 6, height: 6, crowd: 1000 },
        { id: "sl260", label: "中型 10×7m", width: 10, depth: 7, height: 7, crowd: 5000 },
        { id: "sl320", label: "大型 12×12m", width: 12, depth: 12, height: 9, crowd: 10000 },
      ],
      source: "寸法は Stageline のモバイルステージ規格に対応",
    },
    {
      id: "blackbox",
      label: "ブラックボックス",
      short: "可変",
      note: "客席の位置を毎回決め直せる箱。形式そのものが変数になる。",
      audience: "front",
      frame: false,
      sizes: [
        { id: "small", label: "小", width: 9, depth: 9, height: 5 },
        { id: "mid", label: "中", width: 13, depth: 13, height: 7 },
      ],
      source: "劇場形式の分類は Theatres Trust による",
    },
  ];

  // 客席からの距離の目安。米国劇場コンサルタント協会(ASTC)がまとめた実務家の値。
  // 「ここから先は表情が読めない」という一本の線として使う。
  const SIGHT_LIMITS = [
    { m: 20, label: "表情が見える限界", note: "演劇でおよそ18〜24m" },
    { m: 35, label: "身体の動きが読める限界", note: "ミュージカル・オペラでおよそ30〜38m" },
  ];

  /* 客席のどこから見るか。同じ配置でも、席が変われば見えるものが変わる。
   * 実務では「サイトライン」と呼ぶ検討で、Vectorworks はカメラを客席へ置いて確かめる。
   * ここでは擬似パースのパラメータを席ごとに持つ。
   *   floorY..bottomY  床の帯の厚み。低い席ほど床が浅く（潰れて）見える
   *   backW..frontW    奥と手前の幅の差。高い席ほど差が開き、奥まで見通せる
   *   shift            消失点の左右ずれ。横の席ほど舞台が斜めに見える
   *   rise             舞台面をどれだけ見上げる／見下ろすか（0=水平）
   */
  const SEATS = [
    {
      id: "center", label: "1階 中央", short: "中央",
      note: "設計の基準になる席。奥行きも高さも素直に見える。",
      backY: 150, floorY: 470, bottomY: 674, backW: 0.62, frontW: 0.94, shift: 0, rise: 0,
    },
    {
      // 舞台面はふつう客席床から0.9〜1.2m上がり、座った目線とほぼ同じ高さに来る。
      // だから最前列では床がほとんど見えず、演者を足元から見上げることになる。
      id: "front", label: "1階 最前列", short: "最前",
      note: "舞台の床がほぼ見えない位置。演者を足元から見上げ、頭上に空間が伸びる。",
      backY: 34, floorY: 606, bottomY: 700, backW: 0.86, frontW: 1.2, shift: 0, rise: 0.3,
    },
    {
      id: "side", label: "1階 左右席", short: "左右",
      note: "斜めから見る位置。片側の袖が見え、正面向きの構図は崩れる。",
      backY: 150, floorY: 470, bottomY: 674, backW: 0.62, frontW: 0.94, shift: 0.3, rise: 0,
    },
    {
      id: "balcony", label: "2階席", short: "2階",
      note: "見下ろす位置。床の絵が主役になり、立ち位置の関係がよく読める。",
      backY: 206, floorY: 392, bottomY: 658, backW: 0.5, frontW: 0.9, shift: 0, rise: -0.12,
    },
  ];

  // 屋外だけは客席ではなく距離で空間が決まる
  const OUTDOOR_MARKS = [
    { ratio: 0.12, label: "柵", note: "ステージ前端から1.8〜3.7m。撮影と警備の帯" },
    { ratio: 0.58, label: "音響卓", note: "ステージから観客エリアの1/2〜2/3の位置" },
  ];

  window.SHOSAI_VENUES = {
    list: VENUES,
    byId: (id) => VENUES.find((v) => v.id === id) || VENUES[0],
    sizeById: (venue, sizeId) => (venue.sizes.find((s) => s.id === sizeId) || venue.sizes[0]),
    seats: SEATS,
    seatById: (id) => SEATS.find((s) => s.id === id) || SEATS[0],
    sightLimits: SIGHT_LIMITS,
    outdoorMarks: OUTDOOR_MARKS,
  };
})();

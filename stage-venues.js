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

  const LIBRARY_KEY = "shosai-stage-venues-v1";
  const LEGACY_DRAFT_KEY = "stage-venue-drafts-v1";
  const LEGACY_MIGRATION_KEY = "shosai-stage-venues-v1:migrated-stage-venue-drafts-v1";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const roundM = (value) => Math.round(value * 1000) / 1000;

  const rectangleOutline = (width, depth) => [
    [0, 0],
    [width, 0],
    [width, depth],
    [0, depth],
  ];

  const circlePoint = (center, radius, index, segments) => {
    const angle = (Math.PI * 2 * index) / segments;
    return [
      roundM(center + (Math.cos(angle) * radius)),
      roundM(center + (Math.sin(angle) * radius)),
    ];
  };

  const circleOutline = (diameter, segments = 32) => {
    const radius = diameter / 2;
    return Array.from({ length: segments }, (_, index) => circlePoint(radius, radius, index, segments));
  };

  const frontAudience = (width, depth) => {
    const audienceDepth = Math.max(2, roundM(depth * 0.4));
    return [{
      id: "audience-front",
      polygon: [[0, depth], [width, depth], [width, depth + audienceDepth], [0, depth + audienceDepth]],
      mode: "seated",
      eyeM: 1.2,
      side: "front",
    }];
  };

  const threeSideAudience = (width, depth) => {
    const sideWidth = Math.max(2, roundM(width * 0.25));
    const front = frontAudience(width, depth)[0];
    return [
      front,
      {
        id: "audience-left",
        polygon: [[-sideWidth, 0], [0, 0], [0, depth], [-sideWidth, depth]],
        mode: "seated",
        eyeM: 1.2,
        side: "left",
      },
      {
        id: "audience-right",
        polygon: [[width, 0], [width + sideWidth, 0], [width + sideWidth, depth], [width, depth]],
        mode: "seated",
        eyeM: 1.2,
        side: "right",
      },
    ];
  };

  const roundAudience = (diameter, segments = 32) => {
    const center = diameter / 2;
    const innerRadius = diameter / 2;
    const outerRadius = innerRadius + Math.max(2, roundM(diameter * 0.2));
    return Array.from({ length: segments }, (_, index) => {
      const next = (index + 1) % segments;
      return {
        id: `audience-round-${index + 1}`,
        polygon: [
          circlePoint(center, innerRadius, index, segments),
          circlePoint(center, innerRadius, next, segments),
          circlePoint(center, outerRadius, next, segments),
          circlePoint(center, outerRadius, index, segments),
        ],
        mode: "seated",
        eyeM: 1.2,
        side: "round",
      };
    });
  };

  const prosceniumFixtures = (width, depth, height) => [
    {
      type: "wall",
      polygon: [[-0.25, depth - 0.25], [0, depth - 0.25], [0, depth + 0.25], [-0.25, depth + 0.25]],
      heightM: height,
      label: "プロセニアム枠（下手）",
      movable: false,
      frame: true,
    },
    {
      type: "wall",
      polygon: [[width, depth - 0.25], [width + 0.25, depth - 0.25], [width + 0.25, depth + 0.25], [width, depth + 0.25]],
      heightM: height,
      label: "プロセニアム枠（上手）",
      movable: false,
      frame: true,
    },
  ];

  const centeredSquare = (x, y, side) => {
    const half = side / 2;
    return [
      [roundM(x - half), roundM(y - half)],
      [roundM(x + half), roundM(y - half)],
      [roundM(x + half), roundM(y + half)],
      [roundM(x - half), roundM(y + half)],
    ];
  };

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
   *   backW..frontW    奥と手前の幅の比。絶対値ではなく倍率差として使う
   *                    （実際の px は、間口と高さが画面に収まる尺から導く）
   *   shift            消失点の左右ずれ。横の席ほど舞台が斜めに見える
   *   rise             舞台面をどれだけ見上げる／見下ろすか（0=水平）
   *   tilt             三点透視の強さ。垂直線が画面の上へ収束する度合い（煽りの正体）
   *   apron            床の線より下に見える、舞台の立ち上がりとピットの高さ(px)
   *   plan             客席を上から見たときの居場所。正面図の隅に出す小図で使う
   *   eye              舞台の前端までの距離(m)。首を振ったときの見え方の変わり方を決める
   */
  const SEATS = [
    {
      /* 舞台まで約3m。目線が床とほぼ同じ高さで、四つのことが同時に起きる。
       *  ① 床は目線とほぼ同じ高さなので、奥行きが潰れて細い帯になる（floorY≒bottomY）
       *  ② その帯＝水平線は画面の下端ではなく下から3割に来る。見上げているぶん
       *     視線の中心が水平線の上にあるため。演者はこの線から画面の上半分へ立ち上がる
       *  ③ 線より下は舞台ではなく、舞台の立ち上がりとその下の暗がり（apron）
       *  ④ 奥の壁は画面の外までせり上がり、天井も額縁の上辺も見えない
       *
       * 広角の正体は「視野が狭いこと」ではなく「手前と奥の差が極端に開くこと」。
       * 実際の肉眼（左右60度）ではこの距離で間口の3割しか入らないが、それでは
       * 置いた演者が画面の外へ出て道具にならない。超広角レンズと同じ扱いにして、
       * 間口はほぼ収めたまま、奥と手前の倍率差だけを実物どおり開く。
       */
      id: "front", label: "1階 最前列", short: "最前",
      note: "目線が床とほぼ同じ高さ。強く見上げ、手前と奥の大きさが極端に開く（超広角の見え方）。",
      plan: { x: 0.5, y: 0.06, tier: "stalls" }, eye: 3,
      floorY: 490, bottomY: 532, backW: 0.45, frontW: 1.75, shift: 0, rise: 0.15, apron: 150, tilt: 0.13,
    },
    {
      /* 1階の中ほど。最前列ほど見上げないが、後方より目線が低い。
       * 床の帯が薄くなり（見下ろす角度が浅い）、手前と奥の倍率差が2倍まで開く。
       * 舞台の立ち上がりがわずかに見えるので、控えめな apron を持つ。 */
      id: "center", label: "1階 中央", short: "中央",
      note: "少し低い位置から見る席。手前と奥の差が開き、舞台を軽く見上げる。",
      plan: { x: 0.5, y: 0.3, tier: "stalls" }, eye: 8,
      floorY: 478, bottomY: 598, backW: 0.5, frontW: 0.94, shift: 0, rise: 0.06, apron: 58, tilt: 0.05,
    },
    {
      id: "rear", label: "1階 後方", short: "後方",
      note: "設計の基準になる席。奥行きも高さも素直に見える。",
      plan: { x: 0.5, y: 0.74, tier: "stalls" }, eye: 15,
      floorY: 470, bottomY: 674, backW: 0.62, frontW: 0.94, shift: 0, rise: 0,
    },
    {
      /* 客席の下手（画面の左）に座る想定。
       * 左に座ると、奥行きの消失点も左へ寄るので、奥の壁は手前の間口より
       * 「左へ」ずれて見える。shift は奥のずれ幅なので負になる。
       * ここを正にすると、平面の小図が示す位置と絵が左右逆になる。 */
      id: "side", label: "1階 左右席", short: "左右",
      note: "斜めから見る位置。片側の袖が見え、正面向きの構図は崩れる。",
      plan: { x: 0.16, y: 0.4, tier: "stalls" }, eye: 11,
      floorY: 470, bottomY: 674, backW: 0.62, frontW: 0.94, shift: -0.28, rise: 0,
    },
    {
      id: "balcony", label: "2階席", short: "2階",
      note: "見下ろす位置。床の絵が主役になり、立ち位置の関係がよく読める。",
      plan: { x: 0.5, y: 0.5, tier: "balcony" }, eye: 18,
      floorY: 392, bottomY: 658, backW: 0.5, frontW: 0.9, shift: 0, rise: -0.12,
    },
  ];

  // 屋外だけは客席ではなく距離で空間が決まる
  const OUTDOOR_MARKS = [
    { ratio: 0.12, label: "柵", note: "ステージ前端から1.8〜3.7m。撮影と警備の帯" },
    { ratio: 0.58, label: "音響卓", note: "ステージから観客エリアの1/2〜2/3の位置" },
  ];

  const audiencePolygons = (audience, width, depth) => {
    if (audience === "front") return frontAudience(width, depth);
    if (audience === "three") return threeSideAudience(width, depth);
    if (audience === "round") return roundAudience(width);
    return [];
  };

  const fixturesForSize = (venueId, width, depth, height) => {
    if (venueId === "proscenium") return prosceniumFixtures(width, depth, height);
    if (venueId !== "outdoor") return [];

    const mark = OUTDOOR_MARKS[1];
    const y = roundM(depth + (depth * mark.ratio));
    return [{
      type: "furniture",
      polygon: centeredSquare(width / 2, y, Math.min(2, width / 4)),
      heightM: 1.2,
      label: mark.label,
      movable: true,
      ratio: mark.ratio,
      note: mark.note,
    }];
  };

  const accessForSize = (venueId, width, depth) => {
    if (venueId !== "outdoor") return [];

    const mark = OUTDOOR_MARKS[0];
    return [{
      type: "barrier",
      at: [roundM(width / 2), roundM(depth + (depth * mark.ratio))],
      widthM: width,
      label: mark.label,
      ratio: mark.ratio,
      note: mark.note,
    }];
  };

  const createSizeV2 = (venue, size) => {
    const floor = {
      outline: venue.id === "arena" ? circleOutline(size.width) : rectangleOutline(size.width, size.depth),
      levels: [],
    };
    const ceiling = {
      heightM: size.height,
      rigging: venue.rigging,
      note: "形式プリセットの目安。実会場では要確認。",
    };
    const variant = {
      id: size.id,
      label: size.label,
      floor,
      ceiling,
      audience: audiencePolygons(venue.audience, size.width, size.depth),
      fixtures: fixturesForSize(venue.id, size.width, size.depth, size.height),
      access: accessForSize(venue.id, size.width, size.depth),
      capacity: {},
    };

    if (typeof size.ring === "number") variant.ringM = size.ring;
    if (typeof size.seats === "number") variant.capacity.seats = size.seats;
    if (typeof size.crowd === "number") variant.capacity.crowd = size.crowd;
    return variant;
  };

  const createVenueV2 = (venue) => {
    const sizes = venue.sizes.map((size) => createSizeV2(venue, size));
    const primary = sizes[0];
    return {
      format: "venue-v2",
      id: venue.id,
      label: venue.label,
      basis: venue.id,
      scale: { gridM: 1, confidence: "approx" },
      floor: primary.floor,
      ceiling: primary.ceiling,
      audience: primary.audience,
      fixtures: primary.fixtures,
      access: primary.access,
      provenance: { source: "preset", confidence: "high", sharing: "ok" },
      short: venue.short,
      note: venue.note,
      reference: venue.source,
      sizes,
    };
  };

  const VENUES_V2 = [
    createVenueV2({
      id: "proscenium",
      label: "プロセニアム",
      short: "額縁舞台",
      note: "客席は正面の一方向。額縁が舞台と客席を分け、背景と大道具が効く。",
      audience: "front",
      rigging: "full",
      sizes: [
        { id: "small", label: "小劇場", width: 8, depth: 7, height: 6, seats: 200 },
        { id: "mid", label: "中劇場", width: 12, depth: 9, height: 8, seats: 800 },
        { id: "large", label: "大劇場", width: 18, depth: 12, height: 12, seats: 1800 },
      ],
      source: "劇場形式の分類は Theatres Trust による",
    }),
    createVenueV2({
      id: "thrust",
      label: "スラスト",
      short: "張り出し舞台",
      note: "舞台が客席へ突き出し、三方を客席が囲む。背中を必ず誰かに見せる。",
      audience: "three",
      rigging: "full",
      sizes: [
        { id: "small", label: "小規模", width: 9, depth: 8, height: 6, seats: 300 },
        { id: "mid", label: "中規模", width: 12, depth: 11, height: 8, seats: 700 },
      ],
      source: "劇場形式の分類は Theatres Trust による",
    }),
    createVenueV2({
      id: "arena",
      label: "ビッグトップ",
      short: "円形・全周",
      note: "客席が全周を囲む。正面が無いので、どの角度からも成立させる必要がある。",
      audience: "round",
      rigging: "full",
      sizes: [
        // リング直径13m（42フィート）は1768年 Philip Astley 以来の国際標準
        { id: "onering", label: "ワンリング", ring: 13, width: 13, depth: 13, height: 12, seats: 800 },
        { id: "grand", label: "グランドシャピトー", ring: 13, width: 20, depth: 20, height: 25, seats: 2500 },
      ],
      source: "リング直径13mは1768年 Philip Astley 以来の国際標準",
    }),
    createVenueV2({
      id: "outdoor",
      label: "屋外ステージ",
      short: "仮設・野外",
      note: "客席という囲いが無い。前端の柵と音響卓までの距離が、そのまま空間の尺になる。",
      audience: "none",
      rigging: "limited",
      sizes: [
        { id: "sl100", label: "小型 7×6m", width: 7, depth: 6, height: 6, crowd: 1000 },
        { id: "sl260", label: "中型 10×7m", width: 10, depth: 7, height: 7, crowd: 5000 },
        { id: "sl320", label: "大型 12×12m", width: 12, depth: 12, height: 9, crowd: 10000 },
      ],
      source: "寸法は Stageline のモバイルステージ規格に対応",
    }),
    createVenueV2({
      id: "blackbox",
      label: "ブラックボックス",
      short: "可変",
      note: "客席の位置を毎回決め直せる箱。形式そのものが変数になる。",
      audience: "front",
      rigging: "limited",
      sizes: [
        { id: "small", label: "小", width: 9, depth: 9, height: 5 },
        { id: "mid", label: "中", width: 13, depth: 13, height: 7 },
      ],
      source: "劇場形式の分類は Theatres Trust による",
    }),
  ];

  /* ── 実在会場プリセット ──────────────────────────────
   * 形式プリセット（上のVENUES_V2）と違い、実在の劇場を図面から起こす。
   * 数値は目安表示にだけ使う方針（このファイル冒頭）は実在会場でも同じ。
   *
   * シアタートラム（世田谷パブリックシアター・三軒茶屋）基本形態＝掘込みエンド形式。
   * 出典: 公式図面「劇場平面図・断面図 基本形態掘込みエンド形式」2014.1改訂版
   *       ＋公式仕様ページ https://setagaya-pt.jp/guide/tram/
   *       （間口12.7m・奥行11.491m・高さ7m・スノコ高9.1m・基本225席。図面と一致を確認）
   *       図面の最新版は2026年4月改訂。差分未確認のまま2014年版を採る。
   * 図面から読めるが未反映のもの: 1枚迫り2715×5442（2013年度改修で分割機構は廃止）、
   *       客席段床（±0/-240/-480/-720）、搬入エレベーター W1890×H2780×L5225〜5300・2500kg、
   *       サイドギャラリー+5960・ギャラリー固定バトン+4000。
   */
  const theatreTramV2 = (() => {
    /* 平面は長方形ではなく凸形。図面PDFのベクター実測（縮尺35.28mm/pt、
     * 迫り5442mmで検証。左右対称・中心線一致を確認）:
     *   奥の箱   内法 8.41m × 奥行約2.96m（黒扉の前）
     *   絞り     内法 7.29m × 奥行約1.2m（両側の壁張り出し＋扉帯。扉開口は絞り幅に均す）
     *   主室     内法14.71m（公式「開口部14.7m」と一致）
     * 公式の間口12.7mは主室の側面ギャラリー内法（実測12.81m）にあたる。 */
    const width = 14.7;    // 主室の内法（開口部）
    const depth = 11.491;  // 舞台奥行＝奥壁から掘込み際まで（公式値。実測とも一致）
    const houseDepth = 8.744; // 客席部の奥行 ＝ 断面図の全長20235 − 舞台奥行（近似）
    const houseBack = roundM(depth + houseDepth);
    const cx = width / 2;
    const boxHalf = 8.41 / 2;    // 奥の箱
    const neckHalf = 7.29 / 2;   // 絞り
    const boxEnd = 2.96;         // 奥の箱の終わり（奥壁から）
    const neckEnd = 5.43;        // 絞りの終わり＝主室の始まり
    const variant = {
      id: "standard",
      label: "基本形態（掘込みエンド）",
      floor: {
        outline: [
          [roundM(cx - boxHalf), 0], [roundM(cx + boxHalf), 0],
          [roundM(cx + boxHalf), boxEnd], [roundM(cx + neckHalf), boxEnd],
          [roundM(cx + neckHalf), neckEnd], [width, neckEnd],
          [width, depth], [0, depth],
          [0, neckEnd], [roundM(cx - neckHalf), neckEnd],
          [roundM(cx - neckHalf), boxEnd], [roundM(cx - boxHalf), boxEnd],
        ],
        levels: [],
      },
      ceiling: {
        heightM: 7,
        gridM: 9.1,  // スノコ＝バックバトンとびきり+9100
        rigging: "full",
        note: "使える高さは約7m（照明用バトンとびきり+7310）。バックバトンとびきり＝+9100。実会場では要確認。",
      },
      audience: [{
        id: "audience-front",
        // 座席の帯は主室より狭い（両側が通路とギャラリー）。平面図の座席列からの近似。
        polygon: [[2.25, depth], [12.45, depth], [12.45, houseBack], [2.25, houseBack]],
        mode: "seated",
        eyeM: 1.2,
        side: "front",
      }],
      fixtures: [],
      access: [],
      capacity: { seats: 225 },
    };
    return {
      format: "venue-v2",
      id: "theatre-tram",
      label: "シアタートラム",
      basis: "theatre-tram",
      scale: { gridM: 1, confidence: "approx" },
      floor: variant.floor,
      ceiling: variant.ceiling,
      audience: variant.audience,
      fixtures: variant.fixtures,
      access: variant.access,
      provenance: {
        source: "図面",
        confidence: "high",
        sharing: "ok",
        note: "公式図面2014.1改訂版を読み取り、公式仕様ページの数値と一致を確認。最新図面は2026年4月改訂版（未反映）。",
      },
      short: "実在・三軒茶屋",
      realVenue: true,
      // 奥壁の造作。黒扉の開口2.58mは平面図の壁走査実測（奥壁中央）。高さは写真から壁いっぱいと推定
      backWall: [{ label: "黒扉", xM: 7.35, widthM: 2.58, heightM: 7 }],
      note: "世田谷パブリックシアターの小劇場。客席側を掘り込んだエンド形式で、額縁が無く舞台と客席が同じ箱に入る。平面は凸形：奥は8.4m幅の箱（黒扉）、絞りを経て主室は14.7m。前端寄り中央に1枚迫り（5.44×2.72m）。客席は段床11列・基本225席。",
      reference: "世田谷パブリックシアター 公式図面（2014.1改訂版）・仕様 https://setagaya-pt.jp/guide/tram/",
      sizes: [variant],
    };
  })();
  VENUES_V2.push(theatreTramV2);

  /* 実在会場 第2号: TOHU（モントリオール・サーカス芸術都市）
   *
   * 数値の出所は公式技術仕様書 "Devis Technique Tohu"（2020-02-10版）。
   * 主要値は公式サイトの案内とも突き合わせて一致を確認した:
   *   グリッドまで19.4m ＋ グリッドから屋根まで3.05m ＝ 22.45m
   *   → 公式サイトの「hauteur 22,45 m」と一致。
   *   可動席は5ブロック×85席＋6ブロック×69席＝839席 → 公式の839席と一致。
   * 公式サイトは直径40mと案内するが、仕様書は「回廊込み42.7m／回廊内法36.6m」。
   * 40mは丸めた案内値とみて、内法36.6mを室として採る。
   *
   * 舞台スケッチでは「床＝演技面」なので、床は仕様書にある**組める円形舞台の最大直径
   * 12.8m**（曲面台の一式で作れる円）を採る。1768年 Philip Astley 以来のリング13mと
   * ほぼ同じ寸法で、既存のビッグトップと並べても違和感がない。
   *
   * 客席の位置だけは仕様書に角度・半径の記載が無いため幾何から導いた（＝推定）:
   * 可動席1ブロックの幅7.5m×11ブロックが円周に並ぶとすると、
   *   7.5 = 2r・sin(180°/11) → r ≒ 13.3m（客席の前縁）。
   * 室の内法半径18.3mとの差5.0mが可動席の奥行にあたり、席の高さ4.9mと釣り合う
   * （伸縮式可動席のほぼ45度の勾配）ため、この推定を採用した。 */
  const tohuV2 = (() => {
    const stageDiameter = 12.8;   // 曲面台で組める円形舞台の最大直径（仕様書 SCÈNE）
    const centre = stageDiameter / 2;
    const houseInnerR = 13.3;     // 可動席の前縁（上記の幾何から導出。推定）
    const roomR = 36.6 / 2;       // 室の内法半径（仕様書「回廊内法120' = 36.6m」）
    const BLOCKS = 11;            // 可動席のブロック数（仕様書 GRADINS）

    /* 可動席は実際には平らな箱を円周に並べたもの。円弧ではなく直線の前縁で作る。 */
    const houseBlocks = Array.from({ length: BLOCKS }, (_, index) => {
      const next = index + 1;
      return {
        id: `audience-block-${next}`,
        polygon: [
          circlePoint(centre, houseInnerR, index, BLOCKS),
          circlePoint(centre, houseInnerR, next, BLOCKS),
          circlePoint(centre, roomR, next, BLOCKS),
          circlePoint(centre, roomR, index, BLOCKS),
        ],
        mode: "seated",
        eyeM: 1.2,
        side: "round",
      };
    });

    const variant = {
      id: "round-full",
      label: "全周（円形舞台12.8m）",
      floor: { outline: circleOutline(stageDiameter), levels: [] },
      ceiling: {
        heightM: 19.4,   // 床からグリッドまで（仕様書 63'7''）
        gridM: 19.4,     // 吊りの面＝グリッドそのもの
        rigging: "full",
        note: "床からグリッドまで19.4m、グリッドから屋根まで3.05m（全高22.45m）。吊りは1点あたり最大2000kg。",
      },
      audience: houseBlocks,
      fixtures: [],
      access: [],
      capacity: { seats: 1004 },
    };

    return {
      format: "venue-v2",
      id: "tohu",
      label: "TOHU",
      basis: "tohu",
      scale: { gridM: 1, confidence: "approx" },
      floor: variant.floor,
      ceiling: variant.ceiling,
      audience: variant.audience,
      fixtures: variant.fixtures,
      access: variant.access,
      provenance: {
        source: "図面",
        confidence: "high",
        sharing: "ok",
        note: "公式技術仕様書 Devis Technique Tohu（2020-02-10版）の数値。全高と席数は公式サイトの案内とも一致を確認。客席の半径だけは記載が無く、可動席11ブロック×幅7.5mの幾何から導いた推定。より新しい2025-03-26版が公開されているが、本作業の環境からは取得できず未反映。",
      },
      short: "実在・モントリオール",
      realVenue: true,
      note: "モントリオールのサーカス芸術都市TOHUの円形ホール。北米で初めてサーカスのために建てられた全周360度の劇場で、客席の内法は直径36.6m、床は打ちっぱなしのコンクリート。中央の円形舞台は専用の曲面台で最大直径12.8mまで組める（固定の舞台は無く、毎回組む）。可動席は11ブロック839席で、伸縮させて別の配置にもできる。バルコニー40席と平土間125席を足して最大1004席（公式サイトは最大1200人と案内。構成で変わる）。後舞台へは幅7.8mの開口でつながる。",
      reference: "TOHU 公式 https://tohu.ca/ ／ 技術仕様書 Devis Technique Tohu（2020-02-10版）",
      sizes: [variant],
    };
  })();
  VENUES_V2.push(tohuV2);

  const outlineDimensions = (outline) => {
    const xs = outline.map((point) => point[0]);
    const ys = outline.map((point) => point[1]);
    return {
      width: roundM(Math.max(...xs) - Math.min(...xs)),
      depth: roundM(Math.max(...ys) - Math.min(...ys)),
    };
  };

  const legacyAudience = (audience) => {
    if (audience.length === 0) return "none";
    const sides = new Set(audience.map((area) => area.side));
    if (sides.has("round")) return "round";
    if (sides.has("front") && sides.has("left") && sides.has("right")) return "three";
    return "front";
  };

  const legacySize = (size) => {
    const dimensions = outlineDimensions(size.floor.outline);
    const result = { id: size.id, label: size.label };
    if (typeof size.ringM === "number") result.ring = size.ringM;
    result.width = dimensions.width;
    result.depth = dimensions.depth;
    result.height = size.ceiling.heightM;
    if (typeof size.capacity.seats === "number") result.seats = size.capacity.seats;
    if (typeof size.capacity.crowd === "number") result.crowd = size.capacity.crowd;
    return result;
  };

  const VENUES = VENUES_V2.map((venue) => ({
    id: venue.id,
    label: venue.label,
    short: venue.short,
    note: venue.note,
    audience: legacyAudience(venue.audience),
    frame: venue.fixtures.some((fixture) => fixture.type === "wall" && fixture.frame === true),
    sizes: venue.sizes.map(legacySize),
    source: venue.reference,
    // 実在会場は平面図で長方形ではなく実際の輪郭を描く（custom は使わない。
    // custom にすると正面図が近似席の描画へ落ちるため、輪郭だけを渡す）
    ...(venue.realVenue ? {
      realVenue: true,
      outline: clone(venue.floor.outline),
      audienceAreas: clone(venue.audience),
      gridM: venue.ceiling.gridM,
      backWall: clone(venue.backWall || []),
    } : {}),
  }));

  const validPoint = (point) => Array.isArray(point) && point.length === 2 &&
    point.every((value) => typeof value === "number" && Number.isFinite(value));

  const normalizeLibraryVenue = (raw) => {
    if (!raw || raw.format !== "venue-v2" || typeof raw.id !== "string" ||
        !raw.id.trim() || typeof raw.label !== "string" || !raw.label.trim() ||
        !raw.floor || !Array.isArray(raw.floor.outline) ||
        raw.floor.outline.length < 3 || !raw.floor.outline.every(validPoint)) return null;
    const venue = clone(raw);
    venue.id = venue.id.trim().slice(0, 100);
    venue.label = venue.label.trim().slice(0, 100);
    venue.basis = typeof venue.basis === "string" ? venue.basis : "custom";
    venue.scale = venue.scale && typeof venue.scale === "object"
      ? venue.scale : { gridM: 1, confidence: "approx" };
    venue.floor.levels = Array.isArray(venue.floor.levels) ? venue.floor.levels : [];
    venue.ceiling = venue.ceiling && typeof venue.ceiling === "object"
      ? venue.ceiling : { heightM: 6, rigging: "none", note: "高さ・吊り条件は要確認。" };
    venue.audience = Array.isArray(venue.audience)
      ? venue.audience.filter((area) => area && Array.isArray(area.polygon) &&
        area.polygon.length >= 3 && area.polygon.every(validPoint))
      : [];
    venue.fixtures = Array.isArray(venue.fixtures) ? venue.fixtures : [];
    venue.access = Array.isArray(venue.access) ? venue.access : [];
    const provenance = venue.provenance && typeof venue.provenance === "object"
      ? venue.provenance : {};
    const sources = ["実測", "図面", "写真", "記憶"];
    const confidences = ["high", "mid", "low"];
    const sharing = ["ok", "internal-only"];
    venue.provenance = {
      source: sources.includes(provenance.source) ? provenance.source : "記憶",
      confidence: confidences.includes(provenance.confidence) ? provenance.confidence : "low",
      sharing: sharing.includes(provenance.sharing) ? provenance.sharing : "ok",
    };
    if (typeof provenance.note === "string" && provenance.note.trim()) {
      venue.provenance.note = provenance.note.slice(0, 300);
    }
    return venue;
  };

  /* ファイル取り込みの確認画面で使う、書き込みを伴わない検証。
   * venue-v2 の形は保存時と同じ normalizeLibraryVenue() へ集約し、
   * 発注書で必須になった三寸法だけ、元データが正の有限数かを追加で見る。 */
  const validateLibraryVenue = (raw) => {
    const venue = normalizeLibraryVenue(raw);
    if (!venue) return null;
    const dimensions = outlineDimensions(venue.floor.outline);
    const heightM = raw && raw.ceiling && raw.ceiling.heightM;
    if (!(dimensions.width > 0) || !(dimensions.depth > 0) ||
        typeof heightM !== "number" || !Number.isFinite(heightM) || heightM <= 0) return null;
    return venue;
  };

  const readLibrary = () => {
    try {
      const raw = window.localStorage.getItem(LIBRARY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const venues = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.venues) ? parsed.venues : []);
      return venues.map(normalizeLibraryVenue).filter(Boolean);
    } catch (_) {
      return [];
    }
  };

  const writeLibrary = (venues) => {
    try {
      window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(venues));
      return true;
    } catch (_) {
      return false;
    }
  };

  const nextAvailableId = (requested, occupied) => {
    if (!occupied.has(requested)) return requested;
    let serial = 2;
    while (occupied.has(`${requested}-${serial}`)) serial += 1;
    return `${requested}-${serial}`;
  };

  const notifyLibraryChanged = () => {
    if (typeof window.dispatchEvent !== "function" || typeof window.CustomEvent !== "function") return;
    window.dispatchEvent(new window.CustomEvent("stage-venue-library-changed"));
  };

  const importVenues = (incoming) => {
    const current = readLibrary();
    const occupied = new Set(VENUES_V2.map((venue) => venue.id));
    current.forEach((venue) => occupied.add(venue.id));
    const added = [];
    const idMap = {};
    let skipped = 0;
    (Array.isArray(incoming) ? incoming : []).forEach((raw) => {
      const venue = normalizeLibraryVenue(raw);
      if (!venue) {
        skipped += 1;
        return;
      }
      const originalId = venue.id;
      venue.id = nextAvailableId(originalId, occupied);
      occupied.add(venue.id);
      idMap[originalId] = venue.id;
      current.push(venue);
      added.push(clone(venue));
    });
    if (added.length && !writeLibrary(current)) {
      return { venues: [], idMap: {}, imported: 0, skipped: skipped + added.length, error: "write-failed" };
    }
    if (added.length) notifyLibraryChanged();
    return { venues: added, idMap, imported: added.length, skipped };
  };

  const migrateLegacyDrafts = () => {
    try {
      if (window.localStorage.getItem(LEGACY_MIGRATION_KEY)) return;
      const raw = window.localStorage.getItem(LEGACY_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) importVenues(parsed);
      }
      window.localStorage.setItem(LEGACY_MIGRATION_KEY, "1");
    } catch (_) {
      // 保存が使えない環境でもプリセットは使い続けられる。
    }
  };

  const customLegacyVenue = (venue) => {
    const dimensions = outlineDimensions(venue.floor.outline);
    const height = Number(venue.ceiling && venue.ceiling.heightM);
    return {
      id: venue.id,
      label: venue.label,
      short: "作成会場",
      note: typeof venue.note === "string" ? venue.note : "会場ライブラリに保存した形です。正面図は近似です。",
      audience: venue.audience.length ? "front" : "none",
      frame: false,
      sizes: [{
        id: "custom",
        label: "会場",
        width: dimensions.width,
        depth: dimensions.depth,
        height: Number.isFinite(height) && height > 0 ? height : 6,
      }],
      source: venue.provenance.source,
      custom: true,
      outline: clone(venue.floor.outline),
      audienceAreas: clone(venue.audience),
      venueV2: clone(venue),
    };
  };

  const missingVenue = (id) => {
    const proscenium = VENUES.find((venue) => venue.id === "proscenium");
    const mid = proscenium.sizes.find((size) => size.id === "mid");
    return {
      id,
      label: "（見つからない会場）",
      short: "不明",
      missing: true,
      audience: "front",
      frame: false,
      sizes: [clone(mid)],
      note: "このショーが参照する会場データは、この端末の会場ライブラリにありません。",
      source: "元の会場IDを保ったまま表示しています",
    };
  };

  const venueV2ById = (id) => VENUES_V2.find((venue) => venue.id === id) ||
    readLibrary().find((venue) => venue.id === id) || null;

  const legacyVenueById = (id) => VENUES.find((venue) => venue.id === id) ||
    (() => {
      const custom = readLibrary().find((venue) => venue.id === id);
      return custom ? customLegacyVenue(custom) : missingVenue(id);
    })();

  migrateLegacyDrafts();

  window.SHOSAI_VENUES = {
    get list() { return VENUES.concat(readLibrary().map(customLegacyVenue)); },
    byId: legacyVenueById,
    sizeById: (venue, sizeId) => (venue.sizes.find((s) => s.id === sizeId) || venue.sizes[0]),
    seats: SEATS,
    // 分からない席は先頭（最前列）ではなく中央へ落とす。並びは近い順なので、
    // 先頭を既定にすると初回や壊れた保存でいきなり最前列の絵になってしまう
    seatById: (id) => SEATS.find((s) => s.id === id) || SEATS.find((s) => s.id === "center") || SEATS[0],
    sightLimits: SIGHT_LIMITS,
    outdoorMarks: OUTDOOR_MARKS,
    v2: {
      get list() { return VENUES_V2.concat(readLibrary()); },
      byId: venueV2ById,
    },
    library: {
      storageKey: LIBRARY_KEY,
      legacyStorageKey: LEGACY_DRAFT_KEY,
      list: () => clone(readLibrary()),
      venueV2ById: (id) => {
        const venue = venueV2ById(id);
        return venue ? clone(venue) : null;
      },
      isPreset: (id) => VENUES_V2.some((venue) => venue.id === id),
      validateVenueV2: (raw) => {
        const venue = validateLibraryVenue(raw);
        return venue ? clone(venue) : null;
      },
      importVenues,
      exportDocument: () => ({
        kind: "shosai-stage-venue-library",
        version: 1,
        venues: clone(readLibrary()),
      }),
    },
  };
})();

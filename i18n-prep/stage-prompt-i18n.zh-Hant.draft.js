/* ピッチ生成条件（stage-prompt-i18n.js）への繁体字中国語ブロック（ドラフト）
 *
 * 作成: 2026-08-28（Claude）。まだアプリからは読み込まれない準備物。
 *
 * ■ 使い方（実装時）
 *   stage-prompt-i18n.js の各表（HEAD / STYLE / SIDE / DEPTH / VENUE / POSE / PIECE /
 *   LIGHT_KIND / LIGHT_NOTE / INTENT）へ、下の "zhHant" の中身を鍵 "zh-Hant" として足す。
 *   LANGS は次のとおり拡張を提案:
 *     { code: "zh",      label: "中文（简体）" },   // 既存 zh のラベルだけ変更
 *     { code: "zh-Hant", label: "中文（繁體）" },   // 追加
 *   既存の保存データは code "zh" のままなので互換は壊れない。
 *
 * ■ 既存訳への修正提案（このファイルは触っていない。実装時に判断）
 *   1. zh の LIGHT_KIND.floor「地排光（地面光）」→「流动光（地面侧光）」へ。
 *      地排光はホリゾント下端列の専用語で、転がし全般には流动光が正しい
 *      （大陸の灯位資料で確認。NEEDS_REVIEW zh "lightKind.floor" はこれで解消できる）。
 *      LIGHT_NOTE.floor は「流动灯从地面向上打在身体上」へ。
 *   2. fr の LIGHT_NOTE.hang「depuis la perche」は「depuis la porteuse」がより現場的
 *      （porteuse=吊りバトンの定訳。Odéon用語集で確認）。どちらでも通じるため任意。
 *
 * ■ 左右の書き方はファイル冒頭の方針どおり「観客から見て左／右」で統一（舞台用語を使わない）。
 */
(function () {
  "use strict";

  const zhHant = {
    head: {
      style: "畫面風格", venue: "場地", camera: "鏡頭", stage: "舞台上",
      light: "光", avoid: "不要出現",
      performers: "演員", sets: "裝置",
      objective: "希望在觀眾身上發生什麼", focus: "觀眾看向哪裡",
      layerPerformer: "演員", layerBackground: "背景", layerSpace: "空間",
      mood: "氛圍", colors: "燈光顏色",
      ownWords: "以下是導演本人的原話（日文原文）。請尊重這一意圖。",
      camera1: "從觀眾席正面看到的一個畫面。視線高度約1.2米。整個舞台入鏡。16:9。",
      avoid1: "文字、標誌、字幕、浮水印、觀眾的面孔，以及此處未描述的任何人或物。",
      refNote: "註：請將與本文一同匯出的PNG作為參考圖。人數、站位和比例以參考圖為準。",
      seenFromHouse: "從觀眾席看",
    },
    style: {
      theatre: "舞台攝影。從觀眾席看到的昏暗劇場。演員以剪影和輪廓光呈現，地面上有一道光和它的反射。",
      paper: "舞台美術的概念草圖。紙上水墨與淡彩。可以保留起稿的線條。",
      poster: "演出海報的主圖。中央一個畫面，四周留白。不要文字。",
      render: "照片級3D算圖。像在真實劇場拍攝的質感、景深、物理正確的照明。嚴格遵照參考圖的構圖、人數、站位和比例。",
    },
    side: {
      left: "從觀眾席看的左側", center: "中央", right: "從觀眾席看的右側",
    },
    depth: {
      back: "舞台深處", mid: "舞台中段", front: "舞台前緣附近",
    },
    venue: {
      proscenium: "鏡框式舞台的劇場",
      thrust: "三面被觀眾席圍繞的伸出式舞台",
      arena: "觀眾席環繞一周的馬戲帳篷",
      outdoor: "戶外臨時舞台",
      blackbox: "黑盒子劇場，觀眾席位置可變",
    },
    pose: {
      stand: "站立", walk: "行走中", reach: "雙臂高舉", open: "雙臂張開",
      sit: "坐著", crouch: "蹲著", kneel: "單膝跪地", handstand: "倒立",
      floorsit: "抱膝而坐", agura: "盤腿坐", seiza: "正坐（跪坐）", longsit: "伸腿而坐",
      hizadachi: "雙膝跪立", yankee: "深蹲", allfours: "四肢著地", dogeza: "俯身叩首，額頭觸地",
      run: "奔跑中", backflip: "後手翻中", hat: "戴著帽子",
      sideflip: "側空翻中",
      sing: "手持麥克風演唱", juggle: "拋接雜耍中", guitar: "彈吉他", trumpet: "吹小號",
      dance1: "舞蹈，雙臂上舉", dance2: "舞蹈，前弓步", dance3: "舞蹈，低身舒展",
      dance4: "舞蹈，騰空中", dance5: "舞蹈，身體扭轉",
      windmill: "風車（windmill）動作中", skate: "穿著輪式溜冰鞋", unicycle: "騎獨輪車",
      skateboard: "踩滑板", bicycle: "騎腳踏車",
      cyr: "在Cyr輪（大環）中", tuck: "團身空翻中",
      lie: "俯臥", supine: "仰臥", sidelie: "側臥",
      trapeze_sit: "坐在鞦韆橫桿上", trapeze_hang: "懸掛在鞦韆橫桿上",
    },
    piece: {
      performer: "演員", block: "台面平台（台箱）", table: "桌子", chair: "椅子", bench: "長凳",
      stool: "圓凳", wall: "景片", sphere: "球體", prop: "小道具",
      trapeze: "從吊桿垂下的高空鞦韆", cyrwheel: "Cyr輪（大環）", diabolo: "扯鈴", pole: "中國竿",
      teeter: "蹺蹺板（韓式跳板）", tissue: "從吊桿垂下的綢吊", wire: "鋼索（走鋼索用）",
      suitcase: "行李箱", trampoline: "彈翻床", cane: "倒立桿",
      car: "汽車", seri: "舞台升降台", light: "燈具", model: "自行搭建的組合裝置",
      revolve: "旋轉舞台（轉台）", deck: "可移動或傾斜的平台", curtain: "布幕", pool: "水池，或可移動的水池地面",
    },
    lightKind: {
      hang: "頂光", ss: "側光", front: "面光", floor: "地面側光（落地燈）",
    },
    lightNote: {
      hang: "從吊桿垂直落下", ss: "從側台橫穿舞台", front: "從觀眾席上方打在臉上", floor: "從地面向上打在身體上",
    },
    intent: {
      reveal: "清楚地顯現", soften: "柔化", conceal: "隱去", silhouette: "只留輪廓",
      separate: "與背景分離", transform: "看起來像別的東西", unspecified: "未指定",
    },
  };

  /* 実装時に stage-prompt-i18n.js の NEEDS_REVIEW へ足す繁体字分（現地確認まで使い切らない） */
  const NEEDS_REVIEW_ZH_HANT = [
    "piece.cyrwheel",  // Cyr輪／大環——台湾サーカス界（FOCA等）での通りを確認
    "piece.teeter",    // 蹺蹺板／韓式跳板——現場の呼び方
    "piece.pole",      // 中國竿／爬竿
    "piece.tissue",    // 綢吊／空中絲帶
    "piece.block",     // 台面平台（台箱）——箱馬相当の現場語
    "lightKind.floor", // 地面側光——台湾の現場語
    "pose.windmill",   // ブレイキン技名の呼び方
  ];

  window.SHOSAI_PROMPT_I18N_DRAFT_ZH_HANT = Object.freeze({
    langCode: "zh-Hant",
    langLabel: "中文（繁體）",
    tables: zhHant,
    needsReview: NEEDS_REVIEW_ZH_HANT,
  });
})();

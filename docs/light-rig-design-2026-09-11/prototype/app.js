/* 「照明デザインモード」試作 — UIと描画（判断用。製品コードではない）
 * 旧称「照明を組む」（2026-09-13 本人決定で改名。設計記録 docs/light-rig-design-2026-09-11/ は旧称のまま）
 * 仕様の根拠: ../codex-round2.answer.md（3列 196/636/292、正面図常時表示、配置と動きの2モード、
 * クリック配置と吸着予告、組の5つの動き、未設定/消灯/点灯の区別、未適用と適用）。
 * 幾何は rig-engine.js（純関数）。ここは状態・操作・描画だけ。 */
(function () {
  "use strict";
  const E = window.RIG_ENGINE;
  const $ = (id) => document.getElementById(id);

  /* ---------- 状態 ---------- */
  /* 幕・ホリゾントの見本（2026-09-13 本人要望で移植）。前幕は開いていても（open:100）
     束ねた布が両袖に残るので消えない——drop/cycだけが全開で消える（curtainParts の仕様どおり）。
     w は舞台幅に対する割合（0.5=半幅、1=舞台と同じ幅）。舞台の大きさを変えても追従する。 */
  const DEFAULT_CURTAINS = [
    /* 前幕は本来ちょうど間口いっぱい〜少し広いが、w を広げすぎると束ねた布（全開時も残る）が
       舞台の外＝図の外へ出てしまう（実測で発覚。18m幅で試したら平面図の外に落ちた）。
       図の中に収まる 1.0（間口と同じ幅）にしてある。 */
    { id: "cur-front", kind: "curtain", name: "前幕", curtainKind: "front", u: 0.5, v: 0.97, w: 1.0, hM: 7.5, open: 100, color: "#000000", facing: 0 },
    // 色は本体の既定と同じ（stage-machinery.js:193 は幕の種類を問わず同じ既定色を使う）
    { id: "cur-cyc", kind: "curtain", name: "ホリゾント幕", curtainKind: "cyc", u: 0.5, v: 0.04, w: 1.04, hM: 6.5, open: 0, color: "#000000", facing: 0 },
  ];
  /* 袖幕は下の maskingPieces() で作る。
     2026-09-13 本人指摘「舞台袖の膜の方向がおかしい／演者が切れる」で作り直した。
     本体（stage-machinery.js の leg）は facing 90 ＝ 奥行き方向に走る壁として持っている。
     これを3Dで塗ると、壁の奥の端と手前の端が画面の別の位置へ写るので<b>幅のある帯</b>になり、
     その帯の中に立っている演者（舞台の隅）が隠れてしまう（実測: 帯は画面X 197〜259、
     ジンは246＝帯の中。奥行きの前後を見ないで塗るため、内側にいる人まで覆う）。
     実際の袖幕は客席と平行に吊る平らな幕で、客席からは両端の細い縦帯に見える。
     その形にすると帯が舞台の外側だけになり、演者を横切らない。 */
  /* 一文字幕（いちもんじまく）。バトンごとに、その少し手前へ吊って灯体とバトンを客席から隠す幕。
     仕込んだバトンから自動で作るので、データには持たない（バトンを足せば一文字も増える）。
     2026-09-13 本人要望で追加。既定は出さない——出すと灯体が隠れて設計しにくいため、
     「客席から見えていないか」を確かめたいときだけ出す。 */
  /* バトン1本ぶんの一文字幕の寸法。上書きが無ければ、そのバトンの高さと既定の丈から決める
     （バトンを上げ下げすれば一文字も付いてくる）。1枚でも触ると、その枚だけ上書きが入る。 */
  function borderSetting(t) {
    const c = state.curtains, o = (c.perBorder && c.perBorder[t.id]) || {};
    const drop = E.clamp(E.finite(o.dropM, E.finite(c.borderDrop, 1.4)), 0.3, 6);
    const bottom = E.clamp(E.finite(o.bottomM, Math.max(0, E.finite(t.h, 6) - drop)), 0, state.dims.H);
    return { drop, bottom, 既定のまま: o.dropM == null && o.bottomM == null };
  }
  const setBorder = (t, patch) => {
    const c = state.curtains; if (!c.perBorder) c.perBorder = {};
    c.perBorder[t.id] = { ...borderSettingRaw(t), ...patch };
  };
  const borderSettingRaw = (t) => { const b = borderSetting(t); return { bottomM: b.bottom, dropM: b.drop }; };

  /* 袖幕。客席と平行に吊る平らな幕を、舞台の外側から内側へ legU ぶん入り込ませる。
     いちばん手前（舞台の前端）に左右1対だけ置く。床から舞台の上端まで。

     2026-09-13 本人指摘「2枚目の袖幕が宙に浮いて内側に入ってくる」への対応で1対にした。
     当初はバトンごとに1対ずつ出していたが、3Dでは
       ・奥の幕ほど床の線が画面で上がるので、前の床から浮いて見える
       ・奥ほど遠近で幅が縮むので、同じ位置に吊っても内側へ食い込んで見える
     という2つが同時に起きる。実際の舞台では、奥の袖幕は手前の袖幕の陰に入って客席からは
     見えない（そう見えるように奥ほど外へずらして吊る）ので、手前の1対だけを描けば足りる。 */
  function legPieces() {
    const d = state.dims, c = state.curtains;
    const inU = E.clamp(E.finite(c.legU, 0.08), 0, 0.35);
    const outU = 0.12;                        // 舞台の外側へどれだけはみ出させるか（袖の奥を隠すぶん）
    const w = inU + outU;
    return [-1, 1].map((side) => ({
      id: `leg-${side}`, kind: "curtain", curtainKind: "border",
      name: side < 0 ? "下手袖幕" : "上手袖幕",
      u: side < 0 ? (inU - outU) / 2 : 1 - (inU - outU) / 2,
      v: 1, w, hM: d.H, liftM: 0, open: 0, color: "#000000", facing: 0,
    }));
  }

  function borderPieces() {
    const d = state.dims, c = state.curtains;
    const legs = legPieces();                 // 袖幕は舞台の造りなので、一文字のトグルに関わらず出す
    if (!showOn("border")) return legs;
    const ahead = E.clamp(E.finite(c.borderAhead, 0.04), 0, 0.3);
    const list = legs.concat(state.rig.trusses.map((t, i) => {
      const b = borderSetting(t);
      return {
        id: `border-${t.id}`, kind: "curtain", name: i === 0 ? "一文字幕" : "", curtainKind: "border",
        u: 0.5, v: E.clamp(E.finite(t.v, 0.5) + ahead, 0, 1), w: 1.02,
        hM: b.drop, liftM: b.bottom,
        open: 0, color: "#000000", facing: 0,
      };
    }));
    /* 前一文字＝いちばん客席側の幕（プロセニアムの上辺）。客席から見える開口の高さを決めるのは
       これで、ここより上は客席からは見えない。舞台の上端まで届く布なので丈は H - 開口の高さ。
       2026-09-13 本人要望「一番客席側の膜も表現したい／光源が見えない状況を作りたい」。 */
    if (c.pros !== false) {
      const h0 = E.clamp(E.finite(c.prosH, 6.2), 1, d.H);
      list.push({ id: "border-pros", kind: "curtain", name: "前一文字", curtainKind: "border",
        u: 0.5, v: 1, w: 1.02, hM: Math.max(0.2, d.H - h0), liftM: h0,
        open: 0, color: "#000000", facing: 0, solid: true });
    }
    return list;
  }
  const state = {
    mode: "move",                      // "place" | "move"。既定は照明デザイン（2026-09-13 本人指定。こちらを使う頻度が高い）
    dims: { W: 12, D: 8, H: 8 },       // 舞台の幅・奥行き・高さ（m）。右の「舞台の大きさ」で変えられる
    rig: { trusses: [], fixtures: [] },
    /* pieces は「舞台スケッチ側ですでに置かれている演者・セット」。
       製品では本体の scene.pieces をそのまま読む（このアプリからは変えない・読むだけ）。
       試作では、光の当たり方を確かめられるように仮の配置を入れてある（2026-09-11 本人要望）。
       持つのは 左右u・奥行きv・高さ(m)・名前・種類・向き・色・姿勢（演者のみ）。
       演者の色 color は本体 paintBody() が元から受け取れる引数で、試作側の drawPiecesUp も
       pc.color を読んでいた（未使用だったのはこの見本データに値が無かっただけ）。
       衣装・髪は本体側にまだ描画がない（TOP_KINDS/BOTTOM_KINDS/HAIR_STYLES の shells/parts が
       空＝データの器だけで、paintBody() も look 引数を受け取るが中で使っていない。段階0のまま）。
       移植できるのは実在する描画だけなので、ここでは持ち込まない（2026-09-13 本人要望への回答）。
       幕・ホリゾントは stage-machinery.js の machineryParts() curtain分岐を移植（rig-engine.js
       curtainParts）。前幕とホリゾント幕の2枚を見本として置く。
       演者・配置・姿勢は舞台スケッチ本体に同梱の見本ショー「見本: 八人のサーカス」
       （stage-samples/index.js の eightCircus, id: sample-eight-circus-v1）をそのまま移植した
       （2026-09-13 本人指摘。当初は自作の仮データを使っていたが、実在する見本があった）。
       8場面・8人（ミナ/リク/カイ/ソラ/ノア/ジン/ユキ/レン）・台/チャイニーズポール/トラピーズを
       そのシーンで使うぶんだけ入れてある。姿勢・色・身長(cm→m)・向きは出典の値そのまま。 */
    scenes: [
      { id: "s1", name: "1 オープニング", cue: { lights: {}, groups: [] }, pieces: [
        { id: "p-mina", kind: "performer", name: "ミナ", u: 0.5, v: 0.72, hM: 1.68, pose: "stand", facing: 0, color: "#a84b26" },
        { id: "p-riku", kind: "performer", name: "リク", u: 0.36, v: 0.7, hM: 1.76, pose: "stand", facing: 0, color: "#77865f" },
        { id: "p-kai", kind: "performer", name: "カイ", u: 0.64, v: 0.7, hM: 1.71, pose: "stand", facing: 0, color: "#9c823f" },
        { id: "p-sora", kind: "performer", name: "ソラ", u: 0.24, v: 0.66, hM: 1.58, pose: "stand", facing: 0, color: "#6d6657" },
        { id: "p-noa", kind: "performer", name: "ノア", u: 0.76, v: 0.66, hM: 1.63, pose: "stand", facing: 0, color: "#a84b26" },
        { id: "p-jin", kind: "performer", name: "ジン", u: 0.14, v: 0.62, hM: 1.82, pose: "stand", facing: 0, color: "#77865f" },
        { id: "p-yuki", kind: "performer", name: "ユキ", u: 0.86, v: 0.62, hM: 1.55, pose: "stand", facing: 0, color: "#9c823f" },
        { id: "p-ren", kind: "performer", name: "レン", u: 0.5, v: 0.58, hM: 1.74, pose: "reach", facing: 0, color: "#6d6657" },
        { id: "set-deck", kind: "set", name: "台", u: 0.5, v: 0.24, hM: 0.5 },
        ...DEFAULT_CURTAINS,
      ] },
      { id: "s2", name: "2 演目・シルホイール", cue: { lights: {}, groups: [] }, pieces: [
        { id: "p-mina", kind: "performer", name: "ミナ", u: 0.16, v: 0.62, hM: 1.68, pose: "cyr", facing: 0, color: "#a84b26" },
        { id: "p-riku", kind: "performer", name: "リク", u: 0.06, v: 0.34, hM: 1.76, pose: "stand", facing: 0, color: "#77865f" },
        { id: "p-kai", kind: "performer", name: "カイ", u: 0.94, v: 0.34, hM: 1.71, pose: "stand", facing: 0, color: "#9c823f" },
        { id: "set-deck", kind: "set", name: "台", u: 0.5, v: 0.24, hM: 0.5 },
        ...DEFAULT_CURTAINS,
      ] },
      { id: "s3", name: "3 演目・チャイニーズポール", cue: { lights: {}, groups: [] }, pieces: [
        { id: "p-mina", kind: "performer", name: "ミナ", u: 0.9, v: 0.64, hM: 1.68, pose: "cyr", facing: 20, color: "#a84b26" },
        { id: "p-jin", kind: "performer", name: "ジン", u: 0.42, v: 0.34, hM: 1.82, pose: "reach", facing: 0, color: "#77865f" },
        { id: "p-riku", kind: "performer", name: "リク", u: 0.06, v: 0.34, hM: 1.76, pose: "stand", facing: 0, color: "#77865f" },
        { id: "p-kai", kind: "performer", name: "カイ", u: 0.94, v: 0.34, hM: 1.71, pose: "stand", facing: 0, color: "#9c823f" },
        { id: "set-deck", kind: "set", name: "台", u: 0.5, v: 0.24, hM: 0.5 },
        { id: "set-pole", kind: "set", name: "チャイニーズポール", u: 0.42, v: 0.34, hM: 6 },
        ...DEFAULT_CURTAINS,
      ] },
      { id: "s4", name: "4 トランジション", cue: { lights: {}, groups: [] }, pieces: [
        { id: "p-sora", kind: "performer", name: "ソラ", u: 0.1, v: 0.8, hM: 1.58, pose: "run", facing: 90, color: "#6d6657" },
        { id: "p-noa", kind: "performer", name: "ノア", u: 0.9, v: 0.8, hM: 1.63, pose: "run", facing: 270, color: "#a84b26" },
        { id: "p-yuki", kind: "performer", name: "ユキ", u: 0.1, v: 0.5, hM: 1.55, pose: "walk", facing: 90, color: "#9c823f" },
        { id: "p-ren", kind: "performer", name: "レン", u: 0.9, v: 0.5, hM: 1.74, pose: "walk", facing: 270, color: "#6d6657" },
        { id: "p-jin", kind: "performer", name: "ジン", u: 0.42, v: 0.34, hM: 1.82, pose: "stand", facing: 0, color: "#77865f" },
        { id: "set-deck", kind: "set", name: "台", u: 0.5, v: 0.24, hM: 0.5 },
        { id: "set-pole", kind: "set", name: "チャイニーズポール", u: 0.42, v: 0.34, hM: 6 },
        ...DEFAULT_CURTAINS,
      ] },
      { id: "s5", name: "5 演劇パート", cue: { lights: {}, groups: [] }, pieces: [
        { id: "p-ren", kind: "performer", name: "レン", u: 0.5, v: 0.24, hM: 1.74, pose: "sing", facing: 0, color: "#6d6657" },
        { id: "p-sora", kind: "performer", name: "ソラ", u: 0.62, v: 0.68, hM: 1.58, pose: "kneel", facing: 300, color: "#6d6657" },
        { id: "set-deck", kind: "set", name: "台", u: 0.5, v: 0.24, hM: 0.5 },
        { id: "set-pole", kind: "set", name: "チャイニーズポール", u: 0.42, v: 0.34, hM: 6 },
        ...DEFAULT_CURTAINS,
      ] },
      { id: "s6", name: "6 演目・トラピーズ", cue: { lights: {}, groups: [] }, pieces: [
        { id: "p-yuki", kind: "performer", name: "ユキ", u: 0.58, v: 0.4, hM: 1.55, pose: "reach", facing: 0, color: "#9c823f" },
        { id: "p-sora", kind: "performer", name: "ソラ", u: 0.3, v: 0.72, hM: 1.58, pose: "stand", facing: 45, color: "#6d6657" },
        { id: "p-ren", kind: "performer", name: "レン", u: 0.06, v: 0.3, hM: 1.74, pose: "stand", facing: 0, color: "#6d6657" },
        { id: "set-trap", kind: "set", name: "トラピーズ", u: 0.58, v: 0.4, hM: 4.26 },
        ...DEFAULT_CURTAINS,
      ] },
      { id: "s7", name: "7 演目・群舞", cue: { lights: {}, groups: [] }, pieces: [
        { id: "p-mina", kind: "performer", name: "ミナ", u: 0.3, v: 0.62, hM: 1.68, pose: "dance1", facing: 0, color: "#a84b26" },
        { id: "p-riku", kind: "performer", name: "リク", u: 0.46, v: 0.7, hM: 1.76, pose: "dance2", facing: 0, color: "#77865f" },
        { id: "p-kai", kind: "performer", name: "カイ", u: 0.62, v: 0.6, hM: 1.71, pose: "dance4", facing: 0, color: "#9c823f" },
        { id: "p-sora", kind: "performer", name: "ソラ", u: 0.2, v: 0.44, hM: 1.58, pose: "dance3", facing: 0, color: "#6d6657" },
        { id: "p-noa", kind: "performer", name: "ノア", u: 0.78, v: 0.46, hM: 1.63, pose: "dance5", facing: 0, color: "#a84b26" },
        { id: "p-jin", kind: "performer", name: "ジン", u: 0.7, v: 0.76, hM: 1.82, pose: "dance1", facing: 0, color: "#77865f" },
        { id: "p-yuki", kind: "performer", name: "ユキ", u: 0.38, v: 0.42, hM: 1.55, pose: "dance4", facing: 0, color: "#9c823f" },
        { id: "p-ren", kind: "performer", name: "レン", u: 0.86, v: 0.66, hM: 1.74, pose: "dance2", facing: 0, color: "#6d6657" },
        { id: "set-deck", kind: "set", name: "台", u: 0.5, v: 0.22, hM: 0.5 },
        ...DEFAULT_CURTAINS,
      ] },
      { id: "s8", name: "8 エンディング・楽器", cue: { lights: {}, groups: [] }, pieces: [
        { id: "p-jin", kind: "performer", name: "ジン", u: 0.44, v: 0.24, hM: 1.82, pose: "trumpet", facing: 0, color: "#77865f" },
        { id: "p-ren", kind: "performer", name: "レン", u: 0.58, v: 0.24, hM: 1.74, pose: "guitar", facing: 0, color: "#6d6657" },
        { id: "p-mina", kind: "performer", name: "ミナ", u: 0.28, v: 0.6, hM: 1.68, pose: "sit", facing: 20, color: "#a84b26" },
        { id: "p-riku", kind: "performer", name: "リク", u: 0.42, v: 0.66, hM: 1.76, pose: "sit", facing: 10, color: "#77865f" },
        { id: "p-kai", kind: "performer", name: "カイ", u: 0.58, v: 0.66, hM: 1.71, pose: "sit", facing: 350, color: "#9c823f" },
        { id: "p-sora", kind: "performer", name: "ソラ", u: 0.72, v: 0.6, hM: 1.58, pose: "sit", facing: 340, color: "#6d6657" },
        { id: "p-noa", kind: "performer", name: "ノア", u: 0.2, v: 0.5, hM: 1.63, pose: "sit", facing: 30, color: "#a84b26" },
        { id: "p-yuki", kind: "performer", name: "ユキ", u: 0.8, v: 0.5, hM: 1.55, pose: "sit", facing: 330, color: "#9c823f" },
        { id: "set-deck", kind: "set", name: "台", u: 0.5, v: 0.24, hM: 0.5 },
        ...DEFAULT_CURTAINS,
      ] },
    ],
    sceneIndex: 0,
    sel: new Set(), selTruss: null,
    tool: null,                        // null | "truss" | "fixture" | "floor" | "side"
    play: { on: false, t: 0, last: 0, raf: 0 },
    dirty: false, history: [], future: [],
    nextNo: 1, seq: 1,
    designName: "",                    // いま編集している照明デザインの名前（保存で付ける）
    /* 幕の寸法（2026-09-13 本人要望で調整できるようにした）。
       客席から光源（灯体）が見えないかを確かめるための値なので、舞台ごとに変わる＝
       rig と同じショー共通の持ち物として保存・Undoの対象にする。
         borderDrop  一文字幕の丈（m）。バトンの下端からどれだけ垂らすか
         borderAhead 一文字幕をバトンのどれだけ手前に吊るか（奥行きの割合）
         pros        前一文字（いちばん客席側の幕）を出すか
         prosH       その下端＝客席から見える開口の高さ（m）。これより上は客席から見えない
         legU        袖幕を両端からどれだけ内側へ入れるか（左右の割合）
         perBorder   一文字幕ごとの上書き { バトンid: {bottomM, dropM} }。
                     入っていないバトンは、そのバトンの高さと既定の丈から自動で決まる
                     （2026-09-13 本人要望「一文字幕ごとに調整したい」）。
                     実際の舞台でも一文字は1枚ずつ高さを決める（客席の視線に合わせて前ほど低く吊る）。 */
    curtains: { borderDrop: 1.4, borderAhead: 0.04, pros: true, prosH: 6.2, legU: 0.08, perBorder: {} },
    /* 作った色。ショー全体で共通なので、どの灯からもワンタッチで使える（2026-09-11 本人要望）。
       配置と同じくショー共通の持ち物なので、rig と一緒に保存・Undoの対象にする。 */
    palette: [],
    hover: null, drag: null,
    collapsed: new Set(), filter: "all",   // 一覧: 取り付け場所ごとの折り畳みと絞り込み（20灯以上向け）
    snap: false,                           // 1mのグリッドに合わせて置く・動かす（本人要望 2026-09-11）
    placeOpen: false,                      // 左パネル上部の「配置」を開いているか（既定は畳む）
    show: { no: true, fixtures: true, beam: true, path: true, grid: true, pieces: true, border: false, blackout: false },
    /* 作業灯をどれだけ消すか（0〜100%）。100で真っ暗、0で消さないのと同じ
       （2026-09-13 本人要望「押したら全部消えてしまうので、どれくらい消すか決めたい」）。
       図の見え方の設定なので show と同じくUndoの対象にはしない。 */
    dim: 100,
    /* 強さ（調光）の効き方。灯ごとの数値（0〜100%）は目盛りどおりのリニアで、
       その数値が「見える明るさ」へどう効くかだけをこのカーブで決める
       （音楽のベロシティカーブと同じ考え方。2026-09-13 本人要望）。
       アプリ全体で1本だけ持つ共通の設定なので、灯ごとにも場面ごとにも変わらない。
       値は入力0〜1を等間隔に切った LEVEL_CURVE_STEPS+1 個の出力（0〜1）。既定はリニア。
       作った色（palette）と同じく<b>ショー共通の持ち物</b>として扱うので、rig・scenes と一緒に
       保存・Undoの対象にする（2026-09-13 本人決定）。 */
    levelCurve: null,                  // 初期化は下の resetLevelCurve()
    front3d: false,                    // 客席から見る図を擬似パース（本体の正面図と同じ式）で描く
    /* 3Dで最初に見せる席。2026-09-13 本人決定で2階席。見下ろすので立ち位置の関係が読みやすく、
       灯の当たり先を確かめる最初の1枚に向く（製品 stage-sketch.js の既定は "center"）。
       選択肢の既定（index.html の selected）と必ずそろえること。 */
    seat: "balcony",
    search: "",
    copiedPath: null,   // 動きのコピー（灯から灯へ写す。2026-09-12 本人要望）
    /* サーチライト＝複数のムービングを空へ振る定番の見せ方。選んで、数値を決めて、一撃で当てる。
       ここに持つのは「次に当てる値」で、当てた結果は各灯の light に入る（2026-09-12 本人要望）。 */
    /* 狙う高さ hM は未指定なら取り付け方から決める（吊り・前明かり・SS＝床／転がし＝天井際）。
       vv は狙う奥行き（0=最奥・1=最前）。どちらも当てたあとに直せる＝それが軌道の変え方になる。 */
    sl: { form: "sweep", span: 0.8, hM: null, vv: 0.4, periodSec: 6, beamDeg: 8, stepSec: 0.5, easing: "linear" },
    slLive: "",         // 直近にサーチライトを当てた灯の並び（同じ顔ぶれの間はつまみが即反映される）
    slGrad: { from: "#7ab8ff", to: "#ff7a5c" },   // 1灯ずつ色をずらす（グラデーション）の2色（2026-09-12 本人要望）
    /* 「動きの型」欄はアコーディオンで畳んでおく（2026-09-13 本人要望）。
       組の動きはサーチライトと同じ「複数ムービングの動かし方」の欄へ統合した。 */
    slOpen: { search: false, group: false },
    exporting: false,
  };
  const SPEED_SEC = { slow: 4, normal: 2, fast: 1 };
  E.SPEED_PERIOD_MS && Object.assign(E.SPEED_PERIOD_MS, {}); // 参照のみ
  const periodMs = (light) => (SPEED_SEC[light && light.speed] || 2) * 1000;
  const COLORS = ["#f2ead6", "#ffd27a", "#ff7a5c", "#7ab8ff", "#8be08b", "#d98cf0"];
  // 色の補間（1灯ずつ色をずらす＝グラデーション用。2026-09-12 本人要望）。16進 → rgb → 線形補間 → 16進
  const hexToRgb = (hex) => { const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "") || []; return [1, 2, 3].map((i) => parseInt(m[i] || "ff", 16)); };
  const rgbToHex = (rgb) => "#" + rgb.map((v) => Math.round(E.clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
  const lerpColor = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };

  /* 1mグリッドへの吸着。u・vは正規化座標なので、いったん実寸(m)へ直して丸め、また割合へ戻す。
     舞台の幅・奥行きが整数mでない場合も、端を越えないようにクランプする。 */
  const snapU = (u) => (state.snap ? E.clamp((Math.round((u - 0.5) * state.dims.W) / state.dims.W) + 0.5, 0, 1) : u);
  const snapV = (v) => (state.snap ? E.clamp(Math.round(v * state.dims.D) / state.dims.D, 0, 1) : v);
  const snapH = (h) => (state.snap ? E.clamp(Math.round(h), 0, state.dims.H) : h);
  const scene = () => state.scenes[state.sceneIndex];
  const cue = () => scene().cue;
  const lightOf = (fid) => cue().lights[fid] || null;
  const fixtureById = (id) => state.rig.fixtures.find((f) => f.id === id) || null;
  const groupOf = (fid) => cue().groups.find((g) => g.members.includes(fid)) || null;
  const uid = (p) => `${p}${state.seq++}`;

  /* ---------- 履歴（モーダル内Undo） ---------- */
  const snapshot = () => JSON.stringify({ rig: state.rig, scenes: state.scenes, palette: state.palette, levelCurve: state.levelCurve, curtains: state.curtains });
  /* いま画面に出ている状態（＝最後に commit した時点）の控え。
     履歴へ積みたいのは「変更<b>前</b>」の状態だが、commit は変更が済んだ後に呼ばれるので、
     その時点から変更前を作り直せない。そこで直前の状態をここに1つ持っておく。
     2026-09-13 修正: これが無く「変更<b>後</b>」を積んでいたため、1回目の「元に戻す」が
     いまと同じ状態の復元になり、以降もずっと1手ぶんずれていた（色を変えて押しても戻らない）。 */
  let baseline = snapshot();
  function commit(label) {
    state.history.push(baseline);      // 変更前を記録する
    if (state.history.length > 100) state.history.shift();
    baseline = snapshot();             // ここからが次の「変更前」
    state.future.length = 0;
    state.dirty = true;
    if (label) toast(label, "元に戻す", undo);
    renderAll();
  }
  function restore(json) {
    const o = JSON.parse(json);
    state.rig = o.rig; state.scenes = o.scenes; if (o.palette) state.palette = o.palette;
    // 強さの効き方。目盛りの数が合うものだけ受け取る（古い記録には無い＝そのときはリニアのまま）
    if (Array.isArray(o.levelCurve) && o.levelCurve.length === LEVEL_CURVE_POINTS) state.levelCurve = o.levelCurve.slice();
    if (o.curtains) state.curtains = { ...state.curtains, ...o.curtains };
    state.sel = new Set([...state.sel].filter(fixtureById));
    if (state.selTruss && !E.trussById(state.rig, state.selTruss)) state.selTruss = null;
    state.dirty = true;
    renderAll();
  }
  /* 戻す・やり直すでも控えを更新する。控えがずれると、次の commit で積む「変更前」が狂う。 */
  function undo() { if (!state.history.length) return; state.future.push(baseline); const json = state.history.pop(); baseline = json; restore(json); }
  function redo() { if (!state.future.length) return; state.history.push(baseline); const json = state.future.pop(); baseline = json; restore(json); }

  /* ---------- toast / dialog ---------- */
  let toastTimer = 0;
  function toast(text, actionLabel, action) {
    const el = $("toast"); el.innerHTML = ""; el.hidden = false;
    el.append(Object.assign(document.createElement("span"), { textContent: text }));
    if (actionLabel) { const b = document.createElement("button"); b.textContent = actionLabel; b.onclick = () => { el.hidden = true; action(); }; el.append(b); }
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 5000);
  }
  function dialog(html, buttons) {
    const d = $("dialog"); d.innerHTML = ""; d.hidden = false;
    const box = document.createElement("div"); box.className = "in"; box.innerHTML = html;
    const acts = document.createElement("div"); acts.className = "acts";
    buttons.forEach(([label, fn, cls]) => { const b = document.createElement("button"); b.className = "btn " + (cls || ""); b.textContent = label; b.onclick = () => { d.hidden = true; fn && fn(); }; acts.append(b); });
    box.append(acts); d.append(box);
  }

  /* ---------- 幾何: キャンバスの箱 ---------- */
  const plan = $("plan"), secF = $("secF"), secL = $("secL"), secR = $("secR");
  const pctx = plan.getContext("2d");
  const SECS = [
    { cv: secF, ctx: secF.getContext("2d"), kind: "front" },
    { cv: secL, ctx: secL.getContext("2d"), kind: "shimote" },
    { cv: secR, ctx: secR.getContext("2d"), kind: "kamite" },
  ];
  const secOf = (kind) => SECS.find((x) => x.kind === kind);
  /* 舞台の矩形（内部px）。キャンバスの実寸から毎回計算するので、
     モーダルを広げても袖・客席の帯の比率が保たれる。 */
  /* 舞台の矩形は実寸の比率（幅:奥行き／奥行き:高さ／幅:高さ）を保って中央へ収める。
     T字配置で図ごとに縦横比が大きく違うので、余白の割合だけで決めると舞台が歪む。 */
  const fitBox = (avail, aspect) => {
    let w = avail.w, h = w / aspect;
    if (h > avail.h) { h = avail.h; w = h * aspect; }
    return { x: Math.round(avail.x + (avail.w - w) / 2), y: Math.round(avail.y + (avail.h - h) / 2), w: Math.round(w), h: Math.round(h) };
  };
  /* 図の余白（CSS px。内部pxはこの2倍）。syncFigureSizes と planBox/secBox で同じ値を使う。
     平面図の左右は、舞台の外に出る横置き灯の印（B.x−60内部px）が入るぶん広め。 */
  /* 左右の余白は平面図・正面図・側面図で同じ値。そろえないと枠の幅が食い違う（2026-09-11 本人指摘）。
     2026-09-11 本人要望でさらに詰めた（38→32）。平面図の舞台の外に出るSSの印は SIDE_DX まで。 */
  const PAD = { planX: 32, planT: 20, planB: 46, secX: 32, secT: 14, secB: 15, headPlan: 26, headSec: 26, gap: 8 };
  const SIDE_DX = 44;   // 内部px。PAD.planX*2(=64) − 印の半径15 より小さくする
  /* 前明かりは客席の上（舞台より手前）にある。実尺で描くと平面図に客席ぶんの帯が要り、
     そのぶん舞台が小さくなるので、SSと同じく「舞台の外に一定距離で並べる」描き方にする。
     本当の距離は番号の横と設定欄に数値で出す。 */
  const FRONT_DY = 58;        // 平面図: 舞台の手前端から下へ（内部px）。PAD.planB*2 に収まること
  const FRONT_DX_SEC = 40;    // 側面図: 手前端から客席側へ（内部px）
  const isFront = (f) => f.mount.type === "front";
  const shapeOf = (m) => (m.type === "truss" ? "square" : m.type === "floor" ? "circle" : m.type === "front" ? "tri" : "diamond");
  const planBox = () => {
    const w = plan.width, h = plan.height, d = state.dims;
    const padX = PAD.planX * 2, padT = PAD.planT * 2, padB = PAD.planB * 2;
    return fitBox({ x: padX, y: padT, w: w - padX * 2, h: h - padT - padB }, d.W / d.D);
  };
  // kind: "front"（横軸＝幅）／"shimote"・"kamite"（横軸＝奥行き）。縦軸はどちらも高さ
  const secBox = (cv, kind) => {
    const d = state.dims, padX = PAD.secX * 2;
    const avail = { x: padX, y: PAD.secT * 2, w: cv.width - padX * 2, h: cv.height - (PAD.secT + PAD.secB) * 2 };
    return fitBox(avail, (kind === "front" ? d.W : d.D) / d.H);
  };
  /* 凸の形で、4図すべてを**同じ縮尺**（1mがどの図でも同じ長さ）にする（2026-09-11 本人要望）。
     下段（下手・正面・上手）は縦軸がどれも高さなので、高さの目盛りが横一直線にそろう。
     上に載る平面図は正面図と同じ幅（＝同じ間口）なので、真上と正面で灯体が同じ横位置に立つ。
       横に要る量 = (D + W + D)×s ＋ 余白と隙間
       縦に要る量 = (D + H)×s ＋ 見出しと余白
     s（1mあたりのpx）はその2つの小さいほう。 */
  function syncFigureSizes() {
    const g = document.querySelector(".figgrid"); if (!g) return;
    const r = g.getBoundingClientRect(); if (!r.width || !r.height) return;
    const d = state.dims;
    const chromeW = PAD.planX * 2 + PAD.secX * 4 + PAD.gap * 2;
    const chromeH = PAD.headPlan + PAD.planT + PAD.planB + PAD.gap + PAD.headSec + PAD.secT + PAD.secB;
    const s = Math.max(6, Math.min((r.width - chromeW) / (d.W + d.D * 2), (r.height - chromeH) / (d.D + d.H)));
    const set = (elm, prop, v) => { const now = parseFloat(elm.style[prop]) || 0; if (Math.abs(now - v) > 1) elm.style[prop] = v + "px"; };
    // 上帯・シーン行を図と同じ幅の帯へ寄せる。窓を変えても縦に揃う
    const band = Math.round((d.W + d.D * 2) * s) + chromeW;
    const modal = $("modal"); if (modal) modal.style.setProperty("--band", band + "px");
    const secH = Math.round(d.H * s) + PAD.secT + PAD.secB;
    const sideW = Math.round(d.D * s) + PAD.secX * 2, midW = Math.round(d.W * s) + PAD.planX * 2;
    set(plan.parentElement, "width", midW);
    set(plan, "height", Math.round(d.D * s) + PAD.planT + PAD.planB);
    set(secF.parentElement, "width", midW); set(secF, "height", secH);
    [secL, secR].forEach((cv) => { set(cv.parentElement, "width", sideW); set(cv, "height", secH); });
    // 上段の左右パネルは、真下の側面図と同じ幅にそろえる（6枠がきれいに並ぶ）
    [$("panel-fixtures"), $("panel-insp")].forEach((p) => p && set(p, "width", sideW));
  }
  const planProj = () => E.makePlanProjector(state.dims, planBox());
  // キャンバスの内部解像度を表示サイズへ合わせる（拡大してもぼやけない）
  function syncCanvasSize() {
    syncFigureSizes();   // 先に各図の表示高さを決めてから内部解像度を合わせる
    const fit = (c) => { const r = c.getBoundingClientRect(); if (!r.width) return; const W = Math.max(300, Math.round(r.width * 2)), H = Math.max(160, Math.round(r.height * 2)); if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } };
    [plan, secL, secR, secF].forEach(fit);
  }
  const secProj = (sec) => (sec.kind === "front"
    ? (state.front3d
        ? E.makeFrontPerspProjector(state.dims, secBox(sec.cv, "front"), state.seat)
        : E.makeFrontProjector(state.dims, secBox(sec.cv, "front")))
    : E.makeSideProjector(state.dims, secBox(sec.cv, sec.kind), sec.kind));
  const canvasPoint = (c, ev) => { const r = c.getBoundingClientRect(); return { X: (ev.clientX - r.left) * c.width / r.width, Y: (ev.clientY - r.top) * c.height / r.height }; };
  // 図に出すもの（番号・光・動く範囲・1mの線）。図が4つに増えたぶん、間引けるようにする
  const showOn = (key) => state.show[key] !== false;

  const fixtureWorld = (f) => E.fixtureWorld(f, state.rig, state.dims);
  /* 固定灯は時間で動かない。向きは仕込みで決まるので、往復や円が付いていても止めた位置で描く
     （2026-09-11 本人判断で「動き」は固定灯では設定できない。古いデータの保険も兼ねる）。 */
  const targetAt = (fid, t) => E.targetAt(lightOf(fid), cueWithPeriods(), fid, E.isMoving(fixtureById(fid)) ? t : 0, state.dims);
  // rig-engine の周期表は固定なので、本試作の秒数（4/2/1）へ合わせるため speed を経由せず delay を秒数基準に
  function cueWithPeriods() { return cue(); }

  /* ---------- 強さ（調光） ----------
     0は消灯と同じ扱い（2026-09-13 本人決定）。on を false にしなくても、強さ0なら図から消える。
     一覧の「オン／オフ」も実際に光っているかで出し分ける（数字が0なのにオンと出ると読めないため）。 */
  const levelOf = (l) => E.levelOf(l);
  const isLit = (l) => E.isLit(l);
  /* カーブは「動かせる点」で持つ（2026-09-13 本人要望「一点を動かしたら滑らかな弧になるように」）。
     0%・25%・50%・75%・100% の5点。横位置は固定で、縦だけドラッグして決める。
     以前はなぞった跡を33目盛りそのまま覚えていたので、線がガタついた。 */
  const LEVEL_CURVE_POINTS = 5;
  function resetLevelCurve() {
    state.levelCurve = Array.from({ length: LEVEL_CURVE_POINTS }, (_, i) => i / (LEVEL_CURVE_POINTS - 1));
  }
  resetLevelCurve();   // 既定はリニア。state の宣言直後ではなくここで呼ぶ（定数がまだ初期化前のため）
  /* 入力（0〜1）→ 出る明るさ（0〜1）。点と点の間は単調3次補間（Fritsch–Carlson）でつなぐ。
     ふつうの3次曲線と違って行き過ぎ（オーバーシュート）が出ないので、
     「つまみを上げたのに暗くなる」区間ができない。1点動かすとその周りが滑らかな弧になる。
     入力0は必ず0＝消灯（どう動かしても「0なのに光る」は作らせない）。 */
  function curveAt(x) {
    const p = state.levelCurve;
    if (!Array.isArray(p) || p.length < 2) return E.clamp(x, 0, 1);
    const n = p.length - 1, h = 1 / n;
    const t = E.clamp(x, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(t)), u = t - i;
    const d = []; for (let k = 0; k < n; k++) d.push((p[k + 1] - p[k]) / h);   // 各区間の傾き
    const m = new Array(n + 1);
    m[0] = d[0]; m[n] = d[n - 1];
    for (let k = 1; k < n; k++) m[k] = (d[k - 1] * d[k] <= 0) ? 0 : (d[k - 1] + d[k]) / 2;
    for (let k = 0; k < n; k++) {                                             // 行き過ぎを抑える
      if (d[k] === 0) { m[k] = 0; m[k + 1] = 0; continue; }
      const a = m[k] / d[k], b = m[k + 1] / d[k], q = a * a + b * b;
      if (q > 9) { const tau = 3 / Math.sqrt(q); m[k] = tau * a * d[k]; m[k + 1] = tau * b * d[k]; }
    }
    const u2 = u * u, u3 = u2 * u;
    return E.clamp((2 * u3 - 3 * u2 + 1) * p[i] + (u3 - 2 * u2 + u) * h * m[i]
      + (-2 * u3 + 3 * u2) * p[i + 1] + (u3 - u2) * h * m[i + 1], 0, 1);
  }
  // その灯が図の上でどれだけ濃く出るか（0〜1）。消灯・強さ0は0。
  const litFactor = (l) => (isLit(l) ? curveAt(levelOf(l) / 100) : 0);
  /* 動きの中で広がり・強さが変わる灯（levelTo / beamDegTo）は、いまの位相での値で描く。
     位相は位置の往復とまったく同じ式（rig-engine paramPhase）＝Aで始めの値、Bで終わりの値。 */
  const phaseOf = (f, l) => E.paramPhase(l, cue(), f.id, state.play.t);
  const litFactorOf = (f, l) => (isLit(l) ? curveAt(E.levelAt(l, phaseOf(f, l)) / 100) : 0);
  // 点ける。強さが0のまま点けても光らないので、そのときは全開に戻す
  function turnOn(fid) { ensureOn(fid); const l = lightOf(fid); if (l && levelOf(l) <= 0) setLight(fid, { level: 100 }); }
  const LEVEL_WORD = (v) => (v <= 0 ? "消灯" : v < 25 ? "かすか" : v < 55 ? "暗め" : v < 85 ? "普通" : "全開");

  /* 一覧や絞り込みに出す状態。未設定と消灯は分けず、どちらも「オフ」として見せる
     （2026-09-13 本人要望「つけるという表現はなしに／最初から全部オフに」）。
     データの上では未設定（on:null）のままなので、まとめて変更が「未設定は点けてから」を判断できる。 */
  const lightState = (fid) => { const l = lightOf(fid); if (!l || l.on !== true || levelOf(l) <= 0) return "off"; return (l.path && l.path.kind !== "still") ? "move" : "on"; };
  const STATE_LABEL = { off: "オフ", on: "オン", move: "動き" };

  /* ---------- 配置の操作 ---------- */
  function addTruss(v) {
    const last = state.rig.trusses[state.rig.trusses.length - 1];
    const t = E.newTruss(uid("t"), v, last ? last.h : 6, "");
    if (!last) t.tentative = true;
    state.rig.trusses.push(t);
    state.selTruss = t.id; state.sel.clear();
    state.tool = "fixture";   // 置いた直後は、そのトラスへ灯体を続けて置ける状態にする（本人指摘 2026-09-11）
    commit(); toast("バトンを渡しました。続けてバトン上をクリックすると灯体を吊れます（Escで終わる）", "元に戻す", undo);
  }
  function addFixture(mount, kind) {
    const f = E.newFixture(uid("f"), state.nextNo++, mount, "", kind);
    state.rig.fixtures.push(f);
    state.sel = new Set([f.id]);
    commit();
    return f;
  }
  function removeSelected() {
    const ids = [...state.sel]; if (!ids.length) return;
    state.rig.fixtures = state.rig.fixtures.filter((f) => !ids.includes(f.id));
    state.scenes.forEach((s) => { ids.forEach((id) => delete s.cue.lights[id]); s.cue.groups = s.cue.groups.map((g) => ({ ...g, members: g.members.filter((m) => !ids.includes(m)) })).filter((g) => g.members.length >= 2); });
    state.sel.clear();
    commit(`${ids.length === 1 ? label(ids[0]) : ids.length + "灯"}を削除しました`);
  }
  function duplicateSelected() {
    const ids = [...state.sel]; if (!ids.length) return;
    const made = [];
    ids.forEach((id) => {
      const f = fixtureById(id); if (!f) return;
      const m = JSON.parse(JSON.stringify(f.mount));
      if (m.type === "truss" || m.type === "floor") { m.u = m.u + 0.08 <= 1 ? m.u + 0.08 : Math.max(0, m.u - 0.08); }
      else if (m.type === "side") { m.v = Math.min(1, m.v + 0.1); }
      const nf = E.newFixture(uid("f"), state.nextNo++, m, ""); state.rig.fixtures.push(nf); made.push(nf.id);
    });
    state.sel = new Set(made);
    commit(`${made.length}灯を複製しました`);
  }
  function spreadSelected() {
    const fs = [...state.sel].map(fixtureById).filter((f) => f && f.mount.type === "truss");
    const tid = fs[0] && fs[0].mount.trussId;
    if (fs.length < 3 || fs.some((f) => f.mount.trussId !== tid)) return;
    fs.sort((a, b) => a.mount.u - b.mount.u);
    const a = fs[0].mount.u, b = fs[fs.length - 1].mount.u;
    fs.forEach((f, i) => { f.mount.u = a + (b - a) * i / (fs.length - 1); });
    commit("等間隔に並べました");
  }
  // 反対側へコピーするのは配置（取り付け位置）だけ。動きはコピーしない
  // （2026-09-11 本人回答: 初回は配置だけでよい。毎回コピーだと片側だけ直したい時の解除が増えるため）。
  /* 反対側へコピーは「SS（袖）」の灯だけ。下手と上手は同じ位置に立てるのが普通なので
     この操作に意味がある。吊り・転がしは平面図の中で左右対称に写しても使う場面がないうえ、
     選んだだけで有効に見えると事故のもとになる（2026-09-11 本人指摘）。 */
  const canMirror = () => { const fs = [...state.sel].map(fixtureById).filter(Boolean); return fs.length > 0 && fs.every((f) => f.mount.type === "side"); };
  function mirrorSelected() {
    if (!canMirror()) return;
    const made = [];
    [...state.sel].forEach((id) => {
      const f = fixtureById(id); if (!f || f.mount.type !== "side") return;
      const nf = E.newFixture(uid("f"), state.nextNo++, E.mirrorMount(f.mount), f.name ? `${f.name}（反対側）` : "");
      state.rig.fixtures.push(nf); made.push(nf.id);
    });
    if (!made.length) return;
    state.sel = new Set(made);
    commit(`${made.length}灯の配置を反対側へコピーしました（動きは別に設定してください）`);
  }
  const canSpread = () => { const fs = [...state.sel].map(fixtureById).filter(Boolean); return fs.length >= 3 && fs.every((f) => f.mount.type === "truss" && f.mount.trussId === fs[0].mount.trussId); };
  /* 番号の頭文字で種類が分かるようにする（2026-09-11 本人要望）。
     M＝ムービング、L＝固定。番号は通し番号のままなので、種類を変えても番号はずれない。 */
  const label = (fid) => { const f = fixtureById(fid); return f ? `${E.isMoving(f) ? "M" : "L"}${String(f.no).padStart(2, "0")}` : ""; };

  /* ---------- 動きの操作 ---------- */
  function setLight(fid, patch) { const c = cue(); c.lights[fid] = { ...(c.lights[fid] || E.newLightCue({ on: null })), ...patch }; }
  /* 点けたときの既定の狙い先は取り付け方で変える（2026-09-11 本人指摘）。
     吊り・前明かり・SSは下向きなので床。転がしは上向きなので空中。 */
  function defaultAim(f) {
    const m = (f && f.mount) || {};
    if (m.type === "floor") return { surface: "air", a: E.newPoint({ u: E.clamp(0.5 + ((m.u || 0.5) - 0.5) * 0.5, 0, 1), v: E.clamp((m.v || 0.5) + 0.05, 0, 1), hM: 3.5 }) };
    return { surface: "floor", a: E.newPoint({ u: 0.5, v: 0.6, hM: 0 }) };
  }
  function ensureOn(fid) { const l = lightOf(fid); if (!l || l.on !== true) { const a = defaultAim(fixtureById(fid)); setLight(fid, { on: true, surface: a.surface, path: { kind: "still", a: a.a }, speed: "normal", color: (l && l.color) || COLORS[0] }); } }
  function currentPoint(l) { const p = l.path || {}; return (p.kind === "circle" || p.kind === "eight") ? p.c : (p.a || E.newPoint()); }
  // 「当てる場所」を切り替えた直後、いまの狙い点を新しい制約（床=高さ0／奥壁=奥行き0／空中=自由）へ合わせる
  function restyleToSurface(fid) {
    const l = lightOf(fid); if (!l || !l.path) return;
    const fix = (p) => p && Object.assign(p, E.constrainPointToSurface(p, l.surface, state.dims));
    if (l.path.kind === "circle") fix(l.path.c); else { fix(l.path.a); fix(l.path.b); }
  }
  function setKind(fid, kind) {
    const l = lightOf(fid); if (!l) return; const p = currentPoint(l);
    if (kind === "still") setLight(fid, { path: { kind: "still", a: { ...p } } });
    if (kind === "line") setLight(fid, { path: { kind: "line", a: { ...p, u: E.clamp(p.u - 0.2, 0, 1) }, b: { ...p, u: E.clamp(p.u + 0.2, 0, 1) }, start: "a" } });
    if (kind === "circle") setLight(fid, { path: { kind: "circle", c: { ...p }, r: 1.5, r2: 1.5, tilt: 0, plane: "horizontal", dir: "cw", start: 0 } });
    // 8の字は横長のほうが8に見えるので、既定は 2.2m × 1.0m
    if (kind === "eight") setLight(fid, { path: { kind: "eight", c: { ...p }, r: 2.2, r2: 1, tilt: 0, plane: "horizontal", dir: "cw", start: 0 } });
  }
  function makeGroup(ids, relation) {
    const c = cue();
    c.groups = c.groups.map((g) => ({ ...g, members: g.members.filter((m) => !ids.includes(m)) })).filter((g) => g.members.length >= 2);
    const g = { id: uid("g"), members: [...ids], relation: "together", delayMs: 400 };
    ids.forEach(ensureOn);
    const n = ids.length;
    if (relation === "fan") {
      ids.forEach((id, i) => { const off = (i - (n - 1) / 2) / Math.max(1, n - 1) * 0.7; setLight(id, { path: { kind: "line", a: { u: 0.5, v: 0.6 }, b: { u: E.clamp(0.5 + off, 0.05, 0.95), v: 0.6 }, start: "a" } }); });
      g.relation = "together"; g.compose = "fan";
    } else if (relation === "cross") {
      ids.forEach((id, i) => { const left = i % 2 === 0; setLight(id, { path: { kind: "line", a: { u: left ? 0.25 : 0.75, v: 0.6 }, b: { u: left ? 0.75 : 0.25, v: 0.6 }, start: "a" } }); });
      g.relation = "together"; g.compose = "cross";
    } else {
      ids.forEach((id) => { const l = lightOf(id); if (!l.path || l.path.kind === "still") setKind(id, "line"); });
      g.relation = relation;
    }
    c.groups.push(g);
    ids.forEach((id) => setLight(id, { groupId: g.id }));
    const names = { together: "一緒に動く", mirror: "鏡のように動く", sequential: "順番に動く", fan: "扇に開く・閉じる", cross: "交差して入れ替わる" };
    commit(`${n}灯を「${names[relation]}」にしました`);
  }
  /* ---------- サーチライト ----------
     選んだムービングを空へ振る、あの見せ方。灯を選ぶ → 振り方・幅・高さ・秒数・広がり・ずらす刻みを決める →
     一撃で全灯に当てる（2026-09-12 本人要望）。
     実物の見え方に寄せた既定値: 細いビーム（8°）・空中狙い・端で止まらないリニア。
     ホールのサーチライト（フォロースポットではなく、空を舐めるほう）は等速で振るので、既定は「リニア」。 */
  const SL_FORMS = [["sweep", "そろえて振る"], ["fan", "扇に開く"], ["cross", "交差する"], ["cone", "まわす"]];
  const SL_NAME = Object.fromEntries(SL_FORMS);
  const slMovers = (ids) => ids.filter((id) => E.isMoving(fixtureById(id)));
  /* 狙う高さの既定は「その灯がどこに付いているか」で決まる。
     バトン吊り・前明かり・SSは灯体が高い位置にあり、ヨークは下へしか振れない＝床を舐める。
     転がしだけは床から上を向くので、天井際を狙わせる（2026-09-12 本人指摘で修正）。 */
  const slFloorMounted = (movers) => movers.length > 0 && movers.every((id) => {
    const f = fixtureById(id); return Boolean(f) && f.mount && f.mount.type === "floor";
  });
  const slHeight = (movers) => (state.sl.hM == null
    ? (slFloorMounted(movers || []) ? Math.max(0.5, state.dims.H - 0.5) : 0)
    : E.clamp(state.sl.hM, 0, state.dims.H));
  const slDepth = () => E.clamp(E.finite(state.sl.vv, 0.4), 0, 1);
  function applySearchlight(ids, quiet) {
    const sp = state.sl, d = state.dims, c = cue();
    const movers = slMovers(ids); if (!movers.length) return;
    const n = movers.length;
    // 組から外す。サーチライトはオフセットで並びを作るので、組の関係と二重に持たせない
    c.groups = c.groups.map((g) => ({ ...g, members: g.members.filter((m) => !movers.includes(m)) })).filter((g) => g.members.length >= 2);
    const half = E.clamp(sp.span, 0.1, 1) / 2;
    const hM = E.clamp(slHeight(movers), 0, d.H);
    // 高さ0＝床を舐める（吊り・前明かり・SSの既定）。0より上なら空中を狙う（転がしの既定）
    const surface = hM <= 0.05 ? "floor" : "air";
    const v = slDepth();                        // 舞台のどのあたりを狙うか（0=最奥・1=最前）
    movers.forEach((id, i) => {
      const k = n === 1 ? 0.5 : i / (n - 1);    // 0（下手端）〜1（上手端）
      const uu = (x) => E.clamp(x, 0.02, 0.98);
      let path;
      if (sp.form === "cone") {
        // それぞれの持ち場で円を描く＝空に円錐が立つ。幅いっぱいに散らして重ならないようにする
        const cu = uu(0.5 + (k - 0.5) * (sp.span * 0.9));
        const r = Math.max(0.4, sp.span * d.W / (n + 2));
        path = { kind: "circle", c: { u: cu, v, hM }, r, r2: r, tilt: 0, plane: "horizontal", dir: i % 2 ? "ccw" : "cw", start: (i / n) % 1 };
      } else if (sp.form === "fan") {
        // 中央から外へ開く。外側の灯ほど大きく開き、閉じると1本に集まる
        const off = (k - 0.5) * 2;               // −1〜+1
        path = { kind: "line", a: { u: 0.5, v, hM }, b: { u: uu(0.5 + off * half * 2), v, hM }, start: "a", easing: sp.easing };
      } else if (sp.form === "cross") {
        // 1本おきに逆向き＝中央ですれ違う
        const L = { u: uu(0.5 - half), v, hM }, R = { u: uu(0.5 + half), v, hM };
        path = { kind: "line", a: i % 2 ? R : L, b: i % 2 ? L : R, start: "a", easing: sp.easing };
      } else {
        path = { kind: "line", a: { u: uu(0.5 - half), v, hM }, b: { u: uu(0.5 + half), v, hM }, start: "a", easing: sp.easing };
      }
      const l = lightOf(id);
      setLight(id, {
        on: true, surface, path, beamDeg: sp.beamDeg,
        periodSec: sp.periodSec, offsetSec: Math.round(i * sp.stepSec * 10) / 10,
        groupId: null, color: (l && l.color) || COLORS[0],
      });
    });
    state.slLive = movers.join(",");
    if (quiet) { draw(); return; }
    commit(`${n}灯を「サーチライト（${SL_NAME[sp.form]}）」にしました`);
  }
  function ungroup(fid) { const c = cue(); c.groups = c.groups.map((g) => ({ ...g, members: g.members.filter((m) => m !== fid) })).filter((g) => g.members.length >= 2); setLight(fid, { groupId: null }); commit(`${label(fid)}を組から外しました`); }
  const groupName = (g) => ({ together: "一緒に動く", mirror: "鏡のように動く", sequential: "順番に動く" }[g.relation] || "") + (g.compose === "fan" ? "（扇）" : g.compose === "cross" ? "（交差）" : "");

  /* ---------- 再生 ---------- */
  function play() { if (state.play.on) return; state.play.on = true; state.play.last = 0; state.play.raf = requestAnimationFrame(tick); renderTransport(); }
  function stop(reason) { if (!state.play.on) return; state.play.on = false; cancelAnimationFrame(state.play.raf); if (reason) toast(reason); renderTransport(); draw(); }
  function home() { stop(); state.play.t = 0; renderTransport(); draw(); }
  function tick(ts) { if (!state.play.on) return; if (!state.play.last) state.play.last = ts; state.play.t += ts - state.play.last; state.play.last = ts; renderTransport(); draw(); state.play.raf = requestAnimationFrame(tick); }
  function renderTransport() { $("t-time").textContent = `${(state.play.t / 1000).toFixed(1)}秒`; $("t-playing").hidden = !state.play.on; $("t-play").disabled = state.play.on; }

  /* ---------- 描画: 平面図 ---------- */
  const isSel = (fid) => state.sel.has(fid);
  function drawPlan() {
    const w = plan.width, h = plan.height, P = planProj(), B = planBox(), d = state.dims;
    pctx.clearRect(0, 0, w, h); pctx.fillStyle = "#0d0e10"; pctx.fillRect(0, 0, w, h);
    // 袖・客席の帯
    pctx.fillStyle = "rgba(255,255,255,0.02)"; pctx.fillRect(0, B.y, B.x, B.h); pctx.fillRect(B.x + B.w, B.y, w - B.x - B.w, B.h);
    pctx.fillStyle = "rgba(156,130,63,0.05)"; pctx.fillRect(B.x, B.y + B.h, B.w, h - B.y - B.h);
    // 舞台
    pctx.fillStyle = "rgba(255,255,255,0.035)"; pctx.fillRect(B.x, B.y, B.w, B.h);
    pctx.strokeStyle = "rgba(239,231,214,0.06)"; pctx.lineWidth = 1;
    if (showOn("grid")) {
      for (let m = 1; m < d.W; m++) { const X = B.x + m / d.W * B.w; pctx.beginPath(); pctx.moveTo(X, B.y); pctx.lineTo(X, B.y + B.h); pctx.stroke(); }
      for (let m = 1; m < d.D; m++) { const Y = B.y + m / d.D * B.h; pctx.beginPath(); pctx.moveTo(B.x, Y); pctx.lineTo(B.x + B.w, Y); pctx.stroke(); }
    }
    pctx.strokeStyle = "rgba(239,231,214,0.25)"; pctx.strokeRect(B.x, B.y, B.w, B.h);
    pctx.fillStyle = "rgba(240,231,214,0.45)"; pctx.font = "20px sans-serif"; pctx.textBaseline = "top";
    pctx.fillText("奥（奥壁）", B.x + 8, B.y - 30); pctx.fillText("舞台の手前 ── この先が客席 ▼", B.x + B.w / 2 - 190, B.y + B.h + 8);
    pctx.fillText("下手", 30, B.y + B.h / 2 - 10); pctx.fillText("上手", B.x + B.w + 30, B.y + B.h / 2 - 10);
    pctx.fillText(`${d.W}m × ${d.D}m`, B.x + B.w - 120, B.y - 30);

    drawPiecesPlan(pctx, P, B);   // 舞台スケッチの配置。光より先に描いて下敷きにする
    // トラス
    state.rig.trusses.forEach((t) => {
      const Y = B.y + t.v * B.h; const sel = state.selTruss === t.id && state.mode === "place";
      pctx.strokeStyle = sel ? "#d3ac59" : "rgba(156,130,63,0.75)"; pctx.lineWidth = sel ? 6 : 4;
      pctx.beginPath(); pctx.moveTo(B.x - 24, Y); pctx.lineTo(B.x + B.w + 24, Y); pctx.stroke();
      pctx.fillStyle = sel ? "#d3ac59" : "rgba(156,130,63,0.9)"; pctx.font = "18px sans-serif";
      pctx.fillText(`${t.label || "バトン"}　奥から${E.trussRow(state.rig, t.id)}列目・高さ約${t.h.toFixed(1)}m${t.tentative ? "（仮の高さ）" : ""}`, B.x - 24, Y - 26);
    });
    // 予告（ゴースト）
    const hv = state.hover;
    if (state.tool === "truss" && hv && hv.canvas === "plan") {
      const Y = E.clamp(hv.Y, B.y, B.y + B.h); pctx.strokeStyle = "rgba(211,172,89,0.45)"; pctx.setLineDash([12, 8]); pctx.lineWidth = 4;
      pctx.beginPath(); pctx.moveTo(B.x - 24, Y); pctx.lineTo(B.x + B.w + 24, Y); pctx.stroke(); pctx.setLineDash([]);
      pctx.fillStyle = "rgba(240,231,214,0.8)"; pctx.font = "18px sans-serif"; pctx.fillText("ここにバトンを渡す（クリック）", B.x + B.w / 2 - 110, Y + 10);
    }
    if (state.tool === "fixture" && hv && hv.canvas === "plan") {
      const t = E.trussById(state.rig, state.selTruss);
      if (t) {
        const Y = B.y + t.v * B.h; const near = Math.abs(hv.Y - Y) < 60 && hv.X >= B.x && hv.X <= B.x + B.w;
        if (near) { drawFixtureMark(pctx, hv.X, Y, "square", { ghost: true }); pctx.fillStyle = "rgba(240,231,214,0.85)"; pctx.font = "18px sans-serif"; pctx.fillText(`奥から${E.trussRow(state.rig, t.id)}列目に置く`, hv.X + 18, Y - 44); }
        else { pctx.fillStyle = "rgba(240,231,214,0.6)"; pctx.font = "18px sans-serif"; pctx.fillText("バトンの上をクリックしてください", B.x + B.w / 2 - 130, B.y + B.h + 44); }
      }
    }
    if (state.tool === "floor" && hv && hv.canvas === "plan" && inBox(hv, B)) drawFixtureMark(pctx, hv.X, hv.Y, "circle", { ghost: true });
    if (state.tool === "side" && hv && hv.canvas === "plan") { const side = hv.X < B.x ? "shimote" : hv.X > B.x + B.w ? "kamite" : null; if (side) drawFixtureMark(pctx, side === "shimote" ? B.x - SIDE_DX : B.x + B.w + SIDE_DX, E.clamp(hv.Y, B.y, B.y + B.h), "diamond", { ghost: true }); else { pctx.fillStyle = "rgba(240,231,214,0.6)"; pctx.font = "18px sans-serif"; pctx.fillText("舞台の外側（下手／上手）をクリックしてください", B.x + B.w / 2 - 190, B.y + B.h + 44); } }

    // 動き: 軌道・光線
    const litSpots = [];   // 作業灯を消す（ブラックアウト）用。光の当たっている場所だけ集める
    if (state.mode === "move") {
      state.rig.fixtures.forEach((f) => {
        const l = lightOf(f.id); if (!isLit(l)) return;   // 消灯・強さ0は図に出さない
        const lv = litFactorOf(f, l);
        const S = fixtureWorld(f); if (!S) return; const T = targetAt(f.id, state.play.t); if (!T) return;
        const s = P(S), tp = P(T); const sel = isSel(f.id); const dim = state.sel.size && !sel;
        const g = showOn("path") ? E.pathGuide(l, state.dims) : null;
        if (g) { pctx.save(); pctx.setLineDash([10, 8]); pctx.strokeStyle = sel ? "rgba(223,100,51,0.9)" : "rgba(223,100,51,0.35)"; pctx.lineWidth = 2;
          if (g.kind === "line") { const a = P(g.a), b = P(g.b); pctx.beginPath(); pctx.moveTo(a.X, a.Y); pctx.lineTo(b.X, b.Y); pctx.stroke(); }
          else if (g.kind === "loop" && g.plane === "horizontal") strokeLoop(pctx, P, g);
          pctx.restore(); }
        if (l.surface === "floor" || l.surface === "air") {
          if (showOn("beam")) { const r = drawBeam(pctx, s, tp, { S, T }, l.color, beamOf(f), dim, B.w / state.dims.W, squashFor("plan", l.surface), true, false, lv, l); litSpots.push({ fromX: s.X, fromY: s.Y, toX: tp.X, toY: tp.Y, r, lv }); }
          if (l.surface === "air") {
            // 空中の狙い点は床に落ちない。真上から見ると高さが読めないので、印＋高さ＋床への破線を出す
            pctx.strokeStyle = hexA(l.color, dim ? 0.2 : 0.7); pctx.lineWidth = 3; pctx.beginPath();
            pctx.moveTo(tp.X - 16, tp.Y - 16); pctx.lineTo(tp.X + 16, tp.Y + 16); pctx.moveTo(tp.X + 16, tp.Y - 16); pctx.lineTo(tp.X - 16, tp.Y + 16); pctx.stroke();
            pctx.beginPath(); pctx.arc(tp.X, tp.Y, 22, 0, Math.PI * 2); pctx.stroke();
            if (!dim) { pctx.fillStyle = hexA(l.color, 0.9); pctx.font = "17px sans-serif"; pctx.textBaseline = "bottom"; pctx.fillText(`空中 ${T.z.toFixed(1)}m`, tp.X + 26, tp.Y - 8); }
          } // 床の輪は drawBeam が広がりから描く
        } else if (showOn("beam")) { const r = drawBeam(pctx, s, { X: s.X, Y: B.y }, { S, T }, l.color, beamOf(f), dim, B.w / state.dims.W, squashFor("plan", l.surface), true, false, lv, l); litSpots.push({ fromX: s.X, fromY: s.Y, toX: s.X, toY: B.y, r, lv }); }
        // ハンドル（選択灯のみ・床と空中は平面図で位置を動かす）
        if (sel && l.surface !== "back") drawHandles(pctx, P, l, f.id);
      });
    }
    // 灯体
    state.rig.fixtures.forEach((f) => {
      const S = fixtureWorld(f); if (!S) return; const p = P(S);
      const X = f.mount.type === "side" ? (f.mount.side === "shimote" ? B.x - SIDE_DX : B.x + B.w + SIDE_DX) : p.X;
      const Y = isFront(f) ? B.y + B.h + FRONT_DY : p.Y;     // 前明かりは客席帯に並べる（実距離は数値で）
      if (showOn("fixtures")) drawFixtureMark(pctx, X, Y, shapeOf(f.mount), { sel: isSel(f.id), st: lightState(f.id), color: (lightOf(f.id) || {}).color, no: showOn("no") ? label(f.id) : "", moving: E.isMoving(f) });
    });
    // 作業灯を消す（2026-09-13 本人要望）。灯体の印は暗くしたくないので、印より前・マーキーより後に重ねる
    drawBordersPlan(pctx, P, state.dims);
    if (state.mode === "move" && showOn("blackout")) paintBlackout(pctx, plan, litSpots);
    // 範囲選択（マーキー）。灯体の上に重ねて描く
    if (state.drag && state.drag.kind === "marquee" && state.drag.moved) {
      const dg = state.drag;
      const x = Math.min(dg.x0, dg.x1), y = Math.min(dg.y0, dg.y1), mw = Math.abs(dg.x1 - dg.x0), mh = Math.abs(dg.y1 - dg.y0);
      pctx.save(); pctx.fillStyle = "rgba(211,172,89,0.12)"; pctx.strokeStyle = "rgba(211,172,89,0.85)"; pctx.lineWidth = 1.5; pctx.setLineDash([7, 5]);
      pctx.fillRect(x, y, mw, mh); pctx.strokeRect(x, y, mw, mh); pctx.restore();
    }
    // 状態
    const st = state.tool === "truss" ? "バトンを渡す" : state.tool === "fixture" ? "吊り 配置中" : state.tool === "floor" ? "転がし 配置中" : state.tool === "side" ? "SS 配置中" : state.drag ? "ドラッグ調整中" : state.sel.size > 1 ? `${state.sel.size}灯を選択中` : "選択";
    $("statebadge").textContent = st;
  }
  const inBox = (p, B) => p.X >= B.x && p.X <= B.x + B.w && p.Y >= B.y && p.Y <= B.y + B.h;
  function hexA(hex, a) { const v = parseInt((hex || "#f2ead6").slice(1), 16); return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`; }
  /* 光は1本の線ではなく広がる（2026-09-11 本人指摘）。出どころから照射先へ、
     照射先での輪の半径 = 距離×tan(広がり/2) まで開く三角形として描く。
     真上から見て真下を照らす灯は投影すると長さが0になるので、輪は必ず別に描く。 */
  /* 舞台スケッチ側の配置（演者・セット）。光がどこへ当たるかを確かめるための下敷きなので、
     姿勢や向きは描かず、実寸の高さと立ち位置だけを影絵で出す。光より先に描いて、光を上に重ねる。 */
  const piecesOf = () => (scene().pieces || []);
  /* 幕・ホリゾントの板（1〜2枚）を世界座標(m)の左右端点で返す。ox は向き(facing)を
     織り込んだベクトルへ変換してあるので、どの図の projector へ渡しても回転・遠近が
     自動で正しくなる（出典: rig-engine.js curtainParts ＝ stage-machinery.js machineryParts の移植）。 */
  function curtainPanelsWorld(pc, d) {
    const wM = E.finite(pc.w, 1) * d.W;
    const hM = Math.min(E.finite(pc.hM, 6), d.H);
    // 一文字幕だけは床から立つのではなく、上から垂れる＝下端の高さ（liftM）を持つ
    const parts = E.curtainParts(pc, { w: wM, h: hM, lift: E.clamp(E.finite(pc.liftM, 0), 0, d.H) });
    const rad = ((pc.facing || 0) * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const cx = (pc.u - 0.5) * d.W, cy = pc.v * d.D;
    return parts.map((part) => {
      const px = cx + part.ox * cos, py = cy + part.ox * sin, halfW = part.w / 2;
      return {
        leftX: px - halfW * cos, leftY: py - halfW * sin,
        rightX: px + halfW * cos, rightY: py + halfW * sin,
        lift: part.lift, h: part.h,
      };
    });
  }
  function drawCurtainPlan(ctx, P, pc, d) {
    // 振り落とし・ホリゾントは全開（100%）で上へ消える＝平面図からも消える（本体と同じ規則）
    const open = E.clamp(E.finite(pc.open, 0), 0, 100);
    if (["drop", "cyc"].includes(pc.curtainKind) && open >= 100) return;
    const panels = curtainPanelsWorld(pc, d);
    ctx.save();
    const masking = pc.solid || pc.curtainKind === "border" || pc.curtainKind === "leg";
    ctx.strokeStyle = masking ? "#111214" : hexA(pc.color || "#000000", 0.9); ctx.lineWidth = 7; ctx.lineCap = "butt";
    panels.forEach((part) => {
      const a = P({ x: part.leftX, y: part.leftY, z: 0 }), b = P({ x: part.rightX, y: part.rightY, z: 0 });
      ctx.beginPath(); ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y); ctx.stroke();
    });
    const mid = panels[0];
    const lp = P({ x: (mid.leftX + mid.rightX) / 2, y: (mid.leftY + mid.rightY) / 2, z: 0 });
    ctx.fillStyle = "rgba(240,231,214,0.5)"; ctx.font = "13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(pc.name, lp.X, lp.Y + 6); ctx.textAlign = "left";
    ctx.restore();
  }
  /* 一文字幕。灯体を<b>描いたあと</b>に重ねる——客席から見て隠れているかを確かめるための幕なので、
     灯体の上に載せないと意味がない。ただし完全に塗り潰すと設計できないので、
     布は濃いめの半透明にして、下の灯体がうっすら透ける（2026-09-13 本人要望）。 */
  function drawBordersPlan(ctx, P, d) { borderPieces().forEach((pc) => drawCurtainPlan(ctx, P, pc, d)); }
  function drawBordersUp(ctx, P, d) { borderPieces().forEach((pc) => drawCurtainUp(ctx, P, pc, d)); }

  function drawPiecesPlan(ctx, P, B) {
    if (!showOn("pieces")) return;
    const d = state.dims, pxM = B.w / d.W;
    piecesOf().forEach((pc) => {
      if (pc.kind === "curtain") { drawCurtainPlan(ctx, P, pc, d); return; }
      const q = P({ x: (pc.u - 0.5) * d.W, y: pc.v * d.D, z: 0 });
      const rw = Math.max(4, (pc.kind === "set" ? 0.9 : 0.45) * pxM), rd = Math.max(3, (pc.kind === "set" ? 0.9 : 0.3) * pxM);
      ctx.save();
      ctx.fillStyle = "rgba(240,231,214,0.16)"; ctx.strokeStyle = "rgba(240,231,214,0.4)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(q.X, q.Y, rw, rd, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(240,231,214,0.5)"; ctx.font = "15px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(pc.name, q.X, q.Y + rd + 4); ctx.textAlign = "left";
      ctx.restore();
    });
  }
  /* 立面（正面・側面・3D）。P は世界座標→画面。pxPerM はその図の1mあたりの画素。
     3Dでは奥行きで縮むので、投影が返す scale を掛ける。 */
  /* 立面（正面・側面・3D）の演者は、舞台スケッチ本体と同じ骨格モデル（stage-figure.js）で描く。
     見え方の差は「向き」と「奥行きの縮み」だけで、姿勢・胴の断面・手足の太さは本体と同じ式。
       yaw: 体の向き。正面図は facing そのまま。側面図はカメラが90°回るぶんを足す
            （下手から見る＝客席が画面の左なので、客席向き(+z)が左へ来る向き）。
       zDrop: 奥行き1mが画面で縦に動く量×身長。3Dだけ効く（本体 performerRig と同じ式）。
     セットは箱のまま（本体の装置は種類が多く、下敷きには箱で足りる）。 */
  function drawCurtainUp(ctx, P, pc, d) {
    const panels = curtainPanelsWorld(pc, d);
    ctx.save();
    panels.forEach((part) => {
      const fl = P({ x: part.leftX, y: part.leftY, z: part.lift });
      const fr = P({ x: part.rightX, y: part.rightY, z: part.lift });
      const tl = P({ x: part.leftX, y: part.leftY, z: part.lift + part.h });
      const tr = P({ x: part.rightX, y: part.rightY, z: part.lift + part.h });
      // 色は黒に固定（2026-09-13 本人指摘「幕が紫色に見える」で#784047から変更。
      // stage-machinery.js側も既定を黒へ修正済み）。立面での塗りの濃さは
      // 本体側で決めていない試作独自の値——0.55だと後ろの壁いっぱいを覆って灯体の光と競合したので、
      // 「下敷き」らしく控えめな0.3へ落とした（2026-09-13 本人指摘「色が強い」）。
      /* 前幕・ホリゾントは「下敷き」なので薄く（0.3）。
         一文字幕・袖幕・前一文字は<b>隠すための布</b>なので<b>不透明</b>に塗る。
         2026-09-13 実害: 半透明（0.66〜0.88）で塗ると、光の帯の上に黒が重なった結果が
         背景（#0d0e10）より暗くなり、作業灯を消したときにマスクの穴からその暗い部分が
         「黒い光」として見えていた（本人指摘）。布が光を遮るのだから、透かさず塗るのが正しい。
         色は背景よりわずかに明るくして、布そのものの形は輪郭と合わせて読めるようにする。 */
      const masking = pc.solid || pc.curtainKind === "border" || pc.curtainKind === "leg";
      ctx.fillStyle = masking ? "#111214" : hexA(pc.color || "#000000", 0.3);
      ctx.beginPath(); ctx.moveTo(fl.X, fl.Y); ctx.lineTo(fr.X, fr.Y); ctx.lineTo(tr.X, tr.Y); ctx.lineTo(tl.X, tl.Y); ctx.closePath();
      ctx.fill(); ctx.strokeStyle = "rgba(240,231,214,0.22)"; ctx.lineWidth = 1; ctx.stroke();
    });
    const p0 = panels[0];
    const lbl = P({ x: (p0.leftX + p0.rightX) / 2, y: (p0.leftY + p0.rightY) / 2, z: p0.lift });
    ctx.fillStyle = "rgba(240,231,214,0.45)"; ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(pc.name, lbl.X, lbl.Y + 4); ctx.textAlign = "left";
    ctx.restore();
  }
  function drawPiecesUp(ctx, P, pxPerM, opts) {
    if (!showOn("pieces")) return;
    const o = opts || {}, d = state.dims, F = window.STAGE_FIGURE;
    piecesOf().forEach((pc) => {
      if (pc.kind === "curtain") { drawCurtainUp(ctx, P, pc, d); return; }
      const foot = P({ x: (pc.u - 0.5) * d.W, y: pc.v * d.D, z: 0 });
      const sc = foot.scale == null ? 1 : foot.scale;
      const k = pxPerM * sc;
      ctx.save();
      if (pc.kind !== "performer" || !F) {
        const top = P({ x: (pc.u - 0.5) * d.W, y: pc.v * d.D, z: pc.hM });
        const h = Math.abs(foot.Y - top.Y), w = 0.9 * k;
        ctx.fillStyle = "rgba(240,231,214,0.15)"; ctx.strokeStyle = "rgba(240,231,214,0.4)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.rect(foot.X - w, foot.Y - h, w * 2, h); ctx.fill(); ctx.stroke();
      } else {
        const H = pc.hM || F.DEFAULT_HEIGHT_CM / 100;
        const yaw = (((pc.facing || 0) + (o.yawDeg || 0)) * Math.PI) / 180;
        const stretch = o.stretchAt ? o.stretchAt(pc.v) : 1;
        const zDrop = o.zDropPerM ? o.zDropPerM * H : 0;
        const rig = F.buildRig(pc.pose || "stand", foot.X, foot.Y, H * k, H * k * stretch, yaw, zDrop, null);
        F.paintShadow(ctx, rig);
        F.paintBody(ctx, rig, pc.color || "#d8cdb6", null);
      }
      ctx.fillStyle = "rgba(240,231,214,0.45)"; ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(pc.name, foot.X, foot.Y + 4); ctx.textAlign = "left";
      ctx.restore();
    });
  }

  /* 光の帯と、当たったところ。舞台スケッチ本体の drawLight と同じ組み立て方にする
     （stage-sketch.js: BEAM_SOFT / BEAM_EDGE / 「帯の裾を円の左右の端へ着け、下半分の弧でつないで
     一続きの輪郭として塗る」）。2026-09-11 本人指摘「平面として接地している感じがない」への対応。

     要点は3つ:
       ① 裾を「光の進む向きと直角」に取らない。斜めから差し込むほど裾が床の下へ潜り、
          床を突き抜けたように見える。裾は床に落ちた円の左右の端（水平）へ着ける。
       ② 帯と円を別々に塗らない。裾の水平線が円を切って「半円が2つ」に見える。
          下半分の弧でつないで一続きのパスにする。
       ③ 濃さは進む向きと直角のグラデーションで、芯が濃く両縁で消える。輪郭線は引かない。 */
  const BEAM_SOFT = 1.26;
  const BEAM_EDGE = [[0, 0], [0.18, 0.30], [0.5, 1], [0.82, 0.30], [1, 0]];
  /* 光だまりの形は、その面をどの向きから見るかで変わる。床の丸は真上から見たときだけ丸。
     squash = [横, 縦] の比。横に潰れている図では①②の描き方に切り替える。 */
  const SPOT_SQUASH = {
    plan: { floor: [1, 1], back: [1, 0.14], air: [1, 1] },
    front: { floor: [1, 0.16], back: [1, 1], air: [1, 1] },
    side: { floor: [1, 0.16], back: [0.14, 1], air: [1, 1] },
  };
  const squashFor = (view, surface) => (SPOT_SQUASH[view] || SPOT_SQUASH.plan)[surface] || [1, 1];
  function drawBeam(ctx, from, to, world, color, deg, dim, pxPerM, squash, asLine, noPool, lv, gobo) {
    const rM = E.spotRadiusM(world.S, world.T, deg), rPx = Math.max(rM * pxPerM, 3);
    const [sx, sy] = squash || [1, 1];
    const halfW = Math.max(rPx * sx * BEAM_SOFT, 3);
    const ry = Math.max(rPx * sy * BEAM_SOFT, 1.5);
    const lying = sy < sx * 0.6;                 // その図で面を真横から見ている＝床に寝ている
    /* 濃さ＝（選んでいない灯を沈める係数）×（その灯の強さ）。強さは0〜1へ通したあとの値で、
       灯ごとの数値0〜100%を state.levelCurve で曲げたもの（2026-09-13 本人要望）。 */
    const a = (dim ? 0.32 : 1) * E.clamp(E.finite(lv, 1), 0, 1);
    const bx = to.X - from.X, by = to.Y - from.Y, blen = Math.hypot(bx, by) || 1;
    const nx = (-by / blen) * halfW, ny = (bx / blen) * halfW;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    if (asLine) {
      /* 真上から見る図では光の帯を三角に開かない（2026-09-11 本人指定）。
         真上から見ているぶん、開き具合は床の光だまりの大きさとして既に出ている。
         出どころが狙い先の真上にあるときは線が点になるので引かない（本体と同じ）。 */
      if (blen > 6) { ctx.strokeStyle = hexA(color, (dim ? 0.22 : 0.55) * E.clamp(E.finite(lv, 1), 0, 1)); ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(from.X, from.Y); ctx.lineTo(to.X, to.Y); ctx.stroke(); ctx.setLineDash([]); }
    } else {
      const g = ctx.createLinearGradient(to.X - nx, to.Y - ny, to.X + nx, to.Y + ny);
      BEAM_EDGE.forEach(([at, w]) => g.addColorStop(at, hexA(color, 0.16 * w * a)));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(from.X, from.Y);                // 灯体は点。点から広がる三角なら捻れない
      if (lying) {
        ctx.lineTo(to.X + halfW, to.Y);
        ctx.ellipse(to.X, to.Y, halfW, ry, 0, 0, Math.PI);   // 円の下半分をなぞって左端へ回り込む
      } else {
        ctx.lineTo(to.X + nx, to.Y + ny);
        ctx.lineTo(to.X - nx, to.Y - ny);
      }
      ctx.closePath(); ctx.fill();
    }
    // 当たったところ。帯の裾と同じ広さまで半影を伸ばす（境目が線で出ないように）
    // 何にも当たらず図の外へ抜ける光は、丸を描かない（丸い当たりを描くと光る玉に見える）
    if (noPool) { ctx.restore(); return rPx; }
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, halfW);
    pool.addColorStop(0, hexA(color, 0.34 * a));
    pool.addColorStop(0.55 / BEAM_SOFT, hexA(color, 0.16 * a));
    pool.addColorStop(1 / BEAM_SOFT, hexA(color, 0.05 * a));
    pool.addColorStop(1, hexA(color, 0));
    ctx.translate(to.X, to.Y); ctx.scale(1, ry / halfW);
    const mask = gobo ? goboMask(gobo, halfW) : null;
    if (!mask) { ctx.fillStyle = pool; ctx.beginPath(); ctx.arc(0, 0, halfW, 0, Math.PI * 2); ctx.fill(); }
    else {
      /* 模様の形にだけ光を置く。別キャンバスで「光だまり×模様」を作ってから1枚で載せるので、
         下に描いてあるものは何も消えない。 */
      const s2 = mask.size, tmp = goboTmp(s2), tc = tmp.getContext("2d");
      tc.setTransform(1, 0, 0, 1, 0, 0); tc.clearRect(0, 0, s2, s2);
      tc.save(); tc.translate(s2 / 2, s2 / 2);
      tc.fillStyle = pool; tc.beginPath(); tc.arc(0, 0, halfW, 0, Math.PI * 2); tc.fill();
      tc.restore();
      tc.globalCompositeOperation = "destination-in";      // 模様の形で光を切り抜く（tmpの中だけの話）
      tc.drawImage(mask.canvas, 0, 0);
      tc.globalCompositeOperation = "source-over";
      ctx.drawImage(tmp, -s2 / 2, -s2 / 2);
    }
    ctx.restore();
    return rPx;
  }

  /* 作業灯を消す（ブラックアウト。2026-09-13 本人要望「光のあたってないところは真っ暗で見えない」）。
     やり方: オフスクリーンに黒を敷き、destination-out で「光が当たっている場所」だけ穴を開け、
     それを図の上に重ねる。穴は実際のビームの見た目（drawBeamの三角＋光だまり）とは別に、
     着地の光だまり＋出どころから着地までの光の柱をやや広め・柔らかめに取るだけで十分
     （マスクなので厳密に一致していなくてよい）。図ごとにオフスクリーンを1枚持って使い回す。 */
  const blackoutCanvases = new WeakMap();
  function paintBlackout(ctx, canvas, spots) {
    let mc = blackoutCanvases.get(canvas);
    if (!mc || mc.width !== canvas.width || mc.height !== canvas.height) {
      mc = document.createElement("canvas"); mc.width = canvas.width; mc.height = canvas.height;
      blackoutCanvases.set(canvas, mc);
    }
    const mctx = mc.getContext("2d");
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, mc.width, mc.height);
    mctx.globalCompositeOperation = "source-over";
    /* 暗幕の濃さ＝どれだけ消すか。100%で真っ暗、50%なら半分だけ沈む。
       穴（光の当たっているところ）の開け方は変えないので、光と地の差はそのまま保たれる。 */
    const dim = E.clamp(E.finite(state.dim, 100), 0, 100) / 100;
    mctx.fillStyle = `rgba(13,14,16,${dim})`; mctx.fillRect(0, 0, mc.width, mc.height);
    mctx.globalCompositeOperation = "destination-out";
    spots.forEach((sp) => {
      // 灯の強さぶんだけ暗幕を剥がす。20%の灯なら20%ぶんしか明るくならない（2026-09-13）
      const lv = E.clamp(E.finite(sp.lv, 1), 0, 1); if (lv <= 0) return;
      const r = Math.max(sp.r * 1.15, 10);
      const dx = sp.toX - sp.fromX, dy = sp.toY - sp.fromY, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const w0 = Math.max(3, r * 0.12), w1 = Math.max(r * 0.85, 8);
      mctx.beginPath();
      mctx.moveTo(sp.fromX + nx * w0, sp.fromY + ny * w0);
      mctx.lineTo(sp.toX + nx * w1, sp.toY + ny * w1);
      mctx.lineTo(sp.toX - nx * w1, sp.toY - ny * w1);
      mctx.lineTo(sp.fromX - nx * w0, sp.fromY - ny * w0);
      mctx.closePath(); mctx.fillStyle = `rgba(255,255,255,${0.85 * lv})`; mctx.fill();
      const grad = mctx.createRadialGradient(sp.toX, sp.toY, 0, sp.toX, sp.toY, r);
      grad.addColorStop(0, `rgba(255,255,255,${lv})`); grad.addColorStop(0.75, `rgba(255,255,255,${0.9 * lv})`); grad.addColorStop(1, "rgba(255,255,255,0)");
      mctx.fillStyle = grad; mctx.beginPath(); mctx.arc(sp.toX, sp.toY, r, 0, Math.PI * 2); mctx.fill();
    });
    ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.drawImage(mc, 0, 0); ctx.restore();
  }

  /* 選ぶボタンに出す小さな見本。描画に使うのと同じ形（GOBOS の shapes）から作るので、
     一覧の見た目と実際に出る模様が必ず一致する。 */
  function goboThumb(g) {
    const parts = g.shapes.map((sp) => {
      const k = sp[0], P = (v) => (v * 100).toFixed(1);
      if (k === "poly") return `<polygon points="${sp[1].map(([u, v]) => `${P(u)},${P(v)}`).join(" ")}"/>`;
      if (k === "circle") return `<circle cx="${P(sp[1])}" cy="${P(sp[2])}" r="${P(sp[3])}"/>`;
      if (k === "rect") return `<rect x="${P(sp[1])}" y="${P(sp[2])}" width="${P(sp[3])}" height="${P(sp[4])}"/>`;
      if (k === "ellipse") return `<ellipse cx="${P(sp[1])}" cy="${P(sp[2])}" rx="${P(sp[3])}" ry="${P(sp[4])}" transform="rotate(${E.finite(sp[5], 0)} ${P(sp[1])} ${P(sp[2])})"/>`;
      if (k === "ring") { const r = sp[1] * 100, w = sp[2] * 100;
        return `<circle cx="50" cy="50" r="${(r + w / 2).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="${w.toFixed(1)}"/>`; }
      if (k === "spoke") { const c = sp[1], hw = sp[2] * 100, len = sp[3] * 100;
        return Array.from({ length: c }, (_, i) => { const a = (i / c) * 360;
          return `<rect x="50" y="${(50 - hw).toFixed(1)}" width="${len.toFixed(1)}" height="${(hw * 2).toFixed(1)}" transform="rotate(${a} 50 50)"/>`; }).join(""); }
      return "";
    }).join("");
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="currentColor">${parts}</g></svg>`;
  }

  /* ゴボ（模様）の形を、いったん別のキャンバスへ描いて返す（白＝光が通るところ）。
     ぼけ具合は「影（shadowBlur）」でぼかす。0でくっきり、上げるほどとろける。

     なぜ ctx.filter を使わないか（2026-09-13 実機で判明）:
     canvas の filter は Safari では 18 以降かつ「Canvas Filters」設定を自分で入れたときしか効かない
     （mdn/browser-compat-data: safari は version_added "18" + preference flag）。
     しかも対応していない環境では代入しても例外にならず黙って無視されるので、
     Chrome では効くのに Safari では「つまみを動かしても何も起きない」という形で出る。
     shadowBlur はどの環境にもあるので、ぼかしはこちらで作る。 */
  const goboMaskCanvas = document.createElement("canvas");
  const goboBlurCanvas = document.createElement("canvas");
  const goboTmpCanvas = document.createElement("canvas");
  const goboTmp = (size) => { if (goboTmpCanvas.width !== size || goboTmpCanvas.height !== size) { goboTmpCanvas.width = size; goboTmpCanvas.height = size; } return goboTmpCanvas; };
  function goboMask(light, radius) {
    const g = light && light.gobo && light.gobo !== "none" ? E.goboById(light.gobo) : null;
    if (!g || !g.shapes.length) return null;
    const soft = E.clamp(E.finite(light.goboSoft, 6), 0, 100);    // 既定はUIの SOFT_DEF と同じ（2/10）
    const blur = (soft / 100) * radius * 0.35;          // ぼけ幅は光だまりの大きさに比例させる
    /* 外周の余白。ぼかしたぶん形がはみ出すので、その幅だけ広く取る。
       大きさは必ず偶数にする——奇数だと中心が半画素ずれ、ぼけを1段変えただけで
       模様全体が1px横に飛ぶ（2026-09-13 実測でこの飛びを確認）。 */
    const pad = Math.ceil(blur * 2 + 2);
    const size = 2 * Math.ceil(radius + pad);
    if (size < 4 || size > 2200) return null;
    const mc = goboMaskCanvas; mc.width = size; mc.height = size;
    const m = mc.getContext("2d");
    m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, size, size);
    m.translate(size / 2, size / 2);
    m.rotate((E.goboAngleAt(light, state.play.t) * Math.PI) / 180);
    m.fillStyle = "#fff";
    const X = (u) => (u - 0.5) * radius * 2, Y = (v) => (v - 0.5) * radius * 2, R = (r) => r * radius * 2;
    m.beginPath();
    g.shapes.forEach((sp) => {
      const k = sp[0];
      if (k === "poly") { sp[1].forEach(([u, v], i) => { const x = X(u), y = Y(v); i ? m.lineTo(x, y) : m.moveTo(x, y); }); m.closePath(); }
      else if (k === "circle") { m.moveTo(X(sp[1]) + R(sp[3]), Y(sp[2])); m.arc(X(sp[1]), Y(sp[2]), R(sp[3]), 0, Math.PI * 2); }
      else if (k === "rect") { const x = X(sp[1]), y = Y(sp[2]), w = R(sp[3]), h = R(sp[4]); m.moveTo(x, y); m.lineTo(x + w, y); m.lineTo(x + w, y + h); m.lineTo(x, y + h); m.closePath(); }
      else if (k === "ellipse") { m.moveTo(X(sp[1]) + R(sp[3]), Y(sp[2])); m.ellipse(X(sp[1]), Y(sp[2]), R(sp[3]), R(sp[4]), (E.finite(sp[5], 0) * Math.PI) / 180, 0, Math.PI * 2); }
      else if (k === "ring") { const rr = R(sp[1]), w = R(sp[2]); m.moveTo(rr + w, 0); m.arc(0, 0, rr + w, 0, Math.PI * 2); m.moveTo(rr, 0); m.arc(0, 0, rr, 0, Math.PI * 2, true); }
      else if (k === "spoke") { const cnt = sp[1], hw = R(sp[2]), len = R(sp[3]);
        for (let i = 0; i < cnt; i++) { const a = (i / cnt) * Math.PI * 2;
          const dx = Math.cos(a), dy = Math.sin(a), nx = -dy * hw, ny = dx * hw;
          m.moveTo(nx, ny); m.lineTo(dx * len + nx, dy * len + ny); m.lineTo(dx * len - nx, dy * len - ny); m.lineTo(-nx, -ny); m.closePath(); } }
    });
    m.fill("evenodd");
    /* 模様の外は光が来ない＝描かない。以前は destination-out で消していたが、
       それだと下に描いてある床・枡目・演者まで一緒に消えて、背景より暗い「黒い丸」が出ていた
       （2026-09-13 本人指摘）。光は足すものなので、形の中だけを塗る作りにした。 */
    /* しきい値を低くしてある。つまみは0〜30を10等分した細かい刻みなので、
       ここを高くすると小さい光だまりで1段目が「0と同じ」になってしまう（2026-09-13 実測）。 */
    if (blur <= 0.12) return { canvas: mc, size };
    /* ぼかす。くっきり描いた形を画面外へ押し出し、その「影」だけを残す——
       影の色を白にしてあるので、ぼけた白い形＝ぼけた模様がそのまま残る。
       shadowBlur は仕様上「ぼかし半径の2倍」なので、blur を2倍にして渡す。 */
    const bc = goboBlurCanvas;
    if (bc.width !== size || bc.height !== size) { bc.width = size; bc.height = size; }
    const b2 = bc.getContext("2d");
    b2.setTransform(1, 0, 0, 1, 0, 0); b2.clearRect(0, 0, size, size);
    b2.shadowColor = "#ffffff";
    b2.shadowBlur = blur * 2;
    b2.shadowOffsetX = size;
    b2.drawImage(mc, -size, 0);
    return { canvas: bc, size };
  }

  // 円・8の字の下書きは、エンジンが返す点の並びを線でつなぐだけ  // 円・8の字の下書きは、エンジンが返す点の並びを線でつなぐだけ（傾きも8の字もこれで描ける）
  function strokeLoop(ctx, P, g) { ctx.beginPath(); g.pts.forEach((w, i) => { const q = P(w); i ? ctx.lineTo(q.X, q.Y) : ctx.moveTo(q.X, q.Y); }); ctx.stroke(); }
  const beamOf = (f) => { const l = lightOf(f.id); return E.beamDegAt(f, l, phaseOf(f, l)); };
  /* 光の終点。床・奥の壁を狙う光はその面で止まる。空中を狙う光はそこで止まらず、
     床か奥の壁まで進み、どちらにも当たらなければ図の外へ抜ける（2026-09-11 本人指摘）。 */
  function beamEnd(l, S, T) {
    if (!l || l.surface !== "air") return { world: T, surface: (l && l.surface) || "floor" };
    const land = E.beamLanding(S, T, state.dims);
    return { world: land, surface: land.on };      // null＝何にも当たらず抜ける
  }

  function drawFixtureMark(ctx, X, Y, shape, o) {
    const s = 15; ctx.save();
    const fill = o.ghost ? "rgba(240,231,214,0.35)" : o.st === "unset" ? "rgba(13,14,16,1)" : o.st === "off" ? "#2a2520" : (o.color || "#f2ead6");
    ctx.fillStyle = fill; ctx.strokeStyle = o.sel ? "#d3ac59" : o.ghost ? "rgba(240,231,214,0.5)" : "rgba(240,231,214,0.7)"; ctx.lineWidth = o.sel ? 5 : 2;
    ctx.beginPath();
    if (shape === "square") ctx.rect(X - s, Y - s, s * 2, s * 2);
    else if (shape === "circle") ctx.arc(X, Y, s, 0, Math.PI * 2);
    else if (shape === "tri") { ctx.moveTo(X, Y + s * 1.15); ctx.lineTo(X + s * 1.15, Y - s * 0.9); ctx.lineTo(X - s * 1.15, Y - s * 0.9); ctx.closePath(); }
    else { ctx.moveTo(X, Y - s * 1.2); ctx.lineTo(X + s * 1.2, Y); ctx.lineTo(X, Y + s * 1.2); ctx.lineTo(X - s * 1.2, Y); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
    // ムービングは輪をひとつ足す（形＝仕込み位置、輪＝動かせるかどうか）
    if (o.moving && !o.ghost) { ctx.strokeStyle = o.sel ? "#d3ac59" : "rgba(240,231,214,0.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, s * 1.55, 0, Math.PI * 2); ctx.stroke(); }
    if (o.st === "off") { ctx.strokeStyle = "rgba(240,231,214,0.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X - s, Y + s); ctx.lineTo(X + s, Y - s); ctx.stroke(); }
    if (o.no) { ctx.fillStyle = o.sel ? "#1a1409" : "rgba(240,231,214,0.95)"; if (o.sel) { ctx.fillStyle = "#d3ac59"; ctx.fillRect(X - 22, Y + s + 4, 44, 22); ctx.fillStyle = "#1a1409"; } ctx.font = "600 16px sans-serif"; ctx.textBaseline = "top"; ctx.textAlign = "center"; ctx.fillText(o.no, X, Y + s + 6); ctx.textAlign = "left"; }
    ctx.restore();
  }
  function drawHandles(ctx, P, l, fid) {
    const p = l.path || {}; const d = state.dims;
    const hp = (pt, txt, filled) => { const q = P(E.pointWorld(pt, d)); ctx.beginPath(); ctx.arc(q.X, q.Y, 12, 0, Math.PI * 2); ctx.fillStyle = filled ? "#df6433" : "#201b16"; ctx.strokeStyle = "#df6433"; ctx.lineWidth = 3; ctx.fill(); ctx.stroke(); if (txt) { ctx.fillStyle = "#efe7d6"; ctx.font = "600 16px sans-serif"; ctx.textBaseline = "middle"; ctx.textAlign = "center"; ctx.fillText(txt, q.X, q.Y + 1); ctx.textAlign = "left"; } return q; };
    if (p.kind === "line") {
      const a = hp(p.a, "A", p.start !== "b"), b = hp(p.b, "B", p.start === "b");
      const from = p.start === "b" ? b : a, to = p.start === "b" ? a : b; arrow(ctx, from, to);
    } else if (p.kind === "circle" || p.kind === "eight") {
      const c = hp(p.c, "", false); const rq = P(circleRadiusWorld(p.c, p.r, p.plane, d, p.tilt));
      ctx.beginPath(); ctx.arc(rq.X, rq.Y, 10, 0, Math.PI * 2); ctx.fillStyle = "#201b16"; ctx.strokeStyle = "#df6433"; ctx.lineWidth = 3; ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(240,231,214,0.8)"; ctx.font = "15px sans-serif"; ctx.fillText(`半径 ${p.r.toFixed(1)}m`, rq.X + 14, rq.Y - 8);
      ctx.fillText(p.dir === "ccw" ? "反時計回り" : "時計回り", c.X + 14, c.Y - 22);
    } else hp(p.a || { u: 0.5, v: 0.6 }, "", true);
  }
  function arrow(ctx, from, to) { const dx = to.X - from.X, dy = to.Y - from.Y, L = Math.hypot(dx, dy) || 1; const ux = dx / L, uy = dy / L; const sx = from.X + ux * 20, sy = from.Y + uy * 20, ex = from.X + ux * Math.min(L * 0.45, 90), ey = from.Y + uy * Math.min(L * 0.45, 90); ctx.strokeStyle = "#df6433"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * 14 - uy * 9, ey - uy * 14 + ux * 9); ctx.lineTo(ex - ux * 14 + uy * 9, ey - uy * 14 - ux * 9); ctx.closePath(); ctx.fillStyle = "#df6433"; ctx.fill(); }

  /* ---------- 描画: 正面図 ---------- */
  function drawFront(sec) {
    const fctx = sec.ctx, front = sec.cv;
    const w = front.width, h = front.height, B = secBox(front, sec.kind), P = secProj(sec), d = state.dims;
    fctx.clearRect(0, 0, w, h); fctx.fillStyle = "#0d0e10"; fctx.fillRect(0, 0, w, h);
    fctx.fillStyle = "rgba(255,255,255,0.03)"; fctx.fillRect(B.x, B.y, B.w, B.h);           // 奥壁
    fctx.strokeStyle = "rgba(239,231,214,0.25)"; fctx.strokeRect(B.x, B.y, B.w, B.h);
    fctx.fillStyle = "rgba(255,255,255,0.05)"; fctx.fillRect(0, B.y + B.h, w, h - B.y - B.h); // 床
    fctx.fillStyle = "rgba(240,231,214,0.45)"; fctx.font = "16px sans-serif"; fctx.textBaseline = "middle";
    [2, 4, 6, 8].filter((m) => m <= d.H).forEach((m) => { const Y = B.y + B.h - m / d.H * B.h; fctx.fillText(`${m}m`, B.x - 40, Y); fctx.strokeStyle = "rgba(239,231,214,0.07)"; fctx.beginPath(); fctx.moveTo(B.x, Y); fctx.lineTo(B.x + B.w, Y); fctx.stroke(); });
    fctx.fillText("床", B.x - 40, B.y + B.h); fctx.fillText("下手", 30, B.y + 14); fctx.fillText("上手", B.x + B.w + 30, B.y + 14);
    drawPiecesUp(fctx, P, B.w / d.W, { yawDeg: 0 });
    // トラス
    state.rig.trusses.forEach((t) => { const Y = B.y + B.h - t.h / d.H * B.h; const sel = state.selTruss === t.id && state.mode === "place"; fctx.strokeStyle = sel ? "#d3ac59" : "rgba(156,130,63,0.75)"; fctx.lineWidth = sel ? 5 : 3; fctx.beginPath(); fctx.moveTo(B.x - 16, Y); fctx.lineTo(B.x + B.w + 16, Y); fctx.stroke();
      if (sel) { fctx.fillStyle = "#d3ac59"; fctx.fillRect(B.x + B.w + 16, Y - 12, 22, 24); fctx.fillStyle = "#1a1409"; fctx.font = "600 14px sans-serif"; fctx.fillText("↕", B.x + B.w + 20, Y); fctx.fillStyle = "#d3ac59"; fctx.font = "15px sans-serif"; fctx.fillText(`高さ ${t.h.toFixed(1)}m（ドラッグ）`, B.x + B.w + 44, Y); } });
    // 光線
    const litSpotsF = [];   // 作業灯を消す（ブラックアウト）用
    if (state.mode === "move") state.rig.fixtures.forEach((f) => { const l = lightOf(f.id); if (!isLit(l)) return; const lv = litFactorOf(f, l); const S = fixtureWorld(f), T = targetAt(f.id, state.play.t); if (!S || !T) return; const s = P(S), tp = P(T); const dim = state.sel.size && !isSel(f.id);
      if (showOn("beam")) { const be = beamEnd(l, S, T), e2 = P(be.world);
        const r = drawBeam(fctx, s, e2, { S, T: be.world }, l.color, beamOf(f), dim, B.w / d.W, squashFor("front", be.surface || "air"), false, !be.surface, lv, l);
        litSpotsF.push({ fromX: s.X, fromY: s.Y, toX: e2.X, toY: e2.Y, r, lv }); }
      if (l.surface === "air") { const floorY = B.y + B.h; fctx.save(); fctx.setLineDash([5, 6]); fctx.strokeStyle = hexA(l.color, dim ? 0.15 : 0.45); fctx.lineWidth = 2; fctx.beginPath(); fctx.moveTo(tp.X, tp.Y); fctx.lineTo(tp.X, floorY); fctx.stroke(); fctx.restore();
        fctx.strokeStyle = hexA(l.color, dim ? 0.2 : 0.8); fctx.lineWidth = 3; fctx.beginPath(); fctx.moveTo(tp.X - 12, tp.Y - 12); fctx.lineTo(tp.X + 12, tp.Y + 12); fctx.moveTo(tp.X + 12, tp.Y - 12); fctx.lineTo(tp.X - 12, tp.Y + 12); fctx.stroke(); fctx.beginPath(); fctx.arc(tp.X, tp.Y, 16, 0, Math.PI * 2); fctx.stroke();
        if (!dim) { fctx.fillStyle = hexA(l.color, 0.9); fctx.font = "15px sans-serif"; fctx.textBaseline = "bottom"; fctx.fillText(`${T.z.toFixed(1)}m`, tp.X + 20, tp.Y - 6); } }
      if (l.surface === "back" || l.surface === "air") {
        const g = showOn("path") ? E.pathGuide(l, d) : null;
        if (g && g.kind === "line") { fctx.save(); fctx.setLineDash([8, 6]); fctx.strokeStyle = "rgba(223,100,51,0.7)"; fctx.lineWidth = 2; const a = P(g.a), b = P(g.b); fctx.beginPath(); fctx.moveTo(a.X, a.Y); fctx.lineTo(b.X, b.Y); fctx.stroke(); fctx.restore(); }
        if (g && g.kind === "loop" && g.plane === "frontVertical") { fctx.save(); fctx.setLineDash([8, 6]); fctx.strokeStyle = "rgba(223,100,51,0.7)"; fctx.lineWidth = 2; strokeLoop(fctx, P, g); fctx.restore(); }
        if (isSel(f.id)) drawHandles(fctx, P, l, f.id);
      }
    });
    // 灯体
    state.rig.fixtures.forEach((f) => { if (!showOn("fixtures")) return; const S = fixtureWorld(f); if (!S) return; const p = P(S); const Y = isFront(f) ? Math.max(20, p.Y) : p.Y; drawFixtureMark(fctx, p.X, Y, shapeOf(f.mount), { sel: isSel(f.id), st: lightState(f.id), color: (lightOf(f.id) || {}).color, no: showOn("no") ? label(f.id) : "", moving: E.isMoving(f) });
      if (f.mount.type === "side" && isSel(f.id) && state.mode === "place") { fctx.fillStyle = "#d3ac59"; fctx.font = "15px sans-serif"; fctx.fillText(`高さ ${f.mount.h.toFixed(1)}m（ドラッグ）`, p.X + (f.mount.side === "shimote" ? -180 : 26), p.Y - 26); } });
    drawBordersUp(fctx, P, d);
    if (state.mode === "move" && showOn("blackout")) paintBlackout(fctx, front, litSpotsF);
  }
  /* ---------- 描画: 側面図（舞台中央から下手／上手を見る） ---------- */
  function drawSide(sec) {
    const fctx = sec.ctx, front = sec.cv, side = sec.kind;
    const w = front.width, h = front.height, B = secBox(front, sec.kind), d = state.dims, P = secProj(sec);
    fctx.clearRect(0, 0, w, h); fctx.fillStyle = "#0d0e10"; fctx.fillRect(0, 0, w, h);
    const backX = P({ x: 0, y: 0, z: 0 }).X, frontX = P({ x: 0, y: d.D, z: 0 }).X;
    const left = Math.min(backX, frontX), right = Math.max(backX, frontX);
    fctx.fillStyle = "rgba(255,255,255,0.03)"; fctx.fillRect(left, B.y, right - left, B.h);
    fctx.fillStyle = "rgba(255,255,255,0.05)"; fctx.fillRect(0, B.y + B.h, w, h - B.y - B.h);          // 床
    fctx.fillStyle = "rgba(156,130,63,0.35)"; fctx.fillRect(backX - (side === "shimote" ? 0 : 6), B.y, 6, B.h); // 奥壁
    fctx.strokeStyle = "rgba(239,231,214,0.07)"; fctx.lineWidth = 1;
    if (showOn("grid")) for (let m = 1; m < d.D; m++) { const X = P({ x: 0, y: m, z: 0 }).X; fctx.beginPath(); fctx.moveTo(X, B.y); fctx.lineTo(X, B.y + B.h); fctx.stroke(); }
    fctx.fillStyle = "rgba(240,231,214,0.45)"; fctx.font = "16px sans-serif"; fctx.textBaseline = "middle";
    [2, 4, 6, 8].filter((m) => m <= d.H).forEach((m) => { const Y = B.y + B.h - m / d.H * B.h; fctx.fillText(`${m}m`, B.x - 40, Y); fctx.strokeStyle = "rgba(239,231,214,0.07)"; fctx.beginPath(); fctx.moveTo(B.x, Y); fctx.lineTo(B.x + B.w, Y); fctx.stroke(); });
    fctx.fillText("床", B.x - 40, B.y + B.h);
    fctx.fillText("客席 ▶", side === "shimote" ? 30 : B.x + B.w + 20, B.y + 14); fctx.fillText("奥壁", side === "shimote" ? B.x + B.w + 20 : 30, B.y + 14);
    fctx.fillText(`${side === "shimote" ? "下手" : "上手"}側のスタンド・ブーム（舞台中央から見る）`, B.x + 10, B.y - 18);
    drawPiecesUp(fctx, P, B.w / d.D, { yawDeg: side === "shimote" ? -90 : 90 });
    // トラス（断面＝点）
    state.rig.trusses.forEach((t) => { const q = P({ x: 0, y: t.v * d.D, z: t.h }); const sel = state.selTruss === t.id && state.mode === "place"; fctx.beginPath(); fctx.arc(q.X, q.Y, sel ? 10 : 7, 0, Math.PI * 2); fctx.fillStyle = sel ? "#d3ac59" : "rgba(156,130,63,0.75)"; fctx.fill(); fctx.fillStyle = "rgba(156,130,63,0.9)"; fctx.font = "14px sans-serif"; fctx.fillText(`奥から${E.trussRow(state.rig, t.id)}列目`, q.X + 12, q.Y - 14); });
    // 光線（この側の灯は濃く、他は薄く）
    const litSpotsSide = [];   // 作業灯を消す（ブラックアウト）用
    if (state.mode === "move") state.rig.fixtures.forEach((f) => { const l = lightOf(f.id); if (!isLit(l)) return; const lv = litFactorOf(f, l); const S = fixtureWorld(f), T = targetAt(f.id, state.play.t); if (!S || !T) return; const s0 = P(S), tp = P(T); const mine = f.mount.type === "side" && f.mount.side === side; const air = l.surface === "air"; const dim = !(mine || (air && isSel(f.id))) || (state.sel.size && !isSel(f.id));
      if (showOn("beam")) { const be = beamEnd(l, S, T), e2 = P(be.world);
        const r = drawBeam(fctx, s0, e2, { S, T: be.world }, l.color, beamOf(f), dim, B.w / d.D, squashFor("side", be.surface || "air"), false, !be.surface, lv, l);
        litSpotsSide.push({ fromX: s0.X, fromY: s0.Y, toX: e2.X, toY: e2.Y, r, lv }); }
      if (air) {
        fctx.save(); fctx.setLineDash([5, 6]); fctx.strokeStyle = hexA(l.color, dim ? 0.15 : 0.45); fctx.lineWidth = 2; fctx.beginPath(); fctx.moveTo(tp.X, tp.Y); fctx.lineTo(tp.X, B.y + B.h); fctx.stroke(); fctx.restore();
        fctx.strokeStyle = hexA(l.color, dim ? 0.2 : 0.8); fctx.lineWidth = 3; fctx.beginPath(); fctx.moveTo(tp.X - 12, tp.Y - 12); fctx.lineTo(tp.X + 12, tp.Y + 12); fctx.moveTo(tp.X + 12, tp.Y - 12); fctx.lineTo(tp.X - 12, tp.Y + 12); fctx.stroke(); fctx.beginPath(); fctx.arc(tp.X, tp.Y, 16, 0, Math.PI * 2); fctx.stroke();
        const g = showOn("path") ? E.pathGuide(l, d) : null;
        if (g && g.kind === "line") { fctx.save(); fctx.setLineDash([8, 6]); fctx.strokeStyle = "rgba(223,100,51,0.7)"; fctx.lineWidth = 2; const a = P(g.a), b = P(g.b); fctx.beginPath(); fctx.moveTo(a.X, a.Y); fctx.lineTo(b.X, b.Y); fctx.stroke(); fctx.restore(); }
        if (g && g.kind === "loop" && g.plane === "sideVertical") { fctx.save(); fctx.setLineDash([8, 6]); fctx.strokeStyle = "rgba(223,100,51,0.7)"; fctx.lineWidth = 2; strokeLoop(fctx, P, g); fctx.restore(); }
        if (isSel(f.id)) drawHandles(fctx, P, l, f.id);
      }
    });
    // 灯体: この側のスタンド灯は床からの縦線＋印。他は小さく薄く
    state.rig.fixtures.forEach((f) => { const S = fixtureWorld(f); if (!S) return; const q = P(S);
      if (f.mount.type === "side" && f.mount.side === side) { fctx.strokeStyle = "rgba(240,231,214,0.5)"; fctx.lineWidth = 3; fctx.beginPath(); fctx.moveTo(q.X, B.y + B.h); fctx.lineTo(q.X, q.Y); fctx.stroke(); fctx.beginPath(); fctx.moveTo(q.X - 14, B.y + B.h); fctx.lineTo(q.X + 14, B.y + B.h); fctx.stroke();
        if (showOn("fixtures")) drawFixtureMark(fctx, q.X, q.Y, "diamond", { sel: isSel(f.id), st: lightState(f.id), color: (lightOf(f.id) || {}).color, no: showOn("no") ? label(f.id) : "" });
        if (isSel(f.id) && state.mode === "place") { fctx.fillStyle = "#d3ac59"; fctx.font = "15px sans-serif"; fctx.fillText(`高さ ${f.mount.h.toFixed(1)}m・${f.mount.v < 0.4 ? "奥寄り" : f.mount.v > 0.6 ? "手前寄り" : "中ほど"}（ドラッグで奥行きと高さ）`, q.X + 22, q.Y - 26); } }
      else if (f.mount.type !== "side") {
        // 前明かりは舞台より手前（客席側）。側面図では手前端の外に一定距離で並べ、高さは実尺で描く
        const frontX = side === "shimote" ? B.x + B.w + FRONT_DX_SEC : B.x - FRONT_DX_SEC;
        if (!showOn("fixtures")) return;
        fctx.globalAlpha = 0.35; drawFixtureMark(fctx, isFront(f) ? frontX : q.X, q.Y, shapeOf(f.mount), { sel: false, st: lightState(f.id), color: (lightOf(f.id) || {}).color, no: showOn("no") ? label(f.id) : "", moving: E.isMoving(f) }); fctx.globalAlpha = 1;
      } });
    drawBordersUp(fctx, P, d);
    if (state.mode === "move" && showOn("blackout")) paintBlackout(fctx, front, litSpotsSide);
    // 予告
    const hv = state.hover;
    if (state.tool === "side" && hv && hv.canvas === side) { const q = { X: E.clamp(hv.X, B.x, B.x + B.w), Y: E.clamp(hv.Y, B.y, B.y + B.h) }; fctx.strokeStyle = "rgba(240,231,214,0.3)"; fctx.setLineDash([6, 6]); fctx.beginPath(); fctx.moveTo(q.X, B.y + B.h); fctx.lineTo(q.X, q.Y); fctx.stroke(); fctx.setLineDash([]); drawFixtureMark(fctx, q.X, q.Y, "diamond", { ghost: true }); fctx.fillStyle = "rgba(240,231,214,0.85)"; fctx.font = "16px sans-serif"; fctx.fillText(`${side === "shimote" ? "下手" : "上手"}の袖に立てる（クリック）`, q.X + 22, q.Y - 26); }
    if (!state.rig.fixtures.some((f) => f.mount.type === "side" && f.mount.side === side) && state.tool !== "side") { fctx.fillStyle = "rgba(240,231,214,0.45)"; fctx.font = "16px sans-serif"; fctx.fillText(`${side === "shimote" ? "下手" : "上手"}側にスタンド灯はまだありません。右の「SS（袖から横切って）」でこの図をクリックすると立てられます。`, B.x + 10, B.y + B.h / 2); }
  }
  /* ---------- 描画: 客席から見る（3D・擬似パース） ----------
     舞台スケッチ本体の正面図と同じ式（rig-engine の makeFrontPerspProjector）で描く。
     床は奥から手前へ広がる台形、奥の壁はその上に立つ。高さも奥行きで縮む。 */
  function drawFront3D(sec) {
    const fctx = sec.ctx, cv = sec.cv, w = cv.width, h = cv.height;
    const B = secBox(cv, "front"), d = state.dims, P = secProj(sec);
    const L = E.frontPerspSetup(d, B, state.seat);
    fctx.clearRect(0, 0, w, h); fctx.fillStyle = "#0d0e10"; fctx.fillRect(0, 0, w, h);
    const at = (u, v, hM) => P({ x: (u - 0.5) * d.W, y: v * d.D, z: hM || 0 });
    // 床（奥から手前へ広がる台形）
    const bl = at(0, 0, 0), br = at(1, 0, 0), fl = at(0, 1, 0), fr = at(1, 1, 0);
    fctx.fillStyle = "rgba(255,255,255,0.05)"; fctx.beginPath();
    fctx.moveTo(bl.X, bl.Y); fctx.lineTo(br.X, br.Y); fctx.lineTo(fr.X, fr.Y); fctx.lineTo(fl.X, fl.Y); fctx.closePath(); fctx.fill();
    // 客席側の暗がり
    fctx.fillStyle = "rgba(156,130,63,0.05)"; fctx.fillRect(0, Math.min(fl.Y, fr.Y), w, h - Math.min(fl.Y, fr.Y));
    // 1mの枡（床）
    if (showOn("grid")) {
      fctx.strokeStyle = "rgba(239,231,214,0.07)"; fctx.lineWidth = 1;
      for (let m = 1; m < d.W; m++) { const u = m / d.W; const a = at(u, 0, 0), b = at(u, 1, 0); fctx.beginPath(); fctx.moveTo(a.X, a.Y); fctx.lineTo(b.X, b.Y); fctx.stroke(); }
      for (let m = 1; m < d.D; m++) { const v = m / d.D; const a = at(0, v, 0), b = at(1, v, 0); fctx.beginPath(); fctx.moveTo(a.X, a.Y); fctx.lineTo(b.X, b.Y); fctx.stroke(); }
    }
    // 奥の壁
    const tl = at(0, 0, d.H), tr = at(1, 0, d.H);
    fctx.fillStyle = "rgba(255,255,255,0.03)"; fctx.beginPath();
    fctx.moveTo(bl.X, bl.Y); fctx.lineTo(br.X, br.Y); fctx.lineTo(tr.X, tr.Y); fctx.lineTo(tl.X, tl.Y); fctx.closePath(); fctx.fill();
    fctx.strokeStyle = "rgba(239,231,214,0.25)"; fctx.stroke();
    // 高さの目盛り（奥の壁の左）
    fctx.fillStyle = "rgba(240,231,214,0.45)"; fctx.font = "16px sans-serif"; fctx.textBaseline = "middle";
    [2, 4, 6, 8].filter((m) => m <= d.H).forEach((m) => { const q = at(0, 0, m); fctx.fillText(`${m}m`, q.X - 42, q.Y); fctx.strokeStyle = "rgba(239,231,214,0.07)"; fctx.beginPath(); fctx.moveTo(q.X, q.Y); fctx.lineTo(at(1, 0, m).X, at(1, 0, m).Y); fctx.stroke(); });
    fctx.fillText("下手", Math.max(6, bl.X - 42), fl.Y - 18); fctx.fillText("上手", Math.min(w - 40, br.X + 8), fr.Y - 18);
    drawPiecesUp(fctx, P, L.pxPerM, { yawDeg: 0, zDropPerM: (L.bottomY - L.floorY) / d.D, stretchAt: (v) => 1 + L.seat.rise * v });
    // バトン（奥行きのある横線）
    state.rig.trusses.forEach((t) => { const a = at(0, t.v, t.h), b = at(1, t.v, t.h); const sel = state.selTruss === t.id && state.mode === "place";
      fctx.strokeStyle = sel ? "#d3ac59" : "rgba(156,130,63,0.75)"; fctx.lineWidth = sel ? 5 : 3; fctx.beginPath(); fctx.moveTo(a.X, a.Y); fctx.lineTo(b.X, b.Y); fctx.stroke();
      fctx.fillStyle = sel ? "#d3ac59" : "rgba(156,130,63,0.7)"; fctx.font = "15px sans-serif"; fctx.fillText(`${t.label || "バトン"} 高さ${t.h.toFixed(1)}m`, b.X + 10, b.Y); });
    // 光
    const litSpots3D = [];   // 作業灯を消す（ブラックアウト）用
    if (state.mode === "move") state.rig.fixtures.forEach((f) => {
      const l = lightOf(f.id); if (!isLit(l)) return;
      const lv = litFactorOf(f, l);
      const S = fixtureWorld(f), T = targetAt(f.id, state.play.t); if (!S || !T) return;
      const s0 = P(S), tp = P(T); const dim = state.sel.size && !isSel(f.id);
      if (showOn("beam")) {
        /* 3Dでは床の潰れ方を式から出せる。奥行き1mで画面が縦に動く量 ÷ その奥行きでの横1m。
           これが床に落ちた丸の「縦／横」の比になる。壁と空中は客席に正対するので潰さない。 */
        const be = beamEnd(l, S, T), e2 = P(be.world);
        const sq = be.surface === "floor"
          ? [1, Math.min(1, ((L.bottomY - L.floorY) / d.D) / (L.pxPerM * Math.max(0.05, e2.scale || 1)))]
          : squashFor("front", be.surface || "air");
        const r = drawBeam(fctx, s0, e2, { S, T: be.world }, l.color, beamOf(f), dim, L.pxPerM * Math.max(0.05, e2.scale || 1), sq, false, !be.surface, lv, l);
        litSpots3D.push({ fromX: s0.X, fromY: s0.Y, toX: e2.X, toY: e2.Y, r, lv });
      }
      if (showOn("path")) { const g = E.pathGuide(l, d);
        if (g && g.kind === "line") { fctx.save(); fctx.setLineDash([8, 6]); fctx.strokeStyle = "rgba(223,100,51,0.7)"; fctx.lineWidth = 2; const a = P(g.a ? E.pointWorld(g.a, d) : S), b = P(E.pointWorld(g.b, d)); fctx.beginPath(); fctx.moveTo(a.X, a.Y); fctx.lineTo(b.X, b.Y); fctx.stroke(); fctx.restore(); } }
      if (isSel(f.id) && (l.surface === "back" || l.surface === "air")) drawHandles(fctx, (pt) => P(pt), l, f.id);
    });
    // 灯体
    state.rig.fixtures.forEach((f) => { const S = fixtureWorld(f); if (!S) return; const p = P(S);
      if (showOn("fixtures")) drawFixtureMark(fctx, p.X, isFront(f) ? Math.max(20, p.Y) : p.Y, shapeOf(f.mount), { sel: isSel(f.id), st: lightState(f.id), color: (lightOf(f.id) || {}).color, no: showOn("no") ? label(f.id) : "", moving: E.isMoving(f) }); });
    drawBordersUp(fctx, P, d);
    if (state.mode === "move" && showOn("blackout")) paintBlackout(fctx, cv, litSpots3D);
    fctx.fillStyle = "rgba(240,231,214,0.4)"; fctx.font = "15px sans-serif"; fctx.textBaseline = "top";
    fctx.fillText(`${L.seat.label}から見た形（舞台スケッチの正面図と同じ描き方）`, 8, h - 24);
  }

  function draw() { drawPlan(); SECS.forEach((sec) => (sec.kind === "front" ? (state.front3d ? drawFront3D(sec) : drawFront(sec)) : drawSide(sec))); }

  /* ---------- 当たり判定 ---------- */
  // 灯体の平面図上の画面座標。当たり判定と範囲選択（マーキー）の両方で使う共通の式。
  function fixturePlanXY(f, P, B) { const S = fixtureWorld(f); if (!S) return null; const p = P(S); const X = f.mount.type === "side" ? (f.mount.side === "shimote" ? B.x - SIDE_DX : B.x + B.w + SIDE_DX) : p.X; const Y = isFront(f) ? B.y + B.h + FRONT_DY : p.Y; return { X, Y }; }
  function hitFixturePlan(pt) { const P = planProj(), B = planBox(); let best = null; state.rig.fixtures.forEach((f) => { const xy = fixturePlanXY(f, P, B); if (!xy) return; if (Math.hypot(pt.X - xy.X, pt.Y - xy.Y) < 22) best = f; }); return best; }
  function hitFixtureSec(sec, pt) { const P = secProj(sec); let best = null; state.rig.fixtures.forEach((f) => { if (sec.kind !== "front" && !(f.mount.type === "side" && f.mount.side === sec.kind)) return; const S = fixtureWorld(f); if (!S) return; const p = P(S); if (Math.hypot(pt.X - p.X, pt.Y - p.Y) < 22) best = f; }); return best; }
  function hitTrussPlan(pt) { const B = planBox(); return state.rig.trusses.find((t) => Math.abs(pt.Y - (B.y + t.v * B.h)) < 14 && pt.X > B.x - 30 && pt.X < B.x + B.w + 30) || null; }
  // 円の半径ハンドルの世界座標。面ごとに「その面が本当の円として見える図」の軸へオフセットする
  // （水平＝平面図でu方向、正面に垂直＝正面図でu方向、側面に垂直＝側面図でv方向）
  function circleRadiusWorld(c, r, plane, d, tilt) {
    const cw = E.pointWorld(c, d), o = E.planeVec(plane, r, 0, tilt);
    return { x: cw.x + o.dx, y: cw.y + o.dy, z: cw.z + o.dz };
  }
  // 返すのは handle（"a"|"b"|"c"|"r"）。drag の kind（"handle"）と別名にしておかないと、
  // 展開（...hh）で kind が上書きされて掴めても動かない（2026-09-11 修正）。
  /* 掴めるハンドルを探す（平面図=floor/air・正面図=back/air・側面図=air）。
     選択中のどの灯でも掴める。複数選んでいるときは、最後に描かれた灯（手前）から順に見る。 */
  function hitHandle(pt, P, allowedSurfaces) {
    const ids = [...state.sel]; const d = state.dims;
    const near = (pt3) => { const q = P(E.pointWorld(pt3, d)); return Math.hypot(pt.X - q.X, pt.Y - q.Y) < 18; };
    for (let i = ids.length - 1; i >= 0; i--) {
      const fid = ids[i], l = lightOf(fid);
      if (!isLit(l) || !allowedSurfaces.includes(l.surface)) continue;
      const p = l.path || {};
      if (p.kind === "line") { if (near(p.a)) return { fid, handle: "a" }; if (near(p.b)) return { fid, handle: "b" }; }
      else if (p.kind === "circle" || p.kind === "eight") { const rq = P(circleRadiusWorld(p.c, p.r, p.plane, d, p.tilt)); if (Math.hypot(pt.X - rq.X, pt.Y - rq.Y) < 18) return { fid, handle: "r" }; if (near(p.c)) return { fid, handle: "c" }; }
      else if (near(p.a || E.newPoint())) return { fid, handle: "a" };
    }
    return null;
  }

  /* 掴んだハンドルと一緒に動かす、ほかの選択中の灯のハンドルを集める。
     動かし方は<b>差分</b>——掴んだ点が動いたぶんだけ、相手も動かす。
       ・同じ点を共有している灯（「そろえて振る」のA・B）は、同じ点のまま一緒に動く。
       ・灯ごとに違う点を持つ灯（「まわす」の円の中心、「扇に開く」の外側の端）は、
         <b>並びを保ったまま</b>まとめて動く（2026-09-12 本人要望）。
     相手のハンドルは「同じ位置にあるもの」を優先し、無ければ同じ名前のものを使う。
     位置を先に見るのは、「交差する」でA・Bが1本おきに入れ替わっているため。 */
  const samePoint = (p, q) => Boolean(p) && Boolean(q)
    && Math.abs(E.finite(p.u, 0) - E.finite(q.u, 0)) < 0.004
    && Math.abs(E.finite(p.v, 0) - E.finite(q.v, 0)) < 0.006
    && Math.abs(E.finite(p.hM, 0) - E.finite(q.hM, 0)) < 0.05;
  const pathPoint = (p, name) => (name === "c" ? p.c : p[name] || p.a);
  function handleTargets(hh) {
    const src = lightOf(hh.fid); const sp = src && src.path; if (!sp) return [];
    const grabbed = hh.handle === "r" ? null : pathPoint(sp, hh.handle);
    const out = [];
    [...state.sel].forEach((fid) => {
      const l = lightOf(fid); const p = l && l.path; if (!p || !isLit(l)) return;
      if (hh.handle === "r") { if (p.kind === "circle" || p.kind === "eight") out.push({ fid, handle: "r", r0: p.r }); return; }
      if (l.surface !== src.surface) return;          // 当てる場所が違う灯は巻き込まない
      let name = null;
      if (p.kind === "circle" || p.kind === "eight") name = "c";
      else if (p.kind === "line") name = samePoint(p.a, grabbed) ? "a" : samePoint(p.b, grabbed) ? "b" : (hh.handle === "a" || hh.handle === "b" ? hh.handle : null);
      else name = "a";
      const pt = name && pathPoint(p, name); if (!pt) return;
      out.push({ fid, handle: name, u0: E.finite(pt.u, 0), v0: E.finite(pt.v, 0), h0: E.finite(pt.hM, 0) });
    });
    return out;
  }
  /* ハンドルを掴んだ時点で、サーチライトのつまみとの結び付きを切る。
     切らないと、手で動かした軌道を次のつまみ操作が丸ごと上書きしてしまう。 */
  function startHandleDrag(hh, axis, sec) {
    if (state.play.on) stop("調整するため再生を止めました");
    const src = lightOf(hh.fid); const sp = src && src.path;
    const g = hh.handle === "r" ? null : pathPoint(sp || {}, hh.handle);
    const targets = handleTargets(hh);
    if (targets.length > 1) state.slLive = "";
    state.drag = {
      kind: "handle", axis, sec, ...hh, targets, before: snapshot(),
      g0: g ? { u: E.finite(g.u, 0), v: E.finite(g.v, 0), hM: E.finite(g.hM, 0) } : null,
      r0: hh.handle === "r" && sp ? sp.r : 0,
    };
    if (targets.length > 1) renderInspector();
  }

  /* ---------- ポインタ操作: 平面図 ---------- */
  plan.addEventListener("pointerdown", (ev) => {
    const pt = canvasPoint(plan, ev); const B = planBox(); try { plan.setPointerCapture(ev.pointerId); } catch (_) { /* 合成イベント等 */ } plan.focus && plan.focus();
    if (state.tool === "truss") { addTruss(snapV(E.clamp((pt.Y - B.y) / B.h, 0, 1))); return; }   // addTruss内で灯体配置モードへ移る
    if (state.tool === "fixture") { const t = E.trussById(state.rig, state.selTruss); if (!t) return; const Y = B.y + t.v * B.h; if (Math.abs(pt.Y - Y) < 60 && inBox({ X: pt.X, Y }, B)) { addFixture({ type: "truss", trussId: t.id, u: snapU((pt.X - B.x) / B.w) }); toast(`${label([...state.sel][0])}を奥から${E.trussRow(state.rig, t.id)}列目に置きました`, "元に戻す", undo); } return; }
    if (state.tool === "floor") { if (inBox(pt, B)) { addFixture({ type: "floor", u: snapU((pt.X - B.x) / B.w), v: snapV((pt.Y - B.y) / B.h) }); toast(`${label([...state.sel][0])}を床に置きました`, "元に戻す", undo); } return; }
    if (state.tool === "side") { const side = pt.X < B.x ? "shimote" : pt.X > B.x + B.w ? "kamite" : null; if (side) { addFixture({ type: "side", side, v: snapV(E.clamp((pt.Y - B.y) / B.h, 0, 1)), h: 2 }); toast(`${label([...state.sel][0])}を${side === "shimote" ? "下手" : "上手"}の袖に立てました`, "元に戻す", undo); } return; }
    if (state.tool === "front") {
      if (pt.Y > B.y + B.h) { addFixture({ type: "front", u: snapU(E.clamp((pt.X - B.x) / B.w, 0, 1)), ahead: 5, h: 7 }, "fixed"); toast(`${label([...state.sel][0])}を前明かりに置きました（舞台前から約5m・高さ約7m）`, "元に戻す", undo); }
      else toast("舞台より手前（客席側の帯）をクリックしてください");
      return;
    }
    // 選択モード
    if (state.mode === "move") { const hh = hitHandle(pt, planProj(), ["floor", "air"]); if (hh) { startHandleDrag(hh, "uv"); return; } }
    const f = hitFixturePlan(pt);
    if (f) { if (ev.shiftKey) { state.sel.has(f.id) ? state.sel.delete(f.id) : state.sel.add(f.id); } else if (!state.sel.has(f.id)) state.sel = new Set([f.id]); state.selTruss = f.mount.type === "truss" ? f.mount.trussId : state.selTruss; if (state.mode === "place" && !ev.shiftKey) state.drag = { kind: "fixture", fid: f.id, before: snapshot(), moved: false, startU: f.mount.u, startV: f.mount.v, X0: pt.X, Y0: pt.Y }; renderAll(); return; }
    if (state.mode === "place") { const t = hitTrussPlan(pt); if (t) { state.selTruss = t.id; state.sel.clear(); state.drag = { kind: "truss", tid: t.id, before: snapshot(), moved: false }; renderAll(); return; } }
    /* 何も掴まなかった＝ドラッグで囲んで複数選ぶ（マーキー選択。2026-09-13 本人要望「範囲選択」）。
       非Shiftはここで先に選択を空にしておく——ただドラッグせずクリックだけした場合も
       「選択を外す」として従来どおり働く。Shiftはいまの選択に足していく。 */
    state.drag = { kind: "marquee", x0: pt.X, y0: pt.Y, x1: pt.X, y1: pt.Y, base: new Set(state.sel), moved: false };
    if (!ev.shiftKey) state.sel.clear();
    renderAll();
  });
  plan.addEventListener("pointermove", (ev) => {
    const pt = canvasPoint(plan, ev); const B = planBox(); state.hover = { canvas: "plan", ...pt };
    const dg = state.drag;
    if (dg && dg.kind === "fixture") { const f = fixtureById(dg.fid); if (f) { const u = snapU(E.clamp((pt.X - B.x) / B.w, 0, 1)), v = snapV(E.clamp((pt.Y - B.y) / B.h, 0, 1)); if (f.mount.type === "truss") f.mount.u = u; else if (f.mount.type === "floor") { f.mount.u = u; f.mount.v = v; } else f.mount.v = v; dg.moved = true; } }
    else if (dg && dg.kind === "truss") { const t = E.trussById(state.rig, dg.tid); if (t) { t.v = snapV(E.clamp((pt.Y - B.y) / B.h, 0, 1)); dg.moved = true; } }
    else if (dg && dg.kind === "handle") { const uv = E.planToUV(state.dims, B, pt.X, pt.Y); applyHandleDrag(dg, { u: snapU(uv.u), v: snapV(uv.v) }, dg.axis); }
    else if (dg && dg.kind === "marquee") {
      dg.x1 = pt.X; dg.y1 = pt.Y;
      if (!dg.moved && Math.hypot(dg.x1 - dg.x0, dg.y1 - dg.y0) > 4) dg.moved = true;
      if (dg.moved) {
        const P = planProj();
        const lo = { X: Math.min(dg.x0, dg.x1), Y: Math.min(dg.y0, dg.y1) };
        const hi = { X: Math.max(dg.x0, dg.x1), Y: Math.max(dg.y0, dg.y1) };
        const inside = state.rig.fixtures.filter((f) => { const xy = fixturePlanXY(f, P, B); return xy && xy.X >= lo.X && xy.X <= hi.X && xy.Y >= lo.Y && xy.Y <= hi.Y; });
        state.sel = new Set([...dg.base, ...inside.map((f) => f.id)]);
      }
    }
    if (dg) { draw(); if (dg.kind !== "handle") renderInspector(); } else draw();
  });
  const endDrag = () => {
    const dg = state.drag; if (!dg) return; state.drag = null;
    if (dg.kind === "marquee") { renderAll(); return; }   // 範囲選択は元に戻す対象にしない（選択はundo外）
    if (dg.moved) { state.history.push(dg.before); state.future.length = 0; state.dirty = true; } renderAll();
  };
  plan.addEventListener("pointerup", endDrag); plan.addEventListener("pointercancel", endDrag);
  plan.addEventListener("pointerleave", () => { state.hover = null; draw(); });
  /* 図の灯体をダブルクリックでオン／オフ（2026-09-11 本人要望）。
     配置のページで押したときは、灯体情報のページへ移って点ける。 */
  function toggleLightOf(f) {
    if (!f) return;
    state.sel = new Set([f.id]);
    if (state.mode !== "move") { state.mode = "move"; turnOn(f.id); commit(`${label(f.id)}を点けました`); return; }
    const l = lightOf(f.id);
    if (isLit(l)) { setLight(f.id, { on: false }); commit(`${label(f.id)}を消しました`); }
    else { turnOn(f.id); commit(`${label(f.id)}を点けました`); }
  }
  plan.addEventListener("dblclick", (ev) => { ev.preventDefault(); toggleLightOf(hitFixturePlan(canvasPoint(plan, ev))); });
  // axis: "uv"(平面図: 高さは変えない) / "uh"(正面図: 奥行きは変えない) / "vh"(側面図: 左右は変えない)
  /* ドラッグ中。掴んだ点は指の位置そのもの、ほかの灯は<b>同じぶんだけ</b>動かす（差分）。
     同じ点を共有していた灯は差分ゼロの地点から動くので、結果として同じ点のまま揃う。 */
  function applyHandleDrag(dg, values, axis) {
    dg.moved = true;
    const d = state.dims;
    const targets = (dg.targets && dg.targets.length) ? dg.targets : [{ fid: dg.fid, handle: dg.handle, u0: null }];
    if (dg.handle === "r") {
      const src = lightOf(dg.fid); const sp = src && src.path; if (!sp) return;
      const cw = E.pointWorld(sp.c, d);
      const rNew = axis === "vh" ? Math.abs(values.v * d.D - cw.y) : Math.abs((values.u - 0.5) * d.W - cw.x);
      const dr = E.clamp(rNew, 0.3, Math.max(d.W, d.H)) - (dg.r0 || 0);
      targets.forEach((h) => { const l = lightOf(h.fid); if (l && l.path) l.path.r = E.clamp((h.r0 || 0) + dr, 0.3, Math.max(d.W, d.H)); });
      return;
    }
    const g0 = dg.g0 || { u: 0, v: 0, hM: 0 };
    const du = values.u == null ? 0 : values.u - g0.u;
    const dv = values.v == null ? 0 : values.v - g0.v;
    const dh = values.hM == null ? 0 : values.hM - g0.hM;
    targets.forEach((h) => {
      const l = lightOf(h.fid); const p = l && l.path; if (!p) return;
      const target = h.handle === "c" ? p.c : (p.kind === "still" ? (p.a = p.a || E.newPoint()) : p[h.handle]);
      if (!target) return;
      const u0 = h.u0 == null ? E.finite(target.u, 0) : h.u0;
      const v0 = h.v0 == null ? E.finite(target.v, 0) : h.v0;
      const hh0 = h.h0 == null ? E.finite(target.hM, 0) : h.h0;
      if (axis === "uv") { target.u = E.clamp(u0 + du, 0, 1); target.v = E.clamp(v0 + dv, 0, 1); }
      else if (axis === "uh") { target.u = E.clamp(u0 + du, 0, 1); target.hM = E.clamp(hh0 + dh, 0, d.H); }
      else if (axis === "vh") { target.v = E.clamp(v0 + dv, 0, 1); target.hM = E.clamp(hh0 + dh, 0, d.H); }
    });
  }

  /* ---------- ポインタ操作: 断面図（正面・下手・上手の3面を同時に扱う） ---------- */
  // 4図を一度に出すので「いまどの図を見ているか」の状態は持たない。押された図そのものが向きを決める。
  function bindSection(sec) {
    const cv = sec.cv, side = sec.kind; // side: "front" | "shimote" | "kamite"
    cv.addEventListener("pointerdown", (ev) => {
      const pt = canvasPoint(cv, ev); const B = secBox(cv, side); const P = secProj(sec);
      try { cv.setPointerCapture(ev.pointerId); } catch (_) { /* 合成イベント等 */ }
      if (side !== "front") {
        if (state.tool === "side") { const vh = E.sideToVH(state.dims, B, side, pt.X, pt.Y); addFixture({ type: "side", side, v: snapV(vh.v), h: Math.max(0.3, snapH(vh.h)) }); toast(`${label([...state.sel][0])}を${side === "shimote" ? "下手" : "上手"}の袖に立てました`, "元に戻す", undo); return; }
        if (state.mode === "move") { const hh = hitHandle(pt, P, ["air"]); if (hh) { startHandleDrag(hh, "vh", sec); return; } }
        const f = hitFixtureSec(sec, pt);
        if (f) { state.sel = ev.shiftKey ? (state.sel.has(f.id) ? (state.sel.delete(f.id), state.sel) : state.sel.add(f.id)) : new Set([f.id]); if (state.mode === "place" && !ev.shiftKey) state.drag = { kind: "sideVH", fid: f.id, sec, before: snapshot(), moved: false }; renderAll(); return; }
        if (!ev.shiftKey) { state.sel.clear(); renderAll(); }
        return;
      }
      if (state.mode === "place") {
        const t = E.trussById(state.rig, state.selTruss);
        if (t && !(side === "front" && state.front3d)) { const Y = B.y + B.h - t.h / state.dims.H * B.h; if (pt.X > B.x + B.w && Math.abs(pt.Y - Y) < 24) { state.drag = { kind: "trussH", tid: t.id, sec, before: snapshot(), moved: false }; return; } }
        const f = hitFixtureSec(sec, pt); if (f) { state.sel = new Set([f.id]); if (f.mount.type === "side") state.drag = { kind: "sideH", fid: f.id, sec, before: snapshot(), moved: false }; renderAll(); return; }
        if (!(side === "front" && state.front3d)) { const t2 = state.rig.trusses.find((tt) => Math.abs(pt.Y - (B.y + B.h - tt.h / state.dims.H * B.h)) < 12); if (t2) { state.selTruss = t2.id; state.sel.clear(); renderAll(); } }
        return;
      }
      const hh = hitHandle(pt, P, ["back", "air"]); if (hh) { startHandleDrag(hh, "uh", sec); return; }
      const f = hitFixtureSec(sec, pt); if (f) { state.sel = ev.shiftKey ? (state.sel.has(f.id) ? (state.sel.delete(f.id), state.sel) : state.sel.add(f.id)) : new Set([f.id]); renderAll(); }
    });
    cv.addEventListener("pointermove", (ev) => {
      const pt = canvasPoint(cv, ev); const B = secBox(cv, side); state.hover = { canvas: sec.kind, ...pt }; const dg = state.drag;
      if (!dg) { if (state.tool === "side" && side !== "front") draw(); return; }
      if (dg.sec && dg.sec !== sec) return; // 掴んだ図の上だけで動かす
      if (dg.kind === "sideVH") { const f = fixtureById(dg.fid); if (f) { const vh = E.sideToVH(state.dims, B, side, pt.X, pt.Y); f.mount.v = snapV(vh.v); f.mount.h = E.clamp(snapH(vh.h), 0.3, state.dims.H); dg.moved = true; } draw(); renderInspector(); return; }
      if (dg.kind === "trussH") { const t = E.trussById(state.rig, dg.tid); if (t) { t.h = E.clamp(snapH((B.y + B.h - pt.Y) / B.h * state.dims.H), 2, state.dims.H); t.tentative = false; dg.moved = true; } }
      else if (dg.kind === "sideH") { const f = fixtureById(dg.fid); if (f) { f.mount.h = E.clamp(snapH((B.y + B.h - pt.Y) / B.h * state.dims.H), 0.3, state.dims.H); dg.moved = true; } }
      else if (dg.kind === "handle" && dg.axis === "uh") {
        // 3Dのときは擬似パースの逆算。奥行きは動かさないので、いまの点のvを渡す
        const cur = (() => { const l = lightOf(dg.fid); const pth = l && l.path; const t = !pth ? null : dg.handle === "c" ? pth.c : pth[dg.handle] || pth.a; return t ? t.v : 0.5; })();
        const uh = (side === "front" && state.front3d)
          ? E.frontPerspToUH(state.dims, B, state.seat, pt.X, pt.Y, cur)
          : E.frontToUH(state.dims, B, pt.X, pt.Y);
        applyHandleDrag(dg, { u: snapU(uh.u), hM: snapH(uh.h) }, "uh");
      }
      else if (dg.kind === "handle" && dg.axis === "vh") { const vh = E.sideToVH(state.dims, B, side, pt.X, pt.Y); applyHandleDrag(dg, { v: snapV(vh.v), hM: snapH(vh.h) }, "vh"); }
      draw(); if (dg.kind !== "handle") renderInspector();
    });
    cv.addEventListener("dblclick", (ev) => { ev.preventDefault(); toggleLightOf(hitFixtureSec(sec, canvasPoint(cv, ev))); });
    cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);
    cv.addEventListener("pointerleave", () => { state.hover = null; draw(); });
  }
  SECS.forEach(bindSection);
  // 客席から見る図の描き方（平面／3D）。3Dは本体の正面図と同じ擬似パース（2026-09-11 本人要望）
  document.querySelectorAll("#frontmode button").forEach((b) => {
    b.onclick = () => { state.front3d = b.dataset.front === "3d"; renderAll(); };
  });
  if ($("seat")) $("seat").addEventListener("change", () => { state.seat = $("seat").value; draw(); });
  if ($("snap")) $("snap").addEventListener("change", () => { state.snap = $("snap").checked; draw(); });

  /* ---------- 図に出すもの・探す・舞台の大きさ（4図化で空いた場所へ入れた操作） ---------- */
  document.querySelectorAll("#showtoggles button, #lighttoggles button").forEach((b) => {
    /* 作業灯を消すの入り切りでは、消し具合のつまみの出し入れもいるので renderAll で作り直す。
       ほかは図だけ描き直せば足りる。 */
    b.onclick = () => { state.show[b.dataset.show] = !showOn(b.dataset.show); if (b.dataset.show === "blackout") renderAll(); else { b.setAttribute("aria-pressed", String(showOn(b.dataset.show))); draw(); } };
  });
  /* 作業灯をどれだけ消すか。つまみと数値入力は同じ値を指す（2026-09-13 本人要望）。 */
  {
    const setDim = (v, from) => {
      state.dim = E.clamp(E.finite(v, 100), 0, 100);
      if (from !== "range" && $("dim")) $("dim").value = state.dim;
      if (from !== "num" && $("dimnum")) $("dimnum").value = state.dim;
      draw();
    };
    if ($("dim")) $("dim").addEventListener("input", () => setDim(Number($("dim").value), "range"));
    if ($("dimnum")) $("dimnum").addEventListener("input", () => setDim(Number($("dimnum").value), "num"));
  }
  if ($("search")) $("search").addEventListener("input", () => { state.search = $("search").value.trim(); renderList(); });
  // 舞台の大きさ: 図の縮尺と1m吸着の基準が変わるので、動かすたびに描き直す
  [["dimW", "W", "m"], ["dimD", "D", "m"], ["dimH", "H", "m"]].forEach(([id, key]) => {
    const el = $(id); if (!el) return;
    el.value = state.dims[key];
    const sync = () => { $(id + "v").textContent = `${state.dims[key]}m`; };
    sync();
    el.addEventListener("input", () => { state.dims[key] = Number(el.value); sync(); draw(); renderInspector(); });
    el.addEventListener("change", () => { state.dirty = true; renderAll(); });
  });

  /* ---------- キーボード ---------- */
  document.addEventListener("keydown", (ev) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    if (ev.key === "Escape") { if (state.drag) { const dg = state.drag; state.drag = null; restore(dg.before); state.dirty = true; } else if (state.tool) { state.tool = null; renderAll(); } else if (state.sel.size) { state.sel.clear(); renderAll(); } return; }
    if (typing) return;
    if (ev.key === " ") { ev.preventDefault(); state.play.on ? stop() : play(); }
    if ((ev.key === "Delete" || ev.key === "Backspace") && state.mode === "place" && state.sel.size) { ev.preventDefault(); removeSelected(); }
    if ((ev.key === "d" || ev.key === "D") && state.mode === "place" && state.sel.size) duplicateSelected();
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
  });

  /* ---------- 左: 一覧 ---------- */
  // 取り付け場所ごとのまとまり（20灯以上でも追えるように。LuminaPlotのpositions階層に相当）
  /* 取り付け場所ごとの区分。配置でも灯体情報でも同じ見出しを使う（2026-09-11 本人要望。
     前明かりなのか吊りなのか、バトン1なのかバトン2なのかが、どちらのページでも分かるように）。 */
  function mountSections(from) {
    const list = from || state.rig.fixtures;
    const secs = [];
    state.rig.trusses.forEach((t) => secs.push({ key: `t:${t.id}`, name: `吊り・奥から${E.trussRow(state.rig, t.id)}列目${t.label ? "・" + t.label : ""}`, items: list.filter((f) => f.mount.type === "truss" && f.mount.trussId === t.id) }));
    secs.push({ key: "front", name: "前明かり（客席の上）", items: list.filter((f) => f.mount.type === "front") });
    secs.push({ key: "floor", name: "転がし（床置き）", items: list.filter((f) => f.mount.type === "floor") });
    secs.push({ key: "shimote", name: "SS・下手の袖", items: list.filter((f) => f.mount.type === "side" && f.mount.side === "shimote") });
    secs.push({ key: "kamite", name: "SS・上手の袖", items: list.filter((f) => f.mount.type === "side" && f.mount.side === "kamite") });
    return secs.map((x) => ({ ...x, items: x.items.filter(passSearch) })).filter((x) => x.items.length);
  }
  const passFilter = (fid) => state.filter === "all" || lightState(fid) === state.filter;
  // 20灯以上でも目当ての1灯へ届くように、番号・名前・取り付け場所の文字で絞る
  function passSearch(f) {
    const q = state.search; if (!q) return true;
    return `${label(f.id)} ${f.name || ""} ${E.describeMount(f, state.rig)}`.toLowerCase().includes(q.toLowerCase());
  }

  function renderList() {
    const host = $("list"); host.innerHTML = "";
    // 20灯以上でも一度に見渡せるよう、多いときは1行表示へ落とす（2026-09-11 実測で7行しか見えなかった）
    host.classList.toggle("compact", state.rig.fixtures.length > 12);
    // 灯体情報のページは1行が短い（番号・名前・オンオフ）ので、横に2列へ折り返す（2026-09-11 本人要望）
    host.classList.toggle("cols2", true);   // 配置・灯体情報とも横2列（2026-09-11 本人要望）
    const c = cue(); const grouped = new Set(c.groups.flatMap((g) => g.members));
    const row = (f, idx) => { const r = document.createElement("div"); r.className = "row" + (isSel(f.id) ? " sel" : ""); const st = lightState(f.id);
      r.innerHTML = `<span class="no">${idx !== undefined ? idx + 1 + "." : ""}${label(f.id)}</span><span class="nm">${f.name || "名前なし"}<small>${E.describeMount(f, state.rig).replace(/（高さ約\dm）/, "")}</small></span>`;
      // 状態の欄はそのまま押せるオン／オフにする（2026-09-11 本人要望。一覧から直接切り替えたい）
      const stCell = document.createElement(state.mode === "move" ? "button" : "span");
      stCell.className = state.mode === "move" ? "st " + st : "st spot";
      /* 配置タブの3列目は空いているので、灯ごとに違う取り付け位置（下手寄り／中央など）を出す。
         2列表示にしたときに行の <small> がCSSで隠れて見えなくなっていたぶんの復帰
         （2026-09-13 本人要望）。見出しが言っている「吊り・奥から1列目」等は繰り返さない。 */
      if (state.mode === "place") { stCell.textContent = E.mountSpot(f); stCell.title = E.describeMount(f, state.rig); }
      if (state.mode === "move") {
        stCell.type = "button";
        stCell.textContent = st === "off" ? "オフ" : "オン";
        stCell.title = st === "off" ? "いまオフ。押すとオン" : "いまオン。押すとオフ";
        stCell.onclick = (ev) => { ev.stopPropagation(); const l = lightOf(f.id); if (isLit(l)) setLight(f.id, { on: false }); else turnOn(f.id); commit(); };
      }
      r.append(stCell);
      r.onclick = (ev) => { if (ev.shiftKey) { isSel(f.id) ? state.sel.delete(f.id) : state.sel.add(f.id); } else state.sel = new Set([f.id]); if (f.mount.type === "truss") state.selTruss = f.mount.trussId; renderAll(); }; return r; };
    if (state.mode === "place") {
      // 配置モード: 取り付け場所ごとに畳める。見出しクリックでその列をまるごと選択
      mountSections().forEach((sec) => {
        const h = document.createElement("div"); h.className = "grp";
        const open = !state.collapsed.has(sec.key);
        h.innerHTML = `<span>${open ? "▾" : "▸"} ${sec.name}</span><small>${sec.items.length}灯　列を選ぶ</small>`;
        h.querySelector("span").onclick = (ev) => { ev.stopPropagation(); open ? state.collapsed.add(sec.key) : state.collapsed.delete(sec.key); renderAll(); };
        h.querySelector("small").onclick = (ev) => { ev.stopPropagation(); state.sel = new Set(sec.items.map((f) => f.id)); const first = sec.items[0]; if (first && first.mount.type === "truss") state.selTruss = first.mount.trussId; renderAll(); };
        host.append(h);
        if (open) sec.items.forEach((f) => host.append(row(f)));
      });
      if (!state.rig.fixtures.length) host.innerHTML = '<p class="hint" style="padding:6px">灯体はまだありません。</p>';
      else if (!host.children.length) host.innerHTML = `<p class="hint" style="padding:6px">「${state.search}」に当てはまる灯体はありません。</p>`;
      $("sel-count").textContent = state.sel.size > 1 ? `${state.sel.size}灯を選択中` : "";
      $("dup").disabled = !state.sel.size; $("del").disabled = !state.sel.size; $("spread").disabled = !canSpread();
      $("mirror").disabled = !canMirror();
      $("spread").title = canSpread() ? "" : "同じバトンの3灯以上を選ぶと使えます";
      $("mirror").title = canMirror() ? "下手⇄上手へ配置だけを写します" : "SS（袖）の灯を選ぶと使えます";
      return;
    }
    if (state.mode === "move") c.groups.forEach((g, gi) => { const h = document.createElement("div"); h.className = "grp"; h.innerHTML = `<span>組${gi + 1}　${groupName(g)}</span><small>${g.members.length}灯</small>`; h.onclick = () => { state.sel = new Set(g.members); renderAll(); }; host.append(h); g.members.forEach((m, i) => { const f = fixtureById(m); if (f) host.append(row(f, g.relation === "sequential" ? i : undefined)); }); });
    /* 組に入っていない灯は、取り付け場所ごとに見出しを付けて並べる（2026-09-11 本人要望）。
       ここでも畳めるので、20灯以上でも「どこに何灯あるか」を先に見渡せる。 */
    const rest = state.rig.fixtures.filter((f) => !grouped.has(f.id)).filter((f) => passFilter(f.id));
    mountSections(rest).forEach((sec) => {
      const h = document.createElement("div"); h.className = "grp";
      const open = !state.collapsed.has(sec.key);
      h.innerHTML = `<span>${open ? "▾" : "▸"} ${sec.name}</span><small>${sec.items.length}灯　まとめて選ぶ</small>`;
      h.querySelector("span").onclick = (ev) => { ev.stopPropagation(); open ? state.collapsed.add(sec.key) : state.collapsed.delete(sec.key); renderAll(); };
      h.querySelector("small").onclick = (ev) => { ev.stopPropagation(); state.sel = new Set(sec.items.map((f) => f.id)); renderAll(); };
      host.append(h);
      if (open) sec.items.forEach((f) => host.append(row(f)));
    });
    if (!rest.length && state.rig.fixtures.length) host.append(el("p", "hint", "この絞り込みに当てはまる灯体はありません。"));
    if (!state.rig.fixtures.length) host.innerHTML = '<p class="hint" style="padding:6px">灯体はまだありません。</p>';
    $("sel-count").textContent = state.sel.size > 1 ? `${state.sel.size}灯を選択中` : "";
    $("dup").disabled = true; $("del").disabled = true; $("spread").disabled = true; $("mirror").disabled = true;
  }

  /* ---------- 右: 設定欄 ---------- */
  const seg = (opts, cur, onPick, cls) => { const s = document.createElement("div"); s.className = "seg " + (cls || ""); opts.forEach(([v, t, dis]) => { const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.setAttribute("aria-pressed", String(v === cur)); b.disabled = Boolean(dis); b.onclick = () => onPick(v); s.append(b); }); return s; };
  const field = (lab, node, wide) => { const f = document.createElement("div"); f.className = "field" + (wide ? " wide" : ""); const l = document.createElement("span"); l.textContent = lab; f.append(l, node); return f; };
  const btn = (t, fn, cls) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn " + (cls || ""); b.textContent = t; b.onclick = fn; return b; };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const range = (min, max, step, val, fmt, onInput, onChange) => { const w = el("div", "rangewrap"); const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = step; i.value = val; const v = el("span", "val", fmt(val)); i.oninput = () => { v.textContent = fmt(Number(i.value)); onInput(Number(i.value)); }; i.onchange = () => onChange && onChange(Number(i.value)); w.append(i, v); return w; };

  /* 模様（ゴボ）の選び方。13個をいつも並べるとパネルが埋まるので、
     いまの模様だけを見せ、押したときだけ一覧を開く（2026-09-13 本人要望「クリックしたらプルダウン」）。
     一覧は浮かせずその場に差し込む——右欄は縦スクロールする枠なので、
     浮かせると枠で切られて下半分が見えなくなる。
     一覧は縦に1行ずつ、丸1個と名前だけ（2026-09-13 本人指定）——横に並べると選択画面が
     横長になり、どれを見ているのか追いにくい。用途の説明は title に逃がす。 */
  function goboPicker(curId, mixed, onPick) {
    const wrap = el("div", "gpick");
    const trig = document.createElement("button");
    trig.type = "button"; trig.className = "gpick-t";
    const face = el("span", "gpick-face"), name = el("span", "gpick-name");
    const g0 = mixed ? null : E.goboById(curId || "none");
    face.innerHTML = !g0 || g0.id === "none" ? '<span class="gx">—</span>' : goboThumb(g0);
    name.textContent = mixed ? "バラバラ" : (g0 && g0.id !== "none" ? g0.name : "なし");
    trig.append(face, name, el("span", "gpick-caret", "▾"));
    const list = el("div", "gpick-list"); list.hidden = true;
    const open = (v) => { list.hidden = !v; trig.setAttribute("aria-expanded", String(v)); };
    open(false);
    trig.onclick = () => open(list.hidden);
    E.GOBOS.forEach((g) => {
      const it = document.createElement("button"); it.type = "button"; it.className = "gpick-i";
      it.setAttribute("aria-pressed", String(!mixed && (curId || "none") === g.id));
      it.title = g.note ? `${g.name}｜${g.note}` : g.name;
      const fc = el("span", "gobo" + (g.id === "none" ? " none" : ""));
      fc.innerHTML = g.id === "none" ? '<span class="gx">—</span>' : goboThumb(g);
      it.append(fc, el("span", "gpick-iname"));
      it.lastChild.textContent = g.name;
      it.onclick = () => { open(false); onPick(g.id); };
      list.append(it);
    });
    wrap.append(trig, list);
    return wrap;
  }
  /* ぼけの刻み。実際に使うのは0〜30までで、それ以上は使い道がない（2026-09-13 本人確認）ので
     つまみの上限を30にし、その幅を10等分した。保存する値は今までどおり0〜100のままなので、
     前に保存したデザインもそのまま読める。 */
  const SOFT_MAX = 30, SOFT_STEPS = 10, SOFT_STEP = SOFT_MAX / SOFT_STEPS, SOFT_DEF = 6;  // 既定＝2/10（2026-09-13 本人指定）
  function softText(v) {
    const s = Math.round(v / SOFT_STEP);
    const word = s === 0 ? "くっきり" : s <= 3 ? "ほんのり" : s <= 6 ? "やや柔らかい" : s <= 8 ? "柔らかい" : "とろける";
    return s === 0 ? word : `${word}（${s}/${SOFT_STEPS}）`;
  }
  const softOf = (l) => E.clamp(E.finite(l && l.goboSoft, SOFT_DEF), 0, SOFT_MAX);
  /* 回す速さの読み方。つまみは速さそのものなので、向き・速さの言葉・1周の秒数で表す
     （2026-09-13 本人指摘「回すは回す速度なのでその用に表示」）。 */
  function spinText(v) {
    const a = Math.abs(v);
    if (a < 3) return "止める";
    const word = a < 15 ? "とてもゆっくり" : a < 35 ? "ゆっくり" : a < 60 ? "ふつう" : a < 85 ? "速い" : "とても速い";
    return `${v > 0 ? "時計回り" : "反時計回り"}　${word}（1周${(360 / (a * 0.36)).toFixed(1)}秒）`;
  }

  /* T字の下の帯。置く操作と選んだ灯体の操作を、図のすぐ下に置く（2026-09-11 本人要望で右欄・左欄から移動）。
     動きモードでは置くことがないので帯ごと隠し、そのぶん図を大きくする。 */
  // 表記は本体の照明パネルに合わせる（吊り／SS／転がし・吊るのはバトン）。2026-09-11 本人指摘
  const PLACE_TOOLS = [["truss", "バトンを渡す"], ["fixture", "吊り（バトンから真下へ）"], ["front", "前明かり（客席の上から顔へ）"], ["side", "SS（袖から横切って）"], ["floor", "転がし（床置きから体へ）"]];
  /* 幕の調整（2026-09-13 本人要望）。客席から光源が見えない状態を作れるように、
     開口の高さ・一文字幕の丈・袖幕の入り込みを数値で決める。配置タブにだけ出す。 */
  function renderCurtainBox(host) {
    if (!host) return;
    const c = state.curtains, d = state.dims;
    host = (() => { const b = el("div", "pbox"); b.append(el("p", "kicker", "幕（客席から灯体を隠す）")); host.append(b); return b; })();
    host.append(field("前一文字", seg([["on", "出す"], ["off", "出さない"]], c.pros === false ? "off" : "on", (v) => { c.pros = v === "on"; commit(); }), true));
    if (c.pros !== false) {
      host.append(field("開口の高さ", range(1, d.H, 0.1, E.clamp(E.finite(c.prosH, 6.2), 1, d.H), (v) => `${v.toFixed(1)}m（これより上は客席から見えない）`,
        (v) => { c.prosH = v; draw(); }, () => commit()), true));
    }
    /* 一文字幕はバトンごとに1枚ずつ決める（2026-09-13 本人要望）。
       実際の舞台でも、客席の視線に合わせて前の一文字ほど低く吊る。 */
    if (state.rig.trusses.length) {
      host.append(el("p", "kicker sub2", "一文字幕（バトンごと）"));
      state.rig.trusses.forEach((t) => {
        const b = borderSetting(t);
        const nm = `奥から${E.trussRow(state.rig, t.id)}列目${t.label ? "・" + t.label : ""}`;
        host.append(el("p", "hint", `${nm}（バトン 約${E.finite(t.h, 6).toFixed(1)}m)${b.既定のまま ? "" : "・個別に調整"}`));
        host.append(field("下端の高さ", range(0, d.H, 0.1, b.bottom, (v) => `${v.toFixed(1)}m${v >= E.finite(t.h, 6) ? "（バトンより上）" : ""}`,
          (v) => { setBorder(t, { bottomM: v }); draw(); }, () => commit()), true));
        host.append(field("丈", range(0.3, 6, 0.1, b.drop, (v) => `${v.toFixed(1)}m`,
          (v) => { setBorder(t, { dropM: v }); draw(); }, () => commit()), true));
      });
      const acts = el("div", "seg");
      acts.append(btn("バトンに合わせ直す", () => { state.curtains.perBorder = {}; commit("一文字幕をバトンの高さに合わせ直しました"); }, "small quiet"));
      host.append(field("まとめて", acts, true));
      host.append(field("バトンの手前へ", range(0, 0.2, 0.01, E.clamp(E.finite(c.borderAhead, 0.04), 0, 0.2), (v) => `${(v * d.D).toFixed(1)}m（全部）`,
        (v) => { c.borderAhead = v; draw(); }, () => commit()), true));
    }
    host.append(field("袖幕の入り", range(0, 0.35, 0.01, E.clamp(E.finite(c.legU, 0.08), 0, 0.35), (v) => `両端から${(v * d.W).toFixed(1)}m`,
      (v) => { c.legU = v; draw(); }, () => commit()), true));
    host.append(el("p", "note", "一文字幕は「図に出すもの」の〈一文字幕〉で出し入れします。作業灯を消すと合わせると、客席から灯体が見えていないかを確かめられます。"));
  }

  function renderToolStrip() {
    const place = $("placebox"), sel = $("selacts"); if (!place || !sel) return;
    /* 置く道具（バトンを渡す／吊り／前明かり／SS／転がし）は縦に5つ並ぶので、
       左の灯体パネルへ移すと一覧が1行まで潰れる（2026-09-13 実測36px）。
       見出しを押して畳めるようにし、既定は畳む——置くのは最初だけで、あとは一覧を見る時間が長いため。 */
    const title = place.querySelector(".ptitle");
    if (title && !title.dataset.acc) {
      title.dataset.acc = "1"; title.style.cursor = "pointer"; title.title = "押すと開閉します";
      title.onclick = () => { state.placeOpen = !state.placeOpen; renderAll(); };
    }
    const open = Boolean(state.placeOpen);
    if (title) title.innerHTML = `<span class="accicon">${open ? "▾" : "▸"}</span>配置（ショー共通）`;
    place.classList.toggle("folded", !open);
    place.hidden = sel.hidden = state.mode !== "place";
    if (place.hidden) { $("place-note").textContent = ""; return; }
    const host = $("place-tools"); host.innerHTML = "";
    PLACE_TOOLS.forEach(([k, t]) => {
      const b = document.createElement("button"); b.type = "button";
      b.textContent = state.tool === k ? "置くのを終える（Esc）" : t;
      b.title = { truss: "灯体を吊るバトンを渡す", fixture: "選んだバトンに灯体を吊る", front: "客席の上（シーリング・フロントサイド）に灯体を置く", floor: "灯体を床に転がす", side: "灯体を袖（上手／下手）に立てる" }[k];
      b.setAttribute("aria-pressed", String(state.tool === k));
      b.disabled = k === "fixture" && !state.selTruss;
      b.onclick = () => { state.tool = state.tool === k ? null : k; renderAll(); };
      host.append(b);
    });
    $("place-note").textContent =
      state.tool === "truss" ? "平面図をクリックすると、その奥行きにバトンを渡します。"
      : state.tool === "fixture" ? "平面図の選んだバトンの上をクリックすると灯体を吊れます。"
      : state.tool === "front" ? "平面図の舞台より手前（客席側の帯）をクリックすると置けます。舞台前からの距離と高さは右で直せます。"
      : state.tool === "floor" ? "平面図の舞台の中をクリックすると転がせます。"
      : state.tool === "side" ? "下手から見る図・上手から見る図をクリックすると、その側の袖に立てられます。"
      : !state.selTruss ? "バトンを選ぶと「吊り」が使えます。" : "";
  }

  /* ---------- 固定灯のシーン間の食い違い ----------
     固定灯は向き・色・広がりが仕込みで決まるので、シーンごとに違っていたら実物では作れない。
     気づかないまま渡すと現場で破綻するので、灯体情報の下に出し続け、どちらへ揃えるかを選ばせる
     （2026-09-11 本人要望。「両方決まっていない限り、ずっと表示」）。 */
  const aimKey = (l) => { const p = (l && l.path) || {}; const q = p.kind === "circle" || p.kind === "eight" ? p.c : p.a; return q ? `${(+q.u).toFixed(2)},${(+q.v).toFixed(2)},${(+(q.hM || 0)).toFixed(1)}` : "-"; };
  const fixedKey = (f, l) => `${l.surface || "floor"}|${aimKey(l)}|${l.color || ""}|${Math.round(E.beamDegOf(f, l))}`;
  function fixedConflicts() {
    const out = [];
    state.rig.fixtures.forEach((f) => {
      if (E.isMoving(f)) return;
      const seen = [];
      state.scenes.forEach((sc, i) => {
        const l = sc.cue.lights[f.id];
        if (!l || l.on !== true) return;
        const k = fixedKey(f, l);
        const hit = seen.find((x) => x.key === k);
        if (hit) hit.scenes.push(i); else seen.push({ key: k, scenes: [i], light: l });
      });
      if (seen.length > 1) out.push({ f, variants: seen });
    });
    return out;
  }
  function unifyFixed(f, src) {
    state.scenes.forEach((sc) => {
      const l = sc.cue.lights[f.id];
      if (!l || l.on !== true) return;
      sc.cue.lights[f.id] = { ...l, surface: src.surface, color: src.color, path: JSON.parse(JSON.stringify(src.path)) };
    });
    commit(`${label(f.id)}の向き・色・広がりを全シーンでそろえました`);
  }
  function renderFixedConflicts() {
    const host = $("conflicts"); if (!host) return;
    host.innerHTML = "";
    const list = state.mode === "move" ? fixedConflicts() : [];
    host.hidden = !list.length;
    if (!list.length) return;
    const box = el("div", "conflict");
    box.append(el("p", "warn", `⚠ <b>固定灯${list.length}灯</b>が、シーンによって違う向き・色・広がりになっています。固定灯は仕込みで決まるので、実物では<b>シーンごとに変えられません</b>。どれかにそろえてください。`));
    list.forEach(({ f, variants }) => {
      const row = el("div", "cflight");
      row.append(el("p", "cfname", `${label(f.id)}（固定）　${E.describeMount(f, state.rig)}`));
      const acts = el("div", "cfacts");
      variants.forEach((v) => {
        const names = v.scenes.map((i) => `シーン${i + 1}「${state.scenes[i].name}」`).join("・");
        const l = v.light;
        const b = btn(`${names} にそろえる`, () => unifyFixed(f, l), "small");
        b.title = `当てる先＝${l.surface === "air" ? "空中" : l.surface === "back" ? "奥の壁" : "床"}／広がり${Math.round(E.beamDegOf(f, l))}°`;
        acts.append(b);
      });
      row.append(acts); box.append(row);
    });
    host.append(box);
  }

  /* ---------- まとめて変更（選んだ灯への一括操作） ----------
     本人の言葉:「サーチライトというより選んだライトの一括変更みたいなことがしたい」（2026-09-12）。
     そこで枠の主役を「まとめて変更」にして、サーチライトはその中の<b>動きの型</b>に置いた。
     ・上半分（色・広がり・当てる場所・時間・ずらす刻み）は<b>動かした瞬間に全灯へ入る</b>。軌道は作り直さない。
     ・下半分（動きの型）はボタンを押したときだけ軌道を組み直す。 */
  function bulkEach(ids, fn) {
    ids.forEach((fid, i) => {
      const f = fixtureById(fid); if (!f) return;
      let l = lightOf(fid);
      if (!l || l.on === null || l.on === undefined) { ensureOn(fid); l = lightOf(fid); }   // 未設定は点灯にしてから
      if (!l || l.on !== true) return;                                                       // 消灯は触らない（意図して消してある）
      fn(f, l, i, fid);
    });
  }
  const bulkLive = (ids) => ids.filter((fid) => { const l = lightOf(fid); return l && l.on === true; });

  function renderBulk(host, ids) {
    if (ids.length < 2) return;
    const sp = state.sl, d = state.dims;
    const movers = slMovers(ids);
    const lit = bulkLive(ids);
    /* つまみは「いまの灯の値」を映す。映さないと、14°で仕込んだ灯を選んだのに
       つまみだけ8°を指し、型を当てた瞬間に勝手に細くなる（実測で気づいた）。
       全灯そろっているときだけ引き取る（バラバラなら前の値のまま見出しに「バラバラ」と出す）。 */
    const allSame = (arr) => arr.length > 0 && arr.every((x) => x === arr[0]);
    {
      const degs = ids.map((fid) => Math.round(E.beamDegOf(fixtureById(fid), lightOf(fid) || {})));
      if (allSame(degs)) sp.beamDeg = E.clamp(degs[0], 4, 70);
      const secs = movers.map((fid) => { const l = lightOf(fid); return l && l.on === true ? (l.periodSec == null ? SPEED_SEC[l.speed] || 2 : l.periodSec) : null; }).filter((x) => x != null);
      if (allSame(secs)) sp.periodSec = E.clamp(secs[0], 1, 30);
      const offs = movers.map((fid) => { const l = lightOf(fid); return l && l.on === true ? E.finite(l.offsetSec, 0) : null; }).filter((x) => x != null);
      if (offs.length > 1) { const step = Math.round((offs[1] - offs[0]) * 10) / 10; if (step >= 0 && step <= 3 && offs.every((o, k) => Math.abs(o - k * step) < 0.06)) sp.stepSec = step; }
    }
    const box = el("div", "slbox");
    const add = (n) => box.append(n);
    add(el("p", "kicker", `まとめて変更（${ids.length}灯）`));
    /* 欄の並びは単灯と同じ箱構成にそろえる（2026-09-13 本人要望）:
       ①光の色 → ②当てる場所・動き → ③光の強さ → ④光の広がり → ⑤動かす。
       オン・オフだけは単灯と違って右上のボタンが使えないので、箱の前に置く。 */
    const sub = (title) => { const b = el("div", "pbox"); if (title) b.append(el("p", "kicker", title)); add(b); return b; };
    /* その灯が「動いている」か。単灯と同じ決め方——軌道が動きなし以外、または強さ・広がりに終点がある。 */
    const isMovingLight = (fid) => { const l = lightOf(fid); if (!l || l.on !== true) return false; const pp = l.path || {}; return pp.kind !== "still" || l.levelTo != null || l.beamDegTo != null; };
    const movingMovers = movers.filter(isMovingLight);
    const allMoving = movers.length > 0 && movingMovers.length === movers.length;
    const someMoving = movingMovers.length > 0;

    /* --- 1) いま効く一括変更 --- */
    {
      const on = el("div", "seg");
      on.append(btn("全部オン", () => { ids.forEach(turnOn); commit(`${ids.length}灯をオンにしました`); }, "small"),
                btn("全部オフ", () => { ids.forEach((fid) => setLight(fid, { on: false })); commit(`${ids.length}灯をオフにしました`); }, "small quiet"));
      add(field("オン・オフ", on, true));
    }

    // ① 光の色。単灯と同じ並び（既定6色＋作った色＋色を作る）を、そのまま全灯へ入れる
    {
      const b = sub("光の色");
      const cols = new Set(lit.map((fid) => (lightOf(fid).color || "").toLowerCase()));
      const cur = cols.size === 1 ? [...cols][0] : "";
      const put = (c, quiet) => { bulkEach(ids, (f, l, i, fid) => setLight(fid, { color: c })); quiet ? draw() : commit(`${ids.length}灯の色を変えました`); };
      const swatch = (c, custom) => {
        const sb = document.createElement("button"); sb.type = "button"; sb.className = custom ? "custom" : "";
        sb.style.background = c; sb.title = custom ? `作った色 ${c}` : c;
        sb.setAttribute("aria-pressed", String(cur === c.toLowerCase()));
        sb.onclick = () => put(c); return sb;
      };
      const sw = el("div", "swatches");
      COLORS.forEach((c) => sw.append(swatch(c, false)));
      state.palette.forEach((c) => sw.append(swatch(c, true)));
      const pick = document.createElement("input"); pick.type = "color"; pick.className = "mkcolor";
      pick.value = /^#[0-9a-f]{6}$/i.test(cur) ? cur : "#ffd27a";
      pick.title = "色を作って全灯へ入れる";
      pick.oninput = () => put(pick.value, true);
      pick.onchange = () => {
        const c = pick.value.toLowerCase();
        if (!COLORS.some((x) => x.toLowerCase() === c) && !state.palette.some((x) => x.toLowerCase() === c)) {
          state.palette.push(c); if (state.palette.length > 12) state.palette.shift();
        }
        put(c);
      };
      sw.append(pick);
      if (cols.size > 1) b.append(el("p", "hint", "いまバラバラです。押すと全灯そろいます。"));
      b.append(sw);
      // 1灯ずつ色をずらす（グラデーション）。選んだ順に始めの色→終わりの色へ按分する（2026-09-12 本人要望）
      if (lit.length >= 2) {
        const g = state.slGrad;
        const mkColorInput = (key, def) => {
          const inp = document.createElement("input"); inp.type = "color"; inp.className = "mkcolor";
          inp.value = /^#[0-9a-f]{6}$/i.test(g[key] || "") ? g[key] : def;
          inp.oninput = () => { g[key] = inp.value; };
          return inp;
        };
        b.append(field("始めの色", mkColorInput("from", "#7ab8ff")));
        b.append(field("終わりの色", mkColorInput("to", "#ff7a5c")));
        b.append(btn(`${lit.length}灯へグラデーションで配る`, () => {
          lit.forEach((fid, i) => { const t = lit.length > 1 ? i / (lit.length - 1) : 0; setLight(fid, { color: lerpColor(g.from, g.to, t) }); });
          commit(`${lit.length}灯の色をグラデーションにしました`);
        }, "small primary"));
      }
    }

    // ② 当てる場所・動き
    {
      const b = sub("当てる場所・動き");
      const surs = new Set(lit.map((fid) => lightOf(fid).surface || "floor"));
      b.append(field(surs.size > 1 ? "当てる場所（バラバラ）" : "当てる場所",
        seg([["floor", "床"], ["air", "空中"], ["back", "奥の壁"]], surs.size === 1 ? [...surs][0] : null, (v) => {
          bulkEach(ids, (f, l, i, fid) => {
            setLight(fid, { surface: v }); restyleToSurface(fid);
            const l2 = lightOf(fid); if (l2.path && (l2.path.kind === "circle" || l2.path.kind === "eight")) l2.path.plane = v === "back" ? "frontVertical" : v === "floor" ? "horizontal" : (l2.path.plane || "horizontal");
          });
          commit(`${ids.length}灯の当てる場所を変えました`);
        }), true));
      /* 軌道の種類。まとめて変更では「どれかにそろえる」だけを出す（1灯ずつの始点・終点は単灯側で決める）。
         型から作りたいときは下の「動きの型（サーチライト・組）」を使う。 */
      if (movers.length) {
        const kinds = new Set(movers.map((fid) => ((lightOf(fid) || {}).path || {}).kind || "still"));
        b.append(field(kinds.size > 1 ? "動き（バラバラ）" : "動き",
          seg([["still", "動きなし"], ["line", "往復"], ["circle", "円"], ["eight", "8の字"]], kinds.size === 1 ? [...kinds][0] : null, (v) => {
            bulkEach(movers, (f, l, i, fid) => setKind(fid, v));
            commit(`${movers.length}灯の動きを変えました`);
          }), true));
      }
    }

    /* ③ 光の強さ。0は消灯と同じ（2026-09-13 本人決定）。目盛りはリニアのままで、
       見える明るさへの効き方だけを環境設定のカーブで決める。 */
    {
      const b = sub("光の強さ");
      const fmtLv = (v) => (v <= 0 ? "0%（消灯）" : `${Math.round(v)}%（${LEVEL_WORD(v)}）`);
      const lvs = new Set(lit.map((fid) => Math.round(levelOf(lightOf(fid)))));
      const same = lvs.size <= 1;
      const cur = same && lvs.size === 1 ? [...lvs][0] : 100;
      b.append(field(someMoving ? (same ? "始点" : "始点（バラバラ）") : (same ? "強さ" : "強さ（バラバラ）"),
        range(0, 100, 1, cur, fmtLv,
          (v) => { bulkEach(ids, (f, l) => { l.level = v; }); draw(); },
          () => commit(`${ids.length}灯の強さを変えました`)), true));
      if (someMoving) {
        const tos = new Set(movingMovers.map((fid) => Math.round(E.clamp(E.finite((lightOf(fid) || {}).levelTo, levelOf(lightOf(fid))), 0, 100))));
        const sameTo = tos.size <= 1, curTo = sameTo && tos.size === 1 ? [...tos][0] : 100;
        b.append(field(sameTo ? "終点" : "終点（バラバラ）",
          range(0, 100, 1, curTo, fmtLv,
            (v) => { movingMovers.forEach((fid) => { const l = lightOf(fid); if (l) l.levelTo = v; }); draw(); },
            () => commit(`${movingMovers.length}灯の終点の強さを変えました`)), true));
      }
    }

    /* ④ 光の広がり。ムービングはシーンごとの値（light.beamDeg）、固定灯は仕込みの値（fixture.beamDeg）へ入れる。
       混ざって選ばれていても、それぞれ正しいほうへ入る（本人要望の「太さを一括で」）。 */
    {
      const b = sub("光の広がり");
      const fmtDeg = (v) => `${Math.round(v)}°（${v < 12 ? "細い" : v < 26 ? "普通" : v < 45 ? "広い" : "とても広い"}）`;
      const degs = ids.map((fid) => Math.round(E.beamDegOf(fixtureById(fid), lightOf(fid) || {})));
      const same = allSame(degs);
      const now = E.clamp(same ? degs[0] : sp.beamDeg, 4, 70);
      const put = (v, quiet) => {
        sp.beamDeg = v;
        bulkEach(ids, (f, l) => { if (E.isMoving(f)) l.beamDeg = v; else f.beamDeg = v; });
        quiet ? draw() : commit();
      };
      b.append(field(someMoving ? (same ? "始点" : "始点（バラバラ）") : (same ? "広がり" : "広がり（バラバラ）"),
        range(4, 70, 1, now, fmtDeg, (v) => put(v, true), () => put(E.finite(sp.beamDeg, now))), true));
      if (someMoving) {
        const tos = new Set(movingMovers.map((fid) => { const l = lightOf(fid) || {}; return Math.round(E.clamp(E.finite(l.beamDegTo, E.beamDegOf(fixtureById(fid), l)), 5, 55)); }));
        const sameTo = tos.size <= 1, curTo = sameTo && tos.size === 1 ? [...tos][0] : 24;
        b.append(field(sameTo ? "終点" : "終点（バラバラ）",
          range(5, 55, 1, curTo, fmtDeg,
            (v) => { movingMovers.forEach((fid) => { const l = lightOf(fid); if (l) l.beamDegTo = v; }); draw(); },
            () => commit(`${movingMovers.length}灯の終点の広がりを変えました`)), true));
      }
    }

    // ⑤ 模様（ゴボ）。選んだ灯すべてへ同じ模様を入れる
    {
      const b = sub("模様（ゴボ）");
      const set = new Set(lit.map((fid) => (lightOf(fid) || {}).gobo || "none"));
      const cur = set.size === 1 ? [...set][0] : "";
      if (set.size > 1) b.append(el("p", "hint", "いまバラバラです。選ぶと全灯そろいます。"));
      b.append(goboPicker(cur, set.size > 1, (id) => {
        bulkEach(ids, (f, l, i, fid) => setLight(fid, { gobo: id }));
        commit(`${ids.length}灯の模様を変えました`);
      }));
      if (cur && cur !== "none") {
        const spins = new Set(lit.map((fid) => Math.round(E.clamp(E.finite((lightOf(fid) || {}).goboSpin, 0), -100, 100))));
        const same = spins.size <= 1, now = same && spins.size === 1 ? [...spins][0] : 0;
        b.append(field(same ? "回す速さ" : "回す速さ（バラバラ）", range(-100, 100, 5, now, spinText,
          (v) => { bulkEach(ids, (f, l) => { l.goboSpin = v; }); draw(); }, () => commit(`${ids.length}灯の回す速さを変えました`)), true));
        const softs = new Set(lit.map((fid) => Math.round(softOf(lightOf(fid)) / SOFT_STEP) * SOFT_STEP));
        const sameSoft = softs.size <= 1, nowSoft = sameSoft && softs.size === 1 ? [...softs][0] : SOFT_DEF;
        b.append(field(sameSoft ? "ぼけ" : "ぼけ（バラバラ）", range(0, SOFT_MAX, SOFT_STEP, nowSoft, softText,
          (v) => { bulkEach(ids, (f, l) => { l.goboSoft = v; }); draw(); }, () => commit(`${ids.length}灯の模様のぼけを変えました`)), true));
      }
    }

    /* ⑥ 動かす（ムービングを選んでいるときだけ）。単灯と同じ考え方——入れると②③④に始点と終点ができ、
       ここで運び方（時間・ずらす刻み）をまとめて決める。全灯そろって動いているときだけスイッチがオン。 */
    if (movers.length) {
      const b = sub(null);
      const head = el("div", "pboxhead"); head.append(el("p", "kicker", `動かす（ムービング${movers.length}灯）`));
      head.append(switchBtn(allMoving,
        allMoving ? "動かしています。押すと全灯を止めます（始点の値で止まります）"
          : someMoving ? "一部だけ動いています。押すと全灯そろって動かします"
          : "押すと全灯に始点と終点を置いて動かします",
        () => {
          if (allMoving) {
            bulkEach(movers, (f, l) => { const pt = currentPoint(l); l.path = { kind: "still", a: { ...pt } }; delete l.levelTo; delete l.beamDegTo; });
            commit(`${movers.length}灯の動きを止めました（始点の値で止まっています）`);
          } else {
            bulkEach(movers, (f, l, i, fid) => {
              if (((lightOf(fid) || {}).path || {}).kind === "still") setKind(fid, "line");
              const l2 = lightOf(fid); l2.levelTo = levelOf(l2); l2.beamDegTo = E.beamDegOf(f, l2);
            });
            commit(`${movers.length}灯に始点と終点を置きました`);
          }
        }));
      b.append(head);
      if (someMoving) {
        // 1往復（1周）の時間とオフセットの刻み。動きを持つムービングだけに入る
        b.append(field("1往復の時間", range(1, 30, 0.5, sp.periodSec, (v) => `${v.toFixed(1)}秒`, (v) => { sp.periodSec = v; bulkEach(movers, (f, l) => { l.periodSec = v; }); draw(); }, () => commit())));
        b.append(field("ずらす刻み", range(0, 3, 0.1, sp.stepSec, (v) => (v < 0.05 ? "ずらさない（全灯そろう）" : `${v.toFixed(1)}秒ずつ`), (v) => {
          sp.stepSec = v; let i = 0; bulkEach(movers, (f, l) => { l.offsetSec = Math.round(i * v * 10) / 10; i += 1; }); draw();
        }, () => commit())));
      }
    }

    /* --- 2) 動きの型（サーチライト・組） ---
       複数選択時の「動かし方」はここへ集約する（2026-09-13 本人要望「組の動きもサーチライト機能に
       含まれるのでまとめて」）。どちらもムービングだけが対象。最初はどちらも畳んでおく
       （本人要望「サーチライトは最初アコーディオンで畳んでおきましょう」）。 */
    const accHead = (text, key, onToggle) => {
      const open = state.slOpen[key];
      const h = el("p", "kicker sub2 accordion");
      h.innerHTML = `<span class="accicon">${open ? "▾" : "▸"}</span>${text}`;
      h.onclick = () => { state.slOpen[key] = !state.slOpen[key]; if (onToggle) onToggle(); else renderInspector(); };
      add(h);
      return open;
    };
    if (movers.length >= 2) {
      const live = () => state.slLive === movers.join(",");
      const touch = () => { if (live()) applySearchlight(movers, true); };
      const settle = () => { if (live()) commit(); };
      const hNow = slHeight(movers);
      const open = accHead(`動きの型（サーチライト・ムービング${movers.length}灯）${live() ? "　当たっています" : ""}`, "search");
      if (open) {
        add(field("振り方", seg(SL_FORMS, sp.form, (v) => { sp.form = v; if (live()) applySearchlight(movers); else renderAll(); }), true));
        add(field(sp.form === "cone" ? "散らす幅" : "振り幅", range(0.2, 1, 0.05, sp.span, (v) => `舞台幅の${Math.round(v * 100)}%（約${(v * d.W).toFixed(1)}m）`, (v) => { sp.span = v; touch(); }, settle)));
        /* 高さ0＝床を舐める。バトンに吊ったムービングは下にしか振れないので、これが既定（2026-09-12 本人指摘）。 */
        add(field("高さ", range(0, d.H, 0.1, hNow, (v) => (v <= 0.05 ? "0m" : `${v.toFixed(1)}m（空中）`), (v) => { sp.hM = v; touch(); }, settle)));
        add(field("奥行き", range(0, 1, 0.05, slDepth(), (v) => `${(v * d.D).toFixed(1)}m（${v < 0.3 ? "奥" : v > 0.7 ? "前" : "中ほど"}）`, (v) => { sp.vv = v; touch(); }, settle)));
        if (sp.form !== "cone") add(field("切り返し", seg([["linear", "リニア"], ["ease", "イーズ"]], sp.easing, (v) => { sp.easing = v; if (live()) applySearchlight(movers); else renderAll(); })));
        add(btn(live() ? `${movers.length}灯に当て直す` : `${movers.length}灯にこの型を当てる`, () => applySearchlight(movers), "primary"));
      }
      /* 組（一緒に動く・鏡・順番・扇・交差）。任意の軌道を保ったまま「動きの関係」だけ足す、
         サーチライトより自由度の高いもう一つの型。対象はムービングだけに揃えた
         （固定灯は動かないので組む意味がない）。 */
      const gs = [...new Set(movers.map((id) => groupOf(id)).filter(Boolean))];
      const same = gs.length === 1 && gs[0].members.length === movers.length && movers.every((id) => gs[0].members.includes(id));
      const openG = accHead(`組の動き（一緒に動く・鏡・順番・扇・交差）${same ? "　編集中" : ""}`, "group");
      if (openG) {
        const REL = [["together", "一緒に動く"], ["mirror", "鏡のように動く"], ["sequential", "順番に動く"], ["fan", "扇に開く・閉じる"], ["cross", "交差して入れ替わる"]];
        if (same) {
          const g = gs[0]; const gi = cue().groups.indexOf(g);
          add(el("p", "hint", `組${gi + 1}「${groupName(g)}」を編集中`));
          add(field("動き方", seg(REL, g.compose || g.relation, (v) => makeGroup(g.members, v)), true));
          if (g.relation === "sequential") add(field("ずらす時間", range(100, 1500, 50, g.delayMs, (v) => `${(v / 1000).toFixed(2)}秒ずつ`, (v) => { g.delayMs = v; draw(); }, () => commit())));
          const ol = el("div", "seg col grouplist");
          g.members.forEach((m, i) => { const b = document.createElement("button"); b.type = "button"; b.textContent = `${i + 1}. ${label(m)} ${fixtureById(m).name || ""}${i > 0 ? "　▲ 前へ" : ""}`; b.onclick = () => { if (i > 0) { [g.members[i - 1], g.members[i]] = [g.members[i], g.members[i - 1]]; commit(); } }; ol.append(b); });
          add(field("この組の灯体", ol, true));
          add(btn("組を解散する", () => { cue().groups = cue().groups.filter((x) => x !== g); g.members.forEach((m) => setLight(m, { groupId: null })); commit("組を解散しました"); }, "small quiet"));
        } else {
          add(el("p", "hint", "選んだムービングで組の動きをつくる"));
          add(field("動き方", seg(REL, null, (v) => makeGroup(movers, v)), true));
        }
      }
    }
    host.append(box);
  }

  /* パネル右上のオン・オフ。1灯を選んでいるときだけ出す。
     押すたびに切り替わる1つのボタンにした（2026-09-13 本人要望）——未設定と消灯を分けて見せず、
     「いま光っているか」だけを示す。未設定の灯を押したら、その場で点いた状態から始める。 */
  /* 右上のオン・オフと同じ見た目の切り替え（「動かす」で使う）。押すたびに反転する。 */
  function switchBtn(on, title, onToggle) {
    const b = document.createElement("button"); b.type = "button"; b.className = "ontoggle";
    b.setAttribute("aria-pressed", String(on)); b.title = title;
    b.innerHTML = `<span class="sw"></span><b>${on ? "オン" : "オフ"}</b>`;
    b.onclick = onToggle; return b;
  }

  function syncLightToggle(ids) {
    const tgl = $("lighttoggle"), panel = $("panel-insp"); if (!tgl || !panel) return;
    const fid = state.mode === "move" && ids.length === 1 ? ids[0] : null;
    tgl.hidden = !fid;
    if (!fid) { tgl.onclick = null; return; }
    const on = isLit(lightOf(fid));
    tgl.setAttribute("aria-pressed", String(on));
    tgl.querySelector("b").textContent = on ? "オン" : "オフ";
    tgl.title = on ? `${label(fid)}は点いています。押すと消えます` : `${label(fid)}は消えています。押すと点きます`;
    tgl.onclick = () => { if (isLit(lightOf(fid))) setLight(fid, { on: false }); else turnOn(fid); commit(); };
  }

  function renderInspector() {
    const host = $("insp"); host.innerHTML = "";
    const ids = [...state.sel];
    syncLightToggle(ids);
    if (state.mode === "place") {
      // 見出しは静的な「選んだ灯体」／下の層の「配置（ショー共通）」が持つので、ここでは出さない
      if (!state.sel.size && !state.selTruss) host.append(el("p", "hint", "図か一覧で灯体やバトンを選ぶと、ここに設定が出ます。配置はすべてのシーンで共通です。"));
      const t = E.trussById(state.rig, state.selTruss);
      if (t && !ids.length) {
        host.append(el("p", "kicker", `バトン（奥から${E.trussRow(state.rig, t.id)}列目）`));
        const name = document.createElement("input"); name.type = "text"; name.value = t.label; name.placeholder = "名前（任意）"; name.onchange = () => { t.label = name.value.slice(0, 16); commit(); }; host.append(field("名前", name));
        host.append(field("奥行き", range(0, 1, 0.01, t.v, (v) => `${(v * state.dims.D).toFixed(1)}m（奥から）`, (v) => { t.v = v; draw(); }, () => commit())));
        host.append(field("高さ", range(2, state.dims.H, 0.1, t.h, (v) => `約${v.toFixed(1)}m${t.tentative ? "（仮の高さ）" : ""}`, (v) => { t.h = v; t.tentative = false; draw(); }, () => commit())));
        host.append(btn("このバトンに灯体を吊る", () => { state.tool = "fixture"; renderAll(); }, "primary"));
        host.append(btn("バトンを削除", () => { const n = state.rig.fixtures.filter((f) => f.mount.trussId === t.id).length; const go = () => { state.rig.fixtures = state.rig.fixtures.filter((f) => f.mount.trussId !== t.id); state.rig.trusses = state.rig.trusses.filter((x) => x.id !== t.id); state.selTruss = null; state.sel.clear(); commit("バトンを削除しました"); }; n ? dialog(`<p>このバトンには${n}灯が吊ってあります。灯体ごと削除しますか？</p>`, [["やめる", null, "quiet"], ["灯体ごと削除", go, "primary"]]) : go(); }, "quiet"));
      }
      if (ids.length === 1) {
        const f = fixtureById(ids[0]); const m = f.mount;
        host.append(el("p", "kicker", `${label(f.id)}（${E.isMoving(f) ? "ムービング" : "固定"}）　${E.describeMount(f, state.rig)}`));
        const name = document.createElement("input"); name.type = "text"; name.value = f.name; name.placeholder = "例: 中央ムービング"; name.onchange = () => { f.name = name.value.slice(0, 20); commit(); }; host.append(field("名前", name));
        if (m.type === "truss") { const sel = document.createElement("select"); state.rig.trusses.forEach((tt) => { const o = document.createElement("option"); o.value = tt.id; o.textContent = `奥から${E.trussRow(state.rig, tt.id)}列目${tt.label ? "・" + tt.label : ""}`; o.selected = tt.id === m.trussId; sel.append(o); }); sel.onchange = () => { m.trussId = sel.value; state.selTruss = sel.value; commit(); }; host.append(field("吊るバトン", sel));
          host.append(field("横位置", range(0, 1, 0.01, m.u, (v) => (v < 0.4 ? "下手寄り" : v > 0.6 ? "上手寄り" : "中央"), (v) => { m.u = v; draw(); }, () => commit())));
          const tt = E.trussById(state.rig, m.trussId); host.append(field("高さ", el("span", "val", `約${tt ? tt.h.toFixed(1) : "?"}m（バトンから継承）`))); }
        if (m.type === "floor") { host.append(field("横位置", range(0, 1, 0.01, m.u, (v) => (v < 0.4 ? "下手寄り" : v > 0.6 ? "上手寄り" : "中央"), (v) => { m.u = v; draw(); }, () => commit()))); host.append(field("奥行き", range(0, 1, 0.01, m.v, (v) => (v < 0.4 ? "奥" : v > 0.6 ? "手前" : "中ほど"), (v) => { m.v = v; draw(); }, () => commit()))); host.append(field("高さ", el("span", "val", "転がし（床）"))); }
        if (m.type === "side") { host.append(field("取り付け", seg([["shimote", "下手側"], ["kamite", "上手側"]], m.side, (v) => { m.side = v; commit(); }))); host.append(field("奥行き", range(0, 1, 0.01, m.v, (v) => (v < 0.4 ? "奥寄り" : v > 0.6 ? "手前寄り" : "中ほど"), (v) => { m.v = v; draw(); }, () => commit()))); host.append(field("高さ", range(0.3, state.dims.H, 0.1, m.h, (v) => `約${v.toFixed(1)}m`, (v) => { m.h = v; draw(); }, () => commit()))); }
        if (m.type === "front") {
          host.append(field("横位置", range(0, 1, 0.01, m.u, (v) => (v < 0.4 ? "下手寄り" : v > 0.6 ? "上手寄り" : "中央"), (v) => { m.u = v; draw(); }, () => commit())));
          host.append(field("舞台前から", range(1, 20, 0.5, m.ahead, (v) => `約${v.toFixed(1)}m`, (v) => { m.ahead = v; draw(); }, () => commit())));
          host.append(field("高さ", range(1, 16, 0.1, m.h, (v) => `約${v.toFixed(1)}m`, (v) => { m.h = v; draw(); }, () => commit())));
          host.append(el("p", "note", "客席の上（シーリング）や客席横の壁（フロントサイド）に当たる位置です。平面図では客席側の帯に並べて描き、本当の距離はここの数値が正です。"));
        }
        // ムービングかどうか（動きを付けられるのはムービングだけ）
        host.append(field("種類", seg([["moving", "ムービング"], ["fixed", "固定"]], E.isMoving(f) ? "moving" : "fixed", (v) => { f.kind = v; if (v === "fixed") { const l = lightOf(f.id); if (l && l.path && l.path.kind !== "still") { l.path = { kind: "still", a: l.path.a || l.path.c || E.newPoint() }; } } commit(); })));
        host.append(field("光の広がり", range(4, 70, 1, f.beamDeg == null ? 18 : f.beamDeg, (v) => `${Math.round(v)}°（${v < 12 ? "細い" : v < 26 ? "普通" : v < 45 ? "広い" : "とても広い"}）`, (v) => { f.beamDeg = v; draw(); }, () => commit())));
        host.append(el("p", "note", E.isMoving(f) ? "仕込みの広がりです。ムービングはシーンごとに「灯体情報」でズームできます（実機のズーム範囲はおおむね7〜50°）。" : "固定灯はレンズ／ランプで決まる値で、ショー中は変えられません（PARは玉を替えるしかありません）。"));
        // 複製・反対側へコピー・削除は図の下の帯へ移した（同じ操作を2か所に置かない）
      } else if (ids.length > 1) {
        host.append(el("p", "kicker", `${ids.length}灯を選択中`));
        if (!canSpread()) host.append(el("p", "note", "「等間隔に並べる」は同じバトンの3灯以上を選ぶと使えます。"));
        host.append(el("p", "note", "「反対側へコピー」は配置（取り付け位置）だけを下手⇄上手で左右対称に写します（吊り・転がしは左右反転、SSは上手／下手を入れ替え）。オン・オフや動きは「照明デザイン」タブで設定してください。"));
      }
      // 幕の寸法は選んだものに依らずいつも出す（ショー共通の値なので）
      renderCurtainBox(host);
      return;
    }
    // ---- 動きモード ----
    // パネル名「照明デザイン」は静的HTML(#insphead)へ移した。ここでは繰り返さない。
    if (!ids.length) { host.append(el("p", "hint", "灯体を選んでください。")); return; }
    if (ids.length === 1) {
      const fid = ids[0]; const f = fixtureById(fid); const l = lightOf(fid);
      host.append(el("p", "kicker", `${label(fid)}（${E.isMoving(f) ? "ムービング" : "固定"}）　${f.name || ""}`));
      const g = groupOf(fid);
      if (g) { const gi = cue().groups.indexOf(g); const box = el("div", "box", `<p class="hint">組${gi + 1}「${groupName(g)}」の一員です。</p>`); box.append(btn("組から外す", () => ungroup(fid), "small quiet")); host.append(box); }
      /* オン・オフはパネル右上のボタンへ集約した（2026-09-13 本人要望）。
         本文からは2択の欄を外し、消えている灯ではそこへ誘導するだけにする。 */
      if (!l || l.on !== true) {
        host.append(el("p", "hint", "この灯はいま消えています。右上の〈オフ〉を押して点けると、色・当てる場所・強さ・広がりを決められます。"));
        return;
      }
      /* ---- 欄の構成（2026-09-13 本人要望） ----
         ①光の色 → ②当てる場所・動き（位置に関わるものを1箱） → ③光の強さ → ④光の広がり →
         ⑤動かす（ムービングのみ）。
         「動かす」を入れると②③④のすべてに始点と終点ができ、⑤でその運び方（時間・切り返し・
         向き・遅れ）をまとめて決める。動かしていないときは各箱が1つの値だけを持つ。
         動かしているかどうかは別の旗を持たず、データから決める:
           位置の軌道が「動きなし」以外 or 強さ・広がりに終点がある ＝ 動かしている。 */
      const p = l.path || { kind: "still" };
      const mover = E.isMoving(f);
      const moving = mover && (p.kind !== "still" || l.levelTo != null || l.beamDegTo != null);
      const box = (title) => { const b = el("div", "pbox"); if (title) b.append(el("p", "kicker", title)); host.append(b); return b; };
      const heightField = (b, label2, point) => {
        if (l.surface === "floor") return; // 床は高さ0固定。UIに出さない
        b.append(field(label2, range(0, state.dims.H, 0.1, point.hM || 0, (v) => `約${v.toFixed(1)}m`, (v) => { point.hM = v; draw(); }, () => commit())));
      };

      /* ① 光の色。よく使う6色＋自分で作った色（ショー共通）。作った色はそのまま並ぶので、
         別の灯からもワンタッチで選べる（2026-09-11 本人要望）。 */
      {
        const b = box("光の色");
        const swatch = (c, custom) => {
          const sb = document.createElement("button"); sb.type = "button"; sb.className = custom ? "custom" : "";
          sb.style.background = c; sb.title = custom ? `作った色 ${c}` : c;
          sb.setAttribute("aria-pressed", String((l.color || "").toLowerCase() === c.toLowerCase()));
          sb.onclick = () => { setLight(fid, { color: c }); commit(); };
          return sb;
        };
        const sw = el("div", "swatches");
        COLORS.forEach((c) => sw.append(swatch(c, false)));
        state.palette.forEach((c) => sw.append(swatch(c, true)));
        const pick = document.createElement("input"); pick.type = "color"; pick.className = "mkcolor";
        pick.value = /^#[0-9a-f]{6}$/i.test(l.color || "") ? l.color : "#ffd27a";
        pick.title = "色を作る（作った色はショー全体で使えます）";
        pick.oninput = () => { setLight(fid, { color: pick.value }); draw(); };
        pick.onchange = () => {
          const c = pick.value.toLowerCase();
          if (!COLORS.some((x) => x.toLowerCase() === c) && !state.palette.some((x) => x.toLowerCase() === c)) {
            state.palette.push(c); if (state.palette.length > 12) state.palette.shift();
          }
          setLight(fid, { color: c }); commit(`色 ${c} を作りました（ほかの灯からも選べます）`);
        };
        sw.append(pick);
        b.append(sw);
        const cur = (l.color || "").toLowerCase();
        if (state.palette.some((x) => x.toLowerCase() === cur)) {
          b.append(btn(`この色（${cur}）を作った色から外す`, () => { state.palette = state.palette.filter((x) => x.toLowerCase() !== cur); commit(); }, "small quiet"));
        }
      }

      /* ② 当てる場所・動き。位置に関わるものをここに集める。
         動かしているときは軌道の種類と始点・終点を、動かしていないときは当てる先だけを持つ。 */
      {
        const b = box("当てる場所・動き");
        b.append(field("当てる場所", seg([["floor", "床"], ["air", "空中"], ["back", "奥の壁"]], l.surface, (v) => {
          setLight(fid, { surface: v }); restyleToSurface(fid);
          const l2 = lightOf(fid); if (l2.path && l2.path.kind === "circle") l2.path.plane = v === "back" ? "frontVertical" : v === "floor" ? "horizontal" : (l2.path.plane || "horizontal");
          commit();
        }), true));
        if (moving) {
          /* 軌道の種類。「動きなし」は位置だけ止めて、強さ・広がりの往復は続ける。 */
          b.append(field("動き", seg([["still", "動きなし"], ["line", "往復"], ["circle", "円"], ["eight", "8の字"]], p.kind, (v) => { setKind(fid, v); commit(); }), true));
          if (p.kind === "still") { b.append(el("p", "hint", "位置は動かさず、強さ・広がりだけが 始点→終点→始点 と往復します。")); heightField(b, "高さ", p.a); }
          if (p.kind === "line") { heightField(b, "始点の高さ", p.a); heightField(b, "終点の高さ", p.b); }
          if (p.kind === "circle" || p.kind === "eight") {
            if (l.surface === "air") b.append(field("回る面", seg([["horizontal", "水平"], ["frontVertical", "客席側から見た縦"], ["sideVertical", "舞台横から見た縦"]], p.plane || "horizontal", (v) => { p.plane = v; commit(); }, "col"), true));
            b.append(field("回る向き", seg([["cw", "時計回り"], ["ccw", "反時計回り"]], p.dir, (v) => { p.dir = v; commit(); })));
            /* 円は2軸で持つ＝楕円にできる（2026-09-11 本人要望）。軸の呼び名は面で変わる。 */
            const AXIS = { horizontal: ["左右のふくらみ", "奥行きのふくらみ"], frontVertical: ["左右のふくらみ", "高さのふくらみ"], sideVertical: ["奥行きのふくらみ", "高さのふくらみ"] }[p.plane || "horizontal"];
            const lim = Math.max(state.dims.W, state.dims.H) / 2;
            b.append(field(AXIS[0], range(0.3, lim, 0.1, p.r, (v) => `約${v.toFixed(1)}m`, (v) => { p.r = v; draw(); }, () => commit())));
            b.append(field(AXIS[1], range(0.3, lim, 0.1, p.r2 == null ? p.r : p.r2, (v) => `約${v.toFixed(1)}m`, (v) => { p.r2 = v; draw(); }, () => commit())));
            b.append(field("傾き", range(-90, 90, 5, p.tilt == null ? 0 : p.tilt, (v) => (Math.round(v) === 0 ? "まっすぐ" : `${Math.round(v)}°`), (v) => { p.tilt = v; draw(); }, () => commit())));
            { const rr = p.r2 == null ? p.r : p.r2, tl = Math.round(p.tilt || 0);
              if (Math.abs(rr - p.r) >= 0.05 || tl) b.append(btn(p.kind === "eight" ? "傾きと形をそろえる" : "まん丸・まっすぐに戻す", () => { p.r2 = p.r; p.tilt = 0; commit(); }, "small quiet")); }
            heightField(b, "中心の高さ", p.c);
            b.append(field("始める位置", range(0, 1, 0.05, p.start || 0, (v) => `${Math.round(v * 360)}°`, (v) => { p.start = v; draw(); }, () => commit())));
          }
        } else {
          heightField(b, "高さ", p.a || E.newPoint());
          if (!mover && p.kind !== "still") b.append(el("p", "warn", "⚠ この灯には動きが付いたままです。固定灯なので実際には動きません。"));
        }
      }

      /* ③ 光の強さ。0まで下げると消灯と同じ扱いになり、図から消える（2026-09-13 本人決定）。
         動かしているときは始点と終点を持ち、位置と同じ位相で往復する。効き方（カーブ）は環境設定。 */
      {
        const b = box("光の強さ");
        const fmtLv = (v) => (v <= 0 ? "0%（消灯）" : `${Math.round(v)}%（${LEVEL_WORD(v)}）`);
        b.append(field(moving ? "始点" : "強さ", range(0, 100, 1, levelOf(l), fmtLv, (v) => { l.level = v; draw(); }, () => commit()), true));
        if (moving) b.append(field("終点", range(0, 100, 1, E.clamp(E.finite(l.levelTo, levelOf(l)), 0, 100), fmtLv, (v) => { l.levelTo = v; draw(); }, () => commit()), true));
      }

      /* ④ 光の広がり。ムービングはシーンごとにズームできる（実機は7〜50°程度）。
         固定灯はレンズ／ランプで決まるので仕込みの値を編集する（シーン別には変わらない）。 */
      {
        const b = box("光の広がり");
        const fmtDeg = (v) => `${Math.round(v)}°（${v < 12 ? "細い" : v < 26 ? "普通" : v < 45 ? "広い" : "とても広い"}）`;
        if (mover) {
          b.append(field(moving ? "始点" : "広がり", range(5, 55, 1, E.beamDegOf(f, l), fmtDeg, (v) => { l.beamDeg = v; draw(); }, () => commit()), true));
          if (moving) b.append(field("終点", range(5, 55, 1, E.clamp(E.finite(l.beamDegTo, E.beamDegOf(f, l)), 5, 55), fmtDeg, (v) => { l.beamDegTo = v; draw(); }, () => commit()), true));
          if (l.beamDeg != null) b.append(btn(`仕込みの広がり（${Math.round(f.beamDeg == null ? 18 : f.beamDeg)}°）に戻す`, () => { delete l.beamDeg; if (l.beamDegTo != null) l.beamDegTo = E.beamDegOf(f, l); commit(); }, "small quiet"));
        } else {
          b.append(field("広がり", range(4, 70, 1, f.beamDeg == null ? 24 : f.beamDeg, fmtDeg, (v) => { f.beamDeg = v; draw(); }, () => commit()), true));
        }
      }

      /* ⑤ 模様（ゴボ）。光に載せる形。2026-09-13 本人決定「案B」で、実機の絵柄ではなく
         舞台照明の分類名で自前に描いたものを持つ（rig-engine の GOBOS）。
         回す前提のもの（rot）と回さない前提のもの（stat）を分けて並べる——実機のホイールと同じ考え方。 */
      {
        const b = box("模様（ゴボ）");
        const cur = l.gobo || "none";
        b.append(goboPicker(cur, false, (id) => { setLight(fid, { gobo: id }); commit(); }));
        if (cur !== "none") {
          const spin = E.clamp(E.finite(l.goboSpin, 0), -100, 100);
          b.append(field("回す速さ", range(-100, 100, 5, spin, spinText,
            (v) => { l.goboSpin = v; draw(); }, () => commit()), true));
          if (Math.abs(spin) < 3) {
            b.append(field("向き", range(0, 360, 5, E.clamp(E.finite(l.goboAngle, 0), 0, 360), (v) => `${Math.round(v)}°`,
              (v) => { l.goboAngle = v; draw(); }, () => commit()), true));
          }
          /* ぼけ具合＝実機でいうフォーカス。くっきり出すと形が読め、ぼかすと質感になる
             （2026-09-13 本人要望）。 */
          b.append(field("ぼけ", range(0, SOFT_MAX, SOFT_STEP, softOf(l), softText,
            (v) => { l.goboSoft = v; draw(); }, () => commit()), true));
        }
      }

      /* ⑥ 動かす（ムービングのみ）。入れると②③④に始点と終点ができる。
         運び方（時間・切り返し・向き・遅れ）はここで一括に決める（2026-09-13 本人要望）。 */
      if (mover) {
        const b = box(null);
        const head = el("div", "pboxhead"); head.append(el("p", "kicker", "動かす"));
        head.append(switchBtn(moving, moving ? "動かしています。押すと止めます（始点の値で止まります）" : "押すと始点と終点を置いて動かします", () => {
          if (moving) {
            const a = currentPoint(l);
            setLight(fid, { path: { kind: "still", a: { ...a } } });
            const l2 = lightOf(fid); delete l2.levelTo; delete l2.beamDegTo;
            commit("動きを止めました（始点の値で止まっています）");
          } else {
            setKind(fid, "line");
            const l2 = lightOf(fid); l2.levelTo = levelOf(l2); l2.beamDegTo = E.beamDegOf(f, l2);
            commit("始点と終点を置きました。②③④で終点の値を決められます");
          }
        }));
        b.append(head);
        if (moving) {
          const kind = (lightOf(fid).path || {}).kind;
          if (kind === "line") b.append(field("始め方", seg([["a", "始点 → 終点"], ["b", "終点 → 始点"]], p.start || "a", (v) => { p.start = v; commit(); })));
          // 端での運び方（2026-09-12 本人指定で「切り返し」＝リニア／イーズ）。位置・強さ・広がりに共通
          b.append(field("切り返し", seg([["linear", "リニア"], ["ease", "イーズ"]], p.easing || "ease", (v) => { p.easing = v; commit(); })));
          const label1 = kind === "line" ? "1往復の時間" : kind === "still" ? "変化の1往復の時間" : "1周の時間";
          b.append(field(label1, seg([["slow", "ゆっくり 4秒"], ["normal", "普通 2秒"], ["fast", "速い 1秒"]], l.periodSec == null ? l.speed : null, (v) => { setLight(fid, { speed: v, periodSec: null }); commit(); }), true));
          const secNow = l.periodSec == null ? E.SPEED_PERIOD_MS[l.speed] / 1000 : l.periodSec;
          b.append(field("秒で決める", range(0.4, 30, 0.1, secNow, (v) => `${v.toFixed(1)}秒${l.periodSec == null ? "（未使用）" : ""}`, (v) => { l.periodSec = v; draw(); }, () => commit())));
          if (l.periodSec != null) b.append(btn("秒の指定をやめて3段に戻す", () => { delete l.periodSec; commit(); }, "small quiet"));
          /* 何秒遅れて始めるか。組の「順番に動く」とは別に、一灯ずつずらせる（2026-09-12 本人要望）。 */
          b.append(field("オフセット", range(-10, 10, 0.1, E.finite(l.offsetSec, 0), (v) => (Math.abs(v) < 0.05 ? "なし" : `${v > 0 ? "+" : ""}${v.toFixed(1)}秒`), (v) => { l.offsetSec = v; draw(); }, () => commit())));
          const acts = el("div", "seg");
          acts.append(btn(state.copiedPath && state.copiedPath.from === fid ? "コピー済み" : "この動きをコピー", () => {
            state.copiedPath = { from: fid, label: label(fid), path: JSON.parse(JSON.stringify(p)), speed: l.speed, periodSec: l.periodSec, beamDeg: l.beamDeg, beamDegTo: l.beamDegTo, levelTo: l.levelTo };
            renderAll(); toast(`${label(fid)}の動きをコピーしました。別のムービングを選んで貼り付けられます。`);
          }, "small"));
          b.append(field("動きのコピー", acts));
        }
        if (state.copiedPath && state.copiedPath.from !== fid) {
          const c = state.copiedPath;
          b.append(field("貼り付け", btn(`${c.label}の動きを貼り付ける`, () => {
            setLight(fid, { path: JSON.parse(JSON.stringify(c.path)), speed: c.speed, periodSec: c.periodSec, beamDeg: c.beamDeg, beamDegTo: c.beamDegTo, levelTo: c.levelTo });
            commit(`${c.label}の動きを${label(fid)}へ写しました（オフセットは灯ごとのまま）`);
          }, "small primary")));
        }
      }
      // 消す操作はパネル右上のオン・オフへ一本化した（2026-09-13 本人要望）。
      return;
    }
    // 複数（「組の動き」も含めて renderBulk 側の「まとめて変更」枠に集約した。2026-09-13 本人要望）
    host.append(el("p", "kicker", `${ids.length}灯を選択中`));
    renderBulk(host, ids);
  }


  /* ---------- 全体 ---------- */
  function renderAll() {
    $("mode-place").setAttribute("aria-pressed", String(state.mode === "place")); $("mode-move").setAttribute("aria-pressed", String(state.mode === "move"));
    /* 配置はシーン共通なので、シーン送りと再生は照明デザインのときだけ出す（2026-09-11 本人指摘）。
       2026-09-13 本人要望でパネル右上へ移した（シーン名の表示はやめた）。 */
    /* 配置はシーン共通なので、シーン送りも再生も照明デザインのときだけ出す（2026-09-11 本人指摘）。
       シーン送りは図の上の帯（場所は残して中身だけ隠す）、再生はパネルの見出し行（丸ごと隠す）。 */
    const inMove = state.mode === "move";
    /* 「光」と「作業灯を消す」は照明デザインタブだけのもの（2026-09-13 本人要望）。
       配置タブでは枠ごと隠す。消し具合のつまみは作業灯を消しているときだけ出す。 */
    $("lighttoggles").hidden = !inMove;
    $("dimwrap").hidden = !(inMove && showOn("blackout"));
    { const d = E.clamp(E.finite(state.dim, 100), 0, 100); $("dim").value = d; $("dimnum").value = d; }
    $("scene-name").textContent = `シーン ${state.sceneIndex + 1}「${scene().name}」`;
    $("scenerow").classList.toggle("off", !inMove);   // 場所は残す（図の位置を両ページで揃える）
    $("insphead").hidden = !inMove;
    $("transport").hidden = !inMove;
    $("empty").hidden = Boolean(state.rig.trusses.length || state.rig.fixtures.length);
    /* いま編集しているデザイン名と、未適用かどうかを1行で出す（2026-09-13 保存機能の追加にあわせて）。 */
    { const nm = state.designName ? `「${state.designName}」` : "";
      $("dirty").textContent = state.dirty ? `${nm}未適用の変更あり` : nm;
      $("dirty").classList.toggle("ok", !state.dirty); }
    $("undo").disabled = !state.history.length; $("redo").disabled = !state.future.length;
    // 4図は常時表示。いま手を入れるべき図に縁を付けて目線を誘導する（切替はしない）
    const selFix = [...state.sel].map(fixtureById).filter(Boolean);
    const sideSel = selFix.find((f) => f.mount.type === "side");
    const needsHeightEdit = state.mode === "move" && [...state.sel].some((id) => ["back", "air"].includes((lightOf(id) || {}).surface));
    const focusKind = state.tool === "side" ? (sideSel ? sideSel.mount.side : "shimote")
      : sideSel ? sideSel.mount.side
      : needsHeightEdit ? "front" : null;
    SECS.forEach((sec) => sec.cv.parentElement.classList.toggle("focus", sec.kind === focusKind));
    renderToolStrip();   // 帯の出し入れで図に使える高さが変わるので、寸法合わせより先に
    syncCanvasSize();
    document.querySelectorAll("#showtoggles button, #lighttoggles button").forEach((b) => b.setAttribute("aria-pressed", String(showOn(b.dataset.show))));
    document.querySelectorAll("#frontmode button").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.front === "3d") === Boolean(state.front3d))));
    $("seat").hidden = !state.front3d;
    $("filters").hidden = state.mode !== "move";
    document.querySelectorAll("#filters button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === state.filter)));
    renderList(); renderInspector(); renderFixedConflicts(); renderTransport(); draw();
  }

  /* ---------- ヘッダ・空状態・書き出し ---------- */
  $("mode-place").onclick = () => { state.mode = "place"; stop(); renderAll(); };
  $("mode-move").onclick = () => { state.mode = "move"; state.tool = null; renderAll(); };
  $("scene-prev").onclick = () => { state.sceneIndex = (state.sceneIndex + state.scenes.length - 1) % state.scenes.length; home(); renderAll(); };
  $("scene-next").onclick = () => { state.sceneIndex = (state.sceneIndex + 1) % state.scenes.length; home(); renderAll(); };
  $("t-home").onclick = home; $("t-play").onclick = play; $("t-stop").onclick = () => stop();
  $("undo").onclick = undo; $("redo").onclick = redo;
  $("mirror").onclick = mirrorSelected;
  document.querySelectorAll("#filters button").forEach((b) => { b.onclick = () => { state.filter = b.dataset.filter; renderAll(); }; });
  $("dup").onclick = duplicateSelected; $("del").onclick = removeSelected; $("spread").onclick = spreadSelected;
  $("presets").onclick = openPresets;
  $("prefs").onclick = openPrefs;        // 環境設定（歯車）
  $("save").onclick = openDesigns;       // 照明デザインを名前を付けて保存
  $("empty-presets").onclick = openPresets;
  $("empty-truss").onclick = () => { state.tool = "truss"; $("empty").hidden = true; renderAll(); $("empty").hidden = true; };
  /* ---------- よくある仕込み（プリセット） ----------
     現実にあり得る構成であること、が本人の条件。位置の名前と構成は日本のホールの実設備に合わせた。
     根拠（2026-09-11 閲覧）:
       ・さいたま市文化センター 大ホール 舞台照明設備一覧 … 第1シーリング1.5kw凸×48（8インチ24台2列）、
         第2シーリング2kw凸×32（上下各16台1列）、第1フロントサイド上下各32（4台8段）、
         1SUS 1kw凸×11＋1kwフレネル×12、SS 舞台上下×各10台、サスバトンは5本（公開設備表の表記は1サス〜5サス）。
         https://saitama-culture.jp/sculwp/wp-content/uploads/material_stage_sakurasou_202405.pdf
       ・品川 INTERCITY HALL 照明機材リスト（2016/1） … PAR64 500w×120、1kwフレネル×60、SourceFour×30（SS/HS）。
         https://sic-hall.com/pdf/list/light-listn.pdf
       ・萬劇場（小劇場） … CSQ1000w×10・CSQ500w×30・FQ500w×24。https://lasens.com/database/theater-597.html
       ・位置の呼び名（シーリング＝CL／フロントサイド＝FR／サスバトン＝SUS／客席に近い方から数える）
       ※「サス」は灯体そのものを指す言い方なので、このアプリでは吊り元を「バトン1・バトン2…」と呼ぶ
         （2026-09-13 本人指摘）。
         https://www.pacnet.co.jp/column/2020/11/24100000.html ／ https://nekolight.com/lite/basic/hall/01.html
     灯数は「常設の総数」ではなく「1演目で実際に使う目安」。バトンは客席に近い順にバトン1・バトン2・バトン3。 */
  const spreadU = (n, from = 0.12, to = 0.88) => (n <= 1 ? [0.5] : Array.from({ length: n }, (_, i) => from + (to - from) * i / (n - 1)));
  const RIG_PRESETS = [
    {
      key: "small", name: "小劇場の基本仕込み", count: 20,
      lead: "客席100〜200席くらいの小屋で、芝居を普通に見せる形。",
      detail: "前明かり6／バトン1に6／バトン2に4／SS 下手2・上手2。すべて固定灯（ムービングなし）。",
      why: "小劇場は常設50〜60灯でも、1演目で回すのは20前後。まず顔が見えて、体に立体感が出る最小構成。",
      build: () => {
        const b1 = addTrussAt(0.55, 5.5, "バトン1"), b2 = addTrussAt(0.3, 5.5, "バトン2");
        spreadU(6, 0.15, 0.85).forEach((u) => putFront(u, 5, 6));
        spreadU(6).forEach((u) => putHang(b1, u, "fixed"));
        spreadU(4, 0.2, 0.8).forEach((u) => putHang(b2, u, "fixed"));
        [0.35, 0.6].forEach((v) => { putSS("shimote", v, 2.2, "fixed"); putSS("kamite", v, 2.2, "fixed"); });
      },
    },
    {
      key: "hall", name: "中ホールの基本仕込み", count: 36,
      lead: "500〜1000席のホール。シーリングとフロントサイドが別にある形。",
      detail: "シーリング8／フロントサイド 下手2・上手2／バトン1に8／バトン2に6／バトン3に4／SS 下手3・上手3。すべて固定灯。",
      why: "ホールは前明かりが「客席天井のシーリング」と「客席横壁のフロントサイド」に分かれ、サスバトンも3本前後使う（さいたま市文化センター大ホールは5本）。",
      build: () => {
        const b1 = addTrussAt(0.58, 6.5, "バトン1"), b2 = addTrussAt(0.38, 6.5, "バトン2"), b3 = addTrussAt(0.18, 6.5, "バトン3");
        spreadU(8, 0.12, 0.88).forEach((u) => putFront(u, 7, 8));
        [0.04, 0.1].forEach((u) => putFront(u, 4, 5.5)); [0.9, 0.96].forEach((u) => putFront(u, 4, 5.5));
        spreadU(8).forEach((u) => putHang(b1, u, "fixed"));
        spreadU(6).forEach((u) => putHang(b2, u, "fixed"));
        spreadU(4, 0.2, 0.8).forEach((u) => putHang(b3, u, "fixed"));
        [0.3, 0.5, 0.7].forEach((v) => { putSS("shimote", v, 2.5, "fixed"); putSS("kamite", v, 2.5, "fixed"); });
      },
    },
    {
      key: "live", name: "ライブ・コンサート", count: 24,
      lead: "音楽のライブ。動く光が主役で、前明かりは最小限。",
      detail: "バトン1にムービング8／バトン3にムービング6／床置き ムービング6／SS 下手2・上手2（固定）。ムービング20・固定4。",
      why: "ライブはトラス吊りのムービングと床置き（転がし）で画を作り、顔を平らに見せる前明かりは絞る。",
      build: () => {
        const b1 = addTrussAt(0.55, 6.5, "前バトン"), b3 = addTrussAt(0.15, 6.5, "後バトン");
        spreadU(8).forEach((u) => putHang(b1, u, "moving"));
        spreadU(6).forEach((u) => putHang(b3, u, "moving"));
        spreadU(6, 0.15, 0.85).forEach((u) => putFloor(u, 0.12, "moving"));
        [0.4, 0.65].forEach((v) => { putSS("shimote", v, 2, "fixed"); putSS("kamite", v, 2, "fixed"); });
      },
    },
    {
      key: "play", name: "演劇・素舞台", count: 26,
      lead: "装置の少ない芝居。人の顔と立ち位置がはっきり見えることを優先。",
      detail: "前明かり8／バトン1に8／バトン2に6／SS 下手2・上手2（すべて固定）。",
      why: "素舞台は「明かりで場所を分ける」ので、前明かりとバトンの灯を細かく並べてエリアを作る。動く光は使わない。",
      build: () => {
        const b1 = addTrussAt(0.56, 6, "バトン1"), b2 = addTrussAt(0.32, 6, "バトン2");
        spreadU(8, 0.12, 0.88).forEach((u) => putFront(u, 6, 7));
        spreadU(8).forEach((u) => putHang(b1, u, "fixed", 26));
        spreadU(6).forEach((u) => putHang(b2, u, "fixed", 26));
        [0.35, 0.6].forEach((v) => { putSS("shimote", v, 2.2, "fixed"); putSS("kamite", v, 2.2, "fixed"); });
      },
    },
    {
      key: "dance", name: "ダンス", count: 28,
      lead: "体の線を見せたい。横からの光を厚く、前明かりは控えめ。",
      detail: "前明かり4／バトン1に6／バトン2に6／SS 下手3・上手3（固定）／床置き ムービング6。",
      why: "ダンスは前から当てすぎると体が平らに見えるので、SS（横）と後ろからの抜きを厚くするのが定石。",
      build: () => {
        const b1 = addTrussAt(0.55, 6.5, "バトン1"), b2 = addTrussAt(0.25, 6.5, "バトン2");
        spreadU(4, 0.25, 0.75).forEach((u) => putFront(u, 6, 7, 18));
        spreadU(6).forEach((u) => putHang(b1, u, "fixed", 28));
        spreadU(6).forEach((u) => putHang(b2, u, "fixed", 28));
        [0.25, 0.45, 0.7].forEach((v) => { putSS("shimote", v, 2.6, "fixed", 16); putSS("kamite", v, 2.6, "fixed", 16); });
        spreadU(6, 0.15, 0.85).forEach((u) => putFloor(u, 0.1, "moving", 12));
      },
    },
    {
      key: "talk", name: "トーク・発表会", count: 12,
      lead: "人が立って話すだけの会。顔が明るく見えれば足りる。",
      detail: "前明かり6／バトン1に4／SS 下手1・上手1（すべて固定）。",
      why: "講演・発表・朗読は顔の明るさが最優先。灯数を絞っても成立する最小構成。",
      build: () => {
        const b1 = addTrussAt(0.5, 5.5, "バトン1");
        spreadU(6, 0.2, 0.8).forEach((u) => putFront(u, 5, 6, 20));
        spreadU(4, 0.25, 0.75).forEach((u) => putHang(b1, u, "fixed", 30));
        putSS("shimote", 0.5, 2, "fixed"); putSS("kamite", 0.5, 2, "fixed");
      },
    },
    {
      key: "festival", name: "野外・仮設ステージ", count: 18,
      lead: "屋外やイベント。トラスを2本組んで、そこに全部載せる形。",
      detail: "前トラス ムービング6＋固定2／後トラス ムービング6／床置き ムービング4。前明かりなし。",
      why: "仮設は客席側に吊る場所がないので、前明かりが取れず、舞台上のトラスと床置きで作る。",
      build: () => {
        const b1 = addTrussAt(0.62, 5, "前トラス"), b2 = addTrussAt(0.2, 5, "後トラス");
        spreadU(6).forEach((u) => putHang(b1, u, "moving"));
        [0.08, 0.92].forEach((u) => putHang(b1, u, "fixed", 30));
        spreadU(6).forEach((u) => putHang(b2, u, "moving"));
        spreadU(4, 0.2, 0.8).forEach((u) => putFloor(u, 0.1, "moving"));
      },
    },
    {
      key: "circus", name: "サーカス・空中芸", count: 22,
      lead: "空中の演者を追う。高い位置のムービングと、横からの抜きを厚めに。",
      detail: "前明かり4（固定）／バトン1にムービング6／バトン2にムービング6／SS 下手3・上手3（固定）。ムービング12・固定10。",
      why: "空中芸は床ではなく空中の一点を狙うので、追える灯＝ムービングが要る。体のシルエットを出すためSSを厚めに立てる。",
      build: () => {
        const b1 = addTrussAt(0.55, 7, "バトン1"), b2 = addTrussAt(0.3, 7, "バトン2");
        spreadU(4, 0.2, 0.8).forEach((u) => putFront(u, 6, 7));
        spreadU(6).forEach((u) => putHang(b1, u, "moving"));
        spreadU(6).forEach((u) => putHang(b2, u, "moving"));
        [0.3, 0.5, 0.7].forEach((v) => { putSS("shimote", v, 3, "fixed"); putSS("kamite", v, 3, "fixed"); });
      },
    },
  ];
  const addTrussAt = (v, h, lbl) => { const t = E.newTruss(uid("t"), v, h, lbl); state.rig.trusses.push(t); return t; };
  const pushFix = (mount, kind, deg) => state.rig.fixtures.push(E.newFixture(uid("f"), state.nextNo++, mount, "", kind, deg));
  /* 既定の広がり: 前明かりは遠いので細め、バトンの灯は中くらい、SSは横から抜くので細め、転がしは広め。
     ムービングは中間（実機のズームは7〜50°）。 */
  const putHang = (t, u, kind, deg) => pushFix({ type: "truss", trussId: t.id, u }, kind, deg || (kind === "moving" ? 14 : 24));
  const putFront = (u, ahead, h, deg) => pushFix({ type: "front", u, ahead, h }, "fixed", deg || 14);
  const putSS = (side, v, h, kind, deg) => pushFix({ type: "side", side, v, h }, kind, deg || (kind === "moving" ? 12 : 20));
  const putFloor = (u, v, kind, deg) => pushFix({ type: "floor", u, v }, kind, deg || (kind === "moving" ? 12 : 30));

  /* ---------- 強さの効き方（ベロシティカーブ） ----------
     アプリ全体で1本だけ持つ共通の設定（2026-09-13 本人決定）。灯ごとの「強さ」の数値は
     目盛りどおりのリニアのままで、その数値が図の明るさへどう効くかだけをこの曲線が決める。
     音楽のベロシティカーブと同じ考え方なので、選ぶのではなく指でなぞって描く。 */

  /* 環境設定（歯車）。項目はいまのところ「強さの効き方」だけ
     （2026-09-13 本人要望: 効き方は照明デザインの欄から外し、環境設定の1項目として置く）。 */
  function openPrefs() {
    dialog(`<p class="kicker">環境設定</p>
      <div class="prefitem">
        <p class="prefname">強さの効き方（全灯共通）</p>
        <div id="pref-curve"></div>
      </div>`, [["閉じる", null, "primary"]]);
    mountLevelCurve($("pref-curve"));
  }
  function mountLevelCurve(host) {
    if (!host) return;
    host.innerHTML = `<p class="hint">灯ごとの「強さ」は目盛りどおりの数値です。その数値が<b>図に出る明るさ</b>へどう効くかを、ここで決めます（音楽のベロシティカーブと同じ考え方）。
      この1本をアプリ全体で使います——灯ごと・場面ごとには変わりません。</p>
      <canvas id="lvcurve" class="curvecv" width="640" height="360" aria-label="強さの効き方のカーブ"></canvas>
      <p class="hint"><b>横</b>＝つまみの数値　<b>縦</b>＝図に出る明るさ。点線がリニア（そのままの目盛り）。</p>
      <p class="hint live" id="lvread"></p>
      <button type="button" class="btn small quiet" id="lvreset">リニアに戻す</button>`;
    const cv = $("lvcurve"); if (!cv) return;
    const cx = cv.getContext("2d"), read = $("lvread");
    const N = () => state.levelCurve.length - 1;
    let held = null;                                   // いま掴んでいる点
    const paint = () => {
      const w = cv.width, h = cv.height;
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.fillStyle = "#14110e"; cx.fillRect(0, 0, w, h);
      cx.strokeStyle = "rgba(240,231,214,0.12)"; cx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        const x = (w * i) / 4, y = (h * i) / 4;
        cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, h); cx.stroke();
        cx.beginPath(); cx.moveTo(0, y); cx.lineTo(w, y); cx.stroke();
      }
      cx.save(); cx.setLineDash([9, 9]); cx.strokeStyle = "rgba(240,231,214,0.3)"; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(0, h); cx.lineTo(w, 0); cx.stroke(); cx.restore();
      // 曲線そのもの。curveAt を細かく刻んで描くので、図に出る明るさとそのまま一致する
      cx.strokeStyle = "#9c823f"; cx.lineWidth = 5; cx.lineJoin = "round"; cx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const x = i / 120, y = curveAt(x);
        i ? cx.lineTo(x * w, h - y * h) : cx.moveTo(x * w, h - y * h);
      }
      cx.stroke();
      // 動かせる点。0%は消灯で固定なので小さく沈めて描く
      state.levelCurve.forEach((v, i) => {
        const x = (i / N()) * w, y = h - v * h, fixed = i === 0;
        cx.beginPath(); cx.arc(x, y, fixed ? 7 : (held === i ? 14 : 11), 0, Math.PI * 2);
        cx.fillStyle = fixed ? "rgba(240,231,214,0.25)" : (held === i ? "#efe7d6" : "#9c823f");
        cx.fill();
        if (!fixed) { cx.strokeStyle = "#14110e"; cx.lineWidth = 3; cx.stroke(); }
      });
      if (read) read.textContent = [25, 50, 75, 100].map((q) => `${q}% → ${Math.round(curveAt(q / 100) * 100)}%`).join("　／　");
    };
    /* いちばん近い点を掴んで、縦だけ動かす。横位置は固定なので点どうしが入れ替わらない。
       0%の点は消灯で固定（掴めない）。 */
    const at = (ev) => {
      const r = cv.getBoundingClientRect();
      return { x: E.clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1),
               y: E.clamp(1 - (ev.clientY - r.top) / Math.max(1, r.height), 0, 1) };
    };
    const grab = (ev) => {
      const { x } = at(ev);
      let best = null, bd = 1;
      state.levelCurve.forEach((v, i) => { if (i === 0) return; const d = Math.abs(x - i / N()); if (d < bd) { bd = d; best = i; } });
      return bd <= 0.5 / N() + 0.06 ? best : null;      // 近くを押せばその点を掴む
    };
    cv.onpointerdown = (ev) => {
      ev.preventDefault(); held = grab(ev); if (held == null) return;
      try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* 取れなくても動かせる */ }
      state.levelCurve[held] = at(ev).y; paint(); draw();
    };
    cv.onpointermove = (ev) => { if (held == null) return; state.levelCurve[held] = at(ev).y; paint(); draw(); };
    /* 離した時に1回だけ記録する。ショー共通の持ち物として保存・Undoの対象にしたので、
       1回のドラッグ＝1手ぶんの履歴になるようにそろえる（2026-09-13 本人決定）。 */
    cv.onpointerup = cv.onpointercancel = () => { if (held == null) return; held = null; paint(); commit(); };
    const rst = $("lvreset"); if (rst) rst.onclick = () => { resetLevelCurve(); paint(); draw(); commit(); };
    paint();
  }

  function openPresets() {
    const cards = RIG_PRESETS.map((p) => `<button type="button" class="pcard" data-preset="${p.key}">
      <span class="pname">${p.name}<em>${p.count}灯</em></span>
      <span class="plead">${p.lead}</span>
      <span class="pdetail">${p.detail}</span>
      <span class="pwhy">${p.why}</span></button>`).join("");
    dialog(`<p class="kicker">よくある仕込みから始める</p><div class="pgrid">${cards}</div>
      <p class="note">灯数は「常設の総数」ではなく1演目で使う目安です。置いたあとで足す・減らす・動かせます。
      位置の呼び名と構成は、さいたま市文化センター大ホール・品川インターシティホールの公開設備表と、舞台照明の一般的な呼称に合わせています。</p>`,
      [["やめる", null, "quiet"]]);
    document.querySelectorAll("#dialog .pcard").forEach((b) => {
      b.onclick = () => {
        $("dialog").hidden = true;
        const p = RIG_PRESETS.find((x) => x.key === b.dataset.preset); if (!p) return;
        state.rig = { trusses: [], fixtures: [] }; state.nextNo = 1; state.sel.clear(); state.selTruss = null;
        p.build();
        state.selTruss = state.rig.trusses[0] ? state.rig.trusses[0].id : null;
        /* 20灯を超えるときは、まず「どこに何灯あるか」を一望できるよう全部畳んでおく。
           1灯ずつの行から入ると、36灯では3画面ぶんスクロールしないと全体が見えない（実測）。 */
        state.collapsed = new Set(state.rig.fixtures.length > 20 ? mountSections().map((x) => x.key) : []);
        commit(`「${p.name}」で${state.rig.fixtures.length}灯を組みました`);
      };
    });
  }

  // 一撃で置く。確認ダイアログは出さない（取り消せる操作に確認を挟まない。2026-09-11 本人要望）
  $("empty-preset").onclick = () => {
    const t = E.newTruss(uid("t"), 0.15, 6, "奥バトン");
    state.rig.trusses.push(t);
    [0.2, 0.4, 0.6, 0.8].forEach((u) => state.rig.fixtures.push(E.newFixture(uid("f"), state.nextNo++, { type: "truss", trussId: t.id, u }, "")));
    state.selTruss = t.id; state.sel.clear();
    commit("奥バトン1本（高さ約6m）＋ムービング4灯を吊りました");   // toastの「元に戻す」で取り消せる
  };
  $("apply").onclick = () => { state.dirty = false; state.history.length = 0; state.future.length = 0; baseline = snapshot(); renderAll(); $("dirty").textContent = "ショーへ適用しました"; setTimeout(() => renderAll(), 2500); toast("ショーへ適用しました（試作なので画面は残ります）"); };
  $("close").onclick = () => { if (state.dirty) dialog("<p>変更がまだ適用されていません。</p>", [["編集に戻る", null, "quiet"], ["破棄して閉じる", () => toast("破棄しました（試作なので画面は残ります）"), "quiet"], ["適用して閉じる", () => $("apply").onclick(), "primary"]]); else toast("閉じました（試作なので画面は残ります）"); };

  // 書き出し: 平面図を4秒録画（順0で検証した方式）＋3コマPNG＋灯ごとの説明
  let exportCancel = false;
  $("band-cancel").onclick = () => { exportCancel = true; };
  $("export").onclick = async () => {
    if (state.exporting) return; const lit = state.rig.fixtures.filter((f) => isLit(lightOf(f.id))); if (!lit.length) { toast("オンの灯がありません。「照明デザイン」タブで灯を選び、右上のボタンでオンにしてください。"); return; }
    state.exporting = true; exportCancel = false; stop(); state.mode = "move"; renderAll();
    const band = $("band"), bar = $("band-bar"); band.hidden = false; $("band-text").textContent = "動画を書き出しています　この画面を開いたままにしてください。";
    const base = `light-rig-${scene().name}`;
    try {
      const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
      if (mime) {
        const stream = plan.captureStream(0); const track = stream.getVideoTracks()[0]; const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5e6 }); const chunks = [];
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); }; const done = new Promise((r) => { rec.onstop = r; rec.onerror = r; });
        const DUR = 4000; let t = 0; rec.start(250);
        await new Promise((r) => { const timer = setInterval(() => { if (exportCancel || t > DUR) { clearInterval(timer); rec.stop(); r(); return; } state.play.t = t; draw(); track.requestFrame && track.requestFrame(); bar.style.width = `${Math.min(100, t / DUR * 100)}%`; t += 33; }, 33); });
        await done;
        if (!exportCancel && chunks.length) download(new Blob(chunks, { type: mime.split(";")[0] }), `${base}.${mime.startsWith("video/mp4") ? "mp4" : "webm"}`);
      }
      if (!exportCancel) {
        const off = document.createElement("canvas"); off.width = plan.width * 3 / 2; off.height = plan.height / 2 + 40; const oc = off.getContext("2d"); oc.fillStyle = "#0d0e10"; oc.fillRect(0, 0, off.width, off.height);
        [0, 1000, 2000].forEach((tt, i) => { state.play.t = tt; draw(); oc.drawImage(plan, i * plan.width / 2, 40, plan.width / 2, plan.height / 2); oc.fillStyle = "#efe7d6"; oc.font = "22px sans-serif"; oc.fillText(`${(tt / 1000).toFixed(1)}秒`, i * plan.width / 2 + 12, 28); });
        oc.fillStyle = "#df6433"; oc.font = "600 22px sans-serif"; oc.fillText(`光の配置と動きの案　シーン「${scene().name}」`, off.width - 520, 28);
        await new Promise((r) => off.toBlob((b) => { download(b, `${base}.png`); r(); }, "image/png"));
        const lines = [`灯体の配置と動きの案　シーン「${scene().name}」　${new Date().toISOString().slice(0, 10)}`, ""]; state.rig.fixtures.forEach((f) => lines.push(`${label(f.id)}${f.name ? "（" + f.name + "）" : ""}：${E.describeMount(f, state.rig)}。${E.describeCue(lightOf(f.id), f)}`)); cue().groups.forEach((g, i) => lines.push(`組${i + 1}（${groupName(g)}）：${g.members.map(label).join("・")}`)); lines.push("", "灯体の概略配置と動きの案です。機種・回路・DMX・照度・設置の安全性は未検討です。");
        download(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }), `${base}.txt`);
        toast("動画・図・説明を書き出しました");
      } else toast("書き出しを中止しました");
    } catch (e) { toast("書き出しに失敗しました: " + (e && e.message)); }
    band.hidden = true; bar.style.width = "0%"; state.exporting = false; state.play.t = 0; renderAll();
  };
  /* ---------- 照明デザインの保存（名前を付けて残す） ----------
     2026-09-13 本人要望。後で舞台スケッチ本体が取り込めるよう、<b>アプリに依らない形</b>で持つ。

     書式（1ファイル＝1つの照明デザイン）:
       format   "shosai.light-design" 固定。取り込む側はこれを見て判別する
       version  書式の版。増えたら取り込む側で分岐する
       name     デザイン名（本人が付ける）
       savedAt  保存した時刻（ISO8601）
       stage    舞台の大きさ {W,D,H}（m）。u/v を実寸に戻すのに要る
       rig      仕込み（バトンと灯体）。ショー共通
       scenes   場面ごとの灯の設定。{id,name,cue:{lights,groups}} だけを持ち、
                演者・セット（pieces）は<b>持たない</b>——あれは舞台スケッチ側の持ち物なので、
                取り込むときは向こうの場面へ cue だけを載せる
       palette  作った色（ショー共通）
       levelCurve 強さの効き方（全灯共通のカーブ）
       coords   座標と単位の約束。取り込む側が推測しなくて済むように文字で書いておく

     保存先はこのブラウザ（localStorage）。ファイル書き出し／読み込みもできるので、
     別の環境や本体へはファイルで渡す。 */
  const DESIGN_FORMAT = "shosai.light-design";
  const DESIGN_VERSION = 1;
  const DESIGN_STORE = "shosai.lightDesigns.v1";

  function buildDesign(name) {
    return {
      format: DESIGN_FORMAT, version: DESIGN_VERSION,
      name: String(name || "名前なし").slice(0, 60),
      savedAt: new Date().toISOString(),
      app: "照明デザインモード（試作）",
      stage: { ...state.dims },
      coords: {
        u: "左右 0=下手 〜 1=上手", v: "奥行き 0=最奥 〜 1=最前（客席側）", hM: "床からの高さ（m）",
        level: "強さ 0〜100（0は消灯と同じ）", levelTo: "動きの終点の強さ（無ければ変化なし）",
        beamDeg: "光の広がり（度）", beamDegTo: "動きの終点の広がり（無ければ変化なし）",
        periodSec: "1往復（1周）の秒数", offsetSec: "何秒遅らせて始めるか",
      },
      rig: JSON.parse(JSON.stringify(state.rig)),
      scenes: state.scenes.map((sc) => ({ id: sc.id, name: sc.name, cue: JSON.parse(JSON.stringify(sc.cue)) })),
      palette: [...state.palette],
      levelCurve: [...state.levelCurve],
      curtains: { ...state.curtains },
    };
  }
  /* 取り込み。場面の演者・セットは<b>いまのもの</b>を残し、灯の設定だけ差し替える
     （デザインは灯の話なので、舞台スケッチ側の駒を上書きしない）。 */
  function applyDesign(o) {
    if (!o || o.format !== DESIGN_FORMAT) throw new Error("この形式は読めません（照明デザインのファイルではありません）");
    if (Number(o.version) > DESIGN_VERSION) throw new Error("新しい版の形式です。このアプリでは読めません");
    if (!o.rig || !Array.isArray(o.scenes)) throw new Error("中身が足りません（仕込みか場面がありません）");
    if (o.stage) state.dims = { W: E.finite(o.stage.W, 12), D: E.finite(o.stage.D, 8), H: E.finite(o.stage.H, 8) };
    const byId = new Map(state.scenes.map((sc) => [sc.id, sc]));
    state.scenes = o.scenes.map((ds, i) => {
      const cur = byId.get(ds.id) || state.scenes[i];
      return { id: ds.id, name: ds.name || `場面${i + 1}`, pieces: cur ? cur.pieces : [], cue: ds.cue || { lights: {}, groups: [] } };
    });
    state.rig = o.rig;
    if (Array.isArray(o.palette)) state.palette = [...o.palette];
    if (Array.isArray(o.levelCurve) && o.levelCurve.length === LEVEL_CURVE_POINTS) state.levelCurve = [...o.levelCurve];
    if (o.curtains) state.curtains = { ...state.curtains, ...o.curtains };
    // 番号の続きをそろえる（読み込んだ灯と番号がぶつからないように）
    state.nextNo = state.rig.fixtures.reduce((mx, f) => Math.max(mx, E.finite(f.no, 0)), 0) + 1;
    state.sceneIndex = Math.min(state.sceneIndex, state.scenes.length - 1);
    state.sel.clear(); state.selTruss = state.rig.trusses[0] ? state.rig.trusses[0].id : null;
    state.designName = o.name || "";
    state.history = []; state.future = []; state.dirty = false; baseline = snapshot();
    renderAll();
  }
  const readStore = () => { try { const raw = localStorage.getItem(DESIGN_STORE); const a = raw ? JSON.parse(raw) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const writeStore = (list) => { try { localStorage.setItem(DESIGN_STORE, JSON.stringify(list)); return true; } catch (e) { toast("このブラウザに保存できませんでした（容量かプライベートモードの可能性）"); return false; } };
  const designFileName = (name) => `${(name || "照明デザイン").replace(/[\\/:*?"<>|]/g, "_")}.lightdesign.json`;

  function openDesigns() {
    const list = readStore();
    const rows = list.length
      ? list.map((d, i) => `<div class="dsrow" data-i="${i}">
          <span class="dsname">${(d.name || "名前なし").replace(/</g, "&lt;")}<small>${(d.savedAt || "").slice(0, 16).replace("T", " ")}　灯${(d.rig && d.rig.fixtures ? d.rig.fixtures.length : 0)}・場面${(d.scenes || []).length}</small></span>
          <span class="dsacts">
            <button type="button" class="btn small" data-act="load" data-i="${i}">呼び出す</button>
            <button type="button" class="btn small quiet" data-act="file" data-i="${i}">ファイルへ</button>
            <button type="button" class="btn small quiet" data-act="del" data-i="${i}">削除</button>
          </span></div>`).join("")
      : `<p class="hint">まだ保存された照明デザインはありません。</p>`;
    dialog(`<p class="kicker">照明デザインを保存する</p>
      <div class="field wide"><span>デザイン名</span><input type="text" id="dsname" maxlength="60" placeholder="例: オープニング案A" value="${(state.designName || "").replace(/"/g, "&quot;")}"></div>
      <div class="dsbtns">
        <button type="button" class="btn small primary" id="dssave">この名前で保存</button>
        <button type="button" class="btn small" id="dsfile">ファイルへ書き出す</button>
        <button type="button" class="btn small quiet" id="dsopen">ファイルから読み込む</button>
      </div>
      <input type="file" id="dspick" accept=".json,application/json" hidden>
      <p class="hint">保存先はこのブラウザです。別の環境や舞台スケッチ本体へ渡すときはファイルにします。
      ファイルは<b>アプリに依らない形</b>（format: ${DESIGN_FORMAT}）なので、本体側で取り込めます。
      演者・セットは含めません——あれは舞台スケッチ側の持ち物で、取り込むときは向こうの場面へ灯の設定だけが載ります。</p>
      <p class="prefname">保存したデザイン</p>
      <div class="dslist">${rows}</div>`, [["閉じる", null, "primary"]]);

    const nameNow = () => ($("dsname") ? $("dsname").value.trim() : "");
    if ($("dssave")) $("dssave").onclick = () => {
      const nm = nameNow(); if (!nm) { toast("デザイン名を入れてください"); return; }
      const all = readStore();
      const at = all.findIndex((d) => d.name === nm);
      const d = buildDesign(nm);
      if (at >= 0) all[at] = d; else all.push(d);
      if (!writeStore(all)) return;
      state.designName = nm; renderAll();
      $("dialog").hidden = true;
      toast(at >= 0 ? `「${nm}」を上書き保存しました` : `「${nm}」を保存しました`);
    };
    if ($("dsfile")) $("dsfile").onclick = () => {
      const nm = nameNow() || "照明デザイン";
      const d = buildDesign(nm);
      download(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }), designFileName(nm));
      state.designName = nm; renderAll();
      toast(`「${nm}」をファイルに書き出しました`);
    };
    if ($("dsopen")) $("dsopen").onclick = () => $("dspick") && $("dspick").click();
    if ($("dspick")) $("dspick").onchange = async () => {
      const f = $("dspick").files && $("dspick").files[0]; if (!f) return;
      try { applyDesign(JSON.parse(await f.text())); $("dialog").hidden = true; toast(`「${state.designName || f.name}」を読み込みました`); }
      catch (e) { toast(`読み込めませんでした: ${e.message}`); }
    };
    document.querySelectorAll("#dialog .dsrow button").forEach((b) => {
      b.onclick = () => {
        const all = readStore(); const i = Number(b.dataset.i); const d = all[i]; if (!d) return;
        if (b.dataset.act === "load") { try { applyDesign(d); $("dialog").hidden = true; toast(`「${d.name}」を呼び出しました`); } catch (e) { toast(`読み込めませんでした: ${e.message}`); } }
        if (b.dataset.act === "file") download(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }), designFileName(d.name));
        if (b.dataset.act === "del") { all.splice(i, 1); if (writeStore(all)) { openDesigns(); toast(`「${d.name}」を削除しました`); } }
      };
    });
  }

  function download(blob, name) { if (!blob) return; const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }

  /* 「8人のサーカス」を既定の起点にする（2026-09-13 本人要望「デフォルトで読み込んでほしい」）。
     演者・配置・姿勢は state.scenes 側にすでに実在の見本（stage-samples/index.js の eightCircus）
     として入っている。ここで足すのはライトの仕込み（トラス・灯体）だけ——「サーカス・空中芸」
     プリセット（22灯）をそのまま使う。点灯・色・動きはあえて未設定のまま渡す（灯体情報タブで
     ご本人に触ってもらう）。他のプリセットを試したいときは「よくある仕込みから選ぶ」でいつでも
     組み直せる（この既定の読み込みを打ち消すわけではなく、単に灯体を選び直すだけ）。 */
  function loadCircus8Demo() {
    const circus = RIG_PRESETS.find((p) => p.key === "circus");
    if (!circus) return;
    circus.build();
    state.selTruss = state.rig.trusses[0] ? state.rig.trusses[0].id : null;
    state.history = []; state.future = []; state.dirty = false;   // 見本の状態を「元に戻す」の起点にする
    baseline = snapshot();                                        // 控えも見本の状態にそろえる
  }
  loadCircus8Demo();

  // 試作の検証用。製品では出さない（状態を外から読めるようにしておく）
  window.__RIG = { state, E, planBox, secBox, secOf, SECS };

  /* ブラウザの大きさに追従する。モーダルだからと固定にしない（2026-09-11 本人要望）。
     rAFで1回にまとめる（ドラッグ中の連続リサイズで描き直しが溜まらないように）。 */
  let resizeRaf = 0;
  window.addEventListener("resize", () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; renderAll(); });
  });

  renderAll();
})();

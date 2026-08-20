#!/usr/bin/env node
/* 「舞台スケッチ」正本JSONの中から、演者の頭上に物が乗ってしまっている駒を検出する。
 *
 * 背景: stage-sketch.js の refreshBases() は、シーンの pieces 配列で「自分より前にある駒」
 * だけを支え候補にする（演者の頭の上も支え面として扱う設計）。台やマットのような什器を
 * 演者より後から配列に足す（＝あとから動かす）と、什器の方が演者の頭に「乗って」浮く。
 * 2026-08-19 にこの逆転が23箇所見つかり、直した（メモ: stage-sketch-piece-order-stacking-bug）。
 *
 * このスクリプトは stage-sketch.js の該当ロジック（poseExtent・PIECE_DIMS・refreshBases 等）を
 * 都度その場で読み取って使う。値を固定コピーすると本体の改訂で静かにズレるため。
 *
 * 許可リスト（allowlist）: 2026-08-20に残存検出を全件レビューし、木箱を運ぶ・道具を持つ等の
 * 「演者の上の小道具」は正当な表現と確定した（27件）。check-object-on-performer.allowlist.json に
 * 記録し、以後は許可リストに載っている組み合わせを「新規」から除外する。夜間スキャンは
 * 新規に増えた分だけを報告する（既知27件を毎晩報告し続けない）。
 *
 * 使い方:
 *   node tools/check-object-on-performer.mjs <json...>
 *   node tools/check-object-on-performer.mjs .stage-sketch-mcp/projects/*.json ../../jjk-show/*.json
 *   node tools/check-object-on-performer.mjs --all <json...>   # 許可リスト内の既知分も表示
 * 終了コード: 新規に見つかった件数（0件なら0）。CIやpreflightから素直に使える。
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TOOLS_DIR, "..");
const STAGE_SKETCH_JS = path.join(APP_ROOT, "stage-sketch.js");
const STAGE_VENUES_JS = path.join(APP_ROOT, "stage-venues.js");
const ALLOWLIST_JSON = path.join(TOOLS_DIR, "check-object-on-performer.allowlist.json");

// 検出結果を許可リストと突き合わせる鍵。高さ(base)は微妙な数値ズレで変わりうるので鍵に含めない。
function allowlistKey(item) {
  return [item.file, item.sceneId, item.pieceType, item.pieceName, item.holderName].join("|");
}

function loadAllowlistSet() {
  try {
    const raw = JSON.parse(readFileSync(ALLOWLIST_JSON, "utf8"));
    const list = Array.isArray(raw) ? raw : raw.entries;
    return new Set((list || []).map(allowlistKey));
  } catch (error) {
    // 許可リストが読めないときは「何も許可しない」側に倒す（検出を握りつぶさない）
    console.error(`WARN: 許可リストを読めなかったため、全件を新規として扱う（${error.message}）`);
    return new Set();
  }
}

function printItem(item) {
  console.log(`- ${item.file} ${item.sceneId}「${item.sceneTitle}」: ${item.pieceType}「${item.pieceName}」が ${item.holderName} の上（高さ${item.base}m）`);
}

function extractBetween(source, startAnchor, endAnchor, { fromIndex = 0 } = {}) {
  const start = source.indexOf(startAnchor, fromIndex);
  if (start === -1) throw new Error(`anchor not found: ${JSON.stringify(startAnchor)}`);
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  if (end === -1) throw new Error(`end anchor not found after ${JSON.stringify(startAnchor)}: ${JSON.stringify(endAnchor)}`);
  return source.slice(start, end + endAnchor.length);
}

function loadPoseData(stageSrc) {
  // BASE_JOINTS の宣言から poseExtent の IIFE 終端までを、そのまま実行して取り出す。
  // ここは演者の骨格そのものなので、コピーではなく本体から都度読む。
  const block = extractBetween(stageSrc, "const BASE_JOINTS = {", "\n  })();");
  const src = `${block}\nreturn { BASE_JOINTS, makePose, mirrorJoints, TRAP_GRIP, HIDDEN_POSES, POSES, poseById, poseExtent };`;
  // eslint-disable-next-line no-new-func
  return new Function(src)();
}

function loadPieceDims(stageSrc) {
  const block = extractBetween(stageSrc, "const PIECE_DIMS = {", "\n  };");
  // eslint-disable-next-line no-new-func
  return new Function(`${block}\nreturn PIECE_DIMS;`)();
}

function loadSolidTypes(stageSrc) {
  const block = extractBetween(stageSrc, "const SOLID_TYPES = {", "\n  };");
  // eslint-disable-next-line no-new-func
  return new Function(`${block}\nreturn SOLID_TYPES;`)();
}

function loadFlownOnly(stageSrc) {
  // 本体と同じ「吊物にしかならない道具」の一覧をその場で読む（コピーしない）
  const block = extractBetween(stageSrc, "const FLOWN_ONLY = {", "};");
  // eslint-disable-next-line no-new-func
  return new Function(`${block}\nreturn FLOWN_ONLY;`)();
}

function buildEngine() {
  const stageSrc = readFileSync(STAGE_SKETCH_JS, "utf8");
  const { poseExtent, TRAP_GRIP } = loadPoseData(stageSrc);
  const PIECE_DIMS = loadPieceDims(stageSrc);
  const SOLID_TYPES = loadSolidTypes(stageSrc);
  const FLOWN_ONLY = loadFlownOnly(stageSrc);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  const CHAIR_W = 0.5;
  const CHAIR_D = 0.55;
  const DEFAULT_HEIGHT_CM = 165;

  function makeContext(project) {
    const pieceSet = (piece) => {
      if (!piece || !piece.setId) return null;
      return (project.sets || []).find((t) => t.id === piece.setId) || null;
    };
    const pieceDims = (piece) => {
      const registered = pieceSet(piece);
      if (registered && registered.kind === "model") return { w: 1, d: 1, h: 1 };
      if (registered) return registered.dims;
      return (piece && piece.dims) || PIECE_DIMS[piece && piece.type] || null;
    };
    const pieceFootprint = (piece) => {
      const d = pieceDims(piece);
      if (!d) return null;
      if (piece.type === "chair") return { w: d.h * CHAIR_W, d: d.h * CHAIR_D };
      if (piece.type === "diabolo") {
        return piece.diaboloMode === "stand" ? { w: d.dia, d: d.dia } : { w: d.w, d: d.dia };
      }
      if (piece.type === "curtain") return { w: d.w, d: 0.12 };
      if (d.dia !== undefined) return { w: d.dia, d: d.dia };
      return { w: d.w, d: d.d };
    };
    const pieceHeightM = (piece) => {
      if (piece.type !== "performer") return null;
      const member = piece.castId ? (project.cast || []).find((c) => c.id === piece.castId) : null;
      const cm = member && Number(member.heightCm) ? Number(member.heightCm) : DEFAULT_HEIGHT_CM;
      return cm / 100;
    };
    const pieceTopLocal = (piece) => {
      if (piece.type === "light") return 0;
      if (piece.type === "seri") return Math.max(0, clamp(finite(piece.seriH, 0), -3, 4));
      if (piece.type === "curtain" || piece.type === "pool" || piece.type === "deck") return 0;
      if (piece.type === "performer") {
        return poseExtent(piece.pose).top * pieceHeightM(piece) * (piece.size / 100);
      }
      const d = pieceDims(piece);
      if (!d) return 0;
      if (piece.type === "chair") return d.h * 0.5;
      if (piece.type === "sphere") return d.lift + d.dia;
      return d.h;
    };
    const supportFootprint = (piece) => {
      if (piece.type === "light") return null;
      if (piece.type === "performer") {
        const H = pieceHeightM(piece) * (piece.size / 100);
        const ext = poseExtent(piece.pose);
        return { w: ext.halfX * 2 * H, d: ext.halfZ * 2 * H, cx: ext.cx * H, cz: ext.cz * H };
      }
      const foot = pieceFootprint(piece);
      return foot ? { w: foot.w, d: foot.d, cx: 0, cz: 0 } : null;
    };
    const isFlown = (piece) => {
      if (!piece || !SOLID_TYPES[piece.type]) return false;
      if (piece.type === "seri") return false;
      // 吊物にしかならない道具は、登録の flown が false でも吊物として扱う（本体と同じ）
      if (FLOWN_ONLY[piece.type]) return true;
      const owner = pieceSet(piece);
      return Boolean(owner ? owner.flown : piece.flown);
    };
    const PERFORMER_UNSUPPORTABLE_TYPES = { chair: true, table: true, bench: true, stool: true };
    const supportUnder = (piece, size, candidates) => {
      let top = 0;
      let holder = null;
      candidates.forEach((other) => {
        if (other === piece) return;
        if (other.type === "pole") return;
        const foot = supportFootprint(other);
        if (!foot) return;
        // 座る・寄りかかる家具は、サイズに関係なく演者の支え候補から常に外す。
        // 演者が座る対象であって、演者の上に乗ることはない。
        if (other.type === "performer" && PERFORMER_UNSUPPORTABLE_TYPES[piece.type]) return;
        // 演者は「自分と同じか、それより小さい設置面積の駒」しか支えない。
        // 台やマットのような、演者より広い場所を取る什器が並び順の都合で
        // 演者の頭に乗ってしまう逆転を防ぐ（什器の種類を列挙せず、大きさだけで線引きする）。
        if (other.type === "performer" && piece.type !== "performer") {
          const selfFoot = supportFootprint(piece);
          const selfArea = selfFoot ? selfFoot.w * selfFoot.d : Infinity;
          if (selfArea > foot.w * foot.d) return;
        }
        const rad = ((other.facing || 0) * Math.PI) / 180;
        const dw = (piece.u - other.u) * size.width;
        const dd = -(piece.v - other.v) * size.depth;
        const lx = dw * Math.cos(rad) + dd * Math.sin(rad) - foot.cx;
        const ly = -dw * Math.sin(rad) + dd * Math.cos(rad) - foot.cz;
        if (Math.abs(lx) > foot.w / 2 || Math.abs(ly) > foot.d / 2) return;
        const t = (other.base || 0) + pieceTopLocal(other);
        if (t > top) { top = t; holder = other.id; }
      });
      return { top, holder };
    };
    const flownLift = (piece) => {
      const dims = pieceDims(piece);
      return clamp(finite(dims && dims.lift, 0), 0, 10);
    };

    function refreshBases(size, pieces) {
      pieces.forEach((piece, i) => {
        if (piece.type === "light") { piece.base = 0; piece.supportId = null; return; }
        if (piece.type === "pole") { piece.base = 0; piece.supportId = null; return; }
        if (["seri", "revolve", "deck", "curtain", "pool"].includes(piece.type)) {
          piece.base = 0; piece.supportId = null; return;
        }
        if (isFlown(piece)) { piece.base = flownLift(piece); piece.supportId = null; return; }
        const candidates = pieces.slice(0, i).filter((p) => !isFlown(p))
          .concat(pieces.slice(i + 1).filter((p) => p.type === "seri"));
        const found = supportUnder(piece, size, candidates);
        piece.base = found.top;
        piece.supportId = found.holder;
        if (piece.type !== "performer") return;

        const pole = pieces.find((other) => other !== piece && other.type === "pole"
          && !isFlown(other)
          && Math.hypot((piece.u - other.u) * size.width, (piece.v - other.v) * size.depth) < 0.55);
        if (pole) {
          const top = (pieceDims(pole) || {}).h || 6;
          piece.supportId = pole.id;
          piece.base = clamp(finite(piece.poleH, 2.5), 0.8, Math.max(1, top - 0.4));
          return;
        }
        const trap = pieces.find((other) => other !== piece && other.type === "trapeze"
          && Math.hypot((piece.u - other.u) * size.width, (piece.v - other.v) * size.depth) < 0.55);
        if (trap) {
          const H = pieceHeightM(piece) * (piece.size / 100);
          const grip = TRAP_GRIP[piece.trapMode === "hang" ? "hang" : "sit"];
          piece.supportId = trap.id;
          piece.base = Math.max(0, flownLift(trap) - grip * H);
          return;
        }
        const tissue = pieces.find((other) => other !== piece && other.type === "tissue"
          && Math.hypot((piece.u - other.u) * size.width, (piece.v - other.v) * size.depth) < 0.55);
        if (tissue) {
          const top = flownLift(tissue);
          const bottom = Math.max(0, top - ((pieceDims(tissue) || {}).h || 0));
          const grip = clamp(finite(piece.tissueH, 4), bottom, Math.max(bottom, top - 0.2));
          const H = pieceHeightM(piece) * (piece.size / 100);
          piece.supportId = tissue.id;
          piece.base = Math.max(0, grip - TRAP_GRIP.hang * H);
          return;
        }
        if (found.holder) {
          const holder = pieces.find((other) => other.id === found.holder);
          if (holder && holder.type === "chair") {
            const sitHip = 0.285 * pieceHeightM(piece) * (piece.size / 100);
            piece.base = Math.max(0, found.top - sitHip);
          }
        }
      });
    }

    return { pieceSet, pieceDims, pieceFootprint, pieceHeightM, pieceTopLocal, supportFootprint, isFlown, supportUnder, refreshBases };
  }

  return { makeContext };
}

function loadVenues() {
  const sandbox = { window: {} };
  sandbox.window.localStorage = { getItem: () => null, setItem: () => {} };
  const src = readFileSync(STAGE_VENUES_JS, "utf8");
  // eslint-disable-next-line no-new-func
  const run = new Function("window", `${src}\nreturn window.SHOSAI_VENUES;`);
  return run(sandbox.window);
}

function sizeFor(venues, project) {
  const venue = venues.byId(project.venue) || venues.list[0];
  const size = venues.sizeById(venue, project.venueSize);
  return { width: size.width, depth: size.depth };
}

function scanFile(filePath, engine, venues) {
  const raw = JSON.parse(readFileSync(filePath, "utf8"));
  const project = raw.project || raw;
  if (!project || !Array.isArray(project.scenes)) return [];
  const size = sizeFor(venues, project);
  const ctx = engine.makeContext(project);
  const found = [];
  project.scenes.forEach((scene) => {
    const pieces = (scene.pieces || []).map((p) => ({ ...p }));
    ctx.refreshBases(size, pieces);
    pieces.forEach((piece) => {
      if (piece.type === "performer" || !piece.supportId) return;
      const holder = pieces.find((o) => o.id === piece.supportId);
      if (!holder || holder.type !== "performer") return;
      const castMember = holder.castId ? (project.cast || []).find((c) => c.id === holder.castId) : null;
      found.push({
        file: path.basename(filePath),
        sceneId: scene.id,
        sceneTitle: scene.title,
        pieceType: piece.type,
        pieceName: piece.name || (ctx.pieceSet(piece) || {}).name || "",
        base: Math.round(piece.base * 100) / 100,
        holderName: holder.name || (castMember && castMember.name) || "(名前未設定の演者)",
      });
    });
  });
  return found;
}

function partitionByAllowlist(all, allowSet) {
  const known = [];
  const fresh = [];
  all.forEach((item) => (allowSet.has(allowlistKey(item)) ? known : fresh).push(item));
  return { known, fresh };
}

function main() {
  const argv = process.argv.slice(2);
  const showAll = argv.includes("--all");
  const targets = argv.filter((arg) => arg !== "--all");
  if (!targets.length) {
    console.error("使い方: node tools/check-object-on-performer.mjs [--all] <project.json...>");
    process.exit(2);
  }
  const engine = buildEngine();
  const venues = loadVenues();
  let all = [];
  for (const target of targets) {
    try {
      all = all.concat(scanFile(target, engine, venues));
    } catch (error) {
      console.error(`ERROR scanning ${target}: ${error.message}`);
    }
  }
  const { known, fresh } = partitionByAllowlist(all, loadAllowlistSet());
  if (!fresh.length) {
    console.log(`OK: 新規の検出はありません。（許可リスト内の既知${known.length}件は除外。全件表示は --all）`);
    if (showAll && known.length) {
      console.log("--- 許可リスト内（既知・意図的な表現） ---");
      known.forEach(printItem);
    }
    process.exit(0);
  }
  console.log(`新規に見つかった件数: ${fresh.length}`);
  fresh.forEach(printItem);
  if (known.length) {
    console.log(`（別途、許可リスト内の既知${known.length}件は非表示。全件表示は --all）`);
    if (showAll) {
      console.log("--- 許可リスト内（既知・意図的な表現） ---");
      known.forEach(printItem);
    }
  }
  process.exit(fresh.length);
}

const isMain = (() => {
  try {
    // import.meta.url はパス中の空白等をURLエンコードするので、
    // 文字列比較ではなく fileURLToPath で戻してから比較する（2026-08-20に一度ここでハマった）。
    return fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || "");
  } catch (_) {
    return false;
  }
})();
if (isMain) main();

export { allowlistKey, loadAllowlistSet, partitionByAllowlist };

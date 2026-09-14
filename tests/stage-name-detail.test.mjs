import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

test("名簿の演者・装置・照明名はダブルクリックで既存の詳細窓を開く", () => {
  assert.match(source, /function nameButton\(label, onPick, onOpen\)[\s\S]*?addEventListener\("dblclick", \(e\) => \{ e\.preventDefault\(\); onOpen\(\); \}\)/);
  assert.match(source, /nameButton\(member\.name,[\s\S]*?openProfile\(member\.id\)/);
  assert.match(source, /nameButton\(item\.name,[\s\S]*?openSetInfo\(item\.id\)/);
});

test("正面図・平面図の名前札は描画と同じ矩形で詳細対象を判定する", () => {
  assert.match(source, /function pieceNameTag\(target, piece, L, shown\)/);
  assert.match(source, /target\.fillRect\(tag\.left, tag\.top, tag\.width, tag\.height\)/);
  assert.match(source, /function nameDetailTargetAt\(point, L, target\)[\s\S]*?pieceNameTag\(target, piece, L, shown\)[\s\S]*?pointInsideTag\(point, tag\)/);
  assert.match(source, /function backstageNameTag\(target, ghost, L\)/);
  assert.match(source, /backstageNameTag\(target, ghost, L\)[\s\S]*?return \{ castId: tag\.castId, piece: null \}/);
});

test("図上の名前をダブルクリックすると種別ごとの詳細窓を開く", () => {
  assert.match(source, /function openNameDetailTarget\(target\)[\s\S]*?openProfile\(target\.castId\)[\s\S]*?openSetInfo\(item\.id\)/);
  assert.match(source, /function onCanvasNameDoubleClick\(event\)[\s\S]*?STUDY_READ_ONLY[\s\S]*?guestSessionActive\(\)[\s\S]*?phoneViewerActive[\s\S]*?presenting/);
  assert.match(source, /\[canvas, planCanvas\][\s\S]*?addEventListener\("dblclick", onCanvasNameDoubleClick\)/);
  assert.match(source, /nameDetailTargetAt\(point, L, el\.getContext\("2d"\)\)\) return "pointer"/);
  assert.match(source, /function nameDetailTargetAt\(point, L, target\)[\s\S]*?tool !== "select" && tool !== "light"[\s\S]*?pieceAtSelectionBounds\(point, selectable/);
});

test("選択範囲内では名前札の外からも、最小の重なり対象を特定できる", () => {
  const start = source.indexOf("function pieceAtSelectionBounds(");
  assert.notEqual(start, -1, "selection-bound hit helper exists");
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}" && --depth === 0) { end = i + 1; break; }
  }
  assert.notEqual(end, -1, "selection-bound hit helper is closed");
  const hit = new Function(`return (${source.slice(start, end)});`)();
  const platform = { id: "platform" };
  const performer = { id: "performer" };
  const bounds = new Map([
    [platform, { x: 0, y: 0, w: 100, h: 100 }],
    [performer, { x: 30, y: 30, w: 20, h: 40 }],
  ]);
  assert.equal(hit({ x: 35, y: 50 }, [platform, performer], (piece) => bounds.get(piece)), performer);
  assert.equal(hit({ x: 0, y: 0 }, [platform], (piece) => bounds.get(piece)), platform);
  assert.equal(hit({ x: 120, y: 120 }, [platform], (piece) => bounds.get(piece)), null);
});

test("詳細窓を開いた直後は名前全体を選択して打ち替えられる", () => {
  assert.match(source, /els\.setInfoName\.focus\(\);\s*els\.setInfoName\.select\(\);/);
  assert.match(source, /els\.profileName\.focus\(\);\s*els\.profileName\.select\(\);/);
  assert.match(source, /item\.name = e\.target\.value\.slice\(0, 24\);\s*els\.setInfoTitle\.textContent/);
});

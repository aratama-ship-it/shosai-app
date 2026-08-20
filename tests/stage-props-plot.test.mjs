import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("小道具の香盤表は既定ONの機能スイッチとして登録される", () => {
  assert.match(stageSource,
    /key:\s*"propsplot"[\s\S]*?label:\s*"小道具の香盤表（印刷）"[\s\S]*?def:\s*true/);
});

test("受け渡し判定は登録札・持ち手・舞台内判定から状態を作る", () => {
  const source = stageSource.slice(
    stageSource.indexOf("function propPlotState"),
    stageSource.indexOf("function syncPropMoves"),
  );
  assert.match(source, /setId/);
  assert.match(source, /heldBy/);
  assert.match(source, /onStageArea/);
  assert.match(source, /function propMovesBetweenScenes/);
});

test("平面図の受け渡し線は香盤表の判定を再利用し、演者動線の表示に連動する", () => {
  const pairs = stageSource.slice(
    stageSource.indexOf("function propHandoffPairs"),
    stageSource.indexOf("function propPlotStateChanged"),
  );
  assert.match(pairs, /propPlotState\(previous, prop\)/);
  assert.match(pairs, /propPlotState\(scene, prop\)/);
  assert.match(pairs, /before\.kind !== "held"/);
  assert.match(pairs, /after\.kind !== "held"/);
  assert.match(pairs, /holderKey/);

  const routes = stageSource.slice(
    stageSource.indexOf("function drawRoutes"),
    stageSource.indexOf("const routesShownFor"),
  );
  assert.match(routes, /L\.plan && state\.showRoutesCast/);
  assert.match(routes, /propHandoffPairs\(scene\)/);
  assert.match(routes, /setLineDash\(\[3, 5\]\)/);
  assert.match(routes, /state\.showSetNames/);
});

test("印刷HTMLは小道具の香盤表と英語表題を生成する", () => {
  assert.match(stageSource, /Props plot/);
  assert.match(stageSource, /小道具の香盤表/);
  assert.match(stageSource, /props-plot-table/);
  assert.match(stageSource, /class=\"changed\"/);
});

test("シーン説明の直下に受け渡しの一行がある", () => {
  assert.match(indexSource,
    /id="stage-scene-desc-text"[\s\S]*?<p id="stage-prop-moves" class="stage-prop-moves" hidden><\/p>/);
});

test("床位置の上手下手は既存バミリと同じくuが大きい側を上手にする", () => {
  assert.match(stageSource, /if \(u < 0\.4\) return en \? "stage right" : "下手"/);
  assert.match(stageSource, /if \(u > 0\.6\) return en \? "stage left" : "上手"/);
  assert.match(stageSource, /off > 0 \? "SL" : "SR"/);
});

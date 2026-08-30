import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("stage-sketch.webmanifest", root), "utf8"));
const buildSource = await readFile(new URL("build_stage.py", root), "utf8");
const pwaSource = await readFile(new URL("stage-pwa.js", root), "utf8");
const swSource = await readFile(new URL("stage-sw.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const styleSource = await readFile(new URL("style.css", root), "utf8");
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const stageHtml = await readFile(new URL("stage.html", root), "utf8");

test("ホーム画面から舞台スケッチ単独版をstandaloneで開く", () => {
  assert.equal(manifest.id, "./stage.html");
  assert.equal(manifest.start_url, "./stage.html");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#191512");
});

test("iPad用メタ情報とホーム画面アイコンを単独版へ組み込む", () => {
  assert.match(buildSource, /apple-mobile-web-app-capable" content="yes"/);
  assert.match(buildSource, /rel="manifest" href="stage-sketch\.webmanifest"/);
  assert.match(buildSource, /rel="apple-touch-icon" href="icons\/stage-sketch-180\.png"/);
  assert.match(buildSource, /rel="icon" href="icons\/stage-sketch-192\.png"/);
  assert.match(buildSource, /stage-pwa\.js\?v=\d+/);

  // 版番号そのものは毎回上がる（上げないとキャッシュが更新されない）ので、
  // 数字を直書きせず「順序」と「三箇所の一致」を見る。
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ver = (src, name) => {
    const m = src.match(new RegExp(esc(name) + "\\?v=(\\d+)"));
    return m ? m[1] : null;
  };

  // 読み込み順: 同梱ショー → PWA → 本体
  const order = ["stage-samples/index.js", "stage-pwa.js", "stage-sketch.js"];
  const at = order.map((n) => stageHtml.indexOf(n + "?v="));
  assert.ok(at.every((p) => p >= 0), "単独版に3本のスクリプトが揃っている");
  assert.deepEqual(at, [...at].sort((a, b) => a - b),
    "読み込み順が 同梱ショー → PWA → 本体 になっていない");

  // 版番号は index.html が正本。stage.html と stage-sw.js がそれに追随しているか。
  // ここが食い違うと、直したのに画面へ反映されない（2026-08-08に実際に踏んだ）。
  for (const name of ["stage-sketch.js", "stage-venues.js", "stage-venue-lines.js",
    "stage-venue-editor.js", "stage-samples/index.js", "stage-rehearsal-export.js"]) {
    assert.equal(ver(stageHtml, name), ver(indexSource, name),
      `${name} の版番号が index.html と stage.html で食い違う（build_stage.py の実行忘れ）`);
    assert.equal(ver(swSource, name), ver(indexSource, name),
      `${name} の版番号が index.html と stage-sw.js で食い違う（Service Worker の更新忘れ）`);
  }

  assert.match(swSource, /const CACHE_NAME = "stage-sketch-pwa-v\d+"/);
});

test("iPadのホーム画面版だけ上部の補足文を隠す", () => {
  assert.match(pwaSource, /display-mode: standalone/);
  assert.match(pwaSource, /window\.navigator\.standalone === true/);
  assert.match(pwaSource, /navigator\.maxTouchPoints > 1/);
  assert.match(pwaSource, /\["localhost", "127\.0\.0\.1"\]\.includes\(window\.location\.hostname\)/);
  assert.match(pwaSource, /has\("tablet-pwa-preview"\)/);
  assert.match(pwaSource, /window\.SHOSAI_TABLET_PWA = tabletPwa/);
  assert.match(pwaSource, /classList\.toggle\("stage-pwa-tablet", tabletPwa\)/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-sketch-kicker/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-storage-caution/);
});

test("使い方・About・感想は上部ではなく設定内にまとめる", () => {
  /* 使い方まわりの5つは設定内の畳めるまとまり（stage-pref-guide）へ入れた。
     Aboutだけはそのまとまりの外（端末による違いと同じ行）に残している。 */
  const guide = indexSource.match(/<details class="stage-pref-guide"[\s\S]*?<\/details>/)?.[0] || "";
  ["stage-quick-open", "stage-tour-start", "stage-help-open", "stage-manual-open", "stage-feedback"]
    .forEach((id) => {
      assert.match(guide, new RegExp(`id="${id}"`), `${id} が使い方のまとまりにある`);
    });
  const prefsMain = indexSource.match(/<div class="stage-prefs-main">[\s\S]*?<\/aside>/)?.[0] || "";
  assert.match(prefsMain, /id="stage-about-open-from-prefs"/);
  assert.doesNotMatch(indexSource, /id="stage-about-open"/);
});

test("使い方のまとまりは言語設定のすぐ下に置き、既定では畳んでおく", () => {
  const langAt = indexSource.indexOf("stage-pref-lang-row");
  const guideAt = indexSource.indexOf('<details class="stage-pref-guide"');
  const listAt = indexSource.indexOf('id="stage-prefs-list"');
  assert.ok(langAt > 0 && guideAt > langAt, "言語行より後ろにある");
  assert.ok(listAt > guideAt, "機能一覧より前にある");
  /* open 属性を持たない＝既定は畳んだ状態 */
  const tag = indexSource.slice(guideAt, indexSource.indexOf(">", guideAt) + 1);
  assert.doesNotMatch(tag, /\bopen\b/);
});

test("舞台スケッチ名の右側に小さなアプリ版番号を表示する", () => {
  assert.match(
    indexSource,
    /舞台スケッチ<span class="stage-app-version">v0\.3\.4<\/span><span class="stage-beta">β版<\/span>/,
  );
  assert.match(styleSource, /\.stage-app-version \{[\s\S]*?font-size: 0\.38em;/);
});

test("PWA登録はHTTP上だけで行い、舞台スケッチの保存データには触れない", () => {
  assert.match(pwaSource, /"serviceWorker" in navigator/);
  assert.match(pwaSource, /window\.location\.protocol === "file:"/);
  assert.match(pwaSource, /register\("\.\/stage-sw\.js", \{ scope: "\.\/" \}\)/);
  assert.doesNotMatch(pwaSource + swSource, /localStorage|indexedDB/);
});

test("起動時にベータ版の提供状態を確認し、終了時のゲートを表示する", () => {
  assert.match(pwaSource, /function checkBetaStatus\(\)/);
  assert.match(pwaSource, /fetch\("\/beta-status"/);
  assert.match(pwaSource, /function showBetaGate\(/);
});

test("Service Workerは資料棚など同一サイトの別画面へ介入しない", () => {
  /* 2026-08-24: 配信層の307（/stage.html → /stage）対応で、単一のSTAGE_PATHから
     舞台スケッチの二つの姿だけを持つSTAGE_PATHSへ変更。守る意図は同じ——
     この集合に無い画面（資料棚・名簿など）へは介入しない。 */
  assert.match(swSource, /if \(!STAGE_PATHS\.has\(url\.pathname\)\) return/);
  assert.match(swSource, /new URL\("\.\/stage\.html", self\.location\.href\)\.pathname/);
  assert.match(swSource, /new URL\("\.\/stage", self\.location\.href\)\.pathname/);
  // 集合が舞台スケッチの2entryだけであること（増えたら介入範囲が広がっている）
  const setBlock = swSource.slice(
    swSource.indexOf("const STAGE_PATHS"),
    swSource.indexOf("]);", swSource.indexOf("const STAGE_PATHS")),
  );
  const entries = [...setBlock.matchAll(/new URL\(/g)];
  assert.equal(entries.length, 2, "STAGE_PATHSは stage.html と stage の2つだけに保つ");
  assert.match(swSource, /if \(!APP_SHELL_URLS\.has\(request\.url\)\) return/);
});

test("オフライン用CSSとJSの版は現在のHTML参照と揃う", () => {
  const assetNames = [
    "style.css",
    "stage-venues.js",
    "stage-venue-lines.js",
    "stage-venue-editor.js",
    "stage-i18n.js",
    "stage-rehearsal-export.js",
    "stage-sketch.js",
  ];
  assetNames.forEach((name) => {
    const ref = indexSource.match(new RegExp(`${name.replace(".", "\\.")}\\?v=\\d+`));
    assert.ok(ref, `${name} の版番号がindex.htmlにある`);
    assert.ok(swSource.includes(`./${ref[0]}`), `${ref[0]} がオフライン対象にある`);
  });
  assert.ok(swSource.includes("./stage-pwa.js?v=7"));
});

/* iPad左レールの設定歯車はSVG（他の帯アイコンは形の記号のまま。2026-08-30・E-2）。
   ⚙は絵文字扱いを受けやすく、端末のフォント任せの絵になって不揃いになるため、
   ブラウザ版・スマホ閲覧機の歯車と同じSVGを共有する。 */
test("iPad左レールの設定アイコンは絵文字ではなくSVG（他の帯アイコンと共有の歯車）", () => {
  assert.match(stageSource,
    /\{ id: "settings", icon: "⚙", iconSvg: PHONE_ICON_SVG\.gear,/);
  assert.match(stageSource, /if \(iconSvg\) icon\.innerHTML = iconSvg; else icon\.textContent = iconText;/);
  assert.match(stageSource,
    /const button = makeTabletButton\(definition\.icon, definition\.label, "stage-tablet-rail-button", definition\.iconSvg\);/);
  // 他の帯アイコンは形の記号のまま（絵文字化しない・SVG化もしない）
  ["▣", "●", "☀", "◫", "◎"].forEach((glyph) => {
    assert.ok(stageSource.includes(`icon: "${glyph}"`), `${glyph} は文字のまま残っている`);
  });
  assert.match(styleSource,
    /html\.stage-pwa-tablet \.stage-tablet-rail-icon svg \{[\s\S]*?width: 19px;[\s\S]*?height: 19px;/);
});

test("iPad PWAは縦画面で二面、横画面で単一図の専用ワークスペースを組み立てる", () => {
  assert.match(stageSource, /const TABLET_MENU_GROUPS = \[/);
  ["show", "cast", "look", "scenes", "inspect", "settings"].forEach((id) => {
    assert.match(stageSource, new RegExp(`id: "${id}"`));
  });
  assert.doesNotMatch(stageSource, /id: "tools"/);
  assert.match(stageSource, /className = "stage-tablet-rail"/);
  assert.match(stageSource, /className = "stage-tablet-drawer"/);
  assert.match(stageSource, /className = "stage-tablet-scene-bar"/);
  assert.match(stageSource, /function enforceTabletSingleView\(preferred\)/);
  assert.match(stageSource, /if \(tabletOrientation\.matches\) \{[\s\S]*?state\.showFront = true;[\s\S]*?state\.showPlan = true;/);
  assert.match(stageSource, /state\.showFront = which === "front"/);
  assert.match(stageSource, /state\.showPlan = which === "plan"/);
  assert.match(stageSource, /initTabletPwaWorkspace\(\)/);
});

test("PCとiPadの劇場サイズはショーメニュー内にまとめる", () => {
  const projectPanel = indexSource.match(/<section class="stage-panel stage-project-section"[\s\S]*?<section class="stage-panel" data-panel="cast"/)?.[0] || "";
  assert.match(projectPanel, /data-tablet-page-title="劇場サイズ"/);
  assert.match(projectPanel, /id="stage-venue-select"/);
  assert.match(projectPanel, /id="stage-size-select"/);
  assert.doesNotMatch(indexSource, /data-panel="venue"/);
  assert.match(stageSource, /panels: \["project", "study"\]/);
});

test("iPadの描画道具と主要操作は上部へ常設する", () => {
  assert.match(stageSource, /className = "stage-tablet-top-controls"/);
  assert.match(stageSource, /if \(toolGrid\) topControls\.append\(toolGrid\)/);
  assert.match(stageSource, /if \(historyActions\) topControls\.append\(historyActions\)/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-tablet-top-controls button \{[\s\S]*?min-height: 44px;/);
  ["stage-undo", "stage-redo", "stage-prefs-btn", "stage-present-btn", "stage-lang"].forEach((id) => {
    assert.match(indexSource, new RegExp(`id="${id}"`));
  });
});

test("iPadの正面図と平面図は各図の上部にPC版と同じ操作を残す", () => {
  const frontBar = indexSource.match(/<div class="stage-board-frame" id="stage-front-cell">[\s\S]*?<div class="stage-canvas-inner"/)?.[0] || "";
  ["stage-seat-list", "stage-front-note", "stage-front-lights", "stage-show-seatmap"].forEach((id) => {
    assert.match(frontBar, new RegExp(`id="${id}"`));
  });
  const planBar = indexSource.match(/<div class="stage-board-frame" id="stage-plan-cell">[\s\S]*?<div class="stage-canvas-inner"/)?.[0] || "";
  ["stage-plan-route", "stage-plan-note", "stage-plan-lights", "stage-plan-routes-cast", "stage-plan-routes-light", "stage-plan-routes-set", "stage-show-flown"].forEach((id) => {
    assert.match(planBar, new RegExp(`id="${id}"`));
  });
  assert.doesNotMatch(stageSource, /frontMenu\.append|prepareTabletSpecialPage\("front-tools"|prepareTabletSpecialPage\("plan-tools"/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-canvas-bar \.stage-canvas-tool,[\s\S]*?min-height: 44px;/);
});

test("iPad PWA横画面は一個のボタンで正面図と平面図を交互に切り替える", () => {
  assert.match(stageSource, /const viewToggle = makeTabletButton\("▦", "平面図へ"/);
  assert.match(stageSource, /const nextView = state\.showFront \? "plan" : "front"/);
  assert.match(stageSource, /enforceTabletSingleView\(viewToggle\.dataset\.tabletView\)/);
  assert.doesNotMatch(stageSource, /viewButtons|frontView|planView/);
});

test("iPad PWA縦画面は正面図と平面図を上下に隙間なく並べる", () => {
  assert.match(styleSource, /@media \(orientation: portrait\) \{[\s\S]*?html\.stage-pwa-tablet \.stage-tablet-view-buttons \{[\s\S]*?display: none;/);
  assert.match(styleSource, /@media \(orientation: portrait\) \{[\s\S]*?html\.stage-pwa-tablet \.stage-canvas-stack \{[\s\S]*?grid-template-rows: auto auto;[\s\S]*?gap: 4px;/);
  assert.match(styleSource, /@media \(orientation: portrait\) \{[\s\S]*?html\.stage-pwa-tablet \.stage-board-frame \{[\s\S]*?width: 100%;/);
});

test("iPad PWAの姿勢と種類は5列で選べる", () => {
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-pose-grid \{[\s\S]*?grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/);
});

test("サンプルのシーン番号を現在位置の後ろへ重ねて表示しない", () => {
  assert.match(stageSource, /function sceneNavigationTitle\(scene, index\)/);
  assert.match(stageSource, /sceneNavigationTitle\(scene, index\)/);
  assert.match(stageSource, /tabletUi\.sceneCurrent\.textContent = `\$\{index \+ 1\} \/ \$\{Math\.max\(1, scenes\.length\)\}  \$\{sceneNavigationTitle\(scene, index\)\}`/);
});

test("iPad PWAではブラウザのダブルタップ拡大を起こさない", () => {
  assert.match(styleSource, /html\.stage-pwa-tablet,[\s\S]*?touch-action: manipulation;/);
  assert.match(stageSource, /addEventListener\("dblclick", \(event\) => \{[\s\S]*?if \(tabletPwaActive \|\| phoneViewerActive\) event\.preventDefault\(\)/);
  assert.doesNotMatch(stageSource, /dblclick[\s\S]{0,180}zoomBy/);
});

test("iPad PWAはページをスクロールせず、ドロワーで図を切らずに縮める", () => {
  assert.match(styleSource, /html\.stage-pwa-tablet body \{[\s\S]*?position: fixed;[\s\S]*?inset: 0;/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-sketch-grid\.is-tablet-drawer-open \{[\s\S]*?grid-template-columns:/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-board-frame \{[\s\S]*?16 \/ 9/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-canvas-wrap \{[\s\S]*?aspect-ratio: 16 \/ 9/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-tablet-drawer-body \{[\s\S]*?overflow: hidden/);
  assert.match(styleSource, /min-height: 44px/);
  assert.match(stageSource, /pagePrev\.textContent = "前へ"/);
  assert.match(stageSource, /pageNext\.textContent = "次へ"/);
});

test("長いiPadメニューは意味のまとまりでページ分割する", () => {
  const breaks = [...indexSource.matchAll(/data-tablet-break-before/g)];
  assert.ok(breaks.length >= 7);
  assert.match(stageSource, /hasAttribute\("data-tablet-break-before"\)/);
  assert.match(stageSource, /stage-tablet-panel-page/);
  assert.match(styleSource, /\.stage-tablet-panel-page\[hidden\] \{ display: none; \}/);
});

test("通常ブラウザ用の三列レイアウトは残す", () => {
  assert.match(styleSource, /\.stage-sketch-grid \{[\s\S]*?grid-template-columns: 268px minmax\(420px, 1fr\) 268px;/);
  assert.match(stageSource, /if \(!tabletUi\) \{[\s\S]*?\["left", "right"\]\.forEach/);
});

test("標準アイコンとマスク可能アイコンを宣言する", async () => {
  assert.deepEqual(
    manifest.icons.map(({ sizes, purpose }) => [sizes, purpose]),
    [["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"]],
  );

  const expectedSizes = new Map([
    ["icons/stage-sketch-180.png", [180, 180]],
    ...manifest.icons.map(({ src, sizes }) => [src.replace(/^\.\//, ""), sizes.split("x").map(Number)]),
  ]);
  for (const [path, expected] of expectedSizes) {
    const png = await readFile(new URL(path, root));
    assert.deepEqual([...png.subarray(1, 4)], [80, 78, 71], `${path} がPNGである`);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], expected, `${path} の寸法`);
  }
});

// 使い捨ての計測: 各効果の見た目(PNG)と rAF の実測 fps。製品コードには触れない。
const { chromium } = require("/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
(async () => {
  const b = await chromium.launch({ headless: true, args: ["--enable-gpu-rasterization"] });
  const pg = await b.newPage({ viewport: { width: 1000, height: 660 }, deviceScaleFactor: 1 });
  await pg.goto("file://" + __dirname + "/index.html");
  const fps = () => pg.evaluate(() => new Promise((r) => { let c = 0; const t0 = performance.now(); const f = () => { c++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(+(c / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }));
  const out = [];
  const ids = ["beam", "fan", "sheet", "tunnel", "liquid", "audience"];
  for (let i = 0; i < ids.length; i++) {
    await pg.evaluate((i) => { document.getElementById("all").checked = false; document.getElementById("n").value = "4"; document.querySelectorAll("#fx button")[i].click(); }, i);
    await pg.waitForTimeout(1200);
    const f = await fps(); const s = await pg.evaluate(() => window.__SPIKE);
    await pg.screenshot({ path: __dirname + "/../evidence/laser-spike-" + ids[i] + ".png" });
    out.push({ effect: ids[i], n: 4, fps: f, ms: s.ms, lines: s.lines });
  }
  await pg.evaluate(() => { document.getElementById("all").checked = true; document.getElementById("n").value = "8"; });
  await pg.waitForTimeout(1200);
  { const f = await fps(); const s = await pg.evaluate(() => window.__SPIKE); await pg.screenshot({ path: __dirname + "/../evidence/laser-spike-stress-6x8.png" }); out.push({ effect: "all6", n: 8, fps: f, ms: s.ms, lines: s.lines }); }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();

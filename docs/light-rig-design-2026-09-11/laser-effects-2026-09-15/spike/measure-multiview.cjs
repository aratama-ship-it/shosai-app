const { chromium } = require("/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
(async () => {
  const b = await chromium.launch({ headless: true });
  const pg = await b.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
  await pg.goto("file://" + __dirname + "/multiview.html");
  const cases = [
    ["truss", "fan", "laser-4view-truss-fan.png"],
    ["floor", "tunnel", "laser-4view-floor-tunnel.png"],
    ["front", "audience", "laser-4view-front-audience.png"],
    ["truss", "liquid", "laser-4view-truss-liquid.png"],
  ];
  const out = [];
  for (const [mount, effect, file] of cases) {
    const i = ["beam", "fan", "sheet", "tunnel", "liquid", "audience"].indexOf(effect);
    await pg.evaluate(([mount, i]) => { document.getElementById("mount").value = mount; document.getElementById("mount").dispatchEvent(new Event("change")); document.querySelectorAll("#fx button")[i].click(); }, [mount, i]);
    await pg.waitForTimeout(900);
    const s = await pg.evaluate(() => window.__SPIKE4);
    await pg.screenshot({ path: __dirname + "/evidence/" + file });
    out.push({ mount, effect, lines: s.lines });
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();

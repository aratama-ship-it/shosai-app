// ローカル専用。実装のHTMLと架空の検証記録から、通信不要の確認画面を作る。
import { usageAdminResponse } from "../../usage-admin-page.js";
import { readFile, writeFile } from "node:fs/promises";
const snapshot = JSON.parse(await readFile(new URL("./local-synthetic-snapshot.json", import.meta.url), "utf8"));
for (const en of [false, true]) {
  let html = await usageAdminResponse(en).text();
  const notice = en ? "LOCAL REVIEW — Synthetic test accounts only. Not production usage."
    : "ローカル確認用 — 架空の検証アカウントです。本番の利用実績ではありません。";
  html = html.replace("<main>", `<main><p style="border:1px solid #88432e;padding:12px;font-weight:600">${notice}</p>`);
  html = html.replace("const t = ", `const snapshot = ${JSON.stringify(snapshot).replaceAll("<", "\\u003c")};\nconst t = `);
  const live = "const response=await fetch('/usage/report?days='+el('period').value,{credentials:'same-origin',cache:'no-store',redirect:'error'});";
  if (!html.includes(live)) throw new Error("Preview insertion point changed");
  html = html.replace(live, `const days=Number(el('period').value); const from=new Date((Math.floor((snapshot.asOf+32400000)/86400000)-days+1)*86400000).toISOString().slice(0,10); const response={ok:true,json:async()=>({...snapshot,days,from})};`);
  html = html.replaceAll('href="/usage?lang=en"', 'href="admin-en.html"').replaceAll('href="/usage"', 'href="admin-ja.html"');
  html = html.replace(/href="\/stage.html[^\"]*"/, 'href="index.html"');
  await writeFile(new URL(`./admin-${en ? "en" : "ja"}.html`, import.meta.url), html);
}
